/**
 * The OSP panels list records and findings as rows, not tinted boxes (2026-11-17).
 *
 * Before: each change notification was a red.50 or gray.50 box with a 3px red or green edge,
 * each approved-input change a green.50 or red.50 box with a 3px edge (whose own comment said
 * the edge was the ONLY thing telling "added" from "removed"), and the registry-sync finding a
 * cream StandardAlert slab. The November notice pass made records and findings rows with
 * hairlines everywhere else (readiness card, traceback, activity sheet #416, export previews
 * #418); these were the last three on the list.
 *
 * Meaning now rests on glyph SHAPE and badge WORDS, never colour alone: a § 205.400(f)(1)
 * notice is a warning triangle with its red CFR badge; a change-log row is a plus or a minus
 * with its ADDED / REMOVED badge.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const code = (p: string) =>
  readFileSync(resolve(process.cwd(), p), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const NOTICES = code('src/views/Dashboard/OSP/OSPChangeNotificationsPanel.tsx');
const INPUTS = code('src/views/Dashboard/OSP/OSPApprovedInputsPanel.tsx');

describe('OSP panels are rows, not boxes', () => {
  it('reads the files (guards the guard)', () => {
    expect(NOTICES).toMatch(/useGetOSPChangeNotificationsQuery/);
    expect(INPUTS).toMatch(/const ChangeLogSection/);
  });

  it('draws no coloured edge in either panel', () => {
    expect(NOTICES).not.toMatch(/borderLeft/);
    expect(INPUTS).not.toMatch(/borderLeft/);
  });

  it('lists change notifications as StatusRows, (f)(1) as a crit triangle', () => {
    expect(NOTICES).toMatch(
      /<StatusList testId="change-notification-rows">[\s\S]*?<StatusRow[\s\S]*?testId="change-notification-row"/
    );
    expect(NOTICES).toMatch(/tone=\{cn\.is_immediate \? 'crit' : 'neutral'\}/);
    expect(NOTICES).toMatch(/icon=\{cn\.is_immediate \? FaExclamationTriangle : FaExchangeAlt\}/);
    // Badges by semantic variant: no solid green pill on a fact, no foreign `yellow` palette.
    expect(NOTICES).toMatch(/variant=\{cn\.is_immediate \? 'danger' : 'neutral'\}/);
    expect(NOTICES).toMatch(/variant=\{cn\.certifier_acknowledged_at \? 'subtle' : 'warning'\}/);
    expect(NOTICES).not.toMatch(/colorScheme=\{cn\./);
  });

  it('lists the approved-input history as neutral plus/minus rows', () => {
    const log = INPUTS.slice(
      INPUTS.indexOf('const ChangeLogSection'),
      INPUTS.indexOf('interface OSPApprovedInputsPanelProps')
    );
    expect(log).toMatch(/<StatusList testId="approved-input-log-rows">/);
    expect(log).toMatch(/tone="neutral"[\s\S]*?icon=\{isAdded \? FaPlus : FaMinus\}/);
    expect(log).not.toMatch(/green\.50|red\.50/);
    // The reader's locale, never a hardcoded one.
    expect(log).toMatch(/toLocaleDateString\(intl\.locale/);
  });

  it('states the registry-sync finding as a warning row, not an alert slab', () => {
    const start = INPUTS.indexOf('osp.registry_sync_diff?.has_warning && (');
    expect(start).toBeGreaterThan(0);
    const sync = INPUTS.slice(start, INPUTS.indexOf('</StatusRow>', start));
    expect(sync).toMatch(/<StatusRow\s+tone="warn"/);
    expect(sync).not.toMatch(/StandardAlert/);
  });
});
