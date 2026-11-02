/**
 * The wizard's soft flag for a blank question the plan's own agent asks (2026-11-05).
 *
 * The live twin of `blank_asked_questions` in trazo-back `agent_question_refs.py`: showing, blank,
 * not required by Trazo, and in `agent_refs.asked`. A question a `falsy` condition reads is left
 * out, because the plan treats its blank as No. Real definitions from the golden fixture.
 */
import { describe, expect, it } from 'vitest';
import { createIntl, createIntlCache } from 'react-intl';

import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';
import { blankAskedKeys } from '../agentCaption';
import type { AgentRefs, ModuleDefinition, ModuleRegistryResponse } from '../types';
import fixture from './fixtures/module-definitions.json';

const modules = new Map(
  (fixture.registry as ModuleRegistryResponse).modules.map((m) => [m.key, m as ModuleDefinition])
);
const seedlings = modules.get('g3_1_seedlings') as ModuleDefinition;
const materials = modules.get('materials_application') as ModuleDefinition;

const refs = (asked: string[]): AgentRefs => ({ agent: 'WSDA', refs: {}, asked });

describe('blankAskedKeys', () => {
  it('flags a blank question the agent asks that Trazo leaves optional', () => {
    expect(blankAskedKeys(seedlings, {}, refs(['seedlings_description']))).toEqual([
      'seedlings_description'
    ]);
  });

  it('drops it once answered, in either stored shape', () => {
    const asked = refs(['seedlings_description']);
    expect(blankAskedKeys(seedlings, { seedlings_description: 'Pepper starts' }, asked)).toEqual(
      []
    );
    expect(
      blankAskedKeys(seedlings, { seedlings_description: { value: 'Pepper starts' } }, asked)
    ).toEqual([]);
    expect(blankAskedKeys(seedlings, { seedlings_description: '   ' }, asked)).toEqual([
      'seedlings_description'
    ]);
  });

  it('treats No as an answer', () => {
    const asked = refs(['seedlings_sold_as_organic']);
    expect(blankAskedKeys(seedlings, { seedlings_sold_as_organic: false }, asked)).toEqual([]);
  });

  it('skips a question that is not showing', () => {
    const asked = refs(['seedling_facility_certified']);
    expect(blankAskedKeys(seedlings, {}, asked)).toEqual([]);
    expect(blankAskedKeys(seedlings, { seedlings_grown_on_site: 'on_site' }, asked)).toEqual([
      'seedling_facility_certified'
    ]);
  });

  it('never flags an upload or a question Trazo requires', () => {
    expect(blankAskedKeys(seedlings, {}, refs(['seedlings_upload']))).toEqual([]);
    expect(blankAskedKeys(materials, {}, refs(['materials_list_complete']))).toEqual([]);
  });

  it('never flags a "none used" tick, whose blank the plan reads as No', () => {
    const asked = refs(['no_materials_used', 'fertilizers_none_used']);
    expect(blankAskedKeys(materials, {}, asked)).toEqual([]);
  });

  it('is empty with no agent register, and for a module attested not applicable', () => {
    expect(blankAskedKeys(seedlings, {}, null)).toEqual([]);
    expect(blankAskedKeys(seedlings, {}, { agent: 'WSDA', refs: {} })).toEqual([]);
    if (seedlings.allows_not_applicable) {
      expect(blankAskedKeys(seedlings, {}, refs(['seedlings_description']), true)).toEqual([]);
    }
  });
});

describe('the flag wording', () => {
  const cache = createIntlCache();
  const intlEn = createIntl({ locale: 'en-US', messages: en as Record<string, string> }, cache);
  const intlEs = createIntl({ locale: 'es-419', messages: es as Record<string, string> }, cache);

  it('counts in words and never says the answer is required', () => {
    const one = intlEn.formatMessage(
      { id: 'osp.wizard.agentAskedBlankTitle' },
      { agent: 'WSDA', count: 1 }
    );
    expect(one).toBe('WSDA asks 1 question on this page that is still blank.');
    const two = intlEn.formatMessage(
      { id: 'osp.modules.agentAsksBlank' },
      { agent: 'CCOF', count: 2 }
    );
    expect(two).toBe('CCOF asks 2 questions here that are still blank.');
    expect(intlEn.formatMessage({ id: 'osp.wizard.agentAskedBlankBody' }, { count: 2 })).toContain(
      'Trazo does not require them'
    );
  });

  it('reads in Spanish', () => {
    expect(
      intlEs.formatMessage({ id: 'osp.modules.agentAsksBlank' }, { agent: 'OTCO', count: 3 })
    ).toBe('Aquí hay 3 preguntas sin responder que OTCO hace.');
  });
});
