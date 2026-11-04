/**
 * Shared primitives for the producer profile pages (Farm, Parcel, Production).
 *
 * `InfoRow` was copy-pasted into four files — ProfileFarm, ProfileParcel,
 * ProfileProduction and Settings/CompanyInfoTab — each drifting slightly. This is
 * the single copy. Its visual is byte-for-byte the ProfileFarm original so the
 * remaining three can adopt it with a zero-diff swap when they are redesigned.
 */
import React from 'react';

import { Box, Flex, HStack, Icon, Link, Text, Tooltip, VStack } from '@chakra-ui/react';
import { FaEye } from 'react-icons/fa';

export interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
  type?: 'text' | 'link' | 'email' | 'phone';
  /**
   * This field is rendered to a shopper on the consumer QR page. Draws a small
   * NEUTRAL-GRAY eye marker after the label.
   *
   * Gray, never green: visibility is not a claim, and colour on a producer surface
   * has to encode a real distinction (an OMRI chip, a database-verified cert) or a
   * plain classification starts carrying the same weight as an approval signal.
   */
  isPublic?: boolean;
  /** Tooltip text for the marker. Supplied by the caller so it stays translatable. */
  publicLabel?: string;
  onClick?: () => void;
  noOfLines?: number;
  /**
   * `stacked` (default): icon, uppercase eyebrow label, value underneath. The original look,
   * still used by the farm and parcel profiles.
   *
   * `inline`: label on the left in sentence case, value on the right, no icon and no per-row
   * eye marker. One field per line, so five fields take five lines on a phone instead of ten,
   * and nothing on the row is decoration. Put inline rows in a `FieldList` and say what is on
   * the public page ONCE per group (a `FieldGroup` label), not with an eye on every row: when
   * every row in a card is public, five eyes carry no information.
   *
   * The production profile uses `inline` for every row (2026-11-04). Farm and parcel move over
   * when they are next redesigned; until then the two looks never share a page.
   */
  layout?: 'stacked' | 'inline';
}

export const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  label,
  value,
  type = 'text',
  isPublic = false,
  publicLabel,
  onClick,
  noOfLines,
  layout = 'stacked'
}) => {
  // Empty rows render nothing — that is how the profile pages hide unset fields.
  if (value === null || value === undefined || value === '') return null;

  const renderValue = () => {
    // An `onClick` row navigates somewhere, so it must LOOK navigable. Making only the
    // container clickable (cursor change on hover) hides the affordance entirely on touch,
    // where there is no hover — ProfileProduction's Establishment and Parcel rows are both
    // links to other pages.
    if (onClick) {
      return (
        <Link
          as="button"
          type="button"
          onClick={onClick}
          color="green.700"
          fontWeight="medium"
          fontSize={{ base: 'sm', md: 'md' }}
          textAlign="left"
          _hover={{ textDecoration: 'underline' }}>
          {value}
        </Link>
      );
    }
    switch (type) {
      case 'link':
        return (
          <Link
            href={value as string}
            isExternal
            color="green.700"
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}>
            {value}
          </Link>
        );
      case 'email':
        return (
          <Link
            href={`mailto:${value}`}
            color="green.700"
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}>
            {value}
          </Link>
        );
      case 'phone':
        return (
          <Link
            href={`tel:${value}`}
            color="green.700"
            fontWeight="medium"
            fontSize={{ base: 'sm', md: 'md' }}>
            {value}
          </Link>
        );
      default:
        return (
          <Text
            fontWeight="medium"
            color="gray.800"
            fontSize={{ base: 'sm', md: 'md' }}
            noOfLines={noOfLines}>
            {value}
          </Text>
        );
    }
  };

  if (layout === 'inline') {
    return (
      <Flex justify="space-between" align="baseline" gap={4} py={2.5}>
        <Text fontSize="sm" color="gray.600" flexShrink={0}>
          {label}
        </Text>
        <Box minW={0} textAlign="right">
          {renderValue()}
        </Box>
      </Flex>
    );
  }

  return (
    <HStack gap={2} align="flex-start" onClick={onClick} cursor={onClick ? 'pointer' : undefined}>
      <Icon as={icon} color="green.500" boxSize={{ base: 3.5, md: 4 }} mt={1} flexShrink={0} />
      <Box minW={0}>
        <HStack gap={1} align="center">
          <Text
            fontSize="xs"
            color="gray.500"
            textTransform="uppercase"
            fontWeight="semibold"
            letterSpacing="0.05em">
            {label}
          </Text>
          {isPublic && (
            <Tooltip label={publicLabel} placement="top" hasArrow openDelay={300}>
              <Box as="span" display="inline-flex" aria-label={publicLabel}>
                <Icon as={FaEye} boxSize={2.5} color="gray.400" />
              </Box>
            </Tooltip>
          )}
        </HStack>
        {renderValue()}
      </Box>
    </HStack>
  );
};

