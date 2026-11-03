/**
 * Seed and planting-stock suppliers, and the copies of their organic certificates.
 *
 * A planting that says "certified organic transplants from X" is a claim; X's organic
 * certificate, current at the purchase, is its evidence (CCOF G3.0, OTCO C3, WSDA 2121-B).
 *
 * Records are never linked by id. A record names its supplier as text, and it counts for a
 * supplier only when that text matches one of the supplier's confirmed spellings exactly (case
 * and spacing aside). The grower confirms each spelling; nothing is matched for them. That way a
 * finished season's locked records count too, and nothing on them is rewritten.
 *
 * Certificate copies are a history: a new year's copy is added, never swapped in, so each purchase
 * keeps the copy that covered it. Everything here is the grower's record, not a database check.
 */
import { OSP_SEEDLING_SUPPLIERS_URL, SUPPLIER_URL } from 'config';
import baseApi from './baseApi';

export type SupplierOrganicStatus = 'certified' | 'not_certified' | 'unknown';

export interface SupplierSpelling {
  id: number;
  name: string;
}

export interface SupplierCertificateCopy {
  id: number;
  document: number;
  document_title: string;
  issued_on: string;
  anniversary_date: string | null;
  original_effective_date: string | null;
  created_at: string;
}

export interface Supplier {
  id: number;
  public_id: string;
  name: string;
  organic_status: SupplierOrganicStatus;
  organic_status_display: string;
  nop_operation_id: string;
  certifier_name: string;
  notes: string;
  archived: boolean;
  archived_at: string | null;
  names: SupplierSpelling[];
  certificates: SupplierCertificateCopy[];
  /** Planting and transplanting records whose supplier text resolves here. */
  records_count: number;
  /** Organic crops or products bought from this supplier for the operation's own sales (G6.5). */
  sourced_products: string;
  /** For an uncertified broker or distributor: the certified operation it sources from. */
  source_operation: string;
  exempt_handler_affidavit: number | null;
  exempt_handler_affidavit_title: string | null;
  /** What G6.5 says of this supplier, from the server; null when it supplies no bought-in product. */
  sourcing_state: SourcingState | null;
}

export type SourcingState =
  | 'on_file'
  | 'certificate_missing'
  | 'certificate_old'
  | 'affidavit_missing'
  | 'source_unnamed'
  | 'status_unknown';

export type SupplierInput = Partial<
  Pick<
    Supplier,
    | 'name'
    | 'organic_status'
    | 'nop_operation_id'
    | 'certifier_name'
    | 'notes'
    | 'archived'
    | 'sourced_products'
    | 'source_operation'
    | 'exempt_handler_affidavit'
  >
>;

/** A spelling on the farm's records that no supplier holds yet. */
export interface UnconfirmedSpelling {
  name: string;
  records: number;
}

interface Scope {
  companyId: string;
  farmId: string;
}

/**
 * One supplier G3.0a prints: named on the farm's transplant purchases, judged on its latest one.
 * `status` is the server's (`history/services/supplier_certificates.py`); the panel words it.
 */
export type SeedlingSupplierStatus =
  | 'covering'
  | 'stale'
  | 'postdates_purchase'
  | 'none_on_file'
  | 'not_certified'
  | 'unresolved';

export interface SeedlingSupplier {
  name: string;
  /** Null when the name is no spelling the register holds: the grower has not said who it is. */
  supplier_id: number | null;
  certifier: string;
  nop_operation_id: string;
  purchases: number;
  latest: string | null;
  status: SeedlingSupplierStatus;
  certificate_issued_on: string | null;
  /** Earlier purchases no copy on file covers. */
  not_covered: number;
  claims_certified: boolean;
  /** The server's rule for whether this supplier owes a copy: what the plan flags for review. */
  needs_certificate: boolean;
}

const listOf = <T>(response: T[] | { results: T[] }) =>
  Array.isArray(response) ? response : response?.results ?? [];

const supplierApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSuppliers: build.query<Supplier[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: SUPPLIER_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: listOf<Supplier>,
      providesTags: ['Supplier']
    }),
    getUnconfirmedSpellings: build.query<UnconfirmedSpelling[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: `${SUPPLIER_URL(companyId, farmId)}unconfirmed-spellings/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['Supplier']
    }),
    addSupplier: build.mutation<Supplier, Scope & { data: SupplierInput }>({
      query: ({ companyId, farmId, data }) => ({
        url: SUPPLIER_URL(companyId, farmId),
        method: 'POST',
        credentials: 'include',
        body: data
      }),
      invalidatesTags: ['Supplier']
    }),
    updateSupplier: build.mutation<Supplier, Scope & { supplierId: number; data: SupplierInput }>({
      query: ({ companyId, farmId, supplierId, data }) => ({
        url: SUPPLIER_URL(companyId, farmId, supplierId),
        method: 'PATCH',
        credentials: 'include',
        body: data
      }),
      invalidatesTags: ['Supplier']
    }),
    deleteSupplier: build.mutation<void, Scope & { supplierId: number }>({
      query: ({ companyId, farmId, supplierId }) => ({
        url: SUPPLIER_URL(companyId, farmId, supplierId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['Supplier']
    }),
    addSupplierSpelling: build.mutation<
      SupplierSpelling,
      Scope & { supplierId: number; name: string }
    >({
      query: ({ companyId, farmId, supplierId, name }) => ({
        url: `${SUPPLIER_URL(companyId, farmId, supplierId)}names/`,
        method: 'POST',
        credentials: 'include',
        body: { name }
      }),
      invalidatesTags: ['Supplier']
    }),
    removeSupplierSpelling: build.mutation<
      void,
      Scope & { supplierId: number; spellingId: number }
    >({
      query: ({ companyId, farmId, supplierId, spellingId }) => ({
        url: `${SUPPLIER_URL(companyId, farmId, supplierId)}names/${spellingId}/`,
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['Supplier']
    }),
    addSupplierCertificate: build.mutation<
      SupplierCertificateCopy,
      Scope & {
        supplierId: number;
        data: { document: number; issued_on: string; anniversary_date?: string | null };
      }
    >({
      query: ({ companyId, farmId, supplierId, data }) => ({
        url: `${SUPPLIER_URL(companyId, farmId, supplierId)}certificates/`,
        method: 'POST',
        credentials: 'include',
        body: data
      }),
      invalidatesTags: ['Supplier']
    }),
    removeSupplierCertificate: build.mutation<
      void,
      Scope & { supplierId: number; certificateId: number }
    >({
      query: ({ companyId, farmId, supplierId, certificateId }) => ({
        url: `${SUPPLIER_URL(companyId, farmId, supplierId)}certificates/${certificateId}/`,
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['Supplier']
    }),
    // Tagged 'Supplier' so adding a supplier, a spelling or a certificate refreshes the plan's panel.
    getSeedlingSuppliers: build.query<
      { suppliers: SeedlingSupplier[] },
      Scope & { ospId: string | number }
    >({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_SEEDLING_SUPPLIERS_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['Supplier']
    })
  })
});

export const {
  useGetSuppliersQuery,
  useGetUnconfirmedSpellingsQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useAddSupplierSpellingMutation,
  useRemoveSupplierSpellingMutation,
  useAddSupplierCertificateMutation,
  useRemoveSupplierCertificateMutation,
  useGetSeedlingSuppliersQuery
} = supplierApi;

export default supplierApi;
