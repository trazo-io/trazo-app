/**
 * "Fill from a saved applicator" on the spray form (WAC 16-228-1320(1)(l)).
 *
 * Picking a name COPIES the saved applicator's name, license number, address and phone into the
 * record's own inputs through `onPick`. The copy is ordinary form text, still editable, and the
 * record never links back to the saved applicator: editing or removing someone later never
 * changes a spray already logged (owner decision 2026-11-11).
 *
 * NOTHING HAPPENS WITHOUT A PICK. The choice lives in this component's own state, never in the
 * form, so it is not sent with the record (the wizard's payload cleaner is a passthrough), and no
 * effect copies on mount: opening an existing record to edit it never overwrites what it holds.
 *
 * Until the list has answered, nothing renders. A skipped or loading query reads as an empty list,
 * and "no saved applicators" would be a claim made out of a loading state.
 */
import React, { useState } from 'react';
import { Link, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';

import { StandardField, StandardSelect } from 'components/Design/StandardComponents';
import { useGetApplicatorsQuery, type Applicator } from 'store/api/applicatorApi';

/** Where the saved applicators are managed. Open to every member; only admins and managers edit. */
export const APPLICATORS_PAGE = '/admin/dashboard/settings/applicators';

/** The record fields a pick fills, in the order the form shows them. */
export const copiedFields = (applicator: Applicator) => ({
  applicator_name: applicator.full_name,
  applicator_certification: applicator.license_number,
  applicator_address: applicator.address,
  applicator_phone: applicator.phone
});

interface Props {
  onPick: (values: ReturnType<typeof copiedFields>) => void;
}

const ApplicatorPicker = ({ onPick }: Props) => {
  const intl = useIntl();
  const companyId = useSelector(
    (state: { company?: { currentCompany?: { id?: string | number } } }) =>
      state.company?.currentCompany?.id
  );
  const {
    data: applicators = [],
    isLoading,
    isError
  } = useGetApplicatorsQuery(
    { companyId: companyId ?? '', active: true },
    // The list is managed in another tab (below), so coming back to this one re-reads it.
    { skip: !companyId, refetchOnFocus: true }
  );
  const [chosen, setChosen] = useState('');

  // An accelerator, not a field: when the list cannot be read, the inputs below still work. A
  // failed refetch (coming back from the list in another tab) keeps the cached list, so the picker
  // stays while there is something to offer (review of #377).
  if (!companyId || isLoading || (isError && applicators.length === 0)) return null;

  // A new tab, so a half-filled record is never left behind (an edit keeps no draft).
  const manageLink = (id: string) => (
    <Link
      as={RouterLink}
      to={APPLICATORS_PAGE}
      target="_blank"
      rel="noopener noreferrer"
      color="green.700"
      fontWeight="semibold"
      data-testid="applicator-manage-link">
      {intl.formatMessage({ id })}
    </Link>
  );

  if (applicators.length === 0) {
    return (
      <Text fontSize="sm" color="gray.600" data-testid="applicator-picker-empty">
        {intl.formatMessage({ id: 'events.chemical.applicatorPicker.none' })}{' '}
        {manageLink('events.chemical.applicatorPicker.addLink')}
      </Text>
    );
  }

  return (
    <StandardField
      label={intl.formatMessage({ id: 'events.chemical.applicatorPicker.label' })}
      helpText={intl.formatMessage({ id: 'events.chemical.applicatorPicker.help' })}>
      <StandardSelect
        data-testid="applicator-picker"
        value={chosen}
        placeholder={intl.formatMessage({ id: 'events.chemical.applicatorPicker.placeholder' })}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
          const id = event.target.value;
          const picked = applicators.find((applicator) => String(applicator.id) === id);
          if (picked) onPick(copiedFields(picked));
          // Back to the placeholder: the picker copies, it does not hold a choice. Picking the
          // same person again must copy again, over any hand edit (review of #377).
          setChosen('');
        }}>
        {applicators.map((applicator) => (
          <option key={applicator.id} value={String(applicator.id)}>
            {applicator.license_number
              ? `${applicator.full_name} (${applicator.license_number})`
              : applicator.full_name}
          </option>
        ))}
      </StandardSelect>
      <Text fontSize="xs" mt={1}>
        {manageLink('events.chemical.applicatorPicker.manageLink')}
      </Text>
    </StandardField>
  );
};

export default ApplicatorPicker;
