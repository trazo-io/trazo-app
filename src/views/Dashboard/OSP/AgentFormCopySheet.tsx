/**
 * What to copy onto the certifying agent's own renewal form: every line of it, in the form's order.
 *
 * The renewal packet's 02s page routes every question of the agent's form, but it is written for
 * the reviewer and it sits inside the ZIP. The grower fills the agent's form themselves, often on
 * the agent's website, and needs the same facts step by step: a value Trazo holds to copy, a value
 * Trazo can hold but does not have yet (filled in right here, once), or plainly that the question is
 * theirs. The form's own instructions are repeated as notes, so nothing on it is only on it.
 *
 * Same red line as the plan (§ 205.201(a), the producer is the author): nothing here ticks a box,
 * answers an election or reads as Trazo having filed anything. A "yours" or "note" row carries no
 * value. Every status chip is the same neutral grey: the chips say who answers, not how well.
 *
 * Renders nothing for an agent Trazo has no copy sheet for (the server answers 404).
 */
import React, { useState } from 'react';
import { Badge, Box, Divider, HStack, Link, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { formatDateOnly } from 'utils/dateOnly';
import { apiErrorMessage } from 'utils/apiErrorMessage';

import {
  StandardButton,
  StandardCard,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import { useUserRole } from 'hooks/useUserRole';
import { useEditFarmMutation, useUpdateCompanyMutation } from 'store/api/companyApi';
import { AgentFormSheetRow, useGetAgentFormSheetQuery } from 'store/api/ospApi';

interface Props {
  companyId: string;
  farmId: string;
  ospId: number;
}

type Msg = { id: string; defaultMessage: string };

const ITEM_LABELS: Record<string, Msg> = {
  renewal_deadline: {
    id: 'osp.agentSheet.item.renewal_deadline',
    defaultMessage: 'Renewal deadline'
  },
  submit_with_fees: {
    id: 'osp.agentSheet.item.submit_with_fees',
    defaultMessage: 'Send it with your fees'
  },
  business_name: {
    id: 'osp.agentSheet.item.business_name',
    defaultMessage: 'Registered business name'
  },
  client_id: { id: 'osp.agentSheet.item.client_id', defaultMessage: 'Client ID' },
  dba: { id: 'osp.agentSheet.item.dba', defaultMessage: 'DBA' },
  contact_name: { id: 'osp.agentSheet.item.contact_name', defaultMessage: 'Primary contact' },
  contact_email: { id: 'osp.agentSheet.item.contact_email', defaultMessage: 'Email' },
  contact_phone: { id: 'osp.agentSheet.item.contact_phone', defaultMessage: 'Phone' },
  public_email: { id: 'osp.agentSheet.item.public_email', defaultMessage: 'Public email' },
  public_phone: { id: 'osp.agentSheet.item.public_phone', defaultMessage: 'Public phone' },
  contact_change_form: {
    id: 'osp.agentSheet.item.contact_change_form',
    defaultMessage: 'Contact Change form'
  },
  continue_or_withdraw: {
    id: 'osp.agentSheet.item.continue_or_withdraw',
    defaultMessage: 'Continue or withdraw'
  },
  services: { id: 'osp.agentSheet.item.services', defaultMessage: 'Services to renew' },
  international_addendum: {
    id: 'osp.agentSheet.item.international_addendum',
    defaultMessage: 'International Programs Addendum'
  },
  scopes: { id: 'osp.agentSheet.item.scopes', defaultMessage: 'Scopes' },
  production_partners: {
    id: 'osp.agentSheet.item.production_partners',
    defaultMessage: 'Production partnership'
  },
  osp_changes: { id: 'osp.agentSheet.item.osp_changes', defaultMessage: 'OSP updates and changes' },
  notices_sent: {
    id: 'osp.agentSheet.item.notices_sent',
    defaultMessage: 'Changes already sent to the agent'
  },
  new_land: { id: 'osp.agentSheet.item.new_land', defaultMessage: 'New land' },
  submit_changes_early: {
    id: 'osp.agentSheet.item.submit_changes_early',
    defaultMessage: 'Changes during the year'
  },
  attest_true: {
    id: 'osp.agentSheet.item.attest_true',
    defaultMessage: '(1) The information is true'
  },
  authority_to_bind: {
    id: 'osp.agentSheet.item.authority_to_bind',
    defaultMessage: '(2) Authority to sign for the operation'
  },
  agent_manuals: {
    id: 'osp.agentSheet.item.agent_manuals',
    defaultMessage: "(3) The agent's manuals"
  },
  standards_and_policies: {
    id: 'osp.agentSheet.item.standards_and_policies',
    defaultMessage: "(4) Standards and the agent's policies"
  },
  terms_and_conditions: {
    id: 'osp.agentSheet.item.terms_and_conditions',
    defaultMessage: '(5) The agreement and its Terms & Conditions'
  },
  electronic_signature: {
    id: 'osp.agentSheet.item.electronic_signature',
    defaultMessage: 'Electronic signature consent'
  },
  signature: { id: 'osp.agentSheet.item.signature', defaultMessage: 'Signature, date and title' },
  gross_sales: { id: 'osp.agentSheet.item.gross_sales', defaultMessage: 'Gross sales' },
  sales_period: { id: 'osp.agentSheet.item.sales_period', defaultMessage: 'Sales period' },
  payment: { id: 'osp.agentSheet.item.payment', defaultMessage: 'Payment' },
  billing_contact: { id: 'osp.agentSheet.item.billing_contact', defaultMessage: 'Billing contact' },
  comments: { id: 'osp.agentSheet.item.comments', defaultMessage: 'Comments' }
};

const STEP_TITLES: Record<string, Msg> = {
  '0': { id: 'osp.agentSheet.step.before', defaultMessage: 'Before you file' }
};

const KIND_CHIPS: Record<AgentFormSheetRow['kind'], Msg> = {
  value: { id: 'osp.agentSheet.kind.value', defaultMessage: 'From Trazo' },
  not_recorded: { id: 'osp.agentSheet.kind.not_recorded', defaultMessage: 'Not recorded' },
  not_in_trazo: { id: 'osp.agentSheet.kind.not_in_trazo', defaultMessage: 'Not in Trazo' },
  yours: { id: 'osp.agentSheet.kind.yours', defaultMessage: 'Yours to answer' },
  note: { id: 'osp.agentSheet.kind.note', defaultMessage: 'From the form' }
};

/** The commitments of Step 5, in the form's own words, shortened. */
const STATEMENTS: Record<string, Msg> = {
  attest_true: {
    id: 'osp.agentSheet.detail.attest_true',
    defaultMessage: 'You attest that what you send is true to the best of your knowledge.'
  },
  authority_to_bind: {
    id: 'osp.agentSheet.detail.authority_to_bind',
    defaultMessage: 'You confirm you may sign for the operation.'
  },
  agent_manuals: {
    id: 'osp.agentSheet.detail.agent_manuals',
    defaultMessage:
      "You agree to the agent's current manuals: standards, procedures, fees and policies."
  },
  standards_and_policies: {
    id: 'osp.agentSheet.detail.standards_and_policies',
    defaultMessage: "You will keep operating to the applicable standards and the agent's policies."
  },
  terms_and_conditions: {
    id: 'osp.agentSheet.detail.terms_and_conditions',
    defaultMessage:
      "You agree to the agent's agreement, including its Terms & Conditions. Read them before you sign."
  },
  electronic_signature: {
    id: 'osp.agentSheet.detail.electronic_signature',
    defaultMessage: 'Tick the box only if you agree to sign with the agent electronically.'
  }
};

interface EditTarget {
  target: 'establishment' | 'company';
  field: string;
  agent?: string;
  /** A closed set the server accepts (an agent's renewal dates): offered as a choice, never typed. */
  options?: string[];
}

/** Fill a value Trazo can hold, once, from the sheet. Saved to the farm or company record. */
const InlineEdit: React.FC<{
  edit: EditTarget;
  companyId: string;
  farmId: string;
  initial?: string;
  /** Words an option for the choice list; the stored value is sent as is. */
  optionLabel?: (value: string) => string;
}> = ({ edit, companyId, farmId, initial = '', optionLabel = (v) => v }) => {
  const intl = useIntl();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [editFarm, { isLoading: savingFarm }] = useEditFarmMutation();
  const [updateCompany, { isLoading: savingCompany }] = useUpdateCompanyMutation();

  const save = async () => {
    const value = draft.trim();
    try {
      if (edit.target === 'company') {
        await updateCompany({ companyId, companyData: { [edit.field]: value } }).unwrap();
      } else {
        // A Client ID or a renewal date is kept with the agent that issued it.
        const extra = edit.agent ? { [`${edit.field}_agent`]: edit.agent } : {};
        await editFarm({
          companyId,
          farmId,
          establishmentData: { [edit.field]: value, ...extra }
        }).unwrap();
      }
      setOpen(false);
    } catch (err) {
      toast({
        status: 'error',
        title:
          apiErrorMessage(err) ||
          intl.formatMessage({
            id: 'osp.agentSheet.edit.failed',
            defaultMessage: 'It could not be saved. Try again.'
          }),
        isClosable: true
      });
    }
  };

  if (!open)
    return (
      <StandardButton size="sm" variant="outline" mt={2} onClick={() => setOpen(true)}>
        {initial
          ? intl.formatMessage({ id: 'osp.agentSheet.edit.change', defaultMessage: 'Change' })
          : intl.formatMessage({
              id: 'osp.agentSheet.edit.add',
              defaultMessage: 'Add it to Trazo'
            })}
      </StandardButton>
    );
  const label = intl.formatMessage({ id: 'osp.agentSheet.edit.label', defaultMessage: 'Value' });
  return (
    <HStack mt={2} spacing={2} align="flex-start">
      {edit.options ? (
        <StandardSelect
          size="sm"
          value={draft}
          aria-label={label}
          placeholder={intl.formatMessage({
            id: 'osp.agentSheet.edit.choose',
            defaultMessage: 'Choose'
          })}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDraft(e.target.value)}>
          {edit.options.map((option) => (
            <option key={option} value={option}>
              {optionLabel(option)}
            </option>
          ))}
        </StandardSelect>
      ) : (
        <StandardInput
          size="sm"
          value={draft}
          aria-label={label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        />
      )}
      <StandardButton
        size="sm"
        onClick={save}
        isLoading={savingFarm || savingCompany}
        isDisabled={!draft.trim()}>
        {intl.formatMessage({ id: 'osp.agentSheet.edit.save', defaultMessage: 'Save' })}
      </StandardButton>
    </HStack>
  );
};

const AgentFormCopySheet: React.FC<Props> = ({ companyId, farmId, ospId }) => {
  const intl = useIntl();
  const { canWrite, canManageCompany } = useUserRole();
  const { data: sheet, isError } = useGetAgentFormSheetQuery(
    { companyId, farmId, ospId },
    { skip: !companyId || !farmId }
  );
  if (isError || !sheet) return null;

  const agent = sheet.agent_name;
  const date = (value: unknown) => formatDateOnly(String(value || ''), intl.locale) || '';
  const list = (items: unknown) => (Array.isArray(items) ? items.map(String).join(', ') : '');
  const money = (value: unknown) =>
    intl.formatNumber(Number(value), { style: 'currency', currency: 'USD' });
  const rowValue = (item: string) =>
    String(sheet.rows.find((r) => r.item === item && r.kind === 'value')?.value ?? '');
  const ext = (href: unknown, label: React.ReactNode) =>
    href ? (
      <Link href={String(href)} isExternal color="green.700">
        {label}
      </Link>
    ) : null;
  /** "01-01" as the locale says a month and day ("January 1", "1 de enero"). */
  const monthDay = (md: string) =>
    intl.formatDate(new Date(`2000-${md}T00:00:00Z`), {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  const yoursLine = intl.formatMessage({
    id: 'osp.agentSheet.detail.yours',
    defaultMessage: 'Answer it on the form.'
  });

  /** The line under a row's label: the value to copy, or what the operator needs to know. */
  const detail = (row: AgentFormSheetRow): React.ReactNode => {
    const e = row.extra || {};
    if (STATEMENTS[row.item]) return intl.formatMessage(STATEMENTS[row.item]);
    switch (row.item) {
      case 'renewal_deadline': {
        if (row.kind === 'value')
          return intl.formatMessage(
            {
              id: 'osp.agentSheet.detail.renewal_date_value',
              defaultMessage:
                '{agent} assigned your operation a {date} renewal date. The form and your fees are due before it, and it sets the 12 months of sales Step 6 asks for.'
            },
            { agent, date: monthDay(String(row.value)) }
          );
        const dates = (Array.isArray(e.renewal_dates) ? e.renewal_dates : [])
          .map((md: string) => monthDay(md))
          .join(' / ');
        return intl.formatMessage(
          {
            id: 'osp.agentSheet.detail.renewal_deadline',
            defaultMessage:
              "{agent} assigns each operation one renewal date ({dates}), whatever the date of your last inspection. Yours is on the agent's letters; the form and your fees are due before it."
          },
          { agent, dates }
        );
      }
      case 'submit_with_fees':
        return (
          <>
            {intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.submit_with_fees',
                defaultMessage:
                  "Send the completed form and your certification fees together: online, by email to {email}, or by mail to {mail}. The fee is set by the agent's fee schedule."
              },
              { email: String(e.email || ''), mail: String(e.mail || '') }
            )}{' '}
            {ext(
              e.online_url,
              intl.formatMessage({
                id: 'osp.agentSheet.link.online',
                defaultMessage: 'File online'
              })
            )}{' '}
            ·{' '}
            {ext(
              intl.locale.startsWith('es') && e.fee_schedule_url_es
                ? e.fee_schedule_url_es
                : e.fee_schedule_url,
              intl.formatMessage({ id: 'osp.agentSheet.link.fees', defaultMessage: 'Fee schedule' })
            )}
          </>
        );
      case 'client_id':
        return row.kind === 'value'
          ? String(row.value)
          : intl.formatMessage({
              id: 'osp.agentSheet.detail.client_id_missing',
              defaultMessage:
                "Not recorded yet. It is on your certificate and the agent's letters, and it is not your certificate number. Add it once and Trazo keeps it for next year."
            });
      case 'contact_name':
        if (row.kind !== 'value') break;
        return row.source === 'plan_author'
          ? intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.contact_plan_author',
                defaultMessage:
                  "{name} (the plan's author: no responsible person is named for the farm yet)"
              },
              { name: String(row.value) }
            )
          : String(row.value);
      case 'public_email':
      case 'public_phone': {
        const above = rowValue(row.item === 'public_email' ? 'contact_email' : 'contact_phone');
        return above
          ? intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.public_same',
                defaultMessage:
                  'Listed publicly by the agent. Tick "Same as above" only if it should be {value}.'
              },
              { value: above }
            )
          : intl.formatMessage({
              id: 'osp.agentSheet.detail.public',
              defaultMessage: 'Listed publicly by the agent. Answer it on the form.'
            });
      }
      case 'contact_change_form':
        return [
          intl.formatMessage({
            id: 'osp.agentSheet.detail.contact_change_form',
            defaultMessage:
              "If another contact changes, or the primary contact was not listed with the agent before, attach the agent's Contact Change form."
          }),
          e.application_info_changes
            ? intl.formatMessage({
                id: 'osp.agentSheet.detail.contact_change_likely',
                defaultMessage:
                  'Your annual update lists changes to the application information, so this likely applies.'
              })
            : ''
        ]
          .filter(Boolean)
          .join(' ');
      case 'international_addendum':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.international_addendum',
          defaultMessage:
            'Renewing EU or Mexico (LPO) services, or operating in Mexico, also needs the International Programs Addendum.'
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
      case 'notices_sent': {
        const notices = (row.value as { date: string; category_label: string }[]) || [];
        const since = e.since ? date(e.since) : '';
        if (!notices.length)
          return intl.formatMessage(
            {
              id: 'osp.agentSheet.detail.notices_none',
              defaultMessage:
                'No change notice is recorded as sent{since, select, none {} other { since {since}}}.'
            },
            { since: since || 'none' }
          );
        return (
          <VStack align="stretch" spacing={1}>
            <Text>
              {intl.formatMessage({
                id: 'osp.agentSheet.detail.notices_list',
                defaultMessage:
                  'Recorded as sent to the agent. If the agent already has every change, the form\'s first option ("already provided") fits.'
              })}
            </Text>
            {notices.map((n, i) => (
              <Text key={`${n.date}-${i}`}>
                {date(n.date)}: {n.category_label}
              </Text>
            ))}
          </VStack>
        );
      }
      case 'new_land': {
        const parts: string[] = [];
        // No second plan version this year, so there is no date to count from (review of back #218).
        if (e.reason)
          parts.push(
            intl.formatMessage({
              id: 'osp.agentSheet.detail.land_not_compared',
              defaultMessage:
                "New land is checked once this year's update creates a new plan version. Until then, list any land you added since your last renewal on the form yourself."
            })
          );
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
      case 'submit_changes_early':
        return (
          <>
            {intl.formatMessage({
              id: 'osp.agentSheet.detail.submit_changes_early',
              defaultMessage:
                'The agent asks for changes to your plan when they happen, not at the inspection. You can review the plan as the agent holds it in its portal.'
            })}{' '}
            {ext(
              e.osp_portal_url,
              intl.formatMessage({
                id: 'osp.agentSheet.link.portal',
                defaultMessage: "The agent's portal"
              })
            )}
          </>
        );
      case 'signature': {
        if (row.kind === 'value') {
          const v = row.value as { name: string; title: string };
          return intl.formatMessage(
            {
              id: 'osp.agentSheet.detail.signature_value',
              defaultMessage:
                "As signed on your annual update in Trazo: {name}{title, select, none {} other {, {title}}}. Date it the day you sign the agent's form; that signature is given there, not in Trazo."
            },
            { name: v.name, title: v.title || 'none' }
          );
        }
        return intl.formatMessage(
          {
            id: 'osp.agentSheet.detail.signature_authorized',
            defaultMessage:
              "Signed and dated on the agent's form by someone authorized to sign for the operation{name, select, none {} other {, usually the responsible person ({name})}}."
          },
          { name: String(e.suggested_name || 'none') }
        );
      }
      case 'gross_sales': {
        if (e.reason === 'no_filing')
          return intl.formatMessage({
            id: 'osp.agentSheet.detail.sales_no_filing',
            defaultMessage: "Start this year's annual update to get a figure."
          });
        // No figure while no period is set: the agent asks for its own 12 months (2026-11-04).
        if (e.reason === 'period_not_stated')
          return e.published_start
            ? intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.sales_set_published',
                  defaultMessage:
                    "Set the sales period on your annual update above first. For a {date} renewal, {agent}'s fee schedule asks for sales from {start} to {end}."
                },
                {
                  agent,
                  date: monthDay(String(e.renewal_date)),
                  start: date(e.published_start),
                  end: date(e.published_end)
                }
              )
            : intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.sales_set_period',
                  defaultMessage:
                    'Set the sales period on your annual update above first. {agent} asks for its own 12 months: October to September for a January 1 renewal, the calendar year for an April 1 renewal. Record your renewal date above to see yours.'
                },
                { agent }
              );
        // The calendar-year fallback can still be running (a January cohort renews in November).
        if (e.reason === 'period_not_over')
          return intl.formatMessage(
            {
              id: 'osp.agentSheet.detail.sales_not_over',
              defaultMessage:
                'Calendar {year} is not over yet, so there is no figure to copy. Set the 12 months your agent asks for on your annual update above.'
            },
            { year: String(e.period_start).slice(0, 4) }
          );
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
            id: 'osp.agentSheet.detail.sales_scope_petition',
            defaultMessage:
              'A starting point, not the fee figure: {agent} asks for sales of everything on your certificate, including what you did not sell as organic. Leaving those out of the fee takes a written petition to the agent.'
          },
          { agent }
        )}`;
      }
      case 'sales_period': {
        const published = e.published_start
          ? intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.sales_period_published',
                defaultMessage:
                  "For a {date} renewal, {agent}'s fee schedule asks for {start} to {end}."
              },
              {
                agent,
                date: monthDay(String(e.renewal_date)),
                start: date(e.published_start),
                end: date(e.published_end)
              }
            )
          : '';
        if (row.kind === 'value') {
          const v = row.value as { start: string; end: string };
          const stated = intl.formatMessage(
            { id: 'osp.agentSheet.detail.sales_period', defaultMessage: '{start} to {end}' },
            { start: date(v.start), end: date(v.end) }
          );
          // A stated period other than the agent's own is shown beside it, never corrected.
          return published && (v.start !== e.published_start || v.end !== e.published_end)
            ? `${stated}. ${published}`
            : stated;
        }
        return [
          intl.formatMessage({
            id: 'osp.agentSheet.detail.sales_period_missing',
            defaultMessage:
              'Not set. Set the 12 months your agent asks for on your annual update above, the same months each year.'
          }),
          published
        ]
          .filter(Boolean)
          .join(' ');
      }
      case 'payment':
        return (
          <>
            {intl.formatMessage({
              id: 'osp.agentSheet.detail.payment',
              defaultMessage:
                "Pay by the agent's fee schedule, or contact the agent to arrange a payment plan."
            })}{' '}
            {ext(
              intl.locale.startsWith('es') && e.fee_schedule_url_es
                ? e.fee_schedule_url_es
                : e.fee_schedule_url,
              intl.formatMessage({ id: 'osp.agentSheet.link.fees', defaultMessage: 'Fee schedule' })
            )}
          </>
        );
      case 'billing_contact': {
        const name = rowValue('contact_name');
        return name
          ? intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.billing_same',
                defaultMessage:
                  'Tick "same as the primary contact" if invoices go to {name}; otherwise name the billing contact.'
              },
              { name }
            )
          : yoursLine;
      }
      case 'dba':
        return row.kind === 'value'
          ? String(row.value)
          : intl.formatMessage({
              id: 'osp.agentSheet.detail.dba_none',
              defaultMessage:
                'None recorded. The form asks for one only if the operation trades under another name; otherwise leave it blank.'
            });
      case 'continue_or_withdraw':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.continue',
          defaultMessage:
            'Answer it on the form. Ticking "continue" also states that your sales information is included and that you have paid your fees or arranged a payment plan.'
        });
      case 'services':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.services',
          defaultMessage:
            'Answer it on the form: USDA NOP, plus any other programme you sell under (for example US-Canada equivalency for Canadian buyers). Each box checked may add a fee.'
        });
      case 'production_partners':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.production_partners',
          defaultMessage:
            "Answer it on the form. It applies only if at least 75% of your certified sales go to one certified company that pays your fees, as the agent's fee schedule defines it."
        });
      case 'comments':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.comments',
          defaultMessage: 'Anything else you want the agent to know. Optional.'
        });
      default:
        break;
    }
    if (row.kind === 'value') return String(row.value);
    if (row.kind === 'not_recorded')
      return intl.formatMessage({
        id: 'osp.agentSheet.detail.not_recorded',
        defaultMessage: 'Not recorded in Trazo.'
      });
    return yoursLine;
  };

  const canEdit = (edit: EditTarget) => (edit.target === 'company' ? canManageCompany : canWrite);
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
              { agent }
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
            )}{' '}
            {ext(
              sheet.form.url,
              intl.formatMessage({
                id: 'osp.agentSheet.formLink',
                defaultMessage: "The agent's form"
              })
            )}
          </Text>
        </Box>
        {steps.map((step) => (
          <Box key={step}>
            <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
              {STEP_TITLES[step]
                ? intl.formatMessage(STEP_TITLES[step])
                : intl.formatMessage(
                    { id: 'osp.agentSheet.step', defaultMessage: 'Step {n}' },
                    { n: step }
                  )}
            </Text>
            <VStack align="stretch" spacing={3} divider={<Divider />}>
              {sheet.rows
                .filter((r) => r.step === step)
                .map((row) => {
                  const edit = (row.extra || {}).edit as EditTarget | undefined;
                  return (
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
                      {edit &&
                      canEdit(edit) &&
                      (row.kind === 'not_recorded' || (row.kind === 'value' && edit.options)) ? (
                        <InlineEdit
                          edit={edit}
                          companyId={companyId}
                          farmId={farmId}
                          initial={row.kind === 'value' ? String(row.value) : ''}
                          optionLabel={monthDay}
                        />
                      ) : null}
                    </Box>
                  );
                })}
            </VStack>
          </Box>
        ))}
      </VStack>
    </StandardCard>
  );
};

export default AgentFormCopySheet;
