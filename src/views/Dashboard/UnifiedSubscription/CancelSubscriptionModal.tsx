/**
 * The cancellation screen.
 *
 * Extracted from `UnifiedSubscription/index.tsx` so the contract below can be tested. It used to
 * be an inline `AlertDialog` whose entire body was "Are you sure you want to cancel your
 * subscription?" — one sentence, no end date, and no statement of what a farm keeps or loses.
 *
 * ⚠️ ARL SHAPE — DO NOT TURN THIS INTO A WIZARD.
 * California's Automatic Renewal Law (AB 2863, in force 2025-07-01) permits retention content
 * only where a button that IMMEDIATELY effects cancellation is displayed prominently and
 * proximately on the same page. Three properties follow, and `__tests__/CancelSubscriptionModal`
 * pins each one:
 *
 *   1. everything is on ONE screen — no steps, no "continue"
 *   2. the confirm button is NEVER disabled
 *   3. the reason is optional, and skipping it costs no extra click
 *
 * Splitting the "what you keep" panel onto its own step, or gating the confirm on a reason,
 * turns a compliant screen into obstruction without changing a word of the copy.
 */
import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  List,
  ListIcon,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  VStack
} from '@chakra-ui/react';
import { StandardSelect, StandardTextarea } from 'components/Design/StandardComponents';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';

/**
 * Mirrors `Subscription.CANCELLATION_REASON_CHOICES` in trazo-back/subscriptions/models.py.
 * The backend validates against its own list and drops anything it does not recognise, so a
 * drift here costs telemetry, never a failed cancellation.
 *
 * `seasonal` and `certification_done` do not appear on a generic SaaS churn list and are the two
 * most likely answers on a farm. Neither is really churn — both are dormancy, and both call for
 * a re-engagement date rather than a discount.
 */
export const CANCELLATION_REASONS = [
  'too_expensive',
  'missing_feature',
  'not_using',
  'switched',
  'seasonal',
  'certification_done',
  'too_hard',
  'other'
] as const;

const KEEP_ITEMS = ['Records', 'Logging', 'Qr', 'Storage'] as const;
const LOSE_ITEMS = ['Packet', 'Audit', 'Pur', 'Certifier'] as const;

/** One line of `downgrade_preview.exceeds` from the subscription payload. */
export interface DowngradeExcess {
  /** establishments | media_storage_gb | productions | parcels_per_farm */
  metric: string;
  used: number;
  limit: number;
}

export interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fires with whatever the customer chose to tell us — both fields may be empty. */
  onConfirm: (payload: { reason: string; feedback: string }) => void;
  planName?: string;
  /** Already formatted for display; the modal does no date maths. */
  periodEndLabel?: string;
  isSubmitting?: boolean;
  /**
   * What this company is already OVER on the free tier, computed server-side
   * (`SubscriptionSerializer.get_downgrade_preview`). Empty or undefined = nothing to warn about.
   *
   * Nothing is ever deleted by a downgrade; these are ceilings that stop ADDITIONS. Saying so
   * matters most to the customers most likely to be here — an Operation-tier farm with five
   * farms and 42 GB of photos lands on one farm and 10 GB.
   */
  exceeds?: DowngradeExcess[];
}

