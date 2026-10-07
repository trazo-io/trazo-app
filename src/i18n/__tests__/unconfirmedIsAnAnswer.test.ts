/**
 * "Not yet confirmed" is an answer, never "missing" (recordkeeping review S4, F-08, 2026-10-07).
 *
 * The grower's R8-08 pick stays an open item, but the surfaces that name it say what it is: a
 * basis recorded as not yet confirmed, to confirm with the certifier. The certified-parcel
 * review gained its own kind for it (`unconfirmed_input`), which must exist in both locales or
 * the row prints its key. Red on the old catalogue.
 */
import { describe, expect, it } from 'vitest';

import en from '../lang/en-US.json';
import es from '../lang/es-419.json';

const EN = en as Record<string, string>;
const ES = es as Record<string, string>;

describe('an unconfirmed organic basis is an answer', () => {
  it('the completeness gap says not yet confirmed, not what is missing', () => {
    expect(EN['app.completenessGap.organicBasis']).toMatch(/not yet confirmed/);
    expect(EN['app.completenessGap.organicBasis']).not.toMatch(/What shows/);
    expect(ES['app.completenessGap.organicBasis']).toMatch(/aún no confirmada/);
  });

  it('the certified-parcel review names the unconfirmed input in both languages', () => {
    for (const [name, catalogue] of [
      ['en-US', EN],
      ['es-419', ES]
    ] as const) {
      const value = catalogue['parcelApp.certifiedBranch.review.unconfirmed_input'];
      expect(value, `${name} lacks the key`).toBeTruthy();
      expect(value).toContain('{detail}');
      expect(value).not.toMatch(/not recorded|no está registrada/);
    }
  });
});
