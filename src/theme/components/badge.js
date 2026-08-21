// Updated for Chakra UI v2.10.9 - restored mode function with improved CSS-in-JS support
import { mode } from '@chakra-ui/theme-tools';

/**
 * ⚠️ Variants must be FUNCTIONS of props when they need a dark-mode value.
 *
 * These were written as `bg: { base: 'green.50', _dark: 'green.900' }`. That object shape is
 * the SEMANTIC-TOKEN syntax and is not resolvable inside a component variant — Chakra could
 * not turn it into a colour, so `background-color` computed to `rgba(0,0,0,0)` and every
 * `subtle` badge in the app rendered as bare text with no pill at all (caught 2026-08-07 by
 * reading computed styles on the farm profile, where "Active" and "Orchard" looked like two
 * stray bold labels). `mode(light, dark)(props)` is the correct form, and this file already
 * imported it without ever calling it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * 2026-08-11 — `colorScheme` WORKS AGAIN. Read this before touching the variants.
 *
 * It used to be inert: every variant hardcoded green and `defaultProps.variant` was `brand`,
 * so `<Badge colorScheme="red">` rendered GREEN. The note that said so was accurate, and it
 * was not enough — the trap kept catching people, because `colorScheme` is the prop every
 * Chakra user reaches for and the failure is silent and *reassuring*: the badge still looks
 * fine, it just says the opposite of what it means. It shipped the word "Missing" in the
 * success palette on the farm-home headline, and it left ~30 call sites computing a colour in
 * a ternary (`isValid ? 'green' : 'red'`) whose two branches rendered identically.
 *
 * So the fix is here rather than at 269 call sites: the variants are now functions of
 * `props.colorScheme`, and `defaultProps.colorScheme` is `green`.
 *
 *   <Badge>                    → solid Trazo green   (unchanged)
 *   <Badge colorScheme="green">→ solid Trazo green   (unchanged)
 *   <Badge colorScheme="red">  → red tint            (was green)
 *   <Badge variant="subtle">   → light green tint    (unchanged)
 *   <Badge variant="danger">   → red tint            (unchanged — semantic variants still win)
 *
 * Two deliberate choices:
 *
 * 1. `defaultProps.colorScheme: 'green'`. `extendTheme` DEEP-MERGES with Chakra's own Badge
 *    theme, which sets `defaultProps.colorScheme: 'gray'` — so a badge that passes no
 *    colorScheme arrives here claiming `gray`, and "author said nothing" is indistinguishable
 *    from "author said gray". Defaulting to `green` collapses the ambiguity in the safe
 *    direction: no-colorScheme keeps exactly the look it has today, and an author who wants
 *    grey now writes `colorScheme="gray"` (or the `neutral` variant) and gets grey.
 *
 * 2. `brand` renders NON-GREEN schemes as a tint, not as a solid. The solid green pill is
 *    Trazo's brand mark; the other palettes are states, and a state reads better — and passes
 *    contrast — as `.100` on `.800`, which is the pairing the semantic variants below already
 *    use. Solid yellow/amber with white text does not pass AA at all.
 *
 * `variant="solid"` is Chakra's own and has always honoured colorScheme; it is untouched.
 *
 * ⛔ Do NOT reintroduce a hardcoded colour in a variant. That is what made the prop lie.
 */

// Palettes that resolve to a real scale (theme/styles.js defines green/gray/red/blue/amber/
// trazo; the rest come from Chakra's defaults through extendTheme). A colorScheme off this
// list — and several call sites compute one at runtime, e.g. `eventConfig.color.split('.')[0]`
// — would resolve `${c}.100` to nothing and paint `rgba(0,0,0,0)`, i.e. the exact invisible-pill
// bug described at the top of this file. Fall back to green rather than render nothing.
const BADGE_PALETTES = new Set([
  'green',
  'gray',
  'red',
  'orange',
  'yellow',
  'blue',
  'teal',
  'purple',
  'cyan',
  'pink',
  'amber'
]);

const paletteOf = (props) => (BADGE_PALETTES.has(props?.colorScheme) ? props.colorScheme : 'green');

/**
 * `.100` on `.800` — the contrast-checked pairing used by warning/danger below.
 *
 * ⚠️ EXCEPT GREY. `gray.100` is #F8F9FA, which IS the page background (theme/styles.js sets
 * `body { bg: gray.100 }`), so a grey pill built from the normal pairing is an invisible
 * rectangle on every page and a near-invisible one on a white card. That is the defect the
 * `neutral` variant below was created to fix in 2026-08, and routing `colorScheme="gray"`
 * through the generic tint reintroduced it — caught by reading the computed styles of the
 * "Draft" / "Not started" badges on the OSP narratives page, not by looking at the code.
 * Grey uses the same gray.200/gray.700 (~7.4:1) that `neutral` uses, so the two agree.
 */
// Per-palette overrides. Measured with a contrast probe over the rendered badges on the eight
// producer routes, not eyeballed: the default `.100`/`.800` pairing clears 4.5:1 for green and
// orange but NOT for red (3.99:1) or blue (4.09:1), both of which need the `.900` text. Grey is
// the background-collision case described above.
const TINT_STEPS = {
  gray: { lightBg: 'gray.200', lightFg: 'gray.700', darkBg: 'gray.700', darkFg: 'gray.200' },
  red: { lightBg: 'red.100', lightFg: 'red.900', darkBg: 'red.900', darkFg: 'red.100' },
  blue: { lightBg: 'blue.100', lightFg: 'blue.900', darkBg: 'blue.900', darkFg: 'blue.100' }
};

