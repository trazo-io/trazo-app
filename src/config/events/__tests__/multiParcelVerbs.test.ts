import { describe, expect, it } from 'vitest';

import { ACTIVITY_VERBS, verbForKey } from 'config/activityVerbs';
import { FORM_SUPPORTS_MULTI, MULTI_PARCEL_SPEC, verbMayGoMulti } from '../multiParcel';

const verb = (key: string) => verbForKey(key)!;

describe('verbMayGoMulti: which activity tiles may cover several parcels', () => {
  it('a spray may', () => {
    expect(verbMayGoMulti(verb('input_application'))).toBe(true);
  });

  it('activities that are facts of one place or one lot never may', () => {
    // Harvest (HA/PH), cleanout (EM), transport, buffer use, seed search: copies would fabricate.
    for (const key of [
      'harvest',
      'cleanout',
      'transport',
      'buffer_use',
      'seed_search',
      'business'
    ]) {
      expect(verbMayGoMulti(verb(key)), key).toBe(false);
    }
  });

  it('no tile is offered for a type whose form cannot run in multi mode yet', () => {
    for (const v of ACTIVITY_VERBS.filter((v) => !FORM_SUPPORTS_MULTI.includes(v.eventType))) {
      expect(verbMayGoMulti(v), v.key).toBe(false);
    }
  });

  it('a family tile is offered when at least one of its subtypes may', () => {
    const production = MULTI_PARCEL_SPEC.types['1'].subtypes!;
    expect(production).toContain('PR');
    expect(production).not.toContain('HA');
    const supported = { eventType: 2, subtypeChoices: ['FE', 'PE'] };
    expect(verbMayGoMulti(supported)).toBe(true);
  });
});
