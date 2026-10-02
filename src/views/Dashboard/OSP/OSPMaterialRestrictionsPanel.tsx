/**
 * How each restriction on a plan material is met, in the operator's words (OSP alignment T18,
 * Phase 5 slice 2b). WSDA AGR 2196 and CCOF's Materials Application ask it per material.
 *
 *   - A statement belongs to one material, this plan version and one identified restriction.
 *   - The restriction is either regulation wording Trazo holds (a § 205.602 condition of use) or
 *     wording the operator copies from its source, which prints as not verified by Trazo.
 *   - "How it is met" is the operator's statement, never a compliance result.
 *   - No restriction on record reads "restriction not documented", never "no restrictions".
 *   - A change replaces the current statement, which stays in the history.
 *
 * The server enforces every rule. A statement approves nothing and clears no finding.
 */

import React, { useState } from 'react';
import { Badge, Box, Stack, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCard,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  useGetMaterialRestrictionsQuery,
  useRecordRestrictionStatementMutation
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

const MaterialRow: React.FC<{
  material: RestrictionMaterial;
  scope: { companyId: string; farmId: string; ospId: string | number };
  editable: boolean;
}> = ({ material, scope, editable }) => {
  const intl = useIntl();
  const toast = useToast();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const [record, { isLoading }] = useRecordRestrictionStatementMutation();

  const [source, setSource] = useState<'' | RestrictionSource>('');
  const [text, setText] = useState('');
  const [docType, setDocType] = useState<'' | RestrictionDocType>('');
  const [identifier, setIdentifier] = useState('');
  const [locator, setLocator] = useState('');
  const [reference, setReference] = useState('');
  const [howMet, setHowMet] = useState('');
  const [replacing, setReplacing] = useState<RestrictionStatement | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const reset = () => {
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
    <Box borderWidth="1px" borderRadius="md" p={3} data-testid="restriction-material">
      <Text fontWeight="semibold">{material.material_name}</Text>
      {material.statements.length === 0 && !material.regulation_restriction ? (
        <Text fontSize="sm" color={muted}>
          {intl.formatMessage({
            id: 'osp.restriction.notDocumented',
            defaultMessage: 'Restriction not documented in Trazo.'
          })}
        </Text>
      ) : null}
      {material.regulation_restriction ? (
        <Text fontSize="sm" mt={1}>
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
      <Stack spacing={2} mt={2}>
        {material.statements.map((statement) => (
          <Box key={statement.id} data-testid="restriction-statement">
            {statement.state === 'needs_review' ? (
              <Badge variant="warning" mb={1}>
                {intl.formatMessage({
                  id: 'osp.restriction.needsReview',
                  defaultMessage: 'Changed since stated: review'
                })}
              </Badge>
            ) : null}
            {statement.printed.map((line) => (
              <Text key={line} fontSize="sm">
                {line}
              </Text>
            ))}
            {editable ? (
              <StandardButton size="xs" variant="ghost" onClick={() => startReplace(statement)}>
                {intl.formatMessage({ id: 'osp.restriction.replace', defaultMessage: 'Replace' })}
              </StandardButton>
            ) : null}
          </Box>
        ))}
      </Stack>
      {material.statements.length === 0 && (material.earlier_versions || []).length ? (
        <Stack spacing={1} mt={2}>
          {material.earlier_versions.map((statement) => (
            <Box key={statement.id} data-testid="restriction-earlier">
              <Badge variant="warning" mb={1}>
                {intl.formatMessage(
                  {
                    id: 'osp.restriction.earlierVersion',
                    defaultMessage: 'Stated on plan version {version}: state it again for this one'
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
                <StandardButton size="xs" variant="ghost" onClick={() => startRestate(statement)}>
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
      {editable ? (
        <Stack spacing={2} mt={3}>
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
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              />
              <Text fontSize="xs" color={muted}>
                {intl.formatMessage({
                  id: 'osp.restriction.transcribedNote',
                  defaultMessage:
                    'Printed as transcribed by you and not independently verified by Trazo.'
                })}
              </Text>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
              />
              <StandardInput
                size="sm"
                isDisabled={!!replacing}
                placeholder={intl.formatMessage({
                  id: 'osp.restriction.locator',
                  defaultMessage: 'Page or section (optional)'
                })}
                value={locator}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocator(e.target.value)}
              />
              <StandardInput
                size="sm"
                placeholder={intl.formatMessage({
                  id: 'osp.restriction.reference',
                  defaultMessage: 'Where the document is kept, or a link (optional)'
                })}
                value={reference}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
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
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHowMet(e.target.value)}
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
          <Box>
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
            {replacing ? (
              <StandardButton size="sm" variant="ghost" ml={2} onClick={reset}>
                {intl.formatMessage({ id: 'osp.restriction.cancel', defaultMessage: 'Cancel' })}
              </StandardButton>
            ) : null}
          </Box>
        </Stack>
      ) : null}
      {material.history.length > material.statements.length ? (
        <Box mt={2}>
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
                  data-testid="restriction-history-entry">
                  {s.printed.join(' ')}
                  {s.superseded_at
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
    </Box>
  );
};

const OSPMaterialRestrictionsPanel: React.FC<Props> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const { data } = useGetMaterialRestrictionsQuery({ companyId, farmId, ospId: osp.id });
  const editable = osp.status === 'draft' || osp.status === 'active';
  const materials = data?.materials ?? [];
  if (!materials.length) return null;
  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'osp.restriction.title',
        defaultMessage: 'Restrictions on plan materials'
      })}>
      <Text fontSize="sm" mb={3}>
        {intl.formatMessage({
          id: 'osp.restriction.intro',
          defaultMessage:
            'For each restriction, say how you meet it. Your answer prints as your statement, not as a compliance finding, and approves nothing.'
        })}
      </Text>
      <Stack spacing={3}>
        {materials.map((material) => (
          <MaterialRow
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
