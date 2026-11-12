/**
 * The people the operation names to its certifier, with their roles: OTCO O1 section B and CCOF's
 * Certification Contract A4, C1 and C2. One person can hold several roles. The server allows one
 * primary contact and one legally responsible contact per farm, and says who already holds the role
 * when a second is marked.
 */
import React, { useState } from 'react';
import { Divider, HStack, SimpleGrid, Skeleton, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCheckboxList,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  CONNECTIONS,
  ROLE_FLAGS,
  useAddOperationContactMutation,
  useDeleteOperationContactMutation,
  useGetOperationContactsQuery,
  useUpdateOperationContactMutation,
  type OperationContact,
  type OperationContactInput,
  type RoleFlag
} from 'store/api/operationContactApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

const EMPTY: OperationContactInput = {
  name: '',
  title: '',
  phone: '',
  email: '',
  is_legally_responsible: false,
  is_primary_contact: false,
  is_billing_contact: false,
  is_authorized_representative: false,
  is_responsibly_connected: false,
  connection: '',
  connection_other: ''
};

const fromContact = ({ id: _id, ...rest }: OperationContact): OperationContactInput => rest;

interface Scope {
  companyId: string;
  farmId: string;
}

const ContactForm = ({
  contact,
  companyId,
  farmId,
  onDone
}: Scope & { contact: OperationContact | null; onDone: () => void }) => {
  const intl = useIntl();
  const toast = useToast();
  const [form, setForm] = useState<OperationContactInput>(contact ? fromContact(contact) : EMPTY);
  const [add, { isLoading: isAdding }] = useAddOperationContactMutation();
  const [update, { isLoading: isUpdating }] = useUpdateOperationContactMutation();
  const busy = isAdding || isUpdating;

  const set =
    (key: keyof OperationContactInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      // A description kept under a connection that no longer asks for it would ride the PATCH unseen.
      if (key === 'connection' && value !== 'other') {
        setForm({
          ...form,
          connection: value as OperationContactInput['connection'],
          connection_other: ''
        });
        return;
      }
      setForm({ ...form, [key]: value });
    };
  // The roles as one checkbox list: one person can hold several.
  const roles = ROLE_FLAGS.filter((flag) => form[flag]);
  // Unticking "responsibly connected" clears its connection: the payload carries only what the form shows
  // (review of app #379).
  const setRoles = (next: string[]) =>
    setForm({
      ...form,
      ...(Object.fromEntries(ROLE_FLAGS.map((flag) => [flag, next.includes(flag)])) as Record<
        RoleFlag,
        boolean
      >),
      ...(next.includes('is_responsibly_connected') ? {} : { connection: '', connection_other: '' })
    });

  const save = async () => {
    try {
      const data = { ...form, name: form.name.trim() };
      if (contact) await update({ companyId, farmId, contactId: contact.id, data }).unwrap();
      else await add({ companyId, farmId, data }).unwrap();
      onDone();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.contacts.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <VStack align="stretch" spacing={3} data-testid="operation-contact-form">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField label={intl.formatMessage({ id: 'osp.contacts.name' })} required>
          <StandardInput value={form.name} onChange={set('name')} isDisabled={busy} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'osp.contacts.title' })}>
          <StandardInput value={form.title} onChange={set('title')} isDisabled={busy} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'osp.contacts.phone' })}>
          <StandardInput type="tel" value={form.phone} onChange={set('phone')} isDisabled={busy} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'osp.contacts.email' })}>
          <StandardInput
            type="email"
            value={form.email}
            onChange={set('email')}
            isDisabled={busy}
          />
        </StandardField>
      </SimpleGrid>
      <StandardCheckboxList
        legend={intl.formatMessage({ id: 'osp.contacts.roles' })}
        options={ROLE_FLAGS.map((flag) => ({
          value: flag,
          label: intl.formatMessage({ id: `osp.contacts.role.${flag}` })
        }))}
        value={roles}
        onChange={setRoles}
      />
      {form.is_responsibly_connected && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          <StandardField label={intl.formatMessage({ id: 'osp.contacts.connection' })}>
            <StandardSelect value={form.connection} onChange={set('connection')} isDisabled={busy}>
              <option value="">{intl.formatMessage({ id: 'osp.contacts.notStated' })}</option>
              {CONNECTIONS.map((c) => (
                <option key={c} value={c}>
                  {intl.formatMessage({ id: `osp.contacts.connection.${c}` })}
                </option>
              ))}
            </StandardSelect>
          </StandardField>
          {form.connection === 'other' && (
            <StandardField label={intl.formatMessage({ id: 'osp.contacts.connectionOther' })}>
              <StandardInput
                value={form.connection_other}
                onChange={set('connection_other')}
                isDisabled={busy}
              />
            </StandardField>
          )}
        </SimpleGrid>
      )}
      <HStack spacing={2}>
        <StandardButton size="sm" isDisabled={!form.name.trim()} isLoading={busy} onClick={save}>
          {intl.formatMessage({ id: 'osp.contacts.save' })}
        </StandardButton>
        <StandardButton variant="ghost" size="sm" isDisabled={busy} onClick={onDone}>
          {intl.formatMessage({ id: 'osp.contacts.cancel' })}
        </StandardButton>
      </HStack>
    </VStack>
  );
};

