/**
 * The crops a parcel grows now or is planned to grow, with variety, expected harvest and acres:
 * CCOF ORGB49 A8, WSDA AGR 2264 ref 8 and OTCO C2 2.1 10) ask the same table.
 *
 * Every figure is the operator's. Nothing is computed into a row: a crop of a season still open on
 * the parcel is offered as a starting point (it fills the crop name), and the operator saves it.
 * A column left blank stays blank, and the parcel PDF prints "Not stated".
 *
 * An orchard row is one block: block name, rootstock, year planted and bearing status (overall review
 * 2026-11, OV-FJ-C06). The block is the free-text name written under Section / rows on activities;
 * nothing links an activity to the row. Like the parcel PDF, a row shows those four only once a row
 * on the parcel states one, so a vegetable parcel's list stays as it was. A blank bearing status is
 * "not stated", never "not yet bearing".
 */
import React, { useState } from 'react';
import { Divider, HStack, SimpleGrid, Text, useToast, VStack, Wrap } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardNumberInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  useAddPlannedCropMutation,
  useDeletePlannedCropMutation,
  useUpdatePlannedCropMutation,
  type BearingStatus,
  type PlannedCrop,
  type PlannedCropInput
} from 'store/api/parcelApplicationApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import { formatDateOnly } from 'utils/dateOnly';

type FormState = {
  crop: string;
  variety: string;
  expected_harvest: string;
  acres: string;
  block_name: string;
  rootstock: string;
  year_planted: string;
  bearing_status: BearingStatus;
};

const EMPTY: FormState = {
  crop: '',
  variety: '',
  expected_harvest: '',
  acres: '',
  block_name: '',
  rootstock: '',
  year_planted: '',
  bearing_status: ''
};

/** The earliest planting year the server accepts (`EARLIEST_YEAR_PLANTED` in product/models.py). */
const EARLIEST_YEAR_PLANTED = 1900;

const fromCrop = (c: PlannedCrop): FormState => ({
  crop: c.crop,
  variety: c.variety,
  expected_harvest: c.expected_harvest ?? '',
  acres: c.acres ?? '',
  block_name: c.block_name ?? '',
  rootstock: c.rootstock ?? '',
  year_planted: c.year_planted != null ? String(c.year_planted) : '',
  bearing_status: c.bearing_status ?? ''
});

const toInput = (f: FormState): PlannedCropInput => ({
  crop: f.crop.trim(),
  variety: f.variety.trim(),
  expected_harvest: f.expected_harvest || null,
  acres: f.acres.trim() || null,
  block_name: f.block_name.trim(),
  rootstock: f.rootstock.trim(),
  year_planted: f.year_planted.trim() ? Number(f.year_planted) : null,
  bearing_status: f.bearing_status
});

/** Whether a typed year is one the server accepts: blank, or a whole year from 1900 to this year. Checked
 *  before saving so the operator reads why in their own language; the server refuses the same years. */
export const yearPlantedIsValid = (raw: string, thisYear = new Date().getFullYear()): boolean => {
  const year = raw.trim();
  if (!year) return true;
  return /^\d{4}$/.test(year) && Number(year) >= EARLIEST_YEAR_PLANTED && Number(year) <= thisYear;
};

/** Whether a row states any orchard column, mirroring `_states_orchard_fields` in the backend's
 *  parcel_application_lines.py: one such row shows the orchard columns for the whole parcel. */
export const statesOrchardFields = (c: PlannedCrop): boolean =>
  Boolean(c.block_name || c.rootstock || c.year_planted != null || c.bearing_status);

/** The words of a crop name, lower case and singular, mirroring `_crop_words` in the backend's
 *  parcel_application_lines.py: "Bartlett pears" holds "pear", "Pineapple" does not hold "apple". */
const cropWords = (name: string): Set<string> => {
  const words = new Set<string>();
  for (const raw of name.toLowerCase().match(/[a-zà-ÿ]+/g) ?? []) {
    let word = raw;
    if (word.endsWith('ies') && word.length > 4) word = `${word.slice(0, -3)}y`;
    else if (word.endsWith('es') && /(ch|sh|x|ss|o)$/.test(word.slice(0, -2)))
      word = word.slice(0, -2);
    else if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3)
      word = word.slice(0, -1);
    words.add(word);
  }
  return words;
};

const isSubset = (a: Set<string>, b: Set<string>) => Array.from(a).every((w) => b.has(w));

/** Whether a season's crop is named in the list: every word of one name appears in the other. */
export const cropIsListed = (name: string, listed: string[]): boolean => {
  const words = cropWords(name);
  if (words.size === 0) return true;
  return listed.some((item) => {
    const other = cropWords(item);
    return isSubset(words, other) || (other.size > 0 && isSubset(other, words));
  });
};

interface Scope {
  companyId: string;
  farmId: string;
  parcelId: string;
}

