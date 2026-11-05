/**
 * A suggestion is not an answer, so it never wears the colour of one (2026-11-04).
 *
 * Trazo's red line is suggest -> confirm: the catalogue, a template, a crew message or the
 * agent may PROPOSE, and a person at the farm makes it a record (§205.201(a)). Green is what an
 * accepted, applied or confirmed thing looks like in this app. The voice banner already followed
 * this ("the same green as the applied state it read as more final than it was", NewEvent.jsx);
 * its siblings did not:
 *   - OSP record types: a SUGGESTED row was green.50 with a green dashed border, and its basis
 *     in green text, before anyone ticked it.
 *   - OSP wizard: the "Suggestion" box under a question, green ground and a green wand.
 *   - Activity form: the PENDING crew-note banner, the season-plan item banner (whose own
 *     comment says the values on screen are the CATALOGUE's) and the applied-template banner,
 *     all green.50.
 * Same pass: registry chips coloured per source (OMRI purple, National List blue, WSDA teal) and
 * blue switches / "Active" badges in the summary-mode panels. Blue lives only in info alerts.
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

const OSP = 'src/views/Dashboard/OSP';
const FORMS = 'src/views/Dashboard/Dashboard/components/forms';
const RECORD_TYPES = code(`${OSP}/OSPRecordTypesPanel.tsx`);
const WIZARD = code(`${OSP}/OSPModuleWizard.tsx`);
const INPUTS = code(`${OSP}/OSPApprovedInputsPanel.tsx`);
const NEW_EVENT = code(`${FORMS}/NewEvent.jsx`);
const TABS = [
  'ProductionTab.jsx',
  'SoilManagementTab.jsx',
  'ChemicalTab-ENHANCED.jsx',
  'GeneralTab.jsx'
];

/** A marker that must occur exactly once: an ambiguous one would check the wrong block. */
function uniqueAt(src: string, marker: string): number {
  const at = src.indexOf(marker);
  expect(at, `marker not found: ${marker}`).toBeGreaterThan(0);
  expect(src.lastIndexOf(marker), `marker is not unique: ${marker}`).toBe(at);
  return at;
}

/** The JSX a condition guards: from the marker forward. */
function block(src: string, marker: string, span = 500): string {
  const at = uniqueAt(src, marker);
  return src.slice(at, at + span);
}

/** The banner around a message id: from the enclosing `<Box` to just past the id. */
function bannerAround(src: string, messageId: string): string {
  const at = uniqueAt(src, messageId);
  return src.slice(src.lastIndexOf('<Box', at), at + 80);
}

describe('a suggestion is not green', () => {
  it('OSP record types: a suggested row is neutral until ticked', () => {
    expect(RECORD_TYPES).toMatch(/const suggestedBg = useColorModeValue\('gray\./);
    expect(RECORD_TYPES).toMatch(/borderColor=\{isSuggested \? 'gray\.\d+'/);
    const basis = block(RECORD_TYPES, '{row.basis && (', 120);
    expect(basis).not.toMatch(/green\./);
  });

  it('OSP wizard: the suggestion box is neutral', () => {
    expect(WIZARD).toMatch(/const suggestionBg = useColorModeValue\('gray\./);
    expect(WIZARD).toMatch(/const suggestionBorder = useColorModeValue\('gray\./);
    expect(WIZARD).not.toMatch(/as=\{FaMagic\} color="green/);
    expect(WIZARD).toMatch(
      /const suggestionIconColor = useColorModeValue\('gray\.\d+', 'gray\.300'\)/
    );
  });

  it.each([
    // A PENDING crew note, the season-plan item (the catalogue's values), an applied template.
    ["id: 'events.fieldNote.loggingFrom'"],
    ["id: 'seasonPlan.logFromPlanNote'"],
    ["id: 'events.template.applied'"]
  ])('activity form: the banner around %s is neutral', (messageId) => {
    const banner = bannerAround(NEW_EVENT, messageId);
    expect(banner).toMatch(/<Box/);
    expect(banner).not.toMatch(/green\./);
  });

  it('registry chips are gray, not a colour per source', () => {
    expect(INPUTS).not.toMatch(/colorScheme="(purple|blue|teal)"/);
    expect(INPUTS).not.toMatch(/badgeScheme=("|\{[^}]*)['"]?(purple|blue|teal)/);
    expect(INPUTS).not.toMatch(/renderNationalListChip\([^,]+,\s*'(purple|blue|teal)'/);
  });

  it('no blue switch or badge in the activity form', () => {
    // The whole file, not tag by tag: a tag regex stops at the `>` inside `(e) =>`, and these
    // Switches put onChange before colorScheme, so a per-tag check passed vacuously.
    for (const f of [...TABS, 'NewEvent.jsx']) {
      expect(code(`${FORMS}/${f}`), f).not.toMatch(/colorScheme="blue"/);
    }
  });
});
