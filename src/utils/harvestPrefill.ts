/**
 * What the Finish Production form should suggest for the season's production amount.
 *
 * 🔴 2026-08-21 — found finishing a real blueberry season. The form pre-filled
 * `production_amount` from the LATEST event that carried any `yield_quantity`, which on that
 * block was the buffer-row event: `BU`, 2,150 lb, picked separately and sold as CONVENTIONAL
 * process grade because of § 205.202(c). So the header of a 118,750 lb certified-organic lot
 * was seeded with the one quantity on the season that is explicitly not organic. Two defects
 * in the same line:
 *
 *   1. It did not filter to harvest picks. Any event with a yield — buffer use, a
 *      post-harvest record, a transport load — could win.
 *   2. It took ONE event, not the season. Every multi-pick crop (blueberries, citrus, lemons,
 *      cherries) has several `HA` records; "the last pick" is wrong for all of them, and the
 *      last pick is usually the smallest.
 *
 * The lot header is the number the mass balance reconciles sales against and the number the
 * certifier reads first. Seed it from the harvest records, all of them, in their own unit, and
 * only when they agree on one — a sum across pounds and bins would be a confident fabrication,
 * which is worse than an empty field the farmer has to type.
 */

export interface HarvestLikeEvent {
  type?: string;
  yield_quantity?: number | string | null;
  yield_unit?: string | null;
  harvest_method?: string | null;
  date?: string | null;
}

export interface HarvestPrefill {
  production_amount: string;
  production_unit?: string;
  harvest_method?: 'manual' | 'mechanical' | 'mixed';
  /** How many harvest records were summed — shown to the farmer so a surprising number can be traced. */
  pick_count: number;
}

/** Event-record yield units → the Finish form's unit vocabulary. */
export const EVENT_UNIT_TO_FORM_UNIT: Record<string, string> = {
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  kg: 'kg',
  kgs: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ton: 'tons',
  tons: 'tons',
  box: 'boxes',
  boxes: 'boxes',
  bin: 'bins',
  bins: 'bins',
  plant: 'plants',
  plants: 'plants',
  seed: 'seeds',
  seeds: 'seeds',
  crate: 'crates',
  crates: 'crates',
  bushel: 'bushels',
  bushels: 'bushels',
  unit: 'units',
  units: 'units'
};

/**
 * A harvest record arrives spelled three ways depending on which serializer produced it:
 * the short subtype code `HA` (form state, timeline service), the bare verb `harvest` /
 * `harvesting`, and — from `current_production/`, which is what the Finish form actually reads —
 * the property path `event.production.harvesting`. Matching only `HA` made this helper offer
 * NOTHING on the real endpoint (found 2026-08-21 finishing the spinach season), which the unit
 * test could not see because it supplied short codes of its own.
 *
 * Match on the LAST dot-segment so `event.production.post_harvest_processing` (→
 * `post_harvest_processing`) and `event.production.buffer_use` (→ `buffer_use`) stay out.
 */
const HARVEST_TYPES = new Set(['ha', 'harvest', 'harvesting']);

const isHarvestType = (raw: unknown): boolean => {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!t) return false;
  const leaf = t.slice(t.lastIndexOf('.') + 1);
  return HARVEST_TYPES.has(leaf);
};

export function computeHarvestPrefill(
  events: HarvestLikeEvent[] | null | undefined
): HarvestPrefill | undefined {
  const picks = (events || []).filter((e) => {
    // Only harvest records. `BU` (buffer use) carries a yield and must never count;
    // so must not `PH`, `TP` or anything else that happens to record a quantity.
    if (!isHarvestType(e?.type)) return false;
    const q = e?.yield_quantity;
    return q !== null && q !== undefined && q !== '' && !Number.isNaN(Number(q));
  });
  if (!picks.length) return undefined;

  const units = new Set(
    picks.map(
      (p) =>
        EVENT_UNIT_TO_FORM_UNIT[
          String(p.yield_unit || '')
            .trim()
            .toLowerCase()
        ] ??
        String(p.yield_unit || '')
          .trim()
          .toLowerCase()
    )
  );
  // Mixed units: refuse to sum. Offer nothing rather than a made-up total.
  if (units.size > 1) return undefined;
  const [unit] = [...units];

  const total = picks.reduce((acc, p) => acc + Number(p.yield_quantity), 0);
  const methods = new Set(
    picks
      .map((p) => String(p.harvest_method || '').toLowerCase())
      .filter((m) => ['manual', 'mechanical', 'mixed'].includes(m))
  );
  let harvest_method: HarvestPrefill['harvest_method'];
  if (methods.size === 1) harvest_method = [...methods][0] as HarvestPrefill['harvest_method'];
  else if (methods.size > 1) harvest_method = 'mixed';

  // Render without float noise: 118750 not 118750.00000001, 446400.5 kept as is.
  const amount = Number.isInteger(total) ? String(total) : String(Number(total.toFixed(2)));
  return {
    production_amount: amount,
    ...(unit ? { production_unit: unit } : {}),
    ...(harvest_method ? { harvest_method } : {}),
    pick_count: picks.length
  };
}
