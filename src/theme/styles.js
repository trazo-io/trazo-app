/*!

=========================================================
* Trazo - Agricultural Carbon Transparency Platform
=========================================================

* Comprehensive Color Palette System v2.0
* Designed for premium agricultural carbon management
* Optimized for global accessibility and modern aesthetics

=========================================================

*/

// Updated for Chakra UI v2.10.9 - improved CSS-in-JS production support
import { mode } from '@chakra-ui/theme-tools';

/* 
=== TRAZO COLOR PALETTE SYSTEM ===

Primary Colors (Forest Green Family):
- primary-forest: #2E7D32     - Premium forest green for trust and stability
- primary-emerald: #059669    - Growth and sustainability
- primary-deep: #1B5E20       - Professional enterprise-grade
- primary-light: #81C784      - Light accent for subtle highlights

Neutral Colors (Professional Gray Scale):
- neutral-white: #FFFFFF      - Pure white for clean backgrounds
- neutral-light: #F8F9FA      - Light gray for page backgrounds
- neutral-border: #E0E0E0     - Medium gray for borders and dividers
- neutral-text: #424242       - Dark gray for body text
- neutral-heading: #1A1A1A    - Charcoal for headings and emphasis

Accent Colors:
- accent-amber: #FF9800       - Warm amber for CTAs and highlights
- accent-red: #F44336         - Error states and urgent actions
- accent-blue: #2196F3        - Information and links

Supporting Colors:
- success: #4CAF50            - Success states and confirmations
- warning: #FF9800            - Warning states
- error: #F44336              - Error states
- info: #2196F3               - Information states

Usage Guidelines:
- Use primary-forest for main CTAs and brand elements
- Use neutral-light for page backgrounds
- Use neutral-border for all borders and dividers
- Use accent-amber sparingly for important highlights
- Maintain 4.5:1 contrast ratio for accessibility
*/

