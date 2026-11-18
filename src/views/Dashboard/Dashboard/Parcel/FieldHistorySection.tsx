import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { FaHistory, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import {
  StandardCard,
  StandardButton,
  StandardNumberInput,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardSpinner,
  StandardQueryError
} from 'components/Design/StandardComponents';
import {
  useGetParcelCropHistoryQuery,
  useCreateParcelCropHistoryMutation,
  useDeleteParcelCropHistoryMutation,
  useUpdateParcelCropHistoryMutation
} from 'store/api/productApi';

interface SubstanceApplicationRow {
  material?: string;
  manufacturer?: string;
  application_dates?: string;
}

interface ParcelCropHistoryEntry {
  id: number;
  parcel: number;
  year: number;
  crop_grown: string;
  cover_crop?: string;
  /** Split field: one crop on rows 1-40, another on 41-80, same year. The model added this
   *  and the unique constraint depends on it, but no form wrote it until 2026-08-13. */
  block_id?: string;
  production_method: string;
  substances_applied: string;
  /** USDA Field History form #1: per-material rows. Complements the prose blob above;
   *  never derived from it — splitting prose means guessing a manufacturer. */
  substance_applications?: SubstanceApplicationRow[];
  last_prohibited_substance?: string | null;
  date_last_prohibited: string | null;
  notes: string;
  /** CCOF ORGB49 F7 month range, stored as day 1 ("2024-03-01"). */
  period_start?: string | null;
  period_end?: string | null;
  /** WSDA AGR 2264 ref 10 acreage, a decimal string. */
  acres?: string | null;
  /** OTCO C2 2.4 seed / planting stock columns; "" is not stated. */
  propagule_type?: string;
  gmo_status?: string;
  seed_treated?: string;
  seed_treatment_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FieldHistorySectionProps {
  parcelId: number | string;
  canWrite: boolean;
}

const PRODUCTION_METHODS = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'organic', label: 'Organic' },
  { value: 'transitional', label: 'Transitional' },
  { value: 'regenerative', label: 'Regenerative' },
  { value: 'fallow', label: 'Fallow' },
  { value: 'pasture', label: 'Pasture' },
  { value: 'other', label: 'Other' }
];

// OTCO C2 2.4's "Seeds / Planting Stock Information" columns. Blank stays "not stated".
const PROPAGULE_TYPES = ['seed', 'seedling', 'planting_stock'];
const GMO_STATUSES = ['non_gmo', 'gmo', 'unknown'];
const SEED_TREATED = ['untreated', 'treated', 'unknown'];

const METHOD_COLORS: Record<string, string> = {
  organic: 'green',
  transitional: 'orange',
  regenerative: 'teal',
  fallow: 'gray',
  pasture: 'green',
  other: 'gray',
  conventional: 'blue'
};

const currentYear = new Date().getFullYear();

const emptyForm = {
  year: currentYear - 1,
  crop_grown: '',
  cover_crop: '',
  block_id: '',
  production_method: '',
  substances_applied: '',
  // "Name and Application Date of Last Prohibited Input" — USDA asks it for EVERY field,
  // and until 2026-08-12 it was capturable nowhere in the app.
  last_prohibited_substance: '',
  date_last_prohibited: '',
  substance_applications: [] as SubstanceApplicationRow[],
  notes: '',
  // Month inputs hold "YYYY-MM"; the server stores day 1.
  period_start: '',
  period_end: '',
  acres: '',
  propagule_type: '',
  gmo_status: '',
  seed_treated: '',
  seed_treatment_name: ''
};