const OSPOperationContactsPanel = ({
  companyId,
  farmId,
  isReadOnly
}: Scope & { isReadOnly?: boolean }) => {
  const intl = useIntl();
  const toast = useToast();
  const scoped = Boolean(companyId && farmId);
  const {
    data: contacts = [],
    isLoading,
    isError
  } = useGetOperationContactsQuery({ companyId, farmId }, { skip: !scoped });
  // null: no form open; 'new': adding; a number: editing that row.
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  // One DELETE per row: a double click must not send a second (review of app #363).
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [remove] = useDeleteOperationContactMutation();
  const notStated = intl.formatMessage({ id: 'osp.contacts.notStated' });

  const doDelete = async (contact: OperationContact) => {
    if (pendingId !== null) return;
    setPendingId(contact.id);
    try {
      await remove({ companyId, farmId, contactId: contact.id }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.contacts.deleteError' }),
        description: apiErrorMessage(err) ?? undefined
      });
    } finally {
      setPendingId(null);
    }
  };

  // A skipped query reads as not loading with no data: that is "unavailable", never "nobody named" (review of app
  // #379). A failed fetch is not an absence either.
  if (isLoading) return <Skeleton height="80px" borderRadius="md" />;
  if (isError || !scoped) {
    return (
      <Text fontSize="sm" color="red.800">
        {intl.formatMessage({ id: 'osp.contacts.loadError' })}
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={2} data-embed="operation_contacts">
      {contacts.length === 0 && editing !== 'new' ? (
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage({ id: 'osp.contacts.empty' })}
        </Text>
      ) : null}
      {contacts.map((contact, i) => (
        <React.Fragment key={contact.id}>
          {i > 0 ? <Divider /> : null}
          {editing === contact.id ? (
            <ContactForm
              contact={contact}
              companyId={companyId}
              farmId={farmId}
              onDone={() => setEditing(null)}
            />
          ) : (
            <VStack align="stretch" spacing={1} data-testid={`operation-contact-${contact.id}`}>
              <Text fontSize="sm" fontWeight="semibold">
                {contact.title ? `${contact.name}, ${contact.title}` : contact.name}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {ROLE_FLAGS.filter((flag) => contact[flag])
                  .map((flag) => intl.formatMessage({ id: `osp.contacts.role.${flag}` }))
                  .join(' · ') || intl.formatMessage({ id: 'osp.contacts.noRole' })}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {[contact.phone || notStated, contact.email || notStated].join(' · ')}
              </Text>
              {!isReadOnly ? (
                <HStack spacing={2}>
                  <StandardButton size="sm" variant="ghost" onClick={() => setEditing(contact.id)}>
                    {intl.formatMessage({ id: 'osp.contacts.edit' })}
                  </StandardButton>
                  <StandardButton
                    size="sm"
                    variant="ghost"
                    isLoading={pendingId === contact.id}
                    isDisabled={pendingId !== null}
                    onClick={() => doDelete(contact)}>
                    {intl.formatMessage({ id: 'osp.contacts.delete' })}
                  </StandardButton>
                </HStack>
              ) : null}
            </VStack>
          )}
        </React.Fragment>
      ))}
      {!isReadOnly && editing === 'new' ? (
        <>
          {contacts.length > 0 ? <Divider /> : null}
          <ContactForm
            contact={null}
            companyId={companyId}
            farmId={farmId}
            onDone={() => setEditing(null)}
          />
        </>
      ) : null}
      {!isReadOnly && editing === null ? (
        <HStack>
          <StandardButton size="sm" variant="outline" onClick={() => setEditing('new')}>
            {intl.formatMessage({ id: 'osp.contacts.add' })}
          </StandardButton>
        </HStack>
      ) : null}
    </VStack>
  );
};

export default OSPOperationContactsPanel;
