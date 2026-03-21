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
