import { describe, expect, it } from 'vitest';

import { bootPrefetchPlan, parseAdminRoute } from '../bootPrefetch';

/**
 * The prefetch only helps when its arguments serialize to the SAME cache key the components
 * use. These pin the shapes: numeric ids where the cards pass `activeCompany.id` /
 * `establishment.id`, strings where the deadlines strip builds its `scope`, and `useParams`
 * strings plus a numeric company id on the parcel page.
 */
describe('parseAdminRoute', () => {
  it('reads the farm id, and the parcel id when present', () => {
    expect(parseAdminRoute('/admin/dashboard/farm/13')).toEqual({
      farmId: '13',
      parcelId: undefined
    });
    expect(parseAdminRoute('/admin/dashboard/farm/13/')).toEqual({
      farmId: '13',
      parcelId: undefined
    });
    expect(parseAdminRoute('/admin/dashboard/farm/13/parcel/26')).toEqual({
      farmId: '13',
      parcelId: '26'
    });
    expect(parseAdminRoute('/admin/dashboard/farm/13/parcel/26/production/71')).toEqual({
      farmId: '13',
      parcelId: '26'
    });
  });

  it('ignores routes outside the farm dashboard', () => {
    expect(parseAdminRoute('/admin/dashboard')).toEqual({});
    expect(parseAdminRoute('/admin/dashboard/education')).toEqual({});
    expect(parseAdminRoute('/production/abc')).toEqual({});
  });
});

describe('bootPrefetchPlan', () => {
  it('does nothing without a usable company hint', () => {
    expect(bootPrefetchPlan('/admin/dashboard/farm/13', null)).toEqual([]);
    expect(bootPrefetchPlan('/admin/dashboard/farm/13', 'abc')).toEqual([]);
    expect(bootPrefetchPlan('/admin/dashboard/farm/13', '0')).toEqual([]);
  });

  it('warms only the company off the farm dashboard', () => {
    expect(bootPrefetchPlan('/admin/dashboard/education', '12')).toEqual([['getCompany', 12]]);
  });

  it('mirrors every farm-dashboard call with the argument shape its component uses', () => {
    const plan = Object.fromEntries(bootPrefetchPlan('/admin/dashboard/farm/13', '12'));
    expect(plan.getCompany).toBe(12);
    expect(plan.getFarmDashboardMetrics).toEqual({ companyId: 12, farmId: 13 });
    expect(plan.getCertifierReadiness).toEqual({ companyId: 12, farmId: 13 });
    expect(plan.getOperationReadiness).toEqual({ companyId: '12', farmId: '13' });
    expect(plan.getCertifications).toEqual({ companyId: '12', farmId: '13' });
    expect(plan.getOSPAnnualUpdates).toEqual({ companyId: '12', farmId: '13' });
    expect(plan.getParcel).toBeUndefined();
  });

  it('adds the three parcel-page calls on a parcel route', () => {
    const plan = Object.fromEntries(bootPrefetchPlan('/admin/dashboard/farm/13/parcel/26', '12'));
    expect(plan.getParcel).toEqual({ parcelId: '26', farmId: '13', companyId: 12 });
    expect(plan.getParcelHistories).toEqual({ companyId: 12, farmId: '13', parcelId: '26' });
    expect(plan.getCurrentHistory).toEqual({ companyId: 12, farmId: '13', parcelId: '26' });
  });
});
