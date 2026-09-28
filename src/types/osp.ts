/**
 * Organic System Plan (OSP) types — Sprint 5A (7 CFR 205.201).
 *
 * Section keys must match backend OSP_SECTION_KEYS exactly
 * (trazo-back/certifications/models.py). Changes here require a backend change.
 */

export const OSP_SECTION_KEYS = [
  'practices_procedures', // (a)(1)
  'inputs_list', // (a)(2)
  'monitoring_plan', // (a)(3) — includes SOE fraud prevention
  'recordkeeping_description', // (a)(4)
  'commingling_barriers', // (a)(5)
  'additional_certifier_info' // (a)(6)
] as const;

export type OSPSectionKey = (typeof OSP_SECTION_KEYS)[number];

export type OSPStatus = 'draft' | 'submitted' | 'active' | 'superseded' | 'withdrawn';

export interface OSPSection {
  narrative: string;
  last_updated: string | null;
}

export type OSPSections = Record<OSPSectionKey, OSPSection>;

/**
 * `packet_agent_payload` in certifications/serializers.py — the SAME functions the packet's
 * coverage page calls, so what the plan page promises is what the reviewer reads.
 *   source: 'plan' (this plan's own answer) · 'certificate' (the certificate of record) ·
 *           'records' (another record names one) · '' (nothing names an agent)
 */
export interface PacketAgent {
  name: string;
  /** The picker's spelling of a recognised agent; '' when the name is no agent Trazo knows. */
  canonical_name: string;
  slug: string | null;
  source: 'plan' | 'certificate' | 'records' | '';
  own_numbering: boolean;
}

export interface OSPSummary {
  id: number;
  public_id: string;
  version_number: number;
  status: OSPStatus;
  status_display: string;
  effective_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  /** The certifying agent this plan is filed with, as the operator picked or typed it. */
  certifier_name: string;
  /** Which agent the packet is for and whether it speaks that agent's form numbers. */
  packet_agent: PacketAgent;
  certifier_template_name: string | null;
  section_completion: number; // 0..1
  created_at: string;
  updated_at: string;
}

export interface ApprovedNationalListInput {
  id: number;
  substance_name: string;
  cfr_section: string | null;
  /** "§ 205.601(e)", or "" for a nonsynthetic row. Print this, never a § built from `cfr_section`. */
  citation?: string | null;
  /** False for a nonsynthetic substance: allowed without a National List entry, so never filed under one. */
  is_national_list_entry?: boolean;
  status: string | null;
}

export interface ApprovedOMRIInput {
  id: number;
  product_name: string;
  omri_id: string | null;
  manufacturer: string | null;
  is_cdfa_oim_registered?: boolean;
}

export interface ApprovedWSDAInput {
  id: number;
  brand_name: string;
  /**
   * A real WSDA Product # — a bare integer — or null. The seeded catalogue also held
   * placeholders shaped `WSDA-REG-BIOAG-2025-001`, which WSDA issues nothing like; the
   * serializer now sends null rather than a registration a certifier would look up and
   * not find.
   */
  wsda_id: string | null;
  manufacturer: string | null;
  category: string | null;
  is_cdfa_oim_registered?: boolean;
}

/**
 * Single entry in the approved-inputs change log.
 * Written exclusively by add/remove_approved_input viewset actions.
 * Read-only from the API — no create/update/delete endpoints exposed.
 * Satisfies § 205.400(f)(1) change-notification audit requirement.
 */
export interface ApprovedInputChangeLog {
  id: number;
  kind: 'national_list' | 'omri' | 'wsda';
  target_name_at_change: string;
  action: 'added' | 'removed';
  changed_by_name: string | null;
  changed_at: string; // ISO 8601 UTC
  change_notification_reference: string;
  notes: string;
}

// NOP 2615 §3.4 — Notification of Changes (7 CFR 205.400(f)).
export type OSPChangeCategory =
  | 'prohibited_substance_application'
  | 'acreage_field_addition'
  | 'field_removal'
  | 'new_retail_label'
  | 'new_processing_handling'
  | 'practice_input_procedure_change';

export type OSPNotificationMethod = 'verbal' | 'written';

export type OSPDocumentationTiming = 'submitted_at_notification' | 'deferred_to_annual_update';

