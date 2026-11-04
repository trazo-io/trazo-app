/**
 * On the shopper's product page, green and the leaf belong to a checkable claim, never to the
 * farm's own say-so (2026-11-04). Brand-green SECTION icons stay: they are uniform across every
 * section and encode nothing.
 *
 * What this pass found, around the journey:
 *   - Green BADGES as plain labels: "Field Map", the farm type, a completed-productions count,
 *     and the farming method coloured organic green / conventional blue / regenerative purple
 *     (the farm TYPE was coloured through the same map). The theme renders `colorScheme="green"`
 *     as a solid Trazo-green pill, the shape and colour of the one verified chip on the page.
 *   - A green bordered "production method" box on the batch card, commented "Prominent for
 *     organic/sustainable/regenerative", fed by a field the owner-only summary labels
 *     "Certified Organic" from the farm's own dropdown. Dormant on the public payload, armed.
 *   - A green CHECK on the photo count (its own comment called the tick "a claim of field
 *     evidence"), green leaves on the farm's self-recorded organic-inputs line and practice list,
 *     a green "entered by the farm" note with a leaf.
 *   - A green-tinted EMISSIONS card with leaf bullets beside diesel and fertilizer.
 *   - Farm-written parcel copy headed "WHAT MAKES THIS PARCEL SPECIAL" in a green box.
 *   - In the farm and parcel modals: the farm's water sources green, soil-health practices
 *     ORANGE (caution), irrigation blue; the farm's own "Message to Consumers" under a blue
 *     CHECK-circle; a blue "Current Production" panel.
 *   - A dead `ProductDetailsSection` carrying `sustainabilityScore`, `organicCertified`,
 *     `fairTrade` and a blue GRADE badge, exported and mounted nowhere.
 *
 * Out of scope here: CompanyModal's certification and plan badges are documented dormant at
 * their call site (CompanyFarmInfo.tsx: the public company block has no such keys).
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const DIR = 'src/views/Scan/ProductDetail';
const LIVE = [
  `${DIR}/ProductDetail.tsx`,
  `${DIR}/components/HarvestInfoCard.tsx`,
  `${DIR}/components/ParcelMapInfo.tsx`,
  `${DIR}/components/CompanyFarmInfo.tsx`,
  `${DIR}/components/FarmModal.tsx`,
  `${DIR}/components/ParcelModal.tsx`,
  'src/components/Education/CarbonImpactExplainer.tsx'
];
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const code = (p: string) =>
  read(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

/** `<Badge>` opening tags whose colorScheme is green or computed (a colour picked per value). */
function colouredBadges(path: string): string[] {
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
      for (const a of n.attributes.properties) {
        if (!ts.isJsxAttribute(a) || a.name.getText(src) !== 'colorScheme' || !a.initializer)
          continue;
        const v = a.initializer.getText(src);
        // The one legitimate computed colour: green ONLY for a USDA Organic Integrity Database
        // match (transparency-first.md: USDA Organic = "Verified" green, others gray).
        if (v === "{isDatabaseVerified ? 'green' : 'gray'}") continue;
        if (v !== '"gray"')
          out.push(`${path}: ${n.getText(src).replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    n.forEachChild(visit);
  };
  visit(src);
  return out;
}

describe('product page: green is not a claim', () => {
  it('reads the live components (guards the guard)', () => {
    for (const p of LIVE) expect(existsSync(resolve(process.cwd(), p)), p).toBe(true);
    expect(code(`${DIR}/ProductDetail.tsx`).length).toBeGreaterThan(50_000);
  });

  it('labels no badge in a status or verified colour', () => {
    expect(LIVE.flatMap(colouredBadges)).toEqual([]);
  });

  it("never renders the farm's production method on the batch card", () => {
    const card = code(`${DIR}/components/HarvestInfoCard.tsx`);
    expect(card).not.toMatch(/production_method/);
    expect(card).not.toMatch(/FaLeaf|borderLeftColor="green/);
  });

  it("puts no check, leaf or green on the farm's own records", () => {
    const pd = code(`${DIR}/ProductDetail.tsx`);
    const photo = pd.indexOf("id: 'consumer.howGrown.photosIncluded'");
    expect(photo).toBeGreaterThan(0);
    expect(pd.slice(pd.lastIndexOf('<Icon', photo), photo)).not.toMatch(/FaCheckCircle/);
    const inputs = pd.indexOf("id: 'consumer.organic.story.allInputsApproved'");
    expect(inputs).toBeGreaterThan(0);
    expect(pd.slice(pd.lastIndexOf('<Icon', inputs), inputs)).not.toMatch(/green\./);
    const practice = pd.indexOf('as={iconFor(p.key)}');
    expect(practice).toBeGreaterThan(0);
    expect(pd.slice(practice, practice + 80)).not.toMatch(/green\./);
  });

  it("frames farm-written parcel copy as the farm's, not as Trazo's praise", () => {
    const parcel = code(`${DIR}/components/ParcelMapInfo.tsx`);
    expect(parcel).not.toMatch(/whatMakesParcelSpecial/);
    const at = parcel.indexOf('parcelData?.transparency_description &&');
    expect(at).toBeGreaterThan(0);
    expect(parcel.slice(at, at + 500)).not.toMatch(/green\.|FaLeaf/);
  });

  it('shows emissions on a plain card, without leaves', () => {
    const carbon = code('src/components/Education/CarbonImpactExplainer.tsx');
    expect(carbon).toMatch(/cardBg = useColorModeValue\('white'/);
    expect(carbon).not.toMatch(/FaLeaf/);
  });

  it('keeps the dead grade/score section deleted', () => {
    expect(existsSync(resolve(process.cwd(), `${DIR}/components/ProductDetailsSection.tsx`))).toBe(
      false
    );
    expect(read(`${DIR}/components/index.ts`)).not.toMatch(/ProductDetailsSection/);
  });
});
