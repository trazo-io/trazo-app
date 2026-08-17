/**
 * Which OSP the guided module pages read, and write to.
 *
 * Both pages used `osps[0]` — "the newest one", which is true only by accident. The API
 * list view sets no `.order_by()`, so it falls through to `Meta.ordering =
 * ["-effective_date", "-version_number"]`, and Postgres sorts NULLs FIRST on a DESC
 * column. A fresh draft has no `effective_date` yet, so it lands at index 0.
 *
 * That database default was doing load-bearing product work: it is the entire reason the
 * modules become editable the moment a farmer starts a new version. Nothing in the app
 * said so, and nothing tested it — a `NULLS LAST` anywhere in that chain would have left
 * the grower forking a new version and watching the page stay locked, with no error to
 * explain it.
 *
 * Stated instead of inherited: the working plan is the highest-numbered DRAFT if one
 * exists, else the highest-numbered plan. Same answer today, no dependency on how the
 * server happens to sort nulls.
 */
import type { OSPSummary } from 'types/osp';

const byVersionDesc = (a: OSPSummary, b: OSPSummary) =>
  (b.version_number ?? 0) - (a.version_number ?? 0);

export const selectWorkingOsp = (osps: OSPSummary[] | undefined): OSPSummary | undefined => {
  if (!osps?.length) return undefined;
  const drafts = osps.filter((osp) => osp.status === 'draft');
  // Spread before sorting: RTK Query freezes its cached arrays in development, and
  // Array.prototype.sort mutates in place.
  return [...(drafts.length ? drafts : osps)].sort(byVersionDesc)[0];
};
