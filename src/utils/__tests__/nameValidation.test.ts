import { describe, it, expect } from 'vitest';
import { PERSON_NAME_PATTERN, PERSON_NAME_MAX_LENGTH, isValidPersonName } from '../nameValidation';

/**
 * Regression pins for the signup blocker found 2026-07-31: the old
 * `/^[A-Za-z\s]+$/` rule rejected accented and punctuated names, which locked
 * most of Trazo's California ICP out of signup entirely.
 */
describe('PERSON_NAME_PATTERN', () => {
  it('accepts plain ASCII names', () => {
    expect(PERSON_NAME_PATTERN.test('John')).toBe(true);
    expect(PERSON_NAME_PATTERN.test('Mary Jane')).toBe(true);
  });

  it('accepts accented Spanish names (the CA agriculture norm)', () => {
    for (const name of ['José', 'Muñoz', 'Hernández', 'Peña', 'Rodríguez']) {
      expect(PERSON_NAME_PATTERN.test(name), name).toBe(true);
    }
  });

  it('accepts decomposed (combining-mark) forms', () => {
    // "Muñoz" written as n + U+0303 rather than precomposed ñ
    expect(PERSON_NAME_PATTERN.test('Muñoz')).toBe(true);
  });

  it('accepts apostrophes, hyphens and periods found in real surnames', () => {
    for (const name of ["O'Brien", 'O’Brien', 'Martínez-Ruiz', 'St. John', 'Smith Jr.']) {
      expect(PERSON_NAME_PATTERN.test(name), name).toBe(true);
    }
  });

  it('accepts non-Latin scripts', () => {
    expect(PERSON_NAME_PATTERN.test('李')).toBe(true);
  });

  it('rejects digits and symbols', () => {
    for (const bad of ['Miguel123', 'a@b', 'Bobby<script>', '4chan']) {
      expect(PERSON_NAME_PATTERN.test(bad), bad).toBe(false);
    }
  });

  it('rejects names that do not start with a letter', () => {
    for (const bad of ['-Jose', "'Brien", ' Leading', '.Period']) {
      expect(PERSON_NAME_PATTERN.test(bad), bad).toBe(false);
    }
  });

  it('rejects empty input', () => {
    expect(PERSON_NAME_PATTERN.test('')).toBe(false);
  });
});

describe('isValidPersonName', () => {
  it('trims before validating', () => {
    expect(isValidPersonName('  José  ')).toBe(true);
    expect(isValidPersonName('   ')).toBe(false);
  });

  it('enforces the backend max length', () => {
    expect(isValidPersonName('a'.repeat(PERSON_NAME_MAX_LENGTH))).toBe(true);
    expect(isValidPersonName('a'.repeat(PERSON_NAME_MAX_LENGTH + 1))).toBe(false);
  });

  it('stays at or under the backend serializer limit', () => {
    // users/serializers.py caps first_name/last_name at 128 chars; the client
    // must never allow more than the server accepts.
    expect(PERSON_NAME_MAX_LENGTH).toBeLessThanOrEqual(128);
  });
});
