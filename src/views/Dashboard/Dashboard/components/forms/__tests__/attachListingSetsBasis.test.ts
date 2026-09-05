/**
 * Attaching a catalog listing and answering the organic BASIS are one act, not two.
 *
 * 🔴 2026-09-03. "Use this listing" in InputVerifyHelper wrote `omri_product` and nothing else,
 * so the commonest shape on a real record was an attached OMRI row above an unanswered
 * "How is this input verified for organic use?". Two facts about the same input, free to
 * contradict each other, and the packet reads the WRONG one of them: `_organic_basis_cell` in
 * audit_export_service.py resolves the Organic Status column from `organic_approved`, so a
 * record for which Trazo holds a real catalog match printed a blank cell.
 *
 * ⛔ This is NOT the client deciding a claim. What a shopper is told is decided server-side by
 * `claim_authority.may_claim_input_listing`, which reads the FK and ignores this field. The old
 * "do NOT auto-populate the dropdown" rule in InputVerifyHelper's docstring is about the
 * LOOKUP — a fuzzy matcher running on a name as it is typed. A tap on "Use this listing" is a
 * decision, and `organic_approved` is exactly the record of the grower's decision.
 *
 * Source-pinned: driving the real control needs the verify-input endpoint to answer with a
 * candidate, and a network stub would prove the harness rather than the rule. What matters here
 * is the SHAPE of the rule, and each clause below is one way it has already been got wrong.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, '../ChemicalTab-ENHANCED.jsx'), 'utf8');
const helper = source.slice(
  source.indexOf('const attachListing = ('),
  source.indexOf('const submitHandlerRef')
);

describe('attaching a listing keeps the organic basis in step', () => {
  it('exists, and is what both attach controls call', () => {
    expect(helper).toContain('const attachListing = (field, basis, pk)');
    expect(source).toContain("attachListing('omri_product', 'omri_listed', pk)");
    expect(source).toContain("attachListing('wsda_material', 'wsda_listed', pk)");
    // The raw setValue calls it replaced must not come back beside it.
    expect(source).not.toMatch(
      /onAttachOmri=\{\(pk\) =>\s*\n?\s*methods\.setValue\('omri_product'/
    );
  });

  it('writes the FK the server actually reads', () => {
    // The chip and the packet are both earned by the FK, never by the dropdown.
    expect(helper).toContain('methods.setValue(field, pk, { shouldDirty: true })');
  });

  it('only ever fills a BLANK basis', () => {
    // A grower who answered "not organic" and then attached a listing is stating a
    // disagreement. The server resolves it honestly (the prohibited branch of
    // resolve_input_status outranks a catalog match); overwriting their answer here would be
    // the client upgrading a claim after all.
    expect(helper).toContain('if (!current)');
    expect(helper).toMatch(/setValue\('organic_approved', basis/);
  });

  it('detaching takes back only what attaching gave', () => {
    // Never clears a basis the grower picked themselves, and never clears one still backed by
    // the OTHER catalogue — OMRI and WSDA are separate columns and separate organisations.
    expect(helper).toContain('current === basis');
    expect(helper).toMatch(/getValues\(other\) == null/);
    expect(helper).toMatch(/setValue\('organic_approved', ''/);
  });

  it('uses the same two basis values the backend claim resolver knows', () => {
    // `ORGANIC_APPROVED_VALUES` in this file mirrors common/field_registry.ORGANIC_APPROVED_OK_VALUES.
    // A third spelling here would write a value no export can label.
    const list = source.slice(source.indexOf('const ORGANIC_APPROVED_VALUES = ['));
    expect(list.slice(0, 300)).toContain("'omri_listed'");
    expect(list.slice(0, 300)).toContain("'wsda_listed'");
  });
});
