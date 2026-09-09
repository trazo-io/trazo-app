/**
 * Parcel profile — the producer's field-level page.
 *
 * WHAT THIS PAGE IS FOR. A parcel is the unit a certifier inspects: 7 CFR 205.202 is written
 * about *land*, not about the operation. So this page leads with the §205.202 record set —
 * field history, buffer zones and parcel identity, and the landowner affidavit for the
 * three-year prior-use requirement. The October plan calls these "the best-aligned non-OSP
 * producer screen" and says KEEP + PROMOTE (§10.4); they were the LAST three cards of
 * thirteen, sitting under Soil Health and Water Management.
 *
 * STRUCTURE (rebuilt 2026-08-07), mirroring ProfileFarm:
 *
 *   header (no card)      identity · one meta line · Edit
 *   §1 organic compliance field history · parcel records · landowner affidavit  ← PROMOTED
 *   §2 parcel details     ONE card, grouped definition lists   ← was 7 separate cards
 *
 * As on the farm profile, hierarchy comes from section headings and spacing, NOT from card
 * chrome: `StandardCard`'s `variant` is inert (protected CSS forces one look on every
 * `.trazo-card`). See its docstring.
 *
 * Removed in the rebuild:
 *  - the transparency SCORE badge (rendered twice, mobile + desktop). Cut from the farm home
 *    2026-08-04 and from the Production quick-stats per §10.4 as "the 4th duplicate of one
 *    number". This note used to add "its home is /transparency" — that page was never routed,
 *    and on 2026-08-11 the score was retired from producer UI entirely. It has no home now;
 *    it is a backend KPI. See `.claude/rules/transparency-first.md`.
 *  - "Quick Stats" — area and crop, both duplicated by the Basic Information card below.
 *  - the initials Avatar and the duplicated mobile/desktop identity layouts.
 *  - "Share", which called navigator.share on `window.location.href` — an authenticated
 *    /admin URL that opens a login wall for whoever receives it.
 *  - the whole "Consumer transparency" section. `get_transparency_description()` returns
 *    `self.description`, which the header already prints, and `consumer_story` reached no
 *    surface at all. See the note where §2 used to be.
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Icon,
  Badge,
  Divider,
  Flex,
  CloseButton
} from '@chakra-ui/react';
import {
  FaMapMarkedAlt,
  FaEdit,
  FaSeedling,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaMapMarkerAlt,
  FaBuilding,
  FaLeaf,
  FaTint,
  FaRulerCombined,
  FaHashtag,
  FaGlobeAmericas,
  FaMountain,
  FaChartLine,
  FaFlask,
  FaUsers
} from 'react-icons/fa';
import { MdEco, MdLocationOn } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from 'hooks/useUserRole';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

import {
  StandardCard,
  StandardButton,
  StandardPage,
  StandardPageLoading,
  StandardSection,
  StandardQueryError
} from 'components/Design/StandardComponents';
import { InfoRow, FieldGroup, PageHeaderMeta } from 'components/Design/ProfileField';
import { StandardImageGallery } from 'components/ImageGallery';
import { useGetParcelQuery } from 'store/api/productApi';
import LocationDisclosureSetting from 'components/Parcel/LocationDisclosureSetting';
import FieldHistorySection from './FieldHistorySection';
import AdjoiningLandSection from './AdjoiningLandSection';
import LandownerAffidavitSection from './LandownerAffidavitSection';
import ParcelComplianceCard from './ParcelComplianceCard';
import { formatAreaWithBothUnits } from '../../../../utils/areaUnits';

// Type definitions
interface Company {
  id: string;
  name: string;
  establishments?: Establishment[];
}

interface Establishment {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  zone?: string;
}

interface AgriculturalDetails {
  soil_ph?: string;
  soil_organic_matter?: string;
  soil_nitrogen?: string;
  soil_phosphorus?: string;
  irrigation_efficiency?: string;
  water_source_type?: string;
  water_quality_ph?: string;
  water_allocation_acre_feet?: string;
  cover_crop_management?: string;
  crop_rotation_pattern?: string;
  pest_management_strategy?: string;
  fertilization_program?: string;
  [key: string]: string | undefined;
}

interface ParcelData {
  id: string;
  name: string;
  area?: number;
  primary_crop?: string;
  crop_type?: string;
  images?: Array<{ url: string; caption?: string }>;
  unique_code?: string;
  carbon_calculation_enabled?: boolean;
  usda_compliance_eligible?: boolean;
  transparency_score?: number;
  transparency_description?: string;
  sustainability_practices?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  description?: string;
  agricultural_details?: AgriculturalDetails;
  polygon?: Array<{ lat: number; lng: number }>;
}

interface RootState {
  company: {
    currentCompany?: Company;
  };
  product: {
    currentParcel?: ParcelData;
  };
}

// Utility functions
const formatDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

function ProfileParcel(): React.ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const { canWrite } = useUserRole();
  const { farmId, parcelId } = useParams<{ farmId: string; parcelId: string }>();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);

  // Boundary nudge: shown when the parcel was saved without a drawn field boundary.
  // Dismissal persists per parcel via localStorage.
  const boundaryNudgeStorageKey = `trazo_boundary_nudge_dismissed_${parcelId}`;
  const [boundaryNudgeDismissed, setBoundaryNudgeDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(boundaryNudgeStorageKey) === 'true';
    } catch {
      return false;
    }
  });
  const dismissBoundaryNudge = (): void => {
    setBoundaryNudgeDismissed(true);
    try {
      localStorage.setItem(boundaryNudgeStorageKey, 'true');
    } catch {
      // localStorage unavailable (private mode) — dismissal lasts for the session only
    }
  };

  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);
  const establishments = currentCompany?.establishments || [];
  const currentParcel = useSelector((state: RootState) => state.product.currentParcel);

  /**
   * "We cannot ask yet" is a THIRD state, and it is not failure.
   *
   * `currentCompany` is hydrated into Redux asynchronously, so on a cold load — a hard
   * refresh, or a pasted/bookmarked deep link, which is exactly how a certifier opens one of
   * these — `currentCompany?.id` is `undefined` for the first few hundred milliseconds and
   * this query is SKIPPED. A skipped RTK Query reports `isLoading: false` with
   * `data: undefined`: indistinguishable, to a two-branch component, from a request that ran
   * and came back empty. So the page fell past its loading guard into `!parcel` and rendered
   * "This parcel could not be loaded." over a parcel that exists and loads fine a moment
   * later.
   *
   * MEASURED on /farm/160/parcel/284/profile with the fetch delayed 1.5s:
   *   blank 119ms → LOADING 766ms → blank 947ms → **ERROR 1050ms** → LOADING 1293ms → LOADED 3051ms
   * i.e. ~243ms of a false failure claim, mid-load.
   *
   * Same root cause as the OSP module deep-link (2026-08-27), which is the mirror image of
   * this: there a `!data` guard on a skipped query spun forever, here it accuses. Both come
   * from reading a skipped query as an answer.
   *
   * The flag for it is `isUninitialized` — RTK Query's own "this has never run". ProfileFarm
   * (Farm/ProfileFarm.tsx:241) already guards `isLoading || isUninitialized` for exactly this
   * reason; this page is its sibling and simply never got the same treatment. Preferred over
   * re-deriving the precondition here, because it stays true for every reason the query has
   * not run, including ones this component does not know about.
   */
  const {
    data: parcelData,
    isLoading: isParcelLoading,
    isFetching: isParcelFetching,
    isUninitialized: isParcelUninitialized,
    isError: isParcelError,
    refetch: refetchParcel
  } = useGetParcelQuery(
    {
      companyId: currentCompany?.id || '',
      farmId: farmId || '',
      parcelId: parcelId || ''
    },
    {
      skip:
        parcelId === undefined ||
        currentParcel?.id === parcelId ||
        currentCompany?.id === undefined ||
        !farmId
    }
  );

  useEffect(() => {
    if (establishments && establishments.length > 0 && farmId) {
      const foundEstablishment = establishments.find(
        (est: Establishment) => est.id.toString() === farmId
      );
      if (foundEstablishment) {
        setEstablishment(foundEstablishment);
      }
    }
  }, [farmId, establishments]);

  /**
   * Read through a fallback, never straight from the query.
   *
   * `useGetParcelQuery` is SKIPPED when `currentParcel?.id === parcelId`, and a skipped RTK
   * Query returns `data: undefined` — so a component that only reads `parcelData` renders a
   * completely empty page in that state. It is reachable in principle: the parcel detail view
   * (`views/Dashboard/Parcel/index.jsx`) dispatches `setParcel(data)`, and this page's own
   * Back button points at it.
   *
   * It does not fire TODAY only because the API `id` is a number and the route `parcelId` is
   * a string, so `===` is never true. That makes it a trap armed for whoever tightens that
   * comparison. Falling back to the Redux copy is what the skip always implied, and it is
   * correct whether or not the skip ever starts firing.
   *
   * Computed BEFORE the guards below, because each of them needs to know whether we already
   * hold a parcel — the loading guard must not spin over a parcel Redux can already show.
   */
  const parcel = parcelData ?? currentParcel;

  // Still loading, in flight, or never started. The `isParcelUninitialized` term is the fix
  // for the false-error flash: while the company is hydrating this query is skipped, so
  // `isParcelLoading` is false even though nothing has been attempted yet.
  //
  // ⚠️ `&& !parcel` is load-bearing, and is the one thing this page needs that ProfileFarm
  // does not. The skip ALSO fires when Redux already holds this parcel
  // (`currentParcel?.id === parcelId`) — a state that is uninitialized and complete at the
  // same time. A bare `isUninitialized` guard would spin forever on it, which is precisely
  // the failure this page's twin has (OSP module deep-link, 2026-08-27). Uninitialized is
  // only "loading" when there is nothing to show yet.
  if (isParcelLoading || isParcelFetching || (isParcelUninitialized && !parcel)) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  // The request ran and FAILED. Distinct from the branch below, which is a parcel that is
  // genuinely absent — one is worth retrying, the other never will be.
  if (isParcelError && !parcel) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
        <StandardQueryError onRetry={refetchParcel} isRetrying={isParcelFetching} />
      </StandardPage>
    );
  }

  // Asked, answered, and there is nothing here — a wrong id, or a parcel this account cannot
  // see. Say so, rather than painting a header with an empty <h1> and three empty sections.
  // ProfileFarm has the equivalent guard; this page had none.
  if (!parcel) {
    return (
      <StandardPage
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
        <Box py={20} textAlign="center">
          <Text color="red.700">
            {intl.formatMessage({
              id: 'parcel.notFound',
              defaultMessage: 'This parcel was not found.'
            })}
          </Text>
        </Box>
      </StandardPage>
    );
  }

  const details = parcel?.agricultural_details;

  const hasSoilData = Boolean(
    details &&
      (details.soil_ph ||
        details.soil_organic_matter ||
        details.soil_nitrogen ||
        details.soil_phosphorus)
  );

  const hasWaterData = Boolean(
    details &&
      (details.irrigation_efficiency ||
        details.water_source_type ||
        details.water_quality_ph ||
        details.water_allocation_acre_feet)
  );

  const hasConservationData = Boolean(
    details &&
      (details.cover_crop_management ||
        details.crop_rotation_pattern ||
        details.pest_management_strategy ||
        details.fertilization_program ||
        details.sustainability_practices)
  );

  const hasContact = Boolean(
    parcel?.contact_person || parcel?.contact_email || parcel?.contact_phone
  );

  // Show the boundary nudge when the parcel has no drawn field boundary
  const showBoundaryNudge =
    canWrite &&
    !boundaryNudgeDismissed &&
    !!parcel &&
    (!parcel.polygon || parcel.polygon.length < 3);

  const cropLabel = formatDisplayValue(parcel?.primary_crop || parcel?.crop_type);
  // 'US', not 'METRIC'. The ICP is Californian orchards and every certifier form, PUR filing
  // and land record they touch is in acres; the page was leading with hectares.
  const areaLabel = parcel?.area ? formatAreaWithBothUnits(parcel.area, 'US') : null;

  return (
    <StandardPage
      showBackButton
      onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
      <VStack gap={{ base: 5, md: 8 }} w="100%" align="stretch">
        {/* Boundary nudge — an action, so it stays above everything */}
        {showBoundaryNudge && (
          <Box
            w="100%"
            p={{ base: 3, md: 4 }}
            bg="blue.50"
            border="1px solid"
            borderColor="blue.200"
            borderRadius="xl">
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align={{ base: 'stretch', md: 'center' }}
              gap={3}>
              <HStack gap={2} flex="1" align="flex-start">
                <Icon as={FaMapMarkedAlt} color="blue.500" boxSize={4} mt={0.5} flexShrink={0} />
                <Text fontSize="sm" color="blue.800">
                  {intl.formatMessage({ id: 'parcel.skipBoundary.nudgeMessage' })}
                </Text>
              </HStack>
              <HStack gap={1} justify={{ base: 'flex-end', md: 'initial' }} flexShrink={0}>
                <StandardButton
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/change`)
                  }>
                  {intl.formatMessage({ id: 'parcel.skipBoundary.nudgeAction' })}
                </StandardButton>
                <CloseButton
                  aria-label={intl.formatMessage({ id: 'parcel.skipBoundary.nudgeDismiss' })}
                  color="blue.600"
                  onClick={dismissBoundaryNudge}
                />
              </HStack>
            </Flex>
          </Box>
        )}

        {/* ── PAGE HEADER — not a card ─────────────────────────────────────────── */}
        <Box w="100%">
          <Flex direction="row" justify="space-between" align="flex-start" gap={3}>
            <VStack align="flex-start" gap={1} minW={0}>
              <Heading as="h1" size={{ base: 'lg', md: 'xl' }} color="gray.800">
                {parcel?.name}
              </Heading>
              {establishment?.name && (
                <Text fontSize="sm" color="gray.500">
                  {establishment.name}
                </Text>
              )}
              <PageHeaderMeta
                items={[
                  areaLabel,
                  cropLabel || null,
                  parcel?.unique_code
                    ? intl.formatMessage(
                        { id: 'parcel.codeMeta', defaultMessage: 'Code {code}' },
                        { code: parcel.unique_code }
                      )
                    : null,
                  establishment?.zone || null
                ]}
              />
              <HStack gap={2} flexWrap="wrap" pt={1}>
                <Badge variant="subtle" borderRadius="full" fontSize="xs">
                  {intl.formatMessage({ id: 'app.active' })}
                </Badge>
                {/* NEUTRAL, not brand green. These are classifications, not approvals — and
                    `colorScheme` is inert on Badge, so the old purple/orange/cyan/teal chips
                    all rendered the same green as "Active" anyway. */}
                {parcel?.carbon_calculation_enabled && (
                  <Badge variant="neutral" borderRadius="full" fontSize="xs">
                    <HStack gap={1}>
                      <Icon as={FaLeaf} boxSize={3} />
                      <Text>{intl.formatMessage({ id: 'parcel.carbonTracking' })}</Text>
                    </HStack>
                  </Badge>
                )}
                {/* Was "USDA Compliant" — a compliance ASSERTION driven by a locally computed
                    `usda_compliance_eligible` flag, not a USDA Organic Integrity Database
                    match. Relabelled to what the flag actually measures: a farmer reading
                    "compliant" here could walk into an inspection believing a determination
                    had been made. Only the certifier makes that call. */}
                {parcel?.usda_compliance_eligible && (
                  <Badge variant="neutral" borderRadius="full" fontSize="xs">
                    {intl.formatMessage({
                      id: 'parcel.usdaReportingReady',
                      defaultMessage: 'Meets USDA reporting fields'
                    })}
                  </Badge>
                )}
                {/* The transparency SCORE badge used to sit here. Removed 2026-08-07 — see
                    the file docstring.

                    Its "Consumer Ready" sibling followed on 2026-09-09, with
                    `Parcel.is_transparency_ready()` behind it. Same artefact, one bit instead
                    of seven: "description AND (practices OR photos)" over the operation's own
                    self-reported text, printed as a verdict. Retiring the score as a CONCEPT
                    means the boolean goes too — a grade with the number filed off is still a
                    grade. What a producer surface may show is a COUNT or a checklist naming
                    the specific missing document; `application_missing` above does that. */}
              </HStack>
            </VStack>
            {canWrite && (
              <StandardButton
                variant="outline"
                size="sm"
                leftIcon={<Icon as={FaEdit} />}
                onClick={() =>
                  navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/change`)
                }
                flexShrink={0}
                w="auto">
                {intl.formatMessage({ id: 'app.edit' })}
              </StandardButton>
            )}
          </Flex>
          {parcel?.description && (
            <Text mt={3} color="gray.600" fontSize="sm" lineHeight="1.7">
              {parcel.description}
            </Text>
          )}
        </Box>

        {/* Photo strip — no card chrome */}
        {parcel?.images && parcel.images.length > 0 && (
          <Box w="100%">
            <StandardImageGallery
              images={parcel.images}
              title={intl.formatMessage({ id: 'parcel.photoGallery' })}
              variant="default"
              enablePreview={true}
              showImageCount={false}
              height={{ base: '160px', md: '200px' }}
              maxDisplayImages={4}
            />
          </Box>
        )}

        {/* ── §0 PUBLIC LOCATION ───────────────────────────────────────────────
            The permanent control, as opposed to the one-time consent prompt that lives on the
            parcel dashboard. Until 2026-08-31 `location_disclosure_level` had no UI anywhere,
            so a farm could neither see what its public page was publishing nor change it — while
            the marketing site described the level as their setting. A prompt that disappears
            once answered does not close that; this does. */}
        <StandardSection title={intl.formatMessage({ id: 'parcel.disclosureSetting.title' })}>
          <StandardCard variant="outline" padding={{ base: 0, md: 4 }} mb={0}>
            <LocationDisclosureSetting
              parcelId={parcelId as string}
              level={(parcel as any)?.location_disclosure_level}
              hasBoundary={Boolean((parcel as any)?.polygon)}
            />
          </StandardCard>
        </StandardSection>

        {/* ── §1 ORGANIC COMPLIANCE (7 CFR 205.202) ────────────────────────────
            Promoted from positions 11-13. §205.202 is written about LAND, which makes this
            the parcel's reason to exist for a certifier. */}
        <StandardSection
          title={intl.formatMessage({
            id: 'parcel.section.organicCompliance',
            defaultMessage: 'Organic compliance'
          })}
          description={intl.formatMessage({
            id: 'parcel.section.organicComplianceHelp',
            defaultMessage:
              'The land records your certifier reviews for this field — use history, boundaries and prior management.'
          })}>
          <VStack align="stretch" gap={4} w="100%">
            {parcelId && <FieldHistorySection parcelId={parcelId} canWrite={canWrite} />}

            {parcelId && currentCompany?.id && farmId && (
              <ParcelComplianceCard
                companyId={currentCompany.id}
                farmId={farmId}
                parcelId={parcelId}
                parcel={parcel}
                canWrite={canWrite}
              />
            )}

            {parcelId && currentCompany?.id && farmId && (
              <LandownerAffidavitSection
                companyId={currentCompany.id}
                farmId={farmId}
                parcelId={parcelId}
                canWrite={canWrite}
              />
            )}

            {/* USDA form #25. Sits beside the landowner affidavit because both are
                third-party attestations about this parcel, but they have different signers:
                prior manager vs neighbour. */}
            {parcelId && currentCompany?.id && farmId && (
              <AdjoiningLandSection
                companyId={currentCompany.id}
                farmId={farmId}
                parcelId={parcelId}
                canWrite={canWrite}
              />
            )}
          </VStack>
        </StandardSection>

        {/* §2 ("Consumer story") DELETED 2026-08-07 — it was a duplicate, twice over.
            `get_transparency_description()` returns `self.description`, the exact string the
            page header already renders. `get_sustainability_practices()` falls back to
            `cover_crop_management`, which the Conservation practices group below already
            shows as "Cover crops". So the section reprinted the description under a second
            heading and risked reprinting the cover-crop text under a third.

            None of it reached a shopper either: `_build_public_parcel` publishes only
            name / area / polygon / map_metadata / location_disclosure_level. The raw
            `sustainability_practices` key now lives with the other agronomy in §3, which is
            what it is — an input to the record, not consumer copy. */}
        {/* ── §2 PARCEL DETAILS ────────────────────────────────────────────────
            Was seven cards: Basic Information, Location, Contact, Soil Health, Water
            Management, Conservation Practices, Company & Establishment. */}
        <StandardSection
          title={intl.formatMessage({
            id: 'parcel.section.details',
            defaultMessage: 'Parcel details'
          })}>
          <StandardCard variant="outline" padding={{ base: 0, md: 4 }} mb={0}>
            <VStack gap={{ base: 6, md: 7 }} align="stretch" divider={<Divider />}>
              <FieldGroup label={intl.formatMessage({ id: 'parcel.basicInformation' })}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={4}>
                  <InfoRow
                    icon={FaRulerCombined}
                    label={intl.formatMessage({ id: 'app.area' })}
                    value={areaLabel}
                  />
                  <InfoRow
                    icon={FaSeedling}
                    label={intl.formatMessage({ id: 'parcel.primaryCrop' })}
                    value={cropLabel}
                  />
                  <InfoRow
                    icon={FaHashtag}
                    label={intl.formatMessage({ id: 'parcel.uniqueCode' })}
                    value={parcel?.unique_code}
                  />
                </SimpleGrid>
              </FieldGroup>

              <FieldGroup label={intl.formatMessage({ id: 'parcel.locationDetails' })}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={4}>
                  {/* Street only. The old formatLocation() appended the FARM's city, state
                      and country, so this row repeated location already shown in the header
                      and on the farm profile. */}
                  <InfoRow
                    icon={FaMapMarkerAlt}
                    label={intl.formatMessage({ id: 'app.address' })}
                    value={parcel?.address}
                  />
                  <InfoRow
                    icon={FaGlobeAmericas}
                    label={intl.formatMessage({ id: 'app.coordinates' })}
                    value={
                      parcel?.latitude && parcel?.longitude
                        ? `${parseFloat(parcel.latitude.toString()).toFixed(6)}, ${parseFloat(
                            parcel.longitude.toString()
                          ).toFixed(6)}`
                        : undefined
                    }
                  />
                  <InfoRow
                    icon={FaMountain}
                    label={intl.formatMessage({ id: 'parcel.elevation' })}
                    value={parcel?.elevation ? `${parcel.elevation} ft` : undefined}
                  />
                  <InfoRow
                    icon={MdLocationOn}
                    label={intl.formatMessage({ id: 'app.zone' })}
                    value={establishment?.zone}
                  />
                </SimpleGrid>
              </FieldGroup>

              {hasContact && (
                <FieldGroup label={intl.formatMessage({ id: 'app.contactInformation' })}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={4}>
                    <InfoRow
                      icon={FaUser}
                      label={intl.formatMessage({ id: 'parcel.contactPerson' })}
                      value={parcel?.contact_person}
                    />
                    <InfoRow
                      icon={FaEnvelope}
                      label={intl.formatMessage({ id: 'app.email' })}
                      value={parcel?.contact_email}
                      type="email"
                    />
                    <InfoRow
                      icon={FaPhone}
                      label={intl.formatMessage({ id: 'app.phone' })}
                      value={parcel?.contact_phone}
                      type="phone"
                    />
                  </SimpleGrid>
                </FieldGroup>
              )}

              {hasSoilData && (
                <FieldGroup label={intl.formatMessage({ id: 'parcel.soilHealth' })}>
                  {/* Definition rows, not four tinted stat tiles in orange/green/blue/purple.
                      A pH reading is a measurement; the hue carried no meaning. */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={4}>
                    <InfoRow
                      icon={FaFlask}
                      label={intl.formatMessage({ id: 'parcel.phLevel' })}
                      value={details?.soil_ph ? parseFloat(details.soil_ph).toFixed(1) : undefined}
                    />
                    <InfoRow
                      icon={FaLeaf}
                      label={intl.formatMessage({ id: 'parcel.organicMatter' })}
                      value={
                        details?.soil_organic_matter
                          ? `${parseFloat(details.soil_organic_matter).toFixed(1)}%`
                          : undefined
                      }
                    />
                    <InfoRow
                      icon={FaFlask}
                      label={intl.formatMessage({ id: 'parcel.nitrogenPpm' })}
                      value={
                        details?.soil_nitrogen
                          ? parseFloat(details.soil_nitrogen).toFixed(0)
                          : undefined
                      }
                    />
                    <InfoRow
                      icon={FaFlask}
                      label={intl.formatMessage({ id: 'parcel.phosphorusPpm' })}
                      value={
                        details?.soil_phosphorus
                          ? parseFloat(details.soil_phosphorus).toFixed(0)
                          : undefined
                      }
                    />
                  </SimpleGrid>
                </FieldGroup>
              )}

              {hasWaterData && (
                <FieldGroup label={intl.formatMessage({ id: 'parcel.waterManagement' })}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={4}>
                    <InfoRow
                      icon={FaTint}
                      label={intl.formatMessage({ id: 'parcel.irrigationEfficiency' })}
                      value={
                        details?.irrigation_efficiency
                          ? `${parseFloat(details.irrigation_efficiency).toFixed(0)}%`
                          : undefined
                      }
                    />
                    <InfoRow
                      icon={FaTint}
                      label={intl.formatMessage({ id: 'parcel.waterSource' })}
                      value={formatDisplayValue(details?.water_source_type)}
                    />
                    <InfoRow
                      icon={FaTint}
                      label={intl.formatMessage({ id: 'parcel.waterPh' })}
                      value={
                        details?.water_quality_ph
                          ? parseFloat(details.water_quality_ph).toFixed(1)
                          : undefined
                      }
                    />
                    <InfoRow
                      icon={FaTint}
                      label={intl.formatMessage({ id: 'parcel.waterAllocation' })}
                      value={
                        details?.water_allocation_acre_feet
                          ? `${parseFloat(details.water_allocation_acre_feet).toFixed(1)} acre-feet`
                          : undefined
                      }
                    />
                  </SimpleGrid>
                </FieldGroup>
              )}

              {hasConservationData && (
                <FieldGroup label={intl.formatMessage({ id: 'parcel.conservationPractices' })}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={4}>
                    <InfoRow
                      icon={FaSeedling}
                      label={intl.formatMessage({ id: 'parcel.coverCrops' })}
                      value={details?.cover_crop_management}
                    />
                    <InfoRow
                      icon={FaLeaf}
                      label={intl.formatMessage({ id: 'parcel.cropRotation' })}
                      value={details?.crop_rotation_pattern}
                    />
                    <InfoRow
                      icon={FaChartLine}
                      label={intl.formatMessage({ id: 'parcel.pestManagement' })}
                      value={details?.pest_management_strategy}
                    />
                    <InfoRow
                      icon={MdEco}
                      label={intl.formatMessage({ id: 'parcel.fertilizationProgram' })}
                      value={details?.fertilization_program}
                    />
                    {/* The RAW agricultural_details key, not `parcel.sustainability_practices`
                        — that serializer getter falls back to `cover_crop_management`, which
                        would reprint the Cover crops row directly above. */}
                    <InfoRow
                      icon={FaLeaf}
                      label={intl.formatMessage({ id: 'parcel.keySustainabilityPractices' })}
                      value={details?.sustainability_practices}
                    />
                  </SimpleGrid>
                </FieldGroup>
              )}

              {/* A "View transparency details" button lived here and navigated to
                  `/admin/dashboard/farm/:farmId/transparency`. That route has been
                  `RedirectToFarmHome` since the transparency dashboard was unrouted, so the
                  button bounced the grower to farm home — whose own code comment then pointed
                  them back at the transparency page they had just tried to open. Removed
                  2026-08-11 along with that page. */}
              {(currentCompany?.name || establishment?.name) && (
                <FieldGroup label={intl.formatMessage({ id: 'parcel.companyAndEstablishment' })}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={4}>
                    <InfoRow
                      icon={FaBuilding}
                      label={intl.formatMessage({ id: 'app.company' })}
                      value={currentCompany?.name}
                    />
                    <InfoRow
                      icon={FaUsers}
                      label={intl.formatMessage({ id: 'app.establishment' })}
                      value={establishment?.name}
                    />
                  </SimpleGrid>
                </FieldGroup>
              )}
            </VStack>
          </StandardCard>
        </StandardSection>
      </VStack>
    </StandardPage>
  );
}

export default ProfileParcel;
