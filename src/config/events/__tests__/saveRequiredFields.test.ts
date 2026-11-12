import { describe, expect, it } from 'vitest';

import { requiredFieldsForSave } from '../saveRequiredFields';

describe('requiredFieldsForSave', () => {
  const spray = { type: 'FU', application_method: 'ground_spray' };
  const dispenser = { type: 'PE', application_method: 'hand_dispenser' };

  it('one parcel: a spray needs amount, area and concentration', () => {
    expect(requiredFieldsForSave(2, spray)).toEqual([
      'type',
      'commercial_name',
      'volume_applied',
      'area_treated',
      'concentration',
      'application_method'
    ]);
  });

  it('several parcels: amount and area are per parcel, so not asked here', () => {
    expect(requiredFieldsForSave(2, spray, { multiParcel: true })).toEqual([
      'type',
      'commercial_name',
      'concentration',
      'application_method'
    ]);
  });

  it('dispensers carry no concentration, on one parcel and on several', () => {
    expect(requiredFieldsForSave(2, dispenser)).not.toContain('concentration');
    expect(requiredFieldsForSave(2, dispenser, { multiParcel: true })).not.toContain(
      'concentration'
    );
    // The model spelling of the method counts as well.
    expect(
      requiredFieldsForSave(2, { type: 'PE', way_of_application: 'hand_dispenser' })
    ).not.toContain('concentration');
  });

  it('"Not on my record" answers the concentration, on one parcel and on several', () => {
    const notOnRecord = { ...spray, concentration_not_recorded: true };
    expect(requiredFieldsForSave(2, notOnRecord)).not.toContain('concentration');
    expect(requiredFieldsForSave(2, notOnRecord, { multiParcel: true })).not.toContain(
      'concentration'
    );
    // The form's string spelling counts too; an unticked box keeps today's rule.
    expect(
      requiredFieldsForSave(2, { ...spray, concentration_not_recorded: 'true' })
    ).not.toContain('concentration');
    expect(requiredFieldsForSave(2, { ...spray, concentration_not_recorded: false })).toContain(
      'concentration'
    );
  });

  it('summary mode asks only for what a season summary has', () => {
    expect(requiredFieldsForSave(2, { ...spray, is_summary: 'true' })).toEqual([
      'type',
      'commercial_name',
      'application_method'
    ]);
  });

  it('keeps every other type as it was', () => {
    expect(requiredFieldsForSave(0, {})).toEqual(['type']);
    expect(requiredFieldsForSave(1, {})).toEqual(['type']);
    expect(requiredFieldsForSave(3, {})).toEqual(['name']);
    expect(requiredFieldsForSave(4, {})).toEqual(['type']);
    expect(requiredFieldsForSave(5, {})).toEqual(['type']);
    expect(requiredFieldsForSave(6, {})).toEqual(['type']);
    expect(requiredFieldsForSave(7, {})).toEqual(['business_type']);
  });
});