export const CancelSubscriptionModal = ({
  isOpen,
  onClose,
  onConfirm,
  planName = '',
  periodEndLabel,
  isSubmitting = false,
  exceeds = []
}: CancelSubscriptionModalProps) => {
  const intl = useIntl();
  const [reason, setReason] = React.useState('');
  const [feedback, setFeedback] = React.useState('');

  // "10 GB of photo storage" is a promise, and it is FALSE for anyone already above it — which
  // is precisely the farm most likely to be reading this screen. Drop the bullet when the
  // over-limit panel is about to state the real numbers, so the two never contradict.
  const overStorage = exceeds.some((e) => e.metric === 'media_storage_gb');
  const keepItems = overStorage ? KEEP_ITEMS.filter((k) => k !== 'Storage') : KEEP_ITEMS;

  // Reset when the modal is dismissed, not on every render: a failed request re-renders with
  // the modal still open, and clearing there would delete what the customer just typed.
  React.useEffect(() => {
    if (!isOpen) {
      setReason('');
      setFeedback('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="lg" fontWeight="bold">
          {intl.formatMessage({ id: 'subscription.cancelTitle' }, { plan: planName })}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {periodEndLabel && (
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'subscription.cancelEndsOn' }, { date: periodEndLabel })}
              </Text>
            )}

            {/* What continues. Green because it is genuinely reassuring, and it is the half of
                this screen a farmer most needs and least expects — the behaviour it describes
                did not exist until 2026-08-22, when cancelling stopped meaning lockout. */}
            <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="md" p={4}>
              <HStack spacing={2} mb={2} align="center">
                <Icon as={FaCheckCircle} color="green.700" boxSize={4} />
                <Text fontSize="sm" fontWeight="bold" color="green.700">
                  {intl.formatMessage({ id: 'subscription.cancelKeepTitle' })}
                </Text>
              </HStack>
              <List spacing={1.5}>
                {keepItems.map((key) => (
                  <ListItem key={key} fontSize="sm" color="gray.700" display="flex">
                    <ListIcon as={FaCheckCircle} color="green.700" mt={1} />
                    {intl.formatMessage({ id: `subscription.cancelKeep${key}` })}
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* What stops. NEUTRAL, not a warning colour: this is a plain statement of which
                features are paid for, not an alarm about something going wrong. */}
            <Box bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
              <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
                {intl.formatMessage({ id: 'subscription.cancelLoseTitle' })}
              </Text>
              <List spacing={1.5}>
                {LOSE_ITEMS.map((key) => (
                  <ListItem key={key} fontSize="sm" color="gray.600" display="flex">
                    <ListIcon as={FaTimesCircle} color="gray.400" mt={1} />
                    {intl.formatMessage({ id: `subscription.cancelLose${key}` })}
                  </ListItem>
                ))}
              </List>
            </Box>

            {exceeds.length > 0 && (
              <Alert status="warning" borderRadius="md" alignItems="flex-start">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">
                    {intl.formatMessage({ id: 'subscription.cancelOverLimitTitle' })}
                  </AlertTitle>
                  <AlertDescription display="block">
                    <VStack align="stretch" spacing={1.5} mt={1}>
                      {exceeds.map((item) => (
                        <Text key={item.metric} fontSize="sm">
                          {intl.formatMessage(
                            { id: `subscription.cancelOver.${item.metric}` },
                            { used: item.used, limit: item.limit }
                          )}
                        </Text>
                      ))}
                    </VStack>
                    <Text fontSize="sm" mt={2}>
                      {intl.formatMessage({ id: 'subscription.cancelOverLimitFooter' })}
                    </Text>
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            <Divider />

            <FormControl>
              <FormLabel fontSize="sm" mb={1} htmlFor="cancel-reason">
                {intl.formatMessage({ id: 'subscription.cancelReasonLabel' })}
              </FormLabel>
              <StandardSelect
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={intl.formatMessage({ id: 'subscription.cancelReasonPlaceholder' })}>
                {CANCELLATION_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {intl.formatMessage({ id: `subscription.cancelReason.${value}` })}
                  </option>
                ))}
              </StandardSelect>
            </FormControl>

            {reason && (
              <FormControl>
                <FormLabel fontSize="sm" mb={1} htmlFor="cancel-feedback">
                  {intl.formatMessage({ id: 'subscription.cancelFeedbackLabel' })}
                </FormLabel>
                <StandardTextarea
                  id="cancel-feedback"
                  value={feedback}
                  maxLength={2000}
                  minH="80px"
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'subscription.cancelFeedbackPlaceholder'
                  })}
                />
              </FormControl>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Stack
            direction={{ base: 'column-reverse', smd: 'row' }}
            spacing={3}
            w="full"
            justify="flex-end">
            <Button
              minH="44px"
              variant="outline"
              onClick={onClose}
              w={{ base: 'full', smd: 'auto' }}>
              {intl.formatMessage({ id: 'subscription.cancelKeepPlan' })}
            </Button>
            {/* NEVER `isDisabled`. See the ARL note at the top of this file. */}
            <Button
              colorScheme="red"
              minH="44px"
              w={{ base: 'full', smd: 'auto' }}
              onClick={() => onConfirm({ reason, feedback })}
              isLoading={isSubmitting}>
              {intl.formatMessage({ id: 'app.confirmCancellation' })}
            </Button>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CancelSubscriptionModal;
