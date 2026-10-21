/**
 * The wizard's multi-parcel rules are the server's rules, byte for byte.
 *
 * `src/config/events/multiParcelSpec.json` is a copy of
 * `trazo-back/history/services/multi_target_spec.json`. The server refuses a per-parcel field sent
 * in the shared body and refuses a type it does not list; if the copy drifted, the wizard would
 * offer parcels the server then refuses, or keep a field in the shared body that the server wants
 * per parcel. Fails, never skips, when the sibling checkout is missing (frontend CI checks
 * trazo-back out as a sibling; see `fieldNoteContractParity.test.ts`).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { FORM_SUPPORTS_MULTI, MULTI_PARCEL_SPEC, specRulesFor } from '../multiParcel';

const REPO_ROOT = join(__dirname, '../../../../..');
const SERVER_SPEC = join(REPO_ROOT, 'trazo-back/history/services/multi_target_spec.json');
const CLIENT_SPEC = join(__dirname, '../multiParcelSpec.json');

describe('multi-parcel spec parity', () => {
  it('the sibling trazo-back checkout is present', () => {
    expect(existsSync(SERVER_SPEC), `missing ${SERVER_SPEC}`).toBe(true);
  });

  it('the copy equals the server file', () => {
    const server = JSON.parse(readFileSync(SERVER_SPEC, 'utf8'));
    const client = JSON.parse(readFileSync(CLIENT_SPEC, 'utf8'));
    expect(client).toEqual(server);
  });

  it('every type the form supports is one the server knows', () => {
    for (const eventType of FORM_SUPPORTS_MULTI) {
      expect(MULTI_PARCEL_SPEC.types[String(eventType)], String(eventType)).toBeDefined();
    }
  });

  it('every UI field is a key the server accepts per parcel', () => {
    for (const [eventType, raw] of Object.entries(MULTI_PARCEL_SPEC.types)) {
      const subtypes = raw.subtypes ?? [null];
      for (const subtype of subtypes) {
        const rules = specRulesFor(Number(eventType), subtype);
        if (!rules) continue;
        for (const field of rules.fields) {
          expect(rules.perTargetKeys.has(field.key), `${eventType}/${subtype}: ${field.key}`).toBe(
            true
          );
        }
        if (rules.areaKey) expect(rules.perTargetKeys.has(rules.areaKey)).toBe(true);
      }
    }
  });

  it('every per-parcel field has a card label in both languages', () => {
    for (const [eventType, raw] of Object.entries(MULTI_PARCEL_SPEC.types)) {
      for (const subtype of raw.subtypes ?? [null]) {
        for (const field of specRulesFor(Number(eventType), subtype)?.fields ?? []) {
          const id = `events.multiParcel.field.${field.key}`;
          expect((enUS as Record<string, string>)[id], id).toBeDefined();
          expect((es419 as Record<string, string>)[id], id).toBeDefined();
        }
      }
    }
  });
});
