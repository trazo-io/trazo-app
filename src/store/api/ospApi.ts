/**
 * OSP (Organic System Plan) RTK Query endpoints — Sprint 5A (7 CFR 205.201).
 *
 * Mirrors the pattern in certificationApi.ts: company + farm nested URLs,
 * cookie-based auth via customFetchBase, cache tags on the 'OSP' type.
 */

import {
  INPUT_VERIFY_URL,
  OSP_ACTIVATE_URL,
  OSP_ADD_APPROVED_INPUT_URL,
  OSP_CHANGE_NOTIFICATIONS_URL,
  OSP_NEW_VERSION_URL,
  OSP_REMOVE_APPROVED_INPUT_URL,
  OSP_SUBMIT_URL,
  OSP_URL
} from 'config';
import {
  ApprovedInputKind,
  CreateOSPChangeNotificationData,
  CreateOSPData,
  InputVerifyResult,
  OSP,
  OSPChangeNotification,
  OSPSummary,
  UpdateOSPData
} from 'types/osp';
import baseApi from './baseApi';

interface OSPScope {
  companyId: string;
  farmId: string;
}

interface OSPOne extends OSPScope {
  ospId: string | number;
}

interface OSPCreate extends OSPScope {
  data: CreateOSPData;
}

interface OSPUpdate extends OSPOne {
  data: UpdateOSPData;
}

interface OSPApprovedInputArgs extends OSPOne {
  kind: ApprovedInputKind;
  // pk of the NationalListSubstance or OMRIProduct to attach/detach.
  id: number;
  // Optional § 205.400(f)(1) certifier-letter citation. Stored on the change log row.
  change_notification_reference?: string;
  notes?: string;
}

interface OSPActivate extends OSPOne {
  // Activation requires certifier approval evidence (7 CFR 205.400). The
  // backend rejects the call with a 400 + { missing_evidence: [...] } if any
  // of these are absent both inline and on the record.
  approval_document: File;
  approval_certificate_number: string;
  approval_certifier_name: string;
}

const ospApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOSPs: build.query<OSPSummary[], OSPScope>({
      query: ({ companyId, farmId }) => ({
        url: OSP_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      // DRF list endpoints may wrap results in { results: [...] }. Normalize.
      transformResponse: (response: OSPSummary[] | { results: OSPSummary[] }) =>
        Array.isArray(response) ? response : response.results ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OSP' as const, id })),
              { type: 'OSP' as const, id: 'LIST' }
            ]
          : [{ type: 'OSP' as const, id: 'LIST' }]
    }),

    getOSP: build.query<OSP, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_result, _err, { ospId }) => [{ type: 'OSP', id: Number(ospId) }]
    }),

    createOSP: build.mutation<OSP, OSPCreate>({
      query: ({ companyId, farmId, data }) => ({
        url: OSP_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'OSP', id: 'LIST' }]
    }),

    updateOSP: build.mutation<OSP, OSPUpdate>({
      query: ({ companyId, farmId, ospId, data }) => ({
        url: OSP_URL(companyId, farmId, ospId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: (_res, _err, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSP', id: 'LIST' }
      ]
    }),

    submitOSP: build.mutation<OSP, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_SUBMIT_URL(companyId, farmId, ospId),
        method: 'POST',
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSP', id: 'LIST' }
      ]
    }),

    activateOSP: build.mutation<OSP, OSPActivate>({
      query: ({
        companyId,
        farmId,
        ospId,
        approval_document,
        approval_certificate_number,
        approval_certifier_name
      }) => {
        // Multipart — fetchBaseQuery detects FormData body and lets the browser
        // set Content-Type with the correct multipart boundary.
        const body = new FormData();
        body.append('approval_document', approval_document);
        body.append('approval_certificate_number', approval_certificate_number);
        body.append('approval_certifier_name', approval_certifier_name);
        return {
          url: OSP_ACTIVATE_URL(companyId, farmId, ospId),
          method: 'POST',
          body,
          credentials: 'include'
        };
      },
      // Activating supersedes the prior active OSP — invalidate the whole list.
      invalidatesTags: [{ type: 'OSP', id: 'LIST' }]
    }),

    newOSPVersion: build.mutation<OSP, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_NEW_VERSION_URL(companyId, farmId, ospId),
        method: 'POST',
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'OSP', id: 'LIST' }]
    }),

    addApprovedInput: build.mutation<OSP, OSPApprovedInputArgs>({
      query: ({ companyId, farmId, ospId, kind, id, change_notification_reference, notes }) => ({
        url: OSP_ADD_APPROVED_INPUT_URL(companyId, farmId, ospId),
        method: 'POST',
        body: { kind, id, change_notification_reference, notes },
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSP', id: 'LIST' }
      ]
    }),

    removeApprovedInput: build.mutation<OSP, OSPApprovedInputArgs>({
      query: ({ companyId, farmId, ospId, kind, id, change_notification_reference, notes }) => ({
        url: OSP_REMOVE_APPROVED_INPUT_URL(companyId, farmId, ospId),
        method: 'POST',
        body: { kind, id, change_notification_reference, notes },
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSP', id: 'LIST' }
      ]
    }),

    // NOP 2615 §3.4 — Notification of Changes (7 CFR 205.400(f)).
    getOSPChangeNotifications: build.query<OSPChangeNotification[], OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_CHANGE_NOTIFICATIONS_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSPChangeNotification', id: Number(ospId) }]
    }),

    createOSPChangeNotification: build.mutation<
      OSPChangeNotification,
      OSPOne & { data: CreateOSPChangeNotificationData }
    >({
      query: ({ companyId, farmId, ospId, data }) => ({
        url: OSP_CHANGE_NOTIFICATIONS_URL(companyId, farmId, ospId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSPChangeNotification', id: Number(ospId) }
      ]
    }),

    // Resolve a free-text product name to NL/OMRI matches. Used by the
    // Approved Inputs typeahead. Backend route: /certifications/verify-input/?name=
    verifyInput: build.query<InputVerifyResult, { name: string; omri_id?: string }>({
      query: ({ name, omri_id }) => ({
        url: INPUT_VERIFY_URL,
        method: 'GET',
        params: omri_id ? { name, omri_id } : { name },
        credentials: 'include'
      })
    })
  })
});

export const {
  useGetOSPsQuery,
  useGetOSPQuery,
  useCreateOSPMutation,
  useUpdateOSPMutation,
  useSubmitOSPMutation,
  useActivateOSPMutation,
  useNewOSPVersionMutation,
  useAddApprovedInputMutation,
  useRemoveApprovedInputMutation,
  useGetOSPChangeNotificationsQuery,
  useCreateOSPChangeNotificationMutation,
  useLazyVerifyInputQuery
} = ospApi;

export default ospApi;
