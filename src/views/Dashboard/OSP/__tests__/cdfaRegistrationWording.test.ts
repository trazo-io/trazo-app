import { describe, expect, it } from 'vitest';

import en from '../../../../i18n/lang/en-US.json';
import es from '../../../../i18n/lang/es-419.json';

/**
 * CA Food & Agr. Code § 46013.1(a): every operation producing or handling raw agricultural products
 * sold as organic registers "before the first sale", and an operation under $5,000 is "only exempt
 * from certification under federal organic standards and [is] still required to be registered".
 * The card used to tell growers that only producers selling more than $5,000 a year must register
 * (caught in a browser run, 2026-11-07, after the backend wording was already fixed).
 */
const messages: Record<string, Record<string, string>> = {
  'en-US': en as Record<string, string>,
  'es-419': es as Record<string, string>
};

describe('CDFA registration wording', () => {
  it.each(Object.keys(messages))(
    '%s cites § 46013.1(a) and never ties registration to $5,000',
    (locale) => {
      const description = messages[locale]['osp.cdfa.description'];
      expect(description).toContain('§ 46013.1(a)');
      expect(description).not.toMatch(/more than \$5,000|más de \$5,000/);
    }
  );

  it.each(Object.keys(messages))('%s labels the exempt status as registered', (locale) => {
    expect(messages[locale]['osp.cdfa.status.exempt']).toMatch(/^(Registered|Registrado),/);
  });

  it.each(Object.keys(messages))('%s gives a CDFA-shaped example number (00-000000)', (locale) => {
    expect(messages[locale]['osp.cdfa.registrationNumberPlaceholder']).toMatch(/\b\d{2}-\d{6}\b/);
  });

  // CCOF Contract E2 and OTCO O1 E-2 ask the CDPH number in its own box; the card names the agency so the
  // packet cover prints the number under the right one (2026-11-15).
  it.each(Object.keys(messages))(
    '%s offers CDPH beside CDFA, with a CDPH-shaped example',
    (locale) => {
      expect(messages[locale]['osp.cdfa.title']).toMatch(/CDFA .* CDPH/);
      expect(messages[locale]['osp.cdfa.agency.cdfa']).toMatch(/^CDFA/);
      expect(messages[locale]['osp.cdfa.agency.cdph']).toMatch(/^CDPH/);
      expect(messages[locale]['osp.cdfa.description']).toContain('CDPH');
      expect(messages[locale]['osp.cdfa.registrationNumberPlaceholderCdph']).toMatch(/\b\d{5}\b/);
    }
  );
});
