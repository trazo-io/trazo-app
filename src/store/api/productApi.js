import {
  ESTABLISHMENT_CHART_SCANS_VS_SALES_INFO_URL,
  ESTABLISHMENT_HISTORIES_URL,
  ESTABLISHMENT_PRODUCTS_URL,
  PARCEL_URL,
  PRODUCT_URL
} from '../../config';

//   import { EmployeeType } from "../../types/employees";
import baseApi from './baseApi';

export const productApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getParcel: build.query({
      query: ({ companyId, establishmentId, parcelId }) => ({
        url: PARCEL_URL(companyId, establishmentId, parcelId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, parcelId) => (result ? [{ type: 'Parcel', parcelId }] : [])
    }),
    createParcel: build.mutation({
      query: ({ companyId, establishmentId, parcelData }) => {
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
        formData.append('establishment', establishmentId);

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
        if (parcelData.agricultural_details && Object.keys(parcelData.agricultural_details).length > 0) {
          formData.append('agricultural_details', JSON.stringify(parcelData.agricultural_details));
        }
        
        // ✅ NEW: Carbon Calculation Flags
        if (parcelData.carbon_calculation_enabled !== undefined) {
          formData.append('carbon_calculation_enabled', parcelData.carbon_calculation_enabled);
        }
        if (parcelData.usda_compliance_eligible !== undefined) {
          formData.append('usda_compliance_eligible', parcelData.usda_compliance_eligible);
        }
        
        // Note: crop_type field removed - it's now stored in History model for per-production tracking
        
        console.log('🚀 CREATE FormData contents being sent to backend:');
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value);
        }

        return {
          url: PARCEL_URL(companyId, establishmentId),
          method: 'POST',
          credentials: 'include',
          body: formData,
          formData: true
        };
      },
      invalidatesTags: (result) => (result ? ['Parcel'] : [])
    }),
    updateParcel: build.mutation({
      query: ({ companyId, establishmentId, parcelId, parcelData }) => {
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
        if (parcelData.agricultural_details && Object.keys(parcelData.agricultural_details).length > 0) {
          formData.append('agricultural_details', JSON.stringify(parcelData.agricultural_details));
        }
        
        // ✅ NEW: Carbon Calculation Flags
        if (parcelData.carbon_calculation_enabled !== undefined) {
          formData.append('carbon_calculation_enabled', parcelData.carbon_calculation_enabled);
        }
        if (parcelData.usda_compliance_eligible !== undefined) {
          formData.append('usda_compliance_eligible', parcelData.usda_compliance_eligible);
        }
        
        // Note: crop_type field removed - it's now stored in History model for per-production tracking
        
        console.log('🚀 UPDATE FormData contents being sent to backend:');
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value);
        }

        return {
          url: PARCEL_URL(companyId, establishmentId, parcelId),
          method: 'PATCH',
          credentials: 'include',
          body: formData,
          formData: true
        };
      },
      invalidatesTags: (result, error, { parcelId }) => [{ type: 'Parcel', parcelId }]
    }),
    getProducts: build.query({
      query: () => ({
        url: PRODUCT_URL,
        method: 'GET',
        credentials: 'include'
      })
    }),
    getEstablishmentProducts: build.query({
      query: ({ companyId, establishmentId, parcelId }) => ({
        url:
          ESTABLISHMENT_PRODUCTS_URL(companyId, establishmentId) +
          (parcelId ? `?parcel=${parcelId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getEstablishmentHistories: build.query({
      query: ({ companyId, establishmentId, parcelId, productId, periodId }) => ({
        url:
          ESTABLISHMENT_HISTORIES_URL(companyId, establishmentId) +
          (parcelId ? `?parcel=${parcelId}` : '') +
          (productId ? `&product=${productId}` : '') +
          (periodId ? `&period=${periodId}` : ''),
        method: 'GET',
        credentials: 'include'
      })
    }),
    getEstablishmentScansVsSalesChartInfo: build.query({
      query: ({ companyId, establishmentId, parcelId, productId, periodId, productionId }) => ({
        url:
          ESTABLISHMENT_CHART_SCANS_VS_SALES_INFO_URL(companyId, establishmentId) +
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
  useGetEstablishmentProductsQuery,
  useGetEstablishmentHistoriesQuery,
  useGetEstablishmentScansVsSalesChartInfoQuery
} = productApi;
