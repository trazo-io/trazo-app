/**
 * § 205.406(a)(3) step of the annual update: the § 205.401(b) details Trazo holds for this
 * operation, each answered "correct" or updated.
 *
 * Nothing is preselected: a detail nobody looked at is not "unchanged", and the server refuses a
 * request that leaves one out. An update writes the farm or company record (the same write the
 * farm profile makes, with the same role rules) and the server appends a dated line saying what
 * changed to the filing. Every detail confirmed sets the filing's "unchanged" statement.
 *
 * A detail Trazo does not hold is shown as not held and typed by the operator; it is never filled
 * in from the account or anywhere else. Server: certifications/services/application_info_review.py.
 */
import React, { useMemo, useState } from 'react';
import { Badge, Box, HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardQueryError,
  StandardSegmentedControl
} from 'components/Design/StandardComponents';
import {
  CompanyDetail,
  CompanyDetailAnswer,
  CompanyDetailsReview,
  useConfirmCompanyDetailsMutation,
  useGetCompanyDetailsReviewQuery
} from 'store/api/ospAnnualUpdateApi';

interface Props {
  companyId: string;
  farmId: string;
  updateId: number;
  /** Set when the step must wait (unsaved edits to the changes text): why, in one sentence. */
  blockedReason?: string | null;
  /** The filing's (a)(3) answer as the server saved it, so the open form does not overwrite it. */
  onApplied?: (review: CompanyDetailsReview) => void;
}

type Choice = '' | 'correct' | 'changed';
interface Draft {
  choice: Choice;
  value: string;
}

const DETAIL_LABELS: Record<string, { id: string; defaultMessage: string }> = {
  legal_name: { id: 'osp.annual.companyDetails.legalName', defaultMessage: 'Business name' },
  trade_name: { id: 'osp.annual.companyDetails.tradeName', defaultMessage: 'Trade name (DBA)' },
  responsible_person: {
    id: 'osp.annual.companyDetails.responsiblePerson',
    defaultMessage: 'Responsible person'
  },
  address: { id: 'osp.annual.companyDetails.address', defaultMessage: 'Street address' },
  city: { id: 'osp.annual.companyDetails.city', defaultMessage: 'City' },
  state: { id: 'osp.annual.companyDetails.state', defaultMessage: 'State' },
  zip_code: { id: 'osp.annual.companyDetails.zipCode', defaultMessage: 'ZIP code' },
  phone: { id: 'osp.annual.companyDetails.phone', defaultMessage: 'Phone' },
  email: { id: 'osp.annual.companyDetails.email', defaultMessage: 'Email' }
};

/** A typed value is needed for an update (bar removing an optional detail Trazo holds), and
 *  for a required detail Trazo does not hold. */
const needsValue = (detail: CompanyDetail, draft: Draft) =>
  draft.choice === 'changed'
    ? detail.required || !detail.held
    : draft.choice === 'correct' && !detail.held && detail.required;

const showsInput = (detail: CompanyDetail, draft: Draft) =>
  draft.choice === 'changed' || (draft.choice === 'correct' && !detail.held && detail.required);

const parseErrors = (err: unknown): { fields: Record<string, string>; general: string | null } => {
  const data = (err as { data?: unknown })?.data as Record<string, unknown> | undefined;
  const fields: Record<string, string> = {};
  let general: string | null = null;
  if (data && typeof data === 'object') {
    const answers = data.answers;
    if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
      Object.entries(answers as Record<string, unknown>).forEach(([key, msgs]) => {
        fields[key] = Array.isArray(msgs) ? msgs.map(String).join(' ') : String(msgs);
      });
    } else if (Array.isArray(answers)) {
      general = answers.map(String).join(' ');
    }
    if (typeof data.detail === 'string') general = data.detail;
  }
  return { fields, general };
};

