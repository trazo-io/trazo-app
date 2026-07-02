import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Badge,
  Switch,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  Alert,
  AlertIcon,
  Collapse,
  useDisclosure,
  useColorModeValue,
  Tooltip
} from '@chakra-ui/react';
import { FaTruck, FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import { useUpdateProductionMutation } from 'store/api/historyApi';

interface SalesDeliverySectionProps {
  historyId: string;
  historyData: {
    finish_date?: string;
    sold_to?: string;
    sale_date?: string;
    quantity_sold?: number;
    quantity_sold_unit?: string;
    box_weight_lb?: number | null;
    organic_on_invoice?: boolean;
    transport_method?: string;
    destination?: string;
    transport_vehicle_id?: string;
    transport_affidavit_on_file?: boolean;
    retention_until?: string;
  };
  canWrite: boolean;
}

// Units where per-box weight is meaningful for NOP § 205.103(b)(2) mass-balance
// reconciliation. When any of these is selected, the box_weight_lb input becomes
// visible so the farmer can supply the carton / crate / lug weight.
const BOX_UNITS = new Set(['boxes', 'crates', 'cartons', 'lugs']);

const UNIT_CHOICES = [
  { value: 'kg', labelId: 'sales.unit.kg' },
  { value: 'lb', labelId: 'sales.unit.lb' },
  { value: 'boxes', labelId: 'sales.unit.boxes' },
  { value: 'crates', labelId: 'sales.unit.crates' },
  { value: 'tons', labelId: 'sales.unit.tons' },
  { value: 'bushels', labelId: 'sales.unit.bushels' },
  { value: 'units', labelId: 'sales.unit.units' }
];

const formatDisplayDate = (value?: string): string => {
  if (!value) return '';
  return value.slice(0, 10);
};

export function SalesDeliverySection({
  historyId,
  historyData,
  canWrite
}: SalesDeliverySectionProps) {
  const intl = useIntl();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });
  const [isEditing, setIsEditing] = useState(false);
  const [updateProduction, { isLoading }] = useUpdateProductionMutation();
  const toast = useToast();

  const iconBg = useColorModeValue('blue.50', 'blue.900');
  const iconColor = useColorModeValue(
    'var(--chakra-colors-blue-500)',
    'var(--chakra-colors-blue-200)'
  );
  const labelFg = useColorModeValue('gray.500', 'gray.400');
  const footnoteFg = useColorModeValue('gray.500', 'gray.400');

  const [formData, setFormData] = useState<{
    sold_to: string;
    sale_date: string;
    quantity_sold: string;
    quantity_sold_unit: string;
    box_weight_lb: string;
    organic_on_invoice: boolean;
    transport_method: string;
    destination: string;
    transport_vehicle_id: string;
    transport_affidavit_on_file: boolean;
  }>({
    sold_to: historyData.sold_to ?? '',
    sale_date: formatDisplayDate(historyData.sale_date),
    quantity_sold:
      historyData.quantity_sold !== undefined && historyData.quantity_sold !== null
        ? String(historyData.quantity_sold)
        : '',
    quantity_sold_unit: historyData.quantity_sold_unit ?? '',
    box_weight_lb:
      historyData.box_weight_lb !== undefined && historyData.box_weight_lb !== null
        ? String(historyData.box_weight_lb)
        : '',
    organic_on_invoice: historyData.organic_on_invoice ?? false,
    transport_method: historyData.transport_method ?? '',
    destination: historyData.destination ?? '',
    transport_vehicle_id: historyData.transport_vehicle_id ?? '',
    transport_affidavit_on_file: historyData.transport_affidavit_on_file ?? false
  });

  // Keep the form in sync with refreshed server data (RTK Query invalidation
  // after a successful save, or late-arriving initial fetch). Do not clobber
  // in-progress edits.
  useEffect(() => {
    if (isEditing) return;
    setFormData({
      sold_to: historyData.sold_to ?? '',
      sale_date: formatDisplayDate(historyData.sale_date),
      quantity_sold:
        historyData.quantity_sold !== undefined && historyData.quantity_sold !== null
          ? String(historyData.quantity_sold)
          : '',
      quantity_sold_unit: historyData.quantity_sold_unit ?? '',
      box_weight_lb:
        historyData.box_weight_lb !== undefined && historyData.box_weight_lb !== null
          ? String(historyData.box_weight_lb)
          : '',
      organic_on_invoice: historyData.organic_on_invoice ?? false,
      transport_method: historyData.transport_method ?? '',
      destination: historyData.destination ?? '',
      transport_vehicle_id: historyData.transport_vehicle_id ?? '',
      transport_affidavit_on_file: historyData.transport_affidavit_on_file ?? false
    });
  }, [
    historyData.sold_to,
    historyData.sale_date,
    historyData.quantity_sold,
    historyData.quantity_sold_unit,
    historyData.box_weight_lb,
    historyData.organic_on_invoice,
    historyData.transport_method,
    historyData.destination,
    historyData.transport_vehicle_id,
    historyData.transport_affidavit_on_file,
    isEditing
  ]);

  if (!historyData.finish_date) return null;

  const hasSalesData = historyData.sold_to || historyData.sale_date;

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = { historyId };
      if (formData.sold_to) payload.sold_to = formData.sold_to;
      if (formData.sale_date) payload.sale_date = formData.sale_date;
      if (formData.quantity_sold) payload.quantity_sold = Number(formData.quantity_sold);
      if (formData.quantity_sold_unit) payload.quantity_sold_unit = formData.quantity_sold_unit;
      payload.organic_on_invoice = formData.organic_on_invoice;
      if (formData.transport_method) payload.transport_method = formData.transport_method;
      if (formData.destination) payload.destination = formData.destination;
      if (formData.transport_vehicle_id)
        payload.transport_vehicle_id = formData.transport_vehicle_id;
      payload.transport_affidavit_on_file = formData.transport_affidavit_on_file;

      if (BOX_UNITS.has(formData.quantity_sold_unit) && formData.box_weight_lb) {
        payload.box_weight_lb = Number(formData.box_weight_lb);
      } else if (!BOX_UNITS.has(formData.quantity_sold_unit)) {
        // Clear stale box weight when the unit is no longer a box-type.
        payload.box_weight_lb = null;
      }

      await updateProduction(payload).unwrap();
      setIsEditing(false);
      toast({
        title: intl.formatMessage({ id: 'sales.toast.saved' }),
        status: 'success',
        duration: 3000
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'sales.toast.error' }),
        status: 'error',
        duration: 3000
      });
    }
  };

  return (
    <StandardCard variant="elevated" padding={{ base: 3, md: 4 }} title="">
      <HStack justify="space-between" cursor="pointer" onClick={onToggle} mb={isOpen ? 3 : 0}>
        <HStack spacing={2}>
          <Box p={2} borderRadius="lg" bg={iconBg}>
            <FaTruck color={iconColor} />
          </Box>
          <Box>
            <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'md' }}>
              {intl.formatMessage({ id: 'sales.title' })}
            </Text>
            <Text fontSize="xs" color={labelFg}>
              {intl.formatMessage({ id: 'sales.subtitle' })}
            </Text>
          </Box>
        </HStack>
        <HStack spacing={2}>
          {hasSalesData ? (
            <Badge colorScheme="green" fontSize="11px">
              {intl.formatMessage({ id: 'sales.badge.recorded' })}
            </Badge>
          ) : (
            <Badge colorScheme="yellow" fontSize="11px">
              {intl.formatMessage({ id: 'sales.badge.notRecorded' })}
            </Badge>
          )}
          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        </HStack>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Alert status="info" borderRadius="md" mb={4} fontSize="xs">
          <AlertIcon />
          <Text>{intl.formatMessage({ id: 'sales.info.postHarvest' })}</Text>
        </Alert>

        {isEditing ? (
          <VStack spacing={3} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.field.buyer' })}
                </FormLabel>
                <Input
                  size="sm"
                  value={formData.sold_to}
                  onChange={(e) => setFormData({ ...formData, sold_to: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'sales.field.buyer.placeholder' })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.field.saleDate' })}
                </FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.field.quantity' })}
                </FormLabel>
                <Input
                  size="sm"
                  type="number"
                  value={formData.quantity_sold}
                  onChange={(e) => setFormData({ ...formData, quantity_sold: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'sales.field.quantity.placeholder' })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.field.unit' })}
                </FormLabel>
                <Select
                  size="sm"
                  value={formData.quantity_sold_unit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity_sold_unit: e.target.value
                    })
                  }
                  placeholder={intl.formatMessage({ id: 'sales.field.unit.placeholder' })}
                >
                  {UNIT_CHOICES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {intl.formatMessage({ id: u.labelId })}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {BOX_UNITS.has(formData.quantity_sold_unit) && (
                <FormControl>
                  <FormLabel
                    fontSize="xs"
                    display="inline-flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Text as="span">Weight per box (lb)</Text>
                    <Tooltip
                      hasArrow
                      label="Used for NOP § 205.103(b)(2) mass-balance reconciliation (boxes shipped × lb/box vs. harvest yield in pounds). If left blank, Trazo falls back to the USDA-AMS crop-standard carton weight."
                      fontSize="xs"
                    >
                      <Box as="span" display="inline-flex" color={labelFg}>
                        <FaInfoCircle size={11} />
                      </Box>
                    </Tooltip>
                  </FormLabel>
                  <Input
                    size="sm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.box_weight_lb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        box_weight_lb: e.target.value
                      })
                    }
                    placeholder="e.g. 25 for avocado carton"
                  />
                </FormControl>
              )}
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.field.transport' })}
                </FormLabel>
                <Input
                  size="sm"
                  value={formData.transport_method}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transport_method: e.target.value
                    })
                  }
                  placeholder={intl.formatMessage({ id: 'sales.field.transport.placeholder' })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({ id: 'sales.field.destination' })}
                </FormLabel>
                <Input
                  size="sm"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'sales.field.destination.placeholder' })}
                />
              </FormControl>
              {/* Clean-transport record for off-farm transfer (CCOF G6.1 / 7 CFR 205.272) */}
              <FormControl>
                <FormLabel fontSize="xs">
                  {intl.formatMessage({
                    id: 'sales.field.transportVehicleId',
                    defaultMessage: 'Vehicle / Container ID'
                  })}
                </FormLabel>
                <Input
                  size="sm"
                  value={formData.transport_vehicle_id}
                  onChange={(e) =>
                    setFormData({ ...formData, transport_vehicle_id: e.target.value })
                  }
                  placeholder="e.g., TRK-9921"
                />
              </FormControl>
            </SimpleGrid>
            <FormControl display="flex" alignItems="center">
              <FormLabel
                fontSize="xs"
                mb={0}
                display="inline-flex"
                alignItems="center"
                gap={1}
              >
                <Text as="span">
                  {intl.formatMessage({ id: 'sales.field.organicOnInvoice' })}
                </Text>
                <Tooltip
                  hasArrow
                  label={intl.formatMessage({ id: 'sales.field.organicOnInvoice.tooltip' })}
                  fontSize="xs"
                >
                  <Box as="span" display="inline-flex" color={labelFg}>
                    <FaInfoCircle size={11} />
                  </Box>
                </Tooltip>
              </FormLabel>
              <Switch
                size="sm"
                isChecked={formData.organic_on_invoice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    organic_on_invoice: e.target.checked
                  })
                }
              />
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel fontSize="xs" mb={0}>
                {intl.formatMessage({
                  id: 'sales.field.transportAffidavitOnFile',
                  defaultMessage: 'Clean-transport affidavit on file'
                })}
              </FormLabel>
              <Switch
                size="sm"
                isChecked={formData.transport_affidavit_on_file}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    transport_affidavit_on_file: e.target.checked
                  })
                }
              />
            </FormControl>
            <HStack justify="flex-end" spacing={2}>
              <StandardButton size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                {intl.formatMessage({ id: 'sales.action.cancel' })}
              </StandardButton>
              <StandardButton size="sm" onClick={handleSave} isLoading={isLoading}>
                {intl.formatMessage({ id: 'sales.action.save' })}
              </StandardButton>
            </HStack>
          </VStack>
        ) : (
          <VStack spacing={2} align="stretch">
            {hasSalesData ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                {historyData.sold_to && (
                  <Box>
                    <Text fontSize="xs" color={labelFg} fontWeight="semibold">
                      {intl.formatMessage({ id: 'sales.display.buyer' })}
                    </Text>
                    <Text fontSize="sm">{historyData.sold_to}</Text>
                  </Box>
                )}
                {historyData.sale_date && (
                  <Box>
                    <Text fontSize="xs" color={labelFg} fontWeight="semibold">
                      {intl.formatMessage({ id: 'sales.display.saleDate' })}
                    </Text>
                    <Text fontSize="sm">{formatDisplayDate(historyData.sale_date)}</Text>
                  </Box>
                )}
                {historyData.quantity_sold && (
                  <Box>
                    <Text fontSize="xs" color={labelFg} fontWeight="semibold">
                      {intl.formatMessage({ id: 'sales.display.quantity' })}
                    </Text>
                    <Text fontSize="sm">
                      {historyData.quantity_sold} {historyData.quantity_sold_unit}
                      {historyData.box_weight_lb &&
                        historyData.quantity_sold_unit &&
                        BOX_UNITS.has(historyData.quantity_sold_unit) && (
                          <Text as="span" fontSize="xs" color={labelFg} ml={1}>
                            ({historyData.box_weight_lb} lb each)
                          </Text>
                        )}
                    </Text>
                  </Box>
                )}
                {historyData.destination && (
                  <Box>
                    <Text fontSize="xs" color={labelFg} fontWeight="semibold">
                      {intl.formatMessage({ id: 'sales.display.destination' })}
                    </Text>
                    <Text fontSize="sm">{historyData.destination}</Text>
                  </Box>
                )}
              </SimpleGrid>
            ) : (
              <Text fontSize="sm" color={labelFg} textAlign="center" py={2}>
                {intl.formatMessage({ id: 'sales.empty' })}
              </Text>
            )}
            {canWrite && (
              <StandardButton size="sm" variant="outline" onClick={() => setIsEditing(true)} mt={2}>
                {hasSalesData
                  ? intl.formatMessage({ id: 'sales.action.edit' })
                  : intl.formatMessage({ id: 'sales.action.add' })}
              </StandardButton>
            )}
            {historyData.retention_until && (
              <Text fontSize="xs" color={footnoteFg} mt={2} textAlign="center">
                {intl.formatMessage(
                  { id: 'sales.retention' },
                  { date: formatDisplayDate(historyData.retention_until) }
                )}
              </Text>
            )}
          </VStack>
        )}
      </Collapse>
    </StandardCard>
  );
}

export default SalesDeliverySection;
