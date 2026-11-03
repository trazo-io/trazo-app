/**
 * Farm equipment that contacts organic crops, seeds, transplants or inputs (G6.0 page F).
 *
 * CCOF G6.0 C2 and G6.1 B1, OTCO C9 9.1-1 and WSDA 2121 I 1-2b ask for one table: each item, whether
 * it is dedicated to organic production, own / rent / borrow / custom hire, how it is cleaned before
 * organic use and with what, and whether it is rinsed. `state` and `missing` are the server's word on
 * what the plan says of the item (`certifications/services/production_equipment.py`); the app never
 * re-derives them. `null` on `dedicated_organic` and `rinsed` means not stated, never no.
 */
import { PRODUCTION_EQUIPMENT_URL } from 'config';
import baseApi from './baseApi';

export type EquipmentUse =
  | 'planting'
  | 'input_application'
  | 'harvest'
  | 'washing_packing'
  | 'transport'
  | 'other';

export type EquipmentOwnership = '' | 'own' | 'rent' | 'borrow' | 'custom_hire';

export type EquipmentMissingFact = 'dedicated' | 'ownership' | 'cleaning_method' | 'rinsed';

export interface ProductionEquipment {
  id: number;
  name: string;
  use: EquipmentUse;
  use_display: string;
  dedicated_organic: boolean | null;
  ownership: EquipmentOwnership;
  ownership_display: string;
  cleaning_method: string;
  cleaning_materials: string;
  rinsed: boolean | null;
  rinse_detail: string;
  notes: string;
  state: 'complete' | 'incomplete';
  missing: EquipmentMissingFact[];
}

export type ProductionEquipmentInput = Partial<
  Pick<
    ProductionEquipment,
    | 'name'
    | 'use'
    | 'dedicated_organic'
    | 'ownership'
    | 'cleaning_method'
    | 'cleaning_materials'
    | 'rinsed'
    | 'rinse_detail'
    | 'notes'
  >
>;

interface Scope {
  companyId: string;
  farmId: string;
}

const listOf = <T>(response: T[] | { results: T[] }) =>
  Array.isArray(response) ? response : response?.results ?? [];

const productionEquipmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProductionEquipment: build.query<ProductionEquipment[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: PRODUCTION_EQUIPMENT_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: listOf<ProductionEquipment>,
      providesTags: ['ProductionEquipment']
    }),
    addProductionEquipment: build.mutation<
      ProductionEquipment,
      Scope & { data: ProductionEquipmentInput }
    >({
      query: ({ companyId, farmId, data }) => ({
        url: PRODUCTION_EQUIPMENT_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['ProductionEquipment']
    }),
    updateProductionEquipment: build.mutation<
      ProductionEquipment,
      Scope & { itemId: number; data: ProductionEquipmentInput }
    >({
      query: ({ companyId, farmId, itemId, data }) => ({
        url: PRODUCTION_EQUIPMENT_URL(companyId, farmId, itemId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['ProductionEquipment']
    }),
    deleteProductionEquipment: build.mutation<void, Scope & { itemId: number }>({
      query: ({ companyId, farmId, itemId }) => ({
        url: PRODUCTION_EQUIPMENT_URL(companyId, farmId, itemId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['ProductionEquipment']
    })
  })
});

export const {
  useGetProductionEquipmentQuery,
  useAddProductionEquipmentMutation,
  useUpdateProductionEquipmentMutation,
  useDeleteProductionEquipmentMutation
} = productionEquipmentApi;

export default productionEquipmentApi;
