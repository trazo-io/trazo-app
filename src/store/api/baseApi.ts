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
    'Education',
    'CropTemplate',
    'CropType',
    'EventTemplate',
    'USDA',
    'EvidencePhotos',
    'ConsumerImpact',
    'ConsumerHistory',
    'UserScans',
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
    'CertifierInspection',
    'CertifierNotice',
    'Supplier',
    'BrandOwner',
    'ProductionEquipment',
    'SeasonPlan',
    'FieldNote',
    'CrewSender'
  ]
});

export const { useGetCsrfTokenQuery } = baseApi;

export default baseApi;
