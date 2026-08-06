/**
 * The scanner is driven by REAL notes from live records (2026-07-31 consumer review), and is
 * tuned for precision: a warning that cries wolf gets dismissed and then protects nobody.
 *
 * The false-positive block matters as much as the detection block. A farmer writing "removed
 * 8% canopy volume" or "300 GPA spray volume" must not be nagged, or they will learn to click
 * past the warning that actually matters.
 */
import { describe, it, expect } from 'vitest';

import { scanEventNotes, scanNoteForSensitiveContent } from '../consumerNoteScan';

const cats = (text: string) => scanNoteForSensitiveContent(text).map((f) => f.category);

describe('scanNoteForSensitiveContent — real notes that leaked', () => {
  it('flags worker re-entry data (Kocide card, live)', () => {
    const note =
      'Preventive anthracnose spray (Kocide 3000, OMRI listed). Applied at 1 lb/acre via ' +
      'airblast sprayer. Full canopy coverage. 300 GPA spray volume. REI 48 hours posted. ' +
      'Buffer zone maintained 30m from Reche Creek. Application 1 of 3 for season.';
    expect(cats(note)).toContain('worker_safety');
  });

  it('flags a self-reported audit score and a quantified benefit claim (GlobalG.A.P. card, live)', () => {
    const note =
      'GlobalG.A.P. IFA v6 audit completed. Zero non-conformances. Special recognition for ' +
      'IPM program reducing pesticide use by 60%. Certificate valid through Feb 2027. Score: 98.5%.';
    const found = cats(note);
    expect(found).toContain('self_graded_score');
    expect(found).toContain('benefit_claim');
  });

  it('flags a named third-party operation (equipment cleaning card, live)', () => {
    const note =
      'Cleaned all pruning equipment after use. Equipment was borrowed by Rodriguez Ranch ' +
      '(conventional) last week — full cleaning protocol per NOP 205.272 before use.';
    expect(cats(note)).toContain('third_party');
  });

  it('flags commercial detail', () => {
    expect(cats('Purchased from supplier, invoice INV-HG-2026-0142.')).toContain('commercial');
    expect(cats('Total input cost $3,150 for the block.')).toContain('commercial');
  });

  it('flags regulatory identifiers', () => {
    expect(cats('Applied under EPA Reg. 62719-621.')).toContain('regulatory_id');
    expect(cats('Applicator holds QAL 128844.')).toContain('regulatory_id');
  });

  it('flags PHI as well as REI', () => {
    expect(cats('Pre-harvest interval 14 days observed before picking.')).toContain(
      'worker_safety'
    );
  });
});

describe('scanNoteForSensitiveContent — must NOT cry wolf', () => {
  const benign = [
    // Real farmer notes from live records that are completely fine to publish.
    'Removed 8% canopy volume. Open center maintained for light penetration.',
    'Good size distribution, 70% count 48-60.',
    'Soil moisture sensors confirmed uniform distribution.',
    'Cover crop residue improving organic matter trend.',
    '300 GPA spray volume, full canopy coverage.',
    'Bloom began Feb 14, peak bloom Feb 22-28. Weather favorable: sunny, 15-18C.',
    'Released beneficial insects at dawn along the orchard perimeter.',
    'Hand thinning by 12-person crew to improve fruit size.'
  ];

  it.each(benign)('does not flag: %s', (note) => {
    expect(scanNoteForSensitiveContent(note)).toEqual([]);
  });

  it('does not flag a bare percentage or a bare number', () => {
    expect(scanNoteForSensitiveContent('Applied to 60% of the block.')).toEqual([]);
    expect(scanNoteForSensitiveContent('48 trees replanted.')).toEqual([]);
  });
});

describe('scanNoteForSensitiveContent — contract', () => {
  it('never mutates or returns the input text', () => {
    const original = 'Score: 98.5%.';
    const copy = original.slice();
    scanNoteForSensitiveContent(original);
    expect(original).toBe(copy);
  });

  it('handles empty and non-string input safely', () => {
    expect(scanNoteForSensitiveContent('')).toEqual([]);
    expect(scanNoteForSensitiveContent('   ')).toEqual([]);
    expect(scanNoteForSensitiveContent(null)).toEqual([]);
    expect(scanNoteForSensitiveContent(undefined)).toEqual([]);
    expect(scanNoteForSensitiveContent(42)).toEqual([]);
  });

  it('is stable across repeated calls (no regex lastIndex bleed)', () => {
    const note = 'Score: 98.5%. REI 48 hours posted.';
    const first = scanNoteForSensitiveContent(note);
    const second = scanNoteForSensitiveContent(note);
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(0);
  });

  it('de-duplicates a phrase repeated in the same note', () => {
    const note = 'Score: 98.5%. Later confirmed — Score: 98.5%.';
    const scores = scanNoteForSensitiveContent(note).filter(
      (f) => f.category === 'self_graded_score'
    );
    expect(scores).toHaveLength(1);
  });

  it('carries the matched text and a reason key for the UI', () => {
    const [finding] = scanNoteForSensitiveContent('Score: 98.5%.');
    expect(finding.match).toContain('98.5');
    expect(finding.reasonKey).toMatch(/^events\.noteScan\.reason\./);
  });

  it('scans description and observation together, de-duplicated', () => {
    const findings = scanEventNotes({
      description: 'Score: 98.5%.',
      observation: 'Score: 98.5%. Also EPA Reg. 62719-621.'
    });
    expect(findings.filter((f) => f.category === 'self_graded_score')).toHaveLength(1);
    expect(findings.some((f) => f.category === 'regulatory_id')).toBe(true);
  });
});
