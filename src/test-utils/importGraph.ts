/**
 * Import-graph walk shared by the claim/score guards.
 *
 * Extracted 2026-08-11, when a second guard (producer records) needed the same machinery.
 * It is deliberately ONE copy. A guard whose graph walk drifts from its sibling's is a guard
 * that silently stops covering things, and this repo has already paid for that lesson twice:
 * a duplicated set of category weights drifted apart, and this very module was ts/tsx-only for
 * as long as only one guard used it. If you change the resolution rules here, BOTH guards
 * change together — that is the point.
 *
 * WHY A GRAPH WALK AND NOT A DIRECTORY LIST: the consumer guard originally scanned two fixed
 * directories and missed two live leaks that sat one import away. A directory allowlist can
 * only ever catch what someone remembered to list.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const SRC = join(__dirname, '..');

/**
 * `.jsx`/`.js` are included deliberately (widened 2026-08-11).
 *
 * This was ts/tsx-only, which made JSX written in a `.jsx` file invisible TWICE OVER:
 * `collectSourceFiles` skipped it, and `reachableFrom` refused to traverse THROUGH it, so
 * anything imported only via a `.jsx` file dropped out of the graph as well. The consumer tree
 * is ~100% `.tsx`, so the coverage cost there was zero — but the PRODUCER tree is heavily
 * `.jsx` (`HistoryCard.jsx` is the single most important file the producer guard covers), so a
 * guard modelled on the old filter would have scanned nothing and passed green forever.
 *
 * A filter that encodes an assumption instead of checking one is the same failure mode the
 * guards themselves exist to prevent.
 */
export const SOURCE_EXT = /\.(ts|tsx|jsx|js)$/;

/** Every source file under `dir`, recursively, excluding tests and vendored code. */
export function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...collectSourceFiles(full));
    } else if (SOURCE_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Resolve an import specifier to a file inside src, or null if it is external. */
export function resolveImport(specifier: string, fromFile: string): string | null {
  // Path aliases configured in vitest.config.ts / tsconfig.
  const aliases: Record<string, string> = {
    '@/': join(SRC, ''),
    'components/': join(SRC, 'components'),
    'views/': join(SRC, 'views'),
    'utils/': join(SRC, 'utils'),
    'hooks/': join(SRC, 'hooks'),
    'store/': join(SRC, 'store'),
    'config/': join(SRC, 'config')
  };

  let base: string | null = null;
  if (specifier.startsWith('.')) {
    base = resolve(dirname(fromFile), specifier);
  } else if (specifier.startsWith('src/')) {
    base = join(SRC, specifier.slice('src/'.length));
  } else {
    for (const [prefix, target] of Object.entries(aliases)) {
      if (specifier.startsWith(prefix)) {
        base = join(target, specifier.slice(prefix.length));
        break;
      }
    }
  }
  if (!base) return null; // node_modules / bare package

  // Extension candidates must match SOURCE_EXT above, or an `import X from './Foo'` pointing at
  // a Foo.jsx resolves to null and the whole subtree beneath it leaves the graph.
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.jsx`,
    `${base}.js`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    join(base, 'index.jsx'),
    join(base, 'index.js')
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Every src file reachable from `roots`, following imports transitively.
 * Roots may be directories or individual files — a guard that filters files out of a directory
 * listing passes a file list.
 */
export function reachableFrom(roots: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = roots.flatMap((root) =>
    statSync(root).isDirectory() ? collectSourceFiles(root) : [root]
  );
  // `import x from '…'`, `import '…'`, and `import('…')`.
  const importPattern = /(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g;

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const target = resolveImport(match[1], file);
      if (target && !seen.has(target) && SOURCE_EXT.test(target)) queue.push(target);
    }
  }
  return seen;
}

/**
 * Strip comments so the explanatory notes left at each removal site — which necessarily quote
 * the banned strings — do not trip a guard.
 *
 * This matters more than it looks. Without it a guard fires on its own tombstones, and the
 * tempting "fix" is deleting the comments that record WHY something was removed — destroying
 * the institutional memory that made the removal possible in the first place.
 */
export function stripComments(source: string): string {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Line comments, including TRAILING ones. The `[^:]` guard keeps `https://` intact — an
      // earlier version only stripped comments at line start, so a trailing "// 100% trust"
      // note was reported as a rendered "/100" grade.
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
  );
}
