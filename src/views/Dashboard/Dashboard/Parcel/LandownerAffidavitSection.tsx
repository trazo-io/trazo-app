/**
 * Landowner / prior-manager affidavit UI (3-year transition proof, 7 CFR 205.202(b)).
 * Backend (model/serializer/viewset) already exists; this is the missing capture form.
 * Lives in the parcel field-history area; one or more affidavits per parcel.
 *
 * Note: signed_document upload (the scanned signature) is deferred — it needs a multipart
 * path; the structured attestation + signature dates are captured here.
 */
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
  useToast
} from '@chakra-ui/react';
import { FaFileSignature, FaPlus, FaTrash } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import {
  LandownerAffidavit,
  YearHistoryRow,
  useCreateLandownerAffidavitMutation,
  useDeleteLandownerAffidavitMutation,
  useGetLandownerAffidavitsQuery,
  useUpdateLandownerAffidavitMutation
} from 'store/api/landownerAffidavitApi';

interface Props {
  companyId: string;
  farmId: string;
  parcelId: number | string;
  canWrite: boolean;
}

const EMPTY_FORM = {
  previous_manager_name: '',
  previous_manager_address: '',
  previous_manager_phone: '',
  landowner_name: '',
  landowner_address: '',
  landowner_phone: '',
  field_name: '',
  field_acres: '',
  last_prohibited_date: '',
  attestation_text: '',
  previous_manager_signed_date: '',
  landowner_signed_date: '',
  notes: '',
  // Tri-state, so '' (never answered) is distinguishable from an explicit 'no' / 'yes'.
  // A checkbox would collapse "unanswered" into "no materials applied", which is the
  // § 205.202(b) attestation this form exists to capture honestly.
  no_materials_applied: '' as '' | 'yes' | 'no',
  management_period_start: '',
  management_period_end: '',
  parcel_legal_description: '',
  yearly_history: [] as YearHistoryRow[]
};

