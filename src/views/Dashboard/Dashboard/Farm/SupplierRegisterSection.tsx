/**
 * Seed and planting-stock suppliers, and the copies of their organic certificates.
 *
 * CCOF G3.0, OTCO C3 and WSDA 2121-B ask for the organic certificate of each supplier of certified
 * organic seedlings or planting stock; 205.201(a)(3) asks how the operation verifies its
 * suppliers. A certificate is filed once, here, and covers every purchase from that supplier that
 * it was current for (the trace, the audit export).
 *
 * Records are not linked to a supplier by hand one by one. A record names its supplier as text;
 * the grower confirms which spellings mean which supplier ("Columbia Nursery", "columbia
 * nursery"), and every record spelled that way counts. Nothing is matched for them: a spelling no
 * supplier holds is listed under "On your records, not yet here" until they attach it.
 *
 * Admins and farm managers only, like the server: a supplier list is commercial data.
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
import { FaPlus, FaSeedling } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSearchParams } from 'react-router-dom';

import CertifyingAgentPicker from 'components/Certifications/CertifyingAgentPicker';
import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import { useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import {
  useAddSupplierCertificateMutation,
  useAddSupplierMutation,
  useAddSupplierSpellingMutation,
  useDeleteSupplierMutation,
  useGetSuppliersQuery,
  useGetUnconfirmedSpellingsQuery,
  useRemoveSupplierCertificateMutation,
  useRemoveSupplierSpellingMutation,
  useUpdateSupplierMutation,
  type Supplier,
  type SupplierOrganicStatus
} from 'store/api/supplierApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface Props {
  companyId: string;
  farmId: string;
  /** The farm's state, so the certifier picker lists that state's agencies first. */
  state?: string;
}

const ORGANIC_STATUSES: SupplierOrganicStatus[] = ['certified', 'not_certified', 'unknown'];

const EMPTY_SUPPLIER = {
  name: '',
  organic_status: 'certified' as SupplierOrganicStatus,
  certifier_name: '',
  nop_operation_id: ''
};

/** Adds one certificate copy: the file goes to Documents, then the copy is filed on the supplier. */
const CertificateUpload = ({
  supplier,
  companyId,
  farmId
}: {
  supplier: Supplier;
  companyId: string;
  farmId: string;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const inputId = React.useId();
  const [file, setFile] = useState<File | null>(null);
  const [issuedOn, setIssuedOn] = useState('');
  const [upload, { isLoading: isUploading }] = useUploadFarmDocumentMutation();
  const [addCertificate, { isLoading: isFiling }] = useAddSupplierCertificateMutation();

  const save = async () => {
    if (!file || !issuedOn) return;
    try {
      const doc = await upload({
        companyId,
        farmId,
        file,
        folder: 'certifications',
        title: intl.formatMessage(
          { id: 'suppliers.certificate.fileTitle' },
          { name: supplier.name, date: issuedOn }
        )
      }).unwrap();
      await addCertificate({
        companyId,
        farmId,
        supplierId: supplier.id,
        data: { document: doc.id, issued_on: issuedOn }
      }).unwrap();
      setFile(null);
      setIssuedOn('');
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'suppliers.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <VStack align="stretch" spacing={2}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField label={intl.formatMessage({ id: 'suppliers.certificate.file' })}>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <StandardButton
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(inputId)?.click()}>
            {file ? file.name : intl.formatMessage({ id: 'suppliers.certificate.chooseFile' })}
          </StandardButton>
        </StandardField>
        <StandardField
          label={intl.formatMessage({ id: 'suppliers.certificate.issuedOn' })}
          helpText={intl.formatMessage({ id: 'suppliers.certificate.issuedOnHelp' })}>
          <StandardInput
            type="date"
            value={issuedOn}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIssuedOn(e.target.value)}
          />
        </StandardField>
      </SimpleGrid>
      <Box>
        <StandardButton
          size="sm"
          isDisabled={!file || !issuedOn}
          isLoading={isUploading || isFiling}
          onClick={save}>
          {intl.formatMessage({ id: 'suppliers.certificate.add' })}
        </StandardButton>
      </Box>
    </VStack>
  );
};

