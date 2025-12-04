import createCache from '@emotion/cache';

// Create emotion cache for Chakra UI
export const emotionCache = createCache({
  key: 'chakra',
  prepend: false
});
