/**
 * How an event_type LOOKS — badge variant, icon glyph, icon-chip tokens.
 *
 * One home, because the two surfaces that render an event disagreed. `ActivityListItem`
 * already had the semantic half right (`TYPE_BADGE`: "Status colour = meaning: inputs warn,
 * pest is danger"). `EventDetailsModal` carried a private `getEventConfig()` that assigned
 * each of the eight families its own decorative accent — `orange.500`, `yellow.700`,
 * `teal.500`, `purple.500` — none of which the theme defines. `theme/styles.js` declares
 * green / gray / amber / red / blue and nothing else, so those four resolved to CHAKRA's
 * palettes: four foreign accents, arriving through the one component a grower opens to read
 * a record. It also hardcoded the English category name ("Other Farm Activity") on a screen
 * that is otherwise translated.
 *
 * TYPE_BADGE moved here rather than being imported out of `views/` — a shared component
 * reaching into a route's folder is the wrong direction, and this is not activity-feed
 * knowledge, it is event knowledge.
 *
 * ⚠️ There is no per-family colour and there should not be one. `.claude/rules/frontend.md`:
 * "Status colour = meaning, never decoration", and a category is not a status. Eight families
 * against five theme palettes cannot be injective anyway. The GLYPH is what separates a
 * frost record from a spray record; the colour says only how much the reader should care.
 *
 * Labels are `activities.type.${n}` — already present in both locales, already used by the
 * activity feed, so the modal and the row it was opened from now say the same word.
 */
import {
  FaBug,
  FaCertificate,
  FaClipboardList,
  FaCloudRain,
  FaFlask,
  FaLayerGroup,
  FaSeedling,
  FaTractor
} from 'react-icons/fa';
import type { IconType } from 'react-icons';

/** Badge variant per event_type. Status colour = meaning: inputs warn, pest is danger. */
export const TYPE_BADGE: Record<number, string> = {
  0: 'subtle',
  1: 'brand',
  2: 'warning',
  3: 'neutral',
  4: 'neutral',
  5: 'subtle',
  6: 'danger',
  7: 'neutral'
};

export const TYPE_ICON: Record<number, IconType> = {
  0: FaCloudRain,
  1: FaSeedling,
  2: FaFlask,
  3: FaClipboardList,
  4: FaTractor,
  5: FaLayerGroup,
  6: FaBug,
  7: FaCertificate
};

/**
 * The icon chip behind the glyph, keyed by the SAME semantic the badge uses so the header
 * reads as one unit rather than two unrelated colour decisions.
 *
 * The glyph is a meaningful graphic on a tinted ground, so WCAG 1.4.11 asks 3:1 against that
 * ground. MEASURED with the project's own probe values (`StandardComponents.ALERT_ACCENT_SHADE`
 * documents the same four numbers for alert icons, which sit on the identical `.50` grounds):
 *   green.700 on green.50 → 4.97 ✓      amber.900 on amber.50 → 3.57 ✓
 *   red.700   on red.50   → 4.36 ✓      gray.700  on gray.100 → 8.2  ✓
 * amber is the one that needs the `.900` step: the ramp tops out at #E65100 and every lower
 * rung fails (500 → 2.03, 600 → 2.23, 700 → 2.55, 800 → 2.90).
 *
 * gray uses `.100` rather than `.50` for its ground on purpose — gray.50 is #FAFAFA, which is
 * within 1.04:1 of a white card, so the chip would not read as a chip at all.
 */
export interface EventTypeChipTokens {
  /** [light, dark] — pass through `useColorModeValue`. */
  bg: [string, string];
  fg: [string, string];
}

const CHIP_BY_VARIANT: Record<string, EventTypeChipTokens> = {
  brand: { bg: ['green.50', 'green.900'], fg: ['green.700', 'green.300'] },
  subtle: { bg: ['green.50', 'green.900'], fg: ['green.700', 'green.300'] },
  warning: { bg: ['amber.50', 'amber.900'], fg: ['amber.900', 'amber.100'] },
  danger: { bg: ['red.50', 'red.900'], fg: ['red.700', 'red.100'] },
  neutral: { bg: ['gray.100', 'gray.700'], fg: ['gray.700', 'gray.100'] }
};

const NEUTRAL_CHIP = CHIP_BY_VARIANT.neutral;

/**
 * Everything a surface needs to render one event_type. Unknown codes fall back to the
 * neutral/"Other" treatment rather than rendering nothing — `event_type` arrives from the
 * API and a future eighth family should degrade, not blank the header.
 */
export const eventTypeAppearance = (eventType: number | undefined) => {
  const code = typeof eventType === 'number' ? eventType : 3;
  const variant = TYPE_BADGE[code] ?? 'neutral';
  return {
    badgeVariant: variant,
    icon: TYPE_ICON[code] ?? FaClipboardList,
    labelKey: `activities.type.${TYPE_ICON[code] ? code : 3}`,
    chip: CHIP_BY_VARIANT[variant] ?? NEUTRAL_CHIP
  };
};
