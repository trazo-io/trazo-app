import {
  FARM_CHART_SCANS_VS_SALES_INFO_URL,
  FARM_PRODUCTS_URL,
  PARCEL_HISTORY_URL,
  PARCEL_URL,
  PRODUCT_URL
} from '../../config';

//   import { EmployeeType } from "../../types/employees";
import baseApi from './baseApi';

export const productApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getParcel: build.query({
      query: ({ companyId, farmId, parcelId }) => ({
        url: PARCEL_URL(companyId, farmId, parcelId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, parcelId) => (result ? [{ type: 'Parcel', parcelId }] : [])
    }),
    createParcel: build.mutation({
      query: ({ companyId, farmId, parcelData }) => {
        const formData = new FormData();

        // Handle either uploaded_image_urls or direct file uploads
        if (parcelData.uploaded_image_urls && parcelData.uploaded_image_urls.length > 0) {
          // Append each URL individually with the correct index format
          parcelData.uploaded_image_urls.forEach((url, index) => {
            if (url && url.startsWith('http')) {
              formData.append(`uploaded_image_urls[${index}]`, url);
            }
          });
        } else if (parcelData.album && parcelData.album.images) {
          parcelData.album.images.forEach((file) => {
            formData.append('album[images]', file);
          });
        }

        // Basic required fields
        formData.append('name', parcelData.name);
        formData.append('description', parcelData.description);
        formData.append('area', parcelData.area || '0'); // Ensure area is a string number
        formData.append('polygon', JSON.stringify(parcelData.polygon || []));
        formData.append('map_metadata', JSON.stringify(parcelData.map_metadata || {}));
        formData.append('establishment', farmId);

        // ✅ Contact & Identification Fields - Send ALL fields
        if (parcelData.soil_type) {
          formData.append('soil_type', parcelData.soil_type);
        }
        if (parcelData.unique_code) {
          formData.append('unique_code', parcelData.unique_code);
        }

        // ✅ FIXED: Contact fields - Send ALL contact fields (even if empty)
        formData.append('contact_person', parcelData.contact_person || '');
        formData.append('contact_email', parcelData.contact_email || '');
        formData.append('contact_phone', parcelData.contact_phone || '');
        formData.append('address', parcelData.address || '');

        // ✅ NEW: Agricultural Details for Carbon Calculations
        if (
          parcelData.agricultural_details &&
          Object.keys(parcelData.agricultural_details).length > 0
        ) {
          formData.append('agricultural_details', JSON.stringify(parcelData.agricultural_details));
        }

        // ✅ NEW: Carbon Calculation Flags
        if (parcelData.carbon_calculation_enabled !== undefined) {
          formData.append('carbon_calculation_enabled', parcelData.carbon_calculation_enabled);
        }
        if (parcelData.usda_compliance_eligible !== undefined) {
          formData.append('usda_compliance_eligible', parcelData.usda_compliance_eligible);
        }

        // ✅ TRANSPARENCY FIELDS for consumer display
        if (parcelData.crop_focus) {
          formData.append('crop_focus', parcelData.crop_focus);
        }
        if (parcelData.consumer_story) {
          formData.append('consumer_story', parcelData.consumer_story);
        }
        if (parcelData.sustainability_practices) {
          formData.append('sustainability_practices', parcelData.sustainability_practices);
        }
        if (parcelData.transparency_ready !== undefined) {
          formData.append('transparency_ready', parcelData.transparency_ready);
        }

        console.log('🚀 CREATE FormData contents being sent to backend:');
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value);
        }

        return {
          url: PARCEL_URL(companyId, farmId),
          method: 'POST',
          credentials: 'include',
          body: formData,
          formData: true
        };
      },
      invalidatesTags: (result, error, { farmId }) =>
        result
          ? [
              'Parcel',
              { type: 'Farm', id: farmId },
              'Company' // Invalidate Company to refresh farms with new parcels
            ]
          : []
    }),
    updateParcel: build.mutation({
      query: ({ companyId, farmId, parcelId, parcelData }) => {
        const formData = new FormData();

        // Handle either uploaded_image_urls or direct file uploads
        if (parcelData.uploaded_image_urls && parcelData.uploaded_image_urls.length > 0) {
          // Append each URL individually with the correct index format
          parcelData.uploaded_image_urls.forEach((url, index) => {
            if (url && url.startsWith('http')) {
              formData.append(`uploaded_image_urls[${index}]`, url);
            }
          });
        } else if (parcelData.album && parcelData.album.images) {
          parcelData.album.images.forEach((file) => {
            formData.append('album[images]', file);
          });
        }

        // Basic required fields
        formData.append('name', parcelData.name);
        formData.append('description', parcelData.description);
        formData.append('area', parcelData.area || '0'); // Ensure area is a string number
        formData.append('certified', parcelData.certified || false);
        formData.append('polygon', JSON.stringify(parcelData.polygon || []));
        formData.append('map_metadata', JSON.stringify(parcelData.map_metadata || {}));

        // ✅ Contact & Identification Fields - Send ALL fields
        if (parcelData.soil_type) {
          formData.append('soil_type', parcelData.soil_type);
        }
        if (parcelData.unique_code) {
          formData.append('unique_code', parcelData.unique_code);
        }
        if (parcelData.certification_type) {
          formData.append('certification_type', parcelData.certification_type);
        }

        // ✅ FIXED: Contact fields - Send ALL contact fields (even if empty)
        formData.append('contact_person', parcelData.contact_person || '');
        formData.append('contact_email', parcelData.contact_email || '');
        formData.append('contact_phone', parcelData.contact_phone || '');
        formData.append('address', parcelData.address || '');

        // ✅ NEW: Agricultural Details for Carbon Calculations
        if (
          parcelData.agricultural_details &&
          Object.keys(parcelData.agricultural_details).length > 0
        ) {
          formData.append('agricultural_details', JSON.stringify(parcelData.agricultural_details));
        }

        // ✅ NEW: Carbon Calculation Flags
        if (parcelData.carbon_calculation_enabled !== undefined) {
          formData.append('carbon_calculation_enabled', parcelData.carbon_calculation_enabled);
        }
        if (parcelData.usda_compliance_eligible !== undefined) {
          formData.append('usda_compliance_eligible', parcelData.usda_compliance_eligible);
        }

        // ✅ TRANSPARENCY FIELDS for consumer display
        if (parcelData.crop_focus) {
          formData.append('crop_focus', parcelData.crop_focus);
        }
        if (parcelData.consumer_story) {
          formData.append('consumer_story', parcelData.consumer_story);
        }
        if (parcelData.sustainability_practices) {
          formData.append('sustainability_practices', parcelData.sustainability_practices);
        }
        if (parcelData.transparency_ready !== undefined) {
          formData.append('transparency_ready', parcelData.transparency_ready);
        }

        console.log('🚀 UPDATE FormData contents being sent to backend:');
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value);
        }

        return {
          url: PARCEL_URL(companyId, farmId, parcelId),
          method: 'PATCH',
          credentials: 'include',
          body: formData,
          formData: true
        };
      },
      invalidatesTags: (result, error, { parcelId, farmId }) => [
        { type: 'Parcel', parcelId },
        { type: 'Farm', id: farmId },
        'Company' // Also refresh company data when updating parcels
      ],
      async onQueryStarted(
        { companyId, farmId, parcelId },
        { dispatch, queryFulfilled }
      ) {
        try {
          const { data: updatedParcel } = await queryFulfilled;
          // Update the getParcel cache immediately with the response
          dispatch(
            productApi.util.updateQueryData(
              'getParcel',
              { companyId, farmId, parcelId },
              () => updatedParcel
            )
          );
        } catch {
          // Invalidation will handle refetch on error
        }
      }
    }),
    getProducts: build.query({
      query: () => ({
        url: PRODUCT_URL,
        method: 'GET',
        credentials: 'include'
      })
    }),
    getFarmProducts: build.query({
      query: ({ companyId, farmId, parcelId }) => ({
        url:
          FARM_PRODUCTS_URL(companyId, farmId) +
          (parcelId ? `?parcel=${parcelId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getFarmHistories: build.query({
      query: ({ companyId, farmId, parcelId, productId, completed }) => {
        const params = new URLSearchParams();
        if (productId) params.append('product', productId);
        if (completed) params.append('completed', 'true');
        const queryString = params.toString();
        return {
          url:
            PARCEL_HISTORY_URL(companyId, farmId, parcelId) +
            (queryString ? `?${queryString}` : ''),
          method: 'GET',
          credentials: 'include'
        };
      }
    }),
    getFarmScansVsSalesChartInfo: build.query({
      query: ({ companyId, farmId, parcelId, productId, periodId, productionId }) => ({
        url:
          FARM_CHART_SCANS_VS_SALES_INFO_URL(companyId, farmId) +
          (periodId ? `?period=${periodId}` : '') +
          (parcelId ? `&parcel=${parcelId}` : '') +
          (productionId ? `&production=${productionId}` : '') +
          (productId ? `&product=${productId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    })
  }),
  overrideExisting: false
});

export const {
  useGetParcelQuery,
  useCreateParcelMutation,
  useUpdateParcelMutation,
  useGetProductsQuery,
  useGetFarmProductsQuery,
  useGetFarmHistoriesQuery,
  useGetFarmScansVsSalesChartInfoQuery
} = productApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useGetFarmProductsQuery instead */
export const useGetEstablishmentProductsQuery = useGetFarmProductsQuery;
/** @deprecated Use useGetFarmHistoriesQuery instead */
export const useGetEstablishmentHistoriesQuery = useGetFarmHistoriesQuery;
/** @deprecated Use useGetFarmScansVsSalesChartInfoQuery instead */
export const useGetEstablishmentScansVsSalesChartInfoQuery = useGetFarmScansVsSalesChartInfoQuery;
