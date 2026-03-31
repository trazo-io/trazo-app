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
        const { album, ...cleanEventData } = eventData;

        return {
          url: EVENT_CREATE_URL(companyId, farmId),
          method: 'POST',
          credentials: 'include',
          body: cleanEventData
        };
      },
      invalidatesTags: (result) => (result ? ['Event', 'History'] : [])
    }),
    updateEvent: build.mutation({
      query: ({ companyId, farmId, eventId, eventType, ...eventData }) => {
        // Filter out album since images are handled via pre-signed URLs
        const { album, ...cleanEventData } = eventData;

        return {
          url: EVENT_URL(companyId, farmId, eventId, eventType),
          method: 'PUT',
          credentials: 'include',
          body: cleanEventData
        };
      },
      invalidatesTags: (result, error, { eventId }) =>
        result ? [{ type: 'Event', eventId }, 'History'] : []
    }),
    deleteEvent: build.mutation({
      query: ({ companyId, farmId, eventId, eventType }) => ({
        url: EVENT_URL(companyId, farmId, eventId, eventType),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: (result, error, { eventId }) =>
        result ? [{ type: 'Event', eventId }, 'History'] : []
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
      providesTags: (result, error, farmId) =>
        result ? [{ type: 'History', farmId }] : []
    }),
    getProductionsByFarm: build.query({
      query: ({ farmId }) => ({
        url: `/history/productions/?establishment=${farmId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, farmId) =>
        result ? [{ type: 'Productions', id: farmId }] : []
    }),
    createScan: build.mutation({
      query: ({
        production_id,
        city,
        country,
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
          city,
          country,
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
    claimScans: build.mutation({
      query: ({ claim_tokens }) => ({
        url: 'public_scans/claim/',
        method: 'POST',
        credentials: 'include',
        body: { claim_tokens }
      }),
      invalidatesTags: (result) => (result?.claimed > 0 ? ['History'] : [])
    })
  }),
  overrideExisting: false
});

export const {
  useGetCurrentHistoryQuery,
  useGetParcelHistoriesQuery,
  useGetHistoryQuery,
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
  useGetProductionsByFarmQuery,
  useGetFarmScansPaginatedQuery,
  useCreateScanMutation,
  useClaimScansMutation
} = historyApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useGetScansByFarmQuery instead */
export const useGetScansByEstablishmentQuery = useGetScansByFarmQuery;
/** @deprecated Use useGetProductionsByFarmQuery instead */
export const useGetProductionsByEstablishmentQuery = useGetProductionsByFarmQuery;
/** @deprecated Use useGetFarmScansPaginatedQuery instead */
export const useGetEstablishmentScansPaginatedQuery = useGetFarmScansPaginatedQuery;
