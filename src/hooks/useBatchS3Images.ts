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
    console.log('🔍 [useBatchS3Images] Processing URLs:', { s3Urls, enabled, skipEmpty });
    
    if (!Array.isArray(s3Urls)) {
      console.log('❌ [useBatchS3Images] s3Urls is not an array:', s3Urls);
      return [];
    }
    
    let filtered = s3Urls;
    
    if (skipEmpty) {
      filtered = filtered.filter(url => url && url.trim() && url !== '');
    }
    
    // Remove duplicates
    const result = Array.from(new Set(filtered));
    console.log('✅ [useBatchS3Images] Valid URLs after filtering:', result);
    return result;
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
    console.log('🚀 [useBatchS3Images] useEffect trigger check:', { 
      enabled, 
      urlCount: validS3Urls.length, 
      urls: validS3Urls,
      timestamp: new Date().toISOString()
    });
    
    if (enabled && validS3Urls.length > 0) {
      console.log('📡 [useBatchS3Images] Triggering FRESH batch query for URLs:', validS3Urls);
      
      // Add a debug marker to the document for easier identification
      if (typeof window !== 'undefined') {
        window.__TRAZO_BATCH_DEBUG = {
          batchTriggered: true,
          urlCount: validS3Urls.length,
          urls: validS3Urls,
          timestamp: new Date().toISOString(),
          urlsHash: validS3Urls.join('|') // Help identify URL changes
        };
      }
      
      // Force fresh request by using forceRefetch
      triggerBatchQuery({ s3_urls: validS3Urls }, true);
    } else {
      console.log('⏸️ [useBatchS3Images] Batch query NOT triggered:', { enabled, urlCount: validS3Urls.length });
      
      if (typeof window !== 'undefined') {
        window.__TRAZO_BATCH_DEBUG = {
          batchTriggered: false,
          reason: !enabled ? 'disabled' : 'no URLs',
          urlCount: validS3Urls.length,
          timestamp: new Date().toISOString()
        };
      }
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
    console.log('📥 [useBatchS3Images] Processing response data:', { data, isLoading, error });
    
    if (!data?.presigned_urls) {
      console.log('❌ [useBatchS3Images] No presigned_urls in response:', data);
      return {};
    }
    
    console.log('✅ [useBatchS3Images] Successfully processed presigned URLs:', data.presigned_urls);
    return data.presigned_urls;
  }, [data, isLoading, error]);

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