const LandownerAffidavitSection: React.FC<Props> = ({ companyId, farmId, parcelId, canWrite }) => {
  const intl = useIntl();
  const toast = useToast();
  const { data: affidavits = [] } = useGetLandownerAffidavitsQuery({ companyId, farmId, parcelId });
  const [createAffidavit, { isLoading: creating }] = useCreateLandownerAffidavitMutation();
  const [updateAffidavit, { isLoading: updating }] = useUpdateLandownerAffidavitMutation();
  const [deleteAffidavit] = useDeleteLandownerAffidavitMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (!showForm) setForm({ ...EMPTY_FORM });
  }, [showForm]);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const addYearRow = () =>
    setForm((f) => ({
      ...f,
      yearly_history: [
        ...f.yearly_history,
        { year: '', land_use: '', inputs: '', applied_by: '', manufacturer: '', date_applied: '' }
      ]
    }));
  const updateYearRow = (idx: number, key: string, value: string) =>
    setForm((f) => {
      const rows = [...f.yearly_history];
      rows[idx] = { ...rows[idx], [key]: value };
      return { ...f, yearly_history: rows };
    });
  const removeYearRow = (idx: number) =>
    setForm((f) => ({ ...f, yearly_history: f.yearly_history.filter((_, i) => i !== idx) }));

  const startEdit = (a: LandownerAffidavit) => {
    setEditingId(a.id);
    setForm({
      previous_manager_name: a.previous_manager_name || '',
      previous_manager_address: a.previous_manager_address || '',
      previous_manager_phone: a.previous_manager_phone || '',
      landowner_name: a.landowner_name || '',
      landowner_address: a.landowner_address || '',
      landowner_phone: a.landowner_phone || '',
      field_name: a.field_name || '',
      field_acres: a.field_acres != null ? String(a.field_acres) : '',
      last_prohibited_date: a.last_prohibited_date || '',
      attestation_text: a.attestation_text || '',
      previous_manager_signed_date: a.previous_manager_signed_date || '',
      landowner_signed_date: a.landowner_signed_date || '',
      notes: a.notes || '',
      no_materials_applied:
        a.no_materials_applied === true ? 'yes' : a.no_materials_applied === false ? 'no' : '',
      management_period_start: a.management_period_start || '',
      management_period_end: a.management_period_end || '',
      parcel_legal_description: a.parcel_legal_description || '',
      yearly_history: Array.isArray(a.yearly_history) ? a.yearly_history : []
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.previous_manager_name.trim()) {
      toast({
        status: 'warning',
        title: intl.formatMessage({
          id: 'parcel.affidavit.toast.nameRequired',
          defaultMessage: 'Prior manager / owner name is required'
        })
      });
      return;
    }
    const data: Partial<LandownerAffidavit> = {
      parcel: Number(parcelId),
      previous_manager_name: form.previous_manager_name,
      previous_manager_address: form.previous_manager_address || null,
      previous_manager_phone: form.previous_manager_phone || null,
      landowner_name: form.landowner_name || null,
      landowner_address: form.landowner_address || null,
      landowner_phone: form.landowner_phone || null,
      field_name: form.field_name || null,
      field_acres: form.field_acres ? Number(form.field_acres) : null,
      last_prohibited_date: form.last_prohibited_date || null,
      attestation_text: form.attestation_text || '',
      previous_manager_signed_date: form.previous_manager_signed_date || null,
      landowner_signed_date: form.landowner_signed_date || null,
      notes: form.notes || null,
      // '' stays null: never send `false` for a question the signer did not answer.
      no_materials_applied:
        form.no_materials_applied === 'yes'
          ? true
          : form.no_materials_applied === 'no'
          ? false
          : null,
      management_period_start: form.management_period_start || null,
      management_period_end: form.management_period_end || null,
      parcel_legal_description: form.parcel_legal_description || null,
      yearly_history: form.yearly_history.filter(
        (r) =>
          r &&
          (r.year || r.land_use || r.inputs || r.applied_by || r.manufacturer || r.date_applied)
      )
    };
    try {
      if (editingId != null) {
        await updateAffidavit({ companyId, farmId, affidavitId: editingId, data }).unwrap();
      } else {
        await createAffidavit({ companyId, farmId, data }).unwrap();
      }
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'parcel.affidavit.toast.saved',
          defaultMessage: 'Landowner affidavit saved'
        })
      });
      setShowForm(false);
      setEditingId(null);
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'parcel.affidavit.toast.saveError',
          defaultMessage: 'Could not save affidavit'
        }),
        description: String((err as { data?: unknown })?.data || err)
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAffidavit({ companyId, farmId, affidavitId: id }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'parcel.affidavit.toast.removed',
          defaultMessage: 'Affidavit removed'
        })
      });
    } catch {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'parcel.affidavit.toast.removeError',
          defaultMessage: 'Could not remove affidavit'
        })
      });
    }
  };

  return (
    <StandardCard mb={4}>
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={FaFileSignature} color="green.600" />
            <Text fontWeight="bold" fontSize="lg">
              {intl.formatMessage({
                id: 'parcel.affidavit.title',
                defaultMessage: 'Landowner / Prior-Manager Affidavit (7 CFR 205.202(b))'
              })}
            </Text>
            {affidavits.length > 0 && <Badge colorScheme="green">{affidavits.length}</Badge>}
          </HStack>
          {canWrite && !showForm && (
            <StandardButton
              size="sm"
              leftIcon={<FaPlus />}
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY_FORM });
                setShowForm(true);
              }}>
              {intl.formatMessage({
                id: 'parcel.affidavit.add',
                defaultMessage: 'Add Affidavit'
              })}
            </StandardButton>
          )}
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {intl.formatMessage({
            id: 'parcel.affidavit.description',
            defaultMessage:
              'Prior owner/manager attestation that no prohibited materials were applied during the 3-year transition, when someone else managed this parcel.'
          })}
        </Text>

        {affidavits.map((a) => (
          <Box key={a.id} p={3} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="semibold" fontSize="sm">
                  {a.previous_manager_name ||
                    intl.formatMessage({
                      id: 'parcel.affidavit.unnamed',
                      defaultMessage: '(unnamed)'
                    })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage(
                    {
                      id: 'parcel.affidavit.lastProhibitedSigned',
                      defaultMessage: 'Last prohibited: {last} · signed {signed}'
                    },
                    {
                      last: a.last_prohibited_date || '—',
                      signed: a.previous_manager_signed_date || '—'
                    }
                  )}
                </Text>
              </Box>
              {canWrite && (
                <HStack spacing={1}>
                  <StandardButton size="xs" variant="ghost" onClick={() => startEdit(a)}>
                    {intl.formatMessage({ id: 'parcel.affidavit.edit', defaultMessage: 'Edit' })}
                  </StandardButton>
                  <IconButton
                    aria-label={intl.formatMessage({
                      id: 'parcel.affidavit.deleteAria',
                      defaultMessage: 'Delete affidavit'
                    })}
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

        {showForm && (
          <Box p={3} borderWidth="1px" borderColor="green.200" borderRadius="md">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.priorManagerName',
                    defaultMessage: 'Prior Manager / Owner Name'
                  })}
                </FormLabel>
                <Input
                  value={form.previous_manager_name}
                  onChange={(e) => set('previous_manager_name', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.priorManagerPhone',
                    defaultMessage: 'Prior Manager Phone'
                  })}
                </FormLabel>
                <Input
                  value={form.previous_manager_phone}
                  onChange={(e) => set('previous_manager_phone', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.priorManagerAddress',
                    defaultMessage: 'Prior Manager Address'
                  })}
                </FormLabel>
                <Input
                  value={form.previous_manager_address}
                  onChange={(e) => set('previous_manager_address', e.target.value)}
                />
              </FormControl>
              {/* MOFGA field 4 / USDA form #2 ask for the LANDOWNER separately from the prior
                  MANAGER — they are frequently different people, and the affidavit is only
                  complete when both are identified. These three keys were already in the
                  payload and in the edit hydration, but had no inputs: every new affidavit
                  POSTed them as null and nobody could tell. */}
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.landownerName',
                    defaultMessage: 'Landowner Name (if different from manager)'
                  })}
                </FormLabel>
                <Input
                  value={form.landowner_name}
                  onChange={(e) => set('landowner_name', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.landownerPhone',
                    defaultMessage: 'Landowner Phone'
                  })}
                </FormLabel>
                <Input
                  value={form.landowner_phone}
                  onChange={(e) => set('landowner_phone', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.landownerAddress',
                    defaultMessage: 'Landowner Address'
                  })}
                </FormLabel>
                <Input
                  value={form.landowner_address}
                  onChange={(e) => set('landowner_address', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.fieldName',
                    defaultMessage: 'Field Name'
                  })}
                </FormLabel>
                <Input
                  value={form.field_name}
                  onChange={(e) => set('field_name', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.fieldAcres',
                    defaultMessage: 'Field Acres'
                  })}
                </FormLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.field_acres}
                  onChange={(e) => set('field_acres', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.lastProhibitedDate',
                    defaultMessage: 'Date of Last Prohibited Material'
                  })}
                </FormLabel>
                <Input
                  type="date"
                  value={form.last_prohibited_date}
                  onChange={(e) => set('last_prohibited_date', e.target.value)}
                />
              </FormControl>
              {/* USDA prints this as a checkbox. A checkbox cannot say "not answered", and
                  an unticked box would then be indistinguishable from a signed declaration
                  that nothing was applied — the § 205.202(b) attestation the whole
                  eligibility determination rests on. Three explicit options instead, with
                  the blank kept as a real, savable state. */}
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.noMaterialsApplied',
                    defaultMessage: 'Materials Applied During Their Management?'
                  })}
                </FormLabel>
                <Select
                  value={form.no_materials_applied}
                  onChange={(e) => set('no_materials_applied', e.target.value)}>
                  <option value="">
                    {intl.formatMessage({
                      id: 'parcel.affidavit.noMaterials.unanswered',
                      defaultMessage: 'Not answered yet'
                    })}
                  </option>
                  <option value="yes">
                    {intl.formatMessage({
                      id: 'parcel.affidavit.noMaterials.declaredNone',
                      defaultMessage: 'Signer declares NO materials were applied'
                    })}
                  </option>
                  <option value="no">
                    {intl.formatMessage({
                      id: 'parcel.affidavit.noMaterials.someApplied',
                      defaultMessage: 'Materials were applied — listed below'
                    })}
                  </option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.managementPeriodStart',
                    defaultMessage: 'Managed This Land From'
                  })}
                </FormLabel>
                <Input
                  type="date"
                  value={form.management_period_start}
                  onChange={(e) => set('management_period_start', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.managementPeriodEnd',
                    defaultMessage: 'Managed This Land Until'
                  })}
                </FormLabel>
                <Input
                  type="date"
                  value={form.management_period_end}
                  onChange={(e) => set('management_period_end', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.parcelLegalDescription',
                    defaultMessage: 'Legal Land Description'
                  })}
                </FormLabel>
                <Input
                  value={form.parcel_legal_description}
                  onChange={(e) => set('parcel_legal_description', e.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'parcel.affidavit.parcelLegalDescriptionPlaceholder',
                    defaultMessage: "Assessor's parcel number, county, township/section/range"
                  })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.priorManagerSignedDate',
                    defaultMessage: 'Prior Manager Signed Date'
                  })}
                </FormLabel>
                <Input
                  type="date"
                  value={form.previous_manager_signed_date}
                  onChange={(e) => set('previous_manager_signed_date', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'parcel.affidavit.landownerSignedDate',
                    defaultMessage: 'Landowner Signed Date (if different)'
                  })}
                </FormLabel>
                <Input
                  type="date"
                  value={form.landowner_signed_date}
                  onChange={(e) => set('landowner_signed_date', e.target.value)}
                />
              </FormControl>
            </SimpleGrid>

            <Divider my={3} />
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="semibold">
                {intl.formatMessage({
                  id: 'parcel.affidavit.yearHistory.title',
                  defaultMessage: '3-Year Land-Use History'
                })}
              </Text>
              <StandardButton
                size="xs"
                variant="outline"
                leftIcon={<FaPlus />}
                onClick={addYearRow}>
                {intl.formatMessage({
                  id: 'parcel.affidavit.yearHistory.addYear',
                  defaultMessage: 'Add Year'
                })}
              </StandardButton>
            </HStack>
            <VStack spacing={2} align="stretch">
              {form.yearly_history.map((row, idx) => (
                <SimpleGrid key={idx} columns={{ base: 1, md: 4 }} spacing={2}>
                  <Input
                    size="sm"
                    placeholder={intl.formatMessage({
                      id: 'parcel.affidavit.yearHistory.year',
                      defaultMessage: 'Year'
                    })}
                    value={String(row.year ?? '')}
                    onChange={(e) => updateYearRow(idx, 'year', e.target.value)}
                  />
                  <Input
                    size="sm"
                    placeholder={intl.formatMessage({
                      id: 'parcel.affidavit.yearHistory.landUse',
                      defaultMessage: 'Land use'
                    })}
                    value={row.land_use || ''}
                    onChange={(e) => updateYearRow(idx, 'land_use', e.target.value)}
                  />
                  <Input
                    size="sm"
                    placeholder={intl.formatMessage({
                      id: 'parcel.affidavit.yearHistory.inputs',
                      defaultMessage: 'Inputs applied'
                    })}
                    value={row.inputs || ''}
                    onChange={(e) => updateYearRow(idx, 'inputs', e.target.value)}
                  />
                  <HStack spacing={1}>
                    <Input
                      size="sm"
                      placeholder={intl.formatMessage({
                        id: 'parcel.affidavit.yearHistory.appliedBy',
                        defaultMessage: 'Applied by'
                      })}
                      value={row.applied_by || ''}
                      onChange={(e) => updateYearRow(idx, 'applied_by', e.target.value)}
                    />
                    {/* USDA asks Material / Manufacturer / Date Applied as separate
                        columns. `inputs` above is the material; a 36-month eligibility
                        check needs the date, which it has never carried. */}
                    <Input
                      size="sm"
                      placeholder={intl.formatMessage({
                        id: 'parcel.affidavit.yearHistory.manufacturer',
                        defaultMessage: 'Manufacturer'
                      })}
                      value={row.manufacturer || ''}
                      onChange={(e) => updateYearRow(idx, 'manufacturer', e.target.value)}
                    />
                    <Input
                      size="sm"
                      type="date"
                      aria-label={intl.formatMessage({
                        id: 'parcel.affidavit.yearHistory.dateApplied',
                        defaultMessage: 'Date applied'
                      })}
                      value={row.date_applied || ''}
                      onChange={(e) => updateYearRow(idx, 'date_applied', e.target.value)}
                    />
                    <IconButton
                      aria-label={intl.formatMessage({
                        id: 'parcel.affidavit.yearHistory.removeAria',
                        defaultMessage: 'Remove year'
                      })}
                      size="sm"
                      variant="ghost"
                      icon={<FaTrash />}
                      onClick={() => removeYearRow(idx)}
                    />
                  </HStack>
                </SimpleGrid>
              ))}
            </VStack>

            <FormControl mt={3}>
              <FormLabel fontSize="sm">
                {intl.formatMessage({
                  id: 'parcel.affidavit.attestation',
                  defaultMessage: 'Attestation (leave blank to use the standard wording)'
                })}
              </FormLabel>
              <Textarea
                rows={2}
                value={form.attestation_text}
                onChange={(e) => set('attestation_text', e.target.value)}
                placeholder={intl.formatMessage({
                  id: 'parcel.affidavit.attestationPlaceholder',
                  defaultMessage:
                    'I verify that this field has not had any prohibited materials as defined by the USDA National Organic Program since the date provided above.'
                })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel fontSize="sm">
                {intl.formatMessage({ id: 'parcel.affidavit.notes', defaultMessage: 'Notes' })}
              </FormLabel>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </FormControl>

            <HStack justify="flex-end" mt={3} spacing={2}>
              <StandardButton size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                {intl.formatMessage({ id: 'parcel.affidavit.cancel', defaultMessage: 'Cancel' })}
              </StandardButton>
              <StandardButton size="sm" onClick={handleSave} isLoading={creating || updating}>
                {editingId != null
                  ? intl.formatMessage({
                      id: 'parcel.affidavit.update',
                      defaultMessage: 'Update Affidavit'
                    })
                  : intl.formatMessage({
                      id: 'parcel.affidavit.save',
                      defaultMessage: 'Save Affidavit'
                    })}
              </StandardButton>
            </HStack>
          </Box>
        )}
      </VStack>
    </StandardCard>
  );
};

export default LandownerAffidavitSection;
