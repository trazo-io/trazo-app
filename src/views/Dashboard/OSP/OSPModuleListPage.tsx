/**
 * Guided OSP — module list page (WS-2.4).
 *
 * The new landing for /farm/:farmId/osp. Mirrors the module-list shape validated in the
 * QO teardown (§3.2) rendered entirely in Trazo's own system: farm-wide modules as
 * status cards, per-parcel section (placeholder until WS-5), and a link to the demoted
 * narrative/lifecycle view. Module CONTENT comes from the API (both locales inline) —
 * nothing is hardcoded here.
 *
 * Route: /admin/dashboard/farm/:farmId/osp
 */

import React, { useMemo } from 'react';
import { Badge, Box, Flex, HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { FaCheckCircle, FaFileAlt, FaMapMarkedAlt, FaRegCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardPage,
  StandardPageLoading,
  StandardQueryError,
  STATUS_URGENCY_TOKENS
} from 'components/Design/StandardComponents';
import CertifyingAgentPicker from 'components/Certifications/CertifyingAgentPicker';
import {
  ComplianceExportsUpsell,
  useComplianceExports
} from 'components/Guards/ComplianceExportsGuard';
import OSPCertifyingAgentCard from './OSPCertifyingAgentCard';
import { OSPLockedNotice, StartNewVersionButton } from './OSPLockedNotice';
import OSPPlanReviewPanel from './OSPPlanReviewPanel';
import PacketDownloadControl from './PacketDownloadControl';
import { selectWorkingOsp } from './selectWorkingOsp';
import { pickText } from 'config/osp/types';
import { OSP_MODULE_PDF_URL } from 'config';
import { env } from 'config/environment';
import type { ModuleDefinition, ModuleProgressRow, ModuleStatus } from 'config/osp/types';
import {
  useCreateOSPMutation,
  useGetOSPModuleDefinitionsQuery,
  useGetOSPModulesQuery,
  useGetOSPsQuery
} from 'store/api/ospApi';
import type { RootState } from 'store/index';
import { useTour } from 'hooks/useTour';
import { useFarmState } from 'hooks/useMeasurementSystem';

/** One rule between rows, keyed on an attribute so it holds whatever each row's own props. */
const MODULE_ROW_RULE = {
  '& > [data-module-row] + [data-module-row]': { borderTopWidth: '1px', borderTopColor: 'gray.100' }
};

/** Parcels shown before the section collapses behind "Show all". Two orchards + slack. */
const PARCEL_PREVIEW_COUNT = 6;

/**
 * Split in two because the two consumers need different things, and one map serving both is
 * how a failing colour hid here for so long: it was ONE map, read as `${palette}.500` for the
 * status glyph and as a bare `colorScheme` for the progress bar.
 *
 * Both values it produced for a real status were wrong, and neither shows up in a grep for a
 * colour token because the token was built by interpolation:
 *   completed   -> `green.500`  = 2.78:1 on white, under the 3.0 WCAG 1.4.11 non-text floor
 *   in_progress -> `orange.500` — this theme defines `amber`, NOT `orange`, so it silently
 *                  resolved to CHAKRA's orange: a foreign accent on all 19 cards
 *
 * Glyph colours are therefore explicit tokens, and the bar keeps a palette NAME.
 */
const STATUS_ICON_COLOR: Record<ModuleStatus, string> = {
  not_started: 'gray.500',
  in_progress: 'amber.900',
  completed: 'green.700',
  // grey, matching its `neutral` badge. It was blue here while the badge was neutral — the
  // exact "one status, two colours" split the comment above this map describes.
  not_applicable: 'gray.500'
};

/**
 * One module as a row (2026-11-07).
 *
 * Was a card in a three-column grid: a check icon, a status badge, three lines of § citations,
 * a "Review / edit" button and a PDF button, nineteen times. The module to work on next sat
 * fifth, mid-grid. Now a row: code and name, the answer count, and the actions. The citations
 * live on the module page, under its title, where the questions they cite are.
 */
const ModuleRow = ({
  definition,
  row,
  locale,
  onOpen,
  downloadHref,
  isNext,
  isLocked,
  agent
}: {
  definition: ModuleDefinition;
  row: ModuleProgressRow | undefined;
  /** The plan's own agent ("WSDA") when Trazo holds its register; names the blank-question line. */
  agent?: string | null;
  locale: string;
  onOpen: () => void;
  downloadHref?: string;
  /** The one module the grower should open next: the page's single filled button. */
  isNext?: boolean;
  /** The plan has left draft, so opening a module reads it; it never edits it. */
  isLocked?: boolean;
}) => {
  const intl = useIntl();
  const status: ModuleStatus = row?.status ?? 'not_started';
  const progress = row?.progress ?? { answered: 0, required: 0, missing: [] };
  const blankAsked = row?.agent_asks_blank?.length ?? 0;
  const settled = status === 'completed' || status === 'not_applicable';

  return (
    <Flex
      data-testid={`osp-module-${definition.key}`}
      data-module-row
      py={3}
      gap={{ base: 2, md: 4 }}
      direction={{ base: 'column', md: 'row' }}
      align={{ base: 'stretch', md: 'center' }}>
      <HStack spacing={3} align="flex-start" flex="1" minW={0}>
        <Box
          as={settled ? FaCheckCircle : FaRegCircle}
          color={STATUS_ICON_COLOR[status]}
          boxSize={4}
          mt={1}
          flexShrink={0}
          aria-hidden
        />
        <Box minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            {definition.code ? (
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                {definition.code}
              </Text>
            ) : null}
            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
              {pickText(definition.title, locale)}
            </Text>
            {/* Label follows the button beside it. */}
            {isNext ? (
              <Badge variant="brand" fontSize="11px">
                {intl.formatMessage({
                  id:
                    status === 'not_started' ? 'osp.modules.startHere' : 'osp.modules.continueHere'
                })}
              </Badge>
            ) : null}
          </HStack>
          <Text fontSize="xs" color="gray.600">
            {status === 'not_applicable'
              ? intl.formatMessage({ id: 'osp.modules.status.not_applicable' })
              : progress.required > 0
              ? // Run 8 (R8-10): a count, not a progress bar. Answers given is descriptive only.
                intl.formatMessage(
                  { id: 'osp.modules.progressCount' },
                  { answered: progress.answered, required: progress.required }
                )
              : intl.formatMessage({ id: `osp.modules.status.${status}` })}
          </Text>
          {/* Not counted into the line above: Trazo does not require these, the agent's form
              asks them. Shown on an answered module too, since answering never waited on them. */}
          {agent && status !== 'not_applicable' && blankAsked > 0 ? (
            <Text
              fontSize="xs"
              color={STATUS_URGENCY_TOKENS.warn.text}
              data-testid={`osp-module-agent-blank-${definition.key}`}>
              {intl.formatMessage(
                { id: 'osp.modules.agentAsksBlank' },
                { agent, count: blankAsked }
              )}
            </Text>
          ) : null}
        </Box>
      </HStack>
      <HStack spacing={1} flexShrink={0} pl={{ base: 7, md: 0 }}>
        {/* Filled only for the next module: nineteen green buttons gave a grower no entry
            point. The label never offers an edit the server would refuse on a locked plan. */}
        <StandardButton
          size="sm"
          variant={isNext ? 'primary' : settled ? 'ghost' : 'outline'}
          onClick={onOpen}>
          {intl.formatMessage({
            id: isLocked
              ? 'osp.modules.view'
              : status === 'not_started'
              ? 'osp.modules.open'
              : 'osp.modules.review'
          })}
        </StandardButton>
        {downloadHref ? (
          <StandardButton
            as="a"
            href={downloadHref}
            size="sm"
            variant="ghost"
            aria-label={intl.formatMessage(
              { id: 'osp.modules.downloadPdfFor' },
              { name: pickText(definition.title, locale) }
            )}>
            <FaFileAlt />
          </StandardButton>
        ) : null}
      </HStack>
    </Flex>
  );
};

const OSPModuleListPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const { farmId } = useParams();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  // Starter is bounded by what it can PRODUCE (`subscriptions/gating.py`). Both exports on this
  // page — the packet ZIP and the per-module PDFs — are behind that gate, and both were plain
  // <a href>s onto the API: on Starter the click left the app and landed the grower on the DRF
  // browsable 403 page, raw JSON and all. The boundary has to be a state of the page.
  const hasComplianceExports = useComplianceExports();
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';
  const farmParcels =
    currentCompany?.establishments?.find((e: any) => String(e.id) === String(farmId))?.parcels ||
    [];

  const {
    data: osps,
    isLoading: ospsLoading,
    isUninitialized: ospsUninitialized,
    isError: ospsError,
    isFetching: ospsFetching,
    refetch: refetchOsps
  } = useGetOSPsQuery({ companyId, farmId: farmId || '' }, { skip: !companyId || !farmId });
  // Not `osps[0]` — see selectWorkingOsp for why index 0 was a Postgres null-ordering
  // default wearing a product decision's clothes.
  const latestOsp = selectWorkingOsp(osps);
  const ospId = latestOsp?.id;
  const isLocked = Boolean(latestOsp && latestOsp.status !== 'draft');

  // Gated on an OSP existing: before that this page is one "Start my OSP" card and every
  // target the tour points at is absent, which would spend the tour's single showing on a
  // page with nothing to show. A tour marks itself complete once run.
  useTour('osp-modules', { enabled: !!latestOsp });

  const { data: definitions, isLoading: defsLoading } = useGetOSPModuleDefinitionsQuery(
    { companyId, farmId: farmId || '', ospId: ospId ?? '' },
    { skip: !companyId || !farmId || ospId == null }
  );
  const { data: moduleRows, isLoading: rowsLoading } = useGetOSPModulesQuery(
    { companyId, farmId: farmId || '', ospId: ospId ?? '' },
    { skip: !companyId || !farmId || ospId == null }
  );
  const [createOSP, { isLoading: creating }] = useCreateOSPMutation();
  const [showAllParcels, setShowAllParcels] = React.useState(false);
  // Asked before the plan exists: the packet is numbered to this agent's forms, and a first-year
  // applicant has no certificate for it to be read from. Optional; editable until submission.
  const [startAgent, setStartAgent] = React.useState('');
  // Orders the picker: agencies common in the farm's state come first.
  const farmState = useFarmState(farmId);

  // Outstanding applications first; everything else keeps the order the API returned. A cap that
  // buries unfinished work would turn a shortened list into a hidden to-do list — and the
  // alphabetical tiebreak first tried here was worse than no sort at all: on a farm with two real
  // orchards and 23 filler blocks it pushed "North Orchard" and "South Orchard" past the cap
  // behind "Filler Block 10..15", so the preview showed only parcels nobody cares about. Array
  // sort is stable, so no comparator branch = source order preserved.
  const sortedParcels = useMemo(() => {
    // 🔴 2026-09-24 — BOTH axes. `application_status` now answers only "are the questions
    // answered"; the map moved to the evidence axis. Sorting on answers alone would push a
    // parcel with an outstanding map down the list as if it were finished, which is the same
    // over-claim the badge made, expressed as ordering.
    const done = (p: any) =>
      p.application_status === 'complete' && p.evidence_status !== 'outstanding' ? 1 : 0;
    return [...farmParcels].sort((a: any, b: any) => done(a) - done(b));
  }, [farmParcels]);
  const visibleParcels = showAllParcels
    ? sortedParcels
    : sortedParcels.slice(0, PARCEL_PREVIEW_COUNT);

  const rowsByKey = useMemo(() => {
    const map = new Map<string, ModuleProgressRow>();
    (moduleRows?.modules ?? []).forEach((r) => map.set(r.key, r));
    return map;
  }, [moduleRows]);

  const farmWide = (definitions?.modules ?? []).filter((m) => !m.repeat_per_parcel);
  const isSettled = (m: ModuleDefinition) => {
    const s = rowsByKey.get(m.key)?.status;
    return s === 'completed' || s === 'not_applicable';
  };
  // Definition order (the § order a certifier reads) inside each group; the next module is the
  // first open one, so it heads the list.
  const openModules = farmWide.filter((m) => !isSettled(m));
  const answeredModules = farmWide.filter(isSettled);
  const completedCount = farmWide.filter((m) => {
    const s = rowsByKey.get(m.key)?.status;
    return s === 'completed' || s === 'not_applicable';
  }).length;

  // NEXT-MODULE. The first module that is neither completed nor attested N/A, in definition
  // order (which is the § order a certifier reads). It is the page's single primary action:
  // 19 identically-weighted green buttons gave a grower opening the OSP for the first time no
  // answer to "where do I start?", which is the exact moment the white-glove pilot is trying to
  // survive. Once everything is answered there is no next module and no primary — correct: the
  // work left is in the packet, not in this list.
  //
  // Suppressed on a non-draft OSP. Once the plan is submitted the page is read-only (see the
  // notice below), and telling someone to "start here" on a plan already with their certifier
  // points at work that is no longer theirs to do.
  const nextModuleKey =
    latestOsp && latestOsp.status === 'draft'
      ? farmWide.find((m) => {
          const s = rowsByKey.get(m.key)?.status;
          return s !== 'completed' && s !== 'not_applicable';
        })?.key
      : undefined;

  const handleStartOsp = async () => {
    try {
      const certifierName = startAgent.trim();
      await createOSP({
        companyId,
        farmId: farmId || '',
        data: certifierName ? { certifier_name: certifierName } : {}
      }).unwrap();
    } catch {
      toast({
        title: intl.formatMessage({ id: 'osp.modules.createFailed' }),
        status: 'error',
        duration: 5000
      });
    }
  };

  // Loading, or never started. `companyId` is `currentCompany?.id` and hydrates
  // asynchronously, so on a cold load this query is SKIPPED and reports `isLoading: false`
  // with `data: undefined` — which fell straight through to the "Start my OSP" first-run
  // card below. Same defect as OSPView, and the note under `ospsError` was only half right:
  // a skipped query does keep `isError` false, but it was never the error branch that caught
  // it. `isUninitialized` is what names that state.
  if (ospsLoading || ospsUninitialized) return <StandardPageLoading />;

  // A failed OSPs request left `osps` undefined, so `selectWorkingOsp` returned nothing and
  // this page rendered its "Start my OSP" first-run card — telling a farm that may already
  // have a submitted plan on file that it has none, and inviting them to start a second one.
  if (ospsError) {
    return (
      <StandardPage title={intl.formatMessage({ id: 'osp.modules.pageTitle' })}>
        <StandardQueryError onRetry={refetchOsps} isRetrying={ospsFetching} />
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'osp.modules.pageTitle' })}
      description={intl.formatMessage({ id: 'osp.modules.pageDescription' })}
      rightAction={
        // Secondary, deliberately. On a farm with 0 of 19 modules answered this was the biggest,
        // greenest button on the page — the most prominent thing the OSP offered a new grower
        // was "download the empty version of the document you have not written yet". Exporting
        // is a utility here; answering modules is the work.
        //
        // It also used to export `selectWorkingOsp(osps)` — the highest-numbered DRAFT — through
        // a bare href, naming no version anywhere. See PacketDownloadControl for what that cost.
        ospId == null ? undefined : hasComplianceExports ? (
          <PacketDownloadControl companyId={companyId} farmId={farmId || ''} osps={osps} />
        ) : (
          <ComplianceExportsUpsell compact messageId="osp.packet.complianceOnly" />
        )
      }>
      {!latestOsp ? (
        <StandardCard>
          <VStack spacing={4} py={6}>
            <Box as={FaFileAlt} boxSize={8} color="green.700" />
            <Text fontWeight="semibold">
              {intl.formatMessage({ id: 'osp.modules.emptyTitle' })}
            </Text>
            <Text fontSize="sm" color="gray.600" textAlign="center" maxW="lg">
              {intl.formatMessage({ id: 'osp.modules.emptyBody' })}
            </Text>
            <Box w="full" maxW="md">
              <StandardField
                label={intl.formatMessage({ id: 'osp.modules.startAgentLabel' })}
                helpText={intl.formatMessage({ id: 'osp.modules.startAgentHint' })}>
                <CertifyingAgentPicker
                  value={startAgent}
                  onChange={setStartAgent}
                  showNumbering
                  state={farmState ?? undefined}
                />
              </StandardField>
            </Box>
            <StandardButton minH="44px" onClick={handleStartOsp} isLoading={creating}>
              {intl.formatMessage({ id: 'osp.modules.startOsp' })}
            </StandardButton>
          </VStack>
        </StandardCard>
      ) : (
        <VStack align="stretch" spacing={6}>
          {/* Its only advice — "start a new version from the narrative view" — had no button
              behind it anywhere on this page, and it interpolated the RAW api status, so it
              printed "This plan is active" here while the wizard said "approved and active"
              (and printed the English word `active` inside the Spanish sentence). The
              sentence is shared with the wizard now; the button it talks about is on the
              action row below, where this page keeps its controls. */}
          {isLocked ? <OSPLockedNotice osp={latestOsp} /> : null}

          <Flex
            data-tour="osp-progress"
            justify="space-between"
            align={{ base: 'flex-start', smd: 'center' }}
            direction={{ base: 'column', smd: 'row' }}
            gap={2}>
            <HStack spacing={3}>
              <Badge variant="brand" fontSize="12px">
                v{latestOsp.version_number}
              </Badge>
              {/* The lock has to survive scrolling. The notice above it is the explanation,
                  but it leaves the viewport after one screen of cards, and from there the
                  page looks like an ordinary editable list again. */}
              {isLocked ? (
                <Badge variant="neutral" fontSize="12px">
                  {intl.formatMessage({ id: 'osp.locked.badge' })}
                </Badge>
              ) : null}
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage(
                  { id: 'osp.modules.farmWideProgress' },
                  { completed: completedCount, total: farmWide.length }
                )}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {intl.formatMessage({ id: 'osp.completion.notAReview' })}
              </Text>
            </HStack>
            {/* The page's controls live here, next to the state they act on. On a locked
                plan the fork is the primary one and takes the filled weight; the narrative
                view stays the outline it has always been. */}
            {/* wrap, not nowrap: this row carried ONE button until the fork moved here, and
                two 44px controls side by side do not fit a 375px screen — the second would
                be pushed off the edge of the phone this page is designed for first. */}
            <HStack spacing={2} flexWrap="wrap">
              {isLocked ? (
                <StartNewVersionButton
                  osp={latestOsp}
                  companyId={companyId}
                  farmId={farmId || ''}
                />
              ) : null}
              <StandardButton
                variant="outline"
                size="sm"
                minH="44px"
                onClick={() => navigate(`/admin/dashboard/farm/${farmId}/osp/narratives`)}>
                {intl.formatMessage({ id: 'osp.modules.narrativeView' })}
              </StandardButton>
            </HStack>
          </Flex>

          <OSPCertifyingAgentCard
            companyId={companyId}
            farmId={farmId || ''}
            osp={latestOsp}
            isLocked={isLocked}
            farmState={farmState ?? undefined}
          />

          {/* Plan review, on the OSP LANDING rather than only on the demoted narrative page.
              Its own docstring says it is "in front of them at the moment the decision is
              made" — true of the packet cover, and not true in the app: it rendered on
              /osp/narratives only, which the October cuts made a secondary view behind one
              outline button. This page is where modules are answered and where the packet is
              downloaded from, so it is where "here is what your records did since these
              answers" belongs. It reports itself clean when there is nothing, never blocks. */}
          {latestOsp &&
            (latestOsp.status === 'draft' ||
              latestOsp.status === 'submitted' ||
              latestOsp.status === 'active') && (
              <Box mb={4}>
                <OSPPlanReviewPanel
                  companyId={companyId}
                  farmId={farmId || ''}
                  osp={latestOsp}
                  onOpenModule={(key) =>
                    navigate(`/admin/dashboard/farm/${farmId}/osp/module/${key}`)
                  }
                  moduleName={(key) => {
                    const definition = (definitions?.modules ?? []).find((m) => m.key === key);
                    return definition ? pickText(definition.title, intl.locale) : undefined;
                  }}
                />
              </Box>
            )}

          {/* Rows in two groups (2026-11-07): what is still to answer, in the order a
              certifier reads it, with the next module on top; then the modules with every
              required answer given (or attested not applicable), quiet. */}
          <Box data-tour="osp-modules-grid" w="full">
            <StandardCard
              mb={0}
              title={intl.formatMessage({ id: 'osp.modules.farmWideTitle' })}
              subtitle={intl.formatMessage({ id: 'osp.modules.farmWideHint' })}>
              {defsLoading || rowsLoading ? (
                <StandardPageLoading />
              ) : (
                <VStack align="stretch" spacing={5}>
                  {[
                    { key: 'open', modules: openModules, labelId: 'osp.modules.groupOpen' },
                    {
                      key: 'answered',
                      modules: answeredModules,
                      labelId: 'osp.modules.groupAnswered'
                    }
                  ]
                    .filter((group) => group.modules.length > 0)
                    .map((group) => (
                      <Box key={group.key}>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color="gray.600"
                          textTransform="uppercase"
                          letterSpacing="wide"
                          mb={1}>
                          {intl.formatMessage(
                            { id: group.labelId },
                            { count: group.modules.length }
                          )}
                        </Text>
                        <VStack align="stretch" spacing={0} sx={MODULE_ROW_RULE}>
                          {group.modules.map((definition) => (
                            <ModuleRow
                              key={definition.key}
                              definition={definition}
                              row={rowsByKey.get(definition.key)}
                              agent={moduleRows?.agent}
                              locale={intl.locale}
                              onOpen={() =>
                                navigate(
                                  `/admin/dashboard/farm/${farmId}/osp/module/${definition.key}`
                                )
                              }
                              downloadHref={
                                ospId != null && hasComplianceExports
                                  ? env.getApiUrl(
                                      OSP_MODULE_PDF_URL(
                                        companyId,
                                        farmId || '',
                                        ospId,
                                        definition.key
                                      )
                                    )
                                  : undefined
                              }
                              isNext={nextModuleKey != null && definition.key === nextModuleKey}
                              isLocked={isLocked}
                            />
                          ))}
                        </VStack>
                      </Box>
                    ))}
                </VStack>
              )}
            </StandardCard>
          </Box>

          <Box data-tour="osp-parcel-applications" w="full">
            <StandardCard
              titleIcon={<Box as={FaMapMarkedAlt} boxSize={5} color="green.700" />}
              title={intl.formatMessage({ id: 'osp.modules.parcelSectionTitle' })}
              subtitle={intl.formatMessage({ id: 'osp.modules.parcelSectionHint' })}>
              <HStack spacing={3} align="flex-start">
                <VStack align="flex-start" spacing={2} w="full">
                  {/* Was a dead-end placeholder ("coming to this page next") while the
                    wizard had been shipped for weeks — 2026-08-10 signposting audit.

                    Then it rendered every parcel, unbounded, in a single left-aligned column of
                    solid green buttons: on a 25-parcel farm that is 25 primary CTAs stacked below
                    the fold, and it made a 19-module OSP look 44 modules deep. Now: a wrapping
                    row, secondary weight (this section is subordinate to the farm-wide modules
                    above it), capped, with the rest one click away. Parcels whose application is
                    still outstanding sort first — the cap must never hide the work. */}
                  <Flex gap={2} flexWrap="wrap">
                    {visibleParcels.map((parcel: any) => (
                      <StandardButton
                        key={parcel.id}
                        size="sm"
                        // Outstanding keeps a border; finished recedes to ghost. Flattening every
                        // parcel to `outline` (the first pass here) removed the only at-a-glance
                        // difference between a done application and an untouched one — the status
                        // text still said so, but you had to read all 25 to find the work.
                        variant={parcel.application_status === 'complete' ? 'ghost' : 'outline'}
                        onClick={() =>
                          navigate(
                            `/admin/dashboard/farm/${farmId}/parcel/${parcel.id}/application`
                          )
                        }>
                        {parcel.name}
                        {' · '}
                        {intl.formatMessage({
                          id: `parcelApp.status.${parcel.application_status || 'not_started'}`
                        })}
                      </StandardButton>
                    ))}
                  </Flex>
                  {sortedParcels.length > PARCEL_PREVIEW_COUNT ? (
                    <StandardButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAllParcels((v) => !v)}>
                      {showAllParcels
                        ? intl.formatMessage({ id: 'osp.modules.showFewerParcels' })
                        : intl.formatMessage(
                            { id: 'osp.modules.showAllParcels' },
                            { count: sortedParcels.length }
                          )}
                    </StandardButton>
                  ) : null}
                </VStack>
              </HStack>
            </StandardCard>
          </Box>
        </VStack>
      )}
    </StandardPage>
  );
};

export default OSPModuleListPage;
