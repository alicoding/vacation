import createCache from '@emotion/cache';

/**
 * Creates a new Emotion cache instance for MUI styling
 * Used for consistent styling between server and client rendering
 */
export default function createEmotionCache() {
  return createCache({
    key: 'mui',
    // Prepend styles to ensure client-side styles take precedence
    // This is important for correct style resolution in SSR/CSR environments
    prepend: true,
  });
}
