import React, { useMemo } from 'react';
import { computeHarvestPrefill } from 'utils/harvestPrefill';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useToast } from '@chakra-ui/react';
import { StandardFinishProductionForm } from '../../../../components/Forms';
import { useFinishCurrentHistoryMutation, useGetHistoryQuery } from 'store/api/historyApi.js';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';

function FinishProduction() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { parcelId, farmId, productionId } = useParams();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // 🔴 F30 (2026-08-21) — THE SEASON BEING CLOSED, fetched by its own id.
  //
  // This page used to read `useGetCurrentHistoryQuery({ farmId, parcelId })` — the PARCEL's
  // current season, meaning whichever one started last — for the crop name, the parcel name,
  // the harvest date, the consumer preview AND the harvest pre-fill, while `handleSubmit`
  // posted `history: productionId` from the URL. Two different seasons in one screen. On a
  // perennial block carrying a 2025 and a 2026 cycle, closing the 2025 one would have offered
  // the 2026 season's harvest total as the 2025 lot header, beside the 2026 crop name, and
  // closed 2025 with it.
  //
  // It was latent only because F29 meant the sole link into this page passed
  // `currentHistory.id`, so the two agreed by accident. Fixing F29 — putting Finish on the
  // production page, where the season is named — is exactly what would have made it live, so
  // the two fixes ship together.
  //
  // `retrieve` and `current_history` both resolve to `HistorySerializer`, so the payload shape
  // (including `events`, whose `type` arrives as `event.production.harvesting`) is identical.
  // `HistoryViewSet.get_object` accepts a pk or a public UUID, so either form of
  // `productionId` in the route resolves.
  const { data: production } = useGetHistoryQuery(productionId, { skip: !productionId });

  // Same transparency endpoint the consumer page calls. Owners can fetch
  // unpublished histories (see `production_transparency_detail` perms),
  // so the preview can show the real score / farm name / harvest date
  // that consumers will see.
  const productionPublicId: string | undefined =
    typeof production?.public_id === 'string' ? production.public_id : undefined;

  const { data: transparency } = useGetTransparencyDetailsQuery(productionPublicId as string, {
    skip: !productionPublicId
  });

  // Mirror the consumer page's data extraction path so the preview can show
  // the same farm/product/harvest values shoppers will see. `farmer` and
  // `product` live at the response root (alongside `standard_view`), per
  // ProductDetail.tsx's existing logic.
  const productName: string =
    (transparency as any)?.product?.name ||
    (typeof production?.product === 'string' ? production.product : '');
  const parcelName: string = typeof production?.parcel === 'string' ? production.parcel : '';
  const farmName: string = (transparency as any)?.farmer?.name || currentCompany?.name || '';
  // ProductDetail.tsx passes `completeData.finish_date` to the live hero;
  // for unfinished productions this is null, so the preview omits the
  // "Harvested ..." suffix. After finish, the same field drives the
  // consumer hero exactly.
  const harvestDate: string | undefined =
    (transparency as any)?.finish_date || (production as any)?.finish_date || undefined;

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
  // `production` reference while the cache entry is unchanged, so keying on it means the
  // prefill object only changes when the underlying production actually does.
  const harvestPrefill = useMemo(() => {
    // 🔴 2026-08-21 — the body that lived here took the LATEST event carrying any
    // `yield_quantity`, which on a real blueberry season was the buffer-row `BU` record
    // (sold conventional under § 205.202(c)) — so a 118,750 lb organic lot opened pre-filled
    // with 2,150 lb of not-organic fruit. The helper sums the harvest records and nothing
    // else; see utils/harvestPrefill for the full reasoning and the guard.
    const events = ((production as any)?.events || []) as Array<any>;
    const prefill = computeHarvestPrefill(events);
    if (!prefill) return undefined;
    const { pick_count: _picks, ...formFields } = prefill;
    return formFields;
  }, [production]);

  const [finishCurrentHistory, { isLoading }] = useFinishCurrentHistoryMutation();

  const handleSubmit = async (data: any) => {
    // Name the season or do not submit.
    //
    // The server is not relying on us — `product/views.py` resolves `history` from either the
    // numeric pk or the public UUID, refuses an already-finished season, and falls back to
    // the parcel's own season ONLY when exactly one is open, where the fallback cannot pick
    // wrong. So this guard is not load-bearing; it is here to fail with a sentence the farmer
    // can act on rather than to post a request whose meaning depends on how many seasons
    // happen to be open. The route always supplies `productionId`, so it should never fire.
    if (!productionId) {
      toast({
        title: intl.formatMessage({ id: 'app.errorUpdating' }),
        description: intl.formatMessage({ id: 'production.finish.noSeasonNamed' }),
        status: 'error',
        duration: 6000,
        isClosable: true
      });
      return;
    }
    try {
      const finished = await finishCurrentHistory({
        companyId: currentCompany?.id,
        farmId,
        parcelId: parcelId,
        historyData: {
          ...data,
          // 🔴 The season being closed is NAMED. Before `product/views.py` stopped guessing
          // (2026-08-20, it now falls back only when exactly ONE season is open), the endpoint
          // acted on `parcel.current_history` — whichever started last — so on a block with
          // two open seasons, closing the 2025 one validated against the 2026 one and told the
          // farmer "finish date cannot be before 2026-03-18", a date they never entered. Had
          // the dates lined up it would have closed the wrong season, irreversibly.
          //
          // Unconditional now: the guard at the top of this handler already refused a submit
          // with no `productionId`, so the old ternary's empty-object branch was unreachable
          // and only obscured that this key is mandatory.
          history: productionId,
          album: {
            images: data.images || []
          }
        }
      }).unwrap();

      // Finishing publishes the buyer page unless the farmer unchecked it in the confirm
      // dialog. This toast used to claim the page was live unconditionally, which would
      // now be wrong half the time. Read the SERVER's `published` off the finish response
      // rather than the flag we sent: telling a farmer their lot is private when it is
      // actually live is the one error here with a privacy consequence, so the claim has
      // to come from the record, not from our own request. Fall back to the request only
      // if the field is missing from the payload.
      // (`??` only falls through on null/undefined, so a server `false` is respected.)
      const isPublished = finished?.published ?? data?.published !== false;
      toast({
        title: intl.formatMessage({ id: 'production.finished' }),
        description: intl.formatMessage({
          id: isPublished ? 'production.finishedPublished' : 'production.finishedUnpublished'
        }),
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
  // Names where handleCancel goes: the form's footer has its own previous-step control.
  const backLabel = parcelName
    ? intl.formatMessage({ id: 'common.backTo' }, { place: parcelName })
    : intl.formatMessage({ id: 'common.backToParcel' });

  return (
    <WriteAccessGuard>
      <StandardFinishProductionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        backLabel={backLabel}
        isLoading={isLoading}
        initialData={harvestPrefill}
        productName={productName}
        parcelName={parcelName}
        farmName={farmName}
        establishmentId={farmId}
        harvestDate={harvestDate}
        fallbackImageUrl={fallbackImageUrl}
      />
    </WriteAccessGuard>
  );
}

export default FinishProduction;
