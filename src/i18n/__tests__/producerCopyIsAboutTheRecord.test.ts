/**
 * Producer-side copy talks about the record the grower hands their certifier, and mentions the
 * buyer page only where the text is true for every case it is shown in.
 *
 * Pilot rehearsal 2026-10-17, finding 8. Four strings on producer surfaces framed the work for
 * consumers or overstated a check:
 * - empty parcels list: "build transparency for consumers";
 * - farm form description help: "what consumers see when they scan your products - tell your
 *   story" (the description does reach the public buyer page, but only for a season the grower
 *   publishes, and it is a farm description, not a marketing pitch);
 * - farm form operations step: "automated USDA Organic verification" (the check is a cross
 *   reference against the USDA Organic Integrity Database: it confirms the listing, never the
 *   practice; compliance.md "Known limitations");
 * - first-activity toast: "and what buyers can see". The milestone fires from production
 *   counts, not from a specific event, so it cannot know whether the record that triggered it is
 *   one of the certifier-only subtypes `isEventOnBuyerPage` withholds (BU, SS, EM, TP). The
 *   buyer clause is therefore dropped for every record.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const en = enUS as Record<string, string>;
const es = es419 as Record<string, string>;

describe('producer copy (finding 8)', () => {
  it('the empty parcels list is about season records, not consumers', () => {
    expect(en['app.noParcelsYetDescription']).toMatch(/season records/i);
    expect(en['app.noParcelsYetDescription']).not.toMatch(/consumer|transparency/i);
    expect(es['app.noParcelsYetDescription']).toMatch(/registros de temporada/i);
    expect(es['app.noParcelsYetDescription']).not.toMatch(/consumidor|transparencia/i);
  });

  it('the farm description help says where it appears and when, without "tell your story"', () => {
    expect(en['farm.form.description.helpText']).toContain('buyer page of any season you publish');
    expect(en['farm.form.description.helpText']).not.toMatch(/consumers|tell your story/i);
    expect(es['farm.form.description.helpText']).toContain(
      'página para compradores de cada temporada que publiques'
    );
    expect(es['farm.form.description.helpText']).not.toMatch(/consumidores|cuenta tu historia/i);
  });

  it('the certifications note states the database check and its limit, never "verification"', () => {
    const enText = en['certification.form.guidance'];
    const esText = es['certification.form.guidance'];
    expect(enText).toContain('USDA Organic Integrity Database');
    expect(enText).toContain('not your farming practices');
    expect(enText).not.toMatch(/verif/i);
    expect(esText).toContain('USDA Organic Integrity Database');
    expect(esText).toContain('no tus prácticas agrícolas');
    expect(esText).not.toMatch(/verifica/i);
  });

  it('the first-activity toast never promises buyers will see the record', () => {
    expect(en['tour.milestone.firstEvent.bodyLate']).toMatch(/certifier/);
    expect(en['tour.milestone.firstEvent.bodyLate']).not.toMatch(/buyer/i);
    expect(es['tour.milestone.firstEvent.bodyLate']).toMatch(/certificador/);
    expect(es['tour.milestone.firstEvent.bodyLate']).not.toMatch(/comprador/i);
  });
});