export interface OSPChangeNotification {
  id: number;
  osp: number;
  change_category: OSPChangeCategory;
  change_category_display: string;
  description: string;
  date_notified: string | null;
  method: OSPNotificationMethod | null;
  method_display: string;
  documentation_timing: OSPDocumentationTiming | null;
  documentation_timing_display: string;
  supporting_document: string | null;
  certifier_acknowledged_at: string | null;
  cfr_reference: string;
  is_immediate: boolean;
  parcel?: number | null;
  parcel_name?: string | null;
  created_at: string;
}

export interface CreateOSPChangeNotificationData {
  change_category: OSPChangeCategory;
  description: string;
  date_notified?: string;
  method?: OSPNotificationMethod;
  documentation_timing?: OSPDocumentationTiming;
  /** The parcel this notice concerns, when it concerns one. It then prints on that parcel's application. */
  parcel?: number | null;
}

export interface OSP extends OSPSummary {
  establishment: number;
  certification: number | null;
  previous_version: number | null;
  sections: OSPSections;
  pdf_document: string | null;
  submission_pdf: string | null;
  approval_document: string | null;
  approval_certificate_number: string | null;
  approval_certifier_name: string | null;
  approved_national_list_substances: ApprovedNationalListInput[];
  approved_omri_products: ApprovedOMRIInput[];
  approved_wsda_materials: ApprovedWSDAInput[];
  approved_input_changes: ApprovedInputChangeLog[];
  // P0-5 — registry ↔ § 205.201(a)(2) narrative sync diff. Populated by the
  // backend serializer on every OSP GET. Use to render the yellow warning
  // when registry entries aren't mentioned in the narrative.
  registry_sync_diff?: RegistrySyncDiff;
  certifier_template_url: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface RegistrySyncDiff {
  registry_total: number;
  narrative_char_count: number;
  entries_not_in_narrative: Array<{ source: string; name: string }>;
  has_warning: boolean;
}

export type ApprovedInputKind = 'national_list' | 'omri' | 'wsda';

export interface InputVerifyResult {
  found: boolean;
  status: string;
  confidence_score: number;
  notes: string | null;
  certifier_name: string | null;
  source_url: string | null;
  omri_product_pk: number | null;
  omri_product_id: string | null;
  omri_product_name: string | null;
  /**
   * Every catalog row the query matched, best first. One entry (or none) means the answer is
   * unambiguous; more than one means the grower must pick, because a one-tap attach on a
   * guessed row writes a third-party listing claim for a product they may not have applied.
   */
  omri_candidates?: {
    pk: number;
    omri_id: string | null;
    product_name: string;
    manufacturer?: string | null;
    /**
     * Which daily OMRI edition this row came from. Typed HERE, not only inside the component
     * helper that reads it: a local inline type let a candidate without the field pass, so a
     * backend rename would silently stop showing the edition with no error and no failing test.
     */
    list_edition_date?: string | null;
  }[];
  /**
   * How many rows matched in total. NOT `omri_candidates.length`, which is capped for display
   * — a grower told "6 products match" when 7 do may never see the one on their label.
   */
  omri_candidate_count?: number;
  national_list_substance_pk: number | null;
  national_list_substance_name: string | null;
  national_list_cfr_section: string | null;
  national_list_citation?: string | null;
  national_list_is_entry?: boolean | null;
  national_list_status: string | null;
  /**
   * Every § 205.601/602 entry the query could mean, best first. `status` travels PER ROW
   * because the catalogue holds prohibited substances alongside allowed ones and both answer
   * the same search — reading the status of whichever row ranked first would put an ordinary
   * Add button next to a substance banned in organic production.
   */
  national_list_candidates?: {
    pk: number;
    substance_name: string;
    cfr_section: string | null;
    citation?: string | null;
    is_national_list_entry?: boolean;
    subsection: string | null;
    status: string | null;
    restriction_notes: string | null;
  }[];
  national_list_candidate_count?: number;
  // WSDA Materials List — co-equal with OMRI per CCOF. Phase 1 additive fields.
  wsda_material_pk?: number | null;
  wsda_material_id?: string | null;
  wsda_material_name?: string | null;
  wsda_material_category?: string | null;
  /**
   * Same shortlist contract as `omri_candidates`, ported to WSDA on 2026-09-06. Until then
   * WSDA answered with one row, so a search for "Serenade" showed a single brand while the
   * plan's own Serenade Opti sat unreachable.
   */
  wsda_candidates?: {
    pk: number;
    wsda_id: string | null;
    brand_name: string;
    manufacturer?: string | null;
    category?: string | null;
  }[];
  wsda_candidate_count?: number;
}

/**
 * A material the operator put on the plan in their own words — CCOF NOPB41 §A–§D, WSDA AGR 2196.
 *
 * `listing_basis` is what may be SAID about the material and nothing more. `none_unlisted` renders
 * as "operator-entered; no third-party listing on file" — never as listed, approved or verified.
 * `listing_statement` is computed server-side for exactly that reason: the sentence a surface
 * prints must not be assembled locally out of a basis code.
 */
export type PlanMaterialListingBasis =
  | 'omri'
  | 'wsda'
  | 'national_list'
  | 'certifier_letter'
  | 'none_unlisted';

export type PlanMaterialCategory =
  | 'fertilizer_amendment'
  | 'pest_disease_weed'
  | 'production_aid'
  | 'post_harvest'
  | 'other';

export interface PlanMaterialEntry {
  id: number;
  product_name: string;
  manufacturer: string;
  category: PlanMaterialCategory;
  category_display: string;
  reason_for_use: string;
  listing_basis: PlanMaterialListingBasis;
  listing_basis_display: string;
  /** Server-computed. Print this, never a locally-built equivalent. */
  listing_statement: string;
  certifier_letter_reference: string;
  status: 'planned' | 'in_use';
  notes: string;
  national_list_substance?: number | null;
  omri_product?: number | null;
  wsda_material?: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlanMaterialInput {
  product_name: string;
  manufacturer?: string;
  category?: PlanMaterialCategory;
  reason_for_use?: string;
  listing_basis?: PlanMaterialListingBasis;
  certifier_letter_reference?: string;
  status?: 'planned' | 'in_use';
}

export interface ActivateOSPPayload {
  approval_document: File;
  approval_certificate_number: string;
  approval_certifier_name: string;
}

export interface CreateOSPData {
  certification?: number | null;
  /** The certifying agent this plan is filed with (the picker at plan start / on the plan page). */
  certifier_name?: string;
  sections?: Partial<OSPSections>;
  effective_date?: string | null;
  certifier_template_name?: string | null;
  certifier_template_url?: string | null;
  notes?: string | null;
}

export type UpdateOSPData = Partial<CreateOSPData> & {
  status?: OSPStatus;
  sections?: OSPSections; // full dict required by backend validate_sections
};

export function emptySections(): OSPSections {
  return OSP_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = { narrative: '', last_updated: null };
    return acc;
  }, {} as OSPSections);
}

