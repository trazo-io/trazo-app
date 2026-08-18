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
import {
  Badge,
  Box,
  Flex,
  HStack,
  Progress,
  SimpleGrid,
  Text,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCheckCircle, FaFileAlt, FaMapMarkedAlt, FaRegCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardPage,
  StandardPageLoading
} from 'components/Design/StandardComponents';
import { OSPLockedNotice, StartNewVersionButton } from './OSPLockedNotice';
import { selectWorkingOsp } from './selectWorkingOsp';
import { pickText } from 'config/osp/types';
import { OSP_MODULE_PDF_URL, OSP_PACKET_URL } from 'config';
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

// Theme badge variants are SEMANTIC, and that is why they are used here rather than a
// colorScheme. NOTE: colorScheme is NOT inert — the `brand` variant reads `paletteOf(props)`
// (src/theme/components/badge.js), so both work. The variants are preferred because they
// carry MEANING; a colorScheme only names a hue.
const STATUS_BADGE_VARIANT: Record<ModuleStatus, string> = {
  not_started: 'neutral',
  in_progress: 'warning',
  completed: 'brand',
  // `subtle` renders GREEN, which put "Not Applicable" in the same success palette as
  // "Completed" while STATUS_ICON_COLOR below painted its icon blue — one status, two colours, and
  // the green one claimed credit for work that was explicitly excluded. N/A is an attested
  // exclusion, not an achievement: neutral.
  not_applicable: 'neutral'
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

const STATUS_BAR_SCHEME: Record<ModuleStatus, string> = {
  not_started: 'gray',
  in_progress: 'amber',
  completed: 'green',
  not_applicable: 'gray'
};

const ModuleCard = ({
  definition,
  row,
  locale,
  onOpen,
  downloadHref,
  isNext,
  isLocked
}: {
  definition: ModuleDefinition;
  row: ModuleProgressRow | undefined;
  locale: string;
  onOpen: () => void;
  downloadHref?: string;
  /** The one module the grower should open next — see NEXT-MODULE note in the page below. */
  isNext?: boolean;
  /** The plan has left draft, so opening a module reads it — it never edits it. */
  isLocked?: boolean;
}) => {
  const intl = useIntl();
  const status: ModuleStatus = row?.status ?? 'not_started';
  const progress = row?.progress ?? { answered: 0, required: 0, missing: [] };
  const pct =
    status === 'completed' || status === 'not_applicable'
      ? 100
      : progress.required > 0
      ? Math.round((progress.answered / progress.required) * 100)
      : 0;

  return (
    <StandardCard data-testid={`osp-module-${definition.key}`}>
      <Flex direction="column" gap={3} h="full">
        {/* Label follows the button below it. "Start here" over a button reading "Review" is two
            instructions for one click. */}
        {isNext ? (
          <Badge variant="brand" fontSize="11px" alignSelf="flex-start">
            {intl.formatMessage({
              id: status === 'not_started' ? 'osp.modules.startHere' : 'osp.modules.continueHere'
            })}
          </Badge>
        ) : null}
        <HStack justify="space-between" align="flex-start">
          <HStack spacing={2} align="flex-start">
            <Box
              as={
                status === 'completed' || status === 'not_applicable' ? FaCheckCircle : FaRegCircle
              }
              color={STATUS_ICON_COLOR[status]}
              boxSize={5}
              mt={0.5}
            />
            <VStack align="flex-start" spacing={0}>
              {definition.code ? (
                <Text fontSize="xs" fontWeight="bold" color="gray.500">
                  {definition.code}
                </Text>
              ) : null}
              <Text fontWeight="semibold" fontSize="md">
                {pickText(definition.title, locale)}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {definition.nop_cites.join(' · ')}
              </Text>
            </VStack>
          </HStack>
          <Badge variant={STATUS_BADGE_VARIANT[status]} fontSize="11px">
            {intl.formatMessage({ id: `osp.modules.status.${status}` })}
          </Badge>
        </HStack>

        {status !== 'not_applicable' && progress.required > 0 ? (
          <Box>
            <Progress
              value={pct}
              size="sm"
              borderRadius="md"
              colorScheme={STATUS_BAR_SCHEME[status]}
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              {intl.formatMessage(
                { id: 'osp.modules.progressCount' },
                { answered: progress.answered, required: progress.required }
              )}
            </Text>
          </Box>
        ) : null}

        <Box mt="auto">
          <HStack spacing={2}>
            {/* Secondary unless this is the next module. 19 cards each carrying a solid green
                primary made the page a wall of identical CTAs with no entry point — every action
                shouting equally loudly is the same as none of them shouting. The card is already
                the affordance; only the next module gets the filled button. */}
            <StandardButton
              size="sm"
              minH="44px"
              flex={1}
              variant={isNext ? 'primary' : 'outline'}
              onClick={onOpen}>
              {/* The label used to key off the module's own progress and nothing else, so a
                  plan the server refuses to write to still advertised "Review / edit" on all
                  19 cards. The button promised an action the destination could not perform —
                  which is the whole of what a locked module felt like from the outside. */}
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
                minH="44px"
                variant="outline"
                aria-label={intl.formatMessage({ id: 'osp.modules.downloadPdf' })}>
                <FaFileAlt />
              </StandardButton>
            ) : null}
          </HStack>
        </Box>
      </Flex>
    </StandardCard>
  );
};

