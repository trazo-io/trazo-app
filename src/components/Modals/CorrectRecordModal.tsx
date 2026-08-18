/**
 * Correcting one value on a filed record.
 *
 * A finished season is locked: its events cannot be edited or deleted, because the
 * certifier packet is built from them. But locked must not mean wrong-forever — a farmer
 * who typed 200 lb instead of 2,000 has to be able to fix it, and an uncorrectable wrong
 * record is worse at an audit than a documented correction.
 *
 * The interaction is deliberately narrow: ONE field, ONE new value, ONE reason. Not the
 * event wizard reopened. A correction is a small, deliberate, explained act, and making
 * it look like ordinary editing would invite exactly the quiet rewriting the lock exists
 * to prevent. The reason is required and the copy says why: it is what an inspector reads.
 */
import { useMemo, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Select,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  Box,
  Icon,
  useToast
} from '@chakra-ui/react';
import { FaExchangeAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton } from 'components/Design/StandardComponents';
import { useAmendEventMutation, useGetEventAmendmentsQuery } from 'store/api/amendmentsApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId?: number;
  eventType?: number;
  onCorrected?: () => void;
}

export const CorrectRecordModal = ({ isOpen, onClose, eventId, eventType, onCorrected }: Props) => {
  const intl = useIntl();
  const toast = useToast();
  const [fieldName, setFieldName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);

  const { data, isLoading } = useGetEventAmendmentsQuery(
    { eventId: eventId as number, eventType: eventType as number },
    { skip: !isOpen || eventId == null || eventType == null }
  );
  const [amendEvent, { isLoading: isSaving }] = useAmendEventMutation();

  // Primary list is what the record actually carries; the rest are behind a toggle.
  const visibleFields = useMemo(
    () =>
      showAllFields ? [...(data?.fields ?? []), ...(data?.blank_fields ?? [])] : data?.fields ?? [],
    [data, showAllFields]
  );

  const selected = useMemo(
    () => visibleFields.find((f) => f.name === fieldName),
    [visibleFields, fieldName]
  );

  const reset = () => {
    setFieldName('');
    setNewValue('');
    setReason('');
    setShowAllFields(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!fieldName || !reason.trim() || eventId == null || eventType == null) return;
    try {
      await amendEvent({
        eventId,
        eventType,
        field_name: fieldName,
        new_value: newValue,
        reason: reason.trim()
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'correct.toast.savedTitle' }),
        description: intl.formatMessage({ id: 'correct.toast.savedBody' }),
        status: 'success',
        duration: 6000,
        isClosable: true
      });
      onCorrected?.();
      handleClose();
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'correct.toast.errorTitle' }),
        // The backend explains itself per field ("that is the value already on the
        // record"); show that rather than a generic failure.
        description:
          apiErrorMessage(error) || intl.formatMessage({ id: 'correct.toast.errorBody' }),
        status: 'error',
        duration: 8000,
        isClosable: true
      });
    }
  };

  // `newValue` is enforced, not just marked with an asterisk. Without this a farmer
  // could pick a field, type a reason and save — blanking the value in one keystroke,
  // which reads in the certifier packet as "Paula Rivas -> (blank)". Deliberately
  // clearing a field is rare enough to not deserve to be the accidental path.
  const canSubmit = !!fieldName && !!newValue.trim() && !!reason.trim() && !isSaving;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent borderRadius="xl" mx={4}>
        <ModalHeader>
          <HStack spacing={3}>
            <Box p={2} borderRadius="lg" bg="green.50">
              <Icon as={FaExchangeAlt} boxSize={5} color="green.700" />
            </Box>
            <Text>{intl.formatMessage({ id: 'correct.title' })}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'correct.intro' })}
            </Text>

            <FormControl isRequired>
              <FormLabel fontSize="sm">
                {intl.formatMessage({ id: 'correct.field.label' })}
              </FormLabel>
              <Select
                placeholder={intl.formatMessage({ id: 'correct.field.placeholder' })}
                value={fieldName}
                isDisabled={isLoading}
                onChange={(e) => {
                  setFieldName(e.target.value);
                  setNewValue('');
                }}>
                {visibleFields.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
              </Select>
              {!showAllFields && !!data?.blank_fields?.length && (
                <FormHelperText fontSize="xs">
                  {/* Button, not Link: Chakra's Link renders an <a> and this one has no
                      href, so it would be unreachable by keyboard. It is a control, not
                      a destination. */}
                  <Button
                    variant="link"
                    size="xs"
                    colorScheme="green"
                    fontWeight="medium"
                    onClick={() => setShowAllFields(true)}>
                    {intl.formatMessage(
                      { id: 'correct.field.showAll' },
                      { count: data.blank_fields.length }
                    )}
                  </Button>
                </FormHelperText>
              )}
            </FormControl>

            {selected && (
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({ id: 'correct.current.label' })}
                </FormLabel>
                {/* Shown read-only, not pre-filled into the input: the farmer is stating
                    what it SHOULD be, and a pre-filled box invites editing a character
                    rather than re-entering the value they actually measured. */}
                <Box px={3} py={2} bg="gray.50" borderRadius="md" borderWidth="1px">
                  <Text fontSize="sm" color="gray.700">
                    {selected.current_value === null || selected.current_value === ''
                      ? intl.formatMessage({ id: 'correct.current.blank' })
                      : String(selected.current_value)}
                  </Text>
                </Box>
              </FormControl>
            )}

            <FormControl isRequired isDisabled={!fieldName}>
              <FormLabel fontSize="sm">{intl.formatMessage({ id: 'correct.new.label' })}</FormLabel>
              <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm">
                {intl.formatMessage({ id: 'correct.reason.label' })}
              </FormLabel>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={intl.formatMessage({ id: 'correct.reason.placeholder' })}
              />
              <FormHelperText fontSize="xs">
                {intl.formatMessage({ id: 'correct.reason.help' })}
              </FormHelperText>
            </FormControl>

            {!!data?.amendments?.length && (
              <Box pt={2}>
                <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={2}>
                  {intl.formatMessage({ id: 'correct.previous.title' })}
                </Text>
                <VStack align="stretch" spacing={2}>
                  {data.amendments.map((a) => (
                    <Box key={a.id} p={2} bg="gray.50" borderRadius="md" fontSize="xs">
                      <Text color="gray.700">
                        <b>{a.field_label}</b>: {a.original_value || '—'} → {a.corrected_value}
                      </Text>
                      <Text color="gray.500">{a.reason}</Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <StandardButton variant="outline" onClick={handleClose}>
              {intl.formatMessage({ id: 'app.cancel' })}
            </StandardButton>
            <StandardButton
              onClick={handleSubmit}
              isDisabled={!canSubmit}
              isLoading={isSaving}
              loadingText={intl.formatMessage({ id: 'correct.saving' })}>
              {intl.formatMessage({ id: 'correct.submit' })}
            </StandardButton>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CorrectRecordModal;