const FieldHistorySection: React.FC<FieldHistorySectionProps> = ({ parcelId, canWrite }) => {
  const intl = useIntl();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  // `= []` on a failed request made this read as "no field history recorded" — a §205.202(b)
  // land-history claim that only a successful response can support.
  const {
    data: historyEntries = [],
    isLoading,
    isError,
    isFetching,
    refetch
  } = useGetParcelCropHistoryQuery(parcelId, {
    skip: !parcelId
  });

  const [createEntry, { isLoading: isCreating }] = useCreateParcelCropHistoryMutation();
  const [updateEntry, { isLoading: isUpdating }] = useUpdateParcelCropHistoryMutation();
  const [deleteEntry, { isLoading: isDeleting }] = useDeleteParcelCropHistoryMutation();

  const entries = historyEntries as ParcelCropHistoryEntry[];
  const isSaving = isCreating || isUpdating;

  // The month span, acres and planting columns under the crop, when any is stated.
  const rowDetail = (entry: ParcelCropHistoryEntry): string => {
    const month = (iso?: string | null) =>
      iso ? intl.formatDate(new Date(`${iso}T00:00:00`), { year: 'numeric', month: 'short' }) : '';
    const start = month(entry.period_start);
    const end = month(entry.period_end);
    const bits: string[] = [];
    if (start || end) {
      bits.push(start && end && start !== end ? `${start} – ${end}` : start || end);
    }
    if (entry.acres != null && entry.acres !== '') {
      bits.push(
        intl.formatMessage(
          { id: 'parcel.fieldHistory.row.acres' },
          { acres: Number(entry.acres).toString() }
        )
      );
    }
    if (entry.propagule_type) {
      bits.push(
        intl.formatMessage({ id: `parcel.fieldHistory.propagule.${entry.propagule_type}` })
      );
    }
    if (entry.gmo_status) {
      bits.push(intl.formatMessage({ id: `parcel.fieldHistory.gmo.${entry.gmo_status}` }));
    }
    if (entry.seed_treated) {
      const treated = intl.formatMessage({
        id: `parcel.fieldHistory.treated.${entry.seed_treated}`
      });
      bits.push(
        entry.seed_treated === 'treated' && entry.seed_treatment_name
          ? `${treated} (${entry.seed_treatment_name})`
          : treated
      );
    }
    return bits.join(' · ');
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (entry: ParcelCropHistoryEntry) => {
    setEditingId(entry.id);
    setForm({
      year: entry.year,
      crop_grown: entry.crop_grown,
      cover_crop: entry.cover_crop || '',
      block_id: entry.block_id || '',
      production_method: entry.production_method || '',
      substances_applied: entry.substances_applied || '',
      last_prohibited_substance: entry.last_prohibited_substance || '',
      date_last_prohibited: entry.date_last_prohibited || '',
      substance_applications: Array.isArray(entry.substance_applications)
        ? entry.substance_applications
        : [],
      notes: entry.notes || '',
      period_start: (entry.period_start || '').slice(0, 7),
      period_end: (entry.period_end || '').slice(0, 7),
      acres: entry.acres ?? '',
      propagule_type: entry.propagule_type || '',
      gmo_status: entry.gmo_status || '',
      seed_treated: entry.seed_treated || '',
      seed_treatment_name: entry.seed_treatment_name || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.crop_grown.trim()) {
      toast({
        title: intl.formatMessage({ id: 'parcel.fieldHistory.toast.cropRequired' }),
        status: 'warning',
        duration: 3000
      });
      return;
    }
    if (!form.production_method) {
      toast({
        title: intl.formatMessage({ id: 'parcel.fieldHistory.toast.methodRequired' }),
        status: 'warning',
        duration: 3000
      });
      return;
    }

    if (editingId) {
      // Update existing
      try {
        await updateEntry({ id: editingId, ...form }).unwrap();
        toast({
          title: intl.formatMessage({ id: 'parcel.fieldHistory.toast.updated' }),
          status: 'success',
          duration: 3000
        });
        closeForm();
      } catch (error: any) {
        const detail =
          error?.data?.non_field_errors?.[0] ||
          error?.data?.detail ||
          intl.formatMessage({ id: 'parcel.fieldHistory.toast.updateFailed' });
        toast({ title: detail, status: 'error', duration: 4000 });
      }
    } else {
      // Create new. This guard used to reject any repeated year outright, which made the
      // split field that `block_id` exists for impossible to enter — the second crop was
      // refused client-side before it ever reached the server.
      //
      // The check mirrors the DB constraint EXACTLY: (parcel, year, crop_grown, block_id).
      // Dropping crop_grown from it would block succession planting — two different crops in
      // the same block in the same year — which Postgres accepts. A client guard stricter
      // than the constraint it mirrors rejects valid records and looks like a bug in the
      // database.
      const duplicate = entries.some(
        (e) =>
          e.year === form.year &&
          (e.crop_grown || '').trim().toLowerCase() === form.crop_grown.trim().toLowerCase() &&
          (e.block_id || '').trim() === form.block_id.trim()
      );
      if (duplicate) {
        toast({
          title: intl.formatMessage(
            { id: 'parcel.fieldHistory.toast.duplicate.title' },
            { crop: form.crop_grown, year: form.year }
          ),
          description: form.block_id
            ? intl.formatMessage(
                { id: 'parcel.fieldHistory.toast.duplicate.blockBody' },
                { block: form.block_id, year: form.year }
              )
            : intl.formatMessage({ id: 'parcel.fieldHistory.toast.duplicate.splitBody' }),
          status: 'warning',
          duration: 5000
        });
        return;
      }
      try {
        await createEntry({ ...form, parcel: parcelId }).unwrap();
        toast({
          title: intl.formatMessage({ id: 'parcel.fieldHistory.toast.added' }),
          status: 'success',
          duration: 3000
        });
        closeForm();
      } catch (error: any) {
        const detail =
          error?.data?.non_field_errors?.[0] ||
          error?.data?.detail ||
          intl.formatMessage({ id: 'parcel.fieldHistory.toast.saveFailed' });
        toast({ title: detail, status: 'error', duration: 4000 });
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEntry(id).unwrap();
      toast({
        title: intl.formatMessage({ id: 'parcel.fieldHistory.toast.removed' }),
        status: 'success',
        duration: 3000
      });
      if (editingId === id) closeForm();
    } catch {
      toast({
        title: intl.formatMessage({ id: 'parcel.fieldHistory.toast.deleteFailed' }),
        status: 'error',
        duration: 4000
      });
    }
  };

  const headerAction = canWrite ? (
    <StandardButton
      size="sm"
      variant="outline"
      leftIcon={<Icon as={FaPlus} />}
      onClick={openCreate}>
      {intl.formatMessage({ id: 'parcel.fieldHistory.addYear', defaultMessage: 'Add year' })}
    </StandardButton>
  ) : undefined;

  return (
    <Box data-tour="field-history" w="full">
      <StandardCard
        // A plain title and the citation in the subtitle (2026-11-07), like the other cards in
        // this section. Was an icon, a bold line and an orange "Required: 7 CFR 205.202" pill,
        // hardcoded in English.
        titleIcon={<Icon as={FaHistory} color="green.700" boxSize={4} />}
        title={intl.formatMessage({
          id: 'parcel.fieldHistory.title',
          defaultMessage: 'Field history'
        })}
        subtitle={intl.formatMessage({
          id: 'parcel.fieldHistory.subtitle',
          defaultMessage:
            'What grew here each year and what was applied. Your certifier reads the three years before harvest (7 CFR 205.202).'
        })}
        variant="elevated"
        padding={{ base: 0, md: 4 }}
        headerAction={headerAction}>
        <VStack spacing={4} align="stretch">
          {/* Inline add/edit form */}
          {showForm && (
            <Box
              p={{ base: 3, md: 4 }}
              bg="green.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="green.200">
              <Text fontSize="xs" fontWeight="bold" color="green.700" mb={2}>
                {editingId
                  ? intl.formatMessage({
                      id: 'parcel.fieldHistory.editing',
                      defaultMessage: 'EDITING ENTRY'
                    })
                  : intl.formatMessage({
                      id: 'parcel.fieldHistory.newEntry',
                      defaultMessage: 'NEW ENTRY'
                    })}
              </Text>
              <VStack spacing={3} align="stretch">
                <HStack spacing={3} flexWrap="wrap">
                  <Box minW="90px" flex="0 0 auto">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.label.year',
                        defaultMessage: 'YEAR'
                      })}
                    </Text>
                    <StandardNumberInput
                      min={1900}
                      max={currentYear}
                      value={form.year}
                      onChange={(val) => setForm((f) => ({ ...f, year: Number(val) }))}
                      size="sm"
                      borderRadius="md"
                    />
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.label.cropGrown',
                        defaultMessage: 'CROP GROWN'
                      })}
                    </Text>
                    <StandardInput
                      placeholder={intl.formatMessage({
                        id: 'parcel.fieldHistory.cropPlaceholder',
                        defaultMessage: 'e.g. Avocado'
                      })}
                      value={form.crop_grown}
                      onChange={(e) => setForm((f) => ({ ...f, crop_grown: e.target.value }))}
                    />
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.label.coverCrop',
                        defaultMessage: 'COVER CROP (OPTIONAL)'
                      })}
                    </Text>
                    <StandardInput
                      placeholder={intl.formatMessage({
                        id: 'parcel.fieldHistory.coverPlaceholder',
                        defaultMessage: 'e.g. Bell beans + oats alley cover'
                      })}
                      value={form.cover_crop}
                      onChange={(e) => setForm((f) => ({ ...f, cover_crop: e.target.value }))}
                    />
                  </Box>
                  {/* Split field. The model carries block_id specifically so two crops in one
                      year on one parcel can be recorded honestly, and the unique constraint is
                      (parcel, year, block_id) — but no form wrote it, so a split field could
                      not be entered at all: the second row collided with the first. */}
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.blockId',
                        defaultMessage: 'BLOCK / ROWS (OPTIONAL)'
                      })}
                    </Text>
                    <StandardInput
                      placeholder={intl.formatMessage({
                        id: 'parcel.fieldHistory.blockIdPlaceholder',
                        defaultMessage: 'e.g. Rows 1-40 — only if the field was split'
                      })}
                      value={form.block_id}
                      onChange={(e) => setForm((f) => ({ ...f, block_id: e.target.value }))}
                    />
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.label.method',
                        defaultMessage: 'METHOD'
                      })}
                    </Text>
                    <StandardSelect
                      value={form.production_method}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, production_method: e.target.value }))
                      }
                      placeholder={intl.formatMessage({
                        id: 'parcel.fieldHistory.selectMethod',
                        defaultMessage: 'Select method'
                      })}>
                      {PRODUCTION_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {intl.formatMessage({
                            id: `parcel.fieldHistory.method.${m.value}`,
                            defaultMessage: m.label
                          })}
                        </option>
                      ))}
                    </StandardSelect>
                  </Box>
                </HStack>
                {/* CCOF ORGB49 F7 asks each use with a from-to month range, and OTCO C2 2.4 lets a
                    history start the month after the last prohibited input; WSDA AGR 2264 ref 10
                    asks the acreage. All optional. */}
                <HStack spacing={3} flexWrap="wrap" align="flex-end">
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({ id: 'parcel.fieldHistory.label.periodStart' })}
                    </Text>
                    <StandardInput
                      type="month"
                      placeholder="YYYY-MM"
                      value={form.period_start}
                      onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                    />
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({ id: 'parcel.fieldHistory.label.periodEnd' })}
                    </Text>
                    <StandardInput
                      type="month"
                      placeholder="YYYY-MM"
                      value={form.period_end}
                      onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
                    />
                  </Box>
                  <Box minW="110px" flex="0 0 auto">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({ id: 'parcel.fieldHistory.label.acres' })}
                    </Text>
                    <StandardInput
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={form.acres}
                      onChange={(e) => setForm((f) => ({ ...f, acres: e.target.value }))}
                    />
                  </Box>
                </HStack>
                <HStack spacing={3} flexWrap="wrap" align="flex-end">
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({ id: 'parcel.fieldHistory.label.propagule' })}
                    </Text>
                    <StandardSelect
                      value={form.propagule_type}
                      onChange={(e) => setForm((f) => ({ ...f, propagule_type: e.target.value }))}>
                      <option value="">
                        {intl.formatMessage({ id: 'parcel.fieldHistory.notStated' })}
                      </option>
                      {PROPAGULE_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {intl.formatMessage({ id: `parcel.fieldHistory.propagule.${v}` })}
                        </option>
                      ))}
                    </StandardSelect>
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({ id: 'parcel.fieldHistory.label.gmo' })}
                    </Text>
                    <StandardSelect
                      value={form.gmo_status}
                      onChange={(e) => setForm((f) => ({ ...f, gmo_status: e.target.value }))}>
                      <option value="">
                        {intl.formatMessage({ id: 'parcel.fieldHistory.notStated' })}
                      </option>
                      {GMO_STATUSES.map((v) => (
                        <option key={v} value={v}>
                          {intl.formatMessage({ id: `parcel.fieldHistory.gmo.${v}` })}
                        </option>
                      ))}
                    </StandardSelect>
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({ id: 'parcel.fieldHistory.label.seedTreated' })}
                    </Text>
                    <StandardSelect
                      value={form.seed_treated}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          seed_treated: e.target.value,
                          // A name kept under "untreated" would print a treatment nobody applied.
                          seed_treatment_name:
                            e.target.value === 'treated' ? f.seed_treatment_name : ''
                        }))
                      }>
                      <option value="">
                        {intl.formatMessage({ id: 'parcel.fieldHistory.notStated' })}
                      </option>
                      {SEED_TREATED.map((v) => (
                        <option key={v} value={v}>
                          {intl.formatMessage({ id: `parcel.fieldHistory.treated.${v}` })}
                        </option>
                      ))}
                    </StandardSelect>
                  </Box>
                  {form.seed_treated === 'treated' && (
                    <Box flex={1} minW="160px">
                      <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                        {intl.formatMessage({ id: 'parcel.fieldHistory.label.treatmentName' })}
                      </Text>
                      <StandardInput
                        value={form.seed_treatment_name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, seed_treatment_name: e.target.value }))
                        }
                      />
                    </Box>
                  )}
                </HStack>
                <Box>
                  <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                    {intl.formatMessage({
                      id: 'parcel.fieldHistory.label.substances',
                      defaultMessage: 'SUBSTANCES APPLIED'
                    })}
                  </Text>
                  <StandardTextarea
                    rows={2}
                    placeholder={intl.formatMessage({
                      id: 'parcel.fieldHistory.substancesPlaceholder',
                      defaultMessage:
                        'All inputs applied this year (fertilizers, pesticides, amendments, cover crops)'
                    })}
                    value={form.substances_applied}
                    onChange={(e) => setForm((f) => ({ ...f, substances_applied: e.target.value }))}
                  />
                </Box>
                {/* USDA's Field History form asks for the last prohibited input by NAME and
                    DATE, for every field including already-organic ones. Both columns existed
                    on the model and neither was capturable anywhere in the app, so the
                    certifier packet could only ever print a dash. */}
                <HStack spacing={3} align="flex-end">
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.lastProhibitedSubstance',
                        defaultMessage: 'LAST PROHIBITED INPUT'
                      })}
                    </Text>
                    <StandardInput
                      placeholder={intl.formatMessage({
                        id: 'parcel.fieldHistory.lastProhibitedSubstancePlaceholder',
                        defaultMessage: 'e.g. Glyphosate'
                      })}
                      value={form.last_prohibited_substance}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, last_prohibited_substance: e.target.value }))
                      }
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.dateLastProhibited',
                        defaultMessage: 'DATE APPLIED'
                      })}
                    </Text>
                    <StandardInput
                      type="date"
                      value={form.date_last_prohibited}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, date_last_prohibited: e.target.value }))
                      }
                    />
                  </Box>
                </HStack>

                {/* USDA asks Material / Manufacturer / Application Date(s) as three columns.
                    The prose box above stays as the operator's own summary and is never
                    parsed into these rows. */}
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.materialRows',
                        defaultMessage: 'MATERIALS — BRAND, MANUFACTURER, DATE(S)'
                      })}
                    </Text>
                    <StandardButton
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          substance_applications: [
                            ...f.substance_applications,
                            { material: '', manufacturer: '', application_dates: '' }
                          ]
                        }))
                      }>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.addMaterial',
                        defaultMessage: '+ Add material'
                      })}
                    </StandardButton>
                  </HStack>
                  <VStack align="stretch" spacing={2}>
                    {form.substance_applications.map((row, idx) => (
                      <HStack key={idx} spacing={2}>
                        <StandardInput
                          placeholder={intl.formatMessage({
                            id: 'parcel.fieldHistory.material',
                            defaultMessage: 'Product brand name'
                          })}
                          value={row.material || ''}
                          onChange={(e) =>
                            setForm((f) => {
                              const rows = [...f.substance_applications];
                              rows[idx] = { ...rows[idx], material: e.target.value };
                              return { ...f, substance_applications: rows };
                            })
                          }
                        />
                        <StandardInput
                          placeholder={intl.formatMessage({
                            id: 'parcel.fieldHistory.manufacturer',
                            defaultMessage: 'Manufacturer'
                          })}
                          value={row.manufacturer || ''}
                          onChange={(e) =>
                            setForm((f) => {
                              const rows = [...f.substance_applications];
                              rows[idx] = { ...rows[idx], manufacturer: e.target.value };
                              return { ...f, substance_applications: rows };
                            })
                          }
                        />
                        <StandardInput
                          // Free text, not a date input: USDA's column is "Date(s)" and
                          // growers write "3/14 and 6/2". One date picker would either drop
                          // applications or invent precision.
                          placeholder={intl.formatMessage({
                            id: 'parcel.fieldHistory.applicationDates',
                            defaultMessage: 'Application date(s)'
                          })}
                          value={row.application_dates || ''}
                          onChange={(e) =>
                            setForm((f) => {
                              const rows = [...f.substance_applications];
                              rows[idx] = { ...rows[idx], application_dates: e.target.value };
                              return { ...f, substance_applications: rows };
                            })
                          }
                        />
                        <IconButton
                          aria-label={intl.formatMessage({
                            id: 'parcel.fieldHistory.removeMaterial',
                            defaultMessage: 'Remove material'
                          })}
                          size="sm"
                          variant="ghost"
                          icon={<FaTrash />}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              substance_applications: f.substance_applications.filter(
                                (_, i) => i !== idx
                              )
                            }))
                          }
                        />
                      </HStack>
                    ))}
                  </VStack>
                </Box>

                <Box>
                  <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                    {intl.formatMessage({
                      id: 'parcel.fieldHistory.label.notes',
                      defaultMessage: 'NOTES (optional)'
                    })}
                  </Text>
                  <StandardTextarea
                    rows={2}
                    placeholder={intl.formatMessage({
                      id: 'parcel.fieldHistory.notesPlaceholder',
                      defaultMessage: 'Additional notes'
                    })}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </Box>
                <HStack spacing={2} justify="flex-end">
                  <StandardButton size="sm" variant="ghost" onClick={closeForm}>
                    {intl.formatMessage({ id: 'app.cancel' })}
                  </StandardButton>
                  <StandardButton size="sm" isLoading={isSaving} onClick={handleSave}>
                    {intl.formatMessage({
                      id: editingId ? 'parcel.fieldHistory.update' : 'app.save'
                    })}
                  </StandardButton>
                </HStack>
              </VStack>
            </Box>
          )}

          {/* Table or empty state */}
          {isLoading ? (
            <StandardSpinner />
          ) : isError ? (
            <StandardQueryError onRetry={refetch} isRetrying={isFetching} />
          ) : entries.length === 0 ? (
            <Box
              p={{ base: 4, md: 6 }}
              textAlign="center"
              bg="gray.50"
              borderRadius="lg"
              border="1px dashed"
              borderColor="gray.300">
              <Icon as={FaHistory} boxSize={8} color="gray.300" mb={2} />
              <Text fontSize="sm" color="gray.500">
                {intl.formatMessage({
                  id: 'parcel.fieldHistory.empty',
                  defaultMessage: 'No years recorded yet. Add what grew here and what was applied.'
                })}
              </Text>
            </Box>
          ) : (
            <TableContainer>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th fontSize="xs">
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.col.year',
                        defaultMessage: 'Year'
                      })}
                    </Th>
                    <Th fontSize="xs">
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.col.crop',
                        defaultMessage: 'Crop'
                      })}
                    </Th>
                    <Th fontSize="xs" display={{ base: 'none', md: 'table-cell' }}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.col.method',
                        defaultMessage: 'Method'
                      })}
                    </Th>
                    <Th fontSize="xs" display={{ base: 'none', md: 'table-cell' }}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.col.substances',
                        defaultMessage: 'Substances applied'
                      })}
                    </Th>
                    <Th fontSize="xs" display={{ base: 'none', lg: 'table-cell' }}>
                      {intl.formatMessage({
                        id: 'parcel.fieldHistory.col.notes',
                        defaultMessage: 'Notes'
                      })}
                    </Th>
                    {canWrite && <Th />}
                  </Tr>
                </Thead>
                <Tbody>
                  {entries.map((entry) => (
                    <Tr
                      key={entry.id}
                      _hover={{
                        bg: canWrite ? 'green.50' : 'gray.50',
                        cursor: canWrite ? 'pointer' : 'default'
                      }}
                      bg={editingId === entry.id ? 'green.50' : undefined}
                      onClick={() => canWrite && openEdit(entry)}>
                      <Td
                        fontSize={{ base: 'xs', md: 'sm' }}
                        fontWeight="semibold"
                        color="gray.800">
                        {entry.year}
                      </Td>
                      {/* Wraps, with the cover crop on its own line. TableContainer sets
                          nowrap on every cell, so "Carrots (Bolero) + cover: Cereal rye /
                          hairy vetch / crimson clover (winter)" ran one 420px line and pushed
                          Notes and the edit/delete buttons past the card's right edge
                          (screen audit 2026-11-06). */}
                      <Td
                        fontSize={{ base: 'xs', md: 'sm' }}
                        color="gray.700"
                        whiteSpace="normal"
                        minW="140px">
                        {entry.crop_grown}
                        {entry.cover_crop ? (
                          <Text fontSize="xs" color="gray.500">
                            {intl.formatMessage(
                              {
                                id: 'parcel.fieldHistory.coverLine',
                                defaultMessage: '+ cover: {crop}'
                              },
                              { crop: entry.cover_crop }
                            )}
                          </Text>
                        ) : null}
                        {rowDetail(entry) ? (
                          <Text fontSize="xs" color="gray.500">
                            {rowDetail(entry)}
                          </Text>
                        ) : null}
                      </Td>
                      <Td
                        fontSize={{ base: 'xs', md: 'sm' }}
                        display={{ base: 'none', md: 'table-cell' }}>
                        <Badge
                          colorScheme={METHOD_COLORS[entry.production_method] || 'blue'}
                          variant="subtle"
                          fontSize="xs"
                          px={2}
                          borderRadius="full">
                          {intl.formatMessage({
                            id: `parcel.fieldHistory.method.${entry.production_method}`,
                            defaultMessage:
                              PRODUCTION_METHODS.find((m) => m.value === entry.production_method)
                                ?.label ?? entry.production_method
                          })}
                        </Badge>
                      </Td>
                      <Td
                        fontSize="xs"
                        color="gray.600"
                        display={{ base: 'none', md: 'table-cell' }}
                        // Wraps (2026-11-07): truncated at 160px, "Rexius compost 4 t/ac pre…"
                        // hid the very inputs a certifier reads this table for.
                        minW="160px"
                        whiteSpace="normal">
                        {entry.substances_applied || '—'}
                        {/* The date that decides the 36 months (§ 205.202(b)) was stored and never
                            shown, so the grower could not see it had been saved (overall review
                            2026-11, OV-FJ-C08). */}
                        {(entry.last_prohibited_substance || entry.date_last_prohibited) && (
                          <Text fontSize="xs" color="gray.700" mt={1}>
                            {intl.formatMessage(
                              { id: 'parcel.fieldHistory.row.lastProhibited' },
                              {
                                detail: [
                                  entry.last_prohibited_substance,
                                  entry.date_last_prohibited &&
                                    intl.formatDate(
                                      new Date(`${entry.date_last_prohibited}T00:00:00`),
                                      {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      }
                                    )
                                ]
                                  .filter(Boolean)
                                  .join(', ')
                              }
                            )}
                          </Text>
                        )}
                      </Td>
                      <Td
                        fontSize="xs"
                        color="gray.600"
                        display={{ base: 'none', lg: 'table-cell' }}
                        // Wraps (2026-11-07): truncated at 160px, "Rexius compost 4 t/ac pre…"
                        // hid the very inputs a certifier reads this table for.
                        minW="160px"
                        whiteSpace="normal">
                        {entry.notes || '—'}
                      </Td>
                      {canWrite && (
                        <Td isNumeric>
                          <HStack spacing={1} justify="flex-end">
                            <StandardButton
                              size="xs"
                              variant="ghost"
                              aria-label={intl.formatMessage({
                                id: 'parcel.fieldHistory.editEntry',
                                defaultMessage: 'Edit entry'
                              })}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                openEdit(entry);
                              }}>
                              <Icon as={FaEdit} boxSize={3} />
                            </StandardButton>
                            <StandardButton
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              isLoading={isDeleting}
                              aria-label={intl.formatMessage({
                                id: 'parcel.fieldHistory.deleteEntry',
                                defaultMessage: 'Delete entry'
                              })}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDelete(entry.id);
                              }}>
                              <Icon as={FaTrash} boxSize={3} />
                            </StandardButton>
                          </HStack>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </VStack>
      </StandardCard>
    </Box>
  );
};

export default FieldHistorySection;
