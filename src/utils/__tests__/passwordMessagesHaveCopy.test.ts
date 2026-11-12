/**
 * Every sentence the password validator writes has copy in both locales (settings audit leftover,
 * 2026-11-12: the strength meter printed "Password contains common words or predictable patterns"
 * to a Spanish reader).
 *
 * Reads the `errors.push(...)` and `warnings.push(...)` literals from passwordValidation.ts, so a
 * new message without a catalogue id fails here.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../i18n/lang/en-US.json';
import es419 from '../../i18n/lang/es-419.json';
import { passwordMessage, passwordValidator } from '../passwordValidation';

const SOURCE = readFileSync(join(__dirname, '../passwordValidation.ts'), 'utf8');

const pushed = () =>
  [...SOURCE.matchAll(/(?:errors|warnings)\.push\(\s*([`'])((?:(?!\1).)*)\1/g)].map((m) =>
    m[2].replace(/\$\{[^}]+\}/g, '8')
  );

describe('password validator messages', () => {
  it('finds the messages in the source', () => {
    // ANTI-VACUITY: seven errors and two warnings.
    expect(pushed().length).toBe(9);
  });

  it('maps every message to an id with copy in both locales', () => {
    for (const message of pushed()) {
      const known = passwordMessage(message);
      expect(known, message).not.toBeNull();
      expect((enUS as Record<string, string>)[known!.id], known!.id).toBeTruthy();
      expect((es419 as Record<string, string>)[known!.id], known!.id).toBeTruthy();
    }
  });

  it('carries the minimum length as a value', () => {
    expect(passwordMessage('Password must be at least 8 characters long')).toEqual({
      id: 'auth.password.message.minLength',
      values: { min: '8' }
    });
  });

  it('maps what the validator actually returns for a weak password', () => {
    const result = passwordValidator.validate('qwerty1234password');
    const all = [...result.errors, ...result.warnings];
    expect(all.length).toBeGreaterThan(0);
    for (const message of all) expect(passwordMessage(message), message).not.toBeNull();
  });
});
