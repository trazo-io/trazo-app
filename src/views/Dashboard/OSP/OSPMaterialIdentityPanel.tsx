/**
 * What each logged product name IS, decided by the operator (OSP alignment T18, Phase 5 slice 2).
 *
 * A name in the records that is not exactly on the plan ("Neptune's Harvest Fish Fertilizer 2-3-1"
 * against the plan's "...2-4-1") was matched by nothing and flagged by nothing. Trazo never decides
 * that two names are one product. The operator does, here, for the uses they review:
 *
 *   - "same product as" a product on this plan, or "a different product";
 *   - only the uses ticked are covered; a use logged later, or edited afterwards, is not;
 *   - a reviewed use can be excluded, with a reason;
 *   - names whose numbers differ need the difference acknowledged and explained;
 *   - a new decision replaces the current one, which stays in the history; a decision made by
 *     mistake can be undone, with a reason, and stays in the history too.
 *
 * Layout (browser test, 2026-10-03): one collapsed row per name with its status, so the list reads
 * as a to-do list on a phone; each use shows where, how much and what was logged, so the operator
 * can judge it; a suggestion is a one-tap choice, never a preselection.
 *
 * The server enforces every rule; this panel only collects the decision. A decision changes no
 * record and adds nothing to the plan.
 */

import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Collapse,
  Flex,
  Stack,
  Text,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { FaChevronDown } from 'react-icons/fa';

import {
  StandardButton,
  StandardCard,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  useDecideMaterialIdentityMutation,
  useGetMaterialIdentitiesQuery,
  useWithdrawMaterialIdentityMutation
} from 'store/api/ospApi';
import type {
  MaterialIdentity,
  MaterialIdentitySuggestion,
  MaterialIdentityTarget
} from 'types/osp';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface Props {
  companyId: string;
  farmId: string;
  osp: { id: string | number; status?: string };
}

