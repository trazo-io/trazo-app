/**
 * Reading subscription limits — one implementation, because two disagreed.
 *
 * Limits live in `Plan.features` as integers where **-1 means unlimited**. Two rules keep
 * catching people out, and both produced live bugs:
 *
 *  1. `-1` is falsy-ish in the wrong direction. A guard written as
 *     `if (features.max_parcels_per_establishment > 0)` is FALSE for an unlimited plan, so an
 *     unlimited customer takes the "no limit configured" branch and gets treated as blocked.
 *     `CarouselHorizontal.tsx` hid the "+ Add Parcel" button on Enterprise this way, and would
 *     have hidden it on the Pilot plan — the one October pilots run on.
 *
 *  2. Purchased add-ons are NOT in `plan.features`. The backend adds them
 *     (`company/models.py` sums `SubscriptionAddOn.quantity`) and the API exposes the result as
 *     `subscription.effective_limits`. Reading `plan.features` directly means a customer the API
 *     allows 5 parcels loses the button at 2.
 *
 * Always go through `getLimit` / `canCreateMore`.
 */

export const UNLIMITED = -1;

/** Shape we care about; deliberately loose since callers hold varying company/subscription types. */
interface SubscriptionLike {
  effective_limits?: Record<string, unknown> | null;
  plan?: { features?: Record<string, unknown> | null } | null;
}

interface CompanyLike {
  subscription?: SubscriptionLike | null;
  subscription_plan?: { features?: Record<string, unknown> | null } | null;
}

/**
 * Effective limits for a company: add-on-adjusted values when the API provides them, otherwise
 * the raw plan features.
 */
export function getEffectiveLimits(company?: CompanyLike | null): Record<string, unknown> {
  if (!company) return {};
  const subscription = company.subscription;
  return (
    subscription?.effective_limits ||
    subscription?.plan?.features ||
    company.subscription_plan?.features ||
    {}
  );
}

/**
 * A single limit, or `undefined` when the plan does not state one.
 *
 * `undefined` is NOT the same as unlimited — the backend reads a missing key as `0` (blocked),
 * so callers must decide explicitly rather than treating absence as permission.
 */
export function getLimit(company: CompanyLike | null | undefined, key: string): number | undefined {
  const value = getEffectiveLimits(company)[key];
  return typeof value === 'number' ? value : undefined;
}

export function isUnlimited(limit: number | undefined): boolean {
  return limit === UNLIMITED;
}

/**
 * Is the customer allowed to create one more of something?
 *
 * Returns `false` for an unstated limit, matching the backend, which reads a missing key as 0.
 * Being permissive here would show a button that the API then rejects with a 403.
 */
export function canCreateMore(
  company: CompanyLike | null | undefined,
  key: string,
  currentCount: number
): boolean {
  const limit = getLimit(company, key);
  if (limit === undefined) return false;
  if (isUnlimited(limit)) return true;
  return currentCount < limit;
}

/** True when the customer is exactly at (or past) a stated, finite limit. */
export function isAtLimit(
  company: CompanyLike | null | undefined,
  key: string,
  currentCount: number
): boolean {
  const limit = getLimit(company, key);
  if (limit === undefined || isUnlimited(limit)) return false;
  return currentCount >= limit;
}
