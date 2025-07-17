/**
 * Utility functions for image handling and S3 operations
 */

// S3 URL patterns
export const S3_BUCKET_PATTERN = /staging-trazo-media-\d+\.s3\.amazonaws\.com/;
export const PRESIGNED_URL_PATTERN = /X-Amz-Signature/;

/**
 * Check if a URL is an S3 URL that needs presigning
 */
export const isS3Url = (url: string | null | undefined): boolean => {
  return Boolean(url && S3_BUCKET_PATTERN.test(url));
};

/**
 * Check if a URL is already a presigned S3 URL
 */
export const isPresignedUrl = (url: string | null | undefined): boolean => {
  return Boolean(url && PRESIGNED_URL_PATTERN.test(url));
};

/**
 * Check if a URL needs presigning (is S3 but not presigned)
 */
export const needsPresigning = (url: string | null | undefined): boolean => {
  return isS3Url(url) && !isPresignedUrl(url);
};

/**
 * Extract S3 key from URL
 */
export const extractS3Key = (s3Url: string): string | null => {
  try {
    const url = new URL(s3Url);
    return url.pathname.substring(1); // Remove leading slash
  } catch {
    return null;
  }
};

/**
 * Get file extension from URL
 */
export const getFileExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.split('.').pop();
    return extension ? `.${extension}` : '';
  } catch {
    return '';
  }
};

/**
 * Generate a placeholder URL based on image type
 */
export const getPlaceholderUrl = (imageType: 'avatar' | 'establishment' | 'product' | 'general' = 'general'): string => {
  const placeholders = {
    avatar: '/images/default-avatar.jpg',
    establishment: '/images/establishment-placeholder.jpg',
    product: '/images/product-placeholder.jpg',
    general: '/images/placeholder.jpg'
  };
  
  return placeholders[imageType];
};

/**
 * Image optimization parameters for different use cases
 */
export const getImageDimensions = (usage: 'thumbnail' | 'card' | 'hero' | 'avatar' | 'gallery') => {
  const dimensions = {
    thumbnail: { boxSize: '64px' },
    card: { boxSize: '200px' },
    hero: { width: '100%', height: '400px' },
    avatar: { boxSize: '48px', borderRadius: 'full' },
    gallery: { boxSize: '250px' }
  };
  
  return dimensions[usage];
};

/**
 * Validate image URL
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  try {
    new URL(url);
    // Check for common image extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i;
    return imageExtensions.test(url) || isS3Url(url);
  } catch {
    return false;
  }
};

/**
 * Migration helper: Convert regular Image props to S3Image props
 */
export const migrateImageProps = (props: any) => {
  const { src, alt, ...rest } = props;
  
  return {
    src,
    alt: alt || 'Image',
    fallbackSrc: getPlaceholderUrl('general'),
    lazy: true,
    enableFadeIn: true,
    ...rest
  };
};

export default {
  isS3Url,
  isPresignedUrl,
  needsPresigning,
  extractS3Key,
  getFileExtension,
  getPlaceholderUrl,
  getImageDimensions,
  isValidImageUrl,
  migrateImageProps
};