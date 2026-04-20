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
        >
          {buttonLabel ||
            intl.formatMessage({ id: 'inputVerify.button', defaultMessage: 'Verify against OMRI / WSDA / National List' })}
        </Button>
        {!isUninitialized && data && (
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'inputVerify.checked', defaultMessage: 'Checked just now' })}
          </Text>
        )}
      </HStack>

      {error && (
        <Alert status="error" borderRadius="md" fontSize="xs" mt={2}>
          <AlertIcon />
          <Text>
            {intl.formatMessage({
              id: 'inputVerify.error',
              defaultMessage: "Couldn't reach the verifier. Save will still work; the drift detector runs after save."
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

  if (noMatch) {
    const search = `https://www.omri.org/omri-search?query=${encodeURIComponent(query)}`;
    return (
      <Alert status="warning" borderRadius="md" fontSize="xs" mt={2}>
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text>
            {intl.formatMessage({
              id: 'inputVerify.noMatch',
              defaultMessage:
                'No match in OMRI, WSDA, or the National List. This is allowed — the drift detector will stamp a finding on save so you can reconcile with your certifier.'
            })}
          </Text>
          <Link href={search} isExternal fontSize="xs" color="blue.600" display="inline-flex" gap={1} alignItems="center">
            {intl.formatMessage({ id: 'inputVerify.searchOmri', defaultMessage: 'Search omri.org manually' })}
            <Icon as={FaExternalLinkAlt} boxSize={2.5} />
          </Link>
        </VStack>
      </Alert>
    );
  }

  return (
    <VStack align="stretch" spacing={2} mt={2}>
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
          subtitle={[result.wsda_material_id, result.wsda_material_category].filter(Boolean).join(' · ')}
        />
      )}
      {hasNL && (
        <MatchRow
          badgeLabel={intl.formatMessage({ id: 'inputVerify.nationalList', defaultMessage: 'National List' })}
          badgeColor="blue"
          title={result.national_list_substance_name || ''}
          subtitle={[result.national_list_cfr_section, result.national_list_status].filter(Boolean).join(' · ')}
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

const MatchRow: React.FC<{
  badgeLabel: string;
  badgeColor: string;
  title: string;
  subtitle?: string;
}> = ({ badgeLabel, badgeColor, title, subtitle }) => (
  <HStack
    p={2}
    bg="green.50"
    borderWidth="1px"
    borderColor="green.200"
    borderRadius="md"
    align="center"
    spacing={2}
    _dark={{ bg: 'green.900', borderColor: 'green.700' }}
  >
    <Icon as={FaCheckCircle} color="green.500" />
    <Badge colorScheme={badgeColor} fontSize="11px">
      {badgeLabel}
    </Badge>
    <Box flex={1} minW={0}>
      <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
        {title}
      </Text>
      {subtitle && (
        <Text fontSize="xs" color="gray.600" noOfLines={1}>
          {subtitle}
        </Text>
      )}
    </Box>
  </HStack>
);

export default InputVerifyHelper;
