import type { IntlShape } from 'react-intl';

/**
 * The one use § 205.602 allows for a substance it otherwise prohibits, in the reader's language.
 *
 * Three rows carry such a condition, and the server types them (`is_conditionally_permitted`,
 * from `annotation_kind`): (c) calcium chloride, (e) potassium chloride, (h) sodium nitrate. The
 * stored `restriction_notes` is the rule's English, so a Spanish screen words it here, by
 * paragraph. One literal id per paragraph: the locale test only sees literal ids.
 *
 * Returns null for any other paragraph; the caller then says "the use the rule names" without
 * inventing a condition.
 */
export function nationalListCondition(
  intl: IntlShape,
  cfrSection: string | null | undefined,
  subsection: string | null | undefined
): string | null {
  if ((cfrSection || '').trim() !== '205.602') return null;
  switch ((subsection || '').trim().toLowerCase()) {
    case 'c':
      return intl.formatMessage({
        id: 'nationalList.condition.602c',
        defaultMessage:
          'only as a foliar spray to treat a physiological disorder associated with calcium uptake'
      });
    case 'e':
      return intl.formatMessage({
        id: 'nationalList.condition.602e',
        defaultMessage:
          'only from a mined source, applied in a manner that minimizes chloride accumulation in the soil'
      });
    case 'h':
      return intl.formatMessage({
        id: 'nationalList.condition.602h',
        defaultMessage: "only up to 20% of the crop's total nitrogen requirement"
      });
    default:
      return null;
  }
}
