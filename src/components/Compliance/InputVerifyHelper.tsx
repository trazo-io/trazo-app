/**
 * InputVerifyHelper — farmer-facing sanity check against the four authoritative
 * organic input catalogs Trazo drift-checks against (OMRI, WSDA, National List,
 * CDFA OIM). Rendered beneath the free-text Commercial Name / amendment_type
 * input on event-entry forms.
 *
 * Design intent (Trazo principles):
 *   - Do NOT auto-populate the "Organic Approved" dropdown. That is the
 *     farmer's declaration — evidence helps them declare confidently; removing
 *     agency undermines transparency-first attestation.
 *   - Do NOT block save when the input has no catalog match. The drift
 *     detector already captures this post-save and is intentionally non-
 *     blocking (see certifications/services/drift_detector.py docstring).
 *   - Reuse — hits the same /certifications/verify-input/ endpoint as the OSP
 *     Approved Inputs panel. No new backend work.
 *
 * Usage: drop the component beneath the input it verifies, and pass `name`
 * (current field value) from the form. The farmer taps "Look up" — we call
 * the endpoint and render the result inline.
 *
 * Attaching a listing (2026-09-01). A catalog hit is a SUGGESTION. It becomes part of the
 * record only when the grower taps "Use this listing", which hands the OMRI row's pk to the
 * form (`onAttachOmri`) and from there to `ChemicalEvent.omri_product`. Nothing is written
 * on render and nothing is written by the lookup itself — the fuzzy matcher that resolves
 * "Kocide 3000" to "Kocide 3000-O" is right for search and wrong as a persisted claim
 * (memory: consumer-omri-listing-leak-2026-08-09). The FK is what lets the dossier print
 * "OMRI Listed" without the "grower-selected, no listing on file" suffix, and what lets the
 * buyer page say OMRI's name at all — so it has to be the grower's act, not the matcher's.
 */

import React from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  HStack,
  Flex,
  Icon,
  Link,
  Stack,
  Text,
  VStack
} from '@chakra-ui/react';
import { FaCheckCircle, FaExclamationTriangle, FaExternalLinkAlt, FaSearch } from 'react-icons/fa';

/**
 * Extend a compact control's HIT AREA to the 44px touch minimum without growing it visually —
 * the technique the "look up" button below already used, lifted to a constant so the attach
 * controls share it. MEASURED 2026-09-01 at 390px: setting `minH="44px"` instead made the
 * OMRI row 62px against the WSDA row's 48px and squeezed the product name down to
 * "Entrust SC…", on the one card the demo film holds on.
 */
/**
 * A real WSDA identifier is the list's `WSDA Product #` column, and it holds a BARE
 * INTEGER (1123, 2948, 3376). The `WSDA-REG-BIOAG-2025-001` shape Trazo seeded is not
 * something WSDA issues, so a grower who takes one to WSDA finds nothing — which is
 * worse than showing no identifier at all.
 *
 * Mirrors `wsda_product_number` in
 * trazo-back/certifications/services/registry_identifiers.py. Keep the two in step.
 */
const WSDA_PRODUCT_NUMBER_RE = /^\d+$/;
const wsdaProductNumber = (raw?: string | null): string => {
  const value = (raw ?? '').trim();
  return WSDA_PRODUCT_NUMBER_RE.test(value) ? value : '';
};

const TOUCH_TARGET = {
  position: 'relative' as const,
  _before: {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    minWidth: '44px',
    height: '44px'
  }
};
import { useIntl } from 'react-intl';

import { useLazyVerifyInputQuery } from 'store/api/ospApi';
import type { InputVerifyResult } from 'types/osp';
import { parseDateOnly } from 'utils/dateOnly';

interface InputVerifyHelperProps {
  /** Current value of the input field the farmer is about to save. */
  name: string;
  /** Optional override of the user-visible "Look up" button label. */
  buttonLabel?: string;
  /** The OMRI catalog pk currently attached to the record (form state), if any. */
  attachedOmriPk?: number | null;
  /** The WSDA Materials List pk currently attached to the record (form state), if any. */
  attachedWsdaPk?: number | null;
  /**
   * Called ONLY on the grower's tap: with the OMRI pk to attach it, with `null` to detach.
   * When omitted the card is read-only and no listing can be attached from here.
   */
  onAttachOmri?: (pk: number | null) => void;
  /**
   * Same contract, for the WSDA Materials List. Separate from OMRI because they are separate
   * catalogues and separate columns on the record: CCOF accepts either, and merging them
   * would put one organisation's name on the other's determination.
   */
  onAttachWsda?: (pk: number | null) => void;
}

