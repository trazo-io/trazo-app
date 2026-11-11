/**
 * The crops a parcel grows now or is planned to grow, with variety, expected harvest and acres:
 * CCOF ORGB49 A8, WSDA AGR 2264 ref 8 and OTCO C2 2.1 10) ask the same table.
 *
 * Every figure is the operator's. Nothing is computed into a row: a crop of a season still open on
 * the parcel is offered as a starting point (it fills the crop name), and the operator saves it.
 * A column left blank stays blank, and the parcel PDF prints "Not stated".
 */
import React, { useState } from 'react';
import { Divider, HStack, SimpleGrid, Text, useToast, VStack, Wrap } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { StandardButton, StandardField, StandardInput } from 'components/Design/StandardComponents';
import {
  useAddPlannedCropMutation,
  useDeletePlannedCropMutation,
  useUpdatePlannedCropMutation,
  type PlannedCrop,
  type PlannedCropInput
} from 'store/api/parcelApplicationApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import { formatDateOnly } from 'utils/dateOnly';

type FormState = { crop: string; variety: string; expected_harvest: string; acres: string };

const EMPTY: FormState = { crop: '', variety: '', expected_harvest: '', acres: '' };

const fromCrop = (c: PlannedCrop): FormState => ({
  crop: c.crop,
  variety: c.variety,
  expected_harvest: c.expected_harvest ?? '',
  acres: c.acres ?? ''
});

const toInput = (f: FormState): PlannedCropInput => ({
  crop: f.crop.trim(),
  variety: f.variety.trim(),
  expected_harvest: f.expected_harvest || null,
  acres: f.acres.trim() || null
});

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

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const save = async () => {
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