const tint = (props) => {
  const c = paletteOf(props);
  const s = TINT_STEPS[c] || {
    lightBg: `${c}.100`,
    lightFg: `${c}.800`,
    darkBg: `${c}.900`,
    darkFg: `${c}.200`
  };
  return {
    bg: mode(s.lightBg, s.darkBg)(props),
    color: mode(s.lightFg, s.darkFg)(props)
  };
};

export const badgeStyles = {
  components: {
    Badge: {
      variants: {
        // Trazo brand-focused variants using forest green palette
        brand: (props) =>
          paletteOf(props) === 'green'
            ? {
                // green.700 (#2E7D32), NOT green.500 (#4CAF50). White on green.500 measures
                // 2.78:1 — it fails AA outright, and badge text is 11–12px, so the 3:1
                // large-text allowance does not apply either. This is the same call already
                // made for the audit-PDF headers, which were moved off #4CAF50 for exactly
                // this reason; green.500 stays the button/brand fill, where the text is larger.
                bg: 'green.700',
                color: 'white',
                fontSize: 'xs',
                fontWeight: '600'
              }
            : {
                ...tint(props),
                fontSize: 'xs',
                fontWeight: '600',
                textTransform: 'none'
              },
        /**
         * Chakra's own `solid` puts white on `<palette>.500`. For green that is #4CAF50 at
         * 2.78:1 — the same failure already fixed for buttons and the `brand` badge. 28 call
         * sites use `variant="solid"`, so this belongs here rather than at each one.
         * `.700` clears 4.5:1 for every palette in the theme.
         */
        solid: (props) => {
          const c = paletteOf(props);
          return {
            bg: mode(`${c}.700`, `${c}.300`)(props),
            color: mode('white', 'gray.900')(props)
          };
        },
        outline: (props) => {
          const c = paletteOf(props);
          return {
            border: '1px solid',
            borderColor: mode(`${c}.500`, `${c}.300`)(props),
            color: mode(`${c}.500`, `${c}.300`)(props),
            bg: 'transparent',
            fontSize: 'xs',
            fontWeight: '600'
          };
        },
        subtle: (props) => ({
          ...tint(props),
          fontSize: 'xs',
          fontWeight: '600'
        }),
        // Semantic, non-brand variants. A classification, a count or a date range is a FACT —
        // painting it in brand green gives it the same weight as an approval signal. These
        // ignore colorScheme on purpose: their whole point is that the meaning is in the name,
        // so `<Badge variant="danger">` cannot be accidentally turned green by a stray prop.
        // gray.200 (#E0E0E0), NOT gray.100 — gray.100 is #F8F9FA, the page background, so a
        // neutral pill was invisible against a white card. gray.700 on gray.200 is ~7.4:1.
        neutral: (props) => ({
          bg: mode('gray.200', 'gray.700')(props),
          color: mode('gray.700', 'gray.200')(props),
          fontSize: 'xs',
          fontWeight: '600',
          textTransform: 'none'
        }),
        warning: (props) => ({
          bg: mode('orange.100', 'orange.900')(props),
          color: mode('orange.800', 'orange.200')(props),
          fontSize: 'xs',
          fontWeight: '600',
          textTransform: 'none'
        }),
        danger: (props) => ({
          // red.900, not red.800 — red.800 on red.100 measures 3.99:1 and fails AA. This is the
          // variant the farm-home "Missing" badges use, i.e. the most consequential word on the
          // dashboard; it has to be legible before it is on-palette.
          bg: mode('red.100', 'red.900')(props),
          color: mode('red.900', 'red.100')(props),
          fontSize: 'xs',
          fontWeight: '600',
          textTransform: 'none'
        })
      },
      baseStyle: {
        /*
         * Render the label as the author wrote it. `capitalize` was here, and because it lives
         * in baseStyle it reached every badge whose variant did not explicitly opt out — which
         * in practice meant the solid green `brand` ones. Two consequences, both real:
         *
         * 1. One i18n string rendered two ways depending on a colour prop. The certifier badge
         *    is authored "Certifier record"; on a green palette it came out "Certifier Record",
         *    on a tinted one "Certifier record". Same string, same screen.
         * 2. `capitalize` title-cases EVERY word, so es-419's "Registro para el certificador"
         *    became "Registro Para El Certificador" — not correct Spanish. English hid this.
         *
         * Checked before removing: of 103 badge/status i18n keys only 6 start lowercase, and
         * all 6 are `osp.status.phrase.*`, which are used inside sentences, not in badges.
         */
        textTransform: 'none',
        borderRadius: '6px',
        px: 2,
        py: 1,
        fontSize: 'xs',
        fontWeight: '500'
      },
      defaultProps: {
        variant: 'brand',
        size: 'md',
        // See note 1 above — NOT cosmetic. Chakra's merged default is 'gray'.
        colorScheme: 'green'
      }
    }
  }
};
