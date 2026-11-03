/**
 * What the plan says of one item of equipment, in the reader's language: the server's `state` and
 * `missing` codes (`certifications/services/production_equipment.py`), never re-derived here. An
 * incomplete item carries a warning Badge beside body-colour text, like the brand-owner line.
 */
import React from 'react';
import { Badge, HStack, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import type { EquipmentMissingFact, ProductionEquipment } from 'store/api/productionEquipmentApi';

// Static ids, never an interpolated `equipment.missing.${code}`: the locale-parity test cannot see an
// id built at runtime.
const MISSING_IDS: Record<EquipmentMissingFact, string> = {
  dedicated: 'equipment.missing.dedicated',
  ownership: 'equipment.missing.ownership',
  cleaning_method: 'equipment.missing.cleaningMethod',
  rinsed: 'equipment.missing.rinsed'
};

const EquipmentStateLine = ({ item }: { item: ProductionEquipment }) => {
  const intl = useIntl();
  const complete = item.state === 'complete';
  const text = complete
    ? intl.formatMessage({ id: 'equipment.state.complete' })
    : intl.formatMessage(
        { id: 'equipment.state.incomplete' },
        {
          facts: item.missing
            .map((code) => intl.formatMessage({ id: MISSING_IDS[code] }))
            .join('; ')
        }
      );
  return (
    <HStack spacing={2} align="flex-start">
      {!complete ? (
        <Badge variant="warning" fontSize="11px" flexShrink={0}>
          {intl.formatMessage({ id: 'equipment.review' })}
        </Badge>
      ) : null}
      <Text fontSize="xs" color="gray.600" data-testid="equipment-state">
        {text}
      </Text>
    </HStack>
  );
};

export default EquipmentStateLine;
