/**
 * Companies whose brands this farm packs into: CCOF G7.0 C, OTCO C8 8.3, WSDA 2121 N 6-7.
 *
 * Each needs its status and the copy behind it: a certified owner's organic certificate, or for an
 * uncertified owner the certifying agent's own agreement (CCOF's Co-Packer Application, OTCO's
 * Private Label Agreement). The plan's G7.0 page C reads this register; this is the one place a
 * brand owner is edited. The state line under each owner is the server's (`state`), the same words
 * the plan prints, so the two cannot disagree.
 *
 * Admins and farm managers only, like the server: a brand-owner list is commercial data.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaPlus, FaTag } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useLocation, useSearchParams } from 'react-router-dom';

import CertifyingAgentPicker from 'components/Certifications/CertifyingAgentPicker';
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
  useAddBrandOwnerMutation,
  useDeleteBrandOwnerMutation,
  useGetBrandOwnersQuery,
  useUpdateBrandOwnerMutation,
  type BrandOwner,
  type BrandOwnerCertificationStatus,
  type BrandOwnerInput
} from 'store/api/brandOwnerApi';
import { useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import BrandOwnerStateLine from 'views/Dashboard/OSP/BrandOwnerStateLine';

interface Props {
  companyId: string;
  farmId: string;
  /** The farm's state, so the certifier picker lists that state's agencies first. */
  state?: string;
}

const STATUSES: BrandOwnerCertificationStatus[] = ['certified', 'not_certified', 'unknown'];

type FormState = {
  name: string;
  brand_names: string;
  products: string;
  certification_status: BrandOwnerCertificationStatus;
  certifier_name: string;
  nop_operation_id: string;
  certificate_issued_on: string;
  notes: string;
};

const EMPTY: FormState = {
  name: '',
  brand_names: '',
  products: '',
  certification_status: 'certified',
  certifier_name: '',
  nop_operation_id: '',
  certificate_issued_on: '',
  notes: ''
};

const fromOwner = (o: BrandOwner): FormState => ({
  name: o.name,
  brand_names: o.brand_names,
  products: o.products,
  certification_status: o.certification_status,
  certifier_name: o.certifier_name,
  nop_operation_id: o.nop_operation_id,
  certificate_issued_on: o.certificate_issued_on ?? '',
  notes: o.notes
});

/** A hidden file input behind a design-system button: the same pattern as the supplier register. */
const FilePick = ({
  label,
  file,
  onPick,
  current
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  current?: string;
}) => {
  const intl = useIntl();
  const inputId = React.useId();
  return (
    <StandardField label={label}>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={(e) => {
          onPick(e.target.files?.[0] || null);
          e.target.value = '';
        }}
      />
      <StandardButton
        variant="outline"
        size="sm"
        onClick={() => document.getElementById(inputId)?.click()}>
        {file
          ? file.name
          : current
          ? intl.formatMessage({ id: 'brandOwners.file.replace' }, { title: current })
          : intl.formatMessage({ id: 'brandOwners.file.choose' })}
      </StandardButton>
    </StandardField>
  );
};

