/**
 * How each restriction on a plan material is met, in the operator's words (OSP alignment T18,
 * Phase 5 slice 2b). WSDA AGR 2196 and CCOF's Materials Application ask it per material.
 *
 *   - A statement belongs to one material, this plan version and one identified restriction.
 *   - The restriction is either regulation wording Trazo holds (a § 205.602 condition of use) or
 *     wording the operator copies from its source, which prints as not verified by Trazo.
 *   - "How it is met" is the operator's statement, never a compliance result.
 *   - No restriction on record reads "restriction not documented", never "no restrictions".
 *   - A change of answer replaces the current statement; a statement entered by mistake (a mistyped
 *     restriction) is withdrawn with a reason. Both stay in the history.
 *
 * Layout (browser test, 2026-10-03): one collapsed row per material with its status; the form
 * opens only on "Add a restriction" or "Update how you meet it".
 *
 * The server enforces every rule. A statement approves nothing and clears no finding.
 */

import React, { useState } from 'react';
import {
  Badge,
  Box,
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
  useGetMaterialRestrictionsQuery,
  useRecordRestrictionStatementMutation,
  useWithdrawRestrictionStatementMutation
} from 'store/api/ospApi';
import type {
  RestrictionDocType,
  RestrictionMaterial,
  RestrictionSource,
  RestrictionStatement
} from 'types/osp';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface Props {
  companyId: string;
  farmId: string;
  osp: { id: string | number; status?: string };
}

const DOC_TYPES: RestrictionDocType[] = [
  'product_label',
  'omri_listing',
  'wsda_listing',
  'certifier_letter',
  'other'
];

type Status = 'not_documented' | 'held' | 'recorded' | 'needs_review' | 'earlier_version';

export const restrictionStatus = (material: RestrictionMaterial): Status => {
  if (material.statements.some((s) => s.state === 'needs_review')) return 'needs_review';
  if (material.statements.length) return 'recorded';
  if ((material.earlier_versions || []).length) return 'earlier_version';
  if (material.regulation_restriction) return 'held';
  return 'not_documented';
};

const STATUS_BADGE: Record<Status, Record<string, string>> = {
  not_documented: { variant: 'neutral' },
  held: { variant: 'warning' },
  recorded: { variant: 'subtle', colorScheme: 'green' },
  needs_review: { variant: 'warning' },
  earlier_version: { variant: 'warning' }
};

const shortDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

