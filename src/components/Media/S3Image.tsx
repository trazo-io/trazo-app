import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image, Box, Skeleton, Alert, AlertIcon, Icon, ImageProps } from '@chakra-ui/react';
import { FiImage } from 'react-icons/fi';
import { useLazyGetPresignedReadUrlQuery } from 'store/api/mediaApi';

// S3 URL patterns for detection
const S3_BUCKET_PATTERN = /staging-trazo-media-\d+\.s3\.amazonaws\.com/;
const PRESIGNED_URL_PATTERN = /X-Amz-Signature/;

export interface S3ImageProps extends Omit<ImageProps, 'src' | 'onLoad' | 'onError'> {
  /** Source URL - can be S3 URL or regular URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Fallback image URL when loading fails */
  fallbackSrc?: string;
  /** Custom placeholder component */
  placeholder?: React.ReactNode;
  /** Object fit for image */
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  /** Enable lazy loading (default: true) */
  lazy?: boolean;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Box size for container */
  boxSize?: string | number;
  /** Border radius */
  borderRadius?: string;
  /** Additional CSS class */
  className?: string;
  /** Enable fade-in animation */
  enableFadeIn?: boolean;
  /** Show error message instead of just icon */
  showErrorMessage?: boolean;
  /** Pre-fetched presigned URL from batch loading (2025 Best Practice) */
  presignedUrl?: string | null;
}

/**
 * S3Image Component - Modern React image component for 2025
 *
 * Features:
 * - Automatic S3 presigned URL handling
 * - Lazy loading with IntersectionObserver
 * - Error handling with graceful fallbacks
 * - TypeScript support with full type safety
 * - Accessibility compliant (WCAG 2.1)
 * - Performance optimized with caching
 * - SSR compatible
 */
export const S3Image: React.FC<S3ImageProps> = ({
  src,
  alt,
  fallbackSrc = '/images/placeholder.jpg',
  placeholder,
  objectFit = 'cover',
  lazy = true,
  onLoad,
  onError,
  boxSize,
  borderRadius = 'md',
  className,
  enableFadeIn = true,
  showErrorMessage = false,
  presignedUrl,
  ...props
}) => {
  // State management
  const [isInView, setIsInView] = useState(!lazy);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // RTK Query hook for presigned URLs
  const [getPresignedUrl, { data: presignedData, isLoading, error: apiError }] =
    useLazyGetPresignedReadUrlQuery();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // Load images 50px before they enter viewport
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Check if URL needs presigned conversion
  const needsPresignedUrl = useCallback((url: string) => {
    return url && S3_BUCKET_PATTERN.test(url) && !PRESIGNED_URL_PATTERN.test(url);
  }, []);

  // Get presigned URL for S3 images (fallback to individual requests)
  useEffect(() => {
    if (!isInView || !src || presignedUrl !== undefined) return;

    if (needsPresignedUrl(src)) {
      getPresignedUrl({ s3_url: src });
    }
  }, [isInView, src, getPresignedUrl, needsPresignedUrl, presignedUrl]);

  // Determine display URL (prioritize batch presigned URL)
  const displayUrl = (() => {
    if (!src) return fallbackSrc;

    // 2025 Best Practice: Use batch-loaded presigned URL first
    if (presignedUrl) {
      return presignedUrl;
    }

    if (needsPresignedUrl(src)) {
      return presignedData?.presigned_url || fallbackSrc;
    }

    return src;
  })();

  // Image load handler
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    setRetryCount(0);
    onLoad?.();
  }, [onLoad]);

  // Image error handler with retry logic
  const handleImageError = useCallback(() => {
    if (retryCount < 2 && needsPresignedUrl(src)) {
      // Retry getting presigned URL
      setRetryCount((prev) => prev + 1);
      getPresignedUrl({ s3_url: src });
      return;
    }

    setImageError(true);
    onError?.();
  }, [retryCount, needsPresignedUrl, src, getPresignedUrl, onError]);

  // Loading state
  if (!isInView || (isLoading && !presignedData)) {
    return (
      <Box
        ref={containerRef}
        boxSize={boxSize}
        borderRadius={borderRadius}
        className={className}
        {...props}>
        {placeholder || (
          <Skeleton
            boxSize={boxSize}
            borderRadius={borderRadius}
            startColor="gray.100"
            endColor="gray.200"
          />
        )}
      </Box>
    );
  }

  // Error state
  if (apiError || imageError) {
    return (
      <Box
        ref={containerRef}
        boxSize={boxSize}
        borderRadius={borderRadius}
        className={className}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
        border="1px solid"
        borderColor="gray.200"
        {...props}>
        {showErrorMessage ? (
          <Alert status="warning" variant="subtle" borderRadius={borderRadius} fontSize="sm">
            <AlertIcon />
            Failed to load image
          </Alert>
        ) : (
          <Icon
            as={FiImage}
            color="gray.400"
            boxSize={boxSize ? `calc(${boxSize} * 0.3)` : '24px'}
          />
        )}
      </Box>
    );
  }

  // Success state - render image
  return (
    <Box
      ref={containerRef}
      boxSize={boxSize}
      borderRadius={borderRadius}
      className={className}
      position="relative"
      overflow="hidden"
      {...props}>
      {/* Loading skeleton overlay */}
      {!imageLoaded && (
        <Skeleton
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          borderRadius={borderRadius}
          startColor="gray.100"
          endColor="gray.200"
        />
      )}

      {/* Actual image */}
      <Image
        ref={imgRef}
        src={displayUrl}
        alt={alt}
        objectFit={objectFit}
        width="100%"
        height="100%"
        onLoad={handleImageLoad}
        onError={handleImageError}
        fallbackSrc={fallbackSrc}
        loading={lazy ? 'lazy' : 'eager'}
        opacity={imageLoaded ? 1 : 0}
        transition={enableFadeIn ? 'opacity 0.3s ease-in-out' : undefined}
        // Accessibility attributes
        role="img"
        aria-label={alt}
      />
    </Box>
  );
};

export default S3Image;