export interface FieldGroupProps {
  /** Eyebrow label above the group. */
  label: string;
  /** Right-aligned regulatory citation, e.g. "7 CFR 205.272". */
  cfr?: string;
  /** Right-aligned action, e.g. an Edit button. Composes with `cfr`. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A titled block inside a card. Replaces the pattern of giving every two-field
 * cluster its own elevated card, which is what made the farm profile 17 cards long.
 *
 * Uses `gap` rather than `spacing`. Both work — `spacing` emits `gap` — but Chakra's Stack
 * sets `gap: hasDivider ? undefined : spacing`, so on a stack that carries a `divider` the
 * `spacing` value routes to the divider's margins instead. `gap` behaves the same either way,
 * which keeps the rhythm predictable when a group is later given a divider.
 */
export const FieldGroup: React.FC<FieldGroupProps> = ({ label, cfr, action, children }) => (
  <VStack align="stretch" gap={{ base: 3, md: 4 }}>
    <HStack justify="space-between" align="center" gap={3} minH="24px">
      <HStack gap={2} align="baseline" minW={0}>
        <Text
          fontSize="xs"
          color="gray.600"
          textTransform="uppercase"
          fontWeight="bold"
          letterSpacing="0.08em">
          {label}
        </Text>
        {cfr && (
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
            {cfr}
          </Text>
        )}
      </HStack>
      {action}
    </HStack>
    {children}
  </VStack>
);

/**
 * A list of `layout="inline"` InfoRows split by hairlines. The rows carry their own vertical
 * padding, so the list adds none.
 *
 * The hairline is a CSS sibling border, NOT Chakra's `divider` prop: Stack decides where a
 * divider goes from its React children, and an InfoRow with an empty value is still a valid
 * child that renders null, so `divider` drew two hairlines around the gap. `* + *` only sees
 * rows that reached the DOM.
 */
export interface FieldListProps {
  /**
   * One quiet line above the rows saying who sees them ("On the lot's public page"). A caption,
   * not a heading: the card already has a title, and an uppercase eyebrow under it read as a
   * third header stacked on the section heading and the card title.
   */
  caption?: string;
  captionIcon?: React.ElementType;
  children: React.ReactNode;
}

export const FieldList: React.FC<FieldListProps> = ({ caption, captionIcon, children }) => (
  <Box>
    {caption && (
      <HStack gap={1.5} color="gray.500" mb={1}>
        {captionIcon && <Icon as={captionIcon} boxSize={3} aria-hidden />}
        <Text fontSize="xs">{caption}</Text>
      </HStack>
    )}
    <Box sx={{ '& > * + *': { borderTopWidth: '1px', borderTopColor: 'gray.100' } }}>
      {children}
    </Box>
  </Box>
);

export interface PageHeaderMetaProps {
  /**
   * Rendered as "a · b · c". Falsy entries are dropped so there are no orphan separators.
   *
   * `React.ReactNode` rather than `string` because `intl.formatMessage` is typed as
   * returning `string | React.ReactNode[]` — every caller here passes a plain string, but
   * narrowing the prop would force a cast at each one.
   */
  items: Array<React.ReactNode>;
}

/** The muted one-line fact strip under a page title. Replaces a card of stat tiles. */
export const PageHeaderMeta: React.FC<PageHeaderMetaProps> = ({ items }) => {
  const present = items.filter(Boolean);
  if (present.length === 0) return null;

  return (
    <Text fontSize="sm" color="gray.500">
      {present.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && ' · '}
          {item}
        </React.Fragment>
      ))}
    </Text>
  );
};
