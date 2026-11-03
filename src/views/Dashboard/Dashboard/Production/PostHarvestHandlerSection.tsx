/**
 * Off-farm post-harvest handler for one production — CCOF G6.1 / 7 CFR 205.272.
 *
 * 🔴 2026-08-16. CCOF's grower recordkeeping checklist asks, for any crop sent to another
 * certified operation, for "the handler's current organic certificate". Trazo modeled that
 * record (`PostHarvestFacility`), printed it in the certifier packet
 * (`_facility_cert_block`) — and had no screen for it, so the packet asked the question on
 * every export and the operation had nowhere to answer. This is that screen.
 *
 * 🔴 2026-08-21. The link was a single ForeignKey and is now a MANY relation. A lot with a
 * fresh grade and a process grade goes to two certified operations — Calapooia Bend ships
 * fresh blueberries to Organically Grown Company and process grade to Willamette Valley
 * Fruit, on separate loads — so the operator could record at most half of what § 205.272
 * asks for, and the packet's "no handler certificate on file" warning cleared as soon as one
 * of the two was linked. A checkbox list, not a dropdown: "which of these did this lot go
 * to" is not a single choice.
 *
 * Three rules this component must not break:
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
  Checkbox,
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
  type PostHarvestFacilityRole,
  type PostHarvestFacilityType,
  type ProductionHandlerDetail
} from 'store/api/postHarvestFacilityApi';
import { useUpdateProductionMutation } from 'store/api/historyApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import FacilityProductsEditor from './FacilityProductsEditor';

/** Mirrors PostHarvestFacility.FACILITY_TYPE_CHOICES in certifications/models.py. */
const FACILITY_TYPES: { value: PostHarvestFacilityType; labelId: string }[] = [
  { value: 'huller', labelId: 'handler.type.huller' },
  { value: 'dryer', labelId: 'handler.type.dryer' },
  { value: 'cold_storage', labelId: 'handler.type.coldStorage' },
  { value: 'packer', labelId: 'handler.type.packer' },
  { value: 'custom', labelId: 'handler.type.custom' }
];

/**
 * What the facility DOES for this operation — a different axis from what it IS, and the one CCOF
 * and WSDA split their forms on: CCOF asks handling on G6.1 §C and storage on G6.2 §A, WSDA again
 * across sections K and L. The blank first option is deliberate and is the default: a facility
 * nobody has been asked about must print in the plan as unstated, never as a role the operator
 * never chose.
 */
const FACILITY_ROLES = [
  { value: '', labelId: 'handler.role.unstated' },
  { value: 'handling', labelId: 'handler.role.handling' },
  { value: 'storage', labelId: 'handler.role.storage' },
  { value: 'both', labelId: 'handler.role.both' }
];

