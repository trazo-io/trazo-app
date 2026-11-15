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
import { activityMessageId } from 'config/facilityActivities';

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
  comments: { id: 'osp.agentSheet.item.comments', defaultMessage: 'Comments' },
  // CCOF: Annual Renewal Contract and Crop Update (ORGB88).
  ccof_due: { id: 'osp.agentSheet.item.ccof_due', defaultMessage: 'Due date' },
  ccof_changes_approved_first: {
    id: 'osp.agentSheet.item.ccof_changes_approved_first',
    defaultMessage: 'Changes to your plan'
  },
  ccof_continue_or_surrender: {
    id: 'osp.agentSheet.item.ccof_continue_or_surrender',
    defaultMessage: 'Continue or surrender'
  },
  ccof_osp_update: {
    id: 'osp.agentSheet.item.ccof_osp_update',
    defaultMessage: 'OSP update information'
  },
  operation_name: { id: 'osp.agentSheet.item.operation_name', defaultMessage: 'Operation name' },
  client_code: { id: 'osp.agentSheet.item.client_code', defaultMessage: 'Client Code' },
  submitter_name: { id: 'osp.agentSheet.item.submitter_name', defaultMessage: 'Name' },
  submitter_email: { id: 'osp.agentSheet.item.submitter_email', defaultMessage: 'Email' },
  surrender_date: {
    id: 'osp.agentSheet.item.surrender_date',
    defaultMessage: 'Date you no longer need certification'
  },
  surrender_reason: {
    id: 'osp.agentSheet.item.surrender_reason',
    defaultMessage: 'Reason for surrender'
  },
  ccof_terms: { id: 'osp.agentSheet.item.ccof_terms', defaultMessage: 'Terms 1 to 8' },
  ccof_accept_terms: {
    id: 'osp.agentSheet.item.ccof_accept_terms',
    defaultMessage: 'I accept the above terms'
  },
  ccof_new_certificates: {
    id: 'osp.agentSheet.item.ccof_new_certificates',
    defaultMessage: 'New certificates'
  },
  crop_update_when: {
    id: 'osp.agentSheet.item.crop_update_when',
    defaultMessage: 'When to file it'
  },
  crop_update_operation_name: {
    id: 'osp.agentSheet.item.operation_name',
    defaultMessage: 'Operation name'
  },
  crop_update_date: { id: 'osp.agentSheet.item.crop_update_date', defaultMessage: 'Date' },
  crop_update_parcels: {
    id: 'osp.agentSheet.item.crop_update_parcels',
    defaultMessage: 'Parcels, crops and acres'
  },
  // WSDA: Renewal Fee Form (AGR 2521, one row: the form is not reproduced) and Site Update
  // Information (AGR 2516).
  wsda_due: { id: 'osp.agentSheet.item.ccof_due', defaultMessage: 'Due date' },
  wsda_fee_form: {
    id: 'osp.agentSheet.item.wsda_fee_form',
    defaultMessage: 'The copy the agent sent'
  },
  site_changes: { id: 'osp.agentSheet.item.site_changes', defaultMessage: 'Sites and changes' },
  acreage_removed: {
    id: 'osp.agentSheet.item.acreage_removed',
    defaultMessage: 'Acreage leaving organic production'
  },
  // WSDA: Additional Facilities and Third-Parties (AGR 2519), one per facility.
  facilities_2519_when: {
    id: 'osp.agentSheet.item.facilities_2519_when',
    defaultMessage: 'When to file it'
  },
  facilities_2519: {
    id: 'osp.agentSheet.item.facilities_2519',
    defaultMessage: 'Facilities and third parties'
  },
  facilities_2519_comments: {
    id: 'osp.agentSheet.item.facilities_2519_comments',
    defaultMessage: 'Additional comments'
  },
  facilities_2519_exempt_note: {
    id: 'osp.agentSheet.item.facilities_2519_exempt_note',
    defaultMessage: 'Who must be certified'
  }
};

