/**
 * OSP Approved Inputs panel — Sprint 5.1 GA closer.
 *
 * Lets the farmer manage the OSP's approved-inputs list (the list the drift
 * detector cross-checks ChemicalEvent / SoilManagementEvent saves against).
 *
 * Backend contract:
 *   - GET  /osps/{id}/  exposes approved_national_list_substances + approved_omri_products
 *   - POST /osps/{id}/add-approved-input/    body: { kind, id }
 *   - POST /osps/{id}/remove-approved-input/ body: { kind, id }
 *   - GET  /certifications/verify-input/?name= → resolves text to NL/OMRI pks
 *
 * Both add/remove endpoints synchronously re-run the drift detector on every
 * event for the establishment, so a successful add immediately clears any
 * matching drift_warning the next time the producer dashboard is loaded.
 */

import React, { useRef, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Divider,
  Flex,
  HStack,
  Icon,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCheckCircle, FaExclamationTriangle, FaFlask, FaPlus } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  GuidanceNote,
  StandardAlert,
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSearchInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  useAddApprovedInputMutation,
  useAddPlanMaterialMutation,
  useDeletePlanMaterialMutation,
  useGetPlanMaterialsQuery,
  useLazyVerifyInputQuery,
  useRemoveApprovedInputMutation
} from 'store/api/ospApi';
import type {
  ApprovedInputChangeLog,
  ApprovedInputKind,
  InputVerifyResult,
  OSP,
  PlanMaterialCategory,
  PlanMaterialEntry
} from 'types/osp';
import { nationalListCondition } from 'components/Compliance/nationalListCondition';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface ChangeLogSectionProps {
  logs: ApprovedInputChangeLog[];
  subtextColor: string;
}

/**
 * Collapsible change-log panel (Accordion) rendered below the search block.
 * Shows newest-first entries with action badge, date, input name, and any
 * certifier-notification reference supplied at the time of the change.
 * Satisfies § 205.400(f)(1) inspector query: "when was X added, what letter covers it?"
 */
