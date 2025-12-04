/**
 * Product Main Card Component
 * Displays product information, images, and carbon data
 * Split from ProductDetail.tsx for better performance and maintainability
 */

import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  VStack,
  HStack,
  Icon,
  Heading,
  Text,
  Flex,
  useColorModeValue
} from '@chakra-ui/react';
import { FaLeaf } from 'react-icons/fa';
import { BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';
import { StandardImageGallery } from '../../../../components/Design/StandardComponents';
import { CarbonScore } from '../../../../components/CarbonScore';

interface ProductMainCardProps {
  completeData: any;
  onAuthRequired?: () => void;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const renderStar = (index: number) => {
    if (rating >= index + 1) return BsStarFill;
    if (rating > index + 0.5) return BsStarHalf;
    return BsStar;
  };

  return (
    <HStack spacing={{ base: '4px', md: '6px' }} color="orange.300">
      {[0, 1, 2, 3, 4].map((index) => (
        <Icon
          key={index}
          as={renderStar(index)}
          w={{ base: '16px', md: '20px' }}
          h={{ base: '16px', md: '20px' }}
        />
      ))}
      <Text fontSize={{ base: 'sm', md: 'md' }} color="orange.500" ml={2}>
        {rating.toFixed(1)}
      </Text>
    </HStack>
  );
};

export const ProductMainCard: React.FC<ProductMainCardProps> = ({
  completeData,
  onAuthRequired
}) => {
  const textColor = useColorModeValue('gray.800', 'white');
  const headerFontSize = { base: 'xl', sm: '2xl', md: '3xl' };

  // Calculate reputation for stars
  const safeReputation = Math.max(0, Math.min(5, (completeData as any)?.reputation || 4.2));

  // Check if we have product images
  const productImages = (completeData as any)?.images || [];

  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      mb={{ base: '30px', md: '60px' }}
      mt={{ base: '-60px', md: '-80px' }}
      position="relative"
      zIndex={10}
      px={{ base: 2, md: 0 }}
    >
      <Card
        w={{ base: '98%', sm: '96%', md: '90%', lg: '85%' }}
        p={{ base: '16px', sm: '20px', md: '32px', lg: '48px' }}
        boxShadow={{
          base: '0 4px 12px rgba(0, 0, 0, 0.08)',
          md: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        borderRadius={{ base: 'xl', md: '2xl' }}
        bg={useColorModeValue('white', 'gray.800')}
        overflow="hidden"
      >
        <CardHeader mb={{ base: '16px', md: '24px' }} pb={{ base: 2, md: 4 }}>
          <VStack spacing={3} w="full">
            <Heading
              color={textColor}
              fontSize={headerFontSize}
              fontWeight="bold"
              noOfLines={2}
              textAlign="start"
            >
              {(completeData as any)?.product?.name ||
                (completeData as any)?.farmer?.name ||
                'Product'}
            </Heading>

            <HStack>
              <VStack spacing={{ base: 2, md: 4 }} align="start" w="full">
                <StarRating rating={safeReputation} />

                <Text color="gray.500" fontSize={{ base: 'sm', md: 'lg' }} noOfLines={1}>
                  {(completeData as any)?.farmer?.location ||
                    (completeData as any)?.parcel?.location ||
                    'Farm Location'}
                </Text>
              </VStack>

              {completeData &&
                completeData.industryPercentile !== undefined &&
                completeData.industryPercentile > 0 && (
                  <HStack mt={2} spacing={2}>
                    <Icon as={FaLeaf} color="green.500" boxSize={{ base: 4, md: 5 }} />
                    <Text
                      color="green.500"
                      fontWeight="medium"
                      fontSize={{ base: 'sm', md: 'md' }}
                      noOfLines={2}
                    >
                      Greener than {completeData.industryPercentile}% of similar products
                    </Text>
                  </HStack>
                )}
            </HStack>
          </VStack>
        </CardHeader>

        <CardBody px={{ base: 0, md: 6 }} py={{ base: 4, md: 6 }}>
          <SimpleGrid
            columns={{ base: 1, lg: 2 }}
            spacing={{ base: 6, md: 8 }}
            mb={{ base: 6, md: 10 }}
          >
            <Box>
              {/* Product Images */}
              <Box mb={6}>
                <StandardImageGallery
                  images={productImages || []}
                  variant="product"
                  enablePreview={true}
                  showImageCount={true}
                  height="300px"
                  showEmptyState={true}
                  maxDisplayImages={3}
                />
              </Box>

              {/* Carbon Score */}
              <CarbonScore
                score={(() => {
                  const score = completeData?.carbonScore || 0;
                  console.log('🔍 CARBON SCORE COMPONENT - Raw value:', score);
                  const rounded = Math.round(score * 10) / 10;
                  console.log('🔍 CARBON SCORE COMPONENT - Rounded value:', rounded);
                  return rounded;
                })()}
                footprint={completeData?.netFootprint || 0}
                industryPercentile={completeData?.industryPercentile || 0}
              />
            </Box>

            {/* Additional content would go here - timeline, details, etc. */}
            <Box>
              {/* This section can be further split into Timeline and Details components */}
              <Text color="gray.600" fontSize="sm">
                Additional product details and timeline will be displayed here.
              </Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>
    </Flex>
  );
};

export default ProductMainCard;
