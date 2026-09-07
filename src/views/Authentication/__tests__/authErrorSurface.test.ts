/**
 * The auth error surface, guarded as a SURFACE rather than per screen.
 *
 * Every defect this file exists to catch was already fixed once, on one screen, and stayed
 * alive on its siblings — six auth pages had drifted into two incompatible hand-rolled error
 * boxes, one of which failed contrast twice, and none of the six announced itself. A test
 * that renders one page proves nothing about the other five, so these read the FOLDER.
 *
 * ⚠️ Every assertion below is paired with an anti-vacuity check. A file walk that silently
 * returns nothing satisfies "no offenders" forever, which is the shape of guard this codebase
 * has already been bitten by (`specimen.py`'s `\b` that could not match `XLWorkbook(`).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import {
  resolveSignInError,
  resolveSignUpError,
  resolveGenericAuthError,
  resolveVerifyEmailError
} from '../authErrors';

const AUTH_DIR = resolve(__dirname, '..');

const screens = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) screens(full, out);
    else if (/\.(tsx|jsx)$/.test(entry)) out.push(full);
  }
  return out;
};

/**
 * Auth screens, PLUS any shared form that owns an auth error state.
 *
 * `components/Forms/ForgotPasswordForm` is the second kind: the producer and consumer
 * forgot-password pages both delegate their whole form to it, so the error surface for two
 * routes lives outside this folder. Hard-coding the folder alone would have quietly stopped
 * covering those two the day the page was refactored to delegate — the same staleness that
 * a hand-typed list of anything in this codebase eventually produces.
 */
const SHARED_FORMS = [
  resolve(AUTH_DIR, '..', '..', 'components', 'Forms', 'ForgotPasswordForm.tsx')
];

const SCREENS = [...screens(AUTH_DIR), ...SHARED_FORMS].map((path) => ({
  path: relative(AUTH_DIR, path),
  source: readFileSync(path, 'utf8')
}));

/**
 * Derived, never listed. A screen that resolves an auth error MUST render the shared alert;
 * anything else means it resolved one and then displayed it some other way.
 */
