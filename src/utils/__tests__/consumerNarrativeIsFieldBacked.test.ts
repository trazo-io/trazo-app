/**
 * Gate: a buyer-page sentence that names an act, an amount, a cause or a detail "you can see"
 * appears only when the record holds the field that backs it.
 *
 * WHY (Astra activity-capture audit, 2026-10-26, AC-02..AC-05): the narratives were one fixed
 * sentence per subtype. On a fictional season the buyer preview said a certification logged as
 * IN PROGRESS was "a third-party certification", promised a certificate number the record did
 * not have, said compost "was spread" on a record of the composting PROCESS, said a block was
 * "mown" when it was weeded by hand, and said hail damage "was assessed" with the damage field
 * blank. Every one of those passed the existing gates: the claim-safety sweep looks for banned
 * words, not for sentences the record cannot support.
 *
 * Each case runs twice:
 *   - field EMPTY: the claim must be absent from every generated line;
 *   - field FILLED (where the claim is legitimate at all): the claim must be present, which
 *     proves the empty-case assertion read the sentence it was meant to read.
 * Cases with no `filled` shape are claims no record can back; they must never print.
 */
import { describe, expect, it } from 'vitest';
import { getConsumerEventDescription } from '../eventDescriptions';

interface Case {
  id: string;
  event: Record<string, unknown>;
  claim: RegExp;
  filled?: Record<string, unknown>;
}

