/**
 * The farm's own record of its certifier's inspections and the items the agent sent (2026-11-08).
 *
 * 7 CFR 205.662(a)(3): a notice of noncompliance sets the date by which the operation must rebut or
 * correct each noncompliance "and submit supporting documentation"; (b) is the agent's written
 * resolution. WSDA AGR 2262 5a(i) asks for the date of the last organic inspection; CCOF's contract
 * D6 and OTCO O1 D-1E / D-7 ask for the letters and the corrective actions.
 *
 * Every line here is what the operator recorded. The status words are about the RECORD (is the
 * resolution notice attached?), never a verdict on the farm: nothing says "compliant" or "fixed".
 * Files go to the farm's Documents (folder `certifications`) first and are linked by id, like a
 * supplier's certificate copy; an id kept in the draft is never uploaded twice on a retry.
 */
import React, { useState } from 'react';
import {
  Box,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Text,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaClipboardCheck, FaExclamationTriangle } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardAlert,
  StandardTextarea,
  STATUS_URGENCY_TOKENS
} from 'components/Design/StandardComponents';
import CertifyingAgentPicker from 'components/Certifications/CertifyingAgentPicker';
import {
  type CertifierInspection,
  type CertifierInspectionInput,
  type CertifierNotice,
  type CertifierNoticeInput,
  type NoticeStatus,
  INSPECTION_KINDS,
  NOTICE_KINDS,
  NOTICE_RESPONSE_KINDS,
  useAddCertifierInspectionMutation,
  useAddCertifierNoticeMutation,
  useGetCertifierInspectionsQuery,
  useGetCertifierNoticesQuery,
  useUpdateCertifierInspectionMutation,
  useUpdateCertifierNoticeMutation
} from 'store/api/certifierInspectionApi';
import { useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.doc,.docx';

/** The words for each derived status (services/certifier_notices.notice_status). */
export const STATUS_MESSAGE_ID: Record<NoticeStatus, string> = {
  resolved: 'osp.inspections.status.resolved',
  resolution_stated_no_copy: 'osp.inspections.status.resolutionStatedNoCopy',
  respond_by_passed_no_response: 'osp.inspections.status.respondByPassed',
  response_sent: 'osp.inspections.status.responseSent',
  open: 'osp.inspections.status.open'
};

const INSPECTION_KIND_ID: Record<string, string> = {
  '': 'osp.inspections.kind.unstated',
  annual: 'osp.inspections.kind.annual',
  additional: 'osp.inspections.kind.additional',
  unannounced: 'osp.inspections.kind.unannounced'
};
const NOTICE_KIND_ID: Record<string, string> = {
  notice_of_noncompliance: 'osp.inspections.noticeKind.noncompliance',
  other_item: 'osp.inspections.noticeKind.other'
};
const RESPONSE_KIND_ID: Record<string, string> = {
  '': 'osp.inspections.responseKind.none',
  corrected: 'osp.inspections.responseKind.corrected',
  rebutted: 'osp.inspections.responseKind.rebutted'
};

const EMPTY_INSPECTION: CertifierInspectionInput = {
  inspected_on: '',
  certifying_agent: '',
  inspector_name: '',
  inspection_kind: '',
  report_document: null
};

const EMPTY_NOTICE: CertifierNoticeInput = {
  inspection: null,
  kind: 'notice_of_noncompliance',
  agent_label: '',
  received_on: null,
  description: '',
  notice_document: null,
  respond_by: null,
  response_kind: '',
  response_text: '',
  response_sent_on: null,
  response_document_ids: [],
  resolution_received_on: null,
  resolution_document: null
};

/** The fields the inspection form renders, copied off a saved row. */
export const inspectionDraft = (i: CertifierInspection): CertifierInspectionInput => ({
  inspected_on: i.inspected_on,
  certifying_agent: i.certifying_agent,
  inspector_name: i.inspector_name,
  inspection_kind: i.inspection_kind,
  report_document: i.report_document
});

/** The fields the notice form renders, copied off a saved row. */
export const noticeDraft = (n: CertifierNotice): CertifierNoticeInput => ({
  inspection: n.inspection,
  kind: n.kind,
  agent_label: n.agent_label,
  received_on: n.received_on,
  description: n.description,
  notice_document: n.notice_document,
  respond_by: n.respond_by,
  response_kind: n.response_kind,
  response_text: n.response_text,
  response_sent_on: n.response_sent_on,
  response_document_ids: n.response_documents.map((d) => d.id),
  resolution_received_on: n.resolution_received_on,
  resolution_document: n.resolution_document
});

interface Props {
  companyId: string;
  farmId: string;
  state?: string;
}

const CertifierInspectionsCard: React.FC<Props> = ({ companyId, farmId, state }) => {
  const intl = useIntl();
  const toast = useToast();
  const rowBg = useColorModeValue('gray.50', 'gray.700');
  const subtext = useColorModeValue('gray.600', 'gray.300');
  const scoped = Boolean(companyId && farmId);
  const inspectionsQuery = useGetCertifierInspectionsQuery(
    { companyId, farmId },
    { skip: !scoped }
  );
  const noticesQuery = useGetCertifierNoticesQuery({ companyId, farmId }, { skip: !scoped });
  const [addInspection, { isLoading: addingInspection }] = useAddCertifierInspectionMutation();
  const [updateInspection, { isLoading: updatingInspection }] =
    useUpdateCertifierInspectionMutation();
  const [addNotice, { isLoading: addingNotice }] = useAddCertifierNoticeMutation();
  const [updateNotice, { isLoading: updatingNotice }] = useUpdateCertifierNoticeMutation();
  const [upload, { isLoading: uploading }] = useUploadFarmDocumentMutation();

  // null: no form open; 'new': adding; a number: editing that row. One form at a time.
  const [inspectionEditing, setInspectionEditing] = useState<null | 'new' | number>(null);
  const [inspection, setInspection] = useState<CertifierInspectionInput>(EMPTY_INSPECTION);
  const [noticeEditing, setNoticeEditing] = useState<null | 'new' | number>(null);
  const [notice, setNotice] = useState<CertifierNoticeInput>(EMPTY_NOTICE);
  // Files picked but not yet uploaded, by the field they will fill.
  const [files, setFiles] = useState<Record<string, File[]>>({});
  // True for the whole save, uploads and record together. The RTK flags alone drop to false in the
  // gap between one request finishing and the next starting, which re-enabled the form mid-save.
  const [saving, setSaving] = useState(false);

  const t = (id: string, values?: Record<string, React.ReactNode>) =>
    intl.formatMessage({ id }, values as Record<string, string>);
  const date = (iso: string | null) =>
    iso
      ? intl.formatDate(`${iso}T00:00:00`, { year: 'numeric', month: 'short', day: 'numeric' })
      : '';

  const header = (body: React.ReactNode) => (
    <StandardCard
      mb={4}
      titleIcon={<Icon as={FaClipboardCheck} color="green.700" />}
      title={t('osp.inspections.title')}
      subtitle={t('osp.inspections.subtitle')}>
      {/* On a wrapper: StandardCard does not spread unknown props, so a test id on it is dropped. */}
      <Box data-testid="certifier-inspections-card">{body}</Box>
    </StandardCard>
  );

  if (inspectionsQuery.isLoading || noticesQuery.isLoading) {
    return header(<Skeleton height="80px" borderRadius="md" />);
  }

  // A failed fetch is not an absence: "nothing recorded" would be a claim made by an error.
  const failed = inspectionsQuery.isError || noticesQuery.isError || !scoped;
  if (failed) {
    const error = inspectionsQuery.error ?? noticesQuery.error;
    const forbidden = (error as { status?: number } | undefined)?.status === 403;
    return header(
      <HStack spacing={2} align="flex-start" color={STATUS_URGENCY_TOKENS.crit.text}>
        <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
        <Text fontSize="sm">
          {t(forbidden ? 'osp.inspections.forbidden' : 'osp.inspections.loadFailed')}
        </Text>
      </HStack>
    );
  }

  const inspections = inspectionsQuery.data ?? [];
  const notices = noticesQuery.data ?? [];
  const busy =
    saving || addingInspection || updatingInspection || addingNotice || updatingNotice || uploading;
  const formOpen = inspectionEditing !== null || noticeEditing !== null;

  const pick =
    (key: string, multiple = false) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      setFiles((f) => ({ ...f, [key]: multiple ? picked : picked.slice(0, 1) }));
    };

  const fail = (titleId: string, error: unknown) =>
    toast({
      status: 'error',
      title: t(titleId),
      description: apiErrorMessage(error) ?? undefined,
      duration: 6000
    });

  /**
   * Upload each picked file for `key` to Documents, in pick order, and hand each id to `link` the
   * moment it exists. Each file leaves the pending list as soon as it is uploaded, so when a later
   * upload fails, a retry sends only what is still pending and links nothing twice (review of
   * app #333: ids were committed only after every upload succeeded). Throws on a failure.
   */
  const uploadPicked = async (
    key: string,
    title: string,
    link: (id: number) => void
  ): Promise<number[]> => {
    const ids: number[] = [];
    for (const file of files[key] ?? []) {
      const doc = await upload({
        companyId,
        farmId,
        file,
        folder: 'certifications',
        title: `${title} - ${file.name}`
      }).unwrap();
      ids.push(doc.id);
      link(doc.id);
      setFiles((f) => ({ ...f, [key]: (f[key] ?? []).filter((x) => x !== file) }));
    }
    return ids;
  };

  const closeForms = () => {
    setInspectionEditing(null);
    setNoticeEditing(null);
    setFiles({});
  };

  const openInspection = (row?: CertifierInspection) => {
    closeForms();
    setInspection(row ? inspectionDraft(row) : EMPTY_INSPECTION);
    setInspectionEditing(row ? row.id : 'new');
  };

  const openNotice = (row?: CertifierNotice) => {
    closeForms();
    setNotice(row ? noticeDraft(row) : EMPTY_NOTICE);
    setNoticeEditing(row ? row.id : 'new');
  };

  const saveInspection = async () => {
    setSaving(true);
    try {
      await saveInspectionNow();
    } finally {
      setSaving(false);
    }
  };

  const saveInspectionNow = async () => {
    // The form is disabled while saving, so this snapshot is what the user sees until it is sent.
    const data = { ...inspection };
    try {
      // Kept in the draft: a retry after a failed save links this file, not a second copy.
      const [report] = await uploadPicked('report', t('osp.inspections.upload.report'), (id) =>
        setInspection((d) => ({ ...d, report_document: id }))
      );
      if (report != null) data.report_document = report;
    } catch (error) {
      fail('osp.inspections.uploadFailed', error);
      return;
    }
    try {
      const saved =
        inspectionEditing === 'new'
          ? await addInspection({ companyId, farmId, data }).unwrap()
          : await updateInspection({
              companyId,
              farmId,
              inspectionId: inspectionEditing as number,
              data
            }).unwrap();
      setInspectionEditing(saved.id);
    } catch (error) {
      fail('osp.inspections.saveFailed', error);
      return;
    }
    closeForms();
    toast({ status: 'success', title: t('osp.inspections.saved'), duration: 3000 });
  };

  const saveNotice = async () => {
    setSaving(true);
    try {
      await saveNoticeNow();
    } finally {
      setSaving(false);
    }
  };

  const saveNoticeNow = async () => {
    // The form is disabled while saving, so this snapshot is what the user sees until it is sent.
    const data = { ...notice, description: notice.description.trim() };
    try {
      // Each id goes into the draft the moment its upload succeeds (functional updates, so
      // nothing else in the draft is overwritten); a retry after any failure re-sends nothing.
      const [letter] = await uploadPicked('letter', t('osp.inspections.upload.letter'), (id) =>
        setNotice((d) => ({ ...d, notice_document: id }))
      );
      if (letter != null) data.notice_document = letter;
      const sent = await uploadPicked('response', t('osp.inspections.upload.response'), (id) =>
        setNotice((d) => ({ ...d, response_document_ids: [...d.response_document_ids, id] }))
      );
      data.response_document_ids = [...data.response_document_ids, ...sent];
      const [resolution] = await uploadPicked(
        'resolution',
        t('osp.inspections.upload.resolution'),
        (id) => setNotice((d) => ({ ...d, resolution_document: id }))
      );
      if (resolution != null) data.resolution_document = resolution;
    } catch (error) {
      fail('osp.inspections.uploadFailed', error);
      return;
    }
    try {
      const saved =
        noticeEditing === 'new'
          ? await addNotice({ companyId, farmId, data }).unwrap()
          : await updateNotice({
              companyId,
              farmId,
              noticeId: noticeEditing as number,
              data
            }).unwrap();
      setNoticeEditing(saved.id);
    } catch (error) {
      fail('osp.inspections.saveFailed', error);
      return;
    }
    closeForms();
    toast({ status: 'success', title: t('osp.inspections.saved'), duration: 3000 });
  };

  const inspectionLabel = (id: number | null) => {
    const row = inspections.find((i) => i.id === id);
    return row ? [date(row.inspected_on), row.certifying_agent].filter(Boolean).join(' · ') : '';
  };

  // Titles of every file the saved rows name, for the "on file" lines in the forms.
  const titles: Record<number, string> = {};
  inspections.forEach((i) => {
    if (i.report_document && i.report_document_title)
      titles[i.report_document] = i.report_document_title;
  });
  notices.forEach((n) => {
    if (n.notice_document && n.notice_document_title)
      titles[n.notice_document] = n.notice_document_title;
    if (n.resolution_document && n.resolution_document_title) {
      titles[n.resolution_document] = n.resolution_document_title;
    }
    n.response_documents.forEach((d) => {
      titles[d.id] = d.title;
    });
  });

  /** A linked file, with a way to unlink it: the Documents page refuses to delete a linked file,
   * so without this a wrong attachment could never leave the record. Unlinking keeps the file. */
  const attached = (id: number, onRemove: () => void) => (
    <HStack key={id} spacing={2} data-testid="attached-file">
      <Text fontSize="xs" flex={1} minW={0} noOfLines={1}>
        {t('osp.inspections.onFile', { title: titles[id] ?? t('osp.inspections.attachedFile') })}
      </Text>
      <StandardButton size="xs" variant="ghost" onClick={onRemove}>
        {t('osp.inspections.unlink')}
      </StandardButton>
    </HStack>
  );

  const inspectionForm = (
    <Box p={3} borderWidth="1px" borderRadius="md" data-testid="inspection-form">
      {/* Disabled while saving: an edit made during the upload would not be in what is sent. */}
      <Box as="fieldset" disabled={busy} border="none" m={0} p={0} minW={0}>
        <VStack align="stretch" spacing={3}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <StandardField label={t('osp.inspections.field.date')} required>
              <StandardInput
                type="date"
                value={inspection.inspected_on}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setInspection((d) => ({ ...d, inspected_on: e.target.value }))
                }
              />
            </StandardField>
            <StandardField label={t('osp.inspections.field.kind')}>
              <StandardSelect
                value={inspection.inspection_kind}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setInspection((d) => ({
                    ...d,
                    inspection_kind: e.target.value as CertifierInspectionInput['inspection_kind']
                  }))
                }>
                {INSPECTION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(INSPECTION_KIND_ID[k])}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
          </SimpleGrid>
          <StandardField label={t('osp.inspections.field.agent')}>
            <CertifyingAgentPicker
              value={inspection.certifying_agent}
              onChange={(name) => setInspection((d) => ({ ...d, certifying_agent: name }))}
              state={state}
            />
          </StandardField>
          <StandardField label={t('osp.inspections.field.inspector')}>
            <StandardInput
              value={inspection.inspector_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInspection((d) => ({ ...d, inspector_name: e.target.value }))
              }
            />
          </StandardField>
          <StandardField
            label={t('osp.inspections.field.report')}
            helpText={t('osp.inspections.field.reportHelp')}>
            {inspection.report_document != null &&
              attached(inspection.report_document, () =>
                setInspection((d) => ({ ...d, report_document: null }))
              )}
            <StandardInput type="file" accept={UPLOAD_ACCEPT} onChange={pick('report')} p={1} />
          </StandardField>
          <HStack spacing={2} justify="flex-end">
            <StandardButton variant="ghost" size="sm" onClick={closeForms}>
              {t('osp.inspections.cancel')}
            </StandardButton>
            <StandardButton
              size="sm"
              onClick={saveInspection}
              isDisabled={!inspection.inspected_on}
              isLoading={busy}>
              {t('osp.inspections.save')}
            </StandardButton>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );

  const dateField = (labelId: string, key: keyof CertifierNoticeInput) => (
    <StandardField label={t(labelId)}>
      <StandardInput
        type="date"
        value={(notice[key] as string | null) ?? ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setNotice((d) => ({ ...d, [key]: e.target.value || null }))
        }
      />
    </StandardField>
  );

  const noticeForm = (
    <Box p={3} borderWidth="1px" borderRadius="md" data-testid="notice-form">
      <Box as="fieldset" disabled={busy} border="none" m={0} p={0} minW={0}>
        <VStack align="stretch" spacing={3}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <StandardField label={t('osp.inspections.field.noticeKind')} required>
              <StandardSelect
                value={notice.kind}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNotice((d) => ({ ...d, kind: e.target.value as CertifierNoticeInput['kind'] }))
                }>
                {NOTICE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(NOTICE_KIND_ID[k])}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
            <StandardField label={t('osp.inspections.field.fromInspection')}>
              <StandardSelect
                value={notice.inspection ?? ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNotice((d) => ({
                    ...d,
                    inspection: e.target.value ? Number(e.target.value) : null
                  }))
                }>
                <option value="">{t('osp.inspections.field.noInspection')}</option>
                {inspections.map((i) => (
                  <option key={i.id} value={i.id}>
                    {inspectionLabel(i.id)}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
          </SimpleGrid>
          {notice.kind === 'other_item' && (
            <StandardField
              label={t('osp.inspections.field.agentLabel')}
              helpText={t('osp.inspections.field.agentLabelHelp')}
              required>
              <StandardInput
                value={notice.agent_label}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNotice((d) => ({ ...d, agent_label: e.target.value }))
                }
              />
            </StandardField>
          )}
          <StandardField
            label={t('osp.inspections.field.description')}
            helpText={t('osp.inspections.field.descriptionHelp')}
            required>
            <StandardTextarea
              value={notice.description}
              rows={3}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotice((d) => ({ ...d, description: e.target.value }))
              }
            />
          </StandardField>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {dateField('osp.inspections.field.receivedOn', 'received_on')}
            {dateField('osp.inspections.field.respondBy', 'respond_by')}
          </SimpleGrid>
          <StandardField
            label={t('osp.inspections.field.letter')}
            helpText={t('osp.inspections.field.letterHelp')}>
            {notice.notice_document != null &&
              attached(notice.notice_document, () =>
                setNotice((d) => ({ ...d, notice_document: null }))
              )}
            <StandardInput type="file" accept={UPLOAD_ACCEPT} onChange={pick('letter')} p={1} />
          </StandardField>

          <Text fontSize="sm" fontWeight="semibold" pt={2}>
            {t('osp.inspections.section.response')}
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <StandardField label={t('osp.inspections.field.responseKind')}>
              <StandardSelect
                value={notice.response_kind}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNotice((d) => ({
                    ...d,
                    response_kind: e.target.value as CertifierNoticeInput['response_kind']
                  }))
                }>
                {NOTICE_RESPONSE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(RESPONSE_KIND_ID[k])}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
            {dateField('osp.inspections.field.responseSentOn', 'response_sent_on')}
          </SimpleGrid>
          <StandardField label={t('osp.inspections.field.responseText')}>
            <StandardTextarea
              value={notice.response_text}
              rows={3}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotice((d) => ({ ...d, response_text: e.target.value }))
              }
            />
          </StandardField>
          <StandardField
            label={t('osp.inspections.field.responseFiles')}
            helpText={t('osp.inspections.field.responseFilesHelp')}>
            {notice.response_document_ids.map((id) =>
              attached(id, () =>
                setNotice((d) => ({
                  ...d,
                  response_document_ids: d.response_document_ids.filter((x) => x !== id)
                }))
              )
            )}
            <StandardInput
              type="file"
              multiple
              accept={UPLOAD_ACCEPT}
              onChange={pick('response', true)}
              p={1}
            />
          </StandardField>

          <Text fontSize="sm" fontWeight="semibold" pt={2}>
            {t('osp.inspections.section.resolution')}
          </Text>
          {dateField('osp.inspections.field.resolutionOn', 'resolution_received_on')}
          <StandardField
            label={t('osp.inspections.field.resolution')}
            helpText={t('osp.inspections.field.resolutionHelp')}>
            {notice.resolution_document != null &&
              attached(notice.resolution_document, () =>
                setNotice((d) => ({ ...d, resolution_document: null }))
              )}
            <StandardInput type="file" accept={UPLOAD_ACCEPT} onChange={pick('resolution')} p={1} />
          </StandardField>

          <HStack spacing={2} justify="flex-end">
            <StandardButton variant="ghost" size="sm" onClick={closeForms}>
              {t('osp.inspections.cancel')}
            </StandardButton>
            <StandardButton
              size="sm"
              onClick={saveNotice}
              isDisabled={
                !notice.description.trim() ||
                (notice.kind === 'other_item' && !notice.agent_label.trim())
              }
              isLoading={busy}>
              {t('osp.inspections.save')}
            </StandardButton>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );

  return header(
    <VStack align="stretch" spacing={4}>
      <VStack align="stretch" spacing={2}>
        <Text fontSize="sm" fontWeight="semibold">
          {t('osp.inspections.section.inspections')}
        </Text>
        {inspections.length === 0 && inspectionEditing === null && (
          <Text fontSize="sm" color={subtext}>
            {t('osp.inspections.emptyInspections')}
          </Text>
        )}
        {inspections.map((row) => (
          <HStack
            key={row.id}
            p={3}
            bg={rowBg}
            borderRadius="md"
            align="flex-start"
            data-testid="inspection-row">
            <VStack align="stretch" spacing={1} flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="semibold">
                {[date(row.inspected_on), row.certifying_agent].filter(Boolean).join(' · ')}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {[
                  row.inspection_kind ? t(INSPECTION_KIND_ID[row.inspection_kind]) : '',
                  row.inspector_name
                    ? t('osp.inspections.inspectorLine', { name: row.inspector_name })
                    : ''
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {row.report_document_title
                  ? t('osp.inspections.reportOnFile', { title: row.report_document_title })
                  : t('osp.inspections.noReport')}
              </Text>
            </VStack>
            {!formOpen && (
              <StandardButton size="sm" variant="ghost" onClick={() => openInspection(row)}>
                {t('osp.inspections.edit')}
              </StandardButton>
            )}
          </HStack>
        ))}
        {inspectionEditing !== null
          ? inspectionForm
          : !formOpen && (
              <Box>
                <StandardButton size="sm" variant="ghost" onClick={() => openInspection()}>
                  {t('osp.inspections.addInspection')}
                </StandardButton>
              </Box>
            )}
      </VStack>

      <VStack align="stretch" spacing={2}>
        <Text fontSize="sm" fontWeight="semibold">
          {t('osp.inspections.section.notices')}
        </Text>
        {notices.length === 0 && noticeEditing === null && (
          <Text fontSize="sm" color={subtext}>
            {t('osp.inspections.emptyNotices')}
          </Text>
        )}
        {notices.map((row) => (
          <HStack
            key={row.id}
            p={3}
            bg={rowBg}
            borderRadius="md"
            align="flex-start"
            data-testid="notice-row">
            <VStack align="stretch" spacing={1} flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="semibold">
                {[
                  row.kind === 'other_item' ? row.agent_label : t(NOTICE_KIND_ID[row.kind]),
                  date(row.received_on)
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text fontSize="sm" noOfLines={3}>
                {row.description}
              </Text>
              {row.respond_by && (
                <Text fontSize="xs" color={subtext}>
                  {t('osp.inspections.respondByLine', { date: date(row.respond_by) })}
                </Text>
              )}
              <Text fontSize="xs" color={subtext} data-testid="notice-status">
                {t(STATUS_MESSAGE_ID[row.status])}
              </Text>
              {row.inspection && (
                <Text fontSize="xs" color={subtext}>
                  {t('osp.inspections.fromInspectionLine', {
                    inspection: inspectionLabel(row.inspection)
                  })}
                </Text>
              )}
            </VStack>
            {!formOpen && (
              <StandardButton size="sm" variant="ghost" onClick={() => openNotice(row)}>
                {t('osp.inspections.edit')}
              </StandardButton>
            )}
          </HStack>
        ))}
        {noticeEditing !== null
          ? noticeForm
          : !formOpen && (
              <Box>
                <StandardButton size="sm" variant="ghost" onClick={() => openNotice()}>
                  {t('osp.inspections.addNotice')}
                </StandardButton>
              </Box>
            )}
      </VStack>

      <Text fontSize="xs" color={subtext}>
        {t('osp.inspections.ownRecords')}
      </Text>
    </VStack>
  );
};

/**
 * Beside the annual update's "(a)(4) other information your certifying agent asked for": how many
 * items from the agent have no resolution notice attached, pointing at the card that holds them.
 * A hint, not a record: nothing on a failed or forbidden load, and nothing when every item is resolved.
 */
export const UnresolvedCertifierNoticesLine: React.FC<{ companyId: string; farmId: string }> = ({
  companyId,
  farmId
}) => {
  const intl = useIntl();
  const { data, isError } = useGetCertifierNoticesQuery(
    { companyId, farmId },
    { skip: !(companyId && farmId) }
  );
  if (isError || !data) return null;
  const count = data.filter((n) => n.status !== 'resolved').length;
  if (!count) return null;
  return (
    <StandardAlert
      status="info"
      mb={2}
      description={intl.formatMessage({ id: 'osp.inspections.unresolvedHint' }, { count })}
    />
  );
};

export default CertifierInspectionsCard;
