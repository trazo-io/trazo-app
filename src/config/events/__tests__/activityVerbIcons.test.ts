/**
 * Guard: the activity picker stays one colour.
 *
 * MEASURED 2026-08-22, before this was enforced. `ActivityVerb` carried a `color` field and
 * `VerbPickerGrid` rendered each tile's glyph at `${verb.color}.500`, so the 14-tile
 * "What did you do?" modal shipped SEVEN hues at once. On white:
 *
 *   green.500          2.78   Planting · Field work · Seed search
 *   yellow.500 (Chakra) 2.39   Harvest · Soil & amendments
 *   orange.500 (Chakra)        not a Trazo token at all — the theme defines `amber`
 *   blue.500 / teal.500 (Chakra)
 *
 * Five of the fourteen glyphs failed the 3.0 a non-text mark owes. Worse, the SELECTED state
 * filled the tile with the same `${verb.color}.500` and put white text on it, so choosing
 * "Harvest" produced white on 2.39:1 — selection was the least legible state on the screen.
 *
 * None of it encoded anything: the label names the activity and the glyph distinguishes it.
 * The hue was decoration in the one place the design rules say colour must carry meaning.
 *
 * Asserted against the SOURCE because the failure mode is a config field coming back, not a
 * component misbehaving — and a re-added `color` would be invisible until someone opened the
 * modal and squinted at a yellow icon.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

import { ACTIVITY_VERBS } from '../../activityVerbs';

const VERB_CONFIG = join(__dirname, '../../activityVerbs.ts');
/*
 * Scoped to the picker, not to all of components/Events.
 *
 * MEASURED 2026-08-22: the wider directory carries 155 off-palette colour props that predate
 * this work — CarbonImpactPreview alone has 132. Asserting over all of it would fail on code
 * this change never touched, and a guard that is red for unrelated reasons gets muted, which
 * is worse than no guard. VerbPickerGrid is at 0 and this keeps it there.
 */
const PICKER_FILES = ['VerbPickerGrid.tsx'];
const EVENTS_COMPONENTS = join(__dirname, '../../../components/Events');

/** Colours allowed on a glyph in the picker. Everything else is a hue with no job. */
const ALLOWED_GLYPH_COLOURS = new Set([
  'green.600',
  'green.700',
  'green.800',
  'gray.200',
  'gray.500',
  'gray.600',
  'gray.700',
  'red.700',
  'white'
]);

describe('activity verb picker', () => {
  it('assigns no per-verb colour', () => {
    const src = readFileSync(VERB_CONFIG, 'utf8');
    // strip block comments so the explanation above does not trip its own guard
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const offenders = [...code.matchAll(/color:\s*'([a-z]+)'/g)].map((m) => m[1]);
    expect(
      offenders,
      `A per-verb colour re-creates the seven-hue sticker sheet. Style the tile in ` +
        `VerbPickerGrid instead:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });

  it('exposes no colour on the verb objects at runtime', () => {
    const withColour = ACTIVITY_VERBS.filter((v) => 'color' in (v as Record<string, unknown>));
    expect(withColour.map((v) => v.key)).toEqual([]);
  });

  it('renders picker glyphs only in approved colours', () => {
    const offenders: { file: string; line: number; colour: string }[] = [];
    for (const file of PICKER_FILES) {
      const src = readFileSync(join(EVENTS_COMPONENTS, file), 'utf8');
      src.split('\n').forEach((line, i) => {
        // An interpolated colour is the exact shape that produced this bug. Match the
        // template literal ANYWHERE on the line: the original was not `color={`...`}` but
        // `color={isSelected ? 'white' : `${verb.color}.500`}`, and a stricter pattern let a
        // mutation test walk straight past it.
        if (/`\$\{[^`]*\}\.\d{2,3}`/.test(line)) {
          offenders.push({ file, line: i + 1, colour: '(interpolated)' });
          return;
        }
        const m = line.match(/(?<![a-zA-Z])(?:color|bg|borderColor)="([a-zA-Z]+\.[0-9]+)"/);
        if (m && !ALLOWED_GLYPH_COLOURS.has(m[1])) {
          offenders.push({ file, line: i + 1, colour: m[1] });
        }
      });
    }
    expect(
      offenders,
      `Off-palette or interpolated colour in the picker. MEASURED on white: green.500 2.78, ` +
        `yellow.500 2.39, and Chakra's orange/blue/teal are not Trazo tokens:\n${JSON.stringify(
          offenders,
          null,
          2
        )}`
    ).toEqual([]);
  });

  it('has a non-vacuous corpus', () => {
    // If the config or the component directory moves, the assertions above would pass by
    // finding nothing to check. Fail loudly instead.
    expect(ACTIVITY_VERBS.length).toBeGreaterThan(10);
    // the picker file must still exist and still render tiles, or the colour assertion above
    // would pass by reading nothing
    const picker = readFileSync(join(EVENTS_COMPONENTS, PICKER_FILES[0]), 'utf8');
    expect(picker).toContain('ACTIVITY_VERBS.map');
  });
});
