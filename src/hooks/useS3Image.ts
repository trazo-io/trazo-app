import { useState, useEffect } from 'react';
import { useLazyGetPresignedReadUrlQuery } from 'store/api/mediaApi';

// S3 URL patterns
const S3_BUCKET_PATTERN = /staging-trazo-media-\d+\.s3\.amazonaws\.com/;
const PRESIGNED_URL_PATTERN = /X-Amz-Signature/;

export interface UseS3ImageOptions {
  /** Enable automatic fetching of presigned URLs */
  autoFetch?: boolean;
  /** Fallback URL when image fails to load */
  fallbackUrl?: string;
}

export interface UseS3ImageResult {
  /** The URL to use for displaying the image */
  displayUrl: string;
  /** Whether the presigned URL is being fetched */
  isLoading: boolean;
  /** Error from API call */
  error: any;
  /** Whether the original URL needs presigning */
  needsPresigning: boolean;
  /** Manual refetch function */
  refetch: () => void;
}

/**
 * Hook for handling S3 image URLs with automatic presigned URL conversion
 * 
 * @param imageUrl - The image URL (S3 or regular)
 * @param options - Configuration options
 * @returns Object with display URL and loading state
 */
export const useS3Image = (
  imageUrl: string | null | undefined,
  options: UseS3ImageOptions = {}
): UseS3ImageResult => {
  const { 
    autoFetch = true, 
    fallbackUrl = '/images/placeholder.jpg' 
  } = options;

  const [displayUrl, setDisplayUrl] = useState<string>(imageUrl || fallbackUrl);
  
  const [getPresignedUrl, { data, isLoading, error }] = useLazyGetPresignedReadUrlQuery();

  // Check if URL needs presigning
  const needsPresigning = Boolean(
    imageUrl && 
    S3_BUCKET_PATTERN.test(imageUrl) && 
    !PRESIGNED_URL_PATTERN.test(imageUrl)
  );

  // Auto-fetch presigned URL if needed
  useEffect(() => {
    if (!imageUrl) {
      setDisplayUrl(fallbackUrl);
      return;
    }

    if (needsPresigning && autoFetch) {
      getPresignedUrl({ s3_url: imageUrl });
    } else if (!needsPresigning) {
      setDisplayUrl(imageUrl);
    }
  }, [imageUrl, needsPresigning, autoFetch, getPresignedUrl, fallbackUrl]);

  // Update display URL when presigned data arrives
  useEffect(() => {
    if (data?.presigned_url) {
      setDisplayUrl(data.presigned_url);
    } else if (error && fallbackUrl) {
      setDisplayUrl(fallbackUrl);
    }
  }, [data, error, fallbackUrl]);

  // Manual refetch function
  const refetch = () => {
    if (imageUrl && needsPresigning) {
      getPresignedUrl({ s3_url: imageUrl });
    }
  };

  return {
    displayUrl,
    isLoading,
    error,
    needsPresigning,
    refetch
  };
};

export default useS3Image;