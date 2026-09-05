/**
 * 2026-08-10 onboarding trim — this form now sends ONLY what it collects.
 *
 * Removed from the payload (June-era marketing/transparency fields; PATCH omission
 * preserves any existing DB values, nothing is wiped):
 * - `sustainability_practices`: self-reported-claim field, killed end-to-end on the
 *   wire 2026-08-07 (see consumerVisibility.ts). Never send it from this form again.
 * - `certifications` (comma-joined string): legacy data-migration source only
 *   (certifications/constants.py LEGACY_TEXT_MAP). Certifications are managed as
 *   structured records via CertificationManager on the farm profile.
 * - `conservation_practices`: was hardcoded to "[]", actively wiping DB data on
 *   every edit. Wire-killed 2026-08-07.
 * - `climate_zone`, `employee_count`: wire-killed 2026-08-07, no input in this form.
 * - `about`, `main_activities`, `location_highlights`: prose fields with no input in
 *   this form (round-trip only); display-only legacy data on ProfileFarm.
 * - `email`, `phone`, `country`, `contact_person`, `contact_phone`, `contact_email`:
 *   no inputs in this form; a form should not send fields it never asks for.
 *
 * Kept: identity/location/operations fields with live readers (ProfileFarm and the
 * consumer QR page per CONSUMER_VISIBLE_FARM_FIELDS): name, description, address,
 * city, zone, state, zip, coordinates, establishment_type, farming_method,
 * total_acreage, year_established, crops_grown, water_sources, soil_types
 * (soil-health practices), irrigation_methods, custom_message, images.
 */
