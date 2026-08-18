/**
 * Off-farm post-harvest handler for one production — CCOF G6.1 / 7 CFR 205.272.
 *
 * 🔴 2026-08-16. CCOF's grower recordkeeping checklist asks, for any crop sent to another
 * certified operation, for "the handler's current organic certificate". Trazo modeled that
 * record (`PostHarvestFacility`), printed it in the certifier packet
 * (`_facility_cert_block`) — and had no screen for it, so the packet asked the question on
 * every export and the operation had nowhere to answer. This is that screen.
 *
 * Two rules this component must not break:
 *
 * 1. `cert_is_current` is TRI-STATE. `null` means no effective date is on file — that is an
 *    ASK, not a pass and not a failure. Rendering absence as either one states something
 *    nobody attested to (same class as the 2026-07-31 `Boolean('not_organic')` incident).
 * 2. Selecting a handler is a claim about where the lot went, so it is gated on `canWrite`
 *    like every other production edit — a gate flag proves nothing unless the CONTROLS read
 *    it (2026-08-15 edit-lock audit).
 */
import React, { useState } from 'react';
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
import { FaIndustry, FaPlus } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  useAddPostHarvestFacilityMutation,
  useGetPostHarvestFacilitiesQuery,
  useGetProductionHandlerQuery,
  type PostHarvestFacility,
  type PostHarvestFacilityType
} from 'store/api/postHarvestFacilityApi';
import { useUpdateProductionMutation } from 'store/api/historyApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

/** Mirrors PostHarvestFacility.FACILITY_TYPE_CHOICES in certifications/models.py. */
const FACILITY_TYPES: { value: PostHarvestFacilityType; labelId: string }[] = [
  { value: 'huller', labelId: 'handler.type.huller' },
  { value: 'dryer', labelId: 'handler.type.dryer' },
  { value: 'cold_storage', labelId: 'handler.type.coldStorage' },
  { value: 'packer', labelId: 'handler.type.packer' },
  { value: 'custom', labelId: 'handler.type.custom' }
];

const EMPTY_FORM = {
  name: '',
  facility_type: 'huller' as PostHarvestFacilityType,
  city: '',
  state: '',
  certification_number: '',
  certifier_name: '',
  effective_date: '',
  expiry_date: ''
};

interface PostHarvestHandlerSectionProps {
  /** Production public UUID — the id both the link endpoint and the production PATCH accept. */
  productionId: string;
  companyId?: string | number | null;
  farmId?: string | number | null;
  canWrite: boolean;
}