const OSPModuleListPage = () => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const { farmId } = useParams();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';
  const farmParcels =
    currentCompany?.establishments?.find((e: any) => String(e.id) === String(farmId))?.parcels ||
    [];

  const { data: osps, isLoading: ospsLoading } = useGetOSPsQuery(
    { companyId, farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );
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

  // Outstanding applications first; everything else keeps the order the API returned. A cap that
  // buries unfinished work would turn a shortened list into a hidden to-do list — and the
  // alphabetical tiebreak first tried here was worse than no sort at all: on a farm with two real
  // orchards and 23 filler blocks it pushed "North Orchard" and "South Orchard" past the cap
  // behind "Filler Block 10..15", so the preview showed only parcels nobody cares about. Array
  // sort is stable, so no comparator branch = source order preserved.
  const sortedParcels = useMemo(() => {
    const done = (p: any) => (p.application_status === 'complete' ? 1 : 0);
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
      await createOSP({ companyId, farmId: farmId || '', data: {} }).unwrap();
    } catch {
      toast({
        title: intl.formatMessage({ id: 'osp.modules.createFailed' }),
        status: 'error',
        duration: 5000
      });
    }
  };

  if (ospsLoading) return <StandardPageLoading />;

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'osp.modules.pageTitle' })}
      description={intl.formatMessage({ id: 'osp.modules.pageDescription' })}
      rightAction={
        ospId != null ? (
          // Secondary, deliberately. On a farm with 0 of 19 modules answered this was the biggest,
          // greenest button on the page — the most prominent thing the OSP offered a new grower
          // was "download the empty version of the document you have not written yet". Exporting
          // is a utility here; answering modules is the work.
          <Box data-tour="osp-packet">
            <StandardButton
              as="a"
              href={env.getApiUrl(OSP_PACKET_URL(companyId, farmId || '', ospId))}
              minH="44px"
              variant="outline"
              leftIcon={<FaFileAlt />}>
              {intl.formatMessage({ id: 'osp.modules.downloadPacket' })}
            </StandardButton>
          </Box>
        ) : undefined
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

          <Box data-tour="osp-modules-grid">
            <Text fontWeight="semibold" mb={1}>
              {intl.formatMessage({ id: 'osp.modules.farmWideTitle' })}
            </Text>
            <Text fontSize="sm" color="gray.600" mb={3}>
              {intl.formatMessage({ id: 'osp.modules.farmWideHint' })}
            </Text>
            {defsLoading || rowsLoading ? (
              <StandardPageLoading />
            ) : (
              <SimpleGrid columns={{ base: 1, smd: 2, lg: 3 }} spacing={4}>
                {farmWide.map((definition) => (
                  <ModuleCard
                    key={definition.key}
                    definition={definition}
                    row={rowsByKey.get(definition.key)}
                    locale={intl.locale}
                    onOpen={() =>
                      navigate(`/admin/dashboard/farm/${farmId}/osp/module/${definition.key}`)
                    }
                    downloadHref={
                      ospId != null
                        ? env.getApiUrl(
                            OSP_MODULE_PDF_URL(companyId, farmId || '', ospId, definition.key)
                          )
                        : undefined
                    }
                    isNext={nextModuleKey != null && definition.key === nextModuleKey}
                    isLocked={isLocked}
                  />
                ))}
              </SimpleGrid>
            )}
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
