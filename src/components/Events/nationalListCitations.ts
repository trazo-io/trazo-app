/**
 * The National List citations the buyer page may print (Run 8b R5, 2026-10-15).
 *
 * The card printed "A National List entry (Spinosad, 7 CFR § nonsyn)": the server sent the
 * catalogue row's raw section code, and spinosad's code is "nonsyn" because a nonsynthetic
 * substance is allowed WITHOUT a National List entry. The server now sends the model's own
 * `citation` ("§ 205.601(e)") and only for a real entry. This list is the second check: the card
 * prints a citation only when it is one the backend can produce, and otherwise falls back to the
 * plain grower wording. Nothing here builds a citation from a substance name.
 *
 * The set is ENUMERATED, not a pattern: every citation `NationalListSubstance.citation` produces
 * from the seeded catalogue (trazo-back `certifications/management/commands/seed_national_list.py`
 * SECTION_* tables), plus the bare section form it produces for a row with no subsection, for each
 * real section in `CFR_SECTION_CHOICES`. The backend lists the same set
 * (`history/tests/test_buyer_page_states_the_record.py`, NATIONAL_LIST_CITATIONS), and
 * `__tests__/nationalListCitations.test.ts` re-derives it from the backend source, so a new
 * section or subsection fails a test on each side instead of silently disappearing from the card.
 */

const SECTIONS = ['205.105', '205.601', '205.602', '205.603', '205.605', '205.606'] as const;

const SUBSECTIONS: Record<(typeof SECTIONS)[number], string> = {
  '205.105': 'aefg',
  '205.601': 'abcdefghijklmno',
  '205.602': 'abcdefghij',
  '205.603': '',
  '205.605': 'b',
  '205.606': ''
};

export const NATIONAL_LIST_CITATIONS: ReadonlySet<string> = new Set(
  SECTIONS.flatMap((section) => [
    `§ ${section}`,
    ...SUBSECTIONS[section]
      .split('')
      .filter(Boolean)
      .map((s) => `§ ${section}(${s})`)
  ])
);

/** The citation when it is one the backend produces, else undefined. */
export const nationalListCitation = (value: unknown): string | undefined =>
  typeof value === 'string' && NATIONAL_LIST_CITATIONS.has(value) ? value : undefined;
