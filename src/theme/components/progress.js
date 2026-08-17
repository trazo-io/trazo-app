import { mode } from '@chakra-ui/theme-tools';

/**
 * A progress bar is a MEANINGFUL GRAPHIC — its filled length is the information — so WCAG
 * 1.4.11 asks for 3:1 against the adjacent colour, which here is its own track.
 *
 * Chakra's `colorScheme="green"` fills with green.500 (#4CAF50). Against the gray.100 track
 * that is 2.64:1: on the OSP module cards the "6 of 6 required answers" bar was barely
 * separable from its groove. green.700 is 4.86:1.
 *
 * Same rule as everywhere else in this app: green.500 is the brand colour, not a colour that
 * carries content. See `.claude/rules/frontend.md` → "Colour system".
 *
 * ⚠️ Verify any change here by reading the COMPUTED style of a rendered bar, never this
 * object — see the header of `theme/components/button.js` for why.
 */
export const progressStyles = {
  components: {
    Progress: {
      baseStyle: (props) => ({
        track: {
          bg: mode('gray.100', 'gray.700')(props)
        }
      }),
      variants: {
        // Chakra resolves the filled track through the variant, so the override lives here.
        solid: (props) => {
          const c = props.colorScheme;
          return {
            filledTrack: {
              bg: c ? mode(`${c}.700`, `${c}.300`)(props) : mode('green.700', 'green.300')(props)
            }
          };
        }
      },
      defaultProps: {
        variant: 'solid'
      }
    }
  }
};