export const globalStyles = {
  colors: {
    // Trazo Primary Color System
    trazo: {
      forest: '#2E7D32', // Primary brand color - premium forest green (= green.700)
      // ⛔ DEPRECATED — do not reach for this. #059669 is TAILWIND's emerald-600, a foreign
      // accent that never belonged to the Trazo ramp; it had leaked into the chart bars and
      // into three auth focus rings as `rgba(5, 150, 105, .1)`. Nothing reads it now. Use
      // green.700 (#2E7D32). See `.claude/rules/frontend.md` → "Colors — Theme Tokens Only".
      emerald: '#059669',
      deep: '#1B5E20', // Professional enterprise (= green.800)
      light: '#81C784' // Light accent (= green.400)
    },
    /**
     * Trazo green scale. Hue 122-124°, i.e. the same hue family as the logo mark (#007E00,
     * hue 120°) — the logo is simply a far more saturated cut of it (S 100% vs S 39-46%), which
     * is why the wordmark and the UI read as one colour despite not sharing a hex.
     *
     * WHICH ONE, is not a matter of taste — the ratios against white are MEASURED:
     *   500 = 2.78  ⛔ brand/decorative fill ONLY. Never white ON it, never it AS text.
     *   600 = 4.12  ✓ non-text boundaries (borders, focus rings). Under the 4.5 text floor.
     *   700 = 5.13  ✓ THE default: text on white, filled surfaces under white text, icons
     *                 that carry meaning, primary buttons.
     *   800 = 7.87 / 900 = 12.41  ✓ hover and active.
     * Full rationale, and the reason this keeps regressing, in `.claude/rules/frontend.md`.
     */
    green: {
      50: '#F8FDF9', // Ultra light sage — tinted panel ground
      100: '#E8F5E8', // Very light sage — 4.56:1 as a subtitle ON green.700
      200: '#C8E6C8', // Light sage — watermarks only (1.35:1 on white)
      300: '#A5D6A5', // Soft sage accent
      400: '#81C784', // Modern sage green
      500: '#4CAF50', // Brand green. NOT "primary" — see the ratios above
      600: '#388E3C', // Boundaries: borders, focus rings, dividers
      700: '#2E7D32', // Forest green — the working default for anything carrying content
      800: '#1B5E20', // Dark forest — hover
      900: '#0D3D0F' // Deepest forest — active/pressed
    },
    /**
     * Page canvas. gray.50 (#FAFAFA) measures 1.04:1 against a white card — the card was
     * separated from the page by its border and shadow alone, with the fill doing nothing.
     * #F4F5F7 is 1.09:1: still quiet, but the cards now read as raised surfaces.
     * Semantic on purpose — pages ask for `surface.canvas`, not a grey step.
     */
    surface: {
      canvas: '#F4F5F7',
      card: '#FFFFFF'
    },
    // Professional Neutral Scale
    gray: {
      50: '#FAFAFA',
      100: '#F8F9FA', // Light backgrounds
      200: '#E0E0E0', // Borders
      300: '#BDBDBD',
      400: '#9E9E9E',
      500: '#757575',
      600: '#616161',
      700: '#424242', // Body text
      800: '#303030',
      900: '#1A1A1A' // Headings
    },
    // Accent Colors
    amber: {
      50: '#FFF8E1',
      100: '#FFECB3',
      200: '#FFE082',
      300: '#FFD54F',
      400: '#FFCA28',
      500: '#FF9800', // Primary accent
      600: '#FB8C00',
      700: '#F57C00',
      800: '#EF6C00',
      900: '#E65100'
    },
    // Semantic Colors
    red: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      200: '#EF9A9A',
      300: '#E57373',
      400: '#EF5350',
      500: '#F44336', // Error color
      600: '#E53935',
      700: '#D32F2F',
      800: '#C62828',
      900: '#B71C1C'
    },
    blue: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#2196F3', // Info color
      600: '#1E88E5',
      700: '#1976D2',
      800: '#1565C0',
      900: '#0D47A1'
    }
  },
  styles: {
    global: (props) => ({
      body: {
        bg: mode('gray.100', 'gray.800')(props),
        fontFamily:
          "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: mode('gray.700', 'white')(props),
        lineHeight: 'base'
      },
      html: {
        fontFamily:
          "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
      },
      // Updated global styles with Trazo green focus
      '*': {
        boxSizing: 'border-box'
      },
      a: {
        color: mode('green.500', 'green.300')(props),
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
          color: mode('green.600', 'green.200')(props)
        }
      },
      // Fix Chakra UI spacing and layout issues
      //
      // The `margin: 0` neutralises Chakra's LEGACY margin-based stack spacing. Keep it:
      // Chakra 2.10 spaces stacks with `gap`, so any margin surviving on a stack child is
      // a double-space. (It also means an `mb` prop on a direct stack child is inert —
      // e.g. StandardCard's `mb` — which is why card-to-card spacing comes from the
      // parent's gap alone.)
      //
      // BUT dividers are the one exception. Chakra's Stack sets `gap: hasDivider ? undefined
      // : spacing` (stack.cjs:72) and, when a divider IS present, applies the spacing as
      // MARGINS on the divider via getDividerStyles(). This blanket rule killed exactly those
      // margins, so every `<Stack divider={<Divider/>}>` in the app collapsed to flush,
      // zero-spaced dividers (6 usages). Excluding the divider restores the documented
      // behaviour without touching anything else.
      '.chakra-stack': {
        '& > *:not(.chakra-divider)': {
          margin: '0 !important'
        }
      },
      // The two `[data-orientation]` rules that used to live here were DELETED 2026-08-07:
      // Chakra 2.10's Stack no longer emits a `data-orientation` attribute, so both selectors
      // matched nothing. They read as "every stack is forced to a flat 16px gap", which is
      // what made `spacing` look inert — it is not; it emits `gap` and works normally.
      '.chakra-simple-grid': {
        gap: 'var(--chakra-space-6)',
        '& > *': {
          margin: '0 !important'
        }
      },
      '.chakra-flex': {
        gap: 'var(--chakra-space-2)',
        '& > *': {
          margin: '0 !important'
        }
      },
      '.chakra-grid': {
        gap: 'var(--chakra-space-6)',
        '& > *': {
          margin: '0 !important'
        }
      }
    })
  }
};
