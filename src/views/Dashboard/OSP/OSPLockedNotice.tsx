/**
 * Forking an OSP into its next version — the one control, and the one sentence, that a
 * locked plan needs. Shared by the module list, the module wizard and the narrative view,
 * which previously had one button between the three of them.
 *
 * The gap this closes: both guided pages ended their explanation with an instruction —
 * "start a new version from the narrative view" — and then provided no button. The only
 * one that existed sat on a third page behind a link labelled "Narrative view &
 * lifecycle", which does not contain the words the farmer had just been told to look for.
 * An instruction standing where an affordance belongs.
 *
 * Forking is confirmed rather than instant, for two reasons that are about the farmer,
 * not about safety-by-default:
 *   1. "Version" is our word, not theirs. The dialog is the only place in the product
 *      that gets to teach what one is, and it costs a single extra tap to do it.
 *   2. The new draft immediately becomes the plan every module page reads and writes
 *      (see selectWorkingOsp). One stray click silently changing what the whole OSP
 *      section is showing you is too large a consequence for an un-narrated button.
 *
 * After a successful fork the mutation invalidates OSP:LIST, the guided pages refetch,
 * and `selectWorkingOsp` starts returning the new draft — so the page the farmer is
 * already looking at unlocks in place. No navigation, no "now go over there". `onForked`
 * exists only for OSPView, which keeps its own explicit `selectedOspId` rather than
 * deriving the working plan from the list.
 */

import React from 'react';
import { HStack, Text, useDisclosure, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { StandardAlert, StandardButton } from 'components/Design/StandardComponents';
import { useNewOSPVersionMutation } from 'store/api/ospApi';
import type { OSP, OSPSummary } from 'types/osp';
import { apiErrorMessage } from 'utils/apiErrorMessage';

/**
 * Only the two fields the fork needs: the id to POST to, and the current version number to
 * name in the confirmation. Deliberately narrower than OSPSummary so the narrative view,
 * which holds a full OSP rather than the list's summary shape, can pass its record in
 * without a cast.
 */
type ForkableOSP = Pick<OSPSummary, 'id' | 'version_number'>;

/**
 * Statuses that have a `osp.status.phrase.*` entry in BOTH catalogs. Anything else falls
 * back to `unknown`.
 *
 * Without this, interpolating `osp.status.phrase.${status}` straight from the wire means a
 * status the backend adds later renders its own dotted id — literally the string
 * "osp.status.phrase.withdrawn_by_certifier" — in the middle of a sentence on a compliance
 * page. react-intl logs and returns the id; it does not throw. That is the same failure as
 * the raw `active` enum this component was written to remove, one layer further back.
 */
const PHRASED_STATUSES = new Set(['draft', 'submitted', 'active', 'superseded', 'withdrawn']);

const statusPhraseId = (status: string | null | undefined) =>
  `osp.status.phrase.${status && PHRASED_STATUSES.has(status) ? status : 'unknown'}`;

/**
 * The fork action, with its own confirmation. One instance per page, placed where that page
 * keeps its controls: the list page's action row, the foot of the wizard's document, the
 * narrative view's header. Same component in all three, so the label, the confirmation and
 * the toast cannot drift apart the way three hand-rolled copies already had.
 */
export const StartNewVersionButton = ({
  osp,
  companyId,
  farmId,
  variant = 'primary',
  size = 'sm',
  onForked
}: {
  osp: ForkableOSP;
  companyId: string;
  farmId: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Only for callers that track the selected plan themselves — see the note above. */
  onForked?: (fresh: OSP) => void;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newVersion, { isLoading }] = useNewOSPVersionMutation();

  /**
   * The dialog never predicts the new version number, and the reason is not caution.
   *
   * It used to say "Start version {n+1}?" derived from the plan in hand. The server does
   * not derive it that way — `new_version` takes max(version_number)+1 across the WHOLE
   * establishment (certifications/views.py). Those agree only when the plan in hand is the
   * newest one. On the narrative view they routinely do not: that page lets the farmer
   * select any version from its history, so with a v3 draft already open and v2 still
   * active, selecting v2 and forking would have promised v3 and produced v4.
   *
   * So the confirmation talks about "a new version" and the SUCCESS TOAST names the number
   * the server actually assigned. Report what happened; never predict it.
   */
  const handleConfirm = async () => {
    try {
      const fresh = await newVersion({ companyId, farmId, ospId: osp.id }).unwrap();
      onClose();
      onForked?.(fresh);
      toast({
        status: 'success',
        duration: 6000,
        title: intl.formatMessage(
          { id: 'osp.newVersion.createdTitle' },
          { version: fresh.version_number }
        ),
        description: intl.formatMessage({ id: 'osp.newVersion.createdBody' })
      });
    } catch (err) {
      toast({
        status: 'error',
        duration: 8000,
        title: intl.formatMessage({ id: 'osp.error.newVersion' }),
        // Never String(err) — a transport failure carries no message worth showing, and
        // the generic line reads better than "[object Object]".
        description:
          apiErrorMessage(err) ?? intl.formatMessage({ id: 'osp.newVersion.failedGeneric' })
      });
    }
  };

  return (
    <>
      <StandardButton variant={variant} size={size} minH="44px" onClick={onOpen}>
        {intl.formatMessage({ id: 'osp.locked.cta' })}
      </StandardButton>

      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        isCloseDisabled={isLoading}
        header={intl.formatMessage({ id: 'osp.newVersion.confirmTitle' })}
        footer={
          <HStack spacing={3} justify="flex-end" w="full">
            <StandardButton variant="outline" minH="44px" onClick={onClose} isDisabled={isLoading}>
              {intl.formatMessage({ id: 'osp.newVersion.confirmCancel' })}
            </StandardButton>
            <StandardButton minH="44px" onClick={handleConfirm} isLoading={isLoading}>
              {intl.formatMessage({ id: 'osp.newVersion.confirmSubmit' })}
            </StandardButton>
          </HStack>
        }>
        <VStack align="stretch" spacing={3}>
          <Text fontSize="sm">
            {intl.formatMessage(
              { id: 'osp.newVersion.confirmIntro' },
              { current: osp.version_number }
            )}
          </Text>
          {/* The body says nothing about approval. This dialog opens on a SUBMITTED plan
              too — sitting with the certifier, not approved by them — and it said "stays
              exactly as your certifier approved it" either way, contradicting the notice
              on the same screen, which correctly reads "submitted to your certifier".

              The duty below is real and is the kind of thing a grower otherwise finds out
              from an inspector. Stated as the regulation states it — a reporting
              obligation — with the citation, and no advice about what to report. */}
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage({ id: 'osp.newVersion.confirmDuty' })}
          </Text>
        </VStack>
      </ResponsiveModal>
    </>
  );
};

