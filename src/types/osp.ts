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
  created_at: string;
}

export interface CreateOSPChangeNotificationData {
  change_category: OSPChangeCategory;
  description: string;
  date_notified?: string;
  method?: OSPNotificationMethod;
  documentation_timing?: OSPDocumentationTiming;
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
