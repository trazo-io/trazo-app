/**
 * Companies whose brands this farm packs its organic crop into, and the copies behind each one.
 *
 * CCOF G7.0 C, OTCO C8 8.3 and WSDA 2121 N 6-7 ask who each brand owner is, whether it is certified,
 * and for its certificate, or for an uncertified owner the certifying agent's own agreement (CCOF's
 * Co-Packer Application, OTCO's Private Label Agreement). `state` is the server's word on what the
 * plan says of the owner (`certifications/services/brand_owners.py`); the app never re-derives it.
 */
import { BRAND_OWNER_URL } from 'config';
import baseApi from './baseApi';

export type BrandOwnerCertificationStatus = 'certified' | 'not_certified' | 'unknown';

export type BrandOwnerState =
  | 'on_file'
  | 'certificate_missing'
  | 'certificate_old'
  | 'agreement_missing'
  | 'status_unknown';

export interface BrandOwner {
  id: number;
  name: string;
  brand_names: string;
  /** One product per line, with its label's organic claim. */
  products: string;
  certification_status: BrandOwnerCertificationStatus;
  certification_status_display: string;
  certifier_name: string;
  nop_operation_id: string;
  certificate_document: number | null;
  certificate_document_title?: string;
  certificate_issued_on: string | null;
  agreement_document: number | null;
  agreement_document_title?: string;
  notes: string;
  state: BrandOwnerState;
}

export type BrandOwnerInput = Partial<
  Pick<
    BrandOwner,
    | 'name'
    | 'brand_names'
    | 'products'
    | 'certification_status'
    | 'certifier_name'
    | 'nop_operation_id'
    | 'certificate_document'
    | 'certificate_issued_on'
    | 'agreement_document'
    | 'notes'
  >
>;

interface Scope {
  companyId: string;
  farmId: string;
}

const listOf = <T>(response: T[] | { results: T[] }) =>
  Array.isArray(response) ? response : response?.results ?? [];

const brandOwnerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBrandOwners: build.query<BrandOwner[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: BRAND_OWNER_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: listOf<BrandOwner>,
      providesTags: ['BrandOwner']
    }),
    addBrandOwner: build.mutation<BrandOwner, Scope & { data: BrandOwnerInput }>({
      query: ({ companyId, farmId, data }) => ({
        url: BRAND_OWNER_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['BrandOwner']
    }),
    updateBrandOwner: build.mutation<
      BrandOwner,
      Scope & { ownerId: number; data: BrandOwnerInput }
    >({
      query: ({ companyId, farmId, ownerId, data }) => ({
        url: BRAND_OWNER_URL(companyId, farmId, ownerId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['BrandOwner']
    }),
    deleteBrandOwner: build.mutation<void, Scope & { ownerId: number }>({
      query: ({ companyId, farmId, ownerId }) => ({
        url: BRAND_OWNER_URL(companyId, farmId, ownerId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['BrandOwner']
    })
  })
});

export const {
  useGetBrandOwnersQuery,
  useAddBrandOwnerMutation,
  useUpdateBrandOwnerMutation,
  useDeleteBrandOwnerMutation
} = brandOwnerApi;

export default brandOwnerApi;
