/**
 * G8.0 §D: the supply-chain scenarios CCOF G8.0 D1 asks the operation to mark (2026-11-19).
 *
 * Organic seed or planting stock bought in, organic product sourced for resale, crops stored or
 * handled by another operation, packing under another operation's label. Each one is answered in
 * its own module (G3.0 and G3.0b, G6.5, G6.1 and G6.2, G7.0), so this panel only SHOWS what those
 * answers say, from the server (`certifications/services/sourcing_scenarios.py`). It never asks the
 * question again: a second answer here could disagree with the first, and the packet prints the
 * same rows.
 *
 * Three states, never two: `not_stated` means the module has not been answered yet, and reads as
 * "Not answered yet", never as "No". A failed load is never an empty list.
 */
import React from 'react';
import { Badge, Skeleton, Text } from '@chakra-ui/react';
import { FaExclamationTriangle, FaQuestion, FaStream } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardNotice, StatusList, StatusRow } from 'components/Design/StandardComponents';
import { pickText } from 'config/osp/types';
import { useGetOSPSourcingScenariosQuery } from 'store/api/ospApi';
import type { OSPSourcingScenario } from 'types/osp';

interface OSPSourcingScenariosPanelProps {
  companyId: string;
  farmId: string;
  ospId: number | string;
}

const OSPSourcingScenariosPanel: React.FC<OSPSourcingScenariosPanelProps> = ({
  companyId,
  farmId,
  ospId
}) => {
  const intl = useIntl();
  const scoped = Boolean(companyId && farmId && ospId);
  const { data, isLoading, isError } = useGetOSPSourcingScenariosQuery(
    { companyId, farmId, ospId },
    { skip: !scoped, refetchOnMountOrArgChange: true }
  );

  if (isLoading) {
    return <Skeleton height="120px" borderRadius="md" />;
  }
  if (isError || !scoped || !data) {
    return (
      <StandardNotice
        status="warning"
        mb={0}
        title={intl.formatMessage({ id: 'osp.sourcingScenarios.loadFailed' })}
      />
    );
  }

  const list = (codes: string[]) => intl.formatList(codes, { type: 'conjunction' });
  const stateWords = (s: OSPSourcingScenario) =>
    s.state === 'yes'
      ? intl.formatMessage({ id: 'osp.sourcingScenarios.state.yes' })
      : s.state === 'no'
      ? intl.formatMessage({ id: 'osp.sourcingScenarios.state.no' })
      : intl.formatMessage({ id: 'osp.sourcingScenarios.state.notStated' });
  const noneApply = data.scenarios.length > 0 && data.scenarios.every((s) => s.state === 'no');

  return (
    <>
      <StatusList testId="sourcing-scenario-rows">
        {data.scenarios.map((s) => {
          const open = s.state === 'not_stated';
          return (
            <StatusRow
              key={s.key}
              testId="sourcing-scenario-row"
              tone={open ? 'warn' : 'neutral'}
              icon={open ? FaQuestion : FaStream}
              title={pickText(s.label, intl.locale)}
              badge={
                <Badge variant={open ? 'warning' : 'subtle'} fontSize="11px">
                  {stateWords(s)}
                </Badge>
              }>
              <Text fontSize="sm" color="gray.600">
                {open
                  ? intl.formatMessage(
                      { id: 'osp.sourcingScenarios.notStatedHint' },
                      // The module whose answer would decide it; the server names it.
                      { modules: list(s.unanswered_in.length ? s.unanswered_in : s.answered_in) }
                    )
                  : intl.formatMessage(
                      { id: 'osp.sourcingScenarios.answeredIn' },
                      { modules: list(s.answered_in) }
                    )}
              </Text>
            </StatusRow>
          );
        })}
        {data.section_b ? (
          // The same check as the packet's [REVIEW] line, shown before a certifier reads it.
          <StatusRow
            testId="sourcing-section-b-row"
            tone="warn"
            icon={FaExclamationTriangle}
            title={intl.formatMessage({ id: 'osp.sourcingScenarios.sectionBTitle' })}>
            <Text fontSize="sm" color="gray.600">
              {data.section_b === 'says_none'
                ? intl.formatMessage({ id: 'osp.sourcingScenarios.sectionBSaysNone' })
                : intl.formatMessage({ id: 'osp.sourcingScenarios.sectionBSaysSome' })}
            </Text>
          </StatusRow>
        ) : null}
      </StatusList>
      {noneApply ? (
        <Text fontSize="sm" color="gray.600" mt={2} data-testid="sourcing-none-apply">
          {intl.formatMessage({ id: 'osp.sourcingScenarios.noneApply' })}
        </Text>
      ) : null}
    </>
  );
};

export default OSPSourcingScenariosPanel;
