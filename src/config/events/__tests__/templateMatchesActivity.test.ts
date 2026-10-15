/**
 * A template fills fields for the activity already chosen. It never changes the activity.
 *
 * Run 8b R4 (Astra, 2026-10-14). On an Equipment cleanout record, "Use a template" offered every
 * production template, and picking "Harvest" merged `type: 'HA'` into the form while the heading
 * still said cleanout, the cleanout preset (`equipment_operation_type: 'CL'`) stayed, and the
 * note typed under the "certifier-only" notice was saved on a subtype the buyer page shows.
 *
 * Compatibility is the ACTIVITY, not only the subtype: same event type, the record's subtype
 * already answered and equal to the template's, and every identity preset a template carries
 * equal to the activity's (Cleanout = EM + 'CL', so the Maintenance template, EM + 'MN', is not
 * a cleanout template). The picker and the apply step use the same helper.
 */
import { describe, expect, it } from 'vitest';

import { ACTIVITY_VERBS, verbForEvent, type ActivityVerb } from '../../activityVerbs';
import {
  DISCRIMINATING_PRESET_FIELDS,
  TEMPLATE_ACCELERATORS,
  applyTemplateToForm,
  isTemplateCompatible,
  templatePrefillValues,
  templatesForActivity,
  type TemplateAccelerator
} from '../templateAccelerators';

/** EQUIPMENT_OPERATION_TYPE in trazo-back/common/field_registry.py. */
const BACKEND_OPERATION_CODES = ['FC', 'MN', 'RE', 'CA', 'BD', 'EI', 'CL'];

const byId = (id: string): TemplateAccelerator => {
  const tpl = TEMPLATE_ACCELERATORS.find((t) => t.id === id);
  if (!tpl) throw new Error(`no template ${id}`);
  return tpl;
};

/** The form a verb tile (and, for a family, each of its subtype answers) leaves behind. */
const formsForVerb = (verb: ActivityVerb): Array<Record<string, unknown>> => {
  const codes = verb.subtypeChoices?.length
    ? verb.subtypeChoices
    : verb.subtype
    ? [verb.subtype]
    : [];
  return codes.map((code) => ({ type: code, ...(verb.presetFields || {}) }));
};

// Production and chemical: the two families whose subtype is asked in step 0.
const HOISTED_VERBS = ACTIVITY_VERBS.filter((v) => v.eventType === 1 || v.eventType === 2);

describe('the picker offers only templates for the activity in force', () => {
  it('drives every production and chemical verb (anti-vacuity)', () => {
    expect(HOISTED_VERBS.map((v) => v.key)).toEqual(
      expect.arrayContaining(['cleanout', 'harvest', 'input_application', 'transport'])
    );
  });

  it.each(HOISTED_VERBS.map((v) => [v.key, v] as const))('%s', (_key, verb) => {
    for (const formData of formsForVerb(verb)) {
      const offered = templatesForActivity({ eventType: verb.eventType, formData, verb });
      for (const tpl of offered) {
        expect(tpl.backendEventType, `${verb.key}/${formData.type} offered ${tpl.id}`).toBe(
          verb.eventType
        );
        expect(tpl.subtype, `${verb.key}/${formData.type} offered ${tpl.id}`).toBe(formData.type);
        const prefill = templatePrefillValues(tpl);
        for (const field of DISCRIMINATING_PRESET_FIELDS) {
          if (field in prefill) {
            expect(prefill[field], `${verb.key} offered ${tpl.id} with another ${field}`).toBe(
              formData[field]
            );
          }
        }
      }
    }
  });

  it('cleanout offers no harvest and no maintenance template', () => {
    const cleanout = ACTIVITY_VERBS.find((v) => v.key === 'cleanout')!;
    const offered = templatesForActivity({
      eventType: 1,
      formData: { type: 'EM', equipment_operation_type: 'CL' },
      verb: cleanout
    }).map((t) => t.id);
    expect(offered).not.toContain('harvest');
    expect(offered).not.toContain('equipment_maintenance');
    expect(offered).toEqual([]);
  });

  it('harvest offers the harvest template (the filter is not just "offer nothing")', () => {
    const harvest = ACTIVITY_VERBS.find((v) => v.key === 'harvest')!;
    const offered = templatesForActivity({ eventType: 1, formData: { type: 'HA' }, verb: harvest });
    expect(offered.map((t) => t.id)).toEqual(['harvest']);
  });

  it('an unanswered chemical subtype is offered no template: a template does not answer it', () => {
    const input = ACTIVITY_VERBS.find((v) => v.key === 'input_application')!;
    expect(templatesForActivity({ eventType: 2, formData: {}, verb: input })).toEqual([]);
    expect(templatesForActivity({ eventType: 2, formData: { type: '' }, verb: input })).toEqual([]);
  });

  it('a pest-control answer is offered no fertilization template', () => {
    const input = ACTIVITY_VERBS.find((v) => v.key === 'input_application')!;
    const offered = templatesForActivity({ eventType: 2, formData: { type: 'PE' }, verb: input });
    expect(offered.map((t) => t.id)).toEqual(['pest_control']);
  });

  it('the Maintenance template fits an EM record whose operation is maintenance', () => {
    expect(
      isTemplateCompatible(byId('equipment_maintenance'), {
        eventType: 1,
        formData: { type: 'EM', equipment_operation_type: 'MN' }
      })
    ).toBe(true);
    // ...but it does not answer the operation question on an EM record that has none.
    expect(
      isTemplateCompatible(byId('equipment_maintenance'), {
        eventType: 1,
        formData: { type: 'EM' }
      })
    ).toBe(false);
  });
});

