/**
 * The pre-harvest interval row (back #301) in the reader's language.
 *
 * Review of back #301: a spray logged with no product name used to arrive as an English phrase
 * inside the row's data. The server now sends "" and the card says it had none in the reader's
 * language, and counts picks, never spray-and-pick pairs.
 */
import { describe, expect, it } from 'vitest';
import { createIntl } from 'react-intl';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { seasonRowDetail } from '../seasonRowMessages';

const finding = (product: string) => ({
  detail: 'English packet text',
  row_key: 'pre_harvest_intervals',
  detail_code: 'pre_harvest_intervals.inside',
  params: { count: 1, product, applied: '2026-07-10', picked: '2026-07-11', days: 1, phi: '3' }
});

describe('the pre-harvest interval row', () => {
  it('names the spray in Spanish and says when it had no name', () => {
    const es = createIntl({ locale: 'es-419', messages: es419 as Record<string, string> });
    expect(seasonRowDetail(es, finding('Entrust SC'))).toBe(
      '1 cosecha de esta producción fue antes de que terminara el PHI registrado de una aplicación. La primera: Entrust SC, aplicado el 2026-07-10, cosechado el 2026-07-11, 1 día después (PHI de 3 días).'
    );
    const unnamed = seasonRowDetail(es, finding(''));
    expect(unnamed).toContain('una aplicación sin nombre de producto, aplicado el 2026-07-10');
    expect(unnamed).not.toMatch(/no product name/);
  });

  it('says it in English too', () => {
    const en = createIntl({ locale: 'en-US', messages: enUS as Record<string, string> });
    expect(seasonRowDetail(en, finding(''))).toContain(
      'The first: a spray with no product name, applied'
    );
  });
});
