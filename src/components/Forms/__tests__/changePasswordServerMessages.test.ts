/**
 * Every sentence the server's password validators can answer with maps to a translated key
 * (review of #354: the change-password toast printed Django's English verbatim).
 *
 * Reads trazo-back/backend/security/password_validators.py from the sibling checkout, so a new
 * validator message that the form cannot translate fails here instead of reaching a Spanish
 * reader in English. Django's three built-in validators (AUTH_PASSWORD_VALIDATORS) are listed by
 * hand: their sentences live in Django, not in this repo.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { SERVER_PASSWORD_MESSAGES, serverPasswordMessageKey } from '../ChangePasswordForm';

const VALIDATORS = join(
  __dirname,
  '../../../../../trazo-back/backend/security/password_validators.py'
);

// The sentences inside `ValidationError(_("..."))`, with Python's adjacent-literal joins undone
// and `%(name)d` / `%(name)s` filled the way the server fills them ("at least 8 characters").
const backendMessages = () =>
  [
    ...readFileSync(VALIDATORS, 'utf8').matchAll(
      /ValidationError\(\s*_\(\s*((?:"(?:[^"\\]|\\.)*"\s*)+)\)/g
    )
  ].map((m) =>
    [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)]
      .map((part) => part[1])
      .join('')
      .replace(/%\(\w+\)d/g, '8')
      .replace(/%\(\w+\)s/g, 'one uppercase letter')
  );

// Django 5.2's own messages for the three built-ins this backend enables.
const DJANGO_MESSAGES = [
  'The password is too similar to the email address.',
  'This password is too common.',
  'This password is entirely numeric.'
];

describe('server password messages reach the reader translated', () => {
  it('finds the backend validators (pair the worktree with trazo-back, see CLAUDE.md)', () => {
    expect(existsSync(VALIDATORS), VALIDATORS).toBe(true);
  });

  it('maps every ValidationError sentence in password_validators.py', () => {
    const messages = backendMessages();
    // Every `raise ValidationError(` was read (a pattern that missed one would pass silently),
    // and the count is pinned: 12 since 2026-11-10. A new rule must be mapped before raising it.
    const raises = readFileSync(VALIDATORS, 'utf8').match(/raise ValidationError\(/g) ?? [];
    expect(messages).toHaveLength(raises.length);
    expect(messages).toHaveLength(12);
    for (const message of messages) {
      expect(serverPasswordMessageKey(message), message).not.toBeNull();
    }
  });

  it("maps Django's built-in validator sentences", () => {
    for (const message of DJANGO_MESSAGES) {
      expect(serverPasswordMessageKey(message), message).not.toBeNull();
    }
  });

  it('leaves the wrong-current-password sentence to its own field', () => {
    expect(serverPasswordMessageKey('Current password is incorrect')).toBeNull();
  });

  it('every key exists in both locales', () => {
    for (const [, key] of SERVER_PASSWORD_MESSAGES) {
      expect((enUS as Record<string, string>)[key], `en-US ${key}`).toBeTruthy();
      expect((es419 as Record<string, string>)[key], `es-419 ${key}`).toBeTruthy();
    }
  });
});
