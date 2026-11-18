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
import { describe, expect, it } from 'vitest';

import {
  apiErrorMessage,
  apiErrorStatus,
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