const ChangeLogSection: React.FC<ChangeLogSectionProps> = ({ logs, subtextColor }) => {
  const intl = useIntl();
  const addedBg = 'green.50';
  const removedBg = 'red.50';

  return (
    <>
      <Divider mt={2} />
      <Accordion allowToggle mt={2}>
        <AccordionItem border="none">
          <AccordionButton px={0} py={2} _hover={{ bg: 'transparent' }}>
            <Box flex="1" textAlign="left">
              <Text fontWeight="semibold" fontSize="sm">
                {intl.formatMessage({ id: 'osp.approvedInputs.log.title' })}
                <Text as="span" fontWeight="normal" color={subtextColor} ml={2} fontSize="xs">
                  ({logs.length})
                </Text>
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel px={0} pb={2}>
            {logs.length === 0 ? (
              <Text fontSize="xs" color={subtextColor}>
                {intl.formatMessage({ id: 'osp.approvedInputs.log.empty' })}
              </Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {logs.map((entry) => {
                  const isAdded = entry.action === 'added';
                  const date = new Date(entry.changed_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  return (
                    <Box
                      key={entry.id}
                      p={2}
                      borderRadius="md"
                      bg={isAdded ? addedBg : removedBg}
                      borderLeft="3px solid"
                      /* green.600 / red.600 (4.12 / 4.23), not .400. This bar is the ONLY thing
                          distinguishing an added input from a removed one, and green.400
                          measures 2.01:1 on white — under the 3.0 a non-text indicator owes,
                          and mismatched against the red it is paired with. */
                      borderLeftColor={isAdded ? 'green.600' : 'red.600'}>
                      <HStack spacing={2} mb={entry.change_notification_reference ? 1 : 0}>
                        {/*
                          Matched weights. `colorScheme` + the default `brand` variant renders
                          GREEN as a solid pill and every other palette as a tint, so ADDED
                          arrived as a heavy dark-green chip and REMOVED as a light red one —
                          asymmetric styling for a symmetric pair. Both are tints now.
                          `uppercase` is kept on purpose: it applies to both halves and is the
                          usual convention for a diff marker.
                        */}
                        <Badge
                          variant={isAdded ? 'subtle' : 'danger'}
                          fontSize="11px"
                          textTransform="uppercase">
                          {intl.formatMessage({
                            id: isAdded
                              ? 'osp.approvedInputs.log.action.added'
                              : 'osp.approvedInputs.log.action.removed'
                          })}
                        </Badge>
                        <Text fontSize="xs" fontWeight="semibold" flex={1} noOfLines={1}>
                          {entry.target_name_at_change}
                        </Text>
                        <Text fontSize="xs" color={subtextColor} flexShrink={0}>
                          {date}
                        </Text>
                      </HStack>
                      {entry.change_notification_reference && (
                        <Text fontSize="xs" color={subtextColor} fontStyle="italic">
                          {intl.formatMessage({ id: 'osp.approvedInputs.log.ref' })}:{' '}
                          {entry.change_notification_reference}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </VStack>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
};

interface OSPApprovedInputsPanelProps {
  companyId: string;
  farmId: string;
  osp: OSP;
}

/** The sections a material can be filed under, in the order the Materials List editor offers them. */
const ATTACH_SECTIONS: PlanMaterialCategory[] = [
  'fertilizer_amendment',
  'pest_disease_weed',
  'production_aid',
  'post_harvest',
  'facility_pest',
  'other'
];

/** The server's match key for a material name: case and spacing only (`plan_materials._norm`). */
const normName = (name: string | null | undefined): string =>
  (name || '').split(/\s+/).filter(Boolean).join(' ').toLowerCase();

const OSPApprovedInputsPanel: React.FC<OSPApprovedInputsPanelProps> = ({
  companyId,
  farmId,
  osp
}) => {
  const intl = useIntl();
  const toast = useToast();

  const subtextColor = useColorModeValue('gray.600', 'gray.400');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');

  const [query, setQuery] = useState('');
  /**
   * The term the last search actually ran on — NOT the live input value.
   *
   * `handleAddOwnMaterial` read `query.trim()` at click time, so typing a no-match term,
   * then editing the box without re-searching, POSTed the new, never-resolved string while
   * the results below still described the old one. The row that reaches the OSP has to be
   * the row the grower was looking at.
   */
  const [searchedTerm, setSearchedTerm] = useState('');
  const [certRef, setCertRef] = useState('');
  /**
   * Asked before a material goes on the list (2026-11-16): whether it is in use or intended for use,
   * and what it is used for. Every agent's materials form asks both per row (OTCO C11's Intended Use,
   * CCOF's sections, WSDA AGR 2196's intended purpose), and a catalog listing answers neither: it says
   * a product is allowed, never that this operation uses it or why. Nothing is preselected; the
   * operator picks both, and the server files them on the operator's row for the product.
   */
  const [attachUse, setAttachUse] = useState<'' | 'in_use' | 'planned'>('');
  const [attachSection, setAttachSection] = useState<PlanMaterialCategory>('');
  const useAnswered = Boolean(attachUse && attachSection);
  const resetUse = () => {
    setAttachUse('');
    setAttachSection('');
  };
  const [verify, { data: verifyResult, isFetching: searching, isUninitialized }] =
    useLazyVerifyInputQuery();
  const [addInput, { isLoading: adding }] = useAddApprovedInputMutation();
  const [removeInput, { isLoading: removing }] = useRemoveApprovedInputMutation();

  // Remove confirmation — approved_inputs are regulatory records; an accidental
  // click on the × should not silently delete. Certifiers may audit the
  // change history of this list, so removals need intent.
  const [pendingRemove, setPendingRemove] = useState<{
    kind: ApprovedInputKind;
    id: number;
    label: string;
  } | null>(null);
  const [removeCertRef, setRemoveCertRef] = useState('');
  const cancelRemoveRef = useRef<HTMLButtonElement | null>(null);

  // Active OSPs are what the drift detector reads. Drafts are editable so the
  // farmer can pre-stage inputs before submission. Submitted OSPs are LOCKED
  // (snapshot PDF has already shipped to the certifier) — matches backend
  // _ensure_approved_inputs_editable gate.
  const isActive = osp.status === 'active';
  const isEditable = osp.status === 'draft' || osp.status === 'active';

  const nlList = osp.approved_national_list_substances || [];
  // A nonsynthetic catalogue row (spinosad, Bt, d-limonene) is allowed without any National List
  // entry. Filed under the "National List" heading it reads as a listing, so it gets its own group.
  const nlListed = nlList.filter((s) => s.is_national_list_entry !== false);
  const nonsynList = nlList.filter((s) => s.is_national_list_entry === false);
  const omriList = osp.approved_omri_products || [];
  const wsdaList = osp.approved_wsda_materials || [];

  // The fourth source, and the one CCOF ORGB41 §A's own prompt asks for: compost, manure,
  // gypsum, limestone, a home-formulated spray. Until 2026-08-28 the only way onto this list
  // was a catalog match, so those materials had nowhere to go while the module below attested
  // that everything in use was on the list.
  const { data: operatorRows } = useGetPlanMaterialsQuery({ companyId, farmId, ospId: osp.id });
  const [addPlanMaterial, { isLoading: isAddingOwn }] = useAddPlanMaterialMutation();
  const [deletePlanMaterial] = useDeletePlanMaterialMutation();
  // A row named exactly as a listed product on this plan holds the operator's answers ABOUT that
  // product (use, section, reason, review, label), written by the Materials List editor below. The
  // packet prints the two as one row (`plan_materials._fold`, by name), so this list does not show it
  // a second time as a material "you entered" (browser check, 2026-11-05: Lime sulfur twice).
  const listedNames = new Set(
    [
      ...nlList.map((s) => s.substance_name),
      ...omriList.map((p) => p.product_name),
      ...wsdaList.map((w) => w.brand_name)
    ].map((n) => normName(n))
  );
  const ownRows = (operatorRows || []).filter(
    (row: PlanMaterialEntry) => !listedNames.has(normName(row.product_name))
  );

  const totalApproved = nlList.length + omriList.length + wsdaList.length + ownRows.length;

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    // A new search is a new material: the use and section picked for the last one do not carry over
    // (review of app #405: they did, and Add was enabled for a product nobody had answered).
    resetUse();
    try {
      await verify({ name: trimmed }).unwrap();
      setSearchedTerm(trimmed);
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.error.search' }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' }),
        duration: 5000
      });
    }
  };

  const handleAddOwnMaterial = async () => {
    const name = searchedTerm;
    if (!name) return;
    try {
      await addPlanMaterial({
        companyId,
        farmId,
        ospId: osp.id,
        // Deliberately the operator's own words and NOTHING else. The row is created with no
        // third-party listing, which is exactly what it has; the operator fills in manufacturer,
        // reason and any certifier approval from the list below.
        body: {
          product_name: name,
          listing_basis: 'none_unlisted',
          status: attachUse || undefined,
          category: attachSection || undefined
        }
      }).unwrap();
      setQuery('');
      setSearchedTerm('');
      resetUse();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.approvedInputs.own.added' }, { name }),
        duration: 4000
      });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.own.addFailed' }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' }),
        duration: 6000
      });
    }
  };

  const handleRemoveOwnMaterial = async (entryId: number) => {
    try {
      await deletePlanMaterial({ companyId, farmId, ospId: osp.id, entryId }).unwrap();
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.own.removeFailed' }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' }),
        duration: 6000
      });
    }
  };

  const handleAdd = async (kind: ApprovedInputKind, id: number, label: string) => {
    try {
      await addInput({
        companyId,
        farmId,
        ospId: osp.id,
        kind,
        id,
        change_notification_reference: certRef.trim() || undefined,
        status: attachUse || undefined,
        category: attachSection || undefined
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.approvedInputs.toast.added' }, { name: label }),
        duration: 4000
      });
      setQuery('');
      setCertRef('');
      resetUse();
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.error.add' }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' }),
        duration: 5000
      });
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;
    const { kind, id, label } = pendingRemove;
    try {
      await removeInput({
        companyId,
        farmId,
        ospId: osp.id,
        kind,
        id,
        change_notification_reference: removeCertRef.trim() || undefined
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.approvedInputs.toast.removed' }, { name: label }),
        duration: 4000
      });
      setPendingRemove(null);
      setRemoveCertRef('');
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.error.remove' }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' }),
        duration: 5000
      });
      setPendingRemove(null);
      setRemoveCertRef('');
    }
  };

  /** One approved catalogue substance, removable while the plan is editable.
   *  Registry chips are gray (2026-11-04). OMRI was purple, the National List blue, WSDA teal:
   *  a colour per source that encodes nothing the section heading does not already say, and
   *  blue is reserved for info alerts. Same call as the input lookup's source badges (#263). */
  /** "Restricted use: only as a foliar spray ..." for a § 205.602 row allowed for one use. */
  const restrictedUseNote = (
    cfrSection: string | null | undefined,
    subsection: string | null | undefined
  ) => {
    const condition = nationalListCondition(intl, cfrSection, subsection);
    return condition
      ? intl.formatMessage(
          {
            id: 'osp.approvedInputs.restrictedUse',
            defaultMessage: 'Restricted use: {condition}'
          },
          { condition }
        )
      : intl.formatMessage({
          id: 'osp.approvedInputs.restrictedUseGeneric',
          defaultMessage: 'Restricted use: only for the use the rule names'
        });
  };

  /** "Allowed with a condition (§ 205.601(j)(7)): Micronutrients—..." for a § 205.601 row the rule
   *  allows only under its entry's words (overall review OV-MT-C01). The words are the rule's
   *  English, verbatim; the frame is translated. */
  const withConditionNote = (s: {
    cfr_section?: string | null;
    rule_paragraph?: string | null;
    rule_words?: string | null;
  }) =>
    intl.formatMessage(
      {
        id: 'osp.approvedInputs.withCondition',
        defaultMessage: 'Allowed with a condition ({section}): {words}'
      },
      {
        section: `\u00a7 ${s.cfr_section || '205.601'}${s.rule_paragraph || ''}`,
        words: s.rule_words || ''
      }
    );

  const renderNationalListChip = (
    s: {
      id: number;
      substance_name: string;
      cfr_section?: string | null;
      subsection?: string | null;
      is_conditionally_permitted?: boolean;
      allowed_with_condition?: boolean;
      rule_paragraph?: string | null;
      rule_words?: string | null;
    },
    scheme: string,
    tooltip: string | undefined
  ) => (
    <Tooltip
      key={`nl-${s.id}`}
      label={
        s.is_conditionally_permitted
          ? [tooltip, restrictedUseNote(s.cfr_section, s.subsection)].filter(Boolean).join(' · ')
          : s.allowed_with_condition
          ? [tooltip, withConditionNote(s)].filter(Boolean).join(' · ')
          : tooltip
      }
      hasArrow>
      <Tag
        size="md"
        colorScheme={scheme}
        borderRadius="md"
        data-restricted={s.is_conditionally_permitted ? 'true' : undefined}
        data-condition={s.allowed_with_condition ? 'true' : undefined}>
        <TagLabel>
          {s.is_conditionally_permitted
            ? intl.formatMessage(
                {
                  id: 'osp.approvedInputs.restrictedChip',
                  defaultMessage: '{name} (restricted use)'
                },
                { name: s.substance_name }
              )
            : s.allowed_with_condition
            ? intl.formatMessage(
                {
                  id: 'osp.approvedInputs.withConditionChip',
                  defaultMessage: '{name} (with a condition)'
                },
                { name: s.substance_name }
              )
            : s.substance_name}
        </TagLabel>
        <TagCloseButton
          isDisabled={!isEditable}
          onClick={() =>
            setPendingRemove({
              kind: 'national_list',
              id: s.id,
              label: s.substance_name
            })
          }
          aria-label={intl.formatMessage(
            { id: 'osp.approvedInputs.removeAria' },
            { name: s.substance_name }
          )}
        />
      </Tag>
    </Tooltip>
  );

  /**
   * One search hit, rendered identically whichever catalogue it came from.
   *
   * Every row in the results list is the same shape — badge, identifier, name, one action on
   * the right — so "add this material in your own words" can be the LAST row of the list
   * rather than an alert box shouting at the grower (see `renderNoMatch`). The three
   * catalogues previously each had their own copy of this markup, which is how the WSDA row
   * ended up rendering a raw `category` string and the OMRI row did not.
   */
  const MatchRow = ({
    badge,
    badgeScheme,
    identifier,
    name,
    note,
    action
  }: {
    badge: string;
    badgeScheme: string;
    identifier?: string | null;
    name: string;
    /** A line under the name: the condition of a § 205.602 row allowed for one use. */
    note?: string;
    action: React.ReactNode;
  }) => (
    <Flex
      p={3}
      bg={sectionBg}
      borderRadius="md"
      justify="space-between"
      align="center"
      gap={3}
      wrap="wrap">
      <VStack align="start" spacing={0} minW={0} flex={1}>
        <HStack spacing={2}>
          <Badge colorScheme={badgeScheme} fontSize="11px">
            {badge}
          </Badge>
          {identifier && (
            <Text fontSize="xs" color={subtextColor}>
              {identifier}
            </Text>
          )}
        </HStack>
        <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
          {name}
        </Text>
        {note && (
          <Text fontSize="xs" color="gray.800" data-note="restricted-use">
            {note}
          </Text>
        )}
      </VStack>
      {action}
    </Flex>
  );

  const alreadyAddedTag = (
    <HStack color="green.700" fontSize="sm">
      <Icon as={FaCheckCircle} />
      <Text>{intl.formatMessage({ id: 'osp.approvedInputs.search.alreadyAdded' })}</Text>
    </HStack>
  );

  const addButton = (kind: ApprovedInputKind, id: number, label: string) => (
    <StandardButton
      size="sm"
      leftIcon={<FaPlus />}
      isLoading={adding}
      isDisabled={!useAnswered}
      onClick={() => handleAdd(kind, id, label)}>
      {intl.formatMessage({ id: 'osp.approvedInputs.search.add' })}
    </StandardButton>
  );

  /**
   * A truncation notice, shown only when the server capped the list.
   *
   * The count comes from `*_candidate_count`, which is the TRUE number of matches — not the
   * length of the capped array. Reporting the capped length would tell a grower "12 products
   * match" when 14 do, and the two left out could be theirs.
   */
  const cappedNotice = (shown: number, total?: number) =>
    total != null && total > shown ? (
      <Text fontSize="xs" color={subtextColor}>
        {intl.formatMessage({ id: 'osp.approvedInputs.search.capped' }, { shown, total })}
      </Text>
    ) : null;

  /**
   * No catalogue matched — and that is an ordinary outcome, not a fault.
   *
   * This used to be a `StandardAlert status="warning"`: an amber panel, an orange accent bar
   * and a warning triangle, wrapped around a full-bleed primary button. Three things were
   * wrong with it.
   *
   * 1. SEMANTICS. `.claude/rules/frontend.md`: status colour = meaning, never decoration.
   *    Warning means "something needs attention". Trazo holds a reference subset of a
   *    ~10,000-product list, so "no match" is the COMMON case for a real grower — and the
   *    alert's own copy says so ("does not mean it is prohibited"). Painting the expected
   *    outcome as a warning contradicts the sentence inside it, and spends the amber that
   *    ought to mean something the next time it appears.
   * 2. HIERARCHY. The action sat inside the alert at full width, so the fallback route was
   *    the largest, loudest control on the panel — louder than the Add buttons on a real
   *    catalogue match. It now renders as the LAST ROW OF THE RESULTS LIST, in the same
   *    shape as every match: badge, name, one right-aligned `size="sm"` action.
   * 3. A11Y. `<Alert>` is `role="alert"`, an assertive live region. A search result is not an
   *    interruption; announcing it as one talks over the screen-reader user.
   *
   * What survives is the teaching copy, moved into `GuidanceNote` — the neutral gray aside
   * the design system provides for exactly this: text that explains a screen rather than
   * reporting an event.
   */
  const renderNoMatch = () => (
    <VStack align="stretch" spacing={2} mt={3}>
      <Text fontSize="xs" color={subtextColor}>
        {intl.formatMessage({ id: 'osp.approvedInputs.search.noMatch' })}
      </Text>
      {isEditable && searchedTerm && (
        <MatchRow
          badge={intl.formatMessage({ id: 'osp.approvedInputs.own.badge' })}
          badgeScheme="gray"
          // The same phrase the row will carry once it exists — `listing_statement` is
          // server-computed and this screen prints it verbatim, so the preview must not
          // promise a different one.
          identifier={intl.formatMessage({ id: 'osp.approvedInputs.own.noListing' })}
          name={searchedTerm}
          action={
            <StandardButton
              size="sm"
              leftIcon={<FaPlus />}
              isLoading={isAddingOwn}
              isDisabled={!useAnswered}
              // The Spanish label ("Agregar tal como aparece en la etiqueta") is wider than a 375px
              // row; it wraps instead of being cut off at the card edge.
              whiteSpace="normal"
              h="auto"
              py={1}
              onClick={handleAddOwnMaterial}>
              {intl.formatMessage({ id: 'osp.approvedInputs.own.addAction' })}
            </StandardButton>
          }
        />
      )}
      <GuidanceNote>
        {intl.formatMessage({ id: 'osp.approvedInputs.search.noMatchNextStep' })}
      </GuidanceNote>
    </VStack>
  );

  const renderSearchResult = (result: InputVerifyResult) => {
    if (!result) return null;

    // Every match, not just the winner. Until 2026-09-06 this screen rendered ONE row per
    // catalogue off `*_pk`, so a search for "Serenade" offered Serenade ASO and silently hid
    // Serenade MAX and the plan's own Serenade Opti. The singular fields are still read as a
    // fallback so a cached response from before the shortlist shipped still renders.
    const omriRows =
      result.omri_candidates && result.omri_candidates.length
        ? result.omri_candidates
        : result.omri_product_pk != null
        ? [
            {
              pk: result.omri_product_pk,
              omri_id: result.omri_product_id,
              product_name: result.omri_product_name || ''
            }
          ]
        : [];
    const wsdaRows =
      result.wsda_candidates && result.wsda_candidates.length
        ? result.wsda_candidates
        : result.wsda_material_pk != null
        ? [
            {
              pk: result.wsda_material_pk,
              wsda_id: result.wsda_material_id,
              brand_name: result.wsda_material_name || ''
            }
          ]
        : [];
    const nlRows =
      result.national_list_candidates && result.national_list_candidates.length
        ? result.national_list_candidates
        : result.national_list_substance_pk != null
        ? [
            {
              pk: result.national_list_substance_pk,
              substance_name: result.national_list_substance_name || '',
              cfr_section: result.national_list_cfr_section,
              citation: result.national_list_citation ?? null,
              is_national_list_entry: result.national_list_is_entry !== false,
              subsection: result.national_list_subsection ?? null,
              status: result.national_list_status,
              is_conditionally_permitted: result.national_list_conditional === true,
              restriction_notes: result.national_list_restriction_notes ?? null,
              allowed_with_condition: result.national_list_allowed_with_condition === true,
              rule_paragraph: result.national_list_rule_paragraph ?? null,
              rule_words: result.national_list_rule_words ?? null
            }
          ]
        : [];

    const hasOMRI = omriRows.length > 0;
    const hasNL = nlRows.length > 0;
    const hasWSDA = wsdaRows.length > 0;
    const totalShown = omriRows.length + nlRows.length + wsdaRows.length;
    // The National List catalogue holds § 205.601 allowed AND § 205.602 prohibited substances,
    // and both answer the same search. `status` therefore has to be read PER ROW: reading it
    // from whichever entry ranked first would put an ordinary Add button next to a substance
    // banned in organic production the moment a query matched one of each.
    // Three § 205.602 rows are prohibited EXCEPT for one use the rule names ((c), (e), (h)); the
    // server accepts them on a plan and prints the condition beside them. Typed by the server.
    const isProhibited = (row: { status?: string | null; is_conditionally_permitted?: boolean }) =>
      (row.status || '').toLowerCase() === 'prohibited' && row.is_conditionally_permitted !== true;

    if (!hasOMRI && !hasNL && !hasWSDA) {
      return renderNoMatch();
    }

    return (
      <VStack align="stretch" spacing={2} mt={3}>
        <Text fontSize="xs" color={subtextColor}>
          {intl.formatMessage({ id: 'osp.approvedInputs.search.results' }, { count: totalShown })}
        </Text>

        {omriRows.map((row) => (
          <MatchRow
            key={`omri-${row.pk}`}
            badge="OMRI"
            badgeScheme="gray"
            identifier={row.omri_id ? `#${row.omri_id}` : null}
            name={row.product_name}
            action={
              omriList.some((p) => p.id === row.pk)
                ? alreadyAddedTag
                : addButton('omri', row.pk, row.product_name)
            }
          />
        ))}
        {cappedNotice(omriRows.length, result.omri_candidate_count)}

        {nlRows.map((row) => (
          <MatchRow
            key={`nl-${row.pk}`}
            badge={intl.formatMessage({
              id:
                row.is_national_list_entry === false
                  ? 'osp.approvedInputs.kind.nonsynthetic'
                  : 'osp.approvedInputs.kind.national_list'
            })}
            badgeScheme="gray"
            identifier={
              row.is_national_list_entry === false ? null : row.citation || row.cfr_section
            }
            name={row.substance_name}
            note={
              row.is_conditionally_permitted
                ? restrictedUseNote(row.cfr_section, row.subsection)
                : row.allowed_with_condition
                ? withConditionNote(row)
                : undefined
            }
            action={
              isProhibited(row) ? (
                // The server refuses this too (add_approved_input). The control is removed here
                // so the operator is told why BEFORE they act, rather than by an error after.
                <HStack color="red.800" fontSize="sm" maxW="320px" align="flex-start">
                  <Icon as={FaExclamationTriangle} mt="2px" />
                  <Text>
                    {intl.formatMessage(
                      { id: 'osp.approvedInputs.search.prohibited' },
                      {
                        section: row.cfr_section ? `\u00a7 ${row.cfr_section}` : '\u00a7 205.602'
                      }
                    )}
                  </Text>
                </HStack>
              ) : nlList.some((s) => s.id === row.pk) ? (
                alreadyAddedTag
              ) : (
                addButton('national_list', row.pk, row.substance_name)
              )
            }
          />
        ))}
        {cappedNotice(nlRows.length, result.national_list_candidate_count)}

        {wsdaRows.map((row) => (
          <MatchRow
            key={`wsda-${row.pk}`}
            badge="WSDA"
            badgeScheme="gray"
            // ⛔ Only a REAL WSDA Product # — a bare integer — may be shown. Trazo's seeded
            // catalogue also holds ids of the shape `WSDA-REG-BIOAG-2025-003`, which is not a
            // format WSDA issues; printing one invites a certifier to look up a registration
            // that does not exist. When the id is not a product number, show none.
            identifier={
              row.wsda_id && /^\d+$/.test(row.wsda_id)
                ? intl.formatMessage(
                    { id: 'osp.approvedInputs.search.wsdaProductNumber' },
                    { number: row.wsda_id }
                  )
                : null
            }
            name={row.brand_name}
            action={
              wsdaList.some((w) => w.id === row.pk)
                ? alreadyAddedTag
                : addButton('wsda', row.pk, row.brand_name)
            }
          />
        ))}
        {cappedNotice(wsdaRows.length, result.wsda_candidate_count)}
      </VStack>
    );
  };

  return (
    <StandardCard
      mt={4}
      titleIcon={<Icon as={FaFlask} color="green.700" />}
      title={intl.formatMessage({ id: 'osp.approvedInputs.title' })}
      subtitle={intl.formatMessage({ id: 'osp.approvedInputs.cfr' })}
      headerAction={
        <Badge variant={totalApproved > 0 ? 'brand' : 'neutral'}>
          {intl.formatMessage({ id: 'osp.approvedInputs.count' }, { count: totalApproved })}
        </Badge>
      }>
      <VStack align="stretch" spacing={4}>
        {!isEditable && (
          <StandardAlert
            status="warning"
            mb={0}
            description={intl.formatMessage({ id: 'osp.approvedInputs.lockedHint' })}
          />
        )}
        {isEditable && !isActive && (
          <StandardAlert
            status="info"
            mb={0}
            description={intl.formatMessage({ id: 'osp.approvedInputs.notActiveHint' })}
          />
        )}
        {/* P0-5 — Registry ↔ § 205.201(a)(2) narrative sync warning. Inspector
            reads "registered inputs not mentioned in narrative" as an incomplete
            OSP filing. The diff is computed server-side and carried on the OSP
            serializer. */}
        {osp.registry_sync_diff?.has_warning && (
          <StandardAlert status="warning" mb={0}>
            <VStack align="start" spacing={1} flex={1}>
              {osp.registry_sync_diff.entries_not_in_narrative.length > 0 ? (
                <>
                  <Text fontWeight="semibold">
                    {intl.formatMessage(
                      { id: 'osp.approvedInputs.syncDiff.notInNarrative' },
                      {
                        count: osp.registry_sync_diff.entries_not_in_narrative.length
                      }
                    )}
                  </Text>
                  <Text color={subtextColor}>
                    {osp.registry_sync_diff.entries_not_in_narrative
                      .slice(0, 5)
                      .map((e) => `${e.source}: ${e.name}`)
                      .join(' · ')}
                    {osp.registry_sync_diff.entries_not_in_narrative.length > 5 && ' …'}
                  </Text>
                </>
              ) : (
                <Text>
                  {intl.formatMessage(
                    { id: 'osp.approvedInputs.syncDiff.narrativeLongRegistryThin' },
                    {
                      chars: osp.registry_sync_diff.narrative_char_count,
                      registry: osp.registry_sync_diff.registry_total
                    }
                  )}
                </Text>
              )}
            </VStack>
          </StandardAlert>
        )}

        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {intl.formatMessage({ id: 'osp.approvedInputs.section.omri' })}
            <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
              ({omriList.length})
            </Text>
          </Text>
          {omriList.length === 0 ? (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.empty.omri' })}
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {omriList.map((p) => (
                <Tooltip
                  key={`omri-${p.id}`}
                  label={p.omri_id ? `OMRI #${p.omri_id}` : undefined}
                  hasArrow>
                  <Tag size="md" colorScheme="gray" borderRadius="md">
                    <TagLabel>{p.product_name}</TagLabel>
                    <TagCloseButton
                      isDisabled={!isEditable}
                      onClick={() =>
                        setPendingRemove({
                          kind: 'omri',
                          id: p.id,
                          label: p.product_name
                        })
                      }
                      aria-label={intl.formatMessage(
                        { id: 'osp.approvedInputs.removeAria' },
                        { name: p.product_name }
                      )}
                    />
                  </Tag>
                </Tooltip>
              ))}
            </Flex>
          )}
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {intl.formatMessage({ id: 'osp.approvedInputs.section.national_list' })}
            <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
              ({nlListed.length})
            </Text>
          </Text>
          {nlListed.length === 0 ? (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.empty.national_list' })}
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {nlListed.map((s) =>
                renderNationalListChip(s, 'gray', s.citation || s.cfr_section || undefined)
              )}
            </Flex>
          )}
        </Box>

        {nonsynList.length > 0 && (
          <Box>
            <Text fontWeight="semibold" fontSize="sm" mb={2}>
              {intl.formatMessage({ id: 'osp.approvedInputs.section.nonsynthetic' })}
              <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
                ({nonsynList.length})
              </Text>
            </Text>
            <Flex wrap="wrap" gap={2}>
              {nonsynList.map((s) =>
                renderNationalListChip(
                  s,
                  'gray',
                  intl.formatMessage({ id: 'osp.approvedInputs.nonsyntheticTooltip' })
                )
              )}
            </Flex>
          </Box>
        )}

        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {intl.formatMessage({ id: 'osp.approvedInputs.section.wsda' })}
            <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
              ({wsdaList.length})
            </Text>
          </Text>
          {wsdaList.length === 0 ? (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.empty.wsda' })}
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {wsdaList.map((w) => (
                <Tooltip
                  key={`wsda-${w.id}`}
                  label={w.wsda_id ? `WSDA ${w.wsda_id}` : undefined}
                  hasArrow>
                  <Tag size="md" colorScheme="gray" borderRadius="md">
                    <TagLabel>{w.brand_name}</TagLabel>
                    <TagCloseButton
                      isDisabled={!isEditable}
                      onClick={() =>
                        setPendingRemove({
                          kind: 'wsda',
                          id: w.id,
                          label: w.brand_name
                        })
                      }
                      aria-label={intl.formatMessage(
                        { id: 'osp.approvedInputs.removeAria' },
                        { name: w.brand_name }
                      )}
                    />
                  </Tag>
                </Tooltip>
              ))}
            </Flex>
          )}
        </Box>

        {/* Operator-authored rows. Rendered as their own group, never mixed into a catalog
            group, because what may be SAID about them is different: each row prints the basis
            it actually has, and "no third-party listing" is a legitimate answer a certifier
            reviews — not a defect and not a listing. */}
        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {intl.formatMessage({ id: 'osp.approvedInputs.section.own' })}
            <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
              ({ownRows.length})
            </Text>
          </Text>
          {ownRows.length === 0 ? (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.empty.own' })}
            </Text>
          ) : (
            <VStack align="stretch" spacing={2}>
              {ownRows.map((row: PlanMaterialEntry) => (
                <Flex
                  key={`own-${row.id}`}
                  p={3}
                  bg={sectionBg}
                  borderRadius="md"
                  justify="space-between"
                  align="center"
                  gap={3}
                  wrap="wrap">
                  <VStack align="start" spacing={0} minW={0} flex={1}>
                    <HStack spacing={2} wrap="wrap" maxW="100%">
                      {/* The app's own words for the section: the server's display name is
                          English and names CCOF's sections, which an OTCO or WSDA plan does not
                          have. Wraps instead of running under the Remove button. */}
                      {row.category && (
                        <Badge
                          colorScheme="gray"
                          fontSize="11px"
                          whiteSpace="normal"
                          textTransform="none"
                          maxW="100%">
                          {intl.formatMessage({ id: `osp.materialsList.category.${row.category}` })}
                        </Badge>
                      )}
                      {row.manufacturer && (
                        <Text fontSize="xs" color={subtextColor}>
                          {row.manufacturer}
                        </Text>
                      )}
                    </HStack>
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                      {row.product_name}
                    </Text>
                    {/* Server-computed. Never assembled here from the basis code — the sentence
                        a certifier reads must have one author. It is the packet's English, so it is
                        quoted as what the packet prints, the way the Materials List editor does. */}
                    <Text fontSize="xs" color={subtextColor}>
                      {intl.formatMessage(
                        {
                          id: 'osp.materialsList.reviewPrints',
                          defaultMessage: 'Your packet prints: {statement}.'
                        },
                        { statement: row.listing_statement }
                      )}
                    </Text>
                  </VStack>
                  {isEditable && (
                    <StandardButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveOwnMaterial(row.id)}
                      title={String(
                        intl.formatMessage(
                          { id: 'osp.approvedInputs.removeAria' },
                          { name: row.product_name }
                        )
                      )}>
                      {intl.formatMessage({ id: 'osp.approvedInputs.own.remove' })}
                    </StandardButton>
                  )}
                </Flex>
              ))}
            </VStack>
          )}
        </Box>

        {isEditable && (
          <Box>
            <Text fontWeight="semibold" fontSize="sm" mb={2}>
              {intl.formatMessage({ id: 'osp.approvedInputs.search.title' })}
            </Text>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={2}>
              <StandardSearchInput
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter' && !searching && query.trim()) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder={intl.formatMessage({
                  id: 'osp.approvedInputs.search.placeholder'
                })}
                flex="1"
              />
              <StandardButton
                size="sm"
                // 44px to match the field beside it and the project's touch-target floor.
                // No leftIcon: the field now carries the magnifier, and two in a row read as
                // two different actions.
                minH="44px"
                onClick={handleSearch}
                isLoading={searching}
                isDisabled={!query.trim()}
                flexShrink={0}>
                {intl.formatMessage({ id: 'osp.approvedInputs.search.button' })}
              </StandardButton>
            </Stack>
            <Text fontSize="xs" color={subtextColor} mt={1}>
              {intl.formatMessage({ id: 'osp.approvedInputs.search.hint' })}
            </Text>
            {!isUninitialized && verifyResult && (
              <Stack
                direction={{ base: 'column', md: 'row' }}
                spacing={2}
                mt={3}
                data-testid="attach-use">
                <StandardField label={intl.formatMessage({ id: 'osp.approvedInputs.use.label' })}>
                  <StandardSelect
                    size="sm"
                    value={attachUse}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setAttachUse(e.target.value as '' | 'in_use' | 'planned')
                    }>
                    <option value="">
                      {intl.formatMessage({ id: 'osp.approvedInputs.use.placeholder' })}
                    </option>
                    <option value="in_use">
                      {intl.formatMessage({ id: 'osp.approvedInputs.use.in_use' })}
                    </option>
                    <option value="planned">
                      {intl.formatMessage({ id: 'osp.approvedInputs.use.planned' })}
                    </option>
                  </StandardSelect>
                </StandardField>
                <StandardField
                  label={intl.formatMessage({ id: 'osp.approvedInputs.section.label' })}>
                  <StandardSelect
                    size="sm"
                    value={attachSection}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setAttachSection(e.target.value as PlanMaterialCategory)
                    }>
                    <option value="">
                      {intl.formatMessage({ id: 'osp.approvedInputs.use.placeholder' })}
                    </option>
                    {ATTACH_SECTIONS.map((section) => (
                      <option key={section} value={section}>
                        {intl.formatMessage({ id: `osp.materialsList.category.${section}` })}
                      </option>
                    ))}
                  </StandardSelect>
                </StandardField>
              </Stack>
            )}
            {!isUninitialized && verifyResult && !useAnswered && (
              <Text fontSize="xs" color={subtextColor} mt={1}>
                {intl.formatMessage({ id: 'osp.approvedInputs.use.needed' })}
              </Text>
            )}
            {!isUninitialized && verifyResult && renderSearchResult(verifyResult)}
            {/*
              Cert-notification reference is placed BELOW the results so the
              farmer reads in natural order: search → results → (optional ref) → Add.
              Only shown when results exist — no point asking for a ref when
              there's nothing to add yet.
            */}
            {!isUninitialized &&
              verifyResult &&
              (verifyResult.omri_product_pk != null ||
                verifyResult.national_list_substance_pk != null ||
                verifyResult.wsda_material_pk != null) && (
                <Box mt={3}>
                  <StandardField
                    label={intl.formatMessage({ id: 'osp.approvedInputs.log.certRefLabel' })}
                    helpText={intl.formatMessage({ id: 'osp.approvedInputs.log.certRefHint' })}>
                    <StandardInput
                      value={certRef}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCertRef(e.target.value)
                      }
                      placeholder={intl.formatMessage({
                        id: 'osp.approvedInputs.log.certRefPlaceholder'
                      })}
                    />
                  </StandardField>
                </Box>
              )}
          </Box>
        )}
        <ChangeLogSection logs={osp.approved_input_changes || []} subtextColor={subtextColor} />
      </VStack>

      <AlertDialog
        isOpen={!!pendingRemove}
        leastDestructiveRef={cancelRemoveRef}
        onClose={() => !removing && setPendingRemove(null)}
        isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {intl.formatMessage({ id: 'osp.approvedInputs.removeConfirm.title' })}
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text mb={3}>
                {intl.formatMessage(
                  { id: 'osp.approvedInputs.removeConfirm.body' },
                  { name: pendingRemove?.label || '' }
                )}
              </Text>
              <StandardAlert
                status="warning"
                mb={3}
                description={intl.formatMessage({
                  id: 'osp.approvedInputs.removeConfirm.warning'
                })}
              />
              {/* The server removes the operator's answers about this product with it
                  (`_remove_attach_answers`); left behind, they came back as a material of their own. */}
              <Text fontSize="sm" mb={3}>
                {intl.formatMessage({ id: 'osp.approvedInputs.removeConfirm.answers' })}
              </Text>
              <StandardField
                label={intl.formatMessage({ id: 'osp.approvedInputs.log.certRefLabel' })}
                helpText={intl.formatMessage({ id: 'osp.approvedInputs.log.certRefHint' })}>
                <StandardInput
                  value={removeCertRef}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRemoveCertRef(e.target.value)
                  }
                  placeholder={intl.formatMessage({
                    id: 'osp.approvedInputs.log.certRefPlaceholder'
                  })}
                />
              </StandardField>
            </AlertDialogBody>
            <AlertDialogFooter>
              <StandardButton
                ref={cancelRemoveRef}
                variant="outline"
                onClick={() => setPendingRemove(null)}
                isDisabled={removing}>
                {intl.formatMessage({ id: 'osp.approvedInputs.removeConfirm.cancel' })}
              </StandardButton>
              {/* No `danger` token exists in StandardButton's variant map. `colorScheme` is
                  spread AFTER the map inside the component, so it overrides the green and this
                  renders red solid — the one escape hatch, used deliberately. */}
              <StandardButton
                colorScheme="red"
                onClick={handleConfirmRemove}
                ml={3}
                isLoading={removing}>
                {intl.formatMessage({ id: 'osp.approvedInputs.removeConfirm.confirm' })}
              </StandardButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </StandardCard>
  );
};

export default OSPApprovedInputsPanel;
