/**
 * The Parcel Application's transition card states what the records show, never a determination.
 *
 * `is_eligible` from `/transition-status/` is true by ABSENCE of a prohibited record: a parcel
 * with three documented clean years and a parcel with no history at all both return it. The card
 * rendered that as a green "Eligible — 36-month window cleared" badge, the same self-assigned
 * call the packet printed (OSP alignment audit 2026-10, T21). Eligibility under § 205.202(b) is
 * the certifying agent's determination.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';

const KEY = 'parcelApp.transition.status.eligible';
const source = readFileSync(resolve(__dirname, '../ParcelApplicationWizard.tsx'), 'utf8');

describe('transition card badge', () => {
  it('states the record in both locales, not eligibility', () => {
    const en = (enUS as Record<string, string>)[KEY];
    const es = (es419 as Record<string, string>)[KEY];
    expect(en).toBe('No prohibited input on record');
    expect(es).toBe('Sin insumos prohibidos registrados');
    for (const value of [en, es]) {
      expect(value).not.toMatch(/eligib|elegib|cleared|cumplida/i);
    }
  });

  it('does not colour the record as a pass', () => {
    // A green badge over "no record" is the grade moved into the palette.
    const card = source.slice(
      source.indexOf('const TransitionCard'),
      source.indexOf('const BufferEditor')
    );
    expect(card).toContain("variant={eligible ? 'neutral' : 'warning'}");
    expect(card).not.toMatch(/eligible \? 'green\.|eligible \? 'brand'/);
  });
});
