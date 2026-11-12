/**
 * The company's saved applicators: add, edit, remove (WAC 16-228-1320(1)(l)).
 *
 * The spray form offers the active ones and copies their name, license number, address and phone
 * into the record when someone picks a name (`components/Forms/ApplicatorPicker`). The record
 * keeps its own copy, so an edit here never changes a spray already logged, and this page says so.
 *
 * Remove is a deactivation: the person leaves the spray form's list and stays here, marked, so the
 * list still explains the names on older records. Restore brings them back.
 *
 * Every member can read the list; only an administrator or a farm manager sees the controls,
 * which is what the server enforces (`ApplicatorViewSet`).
 *
 * Not the crew roster on Field Notes, which lists phones allowed to send notes and never names the
 * applicator of record.
 */
import React, { useState } from 'react';
import { Badge, Box, Flex, HStack, SimpleGrid, Text, VStack, useToast } from '@chakra-ui/react';
import { FaPlus } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardSpinner,
  StatusList,
  STATUS_URGENCY_TOKENS
} from 'components/Design/StandardComponents';
import {
  useAddApplicatorMutation,
  useDeactivateApplicatorMutation,
  useGetApplicatorsQuery,
  useUpdateApplicatorMutation,
  type Applicator,
  type ApplicatorInput
} from 'store/api/applicatorApi';
import { useUserRole } from 'hooks/useUserRole';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import { US_STATES } from 'utils/usStates';

type FormState = Required<Omit<ApplicatorInput, 'is_active'>>;

const EMPTY: FormState = {
  full_name: '',
  license_number: '',
  license_state: '',
  address: '',
  phone: ''
};

const fromApplicator = (applicator: Applicator): FormState => ({
  full_name: applicator.full_name,
  license_number: applicator.license_number,
  license_state: applicator.license_state,
  address: applicator.address,
  phone: applicator.phone
});

const ApplicatorForm = ({
  companyId,
  applicator,
  onDone
}: {
  companyId: string | number;
  applicator: Applicator | null;
  onDone: () => void;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(applicator ? fromApplicator(applicator) : EMPTY);
  const [add, { isLoading: isAdding }] = useAddApplicatorMutation();
  const [update, { isLoading: isUpdating }] = useUpdateApplicatorMutation();

  const set =
    (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: event.target.value });

  const save = async () => {
    if (!form.full_name.trim()) return;
    try {
      if (applicator) {
        await update({ companyId, applicatorId: applicator.id, data: form }).unwrap();
      } else {
        await add({ companyId, data: form }).unwrap();
      }
      onDone();
    } catch (error) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'settings.applicators.error' }),
        description: apiErrorMessage(error) ?? undefined,
        isClosable: true
      });
    }
  };

  return (
    <VStack align="stretch" spacing={3} py={3} data-testid="applicator-form">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField label={intl.formatMessage({ id: 'settings.applicators.name' })} required>
          <StandardInput name="full_name" value={form.full_name} onChange={set('full_name')} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'settings.applicators.phone' })}>
          <StandardInput name="phone" type="tel" value={form.phone} onChange={set('phone')} />
        </StandardField>
        <StandardField
          label={intl.formatMessage({ id: 'settings.applicators.licenseNumber' })}
          helpText={intl.formatMessage({ id: 'settings.applicators.licenseNumberHelp' })}>
          <StandardInput
            name="license_number"
            value={form.license_number}
            onChange={set('license_number')}
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'settings.applicators.licenseState' })}>
          {/* US state names are postal identifiers and stay as they are. */}
          <StandardSelect
            name="license_state"
            value={form.license_state}
            onChange={set('license_state')}>
            <option value="">{intl.formatMessage({ id: 'settings.applicators.noState' })}</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>
      <StandardField label={intl.formatMessage({ id: 'settings.applicators.address' })}>
        <StandardInput
          name="address"
          value={form.address}
          placeholder={intl.formatMessage({
            id: 'events.chemical.form.applicatorAddressPlaceholder'
          })}
          onChange={set('address')}
        />
      </StandardField>
      <HStack spacing={2}>
        <StandardButton
          size="sm"
          isDisabled={!form.full_name.trim()}
          isLoading={isAdding || isUpdating}
          onClick={save}>
          {intl.formatMessage({ id: 'settings.applicators.save' })}
        </StandardButton>
        <StandardButton size="sm" variant="ghost" onClick={onDone}>
          {intl.formatMessage({ id: 'app.cancel' })}
        </StandardButton>
      </HStack>
    </VStack>
  );
};

