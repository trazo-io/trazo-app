/**
 * The product rows of a facility: CCOF G6.1 C2 (category, detail, packaging form, and the
 * manufacturer's ingredient statement of a multi-ingredient product) and OTCO C7 7.10-2 (type,
 * detail, organic label claim, label or brand name). The facility row carries the operation and its
 * certifier. Every column is what the operator picked or typed; `''` is "not stated" and the plan
 * prints it that way, so the app never fills a default in.
 *
 * Rows ride on each facility (`PostHarvestFacility.products`), so every write invalidates the
 * facility list.
 */
import { FACILITY_PRODUCT_URL } from 'config';
import baseApi from './baseApi';

export type PackagingForm = '' | 'retail' | 'nonretail' | 'unpackaged';
export type LabelClaim = '' | '100_percent_organic' | 'organic' | 'made_with_organic';
export type MultiIngredient = '' | 'yes' | 'no';

export const PACKAGING_FORMS: Exclude<PackagingForm, ''>[] = ['retail', 'nonretail', 'unpackaged'];
export const LABEL_CLAIMS: Exclude<LabelClaim, ''>[] = [
  '100_percent_organic',
  'organic',
  'made_with_organic'
];
export const MULTI_INGREDIENT: Exclude<MultiIngredient, ''>[] = ['no', 'yes'];

export interface FacilityProduct {
  id: number;
  public_id: string;
  facility: number;
  category: string;
  detail: string;
  packaging_form: PackagingForm;
  label_claim: LabelClaim;
  brand_name: string;
  multi_ingredient: MultiIngredient;
  ingredient_statement_document: number | null;
  ingredient_statement_document_title: string | null;
}

export type FacilityProductInput = Partial<
  Pick<
    FacilityProduct,
    | 'facility'
    | 'category'
    | 'detail'
    | 'packaging_form'
    | 'label_claim'
    | 'brand_name'
    | 'multi_ingredient'
    | 'ingredient_statement_document'
  >
>;

interface Scope {
  companyId: string;
  farmId: string;
}

const facilityProductApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    addFacilityProduct: build.mutation<FacilityProduct, Scope & { data: FacilityProductInput }>({
      query: ({ companyId, farmId, data }) => ({
        url: FACILITY_PRODUCT_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['PostHarvestFacility']
    }),
    updateFacilityProduct: build.mutation<
      FacilityProduct,
      Scope & { productId: number; data: FacilityProductInput }
    >({
      query: ({ companyId, farmId, productId, data }) => ({
        url: FACILITY_PRODUCT_URL(companyId, farmId, productId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['PostHarvestFacility']
    }),
    deleteFacilityProduct: build.mutation<void, Scope & { productId: number }>({
      query: ({ companyId, farmId, productId }) => ({
        url: FACILITY_PRODUCT_URL(companyId, farmId, productId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['PostHarvestFacility']
    })
  })
});

export const {
  useAddFacilityProductMutation,
  useUpdateFacilityProductMutation,
  useDeleteFacilityProductMutation
} = facilityProductApi;

export default facilityProductApi;
