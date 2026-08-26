/**
 * The six OSP sections, their § 205.201(a) citations, and the empty-state copy that names them.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * VERIFIED 2026-08-25 against the current regulation — 7 CFR 205.201, 65 FR 80637 (21 Dec
 * 2000) as amended at 88 FR 3622 (19 Jan 2023, the Strengthening Organic Enforcement rule,
 * compliance date 19 Mar 2024). Paragraph (a) has exactly SIX numbered items and the app's
 * key→subparagraph mapping is correct as it stands. This test exists to keep it that way,
 * because a citation is the one kind of copy that goes stale without anyone touching the code.
 *
 * Two things the numbers alone do not carry, both asserted below:
 *
 *   1. SOE amended (a)(3) ITSELF. It is no longer only "monitoring practices and procedures
 *      … to verify that the plan is effectively implemented" — it now also requires a
 *      description of how the operation verifies suppliers and the organic status of what it
 *      receives, and prevents organic fraud. The section label and prompt must say so.
 *
 *   2. § 205.201 does NOT stop at (a). (b) permits substituting an equivalent plan filed
 *      under another Federal/State/local program; (c) requires a producer group operation to
 *      describe its internal control system in ten enumerated parts. ICS is therefore NOT an
 *      (a)(6) "additional information deemed necessary by the certifying agent" topic, which
 *      is what the (a)(6) prompt used to imply.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import { OSP_SECTION_KEYS } from '../../../../types/osp';

const SOURCE = readFileSync(resolve(__dirname, '..', 'OSPView.tsx'), 'utf8');
const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;

/**
 * key → subparagraph, in regulation order. Written out rather than derived, because this IS
 * the claim under test: deriving it from the catalogue would only assert the catalogue
 * matches itself.
 */
const SECTION_TO_SUBPARAGRAPH: Array<[string, string]> = [
  ['practices_procedures', '§ 205.201(a)(1)'],
  ['inputs_list', '§ 205.201(a)(2)'],
  ['monitoring_plan', '§ 205.201(a)(3)'],
  ['recordkeeping_description', '§ 205.201(a)(4)'],
  ['commingling_barriers', '§ 205.201(a)(5)'],
  ['additional_certifier_info', '§ 205.201(a)(6)']
];

describe('OSP section citations', () => {
  it('reads the view (guards the guard)', () => {
    expect(SOURCE).toContain('SECTION_PROMPTS');
    expect(SOURCE.length).toBeGreaterThan(20_000);
  });

  it('the cheat sheet covers the canonical key list, in the same order', () => {
    /*
     * `OSP_SECTION_KEYS` is the type-level source of truth and mirrors the backend's frozen
     * tuple (`certifications/models.py`). If a key is added there, the empty state must stop
     * saying "Six required sections" — this ties the sentence to the list rather than leaving
     * a prose count to drift on its own.
     */
    expect([...OSP_SECTION_KEYS]).toEqual(SECTION_TO_SUBPARAGRAPH.map(([key]) => key));
    expect(OSP_SECTION_KEYS).toHaveLength(6);
  });

  it('there are exactly six sections, in regulation order', () => {
    /*
     * The empty state says "Six required sections". If a seventh card ever appears — or one
     * disappears — that sentence becomes false, and it is the kind of false a certifier
     * notices before the farmer does.
     */
    const ordered = [...SOURCE.matchAll(/\{ key: '([a-z_]+)', promptId:/g)].map((m) => m[1]);

    expect(ordered).toEqual(SECTION_TO_SUBPARAGRAPH.map(([key]) => key));
  });

  it('each section cites its own subparagraph, in both locales', () => {
    for (const [key, cite] of SECTION_TO_SUBPARAGRAPH) {
      expect(EN[`osp.section.cfr.${key}`], `${key} EN`).toBe(cite);
      expect(ES[`osp.section.cfr.${key}`], `${key} ES`).toBe(cite);
    }
  });

  it('no two sections share a citation', () => {
    // Anti-vacuity for the case above: six copies of "(a)(1)" would satisfy nothing useful,
    // and a copy-paste is exactly how that happens.
    const cites = SECTION_TO_SUBPARAGRAPH.map(([key]) => EN[`osp.section.cfr.${key}`]);

    expect(new Set(cites).size).toBe(6);
  });

  it('the (a)(3) copy carries the SOE addition', () => {
    /*
     * Pre-SOE, (a)(3) was monitoring only. An operation that reads this section as "monitoring"
     * and files nothing about supplier verification or fraud prevention is out of compliance
     * as of 19 Mar 2024 — and the page would have been what told them so.
     */
    expect(EN['osp.section.monitoring_plan'].toLowerCase()).toContain('fraud');
    expect(ES['osp.section.monitoring_plan'].toLowerCase()).toContain('fraude');

    const promptEn = EN['osp.empty.prompt.monitoring_plan'].toLowerCase();
    expect(promptEn).toContain('fraud');
    expect(promptEn).toContain('supplier');
  });

  it('ICS is not offered as an (a)(6) topic', () => {
    /*
     * A producer group's internal control system is § 205.201(c) — its own paragraph, ten
     * enumerated requirements, mandatory. Filing it as (a)(6) "additional information deemed
     * necessary by the certifying agent" mis-states what the operation owes.
     */
    for (const [locale, catalogue] of [
      ['en-US', EN],
      ['es-419', ES]
    ] as const) {
      const prompt = catalogue['osp.empty.prompt.additional_certifier_info'].toLowerCase();
      expect(prompt, `${locale} (a)(6) prompt`).not.toMatch(/\bics\b|internal control/);
    }

    // …and it IS named where it belongs, so this is a redirect rather than a deletion.
    expect(EN['osp.empty.producerGroupNote']).toContain('205.201(c)');
    expect(ES['osp.empty.producerGroupNote']).toContain('205.201(c)');
  });

  it('the empty state prompts go through intl', () => {
    /*
     * `SECTION_PROMPTS` is module scope, so a literal there cannot reach `intl` — the same
     * shape that left six English paragraphs under a fully-translated heading.
     */
    expect(SOURCE).not.toMatch(/^\s*prompt:\s*$/m);
    expect(SOURCE).toMatch(/promptId: 'osp\.empty\.prompt\./);

    for (const [key] of SECTION_TO_SUBPARAGRAPH) {
      const id = `osp.empty.prompt.${key}`;
      expect(EN[id], `${id} EN`).toBeTruthy();
      expect(ES[id], `${id} ES`).toBeTruthy();
      expect(ES[id], `${id} untranslated`).not.toBe(EN[id]);
    }
  });
});