/* -------------------------------------------------------------------------------------------
 * Common OSP § 11 — "Records Maintained" (7 CFR 205.103)
 *
 * USDA AMS published the Common OSP template set (files dated 2026-05-26). Its § 11 asks the
 * operation to check which record types it maintains, in four groups. Trazo derives EVIDENCE for
 * each from what the farm logged — but evidence is not an answer.
 *
 * 🔴 `suggested` and `confirmed` are separate on purpose. § 205.201(a) makes the PRODUCER the
 * author of the organic system plan, so only an explicit operator confirmation may render as a
 * ticked checkbox. A UI that renders `suggested` as a tick has reintroduced exactly the
 * auto-attestation bug this shape exists to prevent.
 * ---------------------------------------------------------------------------------------- */

export type OSPRecordEvidenceStatus =
  | 'evidenced_in_trazo'
  | 'not_evidenced_in_trazo'
  /** The evidence check itself failed. Deliberately NOT folded into "none": "we could not
   *  look" and "we looked and found nothing" are different statements to a certifier. */
  | 'evidence_check_failed';

export interface OSPRecordType {
  key: string;
  /** Verbatim USDA § 11 label — never reword it in the UI. */
  label: string;
  /** The § 11 question this checkbox sits under, verbatim. */
  group: string;
  cfr_cite: string;
  status: OSPRecordEvidenceStatus;
  count: number;
  /** Human-readable basis, e.g. "11 harvest events logged". Empty when nothing was found. */
  basis: string;
  /** Trazo structurally cannot see this record type (weigh tickets, contracts, ...). */
  external_by_design: boolean;
  /** The operator names this row themselves — both source forms end their lists with "Other:".
   *  It cannot be confirmed without a label (the server refuses), and it is never suggested. */
  free_text: boolean;
  /** What the operator called it. Printed in the packet after the form's own line. */
  custom_label: string | null;
  /** Evidence exists AND the operator has not confirmed yet. Render as a suggestion, not a tick. */
  suggested: boolean;
  /** The operator's own assertion — the ONLY thing that may render as a ticked checkbox. */
  confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: number | null;
  /** Set when this answer came across from an earlier plan version and nobody has re-stated it
   *  on this one. The row is still confirmed — it is the FRESHNESS that is open. */
  carried_from_version: number | null;
}