/**
 * The explanation. Message only — the button lives on the page's own action row.
 *
 * It briefly held a filled green primary as a child of the alert, and that was wrong on
 * three counts, only the last of which is arguable:
 *
 *   1. No such pattern exists here. All 34 other StandardAlert call sites are message-only,
 *      and the component has `title`/`description` props and no action slot. Passing a
 *      button as `children` invents a system pattern for two call sites — and it looked
 *      invented: a solid block sitting inside a tinted banner, heavier than the sentence
 *      it belonged to.
 *   2. Two semantic hues in one component. `status="info"` paints the container blue;
 *      brand green inside it is a second colour carrying a second meaning, in a repo whose
 *      rule is that status colour means something and is never decoration.
 *   3. Alert actions are low-emphasis everywhere it is written down (Polaris: banner
 *      actions are plain or secondary; Material discourages filled buttons in banners). A
 *      filled primary is the loudest control we have.
 *
 * So the alert states the fact and the page offers the action, which is also the cleaner
 * split: this component is now safe to drop anywhere without dragging company/farm ids
 * and a mutation along with it.
 *
 * `osp.status.phrase.*` humanises the status. The list page used to interpolate the raw
 * API enum, so it read "This plan is active" while the wizard read "This plan is approved
 * and active" — and in Spanish it printed the English word `active` mid-sentence.
 */
export const OSPLockedNotice = ({ osp }: { osp: Pick<OSPSummary, 'status'> }) => {
  const intl = useIntl();

  return (
    <StandardAlert
      status="info"
      description={intl.formatMessage(
        { id: 'osp.locked.body' },
        { status: intl.formatMessage({ id: statusPhraseId(osp.status) }) }
      )}
    />
  );
};
