// Service Worker for Trazo Dashboard Mobile Performance
// Provides offline support and caching for transparency dashboard

const CACHE_VERSION = 'trazo-dashboard-v1.2.0';
const CRITICAL_CACHE = `${CACHE_VERSION}-critical`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Critical resources that must be cached for offline functionality
const CRITICAL_RESOURCES = ['/', '/static/js/main.js', '/static/css/main.css', '/manifest.json'];

// API endpoints to cache for offline dashboard access
const API_ENDPOINTS = [
  '/api/companies/',
  '/api/establishments/',
  '/dashboard_comprehensive/',
  '/carbon_scope_breakdown/'
];

// Install event - pre-cache critical resources
self.addEventListener('install', (event) => {
  console.log('📦 Installing service worker for mobile dashboard...');

  event.waitUntil(
    Promise.all([
      // Cache critical resources
      caches.open(CRITICAL_CACHE).then((cache) => {
        console.log('📱 Caching critical resources for offline access');
        return cache.addAll(CRITICAL_RESOURCES);
      }),

      // Initialize other caches
      caches.open(API_CACHE),
      caches.open(IMAGE_CACHE),
      caches.open(STATIC_CACHE)
    ]).then(() => {
      console.log('✅ Service worker installation complete');
      // Take control immediately for faster mobile experience
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Activating service worker...');

  event.waitUntil(
    Promise.all([
      // Clean up old cache versions
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) => name.startsWith('trazo-dashboard-') && !name.startsWith(CACHE_VERSION)
            )
            .map((name) => {
              console.log(`🗑️ Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      }),

      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service worker activation complete');
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests for better mobile performance
  if (request.method !== 'GET') {
    return;
  }

  // Handle different resource types with optimized strategies
  if (isCriticalResource(url)) {
    event.respondWith(handleCriticalResource(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticResource(url)) {
    event.respondWith(handleStaticResource(request));
  }
});

// Critical resource handler - Cache First strategy for app shell
async function handleCriticalResource(request) {
  try {
    const cache = await caches.open(CRITICAL_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      console.log(`📱 Serving critical resource from cache: ${request.url}`);
      return cached;
    }

    // If not in cache, fetch and cache
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('❌ Error handling critical resource:', error);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// API request handler - Network First with fallback for dashboard data
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE);

  try {
    console.log(`🌐 Fetching API data: ${request.url}`);
    const networkResponse = await fetch(request, {
      // Mobile optimization - shorter timeout
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
    });

    if (networkResponse.ok) {
      // Cache successful responses
      await cache.put(request, networkResponse.clone());

      // Add cache timestamp for mobile cache management
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());

      return new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log(`📱 Network failed for API, checking cache: ${request.url}`);

    const cached = await cache.match(request);
    if (cached) {
      console.log('✅ Serving stale API data from cache');

      // Add offline indicator header
      const headers = new Headers(cached.headers);
      headers.set('sw-cache-status', 'offline');

      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: headers
      });
    }

    // Return minimal offline response for dashboard
    if (request.url.includes('dashboard_comprehensive')) {
      return new Response(
        JSON.stringify({
          transparency_metrics: { overall_score: 0 },
          carbon_summary: {
            total_emissions: 0,
            total_offsets: 0,
            net_carbon: 0,
            carbon_intensity: 0
          },
          performance_trends: {
            transparency_trend: 'stable',
            carbon_trend: 'stable',
            engagement_trend: 'stable'
          },
          recent_activity: [],
          offline: true
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'sw-cache-status': 'offline-fallback'
          }
        }
      );
    }

    return new Response('Offline - Data not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Image request handler - Cache First with lazy loading
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);

  try {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      // Only cache images smaller than 1MB for mobile storage management
      const contentLength = response.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 1024 * 1024) {
        await cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    // Return placeholder for failed image loads
    return new Response('', {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

// Static resource handler - Cache First for assets
async function handleStaticResource(request) {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response('Resource not available offline', { status: 503 });
  }
}

// Helper functions
function isCriticalResource(url) {
  return (
    CRITICAL_RESOURCES.some((resource) => url.pathname.endsWith(resource)) ||
    url.pathname === '/' ||
    url.pathname.includes('/static/')
  );
}

function isAPIRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    API_ENDPOINTS.some((endpoint) => url.pathname.includes(endpoint))
  );
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/i.test(url.pathname);
}

function isStaticResource(url) {
  return /\.(js|css|woff|woff2|ttf|eot)(\?.*)?$/i.test(url.pathname);
}

// Background sync for mobile data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'dashboard-sync') {
    console.log('🔄 Background syncing dashboard data...');
    event.waitUntil(syncDashboardData());
  }
});

async function syncDashboardData() {
  try {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();

    // Sync API data when network is available
    for (const request of requests) {
      if (isAPIRequest(new URL(request.url))) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
            console.log(`✅ Synced: ${request.url}`);
          }
        } catch (error) {
          console.log(`❌ Failed to sync: ${request.url}`);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Cache management for mobile storage limits
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_STATS') {
    event.ports[0].postMessage(getCacheStats());
  } else if (event.data && event.data.type === 'CLEAR_OLD_CACHE') {
    clearOldCacheEntries().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const name of cacheNames) {
    if (name.startsWith(CACHE_VERSION)) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      stats[name] = keys.length;
    }
  }

  return stats;
}

async function clearOldCacheEntries() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  const cache = await caches.open(API_CACHE);
  const requests = await cache.keys();

  for (const request of requests) {
    const response = await cache.match(request);
    const timestamp = response.headers.get('sw-cache-timestamp');

    if (timestamp && now - parseInt(timestamp) > maxAge) {
      await cache.delete(request);
      console.log(`🗑️ Cleared old cache entry: ${request.url}`);
    }
  }
}

console.log('🎯 Trazo Dashboard Service Worker loaded - Mobile optimized with offline support');
