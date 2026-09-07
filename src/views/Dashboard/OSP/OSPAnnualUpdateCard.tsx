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
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  OSPAnnualUpdate,
  useCreateOSPAnnualUpdateMutation,
  useGetOSPAnnualUpdatesQuery,
  useUpdateOSPAnnualUpdateMutation
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

const emptyAttestation = (): Record<string, boolean> =>
  OSP_SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {});

/**
 * The fields a save error can be attributed to. Anything the API rejects under a key
 * outside this list has no input to attach to, so it goes to the toast body instead of
 * being dropped.
 */
const FIELD_KEYS = ['reporting_year', 'changes_summary', 'additions', 'deletions'] as const;
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

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    reporting_year: String(currentYear),
    changes_summary: '',
    additions: '',
    deletions: '',
    submitted: false,
    sections_unchanged: emptyAttestation()
  });
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
    const year = parseInt(form.reporting_year, 10);
    if (!year) return null;
    // Excludes the record being edited: re-saving 2026 on the 2026 filing is not a
    // collision, but re-pointing the 2025 filing at 2026 is.
    return updates.find((u) => u.reporting_year === year && u.id !== editingId) ?? null;
  }, [updates, form.reporting_year, editingId]);

  const startEdit = (u: OSPAnnualUpdate) => {
    setEditingId(u.id);
    setFieldErrors({});
    setForm({
      reporting_year: String(u.reporting_year ?? currentYear),
      changes_summary: u.changes_summary || '',
      additions: Array.isArray(u.additions) ? u.additions.map(String).join('\n') : '',
      deletions: Array.isArray(u.deletions) ? u.deletions.map(String).join('\n') : '',
      submitted: Boolean(u.submitted_at),
      sections_unchanged: { ...emptyAttestation(), ...(u.sections_unchanged_attestation || {}) }
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFieldErrors({});
    setForm({
      reporting_year: String(currentYear),
      changes_summary: '',
      additions: '',
      deletions: '',
      submitted: false,
      sections_unchanged: emptyAttestation()
    });
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
    // Filing the same year twice violates unique(prior_osp, reporting_year). Resolve it
    // here rather than letting the DB reject the write.
    if (duplicateForYear) {
      if (editingId == null) {
        // Creating a year that already exists: load the existing filing so the farmer
        // continues on the right record.
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
        // Editing an existing filing and re-pointing it at a year another filing owns.
        // Do NOT swap records here — that would discard the edits already typed.
        toast({
          status: 'warning',
          title: intl.formatMessage({
            id: 'osp.annual.toast.yearTaken',
            defaultMessage: 'Another filing already covers that year'
          }),
          description: intl.formatMessage({
            id: 'osp.annual.toast.yearTakenDesc',
            defaultMessage: 'Pick a different reporting year, or edit that filing directly.'
          })
        });
      }
      return;
    }

    const data: Partial<OSPAnnualUpdate> = {
      prior_osp: ospId,
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
      // Setting submitted_at is the farmer's attestation that this was filed with the certifier.
      submitted_at: form.submitted ? new Date().toISOString() : null
    };
    try {
      if (editingId != null) {
        await updateUpdate({ companyId, farmId, updateId: editingId, data }).unwrap();
      } else {
        await createUpdate({ companyId, farmId, data }).unwrap();
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
                  {u.reporting_year}
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
              <HStack spacing={2}>
                {u.submitted_at ? (
                  <Badge colorScheme="green">
                    {intl.formatMessage({
                      id: 'osp.annual.submitted',
                      defaultMessage: 'Submitted'
                    })}
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    {intl.formatMessage({ id: 'osp.annual.draft', defaultMessage: 'Draft' })}
                  </Badge>
                )}
                {/*
                  An acknowledged filing is frozen server-side (423). Offering Edit anyway would
                  let a farmer reopen it, retype a summary, press save and only THEN be told —
                  losing the work and reading as a bug rather than a rule. The badge carries the
                  reason so the missing button is explained rather than merely absent.
                */}
                {u.certifier_acknowledged_at ? (
                  <Badge variant="neutral">
                    {intl.formatMessage({
                      id: 'osp.annual.lockedBadge',
                      defaultMessage: 'Acknowledged — as filed'
                    })}
                  </Badge>
                ) : (
                  <StandardButton size="xs" variant="ghost" onClick={() => startEdit(u)}>
                    {intl.formatMessage({ id: 'osp.annual.edit', defaultMessage: 'Edit' })}
                  </StandardButton>
                )}
              </HStack>
            </HStack>
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
                  {intl.formatMessage(
                    { id: 'osp.annual.continuing' },
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
                    defaultMessage: 'Reporting Year'
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
              </Box>

              <Divider />

              {duplicateForYear && (
                <Text fontSize="sm" color="gray.700">
                  {editingId == null
                    ? intl.formatMessage(
                        {
                          id: 'osp.annual.duplicateYearWarning',
                          defaultMessage:
                            'You already filed an update for {year}. Saving will open it for editing.'
                        },
                        { year: form.reporting_year }
                      )
                    : intl.formatMessage(
                        {
                          id: 'osp.annual.yearTakenWarning',
                          defaultMessage:
                            'Another filing already covers {year}. Pick a different year.'
                        },
                        { year: form.reporting_year }
                      )}
                </Text>
              )}

              <Checkbox
                isChecked={form.submitted}
                colorScheme="green"
                onChange={(e) => set('submitted', e.target.checked)}>
                {intl.formatMessage({
                  id: 'osp.annual.markSubmitted',
                  defaultMessage: 'Filed with my certifier'
                })}
              </Checkbox>
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
