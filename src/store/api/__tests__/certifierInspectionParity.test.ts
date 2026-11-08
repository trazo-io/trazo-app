/**
 * The certifier-inspection vocabularies live twice: trazo-back's `CertifierInspection` /
 * `CertifierNotice` choices and `services/certifier_notices.STATUSES`, and the TS unions in
 * `certifierInspectionApi.ts` that the card's selects and status words are built from.
 *
 * Both directions: a backend value the app cannot show would fall back to a blank select and a save
 * would rewrite it; an app value the backend lacks is a 400 on every save that picks it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import {
  INSPECTION_KINDS,
  NOTICE_KINDS,
  NOTICE_RESPONSE_KINDS,
  NOTICE_STATUSES
} from '../certifierInspectionApi';
import { STATUS_MESSAGE_ID } from '../../../views/Dashboard/OSP/CertifierInspectionsCard';

const BACK = join(__dirname, '../../../../../trazo-back');

const read = (rel: string): string => {
  try {
    return readFileSync(join(BACK, rel), 'utf8');
  } catch {
    throw new Error(
      `Cannot read trazo-back/${rel}. This guard compares the app's vocabularies with the ` +
        `models, so it needs the trazo-back checkout beside trazo-app.`
    );
  }
};

/** The body of `class <name>(` up to the next top-level class. */
const classBody = (source: string, name: string): string => {
  const start = source.search(new RegExp(`^class ${name}\\(`, 'm'));
  expect(start, `class ${name} not found`).toBeGreaterThan(-1);
  const rest = source.slice(start + 1);
  const next = rest.search(/^class /m);
  return next === -1 ? rest : rest.slice(0, next);
};

/** Slugs from an indented `NAME = [ ("slug", "Label"), ... ]` block. */
const choices = (body: string, name: string): string[] => {
  const start = body.search(new RegExp(`^\\s+${name} = \\[`, 'm'));
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const block = body.slice(start, body.indexOf('\n    ]', start));
  const slugs = [...block.matchAll(/\(\s*"([a-z_]+)"\s*,/g)].map((m) => m[1]);
  expect(slugs.length, `${name} parsed empty`).toBeGreaterThan(0);
  return slugs;
};

const models = read('certifications/models.py');
const inspection = classBody(models, 'CertifierInspection');
const notice = classBody(models, 'CertifierNotice');

describe('certifier inspection vocabularies match trazo-back', () => {
  it('inspection kinds (blank is "not stated")', () => {
    expect([...INSPECTION_KINDS].filter(Boolean).sort()).toEqual(
      choices(inspection, 'KIND_CHOICES').sort()
    );
    expect(INSPECTION_KINDS).toContain('');
  });

  it('notice kinds', () => {
    expect([...NOTICE_KINDS].sort()).toEqual(choices(notice, 'KIND_CHOICES').sort());
  });

  it('response kinds (blank is "no response recorded")', () => {
    expect([...NOTICE_RESPONSE_KINDS].filter(Boolean).sort()).toEqual(
      choices(notice, 'RESPONSE_KIND_CHOICES').sort()
    );
  });

  it('derived statuses, and every one has words on the card', () => {
    const service = read('certifications/services/certifier_notices.py');
    const constants = [...service.matchAll(/^([A-Z_]+) = "([a-z_]+)"$/gm)].map((m) => m[2]);
    expect(constants.length).toBeGreaterThan(0);
    expect([...NOTICE_STATUSES].sort()).toEqual(constants.sort());
    expect(Object.keys(STATUS_MESSAGE_ID).sort()).toEqual([...NOTICE_STATUSES].sort());
  });
});
