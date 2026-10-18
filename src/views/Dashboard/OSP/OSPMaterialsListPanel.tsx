/**
 * The Materials List attachment, as rows the operator can finish.
 *
 * WHY (2026-09-07): the Common OSP Materials List asks four things per product — name,
 * manufacturer, reason for use, and whether it is IN USE or INTENDED for use. A catalog listing
 * answers the first and none of the other three: it says a product is allowed, never that this
 * operation uses it or why. So an operation whose materials came from OMRI, WSDA or the National
 * List generated an attachment with three empty columns on every row, the § 11 attachments panel
 * counted them ("47 cells to fill in Trazo"), and there was nowhere in Trazo to fill them. A
 * number with no destination reads to a farmer as a fault in their own data.
 *
 * The rows come from the same reading the generated workbook uses (`materials_list_rows` ->
 * `_material_rows`), so this editor and the attachment cannot disagree about which cells are
 * blank — which is the entire point of it.
 *
 * ⛔ Nothing here is prefilled from a guess. A material with no stated use leaves BOTH USDA
 * checkboxes empty, because "in use" and "intended for use" are different claims and neither is
 * a default; the operator picks one. Same rule as the § 11 registry next door.
 */

import React from 'react';
import { Badge, Box, Flex, Stack, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { StandardCard, StandardInput, StandardSelect } from 'components/Design/StandardComponents';
import { useAnswerOSPMaterialMutation, useGetOSPMaterialsListQuery } from 'store/api/ospApi';
import type { OSPMaterialListRow } from 'types/osp';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface Props {
  companyId: string;
  farmId: string;
  osp: { id: string | number; status?: string };
}

const OSPMaterialsListPanel: React.FC<Props> = ({ companyId, farmId, osp }) => {
  const intl = useIntl();
  const toast = useToast();
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const { data } = useGetOSPMaterialsListQuery({ companyId, farmId, ospId: osp.id });
  const [answerMaterial] = useAnswerOSPMaterialMutation();

  const rows: OSPMaterialListRow[] = data?.materials ?? [];
  const isEditable = osp.status === 'draft' || osp.status === 'active';

  // The two TEXT fields are UNCONTROLLED, keyed on the server value they were rendered from.
  //
  // Typing must not be a save: a keystroke-per-request editor on a 19-row regulatory list is
  // both a write storm and a half-typed reason landing in a certifier packet. The first version
  // of this held a `drafts` map instead — and once a row was seeded it was never re-read, so the
  // comment claiming the server was the source of truth described behaviour the code did not
  // have. An uncontrolled input keyed on the server value needs no such claim: while the value
  // is unchanged the DOM keeps whatever was typed, and when it changes React remounts the field
  // with the new one. A failed save leaves the operator's words on screen next to the error,
  // which is the right place for them.

  const save = async (row: OSPMaterialListRow, body: Record<string, string>) => {
    try {
      await answerMaterial({
        companyId,
        farmId,
        ospId: osp.id,
        body: { name: row.name, ...body }
      }).unwrap();
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.materialsList.saveFailed',
          defaultMessage: 'Could not save that answer'
        }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' }),
        duration: 6000,
        isClosable: true
      });
    }
  };

  if (rows.length === 0) return null;

  const unanswered = rows.filter((row) => !row.in_use && !row.intended_for_use).length;

  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'osp.materialsList.title',
        defaultMessage: 'Materials List — your answers'
      })}
      subtitle={intl.formatMessage({
        id: 'osp.materialsList.subtitle',
        defaultMessage:
          'Every material on this plan or in your records. A listing says a product is allowed; only you can say why you use it and whether you use it now. These three answers are the blank columns on the Materials List attachment in your packet.'
      })}>
      <Stack spacing={3}>
        {unanswered > 0 && (
          <Text fontSize="xs" color={mutedColor}>
            {intl.formatMessage(
              {
                id: 'osp.materialsList.remaining',
                defaultMessage:
                  '{count, plural, one {# material has no use stated yet} other {# materials have no use stated yet}}'
              },
              { count: unanswered }
            )}
          </Text>
        )}

        {rows.map((row) => (
          <Box
            key={row.name}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="md"
            px={3}
            py={2}>
            <Flex align="baseline" gap={2} wrap="wrap" mb={2}>
              <Text fontSize="sm" fontWeight="semibold">
                {row.name}
              </Text>
              {/* A material found in the records but not declared on the plan is the finding
                    the plan review reports; answering here is how the operator resolves it, so
                    the row says which case it is rather than leaving them to work it out.
                    ⛔ Semantic VARIANTS, not a colorScheme: green would give "on the plan" the
                    weight of an approval, and being on the plan is a fact, not one. `warning`
                    marks the only row with something outstanding. */}
              <Badge
                variant={row.source === 'records' ? 'warning' : 'neutral'}
                fontSize="11px"
                textTransform="none">
                {intl.formatMessage({ id: `osp.materialsList.source.${row.source}` })}
              </Badge>
              {row.listing && (
                <Text fontSize="xs" color={mutedColor}>
                  {row.listing}
                </Text>
              )}
            </Flex>

            <Stack direction={{ base: 'column', md: 'row' }} spacing={2}>
              <StandardSelect
                size="sm"
                maxW={{ base: 'full', md: '220px' }}
                isDisabled={!isEditable}
                value={row.status}
                aria-label={String(
                  intl.formatMessage({ id: 'osp.materialsList.useAria' }, { name: row.name })
                )}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) save(row, { status: value });
                }}>
                {/* Only shown while nothing has been said. It is not an option the operator
                      can choose: the form's two boxes are different claims, and "neither" is
                      what a blank row already means. */}
                {!row.status && (
                  <option value="">
                    {intl.formatMessage({ id: 'osp.materialsList.use.unstated' })}
                  </option>
                )}
                <option value="in_use">
                  {intl.formatMessage({ id: 'osp.materialsList.use.inUse' })}
                </option>
                <option value="planned">
                  {intl.formatMessage({ id: 'osp.materialsList.use.planned' })}
                </option>
              </StandardSelect>

              <StandardInput
                key={`reason:${row.reason}`}
                size="sm"
                isDisabled={!isEditable}
                defaultValue={row.reason}
                placeholder={intl.formatMessage({ id: 'osp.materialsList.reasonPlaceholder' })}
                aria-label={String(
                  intl.formatMessage({ id: 'osp.materialsList.reasonAria' }, { name: row.name })
                )}
                // ⛔ Only on CHANGE. Blurring a field the operator merely tabbed through must
                // author nothing: the reason on screen may be one Trazo DERIVED from the event
                // type, and writing it back would turn a derivation into the operator's own
                // words without them typing a character.
                onBlur={(e) => {
                  if (e.target.value !== row.reason) {
                    save(row, { reason_for_use: e.target.value });
                  }
                }}
              />

              <StandardInput
                key={`manufacturer:${row.manufacturer}`}
                size="sm"
                isDisabled={!isEditable}
                defaultValue={row.manufacturer}
                placeholder={intl.formatMessage({
                  id: 'osp.materialsList.manufacturerPlaceholder'
                })}
                aria-label={String(
                  intl.formatMessage(
                    { id: 'osp.materialsList.manufacturerAria' },
                    { name: row.name }
                  )
                )}
                onBlur={(e) => {
                  if (e.target.value !== row.manufacturer) {
                    save(row, { manufacturer: e.target.value });
                  }
                }}
              />
            </Stack>
          </Box>
        ))}
      </Stack>
    </StandardCard>
  );
};

export default OSPMaterialsListPanel;
