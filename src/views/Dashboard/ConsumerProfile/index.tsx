import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Icon,
  SimpleGrid,
  Divider,
  useColorModeValue,
  Skeleton,
  SkeletonCircle,
  Progress
} from '@chakra-ui/react';
import {
  FaUser,
  FaEnvelope,
  FaCalendarAlt,
  FaQrcode,
  FaStar,
  FaLeaf,
  FaChevronRight,
  FaLock,
  FaHeart
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useGetMeQuery } from '../../../store/api/userApi';
import { useGetImpactDashboardQuery } from '../../../store/api/consumerApi';
import { useGetUserReviewsQuery } from '../../../store/api/historyApi';
import {
  StandardPage,
  StandardCard,
  StandardButton
} from '../../../components/Design/StandardComponents';

export default function ConsumerProfile() {
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // Fetch user data
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const { data: impactData, isLoading: impactLoading } = useGetImpactDashboardQuery();
  const { data: reviews, isLoading: reviewsLoading } = useGetUserReviewsQuery();

  const isLoading = userLoading || impactLoading || reviewsLoading;

  if (isLoading) {
    return (
      <StandardPage
        title="Profile"
        description="Loading your profile..."
        showBackButton
        onBack={() => navigate(-1)}
      >
        <VStack spacing={6} align="stretch">
          {/* Loading indicator */}
          <VStack spacing={2} align="center" py={2}>
            <Text fontSize="sm" color={mutedColor} fontWeight="medium">
              Loading your profile...
            </Text>
            <Progress size="sm" isIndeterminate colorScheme="green" borderRadius="full" w="200px" />
          </VStack>

          {/* Profile Header Skeleton */}
          <StandardCard variant="elevated">
            <VStack spacing={4} align="center" py={4}>
              <SkeletonCircle size="24" />
              <VStack spacing={2}>
                <Skeleton height="24px" width="180px" />
                <Skeleton height="16px" width="200px" />
                <Skeleton height="14px" width="120px" />
              </VStack>
            </VStack>
          </StandardCard>

          {/* Stats Skeleton */}
          <StandardCard title="" variant="outline">
            <VStack spacing={4}>
              <Skeleton height="20px" width="100px" alignSelf="start" />
              <SimpleGrid columns={3} spacing={4} w="full">
                {[1, 2, 3].map((i) => (
                  <Box key={i} p={4} bg="gray.50" borderRadius="xl">
                    <VStack spacing={2}>
                      <Skeleton height="24px" width="24px" borderRadius="full" />
                      <Skeleton height="28px" width="40px" />
                      <Skeleton height="12px" width="60px" />
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </VStack>
          </StandardCard>

          {/* Account Skeleton */}
          <StandardCard title="" variant="outline">
            <VStack spacing={0} divider={<Divider />}>
              {[1, 2, 3].map((i) => (
                <Box key={i} w="full" p={4}>
                  <HStack spacing={3}>
                    <Skeleton height="20px" width="20px" borderRadius="md" />
                    <VStack align="start" spacing={1} flex={1}>
                      <Skeleton height="16px" width="100px" />
                      <Skeleton height="12px" width="150px" />
                    </VStack>
                    <Skeleton height="16px" width="16px" />
                  </HStack>
                </Box>
              ))}
            </VStack>
          </StandardCard>
        </VStack>
      </StandardPage>
    );
  }

  const impactMetrics = impactData?.impact_metrics;
  const reviewCount = reviews?.length || 0;
  const joinDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    : 'Member';

  return (
    <StandardPage
      title="Profile"
      description="Your transparency journey account"
      showBackButton
      onBack={() => navigate(-1)}
    >
      <VStack spacing={6} align="stretch">
        {/* Profile Header Card */}
        <StandardCard variant="elevated">
          <VStack spacing={4} align="center" py={4}>
            <Avatar
              size="xl"
              name={`${user?.first_name || ''} ${user?.last_name || ''}`}
              bg="green.500"
              color="white"
            />
            <VStack spacing={1}>
              <HStack>
                <Text fontSize="xl" fontWeight="bold">
                  {user?.first_name} {user?.last_name}
                </Text>
                {impactMetrics?.total_scans > 10 && (
                  <Icon as={MdVerified} color="green.500" boxSize={5} />
                )}
              </HStack>
              <HStack spacing={2} color={mutedColor}>
                <Icon as={FaEnvelope} boxSize={3} />
                <Text fontSize="sm">{user?.email}</Text>
              </HStack>
              <HStack spacing={2} color={mutedColor}>
                <Icon as={FaCalendarAlt} boxSize={3} />
                <Text fontSize="sm">Joined {joinDate}</Text>
              </HStack>
            </VStack>
          </VStack>
        </StandardCard>

        {/* Stats Overview */}
        <StandardCard title="Your Impact" variant="outline">
          <SimpleGrid columns={3} spacing={4}>
            <VStack
              p={4}
              bg={useColorModeValue('green.50', 'green.900')}
              borderRadius="xl"
              spacing={1}
            >
              <Icon as={FaQrcode} boxSize={6} color="green.500" />
              <Text fontSize="2xl" fontWeight="bold" color="green.600">
                {impactMetrics?.total_scans || 0}
              </Text>
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                Products Scanned
              </Text>
            </VStack>

            <VStack
              p={4}
              bg={useColorModeValue('blue.50', 'blue.900')}
              borderRadius="xl"
              spacing={1}
            >
              <Icon as={FaStar} boxSize={6} color="blue.500" />
              <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                {reviewCount}
              </Text>
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                Reviews Written
              </Text>
            </VStack>

            <VStack
              p={4}
              bg={useColorModeValue('teal.50', 'teal.900')}
              borderRadius="xl"
              spacing={1}
            >
              <Icon as={FaLeaf} boxSize={6} color="teal.500" />
              <Text fontSize="2xl" fontWeight="bold" color="teal.600">
                {impactMetrics?.verified_farms_scanned || 0}
              </Text>
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                Farms Discovered
              </Text>
            </VStack>
          </SimpleGrid>
        </StandardCard>

        {/* Quick Actions */}
        <StandardCard title="Account" variant="outline">
          <VStack spacing={0} divider={<Divider />}>
            <Box
              as="button"
              w="full"
              p={4}
              textAlign="left"
              onClick={() => navigate('/admin/dashboard/journey')}
              _hover={{ bg: hoverBg }}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon as={FaHeart} color="red.400" boxSize={5} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">My Favorites</Text>
                    <Text fontSize="sm" color={mutedColor}>
                      Saved products and farms
                    </Text>
                  </VStack>
                </HStack>
                <Icon as={FaChevronRight} color="gray.400" />
              </HStack>
            </Box>

            <Box
              as="button"
              w="full"
              p={4}
              textAlign="left"
              onClick={() => navigate('/admin/dashboard/journey')}
              _hover={{ bg: hoverBg }}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon as={FaStar} color="yellow.500" boxSize={5} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">My Reviews</Text>
                    <Text fontSize="sm" color={mutedColor}>
                      {reviewCount} reviews written
                    </Text>
                  </VStack>
                </HStack>
                <Icon as={FaChevronRight} color="gray.400" />
              </HStack>
            </Box>

            <Box
              as="button"
              w="full"
              p={4}
              textAlign="left"
              onClick={() => navigate('/admin/dashboard/settings')}
              _hover={{ bg: hoverBg }}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon as={FaLock} color="blue.500" boxSize={5} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Security</Text>
                    <Text fontSize="sm" color={mutedColor}>
                      Change password
                    </Text>
                  </VStack>
                </HStack>
                <Icon as={FaChevronRight} color="gray.400" />
              </HStack>
            </Box>
          </VStack>
        </StandardCard>

        {/* Transparency Badge */}
        {impactMetrics?.total_scans >= 10 && (
          <StandardCard variant="elevated">
            <HStack
              spacing={4}
              p={4}
              bg={useColorModeValue('green.50', 'green.900')}
              borderRadius="xl"
            >
              <Icon as={MdVerified} boxSize={10} color="green.500" />
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" color="green.700">
                  Transparency Advocate
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  You've scanned {impactMetrics.total_scans}+ products! Thank you for supporting
                  agricultural transparency.
                </Text>
              </VStack>
            </HStack>
          </StandardCard>
        )}
      </VStack>
    </StandardPage>
  );
}
