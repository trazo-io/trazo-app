/**
 * The operation's own handling and storage facilities, on G6.4 §B and G6.2 §A (2026-11-07).
 *
 * OTCO C7 7.1 asks each on-farm facility's name, site address, city, state, zip and country; 7.2-1 a
 * layout of each; 7.7-2 lists every storage facility with its documentation class, OWN for the
 * operation's own. CCOF G6.4 A1 asks the site name and full address, G6.2 B1 the storage locations as
 * a table. They are facility records with `operated_by = this_operation`: covered by the operation's
 * own certificate, so this form asks no certificate and the panel shows no certificate state.
 *
 * The off-farm handlers stay on the production page, where they are linked to the lots sent to them.
 */
import React, { useRef, useState } from 'react';
import {
  Box,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Text,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaWarehouse } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  type PostHarvestFacility,
  type PostHarvestFacilityRole,
  type PostHarvestFacilityType,
  useAddPostHarvestFacilityMutation,
  useGetPostHarvestFacilitiesQuery,
  useUpdatePostHarvestFacilityMutation,
  useUploadFacilityLayoutMutation
} from 'store/api/postHarvestFacilityApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

/** The kinds a farm runs itself; mirrors FACILITY_TYPE_CHOICES in certifications/models.py. */
const OWN_TYPES: { value: PostHarvestFacilityType; labelId: string }[] = [
  { value: 'packer', labelId: 'handler.type.packer' },
  { value: 'cold_storage', labelId: 'handler.type.coldStorage' },
  { value: 'dry_storage', labelId: 'handler.type.dryStorage' },
  { value: 'dryer', labelId: 'handler.type.dryer' },
  { value: 'huller', labelId: 'handler.type.huller' },
  { value: 'custom', labelId: 'handler.type.custom' }
];

const ROLES: { value: PostHarvestFacilityRole; labelId: string }[] = [
  { value: '', labelId: 'handler.role.unstated' },
  { value: 'handling', labelId: 'handler.role.handling' },
  { value: 'storage', labelId: 'handler.role.storage' },
  { value: 'both', labelId: 'handler.role.both' }
];

