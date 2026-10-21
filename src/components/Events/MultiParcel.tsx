/**
 * One spray logged on several blocks: the block picker (wizard step 0) and the per-block amounts
 * (step 1). The rules for what is shared and what is per block live in `utils/multiParcel.ts`;
 * these components only ask for it.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { Box, Stack, Text, VStack } from '@chakra-ui/react';
import { FaBalanceScale, FaLayerGroup } from 'react-icons/fa';

import {
  SectionBox,
  SectionHeader,
  StandardCheckboxList,
  StandardField,
  StandardInput,
  StandardSegmentedControl,
  type StandardCheckboxListOption
} from 'components/Design/StandardComponents';
import { APPLICATION_RATE_UNIT_SYMBOLS } from 'config/events/enums';
import { UNIT_CODE_SYMBOLS } from 'config/events/formatters';
import {
  derivedAmount,
  hasRecordedSize,
  hectaresIn,
  targetArea,
  targetIssues,
  type BlockScope,
  type ParcelTarget,
  type RateInputs
} from 'utils/multiParcel';

/** A parcel as the establishment payload serves it (`ParcelBasicSerializer`). */
export interface FarmParcel {
  id: number | string;
  name: string;
  /** Hectares. */
  area?: number | string | null;
  /** Null when the payload did not count it: the server still decides. */
  open_season_count?: number | null;
}

const AREA_SYMBOLS: Record<string, string> = { acres: 'ac', ha: 'ha', m2: 'm²' };
const areaSymbol = (unit: string) => AREA_SYMBOLS[unit] ?? unit;
const volumeSymbol = (unit: string) => UNIT_CODE_SYMBOLS[unit] ?? unit;
const fmt = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

interface AlsoAppliedToProps {
  parcels: FarmParcel[];
  originParcelId: number;
  /** Selected parcel ids OTHER than the origin. */
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** For the size shown under each block. */
  areaUnit?: string;
}

export const AlsoAppliedTo = ({
  parcels,
  originParcelId,
  selectedIds,
  onChange,
  areaUnit = 'acres'
}: AlsoAppliedToProps) => {
  const intl = useIntl();

  const options: StandardCheckboxListOption[] = parcels.map((parcel) => {
    const id = Number(parcel.id);
    const area = hectaresIn(Number(parcel.area) || 0, areaUnit);
    const isOrigin = id === originParcelId;
    let disabledReason: string | undefined;
    if (!isOrigin && parcel.open_season_count === 0) {
      disabledReason = intl.formatMessage({ id: 'events.multiParcel.noOpenSeason' });
    } else if (!isOrigin && (parcel.open_season_count ?? 0) > 1) {
      disabledReason = intl.formatMessage({ id: 'events.multiParcel.twoOpenSeasons' });
    }
    return {
      value: String(id),
      label: isOrigin
        ? intl.formatMessage({ id: 'events.multiParcel.origin' }, { name: parcel.name })
        : parcel.name,
      detail: area
        ? intl.formatMessage(
            { id: 'events.multiParcel.areaDetail' },
            { area: fmt(area), unit: areaSymbol(areaUnit) }
          )
        : undefined,
      isFixed: isOrigin,
      disabledReason
    };
  });

  return (
    <SectionBox>
      <SectionHeader
        icon={FaLayerGroup}
        title={intl.formatMessage({ id: 'events.multiParcel.title' })}
        description={intl.formatMessage({ id: 'events.multiParcel.hint' })}
      />
      <StandardCheckboxList
        legend={intl.formatMessage({ id: 'events.multiParcel.legend' })}
        options={options}
        value={[String(originParcelId), ...selectedIds.map(String)]}
        onChange={(values) =>
          onChange(values.map(Number).filter((id) => id !== originParcelId && Number.isFinite(id)))
        }
        selectAllLabel={intl.formatMessage({ id: 'events.multiParcel.selectAll' })}
      />
    </SectionBox>
  );
};

interface PerParcelAmountsProps {
  targets: ParcelTarget[];
  onChange: (targets: ParcelTarget[]) => void;
  inputs: RateInputs;
  /** After a refused Continue: mark what each block is missing. */
  showIssues: boolean;
}