const StatementCard: React.FC<{
  statement: RestrictionStatement;
  editable: boolean;
  onReplace: () => void;
  scope: { companyId: string; farmId: string; ospId: string | number };
}> = ({ statement, editable, onReplace, scope }) => {
  const intl = useIntl();
  const toast = useToast();
  const [withdrawing, setWithdrawing] = useState(false);
  const [reason, setReason] = useState('');
  const [withdraw, { isLoading }] = useWithdrawRestrictionStatementMutation();

  const confirm = async () => {
    try {
      await withdraw({
        ...scope,
        body: { withdraw: statement.id, reason: reason.trim() }
      }).unwrap();
      setWithdrawing(false);
      setReason('');
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.restriction.ux.withdrawn',
          defaultMessage: 'Statement withdrawn'
        }),
        duration: 3000
      });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.restriction.ux.withdrawFailed',
          defaultMessage: 'The statement was not withdrawn'
        }),
        description: apiErrorMessage(err) ?? String(err?.message || err),
        duration: 8000,
        isClosable: true
      });
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="md" p={3} data-testid="restriction-statement">
      {statement.state === 'needs_review' ? (
        <Badge variant="warning" mb={2}>
          {intl.formatMessage({
            id: 'osp.restriction.needsReview',
            defaultMessage: 'Changed since stated: review'
          })}
        </Badge>
      ) : null}
      {statement.printed.map((line) => (
        <Text key={line} fontSize="sm" mb={1}>
          {line}
        </Text>
      ))}
      {editable && !withdrawing ? (
        <Flex gap={2} mt={2} wrap="wrap">
          <StandardButton size="sm" variant="outline" onClick={onReplace}>
            {intl.formatMessage({
              id: 'osp.restriction.ux.update',
              defaultMessage: 'Update how you meet it'
            })}
          </StandardButton>
          <StandardButton size="sm" variant="ghost" onClick={() => setWithdrawing(true)}>
            {intl.formatMessage({ id: 'osp.restriction.ux.withdraw', defaultMessage: 'Withdraw' })}
          </StandardButton>
        </Flex>
      ) : null}
      {withdrawing ? (
        <Stack spacing={2} mt={3} data-testid="restriction-withdraw">
          <Text fontSize="sm">
            {intl.formatMessage({
              id: 'osp.restriction.ux.withdrawExplain',
              defaultMessage:
                'Use this for a statement entered by mistake, such as a restriction copied wrongly. It is closed and kept in the history, and no longer prints.'
            })}
          </Text>
          <StandardInput
            size="sm"
            placeholder={intl.formatMessage({
              id: 'osp.restriction.ux.withdrawReason',
              defaultMessage: 'Why you are withdrawing it'
            })}
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
          />
          <Flex gap={2} wrap="wrap">
            <StandardButton
              size="sm"
              isDisabled={!reason.trim()}
              isLoading={isLoading}
              onClick={confirm}>
              {intl.formatMessage({
                id: 'osp.restriction.ux.confirmWithdraw',
                defaultMessage: 'Withdraw this statement'
              })}
            </StandardButton>
            <StandardButton size="sm" variant="ghost" onClick={() => setWithdrawing(false)}>
              {intl.formatMessage({ id: 'osp.restriction.cancel', defaultMessage: 'Cancel' })}
            </StandardButton>
          </Flex>
        </Stack>
      ) : null}
    </Box>
  );
};