/** The numbers in a name, in order. Mirrors the server's `numbers()` so the form asks in advance. */
export const formulationNumbers = (name: string): string[] =>
  (name.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.'));

export const formulationDiffers = (a: string, b: string): boolean =>
  formulationNumbers(a).join('|') !== formulationNumbers(b).join('|');

/** Uses listed before "Show all": enough to judge, short enough for a phone. */
const FIRST_USES = 10;

type Status = 'not_reviewed' | 'identified' | 'different' | 'needs_review';

/** One status per name, from the server's per-use states. */
export const identityStatus = (identity: MaterialIdentity): Status => {
  if (!identity.current) return 'not_reviewed';
  const settled = identity.events.every((e) => e.state === 'covered' || e.state === 'excepted');
  if (!settled) return 'needs_review';
  return identity.current.decision === 'same_as' ? 'identified' : 'different';
};

// `needs_review` needs attention: the theme's `warning` variant, never an amber colour scheme (an
// amber tint pill is 2.63:1; review of app #69).
const STATUS_BADGE: Record<Status, Record<string, string>> = {
  not_reviewed: { variant: 'neutral' },
  identified: { variant: 'subtle', colorScheme: 'green' },
  different: { variant: 'neutral' },
  needs_review: { variant: 'warning' }
};

const STATE_SCHEME: Record<string, string> = {
  covered: 'green',
  unreviewed: 'gray',
  excepted: 'purple'
};

const shortDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

const Suggestions: React.FC<{
  items: MaterialIdentitySuggestion[];
  targets: MaterialIdentityTarget[];
  onUse?: (target: MaterialIdentityTarget) => void;
}> = ({ items, targets, onUse }) => {
  const intl = useIntl();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const panelBg = useColorModeValue('gray.50', 'gray.700');
  if (!items.length) return null;
  const line = (s: MaterialIdentitySuggestion) => {
    if (s.kind === 'shared_brand') {
      // "Starts like" is true only when the plan name starts with the same word; a match after a
      // leading maker or brand word ("Bayer Serenade Opti") says so (run 6, R6-02).
      if (s.after_prefix) {
        return intl.formatMessage(
          {
            id: s.numbers_differ
              ? 'osp.identity.suggest.afterPrefixNumbers'
              : 'osp.identity.suggest.afterPrefix',
            defaultMessage: s.numbers_differ
              ? 'Shares its product name with "{name}" on the plan (after that name\'s leading brand word), with different numbers.'
              : 'Shares its product name with "{name}" on the plan (after that name\'s leading brand word).'
          },
          { name: s.target.name }
        );
      }
      return intl.formatMessage(
        {
          id: s.numbers_differ ? 'osp.identity.suggest.brandNumbers' : 'osp.identity.suggest.brand',
          defaultMessage: s.numbers_differ
            ? 'Starts like "{name}" on the plan, with different numbers.'
            : 'Starts like "{name}" on the plan.'
        },
        { name: s.target.name }
      );
    }
    if (s.kind === 'plan_answer_names') {
      // The section and question as the wizard shows them, never the stored keys (browser test).
      const where = s.question_label
        ? s.module_label
          ? `${s.module_label}: "${s.question_label}"`
          : `"${s.question_label}"`
        : s.module_label || s.module;
      return intl.formatMessage(
        {
          id: s.approved_substance
            ? 'osp.identity.suggest.answerSubstance'
            : 'osp.identity.suggest.answer',
          defaultMessage: s.approved_substance
            ? 'Your plan answer ({question}) names "{product}", which {catalog} lists under {substance}, a substance this plan approves.'
            : 'Your plan answer ({question}) names "{product}".'
        },
        {
          question: where,
          product: s.product_name,
          catalog: s.catalog.toUpperCase(),
          substance: s.approved_substance
        }
      );
    }
    return intl.formatMessage(
      {
        id: 'osp.identity.suggest.substance',
        defaultMessage:
          'Part of the name matches {substance}, which this plan approves. This is not a classification.'
      },
      { substance: s.substance_name }
    );
  };
  return (
    <Box data-testid="identity-suggestions" borderWidth="1px" borderRadius="md" p={3} bg={panelBg}>
      <Text fontSize="xs" color={muted} mb={1}>
        {intl.formatMessage({
          id: 'osp.identity.suggest.title',
          defaultMessage: 'Worth a look. Suggestions decide nothing and clear nothing.'
        })}
      </Text>
      <Stack spacing={2}>
        {items.map((s, i) => {
          const target =
            s.kind === 'shared_brand'
              ? targets.find((t) => t.kind === s.target.kind && t.id === s.target.id)
              : undefined;
          return (
            <Flex key={i} gap={2} align="center" wrap="wrap" justify="space-between">
              <Text fontSize="sm" data-testid="identity-suggestion" flex="1" minW="200px">
                {line(s)}
              </Text>
              {target && onUse ? (
                <StandardButton size="sm" variant="outline" onClick={() => onUse(target)}>
                  {intl.formatMessage({
                    id: 'osp.identity.ux.useSuggestion',
                    defaultMessage: 'Use this product'
                  })}
                </StandardButton>
              ) : null}
            </Flex>
          );
        })}
      </Stack>
    </Box>
  );
};

const DecisionForm: React.FC<{
  identity: MaterialIdentity;
  targets: MaterialIdentityTarget[];
  scope: { companyId: string; farmId: string; ospId: string | number };
  onDone: () => void;
  onCancel?: () => void;
}> = ({ identity, targets, scope, onDone, onCancel }) => {
  const intl = useIntl();
  const toast = useToast();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.100', 'gray.600');
  const [decide, { isLoading }] = useDecideMaterialIdentityMutation();

  const [decision, setDecision] = useState<'' | 'same_as' | 'different_product'>('');
  const [targetKey, setTargetKey] = useState('');
  const [reviewed, setReviewed] = useState<Record<number, boolean>>({});
  const [excluding, setExcluding] = useState<Record<number, boolean>>({});
  const [excluded, setExcluded] = useState<Record<number, string>>({});
  const [ack, setAck] = useState(false);
  const [formulationNote, setFormulationNote] = useState('');
  const [note, setNote] = useState('');
  const [showAll, setShowAll] = useState(false);

  const target = targets.find((t) => `${t.kind}:${t.id}` === targetKey);
  const needsAck =
    decision === 'same_as' && !!target && formulationDiffers(identity.logged_name, target.name);
  const events = identity.events;
  const reviewedIds = events.filter((e) => reviewed[e.id]).map((e) => e.id);
  const allChecked = events.length > 0 && reviewedIds.length === events.length;
  const visible = showAll ? events : events.slice(0, FIRST_USES);
  const exclusionsMissingReason = reviewedIds.some(
    (id) => excluding[id] && !(excluded[id] || '').trim()
  );

  const useSuggestion = (t: MaterialIdentityTarget) => {
    setDecision('same_as');
    setTargetKey(`${t.kind}:${t.id}`);
  };

  const submit = async () => {
    try {
      await decide({
        ...scope,
        body: {
          source: identity.source,
          logged_name: identity.logged_name,
          decision: decision as 'same_as' | 'different_product',
          ...(decision === 'same_as' && target
            ? { target_kind: target.kind, target_id: target.id }
            : {}),
          event_ids: reviewedIds,
          exceptions: reviewedIds
            .filter((id) => excluding[id] && (excluded[id] || '').trim())
            .map((id) => ({ event_id: id, reason: excluded[id].trim() })),
          ...(needsAck
            ? { formulation_difference_acknowledged: ack, formulation_note: formulationNote }
            : {}),
          note,
          ...(identity.current ? { supersedes: identity.current.id } : {})
        }
      }).unwrap();
      // Every piece of per-decision state, so a second decision can never reuse an earlier
      // acknowledgment or note (review of app #68).
      setDecision('');
      setTargetKey('');
      setReviewed({});
      setExcluding({});
      setExcluded({});
      setAck(false);
      setFormulationNote('');
      setNote('');
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.identity.saved',
          defaultMessage: 'Decision recorded'
        }),
        duration: 3000
      });
      onDone();
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.identity.failed',
          defaultMessage: 'The decision was not recorded'
        }),
        description: apiErrorMessage(err) ?? String(err?.message || err),
        duration: 8000,
        isClosable: true
      });
    }
  };

  // What still stands between the operator and Record, said in words rather than a grey button.
  const missing = !decision
    ? intl.formatMessage({
        id: 'osp.identity.ux.missingDecision',
        defaultMessage: 'Choose what this name is.'
      })
    : decision === 'same_as' && !target
    ? intl.formatMessage({
        id: 'osp.identity.ux.missingTarget',
        defaultMessage: 'Choose the product on your plan.'
      })
    : reviewedIds.length === 0
    ? intl.formatMessage({
        id: 'osp.identity.ux.missingUses',
        defaultMessage: 'Tick the uses this decision covers.'
      })
    : needsAck && !(ack && formulationNote.trim())
    ? intl.formatMessage({
        id: 'osp.identity.ux.missingAck',
        defaultMessage: 'Confirm the difference in numbers and say why.'
      })
    : exclusionsMissingReason
    ? intl.formatMessage({
        id: 'osp.identity.ux.missingReason',
        defaultMessage: 'Give a reason for each use you exclude.'
      })
    : '';

  return (
    <Stack spacing={4} mt={3} data-testid="identity-decision-form">
      <Box>
        <Text fontWeight="semibold" fontSize="sm" mb={2}>
          {intl.formatMessage({
            id: 'osp.identity.ux.step1',
            defaultMessage: '1. What is this product?'
          })}
        </Text>
        <Stack spacing={2}>
          <Suggestions items={identity.suggestions ?? []} targets={targets} onUse={useSuggestion} />
          <StandardSelect
            size="sm"
            aria-label={intl.formatMessage({
              id: 'osp.identity.decision',
              defaultMessage: 'Decision'
            })}
            value={decision}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDecision(e.target.value as any)
            }>
            <option value="">
              {intl.formatMessage({
                id: 'osp.identity.choose',
                defaultMessage: 'Choose what this name is'
              })}
            </option>
            <option value="same_as">
              {intl.formatMessage({
                id: 'osp.identity.sameAs',
                defaultMessage: 'The same product as one on the plan'
              })}
            </option>
            <option value="different_product">
              {intl.formatMessage({
                id: 'osp.identity.different',
                defaultMessage: 'A different product'
              })}
            </option>
          </StandardSelect>
          {decision === 'same_as' ? (
            <StandardSelect
              size="sm"
              aria-label={intl.formatMessage({
                id: 'osp.identity.target',
                defaultMessage: 'Product on the plan'
              })}
              value={targetKey}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTargetKey(e.target.value)}>
              <option value="">
                {intl.formatMessage({
                  id: 'osp.identity.chooseTarget',
                  defaultMessage: 'Choose the product on the plan'
                })}
              </option>
              {targets.map((t) => (
                <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>
                  {t.name}
                </option>
              ))}
            </StandardSelect>
          ) : null}
          {needsAck ? (
            <Box data-testid="formulation-ack" borderWidth="1px" borderRadius="md" p={3}>
              <Text fontSize="sm" color="amber.800" mb={1}>
                {intl.formatMessage(
                  {
                    id: 'osp.identity.numbersDiffer',
                    defaultMessage: 'The two names have different numbers: {a} and {b}.'
                  },
                  {
                    a: formulationNumbers(identity.logged_name).join('-') || '-',
                    b: formulationNumbers(target?.name || '').join('-') || '-'
                  }
                )}
              </Text>
              <Checkbox isChecked={ack} onChange={(e) => setAck(e.target.checked)}>
                <Text fontSize="sm">
                  {intl.formatMessage({
                    id: 'osp.identity.ack',
                    defaultMessage: 'I understand the difference and these are the same product'
                  })}
                </Text>
              </Checkbox>
              <StandardTextarea
                size="sm"
                mt={2}
                rows={2}
                placeholder={intl.formatMessage({
                  id: 'osp.identity.ackNote',
                  defaultMessage: 'Why they are the same product'
                })}
                value={formulationNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormulationNote(e.target.value)
                }
              />
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Box>
        <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
          <Text fontWeight="semibold" fontSize="sm">
            {intl.formatMessage({
              id: 'osp.identity.ux.step2',
              defaultMessage: '2. Which uses does this cover?'
            })}
          </Text>
          <Checkbox
            isChecked={allChecked}
            isIndeterminate={reviewedIds.length > 0 && !allChecked}
            onChange={(e) =>
              setReviewed(
                e.target.checked ? Object.fromEntries(events.map((ev) => [ev.id, true])) : {}
              )
            }>
            <Text fontSize="sm">
              {intl.formatMessage(
                { id: 'osp.identity.ux.selectAll', defaultMessage: 'Select all {count} uses' },
                { count: events.length }
              )}
            </Text>
          </Checkbox>
        </Flex>
        <Text fontSize="xs" color={muted} mb={2}>
          {intl.formatMessage({
            id: 'osp.identity.ux.usesHint',
            defaultMessage:
              'Tick only the uses you have checked. A use logged later, or edited afterwards, is not covered until you review it.'
          })}
        </Text>
        <Stack
          spacing={0}
          borderWidth="1px"
          borderRadius="md"
          divider={<Box borderColor={rowBorder} borderBottomWidth="1px" />}>
          {visible.map((event) => {
            const isExcluding = !!excluding[event.id];
            return (
              <Box key={event.id} px={3} py={2} data-testid="identity-use">
                <Flex gap={3} align="flex-start" wrap="wrap">
                  <Checkbox
                    mt="2px"
                    isChecked={!!reviewed[event.id]}
                    onChange={(e) => setReviewed((r) => ({ ...r, [event.id]: e.target.checked }))}
                    aria-label={shortDate(event.date) || `#${event.id}`}
                  />
                  <Box flex="1" minW="180px">
                    <Text fontSize="sm" fontWeight="medium">
                      {[shortDate(event.date), event.parcel].filter(Boolean).join(' · ')}
                    </Text>
                    {event.amount || event.as_logged ? (
                      <Text fontSize="xs" color={muted}>
                        {[event.amount, event.as_logged].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </Box>
                  {event.state !== 'unreviewed' ? (
                    <Badge
                      {...(event.state === 'stale'
                        ? { variant: 'warning' }
                        : { colorScheme: STATE_SCHEME[event.state] || 'gray' })}
                      data-state={event.state}>
                      {intl.formatMessage({ id: `osp.identity.state.${event.state}` })}
                    </Badge>
                  ) : null}
                  {reviewed[event.id] ? (
                    <StandardButton
                      size="xs"
                      variant="ghost"
                      onClick={() => setExcluding((x) => ({ ...x, [event.id]: !isExcluding }))}>
                      {isExcluding
                        ? intl.formatMessage({ id: 'osp.identity.ux.keep', defaultMessage: 'Keep' })
                        : intl.formatMessage({
                            id: 'osp.identity.ux.exclude',
                            defaultMessage: 'Exclude'
                          })}
                    </StandardButton>
                  ) : null}
                </Flex>
                {reviewed[event.id] && isExcluding ? (
                  <StandardInput
                    size="sm"
                    mt={2}
                    placeholder={intl.formatMessage({
                      id: 'osp.identity.excludeReason',
                      defaultMessage: 'To exclude this event, say why'
                    })}
                    value={excluded[event.id] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExcluded((x) => ({ ...x, [event.id]: e.target.value }))
                    }
                  />
                ) : null}
              </Box>
            );
          })}
        </Stack>
        {events.length > FIRST_USES ? (
          <StandardButton size="sm" variant="ghost" mt={1} onClick={() => setShowAll((v) => !v)}>
            {showAll
              ? intl.formatMessage({
                  id: 'osp.identity.ux.showFewer',
                  defaultMessage: 'Show fewer'
                })
              : intl.formatMessage(
                  { id: 'osp.identity.ux.showAll', defaultMessage: 'Show all {count} uses' },
                  { count: events.length }
                )}
          </StandardButton>
        ) : null}
      </Box>

      <StandardTextarea
        size="sm"
        rows={2}
        placeholder={intl.formatMessage({
          id: 'osp.identity.note',
          defaultMessage: 'Note (optional)'
        })}
        value={note}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
      />
      {identity.current ? (
        <Text fontSize="xs" color={muted}>
          {intl.formatMessage({
            id: 'osp.identity.replaces',
            defaultMessage:
              'This replaces the current decision. The current one stays in the history.'
          })}
        </Text>
      ) : null}
      {missing ? (
        <Text fontSize="sm" color={muted} data-testid="identity-missing">
          {missing}
        </Text>
      ) : null}
      <Flex gap={2} wrap="wrap">
        <StandardButton isDisabled={!!missing} isLoading={isLoading} onClick={submit}>
          {intl.formatMessage({
            id: 'osp.identity.record',
            defaultMessage: 'Record this decision'
          })}
        </StandardButton>
        {onCancel ? (
          <StandardButton variant="ghost" onClick={onCancel}>
            {intl.formatMessage({ id: 'osp.restriction.cancel', defaultMessage: 'Cancel' })}
          </StandardButton>
        ) : null}
      </Flex>
    </Stack>
  );
};

const IdentityItem: React.FC<{
  identity: MaterialIdentity;
  targets: MaterialIdentityTarget[];
  scope: { companyId: string; farmId: string; ospId: string | number };
  editable: boolean;
}> = ({ identity, targets, scope, editable }) => {
  const intl = useIntl();
  const toast = useToast();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const headerHover = useColorModeValue('gray.50', 'gray.700');
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [undoReason, setUndoReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [withdraw, { isLoading: withdrawing }] = useWithdrawMaterialIdentityMutation();

  const status = identityStatus(identity);
  const dates = identity.events
    .map((e) => shortDate(e.date))
    .filter(Boolean)
    .sort();
  const counts = identity.events.reduce<Record<string, number>>(
    (acc, e) => ({ ...acc, [e.state]: (acc[e.state] || 0) + 1 }),
    {}
  );
  const statusLabel = intl.formatMessage({ id: `osp.identity.ux.status.${status}` });

  const undo = async () => {
    if (!identity.current) return;
    try {
      await withdraw({
        ...scope,
        body: { withdraw: identity.current.id, reason: undoReason.trim() }
      }).unwrap();
      setUndoing(false);
      setUndoReason('');
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.identity.ux.undone',
          defaultMessage: 'Decision undone'
        }),
        duration: 3000
      });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.identity.ux.undoFailed',
          defaultMessage: 'The decision was not undone'
        }),
        description: apiErrorMessage(err) ?? String(err?.message || err),
        duration: 8000,
        isClosable: true
      });
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" data-testid="material-identity-row">
      <Flex
        as="button"
        type="button"
        w="100%"
        textAlign="left"
        px={4}
        py={3}
        minH="44px"
        gap={3}
        align="center"
        justify="space-between"
        wrap="wrap"
        borderRadius="lg"
        _hover={{ bg: headerHover }}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        {/* The full name, never cut: its numbers (2-3-1 against 2-4-1) are what the operator checks. */}
        <Box minW={0} flex="1 1 220px">
          <Text fontWeight="semibold" wordBreak="break-word">
            {identity.logged_name}
          </Text>
          <Text fontSize="xs" color={muted}>
            {intl.formatMessage(
              {
                id: 'osp.identity.ux.meta',
                defaultMessage: '{count, plural, one {# use} other {# uses}} · {first} to {last}'
              },
              {
                count: identity.events.length,
                first: dates[0] || '-',
                last: dates[dates.length - 1] || '-'
              }
            )}
          </Text>
        </Box>
        <Flex align="center" gap={2} flexShrink={0} ml="auto">
          <Badge {...STATUS_BADGE[status]} flexShrink={0} data-status={status}>
            {statusLabel}
          </Badge>
          <Box
            as={FaChevronDown}
            aria-hidden
            boxSize="12px"
            color={muted}
            transform={open ? 'rotate(180deg)' : undefined}
            transition="transform 0.2s"
          />
        </Flex>
      </Flex>
      <Collapse in={open} animateOpacity unmountOnExit>
        <Box px={4} pb={4}>
          {identity.current && !changing ? (
            <Box data-testid="identity-summary" borderWidth="1px" borderRadius="md" p={3} mt={1}>
              <Text fontSize="sm">{identity.current.basis}</Text>
              <Text fontSize="xs" color={muted} mt={1}>
                {intl.formatMessage(
                  {
                    id: 'osp.identity.ux.coverage',
                    defaultMessage:
                      '{covered} of {total} uses covered{excepted, select, 0 {} other {, {excepted} excluded}}{stale, select, 0 {} other {, {stale} changed since review}}{unreviewed, select, 0 {} other {, {unreviewed} not reviewed}}.'
                  },
                  {
                    covered: counts.covered || 0,
                    total: identity.events.length,
                    excepted: counts.excepted || 0,
                    stale: counts.stale || 0,
                    unreviewed: counts.unreviewed || 0
                  }
                )}
              </Text>
              {editable && !undoing ? (
                <Flex gap={2} mt={3} wrap="wrap">
                  <StandardButton size="sm" variant="outline" onClick={() => setChanging(true)}>
                    {intl.formatMessage({
                      id: 'osp.identity.ux.change',
                      defaultMessage: 'Change decision'
                    })}
                  </StandardButton>
                  <StandardButton size="sm" variant="ghost" onClick={() => setUndoing(true)}>
                    {intl.formatMessage({
                      id: 'osp.identity.ux.undo',
                      defaultMessage: 'Undo decision'
                    })}
                  </StandardButton>
                </Flex>
              ) : null}
              {undoing ? (
                <Stack spacing={2} mt={3} data-testid="identity-undo">
                  <Text fontSize="sm">
                    {intl.formatMessage({
                      id: 'osp.identity.ux.undoExplain',
                      defaultMessage:
                        'The decision is closed and kept in the history. Its uses read as not reviewed again.'
                    })}
                  </Text>
                  <StandardInput
                    size="sm"
                    placeholder={intl.formatMessage({
                      id: 'osp.identity.ux.undoReason',
                      defaultMessage: 'Why you are undoing it'
                    })}
                    value={undoReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUndoReason(e.target.value)
                    }
                  />
                  <Flex gap={2} wrap="wrap">
                    <StandardButton
                      size="sm"
                      isDisabled={!undoReason.trim()}
                      isLoading={withdrawing}
                      onClick={undo}>
                      {intl.formatMessage({
                        id: 'osp.identity.ux.confirmUndo',
                        defaultMessage: 'Undo this decision'
                      })}
                    </StandardButton>
                    <StandardButton size="sm" variant="ghost" onClick={() => setUndoing(false)}>
                      {intl.formatMessage({
                        id: 'osp.restriction.cancel',
                        defaultMessage: 'Cancel'
                      })}
                    </StandardButton>
                  </Flex>
                </Stack>
              ) : null}
            </Box>
          ) : null}
          {editable && (!identity.current || changing) ? (
            <DecisionForm
              identity={identity}
              targets={targets}
              scope={scope}
              onDone={() => setChanging(false)}
              onCancel={changing ? () => setChanging(false) : undefined}
            />
          ) : null}
          {!editable && !identity.current ? (
            <Suggestions items={identity.suggestions ?? []} targets={targets} />
          ) : null}
          {identity.history.length ? (
            <Box mt={3}>
              <StandardButton size="xs" variant="ghost" onClick={() => setShowHistory((v) => !v)}>
                {intl.formatMessage(
                  { id: 'osp.identity.history', defaultMessage: 'History ({count})' },
                  { count: identity.history.length }
                )}
              </StandardButton>
              {showHistory
                ? identity.history.map((d) => (
                    <Text
                      key={d.id}
                      fontSize="xs"
                      color={muted}
                      data-testid="identity-history-entry"
                      mt={2}
                      pl={3}
                      borderLeftWidth="2px">
                      {d.basis}
                      {d.withdrawn_at
                        ? ` ${intl.formatMessage(
                            {
                              id: 'osp.identity.ux.withdrawnLine',
                              defaultMessage: '(undone on {date} by {who}: {reason})'
                            },
                            {
                              date: shortDate(d.withdrawn_at),
                              who: d.withdrawn_by_name || '-',
                              reason: d.withdrawal_reason
                            }
                          )}`
                        : d.superseded_at
                        ? ` ${intl.formatMessage({
                            id: 'osp.identity.superseded',
                            defaultMessage: '(replaced)'
                          })}`
                        : ''}
                    </Text>
                  ))
                : null}
            </Box>
          ) : null}
        </Box>
      </Collapse>
    </Box>
  );
};

