import React, { useState } from 'react';
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
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  Input,
  useToast
} from '@chakra-ui/react';
import { FaHistory, FaPlus, FaTrash, FaInfoCircle, FaEdit } from 'react-icons/fa';
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import {
  useGetParcelCropHistoryQuery,
  useCreateParcelCropHistoryMutation,
  useDeleteParcelCropHistoryMutation,
  useUpdateParcelCropHistoryMutation
} from 'store/api/productApi';

interface ParcelCropHistoryEntry {
  id: number;
  parcel: number;
  year: number;
  crop_grown: string;
  production_method: string;
  substances_applied: string;
  date_last_prohibited: string | null;
  notes: string;
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
  { value: 'fallow', label: 'Fallow' }
];

const METHOD_COLORS: Record<string, string> = {
  organic: 'green',
  transitional: 'orange',
  regenerative: 'teal',
  fallow: 'gray',
  conventional: 'blue'
};

const currentYear = new Date().getFullYear();

const emptyForm = {
  year: currentYear - 1,
  crop_grown: '',
  production_method: '',
  substances_applied: '',
  notes: ''
};

const FieldHistorySection: React.FC<FieldHistorySectionProps> = ({ parcelId, canWrite }) => {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: historyEntries = [], isLoading } = useGetParcelCropHistoryQuery(parcelId, {
    skip: !parcelId
  });

  const [createEntry, { isLoading: isCreating }] = useCreateParcelCropHistoryMutation();
  const [updateEntry, { isLoading: isUpdating }] = useUpdateParcelCropHistoryMutation();
  const [deleteEntry, { isLoading: isDeleting }] = useDeleteParcelCropHistoryMutation();

  const entries = historyEntries as ParcelCropHistoryEntry[];
  const existingYears = entries.map((e) => e.year);
  const isSaving = isCreating || isUpdating;

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
      production_method: entry.production_method || '',
      substances_applied: entry.substances_applied || '',
      notes: entry.notes || ''
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
      toast({ title: 'Crop name is required.', status: 'warning', duration: 3000 });
      return;
    }
    if (!form.production_method) {
      toast({ title: 'Please select a production method.', status: 'warning', duration: 3000 });
      return;
    }

    if (editingId) {
      // Update existing
      try {
        await updateEntry({ id: editingId, ...form }).unwrap();
        toast({ title: 'Entry updated.', status: 'success', duration: 3000 });
        closeForm();
      } catch (error: any) {
        const detail =
          error?.data?.non_field_errors?.[0] || error?.data?.detail || 'Failed to update entry.';
        toast({ title: detail, status: 'error', duration: 4000 });
      }
    } else {
      // Create new — check duplicate year
      if (existingYears.includes(form.year)) {
        toast({
          title: `Year ${form.year} already has an entry for this parcel.`,
          description: 'Each parcel can have one entry per year. Choose a different year.',
          status: 'warning',
          duration: 5000
        });
        return;
      }
      try {
        await createEntry({ ...form, parcel: parcelId }).unwrap();
        toast({ title: 'Field history entry added.', status: 'success', duration: 3000 });
        closeForm();
      } catch (error: any) {
        const detail =
          error?.data?.non_field_errors?.[0] || error?.data?.detail || 'Failed to save entry.';
        toast({ title: detail, status: 'error', duration: 4000 });
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEntry(id).unwrap();
      toast({ title: 'Entry removed.', status: 'success', duration: 3000 });
      if (editingId === id) closeForm();
    } catch {
      toast({ title: 'Failed to delete entry.', status: 'error', duration: 4000 });
    }
  };

  const headerAction = canWrite ? (
    <StandardButton
      size="sm"
      variant="outline"
      leftIcon={<Icon as={FaPlus} />}
      onClick={openCreate}
    >
      Add Year
    </StandardButton>
  ) : undefined;

  return (
    <Box data-tour="field-history" w="full">
      <StandardCard
        title={
          <HStack spacing={2}>
            <Icon as={FaHistory} color="green.500" boxSize={4} />
            <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'md' }}>
              Field History
            </Text>
            <Badge
              colorScheme="orange"
              variant="subtle"
              px={2}
              py={0.5}
              borderRadius="full"
              fontSize="xs"
              display={{ base: 'none', smd: 'inline-flex' }}
            >
              <HStack spacing={1}>
                <Icon as={FaInfoCircle} boxSize={2.5} />
                <Text>Required: 7 CFR 205.202</Text>
              </HStack>
            </Badge>
          </HStack>
        }
        variant="elevated"
        padding={{ base: 3, md: 4 }}
        headerAction={headerAction}
      >
        <VStack spacing={4} align="stretch">
          {/* Inline add/edit form */}
          {showForm && (
            <Box
              p={{ base: 3, md: 4 }}
              bg="green.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="green.200"
            >
              <Text fontSize="xs" fontWeight="bold" color="green.600" mb={2}>
                {editingId ? 'EDITING ENTRY' : 'NEW ENTRY'}
              </Text>
              <VStack spacing={3} align="stretch">
                <HStack spacing={3} flexWrap="wrap">
                  <Box minW="90px" flex="0 0 auto">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      YEAR
                    </Text>
                    <NumberInput
                      min={1900}
                      max={currentYear}
                      value={form.year}
                      onChange={(val) => setForm((f) => ({ ...f, year: Number(val) }))}
                      size="sm"
                    >
                      <NumberInputField borderRadius="md" />
                    </NumberInput>
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      CROP GROWN
                    </Text>
                    <Input
                      size="sm"
                      borderRadius="md"
                      placeholder="e.g. Avocado"
                      value={form.crop_grown}
                      onChange={(e) => setForm((f) => ({ ...f, crop_grown: e.target.value }))}
                    />
                  </Box>
                  <Box flex={1} minW="140px">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                      METHOD
                    </Text>
                    <Select
                      size="sm"
                      borderRadius="md"
                      value={form.production_method}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, production_method: e.target.value }))
                      }
                      placeholder="Select method"
                    >
                      {PRODUCTION_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </Box>
                </HStack>
                <Box>
                  <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                    SUBSTANCES APPLIED
                  </Text>
                  <Textarea
                    size="sm"
                    borderRadius="md"
                    rows={2}
                    placeholder="All inputs applied this year (fertilizers, pesticides, amendments, cover crops)"
                    value={form.substances_applied}
                    onChange={(e) => setForm((f) => ({ ...f, substances_applied: e.target.value }))}
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                    NOTES (optional)
                  </Text>
                  <Textarea
                    size="sm"
                    borderRadius="md"
                    rows={2}
                    placeholder="Additional notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </Box>
                <HStack spacing={2} justify="flex-end">
                  <StandardButton size="sm" variant="ghost" onClick={closeForm}>
                    Cancel
                  </StandardButton>
                  <StandardButton size="sm" isLoading={isSaving} onClick={handleSave}>
                    {editingId ? 'Update' : 'Save'}
                  </StandardButton>
                </HStack>
              </VStack>
            </Box>
          )}

          {/* Table or empty state */}
          {isLoading ? (
            <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
              Loading field history...
            </Text>
          ) : entries.length === 0 ? (
            <Box
              p={{ base: 4, md: 6 }}
              textAlign="center"
              bg="gray.50"
              borderRadius="lg"
              border="1px dashed"
              borderColor="gray.300"
            >
              <Icon as={FaHistory} boxSize={8} color="gray.300" mb={2} />
              <Text fontSize="sm" color="gray.500">
                No field history recorded. Add crop rotation data for your organic audit.
              </Text>
            </Box>
          ) : (
            <TableContainer>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th fontSize="xs">Year</Th>
                    <Th fontSize="xs">Crop</Th>
                    <Th fontSize="xs" display={{ base: 'none', md: 'table-cell' }}>
                      Method
                    </Th>
                    <Th fontSize="xs" display={{ base: 'none', md: 'table-cell' }}>
                      Substances Applied
                    </Th>
                    <Th fontSize="xs" display={{ base: 'none', lg: 'table-cell' }}>
                      Notes
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
                      onClick={() => canWrite && openEdit(entry)}
                    >
                      <Td
                        fontSize={{ base: 'xs', md: 'sm' }}
                        fontWeight="semibold"
                        color="gray.800"
                      >
                        {entry.year}
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }} color="gray.700">
                        {entry.crop_grown}
                      </Td>
                      <Td
                        fontSize={{ base: 'xs', md: 'sm' }}
                        display={{ base: 'none', md: 'table-cell' }}
                      >
                        <Badge
                          colorScheme={METHOD_COLORS[entry.production_method] || 'blue'}
                          variant="subtle"
                          fontSize="xs"
                          px={2}
                          borderRadius="full"
                        >
                          {PRODUCTION_METHODS.find((m) => m.value === entry.production_method)
                            ?.label ?? entry.production_method}
                        </Badge>
                      </Td>
                      <Td
                        fontSize="xs"
                        color="gray.600"
                        display={{ base: 'none', md: 'table-cell' }}
                        maxW="180px"
                        isTruncated
                      >
                        {entry.substances_applied || '—'}
                      </Td>
                      <Td
                        fontSize="xs"
                        color="gray.600"
                        display={{ base: 'none', lg: 'table-cell' }}
                        maxW="200px"
                        isTruncated
                      >
                        {entry.notes || '—'}
                      </Td>
                      {canWrite && (
                        <Td isNumeric>
                          <HStack spacing={1} justify="flex-end">
                            <StandardButton
                              size="xs"
                              variant="ghost"
                              aria-label="Edit entry"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                openEdit(entry);
                              }}
                            >
                              <Icon as={FaEdit} boxSize={3} />
                            </StandardButton>
                            <StandardButton
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              isLoading={isDeleting}
                              aria-label="Delete entry"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDelete(entry.id);
                              }}
                            >
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
