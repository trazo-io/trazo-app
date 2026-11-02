/**
 * Which plan version the renewal packet is built from — said out loud, at the download.
 *
 * The page exported `selectWorkingOsp(osps)` through a bare <a href>: the highest-numbered
 * DRAFT, with nothing on screen naming it. That is the right default during a renewal (the
 * draft IS the plan being prepared) and the wrong thing to hand over unlabelled. On the demo
 * operation it produced the failure this component exists for: the grower had filed the
 * § 205.406(a) annual update in August against v3, started v4, and downloaded a packet whose
 * `02-annual-update.pdf` read "No annual update is on file" — the one document a renewal IS,
 * blank, in the ZIP about to go to the certifying agent.
 *
 * So the control names the version, its status, and whether the § 205.406(a) filing travels
 * with it, and offers the plan on file as the other choice when the two differ. The filing
 * test mirrors the server's (`_renewal_context`): the update whose `new_osp` is this plan,
 * else the one whose `prior_osp` is.
 *
 * Changed sections only: a version the server can compare with the prior one (`packet-scope`)
 * also offers the packet with only the module PDFs whose answers changed. It is offered for every
 * certifier and worded as what it is, the shape of a renewal form that asks for the updated
 * sections (Oregon Tilth's OSP Update Step 4), never as something a certifier accepts. It is not
 * offered when the server cannot compare, so the anchor download never lands on a refusal.
 */
import React from 'react';
import { Box, Menu, MenuButton, MenuDivider, MenuItem, MenuList, Text } from '@chakra-ui/react';
import { FaChevronDown, FaFileAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton } from 'components/Design/StandardComponents';
import { OSP_PACKET_URL } from 'config';
import { env } from 'config/environment';
import { useGetOSPAnnualUpdatesQuery } from 'store/api/ospAnnualUpdateApi';
import { PacketScopePreview, useGetPacketScopeQuery } from 'store/api/ospApi';
import type { OSPSummary } from 'types/osp';

import { selectPlanOnFile } from './selectPlanOnFile';
import { selectWorkingOsp } from './selectWorkingOsp';

interface Props {
  companyId: string;
  farmId: string;
  osps: OSPSummary[] | undefined;
}

