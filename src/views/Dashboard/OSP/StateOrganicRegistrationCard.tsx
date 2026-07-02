/**
 * CDFA State Organic Program producer-registration card (CA Food & Ag Code
 * §§ 46000-46029). Self-contained: loads the establishment's registration, lets the
 * grower create/update it, and reports certifier-relevant currency. Mounted in OSPView.
 */
import React, { useEffect, useState } from 'react';
import {
  Badge,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Select,
  SimpleGrid,
  Text,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaLeaf } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import {
  useCreateStateOrganicRegistrationMutation,
  useGetStateOrganicRegistrationsQuery,
  useUpdateStateOrganicRegistrationMutation
} from 'store/api/stateOrganicRegistrationApi';

interface Props {
  companyId: string;
  farmId: string;
}

const EMPTY = {
  state: 'CA',
  operation_type: 'producer',
  status: 'registered',
  registration_number: '',
  county: '',
  commodities: '',
  prior_year_organic_gross_sales: '',
  registration_date: '',
  renewal_date: ''
};

const StateOrganicRegistrationCard: React.FC<Props> = ({ companyId, farmId }) => {
  const intl = useIntl();
  const toast = useToast();
  const { data: regs } = useGetStateOrganicRegistrationsQuery({ companyId, farmId });
  const [createReg, { isLoading: creating }] = useCreateStateOrganicRegistrationMutation();
  const [updateReg, { isLoading: updating }] = useUpdateStateOrganicRegistrationMutation();

  const existing = regs && regs.length > 0 ? regs[0] : undefined;
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => {
    if (existing) {
      setForm({
        state: existing.state || 'CA',
        operation_type: existing.operation_type || 'producer',
        status: existing.status || 'registered',
        registration_number: existing.registration_number || '',
        county: existing.county || '',
        commodities: (existing.commodities || []).join(', '),
        prior_year_organic_gross_sales:
          existing.prior_year_organic_gross_sales != null
            ? String(existing.prior_year_organic_gross_sales)
            : '',
        registration_date: existing.registration_date || '',
        renewal_date: existing.renewal_date || ''
      });
    }
  }, [existing]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    const data: Record<string, unknown> = {
      state: form.state,
      operation_type: form.operation_type,
      status: form.status,
      registration_number: form.registration_number || null,
      county: form.county || null,
      commodities: form.commodities
        ? form.commodities
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : [],
      prior_year_organic_gross_sales: form.prior_year_organic_gross_sales || null,
      registration_date: form.registration_date || null,
      renewal_date: form.renewal_date || null
    };
    try {
      if (existing) {
        await updateReg({ companyId, farmId, regId: existing.id, data }).unwrap();
      } else {
        await createReg({
          companyId,
          farmId,
          data: { ...data, establishment: Number(farmId) }
        }).unwrap();
      }
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.cdfa.toast.saved',
          defaultMessage: 'State Organic Program registration saved',
        }),
      });
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.cdfa.toast.errorTitle',
          defaultMessage: 'Could not save registration',
        }),
        description: String((err as { data?: unknown })?.data || err)
      });
    }
  };

  return (
    <StandardCard mb={4}>
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={FaLeaf} color="orange.600" />
            <Text fontWeight="bold" fontSize="lg">
              {intl.formatMessage({
                id: 'osp.cdfa.title',
                defaultMessage: 'State Organic Program Registration (CDFA)',
              })}
            </Text>
          </HStack>
          {existing && (
            <Badge colorScheme={existing.is_current ? 'green' : 'orange'}>
              {existing.is_current
                ? intl.formatMessage({ id: 'osp.cdfa.badge.current', defaultMessage: 'Current' })
                : intl.formatMessage({ id: 'osp.cdfa.badge.review', defaultMessage: 'Review' })}
            </Badge>
          )}
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {intl.formatMessage({
            id: 'osp.cdfa.description',
            defaultMessage:
              'California producers selling more than $5,000/yr organic must register annually with the CDFA State Organic Program before their first organic sale (CA Food & Ag Code §§ 46000-46029). Distinct from CDFA OIM input-material registration.',
          })}
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({
                id: 'osp.cdfa.operationType',
                defaultMessage: 'Operation Type',
              })}
            </FormLabel>
            <Select
              value={form.operation_type}
              onChange={(e) => set('operation_type', e.target.value)}
            >
              <option value="producer">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.producer',
                  defaultMessage: 'Producer / Grower',
                })}
              </option>
              <option value="handler">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.handler',
                  defaultMessage: 'Handler (CDFA raw-ag handling)',
                })}
              </option>
              <option value="producer_handler">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.producerHandler',
                  defaultMessage: 'Producer & Handler',
                })}
              </option>
              <option value="retailer">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.retailer',
                  defaultMessage: 'Retailer',
                })}
              </option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({ id: 'osp.cdfa.status', defaultMessage: 'Status' })}
            </FormLabel>
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="registered">
                {intl.formatMessage({
                  id: 'osp.cdfa.status.registered',
                  defaultMessage: 'Registered',
                })}
              </option>
              <option value="pending">
                {intl.formatMessage({ id: 'osp.cdfa.status.pending', defaultMessage: 'Pending' })}
              </option>
              <option value="expired">
                {intl.formatMessage({ id: 'osp.cdfa.status.expired', defaultMessage: 'Expired' })}
              </option>
              <option value="exempt">
                {intl.formatMessage({
                  id: 'osp.cdfa.status.exempt',
                  defaultMessage: 'Exempt (< $5,000 organic sales)',
                })}
              </option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({
                id: 'osp.cdfa.registrationNumber',
                defaultMessage: 'Registration Number',
              })}
            </FormLabel>
            <Input
              value={form.registration_number}
              onChange={(e) => set('registration_number', e.target.value)}
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.registrationNumberPlaceholder',
                defaultMessage: 'e.g., TUL-2026-0042',
              })}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({ id: 'osp.cdfa.county', defaultMessage: 'County' })}
            </FormLabel>
            <Input
              value={form.county}
              onChange={(e) => set('county', e.target.value)}
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.countyPlaceholder',
                defaultMessage: 'e.g., Tulare',
              })}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({
                id: 'osp.cdfa.priorYearSales',
                defaultMessage: 'Prior-Year Organic Gross Sales (USD)',
              })}
            </FormLabel>
            <Input
              type="number"
              min={0}
              value={form.prior_year_organic_gross_sales}
              onChange={(e) => set('prior_year_organic_gross_sales', e.target.value)}
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.priorYearSalesPlaceholder',
                defaultMessage: 'e.g., 125000',
              })}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({
                id: 'osp.cdfa.commodities',
                defaultMessage: 'Commodities (comma-separated)',
              })}
            </FormLabel>
            <Input
              value={form.commodities}
              onChange={(e) => set('commodities', e.target.value)}
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.commoditiesPlaceholder',
                defaultMessage: 'e.g., Navel orange, Lemon',
              })}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({
                id: 'osp.cdfa.registrationDate',
                defaultMessage: 'Registration Date',
              })}
            </FormLabel>
            <Input
              type="date"
              value={form.registration_date}
              onChange={(e) => set('registration_date', e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">
              {intl.formatMessage({
                id: 'osp.cdfa.renewalDate',
                defaultMessage: 'Renewal Date',
              })}
            </FormLabel>
            <Input
              type="date"
              value={form.renewal_date}
              onChange={(e) => set('renewal_date', e.target.value)}
            />
          </FormControl>
        </SimpleGrid>

        <HStack justify="flex-end">
          <StandardButton size="sm" onClick={handleSave} isLoading={creating || updating}>
            {existing
              ? intl.formatMessage({
                  id: 'osp.cdfa.update',
                  defaultMessage: 'Update Registration',
                })
              : intl.formatMessage({ id: 'osp.cdfa.save', defaultMessage: 'Save Registration' })}
          </StandardButton>
        </HStack>
      </VStack>
    </StandardCard>
  );
};

export default StateOrganicRegistrationCard;
