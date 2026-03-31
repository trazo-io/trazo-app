/**
 * TrazoImageUpload - 2025 GOLD-STANDARD FARMER-FRIENDLY VERSION
 *
 * Key Improvements for Farmers:
 * 1. "SELECT = UPLOAD" - No manual upload button
 * 2. Immediate visual feedback during upload
 * 3. Clear success/error states
 * 4. Smart retry mechanisms for poor connections
 * 5. Works seamlessly across all forms in the app
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
  useBreakpointValue,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  FaCamera,
  FaTimes,
  FaCheck,
  FaMobileAlt,
  FaPaste,
  FaPlus,
  FaExclamationTriangle,
  FaRedo
} from 'react-icons/fa';
import { IoMdImages } from 'react-icons/io';
import imageCompression from 'browser-image-compression';
import { useFileUpload, isStorageQuotaError } from '../../services/uploadService';
import { offlinePhotoQueue } from '../../services/offlinePhotoQueue';
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

interface UploadingFile {
  file: File;
  previewUrl: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export const TrazoImageUpload: React.FC<TrazoImageUploadProps> = ({
  onUploadComplete,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB - matches backend PhotoEvidenceService.MAX_FILE_SIZE
  existingImages = [],
  isLoading = false,
  onImagesChange
}) => {
  // State management - SIMPLIFIED for farmers
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Use existingImages directly - these are successfully uploaded
  const uploadedUrls = existingImages || [];

  // 🚨 CRITICAL FIX: Use ref to track current URLs for async operations
  // This prevents stale closure issues when uploads complete after parent state changes
  const uploadedUrlsRef = useRef<string[]>(existingImages || []);
  uploadedUrlsRef.current = existingImages || [];

  // Hooks
  const toast = useToast();
  const { uploadFile } = useFileUpload();
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
  const successColor = useColorModeValue('green.500', 'green.400');
  const errorColor = useColorModeValue('red.500', 'red.400');

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const gridColumns = useBreakpointValue({ base: 2, sm: 3, md: 4, lg: 5 });

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      uploadingFiles.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [uploadingFiles]);

  // 🔥 GOLD-STANDARD: IMMEDIATE UPLOAD ON SELECTION
  const handleFileSelect = useCallback(
    async (files: File[]) => {
      const currentTotal = uploadedUrls.length + uploadingFiles.length;
      const newTotal = currentTotal + files.length;

      // File type validation - includes HEIC/HEIF for iPhone users
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif'
      ];
      // Some browsers report HEIC as empty string or application/octet-stream
      const isHeicByExtension = (file: File) =>
        /\.(heic|heif)$/i.test(file.name);
      const invalidFiles = files.filter(
        (file) => !allowedTypes.includes(file.type) && !isHeicByExtension(file)
      );
      if (invalidFiles.length > 0) {
        toast({
          title: 'Invalid file type',
          description: `Only JPG, PNG, GIF, WEBP, and HEIC images are allowed`,
          status: 'error',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      // Validation
      if (newTotal > maxFiles) {
        toast({
          title: 'Too many photos',
          description: `You can only add up to ${maxFiles} photos total`,
          status: 'warning',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      // Check file sizes
      const oversizedFiles = files.filter((file) => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        toast({
          title: 'Photos too large',
          description: `Some photos are too large. Max size: ${maxSize / 1024 / 1024}MB`,
          status: 'error',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      // 🚜 FARMER-FRIENDLY: Show immediate feedback
      const newUploadingFiles: UploadingFile[] = files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'uploading'
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // 🔥 IMMEDIATELY START UPLOADING - FIXED INDEXING
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // Update progress by file name to avoid indexing issues
          setUploadingFiles((prev) =>
            prev.map((item) => (item.file.name === file.name ? { ...item, progress: 10 } : item))
          );

          // 📦 Client-side compression before upload (massive mobile UX improvement)
          // Reduces 5MB iPhone photos to ~500KB-1MB, cutting upload time by 5-10x on poor connections
          let fileToUpload: File = file;
          try {
            const compressionOptions = {
              maxSizeMB: 2,
              maxWidthOrHeight: 2048,
              useWebWorker: true,
              preserveExif: false, // EXIF extracted server-side, stripped for privacy
              fileType: 'image/jpeg' as const,
              initialQuality: 0.8
            };
            fileToUpload = await imageCompression(file, compressionOptions);
            console.log(
              `[TrazoImageUpload] Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(fileToUpload.size / 1024).toFixed(0)}KB`
            );
          } catch (compressionError) {
            // Compression failed - upload original (server will compress)
            console.warn('[TrazoImageUpload] Client compression failed, uploading original:', compressionError);
            fileToUpload = file;
          }

          setUploadingFiles((prev) =>
            prev.map((item) => (item.file.name === file.name ? { ...item, progress: 25 } : item))
          );

          // Upload the (compressed) file
          const uploadedUrl = await uploadFile(fileToUpload);

          // Mark as successful by file name
          setUploadingFiles((prev) =>
            prev.map((item) =>
              item.file.name === file.name ? { ...item, progress: 100, status: 'success' } : item
            )
          );

          // IMMEDIATELY remove from uploading files BEFORE adding to uploaded
          setUploadingFiles((prev) => prev.filter((item) => item.file.name !== file.name));

          // 🚨 CRITICAL FIX: Use ref to get CURRENT URLs (not stale closure value)
          // This ensures we don't re-add URLs that were removed while upload was in progress
          const currentUrls = uploadedUrlsRef.current;
          const newUploadedUrls = [...currentUrls, uploadedUrl];
          console.log('[TrazoImageUpload] Upload complete:', {
            file: file.name,
            currentUrls,
            newUrl: uploadedUrl,
            newUploadedUrls
          });

          // Notify parent component
          if (onImagesChange) {
            onImagesChange(newUploadedUrls);
          } else if (onUploadComplete) {
            onUploadComplete([uploadedUrl]);
          }
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);

          // If offline, queue the photo for later upload
          if (!navigator.onLine) {
            try {
              await offlinePhotoQueue.enqueue(file);
              setUploadingFiles((prev) => prev.filter((item) => item.file.name !== file.name));
              toast({
                title: 'Photo saved offline',
                description: `${file.name} will upload automatically when you reconnect.`,
                status: 'info',
                duration: 4000,
                isClosable: true
              });
              continue;
            } catch (queueError) {
              console.error('Failed to queue photo offline:', queueError);
            }
          }

          let errorMessage = 'Upload failed. Tap to retry.';
          let toastTitle = 'Upload failed';
          let toastDescription = `Failed to upload ${file.name}. Check your connection and try again.`;

          if (isStorageQuotaError(error)) {
            const quotaError = (error as { data: { error: string; remaining_gb?: number; limit_gb?: number } }).data;
            errorMessage = 'Storage limit reached.';
            toastTitle = 'Storage limit reached';
            toastDescription =
              quotaError.remaining_gb !== undefined
                ? `You have ${quotaError.remaining_gb.toFixed(2)} GB remaining out of ${quotaError.limit_gb} GB. Upgrade your plan for more storage.`
                : quotaError.error || 'Your storage limit has been reached. Please upgrade your plan.';
          }

          // Mark as error by file name
          setUploadingFiles((prev) =>
            prev.map((item) =>
              item.file.name === file.name
                ? { ...item, status: 'error', errorMessage }
                : item
            )
          );

          toast({
            title: toastTitle,
            description: toastDescription,
            status: 'error',
            duration: 6000,
            isClosable: true
          });
        }
      }
    },
    [
      uploadedUrls,
      uploadingFiles,
      maxFiles,
      maxSize,
      toast,
      uploadFile,
      onImagesChange,
      onUploadComplete
    ]
  );

  // Try alternative approach - no accept prop at all, handle validation manually
  const dropzoneConfig = {
    onDrop: handleFileSelect,
    multiple: true,
    noClick: true,
    disabled: isLoading
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneConfig);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        handleFileSelect(imageFiles);
        toast({
          title: '📋 Photos pasted',
          description: `${imageFiles.length} photo(s) pasted from clipboard`,
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
      // Open modal first — the useEffect below will attach the stream
      // once the <video> element is rendered
      setIsCameraOpen(true);
    } catch (error) {
      toast({
        title: 'Camera unavailable',
        description: 'Please check camera permissions and try again',
        status: 'error',
        duration: 4000
      });
    }
  };

  // Attach camera stream to video element after modal renders
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

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
            const file = new File([blob], `farm-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
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

  // Retry failed upload
  const retryUpload = async (index: number) => {
    const failedFile = uploadingFiles[index];
    if (!failedFile) return;

    // Reset to uploading state by file name
    setUploadingFiles((prev) =>
      prev.map((item) =>
        item.file.name === failedFile.file.name
          ? { ...item, status: 'uploading', progress: 0, errorMessage: undefined }
          : item
      )
    );

    // Attempt upload again
    try {
      const uploadedUrl = await uploadFile(failedFile.file);

      // Success by file name
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.file.name === failedFile.file.name
            ? { ...item, progress: 100, status: 'success' }
            : item
        )
      );

      // 🚨 CRITICAL FIX: Use ref to get CURRENT URLs (not stale closure value)
      const currentUrls = uploadedUrlsRef.current;
      const newUploadedUrls = [...currentUrls, uploadedUrl];
      if (onImagesChange) {
        onImagesChange(newUploadedUrls);
      }

      toast({
        title: '✅ Upload successful',
        description: 'Photo uploaded successfully',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      const isQuotaError = isStorageQuotaError(error);
      const retryErrorMessage = isQuotaError
        ? 'Storage limit reached.'
        : 'Still having trouble. Check your connection.';

      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.file.name === failedFile.file.name
            ? { ...item, status: 'error', errorMessage: retryErrorMessage }
            : item
        )
      );

      if (isQuotaError) {
        const quotaError = (error as { data: { error: string; remaining_gb?: number; limit_gb?: number } }).data;
        toast({
          title: 'Storage limit reached',
          description:
            quotaError.remaining_gb !== undefined
              ? `You have ${quotaError.remaining_gb.toFixed(2)} GB remaining out of ${quotaError.limit_gb} GB. Upgrade your plan for more storage.`
              : quotaError.error || 'Your storage limit has been reached. Please upgrade your plan.',
          status: 'error',
          duration: 6000,
          isClosable: true
        });
      }
    }
  };

  // Remove uploaded image
  const removeUploadedImage = (index: number) => {
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    if (onImagesChange) {
      onImagesChange(newUrls);
    }
  };

  // Remove uploading/failed file
  const removeUploadingFile = (index: number) => {
    const fileToRemove = uploadingFiles[index];
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
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

  const totalImages = uploadedUrls.length + uploadingFiles.length;
  const canAddMore = totalImages < maxFiles;
  const isUploading = uploadingFiles.some((file) => file.status === 'uploading');
  const hasErrors = uploadingFiles.some((file) => file.status === 'error');

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
        }
      >
        <input {...getInputProps()} accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif" />

        {/* Content based on state */}
        {totalImages === 0 ? (
          // Empty state
          <MotionBox
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <VStack spacing={6} py={8}>
              <Circle size="80px" bg={useColorModeValue('green.50', 'green.900')}>
                <Icon as={IoMdImages} boxSize={10} color={accentColor} />
              </Circle>

              <VStack spacing={2}>
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                  Add your farm photos
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  Photos upload automatically when selected
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
                  borderRadius="xl"
                >
                  Choose Photos
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
            exit={{ opacity: 0 }}
          >
            <Grid templateColumns={`repeat(${gridColumns}, 1fr)`} gap={3}>
              {/* Uploaded images - CLEARLY SUCCESSFUL */}
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
                    _hover={{ transform: 'scale(1.05)', boxShadow: 'lg' }}
                    role="group"
                  >
                    <S3Image
                      src={url}
                      alt={`Farm photo ${index + 1}`}
                      objectFit="cover"
                      w="100%"
                      h="100%"
                    />

                    {/* 🟢 SUCCESS INDICATOR - CLEAR FOR FARMERS */}
                    <Circle
                      position="absolute"
                      top={2}
                      left={2}
                      size="28px"
                      bg={successColor}
                      color="white"
                      boxShadow="md"
                    >
                      <Icon as={FaCheck} boxSize={4} />
                    </Circle>

                    {/* Remove button */}
                    <IconButton
                      type="button"
                      aria-label="Remove photo"
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

              {/* Uploading/Error files - CLEAR STATES */}
              {uploadingFiles.map((item, index) => (
                <AspectRatio key={`uploading-${index}`} ratio={1}>
                  <Box
                    position="relative"
                    borderRadius="xl"
                    overflow="hidden"
                    bg="gray.100"
                    border="2px solid"
                    borderColor={
                      item.status === 'error'
                        ? errorColor
                        : item.status === 'success'
                        ? successColor
                        : accentColor
                    }
                  >
                    <Image
                      src={item.previewUrl}
                      alt={item.file.name}
                      objectFit="cover"
                      w="100%"
                      h="100%"
                      opacity={item.status === 'uploading' ? 0.7 : 1}
                    />

                    {/* Status indicators - SIMPLIFIED: Just progress bar at bottom */}
                    {item.status === 'uploading' && (
                      <Progress
                        value={item.progress}
                        size="sm"
                        colorScheme="green"
                        position="absolute"
                        bottom={0}
                        left={0}
                        right={0}
                        borderBottomRadius="xl"
                        bg="blackAlpha.300"
                        aria-label={`Uploading ${item.file.name}`}
                      />
                    )}

                    {item.status === 'error' && (
                      <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        textAlign="center"
                      >
                        <VStack spacing={2}>
                          <Circle size="40px" bg="red.500" color="white">
                            <Icon as={FaExclamationTriangle} boxSize={5} />
                          </Circle>
                          <Button
                            size="xs"
                            colorScheme="red"
                            leftIcon={<FaRedo />}
                            onClick={() => retryUpload(index)}
                            borderRadius="full"
                          >
                            Retry
                          </Button>
                        </VStack>
                      </Box>
                    )}

                    {item.status === 'success' && (
                      <Circle
                        position="absolute"
                        top={2}
                        left={2}
                        size="28px"
                        bg={successColor}
                        color="white"
                      >
                        <Icon as={FaCheck} boxSize={4} />
                      </Circle>
                    )}

                    {/* Remove button for failed uploads */}
                    {item.status === 'error' && (
                      <IconButton
                        type="button"
                        aria-label="Remove failed photo"
                        icon={<FaTimes />}
                        size="xs"
                        position="absolute"
                        top={2}
                        right={2}
                        colorScheme="red"
                        variant="solid"
                        borderRadius="full"
                        onClick={() => removeUploadingFile(index)}
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
                    }}
                  >
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
          </MotionBox>
        )}
      </Box>

      {/* 🚨 ERROR ALERTS - CLEAR FOR FARMERS */}
      {hasErrors && (
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          <AlertDescription>
            Some photos failed to upload. Check your internet connection and tap "Retry" to try
            again.
          </AlertDescription>
        </Alert>
      )}

      {/* 🔄 UPLOAD STATUS - Minimalist Trazo Pattern */}
      {isUploading && (
        <Box role="status" aria-live="polite" aria-atomic="true">
          <HStack justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" color={mutedColor}>
              Uploading {uploadingFiles.filter((f) => f.status === 'uploading').length} of{' '}
              {uploadingFiles.length}...
            </Text>
            <Text fontSize="sm" color="green.600" fontWeight="semibold">
              {Math.round(
                uploadingFiles.reduce((acc, f) => acc + f.progress, 0) / uploadingFiles.length
              )}
              %
            </Text>
          </HStack>
          <Progress
            value={uploadingFiles.reduce((acc, f) => acc + f.progress, 0) / uploadingFiles.length}
            size="xs"
            borderRadius="full"
            bg="gray.100"
            aria-label="Upload progress"
            sx={{
              '& > div': {
                background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                transition: 'width 0.1s ease'
              }
            }}
          />
        </Box>
      )}

      {/* Status text */}
      <HStack justify="space-between" fontSize="sm">
        <Text color={mutedColor}>
          {uploadedUrls.length} of {maxFiles} photos uploaded
        </Text>
        <Text color={mutedColor}>Max {maxSize / 1024 / 1024}MB per photo</Text>
      </HStack>

      {/* Camera Modal - Unchanged */}
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
                  borderRadius="xl"
                >
                  Capture Photo
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={closeCamera}
                  borderRadius="xl"
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Preview Modal - Unchanged */}
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
                aria-label="Close preview"
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
