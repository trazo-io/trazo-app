import {
  COMMENT_HISTORY_URL,
  CURRENT_HISTORY,
  EVENT_CREATE_URL,
  EVENT_URL,
  FINISH_HISTORY,
  HISTORY_URL,
  PARCEL_HISTORY_URL,
  PRODUCTION_URL,
  PUBLIC_HISTORY_URL,
  SCANS_BY_FARM_URL
} from '../../config';

import baseApi from '../api/baseApi';

export const historyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentHistory: build.query({
      query: ({ companyId, farmId, parcelId }) => ({
        url: CURRENT_HISTORY(companyId, farmId, parcelId),
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
          url: FINISH_HISTORY(companyId, farmId, parcelId),
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
          url: PARCEL_HISTORY_URL(companyId, farmId, parcelId),
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result, error, { parcelId }) => [{ type: 'History', id: parcelId }, 'History']
    }),
    getUserProductionScans: build.query({
      query: () => ({
        url: 'histories/my_scans/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result) => (result ? ['History'] : [])
    }),
    getUserReviews: build.query({
      query: () => ({
        url: 'histories/my_reviews/',
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
          url: `histories/establishment_scans_paginated/?${params}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result) => (result ? ['History'] : [])
    }),
    getHistory: build.query({
      query: (historyId) => ({
        url: HISTORY_URL(historyId),
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
        url: `${HISTORY_URL('')}?establishment=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.results ?? [],
      providesTags: ['History']
    }),
    getEvent: build.query({
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
      invalidatesTags: (result, error) => (error ? [] : ['Event', 'History', 'SeasonPlan'])
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
    commentHistory: build.mutation({
      query: ({ comment, scanId }) => ({
        url: COMMENT_HISTORY_URL(scanId),
        method: 'POST',
        credentials: 'include',
        body: { comment }
      }),
      invalidatesTags: (result) => (result ? ['History'] : [])
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
        url: `histories/recent-inputs/?establishment_id=${establishmentId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result) => (result ? ['Event'] : [])
    }),
    // Sales records per production lot (SOE traceback) — owner-gated, never public
    // USDA Form 10 Part A is a PERSISTENT supplier list — its purpose is to be referenced
    // again next season, which a free-text string retyped per event cannot do. Derived from
    // the farm's own prior records rather than a curated entity; see the endpoint docstring
    // for the trade-off.
    getSeedSuppliers: build.query({
      query: ({ establishmentId }) => ({
        url: `histories/seed-suppliers/?establishment_id=${establishmentId}`,
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
      providesTags: (result, error, { productionId }) => [
        { type: 'SalesRecords', id: productionId }
      ]
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
  useCommentHistoryMutation,
  useGetScansByFarmQuery,
  useGetUserProductionScansQuery,
  useGetUserReviewsQuery,
  useGetFarmScansPaginatedQuery,
  useCreateScanMutation,
  useUpgradeScanConsentMutation,
  useClaimScansMutation,
  useGetRecentInputsQuery,
  useGetSeedSuppliersQuery,
  useGetSalesRecordsQuery,
  useGetHarvestLotsQuery,
  useCreateSalesRecordMutation,
  useDeleteSalesRecordMutation,
  useVoidSalesRecordMutation
} = historyApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useGetScansByFarmQuery instead */
export const useGetScansByEstablishmentQuery = useGetScansByFarmQuery;
/** @deprecated Use useGetFarmScansPaginatedQuery instead */
export const useGetEstablishmentScansPaginatedQuery = useGetFarmScansPaginatedQuery;
