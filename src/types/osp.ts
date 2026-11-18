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
  /** The version this one was forked from; null on the operation's first plan version in Trazo.
   *  Absent from a backend older than 2026-11-14. */
  previous_version?: number | null;
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
  /**
   * How many of the six § 205.201(a) narratives have text, by the submit gate's rule (at least
   * 400 characters, not padding) plus the OSP page's (a)(2) registry hold. The number the OSP
   * page and the onboarding checklist show. `section_completion` counts any non-blank narrative.
   * Absent from a backend older than 2026-10-17.
   */
  sections_with_text?: number;
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
  /** A § 205.602 row the rule allows for one stated use; the plan may carry it. */
  is_conditionally_permitted?: boolean;
  subsection?: string | null;
  restriction_notes?: string | null;
  /** A § 205.601 row the rule allows only under a condition of use, and the rule's words for it. */
  allowed_with_condition?: boolean;
  rule_paragraph?: string | null;
  rule_words?: string | null;
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
 * The paper trail for § 205.400(f)(2): a change to the plan's inputs list.
 */
export interface ApprovedInputChangeLog {
  id: number;
  /** 'operator_entered' since 2026-11-16: a material put on the plan in the operator's own words. */
  kind: 'national_list' | 'omri' | 'wsda' | 'operator_entered';
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
  /** Why the acreage left organic production; field removals only ("" on older notices). */
  removal_reason: string;
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
  /** Required by the backend for a new `field_removal` notice (WSDA AGR 2516 asks why). */
  removal_reason?: string;
  /** For a removed field, the map of the new boundaries. Sent as multipart; it ships in the packet. */
  supporting_document?: File | null;
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
  /** Edition date of the first OMRI list that no longer carried the matched product (OV-MT-C04). */
  omri_product_delisted_on?: string | null;
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
    /** Edition date of the first OMRI list that no longer carried the product; null while listed. */
    delisted_on?: string | null;
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
   * A § 205.602 row the rule allows for one stated use ((c), (e), (h)). Typed by the server from
   * `annotation_kind`; the client never reads it from the note's prose.
   */
  national_list_conditional?: boolean | null;
  /** The paragraph letter ("c"), so the client words the condition in the reader's language. */
  national_list_subsection?: string | null;
  /** The rule's text as stored, in English. */
  national_list_restriction_notes?: string | null;
  /**
   * A § 205.601 row the rule allows only under a condition of use: zinc and boron with a documented
   * deficiency ((j)(7)), boric acid for structural pest control ((e)(3)). Typed by the server; never
   * plain "allowed" (overall review OV-MT-C01). Absent from a backend older than 2026-11-16.
   */
  national_list_allowed_with_condition?: boolean | null;
  /** The paragraph whose words follow, e.g. "(j)(7)". */
  national_list_rule_paragraph?: string | null;
  /** The rule's own words for the row's entry, verbatim and in English (eCFR). Never a paraphrase. */
  national_list_rule_words?: string | null;
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
    is_conditionally_permitted?: boolean;
    restriction_notes: string | null;
    allowed_with_condition?: boolean;
    rule_paragraph?: string | null;
    rule_words?: string | null;
  }[];
  national_list_candidate_count?: number;
  // WSDA Materials List — co-equal with OMRI per CCOF. Phase 1 additive fields.
  wsda_material_pk?: number | null;
  wsda_material_id?: string | null;
  wsda_material_name?: string | null;
  wsda_material_category?: string | null;
  /**
   * WSDA's own Annotation column for the product, verbatim and in English ("Deficiency must be
   * documented."), with the edition it was read from. "" is WSDA's NONE, which is not "no
   * restrictions" (the label can still restrict use); null is "not transcribed".
   */
  wsda_material_annotation?: string | null;
  wsda_list_effective_date?: string | null;
  /** Edition date of the first WSDA list that no longer carried the product; null while listed. */
  wsda_material_delisted_on?: string | null;
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
    annotation?: string | null;
    delisted_on?: string | null;
  }[];
  wsda_candidate_count?: number;
}

