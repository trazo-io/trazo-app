/**
 * What to copy onto the certifying agent's own renewal form, in the form's order.
 *
 * The renewal packet's 02s page routes every question of the agent's form, but it is written for
 * the reviewer and it sits inside the ZIP. The grower fills the agent's form themselves, often on
 * the agent's website, and needs the same facts step by step: a value Trazo holds to copy, or
 * plainly that the question is theirs.
 *
 * Same red line as the plan (§ 205.201(a), the producer is the author): nothing here ticks a box,
 * answers an election or reads as Trazo having filed anything. A "yours" row carries no value.
 * Every status chip is the same neutral grey: the chips say who answers, not how well.
 *
 * Renders nothing for an agent Trazo has no copy sheet for (the server answers 404).
 */
import React from 'react';
import { Badge, Box, Divider, HStack, Link, Text, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { formatDateOnly } from 'utils/dateOnly';

import { StandardCard } from 'components/Design/StandardComponents';
import { AgentFormSheetRow, useGetAgentFormSheetQuery } from 'store/api/ospApi';

interface Props {
  companyId: string;
  farmId: string;
  ospId: number;
}

const ITEM_LABELS: Record<string, { id: string; defaultMessage: string }> = {
  business_name: {
    id: 'osp.agentSheet.item.business_name',
    defaultMessage: 'Registered business name'
  },
  dba: { id: 'osp.agentSheet.item.dba', defaultMessage: 'DBA' },
  client_id: { id: 'osp.agentSheet.item.client_id', defaultMessage: 'Client ID' },
  contact_name: { id: 'osp.agentSheet.item.contact_name', defaultMessage: 'Primary contact' },
  contact_email: { id: 'osp.agentSheet.item.contact_email', defaultMessage: 'Email' },
  contact_phone: { id: 'osp.agentSheet.item.contact_phone', defaultMessage: 'Phone' },
  public_contact: {
    id: 'osp.agentSheet.item.public_contact',
    defaultMessage: 'Public email and phone'
  },
  continue_or_withdraw: {
    id: 'osp.agentSheet.item.continue_or_withdraw',
    defaultMessage: 'Continue or withdraw'
  },
  services: { id: 'osp.agentSheet.item.services', defaultMessage: 'Services to renew' },
  scopes: { id: 'osp.agentSheet.item.scopes', defaultMessage: 'Scopes' },
  production_partners: {
    id: 'osp.agentSheet.item.production_partners',
    defaultMessage: 'Production partnership'
  },
  osp_changes: { id: 'osp.agentSheet.item.osp_changes', defaultMessage: 'OSP updates and changes' },
  new_land: { id: 'osp.agentSheet.item.new_land', defaultMessage: 'New land' },
  agreement_and_signature: {
    id: 'osp.agentSheet.item.agreement_and_signature',
    defaultMessage: 'Agreement and signature'
  },
  gross_sales: { id: 'osp.agentSheet.item.gross_sales', defaultMessage: 'Gross sales' },
  payment: { id: 'osp.agentSheet.item.payment', defaultMessage: 'Payment' },
  billing_contact: { id: 'osp.agentSheet.item.billing_contact', defaultMessage: 'Billing contact' }
};

const KIND_CHIPS: Record<AgentFormSheetRow['kind'], { id: string; defaultMessage: string }> = {
  value: { id: 'osp.agentSheet.kind.value', defaultMessage: 'From Trazo' },
  not_recorded: { id: 'osp.agentSheet.kind.not_recorded', defaultMessage: 'Not recorded' },
  not_in_trazo: { id: 'osp.agentSheet.kind.not_in_trazo', defaultMessage: 'Not in Trazo' },
  yours: { id: 'osp.agentSheet.kind.yours', defaultMessage: 'Yours to answer' }
};

const AgentFormCopySheet: React.FC<Props> = ({ companyId, farmId, ospId }) => {
  const intl = useIntl();
  const { data: sheet, isError } = useGetAgentFormSheetQuery(
    { companyId, farmId, ospId },
    { skip: !companyId || !farmId }
  );
  if (isError || !sheet) return null;

  const date = (value: unknown) => formatDateOnly(String(value || ''), intl.locale) || '';
  const list = (items: unknown) => (Array.isArray(items) ? items.map(String).join(', ') : '');
  const money = (value: unknown) =>
    intl.formatNumber(Number(value), { style: 'currency', currency: 'USD' });

  /** The line under a row's label: the value to copy, or what the operator needs to know. */
  const detail = (row: AgentFormSheetRow): React.ReactNode => {
    const e = row.extra || {};
    switch (row.item) {
      case 'client_id':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.client_id',
          defaultMessage:
            "Trazo does not keep it. It is on your certificate and the agent's letters, and it is not your certificate number."
        });
      case 'scopes':
        return row.kind === 'value'
          ? (row.value as { label: Record<string, string> }[])
              .map((s) => s.label[intl.locale.slice(0, 2)] || s.label.en)
              .join(', ')
          : intl.formatMessage({
              id: 'osp.agentSheet.detail.scopes_missing',
              defaultMessage: 'Not answered yet on your operation profile.'
            });
      case 'osp_changes': {
        if (row.kind === 'yours') {
          const state = String(e.state || 'no_filing');
          if (state === 'no_new_version')
            return intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.changes_no_new_version',
                defaultMessage:
                  "This year's update kept plan v{prior} without a new version, so there is nothing to compare. Choose the option on the form that fits."
              },
              { prior: e.prior_version as number }
            );
          if (state === 'newer_version')
            return intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.changes_newer_version',
                defaultMessage:
                  "This year's update moves to plan v{next}. Open that version to see what changed."
              },
              { next: e.new_version as number }
            );
          return intl.formatMessage({
            id: 'osp.agentSheet.detail.changes_no_filing',
            defaultMessage: "Start this year's annual update to see which sections changed."
          });
        }
        const sections = (row.value as { label: string; files: string[] }[]) || [];
        if (!sections.length)
          return intl.formatMessage(
            {
              id: 'osp.agentSheet.detail.changes_none',
              defaultMessage: 'No answers differ between plan v{prior} and v{next}.'
            },
            { prior: e.prior_version as number, next: e.new_version as number }
          );
        return (
          <VStack align="stretch" spacing={1}>
            <Text>
              {intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.changes_list',
                  defaultMessage:
                    "Answers changed between plan v{prior} and v{next} in these sections. If these are your updates, list them on the form and attach the agent's own forms for them."
                },
                { prior: e.prior_version as number, next: e.new_version as number }
              )}
            </Text>
            {sections.map((s) => (
              <Text key={s.label} fontWeight="semibold">
                {s.label}
              </Text>
            ))}
          </VStack>
        );
      }
      case 'new_land': {
        const parts: string[] = [];
        if (e.since)
          parts.push(
            row.kind === 'value'
              ? intl.formatMessage(
                  {
                    id: 'osp.agentSheet.detail.land_begun',
                    defaultMessage:
                      "Parcels you started managing on or after {since}: {names}. New land needs the agent's review before inspection."
                  },
                  { since: date(e.since), names: list(row.value) }
                )
              : intl.formatMessage(
                  {
                    id: 'osp.agentSheet.detail.land_none',
                    defaultMessage: 'No parcel states a management start on or after {since}.'
                  },
                  { since: date(e.since) }
                )
          );
        if (Array.isArray(e.unstated) && e.unstated.length)
          parts.push(
            intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.land_unstated',
                defaultMessage: 'Start date not stated: {names}.'
              },
              { names: list(e.unstated) }
            )
          );
        parts.push(
          intl.formatMessage({
            id: 'osp.agentSheet.detail.land_edits',
            defaultMessage: 'Changes to parcels already on your plan are not compared here.'
          })
        );
        return parts.join(' ');
      }
      case 'gross_sales': {
        if (e.reason === 'no_filing')
          return intl.formatMessage({
            id: 'osp.agentSheet.detail.sales_no_filing',
            defaultMessage: "Start this year's annual update to get a figure."
          });
        const period = e.period_stated
          ? intl.formatMessage(
              { id: 'osp.agentSheet.detail.sales_period', defaultMessage: '{start} to {end}' },
              { start: date(e.period_start), end: date(e.period_end) }
            )
          : intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.sales_calendar',
                defaultMessage:
                  'calendar {year} (no sales period is set on your annual update; set the 12 months your agent asks for)'
              },
              { year: String(e.period_start).slice(0, 4) }
            );
        const head =
          row.kind === 'value'
            ? intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.sales_value',
                  defaultMessage:
                    '{amount} from {count, plural, one {# sale} other {# sales}} invoiced as organic, {period}.'
                },
                { amount: money(row.value), count: e.n_sales as number, period }
              )
            : Number(e.n_unpriced) > 0
            ? intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.sales_unpriced',
                  defaultMessage:
                    '{count, plural, one {# sale in {period} has} other {# sales in {period} have}} no amount recorded, so no figure is given.'
                },
                { count: e.n_unpriced as number, period }
              )
            : intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.sales_none',
                  defaultMessage: 'No sale invoiced as organic is recorded for {period}.'
                },
                { period }
              );
        return `${head} ${intl.formatMessage(
          {
            id: 'osp.agentSheet.detail.sales_scope',
            defaultMessage:
              'A starting point, not the fee figure: {agent} asks for sales of everything on your certificate, including what you did not sell as organic.'
          },
          { agent: sheet.agent_name }
        )}`;
      }
      case 'agreement_and_signature':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.agreement',
          defaultMessage:
            "You sign the agent's agreement on their form. Signing your annual update in Trazo is not that signature."
        });
      default:
        if (row.kind === 'value') return String(row.value);
        if (row.kind === 'not_recorded')
          return intl.formatMessage({
            id: 'osp.agentSheet.detail.not_recorded',
            defaultMessage: 'Not recorded in Trazo.'
          });
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.yours',
          defaultMessage: 'Answer it on the form.'
        });
    }
  };

  const steps = Array.from(new Set(sheet.rows.map((r) => r.step)));

  return (
    <StandardCard>
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold">
            {intl.formatMessage(
              {
                id: 'osp.agentSheet.title',
                defaultMessage: "{agent}'s renewal form: what to copy"
              },
              { agent: sheet.agent_name }
            )}
          </Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            {intl.formatMessage(
              {
                id: 'osp.agentSheet.intro',
                defaultMessage:
                  'You fill in and sign {form} ({revision}) yourself, with the agent. Step by step: what Trazo holds for you to copy, and what only you can answer. Nothing here is filed for you.'
              },
              { form: sheet.form.document_id || sheet.form.title, revision: sheet.form.revision }
            )}
            {sheet.form.url ? (
              <>
                {' '}
                <Link href={sheet.form.url} isExternal color="green.700">
                  {intl.formatMessage({
                    id: 'osp.agentSheet.formLink',
                    defaultMessage: "The agent's form"
                  })}
                </Link>
              </>
            ) : null}
          </Text>
        </Box>
        {steps.map((step) => (
          <Box key={step}>
            <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
              {intl.formatMessage(
                { id: 'osp.agentSheet.step', defaultMessage: 'Step {n}' },
                { n: step }
              )}
            </Text>
            <VStack align="stretch" spacing={3} divider={<Divider />}>
              {sheet.rows
                .filter((r) => r.step === step)
                .map((row) => (
                  <Box key={row.item} data-testid={`agent-sheet-${row.item}`}>
                    <HStack justify="space-between" align="flex-start" spacing={3}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {intl.formatMessage(
                          ITEM_LABELS[row.item] || { id: row.item, defaultMessage: row.item }
                        )}
                      </Text>
                      <Badge colorScheme="gray" variant="subtle" flexShrink={0}>
                        {intl.formatMessage(KIND_CHIPS[row.kind])}
                      </Badge>
                    </HStack>
                    <Box fontSize="sm" color="gray.800" mt={1} userSelect="text">
                      {detail(row)}
                    </Box>
                  </Box>
                ))}
            </VStack>
          </Box>
        ))}
      </VStack>
    </StandardCard>
  );
};

export default AgentFormCopySheet;
