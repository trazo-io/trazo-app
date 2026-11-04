/**
 * On the consumer journey, colour carries meaning or marks an action. Nothing else (2026-11-04).
 *
 * What this pass removed, all on the shopper's production page:
 *   - A hue per category: Pest & Disease RED (an alarm, on routine scouting), Crop Inputs orange,
 *     Weather blue, Soil yellow, Business teal, Harvest green. Same table again on the grouped
 *     card, the filter row and the timeline node icon. A category is a KIND of work, not a status.
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
 * Green stays where it means something checkable (the solid OMRI chip, a third-party match) or
 * marks an action (links, buttons, the selected filter). The one non-gray, non-green hue left is
 * the restricted-use badge: a regulatory status, which is what a status colour is for.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

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

  it('gives every chapter and category one neutral tone, keyed by nothing', () => {
    expect(CODE.journey).not.toMatch(/colorScheme:\s*['"]/); // no per-chapter scheme field
    expect(CODE.journey).not.toMatch(/categoryColor|bgColor:\s*['"]/);
    expect(CODE.journey).not.toMatch(/\$\{\s*\w+\.colorScheme\s*\}/); // `${ch.colorScheme}.50`
    expect(
      (CODE.journey.match(/STATUS_TONE_TOKENS\.neutral\.(circle|glyph)/g) ?? []).length
    ).toBeGreaterThanOrEqual(5);
    // The timeline node icon in the card: muted, not per type.
    expect(CODE.card).not.toMatch(/color=\{eventTypeConfig\.color\}/);
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