const CropForm = ({
  crop,
  initial,
  companyId,
  farmId,
  parcelId,
  onDone
}: Scope & { crop: PlannedCrop | null; initial: FormState; onDone: () => void }) => {
  const intl = useIntl();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(initial);
  const [add, { isLoading: isAdding }] = useAddPlannedCropMutation();
  const [update, { isLoading: isUpdating }] = useUpdatePlannedCropMutation();
  const busy = isAdding || isUpdating;

  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const thisYear = new Date().getFullYear();
  const yearInvalid = !yearPlantedIsValid(form.year_planted, thisYear);

  const save = async () => {
    if (yearInvalid) return;
    try {
      const data = toInput(form);
      if (crop) await update({ companyId, farmId, parcelId, cropId: crop.id, data }).unwrap();
      else await add({ companyId, farmId, parcelId, data }).unwrap();
      onDone();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'parcelApp.crops.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <VStack align="stretch" spacing={3} data-testid="planned-crop-form">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField label={intl.formatMessage({ id: 'parcelApp.crops.crop' })} required>
          <StandardInput
            value={form.crop}
            onChange={set('crop')}
            isDisabled={busy}
            placeholder={intl.formatMessage({ id: 'parcelApp.crops.cropPlaceholder' })}
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'parcelApp.crops.variety' })}>
          <StandardInput value={form.variety} onChange={set('variety')} isDisabled={busy} />
        </StandardField>
        <StandardField
          label={intl.formatMessage({ id: 'parcelApp.crops.block' })}
          helpText={intl.formatMessage({ id: 'parcelApp.crops.blockHelp' })}>
          <StandardInput
            value={form.block_name}
            onChange={set('block_name')}
            isDisabled={busy}
            maxLength={50}
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'parcelApp.crops.rootstock' })}>
          <StandardInput
            value={form.rootstock}
            onChange={set('rootstock')}
            isDisabled={busy}
            placeholder={intl.formatMessage({ id: 'parcelApp.crops.rootstockPlaceholder' })}
          />
        </StandardField>
        <StandardField
          label={intl.formatMessage({ id: 'parcelApp.crops.yearPlanted' })}
          error={
            yearInvalid
              ? intl.formatMessage(
                  { id: 'parcelApp.crops.yearPlantedRange' },
                  { from: EARLIEST_YEAR_PLANTED, to: thisYear }
                )
              : undefined
          }>
          {/* A year is a whole count, so StandardNumberInput; no clamping, so a typo reaches the
              server's own refusal instead of being silently rewritten to a year the operator did not type. */}
          <StandardNumberInput
            value={form.year_planted}
            onChange={(value) => setForm({ ...form, year_planted: value })}
            isDisabled={busy}
            precision={0}
            min={EARLIEST_YEAR_PLANTED}
            max={thisYear}
            keepWithinRange={false}
            clampValueOnBlur={false}
            inputMode="numeric"
            hideStepper
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'parcelApp.crops.bearingStatus' })}>
          <StandardSelect
            value={form.bearing_status}
            onChange={set('bearing_status')}
            isDisabled={busy}>
            <option value="">{intl.formatMessage({ id: 'parcelApp.crops.notStated' })}</option>
            <option value="bearing">{intl.formatMessage({ id: 'parcelApp.crops.bearing' })}</option>
            <option value="non_bearing">
              {intl.formatMessage({ id: 'parcelApp.crops.nonBearing' })}
            </option>
          </StandardSelect>
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'parcelApp.crops.harvest' })}>
          <StandardInput
            type="date"
            value={form.expected_harvest}
            onChange={set('expected_harvest')}
            isDisabled={busy}
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'parcelApp.crops.acres' })}>
          <StandardInput
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.acres}
            onChange={set('acres')}
            isDisabled={busy}
          />
        </StandardField>
      </SimpleGrid>
      <HStack spacing={2}>
        <StandardButton size="sm" isDisabled={!form.crop.trim()} isLoading={busy} onClick={save}>
          {intl.formatMessage({ id: 'parcelApp.crops.save' })}
        </StandardButton>
        <StandardButton variant="ghost" size="sm" isDisabled={busy} onClick={onDone}>
          {intl.formatMessage({ id: 'parcelApp.crops.cancel' })}
        </StandardButton>
      </HStack>
    </VStack>
  );
};

