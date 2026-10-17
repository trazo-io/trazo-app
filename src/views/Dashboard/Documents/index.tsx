/**
 * Documents — the farm's document shelf (WS-3).
 *
 * Every certifier artifact Trazo generates (dossiers, PUR, OSP snapshots, workbooks,
 * lot tags — and soon module PDFs + the packet) lands here automatically, dated;
 * farmers add their own uploads (weigh tickets, receipts, labels) beside them.
 * Generated rows are immutable history — only uploads can be deleted.
 *
 * Route: /admin/dashboard/farm/:farmId/documents
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import {
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaFileUpload,
  FaFolderOpen,
  FaTrash
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardPage,
  StandardPageLoading,
  StandardPagination,
  StandardSearchInput,
  StandardSelect,
  StandardQueryError
} from 'components/Design/StandardComponents';
import { useGetFarmProductionsQuery, useGetHistoryQuery } from 'store/api/historyApi';
import { documentSourceLabel } from 'utils/documentSource';
import { eventTitle } from 'config/events/narrative';
import { formatDateFromTimestamp } from 'utils/dateOnly';
import { DOCUMENT_DOWNLOAD_URL, RECORDS_EXPORT_URL } from 'config';
import { env } from 'config/environment';
import { useDebounce } from 'hooks/useDebounce';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import {
  useDeleteFarmDocumentMutation,
  useGetFarmDocumentsQuery,
  useUploadFarmDocumentMutation,
  type FarmDocument
} from 'store/api/documentsApi';
import type { RootState } from 'store/index';
import { useTour } from 'hooks/useTour';

const FOLDERS = [
  'organic_system_plan',
  'certifications',
  'activity_attachments',
  'exports',
  'uploads'
];

const PAGE_SIZE = 25;
/** `search` rides the RTK query key, so an undebounced input fired one request per keystroke
 *  against a 500/hour user throttle — "walnut" cost six of them. */
const SEARCH_DEBOUNCE_MS = 300;

const formatSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

/**
 * Mirrors `DOCUMENT_UPLOAD_MAX_BYTES` and `ALLOWED_DOCUMENT_EXTENSIONS` on the server.
 *
 * The server is the gate — these two constants are not it. They exist so the farmer learns
 * a 90 MB scan is too big BEFORE spending several minutes of a rural upload on it, which is
 * the whole difference between a limit that feels like a rule and one that feels like a
 * failure. Anything that gets past them is still refused server-side with the same reason.
 *
 * If the server limit changes, change these too — they are a duplicate on purpose, and a
 * stale copy here shows the wrong number rather than allowing the wrong file.
 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.heif',
  '.webp',
  '.tif',
  '.tiff',
  '.xlsx',
  '.xls',
  '.docx',
  '.doc',
  '.csv',
  '.txt',
  '.zip'
];
const UPLOAD_ACCEPT = ALLOWED_EXTENSIONS.join(',');

interface DocGroup {
  key: string;
  latest: FarmDocument;
  /** Same-titled earlier generations, newest first. Empty for everything that never repeated. */
  older: FarmDocument[];
}

/**
 * Collapse repeated generations of one artifact into a single row.
 *
 * Regenerating files a NEW dated row rather than mutating the old one (documents/models.py),
 * which is the right archival rule and the wrong reading experience: six clicks of "generate
 * packet" in one afternoon put six byte-identical-looking `OSP renewal packet — v2` rows on the
 * shelf, and paging would only have spread them over more screens.
 *
 * Uploads are deliberately NOT collapsed. They are the farmer's own files — deletable, few, and
 * named by hand — so two of them sharing a name are far likelier to be two different documents
 * than two versions of one, and hiding one behind a disclosure would lose it.
 */