export function PostHarvestHandlerSection({
  productionId,
  companyId,
  farmId,
  canWrite
}: PostHarvestHandlerSectionProps) {
  const intl = useIntl();
  const toast = useToast();
  const labelFg = useColorModeValue('gray.500', 'gray.400');
  const rowBg = useColorModeValue('gray.50', 'gray.700');

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const scope = { companyId: String(companyId ?? ''), farmId: String(farmId ?? '') };
  const canQuery = Boolean(companyId && farmId);

  const { data: facilities = [] } = useGetPostHarvestFacilitiesQuery(scope, { skip: !canQuery });
  const { data: link } = useGetProductionHandlerQuery(productionId, { skip: !productionId });
  const [addFacility, { isLoading: isCreating }] = useAddPostHarvestFacilityMutation();
  const [updateProduction, { isLoading: isLinking }] = useUpdateProductionMutation();

  const facilityId = link?.post_harvest_facility ?? null;
  const detail = link?.detail ?? null;

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const showError = (error: unknown, fallbackId: string) => {
    toast({
      title: intl.formatMessage({ id: fallbackId }),
      // Surfaces the field-level DRF message (e.g. the cross-farm link refusal) rather than a
      // flat "Update failed" — and never "[object Object]".
      description: apiErrorMessage(error) ?? undefined,
      status: 'error',
      duration: 5000,
      isClosable: true
    });
  };

  const linkFacility = async (nextId: number | null) => {
    try {
      await updateProduction({ historyId: productionId, post_harvest_facility: nextId }).unwrap();
      toast({
        title: intl.formatMessage({
          id: nextId === null ? 'handler.toast.unlinked' : 'handler.toast.linked'
        }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      showError(error, 'handler.toast.linkError');
    }
  };

  const createFacility = async () => {
    if (!formData.name.trim()) return;
    try {
      const created: PostHarvestFacility = await addFacility({
        ...scope,
        data: {
          ...formData,
          // Blank dates must not be sent as "" — DRF rejects an empty string for a DateField,
          // and "we did not record it" is a real answer here (it drives the tri-state below).
          effective_date: formData.effective_date || null,
          expiry_date: formData.expiry_date || null
        }
      }).unwrap();
      setFormData(EMPTY_FORM);
      setIsAdding(false);
      await linkFacility(created.id);
    } catch (error) {
      showError(error, 'handler.toast.createError');
    }
  };

  const renderCertStatus = () => {
    if (!detail) return null;
    // Tri-state, deliberately. See the file header.
    // A bare <Badge> is the solid Trazo-green pill; the theme has no `success` variant, and a
    // name it does not define would fall through to the brand tint and read as decoration.
    if (detail.cert_is_current === true) {
      return <Badge>{intl.formatMessage({ id: 'handler.cert.current' })}</Badge>;
    }
    if (detail.cert_is_current === false) {
      return <Badge variant="danger">{intl.formatMessage({ id: 'handler.cert.expired' })}</Badge>;
    }
    return <Badge variant="warning">{intl.formatMessage({ id: 'handler.cert.unknown' })}</Badge>;
  };

  return (
    <StandardCard
      title={intl.formatMessage({ id: 'handler.title' })}
      variant="elevated"
      padding={{ base: 3, md: 4 }}>
      <VStack spacing={3} align="stretch">
        <Text fontSize="xs" color={labelFg}>
          {intl.formatMessage({ id: 'handler.subtitle' })}
        </Text>

        {detail ? (
          <Box p={{ base: 2, md: 3 }} bg={rowBg} borderRadius="md">
            <HStack spacing={2} flexWrap="wrap">
              <Icon as={FaIndustry} color="green.700" boxSize={4} />
              <Text fontSize="sm" fontWeight="semibold">
                {detail.name}
              </Text>
              {detail.facility_type_display && (
                <Text fontSize="xs" color={labelFg}>
                  {detail.facility_type_display}
                </Text>
              )}
              {renderCertStatus()}
            </HStack>
            <HStack spacing={3} flexWrap="wrap" mt={1}>
              {detail.certification_number && (
                <Text fontSize="xs" color={labelFg}>
                  {intl.formatMessage(
                    { id: 'handler.display.certNumber' },
                    { number: detail.certification_number }
                  )}
                </Text>
              )}
              {detail.certifier_name && (
                <Text fontSize="xs" color={labelFg}>
                  {detail.certifier_name}
                </Text>
              )}
              {detail.effective_date && (
                <Text fontSize="xs" color={labelFg}>
                  {intl.formatMessage(
                    { id: 'handler.display.effective' },
                    { date: detail.effective_date }
                  )}
                </Text>
              )}
            </HStack>
            {detail.cert_is_current !== true && (
              // Neutral, not amber: the badge above already carries the status, and the theme's
              // amber tops out at #E65100 — amber body text on white does not clear 4.5:1.
              <Text fontSize="xs" color={labelFg} mt={1}>
                {intl.formatMessage({
                  id:
                    detail.cert_is_current === false
                      ? 'handler.hint.expired'
                      : 'handler.hint.unknown'
                })}
              </Text>
            )}
            {canWrite && (
              <StandardButton
                variant="ghost"
                size="sm"
                mt={2}
                isLoading={isLinking}
                onClick={() => linkFacility(null)}>
                {intl.formatMessage({ id: 'handler.action.unlink' })}
              </StandardButton>
            )}
          </Box>
        ) : (
          <Text fontSize="sm" color={labelFg}>
            {intl.formatMessage({ id: 'handler.empty' })}
          </Text>
        )}

        {canWrite && (
          <>
            <Divider />
            <StandardField label={intl.formatMessage({ id: 'handler.field.select' })}>
              <StandardSelect
                value={facilityId ? String(facilityId) : ''}
                isDisabled={isLinking || !canQuery}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  linkFacility(e.target.value ? Number(e.target.value) : null)
                }>
                <option value="">{intl.formatMessage({ id: 'handler.field.selectNone' })}</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                    {facility.facility_type_display ? ` — ${facility.facility_type_display}` : ''}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>

            {isAdding ? (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">
                  {intl.formatMessage({ id: 'handler.add.title' })}
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  <StandardField label={intl.formatMessage({ id: 'handler.field.name' })} required>
                    <StandardInput
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setField('name', e.target.value)
                      }
                      placeholder={intl.formatMessage({ id: 'handler.field.namePlaceholder' })}
                    />
                  </StandardField>
                  <StandardField label={intl.formatMessage({ id: 'handler.field.type' })}>
                    <StandardSelect
                      value={formData.facility_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setField('facility_type', e.target.value)
                      }>
                      {FACILITY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {intl.formatMessage({ id: t.labelId })}
                        </option>
                      ))}
                    </StandardSelect>
                  </StandardField>
                  <StandardField label={intl.formatMessage({ id: 'handler.field.city' })}>
                    <StandardInput
                      value={formData.city}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setField('city', e.target.value)
                      }
                    />
                  </StandardField>
                  <StandardField label={intl.formatMessage({ id: 'handler.field.state' })}>
                    <StandardInput
                      value={formData.state}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setField('state', e.target.value)
                      }
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({ id: 'handler.field.certNumber' })}
                    helpText={intl.formatMessage({ id: 'handler.field.certNumberHelp' })}>
                    <StandardInput
                      value={formData.certification_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setField('certification_number', e.target.value)
                      }
                    />
                  </StandardField>
                  <StandardField label={intl.formatMessage({ id: 'handler.field.certifier' })}>
                    <StandardInput
                      value={formData.certifier_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setField('certifier_name', e.target.value)
                      }
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({ id: 'handler.field.effective' })}
                    helpText={intl.formatMessage({ id: 'handler.field.effectiveHelp' })}>
                    <StandardInput
                      type="date"
                      value={formData.effective_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setField('effective_date', e.target.value)
                      }
                    />
                  </StandardField>
                  <StandardField label={intl.formatMessage({ id: 'handler.field.expiry' })}>
                    <StandardInput
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setField('expiry_date', e.target.value)
                      }
                    />
                  </StandardField>
                </SimpleGrid>
                <HStack spacing={2}>
                  <StandardButton
                    variant="primary"
                    size="sm"
                    isLoading={isCreating || isLinking}
                    isDisabled={!formData.name.trim()}
                    onClick={createFacility}>
                    {intl.formatMessage({ id: 'handler.action.save' })}
                  </StandardButton>
                  <StandardButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData(EMPTY_FORM);
                      setIsAdding(false);
                    }}>
                    {intl.formatMessage({ id: 'handler.action.cancel' })}
                  </StandardButton>
                </HStack>
              </VStack>
            ) : (
              <StandardButton
                variant="outline"
                size="sm"
                leftIcon={<Icon as={FaPlus} />}
                isDisabled={!canQuery}
                onClick={() => setIsAdding(true)}>
                {intl.formatMessage({ id: 'handler.action.add' })}
              </StandardButton>
            )}
          </>
        )}
      </VStack>
    </StandardCard>
  );
}

export default PostHarvestHandlerSection;
