/**
 * Guard: an event-form section badge must not tell the farmer that carbon data is
 * required, and must not use carbon jargon.
 *
 * Nothing about carbon, emissions, fuel use, equipment hours or energy appears anywhere
 * in 7 CFR 205, the Common OSP template, the four USDA workbooks, or the 25 NOP crop
 * documentation forms. Three badges nonetheless said otherwise — "Carbon Critical" sat on
 * the section holding Production Type (the field the whole record hangs off) and
 * "Carbon Calculation Required" sat on the Area section that § 205.103(b)(2) completeness
 * actually depends on. Both taught the farmer the opposite of what matters.
 *
 * Badges now name a DESTINATION, which is a checkable fact about our own code, rather
 * than a legal necessity, which would be a claim we cannot support:
 *   "Certifier record" · "Certifier record + buyer page"
 *   "Optional — carbon only" · "Optional — buyer page"
 *
 * ⚠️ This file must resolve BOTH forms of badge, and that is the whole point of it.
 * The first version scanned only `badge="literal"`. The moment those four strings were
 * moved behind `intl.formatMessage`, the guard stopped seeing the exact badges it was
 * written to protect — and kept passing, because ~22 unrelated literals were still there
 * to satisfy the non-vacuity check. A guard that silently narrows its own scope is worse
 * than no guard. Resolve the message id through the locale file, and assert parity so a
 * key cannot be added in English only.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const FORMS_DIR = join(__dirname, '../../../views/Dashboard/Dashboard/components/forms');
const LANG_DIR = join(__dirname, '../../../i18n/lang');

const EN: Record<string, string> = JSON.parse(readFileSync(join(LANG_DIR, 'en-US.json'), 'utf8'));
const ES: Record<string, string> = JSON.parse(readFileSync(join(LANG_DIR, 'es-419.json'), 'utf8'));

interface Badge {
  file: string;
  badge: string;
  key?: string;
}

/** Every section badge, whether written as a literal or resolved through i18n. */
const badgesInRepo = (): Badge[] => {
  const out: Badge[] = [];
  for (const file of readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f))) {
    const src = readFileSync(join(FORMS_DIR, file), 'utf8');

    for (const m of src.matchAll(/badge="([^"]+)"/g)) {
      out.push({ file, badge: m[1] });
    }
    // badge={intl.formatMessage({ id: 'events.section.badge.x' })} — prettier may wrap it,
    // so match the id inside the expression rather than the whole call on one line.
    for (const m of src.matchAll(/badge=\{[^}]*?id:\s*'([^']+)'/g)) {
      const key = m[1];
      out.push({ file, key, badge: EN[key] ?? `‹UNRESOLVED ${key}›` });
    }
  }
  return out;
};

/**
 * Every field name a section registers, by EITHER route.
 *
 * ⚠️ `name="x"` alone is not the set. Three sections register through
 * `methods.register('x')` instead, and a scan that matched only the first form saw them as
 * empty — so the "carbon only" check skipped them and the "needs a badge" check excused
 * them. PestManagementTab's beneficial_insects_used / chemical_free_period_days sat under
 * "Optional — buyer page" and a description reading "not part of the records your certifier
 * reviews" while both fields printed in the certifier packet, because this regex could not
 * see them.
 */
