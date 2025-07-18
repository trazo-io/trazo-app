import { useEffect, useMemo } from 'react';
import { useLazyGetBatchPresignedReadUrlsQuery } from '../store/api/mediaApi';

/**
 * 2025 Best Practice: Batch S3 Image Loading Hook
 * 
 * This hook implements the modern pattern for loading multiple S3 images
 * using a single batch API request instead of individual requests per image.
 * 
 * Benefits:
 * - Reduces HTTP request overhead
 * - Utilizes HTTP/2 multiplexing
 * - Optimizes for mobile networks
 * - Follows top-tier app patterns (Netflix, Instagram, etc.)
 */
export interface BatchS3ImagesOptions {
  /** List of S3 URLs to fetch presigned URLs for */
  s3Urls: string[];
  /** Whether to trigger the batch request immediately */
  enabled?: boolean;
  /** Skip empty/null URLs automatically */
  skipEmpty?: boolean;
}

export interface BatchS3ImagesResult {
  /** Map of original S3 URL to presigned URL */
  presignedUrls: Record<string, string | null>;
  /** Whether the batch request is currently loading */
  isLoading: boolean;
  /** Error if the batch request failed */
  error: any;
  /** Manually trigger the batch request */
  refetch: () => void;
  /** Performance metrics from the backend */
  metrics?: {
    batch_size: number;
    processing_time_ms: number;
    success_count: number;
  };
}

/**
 * Hook to batch load presigned URLs for multiple S3 images
 * 
 * @example
 * ```tsx
 * const establishments = [
 *   { image: 'https://bucket.s3.amazonaws.com/image1.jpg' },
 *   { image: 'https://bucket.s3.amazonaws.com/image2.jpg' }
 * ];
 * 
 * const s3Urls = establishments.map(e => e.image).filter(Boolean);
 * const { presignedUrls, isLoading } = useBatchS3Images({ s3Urls });
 * 
 * // Later in component:
 * <S3Image src={establishment.image} presignedUrl={presignedUrls[establishment.image]} />
 * ```
 */
export const useBatchS3Images = ({
  s3Urls,
  enabled = true,
  skipEmpty = true
}: BatchS3ImagesOptions): BatchS3ImagesResult => {
  
  // Filter valid URLs
  const validS3Urls = useMemo(() => {
    if (!Array.isArray(s3Urls)) return [];
    
    let filtered = s3Urls;
    
    if (skipEmpty) {
      filtered = filtered.filter(url => url && url.trim() && url !== '');
    }
    
    // Remove duplicates
    return Array.from(new Set(filtered));
  }, [s3Urls, skipEmpty]);

  // Initialize the lazy query
  const [triggerBatchQuery, { 
    data, 
    isLoading, 
    error, 
    isSuccess 
  }] = useLazyGetBatchPresignedReadUrlsQuery();

  // Trigger the batch request when conditions are met
  useEffect(() => {
    if (enabled && validS3Urls.length > 0) {
      triggerBatchQuery({ s3_urls: validS3Urls });
    }
  }, [enabled, validS3Urls, triggerBatchQuery]);

  // Manual refetch function
  const refetch = () => {
    if (validS3Urls.length > 0) {
      triggerBatchQuery({ s3_urls: validS3Urls });
    }
  };

  // Process the response data
  const presignedUrls = useMemo(() => {
    if (!data?.presigned_urls) return {};
    return data.presigned_urls;
  }, [data]);

  // Extract performance metrics
  const metrics = useMemo(() => {
    if (!data) return undefined;
    
    return {
      batch_size: data.batch_size,
      processing_time_ms: data.processing_time_ms,
      success_count: data.success_count
    };
  }, [data]);

  return {
    presignedUrls,
    isLoading,
    error,
    refetch,
    metrics
  };
};

export default useBatchS3Images;