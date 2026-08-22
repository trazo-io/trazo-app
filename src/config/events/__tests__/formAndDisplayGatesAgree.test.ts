/**
 * A field the form COLLECTS for a subtype must be DISPLAYABLE for that subtype.
 *
 * This is the third gate on a production field, and until 2026-08-22 nothing compared it to
 * the other two. `renderAndPayloadGatesAgree` checks form-render against form-payload;
 * `productionSubtypeCoverage` checks that the subtype LISTS match across the codebase. Both
 * pass while a field is collected, posted, stored — and rendered back nowhere, because the
 * display registry's `visibleForSubtypes` is a fourth list that neither of them reads.
 *
 * 🔴 MEASURED 2026-08-22, on a live Seed Search event:
 *
 *   ProductionTab seed block      ['PL','TR','SS']   (since Batch 4, 2026-08-19)
 *   productionEvent.ts seed fields ['PL','TR']       ← never updated
 *
 * The resolver found no field visible for `SS` and returned an empty set, so the detail modal
 * showed a title, a field note, Performed By and Block — and nothing else. Eleven
 * § 205.204(a)(1) columns were in the row: the three documented supplier attempts, the
 * purchase invoice, the lot numbers, the non-availability reason. The commercial-availability
 * search is the ONLY reason the subtype exists and it was the part you could not see.
 *
 * Same defect on Transport (handler + lot columns, registry said HA only) and Buffer Use
 * (§ 205.202(c) disposition columns, registry said HA only). Three subtypes, one cause.
 *
 * ⚠️ The assertion is CONTAINMENT, not equality. A registry gate may legitimately be wider
 * than the form's — a field can be seeded by an importer or written by the backend and still
 * deserve a display surface. It may never be NARROWER: that is the write-only defect above.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const TAB = join(
  __dirname,
  '../../../views/Dashboard/Dashboard/components/forms/ProductionTab.jsx'
);
const REGISTRY = join(__dirname, '../productionEvent.ts');

const tabSrc = readFileSync(TAB, 'utf8');
const registrySrc = readFileSync(REGISTRY, 'utf8');

/** Subtype codes named inside a source fragment, e.g. 'HA' / "PL". */
const subtypesIn = (fragment: string): string[] =>
  [...new Set([...fragment.matchAll(/['"]([A-Z]{2})['"]/g)].map((m) => m[1]))].sort();

/**
 * The named subtype-group constants at the top of productionEvent.ts, resolved to codes.
 * These exist so the registry states each group's membership once instead of repeating a
 * literal on every field — which is how the seed block drifted in the first place.
 */
const registryConstants = (): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const m of registrySrc.matchAll(/^const ([A-Z_]+):\s*\w+Subtype\[\]\s*=\s*\[([^\]]*)\]/gm)) {
    out[m[1]] = subtypesIn(m[2]);
  }
  return out;
};

/** Every field declaration in the registry, with its resolved `visibleForSubtypes`. */
const registryGates = (): Map<string, string[] | null> => {
  const consts = registryConstants();
  const marks = [...registrySrc.matchAll(/name:\s*'([a-z0-9_]+)'/g)];
  const gates = new Map<string, string[] | null>();
  marks.forEach((m, i) => {
    const chunk = registrySrc.slice(m.index!, marks[i + 1]?.index ?? registrySrc.length);
    const g = /visibleForSubtypes:\s*(?:\[([^\]]*)\]|([A-Z_]+))/.exec(chunk);
    if (!g) {
      gates.set(m[1], null); // no gate = visible for every subtype
    } else if (g[1] !== undefined) {
      gates.set(m[1], subtypesIn(g[1]));
    } else {
      gates.set(m[1], consts[g[2]] ?? []);
    }
  });
  return gates;
};

/**
 * The field groups the form gates as a unit, each anchored on the literal source of its own
 * gate so a reformat fails loudly instead of matching nothing. Anchoring on the FORM (not on
 * a hand-typed list) is the point: the form is where the grower's answer originates, so it is
 * the authority for who is asked.
 */
const GROUPS = [
  {
    label: 'seed / § 205.204 block',
    gate: /const isSeedSourced = \[([^\]]+)\]\.includes\(data\.type\)/,
    fields: [
      'seeds_source',
      'seed_search_attempts',
      'seed_nonavailability_reason',
      'seed_supplier_name',
      'seed_purchase_date',
      'seed_purchase_invoice',
      'seed_lot_number',
      'seed_certification_status',
      'seed_treatment',
      'seed_treatment_allowed_basis',
      'seed_non_gmo_status',
      'stock_organic_management_start'
    ]
  },
  {
    label: 'lot disposition',
    gate: /const RECORDS_LOT_DISPOSITION = \[([^\]]+)\]\.includes\(data\.type\)/,
    fields: ['harvest_lot_code', 'amount_determination']
  },
  {
    label: '§ 205.202(c) buffer disposition',
    gate: /const RECORDS_BUFFER = \[([^\]]+)\]\.includes\(data\.type\)/,
    fields: ['buffer_disposition', 'buffer_disposition_quantity', 'buffer_disposition_evidence']
  },
  {
    label: 'handler / off-farm movement',
    gate: /const RECORDS_HANDLER = \[([^\]]+)\]\.includes\(data\.type\)/,
    fields: [
      'harvest_destination',
      'harvest_contract_number',
      'sent_to_handler_date',
      'quantity_sent_to_handler',
      'quantity_returned_from_handler',
      'handler_document_reference',
      'storage_location',
      'storage_temperature_f'
    ]
  }
] as const;