/**
 * A material the operator put on the plan in their own words — CCOF ORGB41 §A–§D, WSDA AGR 2196.
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
  /** Not chosen yet: the backend default since migration 0070 (back #294). */
  | ''
  | 'fertilizer_amendment'
  | 'pest_disease_weed'
  | 'production_aid'
  | 'post_harvest'
  | 'facility_pest'
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
  /** The operator states the operation does NOT keep this record, with a reason. Never a way
   *  out of a required record: it prints as missing (OSP alignment audit T17-F1). */
  not_kept?: boolean;
  not_kept_reason?: string;
  /** Only the operator can state how this record links to the next and previous document (a weigh
   *  ticket, a delivery slip, their own form). Asked once confirmed; the audit trail exhibit prints it
   *  as the operator's statement (OTCO C12 12.2-6). */
  operator_states_link?: boolean;
  /** That statement; '' until given. */
  linking_element?: string;
  /** This plan's own answers require this record type, and why. */
  required?: boolean;
  required_state?: 'confirmed' | 'not_confirmed' | 'not_kept' | 'unresolved' | '';
  required_because?: string;
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
  /** The kind the records log it as ("Pest control"), only while `reason` is blank: a hint, never the answer. */
  reason_kind?: string;
  /** ISO date of the row's own logged application, '' when the records hold none. */
  last_logged_on?: string;
  /** '' when the operator has not said; otherwise PlanMaterialEntry.status. */
  status: '' | 'planned' | 'in_use' | 'discontinued';
  in_use: boolean;
  intended_for_use: boolean;
  /** 'plan' — declared only · 'records' — applied only · 'both'. */
  source: 'plan' | 'records' | 'both';
  /** The plan row's listing identifier, when it has one. */
  listing: string;
  /** PlanMaterialEntry pk when the operator already has a row of their own for this product. */
  entry_id: number | null;
  /** The operator's own row's section on the agent's form; '' until set. */
  category:
    | ''
    | 'fertilizer_amendment'
    | 'pest_disease_weed'
    | 'production_aid'
    | 'post_harvest'
    | 'facility_pest'
    | 'other';
  /** CCOF §F/§G, on a facility pest row: National List type ('not_national_list' for §G), '' unset. */
  facility_material_type: string;
  /** Where in the facility it is used; '' unset. */
  where_used: string;
  /** Applied by fumigation or fogging; null = not stated. */
  applied_by_fumigation: boolean | null;
  /** The agent's review as the operator recorded it from the agent's own list; '' = not recorded. */
  agent_review: '' | 'requested' | 'approved' | 'not_approved' | 'review_incomplete';
  agent_review_date: string;
  agent_review_reference: string;
  agent_review_use: string;
  /** How the packet prints the review; '' when none is recorded. */
  agent_review_statement: string;
  /** The label or container photo filed for this material (a document id), null when none is. */
  label_document: number | null;
  label_document_title: string;
  /** The plan's agent asks for this product's label (OTCO C11 11.1: not OMRI or WSDA listed). */
  needs_label: boolean;
  /**
   * OTCO C11's review agency box this row's own record fills: its OMRI or WSDA listing, or 'other'.
   * Only an 'other' row may name another agency; the server refuses one on an OMRI or WSDA row.
   */
  review_position: 'omri' | 'wsda' | 'other';
  /** The Other review agency as the operator records it; '' when none is named. */
  other_review_agency: string;
  other_review_reference: string;
}

export interface OSPMaterialsListResponse {
  materials: OSPMaterialListRow[];
}