const SupplierRow = ({
  supplier,
  companyId,
  farmId,
  highlighted
}: {
  supplier: Supplier;
  companyId: string;
  farmId: string;
  highlighted: boolean;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [spelling, setSpelling] = useState('');
  const [addSpelling, { isLoading: isAddingSpelling }] = useAddSupplierSpellingMutation();
  const [removeSpelling] = useRemoveSupplierSpellingMutation();
  const [removeCertificate] = useRemoveSupplierCertificateMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const scope = { companyId, farmId, supplierId: supplier.id };

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center' });
  }, [highlighted]);

  const run = async (action: Promise<unknown>) => {
    try {
      await action;
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'suppliers.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  const newest = supplier.certificates[0];
  const who = [
    supplier.certifier_name,
    supplier.nop_operation_id &&
      intl.formatMessage({ id: 'suppliers.nopId' }, { id: supplier.nop_operation_id })
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box
      ref={ref}
      data-testid={`supplier-${supplier.id}`}
      data-highlighted={highlighted ? 'true' : undefined}
      p={{ base: 2, md: 3 }}
      borderWidth="1px"
      borderRadius="md"
      borderColor={highlighted ? 'green.600' : 'gray.200'}>
      <HStack spacing={2} flexWrap="wrap">
        <Icon as={FaSeedling} color="green.700" boxSize={4} />
        <Text fontSize="sm" fontWeight="semibold">
          {supplier.name}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {intl.formatMessage({ id: `suppliers.status.${supplier.organic_status}` })}
        </Text>
        {supplier.archived && <Badge>{intl.formatMessage({ id: 'suppliers.archived' })}</Badge>}
      </HStack>
      {who && (
        <Text fontSize="xs" color="gray.600" mt={1}>
          {who}
        </Text>
      )}
      <Text fontSize="xs" color="gray.600" mt={1}>
        {intl.formatMessage({ id: 'suppliers.recordsCount' }, { count: supplier.records_count })}
      </Text>

      <Text fontSize="sm" fontWeight="semibold" mt={3}>
        {intl.formatMessage({ id: 'suppliers.certificate.title' })}
      </Text>
      {newest ? (
        <VStack align="stretch" spacing={1} mt={1}>
          {supplier.certificates.map((c) => (
            <HStack key={c.id} spacing={2} flexWrap="wrap">
              <Text fontSize="sm">
                {intl.formatMessage(
                  { id: 'suppliers.certificate.row' },
                  { date: c.issued_on, title: c.document_title }
                )}
              </Text>
              <StandardButton
                variant="ghost"
                size="sm"
                onClick={() => run(removeCertificate({ ...scope, certificateId: c.id }).unwrap())}>
                {intl.formatMessage({ id: 'suppliers.certificate.remove' })}
              </StandardButton>
            </HStack>
          ))}
        </VStack>
      ) : (
        <Text fontSize="sm" color="gray.600" mt={1}>
          {intl.formatMessage({ id: 'suppliers.certificate.none' })}
        </Text>
      )}
      <Box mt={2}>
        <CertificateUpload supplier={supplier} companyId={companyId} farmId={farmId} />
      </Box>

      <Text fontSize="sm" fontWeight="semibold" mt={3}>
        {intl.formatMessage({ id: 'suppliers.spellings.title' })}
      </Text>
      <Text fontSize="xs" color="gray.600">
        {intl.formatMessage({ id: 'suppliers.spellings.help' })}
      </Text>
      <VStack align="stretch" spacing={1} mt={1}>
        {supplier.names.map((n) => (
          <HStack key={n.id} spacing={2}>
            <Text fontSize="sm">{n.name}</Text>
            <StandardButton
              variant="ghost"
              size="sm"
              onClick={() => run(removeSpelling({ ...scope, spellingId: n.id }).unwrap())}>
              {intl.formatMessage({ id: 'suppliers.spellings.remove' })}
            </StandardButton>
          </HStack>
        ))}
      </VStack>
      <HStack spacing={2} mt={2} align="flex-end">
        <StandardInput
          aria-label={intl.formatMessage({ id: 'suppliers.spellings.add' })}
          value={spelling}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpelling(e.target.value)}
        />
        <StandardButton
          variant="outline"
          size="sm"
          isDisabled={!spelling.trim()}
          isLoading={isAddingSpelling}
          onClick={() =>
            run(
              addSpelling({ ...scope, name: spelling })
                .unwrap()
                .then(() => setSpelling(''))
            )
          }>
          {intl.formatMessage({ id: 'suppliers.spellings.add' })}
        </StandardButton>
      </HStack>

      <HStack spacing={2} mt={3}>
        <StandardButton
          variant="ghost"
          size="sm"
          onClick={() =>
            run(updateSupplier({ ...scope, data: { archived: !supplier.archived } }).unwrap())
          }>
          {intl.formatMessage({
            id: supplier.archived ? 'suppliers.restore' : 'suppliers.archive'
          })}
        </StandardButton>
        {/* A supplier the records name stays on file: the server refuses the delete. */}
        {supplier.records_count === 0 && (
          <StandardButton
            variant="ghost"
            size="sm"
            onClick={() => run(deleteSupplier(scope).unwrap())}>
            {intl.formatMessage({ id: 'suppliers.delete' })}
          </StandardButton>
        )}
      </HStack>
    </Box>
  );
};

