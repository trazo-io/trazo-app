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
  FaHistory,
  FaLeaf,
  FaPlus,
  FaRegCircle
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { config } from 'config/environment';
import {
  StandardAlert,
  StandardButton,
  StandardCard,
  StandardPage,
  StandardPageLoading,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  useCreateOSPMutation,
  useGetOSPQuery,
  useGetOSPsQuery,
  useSubmitOSPMutation,
  useUpdateOSPMutation
} from 'store/api/ospApi';
import {
  OSP,
  OSP_SECTION_KEYS,
  OSPSectionKey,
  OSPSections,
  OSPStatus,
  emptySections
} from 'types/osp';
import OSPActivateModal from './OSPActivateModal';
import { StartNewVersionButton } from './OSPLockedNotice';
import OSPApprovedInputsPanel from './OSPApprovedInputsPanel';
import OSPChangeNotificationsPanel from './OSPChangeNotificationsPanel';
import OSPPlanReviewPanel from './OSPPlanReviewPanel';
import StateOrganicRegistrationCard, {
  STATE_ORGANIC_PROGRAMS
} from './StateOrganicRegistrationCard';
import OSPAnnualUpdateCard from './OSPAnnualUpdateCard';
import { selectPlanOnFile } from './selectPlanOnFile';
import { selectWorkingOsp } from './selectWorkingOsp';
import { useFarm, useFarmState } from 'hooks/useMeasurementSystem';
import { todayLocalISODate } from 'utils/dateOnly';

interface RootState {
  company: {
    currentCompany: { id: string } | null;
  };
}

/*
 * Status -> badge PROPS, not a bare colorScheme, because the two tiers this needs are not
 * both reachable through colorScheme.
 *
 * ⚠️ No `blue`. Blue carries no meaning in this palette — it survives in exactly one place
 * app-wide, Chakra's `Alert status="info"` — so a blue status badge is decoration wearing the
 * authority of a state. `submitted` means "in flight, waiting on the certifier", which the
 * design rules map to the warning tier.
 *
 * ⚠️ And NOT `colorScheme="amber"` for that tier. The theme's amber scale tops out at
 * #E65100, so the brand variant's tint pairing (amber.800 on amber.100) measures **2.66:1** —
 * an unreadable pill. `variant="warning"` is the readable one at 7.62:1. Same reason
 * `withdrawn` uses `variant="danger"` rather than colorScheme red.
 */
type StatusBadgeProps = { colorScheme?: string; variant?: string };

