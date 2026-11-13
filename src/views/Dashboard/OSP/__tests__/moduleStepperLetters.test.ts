import { describe, expect, it } from 'vitest';

import { stepLetter } from '../OSPModuleWizard';

/**
 * A module of four pages and its review make a five-step bar, and on a phone each label had a fifth of 375px:
 * "E. Normas y organismos reguladores" broke mid-word (browser pass 2026-11-13). Such a bar shows the page's letter
 * on a phone; the card under it titles the page in full.
 */
describe('the module stepper on a phone', () => {
  it('shows the letter of a lettered page once the bar has five steps', () => {
    expect(stepLetter('E. Normas y organismos reguladores', 4)).toBe('E');
    expect(stepLetter('D. Legal entity and addresses', 4)).toBe('D');
  });

  it('keeps the words on a shorter bar, where they fit', () => {
    expect(stepLetter('A. Contract on file', 3)).toBeUndefined();
  });

  it('keeps the words of a title with no letter', () => {
    expect(stepLetter('Parcel details', 6)).toBeUndefined();
  });
});
