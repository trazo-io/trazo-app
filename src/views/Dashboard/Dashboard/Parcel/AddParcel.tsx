import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { StandardParcelFormTransparency } from '../../../../components/Forms/StandardParcelForm_Transparency';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';
import { StandardPage, StandardPageLoading } from 'components/Design';
import {
  useCreateParcelMutation,
  useUpdateParcelMutation,
  useGetParcelQuery
} from 'store/api/productApi';
import { useGetFarmQuery } from 'store/api/companyApi';
import { setFarmParcel } from 'store/features/companySlice';
import { useToast } from '@chakra-ui/react';
import { PlanLimitAlert } from 'components/Subscription/PlanLimitAlert';
import { getLimit, isAtLimit } from 'utils/subscriptionLimits';

interface AddParcelProps {
  isEdit?: boolean;
}

interface RootState {
  company: {
    currentCompany: {
      id: string;
      name: string;
      establishments?: Array<{
        id: string | number;
        parcels?: Array<{ id: string | number }>;
      }>;
      subscription?: {
        used_productions?: number;
        effective_limits?: { [key: string]: any };
        plan?: { features?: { [key: string]: any } };
      };
    };
    currentEstablishment: {
      id: string;
      name: string;
      latitude?: number;
      longitude?: number;
    };
  };
}

