/**
 * § 205.400(f) has two limbs and they are not interchangeable.
 *
 *   (f)(1) — application, including DRIFT, of a PROHIBITED SUBSTANCE
 *   (f)(2) — a CHANGE in the certified operation that may affect compliance
 *
 * Both carry the same "immediately notify the certifying agent" duty from the chapeau, so the
 * difference is what triggers them, never how urgent they are.
 *
 * The app cited (f)(1) for a change in four separate strings — the drift banner, both
 * approved-inputs strings, and (2026-08-21) a new education topic — while the backend had already
 * moved to (f)(2) for exactly this case (migration 0161 corrected 0155's help_text on
 * `drift_warning`: "treated as an operation change requiring certifier notification"). The UI was
 * telling farmers a different rule than the field they were looking at.
 *
 * This walks every user-facing string in both locales so the next one is caught wherever it lands.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const LOCALES: Record<string, Record<string, string>> = { 'en-US': enUS, 'es-419': es419 };

/** Words that mean "a prohibited substance reached this ground", in either locale. */
const PROHIBITED_TRIGGER = /prohibited|drift|deriva|sustancia prohibida/i;
/** Words that mean "something about the operation changed", in either locale. */
const CHANGE_TRIGGER = /\bchange|cambio/i;

describe.each(Object.entries(LOCALES))('§ 205.400(f) citations — %s', (_locale, messages) => {
  const entries = Object.entries(messages).filter(([, v]) => typeof v === 'string');

  it('every (f)(1) citation is about a prohibited substance or drift', () => {
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(1)'))
      .filter(([, v]) => !PROHIBITED_TRIGGER.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('no string cites (f)(1) for a change without also naming the prohibited-substance case', () => {
    // The failure shape: "Per 205.400(f)(1), you must notify your certifier of practice changes".
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(1)') && CHANGE_TRIGGER.test(v))
      .filter(([, v]) => !PROHIBITED_TRIGGER.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('every (f)(2) citation is about a change', () => {
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(2)'))
      .filter(([, v]) => !CHANGE_TRIGGER.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('does not describe (f)(2) as anything less urgent than immediate', () => {
    // The chapeau of § 205.400(f) says "Immediately notify" for BOTH limbs. "Prior notice",
    // "within 30 days" or "at renewal" would all understate the duty.
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(2)'))
      .filter(([, v]) => /prior notice|aviso previo|at renewal|en la renovaci/i.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('a letter to a neighbor cites the prevention practice, never (f)(1)', () => {
    // (f)(1) is the operation telling its CERTIFYING AGENT about drift. A letter to a neighbor
    // is a practice the plan describes to prevent contact, § 205.201(a)(5). Both mention drift,
    // so the (f)(1) check above let "drift-notification letter ... (§ 205.400(f)(1))" through
    // on the buffer form until 2026-11-17 (recordkeeping checklist run, VID-04).
    const NEIGHBOR_LETTER =
      /(letter|carta)\b.*\b(neighbou?r|vecino)|(neighbou?r|vecino).*\b(letter|carta)\b/i;
    // Any part-205 cite, with or without "§": "7 CFR 205.400(f)(1)" must not slip past
    // (review of app #408).
    const letters = entries.filter(([, v]) => NEIGHBOR_LETTER.test(v) && /\b205\.\d/.test(v));
    // Non-vacuity per key: losing one checkbox label from the set must fail, not shrink it.
    expect(letters.map(([k]) => k)).toEqual(
      expect.arrayContaining([
        'parcel.buffer.neighborNotified',
        'parcelApp.buffers.neighborNotified'
      ])
    );
    expect(letters.filter(([, v]) => v.includes('205.400(f)(1)')).map(([k]) => k)).toEqual([]);
    expect(letters.filter(([, v]) => !v.includes('205.201(a)(5)')).map(([k]) => k)).toEqual([]);
  });

  it('is not vacuous — both limbs are actually cited somewhere', () => {
    expect(entries.filter(([, v]) => v.includes('205.400(f)(1)')).length).toBeGreaterThan(2);
    expect(entries.filter(([, v]) => v.includes('205.400(f)(2)')).length).toBeGreaterThan(2);
  });
});

/**
 * § 205.103(b)(4) is the five-year retention period; (b)(3) is audit-trail documentation and the
 * labeling category (current eCFR, read 2026-09-30). Four strings in each locale cited (b)(3) for
 * retention (OSP alignment audit 2026-10, T30).
 */
const RETENTION = /(5|five|cinco)[\s-]*(years?|años)|retention|retención|retain|conserv/i;

describe.each(Object.entries(LOCALES))(
  '§ 205.103 retention citations — %s',
  (_locale, messages) => {
    const entries = Object.entries(messages).filter(([, v]) => typeof v === 'string');

    it('never cites (b)(3) for the five-year retention period', () => {
      const wrong = entries
        .filter(([, v]) => v.includes('205.103(b)(3)'))
        .filter(([, v]) =>
          v
            .split(/(?<=[.;])\s/)
            .some((sentence) => sentence.includes('205.103(b)(3)') && RETENTION.test(sentence))
        )
        .map(([k]) => k);
      expect(wrong).toEqual([]);
    });

    it('cites (b)(4) where it states the retention period', () => {
      expect(messages['finishProduction.confirm.retention']).toContain('205.103(b)(4)');
    });
  }
);

/**
 * OV-PK-CIT20 (overall review lane L4b, corrected 2026-11-24): strings that cited the right area
 * but not the paragraph or word the rule uses. Read against the eCFR versioner API, 2026-11-01
 * edition, and the Federal Register text of the SOE rule (88 FR 3548-3627, Jan. 19, 2023).
 *
 *   C20  "88 FR 3622" named the rule by the page its § 205.201/§ 205.307 amendments print on;
 *        the rule is 88 FR 3548. Marking products organic on records is § 205.103(b)(3).
 *   A15  § 205.401(b) asks for "the person completing the application", never "the person
 *        responsible for the operation".
 *   C16  § 112.161(b) requires supervisor review only for the records it lists; a pesticide
 *        application record is not one, so the review headings carry no citation.
 *   C23  split-operation barriers are § 205.201(a)(5); § 205.272(a) is addressed to "The handler
 *        of an organic handling operation".
 *   D28  substantiation ("reasonable basis") is 16 CFR 260.2; § 260.4 is general benefit claims.
 *   D32b retention is § 205.103(b)(4), never the bare section.
 *   D33  the duty to be certified is § 205.100(a); § 205.101 lists the exemptions.
 *   E01  § 205.103(b)(4) is the five years only; access is (c), "during normal business hours".
 *   B39  § 205.605(b)(12) asks for a potable rinse at or below the drinking-water limit; it does
 *        not cap the residual in the wash water.
 */
describe.each(Object.entries(LOCALES))(
  'imprecise citations, OV-PK-CIT20: %s',
  (_locale, messages) => {
    const entries = Object.entries(messages).filter(([, v]) => typeof v === 'string');
    const keysWhere = (test: (v: string) => boolean) =>
      entries.filter(([, v]) => test(v)).map(([k]) => k);

    it('never names the SOE rule by page 3622', () => {
      expect(keysWhere((v) => v.includes('88 FR 3622'))).toEqual([]);
      expect(messages['sales.field.organicOnInvoice.tooltip']).toContain('88 FR 3548');
      expect(messages['sales.field.organicOnInvoice.tooltip']).toContain('205.103(b)(3)');
      expect(messages['sales.records.organicTooltip']).toContain('205.103(b)(3)');
    });

    it('§ 205.401(b) is the person completing the application', () => {
      expect(
        keysWhere((v) =>
          /205\.401\(b\)\)?\s*(asks for|pide) (the |el nombre de la )?(person responsible|responsible person|persona responsable)/i.test(
            v
          )
        )
      ).toEqual([]);
      // Sentence-agnostic (review of app #448): the corrected strings put the citation in a
      // second sentence, so an adjacency regex would miss the wrong phrase put back in the first.
      expect(
        keysWhere(
          (v) =>
            v.includes('205.401(b)') &&
            /person responsible for the operation|persona responsable de la operación/i.test(v)
        )
      ).toEqual([]);
      for (const key of [
        'farm.form.contactPerson.helpText',
        'osp.review.finding.responsible_person_missing'
      ]) {
        expect(messages[key]).toMatch(
          /person completing the application|persona que completa la solicitud/
        );
      }
    });

    it('no supervisor-review heading cites § 112.161(b)', () => {
      expect(keysWhere((v) => v.includes('112.161(b)'))).toEqual([]);
    });

    it('a split operation is § 205.201(a)(5), never § 205.272', () => {
      expect(keysWhere((v) => /split|dividid/i.test(v) && v.includes('205.272'))).toEqual([]);
      expect(messages['farm.split.regulatoryNote']).toContain('205.201(a)(5)');
    });

    it('substantiation is 16 CFR 260.2', () => {
      expect(
        keysWhere(
          (v) =>
            v.includes('260.4') &&
            /evidence|reasonable basis|respaldo|evidencia|base razonable/i.test(v)
        )
      ).toEqual([]);
      expect(messages['events.noteScan.reason.benefitClaim']).toContain('16 CFR 260.2');
    });

    it('retention cites § 205.103(b)(4), never the bare section', () => {
      expect(keysWhere((v) => RETENTION.test(v) && /205\.103(?!\()/.test(v))).toEqual([]);
      expect(messages['sales.retention']).toContain('205.103(b)(4)');
    });

    it('the duty to be certified is § 205.100(a); § 205.101 is the exemptions', () => {
      const DUTY = /must be certified|debe(n)? estar certificad/i;
      const duty = keysWhere((v) => DUTY.test(v) && v.includes('205.10'));
      expect(duty).toEqual(
        expect.arrayContaining([
          'osp.agentSheet.detail.facilities_2519_exempt_note',
          'handler.agr2519.exemptionHelp'
        ])
      );
      expect(
        keysWhere((v) => DUTY.test(v) && v.includes('205.101') && !v.includes('205.100(a)'))
      ).toEqual([]);
    });

    it('§ 205.103(b)(4) is the five years; access is (c)', () => {
      expect(
        keysWhere((v) => v.includes('205.103(b)(4)') && /reasonable time|plazo razonable/i.test(v))
      ).toEqual([]);
      expect(messages['education.detail.inspectionPrep.retentionDesc']).toContain('205.103(c)');
    });

    it('§ 205.605(b) chlorine is a rinse condition, not a residual cap on the wash water', () => {
      expect(
        keysWhere(
          (v) =>
            /205\.605\(b\)/.test(v) &&
            /limits the residual|limita el residual|last point of product contact|último punto de contacto/i.test(
              v
            )
        )
      ).toEqual([]);
      expect(messages['events.production.sanitation.residualHelp']).toContain('205.605(b)(12)');
    });
  }
);
