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

/**
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * 2026-08-16 — `colorScheme` WORKS on solid / outline / ghost. Read this before touching them.
 *
 * It was inert, exactly the way `Badge colorScheme` was inert until 2026-08-11 (see the header
 * of `badge.js` for the full argument — it applies here verbatim). `outline` and `ghost`
 * hardcoded green, and `solid` returned `{}` for anything that was not green, so:
 *
 *   <Button colorScheme="red" variant="outline">Delete</Button>   → GREEN border, GREEN label
 *   <Button colorScheme="red" variant="solid">Delete</Button>     → Chakra's stock red.500
 *
 * The first shipped on the event-details modal: the DESTRUCTIVE action was painted in the
 * brand/success colour, beside a blue primary, and only turned red on hover (that call site
 * carried an inline `_hover`). Caught 2026-08-16 from a screenshot, not from the code — the
 * failure is silent and *reassuring*, which is precisely why it belongs in the theme and not
 * in a per-call-site override.
 *
 * Two deliberate choices, both copied from badge.js:
 *
 * 1. `defaultProps.colorScheme: 'green'`. `extendTheme` DEEP-MERGES with Chakra's own Button
 *    theme, whose `defaultProps.colorScheme` is `gray` — so a button that passes nothing
 *    arrives here claiming grey, and "author said nothing" would be indistinguishable from
 *    "author wants grey". Defaulting to green keeps every no-colorScheme button (215 of the
 *    230 outline call sites) looking exactly as it does today.
 *
 * 2. The list is THREE palettes, not the whole theme. A palette earns a slot here only if it
 *    has a step that clears 4.5:1 against white AND under white — a button label is 14–16px,
 *    below WCAG's large-text threshold, so the 3:1 allowance never applies. MEASURED against
 *    the ramps in `theme/styles.js`:
 *      green.700 #2E7D32 → 5.13 ✓   red.700 #D32F2F → 4.98 ✓   gray.700 #424242 → 10.05 ✓
 *      amber tops out at #E65100 → 3.79 ✗ at its DARKEST step. There is no AA-safe amber
 *      button; a warning reads as `Badge variant="warning"` or a `StandardAlert`, which are
 *      tints and only owe the 3.0 non-text floor. Same conclusion badge.js reached.
 *    BLUE is excluded on a different ground: `.claude/rules/frontend.md` — "Blue survives in
 *    exactly one place: Chakra `Alert status="info"`." Four call sites ask for a blue button;
 *    all four render green today, and resolving blue would introduce a fresh rule violation
 *    rather than fix one. Anything off the list falls back to green, i.e. no change at all —
 *    which is also what saves the call sites still naming yellow/teal/pink/facebook, scales
 *    the theme does not define and for which `${c}.700` would compute to nothing.
 *
 * ⛔ Do NOT reintroduce a hardcoded colour in these three variants. That is what made the
 * prop lie. `brand` stays green-locked because it IS the brand mark, not a palette slot.
 */
const BUTTON_PALETTES = new Set(['green', 'gray', 'red']);

const paletteOf = (props) =>
  BUTTON_PALETTES.has(props?.colorScheme) ? props.colorScheme : 'green';

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
         *
         * `.700` rather than Chakra's `.500` for EVERY palette, not just green: white on
         * Chakra's stock red.500 #E53E3E is 3.76:1 and fails AA at button-label size, which
         * is what the app's five `colorScheme="red" variant="solid"` confirm buttons were
         * rendering. red.700 is 4.98:1.
         */
        solid: (props) => {
          const c = paletteOf(props);
          return {
            bg: mode(`${c}.700`, `${c}.300`)(props),
            color: mode('white', 'gray.900')(props),
            _hover: {
              bg: mode(`${c}.800`, `${c}.200`)(props),
              transform: 'translateY(-1px)',
              boxShadow: 'lg',
              _disabled: { transform: 'none', boxShadow: 'none' }
            },
            _active: { bg: mode(`${c}.900`, `${c}.100`)(props), transform: 'translateY(0px)' }
          };
        },
        outline: (props) => {
          const c = paletteOf(props);
          return {
            border: '1px solid',
            // `.600`, not `.500`: the border IS the control's boundary, and WCAG 1.4.11 wants
            // 3:1 for that. green.500 on white is 2.78:1; green.600 is 4.12:1, red.600 4.23:1,
            // gray.600 6.19:1.
            borderColor: mode(`${c}.600`, `${c}.400`)(props),
            // `.700` = 5.13:1 (green) / 4.98:1 (red) / 10.05:1 (gray) on white. `.500` was 2.78:1.
            color: mode(`${c}.700`, `${c}.300`)(props),
            // NOT `transparent`. An outline button is a button, not a hole: on a tinted hero band
            // the page showed straight through it, and a button straddling the band's bottom edge
            // (the OSP header's "Narrative view & lifecycle") was painted two different colours
            // down its own middle. Reported 2026-08-11 with a screenshot.
            bg: surface(props),
            _hover: {
              bg: mode(`${c}.50`, `${c}.900`)(props),
              borderColor: mode(`${c}.600`, `${c}.400`)(props),
              color: mode(`${c}.800`, `${c}.400`)(props), // darken on hover (rest is `.700`)
              // The lift used to come from StandardButton's `_hover` prop, which was removed
              // because it also deleted the solid variant's hover BACKGROUND. Every variant
              // carries its own now, so outline/ghost still rise with the primary.
              transform: 'translateY(-1px)',
              boxShadow: 'lg',
              _disabled: { transform: 'none', boxShadow: 'none' }
            }
          };
        },
        ghost: (props) => {
          const c = paletteOf(props);
          return {
            // Ghost stays transparent on purpose — it is the variant for actions that should
            // recede into whatever they sit on. `outline` is the one that needed a surface.
            bg: 'transparent',
            color: mode(`${c}.700`, `${c}.300`)(props), // WCAG AA (`.500` failed at 2.78:1)
            _hover: {
              bg: mode(`${c}.50`, `${c}.900`)(props),
              color: mode(`${c}.800`, `${c}.400`)(props),
              transform: 'translateY(-1px)',
              boxShadow: 'lg',
              _disabled: { transform: 'none', boxShadow: 'none' }
            }
          };
        }
      },
      baseStyle: {
        borderRadius: '12px',
        fontWeight: '500',
        _focusVisible: {
          // ONE ring for the whole app: the `outline` shadow token, defined in
          // `theme/styles.js`. This used to hand-roll its own — `rgba(76,175,80,0.6)`, which
          // composites to #94CF96 over white = 1.81:1 and fails the 3:1 focus-indicator floor.
          // The token is green.600 at full opacity: 4.12:1 light, 3.21:1 dark. A button's
          // focus ring must not be a different green from a text input's.
          boxShadow: 'outline'
        },
        _disabled: {
          opacity: 0.4,
          cursor: 'not-allowed',
          boxShadow: 'none'
        }
      },
      defaultProps: {
        variant: 'brand',
        // See the BUTTON_PALETTES note above: `extendTheme` deep-merges Chakra's own
        // `colorScheme: 'gray'` default, which would repaint every no-colorScheme outline and
        // ghost button grey. Defaulting to green collapses "author said nothing" into the
        // look those 215 call sites already have.
        colorScheme: 'green',
        size: 'md'
      }
    }
  }
};
