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
export const PARCEL_UPDATE_URL = (companyId: string, farmId: string, parcelId: string) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/parcels/${parcelId}/update_parcel/`;
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

// NOP 2615 §3.4 — Notification of Changes (7 CFR 205.400(f)). GET list + POST create.
export const OSP_CHANGE_NOTIFICATIONS_URL = (
  companyId: string,
  farmId: string,
  ospId: string | number
) =>
  `${ROOT_URL}companies/${companyId}/establishments/${farmId}/osps/${ospId}/change-notifications/`;

// NOP input verifier — reused by the OSP Approved Inputs typeahead. Resolves a
// free-text product name to NationalListSubstance and/or OMRIProduct PKs.
export const INPUT_VERIFY_URL = `${ROOT_URL}certifications/verify-input/`;

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
