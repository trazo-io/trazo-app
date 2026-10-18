/**
 * Neighbour-signed adjoining-land attestation (USDA form #25, 7 CFR 205.202(c)).
 *
 * Sits beside LandownerAffidavitSection in the parcel field-history area. The two look
 * similar and are NOT interchangeable:
 *
 *   LandownerAffidavitSection  the PRIOR MANAGER, about the land's own history
 *   this                       the NEIGHBOUR, about their practices on adjoining land
 *
 * Every question the neighbour can leave unanswered is stored TRI-STATE. A checkbox cannot
 * express "not answered", and an unticked box that renders as a signed "no" fabricates the
 * § 205.202(b)/(c) attestation an eligibility determination rests on — the failure this
 * codebase has hit repeatedly. Hence selects, with the blank kept as a real savable state.
 *
 * Note: signed_document upload is deferred (needs a multipart path), matching the landowner
 * section. The structured attestation + signature date are captured here.
 */
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
  useToast
} from '@chakra-ui/react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCard,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  AdjoiningLandAffidavit,
  AdjoiningMaterialCode,
  useCreateAdjoiningLandAffidavitMutation,
  useDeleteAdjoiningLandAffidavitMutation,
  useGetAdjoiningLandAffidavitsQuery,
  useUpdateAdjoiningLandAffidavitMutation
} from 'store/api/adjoiningLandApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface Props {
  companyId: string;
  farmId: string;
  parcelId: number | string;
  canWrite: boolean;
}

// Mirrors AdjoiningLandAffidavit.MATERIAL_CHOICES. The backend REJECTS unknown codes, so
// this list and that dict must stay in step.
const MATERIALS: { value: AdjoiningMaterialCode; labelId: string }[] = [
  { value: 'synthetic_fertilizers', labelId: 'parcel.adjoining.material.syntheticFertilizers' },
  { value: 'herbicides', labelId: 'parcel.adjoining.material.herbicides' },
  { value: 'insecticides', labelId: 'parcel.adjoining.material.insecticides' },
  { value: 'fungicides', labelId: 'parcel.adjoining.material.fungicides' },
  { value: 'treated_wood', labelId: 'parcel.adjoining.material.treatedWood' },
  { value: 'other', labelId: 'parcel.adjoining.material.other' }
];

const BORDER_SIDES = ['N', 'E', 'S', 'W', 'NE', 'NW', 'SE', 'SW'];

/** '' is a real state: the neighbour did not answer. Never collapse it to false. */
type TriState = '' | 'yes' | 'no';
const toTri = (v?: boolean | null): TriState => (v === true ? 'yes' : v === false ? 'no' : '');
const fromTri = (v: TriState): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null);

const EMPTY_FORM = {
  neighbor_name: '',
  neighbor_farm_name: '',
  neighbor_address: '',
  neighbor_phone: '',
  border_side: '',
  neighbor_is_certified_organic: '' as TriState,
  neighbor_certifier_name: '',
  materials_used: [] as AdjoiningMaterialCode[],
  declares_no_materials: '' as TriState,
  not_used_on_adjoining_fields: '' as TriState,
  distance_to_organic_property_ft: '',
  agrees_to_notify: '' as TriState,
  neighbor_signed_date: '',
  notes: ''
};

