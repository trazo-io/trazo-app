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
 *
 * WHERE THIS PANEL LIVES: inside G8.0 Record Keeping, page A, directly above the attestation it
 * is the subject of ("do you maintain the records confirmed above..."). It used to render a
 * second time on the legacy narrative page, where the attestation is not — a list of 40-odd
 * boxes with nothing to be the evidence FOR, which is why it read as busywork there.
 *
 * NO "CONFIRM ALL SUGGESTED" CONTROL, ever. The panel batches ticks into one request after a
 * short delay (see FLUSH_DELAY_MS) because the round-trips are expensive; that is transport.
 * A single control that ticks rows the operator has not read is the auto-attestation this whole
 * module exists to refuse, and it would be indistinguishable in the packet from one they did.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Divider,
  Flex,
  HStack,
  Icon,
  Input,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { FaDownload, FaFileAlt, FaInfoCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

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
  /**
   * Run before this panel navigates away, and abort the navigation if it resolves false.
   *
   * The module wizard autosaves answers ON PAGE ADVANCE, not on change, so a link out of an
   * embedded panel discards everything typed on the current page — and this panel sits on
   * G8.0 page A alongside five questions of its own. The wizard passes its own flush here; a
   * caller with nothing pending may leave it out.
   */
  onNavigateAway?: () => Promise<boolean> | boolean;
  osp: OSP;
}

/**
 * How long a tick waits before it is sent. Long enough that ticking a run of rows costs ONE
 * request instead of one per row (each response re-derives all 46 rows from the season's events,
 * so the round-trips are not free), short enough that a single tick still feels immediate.
 *
 * This batches TRANSPORT, never intent: every key in a flushed request is a box the operator
 * ticked. There is deliberately no "confirm all suggested" control — see the module docstring.
 */
const FLUSH_DELAY_MS = 600;

/** Mirrors `common_osp_records.FREE_TEXT_LABEL_MAX` — the server refuses anything longer. */
const FREE_TEXT_MAX_LENGTH = 200;

/**
 * Where in Trazo each blank attachment column is answered.
 *
 * A count with no destination is what this closes: the panel reported "47 cells to fill in
 * Trazo" while the product had no screen on which to fill them, which reads to a farmer as a
 * fault in their own records. `route` null means there is genuinely nowhere in Trazo — true of
 * a supplier's own organic certificate, and the sentence says so instead of pointing at a page
 * that cannot help.
 */
const FIX_DESTINATIONS: Record<string, { route: ((farmId: string) => string) | null }> = {
  parcel: { route: (farmId) => `/admin/dashboard/farm/${farmId}/osp` },
  field_history: { route: (farmId) => `/admin/dashboard/farm/${farmId}/osp` },
  materials_list: {
    route: (farmId) => `/admin/dashboard/farm/${farmId}/osp/module/materials_application`
  },
  season: { route: null },
  event_records: { route: null },
  supplier_certificate: { route: null }
};

/** The USDA header as a phrase: verbatim wording, minus the form's punctuation and line break. */
const columnLabel = (header: string) => header.replace(/\s+/g, ' ').replace(/:$/, '').trim();