const USES_MAPPER = /\bresolve(SignUp|SignIn|VerifyEmail|Generic)(Auth)?Error\(/;
const RESOLVERS = SCREENS.filter(({ source }) => USES_MAPPER.test(source));

describe('auth error surface', () => {
  it('walks the Authentication folder (guards the guard)', () => {
    // Without this, every "no offenders" assertion below passes the moment the walk breaks.
    expect(SCREENS.length).toBeGreaterThan(8);
    // The six form-level error surfaces: four auth screens plus the shared forgot-password
    // form, which covers two routes. A count floor rather than a name list, so a refactor
    // that MOVES a surface is allowed and one that DELETES a surface is not.
    // Six: four auth screens, the shared forgot-password form (two routes), and the
    // verify-email screen, joined 2026-09-07 when verification codes gained an expiry and
    // the page had to tell "expired" apart from "wrong" without comparing English.
    expect(RESOLVERS.length).toBeGreaterThanOrEqual(6);
    expect(SCREENS.map((s) => s.path)).toContain('SignUp/AppSignUp.tsx');
    expect(SCREENS.map((s) => s.path)).toContain('../../components/Forms/ForgotPasswordForm.tsx');
  });

  it('no screen hand-rolls a red error box', () => {
    /*
     * `red.600` #E53935 on `red.50` #FFEBEE measured 3.70:1 — 14px text owes 4.5 (WCAG
     * 1.4.3) — and the `red.200` #EF9A9A border measured 1.88:1 where a boundary owes 3.0
     * (1.4.11). Both shipped, on the first screen a farmer meets, in three files. Anything
     * red painted by hand in this folder is that defect coming back; the theme's Alert
     * already pays both floors.
     */
    const offenders = SCREENS.filter(({ source }) =>
      /(bg|backgroundColor)=["{]\s*['"]?red\.\d{2,3}/.test(source)
    ).map(({ path }) => path);

    expect(offenders, 'use <AuthErrorAlert>, which renders StandardAlert').toEqual([]);
  });

  it('every screen that resolves an auth error renders it through AuthErrorAlert', () => {
    const missing = RESOLVERS.filter(({ source }) => !source.includes('<AuthErrorAlert')).map(
      (s) => s.path
    );

    expect(missing, 'resolved the error, then displayed it some other way').toEqual([]);
  });

  it('no screen renders a server sentence directly', () => {
    /*
     * `setError(err.data.detail)` is how untranslated English reached a Spanish-locale
     * farmer. The mapper is the only thing allowed to touch an error body; a screen that
     * reads one is opting itself out of translation again.
     *
     * `err?.data?.error` inside a `new Error(...)` is exempt: `handleSocialAuthError` logs
     * and toasts through the provider SDK and wants the raw reason, not the on-screen line.
     */
    const READS_BODY = /setError\(\s*(err|error)\??\.\s*data/;
    const offenders = SCREENS.filter(({ source }) => READS_BODY.test(source)).map((s) => s.path);

    expect(offenders, 'route it through views/Authentication/authErrors.ts').toEqual([]);
  });

  it('both recovery actions keep a 44px hit area', () => {
    /*
     * MEASURED at 375px before this was set: 17px. Chakra's `variant="link"` Button and a
     * bare Link both collapse to text height, and this is the ONE control a farmer who
     * cannot get past the error has to hit. `.claude/rules/frontend.md` floors touch targets
     * at 44px. Asserting on the SOURCE because the value is a shared constant — a render
     * test that supplies its own props would pass forever whatever the component does.
     */
    const alertSource = readFileSync(join(AUTH_DIR, 'AuthErrorAlert.tsx'), 'utf8');
    const constant = alertSource.match(/const TOUCH_TARGET_MIN = '(\d+)px'/);

    expect(constant, 'TOUCH_TARGET_MIN went missing').not.toBeNull();
    expect(Number(constant![1])).toBeGreaterThanOrEqual(44);
    // Both actions, not just the one that happened to be checked.
    expect(alertSource.match(/minH=\{TOUCH_TARGET_MIN\}/g)?.length).toBe(2);
  });

  it('every message id the mapper can return exists in BOTH locales', () => {
    /*
     * The mapper names ids as string literals, so a typo is invisible until a farmer hits
     * that exact error — and react-intl falls back to printing the ID itself, which reads
     * as a crash. Collected off the source rather than hand-listed, so a new branch is
     * covered the moment it is written.
     */
    const mapperSource = readFileSync(join(AUTH_DIR, 'authErrors.ts'), 'utf8');
    const alertSource = readFileSync(join(AUTH_DIR, 'AuthErrorAlert.tsx'), 'utf8');
    const screenIds = SCREENS.flatMap(({ source }) =>
      [...source.matchAll(/messageId:\s*'([^']+)'/g)].map((m) => m[1])
    );

    const ids = new Set([
      ...[...mapperSource.matchAll(/messageId:\s*'(auth\.[^']+)'/g)].map((m) => m[1]),
      ...[...mapperSource.matchAll(/'(auth\.error\.[^']+)'/g)].map((m) => m[1]),
      ...[...alertSource.matchAll(/id:\s*'(auth\.[^']+)'/g)].map((m) => m[1]),
      ...screenIds
    ]);

    expect(ids.size).toBeGreaterThan(8); // anti-vacuity: the regexes still match something
    expect(ids.has('auth.error.emailExists.unverified')).toBe(true);

    const missingEn = [...ids].filter((id) => !(id in (enUS as Record<string, string>)));
    const missingEs = [...ids].filter((id) => !(id in (es419 as Record<string, string>)));

    expect(missingEn).toEqual([]);
    expect(missingEs).toEqual([]);
  });
});

describe('authErrors mapper', () => {
  it('an unverified duplicate offers the resend, not the sign-in', () => {
    /*
     * The whole point. "Sign in instead" is the WRONG advice here: `is_active` stays False
     * until the emailed code is entered, so sign-in cannot succeed, and following that
     * advice lands on "No active account found with the given credentials".
     */
    const resolution = resolveSignUpError({
      status: 400,
      data: { email: ['…'], code: ['email_exists_unverified'] }
    });

    expect(resolution.messageId).toBe('auth.error.emailExists.unverified');
    expect(resolution.action).toEqual({ kind: 'resendVerification' });
    expect(resolution.fieldsInvalid).toContain('email');
  });

  it('an expired verification code is told apart from a wrong one', () => {
    /*
     * These are the same screen and the same red box, and they need DIFFERENT words: an
     * expired code is deleted server-side on rejection, so retyping it can never work and
     * resend is the only exit. Collapsing them was the pre-TTL behaviour — one message,
     * "Verification code is invalid", for a code that was right and a code that was wrong.
     */
    const expired = resolveVerifyEmailError({
      status: 400,
      data: { error: '…', code: 'verification_code_expired' }
    });
    expect(expired.messageId).toBe('auth.error.verify.expired');
    expect(expired.action).toEqual({ kind: 'resendVerification' });

    const invalid = resolveVerifyEmailError({
      status: 400,
      data: { error: '…', code: 'verification_code_invalid' }
    });
    expect(invalid.messageId).toBe('auth.error.verify.invalid');
    expect(invalid.messageId).not.toBe(expired.messageId);
  });

  it('an unknown verify failure still says something true', () => {
    // DRF wraps a bare string in a list on some paths and not others; both must resolve.
    const listWrapped = resolveVerifyEmailError({
      status: 400,
      data: { code: ['verification_code_expired'] }
    });
    expect(listWrapped.messageId).toBe('auth.error.verify.expired');

    const unknown = resolveVerifyEmailError({ status: 400, data: { error: 'Email is required' } });
    expect(unknown.messageId).toBe('auth.error.passthrough');
    expect(unknown.values?.text).toBe('Email is required');

    const offline = resolveVerifyEmailError({ status: 'FETCH_ERROR' });
    expect(offline.messageId).toBe('auth.error.network');
  });

  it('a verified duplicate offers the sign-in', () => {
    const resolution = resolveSignUpError({
      status: 400,
      data: { email: ['…'], code: ['email_exists_verified'] }
    });

    expect(resolution.messageId).toBe('auth.error.emailExists.verified');
    expect(resolution.action).toEqual({ kind: 'signIn' });
  });

  it('the two duplicate cases do not collapse into one', () => {
    // Anti-vacuity for the pair above: identical handling would satisfy both read alone.
    const unverified = resolveSignUpError({ data: { code: ['email_exists_unverified'] } });
    const verified = resolveSignUpError({ data: { code: ['email_exists_verified'] } });

    expect(unverified.messageId).not.toBe(verified.messageId);
    expect(unverified.action).not.toEqual(verified.action);
  });

  it("SimpleJWT's one-sentence-for-three-situations answer offers the resend", () => {
    const resolution = resolveSignInError({
      status: 401,
      data: { detail: 'No active account found with the given credentials' }
    });

    expect(resolution.messageId).toBe('auth.error.signin.noActiveAccount');
    expect(resolution.action).toEqual({ kind: 'resendVerification' });
  });

  it('unwraps a DRF list AND a bare string with the same reader', () => {
    /*
     * `as_serializer_error` wraps a bare value in a list, but `detail` is not wrapped, so an
     * error body mixes both shapes. Reading `[0]` off a string yields a single CHARACTER —
     * a failure that renders as "A" rather than as an error.
     */
    const fromList = resolveGenericAuthError({ data: { detail: ['Boom'] } }, 'auth.error.server');
    const fromString = resolveGenericAuthError({ data: { detail: 'Boom' } }, 'auth.error.server');

    expect(fromList.values?.text).toBe('Boom');
    expect(fromString.values?.text).toBe('Boom');
  });

  it('falls back by STATUS when there is no body to read', () => {
    expect(resolveSignUpError({ status: 429 }).messageId).toBe('auth.error.rateLimited');
    expect(resolveSignUpError({ status: 503 }).messageId).toBe('auth.error.server');
    expect(resolveSignUpError({ status: 'FETCH_ERROR' }).messageId).toBe('auth.error.network');
    expect(resolveSignUpError(undefined).messageId).toBe('auth.error.signup.generic');
  });

  it('a code the client has not learned yet still says something true', () => {
    // Degrading to a blank box, or to a lie, is worse than degrading to the server's own
    // sentence. This is the ONLY path on which server prose reaches a screen.
    const resolution = resolveSignUpError({
      status: 400,
      data: { email: ['Something new the client has no code for'], code: ['brand_new_code'] }
    });

    expect(resolution.messageId).toBe('auth.error.passthrough');
    expect(resolution.values?.text).toBe('Something new the client has no code for');
  });
});
