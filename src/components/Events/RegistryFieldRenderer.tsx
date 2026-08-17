/**
 * RegistryFieldRenderer — Renders event fields from the Event Field Registry.
 *
 * This component bridges the registry's ResolvedFieldSet into Chakra UI
 * components. It replaces the legacy pattern of calling getEventFieldDisplay()
 * and manually mapping over field arrays.
 *
 * Usage:
 *   import { useEventFields } from 'src/hooks/useEventFields';
 *
 *   const { fields } = useEventFields({ eventType, subtype, surface, event });
 *   return <RegistryFieldRenderer fields={fields} variant="modal" />;
 *
 * Feature flag: controlled by parent components via VITE_USE_FIELD_REGISTRY env var.
 */

import React from 'react';

import {
  Badge,
  Box,
  Collapse,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { FaChevronDown, FaChevronUp, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import type { PriorityTier, ResolvedField, ResolvedFieldSet } from 'src/config/events';

// ============================================================================
// Label resolution (converts i18n keys → human-readable labels)
// ============================================================================

/**
 * Resolve a labelKey to a display label.
 *
 * 🔴 2026-08-15: the TODO below ("Replace with intl.formatMessage once i18n keys are added")
 * was stale — the keys had long since been added, in BOTH locales, and
 * registryLabelKeysExist.test.ts already guarded their presence. Nothing guarded that the
 * renderer USED them, so every label on the detail modal was a de-camelCased key segment,
 * in English, on the Spanish app:
 *
 *   events.production.fields.seedSearchAttempts -> "Seed Search Attempts"
 *                                       authored: "Organic Seed Search Documentation"
 *   events.production.fields.appliedScopeDetail -> "Applied Scope Detail"
 *                                       authored: "Which Rows / Blocks / Area"
 *   events.common.fields.blockId                -> "Block Id"
 *                                       authored: "Block / Section ID"
 *
 * The camelCase conversion stays as the fallback for a key with no message, so a field added
 * without a translation degrades to today's behaviour instead of rendering a raw dotted id.
 */
function humanizeLabelKey(labelKey: string): string {
  // Extract the last segment: 'events.chemical.fields.commercialName' → 'commercialName'
  const lastSegment = labelKey.split('.').pop() || labelKey;
  // camelCase → Title Case: 'commercialName' → 'Commercial Name'
  return lastSegment
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/** Translate a registry labelKey, falling back to a humanized key segment. */
function useLabelResolver(): (labelKey: string) => string {
  const intl = useIntl();
  return React.useCallback(
    (labelKey: string) => {
      if (!labelKey) return '';
      const translated = intl.formatMessage({ id: labelKey });
      // react-intl echoes the id back when the message is missing.
      return translated && translated !== labelKey ? translated : humanizeLabelKey(labelKey);
    },
    [intl]
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface FieldItemProps {
  field: ResolvedField;
  cardBg: string;
  textColor: string;
  compact?: boolean;
}

const FieldItem: React.FC<FieldItemProps> = ({ field, cardBg, textColor, compact }) => {
  const badgeColor = useColorModeValue('orange.100', 'orange.800');
  const resolveLabel = useLabelResolver();

  return (
    <Box p={compact ? 2 : 4} bg={cardBg} borderRadius="lg">
      <HStack spacing={1} mb={1}>
        <Text fontSize="sm" color="gray.500">
          {resolveLabel(field.labelKey)}
        </Text>
        {field.requiresVerificationBadge && (
          <Badge
            colorScheme="orange"
            fontSize="11px"
            bg={badgeColor}
            title="Self-reported — not independently verified">
            <HStack spacing={1}>
              <Icon as={FaShieldAlt} boxSize="8px" />
              <Text>Self-reported</Text>
            </HStack>
          </Badge>
        )}
        {field.isCarbonRelevant && (
          <Badge
            colorScheme="green"
            fontSize="11px"
            variant="subtle"
            title="Affects carbon calculations">
            CO₂
          </Badge>
        )}
      </HStack>
      <Text fontWeight="medium" color={textColor} fontSize={compact ? 'sm' : 'md'}>
        {field.formattedValue}
      </Text>
    </Box>
  );
};

interface FieldSectionProps {
  title: string;
  fields: ResolvedField[];
  cardBg: string;
  textColor: string;
  columns?: Record<string, number>;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  compact?: boolean;
}

const FieldSection: React.FC<FieldSectionProps> = ({
  title,
  fields,
  cardBg,
  textColor,
  columns = { base: 1, md: 2 },
  collapsible = false,
  defaultCollapsed = false,
  compact = false
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: !defaultCollapsed });

  if (fields.length === 0) return null;

  const content = (
    <SimpleGrid columns={columns} spacing={compact ? 2 : 4}>
      {fields.map((field) => (
        <FieldItem
          key={field.name}
          field={field}
          cardBg={cardBg}
          textColor={textColor}
          compact={compact}
        />
      ))}
    </SimpleGrid>
  );

  return (
    <Box>
      {title && (
        <HStack
          mb={3}
          cursor={collapsible ? 'pointer' : 'default'}
          onClick={collapsible ? onToggle : undefined}
          _hover={collapsible ? { opacity: 0.8 } : undefined}>
          <Text fontSize="md" fontWeight="semibold" color={textColor}>
            {title}
          </Text>
          {collapsible && (
            <Icon as={isOpen ? FaChevronUp : FaChevronDown} boxSize="12px" color="gray.400" />
          )}
        </HStack>
      )}
      {collapsible ? <Collapse in={isOpen}>{content}</Collapse> : content}
    </Box>
  );
};

// ============================================================================
// Main component
// ============================================================================

export type RendererVariant = 'modal' | 'card' | 'timeline' | 'consumer';

interface RegistryFieldRendererProps {
  fields: ResolvedFieldSet;
  /**
   * Rendering variant:
   * - 'modal': Full detail view, 3-column hero, 2-column sections, all tiers
   * - 'card': Compact card, 2-column, hero + immediate only
   * - 'timeline': Ultra-compact, 3-column inline, hero + immediate only
   * - 'consumer': Consumer-facing, sections with FTC badges, collapsible details
   */
  variant?: RendererVariant;
  /** Custom background for field boxes */
  cardBg?: string;
  /** Custom text color */
  textColor?: string;
}

export const RegistryFieldRenderer: React.FC<RegistryFieldRendererProps> = ({
  fields,
  variant = 'modal',
  cardBg: cardBgProp,
  textColor: textColorProp
}) => {
  const defaultCardBg = useColorModeValue('gray.50', 'gray.700');
  const defaultTextColor = useColorModeValue('gray.800', 'white');
  const cardBg = cardBgProp || defaultCardBg;
  const textColor = textColorProp || defaultTextColor;

  const allEmpty =
    fields.hero.length +
      fields.immediate.length +
      fields.secondary.length +
      fields.details.length ===
    0;
  if (allEmpty) return null;

  // --- Timeline variant: ultra-compact 3 fields inline ---
  if (variant === 'timeline') {
    const timelineFields = [
      ...fields.hero.filter((f) => f.name !== 'name' && f.name !== 'commercial_name'),
      ...fields.immediate
    ].slice(0, 3);
    return (
      <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={2}>
        {timelineFields.map((field) => (
          <FieldItem key={field.name} field={field} cardBg={cardBg} textColor={textColor} compact />
        ))}
      </SimpleGrid>
    );
  }

  // --- Card variant: compact, hero + immediate only ---
  if (variant === 'card') {
    const cardFields = [
      ...fields.hero.filter((f) => f.name !== 'name' && f.name !== 'commercial_name'),
      ...fields.immediate
    ];
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        {cardFields.map((field) => (
          <FieldItem key={field.name} field={field} cardBg={cardBg} textColor={textColor} compact />
        ))}
      </SimpleGrid>
    );
  }

  // --- Consumer variant: sections with collapsible details ---
  if (variant === 'consumer') {
    return (
      <VStack spacing={4} align="stretch">
        {fields.hero.length > 0 && (
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
            {fields.hero.map((field) => (
              <FieldItem key={field.name} field={field} cardBg={cardBg} textColor={textColor} />
            ))}
          </SimpleGrid>
        )}
        <FieldSection
          title="Key Details"
          fields={fields.immediate}
          cardBg={cardBg}
          textColor={textColor}
          columns={{ base: 1, sm: 2 }}
        />
        <FieldSection
          title="Additional Details"
          fields={fields.secondary}
          cardBg={cardBg}
          textColor={textColor}
          collapsible
          defaultCollapsed
        />
        <FieldSection
          title="Technical Details"
          fields={fields.details}
          cardBg={cardBg}
          textColor={textColor}
          collapsible
          defaultCollapsed
        />
      </VStack>
    );
  }

  // --- Modal variant (default): full detail, all tiers ---
  return (
    <VStack spacing={4} align="stretch">
      {/* Hero + Immediate merged as primary info */}
      {(fields.hero.length > 0 || fields.immediate.length > 0) && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {[
            ...fields.hero.filter((f) => f.name !== 'name' && f.name !== 'commercial_name'),
            ...fields.immediate
          ].map((field) => (
            <FieldItem key={field.name} field={field} cardBg={cardBg} textColor={textColor} />
          ))}
        </SimpleGrid>
      )}
      <FieldSection
        title="Additional Details"
        fields={fields.secondary}
        cardBg={cardBg}
        textColor={textColor}
        columns={{ base: 1, md: 2 }}
      />
      <FieldSection
        title="Technical Details"
        fields={fields.details}
        cardBg={cardBg}
        textColor={textColor}
        columns={{ base: 1, md: 2 }}
      />
    </VStack>
  );
};
