/**
 * Organic System Plan — producer dashboard page (Sprint 5A).
 *
 * One page, one establishment. Shows the latest OSP (or an empty state) and
 * lets the farmer edit the six required § 205.201(a) sections, submit to the
 * certifier, and activate. Prior versions are listed below the editor.
 *
 * Route: /admin/dashboard/farm/:farmId/osp  (farmId is the establishment id)
 *
 * Design intentionally mirrors ProfileFarm.tsx patterns: currentCompany from
 * Redux, farmId from URL, StandardPage + StandardCard layout, useToast feedback.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Badge,
  Box,
  Divider,
  Flex,
  HStack,
  Icon,
  Link as ChakraLink,
  Progress,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaFileAlt,
  FaLeaf,
  FaPlus,
  FaRegCircle
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { config } from 'config/environment';
import {
  StandardButton,
  StandardCard,
  StandardPage,
  StandardPageLoading
} from 'components/Design/StandardComponents';
import {
  useCreateOSPMutation,
  useGetOSPQuery,
  useGetOSPsQuery,
  useNewOSPVersionMutation,
  useSubmitOSPMutation,
  useUpdateOSPMutation
} from 'store/api/ospApi';
import { OSP, OSP_SECTION_KEYS, OSPSectionKey, OSPSections, OSPStatus, emptySections } from 'types/osp';
import OSPActivateModal from './OSPActivateModal';
import OSPApprovedInputsPanel from './OSPApprovedInputsPanel';

interface RootState {
  company: {
    currentCompany: { id: string } | null;
  };
}

const STATUS_COLOR: Record<OSPStatus, string> = {
  draft: 'gray',
  submitted: 'blue',
  active: 'green',
  superseded: 'gray',
  withdrawn: 'red'
};

/**
 * Minimum characters a § 205.201(a) section narrative must hit before the
 * backend accepts Submit (see `trazo-back/certifications/views.py
 * OSP_NARRATIVE_MATERIAL_FLOOR`). 400 chars ≈ 70 words — the floor below
 * which real CCOF / Oregon Tilth templates treat a section as insufficient
 * (Notice of Noncompliance territory, 7 CFR 205.662(c)). MUST stay in sync
 * with the backend constant or Submit gives a surprise 400.
 */
const OSP_MATERIAL_FLOOR = 400;

type SectionTier = 'empty' | 'brief' | 'complete';

interface SectionStatus {
  tier: SectionTier;
  label: string;
  badgeColor: string;
  charCount: number;
}

/**
 * Three-tier status for a § 205.201(a) narrative, matching the backend's
 * submit gate and the PDF snapshot's "Status" column. Character-count is
 * the one visible signal the farmer gets before they try to submit —
 * returning it in the badge closes the Day-1 UX loop where a farmer
 * submits, gets a cryptic 400, and never understands why.
 */
function sectionStatus(narrative: string): SectionStatus {
  const trimmed = (narrative || '').trim();
  const charCount = trimmed.length;
  if (charCount === 0) {
    return { tier: 'empty', label: 'empty', badgeColor: 'gray', charCount: 0 };
  }
  if (charCount < OSP_MATERIAL_FLOOR) {
    return { tier: 'brief', label: 'brief', badgeColor: 'orange', charCount };
  }
  return { tier: 'complete', label: 'complete', badgeColor: 'green', charCount };
}

/** Starter-prompt text for the empty-OSP onboarding card. Farmer-first
 *  language followed by the CFR cite so the right anchor is first. */
