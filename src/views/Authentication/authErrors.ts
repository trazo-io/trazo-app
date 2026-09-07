/**
 * ONE place decides what an auth failure says and what it offers.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * 2026-08-24 — WHY THIS FILE EXISTS. Read before adding a case.
 *
 * Six auth screens each mapped errors their own way, and every one of them ended at
 * `setError(<some English sentence>)`. Two consequences, both live:
 *
 *   1. The sentence came from the SERVER. `err.data.email[0]` printed
 *      "A user with this email address already exists. Please sign in instead." verbatim —
 *      in English, on a Spanish-locale screen, in an app whose own rule is that every
 *      user-facing string goes through `intl.formatMessage` with a key in BOTH locales.
 *      A server that returns prose has effectively opted the client out of translation.
 *
 *   2. The sentence named an ACTION the screen did not provide. "Please sign in instead"
 *      with no link; and worse, for the most common way to hit it — signing up again after
 *      never clicking the verification link — signing in cannot work at all, because
 *      `is_active` stays False until the code is entered. That advice sent a farmer to
 *      "No active account found with the given credentials", which reads as a wrong
 *      password, and from there to a password reset that used to leave the account just as
 *      locked. Three screens, each pointing at the next, none of them a way out.
 *
 * So the API now returns a stable `code` beside the sentence (`users/constants.py`), and
 * this module is the only thing that reads it. It returns a message ID and, where one
 * exists, the RECOVERY the screen must render. A call site that formats its own English is
 * drift — `authErrorMapping.test.ts` is what notices.
 *
 * ⚠️ The server sentence is still kept as `fallbackText`, and it is deliberately the LAST
 * resort, not the first. A code this file has not learned yet degrades to an English
 * sentence that is at least TRUE, rather than to a blank box or a lie.
 */

/** What the alert may offer the person, beyond the words. */
export type AuthErrorAction =
  | { kind: 'none' }
  /** Address is registered AND verified: signing in is genuinely open. */
  | { kind: 'signIn' }
  /** Address is registered but never verified: sign-in is closed, resending is the way out. */
  | { kind: 'resendVerification' };

export interface AuthErrorResolution {
  /** i18n key. Always set. */
  messageId: string;
  /** Values for the message, when it interpolates. */
  values?: Record<string, string>;
  action: AuthErrorAction;
  /**
   * The server's own sentence, kept ONLY for the case where `messageId` resolves to the
   * generic fallback. Rendering this in preference to a translated string is the bug this
   * file exists to stop, so nothing but `AuthErrorAlert` should read it.
   */
  fallbackText?: string;
  /** True when the failure is about the email field, so the field can be marked invalid. */
  fieldsInvalid: Array<'email' | 'password' | 'company_code'>;
}

/**
 * Backend codes. These literals are the wire contract with `users/constants.py`; a typo on
 * either side silently degrades to the generic message, which is exactly why both sides name
 * them instead of inlining them.
 */
export const EMAIL_EXISTS_VERIFIED = 'email_exists_verified';
export const EMAIL_EXISTS_UNVERIFIED = 'email_exists_unverified';

/** `verify_email` outcomes. Added 2026-09-07 with the verification-code TTL. */
export const VERIFICATION_CODE_INVALID = 'verification_code_invalid';
export const VERIFICATION_CODE_EXPIRED = 'verification_code_expired';
export const ALREADY_VERIFIED = 'already_verified';

/**
 * DRF's `as_serializer_error` wraps a bare string value in a list, so `data.code` arrives as
 * `["email_exists_unverified"]` — but `data.detail` does not. Every field on an error body
 * is therefore "string or array of string", and reading `[0]` off the wrong one yields a
 * single CHARACTER rather than a value. One unwrapper, used everywhere.
 */
const first = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const head = value[0];
    return typeof head === 'string' ? head : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

export interface RtkError {
  status?: number | string;
  data?: Record<string, unknown>;
}

/**
 * SimpleJWT's answer to an inactive OR non-existent OR wrong-password account. It is one
 * sentence for three situations by design (it must not leak which), so the UI cannot key an
 * action off it — but it MUST be translated, because it is the single most-seen auth error
 * in the app and it currently reaches the farmer in raw English.
 */
const SIMPLE_JWT_NO_ACTIVE_ACCOUNT = 'no active account found';

