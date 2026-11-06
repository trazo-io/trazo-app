/**
 * The breadcrumb names the section a page is (2026-11-06). It knew only "Home / farm / parcel",
 * so Activities, Documents, the Organic System Plan, the buyer page, the profiles and every
 * season page read as if the farmer were still on the farm home.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { sectionCrumbId } from '../sectionCrumb';

const F = '/admin/dashboard/farm/167';
const P = `${F}/parcel/304`;

const CASES: Array<[string, string | null]> = [
  [F, null],
  [P, null],
  [`${F}/activities`, 'app.activities'],
  [`${F}/osp`, 'app.organicSystemPlan'],
  [`${F}/osp/module/g6_0_production`, 'app.organicSystemPlan'],
  [`${F}/documents`, 'app.documents'],
  [`${F}/traceback`, 'documents.runTraceback'],
  [`${F}/buyer`, 'app.buyer'],
  [`${F}/profile`, 'farmHome.profileLink'],
  [`${F}/parcel/add`, 'farmHome.parcels.new'],
  [`${P}/profile`, 'parcelPage.profileLink'],
  [`${P}/application`, 'parcelPage.application.title'],
  [`${P}/production/add`, 'parcelPage.newSeason'],
  [`${P}/production/9`, 'breadcrumb.season'],
  [`${P}/production/9/finish`, 'farmHome.seasons.finish'],
  [`${P}/event/add`, 'parcelPage.logActivity'],
  [`${P}/event/12/change`, 'app.edit']
];

describe('breadcrumb section', () => {
  it.each(CASES)('%s → %s', (path, id) => {
    expect(sectionCrumbId(path)).toBe(id);
  });

  it('every section label exists in both locales', () => {
    const ids = CASES.map(([, id]) => id).filter(Boolean) as string[];
    for (const id of ids) {
      expect((enUS as Record<string, string>)[id], `${id} missing in en-US`).toBeTruthy();
      expect((es419 as Record<string, string>)[id], `${id} missing in es-419`).toBeTruthy();
    }
  });
});
