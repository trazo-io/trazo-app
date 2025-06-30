import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from './customFetchBase';

export const baseApi = createApi({
  baseQuery: customFetchBase,
  endpoints: (builder) => ({
    // Global CSRF Token endpoint
    getCsrfToken: builder.query<{ csrf_token: string; message: string }, void>({
      query: () => ({
        url: 'api/csrf-token/',
        method: 'GET'
      })
    })
  }),
  reducerPath: 'baseApi',
  tagTypes: [
    'User',
    'Company',
    'Parcel',
    'History',
    'Establishment',
    'Event',
    'Subscription',
    'Addon',
    'PaymentMethod',
    'Invoice',
    'CarbonSummary',
    'CarbonBenchmarks',
    'CarbonRecommendations',
    'IoTDevice',
    'IoTData',
    'AutomationRule',
    'PendingEvent',
    'Weather',
    'Education',
    'CropTemplate',
    'CropType',
    'EventTemplate',
    'USDA',
    'SecurityStatus',
    'EvidencePhotos'
  ]
});

export const { useGetCsrfTokenQuery } = baseApi;

export default baseApi;