export const PerParcelAmounts = ({
  targets,
  onChange,
  inputs,
  showIssues
}: PerParcelAmountsProps) => {
  const intl = useIntl();
  const update = (parcelId: number, patch: Partial<ParcelTarget>) =>
    onChange(targets.map((t) => (t.parcelId === parcelId ? { ...t, ...patch } : t)));
  const areaUnit = areaSymbol(inputs.areaUnit);
  const productUnit = volumeSymbol(inputs.volumeUnit);
  const rateUnit = APPLICATION_RATE_UNIT_SYMBOLS[inputs.rateUnit] ?? inputs.rateUnit;

  return (
    <SectionBox>
      <SectionHeader
        icon={FaBalanceScale}
        title={intl.formatMessage({ id: 'events.multiParcel.amountsTitle' })}
        description={intl.formatMessage({ id: 'events.multiParcel.amountsHint' })}
      />
      <VStack align="stretch" spacing={3}>
        {targets.map((target) => {
          const issues = showIssues ? targetIssues(target, inputs) : [];
          const area = targetArea(target, inputs.areaUnit);
          const derived = derivedAmount(target, inputs);
          const wholeArea = hectaresIn(target.areaHa, inputs.areaUnit);
          return (
            <Box
              key={target.parcelId}
              borderWidth="1px"
              borderColor={issues.length ? 'red.300' : 'gray.200'}
              borderRadius="lg"
              p={{ base: 3, md: 4 }}>
              <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={2}>
                {intl.formatMessage({ id: 'events.multiParcel.scopeLabel' }, { name: target.name })}
              </Text>
              <StandardSegmentedControl<BlockScope | ''>
                ariaLabel={intl.formatMessage(
                  { id: 'events.multiParcel.scopeLabel' },
                  { name: target.name }
                )}
                value={target.scope ?? ''}
                onChange={(scope) => update(target.parcelId, { scope: scope || null })}
                options={[
                  {
                    key: 'all',
                    label: wholeArea
                      ? intl.formatMessage(
                          { id: 'events.multiParcel.scopeAll' },
                          { area: `${fmt(wholeArea)} ${areaUnit}` }
                        )
                      : intl.formatMessage({ id: 'events.multiParcel.scopeAllNoSize' })
                  },
                  { key: 'part', label: intl.formatMessage({ id: 'events.multiParcel.scopePart' }) }
                ]}
              />
              {target.scope === 'all' && !hasRecordedSize(target) && (
                // No size on record for this parcel: ask for it here rather than leave a "whole
                // block" that can never resolve, or push the grower to "part", which would
                // record the wrong scope.
                <Box mt={3}>
                  <StandardField
                    label={intl.formatMessage(
                      { id: 'events.multiParcel.blockSize' },
                      { unit: areaUnit }
                    )}
                    required
                    helpText={intl.formatMessage({ id: 'events.multiParcel.blockSizeHelp' })}
                    error={
                      issues.includes('area')
                        ? intl.formatMessage({ id: 'events.multiParcel.issue.area' })
                        : undefined
                    }>
                    <StandardInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={target.partArea}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        update(target.parcelId, { partArea: e.target.value })
                      }
                    />
                  </StandardField>
                </Box>
              )}
              {target.scope === 'part' && (
                <Stack direction={{ base: 'column', md: 'row' }} spacing={3} mt={3}>
                  <StandardField
                    label={intl.formatMessage(
                      { id: 'events.multiParcel.partArea' },
                      { unit: areaUnit }
                    )}
                    required
                    error={
                      issues.includes('area')
                        ? intl.formatMessage({ id: 'events.multiParcel.issue.area' })
                        : undefined
                    }>
                    <StandardInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={target.partArea}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        update(target.parcelId, { partArea: e.target.value })
                      }
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({ id: 'events.multiParcel.partDetail' })}>
                    <StandardInput
                      value={target.partDetail}
                      maxLength={200}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        update(target.parcelId, { partDetail: e.target.value })
                      }
                    />
                  </StandardField>
                </Stack>
              )}
              {target.scope && (
                <Box mt={3}>
                  <StandardField
                    label={intl.formatMessage(
                      { id: 'events.multiParcel.amountLabel' },
                      { unit: productUnit }
                    )}
                    required
                    helpText={
                      derived !== null && area !== null
                        ? intl.formatMessage(
                            { id: 'events.multiParcel.derivation' },
                            {
                              rate: `${fmt(Number(inputs.rate))} ${rateUnit}`,
                              area: `${fmt(area)} ${areaUnit}`,
                              amount: `${fmt(derived)} ${productUnit}`
                            }
                          )
                        : intl.formatMessage({ id: 'events.multiParcel.noDerivation' })
                    }
                    error={
                      issues.includes('amount')
                        ? intl.formatMessage({ id: 'events.multiParcel.issue.amount' })
                        : undefined
                    }>
                    <StandardInput
                      type="number"
                      min="0"
                      step="0.001"
                      // The derived amount is a PLACEHOLDER, not a value: the grower sees it, and
                      // typing replaces it. Saved as typed, or derived when left empty.
                      placeholder={derived !== null ? String(derived) : ''}
                      value={target.amountTyped}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        update(target.parcelId, { amountTyped: e.target.value })
                      }
                    />
                  </StandardField>
                </Box>
              )}
              {issues.includes('scope') && (
                <Text role="alert" mt={2} fontSize="sm" fontWeight="medium" color="red.700">
                  {intl.formatMessage({ id: 'events.multiParcel.issue.scope' })}
                </Text>
              )}
            </Box>
          );
        })}
      </VStack>
    </SectionBox>
  );
};
