import React, { useState, useCallback } from 'react';
import {
  Box,
  Flex,
  Image,
  SimpleGrid,
  Text,
  VStack,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  IconButton,
  HStack,
  Badge,
  useDisclosure,
  useColorModeValue,
  useBreakpointValue
} from '@chakra-ui/react';
import { FaCamera, FaChevronLeft, FaChevronRight, FaExpand, FaImage } from 'react-icons/fa';
import { S3Image } from 'components/Design';

export type ImageItem = string | { id: string; image: string; name?: string; description?: string };

interface StandardImageGalleryProps {
  images: ImageItem[];
  title?: string;
  variant?: 'default' | 'compact' | 'consumer';
  enablePreview?: boolean;
  showImageCount?: boolean;
  fallbackImage?: string;
  height?: string;
  borderRadius?: string;
  showEmptyState?: boolean;
  emptyStateIcon?: React.ComponentType;
  emptyStateText?: string;
  emptyStateSubtext?: string;
  maxDisplayImages?: number;
  aspectRatio?: string;
  clickable?: boolean;
}

const StandardImageGallery = ({
  images = [],
  title,
  variant = 'default',
  enablePreview = true,
  showImageCount = true,
  fallbackImage = '/assets/img/BgMusicCard.png',
  height = '300px',
  borderRadius = 'xl',
  showEmptyState = true,
  emptyStateIcon = FaImage,
  emptyStateText = 'No photos available',
  emptyStateSubtext = 'Photos will appear here when uploaded',
  maxDisplayImages = 3,
  aspectRatio = '16/9',
  clickable = true
}: StandardImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const overlayBg = useColorModeValue('blackAlpha.600', 'blackAlpha.800');

  const isMobile = useBreakpointValue({ base: true, lg: false });
  const gridColumns = useBreakpointValue({ base: 1, md: 2, lg: variant === 'compact' ? 2 : 3 });

  // Helper function to extract image data
  const getImageData = useCallback(
    (item: ImageItem): { url: string; name?: string; description?: string } => {
      if (typeof item === 'string') {
        return { url: item };
      }
      return { url: item.image, name: item.name, description: item.description };
    },
    []
  );

  // Process images for display
  const processedImages = images.map(getImageData);
  const hasImages = processedImages.length > 0;
  const displayImages = processedImages.slice(0, maxDisplayImages);
  const remainingCount = Math.max(0, processedImages.length - maxDisplayImages);

  // Handle image click for preview
  const handleImageClick = useCallback(
    (index: number) => {
      if (!enablePreview || !clickable) return;
      setCurrentImageIndex(index);
      onOpen();
    },
    [enablePreview, clickable, onOpen]
  );

  // Gallery navigation
  const goToPrevious = useCallback(() => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : processedImages.length - 1));
  }, [processedImages.length]);

  const goToNext = useCallback(() => {
    setCurrentImageIndex((prev) => (prev < processedImages.length - 1 ? prev + 1 : 0));
  }, [processedImages.length]);

  // Render empty state
  const renderEmptyState = () => {
    if (!showEmptyState) return null;

    return (
      <Box
        bg={bgColor}
        border="2px dashed"
        borderColor={borderColor}
        borderRadius={borderRadius}
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={8}
      >
        <VStack spacing={4} textAlign="center">
          <Icon as={emptyStateIcon} boxSize={12} color={textColor} />
          <VStack spacing={1}>
            <Text fontSize="md" fontWeight="600" color={textColor}>
              {emptyStateText}
            </Text>
            {emptyStateSubtext && (
              <Text fontSize="sm" color={textColor} opacity={0.8}>
                {emptyStateSubtext}
              </Text>
            )}
          </VStack>
        </VStack>
      </Box>
    );
  };

  // Render single image view (for 1 image)
  const renderSingleImage = () => {
    const imageData = processedImages[0];

    return (
      <Box position="relative">
        {title && (
          <Text fontSize="lg" fontWeight="600" mb={4} color="gray.700">
            {title}
          </Text>
        )}
        <Box
          position="relative"
          height={height}
          borderRadius={borderRadius}
          overflow="hidden"
          cursor={clickable ? 'pointer' : 'default'}
          onClick={() => handleImageClick(0)}
          _hover={
            clickable ? { transform: 'scale(1.02)', transition: 'transform 0.2s' } : undefined
          }
        >
          <S3Image
            src={imageData.url}
            alt={imageData.name || 'Gallery image'}
            w="100%"
            h="100%"
            objectFit="cover"
            fallbackSrc={fallbackImage}
          />

          {/* Expand overlay on hover */}
          {enablePreview && clickable && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="blackAlpha.500"
              opacity={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="opacity 0.2s"
              _hover={{ opacity: 1 }}
            >
              <Icon as={FaExpand} boxSize={8} color="white" />
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Render grid view (for multiple images)
  const renderGridView = () => {
    return (
      <Box>
        {title && (
          <HStack justify="space-between" align="center" mb={4}>
            <Text fontSize="lg" fontWeight="600" color="gray.700">
              {title}
            </Text>
            {showImageCount && (
              <Badge
                colorScheme="green"
                variant="subtle"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
              >
                {processedImages.length} {processedImages.length === 1 ? 'photo' : 'photos'}
              </Badge>
            )}
          </HStack>
        )}

        <SimpleGrid columns={gridColumns} spacing={4}>
          {displayImages.map((imageData, index) => (
            <Box
              key={index}
              position="relative"
              aspectRatio={aspectRatio}
              borderRadius={borderRadius}
              overflow="hidden"
              cursor={clickable ? 'pointer' : 'default'}
              onClick={() => handleImageClick(index)}
              boxShadow="md"
              border="2px solid transparent"
              _hover={
                clickable
                  ? {
                      transform: 'scale(1.03)',
                      transition: 'all 0.2s ease',
                      borderColor: 'green.400',
                      boxShadow: 'lg'
                    }
                  : undefined
              }
              transition="all 0.2s ease"
            >
              <S3Image
                src={imageData.url}
                alt={imageData.name || `Gallery image ${index + 1}`}
                w="100%"
                h="100%"
                objectFit="cover"
                fallbackSrc={fallbackImage}
                lazy={true}
              />

              {/* Show remaining count on last image */}
              {index === maxDisplayImages - 1 && remainingCount > 0 && (
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bg="blackAlpha.700"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  backdropFilter="blur(2px)"
                >
                  <VStack spacing={2}>
                    <Text color="white" fontSize="2xl" fontWeight="bold">
                      +{remainingCount}
                    </Text>
                    <Text color="whiteAlpha.900" fontSize="sm" fontWeight="medium">
                      more {remainingCount === 1 ? 'photo' : 'photos'}
                    </Text>
                  </VStack>
                </Box>
              )}

              {/* Expand overlay on hover */}
              {enablePreview &&
                clickable &&
                !(index === maxDisplayImages - 1 && remainingCount > 0) && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bg="blackAlpha.400"
                    opacity={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    transition="opacity 0.2s ease"
                    _hover={{ opacity: 1 }}
                  >
                    <VStack spacing={1}>
                      <Icon as={FaExpand} boxSize={6} color="white" />
                      <Text color="white" fontSize="xs" fontWeight="medium">
                        View Full Size
                      </Text>
                    </VStack>
                  </Box>
                )}

              {/* Image number indicator */}
              <Box
                position="absolute"
                top={2}
                left={2}
                bg="blackAlpha.700"
                color="white"
                px={2}
                py={1}
                borderRadius="md"
                fontSize="xs"
                fontWeight="medium"
                backdropFilter="blur(10px)"
              >
                {index + 1}
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    );
  };

  // Main component render
  if (!hasImages) {
    return renderEmptyState();
  }

  const content = processedImages.length === 1 ? renderSingleImage() : renderGridView();

  return (
    <>
      {content}

      {/* Full-screen preview modal */}
      {enablePreview && (
        <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
          <ModalOverlay bg={overlayBg} />
          <ModalContent
            bg="transparent"
            boxShadow="none"
            m={0}
            h="100vh"
            w="100vw"
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
            overflow="hidden"
          >
            <ModalCloseButton
              position="absolute"
              top={4}
              right={4}
              zIndex={20}
              bg="blackAlpha.700"
              color="white"
              size="lg"
              borderRadius="full"
              _hover={{ bg: 'blackAlpha.900' }}
              _focus={{ boxShadow: 'none' }}
            />

            <ModalBody
              p={4}
              w="100%"
              h="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="relative"
            >
              {/* Main image container */}
              <Box
                position="relative"
                w="100%"
                h="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <S3Image
                  src={processedImages[currentImageIndex]?.url}
                  alt={processedImages[currentImageIndex]?.name || 'Gallery preview'}
                  maxW="calc(100vw - 120px)"
                  maxH="calc(100vh - 120px)"
                  objectFit="contain"
                  fallbackSrc={fallbackImage}
                  borderRadius="lg"
                  boxShadow="2xl"
                  lazy={false}
                />

                {/* Desktop Navigation arrows */}
                {processedImages.length > 1 && (
                  <>
                    <IconButton
                      aria-label="Previous image"
                      icon={<FaChevronLeft />}
                      position="absolute"
                      left={4}
                      top="50%"
                      transform="translateY(-50%)"
                      bg="blackAlpha.700"
                      color="white"
                      size="lg"
                      borderRadius="full"
                      onClick={goToPrevious}
                      _hover={{ bg: 'blackAlpha.900', transform: 'translateY(-50%) scale(1.1)' }}
                      _focus={{ boxShadow: 'none' }}
                      transition="all 0.2s"
                      zIndex={15}
                      display={{ base: 'none', md: 'flex' }}
                    />

                    <IconButton
                      aria-label="Next image"
                      icon={<FaChevronRight />}
                      position="absolute"
                      right={4}
                      top="50%"
                      transform="translateY(-50%)"
                      bg="blackAlpha.700"
                      color="white"
                      size="lg"
                      borderRadius="full"
                      onClick={goToNext}
                      _hover={{ bg: 'blackAlpha.900', transform: 'translateY(-50%) scale(1.1)' }}
                      _focus={{ boxShadow: 'none' }}
                      transition="all 0.2s"
                      zIndex={15}
                      display={{ base: 'none', md: 'flex' }}
                    />
                  </>
                )}
              </Box>

              {/* Image counter - Fixed position */}
              {processedImages.length > 1 && (
                <Box
                  position="absolute"
                  bottom={6}
                  left="50%"
                  transform="translateX(-50%)"
                  bg="blackAlpha.700"
                  color="white"
                  px={4}
                  py={2}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="medium"
                  zIndex={15}
                  backdropFilter="blur(10px)"
                >
                  {currentImageIndex + 1} of {processedImages.length}
                </Box>
              )}

              {/* Mobile Navigation - Swipe areas */}
              {processedImages.length > 1 && isMobile && (
                <>
                  <Box
                    position="absolute"
                    left={0}
                    top={0}
                    bottom={0}
                    width="25%"
                    onClick={goToPrevious}
                    cursor="pointer"
                    zIndex={10}
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-start"
                    pl={2}
                  >
                    <Icon
                      as={FaChevronLeft}
                      color="whiteAlpha.800"
                      boxSize={8}
                      opacity={0.7}
                      _hover={{ opacity: 1 }}
                      transition="opacity 0.2s"
                    />
                  </Box>

                  <Box
                    position="absolute"
                    right={0}
                    top={0}
                    bottom={0}
                    width="25%"
                    onClick={goToNext}
                    cursor="pointer"
                    zIndex={10}
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                    pr={2}
                  >
                    <Icon
                      as={FaChevronRight}
                      color="whiteAlpha.800"
                      boxSize={8}
                      opacity={0.7}
                      _hover={{ opacity: 1 }}
                      transition="opacity 0.2s"
                    />
                  </Box>
                </>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default StandardImageGallery;
