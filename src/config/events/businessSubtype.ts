/**
 * D3 — business activity → BusinessEvent.type (the stored subtype).
 *
 * `BusinessEvent.type` defaults to CE and BusinessTab never set it, so EVERY business event —
 * an inspection, a compliance filing, a carbon-credit transaction — was stored and displayed as
 * a Certification Event. That is a factual mislabel on the audit PDF and on the consumer page,
 * and a fabricated certification is the highest-risk claim class under compliance.md.
 *
 * The stored subtype renders as: CE "Certification Event", CM "Compliance Activity",
 * IN "Inspection Process". The mapping below is chosen so the rendered label is TRUE of the
 * activity — nothing that is not a certification may resolve to CE.
 *
 * Note the deviation from the original plan, which routed carbon_credits and transparency to CE.
 * A carbon-credit transaction and a transparency initiative are not certifications; sending them
 * to CE would have reproduced the very defect being fixed. They resolve to CM, the least-wrong
 * of the three available labels.
 *
 * Shared by BusinessTab (write path) and eventDataNormalizer (preview path) so the preview a
 * farmer approves matches the row that lands in the database.
 */
export const BUSINESS_ACTIVITY_TO_SUBTYPE: Record<string, 'CE' | 'CM' | 'IN'> = {
  certification: 'CE',
  // A third-party verification and a sustainability audit are both someone examining the
  // operation; "Inspection Process" states that without implying a certificate was issued.
  verification: 'IN',
  sustainability_audit: 'CM',
  compliance: 'CM',
  carbon_credits: 'CM',
  transparency: 'CM'
};

/**
 * Resolve the stored subtype for a business activity. Unknown activities fall back to CM rather
 * than CE: an unrecognised activity is certainly not a certification.
 */
export const resolveBusinessSubtype = (businessType: unknown): 'CE' | 'CM' | 'IN' => {
  if (typeof businessType !== 'string' || !businessType) return 'CM';
  return BUSINESS_ACTIVITY_TO_SUBTYPE[businessType] ?? 'CM';
};
