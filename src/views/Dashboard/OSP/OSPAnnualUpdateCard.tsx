/**
 * OSP Annual Continuation / Update (7 CFR 205.406(a)) capture form. The model + viewset +
 * audit-export flag already existed; this is the missing farmer form. Self-contained
 * (mirrors StateOrganicRegistrationCard). Files an annual update against the current OSP
 * version (prior_osp). Mounted in OSPView.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Divider,
  FormLabel,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCalendarCheck } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { formatDateFromTimestamp } from 'utils/dateOnly';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  FILING_METHODS,
  FilingMethod,
  OSPAnnualUpdate,
  OSPAnnualUpdateContent,
  useCorrectOSPAnnualUpdateMutation,
  useCreateOSPAnnualUpdateMutation,
  useFileOSPAnnualUpdateMutation,
  useGetOSPAnnualUpdatesQuery,
  useSignOSPAnnualUpdateMutation,
  useUpdateOSPAnnualUpdateMutation,
  useWithdrawOSPAnnualUpdateMutation
} from 'store/api/ospAnnualUpdateApi';
import type { OSPSummary } from 'types/osp';

interface Props {
  companyId?: string;
  farmId?: string;
  /**
   * The plan this filing CONTINUES — the version the certifier holds, not the version the
   * screen happens to be focused on.
   *
   * 🔴 2026-09-07. This was `ospId`, wired to `focusedOspId`, which defaults to the newest
   * version — the working DRAFT. So a filing made from this card recorded
   * `prior_osp = v4`: "the changes to v4", against a plan the certifying agent has never
   * seen, while § 205.406(a)(1) asks for the changes to the PREVIOUS plan. It read correctly
   * on screen and was wrong in the lineage an inspector follows.
   *
   * Undefined only for an operation that has never taken a plan out of draft; the caller
   * falls back to the working plan there, matching the server's rule.
   */
  planOnFile?: OSPSummary | null;
  /** The draft this filing will be recorded as producing, when one is open. */
  producesDraft?: OSPSummary | null;
  currentYear: number;
}

const linesToList = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Mirrors OSP_SECTION_KEYS in certifications/models.py — the six § 205.201(a)(1)-(6)
 * sections. Order matters: it is the order a certifier reads them in.
 */
const OSP_SECTION_KEYS = [
  'practices_procedures',
  'inputs_list',
  'monitoring_plan',
  'recordkeeping_description',
  'commingling_barriers',
  'additional_certifier_info'
] as const;

const SECTION_LABELS: Record<string, { id: string; defaultMessage: string }> = {
  practices_procedures: {
    id: 'osp.annual.section.practicesProcedures',
    defaultMessage: 'Practices & procedures'
  },
  inputs_list: { id: 'osp.annual.section.inputsList', defaultMessage: 'Inputs list' },
  monitoring_plan: { id: 'osp.annual.section.monitoringPlan', defaultMessage: 'Monitoring plan' },
  recordkeeping_description: {
    id: 'osp.annual.section.recordkeeping',
    defaultMessage: 'Recordkeeping'
  },
  commingling_barriers: {
    id: 'osp.annual.section.comminglingBarriers',
    defaultMessage: 'Commingling barriers'
  },
  additional_certifier_info: {
    id: 'osp.annual.section.additionalCertifierInfo',
    defaultMessage: 'Additional certifier info'
  }
};

/**
 * § 205.406(a)(3) — additions to or deletions from the § 205.401(b) application information:
 * the business name, address and telephone number, the person responsible for the operation
 * and, for a company, the person authorized to act on its behalf.
 *
 * It rides with the section attestations because it is the same kind of statement — the
 * operator saying, on a dated filing, that something has not changed — but it is NOT one of the
 * six § 205.201(a) sections, so it is ticked on its own and never by "Mark all unchanged".
 * Until it existed, the packet's (a)(3) paragraph had no answer to print.
 */
const APPLICATION_INFO_KEY = 'application_information';

const emptyAttestation = (): Record<string, boolean> =>
  [...OSP_SECTION_KEYS, APPLICATION_INFO_KEY].reduce((acc, key) => ({ ...acc, [key]: false }), {});

/**
 * The fields a save error can be attributed to. Anything the API rejects under a key
 * outside this list has no input to attach to, so it goes to the toast body instead of
 * being dropped.
 */
const FIELD_KEYS = [
  'reporting_year',
  'changes_summary',
  'additions',
  'deletions',
  'application_info_changes',
  'agent_requested_info'
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];
type FieldErrors = Partial<Record<FieldKey, string>>;

/**
 * Mirrors PLACEHOLDER_VALUES / MIN_CHANGE_ENTRY_CHARS in
 * trazo-back/certifications/serializers.py. Duplicated on purpose: this filing goes to a
 * certifier, and the farmer should see "that is placeholder text" next to the box they
 * typed it in, not after a round trip that names a snake_case field. The backend stays
 * the authority — anything this copy misses still comes back as a field error and lands
 * in the same place. Keeping this copy *looser* than the backend is safe; stricter is not.
 */
const PLACEHOLDER_VALUES = new Set([
  'test',
  'tests',
  'testing',
  'tbd',
  'todo',
  'n/a',
  'na',
  'none',
  'asdf',
  'qwerty',
  'xxx',
  'aaa',
  'foo',
  'bar',
  'sample',
  'placeholder',
  'prueba'
]);

const MIN_CHANGE_ENTRY_CHARS = 4;

