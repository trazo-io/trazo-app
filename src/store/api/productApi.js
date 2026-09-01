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
        if (parcelData.buffer_zones && parcelData.buffer_zones.length > 0) {
          formData.append('buffer_zones', JSON.stringify(parcelData.buffer_zones));
        }
        if (parcelData.apn) formData.append('apn', parcelData.apn);
        if (parcelData.section_township_range)
          formData.append('section_township_range', parcelData.section_township_range);
        if (parcelData.date_began_managing)
          formData.append('date_began_managing', parcelData.date_began_managing);
        formData.append(
          'treated_lumber_present',
          parcelData.treated_lumber_present ? 'true' : 'false'
        );
        if (parcelData.container_production !== undefined)
          formData.append(
            'container_production',
            parcelData.container_production ? 'true' : 'false'
          );
        if (parcelData.treated_lumber_description)
          formData.append('treated_lumber_description', parcelData.treated_lumber_description);
        if (parcelData.treated_lumber_install_date)
          formData.append('treated_lumber_install_date', parcelData.treated_lumber_install_date);
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
        // §205.202 facts (buffer_zones, apn, section_township_range,
        // date_began_managing, treated_lumber_*, container_production) are
        // DELIBERATELY not sent on update. The Parcel Application wizard is
        // their single editor (PUT …/application/). This mutation used to
        // re-send them from the edit form's stale copy — including an
        // UNCONDITIONAL treated_lumber_present default of 'false' and a
        // buffer filter upstream that deleted wizard rows without an
        // adjoining-land use — the same clobber class as the 2026-08-09
        // ParcelComplianceCard incident.

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
      async onQueryStarted({ companyId, farmId, parcelId }, { dispatch, queryFulfilled }) {
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
    // Compliance-only PATCH: sends ONLY the parcel organic-compliance fields (buffer
    // zones + identity). This is deliberately separate from updateParcel, which
    // UNCONDITIONALLY appends name/description/area/certified/polygon/map_metadata/
    // contact_*/address — calling that from the compliance card would blank the parcel's
    // map geometry + contacts. The viewset's partial_update (partial=True) only touches
    // the fields present here, so nothing else is disturbed.
    updateParcelCompliance: build.mutation({
      // PUMP-PLANT FIELDS ONLY. This mutation used to always-send buffer_zones/apn/
      // treated-lumber "so they could be cleared" — which meant any pump-test save
      // REPLACED the § 205.202 facts with this card's stale copy (the 2026-08-09
      // buffer data-loss class). Those facts are owned by the Parcel Application
      // wizard now; this mutation must never carry them again.
      query: ({ companyId, farmId, parcelId, compliance }) => {
        const fd = new FormData();
        // §E-6 pumping plant. Sent even when empty — the serializer coerces "" -> None
        // for these (CreateParcelSerializer._BLANKABLE_PUMP_FIELDS), so a stale pump
        // test can actually be CLEARED. An out-of-date efficiency is weaker evidence
        // than none, so clearing has to be possible.
        fd.append('pump_efficiency_pct', compliance.pump_efficiency_pct ?? '');
        fd.append('system_pressure_psi', compliance.system_pressure_psi ?? '');
        fd.append('pump_test_date', compliance.pump_test_date ?? '');
        fd.append('pump_test_provider', compliance.pump_test_provider ?? '');
        return {
          url: PARCEL_URL(companyId, farmId, parcelId),
          method: 'PATCH',
          credentials: 'include',
          body: fd,
          formData: true
        };
      },
      invalidatesTags: (result, error, { parcelId, farmId }) => [
        { type: 'Parcel', parcelId },
        { type: 'Farm', id: farmId }
      ]
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
        url: FARM_PRODUCTS_URL(companyId, farmId) + (parcelId ? `?parcel=${parcelId}` : ''),
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
    }),
    /**
     * How precisely a parcel may be located on the PUBLIC consumer page.
     *
     * Its own endpoint, not a field on the parcel form. The dialog that collects this answer
     * renders two buttons, and `.claude/rules/frontend.md` requires a payload to send only what
     * its UI renders — folding it into the parcel form would make a one-question prompt write
     * forty unrelated fields.
     *
     * Narrowing here never touches `Parcel.polygon`. The parcel application, the dashboard map
     * and the add/update parcel form all read the boundary directly; only the consumer page
     * consults the disclosure level.
     */
    /** Current disclosure state plus the lot to preview it on. */
    getParcelLocationDisclosure: build.query({
      query: (parcelId) => ({
        url: `/parcels/${parcelId}/location-disclosure/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, parcelId) => [{ type: 'Parcel', parcelId }]
    }),
    setParcelLocationDisclosure: build.mutation({
      query: ({ parcelId, level }) => ({
        url: `/parcels/${parcelId}/location-disclosure/`,
        method: 'PATCH',
        credentials: 'include',
        body: { location_disclosure_level: level }
      }),
      invalidatesTags: (result, error, { parcelId }) => [{ type: 'Parcel', parcelId }]
    }),
    getParcelCropHistory: build.query({
      query: (parcelId) => ({
        url: `/parcel-crop-history/?parcel=${parcelId}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['ParcelCropHistory']
    }),
    createParcelCropHistory: build.mutation({
      query: (data) => ({
        url: '/parcel-crop-history/',
        method: 'POST',
        credentials: 'include',
        body: data
      }),
      invalidatesTags: ['ParcelCropHistory']
    }),
    deleteParcelCropHistory: build.mutation({
      query: (id) => ({
        url: `/parcel-crop-history/${id}/`,
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['ParcelCropHistory']
    }),
    updateParcelCropHistory: build.mutation({
      query: ({ id, ...data }) => ({
        url: `/parcel-crop-history/${id}/`,
        method: 'PATCH',
        credentials: 'include',
        body: data
      }),
      invalidatesTags: ['ParcelCropHistory']
    })
  }),
  overrideExisting: false
});

export const {
  useGetParcelQuery,
  useCreateParcelMutation,
  useUpdateParcelMutation,
  useUpdateParcelComplianceMutation,
  useGetProductsQuery,
  useGetFarmProductsQuery,
  useGetFarmHistoriesQuery,
  useGetFarmScansVsSalesChartInfoQuery,
  useGetParcelCropHistoryQuery,
  useGetParcelLocationDisclosureQuery,
  useSetParcelLocationDisclosureMutation,
  useCreateParcelCropHistoryMutation,
  useDeleteParcelCropHistoryMutation,
  useUpdateParcelCropHistoryMutation
} = productApi;

// Backward-compat aliases for renamed hooks
/** @deprecated Use useGetFarmProductsQuery instead */
export const useGetEstablishmentProductsQuery = useGetFarmProductsQuery;
/** @deprecated Use useGetFarmHistoriesQuery instead */
export const useGetEstablishmentHistoriesQuery = useGetFarmHistoriesQuery;
/** @deprecated Use useGetFarmScansVsSalesChartInfoQuery instead */
export const useGetEstablishmentScansVsSalesChartInfoQuery = useGetFarmScansVsSalesChartInfoQuery;
