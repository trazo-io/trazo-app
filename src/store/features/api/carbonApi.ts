import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from '../../api/customFetchBase';

// Define the API slice for carbon-related endpoints
export const carbonApi = createApi({
  reducerPath: 'carbonApi',
  baseQuery: customFetchBase,
  endpoints: (builder) => ({
    // Endpoint for fetching QR code summary data (consumer-facing)
    getQRCodeSummary: builder.query<any, string>({
      query: (qrCodeId) => `carbon/qr_summary/${qrCodeId}/`
    }),
    
    // Smart Product Search - fuzzy search for agricultural products
    searchSmartProducts: builder.query<any, { q: string; max_results?: number; type_filter?: string }>({
      query: ({ q, max_results = 8, type_filter }) => ({
        url: 'carbon/smart-product/search/',
        params: { q, max_results, type_filter }
      })
    }),
    
    // Smart Product Validation - validate product name against selected type
    validateSmartProduct: builder.mutation<any, { commercial_name: string; user_selected_type: string; confidence_threshold?: number }>({
      query: (data) => ({
        url: 'carbon/smart-product/validate/',
        method: 'POST',
        body: data
      })
    }),
    
    // Smart Product Suggestions by Type - get suggestions filtered by chemical type
    getSmartProductSuggestions: builder.query<any, { type?: string; limit?: number }>({
      query: ({ type, limit = 10 }) => ({
        url: 'carbon/smart-product/suggestions/',
        params: { type, limit }
      })
    }),
    
    // Smart Product Stats - get system statistics
    getSmartProductStats: builder.query<any, void>({
      query: () => 'carbon/smart-product/stats/'
    })
  })
});

// Export hooks for usage in components
export const { 
  useGetQRCodeSummaryQuery,
  useSearchSmartProductsQuery,
  useLazySearchSmartProductsQuery,
  useValidateSmartProductMutation,
  useGetSmartProductSuggestionsQuery,
  useGetSmartProductStatsQuery
} = carbonApi;
