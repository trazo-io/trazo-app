/**
 * CDFA State Organic Program producer-registration card (CA Food & Ag Code
 * §§ 46000-46029). Self-contained: loads the establishment's registration, lets the
 * grower create/update it, and reports certifier-relevant currency. Mounted in OSPView.
 */
import React, { useEffect, useState } from 'react';
import { Badge, HStack, Icon, SimpleGrid, useToast, VStack } from '@chakra-ui/react';
import { FaLeaf } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  useCreateStateOrganicRegistrationMutation,
  useGetStateOrganicRegistrationsQuery,
  useUpdateStateOrganicRegistrationMutation
} from 'store/api/stateOrganicRegistrationApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

/**
 * States that run a USDA-approved State Organic Program under 7 CFR 205.620.
 * California (CDFA) is the only one today — a one-entry map is the honest state
 * of the world, and adding another is a one-line change. OSPView uses this to
 * decide whether to render the card at all.
 */
export const STATE_ORGANIC_PROGRAMS: Record<string, string> = {
  CA: 'CDFA State Organic Program'
};

/** Whether a farm's state runs a State Organic Program. An UNKNOWN state answers true, so a
    farm with no state on file is never silently excluded; only a known state outside the
    table (e.g. "OR") is. */
export function hasStateOrganicProgram(state: string | null | undefined): boolean {
  const code = (state || '').trim().toUpperCase();
  return !code || !!STATE_ORGANIC_PROGRAMS[code];
}

interface Props {
  companyId: string;
  farmId: string;
  /** Canonical 2-letter code of the farm's state. Required — the card previously
      defaulted to 'CA' and stored that for out-of-state operations. */
  state: string;
}

const EMPTY = {
  operation_type: 'producer',
  status: 'registered',
  registration_number: '',
  county: '',
  commodities: '',
  prior_year_organic_gross_sales: '',
  registration_date: '',
  renewal_date: ''
};

const StateOrganicRegistrationCard: React.FC<Props> = ({ companyId, farmId, state }) => {
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
      // Comes from the farm, not the form — a registration must never be filed
      // under a state the operation is not actually in.
      state,
      program_name: STATE_ORGANIC_PROGRAMS[state],
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
          defaultMessage: 'State Organic Program registration saved'
        })
      });
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.cdfa.toast.errorTitle',
          defaultMessage: 'Could not save registration'
        }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' })
      });
    }
  };

  return (
    <StandardCard
      mb={4}
      // Header through the component's own slots instead of a hand-rolled HStack: this card
      // rendered its title as `<Text fontWeight="bold" fontSize="lg">`, one of four different
      // treatments across this page's ten cards, and left the page with no <h3> anywhere.
      titleIcon={<Icon as={FaLeaf} color="green.700" />}
      title={intl.formatMessage({
        id: 'osp.cdfa.title',
        defaultMessage: 'State Organic Program Registration (CDFA)'
      })}
      subtitle={intl.formatMessage({
        id: 'osp.cdfa.description',
        defaultMessage:
          'California producers selling more than $5,000/yr organic must register annually with the CDFA State Organic Program before their first organic sale (CA Food & Ag Code §§ 46000-46029). Distinct from CDFA OIM input-material registration.'
      })}
      headerAction={
        existing ? (
          // `variant`, not `colorScheme`. Both work — the `brand` variant reads
          // `paletteOf(props)`, so colorScheme is live, not inert — but the variants carry the
          // MEANING (`warning` is the in-progress token used across the app) while a colorScheme
          // only names a hue. A registration that is not current is a thing to act on.
          <Badge variant={existing.is_current ? 'brand' : 'warning'}>
            {existing.is_current
              ? intl.formatMessage({ id: 'osp.cdfa.badge.current', defaultMessage: 'Current' })
              : intl.formatMessage({ id: 'osp.cdfa.badge.review', defaultMessage: 'Review' })}
          </Badge>
        ) : undefined
      }>
      <VStack align="stretch" spacing={3}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          <StandardField
            label={intl.formatMessage({
              id: 'osp.cdfa.operationType',
              defaultMessage: 'Operation Type'
            })}>
            <StandardSelect
              value={form.operation_type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                set('operation_type', e.target.value)
              }>
              <option value="producer">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.producer',
                  defaultMessage: 'Producer / Grower'
                })}
              </option>
              <option value="handler">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.handler',
                  defaultMessage: 'Handler (CDFA raw-ag handling)'
                })}
              </option>
              <option value="producer_handler">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.producerHandler',
                  defaultMessage: 'Producer & Handler'
                })}
              </option>
              <option value="retailer">
                {intl.formatMessage({
                  id: 'osp.cdfa.operationType.retailer',
                  defaultMessage: 'Retailer'
                })}
              </option>
            </StandardSelect>
          </StandardField>
          <StandardField
            label={intl.formatMessage({ id: 'osp.cdfa.status', defaultMessage: 'Status' })}>
            <StandardSelect
              value={form.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('status', e.target.value)}>
              <option value="registered">
                {intl.formatMessage({
                  id: 'osp.cdfa.status.registered',
                  defaultMessage: 'Registered'
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
                  defaultMessage: 'Registered, exempt from certification (under $5,000 organic sales)'
                })}
              </option>
            </StandardSelect>
          </StandardField>
          <StandardField
            label={intl.formatMessage({
              id: 'osp.cdfa.registrationNumber',
              defaultMessage: 'Registration Number'
            })}>
            <StandardInput
              value={form.registration_number}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set('registration_number', e.target.value)
              }
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.registrationNumberPlaceholder',
                defaultMessage: 'e.g., TUL-2026-0042'
              })}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({ id: 'osp.cdfa.county', defaultMessage: 'County' })}>
            <StandardInput
              value={form.county}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('county', e.target.value)}
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.countyPlaceholder',
                defaultMessage: 'e.g., Tulare'
              })}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({
              id: 'osp.cdfa.priorYearSales',
              defaultMessage: 'Prior-Year Organic Gross Sales (USD)'
            })}>
            <StandardInput
              type="number"
              min={0}
              value={form.prior_year_organic_gross_sales}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set('prior_year_organic_gross_sales', e.target.value)
              }
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.priorYearSalesPlaceholder',
                defaultMessage: 'e.g., 125000'
              })}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({
              id: 'osp.cdfa.commodities',
              defaultMessage: 'Commodities (comma-separated)'
            })}>
            <StandardInput
              value={form.commodities}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set('commodities', e.target.value)
              }
              placeholder={intl.formatMessage({
                id: 'osp.cdfa.commoditiesPlaceholder',
                defaultMessage: 'e.g., Navel orange, Lemon'
              })}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({
              id: 'osp.cdfa.registrationDate',
              defaultMessage: 'Registration Date'
            })}>
            <StandardInput
              type="date"
              value={form.registration_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set('registration_date', e.target.value)
              }
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({
              id: 'osp.cdfa.renewalDate',
              defaultMessage: 'Renewal Date'
            })}>
            <StandardInput
              type="date"
              value={form.renewal_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set('renewal_date', e.target.value)
              }
            />
          </StandardField>
        </SimpleGrid>

        <HStack justify="flex-end">
          <StandardButton size="sm" onClick={handleSave} isLoading={creating || updating}>
            {existing
              ? intl.formatMessage({
                  id: 'osp.cdfa.update',
                  defaultMessage: 'Update Registration'
                })
              : intl.formatMessage({ id: 'osp.cdfa.save', defaultMessage: 'Save Registration' })}
          </StandardButton>
        </HStack>
      </VStack>
    </StandardCard>
  );
};

export default StateOrganicRegistrationCard;
