/**
 * OSP Activation Modal — Sprint 5A hardening (Session A).
 *
 * Gates the "Mark as Active" action behind a form that collects the three
 * pieces of certifier approval evidence the backend requires
 * (trazo-back/certifications/views.py::OrganicSystemPlanViewSet.activate):
 *
 *   - approval_document         (file — the certifier's approval letter / signed OSP)
 *   - approval_certificate_number (string — e.g., CCOF-2026-1234)
 *   - approval_certifier_name     (string — e.g., CCOF, Oregon Tilth)
 *
 * Submits as multipart FormData to /osps/{id}/activate/. Surfaces the
 * backend's `missing_evidence` array on 400 so the farmer sees which field
 * failed validation.
 *
 * Only rendered when status === 'submitted' (same precondition as backend).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HStack, Icon, Text, useToast, VStack } from '@chakra-ui/react';
import { FaFileUpload } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardAlert,
  StandardButton,
  StandardField,
  StandardInput
} from 'components/Design/StandardComponents';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import CertifyingAgentPicker from 'components/Certifications/CertifyingAgentPicker';
import { useActivateOSPMutation } from 'store/api/ospApi';
import type { OSP } from 'types/osp';

// 7 CFR 205.400 approval letters are commonly issued as PDFs; certifiers also
// sometimes send scanned signed forms. Keep the MIME list generous but not
// open-ended — we do not accept executables / archives.
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/tiff'
].join(',');

// Matches backend FileField default upload behavior. 10 MB is well above what
// a scanned multipage approval letter needs and below typical proxy limits.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface OSPActivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  farmId: string;
  osp: OSP;
  onActivated: (updated: OSP) => void;
}

const OSPActivateModal: React.FC<OSPActivateModalProps> = ({
  isOpen,
  onClose,
  companyId,
  farmId,
  osp,
  onActivated
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [activateOSP, { isLoading }] = useActivateOSPMutation();

  const [file, setFile] = useState<File | null>(null);
  const [certNumber, setCertNumber] = useState('');
  const [certifierName, setCertifierName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Opens on the agent the plan already names (or the certificate of record names). The operator
  // still confirms it: the gate keeps the field required, and this is only its starting value.
  const suggestedAgent = osp.certifier_name || osp.packet_agent?.name || '';
  useEffect(() => {
    if (isOpen) setCertifierName((current) => current || suggestedAgent);
  }, [isOpen, suggestedAgent]);

  const resetForm = () => {
    setFile(null);
    setCertNumber('');
    setCertifierName('');
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isLoading) return; // don't bail mid-upload
    resetForm();
    onClose();
  };

  const fileHint = useMemo(() => {
    if (!file) return intl.formatMessage({ id: 'osp.activateModal.file.hint' });
    const kb = Math.round(file.size / 1024);
    return `${file.name} · ${kb.toLocaleString()} KB`;
  }, [file, intl]);

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};
    if (!file) {
      errors.approval_document = intl.formatMessage({
        id: 'osp.activateModal.error.fileRequired'
      });
    } else if (file.size > MAX_FILE_BYTES) {
      errors.approval_document = intl.formatMessage(
        { id: 'osp.activateModal.error.fileTooLarge' },
        { maxMb: 10 }
      );
    }
    if (!certNumber.trim()) {
      errors.approval_certificate_number = intl.formatMessage({
        id: 'osp.activateModal.error.certNumberRequired'
      });
    }
    if (!certifierName.trim()) {
      errors.approval_certifier_name = intl.formatMessage({
        id: 'osp.activateModal.error.certifierNameRequired'
      });
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateClientSide() || !file) return;
    try {
      const fresh = await activateOSP({
        companyId,
        farmId,
        ospId: osp.id,
        approval_document: file,
        approval_certificate_number: certNumber.trim(),
        approval_certifier_name: certifierName.trim()
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.action.activate' }),
        description: intl.formatMessage({ id: 'osp.activateModal.success' }),
        duration: 5000,
        isClosable: true
      });
      onActivated(fresh);
      resetForm();
      onClose();
    } catch (err: any) {
      // Backend returns { error, missing_evidence: [...], detail } on 400.
      const payload = err?.data ?? err;
      const missing: string[] | undefined = payload?.missing_evidence;
      if (Array.isArray(missing) && missing.length > 0) {
        const labelMap: Record<string, string> = {
          approval_document: intl.formatMessage({
            id: 'osp.activateModal.error.fileRequired'
          }),
          approval_certificate_number: intl.formatMessage({
            id: 'osp.activateModal.error.certNumberRequired'
          }),
          approval_certifier_name: intl.formatMessage({
            id: 'osp.activateModal.error.certifierNameRequired'
          })
        };
        const next: Record<string, string> = {};
        for (const key of missing) {
          next[key] =
            labelMap[key] || intl.formatMessage({ id: 'osp.activateModal.error.generic' });
        }
        setFieldErrors(next);
      }
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.error.activate' }),
        description:
          payload?.detail ||
          payload?.error ||
          intl.formatMessage({ id: 'osp.activateModal.error.generic' }),
        duration: 7000,
        isClosable: true
      });
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      isCloseDisabled={isLoading}
      header={
        <HStack>
          <Icon as={FaFileUpload} color="green.700" />
          <Text>{intl.formatMessage({ id: 'osp.activateModal.title' })}</Text>
        </HStack>
      }
      footer={
        <>
          <StandardButton variant="ghost" mr={3} onClick={handleClose} isDisabled={isLoading}>
            {intl.formatMessage({ id: 'osp.activateModal.cancel' })}
          </StandardButton>
          <StandardButton
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            loadingText={intl.formatMessage({ id: 'osp.activateModal.activating' })}>
            {intl.formatMessage({ id: 'osp.action.activate' })}
          </StandardButton>
        </>
      }>
      <VStack align="stretch" spacing={4}>
        <StandardAlert
          status="info"
          mb={0}
          description={intl.formatMessage({ id: 'osp.activateModal.intro' })}
        />

        <StandardField
          required
          error={fieldErrors.approval_document}
          label={intl.formatMessage({ id: 'osp.activateModal.file.label' })}
          helpText={fileHint}>
          <StandardInput
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MIME_TYPES}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const next = e.target.files?.[0] || null;
              setFile(next);
              if (next && fieldErrors.approval_document) {
                setFieldErrors((prev) => {
                  const { approval_document, ...rest } = prev;
                  return rest;
                });
              }
            }}
            p={1}
            sx={{
              '::file-selector-button': {
                border: 'none',
                outline: 'none',
                mr: 3,
                px: 3,
                py: 1,
                fontSize: 'sm',
                cursor: 'pointer'
              }
            }}
          />
        </StandardField>

        <StandardField
          required
          error={fieldErrors.approval_certificate_number}
          label={intl.formatMessage({ id: 'osp.activateModal.certNumber.label' })}
          helpText={intl.formatMessage({ id: 'osp.activateModal.certNumber.hint' })}>
          <StandardInput
            value={certNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCertNumber(e.target.value);
              if (fieldErrors.approval_certificate_number) {
                setFieldErrors((prev) => {
                  const { approval_certificate_number, ...rest } = prev;
                  return rest;
                });
              }
            }}
            placeholder={intl.formatMessage({
              id: 'osp.activateModal.certNumber.placeholder'
            })}
            maxLength={100}
          />
        </StandardField>

        <StandardField
          required
          error={fieldErrors.approval_certifier_name}
          label={intl.formatMessage({ id: 'osp.activateModal.certifierName.label' })}
          helpText={intl.formatMessage({ id: 'osp.activateModal.certifierName.hint' })}>
          <CertifyingAgentPicker
            value={certifierName}
            onChange={(name) => {
              setCertifierName(name);
              if (fieldErrors.approval_certifier_name) {
                setFieldErrors((prev) => {
                  const { approval_certifier_name, ...rest } = prev;
                  return rest;
                });
              }
            }}
          />
        </StandardField>
      </VStack>
    </ResponsiveModal>
  );
};

export default OSPActivateModal;
