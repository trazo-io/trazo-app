import createCache from '@emotion/cache';

// Create emotion cache optimized for Chakra UI v2.10.9 production builds
export const emotionCache = createCache({
  key: 'trazo-css',
  prepend: true, // Prepend styles to ensure proper cascade order
  speedy: false, // Disable speedy mode to ensure consistent class generation in production
  container: typeof document !== 'undefined' ? document.head : undefined,
  // Ensure proper stylesheet insertion order - fix TypeScript error
  insertionPoint:
    typeof document !== 'undefined'
      ? (document.querySelector('meta[name="emotion-insertion-point"]') as HTMLElement) || undefined
      : undefined,
  stylisPlugins: []
});
