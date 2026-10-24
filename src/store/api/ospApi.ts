/**
 * OSP (Organic System Plan) RTK Query endpoints — Sprint 5A (7 CFR 205.201).
 *
 * Mirrors the pattern in certificationApi.ts: company + farm nested URLs,
 * cookie-based auth via customFetchBase, cache tags on the 'OSP' type.
 */

import {
  INPUT_STATUS_PREVIEW_URL,
  INPUT_VERIFY_URL,
  OSP_ACTIVATE_URL,
  OSP_ADD_APPROVED_INPUT_URL,
  OSP_AGENT_FORM_SHEET_URL,
  OSP_PLAN_MATERIAL_DETAIL_URL,
  OSP_PLAN_MATERIALS_URL,
  OSP_CHANGE_NOTIFICATIONS_URL,
  OSP_ATTACHMENTS_URL,
  OSP_MATERIALS_LIST_ANSWER_URL,
  OSP_MATERIALS_LIST_URL,
  OSP_MATERIAL_IDENTITIES_URL,
  OSP_MATERIAL_RESTRICTIONS_URL,
  OSP_REVIEW_URL,
  OSP_MODULE_DEFINITIONS_URL,
  OSP_MODULE_URL,
  OSP_MODULES_URL,
  OSP_NEW_VERSION_URL,
  OSP_RECORD_TYPES_URL,
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
  OSPAttachmentsResponse,
  OSPReview,
  OSPRecordTypesResponse,
  OSPSummary,
  OSPMaterialAnswer,
  OSPMaterialsListResponse,
  MaterialIdentitiesResponse,
  MaterialIdentityDecision,
  MaterialIdentityInput,
  RestrictionMaterial,
  RestrictionStatement,
  RestrictionStatementInput,
  PlanMaterialEntry,
  PlanMaterialInput,
  UpdateOSPData
} from 'types/osp';
import type {
  ModuleDetailResponse,
  ModuleListResponse,
  ModuleRegistryResponse,
  SaveModulePayload
} from 'config/osp/types';
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

/**
 * One line of the copy sheet for the agent's renewal form. Keys, not sentences: the client words
 * every row in the operator's language.
 *   value         Trazo holds it; copy `value`.
 *   not_recorded  Trazo has a place for it and it is empty.
 *   not_in_trazo  Trazo keeps no such record.
 *   yours         the operator's own election, commitment or signature. Never pre-answered.
 *   note          an instruction the agent's form gives; nothing to answer.
 */
export interface AgentFormSheetRow {
  step: string;
  item: string;
  kind: 'value' | 'not_recorded' | 'not_in_trazo' | 'yours' | 'note';
  value: unknown;
  source: string;
  extra: Record<string, unknown>;
}

