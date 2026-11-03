/**
 * What the operation buys from one supplier for its own sales: CCOF G6.5 A1/A2, OTCO C12 12.2-4.
 *
 * The products, and for an uncertified broker or distributor the certified operation it sources from
 * and the Exempt Handler Affidavit it completed (a file in this farm's Documents). The supplier's
 * certificate copies are the ones filed above in the same row. Empty products means the supplier is
 * not a sourcing supplier and G6.5 does not list it.
 */
import React, { useState } from 'react';
import { Box, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import {
  useUpdateSupplierMutation,
  type Supplier,
  type SupplierInput
} from 'store/api/supplierApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import SourcingStateLine from 'views/Dashboard/OSP/SourcingStateLine';

const SupplierSourcing = ({
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
  const [products, setProducts] = useState(supplier.sourced_products ?? '');
  const [source, setSource] = useState(supplier.source_operation ?? '');
  const [affidavit, setAffidavit] = useState<File | null>(null);
  const [upload, { isLoading: isUploading }] = useUploadFarmDocumentMutation();
  const [update, { isLoading: isSaving }] = useUpdateSupplierMutation();
  const uncertified = supplier.organic_status === 'not_certified';
  const dirty =
    products !== (supplier.sourced_products ?? '') ||
    source !== (supplier.source_operation ?? '') ||
    Boolean(affidavit);

  const save = async () => {
    try {
      const data: SupplierInput = { sourced_products: products, source_operation: source };
      if (uncertified && affidavit) {
        const doc = await upload({
          companyId,
          farmId,
          file: affidavit,
          folder: 'certifications',
          title: intl.formatMessage({ id: 'sourcing.affidavit.fileTitle' }, { name: supplier.name })
        }).unwrap();
        data.exempt_handler_affidavit = doc.id;
      }
      await update({ companyId, farmId, supplierId: supplier.id, data }).unwrap();
      setAffidavit(null);
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'suppliers.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <Box mt={3} data-testid={`supplier-sourcing-${supplier.id}`}>
      <Text fontSize="sm" fontWeight="semibold">
        {intl.formatMessage({ id: 'sourcing.title' })}
      </Text>
      <Text fontSize="xs" color="gray.600">
        {intl.formatMessage({ id: 'sourcing.help' })}
      </Text>
      <VStack align="stretch" spacing={2} mt={2}>
        <StandardField label={intl.formatMessage({ id: 'sourcing.products' })}>
          <StandardTextarea
            rows={2}
            value={products}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProducts(e.target.value)}
          />
        </StandardField>
        {uncertified && (
          <>
            <StandardField
              label={intl.formatMessage({ id: 'sourcing.sourceOperation' })}
              helpText={intl.formatMessage({ id: 'sourcing.sourceOperationHelp' })}>
              <StandardInput
                value={source}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSource(e.target.value)}
              />
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'sourcing.affidavit.file' })}>
              <input
                id={inputId}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => {
                  setAffidavit(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
              <StandardButton
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(inputId)?.click()}>
                {affidavit
                  ? affidavit.name
                  : supplier.exempt_handler_affidavit_title
                  ? intl.formatMessage(
                      { id: 'sourcing.affidavit.replace' },
                      { title: supplier.exempt_handler_affidavit_title }
                    )
                  : intl.formatMessage({ id: 'sourcing.affidavit.choose' })}
              </StandardButton>
            </StandardField>
          </>
        )}
        {supplier.sourcing_state ? <SourcingStateLine supplier={supplier} /> : null}
        <Box>
          <StandardButton
            size="sm"
            isDisabled={!dirty}
            isLoading={isUploading || isSaving}
            onClick={save}>
            {intl.formatMessage({ id: 'sourcing.save' })}
          </StandardButton>
        </Box>
      </VStack>
    </Box>
  );
};

export default SupplierSourcing;
