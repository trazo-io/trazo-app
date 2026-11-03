/**
 * What the plan's G6.5 says of one supplier of bought-in product: the server's `sourcing_state`
 * (`certifications/services/sourced_products.py`), never re-derived here. Anything but `on_file` carries
 * a warning Badge beside body-colour text, never orange text on a gray card.
 */
import React from 'react';
import { Badge, HStack, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import type { Supplier } from 'store/api/supplierApi';

const SourcingStateLine = ({ supplier }: { supplier: Supplier }) => {
  const intl = useIntl();
  const newest = supplier.certificates[0]?.issued_on ?? '';
  // Static ids, never an interpolated `sourcing.state.${state}`: the locale-parity test cannot see an
  // id built at runtime.
  let text: string;
  switch (supplier.sourcing_state) {
    case 'on_file':
      text =
        supplier.organic_status === 'certified'
          ? intl.formatMessage({ id: 'sourcing.state.certificateOnFile' }, { issued: newest })
          : intl.formatMessage({ id: 'sourcing.state.affidavitOnFile' });
      break;
    case 'certificate_missing':
      text = intl.formatMessage({ id: 'sourcing.state.certificateMissing' });
      break;
    case 'certificate_old':
      text = intl.formatMessage({ id: 'sourcing.state.certificateOld' }, { issued: newest });
      break;
    case 'affidavit_missing':
      text = intl.formatMessage({ id: 'sourcing.state.affidavitMissing' });
      break;
    case 'source_unnamed':
      text = intl.formatMessage({ id: 'sourcing.state.sourceUnnamed' });
      break;
    default:
      text = intl.formatMessage({ id: 'sourcing.state.statusUnknown' });
  }
  return (
    <HStack spacing={2} align="flex-start">
      {supplier.sourcing_state !== 'on_file' ? (
        <Badge variant="warning" fontSize="11px" flexShrink={0}>
          {intl.formatMessage({ id: 'sourcing.review' })}
        </Badge>
      ) : null}
      <Text fontSize="xs" color="gray.600" data-testid="sourcing-state">
        {text}
      </Text>
    </HStack>
  );
};

export default SourcingStateLine;
