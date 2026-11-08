/**
 * The activity keys and labels here are the backend's (`trazo-back/certifications/facility_activities.py`),
 * in the same groups and order (review of app #328). The backend validates `activities` against its own
 * list; a key one side has and the other lacks would be refused on save, or dropped from the copy sheet.
 *
 * Reads the sibling repo, which the frontend CI job checks out beside this one (see `ci.yml`). Per the
 * project's rule for cross-repo guards it fails, never skips, when the sibling is missing.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import {
  ACTIVITY_GROUPS,
  activityGroupMessageId,
  activityMessageId
} from 'config/facilityActivities';

const BACKEND = join(__dirname, '../../../..', 'trazo-back/certifications/facility_activities.py');

const backendGroups = (): { group: string; items: [string, string][] }[] => {
  const source = readFileSync(BACKEND, 'utf8');
  const body = source.slice(source.indexOf('ACTIVITY_GROUPS = ('));
  const groups: { group: string; items: [string, string][] }[] = [];
  const pair = /\(\s*"([a-z_]+)",\s*"([^"]+)"\s*\)/g;
  const groupName = /^\s{4}\(\s*\n\s{8}"([a-z_]+)",/gm;
  const starts = [...body.matchAll(groupName)];
  starts.forEach((m, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : body.indexOf('\n)\n');
    const chunk = body.slice(m.index, end);
    groups.push({ group: m[1], items: [...chunk.matchAll(pair)].map((p) => [p[1], p[2]]) });
  });
  return groups;
};

describe('facility activities: frontend and backend agree', () => {
  it('finds the backend vocabulary', () => {
    expect(existsSync(BACKEND), `missing sibling ${BACKEND}`).toBe(true);
  });

  it('has the same groups and keys in the same order', () => {
    const back = backendGroups();
    expect(back.map((g) => g.group)).toEqual(ACTIVITY_GROUPS.map((g) => g.group));
    back.forEach((g, i) => {
      expect(
        g.items.map(([key]) => key),
        g.group
      ).toEqual(ACTIVITY_GROUPS[i].keys);
    });
  });

  it("words each activity in English as the backend does (the form's own words)", () => {
    const en = enUS as Record<string, string>;
    for (const { items } of backendGroups()) {
      for (const [key, label] of items) expect(en[activityMessageId(key)], key).toBe(label);
    }
    expect(en[activityGroupMessageId('requires_certification')]).toBeTruthy();
  });
});
