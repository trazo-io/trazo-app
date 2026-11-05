/**
 * The buyer link lists seasons as rows in one card, with a text link each (2026-11-04).
 *
 * Each season was its own bordered box with a SOLID green "View records" button: on the
 * specimen farm, twelve solid buttons down one phone screen, and the button jumped beside or
 * under the text depending on the crop name's length. Same call as the traceback (#272) and the
 * readiness card: rows split by a hairline (StatusList), the action as a text link that keeps
 * the 44px hit area (TOUCH_TARGET, one shared copy).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const code = (p: string) =>
  read(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const PAGE = code('src/views/BuyerReview/BuyerReview.tsx');
const LIST = (() => {
  const at = PAGE.indexOf('meta.seasons.map(');
  return at === -1 ? '' : PAGE.slice(at, PAGE.indexOf('</StatusList>', at));
})();

describe('buyer seasons are rows', () => {
  it('finds the season list (guards the guard)', () => {
    expect(LIST.length).toBeGreaterThan(300);
    expect(LIST).toMatch(/buyerReview\.season\.open/);
  });

  it('puts the seasons in one StatusList, not a box each', () => {
    expect(PAGE).toMatch(/<StatusList>\s*\{meta\.seasons\.map\(/);
    expect(LIST).not.toMatch(/borderWidth="1px"/);
  });

  it('opens a season with a text link that keeps the 44px hit area, not a solid button', () => {
    expect(LIST).not.toMatch(/<StandardButton/);
    expect(LIST).toMatch(/<Link[\s\S]*\{\.\.\.TOUCH_TARGET\}/);
  });

  it('has one TOUCH_TARGET, in the design system', () => {
    expect(read('src/components/Design/StandardComponents.tsx')).toMatch(
      /export const TOUCH_TARGET = \{/
    );
    for (const f of [
      'src/components/Compliance/InputVerifyHelper.tsx',
      'src/components/Traceback/TraceChain.tsx',
      'src/views/BuyerReview/BuyerReview.tsx'
    ]) {
      expect(code(f), f).not.toMatch(/const TOUCH_TARGET = \{/);
    }
  });
});
