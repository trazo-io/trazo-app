import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { TokenManager } from '../../../utils/secureTokenStorage';

// Define the API slice for carbon-related endpoints
export const carbonApi = createApi({
  reducerPath: 'carbonApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/carbon/',
    prepareHeaders: (headers) => {
      // Get token from TokenManager (same as other working APIs)
      const token = TokenManager.getAccessToken();
      console.log('🔒 CARBON API: Getting token for carbon request. Token found:', !!token, 'Length:', token?.length || 0);
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
        console.log('🔒 CARBON API: Added Authorization header');
      } else {
        console.log('🔒 CARBON API: No token found, request will be unauthenticated');
      }
      
      return headers;
    }
  }),
  endpoints: (builder) => ({
    // Endpoint for fetching QR code summary data (consumer-facing)
    getQRCodeSummary: builder.query<any, string>({
      query: (qrCodeId) => `qr_summary/${qrCodeId}/`
    })
    // Add other carbon-related endpoints here as needed
  })
});

// Export hooks for usage in components
export const { useGetQRCodeSummaryQuery } = carbonApi;
