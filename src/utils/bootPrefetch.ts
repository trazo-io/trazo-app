/**
 * Boot-time prefetch for the producer dashboard.
 *
 * MEASURED on app.trazo.io (2026-09-06): a cold farm-dashboard load ran four sequential stages
 * before any farm data moved — JS boot → users/me → companies/{id} → the five farm cards — and
 * settled in ~3.2 s with only ~1.5 s of server time. Each stage waited for the previous one to
 * hand it an id it already had: the farm and parcel ids are in the URL, and the company id is
 * the one used on the last visit.
 *
 * So the moment the bundle runs, this fires those requests in parallel with users/me. The
 * components mount a second or two later with IDENTICAL arguments and find the result in the
 * RTK Query cache, or join the request already in flight. Arguments must match the call sites
 * EXACTLY (RTK keys the cache on a stable serialization, so `12` and `"12"` are different
 * entries) — each entry below names the component whose call it mirrors.
 *
 * Failure modes are all cheap: a stale company hint or an expired session costs one wasted
 * request per entry (a 401 goes through the normal silent-refresh path); nothing renders from
 * a prefetched value that the real component would not have fetched itself.
 */
import baseApi from 'store/api/baseApi';
// Side-effect imports: the endpoints below are injected by these modules, which the router
// otherwise loads lazily with the dashboard chunk — after the moment we want to fire.
import 'store/api/companyApi';
import 'store/api/dashboardMetricsApi';
import 'store/api/certifierLinkApi';
import 'store/api/certificationApi';
import 'store/api/ospAnnualUpdateApi';
import 'store/api/historyApi';
import 'store/api/productApi';

/** Written on every dashboard visit; read as the company hint on the next boot. */
export const LAST_COMPANY_KEY = 'trazo_last_company_id';
/** Older hint the subscription flow already persists; used as a fallback. */
const SUBSCRIPTION_COMPANY_KEY = 'subscription_company_id';
/** How long the prefetch keeps its cache subscriptions alive for the real components to arrive. */
const HOLD_MS = 30_000;

export type PrefetchEntry = [endpoint: string, args: unknown];

export type AdminRoute = { farmId?: string; parcelId?: string; view: 'farm' | 'parcel' | 'other' };

/**
 * Which producer view a path lands on. `view` is what decides the plan: the farm cards render
 * ONLY on the farm dashboard itself and the parcel record calls ONLY on the parcel page — a
 * production page under a parcel needs neither, and warming them there just adds contention
 * (MEASURED: it pushed the parcel page's own two record calls from ~1.6 s to ~3 s in-page).
 */
export function parseAdminRoute(pathname: string): AdminRoute {
  const match = pathname.match(/^\/admin\/dashboard\/farm\/(\d+)(?:\/parcel\/(\d+))?(\/.*)?$/);
  if (!match) return { view: 'other' };
  const [, farmId, parcelId, rest] = match;
  const trailing = (rest || '').replace(/\/+$/, '');
  if (trailing) return { farmId, parcelId, view: 'other' };
  return { farmId, parcelId, view: parcelId ? 'parcel' : 'farm' };
}

/**
 * The requests worth warming for a route, as `[endpoint, args]` pairs. Pure, so it is testable
 * without a store. Returns nothing without a company hint — the ids alone cannot form a URL.
 */
export function bootPrefetchPlan(pathname: string, companyHint: string | null): PrefetchEntry[] {
  const companyId = Number(companyHint);
  if (!companyHint || !Number.isInteger(companyId) || companyId <= 0) return [];
  const { farmId, parcelId, view } = parseAdminRoute(pathname);
  // authApi initiates getCompany with the numeric id from users/me.
  const plan: PrefetchEntry[] = [['getCompany', companyId]];
  if (!farmId) return plan;
  if (view === 'farm') {
    const numericScope = { companyId, farmId: Number(farmId) }; // SmartUsageCard, CertifierReadinessCard
    const stringScope = { companyId: String(companyId), farmId }; // CertifierDeadlinesStrip `scope`
    plan.push(
      ['getFarmDashboardMetrics', numericScope],
      ['getCertifierReadiness', numericScope],
      ['getOperationReadiness', stringScope],
      ['getCertifications', stringScope],
      ['getOSPAnnualUpdates', stringScope]
    );
  } else if (view === 'parcel' && parcelId) {
    // Parcel page: `useParams` strings for farm/parcel, numeric company id from redux.
    plan.push(
      ['getParcel', { parcelId, farmId, companyId }],
      ['getParcelHistories', { companyId, farmId, parcelId }],
      ['getCurrentHistory', { companyId, farmId, parcelId }]
    );
  }
  return plan;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const hit = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

function readHint(): string | null {
  try {
    return (
      window.localStorage.getItem(LAST_COMPANY_KEY) ||
      window.localStorage.getItem(SUBSCRIPTION_COMPANY_KEY)
    );
  } catch {
    return null;
  }
}

/** Remember the company for the next boot. Safe to call on every render that knows it. */
export function rememberCompanyForBoot(companyId: number | string | null | undefined): void {
  if (companyId === null || companyId === undefined || companyId === '') return;
  try {
    window.localStorage.setItem(LAST_COMPANY_KEY, String(companyId));
  } catch {
    /* storage unavailable — the next boot simply prefetches nothing */
  }
}

type DispatchingStore = { dispatch: (action: unknown) => unknown };

/** Fire the plan for the current URL. Call once, before React renders. */
export function runBootPrefetch(
  store: DispatchingStore,
  overrides: { pathname?: string; companyHint?: string | null; loggedIn?: boolean } = {}
): PrefetchEntry[] {
  const loggedIn = overrides.loggedIn ?? readCookie('logged_in') === 'true';
  if (!loggedIn) return [];
  const pathname = overrides.pathname ?? window.location.pathname;
  const companyHint = overrides.companyHint === undefined ? readHint() : overrides.companyHint;
  const plan = bootPrefetchPlan(pathname, companyHint);
  const subscriptions: Array<{ unsubscribe?: () => void }> = [];
  for (const [endpoint, args] of plan) {
    const definition = (
      baseApi.endpoints as Record<string, { initiate?: (a: unknown) => unknown }>
    )[endpoint];
    if (!definition?.initiate) continue;
    try {
      subscriptions.push(store.dispatch(definition.initiate(args)) as { unsubscribe?: () => void });
    } catch {
      /* a prefetch must never break boot */
    }
  }
  if (subscriptions.length) {
    setTimeout(() => subscriptions.forEach((s) => s.unsubscribe?.()), HOLD_MS);
  }
  return plan;
}
