import { StandardQueryError } from 'components/Design';
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
  Heading,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  useDisclosure
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
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
  // A failed fetch used to render nothing at all — `!isLoading && reviews?.map(…)` on an
  // undefined `reviews` is a silent no-op, so a 500 and "you have written no reviews"
  // looked identical, and neither said so.
  const { data: reviews, isLoading, isError, isFetching, refetch } = useGetUserReviewsQuery();

  // Image modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (e: React.MouseEvent, imageUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(imageUrl);
    onOpen();
  };

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
      title="Your Reviews"
      description="Track your product reviews and farming transparency feedback">
      <StandardCard variant="elevated">
        <VStack spacing={6} align="stretch">
          <StandardAlert
            status="info"
            title="Transparency-Focused Reviews"
            description="Your reviews help build transparency in agricultural practices and support informed food choices."
          />

          <VStack spacing={4} align="stretch">
            {isError && <StandardQueryError onRetry={refetch} isRetrying={isFetching} />}
            {!isLoading &&
              reviews?.map((review, index) => (
                <NavLink key={index} to={`/production/${review.history.public_id}/`}>
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
                    }}>
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

                        {/* Review Images */}
                        {review.images && review.images.length > 0 && (
                          <HStack spacing={3} mb={4}>
                            {review.images.slice(0, 4).map((imageUrl: string, imgIndex: number) => (
                              <Box
                                key={imgIndex}
                                position="relative"
                                cursor="pointer"
                                onClick={(e) => handleImageClick(e, imageUrl)}
                                borderRadius="lg"
                                overflow="hidden"
                                transition="all 0.2s"
                                _hover={{ transform: 'scale(1.05)', boxShadow: 'md' }}>
                                <Image
                                  src={imageUrl}
                                  alt={`Review image ${imgIndex + 1}`}
                                  w="70px"
                                  h="70px"
                                  objectFit="cover"
                                  borderRadius="lg"
                                  border="1px solid"
                                  borderColor="gray.200"
                                />
                                {imgIndex === 3 && review.images.length > 4 && (
                                  <Flex
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    right={0}
                                    bottom={0}
                                    bg="blackAlpha.600"
                                    align="center"
                                    justify="center"
                                    borderRadius="lg">
                                    <Text color="white" fontWeight="bold" fontSize="sm">
                                      +{review.images.length - 4}
                                    </Text>
                                  </Flex>
                                )}
                              </Box>
                            ))}
                          </HStack>
                        )}

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

      {/* Image Lightbox Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="transparent" boxShadow="none" maxW="90vw">
          <ModalCloseButton color="white" size="lg" top={4} right={4} zIndex={10} />
          <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
            {selectedImage && (
              <Image
                src={selectedImage}
                alt="Review image full size"
                maxH="85vh"
                maxW="90vw"
                objectFit="contain"
                borderRadius="xl"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
}
