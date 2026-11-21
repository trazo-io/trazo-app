/**
 * The backend reports an unanswered container or treated-lumber statement as `site_statements` (back #512,
 * 2026-11-21: both are null until answered instead of a default "No"). The header card names every missing key
 * with `parcelApp.missing.<key>`, so the key needs a label in both locales, and section A must own it or the gap
 * shows in the header with no section pointing at it.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import esLA from '../../../../i18n/lang/es-419.json';

describe('the site_statements missing key', () => {
  it('has a label in both locales', () => {
    expect((enUS as Record<string, string>)['parcelApp.missing.site_statements']).toMatch(
      /treated lumber/
    );
    expect((esLA as Record<string, string>)['parcelApp.missing.site_statements']).toMatch(
      /madera tratada/
    );
  });

  it('is owned by section A', () => {
    const source = readFileSync(resolve(__dirname, '..', 'ParcelApplicationWizard.tsx'), 'utf8');
    expect(source).toMatch(/a_location: \['identity', 'site_statements'\]/);
  });
});
