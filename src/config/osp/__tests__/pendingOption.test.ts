/**
 * A "not yet known" option (backend `Option.pending`, 2026-11-20). The answer is kept as given, but the
 * certifier packet keeps the agent's question open and prints a review line under it. Until 2026-11-21 the
 * flag never reached the app, so the wizard showed the choice as an ordinary answer and only the packet said
 * otherwise. These pin the flag in the payload and the wizard's reading of it, which mirrors
 * pending_answer_label() in packet_answers.py.
 */
import { describe, expect, it } from 'vitest';

import { holdsOnlyPendingOptions } from '../optionChoices';
import type { ModuleDefinition, ModuleQuestion, ModuleRegistryResponse } from '../types';
import fixture from './fixtures/module-definitions.json';

const registry = fixture.registry as ModuleRegistryResponse;
const find = (moduleKey: string, questionKey: string): ModuleQuestion => {
  const module = registry.modules.find((m) => m.key === moduleKey) as ModuleDefinition;
  return module.pages
    .flatMap((p) => p.questions)
    .find((q) => q.key === questionKey) as ModuleQuestion;
};

describe('pending options in the module-definitions payload', () => {
  it('marks the five not-yet-known options, and only those', () => {
    const marked = registry.modules.flatMap((m) =>
      m.pages.flatMap((p) =>
        p.questions.flatMap((q) =>
          q.options.filter((o) => o.pending).map((o) => `${m.key}.${q.key}=${o.value}`)
        )
      )
    );
    expect(marked.sort()).toEqual(
      [
        'g3_2_planting_stock.organic_stock_treatments=unknown',
        'g3_2_planting_stock.stock_treatments=unknown',
        'g4_2_natural_resources.irrigation_district_additives=unknown',
        'g5_0_pest.plastic_mulch_material=not_known',
        'g6_4_handling.treated_water_meets_sdwa=not_confirmed'
      ].sort()
    );
  });
});

describe('holdsOnlyPendingOptions', () => {
  const district = find('g4_2_natural_resources', 'irrigation_district_additives');

  it('is true for the not-yet-known answer and false for a real one', () => {
    expect(district.options.some((o) => !o.pending)).toBe(true);
    expect(holdsOnlyPendingOptions(district, 'unknown')).toBe(true);
    const answered = district.options.find((o) => !o.pending)?.value as string;
    expect(holdsOnlyPendingOptions(district, answered)).toBe(false);
  });

  it('is false with no answer, and on a question with no pending option', () => {
    expect(holdsOnlyPendingOptions(district, null)).toBe(false);
    expect(holdsOnlyPendingOptions(district, '')).toBe(false);
    const plain = find('g8_0_record_keeping', 'import_export_activity');
    expect(plain.options.length).toBeGreaterThan(0);
    expect(holdsOnlyPendingOptions(plain, plain.options[0].value)).toBe(false);
  });

  it('reads a list as the backend does: every current option it holds must be pending', () => {
    const question: ModuleQuestion = {
      ...district,
      kind: 'checkbox_group',
      options: [
        { value: 'a', label: { en: 'A', es: 'A' }, exclusive: false },
        {
          value: 'unknown',
          label: { en: 'Not known yet', es: 'Aún no se sabe' },
          exclusive: false,
          pending: true
        },
        { value: 'old', label: { en: 'Old', es: 'Antes' }, exclusive: false, retired: true }
      ]
    };
    expect(holdsOnlyPendingOptions(question, ['unknown'])).toBe(true);
    expect(holdsOnlyPendingOptions(question, ['unknown', 'a'])).toBe(false);
    // A retired option never decides it, as in pending_answer_label (read on the current value).
    expect(holdsOnlyPendingOptions(question, ['unknown', 'old'])).toBe(true);
    expect(holdsOnlyPendingOptions(question, ['old'])).toBe(false);
    // Nothing else is dropped: an empty entry is not a pending option, so the packet calls it answered.
    expect(holdsOnlyPendingOptions(question, ['unknown', ''])).toBe(false);
  });
});