export interface OSPMaterialAnswer {
  name: string;
  reason_for_use?: string;
  status?: 'planned' | 'in_use' | 'discontinued';
  manufacturer?: string;
  category?: string;
  agent_review?: string;
  agent_review_date?: string;
  agent_review_reference?: string;
  agent_review_use?: string;
  /** A document id, or '' to remove the label. */
  label_document?: string;
  facility_material_type?: string;
  where_used?: string;
  /** 'true' | 'false' | '' (not stated). */
  applied_by_fumigation?: string;
  other_review_agency?: string;
  other_review_reference?: string;
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
    | 'responsible_person_not_legally_responsible'
    | 'planting_stock_answers_disagree'
    | 'seed_stock_materials_not_listed'
    | 'international_trade_answers_disagree'
    | 'materials_rows_incomplete'
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

/** OSP alignment T18 (Phase 5 slice 2). Mirrors `certifications/services/material_identity.py`. */
export type MaterialIdentitySource = 'chemical' | 'amendment' | 'sanitizer';
export type MaterialIdentityEventState = 'covered' | 'unreviewed' | 'stale' | 'excepted';
export type MaterialIdentityTargetKind = 'plan_entry' | 'omri' | 'wsda';

export interface MaterialIdentityDecision {
  id: number;
  decision: 'same_as' | 'different_product';
  target_kind: MaterialIdentityTargetKind | '';
  target_id: number | null;
  target_name: string;
  reviewed_event_ids: number[];
  exceptions: Array<{ event_id: number; reason: string }>;
  formulation_difference_acknowledged: boolean;
  formulation_note: string;
  note: string;
  decided_by_name: string;
  decided_at: string | null;
  plan_version: number | null;
  supersedes: number | null;
  superseded_at: string | null;
  /** Undone by the operator (a decision made by mistake), with a reason; kept in the history. */
  withdrawn_at?: string | null;
  withdrawal_reason?: string;
  withdrawn_by_name?: string;
  basis: string;
}

/** Slice 3: computed on read, never stored. A suggestion decides, clears and changes nothing. */
export type MaterialIdentitySuggestion =
  | {
      kind: 'shared_brand';
      target: MaterialIdentityTarget;
      numbers_differ: boolean;
      /** Matched on the product name after a leading maker or brand word ("Bayer Serenade Opti"). */
      after_prefix?: boolean;
    }
  | {
      kind: 'plan_answer_names';
      module: string;
      question: string;
      product_name: string;
      catalog: 'omri' | 'wsda';
      catalog_id: number;
      subtype: string;
      approved_substance: string;
      /** The section and question as the wizard shows them ("G6.4 On-Farm Handling"). */
      module_label?: string;
      question_label?: string;
    }
  | { kind: 'suggested_substance_on_plan'; substance_id: number; substance_name: string };

export interface MaterialIdentity {
  source: MaterialIdentitySource;
  logged_name: string;
  name_key: string;
  events: Array<{
    id: number;
    date: string | null;
    state: MaterialIdentityEventState;
    /** Where, how much and what was logged, so a use can be judged without opening it. */
    parcel?: string;
    amount?: string;
    as_logged?: string;
  }>;
  current: MaterialIdentityDecision | null;
  history: MaterialIdentityDecision[];
  suggestions?: MaterialIdentitySuggestion[];
}

export interface MaterialIdentityTarget {
  kind: MaterialIdentityTargetKind;
  id: number;
  name: string;
}

export interface MaterialIdentitiesResponse {
  identities: MaterialIdentity[];
  targets: MaterialIdentityTarget[];
}

export interface MaterialIdentityInput {
  source: MaterialIdentitySource;
  logged_name: string;
  decision: 'same_as' | 'different_product';
  target_kind?: MaterialIdentityTargetKind;
  target_id?: number;
  event_ids: number[];
  exceptions?: Array<{ event_id: number; reason: string }>;
  formulation_difference_acknowledged?: boolean;
  formulation_note?: string;
  note?: string;
  supersedes?: number;
}

/** OSP alignment T18 (Phase 5 slice 2b). Mirrors `certifications/services/material_restrictions.py`. */
export type RestrictionMaterialKind = 'plan_entry' | 'omri' | 'wsda' | 'national_list';
export type RestrictionSource = 'regulation' | 'operator_transcribed' | 'wsda_list_annotation';
export type RestrictionDocType =
  | 'product_label'
  | 'omri_listing'
  | 'wsda_listing'
  | 'certifier_letter'
  | 'other';

export interface RestrictionStatement {
  id: number;
  material_kind: RestrictionMaterialKind;
  material_id: number;
  material_name: string;
  restriction_source: RestrictionSource;
  restriction_text: string;
  citation: string;
  source_type: RestrictionDocType | '';
  source_identifier: string;
  source_locator: string;
  source_reference: string;
  attachment: number | null;
  how_met: string;
  stated_by_name: string;
  stated_at: string | null;
  plan_version: number | null;
  plan_id: number;
  supersedes: number | null;
  superseded_at: string | null;
  withdrawn_at?: string | null;
  withdrawal_reason?: string;
  withdrawn_by_name?: string;
  state: 'current' | 'needs_review' | 'superseded' | 'withdrawn';
  printed: string[];
}

export interface RestrictionMaterial {
  material_kind: RestrictionMaterialKind;
  material_id: number;
  material_name: string;
  regulation_restriction: { key: string; text: string; citation: string } | null;
  /** WSDA's own annotation for the material's WSDA listing; null when WSDA prints NONE or none is held. */
  wsda_list_restriction?: {
    key: string;
    text: string;
    citation: string;
    edition: string | null;
    source_url: string;
  } | null;
  statements: RestrictionStatement[];
  history: RestrictionStatement[];
  /** Current statements on OTHER plan versions: context to restate, never this version's answer. */
  earlier_versions: RestrictionStatement[];
  printed: string;
}

export interface RestrictionStatementInput {
  material_kind: RestrictionMaterialKind;
  material_id: number;
  restriction_source: RestrictionSource;
  restriction_text?: string;
  source_type?: RestrictionDocType;
  source_identifier?: string;
  source_locator?: string;
  source_reference?: string;
  how_met: string;
  supersedes?: number;
}
