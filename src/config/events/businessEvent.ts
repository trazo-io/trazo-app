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
  carbon_credits: 'Carbon Credits Earned',
  compliance: 'Regulatory Compliance'
};

const CERTIFICATION_TYPE_LABELS: Record<string, string> = {
  organic_usda: 'USDA Organic',
  regenerative: 'Regenerative Organic Certified (ROC)',
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
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
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
    visibleForSubtypes: ['CE'],
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
    visibleForSubtypes: ['CE'],
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
    name: 'carbon_credits_earned',
    labelKey: 'events.business.fields.carbonCreditsEarned',
    valueType: 'number',
    carbonRelevant: true,
    formatter: formatNumber,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'carbon_credits_unit',
    labelKey: 'events.business.fields.carbonCreditsUnit',
    valueType: 'enum',
    carbonRelevant: true,
    // Hide the unit when no credits were actually earned. Legacy rows may have
    // a stored default ('tCO2e') from before BusinessTab-SIMPLIFIED stripped
    // it on submit, which otherwise renders an orphan "Carbon Credits Unit"
    // card in Additional Details on certification/compliance/inspection events.
    visibleWhen: (e) => {
      const earned = (e as Record<string, unknown>).carbon_credits_earned;
      const n = typeof earned === 'number' ? earned : parseFloat(String(earned ?? ''));
      return Number.isFinite(n) && n > 0;
    },
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
