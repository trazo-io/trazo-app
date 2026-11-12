/**
 * The signed copy chosen for one affidavit must never upload onto another (review of app #372).
 *
 * The Edit buttons stay live while the form is open, and the reset tied to the form closing never
 * fires when switching rows, so `startEdit` itself clears the chosen file.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(__dirname, '../LandownerAffidavitSection.tsx'), 'utf8');

describe('LandownerAffidavitSection', () => {
  it('clears the chosen signed copy when another affidavit is opened for editing', () => {
    const start = source.indexOf('const startEdit = ');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('setShowForm(true);', start));
    expect(body).toContain('setSignedFile(null)');
  });

  it('uses the semantic badge variants, never a sub-11px font', () => {
    expect(source).not.toMatch(/fontSize="10px"/);
    expect(source).toContain("variant={a.signed_document ? 'neutral' : 'warning'}");
  });
});