const OwnerForm = ({
  owner,
  companyId,
  farmId,
  state,
  onDone
}: {
  owner: BrandOwner | null;
  companyId: string;
  farmId: string;
  state?: string;
  onDone: () => void;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(owner ? fromOwner(owner) : EMPTY);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [agreement, setAgreement] = useState<File | null>(null);
  const [upload, { isLoading: isUploading }] = useUploadFarmDocumentMutation();
  const [add, { isLoading: isAdding }] = useAddBrandOwnerMutation();
  const [update, { isLoading: isUpdating }] = useUpdateBrandOwnerMutation();
  const certified = form.certification_status === 'certified';
  const uncertified = form.certification_status === 'not_certified';
  // A new certificate file needs its issue date, as the server requires.
  const missingDate = certified && Boolean(certificate) && !form.certificate_issued_on;

  const save = async () => {
    try {
      const data: BrandOwnerInput = {
        name: form.name,
        brand_names: form.brand_names,
        products: form.products,
        certification_status: form.certification_status,
        certifier_name: form.certifier_name,
        nop_operation_id: form.nop_operation_id,
        notes: form.notes,
        certificate_issued_on: form.certificate_issued_on || null
      };
      if (certified && certificate) {
        const doc = await upload({
          companyId,
          farmId,
          file: certificate,
          folder: 'certifications',
          title: intl.formatMessage(
            { id: 'brandOwners.certificate.fileTitle' },
            { name: form.name, date: form.certificate_issued_on }
          )
        }).unwrap();
        data.certificate_document = doc.id;
      }
      if (uncertified && agreement) {
        const doc = await upload({
          companyId,
          farmId,
          file: agreement,
          folder: 'certifications',
          title: intl.formatMessage({ id: 'brandOwners.agreement.fileTitle' }, { name: form.name })
        }).unwrap();
        data.agreement_document = doc.id;
      }
      if (owner) await update({ companyId, farmId, ownerId: owner.id, data }).unwrap();
      else await add({ companyId, farmId, data }).unwrap();
      onDone();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'brandOwners.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  return (
    <VStack align="stretch" spacing={3} data-testid="brand-owner-form">
      <Divider />
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField label={intl.formatMessage({ id: 'brandOwners.field.name' })} required>
          <StandardInput value={form.name} onChange={set('name')} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'brandOwners.field.status' })}>
          <StandardSelect value={form.certification_status} onChange={set('certification_status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {intl.formatMessage({ id: `brandOwners.status.${s}` })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>
      <StandardField
        label={intl.formatMessage({ id: 'brandOwners.field.brands' })}
        helpText={intl.formatMessage({ id: 'brandOwners.field.brandsHelp' })}>
        <StandardTextarea value={form.brand_names} onChange={set('brand_names')} rows={2} />
      </StandardField>
      <StandardField
        label={intl.formatMessage({ id: 'brandOwners.field.products' })}
        helpText={intl.formatMessage({ id: 'brandOwners.field.productsHelp' })}>
        <StandardTextarea value={form.products} onChange={set('products')} rows={3} />
      </StandardField>
      {certified && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          <StandardField label={intl.formatMessage({ id: 'brandOwners.field.certifier' })}>
            <CertifyingAgentPicker
              value={form.certifier_name}
              onChange={(name) => setForm({ ...form, certifier_name: name })}
              state={state}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({ id: 'brandOwners.field.nopId' })}
            helpText={intl.formatMessage({ id: 'brandOwners.field.nopIdHelp' })}>
            <StandardInput value={form.nop_operation_id} onChange={set('nop_operation_id')} />
          </StandardField>
          <FilePick
            label={intl.formatMessage({ id: 'brandOwners.certificate.file' })}
            file={certificate}
            onPick={setCertificate}
            current={owner?.certificate_document_title}
          />
          <StandardField
            label={intl.formatMessage({ id: 'brandOwners.certificate.issuedOn' })}
            helpText={intl.formatMessage({ id: 'brandOwners.certificate.issuedOnHelp' })}>
            <StandardInput
              type="date"
              value={form.certificate_issued_on}
              onChange={set('certificate_issued_on')}
            />
          </StandardField>
        </SimpleGrid>
      )}
      {uncertified && (
        <FilePick
          label={intl.formatMessage({ id: 'brandOwners.agreement.file' })}
          file={agreement}
          onPick={setAgreement}
          current={owner?.agreement_document_title}
        />
      )}
      <StandardField label={intl.formatMessage({ id: 'brandOwners.field.notes' })}>
        <StandardTextarea value={form.notes} onChange={set('notes')} rows={2} />
      </StandardField>
      <HStack spacing={2}>
        <StandardButton
          size="sm"
          isDisabled={!form.name.trim() || missingDate}
          isLoading={isUploading || isAdding || isUpdating}
          onClick={save}>
          {intl.formatMessage({ id: 'brandOwners.save' })}
        </StandardButton>
        <StandardButton variant="ghost" size="sm" onClick={onDone}>
          {intl.formatMessage({ id: 'brandOwners.cancel' })}
        </StandardButton>
      </HStack>
      <Divider />
    </VStack>
  );
};

