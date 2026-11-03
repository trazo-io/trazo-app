import { createApi } from '@reduxjs/toolkit/query/react';
import customFetchBase from './customFetchBase';

export const baseApi = createApi({
  baseQuery: customFetchBase,
  endpoints: (builder) => ({
    // Global CSRF Token endpoint
    getCsrfToken: builder.query<{ csrf_token: string; message: string }, void>({
      query: () => ({
        url: 'csrf-token/',
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
    'Farm',
    'Establishment',
    'Event',
    'Subscription',
    'Addon',
    'PaymentMethod',
    'Invoice',
    'CarbonSummary',
    'CarbonRecommendations',
    // getCarbonBenchmarks has always declared providesTags: ['CarbonBenchmarks'] while the tag
    // was never in this list, so RTK Query rejected it and tsc flagged it. Nothing invalidates
    // it, so declaring it is inert at runtime and keeps the endpoint's stated intent.
    'CarbonBenchmarks',
    'Education',
    'CropTemplate',
    'CropType',
    'EventTemplate',
    'USDA',
    'SecurityStatus',
    'EvidencePhotos',
    'ConsumerImpact',
    'ConsumerHistory',
    'UserFavorites',
    'UserScans',
    'ShoppingGoals',
    'ConsumerRecommendations',
    'ConsumerAnalytics',
    'Notification',
    'NotificationCount',
    'Search',
    'NotificationPreferences',
    'Media',
    'PresignedUrl',
    'DashboardComprehensive',
    'CarbonAnalytics',
    'VoiceConfig',
    'Certification',
    'ParcelCropHistory',
    'OSP',
    'OSPModules',
    'ParcelApplication',
    'FarmDocuments',
    'SalesRecords',
    'StateOrganicRegistration',
    'CertifierAccessLink',
    'LandownerAffidavit',
    'AdjoiningLandAffidavit',
    'OSPAnnualUpdate',
    'OSPChangeNotification',
    'OSPReview',
    'OSPRecordTypes',
    'PostHarvestFacility',
    'Supplier',
    'BrandOwner',
    'SeasonPlan',
    'FieldNote',
    'CrewSender'
  ]
});

export const { useGetCsrfTokenQuery } = baseApi;

export default baseApi;
