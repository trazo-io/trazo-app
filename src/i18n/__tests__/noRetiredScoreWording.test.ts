/**
 * The transparency score and the carbon score are retired concepts, not hidden ones
 * (transparency-first.md, 2026-09-08). A string that NAMES them, even to deny them ("not a
 * Trazo score", "shoppers never see a score") or to tell their history ("a carbon-first score
 * penalizes..."), keeps the concept alive in front of the user. Found 2026-09-30 in a landing
 * changelog and then swept here.
 *
 * Every locale value that says score must be either:
 *   - an orphan no source file renders (the old transparency.* strings, pending deletion), or
 *   - on ALLOWED below, with the reason it is not the retired concept.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const SCORE = /\b(score|scores|scored|scoring|puntaje|puntajes|puntuaci[oó]n)\b/i;

const ALLOWED: Record<string, string> = {
  'events.noteScan.reason.score':
    'Warns a farmer whose OWN note contains a score or grade before it goes public. It names what the farmer wrote.',
  'commercial.qualityScore':
    'Scan-traffic quality metric, not the retired score. Open finding: a dashboard shows counts only (transparency-first.md), so this display needs its own slice.',
  'commercial.engagementTooltip': 'Same scan-traffic metric as commercial.qualityScore.',
  'commercial.educationAutomatic': 'Bot-detection score of a scan, same open finding.',
  'commercial.educationDefault': 'Bot-detection score of a scan, same open finding.'
};

function sourceText(): string {
  const root = resolve(__dirname, '../..');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name === '__tests__' || name === 'lang') continue;
        walk(path);
      } else if (/\.(tsx?|jsx?)$/.test(name)) {
        out.push(readFileSync(path, 'utf8'));
      }
    }
  };
  walk(root);
  return out.join('\n');
}

describe('no rendered string names the retired score', () => {
  const source = sourceText();
  // A key can render without appearing literally: through a prefix literal
  // (`i18nPrefix: 'tooltip.carbonScore'` + '.explanation') or a template (`app.${id}`) whose
  // suffix is a quoted id somewhere in source.
  const literals = new Set([...source.matchAll(/['"]([A-Za-z0-9_.]+)['"]/g)].map((m) => m[1]));
  // Template keys (`app.${prop.id}`) resolve from route ids, not from any quoted word.
  const routeIds = new Set(
    [...source.matchAll(/\bid:\s*['"]([A-Za-z0-9_]+)['"]/g)].map((m) => m[1])
  );
  const templatePrefixes = [...source.matchAll(/`([a-zA-Z.]+)\.\$\{/g)].map((m) => `${m[1]}.`);
  const rendered = (key: string) =>
    literals.has(key) ||
    [...literals].some((lit) => lit.includes('.') && key.startsWith(`${lit}.`)) ||
    templatePrefixes.some(
      (prefix) => key.startsWith(prefix) && routeIds.has(key.slice(prefix.length))
    );

  for (const [locale, messages] of Object.entries({ 'en-US': enUS, 'es-419': es419 })) {
    it(`${locale}: every score string is an orphan or allowed with a reason`, () => {
      const offenders = Object.entries(messages as Record<string, string>)
        .filter(
          ([key, value]) => typeof value === 'string' && SCORE.test(value) && !(key in ALLOWED)
        )
        .filter(([key]) => rendered(key))
        .map(([key]) => key);
      expect(offenders).toEqual([]);
    });
  }
});

describe('no hardcoded label names the retired score', () => {
  // Hardcoded English never reaches the locale files, which is how "Efficiency Score" survived
  // the 2026-08-16 removal in one modal and "{Premium} Carbon Score" badges survived in a form.
  const PHRASES = /\b(carbon|transparency|efficiency|sustainability) scor(e|es|ing)\b/i;

  it('outside comments, no source file carries one of these labels', () => {
    const root = resolve(__dirname, '../..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name === '__tests__' || name === 'lang' || name === 'test') continue;
          walk(path);
        } else if (/\.(tsx?|jsx?)$/.test(name)) {
          // Blank out block comments (JSX {/* */} included) keeping newlines, so line numbers
          // stay true, then drop // line comments.
          readFileSync(path, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
            .split('\n')
            .forEach((line, i) => {
              const code = line.replace(/(^|[^:])\/\/.*$/, '$1');
              if (PHRASES.test(code)) offenders.push(`${path.slice(root.length + 1)}:${i + 1}`);
            });
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
