/**
 * The reader that decides whether a farmer ever learns WHY a save failed.
 *
 * The bug this exists to stop: OSPModuleWizard read `err.data.missing` and nothing
 * else, so a 400 that carried its explanation under `status` — DRF's shape for
 * `raise ValidationError({"status": "..."})` — rendered as a bare "Could not save
 * your answers" with an empty body. Every key the backend actually uses is asserted
 * here, because "the helper exists" is not the same as "the helper reads the key
 * this endpoint sends".
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';

import enUS from '../../i18n/lang/en-US.json';
import es419 from '../../i18n/lang/es-419.json';

import {
  CODED_REFUSALS,
  apiErrorMessage,
  apiErrorStatus,
  codedFieldMessage,
  fieldErrorLine,
  readableFieldName
} from '../apiErrorMessage';

const LOCKED_PLAN =
  'This plan is approved and active, so its answers are locked — it is the record ' +
  'your certifier reviewed.';

describe('apiErrorMessage', () => {
  it('reads the DRF ValidationError dict shape, where the value is a LIST', () => {
    // `raise ValidationError({"status": "..."})` answers {"status": ["..."]}.
    expect(apiErrorMessage({ data: { status: [LOCKED_PLAN] } })).toBe(LOCKED_PLAN);
  });

  it('reads the plain Response shape, where the value is a bare string', () => {
    // `Response({"error": "..."}, status=400)` — the OSP submit/activate guards.
    expect(apiErrorMessage({ data: { error: LOCKED_PLAN } })).toBe(LOCKED_PLAN);
  });

  it.each(['detail', 'non_field_errors', 'error', 'status', 'message'])(
    'reads the conventional non-field key %s',
    (key) => {
      expect(apiErrorMessage({ data: { [key]: 'boom' } })).toBe('boom');
    }
  );

  it('prefers detail over the other non-field keys', () => {
    expect(apiErrorMessage({ data: { status: 'second', detail: 'first' } })).toBe('first');
  });

  it('names the field for a per-field serializer error, in words, never the API key', () => {
    // "This field is required." alone does not say WHICH field; "renewal_date:" is not a word a
    // grower uses (recordkeeping checklist run 2026-11-16, VID-08).
    expect(apiErrorMessage({ data: { renewal_date: ['This field is required.'] } })).toBe(
      'Renewal date: This field is required.'
    );
  });

  it("uses the caller's label for the field when it knows one", () => {
    const labelOf = (f: string) =>
      f === 'manure_harvest_interval' ? 'Intervalo estiércol-cosecha' : null;
    expect(
      apiErrorMessage(
        { data: { manure_harvest_interval: ['Elige 120 días.'], other_field: ['x'] } },
        [],
        labelOf
      )
    ).toBe('Intervalo estiércol-cosecha: Elige 120 días. Other field: x');
  });

  it('joins multiple messages under one key', () => {
    expect(apiErrorMessage({ data: { detail: ['one', 'two'] } })).toBe('one two');
  });

  it('honours skipKeys so the caller can render a key itself', () => {
    // The wizard lists `missing` as question LABELS, so the raw keys must not repeat.
    const payload = { data: { missing: ['q_a'], complete: 'Required questions are unanswered.' } };
    expect(apiErrorMessage(payload, ['missing'])).toBe(
      'Complete: Required questions are unanswered.'
    );
  });

  it('accepts a bare string payload', () => {
    expect(apiErrorMessage({ data: 'Service unavailable' })).toBe('Service unavailable');
  });

  it('returns null — never "[object Object]" — when there is no message to show', () => {
    // RTK Query FETCH_ERROR (offline/CORS) carries no `data`. String(err) here is how
    // OSPView ended up putting "[object Object]" in a toast.
    expect(apiErrorMessage({ status: 'FETCH_ERROR', error: 'Failed to fetch' })).toBeNull();
    expect(apiErrorMessage(undefined)).toBeNull();
    expect(apiErrorMessage({ data: {} })).toBeNull();
    expect(apiErrorMessage({ data: '   ' })).toBeNull();
  });

  it('does not stringify a nested object into the message', () => {
    // A nested dict has no flat sentence in it; returning "[object Object]" would be
    // worse than falling through to the caller's own copy.
    expect(apiErrorMessage({ data: { detail: { nested: 'x' } } })).toBeNull();
  });
});

describe('apiErrorStatus', () => {
  it('returns the HTTP status when the request reached a response', () => {
    expect(apiErrorStatus({ status: 400, data: {} })).toBe(400);
  });

  it('returns null for RTK Query string statuses', () => {
    expect(apiErrorStatus({ status: 'FETCH_ERROR' })).toBeNull();
    expect(apiErrorStatus(undefined)).toBeNull();
  });
});

describe('fieldErrorLine', () => {
  it('says nothing when there is no message', () => {
    expect(fieldErrorLine('notes', '')).toBe('');
  });

  it('never prints a snake_case or dotted key as it is', () => {
    expect(readableFieldName('manure_harvest_interval')).toBe('Manure harvest interval');
    expect(readableFieldName('tank_lines.0.product')).toBe('Tank lines 0 product');
    expect(fieldErrorLine('manure_harvest_interval', 'Too short.')).toBe(
      'Manure harvest interval: Too short.'
    );
  });
});

describe('codedFieldMessage', () => {
  const translate = (id: string, v: Record<string, string>) => `${id}|${v.crop}|${v.days}`;

  it('words a known server code with its values', () => {
    const codes = {
      manure_harvest_interval: { code: 'manure_below_floor', crop: 'Carrots', days: '120' }
    };
    expect(codedFieldMessage(codes, 'manure_harvest_interval', translate)).toBe(
      'apiErrors.manureBelowFloor|Carrots|120'
    );
  });

  it('leaves an unknown code, a missing entry and no codes to the server sentence', () => {
    expect(
      codedFieldMessage(
        { manure_harvest_interval: { code: 'new' } },
        'manure_harvest_interval',
        translate
      )
    ).toBeNull();
    expect(codedFieldMessage({}, 'manure_harvest_interval', translate)).toBeNull();
    expect(codedFieldMessage(undefined, 'manure_harvest_interval', translate)).toBeNull();
  });

  it('is passed over by the field-error reader, which lists only the field', () => {
    const err = {
      data: {
        manure_harvest_interval: ['Carrots: the edible part touches the soil ...'],
        error_codes: { manure_harvest_interval: { code: 'manure_below_floor', crop: 'Carrots' } }
      }
    };
    expect(apiErrorMessage(err)).toBe(
      'Manure harvest interval: Carrots: the edible part touches the soil ...'
    );
  });
});

describe('the coded refusal against the backend that sends it', () => {
  // The server's code and value names, read from the sibling repo: a rename there would leave a
  // fake-translate test green and fail at runtime in react-intl (review of app #438).
  const backend = readFileSync(
    resolve(__dirname, '../../../../trazo-back/history/services/manure_interval.py'),
    'utf8'
  );

  it('maps the code the server sends', () => {
    expect(backend).toMatch(/BELOW_MINIMUM_CODE = "manure_below_floor"/);
  });

  it('formats in both locales with exactly the values the server sends', () => {
    const sent = backend.match(/"code": BELOW_MINIMUM_CODE,([\s\S]*?)\n\s*\}/)?.[1] || '';
    const keys = Array.from(sent.matchAll(/"(\w+)":/g)).map((m) => m[1]);
    expect(keys.sort()).toEqual(['crop', 'days']);
    const values = { crop: 'Carrots', days: '120' };
    for (const [locale, messages] of [
      ['en-US', enUS],
      ['es-419', es419]
    ] as const) {
      const intl = createIntl({ locale, messages: messages as Record<string, string> });
      const text = codedFieldMessage(
        { manure_harvest_interval: { code: 'manure_below_floor', ...values } },
        'manure_harvest_interval',
        (id, v) => intl.formatMessage({ id }, v)
      );
      expect(text).toContain('Carrots');
      expect(text).toContain('120');
      expect(text).not.toMatch(/[{}]/);
    }
  });
});

describe('every coded refusal against the backend that sends it (2026-11-21)', () => {
  // Read from the sibling repo, as above: the code, and the value names each body carries.
  const read = (path: string) =>
    readFileSync(resolve(__dirname, '../../../../trazo-back', path), 'utf8');
  const seasons = read('history/services/season_refusals.py');
  const views = read('history/views.py');
  const manure = read('history/services/manure_interval.py');
  const constant = (source: string, name: string) =>
    source.match(new RegExp(`^${name} = "(\\w+)"`, 'm'))?.[1];

  const sent: Record<string, string[]> = {
    [constant(manure, 'BELOW_MINIMUM_CODE')!]: ['crop', 'days'],
    [constant(manure, 'CROP_BELOW_FLOOR_CODE')!]: ['count', 'crop', 'dates', 'days'],
    [constant(seasons, 'SEASON_CLOSED')!]: ['finish_date'],
    [constant(seasons, 'SEASON_AMBIGUOUS')!]: ['seasons'],
    [constant(seasons, 'NO_OPEN_SEASON')!]: [],
    [constant(seasons, 'SEASON_NOT_ON_PARCEL')!]: []
  };

  it('words exactly the codes the server sends', () => {
    expect(Object.keys(sent).sort()).toEqual(Object.keys(CODED_REFUSALS).sort());
  });

  it('reads the value names where the server writes them', () => {
    expect(seasons).toMatch(/"code": SEASON_CLOSED, "finish_date":/);
    expect(views.match(/SEASON_AMBIGUOUS,\s*seasons=/g)?.length).toBe(2);
    const forCrop = manure.match(/"code": CROP_BELOW_FLOOR_CODE,([\s\S]*?)\n\s*\}/)?.[1] || '';
    expect(
      Array.from(forCrop.matchAll(/"(\w+)":/g))
        .map((m) => m[1])
        .sort()
    ).toEqual(sent.manure_below_floor_for_crop);
  });

  it('formats in both locales with the values sent, dates in the reader’s format', () => {
    const values: Record<string, string> = {
      count: '2',
      crop: 'Carrots',
      dates: '2026-03-01, 2026-03-03',
      days: '120',
      finish_date: '2026-10-01',
      seasons: 'Onions 2026, Onions 2027'
    };
    for (const [locale, messages] of [
      ['en-US', enUS],
      ['es-419', es419]
    ] as const) {
      const intl = createIntl({ locale, messages: messages as Record<string, string> });
      for (const [code, names] of Object.entries(sent)) {
        const text = codedFieldMessage(
          { f: { code, ...Object.fromEntries(names.map((n) => [n, values[n]])) } },
          'f',
          (id, v) => intl.formatMessage({ id }, v),
          (iso) => `[${iso}]`
        );
        expect(text, `${locale} ${code}`).toBeTruthy();
        expect(text, `${locale} ${code}`).not.toMatch(/[{}]/);
        for (const name of names) {
          const shown = CODED_REFUSALS[code].dates?.includes(name)
            ? values[name]
                .split(', ')
                .map((d) => `[${d}]`)
                .join(', ')
            : values[name];
          expect(text, `${locale} ${code} ${name}`).toContain(name === 'count' ? '2' : shown);
        }
      }
    }
  });

  it('says one record and several records in both locales', () => {
    for (const [locale, messages, one, several] of [
      ['en-US', enUS, '(1 record, dated', '(2 records, dated'],
      ['es-419', es419, '(1 registro, con fecha', '(2 registros, con fecha']
    ] as const) {
      const intl = createIntl({ locale, messages: messages as Record<string, string> });
      const say = (count: string) =>
        codedFieldMessage(
          {
            f: {
              code: 'manure_below_floor_for_crop',
              count,
              crop: 'Carrots',
              dates: '2026-03-01',
              days: '120'
            }
          },
          'f',
          (id, v) => intl.formatMessage({ id }, v)
        );
      expect(say('1')).toContain(one);
      expect(say('2')).toContain(several);
    }
  });
});
