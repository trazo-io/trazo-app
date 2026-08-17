import { COMPANY_URL, FARM_URL } from 'config';

import { Company } from 'types/company';
import baseApi from './baseApi';

const companyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCompany: build.query<Company, string>({
      query: (companyId: string) => ({
        url: COMPANY_URL(companyId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, companyId) => [
        { type: 'Company', id: companyId },
        ...(result?.establishments?.map((est) => ({
          type: 'Farm' as const,
          id: est.id
        })) || []),
        { type: 'Subscription', id: result?.subscription?.id }
      ]
    }),
    createCompany: build.mutation({
      query: (formData) => {
        return {
          url: COMPANY_URL(),
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: formData
        };
      },
      invalidatesTags: ['Company']
    }),
    updateCompany: build.mutation<
      Company,
      { companyId: string | number; companyData: Partial<Company> }
    >({
      query: ({ companyId, companyData }) => ({
        url: COMPANY_URL(String(companyId)),
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: companyData
      }),
      invalidatesTags: ['Company']
    }),
    createFarm: build.mutation({
      query: ({ companyId, establishment }) => {
        // If we have uploaded image URLs, send them as JSON
        if (establishment.uploaded_image_urls && establishment.uploaded_image_urls.length > 0) {
          return {
            url: FARM_URL(companyId),
            method: 'POST',
            body: establishment,
            credentials: 'include'
          };
        }

        // Otherwise, use the existing form data approach as a fallback
        const formData = new FormData();

        // Add all regular fields to formData, skipping null/undefined values
        // FormData.append converts null to "null" string which breaks numeric fields
        for (const [key, value] of Object.entries(establishment)) {
          if (key !== 'album' && value !== null && value !== undefined && value !== '') {
            formData.append(key, String(value));
          }
        }

        // Handle direct file uploads (legacy method)
        if (establishment.album?.images && establishment.album.images.length > 0) {
          establishment.album.images.forEach((file: File, index: number) => {
            formData.append(`album_${index}`, file);
          });
        }

        return {
          url: FARM_URL(companyId),
          method: 'POST',
          body: formData,
          formData: true,
          credentials: 'include'
        };
      },
      invalidatesTags: ['Farm', 'Company'],
      // RTK Query optimistic update - prevents redirect race conditions
      async onQueryStarted({ companyId, establishment }, { dispatch, queryFulfilled }) {
        try {
          const { data: newEstablishment } = await queryFulfilled;

          // Immediately update the company cache with the new establishment
          // This prevents the redirect race condition during cache invalidation
          dispatch(
            companyApi.util.updateQueryData('getCompany', companyId, (draft) => {
              if (draft.establishments) {
                // Add the new establishment to the array immediately
                draft.establishments.push(newEstablishment);
              }
            })
          );
        } catch {
          // RTK Query automatically reverts optimistic updates on failure
        }
      }
    }),
    editFarm: build.mutation({
      query: ({ companyId, farmId, establishmentData }) => ({
        url: FARM_URL(companyId, farmId),
        method: 'PATCH',
        credentials: 'include',
        body: establishmentData
      }),
      invalidatesTags: ['Farm', 'Company'],
      async onQueryStarted({ companyId, farmId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedEstablishment } = await queryFulfilled;
          // Update the getFarm cache immediately with the response
          dispatch(
            companyApi.util.updateQueryData(
              'getFarm',
              { companyId, farmId },
              () => updatedEstablishment
            )
          );
        } catch {
          // Invalidation will handle refetch on error
        }
      }
    }),
    getFarm: build.query({
      query: ({ companyId, farmId }) => ({
        url: FARM_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['Farm', 'Company']
    }),
    getCompanyMembers: build.query({
      query: ({ companyId }) => ({
        url: `${COMPANY_URL(companyId)}members/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['Company']
    }),
    getCarbonEmissionSources: build.query<any[], void>({
      query: () => ({
        url: '/carbon/sources/',
        method: 'GET',
        credentials: 'include'
      })
    }),
    getCarbonOffsetActions: build.query<any[], void>({
      query: () => ({
        url: '/carbon/offset-actions/',
        method: 'GET',
        credentials: 'include'
      })
    }),
    getFarmCarbonFootprints: build.query<
      any[],
      { farmId: number; productionId?: number; year?: number }
    >({
      query: ({ farmId, productionId, year }) => {
        let url,
          params = '';
        if (productionId) {
          url = `/carbon/productions/${productionId}/summary/`;
          if (year) params = `?year=${year}`;
        } else {
          url = `/carbon/establishments/${farmId}/summary/`;
          if (year) params = `?year=${year}`;
        }
        return {
          url: url + params,
          method: 'GET',
          credentials: 'include'
        };
      }
    }),
    getCarbonFootprintSummary: build.query<
      any,
      { farmId?: number; productionId?: number; year?: number }
    >({
      query: ({ farmId, productionId, year }) => {
        let url,
          params = '';
        if (productionId) {
          url = `/carbon/productions/${productionId}/summary/`;
          if (year) params = `?year=${year}`;
        } else if (farmId) {
          url = `/carbon/establishments/${farmId}/summary/`;
          if (year) params = `?year=${year}`;
        } else {
          url = '/carbon/entries/summary/';
        }
        return {
          url: url + params,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result, error, { farmId, productionId }) => [
        { type: 'CarbonSummary', id: farmId || productionId },
        'CarbonSummary'
      ]
    }),
    addFarmCarbonFootprint: build.mutation({
      query: ({ farmId, footprintData }) => ({
        url: `carbon/establishments/${farmId}/footprint/`,
        method: 'POST',
        body: footprintData,
        credentials: 'include'
      }),
      invalidatesTags: ['CarbonSummary']
    }),
    updateFarmCarbonFootprint: build.mutation<any, { id: number; data: any }>({
      query: ({ id, data }) => ({
        url: `/carbon/entries/${id}/`,
        method: 'PATCH',
        body: data,
        credentials: 'include'
      })
    }),
    deleteFarmCarbonFootprint: build.mutation<any, { id: number }>({
      query: ({ id }) => ({
        url: `/carbon/entries/${id}/`,
        method: 'DELETE',
        credentials: 'include'
      })
    }),
    getCarbonCertifications: build.query<any[], { farmId: number }>({
      query: ({ farmId }) => ({
        url: `/carbon/certifications/?establishment=${farmId}`,
        method: 'GET',
        credentials: 'include'
      })
    }),
    addCarbonCertification: build.mutation<any, any>({
      query: (data) => ({
        url: '/certifications/',
        method: 'POST',
        body: data,
        credentials: 'include'
      })
    }),
    updateCarbonCertification: build.mutation<any, { id: number; data: any }>({
      query: ({ id, data }) => ({
        url: `/certifications/${id}/`,
        method: 'PATCH',
        body: data,
        credentials: 'include'
      })
    }),
    deleteCarbonCertification: build.mutation<any, { id: number }>({
      query: ({ id }) => ({
        url: `/certifications/${id}/`,
        method: 'DELETE',
        credentials: 'include'
      })
    }),
    getCarbonReports: build.query<any[], { farmId: number; year?: number; reportType?: string }>({
      query: ({ farmId, year, reportType }) => {
        let url = `/carbon/reports/?establishment=${farmId}`;
        if (year) url += `&year=${year}`;
        if (reportType) url += `&report_type=${reportType}`;
        return {
          url: url,
          method: 'GET',
          credentials: 'include'
        };
      }
    }),
    generateCarbonReport: build.mutation<
      any,
      | FormData
      | {
          establishment: number;
          year: number;
          reportType: 'annual' | 'quarterly' | 'custom';
          quarter?: number;
          startDate?: string;
          endDate?: string;
          document?: File;
        }
    >({
      query: (data) => {
        // Check if data is FormData (for file uploads) or regular object
        const isFormData = data instanceof FormData;

        return {
          url: '/carbon/reports/generate/',
          method: 'POST',
          body: data,
          // Don't set content-type for FormData to let the browser set it with boundary
          formData: isFormData,
          credentials: 'include'
        };
      },
      // Invalidate any queries that might have cached report data
      invalidatesTags: ['CarbonSummary']
    }),
    getProductionsByFarm: build.query({
      query: ({ farmId, _t }) => ({
        url: `/carbon/productions-flat/?establishment=${farmId}${_t ? `&_t=${_t}` : ''}`,
        method: 'GET',
        credentials: 'include'
      }),
      // Add cache tags so this query is invalidated when startProduction runs
      providesTags: (result, error, { farmId }) => [
        { type: 'History', id: farmId },
        'History',
        'Parcel'
      ]
    }),
    getCarbonEntries: build.query<
      any[],
      {
        farmId?: number;
        productionId?: number;
        year?: number;
      }
    >({
      query: ({ farmId, productionId, year }) => {
        let url;
        if (productionId) {
          url = `/carbon/entries/?production=${productionId}`;
        } else if (farmId) {
          url = `/carbon/entries/?establishment=${farmId}`;
        } else {
          throw new Error('Either farmId or productionId must be provided');
        }
        if (year) url += `&year=${year}`;
        return {
          url,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result, error, { farmId, productionId }) => [
        { type: 'CarbonSummary', id: farmId || productionId },
        'CarbonSummary'
      ]
    }),
    // `getPublicFarm` REMOVED 2026-08-12 along with its backend endpoint
    // (companies/public/establishments/<pk>/). That endpoint had NO permission class and served
    // street address, exact lat/lon, ZIP, farm email and phone, `farming_method`,
    // `sustainability_practices` and the free-text `certifications` string to anyone with the
    // URL. It had zero call sites here — the hook and its `useGetPublicEstablishmentQuery` alias
    // were exported and never used. The consumer farm view is served by the transparency
    // endpoint, which is gated by claim_authority.py.
    // Enhanced Production Start - Create new production with crop selection and blockchain
    startProduction: build.mutation<
      any,
      {
        name: string;
        parcel_id: number;
        crop_type: number; // Changed to number to match backend expectation
        start_date: string;
        expected_harvest?: string;
        description?: string;
        production_method?: string;
        estimated_yield?: number;
        irrigation_method?: string;
        age_of_plants?: string;
        number_of_plants?: number;
        soil_ph?: number;
        is_outdoor?: boolean;
        type?: string;
        notes?: string;
      }
    >({
      query: (productionData) => ({
        url: 'histories/start-production/',
        method: 'POST',
        body: productionData,
        credentials: 'include'
      }),
      invalidatesTags: ['History', 'Company', 'Parcel']
    }),
    // Get crop types for the production form
    getCropTypes: build.query<any[], void>({
      query: () => ({
        url: '/carbon/crop-types/',
        method: 'GET',
        credentials: 'include'
      })
    }),
    // Get lightweight crop types for dropdowns (performance optimized)
    getCropTypesDropdown: build.query<
      Array<{ id: number; name: string; category: string; slug: string }>,
      void
    >({
      query: () => ({
        url: '/carbon/crop-types/dropdown/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['CropType']
    }),
    // Get certified carbon offset projects
    getCertifiedProjects: build.query<
      {
        projects: Array<{
          id: string;
          name: string;
          description: string;
          project_type: string;
          verification_standard: string;
          verification_badge: {
            color: string;
            text: string;
            icon: string;
          };
          country: string;
          region: string;
          developer: string;
          price_per_credit: number;
          available_credits: number;
          vintage_year: number;
          co_benefits: string[];
          featured: boolean;
          trazo_verified: boolean;
          registry_url?: string;
        }>;
      },
      void
    >({
      query: () => ({
        url: '/carbon/offsets/certified_projects/',
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['CarbonSummary']
    })
  }),
  overrideExisting: false
});

export const {
  useGetCompanyQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useCreateFarmMutation,
  useEditFarmMutation,
  useGetFarmQuery,
  useGetCompanyMembersQuery,
  useGetCarbonEmissionSourcesQuery,
  useGetCarbonOffsetActionsQuery,
  useGetFarmCarbonFootprintsQuery,
  useGetCarbonFootprintSummaryQuery,
  useAddFarmCarbonFootprintMutation,
  useUpdateFarmCarbonFootprintMutation,
  useDeleteFarmCarbonFootprintMutation,
  useGetCarbonCertificationsQuery,
  useAddCarbonCertificationMutation,
  useUpdateCarbonCertificationMutation,
  useDeleteCarbonCertificationMutation,
  useGetCarbonReportsQuery,
  useGenerateCarbonReportMutation,
  useGetProductionsByFarmQuery,
  useGetCarbonEntriesQuery,
  useStartProductionMutation,
  useGetCropTypesQuery,
  useGetCropTypesDropdownQuery,
  useGetCertifiedProjectsQuery,
  useCreateCarbonOffsetMutation
} = companyApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useCreateFarmMutation instead */
export const useCreateEstablishmentMutation = useCreateFarmMutation;
/** @deprecated Use useEditFarmMutation instead */
export const useEditEstablishmentMutation = useEditFarmMutation;
/** @deprecated Use useGetFarmQuery instead */
export const useGetEstablishmentQuery = useGetFarmQuery;
/** @deprecated Use useGetFarmCarbonFootprintsQuery instead */
export const useGetEstablishmentCarbonFootprintsQuery = useGetFarmCarbonFootprintsQuery;
/** @deprecated Use useAddFarmCarbonFootprintMutation instead */
export const useAddEstablishmentCarbonFootprintMutation = useAddFarmCarbonFootprintMutation;
/** @deprecated Use useUpdateFarmCarbonFootprintMutation instead */
export const useUpdateEstablishmentCarbonFootprintMutation = useUpdateFarmCarbonFootprintMutation;
/** @deprecated Use useDeleteFarmCarbonFootprintMutation instead */
export const useDeleteEstablishmentCarbonFootprintMutation = useDeleteFarmCarbonFootprintMutation;
/** @deprecated Use useGetProductionsByFarmQuery instead */
export const useGetProductionsByEstablishmentQuery = useGetProductionsByFarmQuery;
// `useGetPublicEstablishmentQuery` (alias of `useGetPublicFarmQuery`) removed 2026-08-12 with the
// endpoint it called — see the note where getPublicFarm was defined.
