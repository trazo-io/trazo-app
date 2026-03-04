import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Image,
  Flex,
  Container,
  useColorModeValue
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { FaLeaf, FaHeart } from 'react-icons/fa';
import { BsStarFill, BsStar } from 'react-icons/bs';
import { useGetPublicHistoryQuery } from 'store/api/historyApi';
import { useSendReviewMutation } from 'store/api/reviewApi';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardButton,
  StandardAlert
} from 'components/Design/StandardComponents';
import { TrazoImageUpload } from 'components/Upload';

// Review schema matching backend model
const reviewSchema = object({
  headline: string()
    .min(1, 'Headline is required')
    .max(100, 'Headline must be under 100 characters'),
  written_review: string()
    .min(10, 'Review must be at least 10 characters')
    .max(1000, 'Review must be under 1000 characters')
});

export default function ModernProductReview() {
  const navigate = useNavigate();
  const { productionId, scanId } = useParams();

  // State
  const [rating, setRating] = useState(0);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  // User data
  const currentUser = useSelector((state: any) => state.userState.user);

  // Form setup
  const methods = useForm({
    resolver: zodResolver(reviewSchema)
  });

  const {
    reset,
    handleSubmit,
    register,
    formState: { errors, isSubmitSuccessful }
  } = methods;

  // Fetch product data
  const { data: historyData, isLoading } = useGetPublicHistoryQuery(productionId || '', {
    skip: !productionId
  });

  // Review mutation
  const [sendReview, { isSuccess, isLoading: isLoadingReview }] = useSendReviewMutation();

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
  }, [isSubmitSuccessful, reset]);
  // Submit review
  const onSubmitHandler = (data: any) => {
    // For web reviews, we don't send scan_id since it's not a real scan
    const reviewData: any = {
      headline: data.headline,
      written_review: data.written_review,
      rating: rating,
      production_public_id: historyData?.public_id,
      images: uploadedImageUrls
    };

    // Only include user if logged in
    if (currentUser?.id) {
      reviewData.user = currentUser.id;
    }

    // Only include scan if it's a valid numeric ID (from actual QR scan)
    if (scanId && !scanId.startsWith('web-')) {
      reviewData.scan = parseInt(scanId, 10);
    }

    sendReview(reviewData);
  };

  return (
    <StandardPage
      title="Share Your Experience"
      description="Help other consumers make informed choices by sharing your experience with this product"
      showBackButton={true}
      onBack={() => navigate(-1)}
    >
      <Container maxW="2xl" mx="auto" px={{ base: 0, md: 0 }}>
        <StandardCard variant="elevated">
          <VStack spacing={{ base: 5, md: 6 }} align="stretch">
            {/* Product Information Header */}
            <Box
              p={{ base: 4, md: 6 }}
              bg="green.50"
              borderRadius="xl"
              border="1px solid"
              borderColor="green.200"
            >
              <HStack spacing={4} align="start">
                {historyData?.images?.length > 0 && (
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
                      {historyData?.product?.name}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Farm:</strong> {historyData?.parcel?.establishment?.name}
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
                      size="md"
                      onClick={() => navigate(`/production/${productionId}`)}
                      leftIcon={<FaHeart />}
                    >
                      Back to Product
                    </StandardButton>
                  </StandardAlert>
                ) : (
                  <VStack spacing={{ base: 5, md: 6 }} align="stretch">
                    {/* Rating Section */}
                    <StandardField
                      label="How would you rate this product?"
                      helpText="Consider farming practices, transparency, and overall quality"
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
                          {rating === 1 && 'Needs improvement'}
                          {rating === 2 && 'Some good farming practices'}
                          {rating === 3 && 'Good transparency and quality'}
                          {rating === 4 && 'Excellent farming transparency'}
                          {rating === 5 && 'Outstanding — highly transparent farm'}
                        </Text>
                      )}
                    </StandardField>

                    {/* Headline Section */}
                    <StandardField
                      label="Review Headline"
                      required
                      error={errors.headline?.message as string | undefined}
                      helpText="Highlight what stood out about this product's farming transparency"
                    >
                      <StandardInput
                        {...register('headline')}
                        placeholder="e.g., 'Very transparent farm' or 'Great documented practices'"
                      />
                    </StandardField>

                    {/* Photo Upload Section */}
                    <StandardField
                      label="Add Photo (Optional)"
                      helpText="Share a photo that shows the product's quality or sustainable packaging"
                    >
                      <TrazoImageUpload
                        maxFiles={3}
                        maxSize={10 * 1024 * 1024}
                        existingImages={uploadedImageUrls}
                        onImagesChange={setUploadedImageUrls}
                      />
                    </StandardField>

                    {/* Review Text Section */}
                    <StandardField
                      label="Your Review"
                      required
                      error={errors.written_review?.message as string | undefined}
                      helpText="Share what you learned about how this food was grown and what influenced your choice"
                    >
                      <StandardTextarea
                        {...register('written_review')}
                        placeholder="What did you discover about how this food was grown? Did the farming transparency influence your purchase decision? Would you recommend this farm to others?"
                        rows={5}
                      />
                    </StandardField>

                    {/* Submit Button */}
                    <Flex justify="space-between" align="center" pt={4}>
                      <StandardButton variant="outline" onClick={() => navigate(-1)}>
                        Cancel
                      </StandardButton>
                      <StandardButton
                        type="submit"
                        isLoading={isLoadingReview}
                        loadingText="Submitting Review..."
                        leftIcon={<FaLeaf />}
                        disabled={!rating || rating === 0}
                      >
                        Share Review
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
