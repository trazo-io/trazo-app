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
 * (current field value) from the form. The farmer clicks "Verify" — we call
 * the endpoint and render the result inline.
 */

import React from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  HStack,
  Icon,
  Link,
  Text,
  VStack
} from '@chakra-ui/react';
import { FaCheckCircle, FaExclamationTriangle, FaExternalLinkAlt, FaSearch } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { useLazyVerifyInputQuery } from 'store/api/ospApi';
import type { InputVerifyResult } from 'types/osp';

interface InputVerifyHelperProps {
  /** Current value of the input field the farmer is about to save. */
  name: string;
  /** Optional override of the user-visible "Verify" button label. */
  buttonLabel?: string;
}

const InputVerifyHelper: React.FC<InputVerifyHelperProps> = ({ name, buttonLabel }) => {
  const intl = useIntl();
  const [verify, { data, isFetching, isUninitialized, error }] = useLazyVerifyInputQuery();

  const trimmed = (name || '').trim();
  const disabled = trimmed.length < 2 || isFetching;

  const handleClick = () => {
    if (!trimmed) return;
    verify({ name: trimmed });
  };

  return (
    <Box mt={2}>
      <HStack spacing={2} align="center">
        <Button
          size="xs"
          variant="outline"
          colorScheme="green"
          leftIcon={<FaSearch />}
          onClick={handleClick}
          isLoading={isFetching}
          isDisabled={disabled}
          // Rendered 24px tall at 375px — barely half the 44px touch minimum, on the one
          // control that tells an organic grower whether the input they just typed is even
          // allowed, tapped standing in an orchard. Extend the HIT AREA without changing the
          // visual size (same technique as the consumer page's info triggers), so the compact
          // inline layout this sits in is preserved.
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            minWidth: '44px',
            height: '44px'
          }}>
          {buttonLabel ||
            intl.formatMessage({
              id: 'inputVerify.button',
              defaultMessage: 'Verify against OMRI / WSDA / National List'
            })}
        </Button>
        {!isUninitialized && data && (
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'inputVerify.checked', defaultMessage: 'Checked just now' })}
          </Text>
        )}
      </HStack>

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

      {!isUninitialized && data && <ResultCard result={data} query={trimmed} />}
    </Box>
  );
};

const ResultCard: React.FC<{ result: InputVerifyResult; query: string }> = ({ result, query }) => {
  const intl = useIntl();
  const hasOMRI = result.omri_product_pk != null;
  const hasWSDA = result.wsda_material_pk != null;
  const hasNL = result.national_list_substance_pk != null;
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
        <Alert status="error" fontSize="xs" mt={0} alignItems="flex-start">
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
      {hasOMRI && (
        <MatchRow
          badgeLabel="OMRI"
          badgeColor="purple"
          title={result.omri_product_name || ''}
          subtitle={result.omri_product_id ? `OMRI #${result.omri_product_id}` : undefined}
        />
      )}
      {hasWSDA && (
        <MatchRow
          badgeLabel="WSDA"
          badgeColor="teal"
          title={result.wsda_material_name || ''}
          subtitle={[result.wsda_material_id, result.wsda_material_category]
            .filter(Boolean)
            .join(' · ')}
        />
      )}
      {hasNL && (
        <MatchRow
          badgeLabel={intl.formatMessage({
            id: 'inputVerify.nationalList',
            defaultMessage: 'National List'
          })}
          badgeColor="blue"
          title={result.national_list_substance_name || ''}
          tone={nlProhibited ? 'prohibited' : 'allowed'}
          subtitle={[
            result.national_list_cfr_section,
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
}> = ({ badgeLabel, badgeColor, title, subtitle, tone = 'allowed' }) => (
  <HStack
    p={2}
    bg={tone === 'prohibited' ? 'red.50' : 'green.50'}
    borderWidth="1px"
    borderColor={tone === 'prohibited' ? 'red.500' : 'green.200'}
    borderRadius="md"
    align="center"
    spacing={2}
    _dark={
      tone === 'prohibited'
        ? { bg: 'red.900', borderColor: 'red.600' }
        : { bg: 'green.900', borderColor: 'green.700' }
    }
    data-tone={tone}>
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
      <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
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
);

export default InputVerifyHelper;
