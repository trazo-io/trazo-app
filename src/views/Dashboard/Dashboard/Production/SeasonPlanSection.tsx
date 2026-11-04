/**
 * The season plan — what this crop usually needs, and what the grower has logged.
 *
 * ⛔ Every row here is a SUGGESTION. Picking a crop template used to write real, dated event
 * records attributed to the grower (the day invented by the browser from the template's prose
 * window, so routinely backdated) which then printed into the certifier packet
 * indistinguishable from practices actually observed. § 205.201(a) makes the producer the
 * author of the plan and § 205.103(b)(2) requires records that can be audited, so a template
 * now produces this checklist and "Log this" hands the farmer the form — with the fields
 * prefilled, the date blank, and their name on the save.
 *
 * The number in the header is COMPLETENESS ("9 of 12 logged"), not a count of events and not a
 * score. Volume was the metric a template could inflate; completeness is the one a certifier
 * actually reads.
 */
import React, { useState } from 'react';

import {
  Badge,
  Box,
  Divider,
  HStack,
  Icon,
  Stack,
  Text,
  VStack,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { FaCheckCircle, FaClipboardList, FaPlus, FaUndo } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import {
  GuidanceNote,
  StandardButton,
  StandardCard,
  StandardSkeleton,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { CorrectRecordModal } from 'components/Modals/CorrectRecordModal';
import { verbForEvent } from 'config/activityVerbs';
import {
  SeasonPlanItem,
  useGetSeasonPlanQuery,
  useUpdateSeasonPlanItemMutation
} from 'store/api/seasonPlanApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface SeasonPlanSectionProps {
  /** History public_id or numeric id — the endpoint resolves either. */
  productionId: string | number;
  farmId?: string;
  parcelId?: string;
  canWrite: boolean;
  /** A finished season is a closed record; nothing more can be logged against it. */
  isFinished?: boolean;
}

/** 44px minimum touch target on phones — these are field-use controls (frontend rules). */
const TOUCH_TARGET = { base: '44px', smd: '32px' };

const STATUS_LABEL: Record<SeasonPlanItem['status'], string> = {
  logged: 'seasonPlan.statusLogged',
  pending: 'seasonPlan.statusPending',
  skipped: 'seasonPlan.statusSkipped'
};

export const SeasonPlanSection: React.FC<SeasonPlanSectionProps> = ({
  productionId,
  farmId,
  parcelId,
  canWrite,
  isFinished = false
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [skipTarget, setSkipTarget] = useState<SeasonPlanItem | null>(null);
  const [skipReason, setSkipReason] = useState('');
  // Which row is mid-request. `isUpdating` is the shared RTK flag, so using it directly put
  // every "Put back" button in the list into a spinner at once.
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  // Which filed record the farmer asked to open. Only ever set on a finished season.
  const [correctTarget, setCorrectTarget] = useState<{ id: number; eventType: number } | null>(
    null
  );
  // Finished seasons collapse the plan to a retrospective: the header badge carries the
  // planned-vs-logged count, and the row list is opt-in. Open seasons never collapse —
  // there the checklist is doing its job.
  const [showFinishedPlan, setShowFinishedPlan] = useState(false);

  const { data, isLoading, isError } = useGetSeasonPlanQuery(
    { historyId: productionId },
    { skip: !productionId }
  );
  const [updateItem, { isLoading: isUpdating }] = useUpdateSeasonPlanItemMutation();

  const items = data?.items || [];
  const completeness = data?.completeness;
  const loggedCount = items.filter((i) => i.status === 'logged').length;

  // A production started without a crop template has no plan, and that is a perfectly good
  // way to work — the card simply does not render rather than nagging for one.
  //
  // ⚠️ `isError` is checked FIRST and separately. Without it a failed request also produced
  // `items.length === 0` and this same `return null`, so the season plan vanished from the
  // production page with no spinner, no message and no trace — the operator had no way to
  // tell "this season has no plan" from "the plan did not load". Silence is the one thing a
  // failure must never look like. There is no retry here because the card renders nothing
  // to hang one on; the surrounding page's own refresh covers it.
  if (isError) return null;
  if (!isLoading && items.length === 0) return null;

  // A plan is a FORWARD-looking artifact; its job ends when the season closes. On a
  // finished season with nothing fulfilled, a 16-row "Planned / 0 of 16 logged" panel is
  // not a record of anything — it misreads a season that may be fully documented
  // free-form as an empty one, and "Planned" promises work that can never happen.
  // Nothing to review → nothing rendered (2026-08-26).
  if (!isLoading && isFinished && loggedCount === 0) return null;

  const openLogForm = (item: SeasonPlanItem) => {
    const verb = verbForEvent(item.event_type, item.event_subtype);
    const params = new URLSearchParams({
      event_type: String(item.event_type),
      plan_item: String(item.id),
      production: String(productionId)
    });
    // Only preset the chooser when a verb genuinely matches. Guessing would drop the farmer
    // into a form whose fields do not describe what they did.
    if (verb) params.set('verb', verb.key);
    navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/add?${params.toString()}`);
  };

  // 🔴 2026-08-21 — this sent the farmer to `/change`, the EDIT wizard, whatever the season's
  // state. On a finished production the server answers 423 to that edit, so the flow was:
  // three wizard steps, then a refusal. The label said "View record" and the destination was
  // an editor, which is the mismatch underneath it.
  //
  // A filed record still has to be READABLE — the farmer is usually checking what they wrote,
  // not changing it — so a closed season opens the details modal, which is the surface that
  // already carries the correction path (`EventDetailsModal` -> `CorrectRecordModal`, gated
  // on `isProductionFinished`). An open season keeps the editor.
  const openRecord = (item: SeasonPlanItem) => {
    if (isFinished) {
      setCorrectTarget({
        id: item.fulfilled_by_id as number,
        eventType: item.fulfilled_by_event_type as number
      });
      return;
    }
    navigate(
      `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/${item.fulfilled_by_id}/change` +
        `?event_type=${item.fulfilled_by_event_type}`
    );
  };

  const askToSkip = (item: SeasonPlanItem) => {
    setSkipTarget(item);
    setSkipReason('');
    onOpen();
  };

  const applyStatus = async (item: SeasonPlanItem, status: 'pending' | 'skipped', reason = '') => {
    setPendingItemId(item.id);
    try {
      await updateItem({
        historyId: productionId,
        itemId: item.id,
        status,
        skipped_reason: reason
      }).unwrap();
      return true;
    } catch (error: any) {
      toast({
        title: intl.formatMessage({ id: 'seasonPlan.errorTitle' }),
        // The 409 body explains that the practice is already logged against a record; without
        // this the farmer gets a bare "could not update" and no way to work out why.
        description: apiErrorMessage(error) ?? undefined,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
      return false;
    } finally {
      setPendingItemId(null);
    }
  };

  const confirmSkip = async () => {
    if (!skipTarget) return;
    // Only dismiss on success — closing regardless discards the reason the farmer just typed
    // and leaves them looking at an unchanged list with no explanation.
    if (await applyStatus(skipTarget, 'skipped', skipReason.trim())) {
      onClose();
    }
  };

  return (
    <>
      {/* mb={0}: the production page's stack sets the gap between blocks. Redundant since
          StandardCard's default became 0 (2026-11-04), kept as the explicit statement. */}
      <StandardCard
        mb={0}
        title={intl.formatMessage({ id: 'seasonPlan.title' })}
        subtitle={intl.formatMessage({ id: 'seasonPlan.subtitle' })}
        titleIcon={<Icon as={FaClipboardList} />}
        headerAction={
          completeness ? (
            <Badge
              variant={
                completeness.logged >= completeness.total - completeness.skipped
                  ? 'subtle'
                  : 'neutral'
              }
              colorScheme={
                completeness.logged >= completeness.total - completeness.skipped
                  ? 'green'
                  : undefined
              }
              textTransform="none">
              {/* Applicable, not total. A practice the operator set aside as not applicable
                  this season is not an outstanding record, and counting it in the denominator
                  means a farmer who has logged everything they were ever going to log still
                  reads as behind. */}
              {intl.formatMessage(
                { id: 'seasonPlan.completeness' },
                { logged: completeness.logged, total: completeness.total - completeness.skipped }
              )}
            </Badge>
          ) : undefined
        }>
        {isLoading ? (
          <StandardSkeleton count={3} />
        ) : isFinished && !showFinishedPlan ? (
          <VStack align="stretch" spacing={3}>
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage(
                { id: 'seasonPlan.finishedSummary' },
                {
                  logged: loggedCount,
                  total: completeness ? completeness.total - completeness.skipped : items.length
                }
              )}
            </Text>
            <StandardButton
              size="sm"
              variant="ghost"
              alignSelf="flex-start"
              onClick={() => setShowFinishedPlan(true)}>
              {intl.formatMessage({ id: 'seasonPlan.showPlan' })}
            </StandardButton>
          </VStack>
        ) : (
          <VStack spacing={0} align="stretch">
            {isFinished && (
              <StandardButton
                size="sm"
                variant="ghost"
                alignSelf="flex-start"
                mb={2}
                onClick={() => setShowFinishedPlan(false)}>
                {intl.formatMessage({ id: 'seasonPlan.hidePlan' })}
              </StandardButton>
            )}
            {items.map((item, index) => {
              const isLogged = item.status === 'logged';
              const isSkipped = item.status === 'skipped';
              // "Planned" is a promise; on a finished season the honest word is a fact.
              const statusKey =
                item.status === 'pending' && isFinished
                  ? 'seasonPlan.statusNotLogged'
                  : STATUS_LABEL[item.status];
              return (
                <Box key={item.id}>
                  {index > 0 && <Divider />}
                  {/* Stacks below 480px: "Not this season" + "Log this" side by side with the
                      practice name does not fit a 375px screen. No row-level `opacity` — it
                      pulls every label in the row under its measured contrast ratio, and the
                      set-aside state is already carried by the strike-through, the muted
                      title and the badge's own word. */}
                  <Stack
                    direction={{ base: 'column', smd: 'row' }}
                    py={3}
                    spacing={3}
                    align={{ base: 'stretch', smd: 'flex-start' }}
                    justify="space-between">
                    <HStack spacing={3} align="flex-start" minW={0}>
                      <Icon
                        as={isLogged ? FaCheckCircle : FaClipboardList}
                        color={isLogged ? 'green.700' : 'gray.400'}
                        mt={1}
                        aria-hidden
                      />
                      <VStack align="start" spacing={0} minW={0}>
                        <Text
                          fontWeight="medium"
                          fontSize={{ base: 'sm', md: 'md' }}
                          color={isSkipped ? 'gray.600' : undefined}
                          textDecoration={isSkipped ? 'line-through' : undefined}>
                          {item.name}
                        </Text>
                        {item.planned_window && (
                          <Text fontSize="xs" color="gray.600">
                            {intl.formatMessage(
                              { id: 'seasonPlan.window' },
                              { window: item.planned_window }
                            )}
                          </Text>
                        )}
                        {isSkipped && item.skipped_reason && (
                          <Text fontSize="xs" color="gray.600" fontStyle="italic">
                            {item.skipped_reason}
                          </Text>
                        )}
                      </VStack>
                    </HStack>

                    <VStack align={{ base: 'stretch', smd: 'end' }} spacing={2} flexShrink={0}>
                      {/* Status is never signalled by colour alone — the pill carries the word. */}
                      <Badge
                        variant={isLogged ? 'subtle' : 'neutral'}
                        colorScheme={isLogged ? 'green' : undefined}
                        textTransform="none">
                        {intl.formatMessage({ id: statusKey })}
                      </Badge>

                      {isLogged && item.fulfilled_by_id != null && (
                        <StandardButton
                          size="sm"
                          minH={TOUCH_TARGET}
                          variant="ghost"
                          onClick={() => openRecord(item)}>
                          {intl.formatMessage({
                            // "View record" pointed at an editor. On a filed season the
                            // control opens the correction sheet, which lists the record's
                            // current values — so it reads as well as corrects — and the
                            // label now says which of the two the farmer is getting.
                            id: isFinished ? 'seasonPlan.correctRecord' : 'seasonPlan.viewRecord'
                          })}
                        </StandardButton>
                      )}

                      {canWrite && !isFinished && item.status === 'pending' && (
                        <HStack spacing={2} w={{ base: '100%', smd: 'auto' }}>
                          <StandardButton
                            size="sm"
                            minH={TOUCH_TARGET}
                            flex={{ base: 1, smd: 'none' }}
                            variant="outline"
                            onClick={() => askToSkip(item)}>
                            {intl.formatMessage({ id: 'seasonPlan.notApplicable' })}
                          </StandardButton>
                          <StandardButton
                            size="sm"
                            minH={TOUCH_TARGET}
                            flex={{ base: 1, smd: 'none' }}
                            leftIcon={<Icon as={FaPlus} />}
                            onClick={() => openLogForm(item)}>
                            {intl.formatMessage({ id: 'seasonPlan.logThis' })}
                          </StandardButton>
                        </HStack>
                      )}

                      {canWrite && !isFinished && isSkipped && (
                        <StandardButton
                          size="sm"
                          minH={TOUCH_TARGET}
                          variant="ghost"
                          leftIcon={<Icon as={FaUndo} />}
                          isLoading={pendingItemId === item.id}
                          onClick={() => applyStatus(item, 'pending')}>
                          {intl.formatMessage({ id: 'seasonPlan.putBack' })}
                        </StandardButton>
                      )}
                    </VStack>
                  </Stack>
                </Box>
              );
            })}
          </VStack>
        )}
      </StandardCard>

      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        isCloseDisabled={isUpdating}
        header={skipTarget?.name}
        footer={
          <HStack spacing={3} justify="flex-end" w="100%">
            <StandardButton variant="outline" onClick={onClose} isDisabled={isUpdating}>
              {intl.formatMessage({ id: 'seasonPlan.skipCancel' })}
            </StandardButton>
            <StandardButton onClick={confirmSkip} isLoading={isUpdating}>
              {intl.formatMessage({ id: 'seasonPlan.skipConfirm' })}
            </StandardButton>
          </HStack>
        }>
        <VStack align="stretch" spacing={3}>
          <Text fontSize="sm" color="gray.700">
            {intl.formatMessage({ id: 'seasonPlan.skipReasonLabel' })}
          </Text>
          <StandardTextarea
            value={skipReason}
            onChange={(event) => setSkipReason(event.target.value)}
            placeholder={intl.formatMessage({ id: 'seasonPlan.skipReasonPlaceholder' })}
            maxLength={255}
            rows={3}
          />
          <GuidanceNote>{intl.formatMessage({ id: 'seasonPlan.skipNote' })}</GuidanceNote>
        </VStack>
      </ResponsiveModal>

      {/* The correction sheet for a filed record. Mounted only when a row asked for it, so
          the query behind it does not run for every plan item on the page. */}
      <CorrectRecordModal
        isOpen={correctTarget !== null}
        onClose={() => setCorrectTarget(null)}
        eventId={correctTarget?.id}
        eventType={correctTarget?.eventType}
        onCorrected={() => setCorrectTarget(null)}
      />
    </>
  );
};

export default SeasonPlanSection;
