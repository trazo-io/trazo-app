/**
 * RTK Query slice for OSP annual continuation filings (7 CFR 205.406(a)).
 * Nested under /companies/{companyId}/establishments/{farmId}/osp-annual-updates/.
 */
import { OSP_ANNUAL_UPDATE_URL } from 'config';

import baseApi from './baseApi';

export interface OSPAnnualUpdate {
  id: number;
  public_id?: string;
  prior_osp: number;
  /** Version number of the plan this filing references — read-only, from the server. */
  prior_osp_version?: number | null;
  new_osp?: number | null;
  /** Version this filing produced. Null is normal: § 205.406 allows a pure "no material
   *  changes" attestation, which creates no new plan version. */
  new_osp_version?: number | null;
  reporting_year: number;
  changes_summary?: string;
  additions?: unknown[];
  deletions?: unknown[];
  sections_unchanged_attestation?: Record<string, boolean>;
  submitted_at?: string | null;
  certifier_acknowledged_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Scope {
  companyId: string;
  farmId: string;
}

interface CreateArgs extends Scope {
  data: Partial<OSPAnnualUpdate>;
}

interface UpdateArgs extends Scope {
  updateId: string | number;
  data: Partial<OSPAnnualUpdate>;
}

const ospAnnualUpdateApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOSPAnnualUpdates: build.query<OSPAnnualUpdate[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: OSP_ANNUAL_UPDATE_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response: OSPAnnualUpdate[] | { results: OSPAnnualUpdate[] }) =>
        Array.isArray(response) ? response : response.results ?? [],
      providesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    createOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, CreateArgs>({
      query: ({ companyId, farmId, data }) => ({
        url: OSP_ANNUAL_UPDATE_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    }),
    updateOSPAnnualUpdate: build.mutation<OSPAnnualUpdate, UpdateArgs>({
      query: ({ companyId, farmId, updateId, data }) => ({
        url: OSP_ANNUAL_UPDATE_URL(companyId, farmId, updateId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'OSPAnnualUpdate', id: 'LIST' }]
    })
  })
});

export const {
  useGetOSPAnnualUpdatesQuery,
  useCreateOSPAnnualUpdateMutation,
  useUpdateOSPAnnualUpdateMutation
} = ospAnnualUpdateApi;

export default ospAnnualUpdateApi;