const OSPRecordTypesPanel: React.FC<OSPRecordTypesPanelProps> = ({
  companyId,
  farmId,
  osp,
  onNavigateAway
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
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

  // Ticks not yet sent. Rendered as the row's state so the checkbox answers the tap immediately;
  // cleared when the server's own rows come back, or reverted if the save fails.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queued = useRef<Record<string, boolean>>({});

  // What the operator is typing into the free-text "Other" row, before they save it.
  const [otherDraft, setOtherDraft] = useState<string | null>(null);

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

  const showSaveError = useCallback(() => {
    toast({
      title: intl.formatMessage({
        id: 'osp.recordTypes.error',
        defaultMessage: 'Could not save that change'
      }),
      status: 'error',
      duration: 4000,
      isClosable: true
    });
  }, [intl, toast]);

  const flush = useCallback(async () => {
    const batch = queued.current;
    queued.current = {};
    flushTimer.current = null;
    const keysOf = (value: boolean) => Object.keys(batch).filter((key) => batch[key] === value);

    try {
      // Two requests at most — the server takes a list of keys and ONE confirmed value, and a
      // tick and an untick in the same 600ms window are two different statements.
      for (const confirmed of [true, false]) {
        const keys = keysOf(confirmed);
        if (keys.length) {
          await confirmRecordTypes({ companyId, farmId, ospId: osp.id, keys, confirmed }).unwrap();
        }
      }
    } catch {
      showSaveError();
    } finally {
      // Drop exactly what was in flight, whether it landed or not: on success the refetched rows
      // are the truth, on failure the row must snap back rather than keep showing a tick nobody
      // stored. Keys queued while this was in flight survive.
      setPending((current) => {
        const next = { ...current };
        for (const key of Object.keys(batch)) delete next[key];
        return next;
      });
    }
  }, [companyId, confirmRecordTypes, farmId, osp.id, showSaveError]);

  // A queued tick must not be lost because the operator navigated away mid-timer.
  //
  // Held through a ref with an EMPTY dependency list on purpose. With `[flush]` the effect
  // re-runs whenever `flush` changes identity — and its cleanup is the flush — so any hook above
  // it that returns a fresh function per render (Chakra's useToast is one) would fire the batch
  // on the very next render, which is the render `setPending` itself causes. The batching would
  // then silently degrade to one request per tick: still correct, never observably broken, and
  // exactly the kind of thing that comes back.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        void flushRef.current();
      }
    };
  }, []);

  const handleToggle = (row: OSPRecordType) => {
    const next = !(row.key in pending ? pending[row.key] : row.confirmed);
    setPending((current) => ({ ...current, [row.key]: next }));
    queued.current[row.key] = next;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    // Through the ref, like the unmount path: a timer set on one render must not fire a
    // `flush` closed over a stale render's props.
    flushTimer.current = setTimeout(() => void flushRef.current(), FLUSH_DELAY_MS);
  };

  /** The free-text row saves on its own — it carries a label, and an empty one is refused. */
  const handleSaveOther = async (row: OSPRecordType, label: string) => {
    try {
      await confirmRecordTypes({
        companyId,
        farmId,
        ospId: osp.id,
        keys: [row.key],
        confirmed: true,
        label
      }).unwrap();
      setOtherDraft(null);
    } catch {
      showSaveError();
    }
  };

  const handleClearOther = async (row: OSPRecordType) => {
    try {
      await confirmRecordTypes({
        companyId,
        farmId,
        ospId: osp.id,
        keys: [row.key],
        confirmed: false
      }).unwrap();
      setOtherDraft(null);
    } catch {
      showSaveError();
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

  /**
   * The "Other" line both source forms end on. It is a checkbox everywhere else in this panel and
   * a NAMED entry here, because a tick with no name is a statement with nothing under it — the
   * server refuses one, and this row must not offer the operator a control the server will reject.
   */
  const renderFreeTextRow = (row: OSPRecordType, isConfirmed: boolean) => {
    const draft = otherDraft ?? row.custom_label ?? '';
    const canSave = draft.trim().length > 0 && draft.trim() !== (row.custom_label ?? '');

    return (
      <Flex
        key={row.key}
        align="flex-start"
        direction={{ base: 'column', smd: 'row' }}
        justify="space-between"
        gap={3}
        px={3}
        py={2}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md">
        <Stack spacing={1} flex="1" minW={0} w="100%">
          <Text fontSize="sm">{row.label}</Text>
          <Text fontSize="xs" color={mutedColor}>
            {row.cfr_cite}
          </Text>
          {isEditable ? (
            <Input
              size="sm"
              value={draft}
              maxLength={FREE_TEXT_MAX_LENGTH}
              onChange={(event) => setOtherDraft(event.target.value)}
              placeholder={intl.formatMessage({
                id: 'osp.recordTypes.otherPlaceholder',
                defaultMessage: 'Name the record type, e.g. pool closings from the huller'
              })}
            />
          ) : (
            <Text fontSize="sm" color={mutedColor}>
              {row.custom_label ||
                intl.formatMessage({
                  id: 'osp.recordTypes.otherEmpty',
                  defaultMessage: 'Nothing named'
                })}
            </Text>
          )}
        </Stack>
        {isEditable && (
          <HStack spacing={2} flexShrink={0} pt={{ base: 0, smd: 6 }}>
            <StandardButton
              size="xs"
              variant="outline"
              isDisabled={!canSave}
              isLoading={isConfirming}
              onClick={() => handleSaveOther(row, draft.trim())}>
              {isConfirmed
                ? intl.formatMessage({
                    id: 'osp.recordTypes.otherRename',
                    defaultMessage: 'Rename'
                  })
                : intl.formatMessage({
                    id: 'osp.recordTypes.confirm',
                    defaultMessage: 'Confirm'
                  })}
            </StandardButton>
            {isConfirmed && (
              <StandardButton size="xs" variant="ghost" onClick={() => handleClearOther(row)}>
                {intl.formatMessage({
                  id: 'osp.recordTypes.otherRemove',
                  defaultMessage: 'Remove'
                })}
              </StandardButton>
            )}
          </HStack>
        )}
      </Flex>
    );
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
            "The recordkeeping section of your certifier's form — Common OSP § 11, CCOF G8.0 A, WSDA AGR 2121-O. We show what your logs already evidence; you confirm what your operation actually keeps."
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
              {summary.carried_forward > 0 && (
                <Badge variant="warning">
                  {intl.formatMessage(
                    {
                      id: 'osp.recordTypes.carriedCount',
                      defaultMessage: '{n} carried from an earlier plan'
                    },
                    { n: summary.carried_forward }
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
              sense while they can actually tick something, so the two are exclusive.

              The note says WHERE a tick goes, not only that it is theirs. A farmer looking at
              40 checkboxes and no stated consequence has been told what the control means and
              not what it does — and the answer ("it prints in the packet you send your
              certifier, and what you leave unticked is left out") is the whole reason to
              spend five minutes here. */}
          {isEditable ? (
            <StandardAlert
              status="info"
              mb={0}
              description={intl.formatMessage({
                id: 'osp.recordTypes.attestationNote',
                defaultMessage:
                  'Nothing here is checked for you — what your logs show is a suggestion, and ticking a box is your statement to your certifier. Every box you tick prints in your renewal packet, under G8.0 Record Keeping and in your plan’s recordkeeping section; anything left unticked is left out.'
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

          {/* The zero state is the one the operator actually meets, and it used to say nothing.
              Confirming nothing is a legitimate state right up until the packet is generated,
              at which point G8.0 prints "No record types have been confirmed…" and the server
              refuses the attestation below — so the consequence belongs HERE, before the work,
              not as a validation error after it. */}
          {isEditable && summary?.confirmed === 0 && (
            <StandardAlert
              status="warning"
              mb={0}
              description={intl.formatMessage({
                id: 'osp.recordTypes.noneConfirmed',
                defaultMessage:
                  'Nothing is confirmed yet. Until you tick at least one, your packet will tell your certifier that no record types have been confirmed, and the attestation below cannot be answered “yes”.'
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
                {rows.map((row) => {
                  // A queued tick renders as ticked. `pending` is transport state, so a row the
                  // operator just ticked stops looking like a suggestion straight away.
                  const isConfirmed = row.key in pending ? pending[row.key] : row.confirmed;
                  const isSuggested = row.suggested && !isConfirmed;
                  if (row.free_text) {
                    return renderFreeTextRow(row, isConfirmed);
                  }
                  return (
                    <Flex
                      key={row.key}
                      align="flex-start"
                      justify="space-between"
                      gap={3}
                      px={3}
                      py={2}
                      borderWidth="1px"
                      borderStyle={isSuggested ? 'dashed' : 'solid'}
                      borderColor={isSuggested ? 'green.300' : borderColor}
                      bg={isSuggested ? suggestedBg : 'transparent'}
                      borderRadius="md">
                      <Checkbox
                        isChecked={isConfirmed}
                        onChange={() => handleToggle(row)}
                        isDisabled={!isEditable}
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
                            {/* WHEN they said it. A confirmed row with no date reads as current
                              at any age, and a renewal clones these answers forward — so the
                              farmer had no way to see that a tick belonged to last year's
                              plan. The carried case says so outright rather than leaving them
                              to read a stale date and work it out.

                              No colour on the carried case: `amber.700` is 2.57:1 and that ramp
                              only clears 3.0 at 900 (measured in theme/components/progress.js),
                              so the warning would arrive as a contrast failure. The sentence
                              carries the meaning; colour here would be decoration. */}
                            {isConfirmed && row.confirmed_at && (
                              <Text fontSize="xs" color={mutedColor}>
                                {row.carried_from_version
                                  ? intl.formatMessage(
                                      {
                                        id: 'osp.recordTypes.carriedOn',
                                        defaultMessage:
                                          'Confirmed {date} on plan v{version} — not re-stated on this plan'
                                      },
                                      {
                                        date: row.confirmed_at.slice(0, 10),
                                        version: row.carried_from_version
                                      }
                                    )
                                  : intl.formatMessage(
                                      {
                                        id: 'osp.recordTypes.confirmedOn',
                                        defaultMessage: 'Confirmed {date}'
                                      },
                                      { date: row.confirmed_at.slice(0, 10) }
                                    )}
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

                      {isSuggested && isEditable && (
                        <StandardButton
                          size="xs"
                          variant="outline"
                          onClick={() => handleToggle(row)}
                          flexShrink={0}>
                          {intl.formatMessage({
                            id: 'osp.recordTypes.confirm',
                            defaultMessage: 'Confirm'
                          })}
                        </StandardButton>
                      )}
                    </Flex>
                  );
                })}
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
                  defaultMessage: 'Attachments'
                })}
              </Text>
              {/* "Required" was unconditional; the Common OSP says required WHEN APPLICABLE (a
                  Materials List only when a nonorganic input is used). And these copies are the
                  same bytes the packet already contains — so the subtitle now says what
                  downloading is FOR, which nothing on this screen did. */}
              <Text fontSize="xs" color={mutedColor} mb={3}>
                {intl.formatMessage({
                  id: 'osp.attachments.subtitle',
                  defaultMessage:
                    'The Common OSP attachments (your certifier may call them by their own names), built from your records. These same files are already inside your packet — download one to see the blanks, or to send that form on its own.'
                })}
              </Text>
              <Stack spacing={1}>
                {attachments.workbooks.map((wb) => (
                  <Flex
                    key={wb.key}
                    align="flex-start"
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
                                  '{rows, plural, one {# row} other {# rows}} · {missing, plural, =0 {} one {# cell to fill in Trazo} other {# cells to fill in Trazo}}{both, select, yes { · } other {}}{yours, plural, =0 {} one {# cell only you can answer} other {# cells only you can answer}}{none, select, yes {nothing left to fill} other {}}'
                              },
                              {
                                // `?? 0` because a plural argument of `undefined` throws inside
                                // the formatter, and these three fields are newer than the
                                // component — a cached response from before they shipped would
                                // take the whole panel down rather than show one stale count.
                                rows: wb.rows ?? 0,
                                missing: wb.missing_from_records ?? 0,
                                yours: wb.needs_your_answer ?? 0,
                                both:
                                  (wb.missing_from_records ?? 0) > 0 &&
                                  (wb.needs_your_answer ?? 0) > 0
                                    ? 'yes'
                                    : 'no',
                                none: (wb.blank_cells ?? 0) === 0 ? 'yes' : 'no'
                              }
                            )}
                      </Text>

                      {/* WHICH columns are blank, and where each one is answered. The totals
                          above are honest but not actionable on their own: the operator was
                          told a number and left to find the screen. Optional blanks are never
                          listed — the form permits them, and listing them would put back as a
                          to-do exactly what the counts stopped presenting as work. */}
                      {(wb.blanks ?? []).map((blank, index) => {
                        // No token means the backend named no destination for this column. It
                        // renders as the count alone rather than as `osp.attachments.fix.`,
                        // which react-intl would print back as the raw message id.
                        const destination = blank.fix ? FIX_DESTINATIONS[blank.fix] : undefined;
                        return (
                          <Flex
                            key={`${blank.header}:${index}`}
                            align="baseline"
                            gap={2}
                            wrap="wrap"
                            mt={1}
                            fontSize="xs"
                            color={mutedColor}>
                            <Text>
                              {intl.formatMessage(
                                {
                                  id: 'osp.attachments.blankLine',
                                  defaultMessage:
                                    '{column} — {count, plural, one {# blank cell} other {# blank cells}}'
                                },
                                { column: columnLabel(blank.header), count: blank.count }
                              )}
                            </Text>
                            {!blank.fix ? null : destination?.route ? (
                              // ⛔ NOT variant="link": StandardButton maps its own variant
                              // names onto Chakra pairs, and a name outside that map falls
                              // through and renders unstyled — the documented inert-prop class.
                              <StandardButton
                                size="xs"
                                variant="ghost"
                                height="auto"
                                minW={0}
                                px={1}
                                onClick={async () => {
                                  // Save the page first. Without this, sending the operator to
                                  // the screen that answers a blank throws away the answers
                                  // they just typed next to it.
                                  if (onNavigateAway && (await onNavigateAway()) === false) return;
                                  navigate(destination.route!(farmId));
                                }}>
                                {intl.formatMessage({ id: `osp.attachments.fix.${blank.fix}` })}
                              </StandardButton>
                            ) : (
                              <Text>
                                {intl.formatMessage({ id: `osp.attachments.fix.${blank.fix}` })}
                              </Text>
                            )}
                          </Flex>
                        );
                      })}
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
