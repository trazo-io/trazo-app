/**
 * Consumer QR organic claim badge — Sprint 5A.
 *
 * Renders the `organic_claim` block returned under `standard_view.organic_claim`
 * by the transparency endpoint. The backend gate (ConsumerClaimValidator,
 * trazo-back/certifications/services/consumer_claim_validator.py) is the
 * regulatory source of truth — this component just surfaces the decision with
 * FTC-compliant language per 16 CFR 260.6(d).
 *
 * Rendering rules:
 *   certified_organic  -> green "USDA Certified Organic" badge + verification basis
 *   transitioning      -> yellow "Transitioning to Organic" badge + progress
 *   self_reported      -> gray "Farmer-reported practices" badge + disclaimer
 *   conventional       -> render nothing (no affirmative claim to make)
 *
 * Never show organic language unless the backend validator says we can. The
 * badge reads the server's decision rather than making its own to ensure
 * frontend and backend never drift.
 */

import React from 'react';
import {
  Badge,
  Box,
  Collapse,
  HStack,
  Icon,
  Link,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaLeaf,
  FaSeedling
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { OrganicClaim } from 'types/certification';

interface OrganicClaimBadgeProps {
  claim?: OrganicClaim | null;
}

// status -> colorScheme / icon mapping. Keep in sync with backend status_color.
const STATUS_STYLE: Record<
  OrganicClaim['status'],
  { colorScheme: string; bg: string; border: string; icon: React.ElementType; labelId: string }
> = {
  certified_organic: {
    colorScheme: 'green',
    bg: 'green.50',
    border: 'green.200',
    icon: FaCheckCircle,
    labelId: 'osp.claim.certifiedOrganic'
  },
  transitioning: {
    colorScheme: 'yellow',
    bg: 'yellow.50',
    border: 'yellow.300',
    icon: FaSeedling,
    labelId: 'osp.claim.transitioning'
  },
  self_reported: {
    colorScheme: 'gray',
    bg: 'gray.50',
    border: 'gray.200',
    icon: FaLeaf,
    labelId: 'osp.claim.selfReported'
  },
  conventional: {
    // conventional renders nothing — entries here just satisfy the record type.
    colorScheme: 'gray',
    bg: 'gray.50',
    border: 'gray.200',
    icon: FaLeaf,
    labelId: 'osp.claim.conventional'
  }
};

const OrganicClaimBadge: React.FC<OrganicClaimBadgeProps> = ({ claim }) => {
  const intl = useIntl();
  const { isOpen, onToggle } = useDisclosure();
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const subtextColor = useColorModeValue('gray.600', 'gray.400');

  // Nothing to say for conventional productions — silence is the correct
  // consumer experience per 7 CFR 205.100 (no affirmative claim to make).
  if (!claim || claim.status === 'conventional') return null;

  // Defensive fallback: if the backend ever ships an unknown status value,
  // render nothing rather than crash. Silence beats a broken badge.
  // Phase 3 lot gate: a certified FARM whose LOT is ineligible (prohibited
  // input, cert not valid at harvest, crop not in scope) must not wear the
  // green seal. Server flips can_display_organic + rewrites display_label/
  // disclaimer; here we swap the presentation to the neutral gray tier.
  const lotSuppressed = claim.status === 'certified_organic' && claim.can_display_organic === false;
  const style = lotSuppressed ? STATUS_STYLE.self_reported : STATUS_STYLE[claim.status];
  if (!style) return null;

  // Transition progress: "X of 36 months documented."
  const progressText = (() => {
    if (claim.status !== 'transitioning') return null;
    if (claim.days_remaining == null || claim.transition_complete_date == null) return null;
    return intl.formatMessage(
      { id: 'osp.claim.transitioningProgress' },
      {
        days: claim.days_remaining,
        completeDate: claim.transition_complete_date
      }
    );
  })();

  return (
    <Box
      mt={3}
      p={3}
      bg={style.bg}
      borderRadius="md"
      borderWidth="1px"
      borderColor={style.border}
      role="status"
      aria-live="polite"
    >
      <HStack spacing={2} align="flex-start">
        <Icon as={style.icon} color={`${style.colorScheme}.600`} boxSize={4} mt="2px" />
        <VStack align="stretch" spacing={1} flex={1}>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontWeight="bold" fontSize="sm" color={textColor}>
              {claim.display_label}
            </Text>
            <Badge
              colorScheme={style.colorScheme}
              variant="subtle"
              fontSize="xs"
              borderRadius="full"
              px={2}
            >
              {intl.formatMessage({
                id: lotSuppressed ? 'osp.claim.lotNotOrganic' : style.labelId
              })}
            </Badge>
          </HStack>

          {progressText && (
            <Text fontSize="xs" color={subtextColor}>
              {progressText}
            </Text>
          )}

          {/* Disclosure trigger — FTC 16 CFR 260.6(d) requires basis of claim
              be available to the consumer. */}
          <HStack
            as="button"
            onClick={onToggle}
            spacing={1}
            cursor="pointer"
            color={`${style.colorScheme}.700`}
            _hover={{ color: `${style.colorScheme}.800` }}
            alignSelf="flex-start"
            pt={1}
            aria-expanded={isOpen}
          >
            <Icon as={FaInfoCircle} boxSize={3} />
            <Text fontSize="xs" fontWeight="semibold">
              {intl.formatMessage({
                id: isOpen ? 'osp.claim.hideDetails' : 'osp.claim.whatDoesThisMean'
              })}
            </Text>
            <Icon as={isOpen ? FaChevronUp : FaChevronDown} boxSize={2.5} />
          </HStack>

          <Collapse in={isOpen} animateOpacity>
            <Box pt={2}>
              <Text fontSize="xs" color={subtextColor} lineHeight="1.5">
                {claim.disclaimer}
              </Text>
              {claim.status === 'certified_organic' && !lotSuppressed && (
                <Link
                  href="https://www.ams.usda.gov/rules-regulations/organic"
                  isExternal
                  fontSize="xs"
                  color="green.600"
                  mt={1}
                  display="inline-block"
                >
                  {intl.formatMessage({ id: 'osp.claim.learnMoreUsda' })}
                </Link>
              )}
              {claim.status === 'transitioning' && (
                <Link
                  href="https://www.ecfr.gov/current/title-7/subtitle-B/chapter-I/subchapter-M/part-205/subpart-C/section-205.202"
                  isExternal
                  fontSize="xs"
                  color="yellow.700"
                  mt={1}
                  display="inline-block"
                >
                  {intl.formatMessage({ id: 'osp.claim.learnMoreTransition' })}
                </Link>
              )}
            </Box>
          </Collapse>
        </VStack>
      </HStack>
    </Box>
  );
};

export default OrganicClaimBadge;
