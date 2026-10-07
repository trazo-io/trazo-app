/**
 * The plan's status chip states what the operation recorded, never a verdict.
 *
 * Recordkeeping review F-22 (2026-10-07): an active plan's chip read "Active / Approved" with no
 * date and no agent. It now says whether an approval is recorded, and when.
 */
import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';

import en from '../../../../i18n/lang/en-US.json';
import es from '../../../../i18n/lang/es-419.json';
import { ospStatusLabel } from '../ospStatusLabel';

const intlFor = (locale: 'en-US' | 'es-419') =>
  createIntl({ locale, messages: (locale === 'en-US' ? en : es) as Record<string, string> });

describe('ospStatusLabel', () => {
  it('names the recorded approval date on an active plan', () => {
    expect(
      ospStatusLabel(intlFor('en-US'), { status: 'active', approved_at: '2026-08-21T10:00:00Z' })
    ).toBe('Active (approval recorded 2026-08-21)');
    expect(
      ospStatusLabel(intlFor('es-419'), { status: 'active', approved_at: '2026-08-21T10:00:00Z' })
    ).toBe('Activo (aprobación registrada el 2026-08-21)');
  });

  it('says the approval is not recorded when it is not', () => {
    expect(ospStatusLabel(intlFor('en-US'), { status: 'active', approved_at: null })).toBe(
      'Active (approval not recorded)'
    );
  });

  it('never prints the retired verdict wording', () => {
    for (const locale of ['en-US', 'es-419'] as const) {
      const label = ospStatusLabel(intlFor(locale), { status: 'active', approved_at: null });
      expect(label).not.toMatch(/\/ Approved|\/ Aprobado/);
    }
    expect(ospStatusLabel(intlFor('en-US'), { status: 'draft' })).toBe('Draft');
  });
});
