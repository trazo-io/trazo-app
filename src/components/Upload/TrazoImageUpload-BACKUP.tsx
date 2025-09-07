/**
 * TrazoImageUpload - 2025 Modern Image Upload Component
 *
 * Features:
 * - Single unified interface (no multiple buttons)
 * - Drag & drop support
 * - Paste from clipboard
 * - Camera capture on mobile
 * - AI-powered image optimization
 * - Minimalist design aligned with Trazo brand
 * - Environment-aware storage (local dev / S3 production)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Image,
  IconButton,
  useColorModeValue,
  useToast,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Button,
  Grid,
  AspectRatio,
  useDisclosure,
  Circle,
  useBreakpointValue
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  FaCamera,
  FaCloudUploadAlt,
  FaTimes,
  FaCheck,
  FaMobileAlt,
  FaPaste,
  FaPlus
} from 'react-icons/fa';
import { IoMdImages } from 'react-icons/io';
import { useFileUpload } from '../../services/uploadService';
import { S3Image } from '../Media/S3Image';

const MotionBox = motion(Box);

export interface TrazoImageUploadProps {
  onUploadComplete?: (urls: string[]) => void;
  maxFiles?: number;
  maxSize?: number;
  existingImages?: string[];
  isLoading?: boolean;
  onImagesChange?: (urls: string[]) => void;
}

export const TrazoImageUpload: React.FC<TrazoImageUploadProps> = ({
  onUploadComplete,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  existingImages = [],
  isLoading = false,
  onImagesChange
}) => {
  // State management
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Use existingImages directly from props instead of internal state
  const uploadedUrls = existingImages || [];

  // Sync with existingImages prop changes
  useEffect(() => {
    // Clear any selected files when existingImages changes
    // This prevents confusion when the parent updates the image list
    if (existingImages && existingImages.length > 0 && selectedFiles.length > 0) {
      setSelectedFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
    }
  }, [existingImages]);

  // Hooks
  const toast = useToast();
  const { uploadMultipleFiles } = useFileUpload();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const [previewIndex, setPreviewIndex] = useState(0);

  // Theme
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBorderColor = useColorModeValue('green.400', 'green.300');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');
  const uploadBg = useColorModeValue('gray.50', 'gray.700');
  const uploadHoverBg = useColorModeValue('gray.100', 'gray.600');

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const gridColumns = useBreakpointValue({ base: 2, sm: 3, md: 4, lg: 5 });

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewUrls]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: File[]) => {
      const totalFiles = selectedFiles.length + uploadedUrls.length + files.length;

      if (totalFiles > maxFiles) {
        toast({
          title: 'Too many files',
          description: `You can only upload up to ${maxFiles} images`,
          status: 'warning',
          duration: 3000
        });
        return;
      }

      // Validate file sizes
      const oversizedFiles = files.filter((file) => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        toast({
          title: 'Files too large',
          description: `Some files exceed the ${maxSize / 1024 / 1024}MB limit`,
          status: 'error',
          duration: 3000
        });
        return;
      }

      // Create preview URLs
      const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
      setSelectedFiles((prev) => [...prev, ...files]);
    },
    [selectedFiles, uploadedUrls, maxFiles, maxSize, toast]
  );

  // Dropzone configuration - use legacy format for compatibility
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    maxFiles: maxFiles - uploadedUrls.length - selectedFiles.length,
    maxSize,
    disabled: isUploading || isLoading,
    noClick: true // We'll handle clicks manually for better UX
  });

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        handleFileSelect(imageFiles);
        toast({
          title: 'Images pasted',
          description: `${imageFiles.length} image(s) pasted from clipboard`,
          status: 'success',
          duration: 2000
        });
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFileSelect, toast]);

  // Camera functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (error) {
      toast({
        title: 'Camera access denied',
        description: 'Please enable camera permissions to take photos',
        status: 'error',
        duration: 3000
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFileSelect([file]);
            closeCamera();
          }
        },
        'image/jpeg',
        0.9
      );
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Upload files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const urls = await uploadMultipleFiles(selectedFiles);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Calculate new complete image list with deduplication
      const newCompleteList = [...new Set([...uploadedUrls, ...urls])];

      // Clear selected files and previews
      setSelectedFiles([]);
      setPreviewUrls([]);

      // Primary callback - use onImagesChange if available, fallback to onUploadComplete
      if (onImagesChange) {
        onImagesChange(newCompleteList);
      } else if (onUploadComplete) {
        onUploadComplete(urls);
      }

      toast({
        title: 'Images uploaded successfully',
        description: `${urls.length} image${urls.length > 1 ? 's' : ''} uploaded to your gallery`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        status: 'error',
        duration: 3000
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove uploaded image
  const removeUploadedImage = (index: number) => {
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    if (onImagesChange) {
      onImagesChange(newUrls);
    }
  };

  // Open file picker
  const openFilePicker = () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  // Preview modal
  const openPreview = (index: number) => {
    setPreviewIndex(index);
    onPreviewOpen();
  };

  const totalImages = uploadedUrls.length + selectedFiles.length;
  const canAddMore = totalImages < maxFiles;

  return (
    <VStack spacing={4} w="100%" align="stretch">
      {/* Main Upload Area */}
      <Box
        {...getRootProps()}
        position="relative"
        borderRadius="2xl"
        border="2px dashed"
        borderColor={isDragActive ? accentColor : borderColor}
        bg={isDragActive ? uploadHoverBg : uploadBg}
        transition="all 0.3s ease"
        overflow="hidden"
        p={6}
        cursor={canAddMore ? 'pointer' : 'default'}
        _hover={
          canAddMore
            ? {
                borderColor: hoverBorderColor,
                bg: uploadHoverBg,
                transform: 'translateY(-2px)',
                boxShadow: 'lg'
              }
            : {}
        }>
        <input {...getInputProps()} />

        {/* Content based on state */}
        {totalImages === 0 ? (
          // Empty state
          <MotionBox
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}>
            <VStack spacing={6} py={8}>
              <Circle size="80px" bg={useColorModeValue('green.50', 'green.900')}>
                <Icon as={IoMdImages} boxSize={10} color={accentColor} />
              </Circle>

              <VStack spacing={2}>
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                  Add your images
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  Drag & drop, paste, or capture photos
                </Text>
              </VStack>

              {/* Action buttons */}
              <HStack spacing={3}>
                <Button
                  type="button"
                  size="md"
                  bg={accentColor}
                  color="white"
                  leftIcon={<FaPlus />}
                  onClick={openFilePicker}
                  _hover={{ bg: useColorModeValue('green.600', 'green.500') }}
                  borderRadius="xl">
                  Choose Files
                </Button>

                {isMobile && (
                  <IconButton
                    type="button"
                    aria-label="Take photo"
                    icon={<FaCamera />}
                    size="md"
                    variant="outline"
                    colorScheme="green"
                    onClick={openCamera}
                    borderRadius="xl"
                  />
                )}
              </HStack>

              {/* Help text */}
              <HStack spacing={4} fontSize="xs" color={mutedColor}>
                <HStack>
                  <Icon as={FaPaste} />
                  <Text>Paste with Ctrl+V</Text>
                </HStack>
                {isMobile && (
                  <HStack>
                    <Icon as={FaMobileAlt} />
                    <Text>Tap to capture</Text>
                  </HStack>
                )}
              </HStack>
            </VStack>
          </MotionBox>
        ) : (
          // Images grid
          <MotionBox
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <Grid templateColumns={`repeat(${gridColumns}, 1fr)`} gap={3}>
              {/* Uploaded images */}
              {uploadedUrls.map((url, index) => (
                <AspectRatio key={`uploaded-${index}`} ratio={1}>
                  <Box
                    position="relative"
                    borderRadius="xl"
                    overflow="hidden"
                    bg="gray.100"
                    cursor="pointer"
                    onClick={() => openPreview(index)}
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.05)', boxShadow: 'lg' }}>
                    <S3Image
                      src={url}
                      alt={`Image ${index + 1}`}
                      objectFit="cover"
                      w="100%"
                      h="100%"
                    />

                    {/* Success indicator */}
                    <Circle
                      position="absolute"
                      top={2}
                      left={2}
                      size="24px"
                      bg="green.500"
                      color="white">
                      <Icon as={FaCheck} boxSize={3} />
                    </Circle>

                    {/* Remove button */}
                    <IconButton
                      type="button"
                      aria-label="Remove"
                      icon={<FaTimes />}
                      size="xs"
                      position="absolute"
                      top={2}
                      right={2}
                      colorScheme="red"
                      variant="solid"
                      borderRadius="full"
                      opacity={0}
                      _groupHover={{ opacity: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadedImage(index);
                      }}
                    />
                  </Box>
                </AspectRatio>
              ))}

              {/* Selected files preview */}
              {selectedFiles.map((file, index) => (
                <AspectRatio key={`selected-${index}`} ratio={1}>
                  <Box
                    position="relative"
                    borderRadius="xl"
                    overflow="hidden"
                    bg="gray.100"
                    border="2px solid"
                    borderColor={accentColor}
                    opacity={isUploading ? 0.7 : 1}>
                    <Image
                      src={previewUrls[index]}
                      alt={file.name}
                      objectFit="cover"
                      w="100%"
                      h="100%"
                    />

                    {/* Remove button */}
                    {!isUploading && (
                      <IconButton
                        type="button"
                        aria-label="Remove"
                        icon={<FaTimes />}
                        size="xs"
                        position="absolute"
                        top={2}
                        right={2}
                        colorScheme="red"
                        variant="solid"
                        borderRadius="full"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedFile(index);
                        }}
                      />
                    )}
                  </Box>
                </AspectRatio>
              ))}

              {/* Add more button */}
              {canAddMore && (
                <AspectRatio ratio={1}>
                  <Box
                    as="button"
                    type="button"
                    borderRadius="xl"
                    border="2px dashed"
                    borderColor={borderColor}
                    bg="transparent"
                    onClick={openFilePicker}
                    transition="all 0.2s"
                    _hover={{
                      borderColor: accentColor,
                      bg: uploadHoverBg,
                      transform: 'scale(1.05)'
                    }}>
                    <VStack spacing={2}>
                      <Icon as={FaPlus} boxSize={6} color={mutedColor} />
                      <Text fontSize="xs" color={mutedColor}>
                        Add more
                      </Text>
                    </VStack>
                  </Box>
                </AspectRatio>
              )}
            </Grid>

            {/* Upload button for selected files */}
            {selectedFiles.length > 0 && (
              <Button
                type="button"
                mt={4}
                w="100%"
                size="lg"
                bg={accentColor}
                color="white"
                leftIcon={<FaCloudUploadAlt />}
                onClick={handleUpload}
                isLoading={isUploading}
                loadingText="Uploading..."
                _hover={{ bg: useColorModeValue('green.600', 'green.500') }}
                borderRadius="xl">
                Upload {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''}
              </Button>
            )}
          </MotionBox>
        )}

        {/* Upload progress */}
        {isUploading && uploadProgress > 0 && (
          <Box position="absolute" bottom={0} left={0} right={0}>
            <Progress value={uploadProgress} size="xs" colorScheme="green" borderRadius="full" />
          </Box>
        )}
      </Box>

      {/* Status text */}
      <HStack justify="space-between" fontSize="sm">
        <Text color={mutedColor}>
          {totalImages} of {maxFiles} images
        </Text>
        <Text color={mutedColor}>Max {maxSize / 1024 / 1024}MB per image</Text>
      </HStack>

      {/* Camera Modal */}
      <Modal isOpen={isCameraOpen} onClose={closeCamera} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalBody p={0}>
            <VStack spacing={4} p={4}>
              <Box borderRadius="xl" overflow="hidden" w="100%">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: 'auto' }}
                />
              </Box>

              <HStack spacing={4}>
                <Button
                  type="button"
                  size="lg"
                  colorScheme="green"
                  leftIcon={<FaCamera />}
                  onClick={capturePhoto}
                  borderRadius="xl">
                  Capture Photo
                </Button>
                <Button type="button" size="lg" variant="ghost" onClick={closeCamera} borderRadius="xl">
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="xl">
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalBody p={0}>
            <Box position="relative">
              <S3Image
                src={uploadedUrls[previewIndex]}
                alt={`Preview ${previewIndex + 1}`}
                w="100%"
                h="auto"
                borderRadius="2xl"
              />
              <IconButton
                type="button"
                aria-label="Close"
                icon={<FaTimes />}
                position="absolute"
                top={4}
                right={4}
                colorScheme="blackAlpha"
                borderRadius="full"
                onClick={onPreviewClose}
              />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};
