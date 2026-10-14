/**
 * Readiness sentences say what is on file in Trazo, never what a certifier will decide.
 *
 * Run 8b, finding 8b-01 (2026-10-12): `readinessItem.ofpp.missing.detail` read "SOE 2024 prohibits
 * certification without a valid Organic Fraud Prevention Plan" and `readiness.blockedIntro` read
 * "A certifier will not accept this operation until these are resolved", on a card whose own
 * disclaimer says these are documentation checks, not a compliance decision. Trazo's share gate
 * is Trazo's requirement (decision D3); it is not a certification outcome Trazo can know.
 *
 * Scope: every readiness title, detail, fix and intro in BOTH locales.
 */
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';

const READINESS_PREFIXES = ['readinessItem.', 'readiness.', 'certifierReadiness.'];

const CONCLUSIONS = [
  /prohibits certification/i,
  /prohíbe la certificación/i,
  /will not accept/i,
  /no aceptará/i
];

const readinessEntries = (catalogue: Record<string, string>) =>
  Object.entries(catalogue).filter(([key]) =>
    READINESS_PREFIXES.some((prefix) => key.startsWith(prefix))
  );

describe('readiness wording draws no certification conclusion', () => {
  it.each([
    ['en-US', en as Record<string, string>],
    ['es-419', es as Record<string, string>]
  ])('%s catalogue', (_locale, catalogue) => {
    const entries = readinessEntries(catalogue);
    // A negative assertion must prove it read something.
    expect(entries.length).toBeGreaterThan(50);
    expect(entries.map(([key]) => key)).toContain('readinessItem.ofpp.missing.detail');
    expect(entries.map(([key]) => key)).toContain('readiness.blockedIntro');

    const offenders = entries.filter(([, value]) => CONCLUSIONS.some((re) => re.test(value)));
    expect(offenders).toEqual([]);
  });

  it('frames the three new-farm blockers as records not on file in Trazo', () => {
    for (const code of ['ofpp.missing', 'osp.none', 'records.none']) {
      expect((en as Record<string, string>)[`readinessItem.${code}.title`]).toContain(
        'on file in Trazo'
      );
      expect((es as Record<string, string>)[`readinessItem.${code}.title`]).toContain('archivado');
    }
  });
});