const SECTION_PROMPTS: Array<{ key: OSPSectionKey; prompt: string }> = [
  {
    key: 'practices_procedures',
    prompt: 'Describe your production practices — crop rotation, tillage, cover crops, pest management, irrigation, buffer zones.'
  },
  {
    key: 'inputs_list',
    prompt: 'List every input you apply — fertilizers, pesticides, soil amendments. Add each one to the Approved inputs panel so drift detection has a target to match against.'
  },
  {
    key: 'monitoring_plan',
    prompt: 'How do you verify your practices and prevent fraud? SOE requires supplier verification and fraud-prevention procedures.'
  },
  {
    key: 'recordkeeping_description',
    prompt: 'What records do you keep and for how long? NOP requires 5 years minimum.'
  },
  {
    key: 'commingling_barriers',
    prompt: 'If you run organic + non-organic or share equipment with conventional neighbors, how do you prevent mixing and contamination?'
  },
  {
    key: 'additional_certifier_info',
    prompt: 'Anything specific to your certifier (CCOF, Oregon Tilth, QAI) that does not fit the sections above — land-use history, ICS details for co-ops, pollinator hedgerow plans, etc.'
  }
];

/** Returns the localStorage key for a given OSP draft. Scoped per
 *  company + farm + OSP id so switching between establishments or
 *  version-forking never restores a stale draft onto the wrong record. */
function ospDraftStorageKey(companyId: string, farmId: string, ospId: number): string {
  return `trazo:osp-draft:${companyId}:${farmId}:${ospId}`;
}

/** Resolve a possibly-relative file URL from the backend into something
 *  the browser can actually fetch. DRF's default FileField serialization
 *  returns absolute URLs when the request context is available (the API
 *  path), but defensive: if we get a bare `/media/...` (e.g. server-rendered
 *  link or a cache that stripped context), prefix with the configured API
 *  root. Data URLs and full http(s):// URLs pass through unchanged. */
function resolveBackendFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${config.API_ROOT_URL}${url}`;
  return url;
}

interface OSPDraftPayload {
  sections: OSPSections;
  savedAt: string;
}

const OSPView: React.FC = () => {
  const intl = useIntl();
  const toast = useToast();
  const { farmId } = useParams<{ farmId: string }>();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id;

  const subtextColor = useColorModeValue('gray.600', 'gray.400');
  const emptyBg = useColorModeValue('green.50', 'green.900');
  const submissionBg = useColorModeValue('blue.50', 'blue.900');

  // --- Fetching -----------------------------------------------------------
  // The list endpoint returns OSPSummary[]; we load the newest one's detail
  // in a second round-trip to get the full `sections` blob. That keeps the
  // list call cheap.
  const {
    data: ospSummaries,
    isLoading: listLoading,
    isError: listError
  } = useGetOSPsQuery(
    { companyId: companyId || '', farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );

  // Default focused OSP: the highest-version record. The user can switch to
  // an older version by clicking on the version history row below.
  const newestSummaryId = useMemo(() => {
    if (!ospSummaries || ospSummaries.length === 0) return null;
    return [...ospSummaries].sort((a, b) => b.version_number - a.version_number)[0].id;
  }, [ospSummaries]);

  // User-selected OSP id — null means "use the newest". A separate state
  // so creating/forking a new version correctly focuses it, even if an
  // active version with a lower version_number also exists.
  const [selectedOspId, setSelectedOspId] = useState<number | null>(null);

  const focusedOspId = selectedOspId ?? newestSummaryId;

  // Fetch the detail for the focused OSP. The hook handles caching.
  const {
    data: fetchedOsp,
    isFetching: detailLoading
  } = useGetOSPQuery(
    { companyId: companyId || '', farmId: farmId || '', ospId: focusedOspId ?? 0 },
    { skip: !companyId || !farmId || focusedOspId == null }
  );

  // Per-field editor state. We keep it local so unsaved edits survive between
  // renders; PATCH writes the full `sections` dict per backend validate_sections().
  const [editableOsp, setEditableOsp] = useState<OSP | null>(null);
  const [dirty, setDirty] = useState(false);

  // Track whether this mount already restored (or declined) the localStorage
  // draft for the current OSP id, so we don't re-toast on every re-render.
  const draftRestoredFor = useRef<number | null>(null);

  // Sync editor state with the fetched OSP whenever a new version is loaded.
  // Guarded by `!dirty` so the user's in-progress edits don't get clobbered if
  // the cache refreshes (RTK invalidations, window refocus, etc.).
  //
  // On first sync for this OSP id, check localStorage for an unsaved draft.
  // If one exists AND its content differs from the server's sections, merge
  // it into local state and flip `dirty=true` so the Save button lights up.
  // A toast informs the farmer their work was recovered, with a link to
  // discard and revert to the server copy if the restore is unwanted.
  useEffect(() => {
    if (!fetchedOsp || dirty) return;
    setEditableOsp(fetchedOsp);

    if (
      !companyId ||
      !farmId ||
      draftRestoredFor.current === fetchedOsp.id ||
      typeof window === 'undefined'
    ) {
      return;
    }
    draftRestoredFor.current = fetchedOsp.id;
    try {
      const raw = window.localStorage.getItem(
        ospDraftStorageKey(companyId, farmId, fetchedOsp.id)
      );
      if (!raw) return;
      const payload: OSPDraftPayload = JSON.parse(raw);
      // Only restore if the stored draft is materially different from the
      // server version — otherwise the toast becomes noise.
      const serverJson = JSON.stringify(fetchedOsp.sections || {});
      const draftJson = JSON.stringify(payload.sections || {});
      if (serverJson === draftJson) {
        window.localStorage.removeItem(
          ospDraftStorageKey(companyId, farmId, fetchedOsp.id)
        );
        return;
      }
      setEditableOsp({ ...fetchedOsp, sections: payload.sections });
      setDirty(true);
      toast({
        status: 'info',
        duration: 9000,
        isClosable: true,
        title: intl.formatMessage({ id: 'osp.draft.restored.title' }),
        description: intl.formatMessage(
          { id: 'osp.draft.restored.body' },
          { savedAt: payload.savedAt?.replace('T', ' ').slice(0, 16) || 'recent' }
        )
      });
    } catch (err) {
      // Corrupt payload — discard silently and move on. The farmer keeps
      // editing the server version rather than being blocked by a parse
      // error on something that should be additive only.
      try {
        window.localStorage.removeItem(
          ospDraftStorageKey(companyId, farmId, fetchedOsp.id)
        );
      } catch {
        /* storage quota or disabled — ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedOsp, dirty, companyId, farmId]);

  // Auto-save dirty drafts to localStorage (debounced ~800ms). Closing the
  // tab or a rural-internet hiccup during a 30-minute narrative edit must
  // not destroy the farmer's work. When the save API succeeds, handleSave
  // clears this key so we don't keep showing a stale-restore toast.
  useEffect(() => {
    if (
      !dirty ||
      !editableOsp ||
      !companyId ||
      !farmId ||
      typeof window === 'undefined'
    ) {
      return;
    }
    const handle = window.setTimeout(() => {
      try {
        const payload: OSPDraftPayload = {
          sections: editableOsp.sections,
          savedAt: new Date().toISOString()
        };
        window.localStorage.setItem(
          ospDraftStorageKey(companyId, farmId, editableOsp.id),
          JSON.stringify(payload)
        );
      } catch {
        /* storage quota or private browsing — non-fatal, nothing to do */
      }
    }, 800);
    return () => window.clearTimeout(handle);
  }, [editableOsp, dirty, companyId, farmId]);

  // --- Derived: per-section status (pre-computed above early returns so
  // --- hooks always run in the same order regardless of render state).
  //
  // Backend's `section_completion` field is character-count only. The PDF
  // snapshot applies an additional gate: if the § 205.201(a)(2) approved-
  // inputs registry has entries not referenced in the narrative, (a)(2) is
  // demoted to "incomplete". Mirror that demotion here so the dashboard is
  // never ahead of the PDF — farmer sees the same number the inspector
  // sees. Without this, the page reads "100% complete" while the yellow
  // banner below flags 4 unreferenced entries — contradiction on the face
  // of the document.
  const perSectionStatus = useMemo(() => {
    const map = {} as Record<OSPSectionKey, SectionStatus>;
    const sections = editableOsp?.sections;
    OSP_SECTION_KEYS.forEach((key) => {
      const narrative = sections?.[key]?.narrative || '';
      map[key] = sectionStatus(narrative);
    });
    return map;
  }, [editableOsp?.sections]);

  // --- Mutations ----------------------------------------------------------
  const [createOSP, { isLoading: creating }] = useCreateOSPMutation();
  const [updateOSP, { isLoading: saving }] = useUpdateOSPMutation();
  const [submitOSP, { isLoading: submitting }] = useSubmitOSPMutation();
  const [newVersion, { isLoading: forking }] = useNewOSPVersionMutation();

  // Activation runs inside <OSPActivateModal/> (collects certifier approval
  // evidence via multipart upload). Kept as boolean state so the button can be
  // the sole trigger and Close / Escape reset the form.
  const [activateModalOpen, setActivateModalOpen] = useState(false);

  const handleCreate = async () => {
    if (!companyId || !farmId) return;
    try {
      const osp = await createOSP({
        companyId,
        farmId,
        data: { sections: emptySections() }
      }).unwrap();
      setSelectedOspId(osp.id);
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.action.create' }),
        description: `v${osp.version_number} draft created.`,
        duration: 3000
      });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.error.create' }),
        description: String(err?.data || err)
      });
    }
  };

  const handleSave = async () => {
    if (!companyId || !farmId || !editableOsp) return;
    try {
      const fresh = await updateOSP({
        companyId,
        farmId,
        ospId: editableOsp.id,
        data: { sections: editableOsp.sections }
      }).unwrap();
      setEditableOsp(fresh);
      setDirty(false);
      // Server copy is now authoritative — drop the localStorage shadow so
      // we don't re-offer a restore on the next page load.
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(
            ospDraftStorageKey(companyId, farmId, editableOsp.id)
          );
        } catch {
          /* ignore */
        }
      }
      toast({ status: 'success', title: intl.formatMessage({ id: 'osp.action.save' }) });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.error.save' }),
        description: String(err?.data || err)
      });
    }
  };

  const handleSubmit = async () => {
    if (!companyId || !farmId || !editableOsp) return;
    if (dirty) {
      toast({
        status: 'warning',
        title: intl.formatMessage({ id: 'osp.unsavedChanges.title' }),
        description: intl.formatMessage({ id: 'osp.unsavedChanges.submit' })
      });
      return;
    }
    try {
      const fresh = await submitOSP({
        companyId,
        farmId,
        ospId: editableOsp.id
      }).unwrap();
      setEditableOsp(fresh);
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.action.submit' }),
        description: intl.formatMessage({ id: 'osp.action.submitHint' }),
        duration: 10000,
        isClosable: true
      });
    } catch (err: any) {
      // Backend returns { error, missing_sections, detail } for incomplete OSPs.
      // Translate the machine keys into section labels for the farmer.
      const payload = err?.data ?? err;
      const missing: OSPSectionKey[] | undefined = payload?.missing_sections;
      if (missing && missing.length > 0) {
        const labels = missing
          .map((k) => intl.formatMessage({ id: `osp.section.${k}` }))
          .join(', ');
        toast({
          status: 'error',
          title: intl.formatMessage({ id: 'osp.error.submit' }),
          description: `${payload.detail || ''}\n${labels}`.trim(),
          duration: 8000
        });
      } else {
        toast({
          status: 'error',
          title: intl.formatMessage({ id: 'osp.error.submit' }),
          description: String(payload?.error || payload?.detail || err)
        });
      }
    }
  };

  const openActivateModal = () => {
    if (!companyId || !farmId || !editableOsp) return;
    if (dirty) {
      // Save-first guard: the modal doesn't persist section edits, so if we
      // let the user through they'd lose in-progress narrative edits on
      // activate (server response refreshes local state).
      toast({
        status: 'warning',
        title: intl.formatMessage({ id: 'osp.unsavedChanges.title' }),
        description: intl.formatMessage({ id: 'osp.unsavedChanges.activate' })
      });
      return;
    }
    setActivateModalOpen(true);
  };

  const handleNewVersion = async () => {
    if (!companyId || !farmId || !editableOsp) return;
    try {
      const fresh = await newVersion({
        companyId,
        farmId,
        ospId: editableOsp.id
      }).unwrap();
      // Focus the new draft explicitly — the prior active OSP still exists and
      // would otherwise win the default "newest" selection.
      setSelectedOspId(fresh.id);
      setEditableOsp(fresh);
      setDirty(false);
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.action.newVersion' }),
        description: `v${fresh.version_number} draft created.`
      });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.error.newVersion' }),
        description: String(err?.data || err)
      });
    }
  };

  // --- Render -------------------------------------------------------------
  if (listLoading) return <StandardPageLoading />;

  // Error state: list fetch failed. Without it, we'd spin forever on "Detail pending".
  if (listError) {
    return (
      <StandardPage title={intl.formatMessage({ id: 'osp.title' })}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">{intl.formatMessage({ id: 'osp.error.load' })}</Text>
        </Alert>
      </StandardPage>
    );
  }

  // Empty state: no OSPs yet.
  //
  // First-time farmers hit this view cold. A bare "Create OSP" button with
  // no context causes two failure modes: (1) they write 50-word placeholder
  // sections, hit Submit, get a 400 "must be ≥ 400 chars" error, and bail;
  // (2) they skip the OSP entirely and log events, then get drift findings
  // they don't understand. Cheat-sheet below gives each § 205.201(a)
  // section a starter prompt in farmer-first language so the path from
  // "empty" to "substantively filled" is obvious on Day 1.
  if (!ospSummaries || ospSummaries.length === 0) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'osp.title' })}
        description={intl.formatMessage({ id: 'osp.subtitle' })}
      >
        <StandardCard>
          <VStack spacing={4} py={8} px={4} bg={emptyBg} borderRadius="md">
            <Icon as={FaLeaf} boxSize={10} color="green.500" />
            <Text fontWeight="bold" fontSize="lg" textAlign="center">
              {intl.formatMessage({ id: 'osp.none' })}
            </Text>
            <Text fontSize="sm" color={subtextColor} textAlign="center" maxW="2xl">
              {intl.formatMessage({ id: 'osp.empty.whatIsIt' })}
            </Text>
            <StandardButton
              leftIcon={<FaPlus />}
              colorScheme="green"
              onClick={handleCreate}
              isLoading={creating}
            >
              {intl.formatMessage({ id: 'osp.action.create' })}
            </StandardButton>
          </VStack>

          <Divider my={4} />

          <VStack align="stretch" spacing={3} px={1} py={2}>
            <Text fontWeight="semibold" fontSize="sm">
              {intl.formatMessage({ id: 'osp.empty.sixSections' })}
            </Text>
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.empty.lengthHint' }, { floor: OSP_MATERIAL_FLOOR })}
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={1}>
              {SECTION_PROMPTS.map(({ key, prompt }) => (
                <Box
                  key={key}
                  p={3}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                >
                  <HStack mb={1} spacing={2}>
                    <Text fontWeight="semibold" fontSize="xs">
                      {intl.formatMessage({ id: `osp.section.${key}` })}
                    </Text>
                    <Text fontSize="xs" color={subtextColor}>
                      {intl.formatMessage({ id: `osp.section.cfr.${key}` })}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color={subtextColor}>
                    {prompt}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </StandardCard>
      </StandardPage>
    );
  }

  // Detail pending (summaries loaded but detail not yet).
  if (!editableOsp) {
    return (
      <StandardPage title={intl.formatMessage({ id: 'osp.title' })}>
        <Flex justify="center" py={10}>
          {detailLoading ? (
            <Spinner />
          ) : (
            <Text>{intl.formatMessage({ id: 'osp.detail.noDetail' })}</Text>
          )}
        </Flex>
      </StandardPage>
    );
  }

  // --- Completion % — with Registry Sync gate ------------------------------
  // `perSectionStatus` was computed above the early-return guards (Rules
  // of Hooks — useMemo must run on every render). Use it here to compute
  // the gated completion count.
  const registrySyncHasWarning = !!editableOsp.registry_sync_diff?.has_warning;
  const unreferencedCount =
    editableOsp.registry_sync_diff?.entries_not_in_narrative?.length || 0;

  const completeSectionCount = OSP_SECTION_KEYS.reduce((acc, key) => {
    const isMaterialComplete = perSectionStatus[key].tier === 'complete';
    // Registry Sync gate: (a)(2) does not count as complete if approved
    // inputs aren't referenced in the narrative, even if character count
    // would otherwise pass. Matches `audit_export_service.py` Wave 6 fix.
    if (key === 'inputs_list' && isMaterialComplete && registrySyncHasWarning) {
      return acc;
    }
    return acc + (isMaterialComplete ? 1 : 0);
  }, 0);
  const completionPct = Math.round(
    (completeSectionCount / OSP_SECTION_KEYS.length) * 100
  );
  const statusColor = STATUS_COLOR[editableOsp.status] || 'gray';
  const submissionPdfUrl = resolveBackendFileUrl(editableOsp.submission_pdf);

  const updateSection = (key: OSPSectionKey, narrative: string) => {
    setEditableOsp((prev) => {
      if (!prev) return prev;
      const nextSections: OSPSections = {
        ...prev.sections,
        [key]: {
          narrative,
          last_updated: new Date().toISOString().slice(0, 10)
        }
      };
      return { ...prev, sections: nextSections };
    });
    setDirty(true);
  };

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'osp.title' })}
      description={intl.formatMessage({ id: 'osp.subtitle' })}
    >
      {/* Header card — status + progress + actions */}
      <StandardCard mb={4}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <HStack spacing={3}>
              <Icon as={FaFileAlt} color="green.600" />
              <Text fontWeight="bold" fontSize="lg">
                {intl.formatMessage({ id: 'osp.version' })} {editableOsp.version_number}
              </Text>
              <Badge colorScheme={statusColor}>
                {intl.formatMessage({ id: `osp.status.${editableOsp.status}` })}
              </Badge>
            </HStack>
            <HStack spacing={2} flexWrap="wrap">
              <StandardButton
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={saving}
                isDisabled={!dirty}
              >
                {intl.formatMessage({ id: 'osp.action.save' })}
              </StandardButton>
              {editableOsp.status === 'draft' && (
                <StandardButton
                  variant="secondary"
                  size="sm"
                  onClick={handleSubmit}
                  isLoading={submitting}
                >
                  {intl.formatMessage({ id: 'osp.action.submit' })}
                </StandardButton>
              )}
              {editableOsp.status === 'submitted' && (
                <StandardButton
                  variant="secondary"
                  size="sm"
                  onClick={openActivateModal}
                >
                  {intl.formatMessage({ id: 'osp.action.activate' })}
                </StandardButton>
              )}
              {editableOsp.status === 'active' && (
                <StandardButton
                  variant="secondary"
                  size="sm"
                  onClick={handleNewVersion}
                  isLoading={forking}
                >
                  {intl.formatMessage({ id: 'osp.action.newVersion' })}
                </StandardButton>
              )}
            </HStack>
          </HStack>

          <Box>
            <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
              <HStack spacing={2}>
                <Text fontSize="xs" color={subtextColor}>
                  {intl.formatMessage(
                    { id: 'osp.completion.sectionsOfTotal' },
                    {
                      complete: completeSectionCount,
                      total: OSP_SECTION_KEYS.length,
                      pct: completionPct
                    }
                  )}
                </Text>
                {registrySyncHasWarning && (
                  <Tooltip
                    hasArrow
                    placement="top"
                    fontSize="xs"
                    label={intl.formatMessage(
                      { id: 'osp.completion.registryGapTooltip' },
                      { count: unreferencedCount }
                    )}
                  >
                    <Badge
                      colorScheme="orange"
                      variant="subtle"
                      fontSize="xs"
                      textTransform="none"
                      cursor="help"
                    >
                      <HStack spacing={1}>
                        <Icon as={FaExclamationTriangle} boxSize={2.5} />
                        <Text as="span">
                          {intl.formatMessage({ id: 'osp.completion.registryGap' })}
                        </Text>
                      </HStack>
                    </Badge>
                  </Tooltip>
                )}
              </HStack>
              {editableOsp.effective_date && (
                <Text fontSize="xs" color={subtextColor}>
                  {intl.formatMessage({ id: 'osp.effectiveDate' })}: {editableOsp.effective_date}
                </Text>
              )}
            </HStack>
            <Progress value={completionPct} colorScheme="green" size="xs" borderRadius="full" />
          </Box>

          {/* P0-4 — Farmer-facing download for the snapshot PDF generated at
              submit-time. Without this, the success toast says "PDF ready"
              with no way to retrieve it, so the farmer emails support. The
              snapshot IS what the certifier portal expects; exposing it
              here closes the submit → certifier upload loop. */}
          {submissionPdfUrl && (
            <HStack
              spacing={3}
              p={2}
              borderWidth="1px"
              borderColor="blue.200"
              borderRadius="md"
              bg={submissionBg}
              flexWrap="wrap"
            >
              <Icon as={FaFileAlt} color="blue.600" />
              <VStack align="start" spacing={0} flex={1} minW="180px">
                <Text fontSize="sm" fontWeight="semibold">
                  {intl.formatMessage({ id: 'osp.submissionPdf.title' })}
                </Text>
                <Text fontSize="xs" color={subtextColor}>
                  {intl.formatMessage({ id: 'osp.submissionPdf.hint' })}
                </Text>
              </VStack>
              <ChakraLink
                href={submissionPdfUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                _hover={{ textDecoration: 'none' }}
              >
                <StandardButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<FaDownload />}
                >
                  {intl.formatMessage({ id: 'osp.submissionPdf.download' })}
                </StandardButton>
              </ChakraLink>
            </HStack>
          )}
        </VStack>
      </StandardCard>

      {/* Section editor — Accordion over 6 required sections.
          Badge is 3-tier (Empty / Brief / Complete) with live char count so
          a farmer sees the 400-char floor before they try to submit, not
          after the backend rejects the payload. (a)(2) gets an extra
          "registry gap" indicator when approved inputs aren't referenced
          in the narrative — matches the PDF's demotion logic. */}
      <StandardCard>
        <Accordion allowMultiple defaultIndex={[0]}>
          {OSP_SECTION_KEYS.map((key) => {
            const section = editableOsp.sections[key] || { narrative: '', last_updated: null };
            const status = perSectionStatus[key];
            const showRegistryGap = key === 'inputs_list' && registrySyncHasWarning;
            const iconAs = status.tier === 'complete' ? FaCheckCircle : FaRegCircle;
            const iconColor =
              status.tier === 'complete'
                ? 'green.500'
                : status.tier === 'brief'
                ? 'orange.400'
                : 'gray.400';
            return (
              <AccordionItem key={key} borderTopWidth="0px" borderBottomWidth="1px">
                <AccordionButton py={3}>
                  <Flex
                    flex={1}
                    align="center"
                    justify="space-between"
                    textAlign="left"
                    flexWrap="wrap"
                    gap={2}
                  >
                    <HStack spacing={2}>
                      <Icon as={iconAs} color={iconColor} />
                      <Stack spacing={0}>
                        <Text fontWeight="semibold" fontSize="sm">
                          {intl.formatMessage({ id: `osp.section.${key}` })}
                        </Text>
                        <Text fontSize="xs" color={subtextColor}>
                          {intl.formatMessage({ id: `osp.section.cfr.${key}` })}
                          {section.last_updated ? ` · ${section.last_updated}` : ''}
                        </Text>
                      </Stack>
                    </HStack>
                    <HStack spacing={1} flexWrap="wrap" justify="flex-end">
                      {showRegistryGap && (
                        <Tooltip
                          hasArrow
                          placement="top"
                          fontSize="xs"
                          label={intl.formatMessage(
                            { id: 'osp.completion.registryGapTooltip' },
                            { count: unreferencedCount }
                          )}
                        >
                          <Badge
                            colorScheme="orange"
                            variant="subtle"
                            fontSize="xs"
                            textTransform="none"
                            cursor="help"
                          >
                            <HStack spacing={1}>
                              <Icon as={FaExclamationTriangle} boxSize={2.5} />
                              <Text as="span">
                                {intl.formatMessage({ id: 'osp.completion.registryGap' })}
                              </Text>
                            </HStack>
                          </Badge>
                        </Tooltip>
                      )}
                      <Badge
                        colorScheme={status.badgeColor}
                        variant="subtle"
                        fontSize="xs"
                        textTransform="none"
                      >
                        {intl.formatMessage(
                          { id: `osp.section.status.${status.tier}` },
                          { chars: status.charCount, floor: OSP_MATERIAL_FLOOR }
                        )}
                      </Badge>
                    </HStack>
                  </Flex>
                  <AccordionIcon ml={2} />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Textarea
                    value={section.narrative}
                    onChange={(e) => updateSection(key, e.target.value)}
                    placeholder={intl.formatMessage({ id: 'osp.section.narrative' })}
                    rows={8}
                    resize="vertical"
                  />
                  {status.tier === 'brief' && (
                    <Text fontSize="xs" color="orange.600" mt={2}>
                      {intl.formatMessage(
                        { id: 'osp.section.briefHint' },
                        { chars: status.charCount, floor: OSP_MATERIAL_FLOOR }
                      )}
                    </Text>
                  )}
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      </StandardCard>

      {/* Approved inputs panel — drives the drift detector (Sprint 5.1). */}
      {companyId && farmId && (
        <OSPApprovedInputsPanel
          companyId={companyId}
          farmId={farmId}
          osp={editableOsp}
        />
      )}

      {/* Version history — prior versions. */}
      {ospSummaries && ospSummaries.length > 1 && (
        <StandardCard mt={4}>
          <Text fontWeight="bold" mb={3} fontSize="sm">
            {intl.formatMessage({ id: 'osp.version' })}s
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
            {ospSummaries.map((s) => {
              const isSelected = s.id === editableOsp.id;
              return (
                <HStack
                  key={s.id}
                  as="button"
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  justify="space-between"
                  borderColor={isSelected ? 'green.300' : 'gray.200'}
                  bg={isSelected ? 'green.50' : 'transparent'}
                  _hover={{ bg: isSelected ? 'green.50' : 'gray.50' }}
                  cursor="pointer"
                  onClick={() => {
                    if (dirty) {
                      toast({
                        status: 'warning',
                        title: intl.formatMessage({ id: 'osp.unsavedChanges.title' }),
                        description: intl.formatMessage({ id: 'osp.unsavedChanges.switch' })
                      });
                      return;
                    }
                    setSelectedOspId(s.id);
                  }}
                  aria-pressed={isSelected}
                >
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="semibold">
                      v{s.version_number}
                    </Text>
                    <Text fontSize="xs" color={subtextColor}>
                      {s.effective_date || s.created_at.slice(0, 10)}
                    </Text>
                  </VStack>
                  <Badge colorScheme={STATUS_COLOR[s.status]} variant="subtle">
                    {intl.formatMessage({ id: `osp.status.${s.status}` })}
                  </Badge>
                </HStack>
              );
            })}
          </SimpleGrid>
        </StandardCard>
      )}

      {editableOsp.status === 'submitted' && companyId && farmId && (
        <OSPActivateModal
          isOpen={activateModalOpen}
          onClose={() => setActivateModalOpen(false)}
          companyId={companyId}
          farmId={farmId}
          osp={editableOsp}
          onActivated={(fresh) => setEditableOsp(fresh)}
        />
      )}
    </StandardPage>
  );
};

export default OSPView;