const PlannedCropRows = ({
  crops,
  openSeasonCrops,
  canWrite,
  companyId,
  farmId,
  parcelId
}: Scope & { crops: PlannedCrop[]; openSeasonCrops: string[]; canWrite: boolean }) => {
  const intl = useIntl();
  const toast = useToast();
  // null: no form open; 'new': adding; a number: editing that row.
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [remove] = useDeletePlannedCropMutation();
  // The row whose DELETE is in flight. Per row, not the hook's shared isLoading, so one removal does not
  // disable every row; and a second click on the same row never sends a second DELETE (review of app #363).
  const [pendingId, setPendingId] = useState<number | null>(null);
  const notStated = intl.formatMessage({ id: 'parcelApp.crops.notStated' });

  const listed = crops.map((c) => c.crop);
  const unlisted = openSeasonCrops.filter((name) => !cropIsListed(name, listed));
  const orchard = crops.some(statesOrchardFields);
  const bearingLabel: Record<BearingStatus, string> = {
    '': notStated,
    bearing: intl.formatMessage({ id: 'parcelApp.crops.bearing' }),
    non_bearing: intl.formatMessage({ id: 'parcelApp.crops.nonBearing' })
  };
  const orchardLine = (crop: PlannedCrop) =>
    [
      ['parcelApp.crops.block', crop.block_name || notStated],
      ['parcelApp.crops.rootstock', crop.rootstock || notStated],
      [
        'parcelApp.crops.yearPlanted',
        crop.year_planted != null ? String(crop.year_planted) : notStated
      ],
      ['parcelApp.crops.bearingStatus', bearingLabel[crop.bearing_status ?? ''] ?? notStated]
    ]
      .map(([id, value]) => `${intl.formatMessage({ id })}: ${value}`)
      .join(' · ');

  const startNew = (crop = '') => {
    setInitial({ ...EMPTY, crop });
    setEditing('new');
  };

  const doDelete = async (crop: PlannedCrop) => {
    if (pendingId !== null) return;
    setPendingId(crop.id);
    try {
      await remove({ companyId, farmId, parcelId, cropId: crop.id }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'parcelApp.crops.deleteError' }),
        description: apiErrorMessage(err) ?? undefined
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <VStack align="stretch" spacing={2} data-embed="crop_table">
      {crops.length === 0 && editing !== 'new' ? (
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage({ id: 'parcelApp.crops.empty' })}
        </Text>
      ) : null}
      {crops.map((crop, i) => (
        <React.Fragment key={crop.id}>
          {i > 0 ? <Divider /> : null}
          {editing === crop.id ? (
            <CropForm
              crop={crop}
              initial={fromCrop(crop)}
              companyId={companyId}
              farmId={farmId}
              parcelId={parcelId}
              onDone={() => setEditing(null)}
            />
          ) : (
            <VStack align="stretch" spacing={1} data-testid={`planned-crop-${crop.id}`}>
              <Text fontSize="sm" fontWeight="semibold">
                {crop.variety ? `${crop.crop} (${crop.variety})` : crop.crop}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {[
                  `${intl.formatMessage({ id: 'parcelApp.crops.harvest' })}: ${
                    crop.expected_harvest
                      ? formatDateOnly(crop.expected_harvest, intl.locale)
                      : notStated
                  }`,
                  `${intl.formatMessage({ id: 'parcelApp.crops.acres' })}: ${
                    crop.acres != null ? Number(crop.acres).toString() : notStated
                  }`
                ].join(' · ')}
              </Text>
              {orchard ? (
                <Text
                  fontSize="xs"
                  color="gray.600"
                  data-testid={`planned-crop-orchard-${crop.id}`}>
                  {orchardLine(crop)}
                </Text>
              ) : null}
              {canWrite ? (
                <HStack spacing={2}>
                  <StandardButton size="sm" variant="ghost" onClick={() => setEditing(crop.id)}>
                    {intl.formatMessage({ id: 'parcelApp.crops.edit' })}
                  </StandardButton>
                  <StandardButton
                    size="sm"
                    variant="ghost"
                    isLoading={pendingId === crop.id}
                    isDisabled={pendingId !== null}
                    onClick={() => doDelete(crop)}>
                    {intl.formatMessage({ id: 'parcelApp.crops.delete' })}
                  </StandardButton>
                </HStack>
              ) : null}
            </VStack>
          )}
        </React.Fragment>
      ))}
      {canWrite && editing === 'new' ? (
        <>
          {crops.length > 0 ? <Divider /> : null}
          <CropForm
            crop={null}
            initial={initial}
            companyId={companyId}
            farmId={farmId}
            parcelId={parcelId}
            onDone={() => setEditing(null)}
          />
        </>
      ) : null}
      {canWrite && editing === null ? (
        <VStack align="stretch" spacing={2}>
          {unlisted.length > 0 ? (
            <>
              <Text fontSize="xs" color="gray.600">
                {intl.formatMessage({ id: 'parcelApp.crops.fromSeasons' })}
              </Text>
              <Wrap spacing={2}>
                {unlisted.map((name) => (
                  <StandardButton
                    key={name}
                    size="sm"
                    variant="outline"
                    onClick={() => startNew(name)}>
                    {intl.formatMessage({ id: 'parcelApp.crops.addNamed' }, { crop: name })}
                  </StandardButton>
                ))}
              </Wrap>
            </>
          ) : null}
          <HStack>
            <StandardButton size="sm" variant="outline" onClick={() => startNew()}>
              {intl.formatMessage({ id: 'parcelApp.crops.add' })}
            </StandardButton>
          </HStack>
        </VStack>
      ) : null}
    </VStack>
  );
};

export default PlannedCropRows;
