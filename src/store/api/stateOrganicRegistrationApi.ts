/**
 * RTK Query slice for CDFA State Organic Program producer registration
 * (CA Food & Ag Code §§ 46000-46029) — distinct from CDFA OIM input-material
 * registration. Nested under /companies/{companyId}/establishments/{farmId}/.
 */
import { STATE_ORGANIC_REGISTRATION_URL } from 'config';

import baseApi from './baseApi';

export interface StateOrganicRegistration {
  id: number;
  public_id?: string;
  establishment?: number;
  state: string;
  program_name?: string;
  operation_type: string;
  operation_type_display?: string;
  status: string;
  status_display?: string;
  registration_number?: string | null;
  county?: string | null;
  commodities?: string[];
  prior_year_organic_gross_sales?: string | number | null;
  registration_date?: string | null;
  renewal_date?: string | null;
  is_current?: boolean;
}

interface Scope {
  companyId: string;
  farmId: string;
}

interface CreateArgs extends Scope {
  data: Partial<StateOrganicRegistration>;
}

interface UpdateArgs extends Scope {
  regId: string | number;
  data: Partial<StateOrganicRegistration>;
}

const stateOrganicRegistrationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStateOrganicRegistrations: build.query<StateOrganicRegistration[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: STATE_ORGANIC_REGISTRATION_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (
        response: StateOrganicRegistration[] | { results: StateOrganicRegistration[] }
      ) => (Array.isArray(response) ? response : response.results ?? []),
      providesTags: [{ type: 'StateOrganicRegistration', id: 'LIST' }]
    }),
    createStateOrganicRegistration: build.mutation<StateOrganicRegistration, CreateArgs>({
      query: ({ companyId, farmId, data }) => ({
        url: STATE_ORGANIC_REGISTRATION_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'StateOrganicRegistration', id: 'LIST' }]
    }),
    updateStateOrganicRegistration: build.mutation<StateOrganicRegistration, UpdateArgs>({
      query: ({ companyId, farmId, regId, data }) => ({
        url: STATE_ORGANIC_REGISTRATION_URL(companyId, farmId, regId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'StateOrganicRegistration', id: 'LIST' }]
    })
  })
});

export const {
  useGetStateOrganicRegistrationsQuery,
  useCreateStateOrganicRegistrationMutation,
  useUpdateStateOrganicRegistrationMutation
} = stateOrganicRegistrationApi;

export default stateOrganicRegistrationApi;