import React, { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { StandardPage, StandardPageLoading } from 'components/Design';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { StandardFarmForm } from '../../../../components/Forms/StandardFarmForm';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';
import subscriptionToastHelper from '../../../../utils/toast/SubscriptionToastHelper';
import { useSelector, useDispatch } from 'react-redux';
import { useCreateFarmMutation, useEditFarmMutation, useGetFarmQuery } from 'store/api/companyApi';
import { addCompanyFarm } from 'store/features/companySlice';
import { PlanLimitAlert } from 'components/Subscription/PlanLimitAlert';
import { getLimit, isAtLimit } from 'utils/subscriptionLimits';

interface Props {
  isEdit?: boolean;
}

function AddFarm({ isEdit = false }: Props) {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const { farmId } = useParams();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // Pre-flight plan limit check (informational only — backend enforces).
  //
  // AddParcel has had one of these; this form did not, and it is the form where it matters
  // most: Starter is ONE farm and the Extra Farm add-on ($149/yr) is the only add-on Trazo
  // sells. Without it a Starter customer filled all four steps, submitted, and got a raw
  // backend rejection instead of being told up front what the second farm costs.
  //
  // Goes through `utils/subscriptionLimits` so it reads `effective_limits` (add-on adjusted)
  // and treats -1 as unlimited — the two rules that produced live bugs in the parcel guard.
  const maxFarms = getLimit(currentCompany, 'max_establishments');
  const currentFarmCount = currentCompany?.establishments?.length ?? 0;
  const isAtFarmLimit =
    !isEdit && isAtLimit(currentCompany, 'max_establishments', currentFarmCount);

  const [createFarm, { isLoading: isCreating }] = useCreateFarmMutation();
  const [editFarm, { isLoading: isUpdating }] = useEditFarmMutation();

  // Fetch establishment data for editing
  const { data: establishmentData, isLoading: isLoadingEstablishment } = useGetFarmQuery(
    {
      companyId: currentCompany?.id,
      farmId: farmId!
    },
    {
      skip: !isEdit || !currentCompany?.id || !farmId
    }
  );

  // Clear any subscription success toasts when this component mounts
  useEffect(() => {
    subscriptionToastHelper.clearAllSubscriptionToastFlags();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      if (isEdit) {
        // Handle edit mode
        const establishmentUpdateData = {
          name: data.name,
          address: data.address || '',
          city: data.city || '',
          zone: data.zone || '',
          state: data.state || '',
          zip_code: data.zipCode || '',
          ca_operator_id: data.caOperatorId || '',
          description: data.description || '',
          custom_message: data.custom_message || '',
          establishment_type: data.establishmentType || '',
          farming_method: data.farmingMethod || '',
          total_acreage: data.totalAcreage || 0,
          year_established: data.yearEstablished || null,
          is_active: data.isActive !== undefined ? data.isActive : true,
          type: data.type || data.establishmentType || '',
          latitude: data.latitude !== undefined ? data.latitude : null,
          longitude: data.longitude !== undefined ? data.longitude : null,
          crops_grown: JSON.stringify(data.cropsGrown || []),
          water_sources: JSON.stringify(data.waterSources || []),
          // `soil_types` is a legacy column name; it holds soil-health PRACTICES
          soil_types: JSON.stringify(data.soilHealthPractices || []),
          irrigation_methods: JSON.stringify(data.irrigationMethods || []),
          // Image upload fields - only include if there are changes
          ...(data.uploaded_image_urls &&
            data.uploaded_image_urls.length > 0 && {
              uploaded_image_urls: data.uploaded_image_urls
            }),
          ...(data.images_to_delete &&
            data.images_to_delete.length > 0 && {
              images_to_delete: data.images_to_delete
            }),
          ...(data.new_images &&
            data.new_images.length > 0 && {
              new_images: data.new_images
            })
        };

        const result = await editFarm({
          companyId: currentCompany.id,
          farmId: farmId!,
          establishmentData: establishmentUpdateData
        }).unwrap();

        // Navigate immediately — RTK Query cache invalidation is synchronous,
        // and the profile page will refetch fresh data on mount
        navigate(`/admin/dashboard/farm/${result.id}`);
      } else {
        // Handle create mode
        const establishmentData = {
          name: data.name,
          address: data.address || '',
          city: data.city || '',
          zone: data.zone || '',
          state: data.state || '',
          zip_code: data.zipCode || '',
          ca_operator_id: data.caOperatorId || '',
          description: data.description || '',
          custom_message: data.custom_message || '',
          establishment_type: data.establishmentType || '',
          farming_method: data.farmingMethod || '',
          total_acreage: data.totalAcreage || 0,
          year_established: data.yearEstablished || null,
          is_active: data.isActive !== undefined ? data.isActive : true,
          type: data.type || data.establishmentType || '',
          latitude: data.latitude !== undefined ? data.latitude : null,
          longitude: data.longitude !== undefined ? data.longitude : null,
          crops_grown: JSON.stringify(data.cropsGrown || []),
          water_sources: JSON.stringify(data.waterSources || []),
          // `soil_types` is a legacy column name; it holds soil-health PRACTICES
          soil_types: JSON.stringify(data.soilHealthPractices || []),
          irrigation_methods: JSON.stringify(data.irrigationMethods || []),
          company: currentCompany.id,
          // Image upload fields - only include if there are uploaded images
          ...(data.uploaded_image_urls &&
            data.uploaded_image_urls.length > 0 && {
              uploaded_image_urls: data.uploaded_image_urls
            }),
          ...(data.new_images &&
            data.new_images.length > 0 && {
              new_images: data.new_images
            })
        };

        const result = await createFarm({
          companyId: currentCompany.id,
          establishment: establishmentData
        }).unwrap();

        // CRITICAL FIX: Dispatch Redux action to set currentEstablishment
        // This ensures the newly created establishment becomes the active one in Redux state
        dispatch(addCompanyFarm(result));

        // Set sessionStorage flags to prevent Authenticated.jsx from redirecting during cache update
        sessionStorage.setItem('creating_farm', 'true');
        sessionStorage.setItem('just_created_farm_id', result.id.toString());

        // Success toast
        toast({
          title: intl.formatMessage({ id: 'farmForm.toast.createdTitle' }),
          description: intl.formatMessage(
            { id: 'farmForm.toast.createdDescription' },
            { name: data.name }
          ),
          status: 'success',
          duration: 5000,
          isClosable: true
        });

        // Navigate immediately - RTK Query optimistic update + sessionStorage flags prevent race conditions
        const targetUrl = `/admin/dashboard/farm/${result.id}`;
        navigate(targetUrl);
      }
    } catch (error) {
      console.error(`Failed to ${isEdit ? 'update' : 'create'} establishment:`, error);

      // Parse DRF field-level validation errors into readable message
      let description = intl.formatMessage({ id: 'farmForm.toast.errorFallback' });
      if (error?.data && typeof error.data === 'object') {
        if (error.data.detail) {
          description = error.data.detail;
        } else if (error.data.message) {
          description = error.data.message;
        } else {
          // DRF returns {field: [errors]} format
          const fieldErrors = Object.entries(error.data)
            .filter(([, msgs]) => Array.isArray(msgs))
            .map(([field, msgs]) => {
              const label = field.replace(/_/g, ' ');
              return `${label}: ${(msgs as string[]).join(', ')}`;
            });
          if (fieldErrors.length > 0) {
            description = fieldErrors.join(' | ');
          }
        }
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title: intl.formatMessage({
          id: isEdit ? 'farmForm.toast.errorUpdating' : 'farmForm.toast.errorCreating'
        }),
        description,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
    }
  };

  const handleCancel = () => {
    if (isEdit) {
      navigate(`/admin/dashboard/farm/${farmId}`);
    } else {
      navigate('/admin/dashboard');
    }
  };

  // Transform establishment data for the form
  const getInitialData = () => {
    if (!isEdit || !establishmentData) return undefined;

    return {
      name: establishmentData.name || '',
      address: establishmentData.address || '',
      city: establishmentData.city || '',
      zone: establishmentData.zone || '',
      state: establishmentData.state || '',
      zipCode: establishmentData.zip_code || '',
      caOperatorId: establishmentData.ca_operator_id || '',
      description: establishmentData.description || '',
      custom_message: establishmentData.custom_message || '',
      establishmentType: establishmentData.establishment_type || establishmentData.type || '',
      farmingMethod: establishmentData.farming_method || '',
      totalAcreage: establishmentData.total_acreage || 0,
      yearEstablished: establishmentData.year_established || undefined,
      isActive: establishmentData.is_active !== false,
      type: establishmentData.type || '',
      latitude: establishmentData.latitude || undefined,
      longitude: establishmentData.longitude || undefined,
      cropsGrown: (() => {
        if (Array.isArray(establishmentData.crops_grown)) {
          return establishmentData.crops_grown;
        }
        if (typeof establishmentData.crops_grown === 'string') {
          try {
            return JSON.parse(establishmentData.crops_grown);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      waterSources: (() => {
        if (Array.isArray(establishmentData.water_sources)) {
          return establishmentData.water_sources;
        }
        if (typeof establishmentData.water_sources === 'string') {
          try {
            return JSON.parse(establishmentData.water_sources);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      soilHealthPractices: (() => {
        if (Array.isArray(establishmentData.soil_types)) {
          return establishmentData.soil_types;
        }
        if (typeof establishmentData.soil_types === 'string') {
          try {
            return JSON.parse(establishmentData.soil_types);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      irrigationMethods: (() => {
        if (Array.isArray(establishmentData.irrigation_methods)) {
          return establishmentData.irrigation_methods;
        }
        if (typeof establishmentData.irrigation_methods === 'string') {
          try {
            return JSON.parse(establishmentData.irrigation_methods);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      // Images field for edit mode
      images: establishmentData.images || establishmentData.album?.images || []
    };
  };

  // Show loading state during data fetch for edit mode
  if (isEdit && isLoadingEstablishment) {
    // Was a bare Flex + CircularProgress with no page wrapper, so the title and the Back
    // button vanished while the fetch was in flight and the layout jumped when it landed.
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'farm.form.page.editTitle' })}
        showBackButton
        onBack={handleCancel}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  return (
    <WriteAccessGuard>
      <StandardFarmForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={getInitialData()}
        isLoading={isCreating || isUpdating}
        isEdit={isEdit}
        companyName={currentCompany?.name || ''}
        preFormAlert={
          // Narrow explicitly rather than asserting: `isAtFarmLimit` is only true for a
          // stated finite limit, but a future change to isAtLimit must not quietly pass
          // `undefined` into the alert's {limit} placeholder.
          isAtFarmLimit && maxFarms !== undefined ? (
            <PlanLimitAlert limit={maxFarms} descriptionId="limits.farmsReached" />
          ) : undefined
        }
      />
    </WriteAccessGuard>
  );
}

export default AddFarm;
