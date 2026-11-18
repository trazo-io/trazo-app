import {
  CURRENT_PRODUCTION_URL,
  EVENT_CREATE_URL,
  EVENT_URL,
  FINISH_PRODUCTION_URL,
  PARCEL_PRODUCTIONS_URL,
  PRODUCTION_URL,
  PUBLIC_HISTORY_URL,
  SCANS_BY_FARM_URL
} from '../../config';

import baseApi from '../api/baseApi';

export const historyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentHistory: build.query({
      query: ({ companyId, farmId, parcelId }) => ({
        url: CURRENT_PRODUCTION_URL(companyId, farmId, parcelId),
        method: 'GET',
        credentials: 'include'
      }),
      // Fixed: Destructure parcelId from query arg, use 'id' key, and always include plain 'History' tag
      // This ensures the query is invalidated when startProduction runs with invalidatesTags: ['History']
      providesTags: (result, error, { parcelId }) => [{ type: 'History', id: parcelId }, 'History']
    }),
    finishCurrentHistory: build.mutation({
      query: ({ companyId, farmId, parcelId, historyData }) => {
        const formData = new FormData();

        historyData.album.images.forEach((file) => {
          formData.append('album[images]', file);
        });

        for (const [key, value] of Object.entries(historyData)) {
          // The emptiness test is deliberately `!== ''` and not `!value`: `published`
          // is a boolean and `false` is its meaningful value. Dropping it here would
          // send no key at all, which the backend reads as "publish" — the buyer page
          // would go live against an unchecked box. FormData stringifies it to "false",
          // which History.finish()'s _parse_publish_flag expects.
          if (key !== 'album' && value !== null && value !== undefined && value !== '') {
            formData.append(key, value);
          }
        }
        return {
          url: FINISH_PRODUCTION_URL(companyId, farmId, parcelId),
          method: 'POST',
          credentials: 'include',
          body: formData,
          formData: true
        };
      },
      invalidatesTags: (result, error, { parcelId }) =>
        result ? [{ type: 'History', id: parcelId }, 'History'] : ['History']
    }),
    getParcelHistories: build.query({
      query: ({ companyId, farmId, parcelId }) => {
        return {
          url: PARCEL_PRODUCTIONS_URL(companyId, farmId, parcelId),
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result, error, { parcelId }) => [{ type: 'History', id: parcelId }, 'History']
    }),
    getUserProductionScans: build.query({
      query: () => ({
        url: 'productions/my_scans/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result) => (result ? ['History'] : [])
    }),
    getUserReviews: build.query({
      query: () => ({
        url: 'productions/my_reviews/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result) => (result ? ['History'] : [])
    }),
    getFarmScansPaginated: build.query({
      query: ({ establishment_id, company_id, page = 1, page_size = 20, ...filters }) => {
        const params = new URLSearchParams({
          establishment_id,
          company_id,
          page: page.toString(),
          page_size: page_size.toString(),
          ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null))
        });
        return {
          url: `productions/establishment_scans_paginated/?${params}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result) => (result ? ['History'] : [])
    }),
    getHistory: build.query({
      query: (historyId) => ({
        url: PRODUCTION_URL(historyId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, historyId) => (result ? [{ type: 'History', historyId }] : [])
    }),
    /**
     * Every production on one farm — the picker source for "which lot does this document
     * belong to". Tenant-scoped server-side (HistoryViewSet.get_queryset filters on the
     * caller's companies before it applies `establishment`).
     */
    getFarmProductions: build.query({
      query: (establishmentId) => ({
        url: `${PRODUCTION_URL('')}?establishment=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.results ?? [],
      providesTags: ['History']
    }),
    getEvent: build.query({
      // One cache entry per record, whatever the caller's types: the Activities detail passes
      // string ids, the edit form numbers, ApplicationGroupNotice the raw route strings. The
      // default key JSON-stringifies the args, so 7 and "7" were three fetches of one record.
      serializeQueryArgs: ({ queryArgs }) => {
        const { companyId, farmId, eventId, eventType } = queryArgs || {};
        return `getEvent(${[companyId, farmId, eventId, eventType]
          .map((v) => String(v ?? ''))
          .join('/')})`;
      },
      query: ({ companyId, farmId, eventId, eventType }) => ({
        url: EVENT_URL(companyId, farmId, eventId, eventType),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, eventId) => (result ? [{ type: 'Event', eventId }] : [])
    }),
    createEvent: build.mutation({
      query: ({ companyId, farmId, ...eventData }) => {
        // Filter out album since images are handled via pre-signed URLs
        // eslint-disable-next-line no-unused-vars -- destructured only to omit it
        const { album: _album, ...cleanEventData } = eventData;

        return {
          url: EVENT_CREATE_URL(companyId, farmId),
          method: 'POST',
          credentials: 'include',
          body: cleanEventData
        };
      },
      // 'SeasonPlan' because a record logged against a planned practice closes that
      // checklist item server-side, so the plan's completeness is stale the moment this
      // succeeds. (See store/api/seasonPlanApi.ts.)
      //
      // 'FieldNote' for the same reason and for a sharper one. `_confirm_field_note` spends the
      // note inside this very request (history/views.py), so the inbox queue is stale the moment
      // this succeeds. Without the tag the ONLY invalidator of 'FieldNote' was discard, and the
      // queue kept serving a note already logged for the default 60s keepUnusedDataFor. Tapping
      // "Log this" on that row sent `field_note` again, `_resolve_field_note` filters
      // status=PENDING and returned None, and `_confirm_field_note` returned early with only a
      // log line: a SECOND event for one crew message, unlinked, with nothing on screen.
      // § 205.103(b)(2) needs records an inspector can trace, so a silent duplicate is not
      // cosmetic. Both slices inject into the same baseApi, so this tag does reach fieldNoteApi.
      invalidatesTags: (result, error) =>
        error ? [] : ['Event', 'History', 'SeasonPlan', 'FieldNote']
    }),
    updateEvent: build.mutation({
      query: ({ companyId, farmId, eventId, eventType, ...eventData }) => {
        // Filter out album since images are handled via pre-signed URLs
        // eslint-disable-next-line no-unused-vars -- destructured only to omit it
        const { album: _album, ...cleanEventData } = eventData;

        return {
          url: EVENT_URL(companyId, farmId, eventId, eventType),
          method: 'PUT',
          credentials: 'include',
          body: cleanEventData
        };
      },
      // Guarded on `error`, not on `result` — see deleteEvent below for why, and because
      // `{ type: 'Event', eventId }` was never a valid tag descriptor either: the id key is
      // `id`, so this provided `{type:'Event', id:undefined}` and matched nothing specific.
      invalidatesTags: (result, error, { eventId }) =>
        error ? [] : [{ type: 'Event', id: eventId }, 'Event', 'History', 'SeasonPlan']
    }),
    deleteEvent: build.mutation({
      query: ({ companyId, farmId, eventId, eventType }) => ({
        url: EVENT_URL(companyId, farmId, eventId, eventType),
        method: 'DELETE',
        credentials: 'include'
      }),
      // ⚠️ Was `result ? [...] : []`. DELETE answers 204 with an empty body, so `result` is
      // null on SUCCESS and this invalidated NOTHING — the production timeline and the farm
      // dashboard both kept showing a record the server had already deleted. Guard on
      // `error`: RTK passes the error and leaves `result` undefined when the call fails.
      //
      // 'SeasonPlan' matters as of 2026-08-19: deleting the record that fulfilled a planned
      // practice puts that item back on the checklist server-side, so the plan is stale.
      invalidatesTags: (result, error, { eventId }) =>
        error ? [] : [{ type: 'Event', id: eventId }, 'Event', 'History', 'SeasonPlan']
    }),
    createProduction: build.mutation({
      query: (production) => ({
        url: PRODUCTION_URL(),
        method: 'POST',
        credentials: 'include',
        body: production
      }),
      invalidatesTags: (result) => (result ? ['History'] : [])
    }),
    updateProduction: build.mutation({
      query: ({ historyId, ...production }) => ({
        url: PRODUCTION_URL(historyId),
        method: 'PATCH',
        credentials: 'include',
        body: production
      }),
      invalidatesTags: (result, error, { historyId }) =>
        result ? [{ type: 'History', historyId }, 'History'] : []
    }),
    deleteProduction: build.mutation({
      query: (historyId) => ({
        url: PRODUCTION_URL(historyId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: (result, error, historyId) => [
        { type: 'History', historyId },
        'History',
        'Productions'
      ]
    }),
    getPublicHistory: build.query({
      query: (historyId) => ({
        url: PUBLIC_HISTORY_URL(historyId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, historyId) => (result ? [{ type: 'History', historyId }] : [])
    }),
    getScansByFarm: build.query({
      query: ({ companyId, farmId, parcelId, productId, productionId, period }) => ({
        url:
          SCANS_BY_FARM_URL(companyId, farmId) +
          (parcelId || productId || productionId || period ? '?' : '') +
          (parcelId ? `&parcel=${parcelId} ` : ``) +
          (productId ? `&product=${productId} ` : ``) +
          (productionId ? `&production=${productionId} ` : ``) +
          (period ? `&period=${period} ` : ``),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, farmId) => (result ? [{ type: 'History', farmId }] : [])
    }),
    createScan: build.mutation({
      // `city` / `country` used to be declared here. The backend now derives
      // location from the request IP via the local GeoLite2 database and ignores
      // any location in the body — a public unauthenticated endpoint must not let
      // the caller pick the location its farmer sees on the dashboard.
      query: ({
        production_id,
        explicit_consent,
        consent_timestamp,
        time_on_page,
        interactions,
        screen,
        comment
      }) => ({
        url: 'public_scans/',
        method: 'POST',
        credentials: 'include',
        body: {
          production_id,
          explicit_consent,
          consent_timestamp,
          time_on_page,
          interactions,
          screen,
          comment
        }
      }),
      invalidatesTags: (result) => (result ? ['History'] : [])
    }),
    // Attaches consented analytics to a scan already recorded anonymously.
    // The scan POSTs on page mount; the consent banner renders after it, so a
    // first-time visitor can never carry consent on the original request — and
    // for QR traffic the first visit is the only visit. Authorised by the
    // claim_token returned at create time; consent itself is re-read server-side
    // from the cookie, never trusted from this body.
    upgradeScanConsent: build.mutation({
      query: ({ claim_token }) => ({
        url: 'public_scans/consent/',
        method: 'POST',
        credentials: 'include',
        body: { claim_token }
      })
    }),
    claimScans: build.mutation({
      query: ({ claim_tokens }) => ({
        url: 'public_scans/claim/',
        method: 'POST',
        credentials: 'include',
        body: { claim_tokens }
      }),
      invalidatesTags: (result) => (result?.claimed > 0 ? ['History'] : [])
    }),
    // Recent chemical inputs for quick-pick prefill (distinct products, most recent first)
    getRecentInputs: build.query({
      query: ({ establishmentId }) => ({
        url: `productions/recent-inputs/?establishment_id=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result) => (result ? ['Event'] : [])
    }),
    // The materials on the plan in force, for the input and amendment forms' quick-pick (CCOF ORGB41:
    // only materials on the OSP Materials List may be used). Offered, never filled in by itself.
    // NEVER: name it `getPlanMaterials`. ospApi injects an endpoint of that name into the same baseApi,
    // and the first injection wins, so the forms asked /osps/undefined/plan-materials/ (2026-11-17).
    getPlanMaterialsForLogging: build.query({
      query: ({ establishmentId }) => ({
        url: `productions/plan-materials/?establishment_id=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      }),
      // Id-scoped, as the OSP materials mutations invalidate: a bare 'OSP' tag is never hit by
      // { type: 'OSP', id } (review of app #419).
      providesTags: (result) =>
        result
          ? [
              { type: 'OSP', id: 'LIST' },
              ...(result.osp_id ? [{ type: 'OSP', id: Number(result.osp_id) }] : [])
            ]
          : []
    }),
    // Sales records per production lot (SOE traceback) — owner-gated, never public
    // USDA Form 10 Part A is a PERSISTENT supplier list — its purpose is to be referenced
    // again next season, which a free-text string retyped per event cannot do. Derived from
    // the farm's own prior records rather than a curated entity; see the endpoint docstring
    // for the trade-off.
    getSeedSuppliers: build.query({
      query: ({ establishmentId }) => ({
        url: `productions/seed-suppliers/?establishment_id=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      })
    }),
    getSalesRecords: build.query({
      query: ({ productionId }) => ({
        url: `sales_records/?production_id=${productionId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { productionId }) => [
        { type: 'SalesRecords', id: productionId }
      ]
    }),
    // Owner-gated. The lot code is not on the public history payload by design — it links a
    // buyer to a block and a date (§ 205.103(b)(2)), which is a record for the operator and
    // their certifier, not a consumer claim.
    getHarvestLots: build.query({
      query: ({ productionId }) => ({
        url: `sales_records/harvest_lots/?production_id=${productionId}`,
        method: 'GET',
        credentials: 'include'
      }),
      // 'Event' too: sales are recorded while the season is still being picked, so a pick
      // logged a minute ago has to be offered as a link target now, not after the 60s cache
      // expires. Every event create/update/delete invalidates 'Event'.
      providesTags: (result, error, { productionId }) => [
        { type: 'SalesRecords', id: productionId },
        'Event'
      ]
    }),
    // The traceback drill. Search returns EVERY sale a document number matches (lot codes are not
    // unique across seasons), never a pick; the trace is the chain behind one live sale.
    searchTracebackSales: build.query({
      query: ({ q, random, establishmentId }) => {
        const params = new URLSearchParams();
        if (random) params.set('random', '1');
        else params.set('q', q);
        if (establishmentId) params.set('establishment_id', establishmentId);
        return {
          url: `sales_records/traceback_search/?${params}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      keepUnusedDataFor: 0
    }),
    // The farm in the page's URL goes along: a sale from the company's other farm is "not
    // found" here rather than rendered under this farm's breadcrumb.
    getSaleTraceback: build.query({
      query: ({ saleId, establishmentId }) => ({
        url: `sales_records/${saleId}/traceback/?establishment_id=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      }),
      keepUnusedDataFor: 0
    }),
    // The same drill from a harvest lot: product in storage, not yet sold. Search returns EVERY
    // pick a lot code, packer's receipt or season lot ID matches; the trace is the chain behind
    // one pick, forward to the sales that name it.
    searchTracebackLots: build.query({
      query: ({ q, establishmentId }) => {
        const params = new URLSearchParams({ q });
        if (establishmentId) params.set('establishment_id', establishmentId);
        return {
          url: `sales_records/lot_traceback_search/?${params}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      keepUnusedDataFor: 0
    }),
    getLotTraceback: build.query({
      query: ({ pickId, establishmentId }) => ({
        url: `sales_records/lot_traceback/${pickId}/?establishment_id=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      }),
      keepUnusedDataFor: 0
    }),
    createSalesRecord: build.mutation({
      query: (salesRecord) => ({
        url: 'sales_records/',
        method: 'POST',
        credentials: 'include',
        body: salesRecord
      }),
      invalidatesTags: (result, error, { production_id }) =>
        result ? [{ type: 'SalesRecords', id: production_id }] : []
    }),
    deleteSalesRecord: build.mutation({
      query: ({ recordId }) => ({
        url: `sales_records/${recordId}/`,
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: (result, error, { productionId }) => [
        { type: 'SalesRecords', id: productionId }
      ]
    }),
    // Void, not delete. Once the season is finished the server refuses a DELETE
    // (7 CFR 205.103(b)(4) — the sale is the far end of the audit trail), so this is the
    // correction path: the row stays on the record with the operator's reason and stops
    // counting as a sale.
    voidSalesRecord: build.mutation({
      query: ({ recordId, voidReason }) => ({
        url: `sales_records/${recordId}/void/`,
        method: 'POST',
        credentials: 'include',
        body: { void_reason: voidReason }
      }),
      invalidatesTags: (result, error, { productionId }) => [
        { type: 'SalesRecords', id: productionId }
      ]
    })
  }),
  overrideExisting: false
});

export const {
  useGetCurrentHistoryQuery,
  useGetParcelHistoriesQuery,
  useGetHistoryQuery,
  useGetFarmProductionsQuery,
  useGetEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useCreateProductionMutation,
  useUpdateProductionMutation,
  useDeleteProductionMutation,
  useFinishCurrentHistoryMutation,
  useGetPublicHistoryQuery,
  useGetScansByFarmQuery,
  useGetUserProductionScansQuery,
  useGetUserReviewsQuery,
  useGetFarmScansPaginatedQuery,
  useCreateScanMutation,
  useUpgradeScanConsentMutation,
  useClaimScansMutation,
  useGetRecentInputsQuery,
  useGetPlanMaterialsForLoggingQuery,
  useGetSeedSuppliersQuery,
  useGetSalesRecordsQuery,
  useGetHarvestLotsQuery,
  useSearchTracebackSalesQuery,
  useGetSaleTracebackQuery,
  useSearchTracebackLotsQuery,
  useGetLotTracebackQuery,
  useCreateSalesRecordMutation,
  useDeleteSalesRecordMutation,
  useVoidSalesRecordMutation
} = historyApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useGetScansByFarmQuery instead */
export const useGetScansByEstablishmentQuery = useGetScansByFarmQuery;
/** @deprecated Use useGetFarmScansPaginatedQuery instead */
export const useGetEstablishmentScansPaginatedQuery = useGetFarmScansPaginatedQuery;
