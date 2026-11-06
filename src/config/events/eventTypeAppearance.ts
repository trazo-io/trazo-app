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

/**
 * Badge variant per event_type.
 *
 * ⚠️ 2 (inputs) and 6 (pest) are NEUTRAL as of 2026-08-28. They were `warning` and `danger`,
 * on the reading that "inputs warn, pest is danger" — which is a CONVENTIONAL-ag instinct and
 * the wrong one for a product whose subject is a certified ORGANIC operation.
 *
 * What it produced on screen: a pheromone-trap reading ("Trap Monitoring", "Pest Scouting")
 * wore a red badge and a red icon ring, and an OMRI-type input — Neptune's Harvest fish
 * fertiliser — wore the amber `warning` pill. Both are the opposite of trouble. 7 CFR 205.206
 * is the crop pest, weed and disease management practice standard and monitoring is the
 * preventive practice it asks a producer to document; 7 CFR 205.601 inputs are permitted by
 * definition. These rows are the compliance EVIDENCE a certifier opens the packet to find, and
 * they were rendering in the same red and amber the dashboard uses for a real blocker and for
 * "Needs attention".
 *
 * Reserving red and amber for things a grower must ACT on is what keeps them worth looking at.
 * Category identity is carried by the glyph (bug, flask) and the label, per the note above.
 *
 * CHIP_BY_VARIANT below is keyed off these values, so the icon chip follows automatically on
 * every surface that renders through `eventTypeAppearance()`.
 *
 * ── TONAL GREEN, 2026-08-29 ─────────────────────────────────────────────────────────────────
 * All eight families are now the SAME variant. `subtle` resolves to green.800 on green.100
 * (6.99:1) — one hue, with weight rather than hue carrying difference.
 *
 * This finishes a job that had been left half-done twice. The families first carried seven
 * decorative hues; two were neutralised when pest and inputs came off red and amber; the rest
 * kept theirs, so the system ended up half one rule and half another — a green badge above a
 * blue ring on the same record. Splitting the difference is what kept producing the drift.
 *
 * Why one hue can be the whole answer: a category is a plain fact, the glyph already names it,
 * and eight families against the five scales styles.js defines cannot be one-to-one anyway —
 * with amber and red reserved for things a grower must act on, only three remain. So the
 * choice was never "which eight hues", it was "one hue or none". Trazo picked its own.
 *
 * ⛔ Do NOT reintroduce a per-family variant here. If a family ever needs to stand out, that
 * is a STATUS about a particular record (overdue, unverified, blocked), not a property of the
 * family — and it belongs on a status element, not on the category chip.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 */
export const TYPE_BADGE: Record<number, string> = {
  0: 'subtle',
  1: 'subtle',
  2: 'subtle',
  3: 'subtle',
  4: 'subtle',
  5: 'subtle',
  6: 'subtle',
  7: 'subtle'
};

/**
 * event_type → activity-family key, for the CALENDAR only.
 *
 * The month view is the one surface where the chip stands alone — no glyph beside it, no title,
 * no description, and a label that truncates ("Certification & compl…"). One tonal green there
 * is a month of identical pills you cannot scan. Everywhere the glyph is present, TYPE_BADGE's
 * single green still applies; see the note on it above.
 *
 * The hues live in `theme/styles.js` under `colors.family` with their measurements and the
 * mnemonic-not-evaluative rule. This map is only the wiring.
 *
 * ⚠️ Pair every use with `TYPE_ICON` — colour must never be the sole signal.
 */
// Same categories, same hues as components/Events/categoryTone EVENT_TYPE_HUE (palette B):
// general, equipment and business share the neutral gray there, so they share `other` here.
export const CALENDAR_FAMILY: Record<number, string> = {
  0: 'sky',
  1: 'production',
  2: 'inputs',
  3: 'other',
  4: 'other',
  5: 'soil',
  6: 'pest',
  7: 'other'
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