const fieldsIn = (body: string): string[] => [
  ...new Set([
    ...[...body.matchAll(/name="([a-z_]+)"/g)].map((n) => n[1]),
    ...[...body.matchAll(/register\(\s*['"`]([a-z_]+)['"`]/g)].map((n) => n[1])
  ])
];

/**
 * The certifier packet builder, read as text: a field is in the packet if it names it.
 *
 * Read lazily. At module scope a missing sibling checkout throws during import and takes
 * every test in this file with it, including the ones that only need the form sources — the
 * failure would read as "badges are broken" when the truth is "the backend isn't here".
 * It is not skipped either: a guard that quietly opts out is the thing it was written against.
 */
const PACKET_PATH = join(
  __dirname,
  '../../../../../trazo-back/history/services/audit_export_service.py'
);
const packetSource = (): string => {
  try {
    return readFileSync(PACKET_PATH, 'utf8');
  } catch {
    throw new Error(
      `Cannot read the certifier packet builder at ${PACKET_PATH}. This guard compares form ` +
        `badges against what the packet actually prints, so it needs the trazo-back checkout ` +
        `beside trazo-app. Restore it rather than deleting this test.`
    );
  }
};

describe('event form section badges', () => {
  it('resolves both literal and i18n badges, and finds enough to be non-vacuous', () => {
    const all = badgesInRepo();
    expect(all.length).toBeGreaterThan(20);
    // The four destination badges are the ones this file exists to protect. If they stop
    // being found — renamed, inlined, moved behind a different prop — every assertion
    // below silently stops covering them, which is how the first version of this guard
    // failed. Prove they are still in scope.
    const destinations = all.filter(({ badge }) => /^(Certifier record|Optional —)/.test(badge));
    expect(
      destinations.length,
      'the destination badges are no longer visible to this guard'
    ).toBeGreaterThanOrEqual(20);
  });

  it('resolves every referenced message id', () => {
    const unresolved = badgesInRepo().filter(({ badge }) => badge.startsWith('‹UNRESOLVED'));
    expect(
      unresolved,
      `badge message ids missing from en-US.json:\n${JSON.stringify(unresolved, null, 2)}`
    ).toEqual([]);
  });

  it('keeps every badge key in both locales', () => {
    const missing = badgesInRepo()
      .filter((b) => b.key && !(b.key in ES))
      .map((b) => b.key);
    expect(
      missing,
      `badge keys present in en-US but not es-419: ${JSON.stringify(missing)}`
    ).toEqual([]);
  });

  it('only badges a section "carbon only" when every field in it is carbon', () => {
    // The check my own bulk rename skipped. I renamed 27 badges by their OLD text
    // ("Efficiency Calculation", "Scope-1 Fuel", "Carbon Calculation") without opening the
    // sections, and swept in "Application Rate & Coverage" (volume, area, concentration,
    // method — the core § 205.103(b)(2) input record), "Environmental Context"
    // (applied_scope, buffer_zone_meters, target_pest_disease) and a section holding
    // seed_certification_status / seed_lot_number (§ 205.204). Reasoning from a label
    // instead of from the contents is what this asserts against.
    const CARBON =
      /^(fuel_|application_fuel_|equipment_hours|production_efficiency|operation_efficiency|electricity_source|transportation_|carbon_)/;
    // `equipment_used` is the machine LABEL on a fuel row, not a § 205.272 record: equipment
    // cleanout has its own model (`History.equipment_cleaning_event`, with an asset-class field
    // and a validator forbidding self-reference), and the soil equipment table that printed
    // this column is now out of the organic packet entirely — its rows were SELECTED by
    // "has fuel or hours", which made it an arbitrary subset under a complete-looking heading.
    const CARBON_LABEL = new Set(['equipment_used']);
    const IGNORE = new Set(['production_method', ...CARBON_LABEL]); // duplicate writer of a production-level fact
    const offenders: string[] = [];

    for (const file of readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f))) {
      const src = readFileSync(join(FORMS_DIR, file), 'utf8');
      for (const m of src.matchAll(/<(SectionHeader|CollapsibleSection)\b[\s\S]*?(?:\/>|>)/g)) {
        const head = m[0];
        if (!head.includes('badge.optionalCarbon')) continue;
        const title = /title="([^"]+)"/.exec(head)?.[1] ?? '(untitled)';
        const closeTag = m[1] === 'CollapsibleSection' ? '</CollapsibleSection>' : '</SectionBox>';
        const end = src.indexOf(closeTag, m.index! + head.length);
        const body = src.slice(m.index! + head.length, end === -1 ? undefined : end);
        const names = fieldsIn(body).filter((n) => !IGNORE.has(n));
        const nonCarbon = names.filter((n) => !CARBON.test(n));
        if (nonCarbon.length)
          offenders.push(`${file} :: ${title} holds ${JSON.stringify(nonCarbon)}`);
      }
    }
    expect(
      offenders,
      `these sections are labelled "carbon only" but hold certifier fields:\n  ${offenders.join(
        '\n  '
      )}`
    ).toEqual([]);
  });

  it('gives every section that collects data a destination badge', () => {
    // "Chemical Application Details" — Chemical Type, Commercial Name, Active Ingredient,
    // twenty fields, twelve of them in the certifier packet — had NO badge at all, while the
    // section directly beneath it did. A farmer reading down the form got an indicator, then
    // nothing, then an indicator. Absence of a badge is not a neutral default; it is a gap
    // exactly where the most important fields live.
    const DESTINATIONS =
      /events\.section\.badge\.|fieldDetails\.badge|production\.\w+\.(summary)?[Bb]adge/;
    const missing: string[] = [];

    for (const file of readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f))) {
      if (file === 'NewEvent.jsx') continue; // step indicators, not data sections
      const src = readFileSync(join(FORMS_DIR, file), 'utf8');
      for (const m of src.matchAll(/<(SectionHeader|CollapsibleSection)\b[\s\S]*?(?:\/>|>)/g)) {
        const head = m[0];
        const closeTag = m[1] === 'CollapsibleSection' ? '</CollapsibleSection>' : '</SectionBox>';
        const end = src.indexOf(closeTag, m.index! + head.length);
        const body = src.slice(m.index! + head.length, end === -1 ? undefined : end);
        const fieldCount = fieldsIn(body).length;
        if (fieldCount === 0) continue; // a heading with no inputs needs no destination
        if (!DESTINATIONS.test(head)) {
          const title = /title=[{"]([^"}]*)/.exec(head)?.[1] ?? '(untitled)';
          missing.push(`${file} :: ${title.slice(0, 60)} (${fieldCount} fields)`);
        }
      }
    }
    expect(
      missing,
      `sections collecting data with no destination badge:\n  ${missing.join('\n  ')}`
    ).toEqual([]);
  });

  /**
   * Sections badged "optional — buyer page" whose fields the certifier packet actually prints.
   * Factored out of the test body so the SAME logic can be run against a synthetic source —
   * see the mechanism check below.
   */
  const buyerOnlySectionsThatArePacketFields = (
    sources: Array<{ file: string; src: string }>,
    packet: string
  ): string[] => {
    const offenders: string[] = [];
    for (const { file, src } of sources) {
      for (const m of src.matchAll(/<(SectionHeader|CollapsibleSection)\b[\s\S]*?(?:\/>|>)/g)) {
        const head = m[0];
        if (!head.includes('badge.optionalBuyer')) continue;
        const closeTag = m[1] === 'CollapsibleSection' ? '</CollapsibleSection>' : '</SectionBox>';
        const end = src.indexOf(closeTag, m.index! + head.length);
        const body = src.slice(m.index! + head.length, end === -1 ? undefined : end);
        const inPacket = fieldsIn(body).filter((n) => packet.includes(n));
        if (inPacket.length) {
          const title = /title=[{"]([^"}]*)/.exec(head)?.[1] ?? '(untitled)';
          offenders.push(
            `${file} :: ${title.slice(0, 50)} — packet prints ${JSON.stringify(inPacket)}`
          );
        }
      }
    }
    return offenders;
  };

  it('detects a "buyer page only" badge sitting on a packet field', () => {
    // ⚠️ THE MECHANISM CHECK, and it is not decoration.
    //
    // No section currently carries `optionalBuyer` — the last two were corrected when this
    // guard was written. So the repo-wide test below iterates NOTHING and passes on an empty
    // array: it is dormant, and a dormant guard that looks green is the exact trap this file
    // was written against (see the header note about the badge scan that silently narrowed).
    //
    // Running the same function over a synthetic section proves the detection still works,
    // whatever the repo happens to contain today. `performed_by` is named by the packet
    // builder, so a section claiming it is buyer-page-only must be flagged.
    const synthetic = {
      file: 'synthetic.jsx',
      src: `<SectionHeader badge={intl.formatMessage({ id: 'events.section.badge.optionalBuyer' })} title="Fake" />
              <StandardInput name="performed_by" />
            </SectionBox>`
    };
    const found = buyerOnlySectionsThatArePacketFields([synthetic], packetSource());
    expect(found.length, 'the buyer-page detector stopped detecting').toBe(1);
    expect(found[0]).toContain('performed_by');
  });

  it('never says "buyer page only" about a field the certifier packet prints', () => {
    // The mirror of the carbon-only check, and the one that was missing. A destination badge
    // is only worth having if BOTH directions are enforced: saying "certifier record" about
    // scratch data misleads one way, and saying "optional — buyer page" about § 205.206(b)
    // biological-control evidence misleads the other — it invites a farmer to skip a field
    // an inspector will read. The packet builder is read as the source of truth, so this
    // fails the moment a badge and the packet disagree, whichever of the two moved.
    const sources = readdirSync(FORMS_DIR)
      .filter((f) => /\.(jsx|tsx)$/.test(f))
      .map((file) => ({ file, src: readFileSync(join(FORMS_DIR, file), 'utf8') }));
    const offenders = buyerOnlySectionsThatArePacketFields(sources, packetSource());
    expect(
      offenders,
      `sections badged "optional — buyer page" whose fields reach the certifier packet:\n  ${offenders.join(
        '\n  '
      )}`
    ).toEqual([]);
  });

  it('warns the farmer whenever a section carries words a shopper will read', () => {
    // `observation` is quoted verbatim to shoppers — ConsumerEventCard.tsx:1496 renders
    // {event.observation} inside quote marks as the farmer's field notes. Seven forms carry
    // an identically-named "Farmer's Field Notes & Consumer Transparency" section; five said
    // "Certifier record + buyer page" and two said only "Certifier record". Understating the
    // audience is the worse direction of this error: a farmer writes something meant for their
    // inspector and finds it on a public product page.
    const offenders: string[] = [];
    for (const file of readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f))) {
      const src = readFileSync(join(FORMS_DIR, file), 'utf8');
      for (const m of src.matchAll(/<(SectionHeader|CollapsibleSection)\b[\s\S]*?(?:\/>|>)/g)) {
        const head = m[0];
        const closeTag = m[1] === 'CollapsibleSection' ? '</CollapsibleSection>' : '</SectionBox>';
        const end = src.indexOf(closeTag, m.index! + head.length);
        const body = src.slice(m.index! + head.length, end === -1 ? undefined : end);
        if (!fieldsIn(body).includes('observation')) continue;
        if (!head.includes('badge.certifierRecordAndBuyer')) {
          const badge = /badge\.(\w+)'/.exec(head)?.[1] ?? '(no badge)';
          offenders.push(`${file} :: holds observation but says "${badge}"`);
        }
      }
    }
    expect(
      offenders,
      `sections whose text reaches shoppers without saying so:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });

  it('never carries two badge props on one section', () => {
    // A scripted badge rewrite prepended a second `badge=` onto sections whose existing badge
    // used a differently-shaped i18n key. JSX silently keeps the last one, so the page looked
    // unchanged and the intended fix was inert.
    const dupes: string[] = [];
    for (const file of readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f))) {
      const src = readFileSync(join(FORMS_DIR, file), 'utf8');
      for (const m of src.matchAll(/<(SectionHeader|CollapsibleSection)\b[\s\S]*?(?:\/>|>)/g)) {
        const n = (m[0].match(/\bbadge=/g) ?? []).length;
        if (n > 1) dupes.push(`${file} :: ${n} badge props`);
      }
    }
    expect(dupes, `duplicate badge props:\n  ${dupes.join('\n  ')}`).toEqual([]);
  });

  it('never tells the farmer that carbon data is required', () => {
    const offenders = badgesInRepo().filter(
      ({ badge }) =>
        /carbon|emission|fuel|scope-?[123]/i.test(badge) && /required|critical/i.test(badge)
    );
    expect(
      offenders,
      `carbon is required by no clause, template or workbook:\n${JSON.stringify(
        offenders,
        null,
        2
      )}`
    ).toEqual([]);
  });

  it('does not put Scope 1/2/3 jargon in front of a grower', () => {
    const offenders = badgesInRepo().filter(({ badge }) => /scope-?\s?[123]\b/i.test(badge));
    expect(offenders, `use plain words: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  it('labels every carbon-only section as optional', () => {
    const offenders = badgesInRepo().filter(
      ({ badge }) =>
        /^(carbon|efficiency|improves carbon|ipcc)/i.test(badge) && !/optional/i.test(badge)
    );
    expect(
      offenders,
      `a carbon section must say it is optional:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });
  /**
   * The badge's COLOUR is not the author's to choose.
   *
   * This file guarded the badge STRING and never the colour, so while the words held, the
   * same string — `events.section.badge.certifierRecord`, plus three duplicate keys emitting
   * the byte-identical "Certifier record" — shipped in green, orange, red, teal AND blue on
   * the activity forms, with `iconColor` spread across eleven hues beside it. Callers read
   * `badgeColorScheme` as decoration; a farmer reads two colours as two meanings.
   *
   * `SectionHeader` / `CollapsibleSection` / `SectionBox` now expose no colour prop at all.
   * The only distinction left is `badgeTone`, which is semantic: 'certifier' (an inspector
   * reads this section) vs 'optional' (they do not).
   */
  it('exposes no colour choice on a section component', () => {
    const BANNED = ['badgeColorScheme', 'iconColor', 'variant'];
    const offenders: { file: string; prop: string; line: number }[] = [];
    for (const file of readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f))) {
      const src = readFileSync(join(FORMS_DIR, file), 'utf8');
      for (const m of src.matchAll(
        /<(SectionHeader|CollapsibleSection|SectionBox)\b([\s\S]*?)>/g
      )) {
        for (const prop of BANNED) {
          if (new RegExp(`(?<![A-Za-z_])${prop}=`).test(m[2])) {
            offenders.push({ file, prop, line: src.slice(0, m.index).split('\n').length });
          }
        }
      }
    }
    expect(
      offenders,
      `a section component takes no colour — use badgeTone for meaning:\n${JSON.stringify(
        offenders,
        null,
        2
      )}`
    ).toEqual([]);
  });

  /** An "Optional" badge must not wear the certifier tone, and vice versa. */
  it('marks optional sections with the optional tone', () => {
    const offenders: { file: string; badge: string; issue: string }[] = [];
    for (const file of readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f))) {
      const src = readFileSync(join(FORMS_DIR, file), 'utf8');
      for (const m of src.matchAll(/<(SectionHeader|CollapsibleSection)\b([\s\S]*?)>/g)) {
        const seg = m[2];
        const idMatch = seg.match(/badge=\{[^}]*?id:\s*'([^']+)'/) ?? seg.match(/badge="([^"]+)"/);
        if (!idMatch) continue;
        const text = EN[idMatch[1]] ?? idMatch[1];
        const isOptional = /^optional\b/i.test(text);
        const hasTone = /badgeTone="optional"/.test(seg);
        if (isOptional && !hasTone) {
          offenders.push({ file, badge: text, issue: 'optional badge missing badgeTone' });
        }
        if (!isOptional && hasTone) {
          offenders.push({ file, badge: text, issue: 'required badge marked optional' });
        }
      }
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});
