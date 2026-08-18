/**
 * Subscription limit reading — the `-1 means unlimited` trap.
 *
 * Two live bugs motivated this file, both in CarouselHorizontal's "+ Add Parcel" tile:
 *   1. It gated on `max_parcels_per_establishment > 0`, which is FALSE for -1, so unlimited
 *      plans fell through to `return false` and the button never rendered. The `=== -1` check
 *      written directly below it was unreachable.
 *   2. It read `plan.features` rather than `subscription.effective_limits`, so purchased add-ons
 *      were invisible and a customer the API allowed 5 parcels lost the button at 2.
 *
 * The second bug matters most for the Pilot plan, which is entirely `-1`.
 */

import {
  UNLIMITED,
  canCreateMore,
  getEffectiveLimits,
  getLimit,
  isAtLimit,
  isUnlimited
} from '../subscriptionLimits';

const planOnly = (features: Record<string, unknown>) => ({
  subscription: { plan: { features } }
});

const withAddOns = (features: Record<string, unknown>, effective: Record<string, unknown>) => ({
  subscription: { plan: { features }, effective_limits: effective }
});

describe('getEffectiveLimits', () => {
  it('prefers effective_limits over raw plan features', () => {
    const company = withAddOns(
      { max_parcels_per_establishment: 2 },
      { max_parcels_per_establishment: 5 }
    );
    expect(getEffectiveLimits(company).max_parcels_per_establishment).toBe(5);
  });

  it('falls back to plan features when no add-ons are present', () => {
    expect(
      getEffectiveLimits(planOnly({ max_parcels_per_establishment: 2 }))
        .max_parcels_per_establishment
    ).toBe(2);
  });

  it('falls back to the legacy top-level subscription_plan shape', () => {
    const company = { subscription_plan: { features: { max_parcels_per_establishment: 4 } } };
    expect(getEffectiveLimits(company).max_parcels_per_establishment).toBe(4);
  });

  it('returns an empty object rather than throwing for a missing company', () => {
    expect(getEffectiveLimits(null)).toEqual({});
    expect(getEffectiveLimits(undefined)).toEqual({});
    expect(getEffectiveLimits({})).toEqual({});
  });
});

describe('getLimit', () => {
  it('returns the number when stated', () => {
    expect(
      getLimit(planOnly({ max_parcels_per_establishment: 2 }), 'max_parcels_per_establishment')
    ).toBe(2);
  });

  it('returns -1 for unlimited rather than coercing it away', () => {
    expect(
      getLimit(planOnly({ max_parcels_per_establishment: -1 }), 'max_parcels_per_establishment')
    ).toBe(UNLIMITED);
  });

  it('returns undefined for an unstated limit, which is NOT unlimited', () => {
    // The backend reads a missing key as 0 (blocked). Treating absence as permission here would
    // render a button the API then rejects with a 403.
    expect(getLimit(planOnly({}), 'max_parcels_per_establishment')).toBeUndefined();
  });

  it('ignores non-numeric values', () => {
    expect(
      getLimit(planOnly({ max_parcels_per_establishment: 'lots' }), 'max_parcels_per_establishment')
    ).toBeUndefined();
  });
});

describe('isUnlimited', () => {
  it('is true only for -1', () => {
    expect(isUnlimited(UNLIMITED)).toBe(true);
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(5)).toBe(false);
    expect(isUnlimited(undefined)).toBe(false);
  });
});

describe('canCreateMore', () => {
  it('allows creation on an unlimited plan regardless of count — the Pilot/Enterprise case', () => {
    // THE regression. `-1 > 0` is false, so the old inline guard returned false here and hid
    // the "+ Add Parcel" button on every unlimited plan.
    const company = planOnly({ max_parcels_per_establishment: UNLIMITED });
    expect(canCreateMore(company, 'max_parcels_per_establishment', 0)).toBe(true);
    expect(canCreateMore(company, 'max_parcels_per_establishment', 25)).toBe(true);
    expect(canCreateMore(company, 'max_parcels_per_establishment', 9999)).toBe(true);
  });

  it('allows creation below a finite limit', () => {
    const company = planOnly({ max_parcels_per_establishment: 2 });
    expect(canCreateMore(company, 'max_parcels_per_establishment', 0)).toBe(true);
    expect(canCreateMore(company, 'max_parcels_per_establishment', 1)).toBe(true);
  });

  it('blocks creation at and past a finite limit', () => {
    const company = planOnly({ max_parcels_per_establishment: 2 });
    expect(canCreateMore(company, 'max_parcels_per_establishment', 2)).toBe(false);
    expect(canCreateMore(company, 'max_parcels_per_establishment', 3)).toBe(false);
  });

  it('counts purchased add-ons', () => {
    // Second regression: base plan says 2, add-ons raise it to 5. Reading plan.features alone
    // hid the button at 2 while the API happily accepted a third parcel.
    const company = withAddOns(
      { max_parcels_per_establishment: 2 },
      { max_parcels_per_establishment: 5 }
    );
    expect(canCreateMore(company, 'max_parcels_per_establishment', 3)).toBe(true);
    expect(canCreateMore(company, 'max_parcels_per_establishment', 5)).toBe(false);
  });

  it('blocks when the limit is unstated, matching the backend default of 0', () => {
    expect(canCreateMore(planOnly({}), 'max_parcels_per_establishment', 0)).toBe(false);
  });

  it('blocks when there is no company at all', () => {
    expect(canCreateMore(null, 'max_parcels_per_establishment', 0)).toBe(false);
  });

  it('treats an explicit 0 as blocked', () => {
    expect(
      canCreateMore(
        planOnly({ max_parcels_per_establishment: 0 }),
        'max_parcels_per_establishment',
        0
      )
    ).toBe(false);
  });
});

describe('isAtLimit', () => {
  it('is never true on an unlimited plan', () => {
    const company = planOnly({ max_parcels_per_establishment: UNLIMITED });
    expect(isAtLimit(company, 'max_parcels_per_establishment', 9999)).toBe(false);
  });

  it('is true at and past a finite limit', () => {
    const company = planOnly({ max_parcels_per_establishment: 2 });
    expect(isAtLimit(company, 'max_parcels_per_establishment', 1)).toBe(false);
    expect(isAtLimit(company, 'max_parcels_per_establishment', 2)).toBe(true);
    expect(isAtLimit(company, 'max_parcels_per_establishment', 3)).toBe(true);
  });

  it('does not warn when no limit is stated', () => {
    // isAtLimit drives an informational alert. An unstated limit is a misconfiguration, not
    // something to tell the farmer they have exhausted.
    expect(isAtLimit(planOnly({}), 'max_parcels_per_establishment', 10)).toBe(false);
  });
});

describe('the two guards that used to disagree now agree', () => {
  const cases = [
    { label: 'unlimited (Pilot / Enterprise)', limit: UNLIMITED, count: 25, expectCanCreate: true },
    { label: 'finite, below', limit: 4, count: 2, expectCanCreate: true },
    { label: 'finite, at', limit: 4, count: 4, expectCanCreate: false }
  ];

  cases.forEach(({ label, limit, count, expectCanCreate }) => {
    it(`${label}: canCreateMore and isAtLimit are consistent`, () => {
      const company = planOnly({ max_parcels_per_establishment: limit });
      expect(canCreateMore(company, 'max_parcels_per_establishment', count)).toBe(expectCanCreate);
      // The carousel tile shows when canCreateMore; the form warns when isAtLimit. They must
      // never both be true, and for a stated limit they must never both be false.
      expect(isAtLimit(company, 'max_parcels_per_establishment', count)).toBe(!expectCanCreate);
    });
  });
});