const MaterialItem: React.FC<{
  material: RestrictionMaterial;
  scope: { companyId: string; farmId: string; ospId: string | number };
  editable: boolean;
}> = ({ material, scope, editable }) => {
  const intl = useIntl();
  const toast = useToast();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const headerHover = useColorModeValue('gray.50', 'gray.700');
  const [record, { isLoading }] = useRecordRestrictionStatementMutation();

  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [source, setSource] = useState<'' | RestrictionSource>('');
  const [text, setText] = useState('');
  const [docType, setDocType] = useState<'' | RestrictionDocType>('');
  const [identifier, setIdentifier] = useState('');
  const [locator, setLocator] = useState('');
  const [reference, setReference] = useState('');
  const [howMet, setHowMet] = useState('');
  const [replacing, setReplacing] = useState<RestrictionStatement | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const status = restrictionStatus(material);

  const reset = () => {
    setFormOpen(false);
    setSource('');
    setText('');
    setDocType('');
    setIdentifier('');
    setLocator('');
    setReference('');
    setHowMet('');
    setReplacing(null);
  };

  // Restating an earlier version's statement copies its restriction, never its answer, and
  // supersedes nothing: that statement belongs to its own plan version.
  const startRestate = (statement: RestrictionStatement) => {
    setReplacing(null);
    setSource(statement.restriction_source);
    setText(
      statement.restriction_source === 'operator_transcribed' ? statement.restriction_text : ''
    );
    setDocType(statement.source_type || '');
    setIdentifier(statement.source_identifier);
    setLocator(statement.source_locator);
    setReference(statement.source_reference);
    setHowMet('');
    setFormOpen(true);
  };

  const startReplace = (statement: RestrictionStatement) => {
    setReplacing(statement);
    setSource(statement.restriction_source);
    setText(
      statement.restriction_source === 'operator_transcribed' ? statement.restriction_text : ''
    );
    setDocType(statement.source_type || '');
    setIdentifier(statement.source_identifier);
    setLocator(statement.source_locator);
    setReference(statement.source_reference);
    setHowMet('');
    setFormOpen(true);
  };

  const submit = async () => {
    try {
      await record({
        ...scope,
        body: {
          material_kind: material.material_kind,
          material_id: material.material_id,
          restriction_source: source as RestrictionSource,
          ...(source === 'operator_transcribed'
            ? {
                restriction_text: text,
                source_type: docType as RestrictionDocType,
                source_identifier: identifier,
                source_locator: locator,
                source_reference: reference
              }
            : {}),
          how_met: howMet,
          ...(replacing ? { supersedes: replacing.id } : {})
        }
      }).unwrap();
      reset();
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.restriction.saved',
          defaultMessage: 'Statement recorded'
        }),
        duration: 3000
      });
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.restriction.failed',
          defaultMessage: 'The statement was not recorded'
        }),
        description: apiErrorMessage(err) ?? String(err?.message || err),
        duration: 8000,
        isClosable: true
      });
    }
  };

  const canSubmit =
    editable &&
    !!source &&
    howMet.trim().length > 0 &&
    (source === 'regulation' || (text.trim().length > 0 && !!docType));

  return (
    <Box borderWidth="1px" borderRadius="lg" data-testid="restriction-material">
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
        <Text fontWeight="semibold" minW={0} flex="1 1 220px" wordBreak="break-word">
          {material.material_name}
        </Text>
        <Flex align="center" gap={2} flexShrink={0} ml="auto">
          <Badge {...STATUS_BADGE[status]} flexShrink={0} data-status={status}>
            {intl.formatMessage(
              { id: `osp.restriction.ux.status.${status}` },
              { count: material.statements.length }
            )}
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
        <Stack spacing={3} px={4} pb={4}>
          {status === 'not_documented' ? (
            <Text fontSize="sm" color={muted}>
              {intl.formatMessage({
                id: 'osp.restriction.ux.notDocumentedHelp',
                defaultMessage:
                  "Restriction not documented in Trazo. If this material's label, listing or a certifier letter states one, add it here."
              })}
            </Text>
          ) : null}
          {material.regulation_restriction ? (
            <Text fontSize="sm">
              {intl.formatMessage(
                {
                  id: 'osp.restriction.held',
                  defaultMessage:
                    '{citation} (regulation wording held by Trazo): "{text}" Whether it applies to this material and use is not established by Trazo.'
                },
                material.regulation_restriction
              )}
            </Text>
          ) : null}
          {material.statements.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              editable={editable}
              scope={scope}
              onReplace={() => startReplace(statement)}
            />
          ))}
          {material.statements.length === 0 && (material.earlier_versions || []).length ? (
            <Stack spacing={2}>
              {material.earlier_versions.map((statement) => (
                <Box
                  key={statement.id}
                  data-testid="restriction-earlier"
                  borderWidth="1px"
                  borderRadius="md"
                  p={3}>
                  <Badge variant="warning" mb={1}>
                    {intl.formatMessage(
                      {
                        id: 'osp.restriction.earlierVersion',
                        defaultMessage:
                          'Stated on plan version {version}: state it again for this one'
                      },
                      { version: statement.plan_version ?? '?' }
                    )}
                  </Badge>
                  {statement.printed.map((line) => (
                    <Text key={line} fontSize="sm" color={muted}>
                      {line}
                    </Text>
                  ))}
                  {editable ? (
                    <StandardButton
                      size="sm"
                      variant="ghost"
                      mt={1}
                      onClick={() => startRestate(statement)}>
                      {intl.formatMessage({
                        id: 'osp.restriction.restate',
                        defaultMessage: 'Start from this restriction'
                      })}
                    </StandardButton>
                  ) : null}
                </Box>
              ))}
            </Stack>
          ) : null}
          {editable && !formOpen ? (
            <Box>
              <StandardButton size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                {material.statements.length
                  ? intl.formatMessage({
                      id: 'osp.restriction.ux.addAnother',
                      defaultMessage: 'Add another restriction'
                    })
                  : intl.formatMessage({
                      id: 'osp.restriction.ux.add',
                      defaultMessage: 'Add a restriction'
                    })}
              </StandardButton>
            </Box>
          ) : null}
          {editable && formOpen ? (
            <Stack
              spacing={2}
              borderWidth="1px"
              borderRadius="md"
              p={3}
              data-testid="restriction-form">
              <Text fontWeight="semibold" fontSize="sm">
                {replacing
                  ? intl.formatMessage({
                      id: 'osp.restriction.ux.updateTitle',
                      defaultMessage: 'Update how you meet this restriction'
                    })
                  : intl.formatMessage({
                      id: 'osp.restriction.ux.add',
                      defaultMessage: 'Add a restriction'
                    })}
              </Text>
              <StandardSelect
                size="sm"
                aria-label={intl.formatMessage({
                  id: 'osp.restriction.source',
                  defaultMessage: 'Where the restriction comes from'
                })}
                isDisabled={!!replacing}
                value={source}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSource(e.target.value as '' | RestrictionSource)
                }>
                <option value="">
                  {intl.formatMessage({
                    id: 'osp.restriction.chooseSource',
                    defaultMessage: 'Choose where the restriction comes from'
                  })}
                </option>
                {material.regulation_restriction ? (
                  <option value="regulation">
                    {intl.formatMessage({
                      id: 'osp.restriction.sourceRegulation',
                      defaultMessage: 'The regulation wording above'
                    })}
                  </option>
                ) : null}
                <option value="operator_transcribed">
                  {intl.formatMessage({
                    id: 'osp.restriction.sourceTranscribed',
                    defaultMessage: 'Copied from a label, listing or letter'
                  })}
                </option>
              </StandardSelect>
              {source === 'operator_transcribed' ? (
                <>
                  <StandardTextarea
                    size="sm"
                    rows={2}
                    isDisabled={!!replacing}
                    placeholder={intl.formatMessage({
                      id: 'osp.restriction.text',
                      defaultMessage: 'The restriction, word for word'
                    })}
                    value={text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setText(e.target.value)
                    }
                  />
                  <Text fontSize="xs" color={muted}>
                    {intl.formatMessage({
                      id: 'osp.restriction.transcribedNote',
                      defaultMessage:
                        'Printed as transcribed by you and not independently verified by Trazo.'
                    })}
                  </Text>
                  {replacing ? (
                    <Text fontSize="xs" color={muted}>
                      {intl.formatMessage({
                        id: 'osp.restriction.ux.lockedHint',
                        defaultMessage:
                          'The restriction stays as recorded. If it was copied wrongly, withdraw the statement and add it again.'
                      })}
                    </Text>
                  ) : null}
                  <StandardSelect
                    size="sm"
                    aria-label={intl.formatMessage({
                      id: 'osp.restriction.docType',
                      defaultMessage: 'Kind of source'
                    })}
                    isDisabled={!!replacing}
                    value={docType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setDocType(e.target.value as '' | RestrictionDocType)
                    }>
                    <option value="">
                      {intl.formatMessage({
                        id: 'osp.restriction.chooseDocType',
                        defaultMessage: 'Choose the kind of source'
                      })}
                    </option>
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {intl.formatMessage({ id: `osp.restriction.doc.${t}` })}
                      </option>
                    ))}
                  </StandardSelect>
                  <StandardInput
                    size="sm"
                    isDisabled={!!replacing}
                    placeholder={intl.formatMessage({
                      id: 'osp.restriction.identifier',
                      defaultMessage: 'Document or product identifier (optional)'
                    })}
                    value={identifier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIdentifier(e.target.value)
                    }
                  />
                  <StandardInput
                    size="sm"
                    isDisabled={!!replacing}
                    placeholder={intl.formatMessage({
                      id: 'osp.restriction.locator',
                      defaultMessage: 'Page or section (optional)'
                    })}
                    value={locator}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocator(e.target.value)
                    }
                  />
                  <StandardInput
                    size="sm"
                    placeholder={intl.formatMessage({
                      id: 'osp.restriction.reference',
                      defaultMessage: 'Where the document is kept, or a link (optional)'
                    })}
                    value={reference}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReference(e.target.value)
                    }
                  />
                </>
              ) : null}
              {source ? (
                <StandardTextarea
                  size="sm"
                  rows={2}
                  placeholder={intl.formatMessage({
                    id: 'osp.restriction.howMet',
                    defaultMessage: 'How you meet this restriction'
                  })}
                  value={howMet}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setHowMet(e.target.value)
                  }
                />
              ) : null}
              {replacing ? (
                <Text fontSize="xs" color={muted}>
                  {intl.formatMessage({
                    id: 'osp.restriction.replaces',
                    defaultMessage:
                      'This replaces the current statement. The current one stays in the history.'
                  })}
                </Text>
              ) : null}
              <Flex gap={2} wrap="wrap">
                <StandardButton
                  size="sm"
                  isDisabled={!canSubmit}
                  isLoading={isLoading}
                  onClick={submit}>
                  {intl.formatMessage({
                    id: 'osp.restriction.record',
                    defaultMessage: 'Record this statement'
                  })}
                </StandardButton>
                <StandardButton size="sm" variant="ghost" onClick={reset}>
                  {intl.formatMessage({ id: 'osp.restriction.cancel', defaultMessage: 'Cancel' })}
                </StandardButton>
              </Flex>
            </Stack>
          ) : null}
          {material.history.length > material.statements.length ? (
            <Box>
              <StandardButton size="xs" variant="ghost" onClick={() => setShowHistory((v) => !v)}>
                {intl.formatMessage(
                  { id: 'osp.restriction.history', defaultMessage: 'History ({count})' },
                  { count: material.history.length }
                )}
              </StandardButton>
              {showHistory
                ? material.history.map((s) => (
                    <Text
                      key={s.id}
                      fontSize="xs"
                      color={muted}
                      data-testid="restriction-history-entry"
                      mt={2}
                      pl={3}
                      borderLeftWidth="2px">
                      {s.printed.join(' ')}
                      {s.withdrawn_at
                        ? ` ${intl.formatMessage(
                            {
                              id: 'osp.restriction.ux.withdrawnLine',
                              defaultMessage: '(withdrawn on {date} by {who}: {reason})'
                            },
                            {
                              date: shortDate(s.withdrawn_at),
                              who: s.withdrawn_by_name || '-',
                              reason: s.withdrawal_reason
                            }
                          )}`
                        : s.superseded_at
                        ? ` ${intl.formatMessage({
                            id: 'osp.restriction.superseded',
                            defaultMessage: '(replaced)'
                          })}`
                        : ''}
                    </Text>
                  ))
                : null}
            </Box>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
};

const OSPMaterialRestrictionsPanel: React.FC<Props> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const { data } = useGetMaterialRestrictionsQuery({ companyId, farmId, ospId: osp.id });
  const editable = osp.status === 'draft' || osp.status === 'active';
  const materials = data?.materials ?? [];
  if (!materials.length) return null;
  const recorded = materials.filter((m) => m.statements.length > 0).length;
  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'osp.restriction.title',
        defaultMessage: 'Restrictions on plan materials'
      })}>
      <Text fontSize="sm" mb={1}>
        {intl.formatMessage({
          id: 'osp.restriction.intro',
          defaultMessage:
            'For each restriction, say how you meet it. Your answer prints as your statement, not as a compliance finding, and approves nothing.'
        })}
      </Text>
      <Text fontSize="sm" color={muted} mb={3} data-testid="restriction-summary-line">
        {intl.formatMessage(
          {
            id: 'osp.restriction.ux.summary',
            defaultMessage:
              '{total, plural, one {# plan material} other {# plan materials}} · {recorded} with a restriction recorded'
          },
          { total: materials.length, recorded }
        )}
      </Text>
      <Stack spacing={2}>
        {materials.map((material) => (
          <MaterialItem
            key={`${material.material_kind}:${material.material_id}`}
            material={material}
            scope={{ companyId, farmId, ospId: osp.id }}
            editable={editable}
          />
        ))}
      </Stack>
    </StandardCard>
  );
};

export default OSPMaterialRestrictionsPanel;
