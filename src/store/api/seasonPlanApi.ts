/**
 * A production's season plan — the practices this crop usually needs, and which of them
 * the operator has logged a record for.
 *
 * ⛔ A plan item is a SUGGESTION, not a record. Picking a crop template used to write real,
 * dated events attributed to the grower (with the day invented by the browser from the
 * template's prose window); those rows printed into the certifier packet indistinguishable
 * from practices the grower had actually observed. § 205.201(a) makes the producer the
 * author of the plan and § 205.103(b)(2) requires records that can be audited, so a
 * template now produces a to-do list and the operator authors the record.
 *
 * See `history/models.py` ProductionPlanItem for the full history.
 */
import baseApi from './baseApi';

export interface SeasonPlanItem {
  id: number;
  name: string;
  description: string;
  /** Backend event type — routes the activity wizard. */
  event_type: number;
  event_subtype: string;
  /** An agronomic WINDOW ("December - February"). Never a day. */
  planned_window: string;
  planned_month: number | null;
  order_sequence: number;
  // ⛔ No field VALUES here, deliberately. A plan item names a practice and a window; it does
  // not carry the catalogue's numbers. `cleanEventData` in the wizard is a passthrough with
  // no allowlist, so anything merged into the form reaches the record whether the form
  // renders it or not — which would write generic soil pH, fuel and product names onto a real
  // farm's audit trail. See history/models.py ProductionPlanItem.
  status: 'pending' | 'logged' | 'skipped';
  status_display: string;
  fulfilled_by_event_type: number | null;
  fulfilled_by_id: number | null;
  fulfilled_at: string | null;
  skipped_reason: string;
}

export interface SeasonPlanCompleteness {
  total: number;
  logged: number;
  pending: number;
  skipped: number;
}

export interface SeasonPlanResponse {
  /**
   * Numeric History pk, even when the plan was fetched by UUID.
   *
   * "Log this" must post `history` explicitly: the event endpoint otherwise falls back to
   * `parcel.current_history`, so logging a plan item on any production that is not the
   * parcel's current one would write the record to a different season and silently leave the
   * checklist item open.
   */
  history_id: number;
  items: SeasonPlanItem[];
  /** Recordkeeping completeness — "12 planned, 9 logged". Not a score, and not an event tally. */
  completeness: SeasonPlanCompleteness;
}

const seasonPlanApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSeasonPlan: build.query<SeasonPlanResponse, { historyId: number | string }>({
      query: ({ historyId }) => ({
        url: `productions/${historyId}/season_plan/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (result, error, { historyId }) => [{ type: 'SeasonPlan', id: historyId }]
    }),
    /**
     * Set a practice aside as not applicable this season, or put it back.
     *
     * ⛔ `logged` is not accepted here and the server refuses it. An item becomes logged
     * only in the request that writes the record it points at — otherwise the checklist
     * could report a practice as done with nothing behind it.
     */
    updateSeasonPlanItem: build.mutation<
      SeasonPlanItem,
      {
        historyId: number | string;
        itemId: number;
        status: 'pending' | 'skipped';
        skipped_reason?: string;
      }
    >({
      query: ({ historyId, itemId, ...body }) => ({
        url: `productions/${historyId}/season_plan/${itemId}/`,
        method: 'PATCH',
        credentials: 'include',
        body
      }),
      invalidatesTags: (result, error, { historyId }) => [{ type: 'SeasonPlan', id: historyId }]
    })
  })
});

export const { useGetSeasonPlanQuery, useUpdateSeasonPlanItemMutation } = seasonPlanApi;
export default seasonPlanApi;