const InputVerifyHelper: React.FC<InputVerifyHelperProps> = ({
  name,
  buttonLabel,
  attachedOmriPk,
  attachedWsdaPk,
  onAttachOmri,
  onAttachWsda
}) => {
  const intl = useIntl();
  const [verify, { data, isFetching, isUninitialized, error, originalArgs }] =
    useLazyVerifyInputQuery();

  const trimmed = (name || '').trim();
  // Run 8 (R8-08): a result belongs to the name it was looked up for. Editing the name used to
  // leave the previous verdict on screen (a prohibited card under a different product, or a
  // clean one under a prohibited name) until the grower looked up again.
  // RTK always records the args of the last lookup; when they are absent nothing is known to
  // be stale.
  const isStale =
    Boolean(data) && originalArgs !== undefined && (originalArgs.name || '').trim() !== trimmed;
  const disabled = trimmed.length < 2 || isFetching;

  const handleClick = () => {
    if (!trimmed) return;
    verify({ name: trimmed });
  };

  return (
    <Box mt={2}>
      {/*
        Flex + wrap, not HStack.
        MEASURED 2026-09-01 at 320px (`sm`, the narrowest breakpoint this app supports): the
        row squeezed the button to 183px around a 206px label, and Chakra's Button is
        `white-space: nowrap; overflow: visible` — so "Look up in OMRI / WSDA / National List"
        painted straight through its own green border instead of being clipped or wrapped.
        Pre-existing (the old "Verify against …" label was a character longer), surfaced by a
        screenshot of the phone shot the demo film holds on. The button keeps its intrinsic
        width and "Checked just now" drops to the next line when there is no room for both.
      */}
      <Flex gap={2} align="center" wrap="wrap">
        <Button
          size="xs"
          variant="outline"
          colorScheme="green"
          flexShrink={0}
          leftIcon={<FaSearch />}
          onClick={handleClick}
          isLoading={isFetching}
          isDisabled={disabled}
          // Rendered 24px tall at 375px — barely half the 44px touch minimum, on the one
          // control that tells an organic grower whether the input they just typed is even
          // allowed, tapped standing in an orchard. Extend the HIT AREA without changing the
          // visual size (same technique as the consumer page's info triggers), so the compact
          // inline layout this sits in is preserved.
          {...TOUCH_TARGET}>
          {buttonLabel ||
            intl.formatMessage({
              id: 'inputVerify.button',
              defaultMessage: 'Look up in OMRI / WSDA / National List'
            })}
        </Button>
        {!isUninitialized && data && !isStale && (
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'inputVerify.checked', defaultMessage: 'Checked just now' })}
          </Text>
        )}
        {!isUninitialized && data && isStale && (
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({
              id: 'inputVerify.stale',
              defaultMessage: 'The name changed. Look it up again.'
            })}
          </Text>
        )}
      </Flex>

      {error && (
        <Alert status="error" fontSize="xs" mt={2}>
          <AlertIcon />
          <Text>
            {intl.formatMessage({
              id: 'inputVerify.error',
              defaultMessage:
                "Couldn't reach the verifier. Save will still work; the drift detector runs after save."
            })}
          </Text>
        </Alert>
      )}

      {!isUninitialized && data && !isStale && (
        <ResultCard
          result={data}
          query={trimmed}
          attachedOmriPk={attachedOmriPk}
          attachedWsdaPk={attachedWsdaPk}
          onAttachOmri={onAttachOmri}
          onAttachWsda={onAttachWsda}
        />
      )}
    </Box>
  );
};

