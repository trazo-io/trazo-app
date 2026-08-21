/**
 * Common OSP § 11 — "Records Maintained" (7 CFR 205.103).
 *
 * USDA AMS published the Common OSP template set (files dated 2026-05-26; NOP announcement
 * 2026-07-07). Its § 11 asks the operation to check which record types it maintains, in four
 * groups. Adoption is optional — the NOP encourages certifiers to adopt it — so this panel is
 * framed as "answers you can reuse", never as "your certifier requires this form".
 *
 * 🔴 THE RULE THIS COMPONENT EXISTS TO HOLD
 *
 * Trazo derives EVIDENCE for each record type from what the farm actually logged. Evidence is
 * not an answer. § 205.201(a) makes the PRODUCER the author of the organic system plan, so a
 * checkbox is ticked only by an explicit operator action. An evidenced-but-unconfirmed row
 * renders as a *suggestion* — a dashed, unchecked control with a "Confirm" affordance — and
 * never as a tick.
 *
 * Getting this wrong is not cosmetic. Auto-ticking "Weigh tickets ✓" on a farm that keeps none
 * would put a claim in front of a certifier that the operator never made. This codebase has
 * already shipped that failure class once: a Smart Setup template fabricated a backdated record
 * attributed to the farmer by name (2026-08-02 NOP finalization QA).
 *
 * Rows Trazo structurally cannot see (weigh tickets, packing slips, settlement statements,
 * contracts, delivery slips, inventory) are marked "kept outside Trazo" rather than shown as
 * gaps — the farm may well keep them in a drawer, and saying so is the honest framing.
 */

import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Divider,
  Flex,
  HStack,
  Icon,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { FaDownload, FaFileAlt, FaInfoCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardAlert, StandardButton, StandardCard } from 'components/Design/StandardComponents';
import config from 'config/environment';
import { OSP_ATTACHMENTS_URL } from 'config';
import {
  useConfirmOSPRecordTypesMutation,
  useGetOSPAttachmentsQuery,
  useGetOSPRecordTypesQuery
} from 'store/api/ospApi';
import { OSP, OSPAttachmentSummary, OSPRecordType } from 'types/osp';

interface OSPRecordTypesPanelProps {
  companyId: string;
  farmId: string;
  osp: OSP;
}