const OwnerRow = ({
  owner,
  highlighted,
  onEdit,
  onDelete
}: {
  owner: BrandOwner;
  highlighted: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const intl = useIntl();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' });
  }, [highlighted]);
  const who = [
    owner.certifier_name,
    owner.nop_operation_id &&
      intl.formatMessage({ id: 'brandOwners.nopIdLine' }, { id: owner.nop_operation_id })
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Box
      ref={ref}
      p={3}
      borderRadius="md"
      borderWidth={highlighted ? '2px' : '1px'}
      borderColor={highlighted ? 'green.700' : 'gray.200'}
      data-testid={`brand-owner-${owner.id}`}>
      <HStack spacing={2} align="flex-start">
        <Icon as={FaTag} color="green.700" mt="3px" />
        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <HStack spacing={2} wrap="wrap">
            <Text fontSize="sm" fontWeight="semibold">
              {owner.name}
            </Text>
            <Badge variant="neutral" fontSize="11px">
              {intl.formatMessage({ id: `brandOwners.status.${owner.certification_status}` })}
            </Badge>
          </HStack>
          {owner.brand_names ? (
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage(
                { id: 'brandOwners.brandsLine' },
                { brands: owner.brand_names.split('\n').filter(Boolean).join('; ') }
              )}
            </Text>
          ) : null}
          {who ? (
            <Text fontSize="xs" color="gray.600">
              {who}
            </Text>
          ) : null}
          <BrandOwnerStateLine owner={owner} />
          <HStack spacing={2}>
            <StandardButton size="sm" variant="ghost" onClick={onEdit}>
              {intl.formatMessage({ id: 'brandOwners.edit' })}
            </StandardButton>
            <StandardButton size="sm" variant="ghost" onClick={onDelete}>
              {intl.formatMessage({ id: 'brandOwners.delete' })}
            </StandardButton>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

const BrandOwnerRegisterSection = ({ companyId, farmId, state }: Props) => {
  const intl = useIntl();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const focusOwner = Number(searchParams.get('brandOwner')) || null;
  const sectionRef = useRef<HTMLDivElement>(null);
  // The plan's "Add in the brand-owner register" lands here with #brand-owners. The router does not
  // scroll to a hash, and this section sits far down the profile (local e2e run, 2026-11-02). A
  // named owner scrolls its own row into view instead.
  useEffect(() => {
    if (location.hash === '#brand-owners' && !focusOwner) {
      sectionRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [location.hash, focusOwner]);
  const { data: owners = [], isLoading, isError } = useGetBrandOwnersQuery({ companyId, farmId });
  const [remove] = useDeleteBrandOwnerMutation();
  // null: no form open; 'new': adding; a number: editing that owner.
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const doDelete = async (owner: BrandOwner) => {
    try {
      await remove({ companyId, farmId, ownerId: owner.id }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'brandOwners.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <Box id="brand-owners" ref={sectionRef} w="full">
      <StandardCard
        title={intl.formatMessage({ id: 'brandOwners.title' })}
        padding={{ base: 0, md: 4 }}
        mb={0}
        headerAction={
          <StandardButton
            variant="outline"
            size="sm"
            leftIcon={<Icon as={FaPlus} />}
            onClick={() => setEditing('new')}>
            {intl.formatMessage({ id: 'brandOwners.add' })}
          </StandardButton>
        }>
        <VStack align="stretch" spacing={3}>
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'brandOwners.subtitle' })}
          </Text>
          {editing === 'new' && (
            <OwnerForm
              owner={null}
              companyId={companyId}
              farmId={farmId}
              state={state}
              onDone={() => setEditing(null)}
            />
          )}
          {/* A failed fetch is not an absence: "no brand owner recorded" would be a claim made by an
              error (review of app #239). */}
          {isError && (
            <Text
              fontSize="sm"
              color={STATUS_URGENCY_TOKENS.crit.text}
              data-testid="brand-owners-load-failed">
              {intl.formatMessage({ id: 'osp.brandOwners.loadFailed' })}
            </Text>
          )}
          {!isLoading && !isError && owners.length === 0 && editing !== 'new' && (
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'brandOwners.empty' })}
            </Text>
          )}
          {owners.map((o) =>
            editing === o.id ? (
              <OwnerForm
                key={o.id}
                owner={o}
                companyId={companyId}
                farmId={farmId}
                state={state}
                onDone={() => setEditing(null)}
              />
            ) : (
              <OwnerRow
                key={o.id}
                owner={o}
                highlighted={focusOwner === o.id}
                onEdit={() => setEditing(o.id)}
                onDelete={() => doDelete(o)}
              />
            )
          )}
        </VStack>
      </StandardCard>
    </Box>
  );
};

export default BrandOwnerRegisterSection;
