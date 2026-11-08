const ROOT_URL = '';

// Authentication and User Information URLs
export const LOGIN_URL = `${ROOT_URL}auth/login/`;
export const SIGNUP_URL = `${ROOT_URL}auth/register/`;
export const LOGOUT_URL = `${ROOT_URL}auth/logout/`;
export const SOCIAL_AUTH_URL = `${ROOT_URL}auth/social/`;
export const VERIFY_EMAIL_URL = `${ROOT_URL}users/verify_email/`;
export const PASSWORD_CHANGE_URL = `${ROOT_URL}auth/password/change/`;
export const PASSWORD_RESET_REQUEST_URL = `${ROOT_URL}users/request_password_reset/`;
export const PASSWORD_RESET_CONFIRM_URL = `${ROOT_URL}users/confirm_password_reset/`;
export const USER_DATA_URL = `${ROOT_URL}users/me/`;

// Company and Farm URLs
export const COMPANY_URL = (companyId?: string | undefined) =>
  companyId ? `${ROOT_URL}companies/${companyId}/` : `${ROOT_URL}companies/`;
export const FARM_URL = (companyId: string, farmId?: string) =>
  farmId
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/`;
export const PARCEL_URL = (companyId: string, farmId: string, parcelId: string | null = null) =>
  parcelId
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/${parcelId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/`;
export const PARCEL_APPLICATION_URL = (companyId: string, farmId: string, parcelId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/${parcelId}/application/`;
export const PARCEL_UPDATE_URL = (companyId: string, farmId: string, parcelId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/${parcelId}/update_parcel/`;
/** Every parcel of one farm with its boundary, for the parcel picker's map (owner side only). */
export const FARM_PARCEL_GEOMETRY_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcel-geometry/`;
export const FARM_PRODUCTS_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/products/`;
export const FARM_HISTORIES_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/histories/`;
export const FARM_CHART_SCANS_VS_SALES_INFO_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/get_charts_data/`;
export const SCANS_BY_FARM_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/scans/list_scans_by_establishment/`;

/** @deprecated Use FARM_URL instead */
export const ESTABLISHMENT_URL = FARM_URL;
/** @deprecated Use FARM_PRODUCTS_URL instead */
export const ESTABLISHMENT_PRODUCTS_URL = FARM_PRODUCTS_URL;
/** @deprecated Use FARM_HISTORIES_URL instead */
export const ESTABLISHMENT_HISTORIES_URL = FARM_HISTORIES_URL;
/** @deprecated Use FARM_CHART_SCANS_VS_SALES_INFO_URL instead */
export const ESTABLISHMENT_CHART_SCANS_VS_SALES_INFO_URL = FARM_CHART_SCANS_VS_SALES_INFO_URL;
/** @deprecated Use SCANS_BY_FARM_URL instead */
export const SCANS_BY_ESTABLISHMENT_URL = SCANS_BY_FARM_URL;
export const PRODUCT_URL = `${ROOT_URL}products/`;

// Review and History URLs
export const LAST_REVIEWS_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/last_reviews/`;
export const PRODUCT_REPUTATION_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/products_reputation/`;
export const PRODUCT_REPUTATION_PERCENTAGE_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/rating_reviews_percentage/`;
export const REVIEW_URL = (reviewId: string) =>
  reviewId ? `${ROOT_URL}reviews/${reviewId}/` : `${ROOT_URL}reviews/`;
export const HISTORY_URL = (historyId: string) =>
  historyId ? `${ROOT_URL}histories/${historyId}/` : `${ROOT_URL}histories/`;
export const PARCEL_HISTORY_URL = (companyId: string, farmId: string, parcelId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/${parcelId}/histories/`;
export const CURRENT_HISTORY = (companyId: string, farmId: string, parcelId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/${parcelId}/current_history/`;
export const FINISH_HISTORY = (companyId: string, farmId: string, parcelId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/${parcelId}/finish_history/`;
export const EVENT_URL = (
  companyId: string,
  farmId: string,
  eventId: string,
  eventType: string | number
) =>
  eventId && eventType !== undefined && eventType !== null && eventType !== ''
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/events/${eventId}/?event_type=${eventType}`
    : eventId
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/events/${eventId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/events/`;

export const EVENT_CREATE_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/events/`;
export const PRODUCTION_URL = (productionId: string) =>
  productionId ? `${ROOT_URL}histories/${productionId}/` : `${ROOT_URL}histories/`;
export const PUBLIC_HISTORY_URL = (historyId: string) =>
  `${ROOT_URL}histories/${historyId}/public_history/`;
export const COMMENT_HISTORY_URL = (scanId: string) => `${ROOT_URL}public_scans/${scanId}/comment/`;
export const UPLOAD_URLS_URL = `${ROOT_URL}upload-urls/`;

// Certification URLs
export const CERTIFICATION_URL = (companyId: string, farmId: string, certificationId?: string) =>
  certificationId
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifications/${certificationId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifications/`;
export const CERTIFICATION_VERIFY_URL = (
  companyId: string,
  farmId: string,
  certificationId: string
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifications/${certificationId}/verify/`;

// Off-farm post-harvest handlers — CCOF G6.1 / 7 CFR 205.272. The huller, dryer, cold store
// or packer a lot is sent to, and the organic certificate that has to travel with it.
export const POST_HARVEST_FACILITY_URL = (
  companyId: string,
  farmId: string,
  facilityId?: string | number
) =>
  facilityId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/post-harvest-facilities/${facilityId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/post-harvest-facilities/`;
// The product rows of the farm's facilities (CCOF G6.1 C2, OTCO C7 7.10-2).
export const FACILITY_PRODUCT_URL = (
  companyId: string,
  farmId: string,
  productId?: string | number
) =>
  productId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/facility-products/${productId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/facility-products/`;
// The farm's own record of its certifier's inspections and the items the agent sent
// (7 CFR 205.662 notices), with the operation's responses and the agent's resolutions.
export const CERTIFIER_INSPECTION_URL = (
  companyId: string,
  farmId: string,
  inspectionId?: string | number
) =>
  inspectionId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifier-inspections/${inspectionId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifier-inspections/`;
export const CERTIFIER_NOTICE_URL = (
  companyId: string,
  farmId: string,
  noticeId?: string | number
) =>
  noticeId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifier-notices/${noticeId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifier-notices/`;
export const POST_HARVEST_FACILITY_VERIFY_URL = (
  companyId: string,
  farmId: string,
  facilityId: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/post-harvest-facilities/${facilityId}/verify/`;
// Seed and planting-stock suppliers and their organic certificates (CCOF G3.0, OTCO C3, WSDA
// 2121-B). Company admins and farm managers only: a supplier list is commercial data.
export const BRAND_OWNER_URL = (companyId: string, farmId: string, ownerId?: string | number) =>
  ownerId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/brand-owners/${ownerId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/brand-owners/`;
// Farm equipment that contacts organic crops (CCOF G6.0 C, OTCO C9 9.1, WSDA 2121 I). Company admins
// and farm managers only, like the other registers the plan reads.
export const PRODUCTION_EQUIPMENT_URL = (
  companyId: string,
  farmId: string,
  itemId?: string | number
) =>
  itemId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/production-equipment/${itemId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/production-equipment/`;
export const SUPPLIER_URL = (companyId: string, farmId: string, supplierId?: string | number) =>
  supplierId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/suppliers/${supplierId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/suppliers/`;
// Which handler ONE production was sent to. Owner-side: the handler's identity is
// supply-chain data and the public production payload deliberately omits it.
export const PRODUCTION_HANDLER_URL = (productionId: string) =>
  `${ROOT_URL}histories/${productionId}/post_harvest_facility/`;

// OSP URLs — Sprint 5A (7 CFR 205.201)
export const OSP_URL = (companyId: string, farmId: string, ospId?: string | number) =>
  ospId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/`;

// CDFA State Organic Program producer registration (CA Food & Ag Code §§ 46000-46029)
export const STATE_ORGANIC_REGISTRATION_URL = (
  companyId: string,
  farmId: string,
  regId?: string | number
) =>
  regId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/state-organic-registrations/${regId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/state-organic-registrations/`;

// Certifier review links — farmer-side management (mint / list / revoke).
// The link a certifier actually opens is anonymous and lives at
// /certifier-review/<token>/, deliberately outside this authenticated namespace.
export const CERTIFIER_LINKS_URL = (companyId: string, farmId: string, linkId?: string | number) =>
  linkId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifier-links/${linkId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifier-links/`;

// Pre-inspection readiness: what a certifier would reject this operation over.
// Same endpoint behind the pre-share warning and the dashboard checklist, so the
// two can never disagree.
export const OPERATION_READINESS_URL = (
  companyId: string,
  farmId: string,
  certificationType = 'organic'
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/certifier-links/readiness/?certification_type=${certificationType}`;

// Landowner / prior-manager affidavit (3-year transition proof, 7 CFR 205.202(b))
export const LANDOWNER_AFFIDAVIT_URL = (
  companyId: string,
  farmId: string,
  affidavitId?: string | number
) =>
  affidavitId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/affidavits/${affidavitId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/affidavits/`;

// Neighbour-signed adjoining-land attestation (USDA form #25, 7 CFR 205.202(c)).
// Separate route from `affidavits/` because it is a different document with a different
// signer: the landowner affidavit is the PRIOR MANAGER, this one is the NEIGHBOUR.
export const ADJOINING_LAND_URL = (
  companyId: string,
  farmId: string,
  affidavitId?: string | number
) =>
  affidavitId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/adjoining-land/${affidavitId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/adjoining-land/`;

export const OSP_SUBMIT_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/submit/`;

// OSP annual continuation filing (7 CFR 205.406(a))
export const OSP_ANNUAL_UPDATE_URL = (
  companyId: string,
  farmId: string,
  updateId?: string | number
) =>
  updateId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osp-annual-updates/${updateId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osp-annual-updates/`;

export const OSP_ACTIVATE_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/activate/`;

export const OSP_NEW_VERSION_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/new-version/`;

// Activity feed — WS-4
export const ACTIVITY_FEED_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/activity-feed/`;

// Background document builds (documents/services/export_jobs.py). POST the collection to
// start one; GET a job by public id to poll it. The finished file is a DMS row — download it
// through DOCUMENT_DOWNLOAD_URL, never through these.
export const EXPORT_JOBS_URL = (companyId: string, farmId: string, jobId?: string) =>
  jobId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/export-jobs/${jobId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/export-jobs/`;

// Documents / DMS — WS-3
export const DOCUMENTS_URL = (companyId: string, farmId: string, docId?: string | number) =>
  docId != null
    ? `${ROOT_URL}companies/${companyId}/establishments/${farmId}/documents/${docId}/`
    : `${ROOT_URL}companies/${companyId}/establishments/${farmId}/documents/`;

// Free raw-records export (record ownership — never plan-gated; 2026-08-25)
export const RECORDS_EXPORT_URL = (companyId: string, farmId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/records-export/`;

export const DOCUMENT_DOWNLOAD_URL = (companyId: string, farmId: string, docId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/documents/${docId}/download/`;

// WS-2.5/2.6 — per-module PDF + renewal packet (anchor downloads: wrap with
// config.getApiUrl(), these are relative like every other builder here)
export const OSP_MODULE_PDF_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number,
  moduleKey: string,
  parcelId?: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/module-pdf/?module=${moduleKey}` +
  (parcelId != null ? `&parcel=${parcelId}` : '');
// `scope: 'changed'` builds the packet with only the module PDFs whose answers changed since the
// prior plan version; the server refuses it when the two versions cannot be compared, so the
// control offers it only when OSP_PACKET_SCOPE_URL says it is available.
export const OSP_PACKET_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number,
  scope?: 'changed'
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/packet/` +
  (scope ? `?scope=${scope}` : '');
export const OSP_PACKET_SCOPE_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/packet-scope/`;
// What to copy onto the certifying agent's own renewal form (404 for an agent without one).
export const OSP_AGENT_FORM_SHEET_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) => `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/agent-form-sheet/`;

// Guided OSP modules — WS-2.4 (questionnaire definitions + per-module answers)
export const OSP_MODULE_DEFINITIONS_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) => `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/module-definitions/`;

export const OSP_MODULES_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/modules/`;

export const OSP_SEEDLING_SUPPLIERS_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) => `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/seedling-suppliers/`;

export const OSP_MODULE_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number,
  moduleKey: string
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/modules/${moduleKey}/`;

export const OSP_ADD_APPROVED_INPUT_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) => `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/add-approved-input/`;

export const OSP_REMOVE_APPROVED_INPUT_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/remove-approved-input/`;

// Operator-authored materials-list rows (CCOF ORGB41 §A–§D, WSDA AGR 2196). The catalog is a
// shortcut onto this list, never the gate — § 205.201(a) makes the producer the plan's author.
export const OSP_PLAN_MATERIALS_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/plan-materials/`;

export const OSP_PLAN_MATERIAL_DETAIL_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number,
  entryId: number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/plan-materials/${entryId}/`;

// The Materials List attachment as editable rows, and the operator's two per-row answers
// (reason for use, in use vs intended). Same reading the generated workbook uses, so the
// editor and the attachment cannot disagree about which cells are blank.
export const OSP_MATERIALS_LIST_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/materials-list/`;

// OSP alignment T18 (Phase 5): what each logged product name IS, decided by the operator.
export const OSP_MATERIAL_IDENTITIES_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/material-identities/`;

// OSP alignment T18 (Phase 5 slice 2b): how each restriction on a plan material is met, as the
// operator states it.
export const OSP_MATERIAL_RESTRICTIONS_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/material-restrictions/`;

export const OSP_MATERIALS_LIST_ANSWER_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/materials-list/answer/`;

// NOP 2615 §3.4 — Notification of Changes (7 CFR 205.400(f)). GET list + POST create.
export const OSP_CHANGE_NOTIFICATIONS_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/change-notifications/`;

// Common OSP § 11 "Records Maintained" (7 CFR 205.103). GET evidence + POST the operator's
// own confirmation. Evidence alone never ticks a box — see services/common_osp_records.py.
export const OSP_RECORD_TYPES_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/record-types/`;

// Common OSP required attachments (Field & Crop Information, Crop/Livestock Product List,
// Materials List, Supplier List). No `workbook` param returns a summary; with it, downloads xlsx.
// Plan review — what the operation's dated records did after this plan's answers were last
// written (ground begun, seasons, § 205.400(f) notices, materials, incidents, unnamed parcels,
// modules not revisited). Read-only; never blocks submission.
export const OSP_REVIEW_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/review/`;

export const OSP_ATTACHMENTS_URL = (companyId: string, farmId: string, ospId: string | number) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/attachments/`;

// NOP input verifier — reused by the OSP Approved Inputs typeahead. Resolves a
// free-text product name to NationalListSubstance and/or OMRIProduct PKs.
export const INPUT_VERIFY_URL = `${ROOT_URL}certifications/verify-input/`;
// The certifier picker's list: agents by Organic Integrity Database spelling, each flagged with
// whether the renewal packet is numbered to that agent's own forms.
export const CERTIFYING_AGENTS_URL = `${ROOT_URL}certifications/certifying-agents/`;

// Dry run of the buyer-page input claim, for a draft the wizard has not saved.
// The chip on the preview card may only ever say what the SERVER decides
// (history/services/claim_authority.may_claim_input_listing) — the client cannot see the OMRI
// or WSDA catalogs, so it cannot know whether a listing claim is earned. POST, because the
// whole draft is the input and there is nothing to address with a URL.
export const INPUT_STATUS_PREVIEW_URL = `${ROOT_URL}input-status-preview/`;

// User URLs
export const USER_URL = (userId: string) =>
  userId ? `${ROOT_URL}users/${userId}/` : `${ROOT_URL}users/`;

// Subscription and Billing URLs
export const PLANS_URL = `${ROOT_URL}subscriptions/plans/`;
export const SUBSCRIPTIONS_URL = (subscriptionId?: string) =>
  subscriptionId
    ? `${ROOT_URL}subscriptions/subscriptions/${subscriptionId}/`
    : `${ROOT_URL}subscriptions/subscriptions/`;
export const SUBSCRIPTION_DASHBOARD_URL = `${ROOT_URL}subscriptions/subscriptions/dashboard/`;
export const ADDONS_URL = `${ROOT_URL}subscriptions/addons/`;
export const PAYMENT_METHODS_URL = `${ROOT_URL}subscriptions/payment-methods/`;
export const INVOICES_URL = `${ROOT_URL}subscriptions/invoices/`;
export const CREATE_CHECKOUT_SESSION_URL = `${ROOT_URL}subscriptions/checkout/create_session/`;
export const COMPLETE_CHECKOUT_URL = `${ROOT_URL}subscriptions/checkout/complete_checkout/`;
