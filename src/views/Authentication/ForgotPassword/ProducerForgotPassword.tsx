import React from 'react';
import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import AuthFooter from 'components/Footer/AuthFooter';
import { ForgotPasswordForm } from 'components/Forms/ForgotPasswordForm';

const MotionBox = motion(Box);

/**
 * Producer password-reset page.
 *
 * This file used to carry its OWN copy of the form and the "check your email" card — a
 * divergent twin of `components/Forms/ForgotPasswordForm`, which the consumer page renders.
 * Same screen, two builds, drifted on the icon, the heading size, the alert, the button and the
 * back link's touch target. The shared component now owns all of it, and this page owns only
 * what is actually page-level: the quiet centered card and the footer.
 *
 * Kept from the old file, because they were the better half of it:
 *   - `AuthErrorAlert` + `resolveGenericAuthError` (moved INTO the shared component, so the
 *     consumer stops swallowing failures into a generic error toast);
 *   - the 440px card on the landing's own ground.
 */
const ProducerForgotPassword: React.FC = () => {
  /* Same tokens as AppSignIn / AppSignUp: #FBFCFA is the LANDING's `--background`. */
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.200');

  /*
   * Quiet centered card — the third and fourth auth pages to get it, after sign-in and sign-up.
   * MEASURED before: 47.5% of the screen was green, against the landing's 4.3%.
   *
   * The panel this replaces also carried pre-pivot copy — "Your carbon intelligence data is
   * protected with enterprise-grade security … get back to tracking your environmental impact."
   * Trazo has not led on carbon since the transparency-first pivot, and a password-reset page is
   * the last place to re-assert a positioning the product dropped. The three security bullets
   * ("15-minute secure token expiration", "One-time use password reset links", "Enhanced
   * password validation") went with it: the page already states the 15-minute expiry in its own
   * security note, where it is useful rather than decorative.
   */
  return (
    <Box flex="1" display="flex" flexDirection="column">
      <Flex
        flex="1"
        align="center"
        justify="center"
        /*
          `smd`, NOT `sm`. This app's `sm` breakpoint is **320px**, not Chakra's 480 — see
          `theme/foundations/breakpoints.js`, and the rule in `.claude/rules/frontend.md`:
          "Mobile-only (<480px): use `{{ base: 'x', smd: 'y' }}` NOT `{{ base: 'x', sm: 'y' }}`".

          Written as `sm`, the `base` value applied only BELOW 320px — a width no phone in
          service reports — so every real phone silently took the ROOMIER desktop value. MEASURED
          at 375px before this change: 24px page gutter + 32px card padding = 57px of chrome per
          side, leaving 261px of content, i.e. **70% of the screen**. The author's own `base`
          numbers (16 + 24) were dead code.

          With `smd` the phone gets what was always intended: 295px of content, 79% of the
          screen — 34px more room, which is the difference between the sign-in row fitting on
          one line and not.
        */
        px={{ base: 4, smd: 6 }}
        pt={{ base: 6, md: 10 }}
        pb={{ base: 10, md: 16 }}>
        <MotionBox
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          w="full"
          maxW="440px"
          bg={cardBg}
          borderWidth="1px"
          borderColor={cardBorder}
          borderRadius="2xl"
          boxShadow="0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 32px -12px rgba(16, 24, 40, 0.12)"
          px={{ base: 6, smd: 8 }}
          py={{ base: 8, smd: 10 }}>
          <ForgotPasswordForm userType="producer" />
        </MotionBox>
      </Flex>

      <AuthFooter />
    </Box>
  );
};

export default ProducerForgotPassword;
