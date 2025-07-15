import createCache from '@emotion/cache';

// Create emotion cache optimized for Chakra UI v2.10.9 production builds
export const emotionCache = createCache({
  key: 'trazo-css',
  prepend: true, // Ensures Chakra UI styles are loaded first
  speedy: false, // Disable speedy mode to ensure consistent class generation
  container: typeof document !== 'undefined' ? document.head : undefined,
  // Ensure proper stylesheet insertion order
  insertionPoint: typeof document !== 'undefined' ? document.querySelector('meta[name="emotion-insertion-point"]') || undefined : undefined,
  // Enhanced settings for v2.10.9 compatibility
  stylisPlugins: []
});