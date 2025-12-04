import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Image,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Heading,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
  Flex,
  Circle
} from '@chakra-ui/react';
import { FaShieldAlt, FaCheckCircle, FaCamera, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';

interface PhotoVerificationProps {
  transparencyData: any;
  isVisible: boolean;
}

interface CategoryData {
  consumer_name: string;
  consumer_description: string;
  actual_count: number;
  photo_verified_count: number;
  photo_verification_rate: number;
  requires_photos: boolean;
  verification_strength: string;
  photo_trust_message: string;
  examples: string;
}

export const PhotoVerificationGallery: React.FC<PhotoVerificationProps> = ({
  transparencyData,
  isVisible
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const accentColor = useColorModeValue('green.500', 'green.400');

  if (!isVisible || !transparencyData?.standard_view?.transparency_details?.category_breakdown) {
    return null;
  }

  const categoryBreakdown = transparencyData.standard_view.transparency_details.category_breakdown;

  const getVerificationIcon = (strength: string) => {
    switch (strength) {
      case 'strong':
        return { icon: FaShieldAlt, color: 'green.500', label: 'Strong Verification' };
      case 'moderate':
        return { icon: FaCheckCircle, color: 'blue.500', label: 'Moderate Verification' };
      case 'basic':
        return { icon: FaCamera, color: 'yellow.500', label: 'Basic Verification' };
      case 'minimal':
        return { icon: FaExclamationTriangle, color: 'orange.500', label: 'Limited Verification' };
      default:
        return { icon: FaEye, color: 'gray.500', label: 'Standard Documentation' };
    }
  };

  const getVerificationBadgeColor = (strength: string) => {
    switch (strength) {
      case 'strong':
        return 'green';
      case 'moderate':
        return 'blue';
      case 'basic':
        return 'yellow';
      case 'minimal':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    onOpen();
  };

  const renderCategoryPhotos = (categoryName: string, data: CategoryData) => {
    // For MVP, we'll show placeholder verification status
    // In production, this would connect to actual event photo galleries
    const mockPhotos =
      data.photo_verified_count > 0
        ? Array.from({ length: Math.min(data.photo_verified_count, 4) }, (_, i) => ({
            id: i,
            url: `/api/placeholder/300x200?text=Verified+${data.consumer_name}+${i + 1}`,
            alt: `${data.consumer_name} verification photo ${i + 1}`,
            description: `${data.consumer_name} practice documentation`
          }))
        : [];

    const verificationInfo = getVerificationIcon(data.verification_strength);

    return (
      <AccordionItem key={categoryName} border="none">
        <AccordionButton px={0} py={4}>
          <HStack flex="1" spacing={3} align="center">
            <Circle size="10" bg={`${verificationInfo.color}`} color="white">
              <Icon as={verificationInfo.icon} boxSize={4} />
            </Circle>
            <VStack align="start" spacing={0} flex="1">
              <HStack justify="space-between" w="full">
                <Text fontSize="md" fontWeight="semibold" textAlign="left">
                  {data.consumer_name}
                </Text>
                <Badge
                  colorScheme={getVerificationBadgeColor(data.verification_strength)}
                  variant="solid"
                  fontSize="xs"
                >
                  {data.photo_trust_message}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600" textAlign="left">
                {data.consumer_description}
              </Text>
            </VStack>
          </HStack>
          <AccordionIcon />
        </AccordionButton>

        <AccordionPanel px={0} py={4}>
          <VStack spacing={4} align="stretch">
            {/* Verification Status */}
            <Box p={3} bg="gray.50" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Verification Status
                </Text>
                <Icon as={MdVerified} color={verificationInfo.color} boxSize={4} />
              </HStack>
              <Text fontSize="sm" color="gray.700">
                {data.photo_verification_rate}% of practices have photo verification
              </Text>
              <Text fontSize="xs" color="gray.600" mt={1}>
                {data.actual_count} total practices • {data.photo_verified_count} photo-verified
              </Text>
            </Box>

            {/* Photo Gallery */}
            {mockPhotos.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={3}>
                  Verification Photos ({mockPhotos.length})
                </Text>
                <SimpleGrid columns={2} spacing={3}>
                  {mockPhotos.map((photo) => (
                    <Box
                      key={photo.id}
                      position="relative"
                      cursor="pointer"
                      onClick={() => openImageModal(photo.url)}
                      borderRadius="md"
                      overflow="hidden"
                      bg="gray.100"
                      aspectRatio="4/3"
                    >
                      <Image
                        src={photo.url}
                        alt={photo.alt}
                        w="full"
                        h="full"
                        objectFit="cover"
                        transition="transform 0.2s"
                        _hover={{ transform: 'scale(1.05)' }}
                      />
                      <Box
                        position="absolute"
                        top={2}
                        right={2}
                        bg="green.500"
                        color="white"
                        borderRadius="full"
                        p={1}
                      >
                        <Icon as={FaCheckCircle} boxSize={3} />
                      </Box>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Practice Examples */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                What This Includes
              </Text>
              <Text fontSize="sm" color="gray.600">
                {data.examples}
              </Text>
            </Box>
          </VStack>
        </AccordionPanel>
      </AccordionItem>
    );
  };

  // Calculate overall photo verification stats
  const photoVerifiedCategories = Object.values(categoryBreakdown).filter(
    (data: any) => data.photo_verified_count > 0
  ).length;
  const totalCategories = Object.keys(categoryBreakdown).length;
  const overallPhotoRate =
    Object.values(categoryBreakdown).reduce(
      (sum: number, data: any) => sum + (data.photo_verification_rate || 0),
      0
    ) / totalCategories;

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      border="2px solid"
      borderColor={borderColor}
      shadow="lg"
      overflow="hidden"
      mt={6}
    >
      {/* Header */}
      <Box
        bg="linear-gradient(135deg, green.50, blue.50)"
        px={6}
        py={4}
        borderBottomWidth="1px"
        borderBottomColor={borderColor}
      >
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={0}>
            <HStack spacing={2}>
              <Icon as={FaCamera} color={accentColor} boxSize={5} />
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                Photo Verification
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Visual proof of farming practices
            </Text>
          </VStack>

          <VStack align="end" spacing={0}>
            <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
              {Math.round(overallPhotoRate)}%
            </Text>
            <Text fontSize="xs" color="gray.600">
              Photo Verified
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Content */}
      <Box p={6}>
        <VStack spacing={4} align="stretch">
          {/* Summary Stats */}
          <HStack spacing={6} justify="center" py={4}>
            <VStack spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color={accentColor}>
                {photoVerifiedCategories}
              </Text>
              <Text fontSize="xs" color="gray.600" textAlign="center">
                Categories with
                <br />
                Photo Verification
              </Text>
            </VStack>

            <VStack spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color={accentColor}>
                {Object.values(categoryBreakdown).reduce(
                  (sum: number, data: any) => sum + (data.photo_verified_count || 0),
                  0
                )}
              </Text>
              <Text fontSize="xs" color="gray.600" textAlign="center">
                Total Photo
                <br />
                Verified Practices
              </Text>
            </VStack>
          </HStack>

          {/* Category Breakdown */}
          <Box>
            <Heading size="sm" mb={3} color="gray.700">
              Verification by Practice Type
            </Heading>
            <Accordion allowMultiple defaultIndex={[0]}>
              {Object.entries(categoryBreakdown).map(([categoryName, data]: [string, any]) =>
                renderCategoryPhotos(categoryName, data)
              )}
            </Accordion>
          </Box>
        </VStack>
      </Box>

      {/* Image Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={0}>
            {selectedImage && (
              <Image
                src={selectedImage}
                alt="Verification photo"
                w="full"
                h="auto"
                maxH="80vh"
                objectFit="contain"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default PhotoVerificationGallery;
