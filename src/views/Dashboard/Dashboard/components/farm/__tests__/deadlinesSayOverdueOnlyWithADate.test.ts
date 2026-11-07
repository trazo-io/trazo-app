/**
 * The farm home's Certifier deadlines strip says "overdue" only when a date it holds has passed.
 *
 * Until 2026-11-07 a missing OSP annual update for the year was marked overdue (a red edge and
 * red text) although no row carries its date: the certifier sets the schedule, as the strip's
 * own disclaimer says. It is outstanding, so it takes the warning tone. The rows also lost their
 * coloured left edges: the detail text already carries the urgency in words and tone.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(join(__dirname, '../CertifierDeadlinesStrip.tsx'), 'utf8');

describe('Certifier deadlines strip', () => {
  it('a not-filed annual update is outstanding, never overdue', () => {
    const at = SRC.indexOf("'deadlines.ospAnnualUpdateNotFiled'");
    expect(at, 'the row moved: this would pass vacuously').toBeGreaterThan(-1);
    const row = SRC.slice(at, SRC.indexOf('href:', at));
    expect(row).toMatch(/urgency: 'soon'/);
    expect(row).not.toMatch(/urgency: 'overdue'/);
  });

  it('every overdue row is driven by a date (days < 0)', () => {
    const overdue = [...SRC.matchAll(/urgency: ('[^']*'|days < 0 [^,\n]+),/g)].map((m) =>
      m[1].trim()
    );
    expect(overdue.length).toBeGreaterThan(0);
    for (const value of overdue) {
      expect(["'soon'", "days < 0 ? 'overdue' : 'soon'"], value).toContain(value);
    }
  });

  it('rows carry no coloured left edge', () => {
    expect(SRC).not.toMatch(/borderLeft=/);
    expect(SRC).not.toMatch(/borderLeftColor=/);
  });
});
