import {
  Box,
  Flex,
  Grid,
  Text,
  useColorModeValue,
  Stack,
  Badge,
  Icon,
  Image,
  VStack,
  HStack,
  Circle,
  Progress,
  Heading
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { useGetUserReviewsQuery } from 'store/api/historyApi';
import { format } from 'date-fns';
import { NavLink } from 'react-router-dom';
import { BsStar, BsStarFill, BsStarHalf } from 'react-icons/bs';
import { FaLeaf, FaRecycle, FaTractor } from 'react-icons/fa';
import { MdEco, MdVerified } from 'react-icons/md';
import {
  StandardPage,
  StandardCard,
  StandardSection,
  StandardGrid,
  StandardAlert
} from '../../../components/Design/StandardComponents';

export default function ReviewsListView() {
  const textColor = useColorModeValue('gray.700', 'white');
  const cardColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { data: reviews, isLoading } = useGetUserReviewsQuery();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderStars = (rating: number) => {
    return (
      <Stack direction="row" spacing="2px" color="green.400">
        {[1, 2, 3, 4, 5].map((index) => (
          <Icon
            key={index}
            as={rating >= index ? BsStarFill : rating > index - 0.5 ? BsStarHalf : BsStar}
            w="16px"
            h="16px"
          />
        ))}
      </Stack>
    );
  };

  return (
    <StandardPage
      title="Sustainability Reviews"
      description="Track your impact-driven product reviews and carbon transparency feedback"
    >
      <StandardCard variant="elevated">
        <VStack spacing={6} align="stretch">
          <StandardAlert
            status="info"
            title="Transparency-Focused Reviews"
            description="Your reviews help build transparency in agricultural carbon footprints and sustainable farming practices."
          />

          <VStack spacing={4} align="stretch">
            {!isLoading &&
              reviews?.map((review, index) => (
                <NavLink key={index} to={`/production/${review.history.id}/`}>
                  <Box
                    p={6}
                    shadow="sm"
                    borderWidth="1px"
                    borderRadius="xl"
                    cursor="pointer"
                    border="1px solid"
                    borderColor="gray.200"
                    transition="all 0.2s"
                    _hover={{
                      shadow: 'lg',
                      transform: 'translateY(-2px)',
                      borderColor: 'green.400'
                    }}
                  >
                    <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
                      {review.history.images?.length > 0 && (
                        <Image
                          src={review.history.images[0]}
                          w="120px"
                          h="90px"
                          borderRadius="lg"
                          objectFit="cover"
                          shadow="sm"
                        />
                      )}
                      <Box flex="1">
                        <Flex justify="space-between" align="center" mb={3}>
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" color={textColor}>
                              {review.headline}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {format(new Date(review.date), 'MMMM dd, yyyy')}
                            </Text>
                          </Box>
                          {renderStars(review.rating)}
                        </Flex>
                        <Text color="gray.500" mb={4}>
                          {review.written_review}
                        </Text>
                        <Stack spacing={2}>
                          <Flex align="center">
                            <Text fontSize="sm" color={textColor} fontWeight="bold" minW="80px">
                              Product:
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {review.history.product}
                            </Text>
                          </Flex>
                          <Flex align="center">
                            <Text fontSize="sm" color={textColor} fontWeight="bold" minW="80px">
                              Parcel:
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {review.history.parcel}
                            </Text>
                          </Flex>
                        </Stack>
                      </Box>
                    </Flex>
                  </Box>
                </NavLink>
              ))}
          </VStack>
        </VStack>
      </StandardCard>
    </StandardPage>
  );
}
