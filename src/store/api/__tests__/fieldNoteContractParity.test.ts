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
const CREW_SLICE = join(__dirname, '../crewSenderApi.ts');

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

/** Property names on a slice's own interface. */
function declaredFields(slice = API_SLICE, name = 'FieldNote'): string[] {
  const source = readFileSync(slice, 'utf8');
  const start = source.indexOf(`export interface ${name} {`);
  const body = source.slice(start, source.indexOf('\n}', start));
  return body
    .split('\n')
    .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
    .map((line) => /^\s{2}([A-Za-z_][A-Za-z0-9_]*)\??:/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name));
}

/** The `fields = (...)` tuple on a serializer's Meta. */
function servedFields(serializer = 'FieldNoteSerializer'): string[] {
  const source = readFileSync(SERIALIZERS, 'utf8');
  const cls = source.indexOf(`class ${serializer}`);
  expect(cls, `${serializer} not found; was it renamed?`).toBeGreaterThan(-1);
  const fieldsAt = source.indexOf('fields = (', cls);
  // COMMENTS STRIPPED BEFORE THE CLOSING PAREN IS LOCATED. `indexOf(')')` found the first one in
  // the file, and a `#` comment between two fields routinely contains a parenthesis, so the tuple
  // was cut short there and every field BELOW the comment was reported as not served. It fires as a
  // false failure rather than a false pass, so nothing slipped through, and it cost a real
  // debugging detour on 2026-09-30 when a comment reading "(the `?status=` filter does that)"
  // landed mid-tuple and the guard blamed three fields that were present all along.
  const withoutComments = source
    .slice(fieldsAt)
    .split('\n')
    .map((line) => line.replace(/#.*$/, ''))
    .join('\n');
  const body = withoutComments.slice(0, withoutComments.indexOf(')'));
  // `[a-z0-9_]`, NOT `[a-z_]`. The original pattern had no digit class, so it silently skipped
  // every field whose name carries one. Found the moment this file was pointed at
  // CrewSenderSerializer: `phone_e164` vanished from the served set and the guard reported the
  // roster's most important field as missing. Nothing on FieldNote has a digit, which is exactly
  // why it went unnoticed there, and why a guard being extended to a second subject is worth more
  // than the second subject alone.
  return Array.from(body.matchAll(/"([a-z0-9_]+)"/g)).map((m) => m[1]);
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

    // THE DECLARED SIDE NEEDS THE SAME GUARD, from review of #47. Only the served side had one, so a
    // reformat of the FieldNote interface that broke this regex (a different indent width, a
    // single-lined declaration) would make `declaredFields()` return [], and `[].filter(...)` is []
    // and passes. That is precisely the vacuous pass this file exists to prevent, moved to the other
    // side of the comparison.
    const declared = declaredFields();
    expect(
      declared.length,
      'parsed too few interface fields, the parser is broken'
    ).toBeGreaterThan(5);
    expect(declared).toContain('public_id');
    expect(declared).toContain('status');
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

/**
 * The same parity, for the crew roster.
 *
 * WHY IT IS HERE NOW. The FieldNote half of this file was written after `audio_deleted_at` was
 * added to the model, to the client interface and to the component, and NOT to the serializer. The
 * crew roster then repeated the shape twice over in one slice: `first_contact_at` was served and
 * read by no surface, and `consented_at` was written on every consenting message and serialized
 * nowhere. So the operator ticked "I told this person", Trazo sent the notice on their behalf, and
 * the one thing the page could not show was whether it had gone out.
 *
 * One direction is checked, deliberately. A field the CLIENT declares and the server does not send
 * is `undefined` at runtime with no error anywhere, which is the failure this file exists for. The
 * reverse (served and not declared) is dead weight, not a defect.
 */
describe('the crew sender API contract matches the serializer', () => {
  it('can see both sides, so the assertion below is not vacuous', () => {
    expect(existsSync(SERIALIZERS), `not found at ${SERIALIZERS}`).toBe(true);

    const served = servedFields('CrewSenderSerializer');
    expect(served.length, 'parsed too few serializer fields; the parser is broken').toBeGreaterThan(
      5
    );
    expect(served).toContain('phone_e164');

    const declared = declaredFields(CREW_SLICE, 'CrewSender');
    expect(
      declared.length,
      'parsed too few interface fields; the parser is broken'
    ).toBeGreaterThan(5);
    expect(declared).toContain('phone_e164');
  });

  it('serves every field the roster slice declares', () => {
    const served = servedFields('CrewSenderSerializer');
    const missing = declaredFields(CREW_SLICE, 'CrewSender').filter((f) => !served.includes(f));

    expect(
      missing,
      `these are read by the roster and not sent by the serializer, so they are undefined at ` +
        `runtime and no component test would notice: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('serves the two fields the notice state is computed from', () => {
    // Named because these decide whether the roster can say the notice went out. Until this slice
    // they were the exact pair that could not be seen: one served and rendered by nothing, one not
    // served at all.
    const served = servedFields('CrewSenderSerializer');
    for (const field of ['first_contact_at', 'consented_at']) {
      expect(
        served,
        `the roster branches on \`${field}\` and the serializer does not send it`
      ).toContain(field);
    }
  });
});
