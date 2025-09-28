// Service Worker registration and management for mobile performance
export interface ServiceWorkerConfig {
  enabled: boolean;
  updateOnReload: boolean;
  offlineSupport: boolean;
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
}

export const DEFAULT_SW_CONFIG: ServiceWorkerConfig = {
  enabled: process.env.NODE_ENV === 'production',
  updateOnReload: false,
  offlineSupport: true,
  cacheStrategy: 'moderate'
};

// Service Worker registration
export const registerServiceWorker = async (config: Partial<ServiceWorkerConfig> = {}) => {
  const finalConfig = { ...DEFAULT_SW_CONFIG, ...config };
  
  if (!finalConfig.enabled || !('serviceWorker' in navigator)) {
    console.log('📴 Service Worker not supported or disabled');
    return null;
  }

  try {
    console.log('📦 Registering Service Worker for mobile optimization...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🔄 New service worker available - dashboard will update on next load');
          
          if (finalConfig.updateOnReload) {
            // Automatically update for better mobile experience
            window.location.reload();
          } else {
            // Notify user of update availability
            showUpdateNotification();
          }
        }
      });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    console.log('✅ Service Worker registered successfully');
    return registration;
    
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
};

// Handle messages from service worker
const handleServiceWorkerMessage = (event: MessageEvent) => {
  const { data } = event;
  
  if (data.type === 'CACHE_UPDATED') {
    console.log('📱 Dashboard cache updated - fresh data available');
  } else if (data.type === 'OFFLINE_MODE') {
    console.log('📴 Operating in offline mode - using cached data');
    showOfflineNotification();
  } else if (data.type === 'ONLINE_MODE') {
    console.log('📡 Back online - syncing fresh data');
    hideOfflineNotification();
  }
};

// Unregister service worker
export const unregisterServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('🗑️ Service Worker unregistered');
    }
  } catch (error) {
    console.error('Failed to unregister service worker:', error);
  }
};

// Get cache statistics for performance monitoring
export const getCacheStats = async (): Promise<Record<string, number>> => {
  if (!navigator.serviceWorker.controller) {
    return {};
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    
    channel.port1.onmessage = (event) => {
      resolve(event.data || {});
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'CACHE_STATS' },
      [channel.port2]
    );
  });
};

// Clear old cache entries to free mobile storage
export const clearOldCache = async (): Promise<boolean> => {
  if (!navigator.serviceWorker.controller) {
    return false;
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    
    channel.port1.onmessage = (event) => {
      resolve(event.data?.success || false);
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'CLEAR_OLD_CACHE' },
      [channel.port2]
    );
  });
};

// Prefetch critical resources for faster mobile loading
export const prefetchCriticalResources = async (urls: string[]) => {
  if (!navigator.serviceWorker.controller) return;

  for (const url of urls) {
    try {
      await fetch(url, { mode: 'no-cors' });
      console.log(`📥 Prefetched: ${url}`);
    } catch (error) {
      console.warn(`Failed to prefetch ${url}:`, error);
    }
  }
};

// Check if app is running in standalone mode (PWA)
export const isStandalonePWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Network status monitoring for mobile
export const setupNetworkMonitoring = () => {
  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      console.log('📡 Network connection restored');
      document.body.classList.remove('offline');
    } else {
      console.log('📴 Network connection lost - using offline cache');
      document.body.classList.add('offline');
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial status
  updateOnlineStatus();
  
  return () => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  };
};

// Background sync for mobile data
export const requestBackgroundSync = async (tag: string) => {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.warn('Background sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.sync.register(tag);
      console.log(`🔄 Background sync registered: ${tag}`);
      return true;
    }
  } catch (error) {
    console.error('Background sync registration failed:', error);
  }
  
  return false;
};

// UI notification helpers
let updateNotificationShown = false;
let offlineNotificationShown = false;

const showUpdateNotification = () => {
  if (updateNotificationShown) return;
  
  updateNotificationShown = true;
  console.log('🔄 New version available - will update on next reload');
  
  // Could integrate with app's notification system here
};

const showOfflineNotification = () => {
  if (offlineNotificationShown) return;
  
  offlineNotificationShown = true;
  console.log('📴 Operating offline - some features may be limited');
  
  // Could show offline banner or notification
};

const hideOfflineNotification = () => {
  offlineNotificationShown = false;
  console.log('📡 Back online - all features restored');
  
  // Could hide offline banner
};

// Mobile performance optimization helpers
export const optimizeForMobile = async () => {
  // Register service worker
  await registerServiceWorker({
    cacheStrategy: 'moderate',
    offlineSupport: true
  });
  
  // Setup network monitoring
  setupNetworkMonitoring();
  
  // Request permission for notifications (for offline status)
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  
  // Setup background sync for dashboard data
  await requestBackgroundSync('dashboard-sync');
  
  console.log('📱 Mobile optimization complete');
};

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  getCacheStats,
  clearOldCache,
  prefetchCriticalResources,
  isStandalonePWA,
  setupNetworkMonitoring,
  requestBackgroundSync,
  optimizeForMobile
};