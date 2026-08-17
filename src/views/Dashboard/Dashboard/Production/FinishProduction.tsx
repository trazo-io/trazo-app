import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useToast } from '@chakra-ui/react';
import { StandardFinishProductionForm } from '../../../../components/Forms';
import {
  useFinishCurrentHistoryMutation,
  useGetCurrentHistoryQuery
} from 'store/api/historyApi.js';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';

// Module scope so the prefill memo below has a stable dependency. The event vocabulary says
// "lbs"; the finish form's unit select says "lb" — map, don't invent.
const EVENT_UNIT_TO_FORM_UNIT: Record<string, string> = {
  lbs: 'lb',
  lb: 'lb',
  pounds: 'lb',
  kg: 'kg',
  kilograms: 'kg',
  tons: 'tons',
  boxes: 'boxes',
  crates: 'crates',
  bushels: 'bushels',
  units: 'units'
};

function FinishProduction() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { parcelId, farmId } = useParams();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // Pull current production so the preview frame can show real product/farm
  // names while the farmer is still on the upload step. HistorySerializer
  // returns `product` and `parcel` as plain name strings, so use them
  // directly (no `.name` traversal).
  const { data: currentHistory } = useGetCurrentHistoryQuery(
    { companyId: currentCompany?.id, farmId, parcelId },
    { skip: !currentCompany?.id || !farmId || !parcelId }
  );

  // Same transparency endpoint the consumer page calls. Owners can fetch
  // unpublished histories (see `production_transparency_detail` perms),
  // so the preview can show the real score / farm name / harvest date
  // that consumers will see.
  const productionPublicId: string | undefined =
    typeof currentHistory?.public_id === 'string' ? currentHistory.public_id : undefined;

  const { data: transparency } = useGetTransparencyDetailsQuery(productionPublicId as string, {
    skip: !productionPublicId
  });

  // Mirror the consumer page's data extraction path so the preview can show
  // the same farm/product/harvest values shoppers will see. `farmer` and
  // `product` live at the response root (alongside `standard_view`), per
  // ProductDetail.tsx's existing logic.
  const productName: string =
    (transparency as any)?.product?.name ||
    (typeof currentHistory?.product === 'string' ? currentHistory.product : '');
  const parcelName: string =
    typeof currentHistory?.parcel === 'string' ? currentHistory.parcel : '';
  const farmName: string = (transparency as any)?.farmer?.name || currentCompany?.name || '';
  // ProductDetail.tsx passes `completeData.finish_date` to the live hero;
  // for unfinished productions this is null, so the preview omits the
  // "Harvested ..." suffix. After finish, the same field drives the
  // consumer hero exactly.
  const harvestDate: string | undefined =
    (transparency as any)?.finish_date || (currentHistory as any)?.finish_date || undefined;
  const previewScore: number | undefined = transparency?.quick_view?.transparency_score?.percentage;

  // Fallback cover used by ProductDetail when farmer uploads no photos:
  // first event-timeline photo. Surface it here so the preview shows the
  // farmer what consumers will actually see if they skip the upload.
  const fallbackImageUrl: string | undefined = (() => {
    const tl = (transparency as any)?.timeline as
      | Array<{ album?: { images?: Array<{ image?: string }> } }>
      | undefined;
    if (!tl) return undefined;
    const firstWithPhoto = tl.find((ev) => ev?.album?.images?.[0]?.image);
    return firstWithPhoto?.album?.images?.[0]?.image;
  })();

  // Prefill the finish form from the season's harvest event (suggestion, not a
  // silent answer — every field stays editable). Farmers recorded the yield
  // once already; asking them to re-type it at finalization was the harvest
  // dual-entry gap from the 2026-08-10 wiring audit.
  //
  // MEMOISED, and that is load-bearing — not a render optimisation.
  //
  // This was a bare IIFE, so it produced a NEW object identity on every render of this
  // component. StandardFinishProductionForm hydrates from it via
  // `useEffect(..., [initialData, reset])`, which therefore fired on every parent render and
  // called `reset()` + `setSavedFormData()`. Submitting flips the mutation's `isLoading`,
  // which re-renders this parent — so a finish that the backend REJECTS (a future
  // finish_date, a finish before start; see product/views.py _validate_finalization_fields)
  // wiped the lot number, the completion date and the observations the farmer had just
  // typed, leaving them an error toast and an empty form. RTK Query hands back a stable
  // `currentHistory` reference while the cache entry is unchanged, so keying on it means the
  // prefill object only changes when the underlying production actually does.
  const harvestPrefill = useMemo(() => {
    const events = ((currentHistory as any)?.events || []) as Array<any>;
    const harvests = events.filter(
      (e) => e?.yield_quantity != null || String(e?.type || '').includes('harvest')
    );
    const latest = harvests
      .filter((e) => e?.yield_quantity != null)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    if (!latest) return undefined;
    const unit = EVENT_UNIT_TO_FORM_UNIT[String(latest.yield_unit || '').toLowerCase()];
    return {
      production_amount: String(latest.yield_quantity),
      ...(unit ? { production_unit: unit } : {}),
      ...(['manual', 'mechanical', 'mixed'].includes(latest.harvest_method)
        ? { harvest_method: latest.harvest_method }
        : {})
    };
  }, [currentHistory]);

  const [finishCurrentHistory, { isLoading }] = useFinishCurrentHistoryMutation();

  const handleSubmit = async (data: any) => {
    try {
      await finishCurrentHistory({
        companyId: currentCompany?.id,
        farmId,
        parcelId: parcelId,
        historyData: {
          ...data,
          album: {
            images: data.images || []
          }
        }
      }).unwrap();

      // Finishing also publishes the production (server-side) — tell the farmer
      // their buyer page just went live instead of navigating silently.
      toast({
        title: intl.formatMessage({ id: 'production.finished' }),
        description: intl.formatMessage({ id: 'production.finishedPublished' }),
        status: 'success',
        duration: 6000,
        isClosable: true
      });
      navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`);
    } catch (error: any) {
      console.error('Error finishing production:', error);

      let description = 'Failed to finish production. Please try again.';
      if (error?.data) {
        if (typeof error.data.detail === 'string') {
          description = error.data.detail;
        } else if (typeof error.data.error === 'string') {
          description = error.data.error;
        } else if (typeof error.data === 'object') {
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
        title: intl.formatMessage({ id: 'app.errorUpdating' }),
        description,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
    }
  };

  const handleCancel = () => {
    navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`);
  };

  return (
    <WriteAccessGuard>
      <StandardFinishProductionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        initialData={harvestPrefill}
        productName={productName}
        parcelName={parcelName}
        farmName={farmName}
        establishmentId={farmId}
        previewScore={previewScore}
        harvestDate={harvestDate}
        fallbackImageUrl={fallbackImageUrl}
      />
    </WriteAccessGuard>
  );
}

export default FinishProduction;
