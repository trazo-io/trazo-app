/**
 * The company's saved applicators (trazo-back `company.views.ApplicatorViewSet`).
 *
 * WAC 16-228-1320(1)(l) asks a spray record for the licensed applicator's full name, license
 * number, address and phone. A saved applicator holds them once; the spray form COPIES them into
 * the record's own fields when someone picks a name. The record never links back here, so editing
 * or deactivating a saved applicator never changes a spray already logged.
 *
 * Not the crew roster (`crewSenderApi`): that list is phones allowed to send field notes, and it
 * never names the applicator of record.
 */
import { APPLICATOR_URL } from 'config';
import baseApi from './baseApi';

export interface Applicator {
  id: number;
  full_name: string;
  license_number: string;
  /** Two-letter US state code, or blank. */
  license_state: string;
  address: string;
  phone: string;
  /** False once removed: still listed for reference, never offered on the spray form. */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ApplicatorInput = Partial<
  Pick<
    Applicator,
    'full_name' | 'license_number' | 'license_state' | 'address' | 'phone' | 'is_active'
  >
>;

interface Scope {
  companyId: string | number;
}

const listOf = <T>(response: T[] | { results: T[] }) =>
  Array.isArray(response) ? response : response?.results ?? [];

const applicatorApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * `active: true` is the spray form's list: only the people it may offer. Without it, every
     * saved applicator, deactivated ones included, for the page that manages them. The company id
     * is in the arg so a company switch is a different cache entry, never the previous list.
     */
    getApplicators: build.query<Applicator[], Scope & { active?: boolean }>({
      query: ({ companyId, active }) => ({
        url: APPLICATOR_URL(companyId),
        method: 'GET',
        credentials: 'include',
        params: active === undefined ? undefined : { active: String(active) }
      }),
      transformResponse: listOf<Applicator>,
      providesTags: ['Applicator']
    }),
    addApplicator: build.mutation<Applicator, Scope & { data: ApplicatorInput }>({
      query: ({ companyId, data }) => ({
        url: APPLICATOR_URL(companyId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['Applicator']
    }),
    updateApplicator: build.mutation<
      Applicator,
      Scope & { applicatorId: number; data: ApplicatorInput }
    >({
      query: ({ companyId, applicatorId, data }) => ({
        url: APPLICATOR_URL(companyId, applicatorId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['Applicator']
    }),
    /** DELETE deactivates and answers with the row; nothing is erased. */
    deactivateApplicator: build.mutation<Applicator, Scope & { applicatorId: number }>({
      query: ({ companyId, applicatorId }) => ({
        url: APPLICATOR_URL(companyId, applicatorId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['Applicator']
    })
  })
});

export const {
  useGetApplicatorsQuery,
  useAddApplicatorMutation,
  useUpdateApplicatorMutation,
  useDeactivateApplicatorMutation
} = applicatorApi;

export default applicatorApi;