const STATUS_BADGE: Record<OSPStatus, StatusBadgeProps> = {
  draft: { colorScheme: 'gray' },
  submitted: { variant: 'warning' },
  active: { colorScheme: 'green' },
  superseded: { colorScheme: 'gray' },
  withdrawn: { variant: 'danger' }
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

/**
 * Mirror of `looks_like_padding` in `trazo-back/history/services/
 * audit_export_service.py`. MUST stay in sync with it — when it drifted, this
 * page showed "Complete — 602 chars" and 83% for an OSP whose audit dossier
 * simultaneously read "0% substantively filled / DO NOT SUBMIT". Two surfaces
 * measuring the same thing differently is worse than either bar alone.
 *
 * Only applied above MIN_TOKENS, so a genuinely terse answer is never judged
 * by lexical diversity. Does NOT catch a single run of keyboard noise.
 */
const PADDING_MIN_TOKENS = 12;
const PADDING_MAX_DOMINANT_SHARE = 0.35;
const PADDING_MIN_UNIQUE_RATIO = 0.35;

function looksLikePadding(text: string): boolean {
  if (!text) return false;
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (tokens.length < PADDING_MIN_TOKENS) return false;
  const counts = new Map<string, number>();
  tokens.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
  const uniqueRatio = counts.size / tokens.length;
  const dominantShare = Math.max(...counts.values()) / tokens.length;
  return uniqueRatio < PADDING_MIN_UNIQUE_RATIO || dominantShare > PADDING_MAX_DOMINANT_SHARE;
}

type SectionTier = 'empty' | 'brief' | 'padded' | 'complete';

interface SectionStatus {
  tier: SectionTier;
  label: string;
  badgeColor: string;
  charCount: number;
}

/**
 * Four-tier status for a § 205.201(a) narrative, matching the backend's
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
  if (looksLikePadding(trimmed)) {
    return { tier: 'padded', label: 'padded', badgeColor: 'red', charCount };
  }
  return { tier: 'complete', label: 'complete', badgeColor: 'green', charCount };
}

/**
 * Day-1 cheat sheet for the six § 205.201(a) sections.
 *
 * ⛔ `promptId`, not a literal. This array is module scope, so it cannot call `intl` itself —
 * exactly the shape that left six English paragraphs on a Spanish screen while every other
 * string on the page was translated. The order is the ORDER OF THE REGULATION, and the
 * per-card citation is rendered from `osp.section.cfr.<key>`, so the two cannot drift.
 *
 * ⚠️ VERIFIED 2026-08-25 against the current § 205.201 (65 FR 80637, as amended by the SOE
 * rule at 88 FR 3622, 19 Jan 2023): paragraph (a) still has exactly SIX numbered items, and
 * this key→subparagraph mapping is correct. SOE amended (a)(3) itself — it now also requires
 * a description of how the operation verifies suppliers and the organic status of what it
 * receives, and prevents organic fraud — which is why that prompt names it.
 *
 * ⛔ ICS is NOT an (a)(6) topic. A producer group's internal control system is § 205.201(c),
 * its own paragraph with ten enumerated requirements — not "additional information deemed
 * necessary by the certifying agent". This prompt used to offer "ICS details for co-ops" as
 * an (a)(6) example; that pointed a co-op at the wrong paragraph. See
 * `osp.empty.producerGroupNote` under the grid.
 */
const SECTION_PROMPTS: Array<{ key: OSPSectionKey; promptId: string }> = [
  { key: 'practices_procedures', promptId: 'osp.empty.prompt.practices_procedures' },
  { key: 'inputs_list', promptId: 'osp.empty.prompt.inputs_list' },
  { key: 'monitoring_plan', promptId: 'osp.empty.prompt.monitoring_plan' },
  { key: 'recordkeeping_description', promptId: 'osp.empty.prompt.recordkeeping_description' },
  { key: 'commingling_barriers', promptId: 'osp.empty.prompt.commingling_barriers' },
  { key: 'additional_certifier_info', promptId: 'osp.empty.prompt.additional_certifier_info' }
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
  const navigate = useNavigate();
  // Drill-down page: reached from the OSP module list, never from the sidebar, so it owes a
  // Back button (page-layout standard). Same target and same StandardPage affordance the
  // module wizard uses. Unsaved narrative text survives the exit — the draft autosaves to
  // localStorage on every keystroke and is restored on return.
  const backToModules = () => navigate(`/admin/dashboard/farm/${farmId}/osp`);
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id;
  const farmState = useFarmState(farmId);
  const farm = useFarm(farmId);

  /**
   * The farm's own parcel record, in acres, shown while the farmer writes.
   *
   * A § 205.201(a) narrative is prose describing an operation, and nothing can
   * verify prose against records — that is what the inspection is for. But the
   * farmer was writing it with no sight of their own acreage, from memory. When
   * I wrote this demo farm's OSP I said "60 acres" against parcels totalling
   * 148; a certifier reading the dossier would have asked about the other 88.
   *
   * So: put the record next to the writing rather than parse the writing
   * afterward. `Parcel.area` is stored in hectares (see its help_text); the
   * producer-facing unit is acres everywhere else, so convert here.
   */
  const parcelSummary = useMemo(() => {
    const parcels: any[] = Array.isArray(farm?.parcels) ? farm.parcels : [];
    const withArea = parcels
      .map((p) => ({ name: p?.name as string, acres: Number(p?.area || 0) * 2.47105 }))
      .filter((p) => p.name && p.acres > 0);
    if (withArea.length === 0) return null;
    return {
      parcels: withArea,
      totalAcres: withArea.reduce((sum, p) => sum + p.acres, 0)
    };
  }, [farm]);

  const subtextColor = useColorModeValue('gray.600', 'gray.400');
  const emptyBg = useColorModeValue('green.50', 'green.900');
  const lockedBg = useColorModeValue('gray.50', 'gray.700');

  // --- Fetching -----------------------------------------------------------
  // The list endpoint returns OSPSummary[]; we load the newest one's detail
  // in a second round-trip to get the full `sections` blob. That keeps the
  // list call cheap.
  const {
    data: ospSummaries,
    isLoading: listLoading,
    isUninitialized: listUninitialized,
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

  // The § 205.406 filing continues the plan the CERTIFIER holds, which is not the version the
  // page is focused on. Focus defaults to the newest version — the working draft — and the
  // annual update card used to post exactly that as `prior_osp`, recording "the changes to
  // v4" against a plan the agent has never seen. The fallback to the working plan is for an
  // operation that has never taken one out of draft, and mirrors the server: a draft
  // `prior_osp` is refused only when a non-draft version exists to file against.
  const annualUpdateTarget = useMemo(() => {
    const onFile = selectPlanOnFile(ospSummaries);
    return onFile ?? selectWorkingOsp(ospSummaries) ?? null;
  }, [ospSummaries]);

  // The draft the filing will be recorded as producing, when the operator has already started
  // the next version. Server-side, `link_filing_to_open_draft` writes that link on save.
  const annualUpdateProducesDraft = useMemo(() => {
    const working = selectWorkingOsp(ospSummaries);
    if (!working || working.status !== 'draft') return null;
    return working.id === annualUpdateTarget?.id ? null : working;
  }, [ospSummaries, annualUpdateTarget]);

  // Fetch the detail for the focused OSP. The hook handles caching.
  const { data: fetchedOsp, isFetching: detailLoading } = useGetOSPQuery(
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
      const raw = window.localStorage.getItem(ospDraftStorageKey(companyId, farmId, fetchedOsp.id));
      if (!raw) return;
      const payload: OSPDraftPayload = JSON.parse(raw);
      // Only restore if the stored draft is materially different from the
      // server version — otherwise the toast becomes noise.
      const serverJson = JSON.stringify(fetchedOsp.sections || {});
      const draftJson = JSON.stringify(payload.sections || {});
      if (serverJson === draftJson) {
        window.localStorage.removeItem(ospDraftStorageKey(companyId, farmId, fetchedOsp.id));
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
        window.localStorage.removeItem(ospDraftStorageKey(companyId, farmId, fetchedOsp.id));
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
    if (!dirty || !editableOsp || !companyId || !farmId || typeof window === 'undefined') {
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
  // Forking lives in <StartNewVersionButton/> — the shared control the guided module
  // pages use, so all three surfaces get the same label, the same confirmation and the
  // same translated toast.

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
          window.localStorage.removeItem(ospDraftStorageKey(companyId, farmId, editableOsp.id));
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

  // --- Render -------------------------------------------------------------
  //
  // `listUninitialized` is not decoration. `companyId` is `currentCompany?.id`, hydrated into
  // Redux asynchronously, so on a cold load this query is SKIPPED — and a skipped RTK Query
  // reports `isLoading: false` with `data: undefined`. Without this term the first two guards
  // both fall through and the EMPTY STATE below renders: a farm with a submitted Organic
  // System Plan is shown the first-time "you have no OSP, create one" page, which is both a
  // false compliance claim and an invitation to file a duplicate plan. OSPModuleWizard
  // already defends against exactly this (its `ospsResolved`, and the note there about a
  // second click creating a second plan); this view never got the same treatment.
  if (listLoading || listUninitialized) return <StandardPageLoading />;

  // Error state: list fetch failed. Without it, we'd spin forever on "Detail pending".
  if (listError) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'osp.title' })}
        showBackButton
        onBack={backToModules}>
        <StandardAlert
          status="error"
          mb={0}
          description={intl.formatMessage({ id: 'osp.error.load' })}
        />
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
        showBackButton
        onBack={backToModules}>
        <StandardCard>
          <VStack spacing={4} py={8} px={4} bg={emptyBg} borderRadius="md">
            <Icon as={FaLeaf} boxSize={10} color="green.700" />
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
              isLoading={creating}>
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
              {SECTION_PROMPTS.map(({ key, promptId }) => (
                <Box key={key} p={3} borderWidth="1px" borderColor="gray.200" borderRadius="md">
                  <HStack mb={1} spacing={2}>
                    <Text fontWeight="semibold" fontSize="xs">
                      {intl.formatMessage({ id: `osp.section.${key}` })}
                    </Text>
                    <Text fontSize="xs" color={subtextColor}>
                      {intl.formatMessage({ id: `osp.section.cfr.${key}` })}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color={subtextColor}>
                    {intl.formatMessage({ id: promptId })}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>

            {/*
              § 205.201 does not stop at (a). (b) allows substituting an equivalent plan filed
              under another regulatory program, and (c) requires a producer group to describe
              its internal control system in ten enumerated parts. "Six required sections" is
              true of (a) and only of (a) — this line keeps the page from reading as though
              those six are the whole of § 205.201.
            */}
            <Text fontSize="xs" color={subtextColor} pt={1}>
              {intl.formatMessage({ id: 'osp.empty.producerGroupNote' })}
            </Text>
          </VStack>
        </StandardCard>
      </StandardPage>
    );
  }

  // Detail pending (summaries loaded but detail not yet).
  if (!editableOsp) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'osp.title' })}
        showBackButton
        onBack={backToModules}>
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
  const unreferencedCount = editableOsp.registry_sync_diff?.entries_not_in_narrative?.length || 0;

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
  const completionPct = Math.round((completeSectionCount / OSP_SECTION_KEYS.length) * 100);
  // Mirrors `OrganicSystemPlanViewSet.perform_update` — only a draft accepts edits.
  const isEditable = editableOsp.status === 'draft';
  const statusBadgeProps = STATUS_BADGE[editableOsp.status] ?? { colorScheme: 'gray' };
  const submissionPdfUrl = resolveBackendFileUrl(editableOsp.submission_pdf);

  const updateSection = (key: OSPSectionKey, narrative: string) => {
    setEditableOsp((prev) => {
      if (!prev) return prev;
      const nextSections: OSPSections = {
        ...prev.sections,
        [key]: {
          narrative,
          // `toISOString().slice(0, 10)` is the UTC date, not the farmer's. A
          // grower east of UTC editing before 09:00, or one west of UTC editing
          // after 17:00, stamped the section with a date they were not working
          // on — and § 205.201(a) section dates are what an inspector reads to
          // establish when the plan was last reviewed.
          last_updated: todayLocalISODate()
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
      showBackButton
      onBack={backToModules}>
      {/* Header card — status + progress + actions */}
      <StandardCard
        mb={4}
        titleIcon={<Icon as={FaFileAlt} color="green.700" />}
        title={`${intl.formatMessage({ id: 'osp.version' })} ${editableOsp.version_number}`}
        // The status badge belongs ON the title row, where it was before this card moved to the
        // component's header slots — pulling the title out left the badge stranded on a line of
        // its own inside the body, reading as content rather than as the plan's state. Same slot
        // the CDFA and Annual cards use for theirs.
        headerAction={
          <Badge {...statusBadgeProps}>
            {intl.formatMessage({ id: `osp.status.${editableOsp.status}` })}
          </Badge>
        }>
        <VStack align="stretch" spacing={3}>
          <HStack justify="flex-end" flexWrap="wrap" gap={2}>
            <HStack spacing={2} flexWrap="wrap">
              {/* Save only exists while the OSP is a draft. The backend's
                  perform_update rejects any edit once the OSP leaves 'draft'
                  (it is an attested record — 21 CFR Part 11 trustworthy-records
                  principle), but this button stayed live and the six narratives
                  stayed editable, so a farmer could retype a whole section on a
                  submitted plan and collect a 400 on Save. The approved-inputs
                  panel already locked itself with an explanation; the narratives
                  did not. */}
              {isEditable && (
                <StandardButton
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  isLoading={saving}
                  isDisabled={!dirty}>
                  {intl.formatMessage({ id: 'osp.action.save' })}
                </StandardButton>
              )}
              {editableOsp.status === 'draft' && (
                <StandardButton
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  isLoading={submitting}>
                  {intl.formatMessage({ id: 'osp.action.submit' })}
                </StandardButton>
              )}
              {editableOsp.status === 'submitted' && (
                <StandardButton variant="primary" size="sm" onClick={openActivateModal}>
                  {intl.formatMessage({ id: 'osp.action.activate' })}
                </StandardButton>
              )}
              {/* Submitted too: a farmer who spots a mistake after submitting
                  starts the corrected next version (backend allows any status).

                  Shared with the guided module pages. It used to be this page's own
                  button, its own label and its own un-confirmed handler — three
                  surfaces offering the same action three different ways, and this one
                  toasted a hardcoded English "v3 draft created." straight past the
                  catalogs. `onForked` carries this page's explicit selection model,
                  which is the one thing the guided pages do not need. */}
              {(editableOsp.status === 'active' || editableOsp.status === 'submitted') && (
                <StartNewVersionButton
                  osp={editableOsp}
                  companyId={String(companyId ?? '')}
                  farmId={farmId || ''}
                  variant="outline"
                  onForked={(fresh) => {
                    // The prior plan still exists and would otherwise win the default
                    // "newest" selection, so focus the new draft explicitly.
                    setSelectedOspId(fresh.id);
                    setEditableOsp(fresh);
                    setDirty(false);
                  }}
                />
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
                    )}>
                    <Badge variant="warning" fontSize="xs" textTransform="none" cursor="help">
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
            /*
             * Neutral, not blue. Blue carries no meaning in this palette outside Chakra's
             * `Alert status="info"`, and this block cannot BE an alert — it holds an action
             * (the download button), and a solid control inside an alert is its own
             * anti-pattern. So it is simply a card: gray border, gray inset, and the green
             * outline button carries the affordance.
             */
            <HStack
              spacing={3}
              p={2}
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              bg="gray.50"
              flexWrap="wrap">
              <Icon as={FaFileAlt} color="gray.600" />
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
                _hover={{ textDecoration: 'none' }}>
                <StandardButton variant="outline" size="sm" leftIcon={<FaDownload />}>
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
        {!isEditable && (
          <StandardAlert
            status="info"
            mb={3}
            description={intl.formatMessage({ id: 'osp.sectionsLocked' })}
          />
        )}
        {parcelSummary && (
          <Box
            mb={3}
            p={2}
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            bg={lockedBg}>
            <Text fontSize="xs" color={subtextColor}>
              <b>
                {intl.formatMessage(
                  { id: 'osp.parcelReference' },
                  {
                    count: parcelSummary.parcels.length,
                    acres: parcelSummary.totalAcres.toFixed(1)
                  }
                )}
              </b>{' '}
              {parcelSummary.parcels.map((p) => `${p.name} ${p.acres.toFixed(1)}`).join(' · ')}
            </Text>
            <Text fontSize="xs" color={subtextColor} mt={1}>
              {intl.formatMessage({ id: 'osp.parcelReferenceHelp' })}
            </Text>
          </Box>
        )}
        <Accordion allowMultiple defaultIndex={[0]}>
          {OSP_SECTION_KEYS.map((key) => {
            const section = editableOsp.sections[key] || { narrative: '', last_updated: null };
            const status = perSectionStatus[key];
            const showRegistryGap = key === 'inputs_list' && registrySyncHasWarning;
            const iconAs = status.tier === 'complete' ? FaCheckCircle : FaRegCircle;
            // MEASURED on white, WCAG 1.4.11 non-text floor is 3.0:
            //   green.500 2.78 ✗ -> green.700 5.13 ✓
            //   gray.400  2.68 ✗ -> gray.500  4.61 ✓
            // `orange.*` is not in this theme at all (it defines amber), so it silently
            // resolved to CHAKRA's orange — a foreign accent beside Trazo's own ramp.
            const iconColor =
              status.tier === 'complete'
                ? 'green.700'
                : status.tier === 'brief'
                ? 'amber.900'
                : 'gray.500';
            return (
              <AccordionItem key={key} borderTopWidth="0px" borderBottomWidth="1px">
                <AccordionButton py={3}>
                  <Flex
                    flex={1}
                    align="center"
                    justify="space-between"
                    textAlign="left"
                    flexWrap="wrap"
                    gap={2}>
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
                          )}>
                          <Badge variant="warning" fontSize="xs" textTransform="none" cursor="help">
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
                        textTransform="none">
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
                  <StandardTextarea
                    value={section.narrative}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      updateSection(key, e.target.value)
                    }
                    placeholder={intl.formatMessage({ id: 'osp.section.narrative' })}
                    rows={8}
                    resize="vertical"
                    isReadOnly={!isEditable}
                    bg={isEditable ? undefined : lockedBg}
                  />
                  {/* Was `orange.600` — this theme defines `amber`, not `orange`, so the token
                      silently resolved to CHAKRA's orange: a foreign accent sitting beside
                      Trazo's own ramp. Amber cannot replace it either — the ramp tops out at
                      #E65100 = 3.75:1 on white, under the 4.5 a 12px line needs. So the hue
                      carries no meaning here and the WORDS do, in a colour that is readable. */}
                  {status.tier === 'brief' && (
                    <Text fontSize="xs" color="gray.700" mt={2}>
                      {intl.formatMessage(
                        { id: 'osp.section.briefHint' },
                        { chars: status.charCount, floor: OSP_MATERIAL_FLOOR }
                      )}
                    </Text>
                  )}
                  {status.tier === 'padded' && (
                    <Text fontSize="xs" color="red.600" mt={2}>
                      {intl.formatMessage({ id: 'osp.section.paddedHint' })}
                    </Text>
                  )}
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      </StandardCard>

      {/* Plan review — what the records did after this plan's answers were written. First
          under the narratives because it is the thing to read BEFORE pressing Submit: a renewal
          cloned from last year's answers went out saying "six parcels" with seven on file. It
          lists, never judges, and never blocks. On an ACTIVE plan it is the running list of
          what the next § 205.406 annual update has to mention; on a draft or a submitted plan
          it is what to confirm before it goes. Superseded and withdrawn plans are history. */}
      {companyId &&
        farmId &&
        (editableOsp.status === 'draft' ||
          editableOsp.status === 'submitted' ||
          editableOsp.status === 'active') && (
          <OSPPlanReviewPanel companyId={companyId} farmId={farmId} osp={editableOsp} />
        )}

      {/* The § 11 record-type registry USED to render here as well as inside G8.0 Record
          Keeping, page A. One panel, two homes — and only one of them has the attestation the
          registry is the evidence for ("do you maintain the records confirmed above, keep them
          five years, and make them available at inspection?", gated on the list being non-empty
          by services/attestation_gates.py).

          Here it was 40-odd checkboxes with nothing to be the evidence FOR, which is how a
          statutory answer reads as busywork. The pointer stays, because a farmer who came
          looking for it on this page must land somewhere. */}
      {farmId && (
        <StandardCard mt={4}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Box>
              <Text fontWeight="semibold">
                {intl.formatMessage({
                  id: 'osp.recordTypes.title',
                  defaultMessage: 'Records you maintain'
                })}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({
                  id: 'osp.recordTypes.movedToModule',
                  defaultMessage:
                    'Confirm your record types in G8.0 Record Keeping, where they sit with the attestation your certifier reads them under.'
                })}
              </Text>
            </Box>
            <StandardButton
              variant="outline"
              size="sm"
              minH="44px"
              onClick={() =>
                navigate(`/admin/dashboard/farm/${farmId}/osp/module/g8_0_record_keeping`)
              }>
              {intl.formatMessage({
                id: 'osp.recordTypes.openModule',
                defaultMessage: 'Open G8.0 Record Keeping'
              })}
            </StandardButton>
          </Flex>
        </StandardCard>
      )}

      {/* Approved inputs panel — drives the drift detector (Sprint 5.1). */}
      {companyId && farmId && (
        <OSPApprovedInputsPanel companyId={companyId} farmId={farmId} osp={editableOsp} />
      )}

      {/* Notification of Changes panel — NOP 2615 §3.4 / 7 CFR 205.400(f). */}
      {companyId && farmId && (
        <OSPChangeNotificationsPanel companyId={companyId} farmId={farmId} osp={editableOsp} />
      )}

      {/* --- Secondary filings, BELOW the plan itself -------------------------
          These two cards used to render ABOVE the § 205.201(a) narratives. On a
          375px phone that put ~2,200px of accessory forms between the page title
          and the actual Organic System Plan — and a grower opening this page in
          October is here to write the plan, not to update a state registration.

          Both are also downstream of it in reality: the annual continuation
          (§ 205.406) summarises changes to a plan you must already have, and the
          CDFA registration is a California administrative record that is not part
          of § 205.201 at all. Order the page the way the work happens. */}

      {/* OSP annual continuation / update (7 CFR 205.406) */}
      {companyId && farmId && (
        <OSPAnnualUpdateCard
          companyId={companyId}
          farmId={farmId}
          planOnFile={annualUpdateTarget}
          producesDraft={annualUpdateProducesDraft}
          currentYear={new Date().getFullYear()}
        />
      )}

      {/* CDFA State Organic Program producer registration (CA Food & Ag Code §§ 46000-46029).
          California is the only state with a USDA-approved State Organic Program, so this
          card is CA-only — asking a New York grower for a CDFA registration number, and
          then storing their answer as state="CA", is an instant credibility loss. */}
      {companyId && farmId && farmState && STATE_ORGANIC_PROGRAMS[farmState] && (
        <StateOrganicRegistrationCard companyId={companyId} farmId={farmId} state={farmState} />
      )}

      {/* Version history — prior versions. */}
      {ospSummaries && ospSummaries.length > 1 && (
        <StandardCard
          mt={4}
          titleIcon={<Icon as={FaHistory} color="green.700" />}
          title={`${intl.formatMessage({ id: 'osp.version' })}s`}>
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
                  aria-pressed={isSelected}>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="semibold">
                      v{s.version_number}
                    </Text>
                    <Text fontSize="xs" color={subtextColor}>
                      {s.effective_date || s.created_at.slice(0, 10)}
                    </Text>
                  </VStack>
                  <Badge variant="subtle" {...(STATUS_BADGE[s.status] ?? {})}>
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
