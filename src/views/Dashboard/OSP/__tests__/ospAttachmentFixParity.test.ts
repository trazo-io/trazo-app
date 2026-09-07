/**
 * Every attachment fix destination the backend can emit must have a route and a sentence here.
 *
 * `Column.fix_hint` is a two-repo contract with no compiler between the halves: the backend
 * names a token, the panel looks up `osp.attachments.fix.<token>` for its wording and
 * `FIX_DESTINATIONS[<token>]` for where to send the operator. A token added on one side alone
 * prints the raw message id to the farmer, which is a worse outcome than the count with no
 * destination this whole mechanism replaced.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';

const WORKBOOKS_PY = join(
  __dirname,
  '../../../../../../trazo-back/certifications/services/common_osp_workbooks.py'
);
const PANEL = join(__dirname, '../OSPRecordTypesPanel.tsx');

/** The tokens inside `FIX_HINTS = frozenset({...})`. */
const backendTokens = (): string[] => {
  const source = readFileSync(WORKBOOKS_PY, 'utf8');
  const block = source.match(/FIX_HINTS = frozenset\(\s*\{([\s\S]*?)\}\s*\)/);
  expect(block, 'FIX_HINTS is no longer a frozenset literal this test can read').toBeTruthy();
  return [...block![1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
};

describe('attachment fix destinations, backend ↔ panel', () => {
  it('reads a non-empty set of tokens', () => {
    expect(backendTokens().length).toBeGreaterThan(3);
  });

  it('gives every token a sentence in both locales', () => {
    const missing: string[] = [];
    for (const token of backendTokens()) {
      const key = `osp.attachments.fix.${token}`;
      if (!(key in (enUS as Record<string, string>))) missing.push(`en-US ${key}`);
      if (!(key in (es419 as Record<string, string>))) missing.push(`es-419 ${key}`);
    }
    expect(missing, 'a token with no message renders to the farmer as the raw key').toEqual([]);
  });

  it('gives every token an entry in FIX_DESTINATIONS', () => {
    const panel = readFileSync(PANEL, 'utf8');
    const map = panel.match(/const FIX_DESTINATIONS[\s\S]*?\n\};/);
    expect(map).toBeTruthy();
    for (const token of backendTokens()) {
      expect(map![0], `${token} is not routed by the panel`).toContain(`${token}:`);
    }
  });
});
