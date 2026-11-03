/**
 * What each off-farm handler or storage facility takes, in the operation's words: CCOF G6.1 C2 and
 * OTCO C7 7.10-2 ask the products and their packaging form per handler. The crops themselves are read
 * from the production records linked to the facility and shown beside the field; this holds only what
 * records cannot say (detail, packaging form). One line per product.
 */
import React, { useState } from 'react';
import { HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardField,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  useUpdatePostHarvestFacilityMutation,
  type PostHarvestFacility
} from 'store/api/postHarvestFacilityApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

export const cropsLine = (facility: PostHarvestFacility): string =>
  (facility.crops_recorded ?? [])
    .map((c) => (c.years.length ? `${c.crop} (${c.years.join(', ')})` : c.crop))
    .join('; ');

const FacilityProductsEditor = ({
  facility,
  companyId,
  farmId
}: {
  facility: PostHarvestFacility;
  companyId: string;
  farmId: string;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [value, setValue] = useState(facility.products_detail ?? '');
  const [update, { isLoading }] = useUpdatePostHarvestFacilityMutation();
  const crops = cropsLine(facility);

  const save = async () => {
    try {
      await update({
        companyId,
        farmId,
        facilityId: facility.id,
        data: { products_detail: value }
      }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'handler.toast.createError' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <VStack align="stretch" spacing={1} data-testid={`facility-products-${facility.id}`}>
      <Text fontSize="sm" fontWeight="semibold">
        {facility.name}
      </Text>
      <Text fontSize="xs" color="gray.600">
        {crops
          ? intl.formatMessage({ id: 'handler.products.crops' }, { crops })
          : intl.formatMessage({ id: 'handler.products.noCrops' })}
      </Text>
      <StandardField label={intl.formatMessage({ id: 'handler.products.label' })}>
        <StandardTextarea
          rows={2}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
        />
      </StandardField>
      <HStack>
        <StandardButton
          size="sm"
          variant="outline"
          isDisabled={value === (facility.products_detail ?? '')}
          isLoading={isLoading}
          onClick={save}>
          {intl.formatMessage({ id: 'handler.products.save' })}
        </StandardButton>
      </HStack>
    </VStack>
  );
};

export default FacilityProductsEditor;