export interface AgentFormSheet {
  agent: string;
  agent_name: string;
  form: { title: string; document_id: string; revision: string; url: string };
  plan_version: number;
  filing_id: number | null;
  establishment_id: number;
  company_id: number | null;
  rows: AgentFormSheetRow[];
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

/**
 * The POST body for a change notification: JSON unless a file rides along, multipart with one.
 * fetchBaseQuery sees FormData and lets the browser set the boundary, the same path the activation
 * upload takes. The file is a removed field's map (WSDA AGR 2516); it ships in the renewal packet.
 */
export const changeNotificationBody = (
  data: CreateOSPChangeNotificationData
): Omit<CreateOSPChangeNotificationData, 'supporting_document'> | FormData => {
  const { supporting_document, ...fields } = data;
  if (!supporting_document) return fields;
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });
  form.append('supporting_document', supporting_document);
  return form;
};

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

    // --- Operator-authored materials-list rows -------------------------------------------
    // The materials list could hold only what a catalog already knew, so CCOF ORGB41 §A's own
    // examples (compost, manure, gypsum, limestone) and every home-formulated product had
    // nowhere to go — while the module attested that everything in use was on the list.
    getPlanMaterials: build.query<PlanMaterialEntry[], OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_PLAN_MATERIALS_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (r: PlanMaterialEntry[] | { results: PlanMaterialEntry[] }) =>
        Array.isArray(r) ? r : r?.results ?? [],
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSP', id: Number(ospId) }]
    }),

    addPlanMaterial: build.mutation<PlanMaterialEntry, OSPOne & { body: PlanMaterialInput }>({
      query: ({ companyId, farmId, ospId, body }) => ({
        url: OSP_PLAN_MATERIALS_URL(companyId, farmId, ospId),
        method: 'POST',
        body,
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSP', id: 'LIST' }
      ]
    }),

    deletePlanMaterial: build.mutation<void, OSPOne & { entryId: number }>({
      query: ({ companyId, farmId, ospId, entryId }) => ({
        url: OSP_PLAN_MATERIAL_DETAIL_URL(companyId, farmId, ospId, entryId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSP', id: 'LIST' }
      ]
    }),

    // The Materials List attachment, as rows the operator can finish. The three columns a
    // catalog cannot answer — manufacturer, reason for use, in use vs intended — had no control
    // anywhere in Trazo, while the attachments panel counted them as "cells to fill in Trazo".
    getOSPMaterialsList: build.query<OSPMaterialsListResponse, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_MATERIALS_LIST_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSP', id: Number(ospId) }]
    }),

    // Writing an answer can put a logged-but-undeclared material ON the plan, so this
    // invalidates the attachment counts as well: the blank it filled is one of the numbers the
    // § 11 panel prints, and leaving that stale is how a farmer fills a cell and is told again
    // that it is empty.
    answerOSPMaterial: build.mutation<unknown, OSPOne & { body: OSPMaterialAnswer }>({
      query: ({ companyId, farmId, ospId, body }) => ({
        url: OSP_MATERIALS_LIST_ANSWER_URL(companyId, farmId, ospId),
        method: 'POST',
        body,
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSP', id: 'LIST' },
        { type: 'OSPRecordTypes', id: Number(ospId) }
      ]
    }),

    // OSP alignment T18 (Phase 5): the operator decides what a logged product name IS. A decision
    // writes nothing on the record or the plan; it can change the materials list and drift findings.
    getMaterialIdentities: build.query<MaterialIdentitiesResponse, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_MATERIAL_IDENTITIES_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSP', id: Number(ospId) }]
    }),

    decideMaterialIdentity: build.mutation<
      MaterialIdentityDecision,
      OSPOne & { body: MaterialIdentityInput }
    >({
      query: ({ companyId, farmId, ospId, body }) => ({
        url: OSP_MATERIAL_IDENTITIES_URL(companyId, farmId, ospId),
        method: 'POST',
        body,
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSPRecordTypes', id: Number(ospId) }
      ]
    }),

    // Refetched with the plan and with the annual updates: the sales period, the changed
    // sections and the sales figure all move when either is saved.
    getAgentFormSheet: build.query<AgentFormSheet, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_AGENT_FORM_SHEET_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      // 'Farm' and 'Company': a Client ID, contact or DBA filled from the sheet is saved there.
      providesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSPAnnualUpdate', id: 'LIST' },
        'Farm',
        'Company'
      ]
    }),

    // T18 slice 2b: restriction statements. A statement approves nothing and clears no finding.
    getMaterialRestrictions: build.query<{ materials: RestrictionMaterial[] }, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_MATERIAL_RESTRICTIONS_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSP', id: Number(ospId) }]
    }),

    recordRestrictionStatement: build.mutation<
      RestrictionStatement,
      OSPOne & { body: RestrictionStatementInput }
    >({
      query: ({ companyId, farmId, ospId, body }) => ({
        url: OSP_MATERIAL_RESTRICTIONS_URL(companyId, farmId, ospId),
        method: 'POST',
        body,
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSPRecordTypes', id: Number(ospId) }
      ]
    }),

    // Browser test follow-up (2026-10-03): undo a decision or withdraw a statement made by mistake.
    // Same routes as recording; the body names the row and the reason. Both stay in the history.
    withdrawMaterialIdentity: build.mutation<
      MaterialIdentityDecision,
      OSPOne & { body: { withdraw: number; reason: string } }
    >({
      query: ({ companyId, farmId, ospId, body }) => ({
        url: OSP_MATERIAL_IDENTITIES_URL(companyId, farmId, ospId),
        method: 'POST',
        body,
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSPRecordTypes', id: Number(ospId) }
      ]
    }),

    withdrawRestrictionStatement: build.mutation<
      RestrictionStatement,
      OSPOne & { body: { withdraw: number; reason: string } }
    >({
      query: ({ companyId, farmId, ospId, body }) => ({
        url: OSP_MATERIAL_RESTRICTIONS_URL(companyId, farmId, ospId),
        method: 'POST',
        body,
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSP', id: Number(ospId) },
        { type: 'OSPRecordTypes', id: Number(ospId) }
      ]
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
        body: changeNotificationBody(data),
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSPChangeNotification', id: Number(ospId) },
        { type: 'OSPReview', id: Number(ospId) }
      ]
    }),

    // Withdraw a notification the certifier has not acknowledged yet. The
    // backend refuses once `certifier_acknowledged_at` is set — an
    // acknowledged entry is a record of what a third party was told, and
    // correcting it means filing a NEW notification, not editing the old one.
    deleteOSPChangeNotification: build.mutation<void, OSPOne & { notificationId: number }>({
      query: ({ companyId, farmId, ospId, notificationId }) => ({
        url: `${OSP_CHANGE_NOTIFICATIONS_URL(companyId, farmId, ospId)}${notificationId}/`,
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSPChangeNotification', id: Number(ospId) },
        { type: 'OSPReview', id: Number(ospId) }
      ]
    }),

    // Common OSP § 11 "Records Maintained" — evidence derived from logged events.
    // The response separates `suggested` (we found records) from `confirmed` (the operator
    // says so). Only the latter may render as a ticked checkbox: 7 CFR 205.201(a) makes the
    // producer the author of the plan.
    // Guided OSP modules — WS-2.4. Definitions are content-versioned and stable per
    // deploy; answers invalidate the module list and the OSP row (the compiler
    // rewrites sections on every module save).
    getOSPModuleDefinitions: build.query<ModuleRegistryResponse, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_MODULE_DEFINITIONS_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSPModules', id: `defs-${ospId}` }]
    }),

    getOSPModules: build.query<ModuleListResponse, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_MODULES_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSPModules', id: `list-${ospId}` }]
    }),

    getOSPModule: build.query<ModuleDetailResponse, OSPOne & { moduleKey: string }>({
      query: ({ companyId, farmId, ospId, moduleKey }) => ({
        url: OSP_MODULE_URL(companyId, farmId, ospId, moduleKey),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId, moduleKey }) => [
        { type: 'OSPModules', id: `${ospId}-${moduleKey}` }
      ]
    }),

    saveOSPModule: build.mutation<
      ModuleDetailResponse,
      OSPOne & { moduleKey: string; data: SaveModulePayload }
    >({
      query: ({ companyId, farmId, ospId, moduleKey, data }) => ({
        url: OSP_MODULE_URL(companyId, farmId, ospId, moduleKey),
        method: 'PUT',
        credentials: 'include',
        body: data
      }),
      invalidatesTags: (_r, _e, { ospId, moduleKey }) => [
        { type: 'OSPModules', id: `${ospId}-${moduleKey}` },
        { type: 'OSPModules', id: `list-${ospId}` },
        { type: 'OSP', id: Number(ospId) }
      ]
    }),

    getOSPRecordTypes: build.query<OSPRecordTypesResponse, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_RECORD_TYPES_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSPRecordTypes', id: Number(ospId) }]
    }),

    // Record the OPERATOR's confirmation for one or more § 11 record types. This is the only
    // path from evidence to an assertion — never call it from a derivation, and never from a
    // "confirm everything" control: several keys in one request is the panel BATCHING boxes the
    // operator ticked one at a time, not a shortcut past ticking them.
    // `label` names the free-text "Other" row and is required to confirm it (the server refuses
    // an unnamed one); it applies to exactly that one key.
    confirmOSPRecordTypes: build.mutation<
      OSPRecordTypesResponse,
      OSPOne & { keys: string[]; confirmed?: boolean; label?: string }
    >({
      query: ({ companyId, farmId, ospId, keys, confirmed = true, label }) => ({
        url: OSP_RECORD_TYPES_URL(companyId, farmId, ospId),
        method: 'POST',
        body: label === undefined ? { keys, confirmed } : { keys, confirmed, label },
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSPRecordTypes', id: Number(ospId) },
        { type: 'OSP', id: Number(ospId) }
      ]
    }),

    // The operator's statement that the operation does NOT keep one record type, with a reason
    // (OSP alignment audit T17-F1). Never satisfies the records attestation for a required record.
    markOSPRecordTypeNotKept: build.mutation<
      OSPRecordTypesResponse,
      OSPOne & { key: string; reason: string }
    >({
      query: ({ companyId, farmId, ospId, key, reason }) => ({
        url: OSP_RECORD_TYPES_URL(companyId, farmId, ospId),
        method: 'POST',
        body: { keys: [key], not_kept: true, reason },
        credentials: 'include'
      }),
      invalidatesTags: (_r, _e, { ospId }) => [
        { type: 'OSPRecordTypes', id: Number(ospId) },
        { type: 'OSP', id: Number(ospId) }
      ]
    }),

    // Common OSP required attachments — per-workbook row + blank-cell counts. The files
    // themselves download straight from OSP_ATTACHMENTS_URL with ?workbook=, not through RTK
    // Query, because the response is an .xlsx attachment rather than JSON.
    getOSPAttachments: build.query<OSPAttachmentsResponse, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_ATTACHMENTS_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { ospId }) => [{ type: 'OSPRecordTypes', id: Number(ospId) }]
    }),

    // Plan review — the list of things the operation's records did after the plan's newest
    // answer. Tagged with the OSP so a saved module answer or a new notification refreshes it.
    getOSPReview: build.query<OSPReview, OSPOne>({
      query: ({ companyId, farmId, ospId }) => ({
        url: OSP_REVIEW_URL(companyId, farmId, ospId),
        method: 'GET',
        credentials: 'include'
      }),
      // Its own tag, so the things that change what the review says — a filed notice, a
      // saved module, an OSP edit — refresh it without refetching the whole plan.
      providesTags: (_r, _e, { ospId }) => [
        { type: 'OSPReview', id: Number(ospId) },
        { type: 'OSP', id: Number(ospId) }
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
    }),

    /**
     * What the buyer page will say about this input, decided by the SERVER, for a draft the
     * wizard has not saved yet.
     *
     * 🔴 2026-09-03 — the wizard's Preview renders the consumer card over form values, and the
     * organic chip is the one thing on it the client may not decide: `ORGANIC_STATUS_KEYS` maps
     * every `organic_approved` value to the grower-reported wording, because the browser cannot
     * see the OMRI or WSDA catalogs. So a grower who had just attached the Entrust OMRI listing
     * opened Preview and read "Organic-approved · grower-reported" — a false negative on the
     * screen whose whole purpose is to show what the saved page shows.
     *
     * A POST rather than a GET: the draft is the input, there is no resource to address, and
     * a product name does not belong in a URL that could end up in a log. It is nonetheless a
     * `build.query` — it reads, caches on the draft, and must not invalidate anything.
     */
    previewInputStatus: build.query<
      { status: string; label: string },
      {
        commercial_name?: string;
        active_ingredient?: string;
        organic_approved?: string;
        restricted_use_pesticide?: boolean;
        omri_product?: number | null;
        wsda_material?: number | null;
      }
    >({
      query: (draft) => ({
        url: INPUT_STATUS_PREVIEW_URL,
        method: 'POST',
        body: draft,
        credentials: 'include'
      })
    })
  })
});