const ResultCard: React.FC<{
  result: InputVerifyResult;
  query: string;
  attachedOmriPk?: number | null;
  attachedWsdaPk?: number | null;
  onAttachOmri?: (pk: number | null) => void;
  onAttachWsda?: (pk: number | null) => void;
}> = ({ result, query, attachedOmriPk, attachedWsdaPk, onAttachOmri, onAttachWsda }) => {
  const intl = useIntl();
  /**
   * "OMRI #1234-A · List of 12 Mar 2026". The EDITION DATE belongs beside the listing, not
   * only in the database: OMRI republishes daily, so a row shown without it can go stale on
   * screen with nobody able to tell. Falls back to the ID alone when the row predates the
   * column, and to undefined when there is no ID either — NEVER invents "current".
   */
  const omriSubtitle = (candidate: {
    omri_id: string | null;
    list_edition_date?: string | null;
  }) => {
    const id = candidate.omri_id ? `OMRI #${candidate.omri_id}` : null;
    // PARSED FIRST, AND THE RESULT IS THE CONDITION.
    //
    // `list_edition_date` is a backend DATE column. Passing the raw `YYYY-MM-DD` to
    // `formatDate` parses it as UTC midnight, so every viewer west of UTC read OMRI's edition
    // as the PREVIOUS day: the Sep 5 2026 list rendered "List of Sep 4, 2026" for a US grower.
    // `parseDateOnly` builds a LOCAL midnight instead. See utils/dateOnly.ts.
    //
    // Testing the RAW string and formatting the parsed one was not enough. `parseDateOnly`
    // returns null for a truthy-but-unparseable value, on purpose, and `null ?? undefined` is
    // `undefined`, which `Intl.DateTimeFormat.format` renders as TODAY. So a malformed column
    // value printed "List of <today>" as OMRI's edition date, on the surface whose whole job is
    // saying which edition a listing came from, under a comment promising it never invents
    // "current". MEASURED: format(undefined) returns the current date, it does not throw.
    const parsedEdition = parseDateOnly(candidate.list_edition_date);
    const edition = parsedEdition
      ? intl.formatMessage(
          { id: 'inputVerify.omriEdition', defaultMessage: 'List of {date}' },
          {
            date: intl.formatDate(parsedEdition, {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          }
        )
      : null;
    return [id, edition].filter(Boolean).join(' · ') || undefined;
  };
  const hasOMRI = result.omri_product_pk != null;
  const omriCandidates = result.omri_candidates ?? [];
  // The true match count, which the shown list may be capped below.
  const omriMatchCount = result.omri_candidate_count ?? omriCandidates.length;
  const omriTruncated = omriMatchCount > omriCandidates.length;
  const ambiguousOmri = omriCandidates.length > 1;
  const omriAttached =
    hasOMRI && attachedOmriPk != null && attachedOmriPk === result.omri_product_pk;
  const hasWSDA = result.wsda_material_pk != null;
  const hasNL = result.national_list_substance_pk != null;
  // Nonsynthetic (spinosad, Bt, d-limonene): allowed without a National List entry, so it is never
  // badged "National List" and prints no section.
  const nlNonsynthetic = hasNL && result.national_list_is_entry === false;
  const noMatch = !hasOMRI && !hasWSDA && !hasNL;
  // 33 of the 97 seeded National List rows are prohibited, and they answer ordinary searches:
  // "manure" returns "Ash from manure burning" (§ 205.602).
  const nlProhibited = hasNL && (result.national_list_status || '').toLowerCase() === 'prohibited';

  if (noMatch) {
    const search = `https://www.omri.org/omri-search?query=${encodeURIComponent(query)}`;
    return (
      <Alert status="warning" fontSize="xs" mt={2}>
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text>
            {intl.formatMessage({
              id: 'inputVerify.noMatch',
              defaultMessage:
                'No match in OMRI, WSDA, or the National List. This is allowed — the drift detector will stamp a finding on save so you can reconcile with your certifier.'
            })}
          </Text>
          <Link
            href={search}
            isExternal
            fontSize="xs"
            color="blue.600"
            display="inline-flex"
            gap={1}
            alignItems="center">
            {intl.formatMessage({
              id: 'inputVerify.searchOmri',
              defaultMessage: 'Search omri.org manually'
            })}
            <Icon as={FaExternalLinkAlt} boxSize={2.5} />
          </Link>
        </VStack>
      </Alert>
    );
  }

  return (
    <VStack align="stretch" spacing={2} mt={2}>
      {nlProhibited && (
        <Alert status="error" fontSize="xs" mt={0}>
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="semibold">
              {intl.formatMessage({
                id: 'inputVerify.prohibited.title',
                defaultMessage: 'Prohibited in organic crop production'
              })}
            </Text>
            <Text>
              {intl.formatMessage(
                {
                  id: 'inputVerify.prohibited.body',
                  defaultMessage:
                    '{name} is on the National List as prohibited ({section}). Using it on certified organic land is a violation your certifier must be told about — it is not something to record as an approved input.'
                },
                {
                  name: result.national_list_substance_name || '',
                  section: result.national_list_cfr_section
                    ? `\u00a7 ${result.national_list_cfr_section}`
                    : '\u00a7 205.602'
                }
              )}
            </Text>
          </VStack>
        </Alert>
      )}
      {/*
        Ambiguous query — every match, and no one-tap attach on a guess.
        MEASURED 2026-09-01: "Neptune" satisfies six catalog rows and the matcher's
        "prefer the shorter name" tiebreaker returns *Organic Fish Fertilizer 2-4-1*, while the
        grower may be holding *Organic Fish and Seaweed Fertilizer 2-3-1* — a different product,
        also in the catalog. That is the example `consumer-omri-listing-leak-2026-08-09` uses,
        and one tap would have persisted it. When the answer is not unique the row is not an
        answer, so the alternatives are shown and the grower picks their own.
      */}
      {ambiguousOmri && (
        <VStack align="stretch" spacing={2}>
          <Text fontSize="xs" color="gray.700" fontWeight="medium">
            {intl.formatMessage(
              {
                id: 'inputVerify.multipleMatches',
                defaultMessage:
                  '{count} products match "{query}". Pick the one on your label — or type the full name.'
              },
              // The TOTAL, not the number of rows drawn — saying "6 match" while showing 6 of
              // 7 hides the possibility that the seventh is theirs.
              { count: omriMatchCount, query }
            )}
          </Text>
          {omriTruncated && (
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage(
                {
                  id: 'inputVerify.matchesTruncated',
                  defaultMessage:
                    'Showing the closest {shown}. Type more of the name to see the rest.'
                },
                { shown: omriCandidates.length }
              )}
            </Text>
          )}
          {omriCandidates.map((candidate) => (
            <MatchRow
              key={candidate.pk}
              badgeLabel="OMRI"
              badgeColor="purple"
              title={candidate.product_name}
              subtitle={omriSubtitle(candidate)}
              action={
                onAttachOmri ? (
                  attachedOmriPk === candidate.pk ? (
                    <HStack spacing={2}>
                      <Text
                        fontSize="xs"
                        color="green.700"
                        fontWeight="semibold"
                        whiteSpace="nowrap">
                        {intl.formatMessage({
                          id: 'inputVerify.attached',
                          defaultMessage: 'Attached to this record'
                        })}
                      </Text>
                      <Button
                        size="xs"
                        variant="link"
                        colorScheme="gray"
                        {...TOUCH_TARGET}
                        onClick={() => onAttachOmri(null)}>
                        {intl.formatMessage({
                          id: 'inputVerify.detach',
                          defaultMessage: 'Remove'
                        })}
                      </Button>
                    </HStack>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="green"
                      {...TOUCH_TARGET}
                      onClick={() => onAttachOmri(candidate.pk)}>
                      {intl.formatMessage({
                        id: 'inputVerify.attach',
                        defaultMessage: 'Use this listing'
                      })}
                    </Button>
                  )
                ) : undefined
              }
            />
          ))}
        </VStack>
      )}
      {hasOMRI && !ambiguousOmri && (
        <MatchRow
          badgeLabel="OMRI"
          badgeColor="purple"
          title={result.omri_product_name || ''}
          // Through `omriSubtitle`, so the UNAMBIGUOUS match carries its edition date too.
          // It used to build `OMRI #<id>` inline and print no edition, which had it exactly
          // backwards: the edition appeared only in the multi-match list, and was missing from
          // the single row a grower actually attaches to a record. Same daily-republication
          // reason as above, on the path that ends in a stored listing.
          //
          // Reading the candidate rather than the top-level fields is safe and not a guess:
          // `matched_omri` IS `omri_candidates[0]` on both server branches
          // (certifications/views.py:206 and :217), so a match always has its row here. The
          // `find` is still by pk, and it still falls back to the ID alone, so a response that
          // ever stops holding the row degrades to the old subtitle instead of dropping the ID.
          subtitle={
            omriSubtitle(
              omriCandidates.find((candidate) => candidate.pk === result.omri_product_pk) ?? {
                omri_id: result.omri_product_id ?? null
              }
            ) || undefined
          }
          action={
            onAttachOmri ? (
              omriAttached ? (
                <HStack spacing={2}>
                  <Text fontSize="xs" color="green.700" fontWeight="semibold" whiteSpace="nowrap">
                    {intl.formatMessage({
                      id: 'inputVerify.attached',
                      defaultMessage: 'Attached to this record'
                    })}
                  </Text>
                  <Button
                    size="xs"
                    variant="link"
                    colorScheme="gray"
                    {...TOUCH_TARGET}
                    onClick={() => onAttachOmri(null)}>
                    {intl.formatMessage({ id: 'inputVerify.detach', defaultMessage: 'Remove' })}
                  </Button>
                </HStack>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="green"
                  {...TOUCH_TARGET}
                  onClick={() => onAttachOmri(result.omri_product_pk as number)}>
                  {intl.formatMessage({
                    id: 'inputVerify.attach',
                    defaultMessage: 'Use this listing'
                  })}
                </Button>
              )
            ) : undefined
          }
        />
      )}
      {hasWSDA && (
        <MatchRow
          badgeLabel="WSDA"
          badgeColor="teal"
          title={result.wsda_material_name || ''}
          subtitle={[
            wsdaProductNumber(result.wsda_material_id)
              ? intl.formatMessage(
                  {
                    id: 'inputVerify.wsdaProductNumber',
                    defaultMessage: 'WSDA Product #{number}'
                  },
                  { number: wsdaProductNumber(result.wsda_material_id) }
                )
              : '',
            result.wsda_material_category
          ]
            .filter(Boolean)
            .join(' · ')}
          /*
            Attachable since 2026-09-02. It was not, and the record had no WSDA column — so a
            product listed only by WSDA (23 of the 42 seeded brands: Feather Meal 13-0-0,
            AzaMax, Kaligreen, Madex HP …) could never be more than "grower-reported", and a
            grower after the stronger chip was quietly pushed to attach a neighbouring OMRI
            row instead. CCOF accepts either listing; the record now holds either.
          */
          action={
            onAttachWsda ? (
              attachedWsdaPk != null && attachedWsdaPk === result.wsda_material_pk ? (
                <HStack spacing={2}>
                  <Text fontSize="xs" color="green.700" fontWeight="semibold" whiteSpace="nowrap">
                    {intl.formatMessage({
                      id: 'inputVerify.attached',
                      defaultMessage: 'Attached to this record'
                    })}
                  </Text>
                  <Button
                    size="xs"
                    variant="link"
                    colorScheme="gray"
                    {...TOUCH_TARGET}
                    onClick={() => onAttachWsda(null)}>
                    {intl.formatMessage({ id: 'inputVerify.detach', defaultMessage: 'Remove' })}
                  </Button>
                </HStack>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="green"
                  {...TOUCH_TARGET}
                  onClick={() => onAttachWsda(result.wsda_material_pk as number)}>
                  {intl.formatMessage({
                    id: 'inputVerify.attach',
                    defaultMessage: 'Use this listing'
                  })}
                </Button>
              )
            ) : undefined
          }
        />
      )}
      {hasNL && (
        <MatchRow
          badgeLabel={
            nlNonsynthetic
              ? intl.formatMessage({
                  id: 'inputVerify.nonsynthetic',
                  defaultMessage: 'Nonsynthetic'
                })
              : intl.formatMessage({
                  id: 'inputVerify.nationalList',
                  defaultMessage: 'National List'
                })
          }
          badgeColor={nlNonsynthetic ? 'gray' : 'blue'}
          title={result.national_list_substance_name || ''}
          tone={nlProhibited ? 'prohibited' : 'allowed'}
          subtitle={[
            nlNonsynthetic
              ? intl.formatMessage({
                  id: 'inputVerify.nonsyntheticNote',
                  defaultMessage: 'allowed without a National List entry'
                })
              : result.national_list_citation || result.national_list_cfr_section,
            // Two static ids, not one interpolated one: a dynamic message id is invisible to the
            // locale-parity test and shows up as a runtime "missing message" instead.
            nlProhibited
              ? intl.formatMessage({
                  id: 'inputVerify.nlStatus.prohibited',
                  defaultMessage: 'prohibited'
                })
              : intl.formatMessage({
                  id: 'inputVerify.nlStatus.allowed',
                  defaultMessage: 'allowed'
                })
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      )}
      <Text fontSize="xs" color="gray.500">
        {intl.formatMessage({
          id: 'inputVerify.reminder',
          defaultMessage:
            'Matching a catalog does not approve the input on your OSP. Your certifier adds approved inputs to the OSP separately.'
        })}
      </Text>
    </VStack>
  );
};

/**
 * MEASURED on the rendered app (contrast probe, 2026-08-28), because this theme's red scale is
 * Material's, not Chakra's — `red.700` here is #D32F2F, not #9B2C2C. On `red.50`: red.700 = 4.36
 * (FAILS 4.5 for the 12px subtitle), red.800 = 4.92, red.900 = 5.75. `red.300` as a border is 2.99
 * on white — one hundredth under the 3.0 non-text floor — so the border is red.500 (3.68).
 *
 * A catalog hit is not automatically good news. The National List holds BOTH the § 205.601
 * allowed substances and the § 205.602 prohibited ones, so "found in the National List" can mean
 * either. Rendering both in the same green check card told a grower that a prohibited substance
 * had been verified — the word "prohibited" sat in a grey 12px subtitle under a green tick.
 */
const MatchRow: React.FC<{
  badgeLabel: string;
  badgeColor: string;
  title: string;
  subtitle?: string;
  tone?: 'allowed' | 'prohibited';
  /** Grower action for this row (attach / detach). Rendered after the text, never before. */
  action?: React.ReactNode;
}> = ({ badgeLabel, badgeColor, title, subtitle, tone = 'allowed', action }) => (
  /*
   * Column below 480px, row above.
   *
   * MEASURED 2026-09-01 at 390px: inline, the attach button left ~150px for the title and
   * "Entrust SC Naturalyte Insect Control" rendered as "Entrust SC Naturalyte Insect…". The
   * product name is the evidence on this card — it is what the grower checks against the label
   * in their hand — so the action drops beneath it rather than truncating it. With no action
   * the Stack has a single child and column vs row is indistinguishable, so rows without one
   * are unchanged.
   */
  <Stack
    direction={{ base: 'column', smd: 'row' }}
    spacing={2}
    align={{ base: 'stretch', smd: 'center' }}
    p={2}
    bg={tone === 'prohibited' ? 'red.50' : 'green.50'}
    borderWidth="1px"
    borderColor={tone === 'prohibited' ? 'red.500' : 'green.200'}
    borderRadius="md"
    _dark={
      tone === 'prohibited'
        ? { bg: 'red.900', borderColor: 'red.600' }
        : { bg: 'green.900', borderColor: 'green.700' }
    }
    data-tone={tone}>
    <HStack spacing={2} align="center" flex={1} minW={0}>
      <Icon
        as={tone === 'prohibited' ? FaExclamationTriangle : FaCheckCircle}
        color={tone === 'prohibited' ? 'red.800' : 'green.500'}
        // Dark mode is not reachable in this app today (no ColorModeScript, no toggle), but the
        // `_dark` background above is already declared — and red.800/red.900 glyphs on a red.900
        // ground would be the same colour twice. Declared light so the trap is not waiting.
        _dark={{ color: tone === 'prohibited' ? 'red.100' : 'green.200' }}
      />
      <Badge colorScheme={badgeColor} fontSize="11px">
        {badgeLabel}
      </Badge>
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text
            fontSize="xs"
            color={tone === 'prohibited' ? 'red.900' : 'gray.600'}
            _dark={{ color: tone === 'prohibited' ? 'red.100' : 'gray.300' }}
            fontWeight={tone === 'prohibited' ? 'semibold' : 'normal'}
            noOfLines={1}>
            {subtitle}
          </Text>
        )}
      </Box>
    </HStack>
    {action && (
      <Box flexShrink={0} alignSelf={{ base: 'flex-start', smd: 'center' }}>
        {action}
      </Box>
    )}
  </Stack>
);

export default InputVerifyHelper;
