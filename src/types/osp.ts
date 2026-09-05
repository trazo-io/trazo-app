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

export interface OSPSummary {
  id: number;
  public_id: string;
  version_number: number;
  status: OSPStatus;
  status_display: string;
  effective_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  certifier_template_name: string | null;
  section_completion: number; // 0..1
  created_at: string;
  updated_at: string;
}

export interface ApprovedNationalListInput {
  id: number;
  substance_name: string;
  cfr_section: string | null;
  status: string | null;
}

export interface ApprovedOMRIInput {
  id: number;
  product_name: string;
  omri_id: string | null;
  manufacturer: string | null;
  is_cdfa_oim_registered?: boolean;
  cdfa_oim_reg_number?: string | null;
}

export interface ApprovedWSDAInput {
  id: number;
  brand_name: string;
  wsda_id: string | null;
  manufacturer: string | null;
  category: string | null;
  is_cdfa_oim_registered?: boolean;
  cdfa_oim_reg_number?: string | null;
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
  }[];
  /**
   * How many rows matched in total. NOT `omri_candidates.length`, which is capped for display
   * — a grower told "6 products match" when 7 do may never see the one on their label.
   */
  omri_candidate_count?: number;
  national_list_substance_pk: number | null;
  national_list_substance_name: string | null;
  national_list_cfr_section: string | null;
  national_list_status: string | null;
  // WSDA Materials List — co-equal with OMRI per CCOF. Phase 1 additive fields.
  wsda_material_pk?: number | null;
  wsda_material_id?: string | null;
  wsda_material_name?: string | null;
  wsda_material_category?: string | null;
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
  /** Evidence exists AND the operator has not confirmed yet. Render as a suggestion, not a tick. */
  suggested: boolean;
  /** The operator's own assertion — the ONLY thing that may render as a ticked checkbox. */
  confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: number | null;
}

export interface OSPRecordTypesSummary {
  total: number;
  evidenced: number;
  confirmed: number;
  awaiting_confirmation: number;
  external_by_design: number;
  evidence_check_failed: number;
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
  blank_cells: number;
  error: boolean;
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
