/**
 * A Parcel Application section tab is complete only when its answers AND the evidence it owns are
 * on file (walkthrough 2026-11-20, W6).
 *
 * "E. Field map" showed a green "Section complete" above its own "No boundary drawn yet". The tab
 * read `'map'` from `status.missing`, and the map left that list on 2026-09-24 for the evidence
 * axis (`status.evidence_missing`), so the tab could not be anything but complete.
 */
import { describe, expect, it } from 'vitest';

import { sectionTabState } from '../ParcelApplicationWizard';

const status = (missing: string[], evidence_missing: string[] = []) => ({
  state: (missing.length ? 'in_progress' : 'complete') as 'in_progress' | 'complete',
  missing,
  evidence_state: (evidence_missing.length ? 'outstanding' : 'complete') as
    | 'outstanding'
    | 'complete',
  evidence_missing
});

describe('E. Field map', () => {
  it('no boundary and no uploaded map: evidence still needed', () => {
    expect(sectionTabState('e_map', status([], ['map']))).toBe('incomplete');
  });

  it('a drawn boundary with no uploaded map: evidence still needed, as the packet says', () => {
    expect(sectionTabState('e_map', status([], ['operator_map']))).toBe('incomplete');
  });

  it('a boundary whose area disagrees with the parcel: evidence still needed', () => {
    expect(
      sectionTabState('e_map', status([], ['operator_map', 'map_geometry_disagrees_with_area']))
    ).toBe('incomplete');
  });

  it("an uploaded map: complete, whatever another section's answers owe", () => {
    expect(sectionTabState('e_map', status(['identity', 'livestock'], []))).toBe('complete');
  });
});

describe('F. Land history', () => {
  it('a certified parcel whose certificate is not on file: evidence still needed', () => {
    expect(sectionTabState('f_land_history', status([], ['certified_certificate']))).toBe(
      'incomplete'
    );
  });

  it('an affidavit with no signed copy, or days of the 36 months uncovered', () => {
    expect(sectionTabState('f_land_history', status([], ['affidavit_document']))).toBe(
      'incomplete'
    );
    expect(sectionTabState('f_land_history', status([], ['land_history_window']))).toBe(
      'incomplete'
    );
  });

  it('an unanswered certification question still counts, as before', () => {
    expect(sectionTabState('f_land_history', status(['certification_status']))).toBe('incomplete');
  });

  it("the map's evidence is not F's", () => {
    expect(sectionTabState('f_land_history', status([], ['map']))).toBe('complete');
  });
});

describe('sections with no evidence of their own', () => {
  it('answer only to their own checks', () => {
    expect(sectionTabState('a_location', status([], ['map', 'certified_certificate']))).toBe(
      'complete'
    );
    expect(sectionTabState('a_location', status(['identity']))).toBe('incomplete');
  });

  it('no status on the response marks nothing', () => {
    expect(sectionTabState('e_map', undefined)).toBe('none');
    expect(sectionTabState('a_location', null)).toBe('none');
  });

  it('an absent evidence list marks no evidence-owning tab complete', () => {
    const noEvidence = { state: 'complete' as const, missing: [] };
    expect(sectionTabState('e_map', noEvidence)).toBe('none');
    expect(sectionTabState('f_land_history', noEvidence)).toBe('none');
    expect(sectionTabState('f_land_history', { ...noEvidence, missing: ['land_history'] })).toBe(
      'incomplete'
    );
    expect(sectionTabState('a_location', noEvidence)).toBe('complete');
  });

  it('a section no check owns is not marked', () => {
    expect(sectionTabState('g_unknown', status([], ['map']))).toBe('none');
  });
});
