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
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import {
  Badge,
  Box,
  Divider,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaExchangeAlt, FaPlus, FaTrash } from 'react-icons/fa';
import type { RootState } from 'store/index';
import { useIntl } from 'react-intl';

import {
  StandardAlert,
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
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

// What to update after each category of notice. Plain English defaults; both locales carry
// the real strings under osp.changeNotifications.nextStep.<category>.
const NEXT_STEP_DEFAULTS: Record<string, string> = {
  prohibited_substance_application:
    'Log the incident on the affected parcel’s season (contamination incident) so the corrective action and samples are on its record.',
  acreage_field_addition:
    'Add the parcel in Trazo and complete its application: land-use history, prior-manager and adjoining-land affidavits, buffers.',
  field_removal:
    'Mark the parcel as no longer in organic production and note it in the next annual update.',
  new_retail_label:
    'Upload the approved label to the documents shelf and update the Labeling module (G7.0).',
  new_processing_handling:
    'Update the handling module (G6.4) and the post-harvest facilities list.',
  practice_input_procedure_change:
    'Update the module or parcel record that describes the practice — buffer rows, materials list, rotation — so the plan matches the notice.'
};

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
  {
    value: 'practice_input_procedure_change',
    defaultMessage: 'Practice / input / procedure change'
  }
];

/**
 * DRF returns `{field: ["message"]}` (or `{detail: "..."}`); RTK Query wraps it as
 * `{status, data}`. Pull out the messages so a 400 explains itself.
 */
const describeApiError = (err: unknown): string | undefined => {
  const data = (err as { data?: unknown })?.data;
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return undefined;
  const messages = Object.values(data as Record<string, unknown>)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string');
  return messages.length ? messages.join(' ') : undefined;
};

