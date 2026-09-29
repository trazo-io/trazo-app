/**
 * Every field this slice declares is one the backend actually serves.
 *
 * WHY. `audio_deleted_at` was added to the model, to the `FieldNote` interface here, and to the
 * component that branches on it, and NOT to `FieldNoteSerializer`. The client read `undefined`
 * forever, so the inbox rendered an audio player for a note whose recording had already been
 * deleted, and pressing it answered 410 and failed silently.
 *
 * ⛔ A COMPONENT TEST CANNOT CATCH THIS. `FieldNotesInbox.test.tsx` supplies `audio_deleted_at` in
 * its own fixture, so the component behaved correctly on data the API never sends. That blindness
 * applies to every field here: the test data is written by whoever forgot the serializer.
 *
 * WHY IT LIVES ON THIS SIDE. The same check exists in
 * `trazo-back/fieldnotes/tests/test_serializer_serves_what_the_client_reads.py`, and it cannot run
 * in backend CI: that job checks out one repo, and the project's rule for cross-repo guards is that
 * they FAIL rather than skip when the sibling is missing, deliberately, because a guard that no-ops
 * in half the checkouts is decorative. Naming it in that allowlist made the job fail on every run.
 *
 * The FRONTEND job does check out `trazo-back` as a sibling, so this direction runs on every CI run.
 * Same parity, the way round the environment allows.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '../../../../..');
const SERIALIZERS = join(REPO_ROOT, 'trazo-back/fieldnotes/serializers.py');
const API_SLICE = join(__dirname, '../fieldNoteApi.ts');

/**
 * Fields the client declares that the server is not expected to send, each with its reason.
 * Anything else missing is the defect this file is about.
 */
const CLIENT_ONLY = new Set([
  // Served under `words`, which resolves to the transcript for a voice note. The names are kept here
  // for documentation; no surface reads them directly.
  'transcript',
  'transcript_language'
]);

/** Property names on this slice's own `FieldNote` interface. */
function declaredFields(): string[] {
  const source = readFileSync(API_SLICE, 'utf8');
  const start = source.indexOf('export interface FieldNote {');
  const body = source.slice(start, source.indexOf('\n}', start));
  return body
    .split('\n')
    .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
    .map((line) => /^\s{2}([A-Za-z_][A-Za-z0-9_]*)\??:/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name));
}

/** The `fields = (...)` tuple on FieldNoteSerializer.Meta. */
function servedFields(): string[] {
  const source = readFileSync(SERIALIZERS, 'utf8');
  const cls = source.indexOf('class FieldNoteSerializer');
  expect(cls, 'FieldNoteSerializer not found; was it renamed?').toBeGreaterThan(-1);
  const fieldsAt = source.indexOf('fields = (', cls);
  const body = source.slice(fieldsAt, source.indexOf(')', fieldsAt));
  return Array.from(body.matchAll(/"([a-z_]+)"/g)).map((m) => m[1]);
}

describe('the field-note API contract matches the serializer', () => {
  it('can see the backend, so the assertions below are not vacuous', () => {
    // A negative assertion has to prove it read something. Without this, a split or moved repo makes
    // every check below pass over an empty set and the guard reports success while checking nothing.
    expect(
      existsSync(SERIALIZERS),
      `trazo-back/fieldnotes/serializers.py not found at ${SERIALIZERS}. This guard needs the ` +
        'sibling checkout; see the worktree layout rules in CLAUDE.md.'
    ).toBe(true);

    const served = servedFields();
    expect(served.length, 'parsed too few serializer fields, the parser is broken').toBeGreaterThan(
      5
    );
    expect(served).toContain('public_id');
    expect(served).toContain('status');
  });

  it('serves every field this slice declares', () => {
    const missing = declaredFields().filter(
      (f) => !servedFields().includes(f) && !CLIENT_ONLY.has(f)
    );

    expect(
      missing,
      `these are read by the client and not sent by the serializer, so they are undefined at ` +
        `runtime and no component test would notice: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('serves the three fields the audio player depends on', () => {
    // Named explicitly: these decide whether a recording can be played at all, and a regression in
    // any of them fails silently in a browser rather than loudly here.
    const served = servedFields();
    for (const field of ['kind', 'status', 'audio_deleted_at']) {
      expect(
        served,
        `the inbox branches on \`${field}\` and the serializer does not send it`
      ).toContain(field);
    }
  });
});
