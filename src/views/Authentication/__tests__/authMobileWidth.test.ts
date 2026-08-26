/**
 * Guard: the auth cards use the width a phone actually has, and their labels survive es-419.
 *
 * ── 1. The `sm` breakpoint trap ──────────────────────────────────────────────────────
 * This app's `sm` is **320px**, not Chakra's 480 (`theme/foundations/breakpoints.js`), and
 * `.claude/rules/frontend.md` says so in as many words:
 *
 *     Mobile-only (<480px): use `{{ base: 'x', smd: 'y' }}` NOT `{{ base: 'x', sm: 'y' }}`
 *
 * All four quiet-card auth pages wrote `px={{ base: 4, sm: 6 }}` / `px={{ base: 6, sm: 8 }}`
 * meaning "tighter on a phone, roomier above". Because `sm` is 320, the `base` value applied
 * only BELOW 320px — a width no phone in service reports — so every real phone silently took
 * the roomier value and the author's own mobile numbers were dead code.
 *
 * MEASURED at 375px on the sign-in page, before and after:
 *
 *                    page gutter   card padding   chrome/side   content   % of screen
 *     `sm`  (was)         24px          32px          57px        261px       70%
 *     `smd` (now)         16px          24px          41px        293px       78%
 *
 * 32px more room, and it was the difference between "¿Olvidaste tu contraseña?" fitting on one
 * line and wrapping to two beside a 21px checkbox.
 *
 * ⚠️ Scoped to these four files on purpose. There are ~41 more `{ base, sm }` pairs in the tree
 * and they are NOT all wrong — `sm` is a real breakpoint and some call sites mean it. Widening
 * this to a tree-wide ban would be a guard that has to be muted, which is worse than none.
 *
 * ── 2. Labels the translator writes ──────────────────────────────────────────────────
 * A Chakra Button is `white-space: nowrap`. MEASURED at 375px in es-419, "Reenviar el correo de
 * verificación" is 210px against 205px of alert content box, and the alert clipped it —
 * `scrollWidth` 274 vs `clientWidth` 257 — cutting the tail off the ONLY recovery action
 * available to someone who cannot sign in. Same shape as the Parcel Application button: a label
 * whose length is decided at runtime, in a container that hides overflow.
 *
 * ── 3. The forgot-password card ──────────────────────────────────────────────────────
 * It rendered seven hard-coded English strings while `trazo_locale` is `es-419`, had no heading
 * element anywhere on the page, and fired a toast repeating what the card already said.
 */
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const AUTH_DIR = resolve(__dirname, '..');
const SRC = resolve(AUTH_DIR, '..', '..');