interface Draft {
  name: string;
  facility_type: PostHarvestFacilityType;
  role: PostHarvestFacilityRole;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const EMPTY: Draft = {
  name: '',
  facility_type: 'packer',
  role: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: ''
};

/** Street, city, state with postal code, country: OTCO 7.1's parts, as many as are recorded. */
export const fullAddress = (f: Partial<PostHarvestFacility>): string =>
  [f.address, f.city, [f.state, f.postal_code].filter(Boolean).join(' '), f.country]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join(', ');

interface Props {
  companyId: string;
  farmId: string;
  isReadOnly?: boolean;
}

const OSPOwnFacilitiesPanel: React.FC<Props> = ({ companyId, farmId, isReadOnly = false }) => {
  const intl = useIntl();
  const toast = useToast();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const subtext = useColorModeValue('gray.600', 'gray.300');
  const scoped = Boolean(companyId && farmId);
  const { data, isLoading, isError } = useGetPostHarvestFacilitiesQuery(
    { companyId, farmId },
    { skip: !scoped }
  );
  const [addFacility, { isLoading: adding }] = useAddPostHarvestFacilityMutation();
  const [updateFacility, { isLoading: updating }] = useUpdatePostHarvestFacilityMutation();
  const [uploadLayout, { isLoading: uploading }] = useUploadFacilityLayoutMutation();

  // null: no form open; 'new': adding; a number: editing that facility.
  const [editing, setEditing] = useState<null | 'new' | number>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [layout, setLayout] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <Skeleton height="80px" borderRadius="md" />;

  // A failed fetch is not an absence: never print "none recorded" from a network error.
  if (isError || !scoped) {
    return (
      <Box p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor="red.500">
        <HStack spacing={2} align="flex-start" color="red.800">
          <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
          <Text fontSize="sm">{intl.formatMessage({ id: 'osp.ownFacilities.loadFailed' })}</Text>
        </HStack>
      </Box>
    );
  }

  const own = (data || []).filter((f) => f.is_own);

  const open = (facility?: PostHarvestFacility) => {
    setLayout(null);
    if (fileRef.current) fileRef.current.value = '';
    if (!facility) {
      setDraft(EMPTY);
      setEditing('new');
      return;
    }
    setDraft({
      name: facility.name || '',
      facility_type: facility.facility_type,
      role: facility.role || '',
      address: facility.address || '',
      city: facility.city || '',
      state: facility.state || '',
      postal_code: facility.postal_code || '',
      country: facility.country || ''
    });
    setEditing(facility.id);
  };

  const save = async () => {
    const payload = { ...draft, name: draft.name.trim(), operated_by: 'this_operation' as const };
    try {
      const saved =
        editing === 'new'
          ? await addFacility({ companyId, farmId, data: payload }).unwrap()
          : await updateFacility({
              companyId,
              farmId,
              facilityId: editing as number,
              data: payload
            }).unwrap();
      if (layout) {
        await uploadLayout({ companyId, farmId, facilityId: saved.id, file: layout }).unwrap();
      }
      setEditing(null);
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.ownFacilities.saved' }),
        duration: 3000
      });
    } catch (error) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.ownFacilities.saveFailed' }),
        description: apiErrorMessage(error) ?? undefined,
        duration: 6000
      });
    }
  };

  const field = (key: keyof Draft) => ({
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }))
  });

  return (
    <VStack align="stretch" spacing={2} data-testid="own-facilities-panel">
      {own.length === 0 && editing === null && (
        <Text fontSize="sm" color={subtext}>
          {intl.formatMessage({ id: 'osp.ownFacilities.empty' })}
        </Text>
      )}
      {own.map((facility) => (
        <Box key={facility.id} p={3} bg={cardBg} borderRadius="md" data-testid="own-facility-row">
          <HStack spacing={2} align="flex-start">
            <Icon as={FaWarehouse} color="green.700" mt="3px" />
            <VStack align="stretch" spacing={1} flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="semibold">
                {facility.name}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {[facility.facility_type_display, facility.role_display]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {fullAddress(facility) || intl.formatMessage({ id: 'osp.ownFacilities.noAddress' })}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {intl.formatMessage({ id: 'osp.ownFacilities.coverage' })}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {intl.formatMessage({
                  id: facility.layout_document
                    ? 'osp.ownFacilities.layoutAttached'
                    : 'osp.ownFacilities.noLayout'
                })}
              </Text>
            </VStack>
            {!isReadOnly && editing === null && (
              <StandardButton size="sm" variant="ghost" onClick={() => open(facility)}>
                {intl.formatMessage({ id: 'osp.ownFacilities.edit' })}
              </StandardButton>
            )}
          </HStack>
        </Box>
      ))}

      {editing !== null ? (
        <Box p={3} borderWidth="1px" borderRadius="md" data-testid="own-facility-form">
          <VStack align="stretch" spacing={3}>
            <StandardField
              label={intl.formatMessage({ id: 'osp.ownFacilities.field.name' })}
              required>
              <StandardInput {...field('name')} />
            </StandardField>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <StandardField label={intl.formatMessage({ id: 'osp.ownFacilities.field.type' })}>
                <StandardSelect {...field('facility_type')}>
                  {OWN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {intl.formatMessage({ id: t.labelId })}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'osp.ownFacilities.field.role' })}>
                <StandardSelect {...field('role')}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {intl.formatMessage({ id: r.labelId })}
                    </option>
                  ))}
                </StandardSelect>
              </StandardField>
            </SimpleGrid>
            <StandardField label={intl.formatMessage({ id: 'osp.ownFacilities.field.address' })}>
              <StandardInput {...field('address')} />
            </StandardField>
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
              <StandardField label={intl.formatMessage({ id: 'osp.ownFacilities.field.city' })}>
                <StandardInput {...field('city')} />
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'osp.ownFacilities.field.state' })}>
                <StandardInput {...field('state')} />
              </StandardField>
              <StandardField
                label={intl.formatMessage({ id: 'osp.ownFacilities.field.postalCode' })}>
                <StandardInput {...field('postal_code')} />
              </StandardField>
              <StandardField label={intl.formatMessage({ id: 'osp.ownFacilities.field.country' })}>
                <StandardInput {...field('country')} />
              </StandardField>
            </SimpleGrid>
            <StandardField
              label={intl.formatMessage({ id: 'osp.ownFacilities.field.layout' })}
              helpText={intl.formatMessage({ id: 'osp.ownFacilities.field.layoutHelp' })}>
              <StandardInput
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLayout(e.target.files?.[0] || null)
                }
                p={1}
              />
            </StandardField>
            <HStack spacing={2} justify="flex-end">
              <StandardButton variant="ghost" size="sm" onClick={() => setEditing(null)}>
                {intl.formatMessage({ id: 'osp.ownFacilities.cancel' })}
              </StandardButton>
              <StandardButton
                size="sm"
                onClick={save}
                isDisabled={!draft.name.trim()}
                isLoading={adding || updating || uploading}>
                {intl.formatMessage({ id: 'osp.ownFacilities.save' })}
              </StandardButton>
            </HStack>
          </VStack>
        </Box>
      ) : (
        !isReadOnly && (
          <Box>
            <StandardButton size="sm" variant="ghost" onClick={() => open()}>
              {intl.formatMessage({ id: 'osp.ownFacilities.add' })}
            </StandardButton>
          </Box>
        )
      )}
    </VStack>
  );
};

export default OSPOwnFacilitiesPanel;