const AdjoiningLandSection: React.FC<Props> = ({ companyId, farmId, parcelId, canWrite }) => {
  const intl = useIntl();
  const toast = useToast();
  const { data: affidavits = [] } = useGetAdjoiningLandAffidavitsQuery({
    companyId,
    farmId,
    parcelId
  });
  const [createAffidavit, { isLoading: creating }] = useCreateAdjoiningLandAffidavitMutation();
  const [updateAffidavit, { isLoading: updating }] = useUpdateAdjoiningLandAffidavitMutation();
  const [deleteAffidavit] = useDeleteAdjoiningLandAffidavitMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (!showForm) {
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
    }
  }, [showForm]);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const startEdit = (a: AdjoiningLandAffidavit) => {
    setEditingId(a.id);
    setForm({
      neighbor_name: a.neighbor_name || '',
      neighbor_farm_name: a.neighbor_farm_name || '',
      neighbor_address: a.neighbor_address || '',
      neighbor_phone: a.neighbor_phone || '',
      border_side: a.border_side || '',
      neighbor_is_certified_organic: toTri(a.neighbor_is_certified_organic),
      neighbor_certifier_name: a.neighbor_certifier_name || '',
      materials_used: Array.isArray(a.materials_used) ? a.materials_used : [],
      declares_no_materials: toTri(a.declares_no_materials),
      not_used_on_adjoining_fields: toTri(a.not_used_on_adjoining_fields),
      distance_to_organic_property_ft:
        a.distance_to_organic_property_ft != null ? String(a.distance_to_organic_property_ft) : '',
      agrees_to_notify: toTri(a.agrees_to_notify),
      neighbor_signed_date: a.neighbor_signed_date || '',
      notes: a.notes || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.neighbor_name.trim()) {
      toast({
        status: 'warning',
        title: intl.formatMessage({ id: 'parcel.adjoining.toast.nameRequired' })
      });
      return;
    }
    // The backend rejects declaring "none of the above" alongside a list of materials. Catch
    // it here so the grower sees which two answers conflict, not a 400.
    if (form.declares_no_materials === 'yes' && form.materials_used.length) {
      toast({
        status: 'warning',
        title: intl.formatMessage({ id: 'parcel.adjoining.toast.contradiction' })
      });
      return;
    }
    const data: Partial<AdjoiningLandAffidavit> = {
      parcel: Number(parcelId),
      neighbor_name: form.neighbor_name.trim(),
      neighbor_farm_name: form.neighbor_farm_name,
      neighbor_address: form.neighbor_address,
      neighbor_phone: form.neighbor_phone,
      border_side: form.border_side,
      neighbor_is_certified_organic: fromTri(form.neighbor_is_certified_organic),
      neighbor_certifier_name: form.neighbor_certifier_name,
      materials_used: form.materials_used,
      declares_no_materials: fromTri(form.declares_no_materials),
      not_used_on_adjoining_fields: fromTri(form.not_used_on_adjoining_fields),
      // '' -> null, never 0. A blank distance is unrecorded, and 0 ft would assert the
      // neighbour applies material right up to the boundary.
      distance_to_organic_property_ft: form.distance_to_organic_property_ft
        ? Number(form.distance_to_organic_property_ft)
        : null,
      agrees_to_notify: fromTri(form.agrees_to_notify),
      neighbor_signed_date: form.neighbor_signed_date || null,
      notes: form.notes
    };
    try {
      if (editingId != null) {
        await updateAffidavit({ companyId, farmId, affidavitId: editingId, data }).unwrap();
      } else {
        await createAffidavit({ companyId, farmId, data }).unwrap();
      }
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'parcel.adjoining.toast.saved' })
      });
      setShowForm(false);
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'parcel.adjoining.toast.saveError' }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' })
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAffidavit({ companyId, farmId, affidavitId: id }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'parcel.adjoining.toast.removed' })
      });
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'parcel.adjoining.toast.removeError' }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' })
      });
    }
  };

  const triSelect = (key: keyof typeof EMPTY_FORM, labelId: string) => (
    <FormControl>
      <FormLabel fontSize="sm">{intl.formatMessage({ id: labelId })}</FormLabel>
      <StandardSelect value={form[key] as TriState} onChange={(e) => set(key, e.target.value)}>
        <option value="">{intl.formatMessage({ id: 'parcel.adjoining.tri.unanswered' })}</option>
        <option value="yes">{intl.formatMessage({ id: 'parcel.adjoining.tri.yes' })}</option>
        <option value="no">{intl.formatMessage({ id: 'parcel.adjoining.tri.no' })}</option>
      </StandardSelect>
    </FormControl>
  );

  return (
    <Box w="full">
      <StandardCard
        // StandardCardProps types `title` as string. Several existing call sites pass an
        // Element anyway (FieldHistorySection carries a baselined type error for exactly
        // that), so the prop type is what is wrong — but StandardComponents.tsx is being
        // edited elsewhere right now, so this passes a string rather than widening it here.
        title={intl.formatMessage({ id: 'parcel.adjoining.title' })}
        variant="elevated"
        padding={{ base: 0, md: 4 }}
        headerAction={
          canWrite ? (
            <StandardButton
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FaPlus} />}
              onClick={() => setShowForm(true)}>
              {intl.formatMessage({ id: 'parcel.adjoining.add' })}
            </StandardButton>
          ) : undefined
        }>
        <VStack spacing={4} align="stretch">
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'parcel.adjoining.help' })}
          </Text>

          {affidavits.map((a) => (
            <Box key={a.id} p={3} bg="gray.50" borderRadius="md" borderWidth="1px">
              <HStack justify="space-between" align="flex-start">
                <VStack align="start" spacing={0}>
                  <HStack spacing={2}>
                    <Text fontWeight="bold" fontSize="sm">
                      {a.neighbor_name}
                    </Text>
                    {a.border_side && (
                      <Badge colorScheme="gray" fontSize="xs">
                        {a.border_side}
                      </Badge>
                    )}
                    {/* Unsigned is stated, not hidden: until the neighbour signs, this is the
                        operation's account of their practices, not verification of them. */}
                    <Badge colorScheme={a.is_signed ? 'green' : 'orange'} fontSize="xs">
                      {intl.formatMessage({
                        id: a.is_signed ? 'parcel.adjoining.signed' : 'parcel.adjoining.unsigned'
                      })}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.600">
                    {a.declares_no_materials
                      ? intl.formatMessage({ id: 'parcel.adjoining.declaredNone' })
                      : a.materials_display ||
                        intl.formatMessage({ id: 'parcel.adjoining.tri.unanswered' })}
                    {a.distance_to_organic_property_ft != null &&
                      ` · ${a.distance_to_organic_property_ft} ft`}
                  </Text>
                </VStack>
                {canWrite && (
                  <HStack spacing={1}>
                    <StandardButton size="xs" variant="ghost" onClick={() => startEdit(a)}>
                      {intl.formatMessage({ id: 'parcel.adjoining.edit' })}
                    </StandardButton>
                    <IconButton
                      aria-label={intl.formatMessage({ id: 'parcel.adjoining.remove' })}
                      size="xs"
                      variant="ghost"
                      icon={<FaTrash />}
                      onClick={() => handleDelete(a.id)}
                    />
                  </HStack>
                )}
              </HStack>
            </Box>
          ))}

          {showForm && canWrite && (
            <Box p={{ base: 3, md: 4 }} bg="green.50" borderRadius="lg">
              <VStack spacing={3} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">
                      {intl.formatMessage({ id: 'parcel.adjoining.neighborName' })}
                    </FormLabel>
                    <StandardInput
                      value={form.neighbor_name}
                      onChange={(e) => set('neighbor_name', e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">
                      {intl.formatMessage({ id: 'parcel.adjoining.borderSide' })}
                    </FormLabel>
                    <StandardSelect
                      value={form.border_side}
                      onChange={(e) => set('border_side', e.target.value)}
                      placeholder={intl.formatMessage({ id: 'app.select' })}>
                      {BORDER_SIDES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </StandardSelect>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">
                      {intl.formatMessage({ id: 'parcel.adjoining.neighborFarmName' })}
                    </FormLabel>
                    <StandardInput
                      value={form.neighbor_farm_name}
                      onChange={(e) => set('neighbor_farm_name', e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">
                      {intl.formatMessage({ id: 'parcel.adjoining.neighborPhone' })}
                    </FormLabel>
                    <StandardInput
                      value={form.neighbor_phone}
                      onChange={(e) => set('neighbor_phone', e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel fontSize="sm">
                    {intl.formatMessage({ id: 'parcel.adjoining.neighborAddress' })}
                  </FormLabel>
                  <StandardInput
                    value={form.neighbor_address}
                    onChange={(e) => set('neighbor_address', e.target.value)}
                  />
                </FormControl>

                <Divider />

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {triSelect('neighbor_is_certified_organic', 'parcel.adjoining.isOrganic')}
                  {form.neighbor_is_certified_organic === 'yes' && (
                    <FormControl>
                      <FormLabel fontSize="sm">
                        {intl.formatMessage({ id: 'parcel.adjoining.certifierName' })}
                      </FormLabel>
                      <StandardInput
                        value={form.neighbor_certifier_name}
                        onChange={(e) => set('neighbor_certifier_name', e.target.value)}
                      />
                    </FormControl>
                  )}
                </SimpleGrid>

                {/* Materials the neighbour routinely uses. Ticking nothing means UNANSWERED —
                    the affirmative "none of the above" is the separate select below. */}
                <FormControl>
                  <FormLabel fontSize="sm">
                    {intl.formatMessage({ id: 'parcel.adjoining.materialsUsed' })}
                  </FormLabel>
                  <HStack flexWrap="wrap" gap={3}>
                    {MATERIALS.map((m) => (
                      <Checkbox
                        key={m.value}
                        size="sm"
                        colorScheme="green"
                        isChecked={form.materials_used.includes(m.value)}
                        onChange={(e) =>
                          set(
                            'materials_used',
                            e.target.checked
                              ? [...form.materials_used, m.value]
                              : form.materials_used.filter((v) => v !== m.value)
                          )
                        }>
                        <Text fontSize="xs">{intl.formatMessage({ id: m.labelId })}</Text>
                      </Checkbox>
                    ))}
                  </HStack>
                </FormControl>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {triSelect('declares_no_materials', 'parcel.adjoining.declaresNone')}
                  {triSelect(
                    'not_used_on_adjoining_fields',
                    'parcel.adjoining.notOnAdjoiningFields'
                  )}
                  <FormControl>
                    <FormLabel fontSize="sm">
                      {intl.formatMessage({ id: 'parcel.adjoining.distanceFt' })}
                    </FormLabel>
                    {/* FEET, stated in the label. buffer_zones stores metres, and a number
                        typed into the wrong unit is a 3x error in a drift assessment. */}
                    <StandardInput
                      type="number"
                      min={0}
                      value={form.distance_to_organic_property_ft}
                      onChange={(e) => set('distance_to_organic_property_ft', e.target.value)}
                    />
                  </FormControl>
                  {triSelect('agrees_to_notify', 'parcel.adjoining.agreesToNotify')}
                  <FormControl>
                    <FormLabel fontSize="sm">
                      {intl.formatMessage({ id: 'parcel.adjoining.signedDate' })}
                    </FormLabel>
                    <StandardInput
                      type="date"
                      value={form.neighbor_signed_date}
                      onChange={(e) => set('neighbor_signed_date', e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel fontSize="sm">
                    {intl.formatMessage({ id: 'parcel.adjoining.notes' })}
                  </FormLabel>
                  <StandardTextarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </FormControl>

                <HStack justify="flex-end" spacing={2}>
                  <StandardButton size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                    {intl.formatMessage({ id: 'parcel.adjoining.cancel' })}
                  </StandardButton>
                  <StandardButton size="sm" isLoading={creating || updating} onClick={handleSave}>
                    {intl.formatMessage({
                      id: editingId != null ? 'parcel.adjoining.update' : 'parcel.adjoining.save'
                    })}
                  </StandardButton>
                </HStack>
              </VStack>
            </Box>
          )}
        </VStack>
      </StandardCard>
    </Box>
  );
};

export default AdjoiningLandSection;