export interface OSPRecordTypesSummary {
  total: number;
  evidenced: number;
  confirmed: number;
  awaiting_confirmation: number;
  external_by_design: number;
  evidence_check_failed: number;
  /** Confirmed on an earlier plan, not re-stated on this one. Counted separately from
   *  `confirmed` rather than deducted from it — they are confirmed answers. */
  carried_forward: number;
}

export interface OSPRecordTypesResponse {
  summary: OSPRecordTypesSummary;
  record_types: OSPRecordType[];
}

/** One Common OSP required attachment. `blank_cells` is work remaining for the operator to
 *  complete — never a completeness score. */
export interface OSPAttachmentSummary {
  key: string;
  title: string;
  rows: number;
  /** Work remaining: `missing_from_records` + `needs_your_answer`. Never a completeness score. */
  blank_cells: number;
  /** Trazo fills this column from a record and the record is empty — fixable IN Trazo. */
  missing_from_records: number;
  /** Only the operator can supply it (a supplier's own certifier). Real work, not ours. */
  needs_your_answer: number;
  /** The form permits a blank, or the sheet's own opt-out declaration covers it. NOT work. */
  optional_blanks: number;
  /**
   * Which columns are blank, and where each is answered. Optional blanks are excluded — the
   * form permits them, so listing them would put back as a to-do exactly what the three counts
   * stopped presenting as work.
   */
  blanks?: OSPAttachmentBlank[];
  error: boolean;
}

/** One blank column on a generated attachment. */
export interface OSPAttachmentBlank {
  /** Verbatim USDA column header. */
  header: string;
  count: number;
  kind: 'record' | 'operator';
  /**
   * Where in Trazo this column is answered. Empty means nowhere — legitimate for an `operator`
   * blank (it is on the supplier's own certificate) and a bug for a `record` one.
   */
  fix: string;
}

/** One product on the Materials List, merged from the plan and the records. */
export interface OSPMaterialListRow {
  name: string;
  manufacturer: string;
  reason: string;
  /** '' when the operator has not said; otherwise PlanMaterialEntry.status. */
  status: '' | 'planned' | 'in_use';
  in_use: boolean;
  intended_for_use: boolean;
  /** 'plan' — declared only · 'records' — applied only · 'both'. */
  source: 'plan' | 'records' | 'both';
  /** The plan row's listing identifier, when it has one. */
  listing: string;
  /** PlanMaterialEntry pk when the operator already has a row of their own for this product. */
  entry_id: number | null;
}

export interface OSPMaterialsListResponse {
  materials: OSPMaterialListRow[];
}

export interface OSPMaterialAnswer {
  name: string;
  reason_for_use?: string;
  status?: 'planned' | 'in_use';
  manufacturer?: string;
}

/** One thing the operation's dated records did after the plan's newest answer. */
export interface OSPReviewFinding {
  code:
    | 'new_ground'
    | 'change_notifications'
    | 'seasons_closed'
    | 'seasons_started'
    | 'inputs_changed'
    | 'certifications_changed'
    | 'affidavits_added'
    | 'contamination_incidents'
    | 'responsible_person_missing'
    | string;
  message: string;
  count: number;
  details: string[];
  module_key: string | null;
}

export interface OSPReviewStaleModule {
  module_key: string;
  module: string;
  answered_at: string;
  days_before_submission: number;
}

/** GET /osps/{id}/review/ — a review LIST, never a verdict; it does not block submission. */
export interface OSPReview {
  answers_as_of: string | null;
  reference_date: string;
  is_clean: boolean;
  findings: OSPReviewFinding[];
  stale_modules: OSPReviewStaleModule[];
  parcels_not_named: string[];
}

export interface OSPAttachmentsResponse {
  workbooks: OSPAttachmentSummary[];
}
