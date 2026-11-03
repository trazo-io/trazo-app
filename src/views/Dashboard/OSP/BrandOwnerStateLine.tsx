/**
 * What the plan says of one brand owner, in the reader's language: the server's `state`
 * (`certifications/services/brand_owners.py`), never re-derived here. Anything but `on_file` carries
 * a warning Badge beside body-colour text: orange text on a gray card falls under 4.5:1 (review of
 * app #237).
 */
import React from 'react';
import { Badge, HStack, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import type { BrandOwner } from 'store/api/brandOwnerApi';

const BrandOwnerStateLine = ({ owner }: { owner: BrandOwner }) => {
  const intl = useIntl();
  const issued = owner.certificate_issued_on ?? '';
  // Static ids, never an interpolated `brandOwners.state.${state}`: the locale-parity test cannot
  // see an id built at runtime.
  let text: string;
  switch (owner.state) {
    case 'on_file':
      text =
        owner.certification_status === 'certified'
          ? intl.formatMessage({ id: 'brandOwners.state.certificateOnFile' }, { issued })
          : intl.formatMessage({ id: 'brandOwners.state.agreementOnFile' });
      break;
    case 'certificate_missing':
      text = intl.formatMessage({ id: 'brandOwners.state.certificateMissing' });
      break;
    case 'certificate_old':
      text = intl.formatMessage({ id: 'brandOwners.state.certificateOld' }, { issued });
      break;
    case 'agreement_missing':
      text = intl.formatMessage({ id: 'brandOwners.state.agreementMissing' });
      break;
    default:
      text = intl.formatMessage({ id: 'brandOwners.state.statusUnknown' });
  }
  return (
    <HStack spacing={2} align="flex-start">
      {owner.state !== 'on_file' ? (
        <Badge variant="warning" fontSize="11px" flexShrink={0}>
          {intl.formatMessage({ id: 'brandOwners.review' })}
        </Badge>
      ) : null}
      <Text fontSize="xs" color="gray.600" data-testid="brand-owner-state">
        {text}
      </Text>
    </HStack>
  );
};

export default BrandOwnerStateLine;
