/**
 * CertifyingAgentPicker — the one control for naming the operation's certifying agent.
 *
 * 🔴 2026-09-10. The agent was a free-text box in two places, matched against an alias table that
 * knew three agents. "OCI", a typo of "Oregon Tilth", or any agent Trazo holds no form register
 * for silently produced a renewal packet numbered to CCOF's forms, and a first-year applicant had
 * nowhere to name an agent at all. The list comes from the backend (`certifying_agents`), the same
 * data the packet resolves against, so a picked name always means the agent it says.
 *
 * It stores the agent's Organic Integrity Database spelling, the name the packet prints, or under
 * "Other" whatever the grower types. It never blocks: if the list cannot be loaded it degrades to
 * the plain text box it replaced.
 */
import React, { useState } from 'react';
import { Text, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { StandardInput, StandardSelect } from 'components/Design/StandardComponents';
import { useGetCertifyingAgentsQuery } from 'store/api/certificationApi';
import type { CertifyingAgentOption } from 'types/certification';

const OTHER = '__other__';

export const certifyingAgentLabel = (agent: CertifyingAgentOption) =>
  agent.short_name ? `${agent.name} (${agent.short_name})` : agent.name;

interface CertifyingAgentPickerProps {
  value: string;
  onChange: (name: string) => void;
  isDisabled?: boolean;
  /** Say under the control whether the packet is numbered to the picked agent's own forms. */
  showNumbering?: boolean;
  /** Accessible name when the picker is not inside a `StandardField`, whose label names it. */
  ariaLabel?: string;
}

const CertifyingAgentPicker = ({
  value,
  onChange,
  isDisabled = false,
  showNumbering = false,
  ariaLabel
}: CertifyingAgentPickerProps) => {
  const intl = useIntl();
  // Inside a StandardField both controls would otherwise inherit the FormControl's one id, and
  // the label would point at whichever rendered first.
  const otherId = React.useId();
  const { data: agents, isLoading, isError } = useGetCertifyingAgentsQuery();
  const [choseOther, setChoseOther] = useState(false);

  const trimmed = value.trim();
  const picked = agents?.find((agent) => agent.name === trimmed);
  // A stored name that is not on the list is an earlier "Other" answer, or text typed before the
  // picker existed: it opens in the text box rather than being dropped. Once in "Other", clearing
  // the box keeps it open; `choseOther` is what remembers that.
  const isOther = !picked && (choseOther || trimmed !== '');

  const otherPlaceholder = intl.formatMessage({ id: 'certifyingAgent.otherPlaceholder' });

  if (isError || (!isLoading && !agents)) {
    return (
      <StandardInput
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        isDisabled={isDisabled}
        placeholder={otherPlaceholder}
        aria-label={ariaLabel}
        maxLength={200}
      />
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      <StandardSelect
        value={picked ? picked.name : isOther ? OTHER : ''}
        aria-label={ariaLabel}
        isDisabled={isDisabled || isLoading}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const next = e.target.value;
          setChoseOther(next === OTHER);
          onChange(next === OTHER ? '' : next);
        }}>
        <option value="">
          {intl.formatMessage({
            id: isLoading ? 'certifyingAgent.loading' : 'certifyingAgent.placeholder'
          })}
        </option>
        {(agents ?? []).map((agent) => (
          <option key={agent.slug} value={agent.name}>
            {certifyingAgentLabel(agent)}
          </option>
        ))}
        <option value={OTHER}>{intl.formatMessage({ id: 'certifyingAgent.other' })}</option>
      </StandardSelect>

      {isOther ? (
        <>
          <StandardInput
            id={otherId}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            isDisabled={isDisabled}
            placeholder={otherPlaceholder}
            aria-label={otherPlaceholder}
            maxLength={200}
          />
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'certifyingAgent.otherHint' })}
          </Text>
        </>
      ) : null}

      {showNumbering && picked ? (
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage(
            {
              id: picked.own_numbering
                ? 'certifyingAgent.ownNumbering'
                : 'certifyingAgent.fallbackNumbering'
            },
            { agent: picked.short_name || picked.name }
          )}
        </Text>
      ) : null}
    </VStack>
  );
};

export default CertifyingAgentPicker;
