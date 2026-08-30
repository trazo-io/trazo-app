/**
 * Business Event Registry.
 *
 * 3 subtypes: CE(Certification), CM(Compliance), IN(Inspection).
 * Heavy on verification/compliance fields. Carbon credits tracking.
 */

import type { BusinessSubtype, EventRegistryEntry, FieldConfig, FieldFormatter } from './registry';
import { formatNumber } from './formatters';

type BusinessData = Record<string, unknown>;

// Enum label maps mirror BusinessTab-SIMPLIFIED.jsx select options and the backend
// BusinessEvent model choices (history/models.py). Keep in sync when choices change.
// These render human-readable labels instead of the resolver's default
// `value.split('_').map(capitalize).join(' ')` which would produce "Organic Usda".
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  certification: 'Certification Achievement',
  verification: 'Third-Party Verification',
  sustainability_audit: 'Sustainability Assessment',
  transparency: 'Transparency Initiative',
  compliance: 'Regulatory Compliance'
};

/**
 * DISPLAY map — deliberately wider than what the form offers.
 *
 * `carbon_neutral` and `sustainable_agriculture` were retired from the picker on 2026-08-27
 * (see BusinessTab-SIMPLIFIED.jsx) but stay here: a farmer who logged one has a
 * § 205.103(b)(2) record, and dropping the label would render the raw slug on their own
 * timeline. Retiring an option is a WRITE-path decision; the read path still has to explain
 * what is already on file.
 */
const CERTIFICATION_TYPE_LABELS: Record<string, string> = {
  organic_usda: 'USDA Organic',
  regenerative: 'Regenerative Organic Certified (ROC)',
  real_organic: 'Real Organic Project (ROP)',
  cng: 'Certified Naturally Grown (CNG)',
  certified_naturally_grown: 'Certified Naturally Grown (CNG)',
  non_gmo: 'Non-GMO Project Verified',
  carbon_neutral: 'Carbon Neutral Certification',
  rainforest_alliance: 'Rainforest Alliance',
  water_stewardship: 'Water Stewardship Certification',
  sustainable_agriculture: 'Sustainable Agriculture Standard',
  global_gap: 'GlobalG.A.P. Certified',
  fair_trade: 'Fair Trade Certified',
  food_safety: 'SQF / Food Safety Certified',
  kosher: 'Kosher Certified'
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Verification',
  verified: 'Verified',
  in_progress: 'Verification In Progress',
  failed: 'Verification Failed',
  not_applicable: 'Not Applicable'
};

const SUSTAINABILITY_PRACTICE_LABELS: Record<string, string> = {
  cover_cropping: 'Cover Cropping Implementation',
  no_till: 'No-Till Farming Adoption',
  integrated_pest: 'Integrated Pest Management',
  water_conservation: 'Water Conservation Measures',
  renewable_energy: 'Renewable Energy Installation',
  composting: 'On-Farm Composting Program',
  biodiversity: 'Biodiversity Conservation',
  soil_health: 'Soil Health Improvement'
};

const makeLabelFormatter =
  (labels: Record<string, string>): FieldFormatter<string> =>
  (value) => {
    if (value == null || value === '') return null;
    const key = String(value).toLowerCase();
    return labels[key] || String(value);
  };

const formatBusinessType = makeLabelFormatter(BUSINESS_TYPE_LABELS);
const formatCertificationType = makeLabelFormatter(CERTIFICATION_TYPE_LABELS);
const formatVerificationStatus = makeLabelFormatter(VERIFICATION_STATUS_LABELS);
const formatSustainabilityPractice = makeLabelFormatter(SUSTAINABILITY_PRACTICE_LABELS);

