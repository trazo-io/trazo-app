// Chakra imports
import { Box, CircularProgress, Text } from '@chakra-ui/react';

interface FullScreenLoaderProps {
  /**
   * What is being waited for, in the caller's own words. Rendered as visible text AND as the
   * accessible name of the status region. Optional: an empty live region announces nothing,
   * which is the right behaviour when there is nothing specific to say.
   *
   * Deliberately NOT defaulted to an English string. This component takes no `useIntl` — it
   * renders on the auth gate, which is the one place that can be reached before the rest of
   * the app is up — so a hardcoded default would be untranslatable text on a Spanish page.
   * The caller has the intl context; this component just displays what it is handed.
   */
  message?: string;
}

/**
 * The whole-page loading state. `CheckAuth` renders it INSTEAD of `<Outlet/>`, so it is the
 * only thing on screen while the session resolves.
 *
 * 🔴 2026-08-21 — this had no `role="status"` and no `aria-live`, so a screen-reader user got
 * SILENCE while auth resolved: Chakra's `CircularProgress` renders `role="progressbar"`, which
 * announces a value, not the fact that the page is busy. It also was not full screen despite
 * the name (a `Container` capped at 95vh with the theme's max-width and padding), and it
 * ignored the `message` prop its own test suite had always passed it.
 *
 * "Always passed it" is the part worth keeping: `src/components/__tests__/Loader.test.tsx`
 * asserted every one of these four properties and had NEVER RUN — the helper it imports
 * (`src/test/utils.tsx`) died on a missing module, so the file failed at import and the suite
 * reported green over it. The contract was written down and nothing checked it.
 */
const FullScreenLoader = ({ message }: FullScreenLoaderProps) => {
  return (
    <Box
      role="status"
      aria-live="polite"
      // `fixed` + the four edges, not a tall container: this replaces the page, and a spinner
      // centred in a 95vh box sat below the fold on a short viewport.
      position="fixed"
      top="0"
      left="0"
      width="100%"
      height="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={4}
      bg="white">
      <CircularProgress isIndeterminate color="green.700" />
      {message && (
        <Text fontSize="sm" color="gray.600">
          {message}
        </Text>
      )}
    </Box>
  );
};

export default FullScreenLoader;
