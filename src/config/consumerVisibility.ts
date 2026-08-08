/**
 * Which establishment (farm) fields a SHOPPER actually sees on the consumer QR page.
 *
 * Producer surfaces use this to mark a row as publicly visible, so a farmer editing
 * their farm profile can tell at a glance which facts leave the building.
 *
 * TWO FILTERS, BOTH REQUIRED. A field counts as visible only if it clears both:
 *   1. `trazo-back/history/transparency_views.py` (the `farmer` block, ~L406-543)
 *      puts it on the wire, and
 *   2. `src/views/Scan/ProductDetail/components/FarmModal.tsx` (or CompanyFarmInfo.tsx)
 *      actually renders it.
 *
 * On-the-wire alone is NOT the bar. `climate_zone`, `conservation_practices`,
 * `employee_count` and `is_active` all ship in the payload and are drawn nowhere
 * (see CONSUMER_WIRE_ONLY_FARM_FIELDS). A marker that meant "on the wire" would tell
 * a farmer their employee count is on a shopper's phone, which is false — and a
 * disclosure that overstates is as wrong as one that understates.
 *
 * This file MIRRORS the backend; it does not control it. If you change either source,
 * change this and re-run `consumerVisibility.test.ts`, which greps the Python back.
 */

/**
 * Published to the anonymous QR payload AND rendered to a shopper.
 * Dotted keys are company-level fields nested under the farm block.
 */
export const CONSUMER_VISIBLE_FARM_FIELDS: ReadonlySet<string> = new Set([
  // Identity
  'name',
  'description',
  'about',
  'main_activities',
  'location_highlights',
  'custom_message',
  // Coarse location only — city/state, never the street or the pin
  'city',
  'state',
  'country',
  'zone',
  'location',
  // Agriculture
  'crops_grown',
  'total_acreage',
  'year_established',
  'establishment_type',
  'certifications',
  'water_sources',
  'soil_types',
  'irrigation_methods',
  // Company
  'company.name',
  'company.description',
  'company.website',
  'company.facebook',
  'company.instagram',
  'company.logo'
]);

/**
 * Hard-nulled by the backend before the payload leaves. Each entry has a reason
 * recorded at its `"<field>": None,` line in transparency_views.py:
 *   - location PII (2026-06 P1): address, latitude, longitude, zip_code
 *   - named-person / contact PII (2026-06 P2-6): contact_*, email, phone
 *   - claim safety: farming_method is a free-text self-declared label
 *     ("Sustainable", "Regenerative Agriculture"). Publishing it is an FTC
 *     16 CFR 260.6 general-benefit claim and an EU ECGT 2024/825 self-created
 *     label. Organic status must come from the Certification table instead.
 *   - never public: the OFPP and split-operation attestations are certifier material
 */
export const CONSUMER_WITHHELD_FARM_FIELDS: ReadonlySet<string> = new Set([
  'address',
  'latitude',
  'longitude',
  'zip_code',
  'contact_person',
  'contact_phone',
  'contact_email',
  'email',
  'phone',
  'farming_method',
  'fraud_prevention_plan_uploaded',
  'fraud_prevention_plan_date',
  'fraud_prevention_plan_document',
  'ofpp_responsible_person',
  'has_split_operation',
  'split_operation_plan'
]);

/**
 * Fields that are on the anonymous wire but rendered by nothing — payload bloat, and a
 * latent leak the day someone adds a render without re-reading the privacy rules.
 *
 * EMPTY, and that is the correct state. `climate_zone`, `conservation_practices`,
 * `employee_count` and `is_active` used to live here; all four were deleted from
 * `transparency_views.py` on 2026-08-07, so they are no longer published at all and
 * listing them here would claim they still ship.
 *
 * Add a field here only while it is genuinely on the wire and unrendered. The guard in
 * `consumerVisibility.test.ts` asserts nothing in this set is referenced by FarmModal, so a
 * new entry fails the moment someone renders it — at which point it belongs in
 * CONSUMER_VISIBLE_FARM_FIELDS (or the render should be dropped).
 */
export const CONSUMER_WIRE_ONLY_FARM_FIELDS: ReadonlySet<string> = new Set([]);

/** True when a shopper scanning a QR code from this farm actually sees the field. */
export const isConsumerVisible = (field: string): boolean =>
  CONSUMER_VISIBLE_FARM_FIELDS.has(field);
