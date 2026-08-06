/**
 * OSP Notification-of-Changes panel — NOP 2615 §3.4 / 7 CFR 205.400(f).
 *
 * Lets the producer record a change reported to the certifier. NOP 2615 §3.4
 * enumerates six change categories; the prohibited-substance application is the
 * § 205.400(f)(1) IMMEDIATE category, the rest are § 205.400(f)(2) prior-notice
 * changes. These rows are surfaced in the audit export's "Notification of
 * Changes" block.
 *
 * Backend contract:
 *   - GET    /osps/{id}/change-notifications/       → OSPChangeNotification[]
 *   - POST   /osps/{id}/change-notifications/       body: { change_category, description,
 *            date_notified?, method?, documentation_timing? }
 *   - DELETE /osps/{id}/change-notifications/{nid}/ → 204, only while unacknowledged
 *
 * Entries are append-only ONCE the certifier has acknowledged them: at that
 * point the row records what a third party was told and correcting it means
 * filing a new notification. Before acknowledgment a mistyped entry is just a
 * mistake, and must be withdrawable — otherwise it rides into the certifier
 * dossier forever.
 */

import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardCard } from 'components/Design/StandardComponents';
import {
  useCreateOSPChangeNotificationMutation,
  useDeleteOSPChangeNotificationMutation,
  useGetOSPChangeNotificationsQuery
} from 'store/api/ospApi';
import { formatDateOnly } from 'utils/dateOnly';
import type {
  CreateOSPChangeNotificationData,
  OSP,
  OSPChangeCategory,
  OSPDocumentationTiming,
  OSPNotificationMethod
} from 'types/osp';

interface Props {
  companyId: string;
  farmId: string;
  osp: OSP | null;
}

const CATEGORY_KEYS: { value: OSPChangeCategory; defaultMessage: string }[] = [
  {
    value: 'prohibited_substance_application',
    defaultMessage: 'Prohibited-substance application/drift — § 205.400(f)(1) (IMMEDIATE)'
  },
  {
    value: 'acreage_field_addition',
    defaultMessage: 'Added acreage / new field / product line / facility'
  },
  { value: 'field_removal', defaultMessage: 'Removed a field' },
  { value: 'new_retail_label', defaultMessage: 'New retail label' },
  { value: 'new_processing_handling', defaultMessage: 'New processing / handling' },
  { value: 'practice_input_procedure_change', defaultMessage: 'Practice / input / procedure change' }
];

