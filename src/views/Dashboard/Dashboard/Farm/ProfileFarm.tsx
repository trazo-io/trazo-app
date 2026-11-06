/**
 * Farm profile — the producer's operation-level page.
 *
 * WHAT THIS PAGE IS FOR. The farm DASHBOARD answers "what is due and what is outstanding"
 * (deadlines → readiness → records, `views/Dashboard/Dashboard/index.tsx`). This page keeps
 * the ACTIONS: share a link with your certifier, generate the dossier, file the PUR — plus
 * the operation-level facts those artifacts are built from.
 *
 * The standalone "Inspection readiness" panel was removed 2026-08-04: it rendered the
 * operation blockers a second time (CertifierLinkCard already shows them inline, in
 * variant="preshare", to explain why sharing is blocked) and its badge counted only
 * `blockers` while the dashboard counted season findings, so the same farm read "1 to fix"
 * here and "3" there with nothing explaining that the two measured different scopes.
 * Readiness now lives in ONE place, `CertifierReadinessCard` on the dashboard.
 *
 * STRUCTURE (rebuilt 2026-08-07). This was 17 stacked elevated cards in no particular order,
 * with the two highest-value certifier artifacts at positions 2 and 12, separated by nine
 * descriptive cards (October plan §10.4). It is now three sections:
 *
 *   header (no card)   identity, one meta line, Edit
 *   §1 certifier       share link · audit dossier · CA PUR      ← what you came here to do
 *   §2 compliance      certifications · operation attestations
 *   §3 farm details    one card, grouped definition lists       ← the facts behind them
 *
 * HIERARCHY COMES FROM THE SECTION HEADINGS AND SPACING, NOT FROM CARD CHROME. Every card
 * on this page renders identically — same faint shadow, 15px radius, 1px hairline — because
 * the protected `trazo-dashboard-styles.css` forces all three with `!important` on every
 * `.trazo-card`, which makes `StandardCard`'s `variant` prop inert (see its docstring). The
 * `variant` values below are kept as intent, not as something that paints.
 *
 * Measured rhythm at 1440px: every card left 329 / right 1386 / width 1057; 16px card→card,
 * 16px section-heading→first card, 32px section→section. Card-to-card spacing comes from the
 * parent stack's `gap` alone — a global rule zeroes margins on stack children, so
 * StandardCard's own `mb` is inert here.
 */
import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Flex,
  Heading,
  Text,
  Icon,
  Badge,
  Link,
  FormLabel,
  Divider,
  useDisclosure,
  useToast,
  Center
} from '@chakra-ui/react';
import {
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaFacebook,
  FaInstagram,
  FaUsers,
  FaEye,
  FaLeaf,
  FaEdit,
  FaPlus,
  FaTractor,
  FaCalendar,
  FaSeedling,
  FaTint,
  FaFileAlt,
  FaShieldAlt,
  FaTrash
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useUserRole } from 'hooks/useUserRole';
import { useIntl } from 'react-intl';
import {
  StandardCard,
  StandardButton,
  StandardPage,
  StandardPageLoading,
  StandardSection,
  StandardInput,
  StandardAlert,
  PAGE_TITLE
} from 'components/Design/StandardComponents';
import { InfoRow, FieldGroup, PageHeaderMeta, FieldList } from 'components/Design/ProfileField';
import { useGetFarmQuery, useEditFarmMutation } from 'store/api/companyApi';
import { StandardImageGallery } from 'components/ImageGallery';
import CertificationManager from 'components/Certifications/CertificationManager';
import OperationAuditExportButton from './OperationAuditExportButton';
import PURExportModal from 'components/PURExport/PURExportModal';
import { normalizeState } from 'utils/usStates';
import { fileNameFromUrl } from 'utils/fileNameFromUrl';
import CertifierLinkCard from 'components/Certifications/CertifierLinkCard';
import SupplierRegisterSection from './SupplierRegisterSection';
import BrandOwnerRegisterSection from './BrandOwnerRegisterSection';
import EquipmentRegisterSection from './EquipmentRegisterSection';
import { ComplianceExportsGuard } from 'components/Guards/ComplianceExportsGuard';
import { useTour } from 'hooks/useTour';
import { apiErrorMessage } from 'utils/apiErrorMessage';

// Type definitions
interface RootState {
  company: {
    currentCompany: {
      id: string;
      name: string;
      website?: string;
      facebook?: string;
      instagram?: string;
    };
  };
}

// Utility function to format snake_case values to Title Case
const formatDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

