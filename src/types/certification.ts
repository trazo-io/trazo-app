export type CertificationType =
  | 'usda_organic'
  | 'ccof'
  | 'cng'
  | 'real_organic_project'
  | 'roc'
  | 'non_gmo_project'
  | 'global_gap'
  | 'fair_trade'
  | 'rainforest_alliance'
  | 'sqf'
  | 'kosher'
  | 'other';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'self_reported'
  | 'not_found'
  | 'expired'
  | 'revoked'
  | 'suspended';

export interface Certification {
  id: number;
  public_id: string;
  certification_type: CertificationType;
  certification_type_display: string;
  certification_number?: string;
  certifier_name?: string;
  effective_date?: string;
  expiry_date?: string;
  certification_scope?: string;
  certified_items: string[];
  verification_status: VerificationStatus;
  verification_status_display: string;
  last_verified_at?: string;
  verification_source?: string;
  verification_source_url?: string;
  verification_notes?: string;
  usda_operation_name?: string;
  notes?: string;
  document_url?: string;
  is_active: boolean;
  consumer_display_status: string;
  created_at: string;
  updated_at: string;
}

export interface ConsumerCertification {
  display_name: string;
  certifier_name?: string;
  status: string; // 'verified_via_database' | 'self_reported' | 'inactive' | 'pending'
  effective_date?: string;
  expiry_date?: string;
  verification_source_url?: string;
}

export interface CreateCertificationData {
  certification_type: CertificationType;
  certification_number?: string;
  certifier_name?: string;
  usda_operation_name?: string;
  effective_date?: string;
  expiry_date?: string;
  notes?: string;
}

// Sprint 5A — Consumer QR organic claim gate (7 CFR 205.100(c)(1), 205.300,
// 205.202(b); 16 CFR 260.6(c)-(d)). Returned under
// `standard_view.organic_claim` from the public transparency endpoint.
export type OrganicClaimStatus =
  | 'certified_organic'
  | 'transitioning'
  | 'self_reported'
  | 'conventional';

export type OrganicClaimColor = 'green' | 'yellow' | 'gray';

export interface OrganicClaim {
  can_display_organic: boolean;
  can_display_transitioning: boolean;
  display_label: string;
  disclaimer: string;
  status: OrganicClaimStatus;
  status_color: OrganicClaimColor;
  reason: string;
  transition_complete_date: string | null;
  days_remaining: number | null;
}