/**
 * True when *every* word is scratch input. Whole-string matching let "test test" through,
 * which is the exact failure this guard exists to stop. Token matching still clears
 * "Latest soil test results", where only one word is a placeholder.
 */
const looksLikePlaceholder = (value: string): boolean => {
  const tokens = value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    // Strip surrounding punctuation but keep "/" so "n/a" survives.
    .map((token) => token.replace(/^[^\p{L}\p{N}/]+|[^\p{L}\p{N}/]+$/gu, ''))
    .filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => PLACEHOLDER_VALUES.has(token));
};

const quoteAll = (items: string[]): string => items.map((item) => `"${item}"`).join(', ');

/**
 * Splits a DRF error payload into per-field messages and everything else. `err.data` is
 * absent on a transport failure (RTK Query FETCH_ERROR), which used to stringify to
 * "[object Object]" in the toast — hence the null return rather than a String(err).
 */
const parseApiErrors = (err: unknown): { fields: FieldErrors; general: string | null } => {
  const fields: FieldErrors = {};
  const general: string[] = [];
  const payload = (err as { data?: unknown })?.data;
  if (typeof payload === 'string') {
    general.push(payload);
  } else if (payload && typeof payload === 'object') {
    Object.entries(payload as Record<string, unknown>).forEach(([key, msgs]) => {
      const text = Array.isArray(msgs) ? msgs.map(String).join(' ') : String(msgs);
      if ((FIELD_KEYS as readonly string[]).includes(key)) {
        fields[key as FieldKey] = text;
      } else {
        general.push(text);
      }
    });
  }
  return { fields, general: general.length ? general.join(' ') : null };
};

const FILING_METHOD_LABELS: Record<FilingMethod, { id: string; defaultMessage: string }> = {
  agent_web_form: { id: 'osp.annual.method.agentWebForm', defaultMessage: "Agent's web form" },
  agent_portal: { id: 'osp.annual.method.agentPortal', defaultMessage: "Agent's client portal" },
  email: { id: 'osp.annual.method.email', defaultMessage: 'Email' },
  mail: { id: 'osp.annual.method.mail', defaultMessage: 'Mail' },
  in_person: { id: 'osp.annual.method.inPerson', defaultMessage: 'In person' }
};

/**
 * What a filing row is, in the order that decides it. A filed update is never edited again
 * (2026-10-01): it was signed, it reached the agent, and the packet prints it byte for byte.
 */
type RowState = 'withdrawn' | 'corrected' | 'filed' | 'signed' | 'draft';
const rowState = (u: OSPAnnualUpdate): RowState => {
  if (u.withdrawn_at) return 'withdrawn';
  if (u.superseded_at) return 'corrected';
  if (u.submitted_at) return 'filed';
  if (u.signed_at) return 'signed';
  return 'draft';
};

type PendingKind = 'sign' | 'file' | 'withdraw' | 'correct';
type PendingAction = { id: number; kind: PendingKind } | null;

const STATE_LABELS: Record<RowState, { id: string; defaultMessage: string }> = {
  draft: { id: 'osp.annual.state.draft', defaultMessage: 'Draft' },
  signed: { id: 'osp.annual.state.signed', defaultMessage: 'Signed, not filed' },
  filed: { id: 'osp.annual.state.filed', defaultMessage: 'Filed' },
  corrected: { id: 'osp.annual.state.corrected', defaultMessage: 'Corrected' },
  withdrawn: { id: 'osp.annual.state.withdrawn', defaultMessage: 'Withdrawn' }
};

/** Status colour = meaning: done is green, in progress amber, a withdrawal red, a fact grey. */
export const STATE_BADGE: Record<RowState, string> = {
  draft: 'warning',
  signed: 'warning',
  filed: 'subtle',
  corrected: 'neutral',
  withdrawn: 'danger'
};

const CONFIRM_LABELS: Record<PendingKind, { id: string; defaultMessage: string }> = {
  sign: { id: 'osp.annual.confirm.sign', defaultMessage: 'Sign this update' },
  file: { id: 'osp.annual.confirm.file', defaultMessage: 'Record as filed' },
  withdraw: { id: 'osp.annual.confirm.withdraw', defaultMessage: 'Withdraw filing' },
  correct: { id: 'osp.annual.confirm.correct', defaultMessage: 'Open a correction' }
};

const DONE_LABELS: Record<
  'sign' | 'file' | 'withdraw' | 'correct',
  { id: string; defaultMessage: string }
