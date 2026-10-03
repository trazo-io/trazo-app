/**
 * What each logged product name IS, decided by the operator (OSP alignment T18, Phase 5 slice 2).
 *
 * A name in the records that is not exactly on the plan ("Neptune's Harvest Fish Fertilizer 2-3-1"
 * against the plan's "...2-4-1") was matched by nothing and flagged by nothing. Trazo never decides
 * that two names are one product. The operator does, here, for the events they review:
 *
 *   - "same product as" a product on this plan, or "a different product";
 *   - only the events ticked are covered; an event logged later, or edited afterwards, is not;
 *   - a reviewed event can be excluded, with a reason;
 *   - names whose numbers differ need the difference acknowledged and explained;
 *   - a new decision replaces the current one, which stays in the history.
 *
 * The server enforces every rule; this panel only collects the decision. A decision changes no
 * record and adds nothing to the plan.
 */

import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Flex,
  Stack,
  Text,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCard,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { useDecideMaterialIdentityMutation, useGetMaterialIdentitiesQuery } from 'store/api/ospApi';
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

// `stale` needs attention: the theme's `warning` variant, never an amber colour scheme (an amber
// tint pill is 2.63:1; review of app #69).
const STATE_SCHEME: Record<string, string> = {
  covered: 'green',
  unreviewed: 'gray',
  excepted: 'purple'
};

/** Slice 3: what is worth a look, said as a prompt. No control here fills in a decision. */
const Suggestions: React.FC<{ items: MaterialIdentitySuggestion[] }> = ({ items }) => {
  const intl = useIntl();
  const muted = useColorModeValue('gray.600', 'gray.400');
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
          question: `${s.module} / ${s.question}`,
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
    <Box mt={2} data-testid="identity-suggestions">
      <Text fontSize="xs" color={muted}>
        {intl.formatMessage({
          id: 'osp.identity.suggest.title',
          defaultMessage: 'Worth a look. Suggestions decide nothing and clear nothing.'
        })}
      </Text>
      {items.map((s, i) => (
        <Text key={i} fontSize="sm" data-testid="identity-suggestion">
          {line(s)}
        </Text>
      ))}
    </Box>
  );
};

const IdentityRow: React.FC<{
  identity: MaterialIdentity;
  targets: MaterialIdentityTarget[];
  scope: { companyId: string; farmId: string; ospId: string | number };
  editable: boolean;
}> = ({ identity, targets, scope, editable }) => {
  const intl = useIntl();
  const toast = useToast();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const [decide, { isLoading }] = useDecideMaterialIdentityMutation();

  const [decision, setDecision] = useState<'' | 'same_as' | 'different_product'>('');
  const [targetKey, setTargetKey] = useState('');
  const [reviewed, setReviewed] = useState<Record<number, boolean>>({});
  const [excluded, setExcluded] = useState<Record<number, string>>({});
  const [ack, setAck] = useState(false);
  const [formulationNote, setFormulationNote] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const target = targets.find((t) => `${t.kind}:${t.id}` === targetKey);
  const needsAck =
    decision === 'same_as' && !!target && formulationDiffers(identity.logged_name, target.name);
  const reviewedIds = identity.events.filter((e) => reviewed[e.id]).map((e) => e.id);

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
            .filter((id) => (excluded[id] || '').trim())
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
    } catch (err: any) {
      const message = apiErrorMessage(err) ?? String(err?.message || err);
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.identity.failed',
          defaultMessage: 'The decision was not recorded'
        }),
        description: message,
        duration: 8000,
        isClosable: true
      });
    }
  };

  const canSubmit =
    editable &&
    !!decision &&
    reviewedIds.length > 0 &&
    (decision === 'different_product' || !!target) &&
    (!needsAck || (ack && formulationNote.trim().length > 0));

  return (
    <Box borderWidth="1px" borderRadius="md" p={3} data-testid="material-identity-row">
      <Text fontWeight="semibold">{identity.logged_name}</Text>
      <Text fontSize="sm" color={muted}>
        {identity.current
          ? identity.current.basis
          : intl.formatMessage({
              id: 'osp.identity.unconfirmed',
              defaultMessage: 'Not on the plan, and not identified yet.'
            })}
      </Text>
      {!identity.current ? <Suggestions items={identity.suggestions ?? []} /> : null}
      <Stack spacing={1} mt={2}>
        {identity.events.map((event) => (
          <Flex key={event.id} gap={3} align="center" wrap="wrap">
            <Checkbox
              isDisabled={!editable}
              isChecked={!!reviewed[event.id]}
              onChange={(e) => setReviewed((r) => ({ ...r, [event.id]: e.target.checked }))}>
              <Text fontSize="sm">{event.date ? event.date.slice(0, 10) : `#${event.id}`}</Text>
            </Checkbox>
            <Badge
              {...(event.state === 'stale'
                ? { variant: 'warning' }
                : { colorScheme: STATE_SCHEME[event.state] || 'gray' })}
              data-state={event.state}>
              {intl.formatMessage({ id: `osp.identity.state.${event.state}` })}
            </Badge>
            {reviewed[event.id] ? (
              <StandardInput
                size="sm"
                maxW="280px"
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
          </Flex>
        ))}
      </Stack>
      {editable ? (
        <Stack spacing={2} mt={3}>
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
            <Box data-testid="formulation-ack">
              <Text fontSize="sm" color="amber.800">
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
                mt={1}
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
          <StandardButton size="sm" isDisabled={!canSubmit} isLoading={isLoading} onClick={submit}>
            {intl.formatMessage({
              id: 'osp.identity.record',
              defaultMessage: 'Record this decision'
            })}
          </StandardButton>
        </Stack>
      ) : null}
      {identity.history.length ? (
        <Box mt={2}>
          <StandardButton size="xs" variant="ghost" onClick={() => setShowHistory((v) => !v)}>
            {intl.formatMessage(
              { id: 'osp.identity.history', defaultMessage: 'History ({count})' },
              { count: identity.history.length }
            )}
          </StandardButton>
          {showHistory
            ? identity.history.map((d) => (
                <Text key={d.id} fontSize="xs" color={muted} data-testid="identity-history-entry">
                  {d.basis}
                  {d.superseded_at
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
  );
};

const OSPMaterialIdentityPanel: React.FC<Props> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const { data } = useGetMaterialIdentitiesQuery({ companyId, farmId, ospId: osp.id });
  const editable = osp.status === 'draft' || osp.status === 'active';
  const identities = useMemo(() => data?.identities ?? [], [data]);
  if (!identities.length) return null;
  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'osp.identity.title',
        defaultMessage: 'Logged names not on the plan'
      })}>
      <Text fontSize="sm" mb={3}>
        {intl.formatMessage({
          id: 'osp.identity.intro',
          defaultMessage:
            'Trazo never decides that two names are one product. For each name below, say what it is for the events you have checked. A decision changes no record and adds nothing to the plan.'
        })}
      </Text>
      <Stack spacing={3}>
        {identities.map((identity) => (
          <IdentityRow
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
