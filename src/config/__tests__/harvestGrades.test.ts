/**
 * F5 — the crop-aware harvest-grade catalogue, from the FORM's side.
 *
 * `history/tests/test_harvest_grade_vocabulary.py` pins the Python↔TypeScript agreement and
 * the model columns. This pins what the two pickers actually build, which the drift test
 * cannot see: the escape hatch, the stored-value fallback, and the near-miss crop resolution
 * that both forms rely on to turn a product NAME into a grade family.
 */
import { describe, expect, it } from 'vitest';

import {
  CROP_GRADE_FAMILY,
  GRADE_FAMILIES,
  MAX_GRADE_LENGTH,
  OTHER_GRADE,
  OTHER_GRADE_LABEL,
  gradesForCrop,
  harvestGradeOptions
} from '../harvestGrades';

describe('gradesForCrop', () => {
  it('gives each crop its own commodity family', () => {
    expect(gradesForCrop('carrots')).toContain('U.S. Commercial');
    expect(gradesForCrop('apples')).toContain('WA Extra Fancy');
    // …and never the other one's. A flat list is how a wrong grade reaches a packing record.
    expect(gradesForCrop('apples')).not.toContain('U.S. Commercial');
    expect(gradesForCrop('carrots')).not.toContain('WA Extra Fancy');
  });

  it('resolves a display NAME, not just a slug', () => {
    // The Finish form is handed `productName` ("Citrus", "Corn (Field)"), never a slug.
    expect(gradesForCrop('Citrus')).toContain('U.S. Fancy');
    expect(gradesForCrop('Corn (Field)')).toContain('U.S. Sample grade');
    expect(gradesForCrop('Pear')).toContain('U.S. Combination');
    expect(gradesForCrop('Carrots')).toContain('U.S. No. 1');
  });

  it('⛔ does not resolve a DIFFERENT commodity that merely starts the same way', () => {
    // The first version of `nearMissKey` was a bare `startsWith`, so "Peas" → `pea` matched
    // `peanuts` and a pea grower would have been offered the federal grain grades.
    expect(gradesForCrop('Peas')).toEqual([]);
    expect(gradesForCrop('Pea')).toEqual([]);
    expect(gradesForCrop('Peanuts')).toContain('U.S. No. 1');
  });

  it('offers nothing for a commodity with no USDA standard', () => {
    for (const crop of ['hops', 'pomegranates', 'avocados', 'cotton', 'mixed_vegetables']) {
      expect(gradesForCrop(crop), crop).toEqual([]);
    }
  });

  it('offers nothing for a crop it does not know, rather than guessing', () => {
    expect(gradesForCrop('dragonfruit')).toEqual([]);
    expect(gradesForCrop('')).toEqual([]);
    expect(gradesForCrop(null)).toEqual([]);
    expect(gradesForCrop(undefined)).toEqual([]);
  });

  it('points every crop at a family that exists', () => {
    for (const [crop, family] of Object.entries(CROP_GRADE_FAMILY)) {
      expect(GRADE_FAMILIES[family], `${crop} → ${family}`).toBeDefined();
    }
  });
});

describe('harvestGradeOptions', () => {
  it('always ends with the free-text escape, on every crop', () => {
    for (const crop of ['carrots', 'apples', 'hops', 'dragonfruit', '']) {
      const options = harvestGradeOptions(crop);
      expect(options[options.length - 1], crop).toEqual({
        value: OTHER_GRADE,
        label: OTHER_GRADE_LABEL
      });
    }
  });

  it('a crop with no standard is offered the escape and nothing else', () => {
    expect(harvestGradeOptions('hops').map((o) => o.value)).toEqual([OTHER_GRADE]);
  });

  it('keeps an already-stored value selectable even when the family does not carry it', () => {
    // An imported record, a legacy slug, or a grade typed through the escape. Dropping it
    // would silently reset the field to the placeholder and the next save would blank a
    // grade the farmer never touched.
    const legacy = harvestGradeOptions('carrots', 'grade_a');
    expect(legacy.map((o) => o.label)).toContain('Grade A (legacy)');

    const typed = harvestGradeOptions('carrots', 'OGC Fancy Pack 25#');
    expect(typed.map((o) => o.value)).toContain('OGC Fancy Pack 25#');
  });

  it('does not duplicate a stored value that IS in the family', () => {
    const options = harvestGradeOptions('carrots', 'U.S. No. 1');
    expect(options.filter((o) => o.value === 'U.S. No. 1')).toHaveLength(1);
  });

  it('never offers the sentinel as a stored value', () => {
    const options = harvestGradeOptions('carrots', OTHER_GRADE);
    expect(options.filter((o) => o.value === OTHER_GRADE)).toHaveLength(1);
  });
});

describe('the catalogue itself', () => {
  it('fits the column both forms bound their input to', () => {
    for (const [family, grades] of Object.entries(GRADE_FAMILIES)) {
      for (const grade of grades) {
        expect(grade.length, `${family}/${grade}`).toBeLessThanOrEqual(MAX_GRADE_LENGTH);
      }
    }
  });

  it('carries none of the retired grades — the vocabulary this replaced', () => {
    // EXACT strings, not substrings. "U.S. Grade A (Fancy)" and "U.S. Grade B (Choice)" are
    // the real published grades for OLIVES, and "U.S. Grade A/B/C" for DATES — a substring
    // check on "Grade A" fails on both and would have pushed me to delete two correct
    // families to make a test green. What was retired is the BARE "Grade A", which claimed to
    // be a grade for every crop and is one for none.
    const everything = new Set(Object.values(GRADE_FAMILIES).flat());
    for (const retired of [
      'Grade A',
      'Grade B',
      'Grade C',
      'Premium',
      'Premium Grade',
      'Standard',
      'Export Quality',
      'Domestic Market'
    ]) {
      expect(everything.has(retired), retired).toBe(false);
    }
    // …and the olive/date grades that merely READ like them are still here.
    expect(everything.has('U.S. Grade A (Fancy)')).toBe(true);
    expect(everything.has('U.S. Grade A')).toBe(true);
  });
});
