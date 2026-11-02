/**
 * Where an activity editor goes after a save that a traceback's "Fix it here" started.
 *
 * The traceback sends `?next=/admin/dashboard/farm/<farm>/traceback?sale=<id>` (or `?pick=<id>`
 * for a trace started from a harvest lot) so the farmer lands
 * back on the chain and sees the gap close. Only THAT shape, for THIS farm, is honoured; any other
 * value (another farm, an absolute URL, extra parameters) falls back, so `next` can never be used
 * to send someone elsewhere.
 */
export function traceReturnPath(
  next: string | null,
  farmId: string | undefined,
  fallback: string
): string {
  if (!next || !farmId || !/^\d+$/.test(farmId)) return fallback;
  return new RegExp(`^/admin/dashboard/farm/${farmId}/traceback(\\?(sale|pick)=\\d+)?$`).test(next)
    ? next
    : fallback;
}
