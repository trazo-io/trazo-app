import React from 'react';
import { Badge, HStack, Icon, Text } from '@chakra-ui/react';
import { FaCheckCircle, FaCertificate, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { VerificationStatus } from 'types/certification';

interface CertificationStatusBadgeProps {
  status: VerificationStatus | string;
  size?: 'sm' | 'md';
}

/**
 * 🔴 `variant`, NOT `colorScheme`.
 *
 * This map used to carry colorSchemes — green / yellow / gray / red. The Badge theme ignores
 * `colorScheme` entirely (every variant hardcodes its colours and `defaultProps.variant` is
 * `brand`), so `variant="subtle"` painted EVERY status the same green: a `self_reported`,
 * `expired`, `revoked` or `suspended` certification was visually identical to one verified
 * against the USDA Organic Integrity Database (found 2026-08-07).
 *
 * That is the exact distinction compliance turns on — `feedback_no_self_reported_trust_signals`
 * and FTC 16 CFR 260.6(d) — so green here has to mean database-backed and nothing else.
 * Only `verified*` may be green.
 */
const STATUS_CONFIG: Record<
  string,
  {
    variant: 'subtle' | 'neutral' | 'warning' | 'danger';
    icon: React.ElementType;
    messageId: string;
  }
> = {
  verified: {
    variant: 'subtle',
    icon: FaCheckCircle,
    messageId: 'certification.badge.verified'
  },
  verified_via_database: {
    variant: 'subtle',
    icon: FaCheckCircle,
    messageId: 'certification.badge.verified'
  },
  // Farmer-attested. Deliberately NEUTRAL, never green and never a warning colour — it is
  // not an error, it simply is not third-party evidence.
  self_reported: {
    variant: 'neutral',
    icon: FaCertificate,
    messageId: 'certification.badge.selfReported'
  },
  pending: {
    variant: 'neutral',
    icon: FaClock,
    messageId: 'certification.badge.pending'
  },
  not_found: {
    variant: 'neutral',
    icon: FaClock,
    messageId: 'certification.badge.pending'
  },
  expired: {
    variant: 'danger',
    icon: FaExclamationTriangle,
    messageId: 'certification.badge.expired'
  },
  revoked: {
    variant: 'danger',
    icon: FaExclamationTriangle,
    messageId: 'certification.badge.revoked'
  },
  suspended: {
    variant: 'danger',
    icon: FaExclamationTriangle,
    messageId: 'certification.badge.revoked'
  },
  inactive: {
    variant: 'danger',
    icon: FaExclamationTriangle,
    messageId: 'certification.badge.expired'
  }
};

const CertificationStatusBadge: React.FC<CertificationStatusBadgeProps> = ({
  status,
  size = 'sm'
}) => {
  const intl = useIntl();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Badge
      variant={config.variant}
      px={2}
      py={size === 'md' ? 1.5 : 1}
      borderRadius="md"
      // The badge baseStyle sets `textTransform: capitalize`, which rewrote real sentences
      // into Title Case — "Verified Via USDA Organic Integrity Database", "Reported By
      // Producer". These labels are prose, not tags.
      textTransform="none"
      // Long labels must wrap as WORDS inside the badge. Without this the badge refuses to
      // shrink, and the certification name beside it gets squeezed to zero width and wraps
      // one character per line ("U/S/D/A/ /O/r/g/a/n/i/c" on a phone).
      whiteSpace="normal"
      maxW="100%"
    >
      <HStack spacing={1} align="flex-start">
        <Icon as={config.icon} boxSize={size === 'md' ? 3.5 : 3} mt="2px" flexShrink={0} />
        <Text fontSize="xs" textAlign="left">
          {intl.formatMessage({ id: config.messageId })}
        </Text>
      </HStack>
    </Badge>
  );
};

export default CertificationStatusBadge;
