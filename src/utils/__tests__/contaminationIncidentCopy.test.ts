/**
 * A contamination incident is never described as the activity it was filed under.
 *
 * WHY (2026-08-31): `GeneralEvent.is_contamination_incident` is the § 205.201(b) disclosure,
 * but the picker it is filed under is an ordinary activity list. A real spray-drift report
 * filed as `emergency` reached the buyer page reading "Responded to emergency conditions with
 * cleanup and damage repair", telling the shopper "Rapid emergency response protects crops and
 * farm infrastructure, ensuring continued quality production", under an ENVIRONMENTAL BENEFIT
 * heading crediting the farm for "resilience against weather events". Storm tidy-up wording
 * over a contamination report, with praise attached.
 *
 * The copy therefore keys off the incident FLAG, not off `activity_type` — an incident can be
 * filed under any activity, and the flag is the only thing that makes it one.
 */
import { describe, expect, it } from 'vitest';

import { generalEventRegistry } from '../../config/events/generalEvent';
import { formatConsumerContaminationIncident } from '../../config/events/formatters';
import { getConsumerEventDescription } from '../eventDescriptions';
import { CONSUMER_DESCRIPTION_ES } from '../eventDescriptions.es';

/** Every activity type the general form offers, so none of them can leak its own copy. */
const ACTIVITY_TYPES = [
  'maintenance',
  'planning',
  'training',
  'documentation',
  'inspection',
  'meeting',
  'community',
  'precision_ag',
  'emergency',
  'other',
  undefined
];

const incidentEvent = (activityType?: string) => ({
  id: 'general_0',
  event_type: 3,
  type: 'general',
  date: '2026-05-02T08:30:00+00:00',
  name: 'Spray drift from neighbouring block',
  activity_type: activityType,
  duration: '3 hours',
  people_involved: 2,
  is_contamination_incident: true,
  contamination_source: 'spray_drift',
  contamination_affected_area: 1.2
});

/**
 * Phrases that read as reassurance or self-praise. None may appear on an incident record: the
 * card states what happened and lets the farmer's own note speak, per FTC 16 CFR 260.6 and
 * `.claude/rules/transparency-first.md`.
 */
const REASSURANCE = [
  /cleanup and damage repair/i,
  /rapid emergency response/i,
  /prompt damage repair/i,
  /resilience against weather/i,
  /ensuring continued quality/i,
  /protects crops and farm infrastructure/i
];

describe('contamination incident copy', () => {
  for (const activityType of ACTIVITY_TYPES) {
    it(`is not described as "${activityType ?? 'unspecified'}" activity`, () => {
      const info = getConsumerEventDescription('', incidentEvent(activityType));
      const prose = [
        info.shortDescription,
        info.description,
        info.consumerImpact,
        info.sustainabilityBenefit
      ]
        .filter(Boolean)
        .join(' | ');

      for (const pattern of REASSURANCE) {
        expect(prose, `incident copy still reads as ${pattern}`).not.toMatch(pattern);
      }
      expect(info.shortDescription).toBe('A contamination incident was recorded for this block');
    });
  }

  it('claims no environmental benefit from an incident', () => {
    // Empty, not reworded: ConsumerEventCard's `isGenericCopy` suppresses the whole
    // ENVIRONMENTAL BENEFIT block on an empty string. There is no benefit to claim here.
    const info = getConsumerEventDescription('', incidentEvent('emergency'));
    expect(info.sustainabilityBenefit).toBe('');
  });

  it('leaves a non-incident general event on its own activity copy', () => {
    const info = getConsumerEventDescription('', {
      id: 'general_1',
      event_type: 3,
      type: 'general',
      date: '2026-05-02T08:30:00+00:00',
      activity_type: 'emergency',
      is_contamination_incident: false
    });
    expect(info.shortDescription).toMatch(/emergency response was recorded/i);
  });

  it('translates the incident copy for es-419', () => {
    // The consumer page is bilingual and `localizeConsumerDescription` is a string-match
    // dictionary, so English copy without an entry silently ships untranslated.
    const info = getConsumerEventDescription('', incidentEvent('emergency'));
    for (const line of [info.shortDescription, info.consumerImpact]) {
      expect(CONSUMER_DESCRIPTION_ES[line as string], `no es-419 entry for: ${line}`).toBeTruthy();
    }
  });

  it('reads the flag the same way the registry gates the rows on it', () => {
    // The flag arrives as a real boolean from the API but as a STRING from form and
    // `extra_data` paths (live rows carry `"is_summary": "false"`). The rows and the wording
    // gate on the SAME flag, so any value they disagree about would put the incident fields
    // under the reassuring activity copy.
    const incidentField = generalEventRegistry.fields.find(
      (f) => f.name === 'is_contamination_incident'
    );
    expect(incidentField?.visibleWhen).toBeTypeOf('function');

    for (const [value, expected] of [
      [true, true],
      ['true', true],
      [false, false],
      // The trap: `Boolean('false')` is true, `'true' === true` is false. Both spellings are
      // wrong in opposite directions, which is why one shared predicate decides.
      ['false', false],
      [undefined, false],
      [null, false]
    ] as [unknown, boolean][]) {
      const event = { ...incidentEvent('emergency'), is_contamination_incident: value };
      const rowsVisible = incidentField!.visibleWhen!(event as never);
      const copySwitched =
        getConsumerEventDescription('', event).shortDescription ===
        'A contamination incident was recorded for this block';

      expect(rowsVisible, `rows for ${JSON.stringify(value)}`).toBe(expected);
      expect(copySwitched, `copy for ${JSON.stringify(value)}`).toBe(expected);
    }
  });

  it('does not point the shopper at a follow-up the payload withholds', () => {
    // `corrective_action_taken` and `certifier_notified` are owner-gated server-side (they name
    // the certifier, the lab and the neighbouring operation), so the incident row must not
    // promise a follow-up the card has no way to show.
    const rendered = formatConsumerContaminationIncident(true, {});
    expect(rendered).toBeTruthy();
    expect(rendered).not.toMatch(/follow-up/i);
  });
});
