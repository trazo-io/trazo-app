/**
 * § 205.406(a)(1) asks for the summary of changes "supported by documentation". Until 2026-11-02
 * the annual update had nowhere to name any (its sibling, the change notification, already had a
 * file). This picks files from the farm's Documents, or uploads a new one there first, and keeps
 * the list the update is saved with. The server signs the list with the filing, prints it on
 * document 02 and ships the files in the renewal packet.
 *
 * Files are linked, never copied: the update names a document on the shelf by its public id, and
 * the shelf refuses to delete a file an update names.
 */
import React, { useRef, useState } from 'react';
import { Box, HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { FaPaperclip } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardField,
  StandardSelect
} from 'components/Design/StandardComponents';
import { useGetFarmDocumentsQuery, useUploadFarmDocumentMutation } from 'store/api/documentsApi';

export interface SupportingDocRef {
  public_id: string;
  title: string;
}

interface Props {
  companyId: string;
  farmId: string;
  value: SupportingDocRef[];
  onChange: (next: SupportingDocRef[]) => void;
  error?: string;
}

/** Same list the Documents page and the module wizard offer; the server is the gate. */
const UPLOAD_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.tif,.tiff,.xlsx,.xls,.docx,.doc,.csv,.txt,.zip';

interface PickerProps {
  companyId: string;
  farmId: string;
  attachedIds: Set<string>;
  onAdd: (ref: SupportingDocRef) => void;
}

/**
 * The part that reads the shelf. Mounted only once the operator asks to attach something, so the
 * card does not load the farm's whole document list for every visit to the plan.
 */
const SupportingDocumentPicker: React.FC<PickerProps> = ({
  companyId,
  farmId,
  attachedIds,
  onAdd
}) => {
  const intl = useIntl();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState('');
  const { data: documents = [] } = useGetFarmDocumentsQuery(
    { companyId, farmId },
    { skip: !companyId || !farmId }
  );
  const [upload, { isLoading: uploading }] = useUploadFarmDocumentMutation();

  // A filing's own Documents copy is the document 02 already is; offering it as its own
  // evidence would be circular.
  const choices = documents.filter(
    (d) => d.source !== 'annual_update' && !attachedIds.has(d.public_id)
  );

  const onPick = (publicId: string) => {
    setPicked('');
    const doc = documents.find((d) => d.public_id === publicId);
    if (doc) onAdd({ public_id: doc.public_id, title: doc.title });
  };

  const onUpload = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    try {
      const doc = await upload({
        companyId,
        farmId,
        file,
        folder: 'organic_system_plan'
      }).unwrap();
      onAdd({ public_id: doc.public_id, title: doc.title });
    } catch {
      toast({
        status: 'error',
        isClosable: true,
        title: intl.formatMessage({
          id: 'osp.annual.supporting.uploadFailed',
          defaultMessage: 'The file could not be uploaded. Nothing was attached.'
        })
      });
    }
  };

  return (
    <HStack spacing={2} align="center" flexWrap="wrap">
      <Box flex="1" minW="200px">
        <StandardSelect
          size="sm"
          value={picked}
          data-testid="annual-supporting-pick"
          aria-label={intl.formatMessage({
            id: 'osp.annual.supporting.pick',
            defaultMessage: 'Attach a file from Documents'
          })}
          placeholder={intl.formatMessage({
            id: 'osp.annual.supporting.pick',
            defaultMessage: 'Attach a file from Documents'
          })}
          isDisabled={choices.length === 0}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPick(e.target.value)}>
          {choices.map((d) => (
            <option key={d.public_id} value={d.public_id}>
              {d.title}
            </option>
          ))}
        </StandardSelect>
      </Box>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept={UPLOAD_ACCEPT}
        data-testid="annual-supporting-upload-input"
        onChange={(e) => onUpload(e.target.files?.[0])}
      />
      <StandardButton
        size="sm"
        variant="outline"
        isLoading={uploading}
        leftIcon={<Box as={FaPaperclip} />}
        onClick={() => fileInput.current?.click()}>
        {intl.formatMessage({
          id: 'osp.annual.supporting.upload',
          defaultMessage: 'Upload a new file'
        })}
      </StandardButton>
    </HStack>
  );
};

const AnnualUpdateSupportingDocuments: React.FC<Props> = ({
  companyId,
  farmId,
  value,
  onChange,
  error
}) => {
  const intl = useIntl();
  const [picking, setPicking] = useState(false);
  const attachedIds = new Set(value.map((d) => d.public_id));

  const add = (ref: SupportingDocRef) => {
    if (attachedIds.has(ref.public_id)) return;
    onChange([...value, ref]);
  };

  return (
    <StandardField
      label={intl.formatMessage({
        id: 'osp.annual.supporting.label',
        defaultMessage: 'Documents supporting the summary (§ 205.406(a)(1))'
      })}
      helpText={intl.formatMessage({
        id: 'osp.annual.supporting.help',
        defaultMessage:
          'Files from your Documents that back up the changes above, such as a new field map, an invoice or a lab report. They are signed with the update, listed on the filed document and included in the renewal packet.'
      })}
      error={error}>
      <VStack align="stretch" spacing={2} data-testid="annual-supporting-documents">
        {value.length === 0 ? (
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage({
              id: 'osp.annual.supporting.none',
              defaultMessage: 'No documents attached.'
            })}
          </Text>
        ) : (
          value.map((doc) => (
            <HStack key={doc.public_id} justify="space-between" spacing={2}>
              <HStack spacing={2} minW={0}>
                <Box as={FaPaperclip} color="green.700" flexShrink={0} />
                <Text fontSize="sm" noOfLines={1}>
                  {doc.title}
                </Text>
              </HStack>
              <StandardButton
                size="xs"
                variant="ghost"
                aria-label={intl.formatMessage(
                  {
                    id: 'osp.annual.supporting.removeNamed',
                    defaultMessage: 'Remove {title}'
                  },
                  { title: doc.title }
                )}
                onClick={() => onChange(value.filter((d) => d.public_id !== doc.public_id))}>
                {intl.formatMessage({
                  id: 'osp.annual.supporting.remove',
                  defaultMessage: 'Remove'
                })}
              </StandardButton>
            </HStack>
          ))
        )}
        {picking ? (
          <SupportingDocumentPicker
            companyId={companyId}
            farmId={farmId}
            attachedIds={attachedIds}
            onAdd={add}
          />
        ) : (
          <StandardButton
            size="sm"
            variant="outline"
            alignSelf="flex-start"
            leftIcon={<Box as={FaPaperclip} />}
            data-testid="annual-supporting-open"
            onClick={() => setPicking(true)}>
            {intl.formatMessage({
              id: 'osp.annual.supporting.attach',
              defaultMessage: 'Attach documents'
            })}
          </StandardButton>
        )}
      </VStack>
    </StandardField>
  );
};

export default AnnualUpdateSupportingDocuments;
