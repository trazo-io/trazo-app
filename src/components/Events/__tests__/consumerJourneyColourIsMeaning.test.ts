/**
 * On the consumer journey, colour carries meaning, marks an action, or helps a shopper find a
 * category. It never grades anything (2026-11-04).
 *
 * What this pass changed, all on the shopper's production page:
 *   - Category hues lived in four tables, with Pest & Disease RED (an alarm, on routine
 *     scouting) and Crop Inputs ORANGE (the restricted-use warning's colour). Category colour is
 *     wayfinding and stays, from ONE palette (categoryTone.ts) that holds no status colour.
 *     Oscar chose it from rendered options: soil yellow, care blue, inputs purple, pest teal,
 *     harvest green, farm records gray.
 *   - Aggregate cards tinted per input (fungicide purple, fertilizer blue, scouting green).
 *   - A traffic-light pest-pressure badge: LOW green, HIGH red. A reading the farmer wrote down,
 *     turned into a verdict on the crop.
 *   - The "allowed for organic use" pill, self-reported, rendering a GREEN ring: Chakra's base
 *     `outline` variant adds an inset box-shadow in the badge's colorScheme, and a badge that
 *     passes none gets the theme default, green, over the gray border the code set.
 *     The code's own comment said a self-reported signal must not be dressed as verification.
 *   - A green "ALL RECORDED" badge with a verified-seal icon, counting `blockchain_verified`
 *     events. noClaimKeyedStyling.test.ts did not see it: it was a conditional RENDER off a
 *     derived count, not a style prop keyed on the field.
 *   - A green eco line, "Scouting adds no emissions ... helps avoid unnecessary spraying": a
 *     benefit Trazo wrote, not the farm.
 *
 * Outside the palette file, green stays where it means something checkable (the solid OMRI chip,
 * a third-party match) or marks an action (links, buttons, the selected filter). The one other
 * hue written in the journey or card is the restricted-use badge: a regulatory status, which is
 * what a status colour is for.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_HUE,
  EVENT_TYPE_HUE,
  categoryTone,
  eventTypeTone
} from 'components/Events/categoryTone';

const STATUS_HUES = ['red', 'orange'];

const FILES = {
  card: 'src/components/Events/ConsumerEventCard.tsx',
  journey: 'src/views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx'
};
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const stripComments = (code: string) =>
  code
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
const CODE = Object.fromEntries(
  Object.entries(FILES).map(([k, p]) => [k, stripComments(read(p))])
) as Record<keyof typeof FILES, string>;

const HUE = /['"`](red|orange|yellow|blue|purple|teal|cyan|pink)(\.\d{2,3})?['"`]/g;

/** Every Chakra `<Badge ... variant="outline" ...>` opening tag in a file, as text. */
function outlineBadges(path: string): string[] {
  const src = ts.createSourceFile(
    path,
    read(path),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) &&
      n.tagName.getText(src) === 'Badge'
    ) {
      const variant = n.attributes.properties.find(
        (a) => ts.isJsxAttribute(a) && a.name.getText(src) === 'variant'
      );
      // A literal "outline" or any expression that can produce it (`cond ? 'solid' : 'outline'`).
      if (variant && /outline/.test(variant.getText(src))) out.push(n.getText(src));
    }
    n.forEachChild(visit);
  };
  visit(src);
  return out;
}

describe('consumer journey: colour is meaning, not decoration', () => {
  it('reads both files (guards the guard)', () => {
    expect(CODE.card.length).toBeGreaterThan(50_000);
    expect(CODE.journey.length).toBeGreaterThan(50_000);
    expect(CODE.journey).toMatch(/CHAPTER_DEFS/);
    expect(outlineBadges(FILES.card).length).toBeGreaterThan(0);
  });

  it('paints no category, subtype or reading in a hue', () => {
    const hits = (Object.keys(FILES) as Array<keyof typeof FILES>).flatMap((k) =>
      [...CODE[k].matchAll(HUE)].map((m) => {
        const line = CODE[k].slice(0, m.index).split('\n').length;
        return `${FILES[k]}: ${CODE[k].split('\n')[line - 1].trim()}`;
      })
    );
    // The single allowed hue: the restricted-use pesticide badge, a regulatory status.
    expect(hits).toEqual([`${FILES.card}: colorScheme="orange"`]);
    expect(CODE.card).toMatch(
      /consumer\.eventCard\.restrictedUse\.tooltip[\s\S]{0,400}colorScheme="orange"/
    );
  });

  it('takes every category colour from the one palette, which holds no status colour', () => {
    // No hue field or computed scheme in the journey: categories read categoryTone.ts.
    expect(CODE.journey).not.toMatch(/colorScheme:\s*['"]/);
    expect(CODE.journey).not.toMatch(/categoryColor|bgColor:\s*['"]/);
    expect(CODE.journey).not.toMatch(/\$\{\s*\w+\.colorScheme\s*\}/); // `${ch.colorScheme}.50`
    expect(
      (CODE.journey.match(/(categoryTone\(CHAPTER_HUE\[|eventTypeTone\()/g) ?? []).length
    ).toBeGreaterThanOrEqual(5);
    expect(CODE.card).toMatch(/color=\{eventTypeTone\(event\.event_type\)\.glyph\}/);
    // Wayfinding, never a status: red and orange mean "wrong" and "caution" everywhere else,
    // and orange is this page's restricted-use warning.
    const hues = [...Object.values(CHAPTER_HUE), ...Object.values(EVENT_TYPE_HUE)];
    expect(hues.filter((h) => STATUS_HUES.includes(h as string))).toEqual([]);
    for (const t of [0, 1, 2, 3, 4, 5, 6, 7]) {
      expect(eventTypeTone(t).glyph).not.toMatch(/^(red|orange)\./);
    }
    // Farm records stay gray (Run 8, R8-15), and pest is no longer an alarm.
    expect(CHAPTER_HUE.trust).toBe('gray');
    expect(categoryTone(CHAPTER_HUE.pest).glyph).not.toMatch(/^red\./);
  });

  it("draws no outlined badge with Chakra's inset ring in the default green", () => {
    for (const tag of outlineBadges(FILES.card)) {
      expect(tag, 'outline Badge: pass colorScheme="gray" or boxShadow="none"').toMatch(
        /colorScheme="gray"|boxShadow="none"/
      );
    }
  });

  it('carries no seal or eco icon and no green "impact" line', () => {
    for (const k of Object.keys(FILES) as Array<keyof typeof FILES>) {
      expect(CODE[k], FILES[k]).not.toMatch(/\bMd(Verified|Eco)\b/);
    }
    const impact = CODE.card.match(/[^\n]*\n[^\n]*\{eventInfo\.consumerImpact\}/)?.[0] ?? '';
    expect(impact, 'consumerImpact render site').not.toBe('');
    expect(impact).not.toMatch(/green|Leaf/i);
  });
});