export const resolveSignUpError = (err: RtkError | undefined): AuthErrorResolution => {
  const data = err?.data ?? {};
  const code = first(data.code);

  if (code === EMAIL_EXISTS_UNVERIFIED) {
    return {
      messageId: 'auth.error.emailExists.unverified',
      action: { kind: 'resendVerification' },
      fieldsInvalid: ['email']
    };
  }

  if (code === EMAIL_EXISTS_VERIFIED) {
    return {
      messageId: 'auth.error.emailExists.verified',
      action: { kind: 'signIn' },
      fieldsInvalid: ['email']
    };
  }

  // Company-code problems are field-specific and the server's wording is the only thing that
  // knows WHICH problem (bad format, unknown code, already a member). Kept as server text
  // rather than flattened into one vague translated line — being specific matters more here
  // than being translated, and the codes to do both do not exist yet.
  const companyCode = first(data.company_code);
  if (companyCode) {
    return {
      messageId: 'auth.error.passthrough',
      values: { text: companyCode },
      action: { kind: 'none' },
      fallbackText: companyCode,
      fieldsInvalid: ['company_code']
    };
  }

  const email = first(data.email);
  if (email) {
    return {
      messageId: 'auth.error.passthrough',
      values: { text: email },
      action: { kind: 'none' },
      fallbackText: email,
      fieldsInvalid: ['email']
    };
  }

  const nonField = first(data.non_field_errors) ?? first(data.detail);
  if (nonField) {
    return {
      messageId: 'auth.error.passthrough',
      values: { text: nonField },
      action: { kind: 'none' },
      fallbackText: nonField,
      fieldsInvalid: []
    };
  }

  const transport = transportError(err);
  return { ...transport, messageId: transport.messageId ?? 'auth.error.signup.generic' };
};

export const resolveSignInError = (err: RtkError | undefined): AuthErrorResolution => {
  const data = err?.data ?? {};
  const detail = first(data.detail);

  if (detail && detail.toLowerCase().includes(SIMPLE_JWT_NO_ACTIVE_ACCOUNT)) {
    // Deliberately offers `resendVerification` even though this sentence does NOT prove the
    // account is unverified. It cannot prove it — SimpleJWT answers three situations the
    // same way on purpose. Offering the resend leaks nothing (the resend endpoint answers
    // "if an account exists…" for every address) and it is the ONLY way an unverified farmer
    // gets out of this screen. The copy is phrased as a question for exactly that reason.
    return {
      messageId: 'auth.error.signin.noActiveAccount',
      action: { kind: 'resendVerification' },
      fieldsInvalid: []
    };
  }

  if (detail) {
    return {
      messageId: 'auth.error.passthrough',
      values: { text: detail },
      action: { kind: 'none' },
      fallbackText: detail,
      fieldsInvalid: []
    };
  }

  const transport = transportError(err);
  return { ...transport, messageId: transport.messageId ?? 'auth.error.signin.generic' };
};

/**
 * The verify-email screen.
 *
 * ⚠️ This screen used to decide what had happened by comparing the server's ENGLISH sentence
 * — `error?.data?.error === 'User is already verified'` — which is the exact defect the codes
 * above exist to remove, still alive one screen over. It stayed invisible because that branch
 * is the SUCCESS path (an already-verified user is sent to the dashboard), so on a Spanish
 * locale the comparison simply never matched and the user was shown "verification failed"
 * for an account that was fine.
 *
 * `already_verified` is deliberately NOT handled here: it is not an error on this screen, and
 * the caller checks for it before resolving. Returning a red box for it would be a lie.
 */
export const resolveVerifyEmailError = (err: RtkError | undefined): AuthErrorResolution => {
  const data = err?.data ?? {};
  const code = first(data.code);

  if (code === VERIFICATION_CODE_EXPIRED) {
    // Resend is the ONLY way out of an expired code — the server deletes the row on
    // rejection, so retyping the same six characters can never work again.
    return {
      messageId: 'auth.error.verify.expired',
      action: { kind: 'resendVerification' },
      fieldsInvalid: []
    };
  }

  if (code === VERIFICATION_CODE_INVALID) {
    // Offering resend here leaks nothing: `resend_verification_email` answers
    // "if an account exists…" for every address, and a farmer who mistyped one character
    // should not have to guess whether the code or the mailbox is the problem.
    return {
      messageId: 'auth.error.verify.invalid',
      action: { kind: 'resendVerification' },
      fieldsInvalid: []
    };
  }

  return resolveGenericAuthError(err, 'auth.error.verify.generic');
};

export const resolveGenericAuthError = (
  err: RtkError | undefined,
  genericMessageId: string
): AuthErrorResolution => {
  const data = err?.data ?? {};
  const text = first(data.detail) ?? first(data.error) ?? first(data.non_field_errors);
  if (text) {
    return {
      messageId: 'auth.error.passthrough',
      values: { text },
      action: { kind: 'none' },
      fallbackText: text,
      fieldsInvalid: []
    };
  }
  const transport = transportError(err);
  return { ...transport, messageId: transport.messageId ?? genericMessageId };
};

/**
 * Status-only failures, where there is no body to read. `messageId` is left undefined so the
 * caller can supply the screen-appropriate generic line; everything else is shared.
 */
const transportError = (
  err: RtkError | undefined
): Omit<AuthErrorResolution, 'messageId'> & { messageId?: string } => {
  const status = typeof err?.status === 'number' ? err.status : undefined;

  if (status === 429) {
    return { messageId: 'auth.error.rateLimited', action: { kind: 'none' }, fieldsInvalid: [] };
  }
  if (status !== undefined && status >= 500) {
    return { messageId: 'auth.error.server', action: { kind: 'none' }, fieldsInvalid: [] };
  }
  if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') {
    return { messageId: 'auth.error.network', action: { kind: 'none' }, fieldsInvalid: [] };
  }
  return { action: { kind: 'none' }, fieldsInvalid: [] };
};
