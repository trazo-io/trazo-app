/**
 * WSDA AGR 2519's seventeen activities (R 01/24, "Activity Information"), in its four groups, each
 * worded in both languages. The English labels are the form's own words.
 */
import { describe, expect, it } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import esLA from 'i18n/lang/es-419.json';
import {
  ACTIVITY_GROUPS,
  ACTIVITY_KEYS,
  activityGroupMessageId,
  activityMessageId
} from 'config/facilityActivities';

const en = enUS as Record<string, string>;
const es = esLA as Record<string, string>;

describe("AGR 2519's activities", () => {
  it('are the seventeen of the form, in its four groups', () => {
    expect(ACTIVITY_KEYS).toHaveLength(17);
    expect(new Set(ACTIVITY_KEYS).size).toBe(17);
    expect(ACTIVITY_GROUPS.map((g) => g.group)).toEqual([
      'general',
      'production',
      'potentially_exempt',
      'requires_certification'
    ]);
  });

  it('are worded in both languages, the English as the form prints it', () => {
    for (const key of ACTIVITY_KEYS) {
      expect(en[activityMessageId(key)], key).toBeTruthy();
      expect(es[activityMessageId(key)], key).toBeTruthy();
    }
    for (const { group } of ACTIVITY_GROUPS) {
      expect(en[activityGroupMessageId(group)], group).toBeTruthy();
      expect(es[activityGroupMessageId(group)], group).toBeTruthy();
    }
    expect(en[activityMessageId('presizing_sorting_hydrocooling')]).toBe(
      'Pre-sizing, sorting, hydrocooling crops'
    );
    expect(en[activityGroupMessageId('potentially_exempt')]).toBe(
      'Handling activities that are potentially exempt'
    );
  });
});
