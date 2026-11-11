/**
 * Activity feed RTK Query endpoints — WS-4.
 *
 * One merged, date-sorted list across all eight event models for the establishment
 * Activities surface. Rows are lightweight; labels resolve client-side through the
 * existing event registry maps, and detail/edit rides the existing per-type routes.
 */

import { ACTIVITY_FEED_URL } from 'config';
import baseApi from './baseApi';

export interface ActivityRow {
  event_type: number;
  event_id: number;
  subtype: string | null;
  name: string | null;
  date: string | null;
  description: string;
  parcel_id: number;
  parcel_name: string;
  history_id: number;
  /**
   * Whether the season this activity belongs to is closed (finished or published).
   * Events on a finished production are locked server-side (423), so the detail modal
   * uses this to show a locked state instead of offering Edit/Delete that will fail.
   */
  production_finished: boolean;
  performed_by: string;
  /** A spray whose source record shows no clock time: `date` holds a noon placeholder. */
  time_not_recorded?: boolean;
  /** WS-4 auto-narrative: structured values only; wording composes client-side. */
  detail?: Record<string, unknown>;
}

const activityFeedApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getActivityFeed: build.query<
      { activities: ActivityRow[]; truncated?: boolean },
      {
        companyId: string;
        farmId: string;
        start?: string;
        end?: string;
        eventType?: number;
        /**
         * Filtered in the QUERYSET server-side, not here: the endpoint caps its payload
         * before responding, so filtering by parcel on the client would drop a block's
         * older activities whenever another block dominates the newest rows.
         */
        parcelId?: string;
      }
    >({
      query: ({ companyId, farmId, start, end, eventType, parcelId }) => {
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        if (eventType != null) params.set('event_type', String(eventType));
        if (parcelId) params.set('parcel', parcelId);
        const qs = params.toString();
        return {
          url: ACTIVITY_FEED_URL(companyId, farmId) + (qs ? `?${qs}` : ''),
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (_r, _e, { farmId }) => [{ type: 'Event', id: `feed-${farmId}` }]
    })
  })
});

export const { useGetActivityFeedQuery } = activityFeedApi;

export default activityFeedApi;
