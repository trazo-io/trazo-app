import React from 'react';
import {
  Box,
  Flex,
  Heading,
  HStack,
  VStack,
  Badge,
  SimpleGrid,
  Text,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useBreakpointValue
} from '@chakra-ui/react';
import { FaEllipsisV, FaChevronLeft, FaEdit } from 'react-icons/fa';
import { MdMoreVert } from 'react-icons/md';

interface QuickStat {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}

interface ProfileHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; onClick?: () => void; isActive?: boolean }>;
  stats?: QuickStat[];
  badges?: Array<{ label: string; colorScheme?: string; variant?: string }>;
  onBack?: () => void;
  onEdit?: () => void;
  onMoreActions?: Array<{ label: string; onClick: () => void }>;
  headerImage?: string;
  isLoading?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  stats = [],
  badges = [],
  onBack,
  onEdit,
  onMoreActions = [],
  headerImage,
  isLoading
}) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const statsGridColumns = useBreakpointValue({ base: 2, md: stats.length > 3 ? 4 : stats.length });

  return (
    <Box bg="white" borderBottom="1px" borderColor="gray.200" pb={{ base: 6, md: 8 }}>
      {/* Header Background with Back Button */}
      <Flex
        align="center"
        justify="space-between"
        px={{ base: 4, md: 6 }}
        py={4}
        borderBottom="1px"
        borderColor="gray.100"
      >
        <HStack spacing={3}>
          {onBack && (
            <IconButton
              icon={<FaChevronLeft />}
              onClick={onBack}
              variant="ghost"
              size="sm"
              aria-label="Go back"
            />
          )}
          <VStack align="flex-start" spacing={0}>
            <Heading size="lg" color="gray.900">
              {title}
            </Heading>
            {subtitle && (
              <Text fontSize="sm" color="gray.500">
                {subtitle}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Action Buttons */}
        <HStack spacing={2}>
          {onEdit && (
            <Button
              size="sm"
              leftIcon={<FaEdit />}
              colorScheme="green"
              variant="outline"
              onClick={onEdit}
            >
              {!isMobile && 'Edit'}
            </Button>
          )}
          {onMoreActions.length > 0 && (
            <Menu>
              <MenuButton as={IconButton} icon={<MdMoreVert />} variant="ghost" size="sm" />
              <MenuList>
                {onMoreActions.map((action, idx) => (
                  <MenuItem key={idx} onClick={action.onClick}>
                    {action.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          )}
        </HStack>
      </Flex>

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Flex
          px={{ base: 4, md: 6 }}
          py={2}
          fontSize="sm"
          color="gray.600"
          gap={1}
          overflowX="auto"
        >
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <Text>/</Text>}
              {crumb.onClick && !crumb.isActive ? (
                <Text
                  as="button"
                  onClick={crumb.onClick}
                  _hover={{ color: 'green.500' }}
                  cursor="pointer"
                >
                  {crumb.label}
                </Text>
              ) : (
                <Text color={crumb.isActive ? 'gray.900' : 'gray.600'}>{crumb.label}</Text>
              )}
            </React.Fragment>
          ))}
        </Flex>
      )}

      {/* Quick Stats */}
      {stats.length > 0 && (
        <Box px={{ base: 4, md: 6 }} pt={4}>
          <SimpleGrid columns={statsGridColumns} spacing={3}>
            {stats.map((stat, idx) => (
              <Box
                key={idx}
                p={4}
                bg={stat.color ? `${stat.color}.50` : 'gray.50'}
                borderRadius="lg"
                border="1px"
                borderColor={stat.color ? `${stat.color}.200` : 'gray.200'}
              >
                <Text fontSize="sm" color="gray.600" mb={1}>
                  {stat.label}
                </Text>
                <Flex align="center" gap={2}>
                  {stat.icon && (
                    <Box color={stat.color ? `${stat.color}.500` : 'gray.500'}>{stat.icon}</Box>
                  )}
                  <Text fontSize="2xl" fontWeight="bold" color="gray.900">
                    {stat.value}
                  </Text>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <Flex px={{ base: 4, md: 6 }} pt={4} gap={2} flexWrap="wrap">
          {badges.map((badge, idx) => (
            <Badge
              key={idx}
              colorScheme={badge.colorScheme || 'gray'}
              variant={badge.variant || 'solid'}
              px={3}
              py={1}
            >
              {badge.label}
            </Badge>
          ))}
        </Flex>
      )}
    </Box>
  );
};

export default ProfileHeader;
