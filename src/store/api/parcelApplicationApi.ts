/**
 * Parcel Application endpoints (WS-5) — the per-parcel § 205.202 module.
 *
 * The definition rides the same serialized-module shape as the OSP runner
 * (config/osp/types + conditionEval work unchanged); values bind to real
 * Parcel columns server-side, so a PUT here IS a parcel edit.
 */

import { PARCEL_APPLICATION_URL } from 'config';
import baseApi from './baseApi';
import type { ModuleDefinition } from 'config/osp/types';

/**
 * One boundary record on `Parcel.buffer_zones`.
 *
 * The canonical vocabulary is owned by the backend (`product/services/buffer_zones.py`);
 * every surface that edits buffers — this wizard, the parcel form, the compliance card —
 * reads and writes exactly these keys. Adding a spelling here without adding it there is
 * how the 2026-08-09 data-loss incident happened.
 */
export interface BufferZoneRow {
  direction?: string;
  adjoining_land_use?: string;
  buffer_type?: string;
  /** The entry unit. Every buffer-width input collects feet. */
  buffer_width_ft?: number;
  /** DERIVED from `buffer_width_ft` by the server for the metric audit export. Never edit. */
  readonly buffer_width_m?: number;
  crop_grown_in_buffer?: string;
  /** Tri-state: `null`/absent means unanswered, NOT "the neighbour is not organic". */
  adjacent_is_organic?: boolean | null;
  drift_risk?: string;
  prevention?: string;
  /** § 205.400(f)(1) drift-notification readiness. */
  neighbor_notified?: boolean | null;
  neighbor_notification_date?: string | null;
  /** ISO date the adjacent land last received a prohibited material (§ 205.202(c)). */
  prohibited_use_last_date?: string;
}

export interface ParcelApplicationResponse {
  definition: ModuleDefinition;
  values: Record<string, unknown>;
  buffer_zones: BufferZoneRow[];
  crop_history_count: number;
  has_polygon: boolean;
  polygon?: Array<{ lat: number; lng: number }> | null;
  map_metadata?: Record<string, unknown> | null;
  has_affidavit: boolean;
  /** The facts the parcel PDF prints in §F — certificate of record, managers, 36-month accounting. */
  land_history?: LandHistorySummary;
  /** § 205.202(c) neighbour-signed boundary attestations on file. */
  adjoining_affidavits?: Array<{
    neighbor_name: string;
    neighbor_farm_name: string;
    border_side: string;
    signed: string | null;
  }>;
  status: { state: 'not_started' | 'in_progress' | 'complete'; missing: string[] };
}

export interface LandHistoryManager {
  name: string;
  role: 'current manager' | 'prior manager';
  period_start: string | null;
  period_end: string | null;
  last_prohibited: string | null;
  declared: string;
  signed: string | null;
  attached: boolean;
  contradiction: boolean;
}

export interface LandHistorySummary {
  certificate: {
    number: string;
    agent: string;
    effective: string | null;
    expiry: string | null;
    document_url: string;
  } | null;
  current_manager: LandHistoryManager;
  prior_managers: LandHistoryManager[];
  coverage: {
    window_start: string;
    window_end: string;
    complete: boolean | null;
    gaps: Array<[string, string]>;
    unplaced: number;
    text: string;
  };
}

interface ParcelArgs {
  companyId: string;
  farmId: string;
  parcelId: string;
}

export interface TransitionStatus {
  status?: string;
  earliest_organic_harvest_date?: string | null;
  days_remaining?: number | null;
  findings?: Array<{ year?: number; substance?: string; date?: string }>;
  [key: string]: unknown;
}

const parcelApplicationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getParcelTransitionStatus: build.query<TransitionStatus, ParcelArgs>({
      query: ({ companyId, farmId, parcelId }) => ({
        url: `${PARCEL_APPLICATION_URL(companyId, farmId, parcelId).replace(
          'application/',
          'transition-status/'
        )}`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { parcelId }) => [
        { type: 'ParcelApplication', id: `transition-${parcelId}` }
      ]
    }),
    getParcelApplication: build.query<ParcelApplicationResponse, ParcelArgs>({
      query: ({ companyId, farmId, parcelId }) => ({
        url: PARCEL_APPLICATION_URL(companyId, farmId, parcelId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_r, _e, { parcelId }) => [{ type: 'ParcelApplication', id: parcelId }]
    }),
    saveParcelApplication: build.mutation<
      ParcelApplicationResponse,
      ParcelArgs & { values: Record<string, unknown>; buffer_zones?: BufferZoneRow[] }
    >({
      query: ({ companyId, farmId, parcelId, values, buffer_zones }) => ({
        url: PARCEL_APPLICATION_URL(companyId, farmId, parcelId),
        method: 'PUT',
        credentials: 'include',
        body: buffer_zones !== undefined ? { values, buffer_zones } : { values }
      }),
      invalidatesTags: (_r, _e, { parcelId }) => [{ type: 'ParcelApplication', id: parcelId }]
    })
  })
});

export const {
  useGetParcelApplicationQuery,
  useSaveParcelApplicationMutation,
  useGetParcelTransitionStatusQuery
} = parcelApplicationApi;

export default parcelApplicationApi;
