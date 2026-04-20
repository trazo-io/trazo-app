/**
 * RegistryFormSections — Renders a complete registry-driven form for an event type.
 *
 * Groups fields by tier into SectionBox sections and renders each with
 * RegistryFormField. Used inside form tabs behind VITE_USE_FIELD_REGISTRY flag.
 *
 * This component handles the WHAT (which fields to show) and HOW (rendering).
 * Complex fields use CUSTOM_FIELD_RENDERERS escape hatch.
 *
 * Usage in a form tab:
 *   {USE_FIELD_REGISTRY ? (
 *     <RegistryFormSections
 *       eventType="chemical"
 *       subtype={chemicalType}
 *       control={methods.control}
 *       eventData={methods.watch()}
 *       errors={errors}
 *     />
 *   ) : (
 *     <LegacyFormJSX />
 *   )}
 */

import React, { useMemo } from 'react';

import { SimpleGrid, VStack } from '@chakra-ui/react';
import { FaClipboardList, FaLeaf, FaSeedling } from 'react-icons/fa';
import type { Control } from 'react-hook-form';

import type {
  AnySubtype,
  EventTypeCode,
  EventTypeName,
  FieldConfig
} from 'src/config/events';
import { useFormFields } from 'src/hooks/useFormFields';
import { SectionHeader, SectionBox } from 'src/components/Design/StandardComponents';

import { RegistryFormField } from './RegistryFormField';

interface RegistryFormSectionsProps {
  eventType: EventTypeName | EventTypeCode;
  subtype?: AnySubtype;
  control: Control<any>;
  eventData: Record<string, unknown>;
  errors?: Record<string, { message?: string }>;
  isDisabled?: boolean;
}

export const RegistryFormSections: React.FC<RegistryFormSectionsProps> = ({
  eventType,
  subtype,
  control,
  eventData,
  errors = {},
  isDisabled = false
}) => {
  const { fields } = useFormFields({ eventType, subtype });

  const immediateFields = useMemo(
    () => fields.filter((f) => f.surfaces?.form === 'immediate'),
    [fields]
  );
  const secondaryFields = useMemo(
    () => fields.filter((f) => f.surfaces?.form === 'secondary'),
    [fields]
  );
  const detailFields = useMemo(
    () => fields.filter((f) => f.surfaces?.form === 'details'),
    [fields]
  );

  const renderFieldGrid = (sectionFields: FieldConfig[], columns = { base: 1, md: 2 }) => (
    <SimpleGrid columns={columns} spacing={4}>
      {sectionFields.map((field) => (
        <RegistryFormField
          key={field.name}
          field={field}
          control={control}
          eventData={eventData}
          errors={errors}
          isDisabled={isDisabled}
        />
      ))}
    </SimpleGrid>
  );

  return (
    <VStack spacing={6} align="stretch">
      {/* Primary fields (immediate tier) */}
      {immediateFields.length > 0 && (
        <SectionBox variant="default">
          <SectionHeader
            icon={FaClipboardList}
            iconColor="green.500"
            title="Event Details"
            badge="Key Information"
            badgeColorScheme="green"
          />
          {renderFieldGrid(immediateFields)}
        </SectionBox>
      )}

      {/* Secondary fields (operational/technical) */}
      {secondaryFields.length > 0 && (
        <SectionBox variant="default">
          <SectionHeader
            icon={FaSeedling}
            iconColor="blue.500"
            title="Additional Details"
            badge="Technical"
            badgeColorScheme="blue"
          />
          {renderFieldGrid(secondaryFields)}
        </SectionBox>
      )}

      {/* Detail fields (context/notes) */}
      {detailFields.length > 0 && (
        <SectionBox variant="default">
          <SectionHeader
            icon={FaLeaf}
            iconColor="gray.500"
            title="Additional Context"
            badge="Optional"
            badgeColorScheme="gray"
          />
          {renderFieldGrid(detailFields)}
        </SectionBox>
      )}
    </VStack>
  );
};
