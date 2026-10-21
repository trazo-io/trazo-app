/**
 * Every parcel of one farm with its boundary: the parcel picker's List | Map data.
 *
 * Served by `EstablishmentViewSet.parcel_geometry` (trazo-back), owner side only. The boundary
 * comes back normalised to `[{lat, lng}]` whatever shape it was stored in, so a drawn and a seeded
 * parcel draw the same way. `open_season_count` greys out parcels a multi-parcel save would refuse
 * (none open, or two); `known_block_ids` are that parcel's sections, for its card's chips.
 *
 * Tags: a parcel edit invalidates `Farm`, starting or finishing a season invalidates `History`,
 * and a new record (which may add a section) invalidates `Event`, so the existing mutations keep
 * this fresh without edits of their own.
 */
import { FARM_PARCEL_GEOMETRY_URL } from 'config/backend';

import baseApi from './baseApi';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ParcelGeometry {
  id: number;
  name: string;
  /** Hectares. */
  area: number | null;
  path: LatLng[] | null;
  has_boundary: boolean;
  center: LatLng | null;
  open_season_count: number | null;
  known_block_ids: string[];
}

interface FarmArgs {
  companyId: string | number;
  farmId: string | number;
}

export const parcelGeometryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getParcelGeometry: build.query<ParcelGeometry[], FarmArgs>({
      query: ({ companyId, farmId }) => ({
        url: FARM_PARCEL_GEOMETRY_URL(String(companyId), String(farmId)),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: (_result, _error, { farmId }) => [
        { type: 'Farm', id: String(farmId) },
        'History',
        'Event'
      ]
    })
  })
});

export const { useGetParcelGeometryQuery } = parcelGeometryApi;
