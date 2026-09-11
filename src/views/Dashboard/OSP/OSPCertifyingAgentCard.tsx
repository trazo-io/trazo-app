/**
 * OSPCertifyingAgentCard — who reviews this plan, asked where the plan is worked on.
 *
 * 🔴 2026-09-10. The renewal packet numbers its coverage page to the agent that reviews the plan,
 * and until now that agent could be named only at the activation gate (after approval) or on the
 * farm's certification rows (once certified). A first-year applicant had neither, so their packet
 * spoke CCOF's form numbers and nothing on screen said so.
 *
 * The card shows the answer, where it came from and what the packet does with it, read from
 * `packet_agent`: the same function the packet's coverage page calls, so the promise made here is
 * the sentence the reviewer reads. The PATCH carries `certifier_name` and nothing else.
 */
import React, { useEffect, useState } from 'react';
import { Box, Flex, Text, VStack, useToast } from '@chakra-ui/react';
import { FaStamp } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import CertifyingAgentPicker from 'components/Certifications/CertifyingAgentPicker';
import { useUpdateOSPMutation } from 'store/api/ospApi';
import type { OSPSummary } from 'types/osp';

interface OSPCertifyingAgentCardProps {
  companyId: string;
  farmId: string;
  osp: OSPSummary;
  isLocked: boolean;
}

const OSPCertifyingAgentCard = ({
  companyId,
  farmId,
  osp,
  isLocked
}: OSPCertifyingAgentCardProps) => {
  const intl = useIntl();
  const toast = useToast();
  const [updateOSP, { isLoading: saving }] = useUpdateOSPMutation();

  const stored = osp.certifier_name ?? '';
  const [draft, setDraft] = useState(stored);
  useEffect(() => setDraft(stored), [osp.id, stored]);
  const dirty = !isLocked && draft.trim() !== stored.trim();
  const agent = osp.packet_agent;

  const handleSave = async () => {
    try {
      await updateOSP({
        companyId,
        farmId,
        ospId: osp.id,
        data: { certifier_name: draft.trim() }
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.agent.saved' }),
        duration: 3000
      });
    } catch {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.agent.saveFailed' }),
        duration: 5000
      });
    }
  };

  // What the packet does with the SAVED answer. While an edit is pending the picker's own line
  // speaks for the new choice instead, so the card never states two answers at once.
  const savedLines: string[] = [];
  if (!agent?.name) {
    savedLines.push(intl.formatMessage({ id: 'osp.agent.none' }));
  } else {
    if (agent.source === 'certificate' || agent.source === 'records') {
      // A locked plan offers no picker, so it gets the source alone: "Pick an agent here" was an
      // instruction with no control behind it, and the name is already the card's heading.
      const id = isLocked
        ? agent.source === 'certificate'
          ? 'osp.agent.fromCertificateLocked'
          : 'osp.agent.fromRecordsLocked'
        : agent.source === 'certificate'
        ? 'osp.agent.fromCertificate'
        : 'osp.agent.fromRecords';
      savedLines.push(intl.formatMessage({ id }, { agent: agent.name }));
    }
    savedLines.push(
      intl.formatMessage(
        {
          id: agent.own_numbering
            ? 'certifyingAgent.ownNumbering'
            : 'certifyingAgent.fallbackNumbering'
        },
        { agent: agent.name }
      )
    );
  }

  const title = intl.formatMessage({ id: 'osp.agent.title' });

  return (
    <StandardCard
      titleIcon={<Box as={FaStamp} boxSize={5} color="green.700" />}
      title={title}
      subtitle={intl.formatMessage({ id: 'osp.agent.subtitle' })}>
      <VStack align="stretch" spacing={3}>
        {isLocked ? (
          agent?.name ? (
            <Text fontWeight="semibold">{agent.name}</Text>
          ) : null
        ) : (
          <Flex
            gap={3}
            direction={{ base: 'column', smd: 'row' }}
            align={{ base: 'stretch', smd: 'flex-start' }}>
            <Box flex={1} maxW={{ smd: 'lg' }}>
              <CertifyingAgentPicker
                value={draft}
                onChange={setDraft}
                showNumbering={dirty}
                isDisabled={saving}
                ariaLabel={title}
              />
            </Box>
            {dirty ? (
              <StandardButton minH="44px" onClick={handleSave} isLoading={saving}>
                {intl.formatMessage({ id: 'osp.agent.save' })}
              </StandardButton>
            ) : null}
          </Flex>
        )}
        {dirty
          ? null
          : savedLines.map((line) => (
              <Text key={line} fontSize="sm" color="gray.600">
                {line}
              </Text>
            ))}
      </VStack>
    </StandardCard>
  );
};

export default OSPCertifyingAgentCard;