/** Blank comments, keeping newlines — the notes above quote the props they ban. */
const codeOf = (abs: string) =>
  readFileSync(abs, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

/** The four pages that share the quiet centered card. */
const QUIET_CARD_PAGES = [
  'SignIn/AppSignIn.tsx',
  'SignUp/AppSignUp.tsx',
  'ForgotPassword/ProducerForgotPassword.tsx',
  'ResetPassword/ProducerResetPassword.tsx'
];

describe('auth cards on a phone', () => {
  it('has the pages to check', () => {
    // Renamed or moved, every assertion below passes by scanning nothing.
    for (const rel of QUIET_CARD_PAGES) {
      const code = codeOf(join(AUTH_DIR, rel));
      expect(code.length, `${rel} is empty or missing`).toBeGreaterThan(500);
      // 440px on three of them, 520px on sign-up, which carries more fields — assert the
      // SHAPE (a fixed-width centered card) rather than one page's number.
      expect(code, `${rel} is no longer a fixed-width centered card`).toMatch(/maxW="\d{3}px"/);
    }
  });

  it('never uses `sm` as the mobile stop for a gutter', () => {
    const offenders: { file: string; prop: string }[] = [];
    for (const rel of QUIET_CARD_PAGES) {
      const code = codeOf(join(AUTH_DIR, rel));
      for (const m of code.matchAll(/\b(px|py|p|paddingX|paddingY)=\{\{[^}]*\bsm:[^}]*\}\}/g)) {
        offenders.push({ file: rel, prop: m[0].replace(/\s+/g, ' ') });
      }
    }
    expect(
      offenders,
      "This app's `sm` is 320px, so a `{ base, sm }` gutter gives every real phone the DESKTOP " +
        'value and never the mobile one. Use `smd` (480px). MEASURED at 375px: `sm` left 261px ' +
        `of content (70% of the screen), \`smd\` leaves 293px (78%):\n${JSON.stringify(
          offenders,
          null,
          2
        )}`
    ).toEqual([]);
  });

  it('lets the resend action wrap instead of being clipped', () => {
    const code = codeOf(join(AUTH_DIR, 'AuthErrorAlert.tsx'));
    const i = code.indexOf('auth.error.action.resendVerification');
    expect(i, 'the resend action moved — this would pass vacuously').toBeGreaterThan(-1);
    const decl = code.slice(code.lastIndexOf('<Button', i), i);
    expect(
      decl,
      'a Chakra Button is nowrap and this label is written by the translator — in es-419 it ' +
        'measured 210px against a 205px alert content box and the tail was clipped'
    ).toMatch(/whiteSpace="normal"/);
    expect(decl, 'h="auto" is what lets it grow once it wraps').toMatch(/h="auto"/);
    expect(decl, 'minH keeps the 44px target when the label is short').toMatch(
      /minH=\{TOUCH_TARGET_MIN\}/
    );
  });

  it('stacks remember-me and forgot-password below smd', () => {
    /*
     * They needed 76px + ~200px against 261px of content, so the link wrapped to two lines
     * beside a 21px checkbox and the row lost its baseline. English fits; Spanish does not.
     */
    const code = codeOf(join(AUTH_DIR, 'SignIn/AppSignIn.tsx'));
    const i = code.indexOf('auth.signin.rememberMe');
    expect(i, 'the remember-me row moved — this would pass vacuously').toBeGreaterThan(-1);
    const rowStart = code.lastIndexOf('<Stack', i);
    const hstackStart = code.lastIndexOf('<HStack', i);
    expect(
      rowStart > -1 && rowStart > code.lastIndexOf('{/* Sign in button */}', i),
      'the remember/forgot row must be a responsive <Stack>, not a nowrap <HStack>'
    ).toBe(true);
    const decl = code.slice(rowStart, code.indexOf('>', rowStart));
    expect(decl, 'it must stack on a phone').toMatch(/direction=\{\{\s*base:\s*'column'/);
    expect(hstackStart).toBeLessThan(i); // the checkbox + label pair is still a row
  });

  it('gives the sign-in fields a name, an autocomplete, and a heading', () => {
    /*
     * MEASURED 2026-08-25 on the live page, all four at once:
     *   - `document.querySelectorAll('h1,h2,h3,h4')` returned ZERO for the whole page;
     *   - the field labels were `<p>`, with no `for`/`id`, so the inputs had NO ACCESSIBLE
     *     NAME (a screen reader said "edit text, blank") and clicking a label focused nothing;
     *   - `autocomplete` was absent on both fields, so no password manager could fill them;
     *   - the validation copy and both placeholders were hard-coded English on an es-419 page.
     */
    const code = codeOf(join(AUTH_DIR, 'SignIn/AppSignIn.tsx'));

    expect(code, 'the page title must be a real heading').toMatch(/<Heading\s+as="h1"/);

    for (const [field, ac] of [
      ['signin-email', 'email'],
      ['signin-password', 'current-password']
    ] as const) {
      expect(code, `${field} needs an id so its <label htmlFor> can point at it`).toContain(
        `id="${field}"`
      );
      expect(code, `${field} needs a real <label htmlFor>`).toMatch(
        new RegExp(`as="label"[\\s\\S]{0,80}htmlFor="${field}"`)
      );
      expect(
        code,
        `${field} needs autoComplete="${ac}" or no password manager can fill it`
      ).toContain(`autoComplete="${ac}"`);
    }

    // `new-password` here would make a manager offer to GENERATE one on a SIGN-IN form.
    expect(code, 'a sign-in field must never ask for new-password').not.toContain(
      'autoComplete="new-password"'
    );

    // Validation copy and placeholders go through intl like everything else.
    for (const literal of [
      'Email is required',
      'Password is required',
      'Invalid email address',
      'Enter your business email',
      'Enter your password'
    ]) {
      expect(
        code.includes(`'${literal}'`) || code.includes(`"${literal}"`),
        `"${literal}" is hard-coded English again`
      ).toBe(false);
    }
  });

  it('moves focus to the auth error and defines the link variant that colours it', () => {
    const signin = codeOf(join(AUTH_DIR, 'SignIn/AppSignIn.tsx'));
    const alert = codeOf(join(AUTH_DIR, 'AuthErrorAlert.tsx'));
    // MEASURED: after a failed submit `document.activeElement` was BODY — the button holding
    // focus had been re-rendered away, dropping a keyboard user at the top of the document.
    expect(signin, 'the failed-signin branch must move focus to the error').toMatch(
      /errorRef\.current\?\.focus\(\)/
    );
    expect(alert, 'the alert must accept a ref and be focusable by script').toMatch(/forwardRef/);
    expect(alert, 'tabIndex={-1} is what makes it focusable without joining the tab order').toMatch(
      /tabIndex=\{-1\}/
    );

    /*
     * The alert's recovery action is a `<Button variant="link">`, and `theme/components/button.js`
     * hardened solid/outline/ghost but never claimed `link` — so it fell through to Chakra's
     * stock `${c}.500`. MEASURED: green.500 on the alert's red.50 ground = 2.43:1 against a 4.5
     * floor, on the only way out for someone locked out of their account.
     */
    const theme = codeOf(join(SRC, 'theme/components/button.js'));
    expect(
      theme,
      'the `link` variant is undefined again — Chakra`s stock uses the banned .500'
    ).toMatch(/link: \(props\) => \{/);
    const body = theme.slice(theme.indexOf('link: (props) => {'));
    expect(
      body.slice(0, body.indexOf('_active')),
      'a link button renders on tinted grounds (red.50), where .700 measures 4.49 — use .800'
    ).toMatch(/color: mode\(`\$\{c\}\.800`/);
  });

  it('keeps the forgot-password card translated, headed, and un-toasted', () => {
    const code = codeOf(join(SRC, 'components/Forms/ForgotPasswordForm.tsx'));
    expect(code, 'the shared forgot-password form moved').toMatch(/ForgotPasswordForm/);

    /*
     * The exact strings that shipped untranslated. Matched as JSX text or a prop value so the
     * words appearing in this file's own prose do not trip it.
     */
    for (const literal of [
      'Check Your Email',
      'Send Another Email',
      'Reset Your Password',
      'Send Reset Link',
      'Email is required'
    ]) {
      /*
       * ⚠️ Whitespace-insensitive between the tags. The first version tested
       * `code.includes('>' + literal + '<')` and PASSED the mutation that put the bare literal
       * back — because JSX formats a text child onto its own line, so the characters either
       * side of it are a newline and indentation, never `>` and `<`.
       */
      const asJsxText = new RegExp(`>\\s*${literal}\\s*<`);
      expect(
        asJsxText.test(code) || code.includes(`'${literal}'`) || code.includes(`"${literal}"`),
        `"${literal}" is hard-coded again — every string here goes through intl.formatMessage`
      ).toBe(false);
    }
    expect(
      (code.match(/intl\.formatMessage\(\{ id: 'auth\.forgotPassword\./g) ?? []).length,
      'the card should read its copy from auth.forgotPassword.* keys'
    ).toBeGreaterThanOrEqual(10);

    // `querySelectorAll('h1,h2,h3')` returned ZERO for this whole page; the title was a <Text>.
    expect(code, 'the card title must be a real heading').toMatch(/<Heading\s+as="h1"/);

    // The toast repeated the card word for word and covered the bottom of a 430px screen.
    expect(code, 'the success toast is back — the card IS the confirmation').not.toMatch(
      /useToast|toast\(/
    );
  });
});
