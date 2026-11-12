/**
 * The people the operation names to its certifying agent, each with the roles they hold.
 *
 * OTCO O1 section B (legally responsible, primary, billing, authorized to act, responsibly connected with the
 * connection) and CCOF's Certification Contract A4, C1 and C2. One person can hold several roles, so the roles
 * are flags on one row. The server allows one primary and one legally responsible contact per farm.
 */
import { OPERATION_CONTACT_URL } from 'config';
import baseApi from './baseApi';

export const CONNECTIONS = [
  'partner',
  'officer',
  'director',
  'holder',
  'manager',
  'owner_10_percent',
  'other'
] as const;
export type Connection = (typeof CONNECTIONS)[number] | '';

export const ROLE_FLAGS = [
  'is_legally_responsible',
  'is_primary_contact',
  'is_billing_contact',
  'is_authorized_representative',
  'is_responsibly_connected'
] as const;
export type RoleFlag = (typeof ROLE_FLAGS)[number];

export interface OperationContact {
  id: number;
  name: string;
  title: string;
  phone: string;
  email: string;
  is_legally_responsible: boolean;
  is_primary_contact: boolean;
  is_billing_contact: boolean;
  is_authorized_representative: boolean;
  is_responsibly_connected: boolean;
  connection: Connection;
  connection_other: string;
}

export type OperationContactInput = Omit<OperationContact, 'id'>;

interface Scope {
  companyId: string;
  farmId: string;
}

const listOf = <T>(response: T[] | { results: T[] }) =>
  Array.isArray(response) ? response : response?.results ?? [];

const operationContactApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOperationContacts: build.query<OperationContact[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: OPERATION_CONTACT_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: listOf<OperationContact>,
      providesTags: ['OperationContact']
    }),
    addOperationContact: build.mutation<OperationContact, Scope & { data: OperationContactInput }>({
      query: ({ companyId, farmId, data }) => ({
        url: OPERATION_CONTACT_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['OperationContact']
    }),
    updateOperationContact: build.mutation<
      OperationContact,
      Scope & { contactId: number; data: OperationContactInput }
    >({
      query: ({ companyId, farmId, contactId, data }) => ({
        url: OPERATION_CONTACT_URL(companyId, farmId, contactId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['OperationContact']
    }),
    deleteOperationContact: build.mutation<void, Scope & { contactId: number }>({
      query: ({ companyId, farmId, contactId }) => ({
        url: OPERATION_CONTACT_URL(companyId, farmId, contactId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['OperationContact']
    })
  })
});

export const {
  useGetOperationContactsQuery,
  useAddOperationContactMutation,
  useUpdateOperationContactMutation,
  useDeleteOperationContactMutation
} = operationContactApi;

export default operationContactApi;
