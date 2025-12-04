import React from 'react';

// Mobile-optimized image loading utilities for dashboard performance
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

export interface ResponsiveImageConfig {
  src: string;
  alt: string;
  sizes: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  optimization: ImageOptimizationOptions;
}

// Progressive image loading component data
export const createProgressiveImageData = (
  baseSrc: string,
  alt: string,
  options: Partial<ImageOptimizationOptions> = {}
): ResponsiveImageConfig => {
  const defaultOptions: ImageOptimizationOptions = {
    quality: 80,
    format: 'webp',
    loading: 'lazy',
    ...options
  };

  return {
    src: baseSrc,
    alt,
    sizes: {
      mobile: `${baseSrc}?w=400&q=${defaultOptions.quality}&f=${defaultOptions.format}`,
      tablet: `${baseSrc}?w=800&q=${defaultOptions.quality}&f=${defaultOptions.format}`,
      desktop: `${baseSrc}?w=1200&q=${defaultOptions.quality}&f=${defaultOptions.format}`
    },
    optimization: defaultOptions
  };
};

// Lazy loading intersection observer for images
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images: Map<HTMLImageElement, string> = new Map();

  constructor(
    private options: {
      rootMargin?: string;
      threshold?: number;
    } = {}
  ) {
    this.initObserver();
  }

  private initObserver(): void {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
          }
        });
      },
      {
        rootMargin: this.options.rootMargin || '50px',
        threshold: this.options.threshold || 0.1
      }
    );
  }

  private loadImage(img: HTMLImageElement): void {
    const actualSrc = this.images.get(img);
    if (actualSrc && img.src !== actualSrc) {
      img.src = actualSrc;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      this.observer?.unobserve(img);
      this.images.delete(img);
    }
  }

  observe(img: HTMLImageElement, src: string): void {
    if (!this.observer) {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
      return;
    }

    this.images.set(img, src);
    img.classList.add('lazy-loading');
    this.observer.observe(img);
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.images.clear();
  }
}

// Create global lazy image loader instance
export const lazyImageLoader = new LazyImageLoader({
  rootMargin: '100px', // Load images 100px before they enter viewport
  threshold: 0.1
});

// Responsive image srcset generator
export const generateSrcSet = (baseSrc: string, widths: number[] = [400, 800, 1200]): string => {
  return widths.map((width) => `${baseSrc}?w=${width}&f=webp ${width}w`).join(', ');
};

// Calculate optimal image dimensions for mobile
export const calculateMobileImageSize = (
  originalWidth: number,
  originalHeight: number,
  containerWidth: number,
  maxHeight: number = 200
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;

  let width = Math.min(containerWidth, originalWidth);
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

// Image preloading for critical assets
export const preloadCriticalImages = (imageSrcs: string[]): Promise<void[]> => {
  const promises = imageSrcs.map((src) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  });

  return Promise.all(promises);
};

// SVG optimization for icons (mobile performance)
export const optimizeSVGIcon = (svgString: string): string => {
  // Remove unnecessary attributes and whitespace for smaller bundle size
  return svgString
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/<!--.*?-->/g, '') // Remove comments
    .replace(/(\r\n|\n|\r)/gm, '') // Remove line breaks
    .replace(/\s*=\s*"/g, '="') // Clean up attribute formatting
    .trim();
};

// Image format detection for optimal loading
export const detectOptimalImageFormat = (): 'avif' | 'webp' | 'jpeg' => {
  if (typeof window === 'undefined') return 'jpeg';

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  // Check AVIF support
  if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
    return 'avif';
  }

  // Check WebP support
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'webp';
  }

  return 'jpeg';
};

// React hook for responsive images
export const useResponsiveImage = (
  src: string,
  alt: string,
  options: Partial<ImageOptimizationOptions> = {}
) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [optimalFormat, setOptimalFormat] = React.useState<string>('webp');

  React.useEffect(() => {
    setOptimalFormat(detectOptimalImageFormat());
  }, []);

  const imageData = React.useMemo(() => {
    return createProgressiveImageData(src, alt, {
      ...options,
      format: optimalFormat as any
    });
  }, [src, alt, options, optimalFormat]);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = React.useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  return {
    imageData,
    isLoading,
    hasError,
    handleLoad,
    handleError
  };
};

// Placeholder generation for better UX
export const generateImagePlaceholder = (
  width: number,
  height: number,
  color: string = '#f0f0f0'
): string => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#999" text-anchor="middle" dy="4">
        Loading...
      </text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export default {
  createProgressiveImageData,
  LazyImageLoader,
  lazyImageLoader,
  generateSrcSet,
  calculateMobileImageSize,
  preloadCriticalImages,
  optimizeSVGIcon,
  detectOptimalImageFormat,
  generateImagePlaceholder
};
