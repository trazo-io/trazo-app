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
 * ONE caller (2026-11-04): it sits above the certifier-link form and stays silent when there
 * is nothing to fix. A `dashboard` variant lived here too, with no caller anywhere. It is
 * deleted rather than restyled because it carried a VERDICT: a green "Ready" badge and "Your
 * records are in a state a certifier will accept". Trazo checks what is on file; the certifying
 * agent decides (compliance.md). The farm-home card (CertifierReadinessCard) already shows these
 * same operation findings as counts and rows, without a verdict.
 *
 * Rows are StatusRows, the same treatment and glyphs as the farm-home card, so the two lists of
 * the same findings look the same. They were boxes with a 3px red/orange edge under a red Alert.
 */
import React from 'react';
import { Text, VStack } from '@chakra-ui/react';
import { FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StatusList, StatusRow } from 'components/Design/StandardComponents';
import { useGetOperationReadinessQuery } from 'store/api/certifierLinkApi';

import { resolveReadinessItem } from './readinessMessages';

interface Props {
  companyId: string;
  farmId: string;
}

const OperationReadinessPanel: React.FC<Props> = ({ companyId, farmId }) => {
  const intl = useIntl();
  const { data, isLoading } = useGetOperationReadinessQuery({ companyId, farmId });

  if (isLoading || !data) return null;

  // A conventional operation is not subject to the NOP checks, so it gets no
  // panel at all rather than a reassuring-but-meaningless "Ready".
  if (!data.applicable) return null;

  const problems = [...data.blockers, ...data.warnings];

  // Stay silent when everything is fine. The farmer came to send a link, not to read a green tick.
  if (problems.length === 0) return null;

  return (
    <VStack align="stretch" spacing={1} mb={3} data-testid="operation-readiness-preshare">
      {/* Why the link button below is disabled, and that this is Trazo's check, not a verdict.
          A sentence, not a red Alert slab: the rows under it already carry the urgency. */}
      {data.blockers.length > 0 && (
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage({
            id: 'readiness.blockedIntro',
            defaultMessage:
              'Trazo requires these records before it creates a review link. These are checks on what is on file in Trazo, not a certification decision.'
          })}
        </Text>
      )}
      <StatusList>
        {problems.map((item) => {
          const isBlocker = item.status === 'blocker';
          // The server sends a `code` and the values; the sentence is written in the viewer's
          // locale. Its English title/detail/fix stay on the wire for the packet.
          const words = resolveReadinessItem(item, intl);
          return (
            <StatusRow
              key={item.key}
              tone={isBlocker ? 'crit' : 'warn'}
              icon={isBlocker ? FaExclamationCircle : FaInfoCircle}
              title={words.title}>
              {words.detail && (
                <Text fontSize="xs" color="gray.600" lineHeight="1.5">
                  {words.detail}
                </Text>
              )}
              {/* Gray, not green: in green the instruction reads as a link (as on the farm home). */}
              {words.fix && (
                <Text fontSize="xs" color="gray.700" fontWeight="medium">
                  {words.fix}
                </Text>
              )}
            </StatusRow>
          );
        })}
      </StatusList>
    </VStack>
  );
};

export default OperationReadinessPanel;