describe('production: form gate and display gate agree', () => {
  const gates = registryGates();

  for (const group of GROUPS) {
    it(`displays the ${group.label} for every subtype the form asks`, () => {
      const m = group.gate.exec(tabSrc);
      expect(
        m,
        `could not find the ${group.label} gate in ProductionTab — if its shape changed, ` +
          'update this regex rather than deleting the test'
      ).not.toBeNull();

      const asked = subtypesIn(m![1]);
      expect(asked.length, 'the form gate names no subtypes').toBeGreaterThan(0);

      for (const field of group.fields) {
        expect(
          gates.has(field),
          `${field} is collected by the form but absent from the registry`
        ).toBe(true);
        const shown = gates.get(field);
        if (shown === null) continue; // ungated = visible everywhere, which satisfies containment

        const writeOnly = asked.filter((s) => !shown!.includes(s));
        expect(
          writeOnly,
          `${field} is collected for ${writeOnly.join(', ')} but never displayed for ` +
            `${writeOnly.join(', ')} — the grower fills it, it saves, and the detail modal ` +
            'renders nothing back. Widen visibleForSubtypes to match the form.'
        ).toEqual([]);
      }
    });
  }

  /**
   * Anti-vacuity. Every assertion above is a loop over a hand-listed `fields` array, so a
   * typo in one name would quietly test nothing. This proves the names are real and that the
   * groups genuinely widened past HA/PL/TR — the state that made the defect possible.
   */
  it('the guarded groups actually cover the Batch 4 subtypes', () => {
    const covered = new Set(GROUPS.flatMap((g) => subtypesIn(g.gate.exec(tabSrc)![1])));
    for (const late of ['TP', 'BU', 'SS']) {
      expect(covered.has(late), `no guarded group asks anything of ${late}`).toBe(true);
    }
    const guarded = GROUPS.flatMap((g) => g.fields);
    expect(guarded.length).toBeGreaterThan(20);
    for (const f of guarded) {
      expect(gates.has(f), `guarded field ${f} does not exist in the registry`).toBe(true);
    }
  });

  /**
   * Every production subtype must resolve at least one field of its own beyond the four
   * universals (name, operator_is_custom, performed_by, block_id). A subtype whose modal
   * shows only those is, by definition, showing the farmer nothing about the activity they
   * recorded — which is exactly what SS, TP and BU did.
   */
  it('no subtype renders only the universal fields', () => {
    const subtypeCodes = [
      ...new Set([...registrySrc.matchAll(/\{ code: '([A-Z]{2})'/g)].map((m) => m[1]))
    ];
    expect(subtypeCodes.length).toBeGreaterThan(10);

    const modalFields = (st: string) =>
      [...gates.entries()].filter(([, g]) => g === null || g.includes(st)).length;

    const bare = subtypeCodes.filter((st) => modalFields(st) <= 4);
    expect(
      bare,
      `these subtypes resolve only the universal fields, so their detail modal says nothing ` +
        `about the activity: ${bare.join(', ')}`
    ).toEqual([]);
  });
});
