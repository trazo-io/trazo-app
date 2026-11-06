/**
 * The breadcrumb's last segment: which section of a farm or parcel the page is (2026-11-06).
 *
 * The top bar knew only "Home / farm / parcel", so Activities, Documents, the Organic System
 * Plan, the buyer page, the profiles and every season page all read as if the farmer were
 * still on the farm home. Returns the message id to show, or null on the farm or parcel home.
 * Labels reuse the sidebar's and the page titles' own strings, so the crumb names the page the
 * way the rest of the app does.
 */
const FARM = '/admin/dashboard/farm/[^/]+';
const PARCEL = `${FARM}/parcel/[^/]+`;

const RULES: Array<[RegExp, string]> = [
  [new RegExp(`^${PARCEL}/production/add/?$`), 'parcelPage.newSeason'],
  [new RegExp(`^${PARCEL}/production/[^/]+/finish/?$`), 'farmHome.seasons.finish'],
  [new RegExp(`^${PARCEL}/production/[^/]+/change/?$`), 'app.edit'],
  [new RegExp(`^${PARCEL}/production/[^/]+/?$`), 'breadcrumb.season'],
  [new RegExp(`^${PARCEL}/event/add/?$`), 'parcelPage.logActivity'],
  [new RegExp(`^${PARCEL}/event/[^/]+/change/?$`), 'app.edit'],
  [new RegExp(`^${PARCEL}/profile/?$`), 'parcelPage.profileLink'],
  [new RegExp(`^${PARCEL}/application/?$`), 'parcelPage.application.title'],
  [new RegExp(`^${PARCEL}/change/?$`), 'app.edit'],
  [new RegExp(`^${FARM}/parcel/add/?$`), 'farmHome.parcels.new'],
  [new RegExp(`^${FARM}/activities/?$`), 'app.activities'],
  [new RegExp(`^${FARM}/osp(/.*)?$`), 'app.organicSystemPlan'],
  [new RegExp(`^${FARM}/documents/?$`), 'app.documents'],
  [new RegExp(`^${FARM}/traceback/?$`), 'documents.runTraceback'],
  [new RegExp(`^${FARM}/buyer/?$`), 'app.buyer'],
  [new RegExp(`^${FARM}/profile/?$`), 'farmHome.profileLink'],
  [new RegExp(`^${FARM}/change/?$`), 'app.edit'],
  // Company-level pages, with no farm in the path (screen audit 2026-11-06: they showed "Home"
  // alone, so the bar did not say where the farmer was).
  [/^\/admin\/dashboard\/field-notes\/?$/, 'fieldNotes.title'],
  [/^\/admin\/dashboard\/subscription\/?$/, 'app.subscription'],
  [/^\/admin\/dashboard\/settings\/?$/, 'app.companySettings']
];

export const sectionCrumbId = (pathname: string): string | null => {
  for (const [re, id] of RULES) if (re.test(pathname)) return id;
  return null;
};
