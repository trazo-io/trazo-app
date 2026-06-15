import React, { useRef, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Select,
  Checkbox,
  Icon,
  IconButton,
  Tooltip,
  Divider,
  Button,
  useToast,
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { FaCheckCircle, FaFileInvoiceDollar, FaTrashAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import {
  useGetSalesRecordsQuery,
  useCreateSalesRecordMutation,
  useDeleteSalesRecordMutation
} from 'store/api/historyApi';

interface SalesRecord {
  id: number;
  sale_date: string;
  buyer_name: string;
  quantity: number | string;
  quantity_unit: string;
  invoice_number?: string | null;
  organic_on_invoice: boolean;
  created_at?: string;
}

interface SalesRecordsSectionProps {
  /** Production public UUID (History.public_id) */
  productionId: string;
  canWrite: boolean;
}

const UNIT_CHOICES = [
  { value: 'kg', labelId: 'sales.records.unit.kg' },
  { value: 'lb', labelId: 'sales.records.unit.lb' },
  { value: 'tonnes', labelId: 'sales.records.unit.tonnes' },
  { value: 'boxes', labelId: 'sales.records.unit.boxes' }
];

const EMPTY_FORM = {
  sale_date: '',
  buyer_name: '',
  quantity: '',
  quantity_unit: 'kg',
  invoice_number: '',
  organic_on_invoice: true
};

const formatDisplayDate = (value?: string): string => {
  if (!value) return '';
  return value.slice(0, 10);
};

export function SalesRecordsSection({ productionId, canWrite }: SalesRecordsSectionProps) {
  const intl = useIntl();
  const toast = useToast();
  const labelFg = useColorModeValue('gray.500', 'gray.400');
  const rowBg = useColorModeValue('gray.50', 'gray.700');

  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  const { data: records = [] } = useGetSalesRecordsQuery(
    { productionId },
    { skip: !productionId }
  );
  const [createSalesRecord, { isLoading: isCreating }] = useCreateSalesRecordMutation();
  const [deleteSalesRecord, { isLoading: isDeleting }] = useDeleteSalesRecordMutation();

  const canSave =
    Boolean(formData.sale_date) &&
    formData.buyer_name.trim().length > 0 &&
    Number(formData.quantity) > 0 &&
    Boolean(formData.quantity_unit);

  const handleCreate = async () => {
    try {
      const payload: Record<string, unknown> = {
        production_id: productionId,
        sale_date: formData.sale_date,
        buyer_name: formData.buyer_name.trim(),
        quantity: Number(formData.quantity),
        quantity_unit: formData.quantity_unit,
        organic_on_invoice: formData.organic_on_invoice
      };
      if (formData.invoice_number.trim()) {
        payload.invoice_number = formData.invoice_number.trim();
      }
      await createSalesRecord(payload).unwrap();
      setFormData({ ...EMPTY_FORM });
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.created' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.error' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleDelete = async () => {
    if (pendingDeleteId === null) return;
    try {
      await deleteSalesRecord({ recordId: pendingDeleteId, productionId }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.deleted' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'sales.records.toast.error' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <StandardCard
      title={intl.formatMessage({ id: 'sales.records.title' })}
      variant="elevated"
      padding={{ base: 3, md: 4 }}
    >
      <VStack spacing={3} align="stretch">
        <Text fontSize="xs" color={labelFg}>
          {intl.formatMessage({ id: 'sales.records.subtitle' })}
        </Text>

        {/* Existing records */}
        {records.length > 0 ? (
          <VStack spacing={2} align="stretch">
            {records.map((record: SalesRecord) => (
              <HStack
                key={record.id}
                p={{ base: 2, md: 3 }}
                bg={rowBg}
                borderRadius="md"
                justify="space-between"
                align="flex-start"
                spacing={2}
              >
                <Box minW={0}>
                  <HStack spacing={2} flexWrap="wrap">
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                      {record.buyer_name}
                    </Text>
                    {record.organic_on_invoice && (
                      <Tooltip
                        hasArrow
                        fontSize="xs"
                        label={intl.formatMessage({ id: 'sales.records.organicTooltip' })}
                      >
                        <Box as="span" display="inline-flex">
                          <Icon as={FaCheckCircle} color="green.500" boxSize={3.5} />
                        </Box>
                      </Tooltip>
                    )}
                  </HStack>
                  <HStack spacing={3} flexWrap="wrap" mt={0.5}>
                    <Text fontSize="xs" color={labelFg}>
                      {formatDisplayDate(record.sale_date)}
                    </Text>
                    <Text fontSize="xs" color={labelFg}>
                      {record.quantity} {record.quantity_unit}
                    </Text>
                    {record.invoice_number && (
                      <HStack spacing={1}>
                        <Icon as={FaFileInvoiceDollar} color={labelFg} boxSize={3} />
                        <Text fontSize="xs" color={labelFg} noOfLines={1}>
                          {intl.formatMessage(
                            { id: 'sales.records.display.invoice' },
                            { number: record.invoice_number }
                          )}
                        </Text>
                      </HStack>
                    )}
                  </HStack>
                </Box>
                {canWrite && (
                  <IconButton
                    aria-label={intl.formatMessage({ id: 'sales.records.action.delete' })}
                    icon={<FaTrashAlt />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => setPendingDeleteId(record.id)}
                  />
                )}
              </HStack>
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color={labelFg} textAlign="center" py={2}>
            {intl.formatMessage({ id: 'sales.records.empty' })}
          </Text>
        )}

        {/* Inline "Record a sale" form */}
        {canWrite && (
          <>
            <Divider />
            <Text fontSize="sm" fontWeight="semibold">
              {intl.formatMessage({ id: 'sales.records.addTitle' })}
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.records.field.date' })}
                </FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.records.field.buyer' })}
                </FormLabel>
                <Input
                  size="sm"
                  value={formData.buyer_name}
                  onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                  placeholder={intl.formatMessage({
                    id: 'sales.records.field.buyer.placeholder'
                  })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.records.field.quantity' })}
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.records.field.unit' })}
                </FormLabel>
                <Select
                  size="sm"
                  value={formData.quantity_unit}
                  onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value })}
                >
                  {UNIT_CHOICES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {intl.formatMessage({ id: u.labelId })}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.records.field.invoice' })}
                </FormLabel>
                <Input
                  size="sm"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                />
              </FormControl>
            </SimpleGrid>
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <Checkbox
                size="sm"
                colorScheme="green"
                isChecked={formData.organic_on_invoice}
                onChange={(e) =>
                  setFormData({ ...formData, organic_on_invoice: e.target.checked })
                }
              >
                <Text fontSize="xs">
                  {intl.formatMessage({ id: 'sales.records.field.organicOnInvoice' })}
                </Text>
              </Checkbox>
              <StandardButton
                size="sm"
                onClick={handleCreate}
                isLoading={isCreating}
                isDisabled={!canSave}
              >
                {intl.formatMessage({ id: 'sales.records.action.save' })}
              </StandardButton>
            </HStack>
          </>
        )}
      </VStack>

      {/* Delete confirmation */}
      <AlertDialog
        isOpen={pendingDeleteId !== null}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => setPendingDeleteId(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="md" fontWeight="bold">
              {intl.formatMessage({ id: 'sales.records.deleteConfirm.title' })}
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              {intl.formatMessage({ id: 'sales.records.deleteConfirm.body' })}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelDeleteRef}
                variant="ghost"
                size="sm"
                onClick={() => setPendingDeleteId(null)}
              >
                {intl.formatMessage({ id: 'sales.records.deleteConfirm.cancel' })}
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                onClick={handleDelete}
                isLoading={isDeleting}
                ml={2}
              >
                {intl.formatMessage({ id: 'sales.records.deleteConfirm.confirm' })}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </StandardCard>
  );
}

export default SalesRecordsSection;