/** One facility's AGR 2519 as the copy sheet sends it (`agent_form_sheet._facility_2519`). */
interface Facility2519 {
  facility_id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  activities: string[];
  products_detail: string;
  crops: { crop: string; years: number[] }[];
  responsibility: 'certified_third_party' | 'uncertified_third_party';
  certificate: { number: string; certifier: string; copy_on_file: boolean } | null;
  exemption_basis: string;
  missing: string[];
  /** The AGR 2121 questions whose Yes puts it on the form: "K 1" (stores), "L 1" (handles). */
  basis?: string[];
}

/** Why a facility is on AGR 2519, by the plan's answer that puts it there (`_on_behalf`). */
const BASIS_2519: Record<string, Msg> = {
  'K 1': {
    id: 'osp.agentSheet.detail.facilities_2519_basis.k1',
    defaultMessage: 'another operation stores your crop while you own it (K 1)'
  },
  'L 1': {
    id: 'osp.agentSheet.detail.facilities_2519_basis.l1',
    defaultMessage: 'another operation handles your crop while you own it (L 1)'
  }
};

const STEP_TITLES: Record<string, Msg> = {
  '0': { id: 'osp.agentSheet.step.before', defaultMessage: 'Before you file' },
  details: { id: 'osp.agentSheet.step.details', defaultMessage: 'Your details' },
  terms: { id: 'osp.agentSheet.step.terms', defaultMessage: 'The contract terms' },
  orgb88: {
    id: 'osp.agentSheet.step.orgb88',
    defaultMessage: 'Crop Update (ORGB88), only if your crops change'
  },
  '2521': { id: 'osp.agentSheet.step.2521', defaultMessage: 'Renewal Fee Form (AGR 2521)' },
  '2516': {
    id: 'osp.agentSheet.step.2516',
    defaultMessage: 'Site Update Information (AGR 2516), only if a site changes'
  },
  '2519': {
    id: 'osp.agentSheet.step.2519',
    defaultMessage: 'Additional Facilities and Third-Parties (AGR 2519), one per facility'
  }
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
                '{agent} assigned your operation the renewal date {date}. The form and your fees are due before it, and it sets the 12 months of sales Step 6 asks for.'
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
      case 'client_code':
        return row.kind === 'value'
          ? String(row.value)
          : intl.formatMessage({
              id: 'osp.agentSheet.detail.client_id_missing',
              defaultMessage:
                "Not recorded yet. It is on your certificate and the agent's letters, and it is not your certificate number. Add it once and Trazo keeps it for next year."
            });
      case 'contact_name':
      case 'submitter_name':
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
          // A first plan version in Trazo, and the certifier holds the plan filed before Trazo:
          // there is nothing Trazo can compare against (overall review 2026-11, OV-PK-O02).
          if (state === 'first_version')
            return intl.formatMessage({ id: 'osp.agentSheet.detail.changes_first_version' });
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
        // A first year: the list is the grower's own statement on the annual update, not a comparison.
        if (e.stated && !sections.length)
          return intl.formatMessage({ id: 'osp.agentSheet.detail.changes_stated_none' });
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
              {e.stated
                ? intl.formatMessage({ id: 'osp.agentSheet.detail.changes_stated_list' })
                : intl.formatMessage(
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
        // In a first year a new version would not help: the certifier's plan predates Trazo.
        if (e.reason === 'first_version')
          parts.push(intl.formatMessage({ id: 'osp.agentSheet.detail.land_first_version' }));
        else if (e.reason)
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
                    "Set the sales period on your annual update above first. For a renewal on {date}, {agent}'s fee schedule asks for sales from {start} to {end}."
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
        // An April 1 renewal's period is the calendar year: the figure is given and named as the
        // agent's months, not as a fallback (review of back #281).
        const agentPeriod =
          !e.period_stated && e.published_start
            ? intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.sales_agent_period',
                  defaultMessage:
                    "{start} to {end}, the months {agent}'s fee schedule gives a renewal on {date}"
                },
                {
                  start: date(e.published_start),
                  end: date(e.published_end),
                  agent,
                  date: monthDay(String(e.renewal_date))
                }
              )
            : '';
        const period = agentPeriod
          ? agentPeriod
          : e.period_stated
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
                  "For a renewal on {date}, {agent}'s fee schedule asks for {start} to {end}."
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
      case 'ccof_due':
        return (
          <>
            {intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.ccof_due',
                defaultMessage:
                  "Submit the contract and pay your invoice by {due}: online, through {portal}, by mail or by phone ({phone}). {withdrawBy} is the last day to withdraw without owing next year's fees; after it the agent may send an overdue notice and a ${lateFee} late fee."
              },
              {
                due: monthDay(String(e.due)),
                portal: String(e.portal || ''),
                phone: String(e.phone || ''),
                withdrawBy: monthDay(String(e.withdraw_by)),
                lateFee: String(e.late_fee || '')
              }
            )}{' '}
            {ext(
              e.online_url,
              intl.formatMessage({
                id: 'osp.agentSheet.link.online',
                defaultMessage: 'File online'
              })
            )}
          </>
        );
      case 'ccof_changes_approved_first':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.ccof_changes_approved_first',
          defaultMessage:
            'The agent asks for changes to your plan when they happen, not at the inspection, and approves them before you put them in place. New parcels and facilities are reviewed before they can be inspected.'
        });
      case 'ccof_continue_or_surrender':
        return intl.formatMessage(
          {
            id: 'osp.agentSheet.detail.ccof_continue_or_surrender',
            defaultMessage:
              'Answer it on the form: continue (paying the invoice or having arranged a payment plan), or surrender. Surrendering after {withdrawBy} leaves the fees already accrued.'
          },
          { withdrawBy: monthDay(String(e.withdraw_by)) }
        );
      case 'ccof_osp_update': {
        const consequence = intl.formatMessage({
          id: 'osp.agentSheet.detail.ccof_no_update_means',
          defaultMessage:
            'The agent reads a contract with no update indicated as "no changes have occurred".'
        });
        if (!e.has_filing)
          return `${intl.formatMessage({
            id: 'osp.agentSheet.detail.changes_no_filing',
            defaultMessage: "Start this year's annual update to see which sections changed."
          })} ${consequence}`;
        const firstVersion = e.first_version
          ? `${intl.formatMessage({ id: 'osp.agentSheet.detail.ccof_first_version' })} `
          : '';
        return `${firstVersion}${intl.formatMessage(
          {
            id: 'osp.agentSheet.detail.ccof_osp_update',
            defaultMessage:
              'Your annual update lists {additions, plural, one {# addition} other {# additions}} and {deletions, plural, one {# deletion} other {# deletions}}{info, select, yes {, and changes to the application information} other {}}. If your plan changed, choose "needs to be updated" and send the updates to {email} or {portal}.'
          },
          {
            additions: Number(e.additions || 0),
            deletions: Number(e.deletions || 0),
            info: e.application_info_changes ? 'yes' : 'no',
            email: String(e.osp_update_email || ''),
            portal: String(e.portal || '')
          }
        )} ${consequence}`;
      }
      case 'surrender_date':
      case 'surrender_reason':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.surrender_only',
          defaultMessage: 'Only if you are surrendering certification.'
        });
      case 'ccof_terms':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.ccof_terms',
          defaultMessage:
            "Accepting the contract agrees to its eight terms: you monitor your plan every year, what you send is true, you are bound by the agent's manuals and its Standards of Behavior, you pay its fees, you keep to the standards and its policies, you may sign for the operation, and you agree to its Terms of Use and Privacy Policy. Read them on the form."
        });
      case 'ccof_accept_terms':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.ccof_accept_terms',
          defaultMessage:
            'Tick it on the form after reading the terms. Signing your annual update in Trazo is not this acceptance.'
        });
      case 'ccof_new_certificates':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.ccof_new_certificates',
          defaultMessage:
            'The agent issues new NOP certificates to every certified operation by the end of January.'
        });
      case 'crop_update_when':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.crop_update_when',
          defaultMessage:
            'File it only if crops change on parcels already on your Client Profile: for each certified parcel, the crops current or planned within the next 12 months and the acres. Filing it lets the agent update your Client Profile Addendum, and only crops and parcels listed there may be sold as organic. The agent also has an Excel version.'
        });
      case 'crop_update_date':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.crop_update_date',
          defaultMessage: 'Date it the day you file it.'
        });
      case 'crop_update_parcels':
      case 'site_changes': {
        const ccof = row.item === 'crop_update_parcels';
        if (row.kind !== 'value')
          return ccof
            ? intl.formatMessage({
                id: 'osp.agentSheet.detail.crop_update_parcels_none',
                defaultMessage:
                  "No parcel's application says it is already on the agent's certificate with a parcel number."
              })
            : intl.formatMessage({
                id: 'osp.agentSheet.detail.site_changes_none',
                defaultMessage:
                  "No parcel's application says it is already on the agent's certificate with a site number."
              });
        const parcels =
          (row.value as {
            number: string;
            name: string;
            acres: number | null;
            planned: string;
          }[]) || [];
        return (
          <VStack align="stretch" spacing={1}>
            <Text>
              {ccof
                ? intl.formatMessage({
                    id: 'osp.agentSheet.detail.crop_update_parcels',
                    defaultMessage:
                      "From your parcels' applications, with the number the certificate prints. The form asks for acres per crop; Trazo holds each parcel's acres, so split them by crop yourself."
                  })
                : intl.formatMessage({
                    id: 'osp.agentSheet.detail.site_changes',
                    defaultMessage:
                      "From your parcels' applications, with the site number the certificate prints. Compare each with your Certified Operation Profile and write what changes: crops or varieties, acres, and whether the site's total acreage drops. Production or planting records that show the site number and name may be sent instead."
                  })}
            </Text>
            {parcels.map((p) => (
              <Text key={`${p.number}-${p.name}`} fontWeight="semibold">
                {[
                  p.number,
                  p.name,
                  p.acres != null
                    ? intl.formatMessage(
                        { id: 'osp.agentSheet.detail.acres', defaultMessage: '{acres} ac' },
                        { acres: intl.formatNumber(p.acres) }
                      )
                    : '',
                  p.planned
                    ? intl.formatMessage(
                        { id: 'osp.agentSheet.detail.planned', defaultMessage: 'planned: {crops}' },
                        { crops: p.planned }
                      )
                    : ''
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ))}
          </VStack>
        );
      }
      case 'facilities_2519_when':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.facilities_2519_when',
          defaultMessage:
            'File one for each facility or third party at a different address from your primary certified location: where another operation takes the crop before the buyer, stores it or custom handles it (AGR 2121 J 13, K 1, L 1). It is not for fields.'
        });
      case 'facilities_2519': {
        const own = (e.own_facilities as string[] | undefined) || [];
        const ownLine = own.length ? (
          <Text>
            {intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.facilities_2519_own',
                defaultMessage:
                  'Your own facilities ({names}) need this form only if they are at a different address from your primary certified location. Trazo does not know which are.'
              },
              { names: own.join(', ') }
            )}
          </Text>
        ) : null;
        // Only a facility that stores or handles the crop while the grower still owns it is listed
        // (OV-PK-W04): a buyer that takes title on delivery is named here, never offered the form.
        const notOnBehalf = (e.not_on_behalf as string[] | undefined) || [];
        const notStated = (e.not_stated as string[] | undefined) || [];
        const notOnBehalfLine = notOnBehalf.length ? (
          <Text data-testid="sheet-2519-not-on-behalf">
            {intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.facilities_2519_not_on_behalf',
                defaultMessage:
                  "Not on this form: {names}. Your plan's answers say they do not store or handle your crop while you still own it (for example, the crop goes straight to the buyer, or ownership passes on delivery)."
              },
              { names: notOnBehalf.join(', ') }
            )}
          </Text>
        ) : null;
        const notStatedLine = notStated.length ? (
          <Text color="amber.800" data-testid="sheet-2519-not-stated">
            {intl.formatMessage(
              {
                id: 'osp.agentSheet.detail.facilities_2519_not_stated',
                defaultMessage:
                  'Your plan does not yet say whether {names} store or handle your crop while you still own it. Answer Harvest & Transport (where the crop goes before the buyer, and off-farm handling) and Storage in your plan, and this sheet will list the ones that need this form.'
              },
              { names: notStated.join(', ') }
            )}
          </Text>
        ) : null;
        if (row.kind !== 'value')
          return (
            <VStack align="stretch" spacing={1}>
              {/* "none_stated": the plan is silent about at least one facility, so no "none" is
                  claimed; the line naming them says what to answer. */}
              {e.reason !== 'none_stated' && (
                <Text>
                  {e.reason === 'none_on_behalf'
                    ? intl.formatMessage({
                        id: 'osp.agentSheet.detail.facilities_2519_none_on_behalf',
                        defaultMessage:
                          "By your plan's answers, no facility run by another operation stores or handles your crop while you still own it."
                      })
                    : intl.formatMessage({
                        id: 'osp.agentSheet.detail.facilities_2519_none',
                        defaultMessage: 'No facility run by another operation is on file.'
                      })}
                </Text>
              )}
              {notOnBehalfLine}
              {notStatedLine}
              {ownLine}
            </VStack>
          );
        const facilities = (row.value as Facility2519[]) || [];
        const field = (key: string) =>
          intl.formatMessage({ id: `osp.agentSheet.detail.facilities_2519_field.${key}` });
        return (
          <VStack align="stretch" spacing={3}>
            <Text>
              {intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.facilities_2519_header',
                  defaultMessage:
                    'From your facility records. Business name: {business}. Cert No: {cert}.'
                },
                {
                  business: String(e.business_name || ''),
                  cert:
                    String(e.cert_no || '') ||
                    intl.formatMessage({
                      id: 'osp.agentSheet.detail.facilities_2519_cert_missing',
                      defaultMessage: 'not recorded'
                    })
                }
              )}
            </Text>
            {facilities.map((f) => {
              const address = [f.address, f.city, f.state, f.postal_code]
                .filter(Boolean)
                .join(', ');
              const crops = f.crops
                .map((c) => (c.years.length ? `${c.crop} (${c.years.join(', ')})` : c.crop))
                .join('; ');
              return (
                <Box
                  key={f.facility_id}
                  pl={3}
                  borderLeftWidth="2px"
                  borderColor="gray.200"
                  data-testid={`sheet-2519-${f.facility_id}`}>
                  <Text fontWeight="semibold">{f.name}</Text>
                  {f.basis && f.basis.length ? (
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_basis',
                          defaultMessage: "On this form because, by your plan's answers, {reasons}."
                        },
                        {
                          reasons: f.basis
                            .map((b) => (BASIS_2519[b] ? intl.formatMessage(BASIS_2519[b]) : b))
                            .join('; ')
                        }
                      )}
                    </Text>
                  ) : null}
                  {address ? (
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_address',
                          defaultMessage: 'Address: {address}'
                        },
                        { address }
                      )}
                    </Text>
                  ) : null}
                  {f.activities.length ? (
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_activities',
                          defaultMessage: 'Activities: {activities}'
                        },
                        {
                          activities: f.activities
                            .map((key) => intl.formatMessage({ id: activityMessageId(key) }))
                            .join('; ')
                        }
                      )}
                    </Text>
                  ) : null}
                  {f.products_detail ? (
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_products',
                          defaultMessage: 'Products: {products}'
                        },
                        { products: f.products_detail }
                      )}
                    </Text>
                  ) : null}
                  {crops ? (
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_crops',
                          defaultMessage: 'Crops on the records linked to it: {crops}'
                        },
                        { crops }
                      )}
                    </Text>
                  ) : null}
                  {f.certificate ? (
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_certified',
                          defaultMessage:
                            'Your record shows certificate {number}: the statement for a certified third party fits. Attach its organic certificate and addendum.'
                        },
                        {
                          number: [f.certificate.certifier, f.certificate.number]
                            .filter(Boolean)
                            .join(' ')
                        }
                      )}{' '}
                      {f.certificate.copy_on_file
                        ? intl.formatMessage({
                            id: 'osp.agentSheet.detail.facilities_2519_copy_on_file',
                            defaultMessage: 'A copy of the certificate is on file in Trazo.'
                          })
                        : intl.formatMessage({
                            id: 'osp.agentSheet.detail.facilities_2519_no_copy',
                            defaultMessage: 'No copy of the certificate is on file in Trazo.'
                          })}
                    </Text>
                  ) : (
                    <Text>
                      {intl.formatMessage({
                        id: 'osp.agentSheet.detail.facilities_2519_uncertified',
                        defaultMessage:
                          'Your record shows no certificate number: the statement for a third party that is not certified fits, with how it is exempt.'
                      })}
                    </Text>
                  )}
                  {f.exemption_basis ? (
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_exemption',
                          defaultMessage: 'Exemption, as you stated it: {basis}'
                        },
                        { basis: f.exemption_basis }
                      )}
                    </Text>
                  ) : null}
                  {f.missing.length ? (
                    <Text color="amber.800">
                      {intl.formatMessage(
                        {
                          id: 'osp.agentSheet.detail.facilities_2519_missing',
                          defaultMessage:
                            'Not recorded: {fields}. Fill it in on the facility, under Off-Farm Handlers.'
                        },
                        { fields: f.missing.map(field).join(', ') }
                      )}
                    </Text>
                  ) : null}
                </Box>
              );
            })}
            <Text>
              {intl.formatMessage({
                id: 'osp.agentSheet.detail.facilities_2519_tick',
                defaultMessage: 'You tick the responsibility statement on the form; Trazo does not.'
              })}
            </Text>
            {notOnBehalfLine}
            {notStatedLine}
            {ownLine}
          </VStack>
        );
      }
      case 'facilities_2519_comments':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.facilities_2519_comments',
          defaultMessage: 'Optional, in your own words.'
        });
      case 'facilities_2519_exempt_note':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.facilities_2519_exempt_note',
          defaultMessage:
            'Any business in the organic supply chain must be certified, apart from narrow exemptions for retail establishments and some handlers of tamper-evident packaged products (§ 205.101). WSDA must be able to verify the exemption.'
        });
      case 'wsda_due':
        return intl.formatMessage(
          {
            id: 'osp.agentSheet.detail.wsda_due',
            defaultMessage:
              'Your renewal application is due by {due}. The agent sends it to you with its fee form: fill in the copies it sent and send them as they say. Questions: {email}.'
          },
          { due: monthDay(String(e.due)), email: String(e.email || '') }
        );
      case 'wsda_fee_form': {
        // The fee form is not reproduced (WSDA, reply received by 2026-11-09: "Our fee forms are updated regularly.
        // Inputting it in your system would potentially cause an operation to use an outdated
        // form."). The one figure Trazo holds is offered as a cross-check, never as a fee figure.
        const year = String(e.year || '');
        const use = intl.formatMessage({
          id: 'osp.agentSheet.detail.wsda_fee_form',
          defaultMessage:
            'Use the fee form the agent sends with your renewal application. The agent updates it regularly and does not publish it, so Trazo does not copy its lines or link an older copy.'
        });
        if (e.reason === 'no_filing')
          return `${use} ${intl.formatMessage({
            id: 'osp.agentSheet.detail.wsda_fee_form_no_filing',
            defaultMessage: "Start this year's annual update to see Trazo's sales cross-check."
          })}`;
        if (e.reason === 'period_not_over')
          return `${use} ${intl.formatMessage(
            {
              id: 'osp.agentSheet.detail.wsda_fee_form_not_over',
              defaultMessage:
                'Calendar {year} is not over yet, so there is no sales cross-check for it.'
            },
            { year }
          )}`;
        if (e.subtotal != null)
          return `${use} ${intl.formatMessage(
            {
              id: 'osp.agentSheet.detail.wsda_fee_form_cross_check',
              defaultMessage:
                'For checking your own figures only: your sales records in Trazo show {amount} invoiced as organic and dated in {year}. This is not a fee figure. It counts each sale by its date, not by when it was paid.'
            },
            { amount: money(e.subtotal), year }
          )}`;
        return `${use} ${
          Number(e.n_unpriced) > 0
            ? intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.wsda_fee_form_unpriced',
                  defaultMessage:
                    '{count, plural, one {# sale} other {# sales}} in {year} {count, plural, one {has} other {have}} no amount recorded, so there is no sales cross-check.'
                },
                { count: Number(e.n_unpriced), year }
              )
            : intl.formatMessage(
                {
                  id: 'osp.agentSheet.detail.wsda_fee_form_no_sales',
                  defaultMessage: 'No sale invoiced as organic is recorded for {year}.'
                },
                { year }
              )
        }`;
      }
      case 'acreage_removed':
        return intl.formatMessage({
          id: 'osp.agentSheet.detail.acreage_removed',
          defaultMessage:
            'If acreage leaves organic production, include a map of the new boundaries and why it was removed (transferred to another grower, converted to conventional).'
        });
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
  const forms = sheet.forms && sheet.forms.length ? sheet.forms : [sheet.form];

  return (
    <StandardCard>
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontSize="lg" fontWeight="semibold">
            {forms.length > 1
              ? intl.formatMessage(
                  {
                    id: 'osp.agentSheet.titleForms',
                    defaultMessage: "{agent}'s renewal forms: what to copy"
                  },
                  { agent }
                )
              : intl.formatMessage(
                  {
                    id: 'osp.agentSheet.title',
                    defaultMessage: "{agent}'s renewal form: what to copy"
                  },
                  { agent }
                )}
          </Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            {forms.length > 1 ? (
              <>
                {intl.formatMessage(
                  {
                    id: 'osp.agentSheet.introForms',
                    defaultMessage:
                      'You fill in these forms yourself and file them with the agent: {forms}. Form by form: what Trazo holds for you to copy, and what only you can answer. Nothing here is filed for you.'
                  },
                  {
                    forms: forms
                      .map((f) => [f.document_id || f.title, f.revision].filter(Boolean).join(', '))
                      .join('; ')
                  }
                )}{' '}
                {forms.map((f, i) => (
                  <React.Fragment key={f.stem || f.title}>
                    {i ? ' · ' : ''}
                    {/* A form the agent asked Trazo not to reproduce is named, never linked: the
                        link was to the outdated copy the agent warned about (OV-PK-W01). */}
                    {f.not_reproduced
                      ? intl.formatMessage(
                          {
                            id: 'osp.agentSheet.formNotReproduced',
                            defaultMessage:
                              '{form} (the agent sends it with your renewal application; not linked here)'
                          },
                          { form: f.document_id || f.title }
                        )
                      : ext(
                          f.url,
                          f.sent_with_renewal
                            ? intl.formatMessage(
                                {
                                  id: 'osp.agentSheet.formSentByAgent',
                                  defaultMessage:
                                    '{form} (an earlier published copy; fill in the one the agent sent)'
                                },
                                { form: f.document_id || f.title }
                              )
                            : f.document_id || f.title
                        )}
                  </React.Fragment>
                ))}
              </>
            ) : (
              <>
                {intl.formatMessage(
                  {
                    id: 'osp.agentSheet.intro',
                    defaultMessage:
                      'You fill in and sign {form} ({revision}) yourself, with the agent. Step by step: what Trazo holds for you to copy, and what only you can answer. Nothing here is filed for you.'
                  },
                  {
                    form: sheet.form.document_id || sheet.form.title,
                    revision: sheet.form.revision
                  }
                )}{' '}
                {ext(
                  sheet.form.url,
                  intl.formatMessage({
                    id: 'osp.agentSheet.formLink',
                    defaultMessage: "The agent's form"
                  })
                )}
              </>
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
