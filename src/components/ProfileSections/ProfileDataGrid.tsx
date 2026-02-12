import React from 'react';
import {
  Box,
  SimpleGrid,
  VStack,
  HStack,
  Text,
  Badge,
  Flex,
  Tag,
  TagLabel,
  useBreakpointValue,
  Divider,
  Tooltip
} from '@chakra-ui/react';
import { FaInfoCircle } from 'react-icons/fa';

interface DataItem {
  label: string;
  value: React.ReactNode;
  type?: 'text' | 'number' | 'date' | 'badge' | 'tag' | 'tags' | 'status' | 'link';
  tooltip?: string;
  color?: string;
  bold?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  isClickable?: boolean;
  badgeColorScheme?: string;
}

interface ProfileDataGridProps {
  data: DataItem[];
  columns?: number;
  columnsMobile?: number;
  columnsTablet?: number;
  spacing?: number;
  showDividers?: boolean;
  compact?: boolean;
}

const ProfileDataGrid: React.FC<ProfileDataGridProps> = ({
  data,
  columns = 2,
  columnsMobile = 1,
  columnsTablet = 2,
  spacing = 4,
  showDividers = false,
  compact = false
}) => {
  const gridColumns = useBreakpointValue({
    base: columnsMobile,
    md: columnsTablet,
    lg: columns
  });

  const renderValue = (item: DataItem) => {
    const baseProps = {
      color: item.color || 'gray.700',
      fontWeight: item.bold ? 'semibold' : 'normal',
      fontSize: compact ? 'sm' : 'base'
    };

    switch (item.type) {
      case 'badge':
        return (
          <Badge colorScheme={item.badgeColorScheme || 'gray'} variant="solid" px={3} py={1}>
            {String(item.value)}
          </Badge>
        );

      case 'tag':
      case 'tags':
        if (Array.isArray(item.value)) {
          return (
            <Flex gap={2} flexWrap="wrap">
              {item.value.map((tag, idx) => (
                <Tag key={idx} size="md" colorScheme="gray" variant="solid">
                  <TagLabel>{String(tag)}</TagLabel>
                </Tag>
              ))}
            </Flex>
          );
        }
        return (
          <Tag size="md" colorScheme="gray" variant="solid">
            <TagLabel>{String(item.value)}</TagLabel>
          </Tag>
        );

      case 'status':
        const statusColor =
          String(item.value).toLowerCase() === 'active' ||
          String(item.value).toLowerCase() === 'yes'
            ? 'green'
            : String(item.value).toLowerCase() === 'inactive' ||
              String(item.value).toLowerCase() === 'no'
            ? 'red'
            : 'gray';
        return (
          <Badge colorScheme={statusColor} variant="solid">
            {String(item.value)}
          </Badge>
        );

      case 'link':
        return (
          <Text
            as="button"
            {...baseProps}
            color="green.500"
            _hover={{ textDecoration: 'underline' }}
            onClick={item.onClick}
            cursor={item.onClick ? 'pointer' : 'default'}
          >
            {String(item.value)}
          </Text>
        );

      case 'date':
        const dateValue =
          item.value instanceof Date ? item.value.toLocaleDateString() : String(item.value);
        return <Text {...baseProps}>{dateValue}</Text>;

      case 'number':
        return (
          <Text {...baseProps} textAlign="right">
            {Number(item.value).toLocaleString()}
          </Text>
        );

      case 'text':
      default:
        return (
          <Text
            {...baseProps}
            cursor={item.isClickable ? 'pointer' : 'default'}
            onClick={item.onClick}
            _hover={item.isClickable ? { textDecoration: 'underline' } : undefined}
          >
            {String(item.value)}
          </Text>
        );
    }
  };

  return (
    <SimpleGrid columns={gridColumns} spacing={spacing}>
      {data
        .filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
        .map((item, idx) => (
          <VStack
            key={idx}
            align="flex-start"
            spacing={compact ? 1 : 2}
            pb={showDividers && idx !== data.length - 1 ? spacing : 0}
            borderBottom={showDividers && idx !== data.length - 1 ? '1px' : 'none'}
            borderColor="gray.200"
          >
            {/* Label */}
            <HStack spacing={1}>
              <Text
                fontSize={compact ? 'xs' : 'sm'}
                color="gray.600"
                fontWeight="medium"
                textTransform="uppercase"
                letterSpacing="0.5px"
              >
                {item.label}
              </Text>
              {item.tooltip && (
                <Tooltip label={item.tooltip} placement="top">
                  <Box as="span" color="gray.400" cursor="help">
                    <FaInfoCircle size={12} />
                  </Box>
                </Tooltip>
              )}
            </HStack>

            {/* Value */}
            <HStack spacing={2} align="flex-start">
              {item.icon && <Box color="green.500">{item.icon}</Box>}
              <Box>{renderValue(item)}</Box>
            </HStack>
          </VStack>
        ))}
    </SimpleGrid>
  );
};

export default ProfileDataGrid;
