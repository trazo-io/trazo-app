/**
 * The products on the plan's own Materials List, offered beside a product name field.
 *
 * CCOF ORGB41: "Only materials included in your OSP Materials List may be used." The input and
 * amendment forms took the product name as free text, so a name the list does not hold was caught
 * only after the fact, by the drift detector and the materials list attestation (2026-11-17). A
 * chip fills the name (and the maker, when the field is still blank); it never saves anything, and
 * the grower can still type any name.
 */
import React from 'react';
import { Box, HStack, Text, Wrap, WrapItem } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { StandardButton } from 'components/Design/StandardComponents';
import { useGetPlanMaterialsForLoggingQuery } from 'store/api/historyApi';

export interface PlanMaterialOption {
  name: string;
  manufacturer: string;
  /** PlanMaterialEntry.category, '' when the operator has not sorted it (a catalog row too). */
  category: string;
  status: string;
  source: string;
}

interface Props {
  establishmentId?: string | number | null;
  /**
   * The plan sections that fit this form. A row the operator has not sorted ('') fits every form:
   * hiding it would hide a listed product for want of a section. null offers every row.
   */
  categories: string[] | null;
  onPick: (material: PlanMaterialOption) => void;
  /** At most this many chips; the rest are counted. */
  limit?: number;
}

export function PlanMaterialsQuickPick({ establishmentId, categories, onPick, limit = 12 }: Props) {
  const intl = useIntl();
  const { data } = useGetPlanMaterialsForLoggingQuery(
    { establishmentId },
    { skip: !establishmentId, refetchOnMountOrArgChange: true }
  );
  const materials: PlanMaterialOption[] = (data?.materials ?? []).filter(
    (m: PlanMaterialOption) => categories === null || !m.category || categories.includes(m.category)
  );
  if (materials.length === 0) return null;
  const shown = materials.slice(0, limit);

  return (
    <Box mt={2} data-testid="plan-materials-quick-pick">
      <HStack spacing={2} mb={1} flexWrap="wrap">
        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
          {intl.formatMessage({ id: 'events.planMaterials.title' })}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {intl.formatMessage({ id: 'events.planMaterials.helper' })}
        </Text>
      </HStack>
      <Wrap spacing={2}>
        {shown.map((material) => (
          <WrapItem key={material.name}>
            <StandardButton
              size="sm"
              variant="outline"
              minH="44px"
              borderRadius="full"
              onClick={() => onPick(material)}>
              <Text as="span" fontSize="xs" noOfLines={1} maxW="200px">
                {material.name}
              </Text>
            </StandardButton>
          </WrapItem>
        ))}
      </Wrap>
      {materials.length > shown.length && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {intl.formatMessage(
            { id: 'events.planMaterials.more' },
            { count: materials.length - shown.length }
          )}
        </Text>
      )}
    </Box>
  );
}

/** The plan sections that fit a chemical record of this type; null (every row) while it is unknown. */
export function categoriesForChemicalType(type?: string | null): string[] | null {
  if (type === 'FE') return ['fertilizer_amendment'];
  if (type === 'PE' || type === 'FU' || type === 'HE') return ['pest_disease_weed'];
  return null;
}

export default PlanMaterialsQuickPick;
