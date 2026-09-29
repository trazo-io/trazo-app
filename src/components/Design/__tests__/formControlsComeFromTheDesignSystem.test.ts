/**
 * Guard: a form control comes from the design system, not from Chakra directly.
 *
 * WHY THIS EXISTS. `.claude/rules/frontend.md` has said "check StandardComponents.tsx FIRST"
 * since the file was written, and the Field Notes pages shipped in September 2026 with a raw
 * `<Select>`, `<Textarea>` and `<Input>` anyway. Nobody noticed in review: raw Chakra renders a
 * control that WORKS, so the only symptom is that it looks like a different product.
 *
 * MEASURED, and this is the part a reader should not have to take on trust. `StandardSelect`
 * exists for a reason written into its own body: Chakra's select theme hardcodes its field
 * background (`$bg -> colors.white`), so unlike an input a select does NOT inherit the filled
 * treatment. A raw `<Select>` therefore renders WHITE beside gray.50 neighbours, at Chakra's
 * stock 6px radius against the app's 12px, with Chakra's stock BLUE focus ring. The theme
 * registers no Input/Select config at all (`theme.ts` composes button/badge/alert/link/drawer/
 * progress/checkbox only), so its `_focusVisible: { borderColor: blue.500 }` is live. That is
 * three visible regressions from one import, and every one of them is invisible in a diff.
 *
 * WHAT IS ENFORCED, AND WHAT IS NOT.
 *
 * Select / Textarea / NumberInput / Input: enforced. At the time of writing the ONLY files
 * outside `components/Design/` rendering any of them were the two Field Notes pages and one
 * OSP panel, all of which are now converted, so this guard starts green and stays cheap.
 *
 * `Button`: NOT enforced, deliberately, and this is a real limit of this file rather than an
 * oversight. 79 files render a raw `<Button>`. A guard that fails on 79 pre-existing call sites
 * gets skipped, allowlisted into meaninglessness, or deleted, and a guard nobody can keep green
 * is worse than none. StandardButton is still the right component for new code (see
 * frontend.md); this file simply cannot prove it. If those 79 are ever converted, add 'Button'
 * to CONTROLS and delete this paragraph.
 *
 * NOTE: this checks the IMPORT SOURCE, not the tag name. `import { Select } from '@chakra-ui/react'`
 * plus `<Select>` is the offence. A local component that happens to be called `<Select>` is not,
 * which is why the import block is parsed rather than the JSX alone.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');

/** The one place a raw Chakra form control belongs: the components that wrap it. */
const DESIGN_SYSTEM = 'components/Design/';

/**
 * Chakra control -> the design-system component that must be used instead.
 *
 * `Input` covers `StandardSearchInput` and `StandardDecimalInput` too; the message names the
 * general one and frontend.md lists the rest.
 */
const CONTROLS: Record<string, string> = {
  Select: 'StandardSelect',
  Textarea: 'StandardTextarea',
  NumberInput: 'StandardNumberInput',
  Input: 'StandardInput'
};

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(p)) out.push(p);
  }
  return out;
};

/** Blank comments, keeping newlines: the notes above name the very tags this bans. */
const codeOf = (abs: string) =>
  readFileSync(abs, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

/**
 * Names imported from '@chakra-ui/react' in this file.
 *
 * Only the braced named-import form is read, because that is the only form that yields a bare
 * `<Select>`. A namespace import (`import * as Chakra`) renders `<Chakra.Select>`, which no call
 * site in this repo uses and which would not match the JSX probe below anyway.
 */
const chakraImports = (code: string): Set<string> => {
  const names = new Set<string>();
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@chakra-ui\/react['"]/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (name) names.add(name);
    }
  }
  return names;
};

const FILES = walk(SRC);

describe('form controls come from the design system', () => {
  it('has a corpus to check, and can see Chakra imports in it', () => {
    // Without this, every "no offenders" assertion below passes by finding nothing. Both halves
    // matter: the walk has to reach real files AND the import parser has to return real names.
    expect(FILES.length, 'the walk found almost nothing').toBeGreaterThan(200);

    const importers = FILES.filter((f) => chakraImports(codeOf(f)).size > 0);
    expect(
      importers.length,
      'the Chakra import parser matched nothing, so this guard is inert'
    ).toBeGreaterThan(100);

    // The design system itself must still be reached by the walk and must still import the raw
    // controls it wraps. If it does not, these components have been renamed or moved and the
    // mapping below is stale.
    const ds = FILES.find((f) => f.endsWith('components/Design/StandardComponents.tsx'));
    expect(ds, 'StandardComponents.tsx was moved or renamed').toBeTruthy();
    const dsNames = chakraImports(codeOf(ds as string));
    for (const control of Object.keys(CONTROLS)) {
      expect(
        dsNames.has(control),
        `StandardComponents.tsx no longer imports Chakra's ${control}; ` +
          `${CONTROLS[control]} may have been removed, which would make this guard ban a ` +
          'control with nothing to replace it'
      ).toBe(true);
    }
  });

  it('exports every replacement it tells callers to use', () => {
    // A guard that names a component which does not exist sends the reader nowhere.
    const ds = codeOf(join(SRC, 'components/Design/StandardComponents.tsx'));
    for (const replacement of Object.values(CONTROLS)) {
      expect(ds, `${replacement} is named by this guard but not exported`).toContain(
        `export const ${replacement}`
      );
    }
  });

  it('never renders a raw Chakra form control outside components/Design/', () => {
    const offenders: { file: string; control: string; use: string }[] = [];

    for (const file of FILES) {
      const rel = relative(SRC, file).split('\\').join('/');
      if (rel.startsWith(DESIGN_SYSTEM)) continue;

      const code = codeOf(file);
      const imported = chakraImports(code);
      for (const [control, replacement] of Object.entries(CONTROLS)) {
        if (!imported.has(control)) continue;
        // `<Input` must not match `<InputGroup`, so the next character has to end the tag name.
        const rendered = new RegExp(`<${control}(?=[\\s/>])`);
        if (!rendered.test(code)) continue;
        offenders.push({ file: rel, control, use: replacement });
      }
    }

    expect(
      offenders,
      'These render a Chakra form control directly. MEASURED consequence for a select: white ' +
        'field on a gray.50 form, 6px corners against the app\u2019s 12px, and Chakra\u2019s ' +
        'stock BLUE focus ring, because the theme registers no Input/Select config. Import the ' +
        'design-system component instead: it is the same props plus the one shared ' +
        `treatment:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });
});