function AddParcel({ isEdit = false }: AddParcelProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { farmId, parcelId } = useParams();
  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);
  const currentEstablishment = useSelector(
    (state: RootState) => state.company.currentEstablishment
  );

  const [createParcel, { isLoading: isCreating }] = useCreateParcelMutation();
  const [updateParcel, { isLoading: isUpdating }] = useUpdateParcelMutation();

  // Fetch farm data to get coordinates for map centering
  const { data: establishmentData } = useGetFarmQuery(
    {
      companyId: currentCompany?.id,
      farmId
    },
    {
      skip: !farmId || !currentCompany?.id
    }
  );

  // Fetch parcel data for edit mode
  const {
    data: parcelData,
    isLoading: isLoadingParcel,
    error: parcelError
  } = useGetParcelQuery(
    {
      companyId: currentCompany?.id,
      farmId,
      parcelId
    },
    {
      skip: !isEdit || !parcelId || !farmId || !currentCompany?.id
    }
  );

  // Get establishment coordinates - prefer fresh API data over Redux state
  const establishmentCoordinates =
    establishmentData?.latitude && establishmentData?.longitude
      ? { lat: establishmentData.latitude, lng: establishmentData.longitude }
      : currentEstablishment?.latitude && currentEstablishment?.longitude
      ? { lat: currentEstablishment.latitude, lng: currentEstablishment.longitude }
      : undefined;

  // Pre-flight subscription limit check (informational only — backend enforces).
  // Parcel count comes from the Redux company state (same source UnifiedSubscription
  // uses), with the freshly-fetched farm data as a fallback.
  //
  // Shares `utils/subscriptionLimits` with the "+ Add Parcel" tile in CarouselHorizontal. The two
  // previously implemented this separately and disagreed: that guard read base plan features and
  // treated -1 (unlimited) as "no limit configured", so it hid the button on unlimited plans and
  // ignored purchased add-ons.
  const maxParcelsPerFarm = getLimit(currentCompany, 'max_parcels_per_establishment');
  const farmFromStore = currentCompany?.establishments?.find(
    (est) => est?.id?.toString() === farmId?.toString()
  );
  const currentParcelCount =
    farmFromStore?.parcels?.length ?? establishmentData?.parcels?.length ?? 0;
  const isAtParcelLimit =
    !isEdit && isAtLimit(currentCompany, 'max_parcels_per_establishment', currentParcelCount);

  // 🎯 Transparency-focused initial data mapping
  const getInitialData = () => {
    if (!isEdit || !parcelData) return {};

    return {
      // Core transparency fields (map directly to new schema)
      name: parcelData.name || '',
      area: parcelData.area || 0,
      // crop_type is set at production level, not parcel

      // Transparency story fields (map description → transparency_description)
      transparency_description: parcelData.description || '',
      // Read the canonical key first. The two legacy keys are still read as a fallback so
      // parcels saved before 2026-08-17 keep showing their text, but nothing writes them
      // any more — see the note in handleSubmit.
      sustainability_practices:
        parcelData.agricultural_details?.sustainability_practices ||
        parcelData.agricultural_details?.carbon_sequestration_practices ||
        parcelData.agricultural_details?.cover_crop_management ||
        '',

      // Visual documentation
      images: parcelData.images || [],

      // System fields (maintain compatibility). §205.202 facts deliberately
      // absent — the Parcel Application wizard owns them (see handleSubmit).
      polygon: parcelData.polygon || [],
      map_metadata: parcelData.map_metadata || {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 13
      },
      establishment: parseInt(parcelData.establishment) || undefined,

      // Legacy fields for backend compatibility (hidden from UI).
      // `certified` / `certification_type` deliberately absent — see handleSubmit.
      description: parcelData.description || '',
      contact_phone: parcelData.contact_phone || '',
      contact_person: parcelData.contact_person || '',
      contact_email: parcelData.contact_email || '',
      address: parcelData.address || '',
      unique_code: parcelData.unique_code || ''
    };
  };

  const handleSubmit = async (data: any) => {
    try {
      // 🌱 Store the parcel narrative in agricultural_details for carbon context.
      const agriculturalDetails: any = {};

      // ONE box, ONE key.
      //
      // This used to fan a single free-text input out into TWO different agronomic facts:
      //
      //     agriculturalDetails.carbon_sequestration_practices = data.sustainability_practices;
      //     agriculturalDetails.cover_crop_management = data.sustainability_practices;
      //
      // A farmer typing "we apply compost" was recorded as ALSO running a cover-crop
      // management programme. `Parcel.is_transparency_ready()` and `get_transparency_score()`
      // (both removed 2026-09-09) then read either key as independent evidence, so one
      // sentence counted twice. That is fabrication, not mapping — the farmer said one thing.
      // The duplication is still wrong without them: `get_sustainability_practices()` and the
      // carbon-readiness checks read the same three keys.
      //
      // `sustainability_practices` is the canonical key: it is the first one
      // product/models.py checks in every reader. The legacy pair is still READ on hydration
      // for parcels saved before this change; neither is written again.
      if (data.sustainability_practices) {
        agriculturalDetails.sustainability_practices = data.sustainability_practices;
      }

      // `consumer_story` -> agricultural_details.consumer_narrative removed 2026-08-07 with
      // the field. It scored nothing and reached no consumer surface.

      // 🎯 Map transparency form to backend fields
      const parcelData = {
        name: data.name,
        area: Number(data.area),
        description: data.transparency_description || data.description, // Use transparency description as primary
        contact_phone: data.contact_phone || '',
        address: data.address || '',
        unique_code: data.unique_code || '',
        contact_person: data.contact_person || '',
        contact_email: data.contact_email || '',
        // §205.202 facts (buffer_zones / apn / S-T-R / date_began_managing /
        // treated_lumber_*) removed 2026-08-10: the Parcel Application wizard
        // is their single editor, this form never rendered them, and its
        // round-trip carried the SAME destructive adjoining-land-use filter
        // that caused the 2026-08-09 buffer data-loss incident.
        //
        // `certified` / `certification_type` removed 2026-08-17, same rule. This form has no
        // input for either — they existed only as `defaultValues` in the transparency form,
        // absent from its zod schema and its interface — so every create shipped a hardcoded
        // `certified: false`. That is the `treated_lumber_present: 'false'` shape the
        // mutation-payload rule names. Certifications are structured records managed by
        // CertificationManager; a self-reported boolean is not a second place to assert one.
        //
        // `transparency_ready` removed 2026-08-17: it is NOT a model field.
        //
        // ⚠️ CORRECTED 2026-09-09 — this note said the hardcoded `true` "was discarded on
        // arrival … and changed nothing". It was not: `CreateParcelSerializer` declared
        // `transparency_ready` as a write-only BooleanField and moved it into
        // `agricultural_details`, so the form's self-assertion was STORED. Both the write-only
        // field and the `Parcel.is_transparency_ready()` / `get_transparency_score()` pair are
        // now gone — the score is retired as a concept, not merely unsent.
        //
        // `carbon_calculation_enabled` removed 2026-08-17: a real BooleanField, but this form
        // derived it from whether two prose boxes happened to be non-empty. Writing text into
        // a description does not enable a carbon calculation, and no control here offers the
        // farmer that choice.
        polygon: data.polygon || [],
        map_metadata: data.map_metadata || {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 13
        },
        establishment: parseInt(farmId!),

        // ✅ Store transparency context for carbon calculations
        agricultural_details: agriculturalDetails
      };

      // Handle image upload data from the enhanced form
      const imageData: any = {};
      if (data.uploaded_image_urls?.length > 0) {
        imageData.uploaded_image_urls = data.uploaded_image_urls;
      }
      if (data.images_to_delete?.length > 0) {
        imageData.images_to_delete = data.images_to_delete;
      }
      if (data.new_images?.length > 0) {
        imageData.new_images = data.new_images;
      }

      const finalData = { ...parcelData, ...imageData };

      if (isEdit && parcelId) {
        // Update existing parcel
        await updateParcel({
          companyId: currentCompany?.id,
          farmId,
          parcelId,
          parcelData: finalData
        }).unwrap();

        // ✅ Redirect to parcel profile after update
        navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`);
      } else {
        // Create new parcel
        const result = await createParcel({
          companyId: currentCompany?.id,
          farmId,
          parcelData: finalData
        }).unwrap();

        // ✅ CRITICAL FIX: Update Redux state to include new parcel
        dispatch(
          setFarmParcel({
            farmId: farmId!,
            parcel: result
          })
        );

        // ✅ Redirect to new parcel profile after creation
        navigate(`/admin/dashboard/farm/${farmId}/parcel/${result.id}`);
      }
    } catch (error: any) {
      console.error('Failed to save parcel:', error);

      toast({
        title: intl.formatMessage({
          id: isEdit ? 'parcelForm.toast.updateFailed' : 'parcelForm.toast.createFailed'
        }),
        description:
          error?.data?.detail ||
          intl.formatMessage({ id: 'parcelForm.toast.saveErrorDescription' }),
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    }
  };

  const handleCancel = () => {
    navigate(`/admin/dashboard/farm/${farmId}`);
  };

  // Toast + redirect on a failed fetch, in an EFFECT.
  //
  // Both calls used to sit in the render body, guarded only by `if (isEdit && parcelError)`.
  // Rendering must be side-effect free: React re-runs a render freely, so this fired the toast
  // repeatedly and dispatched a router navigation from inside another component's render —
  // the "Cannot update a component while rendering a different component" warning. Moving it
  // into an effect also means it runs exactly once per error, after commit.
  //
  // 🔴 2026-08-31 — AND IT MUST STAY ABOVE THE EARLY RETURNS BELOW.
  //
  // It sat after the `isLoadingParcel` guard, so on a COLD load the guard returned before this
  // hook was reached, and the next render — fetch landed, guard passes — reached it. React's
  // hook count changed between renders and tore the tree down: "Rendered fewer hooks than
  // expected", caught by the error boundary as "We hit a snag loading this page".
  //
  // In-app navigation never showed it because RTK Query already has the parcel cached, so
  // `isLoadingParcel` is never true and the guard never fires. What DOES hit it is a cold load
  // of this URL: a refresh while editing, a bookmark, a new tab, session restore.
  //
  // Every hook in this component belongs above every conditional return. That is not a style
  // preference here; it is the rule React enforces at runtime.
  useEffect(() => {
    if (!isEdit || !parcelError) return;
    toast({
      title: intl.formatMessage({ id: 'parcelForm.error.loadTitle' }),
      description: intl.formatMessage({ id: 'parcelForm.error.loadDescription' }),
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top-right'
    });
    navigate(`/admin/dashboard/farm/${farmId}`);
  }, [isEdit, parcelError, farmId, intl, navigate, toast]);

  // Show loading state while fetching parcel data in edit mode.
  //
  // This used to render the WHOLE FORM SHELL with `isLoading={true}` hardcoded. That prop
  // lands on the form's submit button (StandardParcelForm_Transparency.tsx:944), which
  // carries `loadingText="Updating..."` — so while the parcel was still being FETCHED the
  // operator was shown an empty form under a spinning, disabled "Updating..." button. The
  // screen asserted a write in progress before a single field had arrived, and the empty
  // inputs beneath it read as the parcel's real, now-blank values.
  //
  // Same class as the Select Your Plan defect: a control rendered only while loading must
  // not also be DRIVEN by loading. Here the whole form was the control. AddFarm.tsx already
  // solved this shape — keep the page chrome so the title and Back button do not vanish and
  // the layout does not jump when the fetch lands, and put the standard loader inside it.
  if (isEdit && isLoadingParcel) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'parcelForm.page.editTitle' })}
        showBackButton
        onBack={handleCancel}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  if (isEdit && parcelError) {
    return null;
  }

  return (
    <WriteAccessGuard>
      <StandardParcelFormTransparency
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={getInitialData()}
        isLoading={isCreating || isUpdating}
        isEdit={isEdit}
        establishmentName={establishmentData?.name || currentEstablishment?.name || ''}
        establishmentCoordinates={establishmentCoordinates}
        preFormAlert={
          // `isAtParcelLimit` is only ever true for a stated, finite limit, so the value is
          // present here — but narrow explicitly rather than asserting, so that a future change
          // to isAtLimit cannot quietly pass `undefined` into the alert's {limit} placeholder.
          isAtParcelLimit && maxParcelsPerFarm !== undefined ? (
            <PlanLimitAlert limit={maxParcelsPerFarm} descriptionId="limits.parcelsReached" />
          ) : undefined
        }
      />
    </WriteAccessGuard>
  );
}

export default AddParcel;
