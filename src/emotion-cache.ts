import createCache from '@emotion/cache';

const isBrowser = typeof document !== 'undefined';

// Create emotion cache for proper style injection in production
export function createEmotionCache() {
  let insertionPoint;

  if (isBrowser) {
    const emotionInsertionPoint = document.querySelector(
      'meta[name="emotion-insertion-point"]'
    ) as HTMLElement;
    insertionPoint = emotionInsertionPoint ?? undefined;
  }

  return createCache({
    key: 'css',
    insertionPoint
    // Remove prepend to use default insertion behavior
    // prepend: true,
  });
}

export const emotionCache = createEmotionCache();