const OSPMaterialIdentityPanel: React.FC<Props> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const { data } = useGetMaterialIdentitiesQuery({ companyId, farmId, ospId: osp.id });
  const editable = osp.status === 'draft' || osp.status === 'active';
  const identities = useMemo(() => data?.identities ?? [], [data]);
  if (!identities.length) return null;
  // Open work first: a to-do list reads top-down. Server order within each group is kept.
  const isSettled = (i: MaterialIdentity) =>
    ['identified', 'different'].includes(identityStatus(i));
  const ordered = [...identities.filter((i) => !isSettled(i)), ...identities.filter(isSettled)];
  const settled = identities.filter((i) => {
    const s = identityStatus(i);
    return s === 'identified' || s === 'different';
  }).length;
  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'osp.identity.title',
        defaultMessage: 'Logged names not on the plan'
      })}>
      <Text fontSize="sm" mb={1}>
        {intl.formatMessage({
          id: 'osp.identity.intro',
          defaultMessage:
            'Trazo never decides that two names are one product. For each name below, say what it is for the events you have checked. A decision changes no record and adds nothing to the plan.'
        })}
      </Text>
      <Text fontSize="sm" color={muted} mb={3} data-testid="identity-summary-line">
        {intl.formatMessage(
          {
            id: 'osp.identity.ux.summary',
            defaultMessage:
              '{total, plural, one {# name} other {# names}} · {settled} decided · {open} to review'
          },
          { total: identities.length, settled, open: identities.length - settled }
        )}
      </Text>
      <Stack spacing={2}>
        {ordered.map((identity) => (
          <IdentityItem
            key={`${identity.source}:${identity.name_key}`}
            identity={identity}
            targets={data?.targets ?? []}
            scope={{ companyId, farmId, ospId: osp.id }}
            editable={editable}
          />
        ))}
      </Stack>
    </StandardCard>
  );
};

export default OSPMaterialIdentityPanel;