export const {
  useGetOSPsQuery,
  usePreviewInputStatusQuery,
  useGetOSPQuery,
  useCreateOSPMutation,
  useUpdateOSPMutation,
  useSubmitOSPMutation,
  useActivateOSPMutation,
  useNewOSPVersionMutation,
  useAddApprovedInputMutation,
  useAnswerOSPMaterialMutation,
  useAddPlanMaterialMutation,
  useDeletePlanMaterialMutation,
  useGetOSPMaterialsListQuery,
  useGetMaterialIdentitiesQuery,
  useGetMaterialRestrictionsQuery,
  useGetAgentFormSheetQuery,
  useRecordRestrictionStatementMutation,
  useWithdrawMaterialIdentityMutation,
  useWithdrawRestrictionStatementMutation,
  useDecideMaterialIdentityMutation,
  useGetPlanMaterialsQuery,
  useRemoveApprovedInputMutation,
  useGetOSPChangeNotificationsQuery,
  useCreateOSPChangeNotificationMutation,
  useDeleteOSPChangeNotificationMutation,
  useGetOSPRecordTypesQuery,
  useGetOSPModuleDefinitionsQuery,
  useGetOSPModulesQuery,
  useGetOSPModuleQuery,
  useSaveOSPModuleMutation,
  useGetOSPAttachmentsQuery,
  useGetOSPReviewQuery,
  useConfirmOSPRecordTypesMutation,
  useMarkOSPRecordTypeNotKeptMutation,
  useLazyVerifyInputQuery
} = ospApi;

export default ospApi;
