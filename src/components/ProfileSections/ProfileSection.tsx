import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  VStack,
  Collapse,
  Icon,
  Button,
  Text,
} from '@chakra-ui/react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface ProfileSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  highlight?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  title,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
  isEmpty = false,
  emptyMessage = 'No data available',
  highlight = false,
  action,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isEmpty) {
    return null;
  }

  const bg = highlight ? 'green.50' : 'white';
  const borderColor = highlight ? 'green.200' : 'gray.200';

  return (
    <Box
      bg={bg}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={{ base: 4, md: 6 }}
      mb={4}
    >
      {/* Section Header */}
      <Flex
        align="center"
        justify="space-between"
        cursor={collapsible ? 'pointer' : 'default'}
        onClick={() => collapsible && setIsOpen(!isOpen)}
        mb={collapsible && !isOpen ? 0 : 4}
      >
        <Flex align="center" gap={3}>
          {icon && (
            <Box color={highlight ? 'green.500' : 'gray.600'} fontSize="lg">
              {icon}
            </Box>
          )}
          <Heading
            size="md"
            color="gray.900"
            fontWeight="semibold"
            fontSize={{ base: 'md', md: 'lg' }}
          >
            {title}
          </Heading>
        </Flex>

        {/* Action Button & Collapse Toggle */}
        <Flex align="center" gap={2}>
          {action && (
            <Button
              size="sm"
              colorScheme="green"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
            >
              {action.label}
            </Button>
          )}
          {collapsible && (
            <Icon
              as={isOpen ? FaChevronUp : FaChevronDown}
              color="gray.600"
              transform={`rotate(${isOpen ? 0 : 180}deg)`}
              transition="transform 0.2s"
            />
          )}
        </Flex>
      </Flex>

      {/* Content */}
      {collapsible ? (
        <Collapse in={isOpen} animateOpacity>
          {children}
        </Collapse>
      ) : (
        <Box>{children}</Box>
      )}
    </Box>
  );
};

export default ProfileSection;
