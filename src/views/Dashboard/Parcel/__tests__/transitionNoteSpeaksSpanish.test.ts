/**
 * The transition card's note in the reader's language (recordkeeping checklist run 2026-11-16,
 * VID-06/VID-07). The server's `note` is an English sentence and printed as such on the Spanish
 * parcel page ("561 day(s) remaining in 36-month transition"); the card now words it from
 * `note_code` and the unclassified / unconfirmed lists, and keeps the sentence for a payload that
 * has no code.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { createIntl } from 'react-intl';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import { transitionNoteLines } from '../TransitionCard';
import { formatAreaWithBothUnits } from 'utils/areaUnits';

const es = createIntl({ locale: 'es-419', messages: es419 as Record<string, string> });
const en = createIntl({ locale: 'en-US', messages: enUS as Record<string, string> });

describe('transitionNoteLines', () => {
  it('says nothing more while the clock runs: the card already shows the days', () => {
    expect(
      transitionNoteLines({ note_code: 'in_transition', note: '561 day(s) remaining' }, es)
    ).toEqual([]);
  });

  it('words the other states in Spanish, with the date in Spanish', () => {
    expect(transitionNoteLines({ note_code: 'none_recorded' }, es)[0]).toMatch(
      /^No hay insumos prohibidos registrados/
    );
    expect(
      transitionNoteLines({ note_code: 'elapsed', last_prohibited_date: '2022-08-12' }, es)[0]
    ).toContain('(12 ago 2022)');
  });

  it('names the unclassified inputs with their dates, and counts the rest', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      date: `2026-10-0${i + 1}`,
      description: `Product ${i + 1} — organic status not recorded`
    }));
    const [line] = transitionNoteLines({ note_code: 'in_transition', unclassified: rows }, en);
    expect(line).toMatch(/^6 input applications inside the 36-month window have no organic status/);
    expect(line).toContain('Product 1 (Oct 1, 2026)');
    expect(line).not.toContain('organic status not recorded (');
    expect(line).toContain('(+1)');
  });

  it('keeps the server sentence when the payload has no code, or one it does not know', () => {
    expect(transitionNoteLines({ note: 'Legacy sentence.' }, es)).toEqual(['Legacy sentence.']);
    expect(transitionNoteLines({ note_code: 'something_new', note: 'Server says.' }, es)).toEqual([
      'Server says.'
    ]);
  });

  it('refetches when the crop history or an affidavit changes (review of app #437)', () => {
    const api = readFileSync(
      resolve(__dirname, '../../../../store/api/parcelApplicationApi.ts'),
      'utf8'
    );
    const start = api.indexOf('getParcelTransitionStatus:');
    const query = api.slice(start, api.indexOf('getParcelApplication:', start));
    expect(query).toContain("'ParcelCropHistory'");
    expect(query).toContain("{ type: 'LandownerAffidavit', id: 'LIST' }");
  });
});

describe('the parcel profile area in the reader’s language (VID-07)', () => {
  it('says hectáreas on a Spanish page and leaves English as it was', () => {
    // 5.0586 ha is the Home Field East parcel: "12.5 acres (5.06 hectares)" in English.
    expect(formatAreaWithBothUnits(5.0586, 'US', 'es-419')).toMatch(/hectáreas\)$/);
    expect(formatAreaWithBothUnits(5.0586, 'US', 'en-US')).toMatch(/hectares\)$/);
    expect(formatAreaWithBothUnits(5.0586, 'US')).toMatch(/hectares\)$/);
  });
});
