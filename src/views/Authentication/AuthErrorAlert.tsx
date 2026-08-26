import { Box, Button, Link as ChakraLink, Text, HStack } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';

import { StandardAlert } from 'components/Design/StandardComponents';
import type { AuthErrorResolution } from './authErrors';

/**
 * The one error surface every auth screen renders.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * 2026-08-24 — WHY THIS COMPONENT EXISTS. Read before styling anything red in this folder.
 *
 * Six auth screens each hand-rolled their own red box, and they had drifted into TWO
 * incompatible designs — a farmer who fails sign-in and then opens the reset screen saw the
 * error change shape under them:
 *
 *   A. AppSignUp / ConsumerSignUp / ConsumerSignIn
 *      bg red.50, 1px red.200 all round, radius `lg`, text `red.600` at 14px
 *   B. AppSignIn / ProducerForgotPassword / ProducerResetPassword
 *      bg red.50, 4px red.500 left accent, radius `xl`, text `red.700` at 500 weight
 *
 * MEASURED against the theme's own scale, design A failed twice:
 *   red.600 #E53935 on red.50 #FFEBEE = 3.70:1 — text at 14px owes 4.5 (WCAG 1.4.3)
 *   red.200 #EF9A9A on red.50 #FFEBEE = 1.88:1 — a boundary owes 3.0 (WCAG 1.4.11)
 * Same failure class as `green.600` used as a text colour: a shade that clears the non-text
 * floor reads as "the safe dark one" and spreads onto glyphs. See `.claude/rules/frontend.md`.
 *
 * Neither design carried an icon, and — the part no palette fix would have caught — neither
 * carried `role="alert"`. Six error banners, zero announced. There was not one `role="alert"`
 * or `aria-live` in the whole Authentication tree, on the first screen a farmer meets.
 *
 * `StandardAlert` already solves all of it, and had solved it since 2026-08-17: the theme
 * paints the ground, the 4px accent at the `.700` step that pays 1.4.11, and the top-aligned
 * icon; Chakra's `<Alert>` sets `role="alert"` itself (`addRole` defaults true), and because
 * this renders on a state change rather than at mount, assistive tech actually announces it.
 * This file adds the ONE thing StandardAlert does not have: the recovery action.
 *
 * ⛔ Do NOT reintroduce `bg` / `borderColor` / `color` as style props here. Style props beat
 * theme styles, so a colour set here would silently outrank `theme/components/alert.js` and
 * this component would drift away from the other 42 StandardAlerts the same way the six boxes
 * drifted from each other.
 */
/** `.claude/rules/frontend.md`: touch targets are 44px minimum. */
const TOUCH_TARGET_MIN = '44px';

interface AuthErrorAlertProps {
  resolution: AuthErrorResolution | null;
  /** Where the "Sign in" action points. Screens live on different subdomains. */
  signInPath?: string;
  /** Invoked by the "Resend verification email" action. Omit to hide that action. */
  onResendVerification?: () => void;
  isResending?: boolean;
  /** True once a resend has been sent, so the alert can confirm instead of re-offering. */
  resendSent?: boolean;
}

/**
 * `forwardRef` so a screen can move focus here after a failed submit.
 *
 * MEASURED on the sign-in page: after a failure `document.activeElement` was `BODY`, because
 * the button holding focus had just been re-rendered. `role="alert"` means the message is
 * ANNOUNCED, which is not the same as being reachable — the user still had to tab from the top
 * of the document to find the recovery action the alert had just offered them.
 */
export const AuthErrorAlert = forwardRef<HTMLDivElement, AuthErrorAlertProps>(
  function AuthErrorAlert(
    {
      resolution,
      signInPath = '/auth/signin',
      onResendVerification,
      isResending = false,
      resendSent = false
    },
    ref
  ) {
    const intl = useIntl();

    if (!resolution) return null;

    /**
     * `auth.error.passthrough` is the escape hatch for a server sentence this app has no code
     * for yet. It renders `{text}` and nothing else, so an unrecognised error is still legible
     * — but it is the LAST resort, never the first, and it is the only path on which server
     * prose reaches a screen.
     */
    const message = intl.formatMessage({ id: resolution.messageId }, resolution.values);

    const { action } = resolution;
    const canResend = action.kind === 'resendVerification' && Boolean(onResendVerification);

    return (
      /*
      `tabIndex={-1}` makes this focusable by script without adding it to the tab order — the
      standard way to move focus to a message the user did not navigate to.
    */
      <Box ref={ref} tabIndex={-1} outline="none">
        <StandardAlert status="error">
          <Text fontSize="sm">{message}</Text>

          {action.kind === 'signIn' && (
            <ChakraLink
              as={RouterLink}
              to={signInPath}
              fontSize="sm"
              fontWeight="semibold"
              textDecoration="underline"
              // MEASURED at 375px: as plain inline text this action was 17px tall. The project
              // floor for a touch target is 44px, and this is the one control on the screen that
              // a farmer who cannot get past the error has to hit. `inline-flex` + `minH` grows
              // the HIT AREA without moving the text or making it read as a filled button.
              display="inline-flex"
              alignItems="center"
              minH={TOUCH_TARGET_MIN}>
              {intl.formatMessage({ id: 'auth.error.action.signIn' })}
            </ChakraLink>
          )}

          {canResend && !resendSent && (
            <HStack spacing={2} pt={1}>
              {/*
              A link-styled BUTTON, not a link: this performs an action rather than navigating,
              and a farmer using a keyboard needs Space to work on it. `variant="link"` keeps it
              visually secondary to the form's own submit without lying about what it is.
            */}
              <Button
                variant="link"
                size="sm"
                fontWeight="semibold"
                textDecoration="underline"
                // See the sign-in link above: `variant="link"` collapses to text height, which
                // MEASURED 17px at 375px against a 44px floor.
                minH={TOUCH_TARGET_MIN}
                /*
                A Chakra Button is `white-space: nowrap`, and this label is built by the
                translator, not by us. MEASURED at 375px in es-419: "Reenviar el correo de
                verificación" is 210px wide, the alert's content box is 205px after the icon
                indent, and the alert clips — `scrollWidth` 274 against `clientWidth` 257, so the
                last 17px of the only recovery action on the screen was cut off.

                Same shape as the Parcel Application button: a runtime-composed label, nowrap, in
                a container that hides its overflow. Let it wrap, and let the height follow —
                `minH` still holds the touch target when the label is short (en-US: "Resend
                verification email" fits on one line).
              */
                whiteSpace="normal"
                textAlign="left"
                h="auto"
                py={2}
                isLoading={isResending}
                onClick={onResendVerification}>
                {intl.formatMessage({ id: 'auth.error.action.resendVerification' })}
              </Button>
            </HStack>
          )}

          {canResend && resendSent && (
            <Text fontSize="sm" fontWeight="semibold" pt={1}>
              {intl.formatMessage({ id: 'auth.error.resendSent' })}
            </Text>
          )}
        </StandardAlert>
      </Box>
    );
  }
);

export default AuthErrorAlert;
