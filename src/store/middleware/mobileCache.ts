import { createListenerMiddleware } from '@reduxjs/toolkit';
import type { BaseQueryFn } from '@reduxjs/toolkit/query/react';

// Mobile-optimized caching strategy for RTK Query
export interface MobileCacheConfig {
  // Cache duration based on data criticality (in seconds)
  transparency: number;
  trust: number;
  carbon: number;
  dashboard: number;
  // Network-aware cache settings
  cacheBuster: boolean;
  prefetchCritical: boolean;
  backgroundSync: boolean;
}

// Default mobile cache configuration
export const DEFAULT_MOBILE_CACHE_CONFIG: MobileCacheConfig = {
  transparency: 300, // 5 minutes - most critical data
  trust: 600, // 10 minutes - trust indicators change less frequently
  carbon: 900, // 15 minutes - carbon analysis is compute-heavy
  dashboard: 300, // 5 minutes - dashboard overview
  cacheBuster: false, // Disabled on mobile to preserve bandwidth
  prefetchCritical: true, // Prefetch transparency data
  backgroundSync: true // Sync when network improves
};

// Detect network conditions for adaptive caching
export const getNetworkAwareConfig = (config: MobileCacheConfig): MobileCacheConfig => {
  if (typeof navigator === 'undefined' || !navigator.connection) {
    return config;
  }

  const connection = (navigator as any).connection;
  const effectiveType = connection.effectiveType;

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      // Aggressive caching on slow networks
      return {
        ...config,
        transparency: config.transparency * 3, // 15 minutes
        trust: config.trust * 2, // 20 minutes
        carbon: config.carbon * 2, // 30 minutes
        dashboard: config.dashboard * 3, // 15 minutes
        cacheBuster: false,
        prefetchCritical: false, // Disable prefetching on slow networks
        backgroundSync: false
      };

    case '3g':
      // Moderate caching on 3G
      return {
        ...config,
        transparency: config.transparency * 1.5, // 7.5 minutes
        trust: config.trust * 1.5, // 15 minutes
        carbon: config.carbon * 1.5, // 22.5 minutes
        dashboard: config.dashboard * 1.5, // 7.5 minutes
        prefetchCritical: true,
        backgroundSync: true
      };

    case '4g':
    default:
      // Standard caching on fast networks
      return config;
  }
};

// Battery-aware caching adjustments
export const getBatteryAwareConfig = async (
  config: MobileCacheConfig
): Promise<MobileCacheConfig> => {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return config;
  }

  try {
    const battery = await (navigator as any).getBattery();

    // If battery is low (<20%) or not charging, extend cache times
    if (battery.level < 0.2 || !battery.charging) {
      return {
        ...config,
        transparency: config.transparency * 2,
        trust: config.trust * 2,
        carbon: config.carbon * 2,
        dashboard: config.dashboard * 2,
        prefetchCritical: false,
        backgroundSync: false
      };
    }
  } catch (error) {
    console.warn('Battery API not supported:', error);
  }

  return config;
};

// Mobile cache middleware for RTK Query
export const mobileCache = createListenerMiddleware();

// Cache hit/miss tracking
let cacheStats = {
  hits: 0,
  misses: 0,
  networkRequests: 0
};

// Enhanced cache key generation for mobile
export const generateMobileCacheKey = (
  endpoint: string,
  args: any,
  deviceInfo?: {
    screenSize: 'mobile' | 'tablet' | 'desktop';
    connection: string;
    batteryLevel?: number;
  }
): string => {
  const baseKey = `${endpoint}_${JSON.stringify(args)}`;

  if (!deviceInfo) return baseKey;

  // Include device context in cache key for mobile-specific caching
  return `${baseKey}_${deviceInfo.screenSize}_${deviceInfo.connection}`;
};

// Prefetch critical dashboard data for mobile
export const prefetchCriticalData = async (
  api: any,
  companyId: string,
  establishmentId: string,
  config: MobileCacheConfig
) => {
  if (!config.prefetchCritical) return;

  try {
    console.log('🚀 Prefetching critical transparency data for mobile...');

    // Prefetch dashboard data (most critical)
    api.endpoints.getDashboardComprehensive.initiate(
      { companyId, establishmentId },
      { forceRefetch: false }
    );

    // Delay prefetch of carbon data to not block transparency display
    setTimeout(() => {
      api.endpoints.getCarbonScopeBreakdown.initiate(
        { companyId, establishmentId },
        { forceRefetch: false }
      );
    }, 1000); // 1 second delay
  } catch (error) {
    console.warn('Failed to prefetch critical data:', error);
  }
};

// Background sync for mobile
export const setupBackgroundSync = (config: MobileCacheConfig) => {
  if (!config.backgroundSync || typeof navigator === 'undefined') return;

  // Listen for network state changes
  window.addEventListener('online', () => {
    console.log('📡 Network back online - syncing cached data...');
    // Trigger background sync of critical data
    // This would integrate with RTK Query to refresh stale data
  });

  window.addEventListener('offline', () => {
    console.log('📴 Network offline - using cached data...');
  });

  // Listen for connection type changes
  if (navigator.connection) {
    (navigator as any).connection.addEventListener('change', () => {
      const connection = (navigator as any).connection;
      console.log(`📶 Connection changed to ${connection.effectiveType}`);
      // Adjust caching strategy based on new connection
    });
  }
};

// Memory pressure handling for mobile devices
export const handleMemoryPressure = () => {
  if (typeof window === 'undefined') return;

  // Clear old cache entries when memory is low
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory;
    const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

    if (memoryUsage > 0.8) {
      // Over 80% memory usage
      console.warn('⚠️ High memory usage detected - clearing old cache entries');
      // This would integrate with RTK Query cache to clear old entries
    }
  }
};

// Mobile-specific query base with adaptive caching
export const createMobileQueryBase = (baseQuery: BaseQueryFn): BaseQueryFn => {
  return async (args, api, extraOptions) => {
    cacheStats.networkRequests++;

    const result = await baseQuery(args, api, extraOptions);

    // Track cache performance
    if (result.meta?.request?.cache === 'hit') {
      cacheStats.hits++;
    } else {
      cacheStats.misses++;
    }

    // Log mobile cache performance
    if (cacheStats.networkRequests % 10 === 0) {
      const hitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100;
      console.log(`📊 Mobile cache hit rate: ${hitRate.toFixed(1)}%`);
    }

    return result;
  };
};

// Export cache statistics for monitoring
export const getMobileCacheStats = () => ({
  ...cacheStats,
  hitRate:
    cacheStats.hits + cacheStats.misses > 0
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
      : 0
});

// Reset cache statistics
export const resetMobileCacheStats = () => {
  cacheStats = { hits: 0, misses: 0, networkRequests: 0 };
};

export default {
  DEFAULT_MOBILE_CACHE_CONFIG,
  getNetworkAwareConfig,
  getBatteryAwareConfig,
  generateMobileCacheKey,
  prefetchCriticalData,
  setupBackgroundSync,
  handleMemoryPressure,
  createMobileQueryBase,
  getMobileCacheStats,
  resetMobileCacheStats
};
