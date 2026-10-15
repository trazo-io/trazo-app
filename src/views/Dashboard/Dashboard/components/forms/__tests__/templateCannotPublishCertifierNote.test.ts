/**
 * A note typed under "certifier-only" cannot reach the buyer page through a template.
 *
 * Run 8b R4 (Astra, 2026-10-14). Equipment cleanout, transport, buffer use and seed search are
 * withheld WHOLE from every public serializer, and the notes box on those records says so. Until
 * this change, picking a template merged `type: tpl.subtype` into the form, so a cleanout record
 * with a typed note could be saved as Harvest (HA), a subtype the buyer page shows, with the note
 * as its public `observation` and no confirmation.
 *
 * This drives the SAVE PATH, not only form state: each template is applied through the same
 * reducer the wizard's handleTemplateSelect uses, and the result goes through `cleanEventPayload`,
 * the builder the submit handler posts (moved verbatim out of NewEvent so it can run here). The
 * assertion is on the request body.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACTIVITY_VERBS, verbForEvent } from 'config/activityVerbs';
import {
  TEMPLATE_ACCELERATORS,
  applyTemplateToForm,
  templatesForActivity
} from 'config/events/templateAccelerators';
import { cleanEventPayload } from 'utils/cleanEventPayload';
import { CONSUMER_WITHHELD_PRODUCTION_SUBTYPES, isEventOnBuyerPage } from 'utils/consumerDisplay';

const NOTE = 'Rinsed the bin trailer after the conventional block; Jose checked the hopper.';

/** The production verb that lands on each certifier-only subtype, as the wizard resolves it. */
const certifierOnlyActivities = Object.keys(CONSUMER_WITHHELD_PRODUCTION_SUBTYPES).map((code) => {
  const verb = verbForEvent(1, code);
  if (!verb) throw new Error(`no activity tile lands on ${code}`);
  return [verb.key, verb] as const;
});

/** What the submit handler posts for a production record built from `form`. */
const submittedPayload = (form: Record<string, unknown>) =>
  cleanEventPayload(
    { ...form, event_type: 1, parcels: [2], album_images: [], delete_image_ids: [] },
    { activeEventType: 1, isEdit: false, eventTypeConfigName: 'production' }
  );

describe('certifier-only activity + typed note + any template: the posted note stays private', () => {
  it('covers EM cleanout, TP, BU and SS (anti-vacuity)', () => {
    expect(certifierOnlyActivities.map(([key]) => key).sort()).toEqual(
      ['buffer_use', 'cleanout', 'seed_search', 'transport'].sort()
    );
  });

  it.each(certifierOnlyActivities)('%s', (_key, verb) => {
    const form = {
      type: verb.subtype,
      ...(verb.presetFields || {}),
      name: 'Record',
      date: '2026-10-14T09:00',
      observation: NOTE
    };
    // Every template, not only the ones the picker offers: the apply step must refuse on its own.
    for (const tpl of TEMPLATE_ACCELERATORS) {
      const after = applyTemplateToForm(form, tpl, { eventType: 1, verb });
      const payload = submittedPayload(after);
      expect(payload.observation, 'the note is posted (the test reads a real body)').toBe(NOTE);
      expect(
        isEventOnBuyerPage({
          event_type: payload.event_type as number,
          type: payload.type as string
        }),
        `${verb.key} + template "${tpl.id}" posted the certifier-only note on public subtype ` +
          `${String(payload.type)}`
      ).toBe(false);
      expect(payload.type, `${tpl.id} changed the subtype of a ${verb.key} record`).toBe(
        verb.subtype
      );
    }
  });

  it('the picker itself offers nothing that would publish the note', () => {
    for (const [, verb] of certifierOnlyActivities) {
      const form = { type: verb.subtype, ...(verb.presetFields || {}), observation: NOTE };
      for (const tpl of templatesForActivity({ eventType: 1, formData: form, verb })) {
        const payload = submittedPayload(applyTemplateToForm(form, tpl, { eventType: 1, verb }));
        expect(isEventOnBuyerPage({ event_type: 1, type: payload.type as string })).toBe(false);
      }
    }
  });
});

describe('a cleanout record never posts as a harvest after a template', () => {
  const cleanout = ACTIVITY_VERBS.find((v) => v.key === 'cleanout')!;
  const form = { type: 'EM', equipment_operation_type: 'CL', name: 'Equipment cleanout' };

  it.each(TEMPLATE_ACCELERATORS.map((t) => [t.id, t] as const))('%s', (_id, tpl) => {
    const payload = submittedPayload(
      applyTemplateToForm(form, tpl, { eventType: 1, verb: cleanout })
    );
    expect(payload.type).not.toBe('HA');
    expect(payload.type).toBe('EM');
    // The § 205.272 cleaning log is gated on CL; a template must not turn it into maintenance.
    expect(payload.equipment_operation_type).toBe('CL');
  });
});

/**
 * The two functions above are what the wizard runs, not a parallel copy: the submit handler posts
 * `cleanEventPayload(...)`, and handleTemplateSelect refuses with `isTemplateCompatible` and
 * merges with `applyTemplateToForm`. The picker lists `compatibleTemplates`, never the raw
 * per-event-type list.
 */
describe('the wizard runs these functions', () => {
  const wizard = readFileSync(resolve(__dirname, '../NewEvent.jsx'), 'utf8');
  const handler = wizard.slice(
    wizard.indexOf('const handleTemplateSelect'),
    wizard.indexOf('const handleVerbSelect')
  );

  it('posts the body cleanEventPayload builds', () => {
    expect(wizard).toMatch(/cleanEventPayload\(data,/);
    expect(wizard).not.toMatch(/const shouldIncludeField/);
  });

  it('refuses and merges through the shared helpers', () => {
    expect(handler).toMatch(/if \(!isTemplateCompatible\(tpl, templateActivity\)\) return;/);
    expect(handler).toMatch(/applyTemplateToForm\(prev, tpl,/);
    expect(handler).not.toMatch(/templatePrefillValues/);
  });

  it('lists only compatible templates', () => {
    expect(wizard).not.toMatch(/templatesForEventType\(/);
    expect(wizard.match(/compatibleTemplates\.(length|map)/g)?.length).toBe(2);
  });
});
