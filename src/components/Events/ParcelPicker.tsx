/**
 * Pick one or more parcels of a farm, from a List or on a Map. Both modes edit ONE selection.
 *
 * List is the default and the accessible path (a fieldset of checkboxes with a legend, a reason
 * beside anything that cannot be picked, select all). Map draws every parcel's outline with its
 * name and toggles on tap (`components/Map/ParcelMapPicker.tsx`, loaded only when Map is chosen).
 * A parcel with no outline on file can be picked in the List only, and the Map says how many.
 *
 * Disabled parcels are the ones a multi-parcel save would refuse: no open production, or two
 * (the server cannot tell which season). `open_season_count` null means "not counted": such a
 * parcel stays pickable and the server decides.
 */
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Box, Text, VStack } from '@chakra-ui/react';

import {
  StandardCheckboxList,
  StandardSegmentedControl,
  type StandardCheckboxListOption
} from 'components/Design/StandardComponents';
import type { ParcelGeometry } from 'store/api/parcelGeometryApi';
import { hectaresIn } from 'utils/multiParcel';

const ParcelMapPicker = React.lazy(() => import('components/Map/ParcelMapPicker'));

/** A parcel as the establishment payload serves it (`ParcelBasicSerializer`). */
export interface PickerParcel {
  id: number | string;
  name: string;
  /** Hectares. */
  area?: number | string | null;
  open_season_count?: number | null;
}

const AREA_SYMBOLS: Record<string, string> = { acres: 'ac', ha: 'ha', m2: 'm²' };
const fmt = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

type Mode = 'list' | 'map';

export interface ParcelPickerProps {
  parcels: PickerParcel[];
  /** Outlines, from the farm's parcel-geometry route. Without it the Map mode is not offered. */
  geometry?: ParcelGeometry[];
  /** Ticked and locked (the parcel the activity was opened from), when there is one. */
  originParcelId?: number;
  /** Selected parcel ids, the origin EXCLUDED. */
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  legend: string;
  /** For the size shown under each parcel. */
  areaUnit?: string;
  /**
   * Grey out parcels a multi-parcel save would refuse (default). Off on the Activities page,
   * where parcels are picked before the activity: one parcel with no open production can still
   * log post-harvest work, so it must stay pickable there, and the form drops it (naming it)
   * only when it would join a multi-parcel record.
   */
  refuseUnavailable?: boolean;
}

export const disabledReasonFor = (
  parcel: PickerParcel,
  intl: { formatMessage: (d: { id: string }) => string }
): string | undefined => {
  if (parcel.open_season_count === 0) {
    return intl.formatMessage({ id: 'events.multiParcel.noOpenSeason' });
  }
  if ((parcel.open_season_count ?? 0) > 1) {
    return intl.formatMessage({ id: 'events.multiParcel.twoOpenSeasons' });
  }
  return undefined;
};

export const ParcelPicker = ({
  parcels,
  geometry,
  originParcelId,
  selectedIds,
  onChange,
  legend,
  areaUnit = 'acres',
  refuseUnavailable = true
}: ParcelPickerProps) => {
  const intl = useIntl();
  const [mode, setMode] = useState<Mode>('list');
  const [mapFailed, setMapFailed] = useState(false);

  const outlined = useMemo(
    () => (geometry || []).filter((parcel) => parcel.path && parcel.path.length >= 3),
    [geometry]
  );
  const mapOffered = outlined.length > 0 && !mapFailed;
  const activeMode: Mode = mapOffered ? mode : 'list';

  const reasonFor = useCallback(
    (parcel: PickerParcel) => (refuseUnavailable ? disabledReasonFor(parcel, intl) : undefined),
    [refuseUnavailable, intl]
  );
  const disabledIds = useMemo(
    () =>
      new Set(
        parcels
          .filter((p) => Number(p.id) !== originParcelId && reasonFor(p))
          .map((p) => Number(p.id))
      ),
    [parcels, originParcelId, reasonFor]
  );

  const options: StandardCheckboxListOption[] = parcels.map((parcel) => {
    const id = Number(parcel.id);
    const area = hectaresIn(Number(parcel.area) || 0, areaUnit);
    const isOrigin = id === originParcelId;
    return {
      value: String(id),
      label: isOrigin
        ? intl.formatMessage({ id: 'events.multiParcel.origin' }, { name: parcel.name })
        : parcel.name,
      detail: area
        ? intl.formatMessage(
            { id: 'events.multiParcel.areaDetail' },
            { area: fmt(area), unit: AREA_SYMBOLS[areaUnit] ?? areaUnit }
          )
        : undefined,
      isFixed: isOrigin,
      disabledReason: isOrigin ? undefined : reasonFor(parcel)
    };
  });

  const toggle = useCallback(
    (parcelId: number) =>
      onChange(
        selectedIds.includes(parcelId)
          ? selectedIds.filter((id) => id !== parcelId)
          : [...selectedIds, parcelId]
      ),
    [onChange, selectedIds]
  );
  const onMapUnavailable = useCallback(() => setMapFailed(true), []);

  const selectedCount = selectedIds.length + (originParcelId != null ? 1 : 0);
  const withoutOutline = parcels.length - outlined.length;

  return (
    <VStack align="stretch" spacing={3}>
      {mapOffered && (
        <StandardSegmentedControl<Mode>
          ariaLabel={intl.formatMessage({ id: 'picker.modeLabel' })}
          value={activeMode}
          onChange={setMode}
          stretchOnMobile
          options={[
            { key: 'list', label: intl.formatMessage({ id: 'picker.list' }) },
            { key: 'map', label: intl.formatMessage({ id: 'picker.map' }) }
          ]}
        />
      )}
      {mapFailed && (
        <Text fontSize="sm" color="gray.700" role="status">
          {intl.formatMessage({ id: 'picker.mapUnavailable' })}
        </Text>
      )}

      {activeMode === 'list' ? (
        <StandardCheckboxList
          legend={legend}
          options={options}
          value={[
            ...(originParcelId != null ? [String(originParcelId)] : []),
            ...selectedIds.map(String)
          ]}
          onChange={(values) =>
            onChange(
              values.map(Number).filter((id) => Number.isFinite(id) && id !== originParcelId)
            )
          }
          selectAllLabel={intl.formatMessage({ id: 'events.multiParcel.selectAll' })}
        />
      ) : (
        <Box>
          <Text fontSize="sm" color="gray.700" mb={2}>
            {intl.formatMessage({ id: 'picker.mapHint' })}
          </Text>
          <Suspense
            fallback={<Box h={{ base: '300px', md: '380px' }} borderRadius="10px" bg="gray.100" />}>
            <ParcelMapPicker
              parcels={outlined}
              selectedIds={selectedIds}
              fixedId={originParcelId}
              disabledIds={disabledIds}
              onToggle={toggle}
              onUnavailable={onMapUnavailable}
            />
          </Suspense>
          {withoutOutline > 0 && (
            <Text fontSize="sm" color="gray.700" mt={2}>
              {intl.formatMessage({ id: 'picker.noOutlineCount' }, { count: withoutOutline })}
            </Text>
          )}
        </Box>
      )}

      <Text fontSize="sm" color="gray.700" role="status" aria-live="polite">
        {intl.formatMessage({ id: 'picker.selected' }, { count: selectedCount })}
      </Text>
    </VStack>
  );
};
