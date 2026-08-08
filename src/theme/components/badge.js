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
 * Note also: `colorScheme` does nothing here. Every variant hardcodes its colours, and
 * `defaultProps.variant` is `brand`, so `<Badge colorScheme="red">` renders GREEN. Use one of
 * the semantic variants below instead of a colorScheme.
 */
export const badgeStyles = {
  components: {
    Badge: {
      variants: {
        // Trazo brand-focused variants using forest green palette
        brand: {
          bg: 'green.500',
          color: 'white',
          fontSize: 'xs',
          fontWeight: '600'
        },
        outline: {
          border: '1px solid',
          borderColor: 'green.500',
          color: 'green.500',
          bg: 'transparent',
          fontSize: 'xs',
          fontWeight: '600'
        },
        subtle: (props) => ({
          bg: mode('green.100', 'green.900')(props),
          color: mode('green.800', 'green.200')(props),
          fontSize: 'xs',
          fontWeight: '600'
        }),
        // Semantic, non-brand variants. A classification, a count or a date range is a FACT —
        // painting it in brand green gives it the same weight as an approval signal.
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
          bg: mode('red.100', 'red.900')(props),
          color: mode('red.800', 'red.200')(props),
          fontSize: 'xs',
          fontWeight: '600',
          textTransform: 'none'
        })
      },
      baseStyle: {
        textTransform: 'capitalize',
        borderRadius: '6px',
        px: 2,
        py: 1,
        fontSize: 'xs',
        fontWeight: '500'
      },
      defaultProps: {
        variant: 'brand',
        size: 'md'
      }
    }
  }
};
