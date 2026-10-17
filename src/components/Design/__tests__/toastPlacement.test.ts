/**
 * Toast placement has ONE owner: the `toastOptions` default on the root ChakraProvider.
 *
 * Found 2026-10-17: about 285 of 303 toast calls took Chakra's implicit `bottom`, while 18 set
 * their own `position` (`top` on Field notes, the activity wizard, the OSP annual update and the
 * Stripe redirect; `top-right` on AddParcel; `bottom-right` on milestone toasts). None of the 18
 * carried a written reason. The result was the same kind of message landing in four places
 * depending on the screen.
 *
 * The rule: a toast call never passes `position`. If a screen genuinely needs a different
 * placement, change the provider default for everyone or write the exception down here.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '../../..');

// NO extension filter beyond jsx/tsx/js/ts: trazo-app is a MIXED tree (the activity wizard is
// NewEvent.jsx) and a tsx-only sweep has produced false "clean" results before.
const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx|ts|js)$/.test(p)) out.push(p);
  }
  return out;
};

const FILES = walk(SRC);
const rel = (p: string) => relative(SRC, p);

/** The `{ … }` argument of a call opened at `openIdx`, balanced on braces. */
const balancedObject = (src: string, openIdx: number): string => {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  return src.slice(openIdx);
};

describe('toast placement', () => {
  it('never sets position on an individual toast call', () => {
    const offenders: string[] = [];
    let seen = 0;

    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');
      // `toast({`, `toast.update(id, {`, and the same through any alias ending in `toast`/`Toast`.
      const calls = /\b\w*[tT]oast(?:\.update\(\s*[^,]+,\s*|\()\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = calls.exec(src))) {
        seen++;
        const body = balancedObject(src, m.index + m[0].length - 1);
        if (/(^|[\s{,])position\s*[:,}]/.test(body)) {
          const line = src.slice(0, m.index).split('\n').length;
          offenders.push(`${rel(file)}:${line}`);
        }
      }
    }

    // A negative assertion must prove it read something.
    expect(seen, 'no toast calls found; the guard is reading nothing').toBeGreaterThan(100);
    expect(
      offenders,
      `A toast call sets its own position. Placement belongs to toastOptions on the ChakraProvider in src/index.tsx.\n${offenders.join(
        '\n'
      )}`
    ).toEqual([]);
  });

  it('keeps the provider default at bottom', () => {
    const src = readFileSync(join(SRC, 'index.tsx'), 'utf8');
    expect(src).toMatch(/toastOptions=\{\{\s*defaultOptions:\s*\{[^}]*position:\s*'bottom'/);
  });
});
