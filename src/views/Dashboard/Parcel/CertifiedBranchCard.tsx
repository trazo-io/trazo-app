/**
 * What the selected certifier's own form asks of a currently certified parcel, and what is on file.
 *
 * OSP alignment audit T21-F1. The parcel page used to demand a declaration the form skips for a
 * certified parcel ("the operator has made no declaration"). The backend now follows each agent's
 * route (`certifications/services/certified_parcel_branch.py`) and reports every item as attached,
 * referenced separately or missing. This card renders that same assessment, from codes rather than
 * the server's English, so the wizard and the PDF cannot disagree.
 *
 * Availability, never acceptance: nothing here says "verified" or "eligible". The operator's
 * no-lapse checkbox is shown as their statement and never fills the continuity item.
 */
import React, { useRef } from 'react';
import { Box, Stack, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { StandardButton } from 'components/Design/StandardComponents';
import type { CertifiedBranch } from 'store/api/parcelApplicationApi';
import baseApi from 'store/api/baseApi';
import { useGetFarmDocumentsQuery, useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

/** Byte-identical to `CERTIFICATE_SECTION` / `CONTINUITY_SECTION` in trazo-back
 * `certifications/services/certified_parcel_branch.py`; the packet reads these exact strings. */
export const CERTIFICATE_SECTION = 'parcel_application_certificate';
export const CONTINUITY_SECTION = 'parcel_application_continuity';

const ParcelDocumentUpload = ({
  companyId,
  farmId,
  parcelId,
  canWrite,
  section,
  kind
}: {
  companyId: string;
  farmId: string;
  parcelId: string;
  canWrite: boolean;
  section: string;
  kind: 'certificate' | 'continuity';
}) => {
  const intl = useIntl();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const scoped = Boolean(companyId && farmId && parcelId);
  const { data: attached = [] } = useGetFarmDocumentsQuery(
    { companyId, farmId, linkedSection: section },
    { skip: !scoped }
  );
  const [uploadDocument, { isLoading }] = useUploadFarmDocumentMutation();
  const dispatch = useDispatch();
  const forThisParcel = attached.filter((doc) => String(doc.parcel ?? '') === String(parcelId));

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadDocument({
        companyId,
        farmId,
        file,
        title: file.name.replace(/\.[^.]+$/, ''),
        folder: 'organic_system_plan',
        parcel: Number(parcelId),
        linkedSection: section
      }).unwrap();
      // The upload changes this card's own assessment, which comes from the parcel application, not
      // the documents list. Refetch it so the item does not read missing beside "On file" (review of
      // app #62).
      dispatch(baseApi.util.invalidateTags([{ type: 'ParcelApplication', id: parcelId }]));
      toast({
        title: intl.formatMessage({ id: 'parcelApp.certifiedBranch.upload.done' }),
        status: 'success',
        duration: 3000
      });
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'parcelApp.certifiedBranch.upload.failed' }),
        description: apiErrorMessage(err) ?? undefined,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <VStack align="stretch" spacing={1}>
      {forThisParcel.map((doc) => (
        <Text key={doc.id} fontSize="xs" color="gray.700">
          {intl.formatMessage(
            { id: 'parcelApp.certifiedBranch.upload.onFile' },
            { name: doc.title }
          )}
        </Text>
      ))}
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <StandardButton
        size="sm"
        variant="outline"
        isLoading={isLoading}
        isDisabled={!canWrite || !scoped}
        onClick={() => fileInput.current?.click()}>
        {intl.formatMessage({ id: `parcelApp.certifiedBranch.upload.${kind}` })}
      </StandardButton>
    </VStack>
  );
};

/** The declaration is never asked of a certified parcel, but why depends on the route: not asked on
 * it, asked as land history instead, or not decided (run 3, R3-06). Every other item keeps its state. */
const declarationState = (
  item: CertifiedBranch['items'][number],
  branch: CertifiedBranch
): string => {
  if (item.key !== 'declaration') return item.state;
  if (branch.land_history_asked === true) return 'not_asked_route_asks';
  if (branch.land_history_asked === null) return 'not_asked_undetermined';
  return item.state;
};

const CertifiedBranchCard = ({
  branch,
  companyId,
  farmId,
  parcelId,
  canWrite
}: {
  branch: CertifiedBranch | null | undefined;
  companyId: string;
  farmId: string;
  parcelId: string;
  canWrite: boolean;
}) => {
  const intl = useIntl();
  if (!branch) return null;
  // Only for items the route asks for, or accepts in place of another answer: an item shown for
  // reference gets no upload button (review of app #62).
  const uploads: Array<'certificate' | 'continuity'> = branch.items
    .filter((i) => i.asked || i.alternative)
    .map((i) => i.key)
    .filter((k): k is 'certificate' | 'continuity' => k === 'certificate' || k === 'continuity');

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      data-testid="certified-branch">
      <Stack spacing={2}>
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage({ id: `parcelApp.certifiedBranch.route.${branch.route}` })}
        </Text>
        {branch.plan_version != null ? (
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage(
              { id: 'parcelApp.certifiedBranch.forPlan' },
              { version: branch.plan_version }
            )}
          </Text>
        ) : null}
        {branch.items.map((item) => (
          <Text key={item.key} fontSize="sm" data-state={item.state}>
            {!item.asked &&
            ['attached', 'not_in_packet', 'referenced', 'missing'].includes(item.state)
              ? `${intl.formatMessage({
                  id: item.alternative
                    ? 'parcelApp.certifiedBranch.alternative'
                    : 'parcelApp.certifiedBranch.forReference'
                })} `
              : ''}
            {intl.formatMessage(
              { id: `parcelApp.certifiedBranch.${item.key}.${declarationState(item, branch)}` },
              {
                path: item.path,
                reference:
                  item.reference || intl.formatMessage({ id: 'parcelApp.certifiedBranch.notNamed' })
              }
            )}
          </Text>
        ))}
        {uploads.map((kind) => (
          <ParcelDocumentUpload
            key={kind}
            kind={kind}
            section={kind === 'certificate' ? CERTIFICATE_SECTION : CONTINUITY_SECTION}
            companyId={companyId}
            farmId={farmId}
            parcelId={parcelId}
            canWrite={canWrite}
          />
        ))}
        <Text fontSize="xs" color="gray.600">
          {intl.formatMessage({ id: 'parcelApp.certifiedBranch.availabilityNote' })}
        </Text>
        {branch.review.map((r, i) => (
          <Text key={`${r.kind}-${i}`} fontSize="sm" color="red.800">
            {intl.formatMessage(
              { id: `parcelApp.certifiedBranch.review.${r.kind}` },
              { detail: r.detail, named: r.detail ? 'yes' : 'no' }
            )}
          </Text>
        ))}
      </Stack>
    </Box>
  );
};

export default CertifiedBranchCard;
