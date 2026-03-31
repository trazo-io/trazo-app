import {
  LAST_REVIEWS_URL,
  PRODUCT_REPUTATION_PERCENTAGE_URL,
  PRODUCT_REPUTATION_URL,
  REVIEW_URL
} from '../../config';

import baseApi from '../api/baseApi';

export const historyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendReview: build.mutation({
      query: (review) => ({
        url: REVIEW_URL(),
        method: 'POST',
        credentials: 'include',
        body: review
      }),
      invalidatesTags: (result) => (result ? ['Review'] : [])
    }),
    getFarmLastReviews: build.query({
      query: ({ companyId, farmId, parcelId, productId, periodId, productionId }) => ({
        url:
          LAST_REVIEWS_URL(companyId, farmId) +
          (periodId ? `?period=${periodId}` : '') +
          (parcelId ? `&parcel=${parcelId}` : '') +
          (productionId ? `&production=${productionId}` : '') +
          (productId ? `&product=${productId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getFarmProductReputation: build.query({
      query: ({ companyId, farmId, parcelId, productId, periodId, productionId }) => ({
        url:
          PRODUCT_REPUTATION_URL(companyId, farmId) +
          (periodId ? `?period=${periodId}` : '') +
          (parcelId ? `&parcel=${parcelId}` : '') +
          (productionId ? `&production=${productionId}` : '') +
          (productId ? `&product=${productId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getFarmProductReputationPercentage: build.query({
      query: ({ companyId, farmId, parcelId, productId, periodId, productionId }) => ({
        url:
          PRODUCT_REPUTATION_PERCENTAGE_URL(companyId, farmId) +
          (periodId ? `?period=${periodId}` : '') +
          (parcelId ? `&parcel=${parcelId}` : '') +
          (productionId ? `&production=${productionId}` : '') +
          (productId ? `&product=${productId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getFarmReviewsPaginated: build.query({
      query: ({ establishment_id, company_id, page = 1, page_size = 20, ...filters }) => {
        const params = new URLSearchParams({
          establishment_id,
          company_id,
          page: page.toString(),
          page_size: page_size.toString(),
          ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null))
        });
        return {
          url: `reviews/establishment_reviews_paginated/?${params}`,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result) => (result ? ['Review'] : [])
    })
  }),
  overrideExisting: false
});

export const {
  useSendReviewMutation,
  useGetFarmProductReputationQuery,
  useGetFarmLastReviewsQuery,
  useGetFarmProductReputationPercentageQuery,
  useGetFarmReviewsPaginatedQuery
} = historyApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useGetFarmProductReputationQuery instead */
export const useGetEstablishmentProductReputationQuery = useGetFarmProductReputationQuery;
/** @deprecated Use useGetFarmLastReviewsQuery instead */
export const useGetEstablishmentLastReviewsQuery = useGetFarmLastReviewsQuery;
/** @deprecated Use useGetFarmProductReputationPercentageQuery instead */
export const useGetEstablishmentProductReputationPercentageQuery = useGetFarmProductReputationPercentageQuery;
/** @deprecated Use useGetFarmReviewsPaginatedQuery instead */
export const useGetEstablishmentReviewsPaginatedQuery = useGetFarmReviewsPaginatedQuery;
