/**
 * "Carbon neutral" is no longer an option a company can pick as its sustainability commitment
 * (Run 8b F1, 2026-10-14). It is a general environmental benefit claim (FTC 16 CFR 260.4), the
 * exact phrase compliance.md marks unsafe, and Trazo's carbon figure (the operation's own
 * emissions plus the manufacturing of the inputs it buys) cannot back it.
 *
 * Same rule as the business-event certification types retired on 2026-08-27
 * (`certificationTypeParity.test.ts`): retiring is a WRITE-path decision. A company that already
 * stored `carbon_neutral` keeps it. The picker must not offer it to anyone else, must not blank
 * it out for the company that has it (a save would silently rewrite the record), and the label it
 * reads back must not assert neutrality.
 *
 * The stored value reaches no consumer surface: the anonymous transparency payload drops the
 * formatter's `farm_context` and its company block carries no commitment, and the only other
 * payload that serves it (`carbon/public/productions/<id>/complete/`) is owner-only. That half
 * is guarded in trazo-back, `test_consumer_qr_privacy_regression.SustainabilityCommitmentNotPublished`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import {
  RETIRED_SUSTAINABILITY_COMMITMENTS,
  SUSTAINABILITY_COMMITMENTS,
  isKnownSustainabilityCommitment,
  sustainabilityCommitmentOptions
} from '../EditCompanyModal';

const SRC = join(__dirname, '../../../..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('sustainability commitment: carbon_neutral is retired, not remapped', () => {
  it('is not offered to a company that does not already hold it', () => {
    expect(SUSTAINABILITY_COMMITMENTS).not.toContain('carbon_neutral');
    expect(RETIRED_SUSTAINABILITY_COMMITMENTS).toEqual(['carbon_neutral']);
    for (const stored of [undefined, null, '', 'regenerative', 'Carbon Neutral by 2026']) {
      const values = sustainabilityCommitmentOptions(stored).map((o) => o.value);
      expect(values, String(stored)).toEqual(SUSTAINABILITY_COMMITMENTS);
    }
  });

  it('stays selectable-as-stored, and disabled, for the company that holds it', () => {
    const options = sustainabilityCommitmentOptions('carbon_neutral');
    expect(options.filter((o) => o.value === 'carbon_neutral')).toEqual([
      { value: 'carbon_neutral', retired: true }
    ]);
    expect(options.filter((o) => o.retired)).toHaveLength(1);
  });

  it('the picker renders through the helper and disables the retired option', () => {
    const modal = read('views/Dashboard/Settings/EditCompanyModal.tsx');
    const anchor = modal.indexOf("register('sustainability_commitment')");
    expect(anchor, 'the sustainability_commitment select moved').toBeGreaterThan(-1);
    const block = modal.slice(anchor, modal.indexOf('</StandardSelect>', anchor));
    expect(block).toContain('sustainabilityCommitmentOptions(company?.sustainability_commitment)');
    expect(block).toContain('disabled={retired}');
    expect(block).not.toMatch(/value="carbon_neutral"/);
  });

  it('the Settings read-back still labels a stored retired value instead of a raw slug', () => {
    expect(isKnownSustainabilityCommitment('carbon_neutral')).toBe(true);
    expect(isKnownSustainabilityCommitment('Carbon Neutral by 2026')).toBe(false);
  });

  it('no catalogue string asserts carbon neutrality', () => {
    // The one label allowed to mention it names a GOAL that is no longer offered.
    const CLAIM = /carbon[\s-]*neutral|carbono[\s-]*neutr|neutralidad de carbono/i;
    const allowed = 'company.sustainabilityCommitment.carbon_neutral';
    for (const [name, catalogue] of [
      ['en-US', enUS],
      ['es-419', es419]
    ] as const) {
      const hits = Object.entries(catalogue as Record<string, string>)
        .filter(([, value]) => CLAIM.test(value))
        .map(([key]) => key);
      expect(hits, name).toEqual([allowed]);
    }
    expect(enUS[allowed]).toMatch(/goal/i);
    expect(enUS[allowed]).toMatch(/retired/i);
    expect(es419[allowed]).toMatch(/meta/i);
    expect(es419[allowed]).toMatch(/retirada/i);
  });
});