const OSPCompanyDetailsStep: React.FC<Props> = ({
  companyId,
  farmId,
  updateId,
  blockedReason,
  onApplied
}) => {
  const intl = useIntl();
  const toast = useToast();
  const {
    data: review,
    isLoading,
    isError,
    isFetching,
    refetch
  } = useGetCompanyDetailsReviewQuery({
    companyId,
    farmId,
    updateId
  });
  const [confirm, { isLoading: saving }] = useConfirmCompanyDetailsMutation();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The server keeps the outcome (the attestation and the change lines), not each detail's
  // answer, so after a save the step shows that outcome instead of re-asking every detail. "Review
  // again" reopens it, empty, as a fresh review (review of app #233).
  const [justSaved, setJustSaved] = useState(false);
  const [reopened, setReopened] = useState(false);

  const details = useMemo(() => review?.details ?? [], [review]);
  const draftFor = (key: string): Draft => drafts[key] ?? { choice: '', value: '' };
  const label = (d: CompanyDetail) =>
    DETAIL_LABELS[d.key] ? intl.formatMessage(DETAIL_LABELS[d.key]) : d.label;

  const setDraft = (key: string, next: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...draftFor(key), ...next } }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const unanswered = details.filter((d) => {
    const draft = draftFor(d.key);
    return !draft.choice || (needsValue(d, draft) && !draft.value.trim());
  });
  const canAnswer = Boolean(review?.can_answer);
  const collapsed = (justSaved || Boolean(review?.attested_unchanged)) && !reopened;
  const answering = canAnswer && !collapsed;

  if (isLoading || (!review && !isError)) return null;
  if (isError || !review) {
    // Never an empty box: the (a)(3) answer this step owns would otherwise vanish unnoticed.
    return (
      <StandardQueryError
        title={intl.formatMessage({
          id: 'osp.annual.companyDetails.loadError',
          defaultMessage: 'The company details for this update could not be loaded'
        })}
        onRetry={refetch}
        isRetrying={isFetching}
      />
    );
  }

  const submit = async () => {
    const answers: Record<string, CompanyDetailAnswer> = {};
    details.forEach((d) => {
      const draft = draftFor(d.key);
      if (!draft.choice) return;
      const answer: CompanyDetailAnswer = { status: draft.choice };
      if (showsInput(d, draft)) answer.value = draft.value.trim();
      answers[d.key] = answer;
    });
    try {
      const saved = await confirm({ companyId, farmId, updateId, answers }).unwrap();
      setDrafts({});
      setErrors({});
      setJustSaved(true);
      setReopened(false);
      onApplied?.(saved);
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.annual.companyDetails.saved',
          defaultMessage: 'Company details saved to this update'
        })
      });
    } catch (err: unknown) {
      const { fields, general } = parseErrors(err);
      setErrors(fields);
      toast({
        status: 'error',
        duration: 9000,
        isClosable: true,
        title: intl.formatMessage({
          id: 'osp.annual.companyDetails.error',
          defaultMessage: 'Company details were not saved'
        }),
        description:
          general ??
          intl.formatMessage({
            id: 'osp.annual.toast.errorFields',
            defaultMessage: 'Fix the highlighted fields, then save again.'
          })
      });
    }
  };

  const optionsFor = (d: CompanyDetail) => {
    const correct = intl.formatMessage(
      d.held
        ? { id: 'osp.annual.companyDetails.correct', defaultMessage: 'Correct' }
        : d.required
        ? {
            id: 'osp.annual.companyDetails.onFile',
            defaultMessage: 'Already on file with my certifier'
          }
        : { id: 'osp.annual.companyDetails.none', defaultMessage: 'None' }
    );
    const changed = intl.formatMessage(
      d.held
        ? { id: 'osp.annual.companyDetails.update', defaultMessage: 'Update' }
        : {
            id: 'osp.annual.companyDetails.newThisYear',
            defaultMessage: 'New since my last update'
          }
    );
    const options: { key: 'correct' | 'changed'; label: string }[] = [
      { key: 'correct', label: correct }
    ];
    if (d.editable) options.push({ key: 'changed', label: changed });
    return options;
  };

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4} bg="white">
      <HStack justify="space-between" align="start" mb={1} flexWrap="wrap" spacing={2}>
        <Text fontWeight="semibold" fontSize="sm" color="gray.700">
          {intl.formatMessage({
            id: 'osp.annual.companyDetails.title',
            defaultMessage: 'Company details (§ 205.406(a)(3))'
          })}
        </Text>
        {review.attested_unchanged && (
          <Badge variant="subtle">
            {intl.formatMessage({
              id: 'osp.annual.companyDetails.allConfirmed',
              defaultMessage: 'Every detail confirmed unchanged'
            })}
          </Badge>
        )}
      </HStack>
      <Text fontSize="xs" color="gray.600" mb={3}>
        {intl.formatMessage({
          id: 'osp.annual.companyDetails.help',
          defaultMessage:
            'These are the details Trazo holds for this operation, the ones the packet cover prints. Mark each one correct or update it. An update changes the farm profile and adds a dated line to this filing saying what changed. When every detail is correct, the filing states they are unchanged.'
        })}
      </Text>
      {!canAnswer && (
        <Text fontSize="xs" color="gray.600" mb={3}>
          {intl.formatMessage(
            review.locked
              ? {
                  id: 'osp.annual.companyDetails.locked',
                  defaultMessage:
                    'This revision is signed or filed, so its answer stays as it is. Create a correction to change it.'
                }
              : {
                  id: 'osp.annual.companyDetails.readOnly',
                  defaultMessage: 'Your role can view these details but not confirm or change them.'
                }
          )}
        </Text>
      )}
      <VStack align="stretch" spacing={3}>
        {details.map((d) => {
          const draft = draftFor(d.key);
          return (
            <Box key={d.key} borderTopWidth="1px" borderColor="gray.100" pt={3}>
              <HStack
                justify="space-between"
                align={{ base: 'start', md: 'center' }}
                flexDirection={{ base: 'column', md: 'row' }}
                spacing={2}>
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    {label(d)}
                  </Text>
                  {d.held ? (
                    <Text fontSize="sm" color="gray.800" wordBreak="break-word">
                      {d.value}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.600" fontStyle="italic">
                      {intl.formatMessage({
                        id: 'osp.annual.companyDetails.notHeld',
                        defaultMessage: 'Not held in Trazo'
                      })}
                    </Text>
                  )}
                  {answering && !d.editable && (
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({
                        id: 'osp.annual.companyDetails.adminOnly',
                        defaultMessage: 'Only a company admin can change this.'
                      })}
                    </Text>
                  )}
                </Box>
                {answering && (
                  <StandardSegmentedControl<Choice>
                    ariaLabel={label(d)}
                    options={optionsFor(d)}
                    value={draft.choice}
                    onChange={(choice) => setDraft(d.key, { choice })}
                  />
                )}
              </HStack>
              {answering && showsInput(d, draft) && (
                <Box mt={2}>
                  <StandardField
                    label={intl.formatMessage(
                      {
                        id: 'osp.annual.companyDetails.newValue',
                        defaultMessage: '{detail}, as it is now'
                      },
                      { detail: label(d) }
                    )}
                    required={d.required}
                    error={errors[d.key]}>
                    <StandardInput
                      type={d.key === 'email' ? 'email' : d.key === 'phone' ? 'tel' : 'text'}
                      value={draft.value}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDraft(d.key, { value: e.target.value })
                      }
                    />
                  </StandardField>
                </Box>
              )}
              {answering && !showsInput(d, draft) && errors[d.key] && (
                <Text fontSize="xs" color="red.700" mt={1}>
                  {errors[d.key]}
                </Text>
              )}
            </Box>
          );
        })}
      </VStack>
      {canAnswer && collapsed && (
        <HStack justify="space-between" mt={4} flexWrap="wrap" spacing={2}>
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage(
              review.application_info_changes.trim()
                ? {
                    id: 'osp.annual.companyDetails.savedWithChanges',
                    defaultMessage:
                      'Saved to this update. What changed is listed in the text below.'
                  }
                : {
                    id: 'osp.annual.companyDetails.savedSummary',
                    defaultMessage: 'Saved to this update.'
                  }
            )}
          </Text>
          <StandardButton
            variant="outline"
            size="sm"
            onClick={() => {
              setReopened(true);
              setJustSaved(false);
            }}>
            {intl.formatMessage({
              id: 'osp.annual.companyDetails.reviewAgain',
              defaultMessage: 'Review again'
            })}
          </StandardButton>
        </HStack>
      )}
      {answering && (
        <VStack align="stretch" spacing={2} mt={4}>
          {blockedReason && (
            <Text fontSize="xs" color="gray.600">
              {blockedReason}
            </Text>
          )}
          {!blockedReason && unanswered.length > 0 && (
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage(
                {
                  id: 'osp.annual.companyDetails.remaining',
                  defaultMessage:
                    '{count, plural, one {# detail} other {# details}} still to answer. Nothing is assumed unchanged.'
                },
                { count: unanswered.length }
              )}
            </Text>
          )}
          <HStack justify="flex-end">
            <StandardButton
              variant="primary"
              size="sm"
              isLoading={saving}
              isDisabled={Boolean(blockedReason) || unanswered.length > 0}
              onClick={submit}>
              {intl.formatMessage({
                id: 'osp.annual.companyDetails.submit',
                defaultMessage: 'Save company details'
              })}
            </StandardButton>
          </HStack>
        </VStack>
      )}
    </Box>
  );
};

export default OSPCompanyDetailsStep;