/** Local calendar date as YYYY-MM-DD — `toISOString()` is UTC and reads a day ahead in CA. */
const localTodayIso = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const OSPChangeNotificationsPanel: React.FC<Props> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const toast = useToast();
  const subtextColor = useColorModeValue('gray.600', 'gray.400');

  const ospId = osp?.id ?? 0;
  // The farm's parcels, so a notice about a field can name it. Read from the company slice the
  // way the Activities page does — no second request for a list the app already holds.
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const establishmentRow = currentCompany?.establishments?.find(
    (e: { id: number | string }) => String(e.id) === String(farmId)
  );
  const parcels: Array<{ id: number | string; name: string }> = establishmentRow?.parcels ?? [];
  const { data: notifications = [] } = useGetOSPChangeNotificationsQuery(
    { companyId, farmId, ospId },
    { skip: !companyId || !farmId || !osp }
  );
  const [createNotification, { isLoading: isSaving }] = useCreateOSPChangeNotificationMutation();
  const [deleteNotification, { isLoading: isDeleting }] = useDeleteOSPChangeNotificationMutation();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const [category, setCategory] = useState<OSPChangeCategory | ''>('');
  const [description, setDescription] = useState('');
  const [dateNotified, setDateNotified] = useState('');
  const [method, setMethod] = useState<OSPNotificationMethod | ''>('');
  const [docTiming, setDocTiming] = useState<OSPDocumentationTiming | ''>('');
  const [parcelId, setParcelId] = useState<string>('');
  // The last notice filed, so the panel can say what to update next. A notice records what the
  // certifier was told; the plan and records must describe the same change, and nothing in
  // the product writes them from the notice — § 205.201(a) keeps the producer the author.
  const [justFiled, setJustFiled] = useState<{
    category: OSPChangeCategory;
    parcelId: string;
  } | null>(null);

  if (!osp) return null;

  // § 205.400(f)(1) — the immediate-report category. Drives the urgency hint on the date field.
  const isImmediate = category === 'prohibited_substance_application';

  // ONE source of truth for "can this be recorded", named rather than boolean, so the disabled
  // button and the line explaining it cannot drift apart.
  // The date is deliberately NOT in here, even for (f)(1). A grower who discovers drift this
  // morning must be able to record it before they have phoned the certifier; blocking that
  // would make the most urgent category the only one that cannot be entered promptly. The
  // backend allows it and the certifier packet raises the missing date as a [REVIEW] finding.
  const missingRequired = [
    !category && 'osp.changeNotifications.field.category',
    !description.trim() && 'osp.changeNotifications.field.description'
  ]
    .filter((id): id is string => Boolean(id))
    .map((id) =>
      intl.formatMessage({
        id,
        defaultMessage:
          id === 'osp.changeNotifications.field.category' ? 'Change category' : 'What changed?'
      })
    );

  // Only explain the disabled button once they have started; on a pristine form the list is
  // just the required markers restated as an accusation.
  const isDirty = Boolean(
    category || description.trim() || dateNotified || method || docTiming || parcelId
  );

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setDateNotified('');
    setMethod('');
    setDocTiming('');
    setParcelId('');
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
    // The button is disabled while anything is outstanding; this is the belt-and-braces path
    // (keyboard submit, a future caller) rather than the primary feedback channel.
    if (missingRequired.length > 0 || !category) return;
    const data: CreateOSPChangeNotificationData = {
      change_category: category,
      description: description.trim(),
      ...(dateNotified ? { date_notified: dateNotified } : {}),
      ...(method ? { method } : {}),
      ...(docTiming ? { documentation_timing: docTiming } : {}),
      ...(parcelId ? { parcel: Number(parcelId) } : {})
    };
    try {
      await createNotification({ companyId, farmId, ospId, data }).unwrap();
      setJustFiled({ category, parcelId });
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
    } catch (err) {
      // The backend refuses a blank date on an (f)(1) notification and any future date, and
      // says which field and why. Swallowing that into a bare "Could not save" left the grower
      // with an unexplained failure they had no way to act on.
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.changeNotifications.error',
          defaultMessage: 'Could not save the change notification.'
        }),
        description: describeApiError(err),
        duration: 8000,
        isClosable: true
      });
    }
  };

  // `mt` was dropped by StandardCard for years (fixed prop list, no rest-spread) and the note
  // here recorded that. The prop now exists; spacing still comes from the preceding card's
  // `mb`, so none is passed.
  return (
    <StandardCard
      titleIcon={<Icon as={FaExchangeAlt} color="green.700" />}
      title={intl.formatMessage({
        id: 'osp.changeNotifications.title',
        defaultMessage: 'Notification of Changes (7 CFR 205.400(f))'
      })}
      subtitle={intl.formatMessage({
        id: 'osp.changeNotifications.subtitle',
        defaultMessage:
          'Record any change reported to your certifier. A prohibited-substance application must be reported immediately (§ 205.400(f)(1)); other changes require prior notice (§ 205.400(f)(2)).'
      })}>
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
              /* .600 not .400 — green.400 is 2.01:1, below the non-text floor. */
              borderLeftColor={cn.is_immediate ? 'red.600' : 'green.600'}>
              <HStack spacing={2} mb={1} flexWrap="wrap">
                <Badge colorScheme={cn.is_immediate ? 'red' : 'green'} fontSize="11px">
                  {cn.cfr_reference}
                </Badge>
                <Text fontSize="xs" fontWeight="semibold">
                  {cn.change_category_display}
                </Text>
                {cn.parcel_name && (
                  <Badge variant="neutral" fontSize="11px">
                    {cn.parcel_name}
                  </Badge>
                )}
                {formatDateOnly(cn.date_notified) && (
                  <Text fontSize="xs" color={subtextColor}>
                    {formatDateOnly(cn.date_notified)}
                  </Text>
                )}
                <Badge
                  colorScheme={cn.certifier_acknowledged_at ? 'green' : 'yellow'}
                  fontSize="11px">
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
                      <StandardButton
                        size="xs"
                        colorScheme="red"
                        isLoading={isDeleting}
                        onClick={() => handleDelete(cn.id)}>
                        {intl.formatMessage({
                          id: 'osp.changeNotifications.withdrawConfirm',
                          defaultMessage: 'Withdraw'
                        })}
                      </StandardButton>
                      <StandardButton
                        size="xs"
                        variant="ghost"
                        onClick={() => setPendingDeleteId(null)}>
                        {intl.formatMessage({
                          id: 'osp.changeNotifications.withdrawCancel',
                          defaultMessage: 'Cancel'
                        })}
                      </StandardButton>
                    </HStack>
                  ) : (
                    <StandardButton
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
                      )}>
                      {intl.formatMessage({
                        id: 'osp.changeNotifications.withdraw',
                        defaultMessage: 'Withdraw'
                      })}
                    </StandardButton>
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
        <StandardField
          label={intl.formatMessage({
            id: 'osp.changeNotifications.field.category',
            defaultMessage: 'Change category'
          })}
          required>
          <StandardSelect
            placeholder={intl.formatMessage({
              id: 'osp.changeNotifications.field.categoryPlaceholder',
              defaultMessage: 'Select a change category…'
            })}
            value={category}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setCategory(e.target.value as OSPChangeCategory)
            }>
            {CATEGORY_KEYS.map((c) => (
              <option key={c.value} value={c.value}>
                {intl.formatMessage({
                  id: `osp.changeNotifications.category.${c.value}`,
                  defaultMessage: c.defaultMessage
                })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>

        <StandardField
          label={intl.formatMessage({
            id: 'osp.changeNotifications.field.description',
            defaultMessage: 'What changed?'
          })}
          required>
          <StandardTextarea
            rows={3}
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder={intl.formatMessage({
              id: 'osp.changeNotifications.field.descriptionPlaceholder',
              defaultMessage: 'e.g., Added 12-acre Block C to organic acreage'
            })}
          />
        </StandardField>

        {/* A notice about a field names the field, and then prints on that field's Parcel
            Application beside its buffer and land-history rows — so "buffer widened to 45 ft"
            and "buffer width 30 ft" meet on one page instead of one living on this screen and
            the other in the packet. Optional: a new buyer or material is not about a field. */}
        {parcels.length > 0 && (
          <StandardField
            label={intl.formatMessage({
              id: 'osp.changeNotifications.field.parcel',
              defaultMessage: 'About a specific parcel?'
            })}
            helpText={intl.formatMessage({
              id: 'osp.changeNotifications.field.parcelHelp',
              defaultMessage:
                'Optional. A notice that names a parcel prints on that parcel’s application, next to the rows it must agree with.'
            })}>
            <StandardSelect
              data-testid="osp-cn-parcel"
              placeholder={intl.formatMessage({
                id: 'osp.changeNotifications.field.parcelPlaceholder',
                defaultMessage: 'Not about one parcel'
              })}
              value={parcelId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParcelId(e.target.value)}>
              {parcels.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </StandardSelect>
          </StandardField>
        )}

        <SimpleGrid columns={{ base: 1, smd: 3 }} spacing={3}>
          <StandardField
            label={intl.formatMessage({
              id: 'osp.changeNotifications.field.dateNotified',
              defaultMessage: 'Date certifier notified'
            })}
            helpText={
              isImmediate
                ? intl.formatMessage({
                    id: 'osp.changeNotifications.field.dateNotifiedImmediate',
                    defaultMessage:
                      'Add the date once you have reported it — § 205.400(f)(1) requires immediate notification, and your certifier packet flags this row until the date is recorded.'
                  })
                : undefined
            }>
            <StandardInput
              type="date"
              // A notification cannot have been made tomorrow, and a typo'd year silently
              // reorders the packet's audit trail. Backend refuses it too.
              max={localTodayIso()}
              value={dateNotified}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateNotified(e.target.value)}
            />
          </StandardField>

          <StandardField
            label={intl.formatMessage({
              id: 'osp.changeNotifications.field.method',
              defaultMessage: 'Method'
            })}>
            <StandardSelect
              placeholder={intl.formatMessage({
                id: 'osp.changeNotifications.field.methodPlaceholder',
                defaultMessage: 'Verbal or written…'
              })}
              value={method}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setMethod(e.target.value as OSPNotificationMethod)
              }>
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
            </StandardSelect>
          </StandardField>

          {/* Labelled for the field it actually is. "Supporting documentation" over a dropdown
              of TIMINGS promised a file upload this panel does not offer, while a real
              `supporting_document` FileField sits on the model with no writer. */}
          <StandardField
            label={intl.formatMessage({
              id: 'osp.changeNotifications.field.docTiming',
              defaultMessage: 'Supporting documentation timing'
            })}>
            <StandardSelect
              placeholder={intl.formatMessage({
                id: 'osp.changeNotifications.field.docTimingPlaceholder',
                defaultMessage: 'When was it submitted?'
              })}
              value={docTiming}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setDocTiming(e.target.value as OSPDocumentationTiming)
              }>
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
            </StandardSelect>
          </StandardField>
        </SimpleGrid>

        {/* Name what is outstanding instead of failing on click. The old form kept the button
            enabled and answered a click with a warning toast, which makes the grower hunt for
            the field themselves. */}
        <HStack spacing={3} flexWrap="wrap">
          <StandardButton
            size="sm"
            leftIcon={<FaPlus />}
            isLoading={isSaving}
            isDisabled={missingRequired.length > 0}
            onClick={handleSubmit}>
            {intl.formatMessage({
              id: 'osp.changeNotifications.submit',
              defaultMessage: 'Record change notification'
            })}
          </StandardButton>
          {missingRequired.length > 0 && isDirty && (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage(
                {
                  id: 'osp.changeNotifications.blocked',
                  defaultMessage: 'Still needed: {fields}'
                },
                { fields: missingRequired.join(', ') }
              )}
            </Text>
          )}
        </HStack>

        {/* The step after filing. A notice is what the certifier was told; the plan and the
            records must describe the same change, and nothing writes them from the notice. Name
            the record for the category just filed and link to it. */}
        {justFiled && (
          <Box data-testid="osp-cn-next-step">
            <StandardAlert
              status="info"
              mb={0}
              title={intl.formatMessage({
                id: 'osp.changeNotifications.nextStep.title',
                defaultMessage: 'Recorded. Now make the plan say the same thing.'
              })}>
              {
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="sm">
                    {intl.formatMessage({
                      id: `osp.changeNotifications.nextStep.${justFiled.category}`,
                      defaultMessage: NEXT_STEP_DEFAULTS[justFiled.category]
                    })}
                  </Text>
                  {justFiled.parcelId && (
                    <Text fontSize="sm">
                      <RouterLink
                        to={`/admin/dashboard/farm/${farmId}/parcel/${justFiled.parcelId}/application`}
                        style={{ textDecoration: 'underline' }}>
                        {intl.formatMessage({
                          id: 'osp.changeNotifications.nextStep.openParcel',
                          defaultMessage: 'Open the parcel application'
                        })}
                      </RouterLink>
                    </Text>
                  )}
                </VStack>
              }
            </StandardAlert>
          </Box>
        )}
      </VStack>
    </StandardCard>
  );
};

export default OSPChangeNotificationsPanel;