describe('applying an incompatible template changes nothing', () => {
  const cleanoutForm = {
    type: 'EM',
    equipment_operation_type: 'CL',
    name: 'Equipment cleanout',
    observation: 'Rinsed the bin trailer after the conventional block.',
    date: '2026-10-14T09:00'
  };
  const cleanout = ACTIVITY_VERBS.find((v) => v.key === 'cleanout')!;

  it.each(TEMPLATE_ACCELERATORS.map((t) => [t.id, t] as const))(
    '%s on a cleanout record',
    (_id, tpl) => {
      const prev = { ...cleanoutForm };
      const next = applyTemplateToForm(prev, tpl, { eventType: 1, verb: cleanout });
      expect(next, `${tpl.id} changed a cleanout record`).toBe(prev);
      expect(next).toEqual(cleanoutForm);
    }
  );

  it('a compatible template keeps the subtype and the activity preset', () => {
    const harvest = ACTIVITY_VERBS.find((v) => v.key === 'harvest')!;
    const prev = { type: 'HA', observation: 'Picked rows 1-4.' };
    const next = applyTemplateToForm(prev, byId('harvest'), { eventType: 1, verb: harvest });
    expect(next.type).toBe('HA');
    expect(next.observation).toBe('Picked rows 1-4.');
  });

  it('a template cannot change a chemical subtype answered in step 0', () => {
    const input = ACTIVITY_VERBS.find((v) => v.key === 'input_application')!;
    const prev = { type: 'PE', commercial_name: 'Entrust SC' };
    for (const tpl of TEMPLATE_ACCELERATORS) {
      const next = applyTemplateToForm(prev, tpl, { eventType: 2, verb: input });
      expect(next.type, `${tpl.id} re-answered the chemical subtype`).toBe('PE');
    }
  });

  it('a plan-item record keeps the subtype its plan item named', () => {
    // The wizard seeds `type` from the plan item and resolves the verb with verbForEvent; a
    // template then fills fields for that subtype only.
    const prev = { type: 'PR' };
    const verb = verbForEvent(1, 'PR');
    for (const tpl of TEMPLATE_ACCELERATORS) {
      const next = applyTemplateToForm(prev, tpl, { eventType: 1, verb });
      expect(next.type, `${tpl.id} changed a plan item's subtype`).toBe('PR');
    }
  });
});

describe('the Equipment maintenance template writes a real operation code', () => {
  it('prefills MN, not the Quick Add word routine_maintenance', () => {
    expect(templatePrefillValues(byId('equipment_maintenance')).equipment_operation_type).toBe(
      'MN'
    );
  });

  it('every template operation code is one the backend accepts', () => {
    for (const tpl of TEMPLATE_ACCELERATORS) {
      const code = templatePrefillValues(tpl).equipment_operation_type;
      if (code !== undefined) expect(BACKEND_OPERATION_CODES, tpl.id).toContain(code);
    }
  });
});
