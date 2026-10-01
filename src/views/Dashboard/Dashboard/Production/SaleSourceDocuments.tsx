/**
 * The documents behind one sale: the invoice, bill of lading or pack-out summary itself.
 *
 * OSP alignment audit 2026-10, T22. The audit-trail exhibit in the certifier packet printed a
 * sale's invoice and BOL NUMBERS, and nothing could say whether the paper behind them was held
 * anywhere. A file attached here rides in the packet under `audit-trail/sale-<id>/`, and the
 * exhibit names it; a sale with only typed numbers says exactly that.
 */
import React, { useRef, useState } from 'react';
import { Box, HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { FaPaperclip } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardSelect } from 'components/Design/StandardComponents';
import {
  SALE_SOURCE_KINDS,
  SaleSourceKind,
  useGetFarmDocumentsQuery,
  useUploadFarmDocumentMutation
} from 'store/api/documentsApi';

const KIND_LABELS: Record<SaleSourceKind, { id: string; defaultMessage: string }> = {
  invoice: { id: 'sales.sources.kind.invoice', defaultMessage: 'Invoice' },
  bill_of_lading: { id: 'sales.sources.kind.billOfLading', defaultMessage: 'Bill of lading' },
  packout: { id: 'sales.sources.kind.packout', defaultMessage: 'Pack-out summary' },
  other: { id: 'sales.sources.kind.other', defaultMessage: 'Other' }
};

interface Props {
  companyId: string;
  farmId: string;
  saleId: number;
  /** The season the sale belongs to, so the file is also filed with that lot. */
  historyId?: number | null;
  canWrite: boolean;
}

const SaleSourceDocuments: React.FC<Props> = ({
  companyId,
  farmId,
  saleId,
  historyId,
  canWrite
}) => {
  const intl = useIntl();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<SaleSourceKind>('invoice');
  const { data: docs = [] } = useGetFarmDocumentsQuery({ companyId, farmId, salesRecord: saleId });
  const [upload, { isLoading }] = useUploadFarmDocumentMutation();

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      await upload({
        companyId,
        farmId,
        file,
        title: file.name.replace(/\.[^.]+$/, ''),
        folder: 'activity_attachments',
        history: historyId ?? null,
        salesRecord: saleId,
        sourceKind: kind
      }).unwrap();
    } catch {
      toast({
        status: 'error',
        isClosable: true,
        title: intl.formatMessage({
          id: 'sales.sources.uploadFailed',
          defaultMessage: 'The document could not be attached'
        })
      });
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <VStack align="stretch" spacing={1} mt={1}>
      {docs.length ? (
        docs.map((doc) => (
          <HStack key={doc.id} spacing={1}>
            <Box as={FaPaperclip} color="green.700" boxSize={3} />
            <Text fontSize="xs">
              {doc.source_kind
                ? `${intl.formatMessage(KIND_LABELS[doc.source_kind as SaleSourceKind])}: ${
                    doc.title
                  }`
                : doc.title}
            </Text>
          </HStack>
        ))
      ) : (
        <Text fontSize="xs" color="gray.500">
          {intl.formatMessage({
            id: 'sales.sources.none',
            defaultMessage:
              'No source document attached. The certifier packet will say the numbers are recorded as text only.'
          })}
        </Text>
      )}
      {canWrite && (
        <HStack spacing={2}>
          <Box maxW="180px">
            <StandardSelect
              size="sm"
              aria-label={intl.formatMessage({
                id: 'sales.sources.kindLabel',
                defaultMessage: 'Document type'
              })}
              value={kind}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setKind(e.target.value as SaleSourceKind)
              }>
              {SALE_SOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {intl.formatMessage(KIND_LABELS[k])}
                </option>
              ))}
            </StandardSelect>
          </Box>
          <input
            ref={fileInput}
            type="file"
            hidden
            data-testid={`sale-source-input-${saleId}`}
            accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.tif,.tiff,.xlsx,.xls,.docx,.doc,.csv,.txt"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <StandardButton
            size="xs"
            variant="outline"
            isLoading={isLoading}
            leftIcon={<Box as={FaPaperclip} />}
            onClick={() => fileInput.current?.click()}>
            {intl.formatMessage({
              id: 'sales.sources.attach',
              defaultMessage: 'Attach document'
            })}
          </StandardButton>
        </HStack>
      )}
    </VStack>
  );
};

export default SaleSourceDocuments;