const SupplierRegisterSection = ({ companyId, farmId, state }: Props) => {
  const intl = useIntl();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const focusSupplier = Number(searchParams.get('supplier')) || null;
  const focusSpelling = (searchParams.get('supplierSpelling') || '').trim();

  const scope = { companyId, farmId };
  const { data: suppliers = [], isLoading } = useGetSuppliersQuery(scope, {
    skip: !companyId || !farmId
  });
  const { data: unconfirmed = [] } = useGetUnconfirmedSpellingsQuery(scope, {
    skip: !companyId || !farmId
  });
  const [addSupplier, { isLoading: isCreating }] = useAddSupplierMutation();
  const [addSpelling] = useAddSupplierSpellingMutation();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [attachTo, setAttachTo] = useState<Record<string, string>>({});

  const startAdding = (name = '') => {
    setForm({ ...EMPTY_SUPPLIER, name });
    setAdding(true);
  };

  const create = async () => {
    try {
      await addSupplier({ ...scope, data: form }).unwrap();
      setForm(EMPTY_SUPPLIER);
      setAdding(false);
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'suppliers.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  const attach = async (name: string) => {
    const supplierId = Number(attachTo[name]);
    if (!supplierId) return;
    try {
      await addSpelling({ ...scope, supplierId, name }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'suppliers.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  const active = suppliers.filter((s) => !s.archived);
  const archived = suppliers.filter((s) => s.archived);
  const sameSpelling = (a: string, b: string) =>
    a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

  return (
    <Box id="suppliers" w="full">
      <StandardCard
        title={intl.formatMessage({ id: 'suppliers.title' })}
        variant="outline"
        padding={{ base: 0, md: 4 }}
        mb={0}
        headerAction={
          <StandardButton size="sm" leftIcon={<Icon as={FaPlus} />} onClick={() => startAdding()}>
            {intl.formatMessage({ id: 'suppliers.add' })}
          </StandardButton>
        }>
        <VStack align="stretch" spacing={3}>
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'suppliers.subtitle' })}
          </Text>

          {unconfirmed.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold">
                {intl.formatMessage({ id: 'suppliers.unconfirmed.title' })}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {intl.formatMessage({ id: 'suppliers.unconfirmed.help' })}
              </Text>
              <VStack align="stretch" spacing={2} mt={2}>
                {unconfirmed.map((u) => (
                  <Box
                    key={u.name}
                    data-testid="unconfirmed-spelling"
                    p={2}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor={
                      focusSpelling && sameSpelling(u.name, focusSpelling)
                        ? 'green.600'
                        : 'gray.200'
                    }>
                    <Text fontSize="sm">
                      {intl.formatMessage(
                        { id: 'suppliers.unconfirmed.row' },
                        { name: u.name, count: u.records }
                      )}
                    </Text>
                    <HStack spacing={2} mt={1} flexWrap="wrap">
                      {active.length > 0 && (
                        <>
                          <StandardSelect
                            aria-label={intl.formatMessage(
                              { id: 'suppliers.unconfirmed.attachTo' },
                              { name: u.name }
                            )}
                            size="sm"
                            maxW="xs"
                            value={attachTo[u.name] ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              setAttachTo({ ...attachTo, [u.name]: e.target.value })
                            }>
                            <option value="">
                              {intl.formatMessage({ id: 'suppliers.unconfirmed.choose' })}
                            </option>
                            {active.map((s) => (
                              <option key={s.id} value={String(s.id)}>
                                {s.name}
                              </option>
                            ))}
                          </StandardSelect>
                          <StandardButton
                            variant="outline"
                            size="sm"
                            isDisabled={!attachTo[u.name]}
                            onClick={() => attach(u.name)}>
                            {intl.formatMessage({ id: 'suppliers.unconfirmed.attach' })}
                          </StandardButton>
                        </>
                      )}
                      <StandardButton variant="ghost" size="sm" onClick={() => startAdding(u.name)}>
                        {intl.formatMessage({ id: 'suppliers.unconfirmed.create' })}
                      </StandardButton>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}

          {adding && (
            <VStack align="stretch" spacing={3}>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <StandardField label={intl.formatMessage({ id: 'suppliers.field.name' })} required>
                  <StandardInput
                    value={form.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'suppliers.field.status' })}>
                  <StandardSelect
                    value={form.organic_status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm({ ...form, organic_status: e.target.value as SupplierOrganicStatus })
                    }>
                    {ORGANIC_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {intl.formatMessage({ id: `suppliers.status.${s}` })}
                      </option>
                    ))}
                  </StandardSelect>
                </StandardField>
                <StandardField label={intl.formatMessage({ id: 'suppliers.field.certifier' })}>
                  <CertifyingAgentPicker
                    value={form.certifier_name}
                    onChange={(name) => setForm({ ...form, certifier_name: name })}
                    state={state}
                  />
                </StandardField>
                <StandardField
                  label={intl.formatMessage({ id: 'suppliers.field.nopId' })}
                  helpText={intl.formatMessage({ id: 'suppliers.field.nopIdHelp' })}>
                  <StandardInput
                    value={form.nop_operation_id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, nop_operation_id: e.target.value })
                    }
                  />
                </StandardField>
              </SimpleGrid>
              <HStack spacing={2}>
                <StandardButton
                  size="sm"
                  isDisabled={!form.name.trim()}
                  isLoading={isCreating}
                  onClick={create}>
                  {intl.formatMessage({ id: 'suppliers.save' })}
                </StandardButton>
                <StandardButton variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  {intl.formatMessage({ id: 'suppliers.cancel' })}
                </StandardButton>
              </HStack>
              <Divider />
            </VStack>
          )}

          {!isLoading && suppliers.length === 0 && !adding && (
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'suppliers.empty' })}
            </Text>
          )}
          {[...active, ...archived].map((s) => (
            <SupplierRow
              key={s.id}
              supplier={s}
              companyId={companyId}
              farmId={farmId}
              highlighted={focusSupplier === s.id}
            />
          ))}
        </VStack>
      </StandardCard>
    </Box>
  );
};

export default SupplierRegisterSection;
