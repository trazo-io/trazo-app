/**
 * Which planting-stock fields a planting or transplant asks for, by the season's crop.
 *
 * Rootstock and "Trees / Plants Planted" were asked on every planting, so an onion transplant
 * asked for a rootstock and counted trees (recordkeeping checklist run 2026-11-16, VID-14). They
 * are orchard questions. A crop whose category is clearly annual does not get the rootstock field
 * and counts plants; tree fruit, tree nuts, berries, "other" and an unknown crop keep both, so
 * nothing is hidden from a crop that might be grafted.
 */
export const ANNUAL_CROP_CATEGORIES: ReadonlySet<string> = new Set([
  'vegetable',
  'grain',
  'herb',
  'legume',
  'forage',
  'oilseed'
]);

export const isAnnualCropCategory = (category?: string | null): boolean =>
  !!category && ANNUAL_CROP_CATEGORIES.has(category);

export interface SeasonLike {
  id?: number | string;
  public_id?: string | null;
  finish_date?: string | null;
  crop_type?: { category?: string | null } | null;
}

/**
 * The crop category of the season a planting record is saved against, resolved in the order the
 * save binds it (NewEvent's payload: the plan item's season, then the production the form was
 * opened from, `?production=`, then the post-harvest season), falling back to the parcel's open
 * season. In edit mode, the record's own season. With several parcels at once, null: one rootstock
 * answer is shared by every parcel and their crops are not known here, so nothing is hidden.
 *
 * Review of app #439: reading only the parcel's newest open season hid the rootstock on an apple
 * replant opened from the apple season of a parcel that also had an open onion season.
 */
export const plantingSeasonCategory = ({
  isEdit,
  editSeason,
  multiTarget,
  planHistoryId,
  productionFromUrl,
  postHarvestTarget,
  seasons
}: {
  isEdit: boolean;
  editSeason?: SeasonLike | null;
  multiTarget: boolean;
  planHistoryId?: number | string | null;
  productionFromUrl?: string | null;
  postHarvestTarget?: SeasonLike | null;
  seasons?: SeasonLike[] | null;
}): string | null => {
  if (multiTarget) return null;
  if (isEdit) return editSeason?.crop_type?.category ?? null;
  const list = seasons || [];
  const named = (id?: number | string | null) =>
    id === null || id === undefined || id === ''
      ? undefined
      : list.find(
          (s) =>
            String(s.id) === String(id) || (!!s.public_id && String(s.public_id) === String(id))
        );
  const season =
    named(planHistoryId) ||
    named(productionFromUrl) ||
    postHarvestTarget ||
    list.find((s) => !s.finish_date);
  return season?.crop_type?.category ?? null;
};
