/**
 * Alert — the theme Trazo never had.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * 2026-08-17 — WHY THIS FILE EXISTS. Read before touching it.
 *
 * The app shipped TWO alert designs. `StandardAlert` (42 call sites) painted a 4px accent
 * bar, a `lg` radius and a top-aligned icon; a bare `<Alert>` (71 openings across 31 files)
 * got Chakra's stock `subtle` — no bar, `md`/`lg`/`xl` radius depending on who wrote it, and
 * a vertically-CENTRED icon. Both render on the same screen: the OSP module page puts a bare
 * blue note under "Records you maintain" a few hundred pixels above a `StandardAlert`, and
 * the event form stacks a bare amber "Microphone access is blocked" directly on top of a
 * `StandardAlert` "Production record". Reported 2026-08-17 with screenshots.
 *
 * This is the badge.js / button.js situation for the third time: a Chakra component the theme
 * did not own, so 71 call sites each invented their own version. The fix goes here, not at 71
 * call sites — and the same reasoning those two files record applies verbatim.
 *
 * ── Two things about Chakra's Alert make this work, both verified in node_modules ────────
 *
 * 1. `alert.cjs` builds its container as
 *        { width, display:'flex', alignItems:'center', position, overflow, ...styles.container }
 *    — the theme's `container` is spread LAST, so `alignItems` here BEATS the hardcoded
 *    `center`. StandardAlert fixed this with a style prop, which was correct and reached
 *    exactly one component; from the theme it reaches all of them. That centred icon is not
 *    cosmetic: on any alert whose body wraps to two lines the icon floats against the SECOND
 *    line with nothing beside the first.
 *
 * 2. `alert.cjs` calls `useMultiStyleConfig('Alert', { ...props, colorScheme })`, so the
 *    variant function receives BOTH the derived `colorScheme` and the original `status`.
 *
 * ⛔ We read `status`, NEVER `colorScheme` — and that is the whole reason this file maps the
 * palette itself. `alert-context.cjs` maps `status="warning"` to `colorScheme: "orange"`, and
 * per `.claude/rules/frontend.md` the Trazo theme defines `amber` and NOT `orange`: an
 * `orange.*` token silently resolves to CHAKRA's orange, a foreign accent. Trusting
 * `colorScheme` would paint every warning in a palette that is not ours, and it would do it
 * silently. `success` and `error` happen to line up (green/red) and `info` happens to line up
 * (blue); `warning` is the one that does not, which is exactly the kind of three-out-of-four
 * agreement that hides a bug.
 *
 * ── What is deliberately NOT here ────────────────────────────────────────────────────────
 *
 * `borderRadius` IS set on `container`, but a call site passing `borderRadius="md"` as a
 * STYLE PROP still outranks it — style props beat theme styles. That is why the 71 openings
 * had their hardcoded radii removed in the same change; this file alone would have left the
 * shape mix in place. If a new `<Alert borderRadius=…>` appears, it is drift, and
 * `theme/__tests__/alertTheme.test.ts` is what notices.
 */
import { cssVar } from '@chakra-ui/styled-system';

/**
 * status → Trazo palette. Canonical: `StandardAlert` re-exports these two objects rather
 * than declaring its own, so the standard component and every bare `<Alert>` are provably
 * the same colours. `theme/__tests__/alertContrast.test.ts` already asserts that each name
 * resolves to a real scale and that the accent clears WCAG 1.4.11 against its `.50` ground.
 */
export const ALERT_PALETTE = {
  success: 'green',
  error: 'red',
  warning: 'amber',
  info: 'blue'
};

/**
 * Which step the icon and the 4px accent bar take.
 *
 * Chakra's stock `.500` does not pay the 3.0:1 WCAG 1.4.11 non-text floor against these
 * `.50` grounds. MEASURED icon-on-ground:
 *   green.500 -> 2.70 ✗   green.700 -> 4.98 ✓
 *   blue.500  -> 2.74 ✗   blue.700  -> 4.03 ✓
 *   red.500   -> 3.22 ✓   red.700   -> 4.36 ✓  (red already cleared; 700 for consistency)
 * The amber ramp tops out at #E65100, so warning is the one that needs the 900 step — every
 * lower rung fails: 500 -> 2.03, 600 -> 2.23, 700 -> 2.55, 800 -> 2.90, 900 -> 3.57 ✓
 */
export const ALERT_ACCENT_SHADE = {
  success: '700',
  error: '700',
  warning: '900',
  info: '700'
};

/** Falls back to `info` rather than rendering an inert token, the way badge.js does. */
const paletteOf = (props) => ALERT_PALETTE[props?.status] || ALERT_PALETTE.info;
const accentOf = (props) => ALERT_ACCENT_SHADE[props?.status] || ALERT_ACCENT_SHADE.info;

/**
 * The one look, shared by `subtle` and `left-accent`.
 *
 * Both variants resolve identically on purpose. 69 of the 71 bare openings passed no
 * `variant` at all and so landed on Chakra's default `subtle`; making `subtle` carry the
 * accent bar is what closes the gap without editing those 69 call sites. `left-accent`
 * (what StandardAlert asks for by name) then has to agree, or the standard component and
 * the bare ones diverge again from the opposite direction.
 *
 * ⚠️ `extendTheme` DEEP-MERGES with Chakra's own alert theme — this object does not replace
 * `variantSubtle`, it lands on top of it. Two consequences, both caught by
 * `theme/__tests__/alertTheme.test.ts` rather than by reading the code:
 *
 *   1. Chakra's variants set the CSS VARIABLES `--alert-bg`/`--alert-fg` from `colorScheme`,
 *      which for `status="warning"` is `orange`. Overriding only the concrete `bg` and
 *      `color` leaves `--alert-fg: colors.orange.600` alive underneath, still feeding
 *      anything that references it (the spinner part does). So we overwrite the VARIABLES,
 *      and the concrete props then fall out of them the way Chakra intends.
 *   2. Chakra's `left-accent` adds `paddingStart: "3"` and `subtle` does not, so a merge that
 *      ignored padding left the two variants 4px apart. `paddingStart` is therefore set here
 *      explicitly, for both.
 */
const $fg = cssVar('alert-fg');
const $bg = cssVar('alert-bg');

const trazoAlert = (props) => {
  const c = paletteOf(props);
  const accentShade = accentOf(props);
  return {
    container: {
      // Overwrite the variables, not just the properties they feed — see note 1 above.
      [$fg.variable]: `colors.${c}.${accentShade}`,
      [$bg.variable]: `colors.${c}.50`,
      _dark: {
        [$fg.variable]: `colors.${c}.200`,
        [$bg.variable]: `colors.${c}.900`
      },
      bg: $bg.reference,
      borderRadius: 'lg',
      borderStartWidth: '4px',
      borderStartColor: $fg.reference,
      // See the header: this BEATS the `alignItems: 'center'` hardcoded in alert.cjs,
      // because the theme's `container` is spread after it.
      alignItems: 'flex-start',
      px: 4,
      paddingStart: 4,
      py: 3
    },
    // `marginEnd: 3` matches Chakra's own icon gap; the `mt` nudges the glyph onto the
    // optical centre of the FIRST line now that the container aligns to the start.
    icon: {
      color: $fg.reference,
      flexShrink: 0,
      marginEnd: 3,
      mt: '2px'
    },
    title: { fontWeight: 'semibold', lineHeight: 'short', marginEnd: 2 },
    description: { lineHeight: 'short' }
  };
};

export const alertStyles = {
  components: {
    Alert: {
      variants: {
        subtle: trazoAlert,
        'left-accent': trazoAlert
      }
    }
  }
};
