/**
 * Farm equipment that contacts organic crops: CCOF G6.0 C2 and G6.1 B1, OTCO C9 9.1-1, WSDA 2121 I.
 *
 * Each item needs its use, whether it is dedicated to organic production and who owns it; anything
 * shared with non-organic work or brought in (rented, borrowed, custom hire) also needs how it is
 * cleaned before organic use and whether it is rinsed. The plan's G6.0 page F reads this register;
 * this is the one place an item is edited. The state line under each item is the server's, the same
 * words the plan prints, so the two cannot disagree.
 *
 * "Not stated" saves as null, never as no: unknown is not a denial.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Divider, HStack, Icon, SimpleGrid, Text, useToast, VStack } from '@chakra-ui/react';
import { FaPlus, FaTractor } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useLocation, useSearchParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  STATUS_URGENCY_TOKENS
} from 'components/Design/StandardComponents';
import {
  useAddProductionEquipmentMutation,
  useDeleteProductionEquipmentMutation,
  useGetProductionEquipmentQuery,
  useUpdateProductionEquipmentMutation,
  type EquipmentOwnership,
  type EquipmentUse,
  type ProductionEquipment,
  type ProductionEquipmentInput
} from 'store/api/productionEquipmentApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import EquipmentStateLine from 'views/Dashboard/OSP/EquipmentStateLine';
import { OWNERSHIP_IDS, OWNERSHIPS, USE_IDS, USES } from 'views/Dashboard/OSP/equipmentLabels';

interface Props {
  companyId: string;
  farmId: string;
}

type TriState = '' | 'yes' | 'no';

type FormState = {
  name: string;
  use: EquipmentUse;
  dedicated_organic: TriState;
  ownership: EquipmentOwnership;
  cleaning_method: string;
  cleaning_materials: string;
  rinsed: TriState;
  rinse_detail: string;
  notes: string;
};

const EMPTY: FormState = {
  name: '',
  use: 'harvest',
  dedicated_organic: '',
  ownership: '',
  cleaning_method: '',
  cleaning_materials: '',
  rinsed: '',
  rinse_detail: '',
  notes: ''
};

const toTri = (value: boolean | null): TriState =>
  value === true ? 'yes' : value === false ? 'no' : '';
const fromTri = (value: TriState): boolean | null =>
  value === 'yes' ? true : value === 'no' ? false : null;

const fromItem = (item: ProductionEquipment): FormState => ({
  name: item.name,
  use: item.use,
  dedicated_organic: toTri(item.dedicated_organic),
  ownership: item.ownership,
  cleaning_method: item.cleaning_method,
  cleaning_materials: item.cleaning_materials,
  rinsed: toTri(item.rinsed),
  rinse_detail: item.rinse_detail,
  notes: item.notes
});

const TriSelect = ({
  value,
  onChange
}: {
  value: TriState;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
  const intl = useIntl();
  return (
    <StandardSelect value={value} onChange={onChange}>
      <option value="">{intl.formatMessage({ id: 'equipment.answer.unset' })}</option>
      <option value="yes">{intl.formatMessage({ id: 'equipment.answer.yes' })}</option>
      <option value="no">{intl.formatMessage({ id: 'equipment.answer.no' })}</option>
    </StandardSelect>
  );
};

const ItemForm = ({
  item,
  companyId,
  farmId,
  onDone
}: {
  item: ProductionEquipment | null;
  companyId: string;
  farmId: string;
  onDone: () => void;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(item ? fromItem(item) : EMPTY);
  const [add, { isLoading: isAdding }] = useAddProductionEquipmentMutation();
  const [update, { isLoading: isUpdating }] = useUpdateProductionEquipmentMutation();

  const save = async () => {
    const data: ProductionEquipmentInput = {
      name: form.name,
      use: form.use,
      dedicated_organic: fromTri(form.dedicated_organic),
      ownership: form.ownership,
      cleaning_method: form.cleaning_method,
      cleaning_materials: form.cleaning_materials,
      rinsed: fromTri(form.rinsed),
      rinse_detail: form.rinse_detail,
      notes: form.notes
    };
    try {
      if (item) await update({ companyId, farmId, itemId: item.id, data }).unwrap();
      else await add({ companyId, farmId, data }).unwrap();
      onDone();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'equipment.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  return (
    <VStack align="stretch" spacing={3} data-testid="equipment-form">
      <Divider />
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField
          label={intl.formatMessage({ id: 'equipment.field.name' })}
          helpText={intl.formatMessage({ id: 'equipment.field.nameHelp' })}
          required>
          <StandardInput value={form.name} onChange={set('name')} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'equipment.field.use' })}>
          <StandardSelect value={form.use} onChange={set('use')}>
            {USES.map((use) => (
              <option key={use} value={use}>
                {intl.formatMessage({ id: USE_IDS[use] })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'equipment.field.dedicated' })}>
          <TriSelect value={form.dedicated_organic} onChange={set('dedicated_organic')} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'equipment.field.ownership' })}>
          <StandardSelect value={form.ownership} onChange={set('ownership')}>
            <option value="">{intl.formatMessage({ id: 'equipment.answer.unset' })}</option>
            {OWNERSHIPS.map((o) => (
              <option key={o} value={o}>
                {intl.formatMessage({ id: OWNERSHIP_IDS[o] })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>
      <StandardField
        label={intl.formatMessage({ id: 'equipment.field.cleaningMethod' })}
        helpText={intl.formatMessage({ id: 'equipment.field.cleaningMethodHelp' })}>
        <StandardTextarea value={form.cleaning_method} onChange={set('cleaning_method')} rows={2} />
      </StandardField>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField label={intl.formatMessage({ id: 'equipment.field.cleaningMaterials' })}>
          <StandardInput value={form.cleaning_materials} onChange={set('cleaning_materials')} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'equipment.field.rinsed' })}>
          <TriSelect value={form.rinsed} onChange={set('rinsed')} />
        </StandardField>
      </SimpleGrid>
      <StandardField label={intl.formatMessage({ id: 'equipment.field.rinseDetail' })}>
        <StandardInput value={form.rinse_detail} onChange={set('rinse_detail')} />
      </StandardField>
      <StandardField label={intl.formatMessage({ id: 'equipment.field.notes' })}>
        <StandardTextarea value={form.notes} onChange={set('notes')} rows={2} />
      </StandardField>
      <HStack spacing={2}>
        <StandardButton
          size="sm"
          isDisabled={!form.name.trim()}
          isLoading={isAdding || isUpdating}
          onClick={save}>
          {intl.formatMessage({ id: 'equipment.save' })}
        </StandardButton>
        <StandardButton variant="ghost" size="sm" onClick={onDone}>
          {intl.formatMessage({ id: 'equipment.cancel' })}
        </StandardButton>
      </HStack>
      <Divider />
    </VStack>
  );
};

const ItemRow = ({
  item,
  highlighted,
  onEdit,
  onDelete
}: {
  item: ProductionEquipment;
  highlighted: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const intl = useIntl();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' });
  }, [highlighted]);
  const facts = [
    intl.formatMessage({ id: USE_IDS[item.use] }),
    item.dedicated_organic === true
      ? intl.formatMessage({ id: 'equipment.dedicatedLine.yes' })
      : item.dedicated_organic === false
      ? intl.formatMessage({ id: 'equipment.dedicatedLine.no' })
      : null,
    item.ownership ? intl.formatMessage({ id: OWNERSHIP_IDS[item.ownership] }) : null
  ].filter(Boolean);
  return (
    <Box
      ref={ref}
      p={3}
      borderRadius="md"
      borderWidth={highlighted ? '2px' : '1px'}
      borderColor={highlighted ? 'green.700' : 'gray.200'}
      data-testid={`equipment-${item.id}`}>
      <HStack spacing={2} align="flex-start">
        <Icon as={FaTractor} color="green.700" mt="3px" />
        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <Text fontSize="sm" fontWeight="semibold">
            {item.name}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {facts.join(' · ')}
          </Text>
          {item.cleaning_method ? (
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage(
                { id: 'equipment.cleaningLine' },
                { method: item.cleaning_method }
              )}
            </Text>
          ) : null}
          <EquipmentStateLine item={item} />
          <HStack spacing={2}>
            <StandardButton size="sm" variant="ghost" onClick={onEdit}>
              {intl.formatMessage({ id: 'equipment.edit' })}
            </StandardButton>
            <StandardButton size="sm" variant="ghost" onClick={onDelete}>
              {intl.formatMessage({ id: 'equipment.delete' })}
            </StandardButton>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

const EquipmentRegisterSection = ({ companyId, farmId }: Props) => {
  const intl = useIntl();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const focusItem = Number(searchParams.get('equipment')) || null;
  const sectionRef = useRef<HTMLDivElement>(null);
  // The plan's "Add in the equipment register" lands here with #production-equipment. The router does
  // not scroll to a hash; a named item scrolls its own row into view instead.
  useEffect(() => {
    if (location.hash === '#production-equipment' && !focusItem) {
      sectionRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [location.hash, focusItem]);
  const {
    data: items = [],
    isLoading,
    isError
  } = useGetProductionEquipmentQuery({ companyId, farmId });
  const [remove] = useDeleteProductionEquipmentMutation();
  // null: no form open; 'new': adding; a number: editing that item.
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const doDelete = async (item: ProductionEquipment) => {
    try {
      await remove({ companyId, farmId, itemId: item.id }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'equipment.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <Box id="production-equipment" ref={sectionRef} w="full">
      <StandardCard
        title={intl.formatMessage({ id: 'equipment.title' })}
        padding={{ base: 0, md: 4 }}
        mb={0}
        headerAction={
          <StandardButton
            variant="outline"
            size="sm"
            leftIcon={<Icon as={FaPlus} />}
            onClick={() => setEditing('new')}>
            {intl.formatMessage({ id: 'equipment.add' })}
          </StandardButton>
        }>
        <VStack align="stretch" spacing={3}>
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'equipment.subtitle' })}
          </Text>
          {editing === 'new' && (
            <ItemForm
              item={null}
              companyId={companyId}
              farmId={farmId}
              onDone={() => setEditing(null)}
            />
          )}
          {/* A failed fetch is not an absence: "no equipment recorded" would be a claim made by an
              error. */}
          {isError && (
            <Text
              fontSize="sm"
              color={STATUS_URGENCY_TOKENS.crit.text}
              data-testid="equipment-load-failed">
              {intl.formatMessage({ id: 'osp.equipment.loadFailed' })}
            </Text>
          )}
          {!isLoading && !isError && items.length === 0 && editing !== 'new' && (
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'equipment.empty' })}
            </Text>
          )}
          {items.map((item) =>
            editing === item.id ? (
              <ItemForm
                key={item.id}
                item={item}
                companyId={companyId}
                farmId={farmId}
                onDone={() => setEditing(null)}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                highlighted={focusItem === item.id}
                onEdit={() => setEditing(item.id)}
                onDelete={() => doDelete(item)}
              />
            )
          )}
        </VStack>
      </StandardCard>
    </Box>
  );
};

export default EquipmentRegisterSection;