const CASES: Case[] = [
  // AC-02 certification / verification
  {
    id: 'AC-02 certificate number promised without one',
    event: { event_type: 7, type: 'CE', business_type: 'certification' },
    claim: /certificate number is published here/i,
    filled: { certificate_number: 'ABC-123' }
  },
  {
    id: 'AC-02 certification read as third-party',
    event: {
      event_type: 7,
      type: 'CE',
      business_type: 'certification',
      verification_status: 'in_progress'
    },
    claim: /third-party certification/i
  },
  {
    id: 'AC-02 review read as completed by an outside body',
    event: {
      event_type: 7,
      type: 'IN',
      business_type: 'verification',
      verification_status: 'in_progress'
    },
    claim: /outside body reviewed/i
  },
  // AC-03 soil
  {
    id: 'AC-03 compost process read as spreading',
    event: {
      event_type: 5,
      soil_management_type: 'CO',
      compost_method: 'windrow',
      compost_initial_cn_ratio: 30
    },
    claim: /compost was spread/i,
    filled: { amendment_amount_numeric: 4 }
  },
  {
    id: 'AC-03 pH adjustment with no material names an amendment',
    event: { event_type: 5, soil_management_type: 'PA' },
    claim: /mineral amendment was applied/i,
    filled: { amendment_type: 'Agricultural lime' }
  },
  {
    id: 'AC-03 pH adjustment promises what and how much',
    event: { event_type: 5, soil_management_type: 'PA', amendment_type: 'Agricultural lime' },
    claim: /what the farm added to this ground, and how much/i,
    filled: { amendment_amount_numeric: 2 }
  },
  {
    id: 'AC-03 pH adjustment with material only denies the material',
    event: { event_type: 5, soil_management_type: 'PA', amendment_type: 'Agricultural lime' },
    claim: /nothing was entered about the material/i
  },
  {
    id: 'AC-03 pH adjustment with amount only denies the amount',
    event: { event_type: 5, soil_management_type: 'PA', amendment_amount_numeric: 2 },
    claim: /no amount was entered|nothing was entered/i
  },
  {
    id: 'AC-02 certification description carries no self-entered status',
    event: {
      event_type: 7,
      type: 'CE',
      business_type: 'certification',
      verification_status: 'verified'
    },
    claim: /verified|third-party auditor/i
  },
  {
    id: 'Fields lifted into extra_data behind a blank flat column still count',
    event: { event_type: 1, production_type: 'MO', type: 'MO', floor_management_type: '' },
    claim: /mowed/i,
    filled: { extra_data: { floor_management_type: 'mow' } }
  },
  // AC-04 orchard floor, weather, emergency
  {
    id: 'AC-04 orchard floor read as mowing',
    event: { event_type: 1, production_type: 'MO', type: 'MO' },
    claim: /mown|mowed/i,
    filled: { floor_management_type: 'mow' }
  },
  ...(['FR', 'HL', 'HT', 'TS', 'HW'] as const).map((code) => ({
    id: `AC-04 weather ${code} asserts a damage or crop check left blank`,
    event: { event_type: 0, type: code, weather_type: code },
    claim: /damage|assessed|checked/i,
    filled: { damage_assessment: 'Marked fruit on the south rows' }
  })),
  {
    id: 'AC-04 emergency response read as cleanup and repair',
    event: { event_type: 3, activity_type: 'emergency' },
    claim: /cleanup|repair/i
  },
  // AC-05 and the extras list
  {
    id: 'AC-05 canopy tying read as leaf removal',
    event: { event_type: 1, production_type: 'CM', type: 'CM', canopy_operation: 'tucking' },
    claim: /leaves .* pulled or hedged/i,
    filled: { canopy_operation: 'leaf_pulling' }
  },
  {
    id: 'AC-05 habitat read as hedgerows and flower strips',
    event: { event_type: 5, soil_management_type: 'HD', habitat_type: 'native_yarrow' },
    claim: /hedgerow|flowering strip/i
  },
  {
    id: 'AC-05 nest boxes read as songbird boxes, perches and bee blocks',
    event: {
      event_type: 5,
      soil_management_type: 'NS',
      habitat_type: 'barn_owl_box',
      habitat_structure_count: 2
    },
    claim: /songbird|raptor|bee block|birds and bees/i
  },
  {
    id: 'AC-05 pollination asserts bloom',
    event: { event_type: 1, production_type: 'PO', type: 'PO' },
    claim: /bloom|honey bee/i
  },
  {
    id: 'AC-05 grazing asserts a cover-crop purpose',
    event: { event_type: 5, soil_management_type: 'GR', grazing_purpose: 'weed_control' },
    claim: /cover crop/i,
    filled: { grazing_purpose: 'cover_crop' }
  },
  {
    id: 'AC-05 irrigation promises a source left unknown',
    event: { event_type: 1, production_type: 'IR', type: 'IR' },
    claim: /where the irrigation water came from/i,
    filled: { water_source: 'well' }
  },
  {
    id: 'AC-05 tillage assumes a seedbed and a pass count',
    event: { event_type: 5, soil_management_type: 'TI' },
    claim: /seedbed|how many passes/i
  },
  {
    id: 'AC-05 fungicide promises a target left blank',
    event: { event_type: 2, chemical_type: 'FU', commercial_name: 'Serenade' },
    claim: /target and the material are on file/i,
    filled: { target_pest_disease: 'Apple scab' }
  },
  {
    id: 'AC-05 pest identification asserts it preceded treatment',
    event: { event_type: 6, pest_management_type: 'PI' },
    claim: /before any decision/i
  },
  {
    id: 'AC-05 internal inspection read as a safety inspection of facilities',
    event: { event_type: 3, activity_type: 'inspection' },
    claim: /safety|facilities/i
  }
];

const BASE = { description: 'Sample event', date: '2026-10-19T16:20:00Z' };

function rendered(event: Record<string, unknown>): string {
  const info = getConsumerEventDescription('Sample event', { ...BASE, ...event } as never);
  return [
    info.shortDescription,
    info.description,
    info.consumerImpact,
    info.sustainabilityBenefit,
    info.consumerMessage
  ]
    .filter(Boolean)
    .join(' | ');
}

describe('buyer narratives say only what the record backs', () => {
  it.each(CASES.map((c) => [c.id, c]))('%s: absent when the field is empty', (_id, c) => {
    const text = rendered((c as Case).event);
    expect(text).not.toMatch((c as Case).claim);
  });

  const backed = CASES.filter((c) => c.filled);
  it.each(backed.map((c) => [c.id, c]))('%s: present once the field is filled', (_id, c) => {
    const { event, filled, claim } = c as Case;
    expect(rendered({ ...event, ...filled })).toMatch(claim);
  });
});
