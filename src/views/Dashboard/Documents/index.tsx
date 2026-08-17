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
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
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
  StandardPage,
  StandardPageLoading,
  StandardPagination,
  StandardSearchInput
} from 'components/Design/StandardComponents';
import { DOCUMENT_DOWNLOAD_URL } from 'config';
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

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  // Folder narrowing is deliberately NOT sent to the server any more. The endpoint is
  // unpaginated either way, so a folder param saved no payload on the default ("All") view —
  // and filtering here is what makes the per-folder counts on the chips free, and makes
  // switching folders instant instead of a round-trip each click.
  const { data: documents, isLoading } = useGetFarmDocumentsQuery(
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

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;

    const clearInput = () => {
      if (fileInput.current) fileInput.current.value = '';
    };

    // Checked here so a 90 MB scan is refused before it is uploaded, not after. The server
    // refuses it too — this only decides whether the farmer waits for the answer.
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

    try {
      await uploadDocument({ companyId, farmId: farmId || '', file }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'documents.uploaded' }),
        status: 'success',
        duration: 3000
      });
    } catch (err) {
      // The server now explains itself — too big, wrong type, no active plan — and a bare
      // "Upload failed" throws that explanation away. `apiErrorMessage` reads whichever DRF
      // key the message actually arrived under instead of guessing one.
      toast({
        title: intl.formatMessage({ id: 'documents.uploadFailed' }),
        description: apiErrorMessage(err) ?? undefined,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    }
    clearInput();
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
              minH="32px"
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
            {doc.source_display}
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
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
          <Box data-tour="documents-upload">
            <StandardButton
              minH="44px"
              leftIcon={<FaFileUpload />}
              isLoading={uploading}
              onClick={() => fileInput.current?.click()}>
              {intl.formatMessage({ id: 'documents.upload' })}
            </StandardButton>
          </Box>
        </>
      }>
      <VStack align="stretch" spacing={5}>
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
            {FOLDERS.map((f) => (
              <WrapItem key={f}>
                <StandardButton
                  size="sm"
                  minH="44px"
                  borderRadius="full"
                  aria-pressed={folder === f}
                  variant={folder === f ? 'primary' : 'outline'}
                  onClick={() => setFolder(f)}>
                  {intl.formatMessage({ id: `documents.folder.${f}` })}
                  <Box as="span" ml={1.5} fontWeight="normal">
                    {folderCounts.get(f) ?? 0}
                  </Box>
                </StandardButton>
              </WrapItem>
            ))}
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
        {!isLoading && !!(documents ?? []).length && (
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
          {isLoading ? (
            <StandardPageLoading />
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
            <StandardCard>
              <Box overflowX="auto">
                <Table size="sm">
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
          )}
        </Box>
      </VStack>
    </StandardPage>
  );
};

export default DocumentsPage;
