/**
 * Which plan version the certifier actually holds.
 *
 * `selectWorkingOsp` answers "which plan is the operator EDITING" — the highest-numbered
 * draft. That is the right answer for the module wizard and the wrong one for anything that
 * describes the operation's standing with its certifying agent. § 205.406(a) asks for the
 * changes "to the previous plan", and the previous plan is the one on file: the active
 * version, or the one sitting with the agent for review.
 *
 * Returns undefined when nothing has ever left draft — a brand-new operation. Callers fall
 * back to the working plan there, matching the server: a draft `prior_osp` is refused only
 * when a non-draft version exists to file against.
 */
import type { OSPSummary } from 'types/osp';

const byVersionDesc = (a: OSPSummary, b: OSPSummary) =>
  (b.version_number ?? 0) - (a.version_number ?? 0);

export const selectPlanOnFile = (osps: OSPSummary[] | undefined): OSPSummary | undefined => {
  if (!osps?.length) return undefined;
  const active = osps.filter((o) => o.status === 'active').sort(byVersionDesc);
  if (active.length) return active[0];
  return osps.filter((o) => o.status === 'submitted').sort(byVersionDesc)[0];
};
