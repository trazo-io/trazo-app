/**
 * A replaced option is shown as the earlier answer and never counts as the current one.
 *
 * CCOF's contract asks for markets exported to "directly or indirectly". G8.0's old
 * "Neither: all product is sold within the United States" was never an answer to the indirect
 * half, so the backend RETIRED it (OSP alignment audit 2026-10, T17). A plan that still holds it
 * must read as unanswered here exactly as it does on the server (the golden fixture pins the
 * evaluator; this pins the wizard's choice handling), or the wizard would offer "complete" on a
 * module the server refuses.
 */

import { describe, expect, it } from 'vitest';

import { effectiveValue, missingRequired } from '../conditionEval';
import { holdsRetiredOption, offeredOptions, toggleCheckbox } from '../optionChoices';
import type { ModuleDefinition, ModuleQuestion, ModuleRegistryResponse } from '../types';
import fixture from './fixtures/module-definitions.json';

const registry = fixture.registry as ModuleRegistryResponse;
const g8 = registry.modules.find((m) => m.key === 'g8_0_record_keeping') as ModuleDefinition;
const trade = g8.pages
  .flatMap((p) => p.questions)
  .find((q) => q.key === 'import_export_activity') as ModuleQuestion;

describe('the retired "Neither" option on G8.0 import/export', () => {
  it('is in the payload, marked retired, beside the options that replace it', () => {
    const byValue = new Map(trade.options.map((o) => [o.value, o]));
    expect(byValue.get('none')?.retired).toBe(true);
    expect(byValue.get('indirect_export')?.retired).toBeUndefined();
    expect(byValue.get('none_no_known_export')?.exclusive).toBe(true);
  });

  it('counts as no answer, alone, and the replacement counts as one', () => {
    expect(effectiveValue(trade, ['none'])).toEqual([]);
    expect(missingRequired(g8, { import_export_activity: ['none'] })).toContain(
      'import_export_activity'
    );
    expect(missingRequired(g8, { import_export_activity: ['none_no_known_export'] })).not.toContain(
      'import_export_activity'
    );
  });

  it('is shown only while it is the stored answer', () => {
    expect(offeredOptions(trade, ['none']).map((o) => o.value)).toContain('none');
    expect(offeredOptions(trade, []).map((o) => o.value)).not.toContain('none');
    expect(holdsRetiredOption(trade, ['none'])).toBe(true);
    expect(holdsRetiredOption(trade, ['indirect_export'])).toBe(false);
  });

  it('is dropped by any new pick', () => {
    expect(toggleCheckbox(trade, ['none'], 'indirect_export')).toEqual(['indirect_export']);
    expect(toggleCheckbox(trade, ['none'], 'none_no_known_export')).toEqual([
      'none_no_known_export'
    ]);
  });
});

/**
 * The first retired RADIO option (2026.11.12). "Yes — Trazo lot IDs" told the certifier Trazo
 * issues the operation's lot numbers and carries them on storage and sales records; it does
 * neither. A scalar answer takes the same path as a list, and these pin that it does.
 */
const lots = g8.pages
  .flatMap((p) => p.questions)
  .find((q) => q.key === 'lot_numbering') as ModuleQuestion;

describe('the retired "Trazo lot IDs" option on G8.0 lot numbering', () => {
  it('is marked retired and no longer claims lot tags or sales records', () => {
    const retired = lots.options.find((o) => o.value === 'trazo_lots');
    expect(retired?.retired).toBe(true);
    expect(retired?.label.en).not.toMatch(/lot tag|sales record/i);
  });

  it('counts as no answer, so the module asks for the numbering again', () => {
    expect(effectiveValue(lots, 'trazo_lots')).toBeNull();
    expect(missingRequired(g8, { lot_numbering: 'trazo_lots' })).toContain('lot_numbering');
    expect(missingRequired(g8, { lot_numbering: 'none' })).not.toContain('lot_numbering');
  });

  it('is shown only while it is the stored answer', () => {
    expect(offeredOptions(lots, 'trazo_lots').map((o) => o.value)).toContain('trazo_lots');
    expect(offeredOptions(lots, null).map((o) => o.value)).toEqual(['own_system', 'none']);
    expect(holdsRetiredOption(lots, 'trazo_lots')).toBe(true);
  });
});
