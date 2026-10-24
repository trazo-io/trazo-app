/**
 * One activity logged on several parcels: the parcel picker (wizard step 0) and the per-parcel
 * cards (step 1). What is per parcel comes from the spec (`config/events/multiParcel.ts`, a checked
 * copy of the server's); the arithmetic and the request body from `utils/multiParcel.ts`. These
 * components only ask for it.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { Box, Stack, Text, VStack } from '@chakra-ui/react';
import { FaBalanceScale, FaLayerGroup } from 'react-icons/fa';

import {
  SectionBox,
  SectionHeader,
  StandardField,
  StandardInput,
  StandardSegmentedControl
} from 'components/Design/StandardComponents';
import { APPLICATION_RATE_UNIT_SYMBOLS } from 'config/events/enums';
import { UNIT_CODE_SYMBOLS } from 'config/events/formatters';
import { SectionInput } from 'components/Fields/BlockIdField';
import { ParcelPicker } from 'components/Events/ParcelPicker';
import type { ParcelGeometry } from 'store/api/parcelGeometryApi';
import type { MultiParcelRules, PerParcelField } from 'config/events/multiParcel';
import {
  areaUnitOf,
  derivedValue,
  hasRecordedSize,
  hectaresIn,
  targetArea,
  targetIssues,
  unitOf,
  type BlockScope,
  type ParcelTarget,
  type SharedForm
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
  /** The farm's outlines (parcel-geometry), for the Map mode. */
  geometry?: ParcelGeometry[];
  originParcelId: number;
  /** Selected parcel ids OTHER than the origin. */
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** For the size shown under each parcel. */
  areaUnit?: string;
}

export const AlsoAppliedTo = ({
  parcels,
  geometry,
  originParcelId,
  selectedIds,
  onChange,
  areaUnit = 'acres'
}: AlsoAppliedToProps) => {
  const intl = useIntl();
  return (
    <SectionBox>
      <SectionHeader
        icon={FaLayerGroup}
        title={intl.formatMessage({ id: 'events.multiParcel.title' })}
        description={intl.formatMessage({ id: 'events.multiParcel.hint' })}
      />
      <ParcelPicker
        parcels={parcels}
        geometry={geometry}
        originParcelId={originParcelId}
        selectedIds={selectedIds}
        onChange={onChange}
        legend={intl.formatMessage({ id: 'events.multiParcel.legend' })}
        areaUnit={areaUnit}
      />
    </SectionBox>
  );
};

interface PerParcelCardsProps {
  targets: ParcelTarget[];
  onChange: (targets: ParcelTarget[]) => void;
  rules: MultiParcelRules;
  /** The shared form values the cards read (units, the label rate). */
  form: SharedForm;
  /** Each parcel's own known sections, by parcel id (for the chips). */
  sectionsByParcel?: Record<number, string[]>;
  /** After a refused Continue: mark what each parcel is missing. */
  showIssues: boolean;
}

const unitSymbol = (unit: string) => AREA_SYMBOLS[unit] ?? volumeSymbol(unit);

