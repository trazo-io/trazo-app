/**
 * Buyer Page endpoints (WS-6) — aggregation over EXISTING backend surfaces:
 * farm histories (published flag rides the normal history PATCH), buyer
 * documentation requests (owner list + status transitions). QR / lot-tag
 * downloads are plain authenticated GETs consumed as anchor hrefs.
 */

import baseApi from './baseApi';

export interface BuyerProductionRow {
  id: number;
  public_id: string;
  name: string | null;
  start_date: string | null;
  finish_date: string | null;
  published: boolean;
  product?: { id: number; name: string } | string | null;
  parcel?: { id: number; name: string } | string | null;
  events_count?: number;
}

export interface BuyerDocRequestRow {
  id: number;
  requester_name: string;
  requester_email: string;
  organization: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
  production_name?: string | null;
  production_id?: number | null;
}

const buyerPageApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBuyerFarmProductions: build.query<
      BuyerProductionRow[],
      { companyId: string; farmId: string }
    >({
      query: ({ farmId }) => ({
        url: `/productions/?establishment=${farmId}`,
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response: unknown) => {
        if (Array.isArray(response)) return response as BuyerProductionRow[];
        const paged = response as { results?: BuyerProductionRow[] };
        return paged.results ?? [];
      },
      providesTags: (_r, _e, { farmId }) => [{ type: 'History', id: `buyer-${farmId}` }]
    }),
    setProductionPublished: build.mutation<
      unknown,
      { companyId: string; farmId: string; productionId: number; published: boolean }
    >({
      query: ({ productionId, published }) => ({
        url: `/productions/${productionId}/`,
        method: 'PATCH',
        credentials: 'include',
        body: { published }
      }),
      invalidatesTags: (_r, _e, { farmId }) => [{ type: 'History', id: `buyer-${farmId}` }]
    }),
    getBuyerPageDocRequests: build.query<BuyerDocRequestRow[], { farmId: string }>({
      query: ({ farmId }) => ({
        url: `/buyer_doc_requests/?establishment_id=${farmId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { farmId }) => [{ type: 'History', id: `buyer-reqs-${farmId}` }]
    }),
    setBuyerDocRequestStatus: build.mutation<
      unknown,
      { farmId: string; requestId: number; status: BuyerDocRequestRow['status'] }
    >({
      query: ({ requestId, status }) => ({
        url: `/buyer_doc_requests/${requestId}/`,
        method: 'PATCH',
        credentials: 'include',
        body: { status }
      }),
      invalidatesTags: (_r, _e, { farmId }) => [{ type: 'History', id: `buyer-reqs-${farmId}` }]
    })
  })
});

export const {
  useGetBuyerFarmProductionsQuery,
  useSetProductionPublishedMutation,
  useGetBuyerPageDocRequestsQuery,
  useSetBuyerDocRequestStatusMutation
} = buyerPageApi;

export default buyerPageApi;