const PacketDownloadControl: React.FC<Props> = ({ companyId, farmId, osps }) => {
  const intl = useIntl();
  const working = selectWorkingOsp(osps);
  const onFile = osps ? selectPlanOnFile(osps) : undefined;
  const choices = [working, onFile && onFile.id !== working?.id ? onFile : undefined].filter(
    Boolean
  ) as OSPSummary[];

  // Farm-scoped: the same rows the annual-update card lists, so the menu and that card can
  // never disagree about what has been filed.
  const { data: updates = [] } = useGetOSPAnnualUpdatesQuery(
    { companyId, farmId },
    { skip: !companyId || !farmId }
  );

  // One fixed call per possible choice (hooks cannot run in the loop below). An error, a 403 or
  // a version the server cannot compare all read as "not offered". `currentData`, never `data`:
  // RTK keeps `data` from the LAST success for any args, so right after "start new version" the
  // new draft would borrow the previous version's "comparable" answer and offer a link the
  // server refuses (review of app #234; same trap as Traceback/index.tsx).
  const second = choices[1];
  const { currentData: workingScope } = useGetPacketScopeQuery(
    { companyId, farmId, ospId: working?.id ?? 0 },
    { skip: !companyId || !farmId || !working }
  );
  const { currentData: secondScope } = useGetPacketScopeQuery(
    { companyId, farmId, ospId: second?.id ?? 0 },
    { skip: !companyId || !farmId || !second }
  );

  if (!working) return null;

  const href = (osp: OSPSummary) => env.getApiUrl(OSP_PACKET_URL(companyId, farmId, osp.id));
  const changedHref = (osp: OSPSummary) =>
    env.getApiUrl(OSP_PACKET_URL(companyId, farmId, osp.id, 'changed'));
  const scopeFor = (osp: OSPSummary): PacketScopePreview | undefined => {
    const scope =
      osp.id === working.id ? workingScope : osp.id === second?.id ? secondScope : undefined;
    return scope?.available ? scope : undefined;
  };
  const anyChangedOnly = choices.some((osp) => scopeFor(osp));

  const filingFor = (osp: OSPSummary) =>
    updates.find((u) => u.new_osp === osp.id) ?? updates.find((u) => u.prior_osp === osp.id);

  const versionLabel = (osp: OSPSummary) => {
    const id =
      osp.status === 'draft'
        ? 'osp.packet.version.draft'
        : osp.status === 'active'
        ? 'osp.packet.version.active'
        : osp.status === 'submitted'
        ? 'osp.packet.version.submitted'
        : 'osp.packet.version.plain';
    return intl.formatMessage({ id }, { version: osp.version_number });
  };

  const filingLabel = (osp: OSPSummary) => {
    const filing = filingFor(osp);
    return filing
      ? intl.formatMessage({ id: 'osp.packet.filing.attached' }, { year: filing.reporting_year })
      : intl.formatMessage({ id: 'osp.packet.filing.missing' });
  };

  // The changed-sections packet of one version, when the server can compare it with the prior.
  const changedItem = (osp: OSPSummary) => {
    const scope = scopeFor(osp);
    if (!scope) return null;
    return (
      <MenuItem as="a" href={changedHref(osp)} py={3}>
        <Box>
          <Text fontSize="sm" fontWeight="semibold">
            {intl.formatMessage(
              { id: 'osp.packet.changedOnly.title' },
              { version: osp.version_number }
            )}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage(
              { id: 'osp.packet.changedOnly.detail' },
              {
                included: scope.included?.length ?? 0,
                omitted: scope.omitted?.length ?? 0,
                prior: scope.prior_version
              }
            )}
          </Text>
        </Box>
      </MenuItem>
    );
  };

  // One version to export, and nothing to choose between: a menu would be ceremony. It still
  // names the version, which the bare button never did.
  if (choices.length < 2 && !anyChangedOnly) {
    return (
      <Box data-tour="osp-packet">
        <StandardButton
          as="a"
          href={href(working)}
          minH="44px"
          variant="outline"
          leftIcon={<FaFileAlt />}>
          {intl.formatMessage(
            { id: 'osp.packet.downloadVersion' },
            { version: working.version_number }
          )}
        </StandardButton>
      </Box>
    );
  }

  return (
    <Box data-tour="osp-packet">
      <Menu placement="bottom-end">
        <MenuButton
          as={StandardButton}
          minH="44px"
          variant="outline"
          leftIcon={<FaFileAlt />}
          rightIcon={<FaChevronDown />}>
          {intl.formatMessage({ id: 'osp.modules.downloadPacket' })}
        </MenuButton>
        <MenuList maxW="360px">
          <Text px={3} py={2} fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'osp.packet.menu.label' })}
          </Text>
          {choices.map((osp, index) => (
            <React.Fragment key={osp.id}>
              {index > 0 ? <MenuDivider /> : null}
              <MenuItem as="a" href={href(osp)} py={3}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold">
                    {versionLabel(osp)}
                  </Text>
                  {/* `orange.800` is the measured text colour of the theme's own
                      `variant="warning"` badge, not a reach for a foreign accent: the theme's
                      `amber` ramp tops out at #E65100 (4.1:1 on white) and fails AA as text. */}
                  <Text fontSize="xs" color={filingFor(osp) ? 'gray.600' : 'orange.800'}>
                    {filingLabel(osp)}
                  </Text>
                  {scopeFor(osp) ? (
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'osp.packet.full.detail' })}
                    </Text>
                  ) : null}
                </Box>
              </MenuItem>
              {changedItem(osp)}
            </React.Fragment>
          ))}
          <MenuDivider />
          {anyChangedOnly ? (
            <Text px={3} pt={2} fontSize="xs" color="gray.600">
              {intl.formatMessage({ id: 'osp.packet.changedOnly.hint' })}
            </Text>
          ) : null}
          <Text px={3} py={2} fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'osp.packet.draftHint' })}
          </Text>
        </MenuList>
      </Menu>
    </Box>
  );
};

export default PacketDownloadControl;
