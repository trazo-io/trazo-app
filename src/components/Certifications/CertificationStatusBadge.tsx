import React from 'react';
import { Badge, HStack, Icon, Text } from '@chakra-ui/react';
import { FaCheckCircle, FaCertificate, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { VerificationStatus } from 'types/certification';

interface CertificationStatusBadgeProps {
  status: VerificationStatus | string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  string,
  {
    colorScheme: string;
    icon: React.ElementType;
    messageId: string;
  }
> = {
  verified: {
    colorScheme: 'green',
    icon: FaCheckCircle,
    messageId: 'certification.badge.verified'
  },
  verified_via_database: {
    colorScheme: 'green',
    icon: FaCheckCircle,
    messageId: 'certification.badge.verified'
  },
  self_reported: {
    colorScheme: 'yellow',
    icon: FaCertificate,
    messageId: 'certification.badge.selfReported'
  },
  pending: {
    colorScheme: 'gray',
    icon: FaClock,
    messageId: 'certification.badge.pending'
  },
  not_found: {
    colorScheme: 'gray',
    icon: FaClock,
    messageId: 'certification.badge.pending'
  },
  expired: {
    colorScheme: 'red',
    icon: FaExclamationTriangle,
    messageId: 'certification.badge.expired'
  },
  revoked: {
    colorScheme: 'red',
    icon: FaExclamationTriangle,
    messageId: 'certification.badge.revoked'
  },
  suspended: {
    colorScheme: 'red',
    icon: FaExclamationTriangle,
    messageId: 'certification.badge.revoked'
  },
  inactive: {
    colorScheme: 'red',
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
      colorScheme={config.colorScheme}
      variant="subtle"
      px={2}
      py={size === 'md' ? 1.5 : 1}
      borderRadius="md"
    >
      <HStack spacing={1}>
        <Icon as={config.icon} boxSize={size === 'md' ? 3.5 : 3} />
        <Text fontSize="xs">{intl.formatMessage({ id: config.messageId })}</Text>
      </HStack>
    </Badge>
  );
};

export default CertificationStatusBadge;