export const PerParcelCards = ({
  targets,
  onChange,
  rules,
  form,
  sectionsByParcel = {},
  showIssues
}: PerParcelCardsProps) => {
  const intl = useIntl();
  const update = (parcelId: number, patch: Partial<ParcelTarget>) =>
    onChange(targets.map((t) => (t.parcelId === parcelId ? { ...t, ...patch } : t)));
  const areaUnitCode = areaUnitOf(form);
  const areaUnit = areaSymbol(areaUnitCode);

  const fieldLabel = (field: PerParcelField) => {
    const unit = unitOf(field, form);
    return intl.formatMessage(
      { id: `events.multiParcel.field.${field.key}` },
      { unit: unit ? unitSymbol(unit) : '' }
    );
  };

  const derivationText = (target: ParcelTarget, field: PerParcelField) => {
    const derived = derivedValue(target, field, form);
    const area = targetArea(target, areaUnitCode);
    if (!field.derive) return undefined;
    if (derived === null || area === null) {
      return intl.formatMessage({ id: 'events.multiParcel.noDerivation' });
    }
    const rateUnitCode = String(form[field.derive.rate_unit_key] ?? '');
    return intl.formatMessage(
      { id: 'events.multiParcel.derivation' },
      {
        rate: `${fmt(Number(form[field.derive.rate_key]))} ${
          APPLICATION_RATE_UNIT_SYMBOLS[rateUnitCode] ?? rateUnitCode
        }`,
        area: `${fmt(area)} ${areaUnit}`,
        amount: `${fmt(derived)} ${unitSymbol(unitOf(field, form))}`
      }
    );
  };

  return (
    <SectionBox>
      <SectionHeader
        icon={FaBalanceScale}
        title={intl.formatMessage({ id: 'events.multiParcel.amountsTitle' })}
        description={intl.formatMessage(
          { id: 'events.multiParcel.amountsHint' },
          {
            // Only what these cards ask: no area or label rate on a general or weather record.
            area: rules.areaKey ? 'yes' : 'no',
            fields: rules.fields.length ? 'yes' : 'no',
            derive: rules.fields.some((field) => field.derive) ? 'yes' : 'no'
          }
        )}
      />
      <VStack align="stretch" spacing={3}>
        {targets.map((target) => {
          const issues = showIssues ? targetIssues(target, rules, form) : [];
          const wholeArea = hectaresIn(target.areaHa, areaUnitCode);
          // Without an area per parcel the card has nothing to ask first; with one, the rest of
          // the card waits for the whole / part answer, so no value is asked against no area.
          const answered = !rules.areaKey || target.scope !== null;
          return (
            <Box
              key={target.parcelId}
              borderWidth="1px"
              borderColor={issues.length ? 'red.300' : 'gray.200'}
              borderRadius="lg"
              p={{ base: 3, md: 4 }}>
              <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={2}>
                {rules.areaKey
                  ? intl.formatMessage(
                      { id: 'events.multiParcel.scopeLabel' },
                      { name: target.name }
                    )
                  : target.name}
              </Text>
              {rules.areaKey && (
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
                    {
                      key: 'part',
                      label: intl.formatMessage({ id: 'events.multiParcel.scopePart' })
                    }
                  ]}
                />
              )}
              {rules.areaKey && target.scope === 'all' && !hasRecordedSize(target) && (
                // No size on record for this parcel: ask for it here rather than leave a "whole
                // parcel" that can never resolve, or push the grower to "part", which would
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
              {rules.areaKey && target.scope === 'part' && (
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
                  {rules.scope && (
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
                  )}
                </Stack>
              )}
              {answered && rules.sections && (
                <Box mt={3}>
                  <StandardField
                    label={intl.formatMessage({ id: 'fieldDetails.blockId' })}
                    helpText={intl.formatMessage({ id: 'events.multiParcel.sectionHelp' })}>
                    <SectionInput
                      value={target.section}
                      onChange={(section) => update(target.parcelId, { section })}
                      knownSections={sectionsByParcel[target.parcelId] ?? []}
                    />
                  </StandardField>
                </Box>
              )}
              {answered &&
                rules.fields.map((field) => {
                  const derived = derivedValue(target, field, form);
                  return (
                    <Box mt={3} key={field.key}>
                      <StandardField
                        label={fieldLabel(field)}
                        required={field.required}
                        helpText={derivationText(target, field)}
                        error={
                          issues.includes(`field:${field.key}`)
                            ? intl.formatMessage({ id: 'events.multiParcel.issue.amount' })
                            : undefined
                        }>
                        <StandardInput
                          type="number"
                          min="0"
                          step="0.001"
                          // A derived value is a PLACEHOLDER, not a value: the grower sees it, and
                          // typing replaces it. Saved as typed, or derived when left empty.
                          placeholder={derived !== null ? String(derived) : ''}
                          value={target.values[field.key] ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            update(target.parcelId, {
                              values: { ...target.values, [field.key]: e.target.value }
                            })
                          }
                        />
                      </StandardField>
                    </Box>
                  );
                })}
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