const ApplicatorRow = ({
  applicator,
  canWrite,
  onEdit,
  onToggle
}: {
  applicator: Applicator;
  canWrite: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) => {
  const intl = useIntl();
  const license = applicator.license_number
    ? intl.formatMessage(
        { id: 'settings.applicators.licenseLine' },
        {
          number: applicator.license_number,
          state: applicator.license_state || '-'
        }
      )
    : intl.formatMessage({ id: 'settings.applicators.noLicense' });
  const facts = [license, applicator.phone].filter(Boolean).join(' · ');
  return (
    <Flex
      py={3}
      gap={{ base: 2, md: 4 }}
      justify="space-between"
      align={{ base: 'flex-start', md: 'center' }}
      direction={{ base: canWrite ? 'column' : 'row', md: 'row' }}
      data-testid="applicator-row">
      <Box minW={0}>
        <HStack spacing={2} flexWrap="wrap">
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {applicator.full_name}
          </Text>
          {/* Neutral: a plain fact about the row, never a grade. */}
          {!applicator.is_active && (
            <Badge variant="neutral">
              {intl.formatMessage({ id: 'settings.applicators.removed' })}
            </Badge>
          )}
        </HStack>
        <Text fontSize="sm" color="gray.600" mt={0.5}>
          {facts}
        </Text>
        {applicator.address && (
          <Text fontSize="sm" color="gray.600" mt={0.5}>
            {applicator.address}
          </Text>
        )}
      </Box>
      {canWrite && (
        <HStack spacing={2} flexShrink={0}>
          <StandardButton
            size="sm"
            variant="ghost"
            aria-label={intl.formatMessage(
              { id: 'settings.applicators.editLabel' },
              { name: applicator.full_name }
            )}
            onClick={onEdit}>
            {intl.formatMessage({ id: 'settings.applicators.edit' })}
          </StandardButton>
          <StandardButton
            size="sm"
            variant="ghost"
            aria-label={intl.formatMessage(
              {
                id: applicator.is_active
                  ? 'settings.applicators.removeLabel'
                  : 'settings.applicators.restoreLabel'
              },
              { name: applicator.full_name }
            )}
            onClick={onToggle}>
            {intl.formatMessage({
              id: applicator.is_active
                ? 'settings.applicators.remove'
                : 'settings.applicators.restore'
            })}
          </StandardButton>
        </HStack>
      )}
    </Flex>
  );
};

const ApplicatorRegister = () => {
  const intl = useIntl();
  const toast = useToast();
  const { canWrite } = useUserRole();
  const companyId = useSelector(
    (state: { company?: { currentCompany?: { id?: string | number } } }) =>
      state.company?.currentCompany?.id
  );
  const {
    data: applicators = [],
    isLoading,
    isError
  } = useGetApplicatorsQuery({ companyId: companyId ?? '' }, { skip: !companyId });
  const [deactivate] = useDeactivateApplicatorMutation();
  const [update] = useUpdateApplicatorMutation();
  // null: no form open; 'new': adding; a number: editing that applicator.
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  // A skipped query reads as an empty list; "no applicators yet" before anything was asked would
  // be a claim made out of a loading state.
  const answered = Boolean(companyId) && !isLoading;

  const toggle = async (applicator: Applicator) => {
    if (!companyId) return;
    try {
      if (applicator.is_active) {
        await deactivate({ companyId, applicatorId: applicator.id }).unwrap();
      } else {
        await update({
          companyId,
          applicatorId: applicator.id,
          data: { is_active: true }
        }).unwrap();
      }
    } catch (error) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'settings.applicators.error' }),
        description: apiErrorMessage(error) ?? undefined,
        isClosable: true
      });
    }
  };

  return (
    <StandardCard
      title={intl.formatMessage({ id: 'settings.applicators.title' })}
      subtitle={intl.formatMessage({ id: 'settings.applicators.subtitle' })}
      variant="elevated"
      mb={0}
      headerAction={
        canWrite && companyId && editing !== 'new' ? (
          <StandardButton
            variant="outline"
            size="sm"
            leftIcon={<FaPlus />}
            onClick={() => setEditing('new')}>
            {intl.formatMessage({ id: 'settings.applicators.add' })}
          </StandardButton>
        ) : undefined
      }>
      <VStack align="stretch" spacing={0}>
        {editing === 'new' && companyId && (
          <ApplicatorForm companyId={companyId} applicator={null} onDone={() => setEditing(null)} />
        )}
        {!answered && <StandardSpinner label={intl.formatMessage({ id: 'app.loading' })} />}
        {/* A failed fetch is not an absence. */}
        {answered && isError && (
          <Text fontSize="sm" color={STATUS_URGENCY_TOKENS.crit.text} py={3}>
            {intl.formatMessage({ id: 'settings.applicators.loadFailed' })}
          </Text>
        )}
        {answered && !isError && applicators.length === 0 && editing !== 'new' && (
          <Text fontSize="sm" color="gray.600" py={3} data-testid="applicators-empty">
            {intl.formatMessage({ id: 'settings.applicators.empty' })}
          </Text>
        )}
        {applicators.length > 0 && (
          <StatusList testId="applicator-list">
            {applicators.map((applicator) =>
              editing === applicator.id && companyId ? (
                <ApplicatorForm
                  key={applicator.id}
                  companyId={companyId}
                  applicator={applicator}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <ApplicatorRow
                  key={applicator.id}
                  applicator={applicator}
                  canWrite={canWrite}
                  onEdit={() => setEditing(applicator.id)}
                  onToggle={() => toggle(applicator)}
                />
              )
            )}
          </StatusList>
        )}
      </VStack>
    </StandardCard>
  );
};

export default ApplicatorRegister;