function ProfileFarm() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { canWrite } = useUserRole();
  const { farmId } = useParams();

  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);

  // Certifications + the fraud-prevention plan. Writers only: both steps describe filing
  // something, and the checklist's "Upload your Fraud Prevention Plan" item lands here.
  useTour('farm-profile', { enabled: canWrite });

  const [editFarm, { isLoading: isSavingOfpp }] = useEditFarmMutation();
  const [ofppEditMode, setOfppEditMode] = useState(false);
  const [ofppResponsible, setOfppResponsible] = useState('');
  const [ofppDate, setOfppDate] = useState('');
  const [ofppFile, setOfppFile] = useState<File | null>(null);
  const [purModalOpen, setPurModalOpen] = useState(false);
  // Owned here so the "Add certification" button can sit in the card header instead of
  // CertificationManager painting a second header inside an already-titled card.
  const addCertDisclosure = useDisclosure();

  const {
    data: establishmentData,
    error,
    isLoading,
    isUninitialized
  } = useGetFarmQuery(
    {
      companyId: currentCompany?.id,
      farmId
    },
    {
      skip: !farmId || currentCompany?.id === undefined
    }
  );

  // F25 — three states, never two. `has_split_operation` is a boolean and cannot tell a
  // declared "no" apart from a column nobody has touched, so the backend resolves the
  // declaration once (certifications/services/split_operation.py) and sends it here. The
  // legacy fallback keeps a pre-binding profile declaration visible on farms that made one.
  const splitDeclaration: 'yes' | 'no' | 'unanswered' =
    (establishmentData?.split_operation_declaration as 'yes' | 'no' | 'unanswered') ??
    (establishmentData?.has_split_operation ? 'yes' : 'unanswered');

  const getCropsGrown = () => {
    if (!establishmentData?.crops_grown) return [];
    if (Array.isArray(establishmentData.crops_grown)) {
      return establishmentData.crops_grown;
    }
    return [];
  };

  const parseJsonList = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getWaterSources = () => parseJsonList(establishmentData?.water_sources);
  const getIrrigationMethods = () => parseJsonList(establishmentData?.irrigation_methods);
  /**
   * `soil_types` is a legacy COLUMN NAME. The farm form asks for PRACTICES ("Cover cropping,
   * Compost application, No-till") and writes them into this column, and every surface labels
   * it "Soil health practices". The old `soil_health_practices` fallback read a field that
   * exists in no serializer and no schema, so it never fired — dropped 2026-08-07 along with
   * the seed data that put soil texture classes here and made the label read
   * "Soil health practices: Sandy Loam, Clay Loam".
   */
  const getSoilHealthPractices = () => parseJsonList(establishmentData?.soil_types);

  /** The coarse "City, State" a shopper sees — distinct from the full street address. */
  const cityState = [establishmentData?.city, establishmentData?.state].filter(Boolean).join(', ');

  const handleSaveOfpp = async () => {
    try {
      const formData = new FormData();
      formData.append('ofpp_responsible_person', ofppResponsible);
      if (ofppDate) formData.append('fraud_prevention_plan_date', ofppDate);
      if (ofppFile) {
        formData.append('fraud_prevention_plan_document', ofppFile);
        formData.append('fraud_prevention_plan_uploaded', 'true');
      }
      await editFarm({
        companyId: currentCompany?.id,
        farmId,
        establishmentData: formData
      }).unwrap();
      toast({
        title: intl.formatMessage({
          id: 'farm.soe.saved',
          defaultMessage: 'Organic fraud prevention plan updated'
        }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      setOfppEditMode(false);
      setOfppFile(null);
    } catch (err: unknown) {
      toast({
        title: intl.formatMessage({
          id: 'farm.soe.saveFailed',
          defaultMessage: 'Failed to save compliance data'
        }),
        description: apiErrorMessage(err) ?? undefined,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  if (isLoading || isUninitialized) {
    return (
      <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  if (error || !establishmentData) {
    return (
      <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
        <Center py={20}>
          <Text color="red.700">{intl.formatMessage({ id: 'establishment.errorLoading' })}</Text>
        </Center>
      </StandardPage>
    );
  }

  const isCalifornia = normalizeState(establishmentData?.state) === 'CA';
  const crops = getCropsGrown();
  const parcelCount = Array.isArray(establishmentData.parcels)
    ? establishmentData.parcels.length
    : 0;

  /** Tooltip on every consumer-visibility marker. One string, many rows. */
  const publicLabel = intl.formatMessage({
    id: 'farm.details.publicMarker',
    defaultMessage: 'Shoppers see this when they scan a QR code from this farm'
  });

  return (
    <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
      <VStack gap={{ base: 5, md: 8 }} w="100%" align="stretch">
        {/* ── PAGE HEADER — deliberately not a card ─────────────────────────────────
            The old identity card wrapped an initials Avatar (which rendered "C(" for
            "Coastal Valleys Farm (DEMO)"), duplicated its entire layout for mobile and
            desktop, and carried a purple `farming_method` badge — a self-declared
            "Sustainable" styled as a trust chip, next to "Active". The backend refuses to
            publish that field for exactly that reason; it is a plain row in §3 now. */}
        <Box w="100%">
          {/* Always a row. Stacking on mobile made Edit a 351px full-width button sitting
              BETWEEN the badges and the description — a secondary action with primary-CTA
              weight, interrupting the identity block. Compact and top-right at every width,
              with the title wrapping beside it. */}
          <Flex direction="row" justify="space-between" align="flex-start" gap={3}>
            <VStack align="flex-start" gap={1} minW={0}>
              <Heading as="h1" {...PAGE_TITLE}>
                {establishmentData.name}
              </Heading>
              {currentCompany?.name && (
                <Text fontSize="sm" color="gray.500">
                  {currentCompany.name}
                </Text>
              )}
              {cityState && (
                <Text fontSize="sm" color="gray.600">
                  {cityState}
                </Text>
              )}
              {/* Replaces the "Quick Stats" card — three tiles in green, purple and orange
                  whose acres and founding year were verbatim duplicates of the Operations
                  card two cards below. */}
              <PageHeaderMeta
                items={[
                  establishmentData.total_acreage
                    ? intl.formatMessage(
                        {
                          id: 'farm.meta.acres',
                          defaultMessage: '{count, plural, one {# acre} other {# acres}}'
                        },
                        { count: establishmentData.total_acreage }
                      )
                    : null,
                  establishmentData.year_established
                    ? intl.formatMessage(
                        { id: 'farm.meta.established', defaultMessage: 'est. {year}' },
                        { year: establishmentData.year_established }
                      )
                    : null,
                  parcelCount
                    ? intl.formatMessage(
                        {
                          id: 'farm.meta.parcels',
                          defaultMessage: '{count, plural, one {# parcel} other {# parcels}}'
                        },
                        { count: parcelCount }
                      )
                    : null,
                  crops.length
                    ? intl.formatMessage(
                        {
                          id: 'farm.meta.crops',
                          defaultMessage: '{count, plural, one {# crop} other {# crops}}'
                        },
                        { count: crops.length }
                      )
                    : null
                ]}
              />
              <HStack gap={2} flexWrap="wrap" pt={1}>
                {establishmentData.is_active !== false && (
                  <Badge colorScheme="green" variant="subtle" borderRadius="full" fontSize="xs">
                    {intl.formatMessage({ id: 'app.active' })}
                  </Badge>
                )}
                {/* `neutral`, not `colorScheme="gray"` — the Badge theme's variants all
                    hardcode green and ignore colorScheme, so a classification badge rendered
                    with the same weight as the "Active" status beside it. */}
                {(establishmentData.establishment_type || establishmentData.type) && (
                  <Badge variant="neutral" borderRadius="full" fontSize="xs">
                    {formatDisplayValue(
                      establishmentData.establishment_type || establishmentData.type
                    )}
                  </Badge>
                )}
              </HStack>
            </VStack>
            {canWrite && (
              <StandardButton
                variant="outline"
                size="sm"
                leftIcon={<Icon as={FaEdit} />}
                onClick={() => navigate(`/admin/dashboard/farm/${farmId}/change`)}
                flexShrink={0}
                w="auto">
                {intl.formatMessage({ id: 'app.edit' })}
              </StandardButton>
            )}
          </Flex>
          {establishmentData.description && (
            <Text mt={3} color="gray.600" fontSize="sm" lineHeight="1.7">
              {establishmentData.description}
            </Text>
          )}
        </Box>

        {/* Photo strip — no card chrome, no title. The images are their own label. */}
        {establishmentData.images && establishmentData.images.length > 0 && (
          <Box w="100%">
            <StandardImageGallery
              images={establishmentData.images}
              title={intl.formatMessage({ id: 'establishment.establishmentPhotos' })}
              variant="default"
              enablePreview={true}
              showImageCount={false}
              height={{ base: '160px', md: '200px' }}
              maxDisplayImages={4}
            />
          </Box>
        )}

        {/* ── §1 FOR YOUR CERTIFIER ────────────────────────────────────────────────
            Promoted here from positions 2 and 12 (October plan §10.4). These are the
            artifacts a farmer opens this page to produce; everything below is reference. */}
        <StandardSection
          title={intl.formatMessage({
            id: 'farm.section.forYourCertifier',
            defaultMessage: 'For your certifier'
          })}
          description={intl.formatMessage({
            id: 'farm.section.forYourCertifierHelp',
            defaultMessage:
              'Share your records or generate the packet your certifier asks for at renewal.'
          })}>
          {/* The Starter/Compliance boundary, drawn once for the whole section instead of on
              each button — so a farmer sees a state of the page rather than two controls that
              fail on click, and a third artifact added below inherits it automatically.
              (Backend gate: `subscriptions/gating.py`.)

              The certifier-link card sits OUTSIDE the guard; only the export group is inside.
              Everything else on the farm profile stays available on Starter.

              ONE parent stack, and spacing comes from its `gap` — never a margin on a child the
              guard may replace. The first cut put `mt={4}` on the inner VStack, which is exactly
              what the guard swaps out on Starter, so the upsell butted against the card above it
              with a 0px gap on the free tier and 16px on the paid one. Parent gap is this page's
              documented mechanism (see the file header). */}
          <VStack align="stretch" gap={4} w="100%">
            {/* OUTSIDE the guard on purpose. The backend gates only link CREATION — a farm that
                lapses to Starter must still be able to see and REVOKE links its certifier already
                holds, or lapsing strands live tokens the grower cannot withdraw. The card gates
                its own create half. */}
            {currentCompany?.id && farmId && (
              <CertifierLinkCard
                companyId={String(currentCompany.id)}
                farmId={String(farmId)}
                canWrite={canWrite}
              />
            )}

            <ComplianceExportsGuard>
              <VStack align="stretch" gap={4} w="100%">
                <OperationAuditExportButton companyId={currentCompany?.id} farmId={farmId} />

                {/* CA-only: the PUR is a California filing (3 CCR 6626) and the export embeds CA
                    county codes, so offering it to an out-of-state farm produced a CSV titled
                    "California Pesticide Use Report" naming a non-CA county. The backend 404s
                    for non-CA farms; this keeps the button off the page too. */}
                {canWrite && isCalifornia && (
                  <StandardCard
                    title={intl.formatMessage({ id: 'app.pur.complianceReports' })}
                    variant="elevated"
                    padding={{ base: 0, md: 4 }}
                    mb={0}>
                    <HStack
                      justify="space-between"
                      align={{ base: 'flex-start', smd: 'center' }}
                      flexDirection={{ base: 'column', smd: 'row' }}
                      gap={3}>
                      <VStack align="flex-start" gap={0.5}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                          {intl.formatMessage({ id: 'app.pur.title' })}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {intl.formatMessage({ id: 'app.pur.cardSubtitle' })}
                        </Text>
                      </VStack>
                      <StandardButton
                        variant="outline"
                        size="sm"
                        leftIcon={<Icon as={FaFileAlt} />}
                        onClick={() => setPurModalOpen(true)}
                        w={{ base: 'full', smd: 'auto' }}>
                        {intl.formatMessage({ id: 'app.pur.generate' })}
                      </StandardButton>
                    </HStack>
                  </StandardCard>
                )}
              </VStack>
            </ComplianceExportsGuard>
          </VStack>
        </StandardSection>

        {/* ── §2 ORGANIC COMPLIANCE ──────────────────────────────────────────────── */}
        <StandardSection
          title={intl.formatMessage({
            id: 'farm.section.organicCompliance',
            defaultMessage: 'Organic compliance'
          })}>
          <VStack align="stretch" gap={4} w="100%">
            <Box data-tour="farm-certifications" w="full">
              <StandardCard
                title={intl.formatMessage({ id: 'certification.manage.title' })}
                variant="outline"
                padding={{ base: 0, md: 4 }}
                mb={0}
                headerAction={
                  canWrite ? (
                    <StandardButton
                      size="sm"
                      leftIcon={<Icon as={FaPlus} />}
                      onClick={addCertDisclosure.onOpen}>
                      {intl.formatMessage({ id: 'certification.manage.add' })}
                    </StandardButton>
                  ) : undefined
                }>
                <CertificationManager
                  companyId={String(currentCompany?.id ?? '')}
                  farmId={String(farmId ?? '')}
                  hideHeader
                  addDisclosure={addCertDisclosure}
                />
              </StandardCard>
            </Box>

            {/* Seed and planting-stock suppliers and their organic certificates. Writers only, like
                the server: a supplier list is commercial data a viewer does not read. */}
            {canWrite && currentCompany?.id && farmId && (
              <SupplierRegisterSection
                companyId={String(currentCompany.id)}
                farmId={String(farmId)}
                state={establishmentData?.state ?? undefined}
              />
            )}

            {/* Companies whose brands this farm packs into (CCOF G7.0 C, OTCO C8 8.3, WSDA N 6-7).
                Writers only, like the supplier register: commercial data. */}
            {canWrite && currentCompany?.id && farmId && (
              <BrandOwnerRegisterSection
                companyId={String(currentCompany.id)}
                farmId={String(farmId)}
                state={establishmentData?.state ?? undefined}
              />
            )}

            {/* Equipment that contacts organic crops (CCOF G6.0 C, OTCO C9 9.1, WSDA 2121 I). Writers
                only, like the server. */}
            {canWrite && currentCompany?.id && farmId && (
              <EquipmentRegisterSection
                companyId={String(currentCompany.id)}
                farmId={String(farmId)}
              />
            )}

            {/* SOE + Split merged. Both are operation-level attestations a certifier reads
                together — §205.201(a)(3) fraud prevention and §205.272 commingling — and as
                two separate cards each ended with its own blue regulatory note, so the page
                showed the same shape of disclaimer twice in a row. One card, two groups,
                one note. */}
            <Box data-tour="farm-soe-compliance" w="full">
              <StandardCard
                title={intl.formatMessage({
                  id: 'farm.attestations.title',
                  defaultMessage: 'Operation attestations'
                })}
                subtitle={intl.formatMessage({
                  id: 'farm.attestations.subtitle',
                  defaultMessage: 'Statements your certifier expects on file for the operation.'
                })}
                variant="outline"
                padding={{ base: 0, md: 4 }}
                mb={0}>
                <VStack gap={{ base: 6, md: 7 }} align="stretch" divider={<Divider />}>
                  {/* ---- Organic fraud prevention plan (7 CFR 205.201(a)(3)) ---- */}
                  <FieldGroup
                    label={intl.formatMessage({ id: 'farm.soe.title' })}
                    cfr="7 CFR 205.201(a)(3)"
                    action={
                      canWrite && !ofppEditMode ? (
                        <StandardButton
                          variant="ghost"
                          size="sm"
                          leftIcon={<Icon as={FaEdit} />}
                          onClick={() => {
                            setOfppResponsible(establishmentData.ofpp_responsible_person || '');
                            setOfppDate(establishmentData.fraud_prevention_plan_date || '');
                            setOfppEditMode(true);
                          }}>
                          {intl.formatMessage({ id: 'app.edit' })}
                        </StandardButton>
                      ) : undefined
                    }>
                    <VStack gap={4} align="stretch">
                      {/* Three states, not two (2026-08-10): a suspicious
                          filename (invoice/receipt heuristic) previously showed
                          GREEN "Plan Uploaded" while the audit export refused
                          the same file. */}
                      <HStack gap={3} align="center">
                        <Icon
                          as={FaShieldAlt}
                          color={
                            establishmentData.ofpp_filename_suspicious
                              ? 'orange.500'
                              : establishmentData.ofpp_on_file
                              ? 'green.500'
                              : 'yellow.500'
                          }
                          boxSize={5}
                        />
                        {/*
                          Semantic VARIANTS, not a computed colorScheme.
                          - `orange` and `yellow` are not Trazo palettes. The theme defines
                            `amber` and no orange, so `colorScheme="orange"` silently resolved
                            to CHAKRA's orange — a foreign accent.
                          - `variant="subtle"` inherits the base `textTransform: capitalize`,
                            which is why the string "Plan on file" rendered as "Plan On File",
                            and why es-419's "Plan registrado" would title-case wrongly. The
                            semantic variants set `textTransform: none` and render as authored.
                          A missing plan is outstanding work (warning); a filename that does not
                          look like an OFPP is a data-integrity flag (danger).
                        */}
                        <Badge
                          variant={
                            establishmentData.ofpp_filename_suspicious
                              ? 'danger'
                              : establishmentData.ofpp_on_file
                              ? 'subtle'
                              : 'warning'
                          }
                          textTransform="none"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize={{ base: 'xs', md: 'sm' }}>
                          {/* 🔴 2026-08-19: these three read `fraud_prevention_plan_uploaded`, the raw
                              upload boolean, so a farm whose OFPP is the completed OSP module
                              G2.0 was shown a yellow "Plan Missing" here while the readiness
                              card had cleared the item and the certifier packet printed
                              "Uploaded — authored in Trazo (OSP module G2.0)". Three surfaces,
                              one fact, two answers. `ofpp_on_file` is the resolved property
                              (upload OR module) that the packet and readiness service already
                              use; it was on this serializer the whole time. The upload CTA
                              below deliberately still keys off the raw boolean — there really
                              is no document to view when the plan was authored in Trazo. */}
                          {establishmentData.ofpp_filename_suspicious
                            ? intl.formatMessage({ id: 'farm.soe.planSuspicious' })
                            : establishmentData.ofpp_on_file
                            ? intl.formatMessage({ id: 'farm.soe.planUploaded' })
                            : intl.formatMessage({ id: 'farm.soe.planMissing' })}
                        </Badge>
                      </HStack>
                      {establishmentData.ofpp_filename_suspicious && (
                        <Text fontSize="sm" color="red.700">
                          {intl.formatMessage({ id: 'farm.soe.planSuspiciousDetail' })}
                        </Text>
                      )}

                      {/* View mode */}
                      {!ofppEditMode && (
                        <VStack gap={3} align="stretch">
                          {!establishmentData.ofpp_on_file && canWrite && (
                            <Box
                              p={3}
                              bg="yellow.50"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="yellow.200">
                              <HStack
                                gap={3}
                                align={{ base: 'stretch', smd: 'center' }}
                                flexDirection={{ base: 'column', smd: 'row' }}>
                                <Text fontSize="sm" color="yellow.800" flex={1}>
                                  {intl.formatMessage({ id: 'farm.soe.uploadCta' })}
                                </Text>
                                <StandardButton
                                  size="sm"
                                  w={{ base: 'full', smd: 'auto' }}
                                  onClick={() => {
                                    setOfppResponsible(
                                      establishmentData.ofpp_responsible_person || ''
                                    );
                                    setOfppDate(establishmentData.fraud_prevention_plan_date || '');
                                    setOfppEditMode(true);
                                  }}>
                                  {intl.formatMessage({ id: 'farm.soe.uploadButton' })}
                                </StandardButton>
                              </HStack>
                            </Box>
                          )}
                          <FieldList columns={2}>
                            <InfoRow
                              layout="inline"
                              icon={FaUsers}
                              label={intl.formatMessage({ id: 'farm.soe.responsiblePerson' })}
                              value={establishmentData.ofpp_responsible_person}
                            />
                            <InfoRow
                              layout="inline"
                              icon={FaCalendar}
                              label={intl.formatMessage({ id: 'farm.soe.planDate' })}
                              value={establishmentData.fraud_prevention_plan_date}
                            />
                            {establishmentData.fraud_prevention_plan_document && (
                              <InfoRow
                                layout="inline"
                                icon={FaFileAlt}
                                label={intl.formatMessage({ id: 'farm.soe.documentLabel' })}
                                value={
                                  fileNameFromUrl(
                                    establishmentData.fraud_prevention_plan_document
                                  ) ||
                                  intl.formatMessage({
                                    id: 'farm.soe.viewDocument',
                                    defaultMessage: 'View document'
                                  })
                                }
                              />
                            )}
                          </FieldList>
                          {establishmentData.fraud_prevention_plan_document && (
                            <Link
                              href={establishmentData.fraud_prevention_plan_document}
                              isExternal
                              color="green.700"
                              fontWeight="medium"
                              fontSize="sm">
                              {intl.formatMessage({
                                id: 'farm.soe.viewDocument',
                                defaultMessage: 'View document'
                              })}
                            </Link>
                          )}
                        </VStack>
                      )}

                      {/* Edit mode */}
                      {ofppEditMode && (
                        <VStack gap={3} align="stretch">
                          <Box>
                            <FormLabel fontSize="sm" color="gray.700" fontWeight="semibold" mb={2}>
                              {intl.formatMessage({ id: 'farm.soe.responsiblePerson' })}
                            </FormLabel>
                            <StandardInput
                              value={ofppResponsible}
                              onChange={(e) => setOfppResponsible(e.target.value)}
                              placeholder={intl.formatMessage({
                                id: 'farm.soe.responsiblePersonPlaceholder'
                              })}
                            />
                          </Box>
                          <Box>
                            <FormLabel fontSize="sm" color="gray.700" fontWeight="semibold" mb={2}>
                              {intl.formatMessage({ id: 'farm.soe.planDate' })}
                            </FormLabel>
                            <StandardInput
                              type="date"
                              value={ofppDate}
                              onChange={(e) => setOfppDate(e.target.value)}
                            />
                          </Box>
                          <Box>
                            <FormLabel fontSize="sm" color="gray.700" fontWeight="semibold" mb={2}>
                              {intl.formatMessage({ id: 'farm.soe.documentLabel' })}
                            </FormLabel>
                            <Box
                              border="2px dashed"
                              borderColor={ofppFile ? 'green.400' : 'gray.300'}
                              borderRadius="lg"
                              bg={ofppFile ? 'green.50' : 'gray.50'}
                              p={4}
                              textAlign="center"
                              cursor="pointer"
                              _hover={{ borderColor: 'green.400', bg: 'green.50' }}
                              transition="all 0.2s"
                              onClick={() => document.getElementById('ofpp-file-input')?.click()}>
                              <input
                                id="ofpp-file-input"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                style={{ display: 'none' }}
                                onChange={(e) => setOfppFile(e.target.files?.[0] || null)}
                              />
                              {ofppFile ? (
                                <HStack justify="center" gap={2}>
                                  <Icon as={FaFileAlt} color="green.700" boxSize={4} />
                                  <Text fontSize="sm" color="green.700" fontWeight="medium">
                                    {ofppFile.name}
                                  </Text>
                                  <StandardButton
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setOfppFile(null);
                                    }}>
                                    <Icon as={FaTrash} boxSize={3} />
                                  </StandardButton>
                                </HStack>
                              ) : (
                                <VStack gap={1}>
                                  <Icon as={FaFileAlt} color="gray.400" boxSize={6} />
                                  <Text fontSize="sm" color="gray.500">
                                    {intl.formatMessage({ id: 'farm.soe.documentPlaceholder' })}
                                  </Text>
                                  <Text fontSize="xs" color="gray.400">
                                    {intl.formatMessage({
                                      id: 'farm.soe.documentFormats',
                                      defaultMessage: 'PDF, DOC, DOCX (max 20MB)'
                                    })}
                                  </Text>
                                </VStack>
                              )}
                            </Box>
                            <Text fontSize="xs" color="gray.400" mt={1}>
                              {intl.formatMessage({ id: 'farm.soe.documentHelp' })}
                            </Text>
                          </Box>
                          <HStack gap={2} justify="flex-end">
                            <StandardButton
                              variant="ghost"
                              size="sm"
                              onClick={() => setOfppEditMode(false)}>
                              {intl.formatMessage({ id: 'app.cancel' })}
                            </StandardButton>
                            <StandardButton
                              size="sm"
                              isLoading={isSavingOfpp}
                              onClick={handleSaveOfpp}>
                              {intl.formatMessage({ id: 'app.save' })}
                            </StandardButton>
                          </HStack>
                        </VStack>
                      )}
                    </VStack>
                  </FieldGroup>

                  {/* ---- Split operation (7 CFR 205.272) ---- */}
                  {/* 🔴 2026-08-21 (F25) — READ-ONLY here, deliberately. This used to be a
                      Switch plus a plan editor, which made the farm profile a SECOND editor of
                      a § 205.201(a)(5) fact that OSP module G6.0 also records. The two could
                      disagree, and one farm filed a packet whose § 205.272 row said "Split
                      Operation: No" directly above a REVIEW pointing out that its own OSP said
                      yes. The OSP owns the declaration and writes through to the establishment
                      columns; this card reports it and sends the farmer to the one editor. */}
                  <FieldGroup
                    label={intl.formatMessage({ id: 'farm.split.title' })}
                    cfr="7 CFR 205.272">
                    <VStack gap={3} align="stretch">
                      <HStack justify="space-between" align="flex-start" gap={3} flexWrap="wrap">
                        <Box minW={0}>
                          <Text fontSize="sm" fontWeight="medium" color="gray.700">
                            {intl.formatMessage({ id: 'farm.split.toggleLabel' })}
                          </Text>
                          <Text
                            fontSize="md"
                            fontWeight="semibold"
                            color={splitDeclaration === 'unanswered' ? 'gray.500' : 'green.700'}>
                            {intl.formatMessage({
                              id:
                                splitDeclaration === 'yes'
                                  ? 'farm.split.declaredYes'
                                  : splitDeclaration === 'no'
                                  ? 'farm.split.declaredNo'
                                  : 'farm.split.declaredUnanswered'
                            })}
                          </Text>
                        </Box>
                        {canWrite && (
                          <StandardButton
                            variant="outline"
                            size="sm"
                            leftIcon={<Icon as={FaEdit} />}
                            onClick={() =>
                              navigate(`/admin/dashboard/farm/${farmId}/osp/module/g6_0_production`)
                            }>
                            {intl.formatMessage({
                              id:
                                splitDeclaration === 'unanswered'
                                  ? 'farm.split.answerInOsp'
                                  : 'farm.split.changeInOsp'
                            })}
                          </StandardButton>
                        )}
                      </HStack>

                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({ id: 'farm.split.ospOwned' })}
                      </Text>

                      {splitDeclaration === 'yes' && (
                        <Box>
                          <FormLabel fontSize="sm" color="gray.700" fontWeight="semibold" mb={2}>
                            {intl.formatMessage({ id: 'farm.split.planLabel' })}
                          </FormLabel>
                          {establishmentData.split_operation_plan ? (
                            <Box p={3} bg="gray.50" borderRadius="md">
                              <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                                {establishmentData.split_operation_plan}
                              </Text>
                            </Box>
                          ) : (
                            <Text fontSize="sm" color="gray.400" fontStyle="italic">
                              {intl.formatMessage({ id: 'farm.split.noPlan' })}
                            </Text>
                          )}
                        </Box>
                      )}

                      {splitDeclaration === 'no' && (
                        <Text fontSize="xs" color="gray.500">
                          {intl.formatMessage({ id: 'farm.split.singleOperation' })}
                        </Text>
                      )}

                      {splitDeclaration === 'unanswered' && (
                        <Text fontSize="xs" color="gray.500">
                          {intl.formatMessage({ id: 'farm.split.unansweredHelp' })}
                        </Text>
                      )}
                    </VStack>
                  </FieldGroup>

                  {/* ONE regulatory note for both attestations, not two stacked blue boxes.
                      A real Alert rather than a blue Box: blue carries no meaning in this
                      palette EXCEPT as Chakra's info status, so hand-painting blue.50/blue.700
                      borrowed the convention without the semantics. As an Alert it also gets
                      the info glyph and the role a screen reader needs. */}
                  <StandardAlert
                    status="info"
                    mb={0}
                    description={`${intl.formatMessage({
                      id: 'farm.soe.regulatoryNote'
                    })} ${intl.formatMessage({ id: 'farm.split.regulatoryNote' })}`}
                  />
                </VStack>
              </StandardCard>
            </Box>
          </VStack>
        </StandardSection>

        {/* ── §3 FARM DETAILS ──────────────────────────────────────────────────────
            Was seven separate elevated cards — Contact, Location, Operations,
            Agricultural Information, Crops, Social Media, About — several holding two
            fields inside a full card with ~56px of margin above and below. One card,
            divider-separated groups, definition-list grid. */}
        <StandardSection
          title={intl.formatMessage({
            id: 'farm.section.details',
            defaultMessage: 'Farm details'
          })}>
          <StandardCard variant="outline" padding={{ base: 0, md: 4 }} mb={0}>
            <VStack gap={{ base: 6, md: 7 }} align="stretch" divider={<Divider />}>
              {/* The disclosure legend. Neutral gray: which fields are public is a fact,
                  not a claim, and colour on this page has to encode a real distinction. */}
              {/* Icon inline INSIDE the Text, not a flex sibling — as an HStack child it
                  wrapped onto its own line at tablet widths and read as a stray glyph. */}
              <Text fontSize="xs" color="gray.500" lineHeight="1.7">
                <Icon as={FaEye} boxSize={3} color="gray.400" mr={2} verticalAlign="-1px" />
                {intl.formatMessage({
                  id: 'farm.details.publicLegend',
                  defaultMessage:
                    'Marked fields appear on the consumer page when a shopper scans a QR code from this farm. Everything else stays private.'
                })}
              </Text>

              {(establishmentData.address ||
                establishmentData.zip_code ||
                cityState ||
                establishmentData.zone) && (
                <FieldGroup label={intl.formatMessage({ id: 'app.location' })}>
                  <FieldList columns={2}>
                    {/* Street address and ZIP are hard-nulled by the backend as location PII
                        — they are NOT marked public.

                        Street ONLY, not the old formatAddress() join. That concatenated
                        address + city + state + country, so this row read "4520 Foothill Rd,
                        Ventura, CA, United States" directly above a "City and state" row
                        reading "Ventura, CA" — the same data twice, and it blurred the split
                        this card exists to make legible: the street is private, the city and
                        state are what a shopper sees. */}
                    <InfoRow
                      layout="inline"
                      icon={FaMapMarkerAlt}
                      label={intl.formatMessage({ id: 'app.address' })}
                      value={establishmentData.address}
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaMapMarkerAlt}
                      label={intl.formatMessage({ id: 'establishment.zipCode' })}
                      value={establishmentData.zip_code}
                    />
                    {/* PUR box 3 on every line this farm files; the spray form inherits it. */}
                    {isCalifornia && (
                      <InfoRow
                        layout="inline"
                        icon={FaFileAlt}
                        label={intl.formatMessage({ id: 'establishment.caOperatorId' })}
                        value={establishmentData.ca_operator_id}
                      />
                    )}
                    <InfoRow
                      layout="inline"
                      icon={FaMapMarkerAlt}
                      label={intl.formatMessage({
                        id: 'farm.details.cityState',
                        defaultMessage: 'City and state'
                      })}
                      value={cityState}
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaMapMarkerAlt}
                      label={intl.formatMessage({ id: 'app.zone' })}
                      value={establishmentData.zone}
                      isPublic
                      publicLabel={publicLabel}
                    />
                  </FieldList>
                </FieldGroup>
              )}

              {/* Guarded: InfoRow renders null for an empty value, so an operation with no
                  contact details on file would otherwise leave an orphan "CONTACT
                  INFORMATION" eyebrow and a divider sitting over nothing. */}
              {(establishmentData.email ||
                establishmentData.contact_email ||
                establishmentData.phone ||
                establishmentData.contact_phone ||
                establishmentData.contact_person) && (
                <FieldGroup label={intl.formatMessage({ id: 'app.contactInformation' })}>
                  <FieldList columns={2}>
                    {/* None of these reach a shopper — the backend nulls every contact field.
                        Buyers reach the operation through the BuyerDocRequest form instead. */}
                    <InfoRow
                      layout="inline"
                      icon={FaEnvelope}
                      label={intl.formatMessage({ id: 'establishment.emailAddress' })}
                      value={establishmentData.email || establishmentData.contact_email}
                      type="email"
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaPhone}
                      label={intl.formatMessage({ id: 'app.phone' })}
                      value={establishmentData.phone || establishmentData.contact_phone}
                      type="phone"
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaUsers}
                      label={intl.formatMessage({ id: 'establishment.contactPerson' })}
                      value={establishmentData.contact_person}
                    />
                  </FieldList>
                </FieldGroup>
              )}

              {(establishmentData.total_acreage ||
                establishmentData.year_established ||
                establishmentData.farming_method) && (
                <FieldGroup label={intl.formatMessage({ id: 'establishment.operations' })}>
                  <FieldList columns={2}>
                    <InfoRow
                      layout="inline"
                      icon={FaTractor}
                      label={intl.formatMessage({ id: 'establishment.totalArea' })}
                      value={
                        establishmentData.total_acreage
                          ? intl.formatMessage(
                              {
                                id: 'farm.meta.acres',
                                defaultMessage: '{count, plural, one {# acre} other {# acres}}'
                              },
                              { count: establishmentData.total_acreage }
                            )
                          : null
                      }
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaCalendar}
                      label={intl.formatMessage({ id: 'establishment.yearEstablished' })}
                      value={establishmentData.year_established}
                      isPublic
                      publicLabel={publicLabel}
                    />
                    {/* Deliberately NOT public. It is free text the farmer types
                        ("sustainable", "Regenerative Agriculture"); publishing it would be a
                        self-declared environmental claim under FTC 16 CFR 260.6 and a
                        self-created label under EU ECGT 2024/825. It used to render up in the
                        header as a purple badge. */}
                    <InfoRow
                      layout="inline"
                      icon={FaTractor}
                      label={intl.formatMessage({ id: 'establishment.farmingMethod' })}
                      value={formatDisplayValue(establishmentData.farming_method)}
                    />
                  </FieldList>
                </FieldGroup>
              )}

              {(getWaterSources().length > 0 ||
                getSoilHealthPractices().length > 0 ||
                getIrrigationMethods().length > 0) && (
                <FieldGroup label={intl.formatMessage({ id: 'app.agriculturalInformation' })}>
                  <FieldList columns={2}>
                    <InfoRow
                      layout="inline"
                      icon={FaTint}
                      label={intl.formatMessage({ id: 'establishment.waterSources' })}
                      value={getWaterSources().join(', ')}
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaLeaf}
                      label={intl.formatMessage({ id: 'establishment.soilHealthPractices' })}
                      value={getSoilHealthPractices().join(', ')}
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaTint}
                      label={intl.formatMessage({ id: 'establishment.irrigationMethods' })}
                      value={getIrrigationMethods().join(', ')}
                      isPublic
                      publicLabel={publicLabel}
                    />
                  </FieldList>
                </FieldGroup>
              )}

              {crops.length > 0 && (
                <FieldGroup
                  label={intl.formatMessage({ id: 'establishment.crops' })}
                  action={
                    <HStack gap={1}>
                      <Icon as={FaEye} boxSize={2.5} color="gray.400" />
                      <Text fontSize="xs" color="gray.400">
                        {intl.formatMessage({
                          id: 'farm.details.publicShort',
                          defaultMessage: 'Shoppers see this'
                        })}
                      </Text>
                    </HStack>
                  }>
                  <HStack gap={2} flexWrap="wrap">
                    {crops.map((crop: string, index: number) => (
                      <Badge
                        key={index}
                        colorScheme="green"
                        variant="subtle"
                        px={{ base: 2, md: 3 }}
                        py={0.5}
                        borderRadius="full"
                        fontSize={{ base: 'xs', md: 'sm' }}>
                        <HStack gap={1}>
                          <Icon as={FaSeedling} boxSize={3} />
                          <Text>{crop}</Text>
                        </HStack>
                      </Badge>
                    ))}
                  </HStack>
                </FieldGroup>
              )}

              {(establishmentData.about ||
                establishmentData.main_activities ||
                establishmentData.location_highlights) && (
                <FieldGroup
                  label={intl.formatMessage({ id: 'establishment.aboutEstablishment' })}
                  action={
                    <HStack gap={1}>
                      <Icon as={FaEye} boxSize={2.5} color="gray.400" />
                      <Text fontSize="xs" color="gray.400">
                        {intl.formatMessage({
                          id: 'farm.details.publicShort',
                          defaultMessage: 'Shoppers see this'
                        })}
                      </Text>
                    </HStack>
                  }>
                  <VStack gap={{ base: 3, md: 4 }} align="stretch">
                    {establishmentData.about && (
                      <Box>
                        <Text
                          fontSize="xs"
                          color="gray.500"
                          textTransform="uppercase"
                          fontWeight="semibold"
                          mb={1}>
                          {intl.formatMessage({ id: 'app.description' })}
                        </Text>
                        <Text color="gray.700" lineHeight="1.7" fontSize={{ base: 'sm', md: 'md' }}>
                          {establishmentData.about}
                        </Text>
                      </Box>
                    )}
                    {establishmentData.main_activities && (
                      <Box>
                        <Text
                          fontSize="xs"
                          color="gray.500"
                          textTransform="uppercase"
                          fontWeight="semibold"
                          mb={1}>
                          {intl.formatMessage({ id: 'establishment.mainActivities' })}
                        </Text>
                        <Text color="gray.700" lineHeight="1.7" fontSize={{ base: 'sm', md: 'md' }}>
                          {establishmentData.main_activities}
                        </Text>
                      </Box>
                    )}
                    {establishmentData.location_highlights && (
                      <Box>
                        <Text
                          fontSize="xs"
                          color="gray.500"
                          textTransform="uppercase"
                          fontWeight="semibold"
                          mb={1}>
                          {intl.formatMessage({ id: 'establishment.locationHighlights' })}
                        </Text>
                        <Text color="gray.700" lineHeight="1.7" fontSize={{ base: 'sm', md: 'md' }}>
                          {establishmentData.location_highlights}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </FieldGroup>
              )}

              {/* Company links. Read from `currentCompany`, NOT `establishmentData.company`:
                  RetrieveEstablishmentSerializer lists "company" with no nested serializer,
                  so it arrives as a bare PK integer and `establishmentData.company?.website`
                  is permanently undefined. The old Social Media card's render guard was
                  `company?.facebook || company?.instagram` — always false, so that card
                  could never appear at all. */}
              {(currentCompany?.website ||
                currentCompany?.facebook ||
                currentCompany?.instagram) && (
                <FieldGroup
                  label={intl.formatMessage({
                    id: 'farm.details.links',
                    defaultMessage: 'Links'
                  })}>
                  <FieldList columns={2}>
                    <InfoRow
                      layout="inline"
                      icon={FaGlobe}
                      label={intl.formatMessage({ id: 'app.website' })}
                      value={currentCompany.website}
                      type="link"
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaFacebook}
                      label={intl.formatMessage({
                        id: 'app.facebook',
                        defaultMessage: 'Facebook'
                      })}
                      value={currentCompany.facebook}
                      type="link"
                      isPublic
                      publicLabel={publicLabel}
                    />
                    <InfoRow
                      layout="inline"
                      icon={FaInstagram}
                      label={intl.formatMessage({
                        id: 'app.instagram',
                        defaultMessage: 'Instagram'
                      })}
                      value={currentCompany.instagram}
                      type="link"
                      isPublic
                      publicLabel={publicLabel}
                    />
                  </FieldList>
                </FieldGroup>
              )}
            </VStack>
          </StandardCard>
        </StandardSection>
      </VStack>

      {farmId && isCalifornia && (
        <PURExportModal
          isOpen={purModalOpen}
          onClose={() => setPurModalOpen(false)}
          establishmentId={farmId}
          establishmentName={establishmentData?.name}
        />
      )}
    </StandardPage>
  );
}

export default ProfileFarm;
