import { describe, expect, it } from 'vitest';
import { supplierNameCandidates, supplierNamesInPublicNote } from '../supplierNameNudge';

describe('supplierNameCandidates', () => {
  it('offers the full name, the head before the address, and the distinctive stem', () => {
    expect(supplierNameCandidates('Saticoy Grove Nursery, Saticoy CA')).toEqual(
      expect.arrayContaining([
        'Saticoy Grove Nursery, Saticoy CA',
        'Saticoy Grove Nursery',
        'Saticoy Grove'
      ])
    );
  });

  it('refuses a stem that is a single common farm word', () => {
    // "Organic Seeds Inc" reduces to "Organic", which would flag ordinary prose.
    expect(supplierNameCandidates('Organic Seeds Inc')).not.toContain('Organic');
  });

  it('ignores blank and non-string values', () => {
    expect(supplierNameCandidates('')).toEqual([]);
    expect(supplierNameCandidates(null)).toEqual([]);
    expect(supplierNameCandidates(undefined)).toEqual([]);
  });
});

describe('supplierNamesInPublicNote', () => {
  const suppliers = ['Saticoy Grove Nursery, Saticoy CA', 'Hydra-Gardens Inc.'];

  it('finds a supplier named without its address', () => {
    expect(
      supplierNamesInPublicNote(
        'Picked up the stock from Saticoy Grove Nursery on Tuesday.',
        suppliers
      )
    ).toHaveLength(1);
  });

  it('finds a supplier named by its distinctive stem alone', () => {
    expect(supplierNamesInPublicNote('Order came in from Saticoy Grove.', suppliers)).toHaveLength(
      1
    );
  });

  it('is case-insensitive', () => {
    expect(supplierNamesInPublicNote('bought from hydra-gardens inc.', suppliers)).toHaveLength(1);
  });

  it('does not fire on ordinary prose', () => {
    expect(
      supplierNamesInPublicNote(
        'Cool morning, the crew finished the north rows before lunch.',
        suppliers
      )
    ).toEqual([]);
  });

  it('does not match inside an unrelated word', () => {
    expect(supplierNamesInPublicNote('We tested the lines.', ['Test'])).toEqual([]);
  });

  it('reports nothing for an empty note', () => {
    expect(supplierNamesInPublicNote('', suppliers)).toEqual([]);
    expect(supplierNamesInPublicNote(undefined, suppliers)).toEqual([]);
  });
});

describe('browser portability', () => {
  it('builds its matcher without a lookbehind assertion', () => {
    // vite targets safari13.1; lookbehind needs Safari 16.4+, and a runtime-built RegExp is
    // never transpiled. A SyntaxError here would throw inside the event form's render.
    const source = supplierNamesInPublicNote.toString();
    expect(source).not.toContain('(?<');
  });

  it('matches a name that begins the note, with no preceding character', () => {
    expect(
      supplierNamesInPublicNote('Hydra-Gardens Inc. delivered today.', ['Hydra-Gardens Inc.'])
    ).toHaveLength(1);
  });

  it('matches a name at the very end of the note', () => {
    expect(
      supplierNamesInPublicNote('Delivered by Hydra-Gardens Inc.', ['Hydra-Gardens Inc.'])
    ).toHaveLength(1);
  });
});