const EMPTY_FORM = {
  name: '',
  facility_type: 'huller' as PostHarvestFacilityType,
  role: '' as PostHarvestFacilityRole,
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

  const linkedIds: number[] = link?.post_harvest_facilities ?? [];
  const details: ProductionHandlerDetail[] = link?.details ?? [];

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

  /** Replace the whole set. `removed` only picks which confirmation to show. */
  const setLinkedFacilities = async (nextIds: number[], removed = false) => {
    try {
      await updateProduction({
        historyId: productionId,
        post_harvest_facilities: nextIds
      }).unwrap();
      toast({
        title: intl.formatMessage({
          id: removed ? 'handler.toast.unlinked' : 'handler.toast.linked'
        }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      showError(error, 'handler.toast.linkError');
    }
  };

  const toggleFacility = (id: number, checked: boolean) =>
    setLinkedFacilities(
      checked ? [...linkedIds, id] : linkedIds.filter((linked) => linked !== id),
      !checked
    );

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
      // ADD, never replace: a farmer adding the second handler of a split-grade lot must not
      // silently unlink the first.
      await setLinkedFacilities([...linkedIds, created.id]);
    } catch (error) {
      showError(error, 'handler.toast.createError');
    }
  };

  // Takes the handler explicitly: with a many-relation there is one badge PER handler, and a
  // component-level `detail` would have painted the first handler's verdict on all of them.
  const renderCertStatus = (handler: ProductionHandlerDetail) => {
    // Tri-state, deliberately. See the file header.
    // A bare <Badge> is the solid Trazo-green pill; the theme has no `success` variant, and a
    // name it does not define would fall through to the brand tint and read as decoration.
    if (handler.cert_is_current === true) {
      return <Badge>{intl.formatMessage({ id: 'handler.cert.current' })}</Badge>;
    }
    if (handler.cert_is_current === false) {
      return <Badge variant="danger">{intl.formatMessage({ id: 'handler.cert.expired' })}</Badge>;
    }
    return <Badge variant="warning">{intl.formatMessage({ id: 'handler.cert.unknown' })}</Badge>;
  };

  return (
    <StandardCard
      title={intl.formatMessage({ id: 'handler.title' })}
      variant="elevated"
      padding={{ base: 0, md: 4 }}>
      <VStack spacing={3} align="stretch">
        <Text fontSize="xs" color={labelFg}>
          {intl.formatMessage({ id: 'handler.subtitle' })}
        </Text>

        {details.length > 0 ? (
          <VStack spacing={2} align="stretch">
            {details.map((handler) => (
              <Box key={handler.id} p={{ base: 2, md: 3 }} bg={rowBg} borderRadius="md">
                <HStack spacing={2} flexWrap="wrap">
                  <Icon as={FaIndustry} color="green.700" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">
                    {handler.name}
                  </Text>
                  {handler.facility_type_display && (
                    <Text fontSize="xs" color={labelFg}>
                      {handler.facility_type_display}
                    </Text>
                  )}
                  {renderCertStatus(handler)}
                </HStack>
                <HStack spacing={3} flexWrap="wrap" mt={1}>
                  {handler.certification_number && (
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage(
                        { id: 'handler.display.certNumber' },
                        { number: handler.certification_number }
                      )}
                    </Text>
                  )}
                  {handler.certifier_name && (
                    <Text fontSize="xs" color={labelFg}>
                      {handler.certifier_name}
                    </Text>
                  )}
                  {handler.effective_date && (
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage(
                        { id: 'handler.display.effective' },
                        { date: handler.effective_date }
                      )}
                    </Text>
                  )}
                </HStack>
                {handler.cert_is_current !== true && (
                  // Neutral, not amber: the badge above already carries the status, and the
                  // theme's amber tops out at #E65100 — amber body text on white does not
                  // clear 4.5:1.
                  <Text fontSize="xs" color={labelFg} mt={1}>
                    {intl.formatMessage({
                      id:
                        handler.cert_is_current === false
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
                    onClick={() => toggleFacility(handler.id, false)}>
                    {intl.formatMessage({ id: 'handler.action.unlink' })}
                  </StandardButton>
                )}
              </Box>
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color={labelFg}>
            {intl.formatMessage({ id: 'handler.empty' })}
          </Text>
        )}

        {canWrite && (
          <>
            <Divider />
            {/* A checkbox list, not a dropdown. "Which of these did this lot go to" is not a
                single choice — the fresh grade and the process grade of one blueberry season
                go to two different certified handlers. */}
            <StandardField
              label={intl.formatMessage({ id: 'handler.field.select' })}
              helpText={intl.formatMessage({ id: 'handler.field.selectHelp' })}>
              {facilities.length === 0 ? (
                <Text fontSize="sm" color={labelFg}>
                  {intl.formatMessage({ id: 'handler.field.noneRegistered' })}
                </Text>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {facilities.map((facility) => (
                    <Checkbox
                      key={facility.id}
                      colorScheme="green"
                      isChecked={linkedIds.includes(facility.id)}
                      isDisabled={isLinking || !canQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        toggleFacility(facility.id, e.target.checked)
                      }>
                      <Text fontSize="sm">
                        {facility.name}
                        {facility.facility_type_display
                          ? ` — ${facility.facility_type_display}`
                          : ''}
                      </Text>
                    </Checkbox>
                  ))}
                </VStack>
              )}
            </StandardField>

            {/* CCOF G6.1 C2 / G6.2 A2, OTCO C7 7.7-2 / 7.10-2: what each facility takes. The crops come
                from the records linked to it; the operator adds detail and packaging form. */}
            {facilities.length > 0 && (
              <StandardField
                label={intl.formatMessage({ id: 'handler.products.title' })}
                helpText={intl.formatMessage({ id: 'handler.products.help' })}>
                <VStack align="stretch" spacing={3}>
                  {facilities.map((facility) => (
                    <FacilityProductsEditor
                      key={facility.id}
                      facility={facility}
                      companyId={scope.companyId}
                      farmId={scope.farmId}
                    />
                  ))}
                </VStack>
              </StandardField>
            )}

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
                  <StandardField
                    label={intl.formatMessage({ id: 'handler.field.role' })}
                    helpText={intl.formatMessage({ id: 'handler.field.roleHelp' })}>
                    <StandardSelect
                      value={formData.role}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setField('role', e.target.value)
                      }>
                      {FACILITY_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {intl.formatMessage({ id: r.labelId })}
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
