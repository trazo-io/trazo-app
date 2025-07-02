// Chakra imports
import {
  Badge,
  Box,
  CircularProgress,
  Flex,
  HStack,
  Icon,
  Image,
  Input,
  Stack,
  Text,
  useColorModeValue,
  VStack,
  Container
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardButton,
  StandardAlert
} from 'components/Design/StandardComponents';
import { BsStar, BsStarFill } from 'react-icons/bs';
import { FaLeaf, FaStar, FaHeart, FaCamera } from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import { object, string } from 'zod';
import { useGetPublicHistoryQuery } from 'store/api/historyApi';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useSelector } from 'react-redux';
import { useSendReviewMutation } from 'store/api/reviewApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// import CameraCard from "./components/CameraCard";

// Assets

const reviewSchema = object({
  headline: string().min(1, 'Headline is required').max(100, 'Headline must be under 100 characters'),
  review: string().min(10, 'Review must be at least 10 characters').max(1000, 'Review must be under 1000 characters')
});

function ProductReview() {
  const intl = useIntl();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const { getRootProps, getInputProps } = useDropzone();
  const navigate = useNavigate();
  const { productionId, scanId } = useParams();
  const [rating, setRating] = useState(0);

  const currentUser = useSelector((state) => state.userState.user);

  const methods = useForm({
    resolver: zodResolver(reviewSchema)
  });

  const {
    reset,
    handleSubmit,
    register,
    formState: { errors, isSubmitSuccessful }
  } = methods;

  const {
    data: historyData,
    error,
    isLoading,
    isFetching,
    refetch
  } = useGetPublicHistoryQuery(productionId || '', {
    skip: productionId === undefined
  });

  const [sendReview, { data, isError, error: errorReview, isLoading: isLoadingReview, isSuccess }] =
    useSendReviewMutation();

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
  }, [isSubmitSuccessful]);

  const onSubmitHandler = (data) => {
    // For web reviews, we don't send scan_id since it's not a real scan
    const reviewData = {
      headline: data.headline,
      written_review: data.review,
      rating: rating,
      production: historyData?.id,
      user: currentUser?.id
    };
    
    // Only include scan if it's a valid numeric ID (from actual QR scan)
    if (scanId && !scanId.startsWith('web-')) {
      reviewData.scan = parseInt(scanId, 10);
    }
    
    sendReview(reviewData);
  };

  return (
    <StandardPage
      title="Share Your Carbon Transparency Experience"
      description="Help other consumers make informed choices by sharing your experience with this sustainably-grown product"
      showBackButton={true}
      onBack={() => navigate('/')}
    >
      <Container maxW="4xl" mx="auto">
        <StandardCard variant="elevated">
          <VStack spacing={6} align="stretch">
            {/* Product Information Header */}
            <Box p={6} bg="green.50" borderRadius="xl" border="1px solid" borderColor="green.200">
              <HStack spacing={4} align="start">
                {historyData?.images.length > 0 && (
                  <Image 
                    src={historyData?.images[0]} 
                    w="80px" 
                    h="80px" 
                    borderRadius="lg" 
                    objectFit="cover"
                    border="2px solid white"
                    shadow="md"
                  />
                )}
                <VStack align="start" spacing={2} flex={1}>
                  <HStack spacing={2}>
                    <Icon as={FaLeaf} color="green.600" />
                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                      {historyData?.product.name}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Farm:</strong> {historyData?.parcel.establishment.name}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Producer:</strong> {historyData?.company}
                  </Text>
                </VStack>
              </HStack>
            </Box>
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmitHandler)} style={{ width: '100%' }}>
                {isSuccess ? (
                  <StandardAlert 
                    status="success" 
                    title="Review Submitted Successfully!"
                    description="Thank you for contributing to agricultural transparency. Your review helps other consumers make informed choices."
                  >
                    <StandardButton
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/')}
                      leftIcon={<FaHeart />}
                    >
                      Continue Exploring Transparency
                    </StandardButton>
                  </StandardAlert>
                ) : (
                  <VStack spacing={6} align="stretch">
                    {/* Rating Section */}
                    <StandardField 
                      label="How would you rate this sustainable product?"
                      helpText="Consider carbon footprint, farming practices, and transparency"
                    >
                      <HStack spacing={3} justify="center" py={4}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            as={rating >= star ? BsStarFill : BsStar}
                            color={rating >= star ? 'yellow.400' : 'gray.300'}
                            w="32px"
                            h="32px"
                            cursor="pointer"
                            onClick={() => setRating(star)}
                            _hover={{ transform: 'scale(1.1)', color: 'yellow.400' }}
                            transition="all 0.2s"
                          />
                        ))}
                      </HStack>
                      {rating > 0 && (
                        <Text textAlign="center" fontSize="sm" color="gray.600" mt={2}>
                          {rating === 1 && "Needs significant improvement in sustainability"}
                          {rating === 2 && "Some sustainable practices evident"}
                          {rating === 3 && "Good sustainable practices"}
                          {rating === 4 && "Excellent carbon transparency"}
                          {rating === 5 && "Outstanding environmental stewardship"}
                        </Text>
                      )}
                    </StandardField>
                    {/* Headline Section */}
                    <StandardField 
                      label="Review Headline"
                      required
                      error={errors.headline?.message}
                      helpText="Highlight what's most important about this product's sustainability"
                    >
                      <StandardInput
                        {...register('headline')}
                        placeholder="e.g., 'Exceptional carbon transparency' or 'Great regenerative practices'"
                      />
                    </StandardField>
                    {/* Photo Upload Section */}
                    <StandardField 
                      label="Add Photo (Optional)"
                      helpText="Share a photo that shows the product's quality or sustainable packaging"
                    >
                      <Flex
                        align="center"
                        justify="center"
                        border="2px dashed"
                        borderColor="gray.300"
                        borderRadius="xl"
                        w="100%"
                        minH="120px"
                        cursor="pointer"
                        bg="gray.50"
                        _hover={{ borderColor: 'green.400', bg: 'green.50' }}
                        transition="all 0.2s"
                        {...getRootProps({ className: 'dropzone' })}
                      >
                        <Input {...getInputProps()} />
                        <VStack spacing={2}>
                          <Icon as={FaCamera} color="gray.400" boxSize={6} />
                          <Text color="gray.500" fontSize="sm" textAlign="center">
                            Click or drop a photo here
                          </Text>
                        </VStack>
                      </Flex>
                    </StandardField>
                    {/* Review Text Section */}
                    <StandardField 
                      label="Your Carbon Transparency Review"
                      required
                      error={errors.review?.message}
                      helpText="Share details about the farm's sustainability practices, carbon impact, or transparency that influenced your choice"
                    >
                      <StandardTextarea
                        {...register('review')}
                        placeholder="What did you discover about this product's environmental impact? How did the carbon transparency influence your purchase decision? Would you recommend this farm to other conscious consumers?"
                        rows={5}
                      />
                    </StandardField>
                    {/* Submit Button */}
                    <Flex justify="space-between" align="center" pt={4}>
                      <StandardButton
                        variant="outline"
                        onClick={() => navigate('/')}
                      >
                        Cancel
                      </StandardButton>
                      <StandardButton
                        type="submit"
                        isLoading={isLoadingReview}
                        loadingText="Submitting Review..."
                        leftIcon={<FaLeaf />}
                        disabled={!rating || rating === 0}
                      >
                        Share Transparency Review
                      </StandardButton>
                    </Flex>
                  </VStack>
                )}
              </form>
            </FormProvider>
          </VStack>
        </StandardCard>
      </Container>
    </StandardPage>
  );
}

export default ProductReview;
