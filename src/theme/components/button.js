// Updated for Chakra UI v2.10.9 - restored mode function with improved CSS-in-JS support
import { mode } from '@chakra-ui/theme-tools';

/**
 * ⚠️ Same rule as `theme/components/badge.js`: a variant that needs a dark-mode value must be a
 * FUNCTION of props and use `mode(light, dark)(props)`.
 *
 * Every `_hover`/`_active`/`_focusVisible` value in this file used to be written as
 * `{ base: 'green.600', _dark: 'green.400' }`. That is the SEMANTIC-TOKEN shape and Chakra
 * cannot resolve it inside a component variant — it does not throw, it emits nonsense. Read off
 * the live stylesheet on 2026-08-11:
 *
 *     .trazo-css-14acz0w:focus-visible, …[data-focus-visible] { }
 *     .trazo-css-14acz0w:focus-visible boxshadow, … { }
 *
 * — an empty rule, plus a rule for a descendant element called `boxshadow`. So **every button in
 * the app had no keyboard focus ring at all**, and the hover colours were silently dropped. The
 * comments in this file were describing intent that never reached the browser.
 *
 * Verify any change here by reading the emitted CSS or the computed style, never by reading the
 * object below.
 */

/** Buttons sit on cards, hero bands and page background; they need their own surface. */
const surface = (props) => mode('white', 'gray.800')(props);

export const buttonStyles = {
  components: {
    Button: {
      variants: {
        'with-shadow': {
          boxShadow: '0 0 2px 2px #efdfde'
        },
        'no-hover': {
          _hover: {
            boxShadow: 'none'
          }
        },
        'transparent-with-icon': {
          bg: 'transparent',
          fontWeight: 'bold',
          borderRadius: 'inherit',
          cursor: 'pointer',
          _active: {
            bg: 'transparent',
            transform: 'none',
            borderColor: 'transparent'
          },
          _focus: {
            boxShadow: 'none'
          },
          _hover: {
            boxShadow: 'none'
          }
        },
        /**
         * PRIMARY FILL = green.700, not green.500.
         *
         * White on green.500 (#4CAF50) measures 2.78:1. Button labels are 14–16px, which is
         * below WCAG's large-text threshold (18.66px bold / 24px regular), so they need 4.5:1
         * — green.500 fails it outright, and even fails the 3:1 large-text allowance. This is
         * the same call already made for badges (badge.js) and the audit-PDF headers.
         * green.700 #2E7D32 = 5.13:1, hover green.800 = 7.87:1, active green.900 = 12.41:1.
         *
         * green.500 remains the BRAND colour — logo, icons, progress fills, tints, selected
         * states. It is only unusable as a fill *under white text*.
         *
         * Dark mode inverts: a light-green fill needs a DARK label (white on green.300 is
         * 1.65:1). green.300 on gray.900 text = 10.64:1.
         */
        brand: (props) => ({
          bg: mode('green.700', 'green.300')(props),
          color: mode('white', 'gray.900')(props),
          _hover: {
            bg: mode('green.800', 'green.200')(props),
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
            _disabled: { transform: 'none', boxShadow: 'none' }
          },
          _active: {
            bg: mode('green.900', 'green.100')(props),
            transform: 'translateY(0px)'
          }
        }),
        /**
         * `StandardButton variant="primary"` renders Chakra's `solid` + colorScheme green,
         * NOT the `brand` variant above — so the same contrast fix has to be made here or
         * every primary button in the app keeps the failing green.500 fill.
         */
        solid: (props) =>
          props.colorScheme === 'green'
            ? {
                bg: mode('green.700', 'green.300')(props),
                color: mode('white', 'gray.900')(props),
                _hover: {
                  bg: mode('green.800', 'green.200')(props),
                  transform: 'translateY(-1px)',
                  boxShadow: 'lg',
                  _disabled: { transform: 'none', boxShadow: 'none' }
                },
                _active: { bg: mode('green.900', 'green.100')(props), transform: 'translateY(0px)' }
              }
            : {},
        outline: (props) => ({
          border: '1px solid',
          // green.600, not green.500: the border IS the control's boundary, and WCAG 1.4.11
          // wants 3:1 for that. green.500 on white is 2.78:1; green.600 is 4.12:1.
          borderColor: mode('green.600', 'green.400')(props),
          color: 'green.700', // green.700 #2E7D32 = 5.13:1 on white (WCAG AA); green.500 was 2.78:1
          // NOT `transparent`. An outline button is a button, not a hole: on a tinted hero band
          // the page showed straight through it, and a button straddling the band's bottom edge
          // (the OSP header's "Narrative view & lifecycle") was painted two different colours
          // down its own middle. Reported 2026-08-11 with a screenshot.
          bg: surface(props),
          _hover: {
            bg: mode('green.50', 'green.900')(props),
            borderColor: mode('green.600', 'green.400')(props),
            color: mode('green.800', 'green.400')(props), // darken on hover (rest is green.700)
            // The lift used to come from StandardButton's `_hover` prop, which was removed
            // because it also deleted the solid variant's hover BACKGROUND. Every variant
            // carries its own now, so outline/ghost still rise with the primary.
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
            _disabled: { transform: 'none', boxShadow: 'none' }
          }
        }),
        ghost: (props) => ({
          // Ghost stays transparent on purpose — it is the variant for actions that should
          // recede into whatever they sit on. `outline` is the one that needed a surface.
          bg: 'transparent',
          color: 'green.700', // WCAG AA on white (green.500 failed at 2.78:1)
          _hover: {
            bg: mode('green.50', 'green.900')(props),
            color: mode('green.800', 'green.400')(props),
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
            _disabled: { transform: 'none', boxShadow: 'none' }
          }
        })
      },
      baseStyle: (props) => ({
        borderRadius: '12px',
        fontWeight: '500',
        _focusVisible: {
          // Visible keyboard focus ring (green.100 #C6F6D5 was too faint to see on white).
          // This emitted an EMPTY rule until 2026-08-11 — see the file header.
          boxShadow: mode(
            '0 0 0 3px rgba(76, 175, 80, 0.6)', // green.500 @ 60%
            '0 0 0 3px #276749' // green.800
          )(props)
        },
        _disabled: {
          opacity: 0.4,
          cursor: 'not-allowed',
          boxShadow: 'none'
        }
      }),
      defaultProps: {
        variant: 'brand',
        size: 'md'
      }
    }
  }
};
