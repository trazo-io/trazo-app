/**
 * The verify-email screen must be able to accept the code the backend actually mails.
 *
 * WHAT WENT WRONG (2026-09-07, found by the pilot rehearsal, not by any test). Chakra's
 * `PinInput` defaults to `type="number"` and SILENTLY DROPS every non-digit keystroke. The
 * backend builds the code from `string.ascii_letters + string.digits`, uppercased — so the
 * six boxes a farmer is told to type into rejected most of what they typed, and the Verify
 * button never enabled. MEASURED on the running page: typing `ABC123` left `1`, `2`, `3`.
 *
 * The odds of a mailed code this screen could accept are (10/36)^6 — about one in two
 * million. It survived because the emailed LINK carries `?code=` and verifies on load, so the
 * failure only appears on the path the screen exists for: typing the code by hand, which is
 * what its own copy instructs and the only route when the link is mangled by a mail client or
 * the person is reading mail on a different device.
 *
 * WHY THIS SHAPE. The defect is a MISMATCH between two repos, so neither side alone can be
 * asserted: a frontend-only test would pin `type="alphanumeric"` without knowing why, and a
 * backend-only test would pin the alphabet without knowing anything reads it. This reads BOTH
 * and fails if they ever disagree again — including the reverse direction, where someone
 * narrows the generator to digits and leaves an input that no longer needs to be alphanumeric.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const SCREEN = resolve(__dirname, '..', 'SignUp', 'ModernVerifyEmail.tsx');
const GENERATOR = resolve(__dirname, '..', '..', '..', '..', '..', 'trazo-back', 'users', 'signals.py');

const screenSource = readFileSync(SCREEN, 'utf8');

describe('verification code entry', () => {
  it('reads the screen (guards the guard)', () => {
    // Without this, every assertion below passes the moment the path goes stale.
    expect(screenSource).toContain('<PinInput');
  });

  it('the code input accepts letters, because the mailed code contains them', () => {
    /*
     * Asserted on the SOURCE rather than a render, deliberately: a render test would have to
     * supply the PinInput itself, and a test that supplies its own input passes forever
     * whatever the screen does. See `.claude/rules/frontend.md`.
     */
    const pinBlock = screenSource.slice(screenSource.indexOf('<PinInput'));
    // A fixed window, NOT `indexOf('>')`: the tag's own props contain arrow functions, so the
    // first `>` in the source is the one inside `(value) =>`. Truncating there passed only
    // because `type` happened to be declared before it — a prop reorder would have made this
    // check start lying while still going green.
    const openingTag = pinBlock.slice(0, pinBlock.indexOf('</PinInput>'));

    expect(openingTag, 'Chakra PinInput defaults to type="number" and drops every letter').toContain(
      'type="alphanumeric"'
    );
    expect(openingTag).not.toContain('type="number"');
  });

  it('the code is uppercased before it is sent, because the server compares it exactly', () => {
    // `verify_email` does `verification.code != code`. The mailed code is uppercase; a
    // lowercase keystroke would otherwise fail against a code the person typed correctly.
    expect(screenSource).toMatch(/setVerificationCode\(\s*value\.toUpperCase\(\)\s*\)/);
    expect(screenSource).toMatch(/code:\s*value\.toUpperCase\(\)/);
  });

  it('submits the value onComplete carries, not the state that may not have caught up', () => {
    /*
     * `onComplete={handleCodeSubmit}` read `verificationCode` out of state, which is set by
     * the same keystroke that fires `onComplete`. That is a race the screen does not need to
     * take when the completed value is handed to it directly.
     */
    expect(screenSource).toMatch(/onComplete=\{\(value\)/);
  });

  it('agrees with the generator in the backend', () => {
    if (!existsSync(GENERATOR)) {
      // Frontend-only checkouts exist; skip rather than fail on a path this repo may not have.
      return;
    }
    const generator = readFileSync(GENERATOR, 'utf8');
    const fn = generator.slice(generator.indexOf('def generate_verification_code'));
    const body = fn.slice(0, fn.indexOf('\n\n'));

    expect(body, 'the generator moved or was renamed').toContain('return');
    // The whole reason the input must be alphanumeric. If this stops being true, the input
    // may be narrowed too — but not before someone reads this test and decides to.
    expect(body).toContain('ascii_letters');
  });

  it('the copy does not call an alphanumeric code "digits"', () => {
    expect(screenSource).not.toContain('6-digit code');
  });
});