const groupDocuments = (docs: FarmDocument[]): DocGroup[] => {
  const groups: DocGroup[] = [];
  const index = new Map<string, DocGroup>();

  for (const doc of docs) {
    if (doc.source === 'upload') {
      groups.push({ key: `upload-${doc.id}`, latest: doc, older: [] });
      continue;
    }
    const key = `${doc.folder}|${doc.source}|${doc.title}`;
    const existing = index.get(key);
    // The list arrives newest-first (GeneratedDocument.Meta.ordering = ["-created_at"]), so the
    // first row of a key is the current one and everything after it is an earlier generation.
    if (existing) {
      existing.older.push(doc);
      continue;
    }
    const group: DocGroup = { key, latest: doc, older: [] };
    index.set(key, group);
    groups.push(group);
  }

  return groups;
};

const DocumentsPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const { farmId } = useParams();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';

  useTour('documents-page', { enabled: !!companyId && !!farmId });

  const [folder, setFolder] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  // Filing dialog — the two questions that decide whether an uploaded record is findable:
  // which folder it belongs in, and which lot it documents.
  const { isOpen: isFilingOpen, onOpen: onFilingOpen, onClose: onFilingClose } = useDisclosure();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFolder, setUploadFolder] = useState('uploads');
  const [uploadProduction, setUploadProduction] = useState('');
  // `${event_type}:${id}` of the one record this file documents, or '' (pilot rehearsal
  // 2026-10, finding 4: an invoice could point at the season and no finer).
  const [uploadEvent, setUploadEvent] = useState('');

  const { data: productions = [] } = useGetFarmProductionsQuery(farmId, {
    skip: !farmId || !isFilingOpen
  });
  // The chosen production's own records, for the record picker. Only fetched once a production
  // is chosen: a record belongs to exactly one season, and the server refuses a mismatch.
  const { data: uploadProductionDetail } = useGetHistoryQuery(uploadProduction, {
    skip: !uploadProduction || !isFilingOpen
  });
  const uploadEventOptions = useMemo(() => {
    const events = (uploadProductionDetail?.events ?? []) as Array<{
      id: number;
      event_type: number;
      name?: string;
      type?: string;
      date?: string;
    }>;
    return events
      .filter((ev) => ev?.id != null && ev?.event_type != null)
      .map((ev) => {
        const date = formatDateFromTimestamp(ev.date, intl.locale);
        const title = eventTitle(ev.event_type, ev.type, ev.name, intl);
        return {
          value: `${ev.event_type}:${ev.id}`,
          label: date ? `${date} · ${title}` : title
        };
      });
  }, [uploadProductionDetail, intl]);

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  // Folder narrowing is deliberately NOT sent to the server any more. The endpoint is
  // unpaginated either way, so a folder param saved no payload on the default ("All") view —
  // and filtering here is what makes the per-folder counts on the chips free, and makes
  // switching folders instant instead of a round-trip each click.
  // `isError` read: a failed request left `documents` undefined, `groups` empty, and the
  // shelf stated that this farm has no documents on file — on the screen a certifier's
  // paperwork lives on, that is the worst possible thing to say by accident.
  const {
    data: documents,
    isLoading,
    isUninitialized,
    isError,
    isFetching,
    refetch
  } = useGetFarmDocumentsQuery(
    { companyId, farmId: farmId || '', search: debouncedSearch || undefined },
    { skip: !companyId || !farmId }
  );
  const [uploadDocument, { isLoading: uploading }] = useUploadFarmDocumentMutation();
  const [deleteDocument] = useDeleteFarmDocumentMutation();

  const allGroups = useMemo(() => groupDocuments(documents ?? []), [documents]);

  // Counts are of GROUPS, not raw rows: the chip has to promise the number of lines the table
  // will actually show, or "Exports (12)" opens onto four.
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of allGroups) {
      counts.set(g.latest.folder, (counts.get(g.latest.folder) ?? 0) + 1);
    }
    return counts;
  }, [allGroups]);

  const groups = useMemo(
    () => (folder ? allGroups.filter((g) => g.latest.folder === folder) : allGroups),
    [allGroups, folder]
  );

  /**
   * What the shelf weighs, over EVERY row — including the older generations collapsed
   * behind "13 versions", which are real stored files.
   *
   * This exists to close a loop between two screens. The subscription page counts the DMS
   * in its storage meter, and a shelf of 21 certifier artifacts weighs under a megabyte —
   * so the meter's Documents line is a small number next to a page listing a lot of files,
   * and there was nothing on THIS page to reconcile it against. Stating the total here
   * makes the two screens agree out loud.
   *
   * Not a quota. Documents are counted toward storage but never refused (see
   * `subscriptions/storage_accounting.py`), so this is a fact about the shelf, not a limit
   * bar — and it must not be dressed as one.
   *
   * ⚠️ `search` is sent to the SERVER, so `documents` is already narrowed by it — unlike the
   * folder chips, which filter client-side and leave this total intact. A line that says
   * "on this farm's shelf" while showing a search subset is simply wrong, so the caller
   * hides it while a search is active rather than quietly reporting the filtered figure.
   */
  const shelfBytes = useMemo(
    () => (documents ?? []).reduce((sum, doc) => sum + (doc.size_bytes || 0), 0),
    [documents]
  );

  // Clamped, so a list that shrinks for ANY reason — a refetch, a delete, a filter this
  // effect does not watch — can never slice past the end and paint an empty table under a
  // pager reading "Page 7 of 2".
  const pageCount = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleGroups = useMemo(
    () => groups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [groups, safePage]
  );

  // Narrowing the list should also send the viewer back to the top of it, not merely keep them
  // in range: landing on page 3 of a fresh search result is disorienting.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, folder]);

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /**
   * File chosen → validate → open the filing dialog.
   *
   * 🔴 2026-08-16. This used to upload immediately with `{companyId, farmId, file}` and
   * nothing else, so every farmer upload landed in the default "uploads" folder with no link
   * to a production — and the certifier packet, which now prints a document index, had
   * nothing to say about any of them. Four of CCOF's eight grower checklist items are
   * satisfied by a DOCUMENT (receipts, the handler's organic certificate, delivery documents,
   * pack-out summaries), and all four are per-lot records. Asking two questions before the
   * upload is what makes them findable.
   */
  const stageUpload = (file: File | undefined) => {
    if (!file) return;

    const clearInput = () => {
      if (fileInput.current) fileInput.current.value = '';
    };

    const extension = file.name.includes('.')
      ? `.${file.name.split('.').pop()?.toLowerCase()}`
      : '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast({
        title: intl.formatMessage({ id: 'documents.uploadFailed' }),
        description: intl.formatMessage(
          { id: 'documents.uploadTypeRejected' },
          { types: ALLOWED_EXTENSIONS.map((e) => e.slice(1)).join(', ') }
        ),
        status: 'error',
        duration: 7000,
        isClosable: true
      });
      clearInput();
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: intl.formatMessage({ id: 'documents.uploadFailed' }),
        description: intl.formatMessage(
          { id: 'documents.uploadTooLarge' },
          { size: formatSize(file.size), limit: formatSize(MAX_UPLOAD_BYTES) }
        ),
        status: 'error',
        duration: 7000,
        isClosable: true
      });
      clearInput();
      return;
    }

    setPendingFile(file);
    // Filename without extension is the best title Trazo can offer; the farmer overrides it.
    setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
    setUploadFolder('uploads');
    setUploadProduction('');
    setUploadEvent('');
    onFilingOpen();
    clearInput();
  };

  /** Confirm the filing dialog: upload the staged file WITH its folder and lot link. */
  const confirmUpload = async () => {
    if (!pendingFile) return;
    try {
      await uploadDocument({
        companyId,
        farmId: farmId || '',
        file: pendingFile,
        title: uploadTitle.trim() || undefined,
        folder: uploadFolder,
        history: uploadProduction ? Number(uploadProduction) : null,
        ...(uploadProduction && uploadEvent
          ? {
              eventType: Number(uploadEvent.split(':')[0]),
              eventId: Number(uploadEvent.split(':')[1])
            }
          : {})
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'documents.uploaded' }),
        status: 'success',
        duration: 3000
      });
      setPendingFile(null);
      onFilingClose();
    } catch (err) {
      // The server explains itself — too big, wrong type, no active plan, production not on
      // this farm — and a bare "Upload failed" throws that explanation away. `apiErrorMessage`
      // reads whichever DRF key the message actually arrived under instead of guessing one.
      toast({
        title: intl.formatMessage({ id: 'documents.uploadFailed' }),
        description: apiErrorMessage(err) ?? undefined,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await deleteDocument({ companyId, farmId: farmId || '', docId }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'documents.deleted' }),
        status: 'success',
        duration: 3000
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'documents.deleteFailed' }),
        status: 'error',
        duration: 5000
      });
    }
  };

  /**
   * One document as a stacked card, for phones.
   *
   * A six-column table cannot be made to work at 390px. Shrinking it wrapped every
   * header one character per line ("SOURCE" became a vertical S-O-U-R-C-E stack);
   * giving it a `minW` fixed that but left Folder, Source, Size and Date off the right
   * edge behind a horizontal scroll nobody discovers. So below `md` the same data is
   * stacked: title first, then the facts as labelled pairs, then the actions.
   * Mirrors the Activities list, which had this identical problem.
   */
  const renderCard = (doc: FarmDocument, group: DocGroup, isOlder: boolean) => {
    const isExpanded = expanded.has(group.key);
    return (
      <Box
        key={doc.id}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="lg"
        bg={isOlder ? 'gray.50' : 'white'}
        p={4}
        ml={isOlder ? 4 : 0}>
        <Text
          fontSize="sm"
          fontWeight={isOlder ? 'normal' : 'semibold'}
          color={isOlder ? 'gray.600' : undefined}>
          {doc.title}
        </Text>

        <HStack spacing={2} mt={2} flexWrap="wrap">
          <Badge variant="subtle" fontSize="11px">
            {doc.folder_display}
          </Badge>
          {doc.tags.map((t) => (
            <Badge key={t} variant="neutral" fontSize="11px">
              {t}
            </Badge>
          ))}
        </HStack>

        {/* Actions ride the END of the facts row instead of owning a row of their own.
            That row was `justify="space-between"` with an empty `<Box />` holding the left
            half, so a GENERATED document — never deletable, and not versioned until it is
            regenerated — spent 72px of a 168px card on one right-floating download glyph
            (MEASURED 2026-08-17 on a 375px screen: 43% of the card's height for one icon).
            The row is 44px tall either way because the touch targets are unchanged; it now
            carries the facts too. `wrap` so a long `source_display` drops the icons to their
            own line rather than crushing the date. */}
        <Flex mt={3} align="center" justify="space-between" gap={2} wrap="wrap">
          <HStack spacing={3} flexWrap="wrap" color="gray.600" fontSize="xs">
            <Text>{documentSourceLabel(doc, intl)}</Text>
            <Text aria-hidden="true">·</Text>
            <Text>{formatSize(doc.size_bytes)}</Text>
            <Text aria-hidden="true">·</Text>
            <Text>{new Date(doc.created_at).toLocaleDateString()}</Text>
          </HStack>
          <HStack spacing={1} flexShrink={0}>
            <StandardButton
              as="a"
              href={env.getApiUrl(DOCUMENT_DOWNLOAD_URL(companyId, farmId || '', doc.id))}
              size="sm"
              variant="ghost"
              minH="44px"
              aria-label={intl.formatMessage({ id: 'documents.download' })}>
              <FaDownload />
            </StandardButton>
            {doc.is_deletable ? (
              <StandardButton
                size="sm"
                variant="ghost"
                minH="44px"
                color="red.500"
                aria-label={intl.formatMessage({ id: 'documents.delete' })}
                onClick={() => handleDelete(doc.id)}>
                <FaTrash />
              </StandardButton>
            ) : null}
          </HStack>
        </Flex>

        {/* The version disclosure keeps its own line: it is a control that CHANGES what the
            list shows, not a fact about this row, and it exists on a minority of cards. */}
        {!isOlder && group.older.length ? (
          <StandardButton
            size="xs"
            variant="ghost"
            minH="44px"
            mt={1}
            px={2}
            fontSize="xs"
            fontWeight="normal"
            leftIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            aria-expanded={isExpanded}
            aria-label={intl.formatMessage(
              { id: isExpanded ? 'documents.hideVersions' : 'documents.showVersions' },
              { title: doc.title }
            )}
            onClick={() => toggleGroup(group.key)}>
            {intl.formatMessage({ id: 'documents.versions' }, { count: group.older.length + 1 })}
          </StandardButton>
        ) : null}
      </Box>
    );
  };

  /** One table row. `isOlder` renders an earlier generation revealed under its current one. */
  const renderRow = (doc: FarmDocument, group: DocGroup, isOlder: boolean) => {
    const isExpanded = expanded.has(group.key);
    return (
      <Tr key={doc.id} bg={isOlder ? 'gray.50' : undefined}>
        <Td pl={isOlder ? 10 : undefined}>
          <Text
            fontSize="sm"
            fontWeight={isOlder ? 'normal' : 'medium'}
            color={isOlder ? 'gray.600' : undefined}>
            {doc.title}
          </Text>
          {doc.tags.length ? (
            <HStack spacing={1} mt={1}>
              {doc.tags.map((t) => (
                <Badge key={t} variant="neutral" fontSize="11px">
                  {t}
                </Badge>
              ))}
            </HStack>
          ) : null}
          {!isOlder && group.older.length ? (
            <StandardButton
              size="xs"
              variant="ghost"
              mt={1}
              px={2}
              fontSize="xs"
              fontWeight="normal"
              leftIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              aria-expanded={isExpanded}
              aria-label={intl.formatMessage(
                { id: isExpanded ? 'documents.hideVersions' : 'documents.showVersions' },
                { title: doc.title }
              )}
              onClick={() => toggleGroup(group.key)}>
              {intl.formatMessage({ id: 'documents.versions' }, { count: group.older.length + 1 })}
            </StandardButton>
          ) : null}
        </Td>
        <Td>
          <Badge variant="subtle" fontSize="11px">
            {doc.folder_display}
          </Badge>
        </Td>
        <Td>
          <Text fontSize="xs" color="gray.600">
            {documentSourceLabel(doc, intl)}
          </Text>
        </Td>
        <Td>
          <Text fontSize="xs" color="gray.600">
            {formatSize(doc.size_bytes)}
          </Text>
        </Td>
        <Td>
          <Text fontSize="xs" color="gray.600">
            {new Date(doc.created_at).toLocaleDateString()}
          </Text>
        </Td>
        <Td>
          <HStack spacing={1} justify="flex-end">
            <StandardButton
              as="a"
              href={env.getApiUrl(DOCUMENT_DOWNLOAD_URL(companyId, farmId || '', doc.id))}
              size="sm"
              variant="ghost"
              minH="44px"
              aria-label={intl.formatMessage({ id: 'documents.download' })}>
              <FaDownload />
            </StandardButton>
            {doc.is_deletable ? (
              <StandardButton
                size="sm"
                variant="ghost"
                minH="44px"
                color="red.500"
                aria-label={intl.formatMessage({ id: 'documents.delete' })}
                onClick={() => handleDelete(doc.id)}>
                <FaTrash />
              </StandardButton>
            ) : null}
          </HStack>
        </Td>
      </Tr>
    );
  };

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'documents.pageTitle' })}
      description={intl.formatMessage({ id: 'documents.pageDescription' })}
      rightAction={
        <>
          <input
            ref={fileInput}
            type="file"
            hidden
            // `accept` filters the OS picker so the wrong file is hard to choose; it is a
            // convenience, never the gate — a determined pick still meets the checks in
            // `handleUpload` and then the server's.
            accept={UPLOAD_ACCEPT}
            onChange={(e) => stageUpload(e.target.files?.[0])}
          />
          {/*
            `w="full"` because this page is the only one that puts TWO actions in the header
            slot, and StandardPage stretches them so their right edges meet the page margin.
            The stretch lands on this `data-tour` Box; without it the Button inside stays
            auto-width (MEASURED 94px against the export's 304px) and the column is ragged.
          */}
          <Box data-tour="documents-upload">
            <StandardButton
              w="full"
              minH="44px"
              leftIcon={<FaFileUpload />}
              isLoading={uploading}
              onClick={() => fileInput.current?.click()}>
              {intl.formatMessage({ id: 'documents.upload' })}
            </StandardButton>
          </Box>
          {/* Free raw export — every plan, always (record ownership; the endpoint is
              deliberately ungated: history/tests/test_records_export.py). Plain anchor:
              cookie auth rides along and the browser handles the download. */}
          <StandardButton
            as="a"
            href={env.getApiUrl(RECORDS_EXPORT_URL(companyId, farmId || ''))}
            minH="44px"
            variant="outline"
            leftIcon={<FaDownload />}>
            {intl.formatMessage({ id: 'documents.exportAll' })}
          </StandardButton>
        </>
      }>
      {/* `mt` CANCELS StandardPage's hero overlap (`StandardComponents.tsx` pulls the body up
          by 40px so a card floats over the hero's bottom edge). That overlap assumes the first
          child IS a card. This page's first child is a bare `Wrap` of filter chips, so the
          seam between the hero gradient (#F8F9FA) and `surface.canvas` (#F4F5F7) landed BETWEEN
          the two wrapped chip rows on a phone — one control group painted on two backgrounds.
          `button.js` already patched the same seam at the button level (an outline button was
          "painted two different colours down its own middle"); this fixes it at the layout
          level, which is where it actually is. 40px exactly, so the toolbar starts flush at
          the hero's bottom edge and nothing straddles it. */}
      <VStack align="stretch" spacing={5} mt="40px">
        <Flex
          gap={3}
          direction={{ base: 'column', smd: 'row' }}
          align={{ base: 'stretch', smd: 'center' }}
          justify="space-between">
          {/* Folder filters are toggles, so they carry `aria-pressed` — which of the six is
              narrowing the list was previously conveyed by fill colour alone. Each also carries
              its count, so "where did my PUR export go?" is answerable without clicking through
              all six. */}
          <Wrap
            data-tour="documents-folders"
            spacing={2}
            role="group"
            aria-label={intl.formatMessage({ id: 'documents.folder.label' })}>
            <WrapItem>
              <StandardButton
                size="sm"
                minH="44px"
                borderRadius="full"
                aria-pressed={folder === ''}
                variant={folder === '' ? 'primary' : 'outline'}
                onClick={() => setFolder('')}>
                {intl.formatMessage({ id: 'documents.folder.all' })}
                <Box as="span" ml={1.5} fontWeight="normal">
                  {allGroups.length}
                </Box>
              </StandardButton>
            </WrapItem>
            {FOLDERS.map((f) => {
              const count = folderCounts.get(f) ?? 0;
              return (
                <WrapItem
                  key={f}
                  /**
                   * An empty folder chip is a 44px control that leads to an empty list. Three
                   * of the five were empty on a new farm, and together they forced a second
                   * wrapped row on a 375px screen — the row that then straddled the hero seam
                   * above.
                   *
                   * Hidden BELOW `md` only: the desktop keeps the full map of where things
                   * file, which is the chip group's other job. And the ACTIVE folder always
                   * renders even at zero — narrowing by search until the current folder is
                   * empty would otherwise delete the chip that is doing the narrowing and
                   * leave the farmer on a list with no visible way back to "All".
                   */
                  display={count > 0 || folder === f ? 'flex' : { base: 'none', md: 'flex' }}>
                  <StandardButton
                    size="sm"
                    minH="44px"
                    borderRadius="full"
                    aria-pressed={folder === f}
                    variant={folder === f ? 'primary' : 'outline'}
                    onClick={() => setFolder(f)}>
                    {intl.formatMessage({ id: `documents.folder.${f}` })}
                    <Box as="span" ml={1.5} fontWeight="normal">
                      {count}
                    </Box>
                  </StandardButton>
                </WrapItem>
              );
            })}
          </Wrap>
          <StandardSearchInput
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder={intl.formatMessage({ id: 'documents.searchPlaceholder' })}
            maxW={{ base: 'full', smd: '280px' }}
          />
        </Flex>

        {/* Counts every stored file, including the older generations collapsed behind
            "13 versions" — those are real bytes on the shelf, and the total has to match the
            Documents line on the Subscription page or the two screens contradict each other.
            A FACT, not a quota: documents count toward storage but are never refused. */}
        {!isLoading && !debouncedSearch && !!(documents ?? []).length && (
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage(
              { id: 'documents.shelfSummary' },
              { count: (documents ?? []).length, size: formatSize(shelfBytes) }
            )}
          </Text>
        )}

        {/* Anchored on the CONTAINER, not the table: on a farm with no documents yet only the
            empty state renders, and a tour step whose target is missing is dropped silently. */}
        <Box data-tour="documents-list" w="full">
          {/* `isUninitialized`: `companyId` hydrates async, so the skipped window reported
              `isLoading: false` with no documents and the shelf stated this farm has none —
              on the screen a certifier's paperwork lives on. */}
          {isLoading || isUninitialized ? (
            <StandardPageLoading />
          ) : isError ? (
            <StandardQueryError onRetry={refetch} isRetrying={isFetching} />
          ) : !groups.length ? (
            <StandardCard>
              <VStack py={8} spacing={3}>
                <Box as={FaFolderOpen} boxSize={8} color="green.500" />
                <Text fontWeight="semibold">
                  {intl.formatMessage({ id: 'documents.emptyTitle' })}
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center" maxW="lg">
                  {intl.formatMessage({ id: 'documents.emptyBody' })}
                </Text>
              </VStack>
            </StandardCard>
          ) : (
            <>
              {/**
               * PHONES: stacked cards on the page canvas, with NO wrapping `StandardCard`.
               *
               * The card used to wrap both branches, which put a card inside a card on every
               * phone. MEASURED on a 375px screen: 12px (StandardPage `px`) + 14px
               * (`.trazo-card` `padding !important`, one of the four protected CSS files) +
               * 12px (CardBody `px`) + 16px (this card's own `p={4}`) = 54px a side, so 108
               * of 375 — 29% of the screen — went to nested chrome and the first document
               * title wrapped to two lines inside a 267px column. Dropping the outer card
               * takes the inset to 28px and the column to 319px.
               *
               * The table below keeps its card: at `md+` there is width to spare, one card
               * around one table is the single-container rule, and nothing here changes the
               * desktop surface. Each branch carries its own pager — the hidden branch is
               * `display: none` at the ancestor, which removes it from the accessibility tree
               * too, so there is no double announcement.
               */}
              <VStack
                spacing={3}
                align="stretch"
                display={{ base: 'flex', md: 'none' }}
                data-testid="documents-list-cards">
                {visibleGroups.map((group) => (
                  <React.Fragment key={group.key}>
                    {renderCard(group.latest, group, false)}
                    {expanded.has(group.key)
                      ? group.older.map((doc) => renderCard(doc, group, true))
                      : null}
                  </React.Fragment>
                ))}
                <StandardPagination
                  page={safePage}
                  total={groups.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                  itemLabel={intl.formatMessage({ id: 'documents.item' })}
                />
              </VStack>

              {/* md+: the table, with a `minW` so the container scrolls rather than
                  crushing the columns. Without it the headers wrapped one character
                  per line — "SOURCE" rendered as a vertical S-O-U-R-C-E stack. */}
              <Box display={{ base: 'none', md: 'block' }}>
                <StandardCard>
                  <Box overflowX="auto">
                    <Table size="sm" minW="760px">
                      <Thead>
                        <Tr>
                          <Th>{intl.formatMessage({ id: 'documents.col.title' })}</Th>
                          <Th>{intl.formatMessage({ id: 'documents.col.folder' })}</Th>
                          <Th>{intl.formatMessage({ id: 'documents.col.source' })}</Th>
                          <Th>{intl.formatMessage({ id: 'documents.col.size' })}</Th>
                          <Th>{intl.formatMessage({ id: 'documents.col.date' })}</Th>
                          <Th />
                        </Tr>
                      </Thead>
                      <Tbody>
                        {visibleGroups.map((group) => (
                          <React.Fragment key={group.key}>
                            {renderRow(group.latest, group, false)}
                            {expanded.has(group.key)
                              ? group.older.map((doc) => renderRow(doc, group, true))
                              : null}
                          </React.Fragment>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  <StandardPagination
                    page={safePage}
                    total={groups.length}
                    pageSize={PAGE_SIZE}
                    onChange={setPage}
                    itemLabel={intl.formatMessage({ id: 'documents.item' })}
                  />
                </StandardCard>
              </Box>
            </>
          )}
        </Box>
      </VStack>

      {/* Filing dialog — folder + optional lot link, asked once per upload. */}
      <Modal
        isOpen={isFilingOpen}
        onClose={() => {
          setPendingFile(null);
          onFilingClose();
        }}
        isCentered
        size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{intl.formatMessage({ id: 'documents.filing.title' })}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'documents.filing.help' })}
              </Text>
              {pendingFile ? (
                <Text fontSize="xs" color="gray.500">
                  {pendingFile.name} · {formatSize(pendingFile.size)}
                </Text>
              ) : null}
              <StandardField label={intl.formatMessage({ id: 'documents.filing.field.title' })}>
                <StandardInput
                  value={uploadTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUploadTitle(e.target.value)
                  }
                />
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'documents.filing.field.folder' })}>
                <StandardSelect
                  value={uploadFolder}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setUploadFolder(e.target.value)
                  }>
                  {FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {intl.formatMessage({ id: `documents.folder.${f}` })}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
              <StandardField
                label={intl.formatMessage({ id: 'documents.filing.field.production' })}
                helpText={intl.formatMessage({ id: 'documents.filing.field.productionHelp' })}>
                <StandardSelect
                  value={uploadProduction}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setUploadProduction(e.target.value);
                    // A record belongs to one season; a different season clears the pick.
                    setUploadEvent('');
                  }}>
                  <option value="">
                    {intl.formatMessage({ id: 'documents.filing.field.productionNone' })}
                  </option>
                  {productions.map((p: { id: number; name?: string }) => (
                    <option key={p.id} value={p.id}>
                      {p.name || `#${p.id}`}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
              {uploadProduction ? (
                <StandardField
                  label={intl.formatMessage({ id: 'documents.filing.field.record' })}
                  helpText={intl.formatMessage({ id: 'documents.filing.field.recordHelp' })}>
                  <StandardSelect
                    value={uploadEvent}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setUploadEvent(e.target.value)
                    }>
                    <option value="">
                      {intl.formatMessage({ id: 'documents.filing.field.recordNone' })}
                    </option>
                    {uploadEventOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </StandardSelect>
                </StandardField>
              ) : null}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <StandardButton
                variant="ghost"
                onClick={() => {
                  setPendingFile(null);
                  onFilingClose();
                }}>
                {intl.formatMessage({ id: 'documents.filing.cancel' })}
              </StandardButton>
              <StandardButton isLoading={uploading} onClick={confirmUpload}>
                {intl.formatMessage({ id: 'documents.filing.confirm' })}
              </StandardButton>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
};

export default DocumentsPage;