const OSPRecordTypesPanel: React.FC<OSPRecordTypesPanelProps> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const toast = useToast();
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const suggestedBg = useColorModeValue('green.50', 'green.900');

  const { data, isLoading, isError } = useGetOSPRecordTypesQuery({
    companyId,
    farmId,
    ospId: osp.id
  });
  const [confirmRecordTypes, { isLoading: isConfirming }] = useConfirmOSPRecordTypesMutation();
  const { data: attachments } = useGetOSPAttachmentsQuery({ companyId, farmId, ospId: osp.id });
  const [downloading, setDownloading] = useState<string | null>(null);

  // Submitted/active/superseded plans are read-only everywhere else in this view; editing a
  // plan the certifier already received would rewrite what they were sent.
  const isEditable = osp.status === 'draft' || osp.status === 'active';

  const grouped = useMemo(() => {
    const groups: { group: string; rows: OSPRecordType[] }[] = [];
    for (const row of data?.record_types ?? []) {
      const existing = groups.find((g) => g.group === row.group);
      if (existing) existing.rows.push(row);
      else groups.push({ group: row.group, rows: [row] });
    }
    return groups;
  }, [data]);

  const handleToggle = async (row: OSPRecordType) => {
    try {
      await confirmRecordTypes({
        companyId,
        farmId,
        ospId: osp.id,
        keys: [row.key],
        confirmed: !row.confirmed
      }).unwrap();
    } catch {
      toast({
        title: intl.formatMessage({
          id: 'osp.recordTypes.error',
          defaultMessage: 'Could not save that change'
        }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  const handleDownload = async (wb: OSPAttachmentSummary) => {
    setDownloading(wb.key);
    try {
      const url = `${config.API_BASE_URL}/${OSP_ATTACHMENTS_URL(
        companyId,
        farmId,
        osp.id
      )}?workbook=${wb.key}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${wb.key}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      toast({
        title: intl.formatMessage({
          id: 'osp.attachments.downloadError',
          defaultMessage: 'Could not prepare that file'
        }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setDownloading(null);
    }
  };

  if (isError) {
    return (
      <StandardCard>
        <StandardAlert
          status="info"
          mb={0}
          description={intl.formatMessage({
            id: 'osp.recordTypes.unavailable',
            defaultMessage:
              'Record types could not be loaded right now. Your plan is unaffected — try again shortly.'
          })}
        />
      </StandardCard>
    );
  }

  const summary = data?.summary;

  return (
    <Box mt={4}>
      <StandardCard
        titleIcon={<Icon as={FaFileAlt} color="green.700" />}
        title={intl.formatMessage({
          id: 'osp.recordTypes.title',
          defaultMessage: 'Records you maintain'
        })}
        subtitle={intl.formatMessage({
          id: 'osp.recordTypes.subtitle',
          defaultMessage:
            'Common OSP § 11 · 7 CFR 205.103. We show what your logs already evidence — you confirm what your operation actually keeps.'
        })}>
        <Stack spacing={4}>
          {summary && (
            <HStack spacing={2} flexWrap="wrap">
              <Badge colorScheme="green" variant="subtle">
                {intl.formatMessage(
                  { id: 'osp.recordTypes.confirmedCount', defaultMessage: '{n} confirmed' },
                  { n: summary.confirmed }
                )}
              </Badge>
              {summary.awaiting_confirmation > 0 && (
                <Badge variant="warning">
                  {intl.formatMessage(
                    {
                      id: 'osp.recordTypes.awaitingCount',
                      defaultMessage: '{n} suggested from your records'
                    },
                    { n: summary.awaiting_confirmation }
                  )}
                </Badge>
              )}
              {summary.evidence_check_failed > 0 && (
                <Badge colorScheme="red" variant="subtle">
                  {intl.formatMessage(
                    {
                      id: 'osp.recordTypes.checkFailedCount',
                      defaultMessage: "{n} couldn't be checked"
                    },
                    { n: summary.evidence_check_failed }
                  )}
                </Badge>
              )}
            </HStack>
          )}

          {/* When the plan is locked, say SO — 34 disabled checkboxes with no explanation is
              how a farmer concludes the feature is broken. The attestation note only makes
              sense while they can actually tick something, so the two are exclusive. */}
          {isEditable ? (
            <StandardAlert
              status="info"
              mb={0}
              description={intl.formatMessage({
                id: 'osp.recordTypes.attestationNote',
                defaultMessage:
                  'Nothing here is checked for you. What your logs show is a suggestion; ticking a box is your statement to your certifier.'
              })}
            />
          ) : (
            <StandardAlert
              status="warning"
              mb={0}
              description={intl.formatMessage({
                id: 'osp.recordTypes.locked',
                defaultMessage:
                  'This plan has already gone to your certifier, so these answers are locked. Start a new version to change them. What your records show is still shown below.'
              })}
            />
          )}

          {isLoading && (
            <Stack spacing={2}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height="28px" borderRadius="md" />
              ))}
            </Stack>
          )}

          {grouped.map(({ group, rows }) => (
            <Box key={group}>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                {group}
              </Text>
              <Stack spacing={1}>
                {rows.map((row) => (
                  <Flex
                    key={row.key}
                    align="flex-start"
                    justify="space-between"
                    gap={3}
                    px={3}
                    py={2}
                    borderWidth="1px"
                    borderStyle={row.suggested ? 'dashed' : 'solid'}
                    borderColor={row.suggested ? 'green.300' : borderColor}
                    bg={row.suggested ? suggestedBg : 'transparent'}
                    borderRadius="md">
                    <Checkbox
                      isChecked={row.confirmed}
                      onChange={() => handleToggle(row)}
                      isDisabled={!isEditable || isConfirming}
                      colorScheme="green"
                      alignItems="flex-start">
                      <Stack spacing={0}>
                        <Text fontSize="sm">{row.label}</Text>
                        <HStack spacing={2} flexWrap="wrap">
                          <Text fontSize="xs" color={mutedColor}>
                            {row.cfr_cite}
                          </Text>
                          {row.basis && (
                            <Text fontSize="xs" color="green.700">
                              {row.basis}
                            </Text>
                          )}
                          {row.external_by_design && !row.basis && (
                            <Text fontSize="xs" color={mutedColor}>
                              {intl.formatMessage({
                                id: 'osp.recordTypes.outsideTrazo',
                                defaultMessage: 'Kept outside Trazo — tick it if you keep these'
                              })}
                            </Text>
                          )}
                          {row.status === 'evidence_check_failed' && (
                            <Tooltip
                              label={intl.formatMessage({
                                id: 'osp.recordTypes.checkFailedHelp',
                                defaultMessage:
                                  'We could not check your records for this one. That is not the same as finding none — answer from what your operation actually keeps.'
                              })}>
                              <Box as="span">
                                <Icon as={FaInfoCircle} color="red.400" boxSize={3} />
                              </Box>
                            </Tooltip>
                          )}
                        </HStack>
                      </Stack>
                    </Checkbox>

                    {row.suggested && isEditable && (
                      <StandardButton
                        size="xs"
                        variant="outline"
                        onClick={() => handleToggle(row)}
                        isDisabled={isConfirming}
                        flexShrink={0}>
                        {intl.formatMessage({
                          id: 'osp.recordTypes.confirm',
                          defaultMessage: 'Confirm'
                        })}
                      </StandardButton>
                    )}
                  </Flex>
                ))}
              </Stack>
              <Divider mt={3} />
            </Box>
          ))}

          {/* Required attachments. Same Common OSP concern as § 11 above, so it lives in the
              same card rather than adding another one to an already-long page.

              Downloads use fetch + blob rather than an <a href>: the URL helpers return a
              base-less path (ROOT_URL is ''), which RTK Query resolves via customFetchBase but a
              raw href would resolve against the CURRENT ROUTE — producing
              /admin/dashboard/farm/128/companies/... and a 404. Same pattern as
              OperationAuditExportButton, which also gets error handling for free; a bare link
              would hand the farmer a raw error page instead of a message. */}
          {attachments && attachments.workbooks.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={1}>
                {intl.formatMessage({
                  id: 'osp.attachments.title',
                  defaultMessage: 'Required attachments'
                })}
              </Text>
              <Text fontSize="xs" color={mutedColor} mb={3}>
                {intl.formatMessage({
                  id: 'osp.attachments.subtitle',
                  defaultMessage:
                    'The four forms the Common OSP asks you to attach, filled in from your records. Blank cells are answers we could not find — complete them before you send anything.'
                })}
              </Text>
              <Stack spacing={1}>
                {attachments.workbooks.map((wb) => (
                  <Flex
                    key={wb.key}
                    align="center"
                    justify="space-between"
                    gap={3}
                    px={3}
                    py={2}
                    borderWidth="1px"
                    borderColor={borderColor}
                    borderRadius="md">
                    <Stack spacing={0}>
                      <Text fontSize="sm">{wb.title}</Text>
                      <Text fontSize="xs" color={mutedColor}>
                        {wb.error
                          ? intl.formatMessage({
                              id: 'osp.attachments.rowError',
                              defaultMessage: 'Could not be prepared right now'
                            })
                          : intl.formatMessage(
                              {
                                id: 'osp.attachments.rowMeta',
                                defaultMessage:
                                  '{rows, plural, one {# row} other {# rows}} · {blanks, plural, =0 {nothing left blank} one {# cell for you to fill} other {# cells for you to fill}}'
                              },
                              { rows: wb.rows, blanks: wb.blank_cells }
                            )}
                      </Text>
                    </Stack>
                    <StandardButton
                      size="xs"
                      variant="outline"
                      flexShrink={0}
                      leftIcon={<Icon as={FaDownload} boxSize={3} />}
                      isDisabled={wb.error || downloading === wb.key}
                      isLoading={downloading === wb.key}
                      onClick={() => handleDownload(wb)}>
                      {intl.formatMessage({
                        id: 'osp.attachments.download',
                        defaultMessage: 'Excel'
                      })}
                    </StandardButton>
                  </Flex>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </StandardCard>
    </Box>
  );
};

export default OSPRecordTypesPanel;