const BUSINESS_FIELDS: readonly FieldConfig<unknown, BusinessData>[] = [
  {
    name: 'name',
    labelKey: 'events.business.fields.name',
    valueType: 'string',
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      preview: 'hero',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },
  {
    name: 'business_type',
    labelKey: 'events.business.fields.businessType',
    valueType: 'enum',
    formatter: formatBusinessType,
    // NO consumer_card: "Business Activity Type: Certification Achievement" sits directly
    // above "Certification Type: GlobalG.A.P. Certified" — the same fact twice. Live data
    // also rendered the RAW code "CE" here.
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate'
    }
  },
  {
    name: 'certification_type',
    labelKey: 'events.business.fields.certificationType',
    valueType: 'enum',
    formatter: formatCertificationType,
    visibleForSubtypes: ['CE'],
    requiresVerificationBadge: true,
    surfaces: {
      card: 'immediate',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'verified_certifier_name',
    labelKey: 'events.business.fields.certifierName',
    valueType: 'string',
    // 'CE' only until 2026-08-20, so an INSPECTION (IN) hid the issuer even where one is
    // publishable. An inspection is carried out by a body exactly as a certification is.
    //
    // ⚠️ On the CONSUMER surface this stays null unless a USDA Organic Integrity Database match
    // backs it — `public_certifier_name()` in history/serializers.py withholds farmer-typed
    // certifier names deliberately, and that is correct. This widening matters for the producer
    // and modal surfaces; the consumer copy was fixed separately to stop promising the issuer.
    visibleForSubtypes: ['CE', 'IN'],
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'certificate_number',
    labelKey: 'events.business.fields.certificateNumber',
    valueType: 'string',
    // Same reason as verified_certifier_name above: an inspection is carried out against a
    // certificate, and the consumer copy tells the shopper the number is published here.
    visibleForSubtypes: ['CE', 'IN'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      // Promoted to 'immediate' so auditors/consumers see the certificate reference
      // (e.g. CCOF-2012-4287) without expanding Additional Information.
      consumer_card: 'immediate'
    }
  },
  {
    name: 'verification_status',
    labelKey: 'events.business.fields.verificationStatus',
    valueType: 'enum',
    formatter: formatVerificationStatus,
    requiresVerificationBadge: true,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'sustainability_practice',
    labelKey: 'events.business.fields.sustainabilityPractice',
    valueType: 'enum',
    formatter: formatSustainabilityPractice,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    // See weatherEvent.ts for the full rationale: modal surface omitted so
    // the Field Notes top card isn't duplicated in the Detailed Information grid.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: {
      form: 'details',
      consumer_card: 'secondary'
    }
  },
  {
    // ConsumerEventCard already renders `event.performed_by` inline under the
    // event date ("Performed by: Sarah Chen (CCOF Inspector)"), so the registry
    // intentionally omits consumer surfaces here to avoid duplicating the value
    // in Additional Information. Modal still shows it in the details tier.
    name: 'performed_by',
    labelKey: 'events.common.fields.performedBy',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'details' }
  },
  {
    // Farm block / row / section beneath the parcel. Present on CommonEvent, so every event
    // type carries it — and it is already emitted as CA PUR box 22 (Block ID) by
    // pur_export_service.py. It is also where a COG Pro migration lands "Row/Section ID".
    name: 'block_id',
    labelKey: 'events.common.fields.blockId',
    valueType: 'string',
    // Modal only, deliberately. The value DISPLAYS whenever it is set — including when a COG Pro
    // migration lands "Row/Section ID" here — but there is no form input, because this tab has no
    // Field Details section and adding one for a single optional field would bloat the form.
    // Block identity is regulatory for pesticide applications (CA PUR box 22 -> ChemicalEvent)
    // and agronomically meaningful for production/soil/pest work; a weather observation, a
    // business transaction and a general note are not block-scoped in the same way.
    surfaces: { modal: 'details' }
  }
];

export const businessEventRegistry: EventRegistryEntry<BusinessSubtype, BusinessData> = {
  eventType: 7,
  eventTypeName: 'business',
  labelKey: 'events.types.business',
  subtypes: [
    { code: 'CE', labelKey: 'events.business.subtypes.certification', photoTier: 'optional' },
    { code: 'CM', labelKey: 'events.business.subtypes.compliance', photoTier: 'optional' },
    { code: 'IN', labelKey: 'events.business.subtypes.inspection', photoTier: 'optional' }
  ],
  defaultPhotoTier: 'optional',
  fields: BUSINESS_FIELDS
};
