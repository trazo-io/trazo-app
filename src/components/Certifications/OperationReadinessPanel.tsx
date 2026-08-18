/**
 * Pre-inspection readiness — what a certifier would reject this operation over.
 *
 * The farmer's real fear is not "my certifier can't see my records", it is "will I
 * pass?" Every blocker here is something an inspector raises as a non-conformance,
 * and every one names the concrete fix, because "OFPP missing" without "upload it
 * on the farm profile" is a puzzle rather than a task.
 *
 * Deliberately reports only what blocks or jeopardises a submission, not everything
 * that could be improved. A checklist that cries wolf gets ignored, and an ignored
 * checklist is worse than none on the morning of an inspection.
 *
 * Two callers, one endpoint, so they can never disagree:
 *   - `variant="preshare"` sits above the certifier-link form
 *   - `variant="dashboard"` is the standalone farm-page checklist
 */
import React from 'react';
import { Alert, AlertIcon, Badge, Box, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardCard } from 'components/Design/StandardComponents';
import { useGetOperationReadinessQuery, type ReadinessItem } from 'store/api/certifierLinkApi';

interface Props {
  companyId: string;
  farmId: string;
  variant?: 'preshare' | 'dashboard';
}

const ItemRow: React.FC<{ item: ReadinessItem }> = ({ item }) => {
  const isBlocker = item.status === 'blocker';
  return (
    <Box borderLeftWidth="3px" borderLeftColor={isBlocker ? 'red.500' : 'orange.400'} pl={3} py={1}>
      <HStack align="flex-start" spacing={2}>
        <Icon
          as={isBlocker ? FaTimesCircle : FaExclamationTriangle}
          color={isBlocker ? 'red.500' : 'orange.400'}
          mt={1}
          boxSize={3.5}
          flexShrink={0}
        />
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {item.title}
          </Text>
          {item.detail && (
            <Text fontSize="xs" color="gray.600">
              {item.detail}
            </Text>
          )}
          {item.fix && (
            <Text fontSize="xs" color="green.700" fontWeight="medium" mt={0.5}>
              {item.fix}
            </Text>
          )}
        </Box>
      </HStack>
    </Box>
  );
};

const OperationReadinessPanel: React.FC<Props> = ({ companyId, farmId, variant = 'dashboard' }) => {
  const intl = useIntl();
  const { data, isLoading } = useGetOperationReadinessQuery({ companyId, farmId });

  if (isLoading || !data) return null;

  // A conventional operation is not subject to the NOP checks, so it gets no
  // panel at all rather than a reassuring-but-meaningless "Ready".
  if (!data.applicable) return null;

  const problems = [...data.blockers, ...data.warnings];

  // Pre-share: stay silent when everything is fine. The farmer came to send a
  // link, not to read a green tick.
  if (variant === 'preshare' && problems.length === 0) return null;

  const body = (
    <VStack align="stretch" spacing={3}>
      {data.ready && problems.length === 0 && (
        <Alert status="success">
          <AlertIcon />
          <Text fontSize="sm">
            {intl.formatMessage({
              id: 'readiness.allClear',
              defaultMessage:
                'No blockers found. Your records are in a state a certifier will accept.'
            })}
          </Text>
        </Alert>
      )}

      {data.blockers.length > 0 && (
        <Alert status="error">
          <AlertIcon />
          <Text fontSize="sm">
            {intl.formatMessage({
              id: 'readiness.blockedIntro',
              defaultMessage:
                'A certifier will not accept this operation until these are resolved. Sharing is blocked.'
            })}
          </Text>
        </Alert>
      )}

      {problems.map((item) => (
        <ItemRow key={item.key} item={item} />
      ))}
    </VStack>
  );

  if (variant === 'preshare') {
    return <Box mb={3}>{body}</Box>;
  }

  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'readiness.title',
        defaultMessage: 'Inspection readiness'
      })}
      variant="elevated"
      padding={{ base: 3, md: 4 }}>
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage({
              id: 'readiness.description',
              defaultMessage: 'What your inspector will check before you are certified.'
            })}
          </Text>
          <Badge colorScheme={data.ready ? 'green' : 'red'}>
            <HStack spacing={1}>
              <Icon as={data.ready ? FaCheckCircle : FaTimesCircle} boxSize={3} />
              <Text as="span">
                {data.ready
                  ? intl.formatMessage({ id: 'readiness.badge.ready', defaultMessage: 'Ready' })
                  : intl.formatMessage(
                      {
                        id: 'readiness.badge.blocked',
                        defaultMessage: '{count} to fix'
                      },
                      { count: data.blockers.length }
                    )}
              </Text>
            </HStack>
          </Badge>
        </HStack>
        {body}
      </VStack>
    </StandardCard>
  );
};

export default OperationReadinessPanel;
