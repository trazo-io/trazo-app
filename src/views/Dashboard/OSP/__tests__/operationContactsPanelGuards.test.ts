/**
 * Review of app #379, held in place:
 * - a skipped or loading query is never shown as "nobody is named yet";
 * - unticking "responsibly connected", or leaving "other", clears the hidden connection fields, so the
 *   PATCH carries only what the form shows.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(__dirname, '../OSPOperationContactsPanel.tsx'), 'utf8');

describe('OSPOperationContactsPanel', () => {
  it('treats a skipped or loading query as unavailable, not empty', () => {
    expect(source).toContain('if (isLoading) return <Skeleton');
    expect(source).toContain('if (isError || !scoped)');
    expect(source.indexOf('if (isError || !scoped)')).toBeLessThan(
      source.indexOf("id: 'osp.contacts.empty'")
    );
  });

  it('clears the connection when its role or option goes away', () => {
    const setRoles = source.slice(source.indexOf('const setRoles'), source.indexOf('const save'));
    expect(setRoles).toContain("connection: '', connection_other: ''");
    const set = source.slice(source.indexOf('const set ='), source.indexOf('const setRoles'));
    expect(set).toContain("connection_other: ''");
  });
});
