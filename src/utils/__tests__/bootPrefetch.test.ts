import { describe, expect, it } from 'vitest';

import { bootPrefetchPlan, parseAdminRoute } from '../bootPrefetch';

/**
 * The prefetch only helps when its arguments serialize to the SAME cache key the components
 * use. These pin the shapes: numeric ids where the cards pass `activeCompany.id` /
 * `establishment.id`, strings where the deadlines strip builds its `scope`, and `useParams`
 * strings plus a numeric company id on the parcel page.
 */
describe('parseAdminRoute', () => {
  it('classifies the farm dashboard, the parcel page and anything deeper', () => {
    expect(parseAdminRoute('/admin/dashboard/farm/13')).toEqual({
      farmId: '13',
      parcelId: undefined,
      view: 'farm'
    });
    expect(parseAdminRoute('/admin/dashboard/farm/13/')).toEqual({
      farmId: '13',
      parcelId: undefined,
      view: 'farm'
    });
    expect(parseAdminRoute('/admin/dashboard/farm/13/parcel/26')).toEqual({
      farmId: '13',
      parcelId: '26',
      view: 'parcel'
    });
    expect(parseAdminRoute('/admin/dashboard/farm/13/parcel/26/production/71').view).toBe('other');
    expect(parseAdminRoute('/admin/dashboard/farm/13/osp').view).toBe('other');
  });

  it('ignores routes outside the farm dashboard', () => {
    expect(parseAdminRoute('/admin/dashboard')).toEqual({ view: 'other' });
    expect(parseAdminRoute('/admin/dashboard/education')).toEqual({ view: 'other' });
    expect(parseAdminRoute('/production/abc')).toEqual({ view: 'other' });
  });
});

describe('bootPrefetchPlan', () => {
  it('does nothing without a usable company hint', () => {
    expect(bootPrefetchPlan('/admin/dashboard/farm/13', null)).toEqual([]);
    expect(bootPrefetchPlan('/admin/dashboard/farm/13', 'abc')).toEqual([]);
    expect(bootPrefetchPlan('/admin/dashboard/farm/13', '0')).toEqual([]);
  });

  it('warms only the company off the farm dashboard and on deeper routes', () => {
    expect(bootPrefetchPlan('/admin/dashboard/education', '12')).toEqual([['getCompany', 12]]);
    expect(bootPrefetchPlan('/admin/dashboard/farm/13/parcel/26/production/71', '12')).toEqual([
      ['getCompany', 12]
    ]);
    expect(bootPrefetchPlan('/admin/dashboard/farm/13/osp', '12')).toEqual([['getCompany', 12]]);
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

  it('warms the three parcel-page calls, and none of the farm cards, on a parcel route', () => {
    const plan = Object.fromEntries(bootPrefetchPlan('/admin/dashboard/farm/13/parcel/26', '12'));
    expect(Object.keys(plan).sort()).toEqual([
      'getCompany',
      'getCurrentHistory',
      'getParcel',
      'getParcelHistories'
    ]);
    expect(plan.getParcel).toEqual({ parcelId: '26', farmId: '13', companyId: 12 });
    expect(plan.getParcelHistories).toEqual({ companyId: 12, farmId: '13', parcelId: '26' });
    expect(plan.getCurrentHistory).toEqual({ companyId: 12, farmId: '13', parcelId: '26' });
  });
});