> = {
  sign: { id: 'osp.annual.toast.signDone', defaultMessage: 'Update signed' },
  file: {
    id: 'osp.annual.toast.fileDone',
    defaultMessage: 'Filing recorded. The packet now carries it exactly as filed.'
  },
  withdraw: {
    id: 'osp.annual.toast.withdrawDone',
    defaultMessage: 'Filing withdrawn. It stays on record with your reason.'
  },
  correct: {
    id: 'osp.annual.toast.correctDone',
    defaultMessage: 'Correction opened as the next revision. The filed one is unchanged.'
  }
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = (year: number) => ({
  reporting_year: String(year),
  changes_summary: '',
  additions: '',
  deletions: '',
  application_info_changes: '',
  agent_requested_info: '',
  agent_requested_info_none: false,
  sections_unchanged: emptyAttestation()
});

const OSPAnnualUpdateCard: React.FC<Props> = ({
  companyId,
  farmId,
  planOnFile,
  producesDraft,
  currentYear
}) => {
  const ospId = planOnFile?.id ?? null;
  const intl = useIntl();
  const toast = useToast();
  const { data: updates = [] } = useGetOSPAnnualUpdatesQuery(
    { companyId: companyId || '', farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );
  const [createUpdate, { isLoading: creating }] = useCreateOSPAnnualUpdateMutation();
  const [updateUpdate, { isLoading: updating }] = useUpdateOSPAnnualUpdateMutation();
  const [signUpdate, { isLoading: signing }] = useSignOSPAnnualUpdateMutation();
  const [fileUpdate, { isLoading: filing }] = useFileOSPAnnualUpdateMutation();
  const [correctUpdate, { isLoading: correcting }] = useCorrectOSPAnnualUpdateMutation();
  const [withdrawUpdate, { isLoading: withdrawing }] = useWithdrawOSPAnnualUpdateMutation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm(currentYear));
  const [pending, setPending] = useState<PendingAction>(null);
  const [signerTitle, setSignerTitle] = useState('');
  const [filingMethod, setFilingMethod] = useState<FilingMethod | ''>('');
  const [filingDate, setFilingDate] = useState(todayIso());
  const [withdrawReason, setWithdrawReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLDivElement | null>>>({});

  useEffect(() => {
    setForm((f) => ({ ...f, reporting_year: f.reporting_year || String(currentYear) }));
  }, [currentYear]);

  const set = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear the field's error as soon as it is touched. Leaving a red border under a box
    // the farmer has already rewritten reads as "still wrong".
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as FieldKey];
      return next;
    });
  };

  /**
   * The card sits well below the fold, so a toast alone leaves the farmer looking at a
   * message that names a field they cannot see (and, before this, named it in snake_case).
   */
  const focusFirstError = (errors: FieldErrors) => {
    const first = FIELD_KEYS.find((key) => errors[key]);
    fieldRefs.current[first as FieldKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /** Per-entry problems for the additions/deletions textareas, or undefined if clean. */
  const entryListError = (raw: string): string | undefined => {
    const items = linesToList(raw);
    const placeholders = items.filter((item) => looksLikePlaceholder(item));
    const tooShort = items.filter(
      (item) => !looksLikePlaceholder(item) && item.length < MIN_CHANGE_ENTRY_CHARS
    );
    const parts: string[] = [];
    if (placeholders.length) {
      parts.push(
        intl.formatMessage(
          {
            id: 'osp.annual.error.entriesPlaceholder',
            defaultMessage:
              'Placeholder text, not a change: {entries}. Replace or delete {count, plural, one {that line} other {those lines}}.'
          },
          { entries: quoteAll(placeholders), count: placeholders.length }
        )
      );
    }
    if (tooShort.length) {
      parts.push(
        intl.formatMessage(
          {
            id: 'osp.annual.error.entriesTooShort',
            defaultMessage:
              'Too short to describe a change: {entries}. Use at least {min} characters, or delete {count, plural, one {that line} other {those lines}}.'
          },
          { entries: quoteAll(tooShort), min: MIN_CHANGE_ENTRY_CHARS, count: tooShort.length }
        )
      );
    }
    return parts.length ? parts.join(' ') : undefined;
  };

  const validate = (year: number): FieldErrors => {
    const errors: FieldErrors = {};
    if (!year || year < 2000 || year > 2100) {
      errors.reporting_year = intl.formatMessage({
        id: 'osp.annual.invalidYear',
        defaultMessage: 'Enter a reporting year between 2000 and 2100.'
      });
    }
    if (looksLikePlaceholder(form.changes_summary)) {
      errors.changes_summary = intl.formatMessage(
        {
          id: 'osp.annual.error.summaryPlaceholder',
          defaultMessage:
            'Describe the actual changes for {year}, or state that there were none. Your certifier reads this text as filed.'
        },
        { year: year || form.reporting_year }
      );
    }
    const additions = entryListError(form.additions);
    if (additions) errors.additions = additions;
    const deletions = entryListError(form.deletions);
    if (deletions) errors.deletions = deletions;
    return errors;
  };

  const setSection = (key: string, value: boolean) =>
    setForm((prev) => ({
      ...prev,
      sections_unchanged: { ...prev.sections_unchanged, [key]: value }
    }));

  /**
   * The DB enforces unique(prior_osp, reporting_year). Detect the collision from the
   * already-loaded list so the farmer gets "you already filed 2026, edit it?" instead of
   * a raw IntegrityError in a toast.
   */
  const duplicateForYear = useMemo(() => {
    // Only a NEW update can collide. An edit keeps its year (the server refuses a change), and a
    // correction shares its year with the revision it corrects by design: checking edits here
    // blocked every correction from being saved (review of app #57). A withdrawn revision does
    // not hold its year; the server files the year again as the next revision.
    if (editingId != null) return null;
    const year = parseInt(form.reporting_year, 10);
    if (!year) return null;
    const live = updates.filter((u) => u.reporting_year === year && !u.withdrawn_at);
    return live.find((u) => !u.is_locked) ?? live[0] ?? null;
  }, [updates, form.reporting_year, editingId]);

  const startEdit = (u: OSPAnnualUpdate) => {
    setEditingId(u.id);
    setFieldErrors({});
    setForm({
      reporting_year: String(u.reporting_year ?? currentYear),
      changes_summary: u.changes_summary || '',
      additions: Array.isArray(u.additions) ? u.additions.map(String).join('\n') : '',
      deletions: Array.isArray(u.deletions) ? u.deletions.map(String).join('\n') : '',
      application_info_changes: u.application_info_changes || '',
      agent_requested_info: u.agent_requested_info || '',
      agent_requested_info_none: u.agent_requested_info_none === true,
      sections_unchanged: { ...emptyAttestation(), ...(u.sections_unchanged_attestation || {}) }
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFieldErrors({});
    setForm(emptyForm(currentYear));
  };

  const handleSave = async () => {
    if (!companyId || !farmId || ospId == null) return;
    setFieldErrors({});
    const year = parseInt(form.reporting_year, 10);
    // Run the same checks the serializer runs, before spending a round trip on a payload
    // that is already known to be rejected.
    const clientErrors = validate(year);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      focusFirstError(clientErrors);
      toast({
        status: 'warning',
        isClosable: true,
        position: 'top',
        title: intl.formatMessage({
          id: 'osp.annual.toast.checkFields',
          defaultMessage: 'Nothing saved yet — check the highlighted fields'
        })
      });
      return;
    }
    // A year has one chain of revisions. Resolve a second create here rather than letting the
    // server refuse it: a draft for that year is opened for editing; a signed or filed one is
    // changed by a correction from its own row.
    if (duplicateForYear) {
      if (!duplicateForYear.is_locked) {
        startEdit(duplicateForYear);
        toast({
          status: 'info',
          title: intl.formatMessage({
            id: 'osp.annual.toast.alreadyFiled',
            defaultMessage: 'An update already exists for that year'
          }),
          description: intl.formatMessage({
            id: 'osp.annual.toast.alreadyFiledDesc',
            defaultMessage: 'Loaded it for editing — review the details and save again.'
          })
        });
      } else {
        toast({
          status: 'warning',
          title: intl.formatMessage({
            id: 'osp.annual.toast.alreadyFiled',
            defaultMessage: 'An update already exists for that year'
          }),
          description: intl.formatMessage({
            id: 'osp.annual.toast.alreadyLockedDesc',
            defaultMessage:
              'It is signed or filed, so it is not edited. Use Create correction on its row.'
          })
        });
      }
      return;
    }

    // Content only. The plan a filing continues is fixed when it is created and never re-sent
    // on an edit: re-sending it re-pointed an older year's filing at today's plan on file.
    // Filing state is never sent at all; it is the sign and file actions below.
    const content: OSPAnnualUpdateContent = {
      reporting_year: year,
      changes_summary: form.changes_summary,
      additions: linesToList(form.additions),
      deletions: linesToList(form.deletions),
      // Only ticked sections are sent. Persisting the un-ticked ones as `false` would
      // record "this section changed" for a farmer who simply never used the widget —
      // a claim they never made, on a document their certifier reads.
      sections_unchanged_attestation: Object.fromEntries(
        Object.entries(form.sections_unchanged).filter(([, isUnchanged]) => isUnchanged)
      ),
      application_info_changes: form.application_info_changes.trim(),
      agent_requested_info: form.agent_requested_info.trim(),
      // Unticked is "not answered", never "the agent asked for something".
      agent_requested_info_none: form.agent_requested_info_none ? true : null
    };
    try {
      if (editingId != null) {
        await updateUpdate({ companyId, farmId, updateId: editingId, data: content }).unwrap();
      } else {
        await createUpdate({ companyId, farmId, data: { ...content, prior_osp: ospId } }).unwrap();
      }
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.annual.toast.saved',
          defaultMessage: 'Annual update saved'
        })
      });
      resetForm();
    } catch (err: unknown) {
      // DRF returns {field: [msg]}. Show each message under its own input rather than
      // pasting the raw snake_case key into a toast the farmer has to decode.
      const { fields, general } = parseApiErrors(err);
      const hasFieldErrors = Object.keys(fields).length > 0;
      if (hasFieldErrors) {
        setFieldErrors(fields);
        focusFirstError(fields);
      }
      toast({
        status: 'error',
        // Long enough to read while fixing, and dismissible — the default 5s expiry ran
        // out on a three-part message.
        duration: 9000,
        isClosable: true,
        position: 'top',
        title: intl.formatMessage({
          id: 'osp.annual.toast.error',
          defaultMessage: 'Could not save the annual update'
        }),
        description: hasFieldErrors
          ? intl.formatMessage({
              id: 'osp.annual.toast.errorFields',
              defaultMessage: 'Fix the highlighted fields, then save again.'
            })
          : general ??
            intl.formatMessage({
              id: 'osp.annual.toast.errorGeneric',
              defaultMessage: 'Please try again. If it keeps failing, check your connection.'
            })
      });
    }
  };

  /**
   * One action panel at a time, always starting empty. The four inputs are shared across rows,
   * so leaving them filled on Cancel carried one filing's withdrawal reason onto the next row's
   * panel, one click away from being recorded there (review of app #57).
   */
  const openPending = (id: number | null, kind?: PendingKind) => {
    setSignerTitle('');
    setFilingMethod('');
    setFilingDate(todayIso());
    setWithdrawReason('');
    setPending(id == null || !kind ? null : { id, kind });
  };

  const runAction = async (u: OSPAnnualUpdate, kind: PendingKind) => {
    if (!companyId || !farmId) return;
    const scope = { companyId, farmId, updateId: u.id };
    try {
      if (kind === 'sign') {
        await signUpdate({ ...scope, data: { signer_title: signerTitle.trim() } }).unwrap();
      } else if (kind === 'file') {
        await fileUpdate({
          ...scope,
          data: { filing_method: filingMethod, submitted_at: filingDate }
        }).unwrap();
      } else if (kind === 'withdraw') {
        await withdrawUpdate({ ...scope, data: { reason: withdrawReason.trim() } }).unwrap();
      } else {
        await correctUpdate(scope).unwrap();
      }
      openPending(null);
      toast({
        status: 'success',
        title: intl.formatMessage(DONE_LABELS[kind])
      });
    } catch (err: unknown) {
      const { general } = parseApiErrors(err);
      toast({
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top',
        title: intl.formatMessage({
          id: 'osp.annual.toast.actionError',
          defaultMessage: 'That did not go through'
        }),
        description:
          general ??
          intl.formatMessage({
            id: 'osp.annual.toast.errorGeneric',
            defaultMessage: 'Please try again. If it keeps failing, check your connection.'
          })
      });
    }
  };

  // Only the newest revision of a year can be corrected; older ones already have a correction.
  const correctedIds = useMemo(
    () => new Set(updates.map((u) => u.corrects).filter((id): id is number => id != null)),
    [updates]
  );

  const busy = signing || filing || correcting || withdrawing;

  return (
    <StandardCard
      mb={4}
      titleIcon={<Icon as={FaCalendarCheck} color="green.700" />}
      title={intl.formatMessage({
        id: 'osp.annual.title',
        defaultMessage: 'OSP Annual Continuation (7 CFR 205.406)'
      })}
      subtitle={intl.formatMessage({
        id: 'osp.annual.subtitle',
        defaultMessage:
          'Each year, a certified operation must file an update summarizing any changes to its OSP (or reaffirming no changes).'
      })}
      headerAction={
        updates.length > 0 ? <Badge variant="brand">{updates.length}</Badge> : undefined
      }>
      <VStack align="stretch" spacing={3}>
        {ospId == null && (
          <Text fontSize="sm" color="gray.700">
            {intl.formatMessage({
              id: 'osp.annual.noOsp',
              defaultMessage:
                'Create your Organic System Plan first, then file the annual update against it.'
            })}
          </Text>
        )}

        {updates.map((u) => (
          <Box key={u.id} p={3} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="semibold" fontSize="sm">
                  {(u.revision_number ?? 1) > 1
                    ? intl.formatMessage(
                        {
                          id: 'osp.annual.yearRevision',
                          defaultMessage: '{year} · revision {revision}'
                        },
                        { year: u.reporting_year, revision: u.revision_number }
                      )
                    : u.reporting_year}
                </Text>
                <Text fontSize="xs" color="gray.500" noOfLines={2}>
                  {u.changes_summary ||
                    intl.formatMessage({
                      id: 'osp.annual.noChanges',
                      defaultMessage: 'No changes — OSP reaffirmed'
                    })}
                </Text>
                {/*
                  `formatDateFromTimestamp`, NOT `formatDateOnly`. Both live in the same file and
                  the neighbouring change-notifications panel uses the latter — correctly, because
                  ITS columns are DateFields. `OSPAnnualUpdate.submitted_at` and
                  `certifier_acknowledged_at` are DateTimeFields, and an ISO datetime falls
                  through `parseDateOnly`'s YYYY-MM-DD pattern to `new Date(...)`, which renders in
                  the VIEWER's zone. A filing submitted 2025-01-10T00:00:00Z showed as
                  "Jan 9, 2025" anywhere west of UTC — a § 205.406 filing date off by one day.

                  `intl.locale` is passed because the helper defaults to en-US: without it a
                  Spanish-speaking farmer read "Aug 21, 2026" under Spanish labels.

                  What a returning farmer — and the inspector sitting beside them — actually
                  asks of a past filing: WHEN did we file, and WHICH plan version did it move
                  us to. The row used to answer neither: a "Submitted" pill carried no date,
                  and `prior_osp` was a database id nobody can read as a plan version.
                */}
                <HStack spacing={2} mt={1} flexWrap="wrap">
                  {formatDateFromTimestamp(u.submitted_at, intl.locale) && (
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage(
                        { id: 'osp.annual.filedOn', defaultMessage: 'Filed {date}' },
                        { date: formatDateFromTimestamp(u.submitted_at, intl.locale) }
                      )}
                    </Text>
                  )}
                  {u.prior_osp_version != null && (
                    <Text fontSize="xs" color="gray.600">
                      {u.new_osp_version != null
                        ? intl.formatMessage(
                            {
                              id: 'osp.annual.planMoved',
                              defaultMessage: 'Plan v{from} → v{to}'
                            },
                            { from: u.prior_osp_version, to: u.new_osp_version }
                          )
                        : intl.formatMessage(
                            {
                              id: 'osp.annual.planReaffirmed',
                              defaultMessage: 'Plan v{from} reaffirmed'
                            },
                            { from: u.prior_osp_version }
                          )}
                    </Text>
                  )}
                </HStack>
                {/*
                  Acknowledgment is shown ONLY when it is on record, and never as a pending
                  state. Nothing in the product writes `certifier_acknowledged_at` — it is
                  read-only on the serializer and set by staff — so for a farmer it is always
                  null. A permanent "Acknowledgment pending" pill would put an amber warning on
                  every filing forever and imply Trazo tracks certifier replies, which it does
                  not. An absent acknowledgment is not evidence the certifier withheld one.
                */}
                {formatDateFromTimestamp(u.certifier_acknowledged_at, intl.locale) && (
                  <Text fontSize="xs" color="green.700" fontWeight="medium" mt={1}>
                    {intl.formatMessage(
                      {
                        id: 'osp.annual.acknowledgedOn',
                        defaultMessage: 'Certifier acknowledged {date}'
                      },
                      { date: formatDateFromTimestamp(u.certifier_acknowledged_at, intl.locale) }
                    )}
                  </Text>
                )}
              </Box>
              <HStack spacing={2} flexWrap="wrap" justify="flex-end">
                <Badge variant={STATE_BADGE[rowState(u)]}>
                  {intl.formatMessage(STATE_LABELS[rowState(u)])}
                </Badge>
                {/*
                  Edit exists only while the revision is an unsigned draft. Once signed or filed
                  the server refuses edits (409) and the packet prints the filed document byte for
                  byte; a mistake is fixed by a correction, the next revision, which leaves this
                  one as it was.
                */}
                {!u.is_locked && (
                  <StandardButton size="xs" variant="ghost" onClick={() => startEdit(u)}>
                    {intl.formatMessage({ id: 'osp.annual.edit', defaultMessage: 'Edit' })}
                  </StandardButton>
                )}
                {rowState(u) === 'draft' && (
                  <StandardButton
                    size="xs"
                    variant="outline"
                    onClick={() => openPending(u.id, 'sign')}>
                    {intl.formatMessage({ id: 'osp.annual.sign', defaultMessage: 'Sign' })}
                  </StandardButton>
                )}
                {rowState(u) === 'signed' && !correctedIds.has(u.id) && (
                  <StandardButton
                    size="xs"
                    variant="outline"
                    onClick={() => openPending(u.id, 'file')}>
                    {intl.formatMessage({
                      id: 'osp.annual.recordFiling',
                      defaultMessage: 'Record filing'
                    })}
                  </StandardButton>
                )}
                {/*
                  Offered on a signed revision too: once signed its content is fixed, so a mistake
                  found before filing is also a correction. Filing the correction replaces this
                  revision, filed or not.
                */}
                {(rowState(u) === 'signed' || rowState(u) === 'filed') &&
                  !correctedIds.has(u.id) && (
                    <StandardButton
                      size="xs"
                      variant="ghost"
                      onClick={() => openPending(u.id, 'correct')}>
                      {intl.formatMessage({
                        id: 'osp.annual.createCorrection',
                        defaultMessage: 'Create correction'
                      })}
                    </StandardButton>
                  )}
                {rowState(u) === 'filed' && (
                  <StandardButton
                    size="xs"
                    variant="ghost"
                    onClick={() => openPending(u.id, 'withdraw')}>
                    {intl.formatMessage({ id: 'osp.annual.withdraw', defaultMessage: 'Withdraw' })}
                  </StandardButton>
                )}
              </HStack>
            </HStack>
            {pending?.id === u.id && (
              <Box mt={3} pt={3} borderTopWidth="1px" borderColor="gray.100">
                {pending.kind === 'sign' && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({
                        id: 'osp.annual.signHelp',
                        defaultMessage:
                          'Signing records your name and the date against exactly what this update says. After signing it cannot be edited; a change is made as a correction.'
                      })}
                    </Text>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'osp.annual.signerTitle',
                        defaultMessage: 'Your title (optional)'
                      })}>
                      <StandardInput
                        value={signerTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSignerTitle(e.target.value)
                        }
                      />
                    </StandardField>
                  </VStack>
                )}
                {pending.kind === 'file' && (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'osp.annual.filedDate',
                        defaultMessage: 'Date filed with your certifier'
                      })}>
                      <StandardInput
                        type="date"
                        max={todayIso()}
                        value={filingDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFilingDate(e.target.value)
                        }
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'osp.annual.filingMethod',
                        defaultMessage: 'How it was filed'
                      })}>
                      <StandardSelect
                        value={filingMethod}
                        placeholder={intl.formatMessage({
                          id: 'osp.annual.filingMethodUnset',
                          defaultMessage: 'Not recorded'
                        })}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setFilingMethod(e.target.value as FilingMethod | '')
                        }>
                        {FILING_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {intl.formatMessage(FILING_METHOD_LABELS[m])}
                          </option>
                        ))}
                      </StandardSelect>
                    </StandardField>
                  </SimpleGrid>
                )}
                {pending.kind === 'correct' && (
                  <Text fontSize="xs" color="gray.600">
                    {intl.formatMessage({
                      id: 'osp.annual.correctHelp',
                      defaultMessage:
                        'This opens the next revision as an unsigned copy for you to change, sign and file. This revision stays exactly as it is, and is replaced only when the correction is filed.'
                    })}
                  </Text>
                )}
                {pending.kind === 'withdraw' && (
                  <StandardField
                    label={intl.formatMessage({
                      id: 'osp.annual.withdrawReason',
                      defaultMessage: 'Why is this filing withdrawn?'
                    })}>
                    <StandardTextarea
                      rows={2}
                      value={withdrawReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setWithdrawReason(e.target.value)
                      }
                    />
                  </StandardField>
                )}
                <HStack justify="flex-end" spacing={2} mt={2}>
                  <StandardButton size="xs" variant="ghost" onClick={() => openPending(null)}>
                    {intl.formatMessage({ id: 'osp.annual.cancel', defaultMessage: 'Cancel' })}
                  </StandardButton>
                  <StandardButton
                    size="xs"
                    isLoading={busy}
                    isDisabled={
                      (pending.kind === 'withdraw' && !withdrawReason.trim()) ||
                      (pending.kind === 'file' && (!filingDate || filingDate > todayIso()))
                    }
                    onClick={() => runAction(u, pending.kind)}>
                    {intl.formatMessage(CONFIRM_LABELS[pending.kind])}
                  </StandardButton>
                </HStack>
              </Box>
            )}
          </Box>
        ))}

        {ospId != null && (
          <Box p={3} borderWidth="1px" borderColor="green.200" borderRadius="md">
            <VStack align="stretch" spacing={3}>
              {/* Which version this filing attaches to, said out loud. The card used to post
                  the focused version's id and show nothing, so the farmer had no way to know
                  the record named a draft their certifier has never seen. */}
              {planOnFile ? (
                <Text fontSize="sm" color="gray.700">
                  {/* 🔴 2026-09-07 — "the plan your certifier holds" is only TRUE of a plan that
                      has left draft. On a first-year operation nothing has, `selectPlanOnFile`
                      returns nothing and the card falls back to the working draft — and the
                      sentence then told the farmer their certifier holds a plan nobody has ever
                      sent. Verified live on a farm created from scratch the same day. The
                      fallback is still the right TARGET (there is no other version to continue);
                      it is the claim about the certifier that has to go. */}
                  {intl.formatMessage(
                    {
                      id:
                        planOnFile.status === 'draft'
                          ? 'osp.annual.continuingDraft'
                          : 'osp.annual.continuing'
                    },
                    { version: planOnFile.version_number }
                  )}
                  {producesDraft ? (
                    <>
                      {' '}
                      {intl.formatMessage(
                        { id: 'osp.annual.producesDraft' },
                        { version: producesDraft.version_number }
                      )}
                    </>
                  ) : null}
                </Text>
              ) : null}
              <Box
                maxW="200px"
                ref={(el: HTMLDivElement | null) => {
                  fieldRefs.current.reporting_year = el;
                }}>
                <StandardField
                  label={intl.formatMessage({
                    id: 'osp.annual.reportingYear',
                    defaultMessage: 'Continuation year'
                  })}
                  error={fieldErrors.reporting_year}>
                  <StandardInput
                    type="number"
                    // StandardInput defaults type=number to inputMode="decimal" for the field
                    // measurements it was built around (6.8 pH, 44.5 acres). A reporting YEAR is
                    // a whole count, so this is the explicit override its own doc calls for —
                    // otherwise the phone keypad offers a decimal point for "2026".
                    inputMode="numeric"
                    min={2000}
                    max={2100}
                    value={form.reporting_year}
                    // The year of a saved update is fixed; the server refuses a change.
                    isDisabled={editingId != null}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set('reporting_year', e.target.value)
                    }
                  />
                </StandardField>
              </Box>
              <Box
                ref={(el: HTMLDivElement | null) => {
                  fieldRefs.current.changes_summary = el;
                }}>
                <StandardField
                  label={intl.formatMessage({
                    id: 'osp.annual.changesSummary',
                    defaultMessage: 'Summary of Changes (§ 205.406(a)(1))'
                  })}
                  error={fieldErrors.changes_summary}>
                  <StandardTextarea
                    rows={3}
                    value={form.changes_summary}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      set('changes_summary', e.target.value)
                    }
                    placeholder={intl.formatMessage({
                      id: 'osp.annual.changesSummaryPlaceholder',
                      defaultMessage:
                        'Describe any changes since last year, or state that there are none.'
                    })}
                  />
                </StandardField>
              </Box>
              <Box
                ref={(el: HTMLDivElement | null) => {
                  fieldRefs.current.additions = el;
                }}>
                <StandardField
                  label={intl.formatMessage({
                    id: 'osp.annual.additions',
                    defaultMessage: 'Additions planned (one per line)'
                  })}
                  error={fieldErrors.additions}>
                  <StandardTextarea
                    rows={2}
                    value={form.additions}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      set('additions', e.target.value)
                    }
                    placeholder={intl.formatMessage({
                      id: 'osp.annual.additionsPlaceholder',
                      defaultMessage: 'e.g., New 2-acre block; new OMRI compost supplier'
                    })}
                  />
                </StandardField>
              </Box>
              <Box
                ref={(el: HTMLDivElement | null) => {
                  fieldRefs.current.deletions = el;
                }}>
                <StandardField
                  label={intl.formatMessage({
                    id: 'osp.annual.deletions',
                    defaultMessage: 'Deletions planned (one per line)'
                  })}
                  error={fieldErrors.deletions}>
                  <StandardTextarea
                    rows={2}
                    value={form.deletions}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      set('deletions', e.target.value)
                    }
                    placeholder={intl.formatMessage({
                      id: 'osp.annual.deletionsPlaceholder',
                      defaultMessage: 'e.g., Discontinued a pest material'
                    })}
                  />
                </StandardField>
                {/*
                  "Reporting Year" read as the year being reported ON, and the packet prints this
                  number as the year the operation continues ("Continuation for 2026"). One
                  meaning, said once (2026-09-11).
                */}
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {intl.formatMessage({
                    id: 'osp.annual.reportingYearHelp',
                    defaultMessage:
                      'The certification year this filing continues. A renewal due 1 March 2026 continues 2026 and reports on the 2025 season.'
                  })}
                </Text>
              </Box>
              <Divider />

              {/*
                § 205.406(a)(1) asks for a summary of changes since the prior OSP. For a
                mature operation the honest answer is usually "nothing changed" — but a
                free-text box makes that unverifiable per section. These per-section
                attestations give the certifier a section-by-section answer.
              */}
              <Box>
                <HStack justify="space-between" align="center" mb={2}>
                  <FormLabel fontSize="sm" mb={0}>
                    {intl.formatMessage({
                      id: 'osp.annual.sectionsUnchanged',
                      defaultMessage: 'Sections unchanged since the prior OSP'
                    })}
                  </FormLabel>
                  <StandardButton
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      set(
                        'sections_unchanged',
                        OSP_SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {})
                      )
                    }>
                    {intl.formatMessage({
                      id: 'osp.annual.markAllUnchanged',
                      defaultMessage: 'Mark all unchanged'
                    })}
                  </StandardButton>
                </HStack>
                <Text fontSize="xs" color="gray.500" mb={2}>
                  {intl.formatMessage({
                    id: 'osp.annual.sectionsUnchangedHelp',
                    defaultMessage:
                      'Tick each section of your Organic System Plan that has not changed. Leave a section unticked if you describe its change above.'
                  })}
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                  {OSP_SECTION_KEYS.map((key) => (
                    <Checkbox
                      key={key}
                      size="sm"
                      colorScheme="green"
                      isChecked={Boolean(form.sections_unchanged[key])}
                      onChange={(e) => setSection(key, e.target.checked)}>
                      <Text fontSize="sm">{intl.formatMessage(SECTION_LABELS[key])}</Text>
                    </Checkbox>
                  ))}
                </SimpleGrid>
                <Checkbox
                  mt={3}
                  size="sm"
                  colorScheme="green"
                  isChecked={Boolean(form.sections_unchanged[APPLICATION_INFO_KEY])}
                  onChange={(e) => setSection(APPLICATION_INFO_KEY, e.target.checked)}>
                  <Text fontSize="sm">
                    {intl.formatMessage({
                      id: 'osp.annual.applicationInfoUnchanged',
                      defaultMessage:
                        'Business name, address, telephone and the person responsible for the operation are unchanged (7 CFR 205.406(a)(3))'
                    })}
                  </Text>
                </Checkbox>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {intl.formatMessage({
                    id: 'osp.annual.applicationInfoUnchangedHelp',
                    defaultMessage:
                      'Leave it unticked if any of them changed, and tell your certifying agent what changed. The filing prints your answer either way.'
                  })}
                </Text>
                <Box
                  mt={3}
                  ref={(el: HTMLDivElement | null) => {
                    fieldRefs.current.application_info_changes = el;
                  }}>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'osp.annual.applicationInfoChanges',
                      defaultMessage:
                        'What changed in the application information (§ 205.406(a)(3))'
                    })}
                    error={fieldErrors.application_info_changes}>
                    <StandardTextarea
                      rows={2}
                      value={form.application_info_changes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        set('application_info_changes', e.target.value)
                      }
                    />
                  </StandardField>
                </Box>
              </Box>

              <Box
                ref={(el: HTMLDivElement | null) => {
                  fieldRefs.current.agent_requested_info = el;
                }}>
                <StandardField
                  label={intl.formatMessage({
                    id: 'osp.annual.agentRequestedInfo',
                    defaultMessage:
                      'Other information your certifying agent asked for (§ 205.406(a)(4))'
                  })}
                  error={fieldErrors.agent_requested_info}>
                  <StandardTextarea
                    rows={2}
                    value={form.agent_requested_info}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      set('agent_requested_info', e.target.value)
                    }
                  />
                </StandardField>
                <Checkbox
                  mt={2}
                  size="sm"
                  colorScheme="green"
                  isChecked={form.agent_requested_info_none}
                  onChange={(e) => set('agent_requested_info_none', e.target.checked)}>
                  <Text fontSize="sm">
                    {intl.formatMessage({
                      id: 'osp.annual.agentRequestedNone',
                      defaultMessage: 'My certifying agent asked for nothing further this year'
                    })}
                  </Text>
                </Checkbox>
              </Box>

              <Divider />

              {duplicateForYear && (
                <Text fontSize="sm" color="gray.700">
                  {duplicateForYear.is_locked
                    ? intl.formatMessage(
                        {
                          id: 'osp.annual.duplicateYearLockedWarning',
                          defaultMessage:
                            'The {year} update is signed or filed. Change it with Create correction on its row.'
                        },
                        { year: form.reporting_year }
                      )
                    : intl.formatMessage(
                        {
                          id: 'osp.annual.duplicateYearWarning',
                          defaultMessage:
                            'You already filed an update for {year}. Saving will open it for editing.'
                        },
                        { year: form.reporting_year }
                      )}
                </Text>
              )}

              {/*
                There used to be a "Filed with my certifier" box here that stamped today's date
                on save. Filing is now its own step on the saved row: sign it, then record the
                date and how it reached the agent. Once filed it is kept exactly as filed.
              */}
              <Text fontSize="xs" color="gray.500">
                {intl.formatMessage({
                  id: 'osp.annual.signThenFileHelp',
                  defaultMessage:
                    'Save the update, then sign it and record when it was filed from its row above. A filed update is kept exactly as filed.'
                })}
              </Text>
              <HStack justify="flex-end" spacing={2}>
                {editingId != null && (
                  <StandardButton size="sm" variant="ghost" onClick={resetForm}>
                    {intl.formatMessage({ id: 'osp.annual.cancel', defaultMessage: 'Cancel' })}
                  </StandardButton>
                )}
                <StandardButton size="sm" onClick={handleSave} isLoading={creating || updating}>
                  {editingId != null
                    ? intl.formatMessage({
                        id: 'osp.annual.update',
                        defaultMessage: 'Update Filing'
                      })
                    : intl.formatMessage({
                        id: 'osp.annual.save',
                        defaultMessage: 'Save Annual Update'
                      })}
                </StandardButton>
              </HStack>
            </VStack>
          </Box>
        )}
      </VStack>
    </StandardCard>
  );
};

export default OSPAnnualUpdateCard;