const OSPChangeNotificationsPanel: React.FC<Props> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const toast = useToast();
  const subtextColor = useColorModeValue('gray.600', 'gray.400');

  const ospId = osp?.id ?? 0;
  const { data: notifications = [] } = useGetOSPChangeNotificationsQuery(
    { companyId, farmId, ospId },
    { skip: !companyId || !farmId || !osp }
  );
  const [createNotification, { isLoading: isSaving }] = useCreateOSPChangeNotificationMutation();
  const [deleteNotification, { isLoading: isDeleting }] =
    useDeleteOSPChangeNotificationMutation();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const [category, setCategory] = useState<OSPChangeCategory | ''>('');
  const [description, setDescription] = useState('');
  const [dateNotified, setDateNotified] = useState('');
  const [method, setMethod] = useState<OSPNotificationMethod | ''>('');
  const [docTiming, setDocTiming] = useState<OSPDocumentationTiming | ''>('');

  if (!osp) return null;

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setDateNotified('');
    setMethod('');
    setDocTiming('');
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotification({ companyId, farmId, ospId, notificationId }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.changeNotifications.withdrawn',
          defaultMessage: 'Change notification withdrawn.'
        }),
        duration: 3000,
        isClosable: true
      });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.changeNotifications.withdrawError',
          defaultMessage: 'Could not withdraw the change notification.'
        }),
        description: String(err?.data?.error || err?.message || ''),
        duration: 6000,
        isClosable: true
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleSubmit = async () => {
    if (!category || !description.trim()) {
      toast({
        status: 'warning',
        title: intl.formatMessage({
          id: 'osp.changeNotifications.validation',
          defaultMessage: 'Category and description are required.'
        }),
        duration: 4000,
        isClosable: true
      });
      return;
    }
    const data: CreateOSPChangeNotificationData = {
      change_category: category,
      description: description.trim(),
      ...(dateNotified ? { date_notified: dateNotified } : {}),
      ...(method ? { method } : {}),
      ...(docTiming ? { documentation_timing: docTiming } : {})
    };
    try {
      await createNotification({ companyId, farmId, ospId, data }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.changeNotifications.saved',
          defaultMessage: 'Change notification recorded.'
        }),
        duration: 3000,
        isClosable: true
      });
      resetForm();
    } catch {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.changeNotifications.error',
          defaultMessage: 'Could not save the change notification.'
        }),
        duration: 4000,
        isClosable: true
      });
    }
  };

  return (
    <StandardCard mt={4}>
      <Text fontWeight="bold" fontSize="sm">
        {intl.formatMessage({
          id: 'osp.changeNotifications.title',
          defaultMessage: 'Notification of Changes (7 CFR 205.400(f))'
        })}
      </Text>
      <Text fontSize="xs" color={subtextColor} mt={1}>
        {intl.formatMessage({
          id: 'osp.changeNotifications.subtitle',
          defaultMessage:
            'Record any change reported to your certifier. A prohibited-substance application must be reported immediately (§ 205.400(f)(1)); other changes require prior notice (§ 205.400(f)(2)).'
        })}
      </Text>

      {/* Existing notifications */}
      <VStack align="stretch" spacing={2} mt={3}>
        {notifications.length === 0 ? (
          <Text fontSize="xs" color={subtextColor}>
            {intl.formatMessage({
              id: 'osp.changeNotifications.empty',
              defaultMessage: 'No change notifications recorded yet.'
            })}
          </Text>
        ) : (
          notifications.map((cn) => (
            <Box
              key={cn.id}
              p={2}
              borderRadius="md"
              bg={cn.is_immediate ? 'red.50' : 'gray.50'}
              borderLeft="3px solid"
              borderLeftColor={cn.is_immediate ? 'red.400' : 'green.400'}
            >
              <HStack spacing={2} mb={1} flexWrap="wrap">
                <Badge colorScheme={cn.is_immediate ? 'red' : 'green'} fontSize="xx-small">
                  {cn.cfr_reference}
                </Badge>
                <Text fontSize="xs" fontWeight="semibold">
                  {cn.change_category_display}
                </Text>
                {formatDateOnly(cn.date_notified) && (
                  <Text fontSize="xs" color={subtextColor}>
                    {formatDateOnly(cn.date_notified)}
                  </Text>
                )}
                <Badge
                  colorScheme={cn.certifier_acknowledged_at ? 'green' : 'yellow'}
                  fontSize="xx-small"
                >
                  {cn.certifier_acknowledged_at
                    ? intl.formatMessage({
                        id: 'osp.changeNotifications.acked',
                        defaultMessage: 'Certifier acknowledged'
                      })
                    : intl.formatMessage({
                        id: 'osp.changeNotifications.pending',
                        defaultMessage: 'Acknowledgment pending'
                      })}
                </Badge>
                {!cn.certifier_acknowledged_at &&
                  (pendingDeleteId === cn.id ? (
                    <HStack spacing={1}>
                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="solid"
                        isLoading={isDeleting}
                        onClick={() => handleDelete(cn.id)}
                      >
                        {intl.formatMessage({
                          id: 'osp.changeNotifications.withdrawConfirm',
                          defaultMessage: 'Withdraw'
                        })}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        {intl.formatMessage({
                          id: 'osp.changeNotifications.withdrawCancel',
                          defaultMessage: 'Cancel'
                        })}
                      </Button>
                    </HStack>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      leftIcon={<FaTrash />}
                      onClick={() => setPendingDeleteId(cn.id)}
                      aria-label={intl.formatMessage(
                        {
                          id: 'osp.changeNotifications.withdrawAria',
                          defaultMessage: 'Withdraw change notification: {description}'
                        },
                        { description: cn.description }
                      )}
                    >
                      {intl.formatMessage({
                        id: 'osp.changeNotifications.withdraw',
                        defaultMessage: 'Withdraw'
                      })}
                    </Button>
                  ))}
              </HStack>
              <Text fontSize="xs" color={subtextColor}>
                {cn.description}
              </Text>
            </Box>
          ))
        )}
      </VStack>

      <Divider my={3} />

      {/* Create form */}
      <VStack align="stretch" spacing={3}>
        <FormControl isRequired>
          <FormLabel fontSize="xs">
            {intl.formatMessage({
              id: 'osp.changeNotifications.field.category',
              defaultMessage: 'Change category'
            })}
          </FormLabel>
          <Select
            size="sm"
            placeholder={intl.formatMessage({
              id: 'osp.changeNotifications.field.categoryPlaceholder',
              defaultMessage: 'Select a change category…'
            })}
            value={category}
            onChange={(e) => setCategory(e.target.value as OSPChangeCategory)}
          >
            {CATEGORY_KEYS.map((c) => (
              <option key={c.value} value={c.value}>
                {intl.formatMessage({
                  id: `osp.changeNotifications.category.${c.value}`,
                  defaultMessage: c.defaultMessage
                })}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl isRequired>
          <FormLabel fontSize="xs">
            {intl.formatMessage({
              id: 'osp.changeNotifications.field.description',
              defaultMessage: 'What changed?'
            })}
          </FormLabel>
          <Textarea
            size="sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={intl.formatMessage({
              id: 'osp.changeNotifications.field.descriptionPlaceholder',
              defaultMessage: 'e.g., Added 12-acre Block C to organic acreage'
            })}
          />
        </FormControl>

        <SimpleGrid columns={{ base: 1, smd: 3 }} spacing={3}>
          <FormControl>
            <FormLabel fontSize="xs">
              {intl.formatMessage({
                id: 'osp.changeNotifications.field.dateNotified',
                defaultMessage: 'Date certifier notified'
              })}
            </FormLabel>
            <Input
              type="date"
              size="sm"
              value={dateNotified}
              onChange={(e) => setDateNotified(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="xs">
              {intl.formatMessage({
                id: 'osp.changeNotifications.field.method',
                defaultMessage: 'Method'
              })}
            </FormLabel>
            <Select
              size="sm"
              placeholder={intl.formatMessage({
                id: 'osp.changeNotifications.field.methodPlaceholder',
                defaultMessage: 'Verbal or written…'
              })}
              value={method}
              onChange={(e) => setMethod(e.target.value as OSPNotificationMethod)}
            >
              <option value="verbal">
                {intl.formatMessage({
                  id: 'osp.changeNotifications.method.verbal',
                  defaultMessage: 'Verbal'
                })}
              </option>
              <option value="written">
                {intl.formatMessage({
                  id: 'osp.changeNotifications.method.written',
                  defaultMessage: 'Written'
                })}
              </option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="xs">
              {intl.formatMessage({
                id: 'osp.changeNotifications.field.docTiming',
                defaultMessage: 'Supporting documentation'
              })}
            </FormLabel>
            <Select
              size="sm"
              placeholder={intl.formatMessage({
                id: 'osp.changeNotifications.field.docTimingPlaceholder',
                defaultMessage: 'When submitted…'
              })}
              value={docTiming}
              onChange={(e) => setDocTiming(e.target.value as OSPDocumentationTiming)}
            >
              <option value="submitted_at_notification">
                {intl.formatMessage({
                  id: 'osp.changeNotifications.docTiming.submitted_at_notification',
                  defaultMessage: 'Submitted at notification'
                })}
              </option>
              <option value="deferred_to_annual_update">
                {intl.formatMessage({
                  id: 'osp.changeNotifications.docTiming.deferred_to_annual_update',
                  defaultMessage: 'Deferred to annual update'
                })}
              </option>
            </Select>
          </FormControl>
        </SimpleGrid>

        <Button
          size="sm"
          colorScheme="green"
          leftIcon={<FaPlus />}
          alignSelf="flex-start"
          isLoading={isSaving}
          onClick={handleSubmit}
        >
          {intl.formatMessage({
            id: 'osp.changeNotifications.submit',
            defaultMessage: 'Record change notification'
          })}
        </Button>
      </VStack>
    </StandardCard>
  );
};

export default OSPChangeNotificationsPanel;
