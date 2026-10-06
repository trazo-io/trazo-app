/**
 * Run 8 (R8-08, Astra 2026-10-05): an organic farm's chemical record required a basis (OMRI,
 * WSDA, NOP seal, certifier), so a grower whose input's listing was unknown had to pick one.
 * "Not yet confirmed" is an honest answer: selectable on both input forms and in quick add, and
 * never read as allowed anywhere it is shown.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { ORGANIC_APPROVED_OPTIONS } from '../../eventFieldDefinitions';

const src = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');

describe('"Not yet confirmed" organic basis', () => {
  it('is offered on both input forms and in quick add', () => {
    expect(ORGANIC_APPROVED_OPTIONS.map((o) => o.value)).toContain('unverified');
    for (const form of [
      'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx',
      'views/Dashboard/Dashboard/components/forms/SoilManagementTab.jsx'
    ]) {
      expect(src(form), form).toMatch(/<option value="unverified">/);
    }
    for (const cat of [enUS, es419] as Record<string, string>[]) {
      expect(cat['events.organicApproved.unverified']).toBeTruthy();
      expect(cat['quickAdd.fields.organicApproved.unverified']).toBeTruthy();
    }
  });

  it('never answers "Yes" to a shopper and never earns the organic chip', () => {
    const chem = src('config/events/chemicalEvent.ts');
    const consumer = chem.slice(
      chem.indexOf('CONSUMER_ORGANIC_APPROVED_LABELS'),
      chem.indexOf('formatConsumerOrganicApproved')
    );
    const line = consumer.split('\n').find((l) => /^\s+unverified:/.test(l)) || '';
    expect(line).not.toBe('');
    expect(line).not.toMatch(/'Yes/);
    // Review of app #85: the chip's gate is an EXCLUSION list, so the value must be on it.
    const card = src('components/Events/ConsumerEventCard.tsx');
    const at = card.indexOf("organicStatus !== 'not_applicable'");
    expect(at).toBeGreaterThan(-1);
    const gate = card.slice(card.lastIndexOf('organicStatus &&', at), card.indexOf(';', at));
    expect(gate).toMatch(/organicStatus !== 'unverified'/);
  });

  it('the soil record answers a shopper too, in both languages', () => {
    const fmt = src('config/events/formatters.ts');
    const map = fmt.slice(
      fmt.indexOf('const CONSUMER_ORGANIC_STATUS'),
      fmt.indexOf('};', fmt.indexOf('const CONSUMER_ORGANIC_STATUS'))
    );
    const line = map.split('\n').find((l) => /^\s+unverified:/.test(l)) || '';
    expect(line).toMatch(/Not confirmed by the farm/);
    expect(src('utils/fieldValues.es.ts')).toMatch(/'Not confirmed by the farm': '[^']+'/);
  });
});
