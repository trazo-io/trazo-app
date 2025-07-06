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
    getEstablishmentLastReviews: build.query({
      query: ({ companyId, establishmentId, parcelId, productId, periodId, productionId }) => ({
        url:
          LAST_REVIEWS_URL(companyId, establishmentId) +
          (periodId ? `?period=${periodId}` : '') +
          (parcelId ? `&parcel=${parcelId}` : '') +
          (productionId ? `&production=${productionId}` : '') +
          (productId ? `&product=${productId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getEstablishmentProductReputation: build.query({
      query: ({ companyId, establishmentId, parcelId, productId, periodId, productionId }) => ({
        url:
          PRODUCT_REPUTATION_URL(companyId, establishmentId) +
          (periodId ? `?period=${periodId}` : '') +
          (parcelId ? `&parcel=${parcelId}` : '') +
          (productionId ? `&production=${productionId}` : '') +
          (productId ? `&product=${productId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getEstablishmentProductReputationPercentage: build.query({
      query: ({ companyId, establishmentId, parcelId, productId, periodId, productionId }) => ({
        url:
          PRODUCT_REPUTATION_PERCENTAGE_URL(companyId, establishmentId) +
          (periodId ? `?period=${periodId}` : '') +
          (parcelId ? `&parcel=${parcelId}` : '') +
          (productionId ? `&production=${productionId}` : '') +
          (productId ? `&product=${productId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getEstablishmentReviewsPaginated: build.query({
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
  useGetEstablishmentProductReputationQuery,
  useGetEstablishmentLastReviewsQuery,
  useGetEstablishmentProductReputationPercentageQuery,
  useGetEstablishmentReviewsPaginatedQuery
} = historyApi;
