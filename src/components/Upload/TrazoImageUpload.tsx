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
import { useIntl } from 'react-intl';
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
  /**
   * Override the empty-state heading/subheading. The defaults say "Add your farm photos",
   * which is wrong wherever this is reused for something that is not a farm gallery — the
   * production cover-photo picker read "Add your farm photos" for a single hero image.
   */
  title?: string;
  subtitle?: string;
  /**
   * Compact mode: smaller icon, tighter padding, no help-text row. For single-image pickers
   * where a ~600px dropzone dwarfs the thing it is configuring.
   */
  compact?: boolean;
}

/** macOS uses ⌘, everything else Ctrl. `navigator.platform` is deprecated but still the
 *  most reliable signal available synchronously; the fallback is the safe majority case. */
const isMacPlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
};

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
  onImagesChange,
  title,
  subtitle,
  compact = false
}) => {
  // State management - SIMPLIFIED for farmers
  const intl = useIntl();
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
  const accentColor = useColorModeValue('green.700', 'green.300');
  const uploadBg = useColorModeValue('gray.50', 'gray.700');
  const uploadHoverBg = useColorModeValue('gray.100', 'gray.600');
  const successColor = useColorModeValue('green.700', 'green.300');
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
      const isHeicByExtension = (file: File) => /\.(heic|heif)$/i.test(file.name);
      const invalidFiles = files.filter(
        (file) => !allowedTypes.includes(file.type) && !isHeicByExtension(file)
      );
      if (invalidFiles.length > 0) {
        toast({
          title: intl.formatMessage({
            id: 'upload.toast.invalidType',
            defaultMessage: 'Invalid file type'
          }),
          description: intl.formatMessage({
            id: 'upload.toast.invalidTypeBody',
            defaultMessage: 'Only JPG, PNG, GIF, WEBP and HEIC images are allowed'
          }),
          status: 'error',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      // Validation
      if (newTotal > maxFiles) {
        toast({
          title: intl.formatMessage({
            id: 'upload.toast.tooMany',
            defaultMessage: 'Too many photos'
          }),
          description: intl.formatMessage(
            {
              id: 'upload.toast.tooManyBody',
              defaultMessage: 'You can only add up to {max} photos in total'
            },
            { max: maxFiles }
          ),
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
          title: intl.formatMessage({
            id: 'upload.toast.tooLarge',
            defaultMessage: 'Photos too large'
          }),
          description: intl.formatMessage(
            {
              id: 'upload.toast.tooLargeBody',
              defaultMessage: 'Some photos are too large. Maximum size: {mb}MB'
            },
            { mb: maxSize / 1024 / 1024 }
          ),
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
              `[TrazoImageUpload] Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(
                fileToUpload.size / 1024
              ).toFixed(0)}KB`
            );
          } catch (compressionError) {
            // Compression failed - upload original (server will compress)
            console.warn(
              '[TrazoImageUpload] Client compression failed, uploading original:',
              compressionError
            );
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
                title: intl.formatMessage({
                  id: 'upload.toast.savedOffline',
                  defaultMessage: 'Photo saved offline'
                }),
                description: intl.formatMessage(
                  {
                    id: 'upload.toast.savedOfflineBody',
                    defaultMessage: '{name} will upload automatically when you reconnect.'
                  },
                  { name: file.name }
                ),
                status: 'info',
                duration: 4000,
                isClosable: true
              });
              continue;
            } catch (queueError) {
              console.error('Failed to queue photo offline:', queueError);
            }
          }

          let errorMessage = intl.formatMessage({
            id: 'upload.error.retryHint',
            defaultMessage: 'Upload failed. Tap to retry.'
          });
          let toastTitle = intl.formatMessage({
            id: 'upload.error.title',
            defaultMessage: 'Upload failed'
          });
          let toastDescription = intl.formatMessage(
            {
              id: 'upload.error.body',
              defaultMessage: 'Could not upload {name}. Check your connection and try again.'
            },
            { name: file.name }
          );

          if (isStorageQuotaError(error)) {
            const quotaError = (
              error as { data: { error: string; remaining_gb?: number; limit_gb?: number } }
            ).data;
            errorMessage = intl.formatMessage({
              id: 'upload.error.storageShort',
              defaultMessage: 'Storage limit reached.'
            });
            toastTitle = intl.formatMessage({
              id: 'upload.toast.storageLimit',
              defaultMessage: 'Storage limit reached'
            });
            toastDescription =
              quotaError.remaining_gb !== undefined
                ? intl.formatMessage(
                    {
                      id: 'upload.error.storageRemaining',
                      defaultMessage:
                        'You have {remaining} GB remaining of {limit} GB. Upgrade your plan for more storage.'
                    },
                    { remaining: quotaError.remaining_gb.toFixed(2), limit: quotaError.limit_gb }
                  )
                : quotaError.error ||
                  intl.formatMessage({
                    id: 'upload.error.storageGeneric',
                    defaultMessage: 'Your storage limit has been reached. Upgrade your plan.'
                  });
          }

          // Mark as error by file name
          setUploadingFiles((prev) =>
            prev.map((item) =>
              item.file.name === file.name ? { ...item, status: 'error', errorMessage } : item
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
          title: intl.formatMessage({
            id: 'upload.toast.pasted',
            defaultMessage: '📋 Photos pasted'
          }),
          description: intl.formatMessage(
            {
              id: 'upload.toast.pastedBody',
              defaultMessage:
                '{count, plural, one {# photo pasted from the clipboard} other {# photos pasted from the clipboard}}'
            },
            { count: imageFiles.length }
          ),
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
        title: intl.formatMessage({
          id: 'upload.toast.cameraUnavailable',
          defaultMessage: 'Camera unavailable'
        }),
        description: intl.formatMessage({
          id: 'upload.toast.cameraUnavailableBody',
          defaultMessage: 'Check camera permissions and try again'
        }),
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
        description: intl.formatMessage({
          id: 'upload.toast.uploadedBody',
          defaultMessage: 'Photo uploaded successfully'
        }),
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
        const quotaError = (
          error as { data: { error: string; remaining_gb?: number; limit_gb?: number } }
        ).data;
        toast({
          title: intl.formatMessage({
            id: 'upload.toast.storageLimit',
            defaultMessage: 'Storage limit reached'
          }),
          description:
            quotaError.remaining_gb !== undefined
              ? `You have ${quotaError.remaining_gb.toFixed(2)} GB remaining out of ${
                  quotaError.limit_gb
                } GB. Upgrade your plan for more storage.`
              : quotaError.error ||
                'Your storage limit has been reached. Please upgrade your plan.',
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
        <input
          {...getInputProps()}
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
        />

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
            <VStack spacing={compact ? 3 : 6} py={compact ? 3 : 8}>
              <Circle
                size={compact ? '48px' : '80px'}
                bg={useColorModeValue('green.50', 'green.900')}
              >
                <Icon as={IoMdImages} boxSize={compact ? 6 : 10} color={accentColor} />
              </Circle>

              <VStack spacing={compact ? 1 : 2}>
                <Text
                  fontSize={compact ? 'md' : 'lg'}
                  fontWeight="semibold"
                  color={textColor}
                  textAlign="center"
                >
                  {title ??
                    intl.formatMessage({
                      id: 'upload.addPhotos',
                      defaultMessage: 'Add your farm photos'
                    })}
                </Text>
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  {subtitle ??
                    intl.formatMessage({
                      id: 'upload.autoUpload',
                      defaultMessage: 'Photos upload automatically when selected'
                    })}
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
                  _hover={{ bg: useColorModeValue('green.800', 'green.200') }}
                  borderRadius="xl"
                >
                  {intl.formatMessage({
                    id: 'upload.choosePhotos',
                    defaultMessage: 'Choose Photos'
                  })}
                </Button>

                {isMobile && (
                  <IconButton
                    type="button"
                    aria-label={intl.formatMessage({
                      id: 'upload.aria.takePhoto',
                      defaultMessage: 'Take photo'
                    })}
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
              <HStack
                spacing={4}
                fontSize="xs"
                color={mutedColor}
                display={compact ? 'none' : 'flex'}
              >
                <HStack>
                  <Icon as={FaPaste} />
                  {/* Was hard-coded "Ctrl+V" — wrong on macOS, which is most of this team's
                      and most growers' laptops. The modifier is detected, not assumed. */}
                  <Text>
                    {intl.formatMessage(
                      { id: 'upload.pasteHint', defaultMessage: 'Paste with {shortcut}' },
                      { shortcut: isMacPlatform() ? '⌘V' : 'Ctrl+V' }
                    )}
                  </Text>
                </HStack>
                {isMobile && (
                  <HStack>
                    <Icon as={FaMobileAlt} />
                    <Text>
                      {intl.formatMessage({
                        id: 'upload.tapToCapture',
                        defaultMessage: 'Tap to capture'
                      })}
                    </Text>
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
                      aria-label={intl.formatMessage({
                        id: 'upload.aria.removePhoto',
                        defaultMessage: 'Remove photo'
                      })}
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
                            {intl.formatMessage({ id: 'upload.retry', defaultMessage: 'Retry' })}
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
                        aria-label={intl.formatMessage({
                          id: 'upload.aria.removeFailed',
                          defaultMessage: 'Remove failed photo'
                        })}
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
                        {intl.formatMessage({ id: 'upload.addMore', defaultMessage: 'Add more' })}
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
            {intl.formatMessage({
              id: 'upload.error.banner',
              defaultMessage:
                'Some photos failed to upload. Check your internet connection and tap Retry to try again.'
            })}
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
            <Text fontSize="sm" color="green.700" fontWeight="semibold">
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
            aria-label={intl.formatMessage({
              id: 'upload.aria.progress',
              defaultMessage: 'Upload progress'
            })}
            sx={{
              '& > div': {
                background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                transition: 'width 0.1s ease'
              }
            }}
          />
        </Box>
      )}

      {/* Status text.
          Hidden in compact mode: "0 of 1 photos uploaded" is batch-progress framing on a
          single-image picker, where it reads as a task the farmer has failed to finish. The
          size limit stays — that one is still useful. */}
      <HStack justify="space-between" fontSize="sm">
        {compact ? (
          <Box />
        ) : (
          <Text color={mutedColor}>
            {intl.formatMessage(
              { id: 'upload.countUploaded', defaultMessage: '{count} of {max} photos uploaded' },
              { count: uploadedUrls.length, max: maxFiles }
            )}
          </Text>
        )}
        <Text color={mutedColor}>
          {intl.formatMessage(
            { id: 'upload.maxSize', defaultMessage: 'Max {mb}MB per photo' },
            { mb: maxSize / 1024 / 1024 }
          )}
        </Text>
      </HStack>

      {/* Camera Modal — full-bleed viewfinder on phones, centered dialog from `md` up */}
      <Modal
        isOpen={isCameraOpen}
        onClose={closeCamera}
        size={{ base: 'full', md: 'xl' }}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent
          borderRadius={{ base: 'none', md: '2xl' }}
          maxH={{ base: '100vh', md: '90vh' }}
          mx={{ base: 0, md: 4 }}
        >
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
                  {intl.formatMessage({
                    id: 'upload.capturePhoto',
                    defaultMessage: 'Capture Photo'
                  })}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={closeCamera}
                  borderRadius="xl"
                >
                  {intl.formatMessage({ id: 'upload.cancel', defaultMessage: 'Cancel' })}
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Preview Modal — full-bleed on phones, centered dialog from `md` up */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={onPreviewClose}
        size={{ base: 'full', md: 'xl' }}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent
          borderRadius={{ base: 'none', md: '2xl' }}
          maxH={{ base: '100vh', md: '90vh' }}
          mx={{ base: 0, md: 4 }}
        >
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
                aria-label={intl.formatMessage({
                  id: 'upload.aria.closePreview',
                  defaultMessage: 'Close preview'
                })}
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
