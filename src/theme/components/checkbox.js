import { mode } from '@chakra-ui/theme-tools';

/**
 * A checked checkbox is a MEANINGFUL GRAPHIC: the tick is the information, so WCAG 1.4.11 asks
 * for 3:1 between the mark and its fill.
 *
 * Chakra's `colorScheme="green"` fills the control with green.500 (#4CAF50) and draws a WHITE
 * tick on it — 2.78:1. That fails the 3.0 non-text floor outright, and it is the same failure
 * already fixed for Badge, Button and Progress; Checkbox was simply never given an override, so
 * every `<Checkbox colorScheme="green">` in the app kept rendering it. green.700 (#2E7D32) is
 * 5.13:1 under white.
 *
 * Radio and Switch share the anatomy and the defect, so they are corrected here too rather than
 * waiting to be found separately.
 *
 * Hover DARKENS (green.800). Chakra's own hover moved the fill to green.600, which drops a
 * checked box from 5.13 to 4.12 the moment the pointer touches it — see the same note in
 * `button.js`. Dark mode keeps Chakra's `.300`-family fill, whose paired icon colour is
 * gray.900 rather than white.
 *
 * ⚠️ Verify any change here by reading the COMPUTED style of a rendered control, never this
 * object — see the header of `theme/components/button.js` for why.
 */
const checkedControl = (props) => {
  const c = props.colorScheme || 'green';
  return {
    bg: mode(`${c}.700`, `${c}.300`)(props),
    borderColor: mode(`${c}.700`, `${c}.300`)(props),
    _hover: {
      bg: mode(`${c}.800`, `${c}.400`)(props),
      borderColor: mode(`${c}.800`, `${c}.400`)(props)
    }
  };
};

export const checkboxStyles = {
  components: {
    // ⛔ 2026-09-09 — MEASURED on the Parcel Application and OSP wizards: every checked radio
    // rendered rgb(25,118,210) = blue.700, not green.700. `props.colorScheme || 'green'` above
    // never fell back, because Chakra's own component theme sets `defaultProps.colorScheme:
    // 'blue'` and passes it in — the fallback only covered a prop Chakra always supplies. The
    // guard test passed forever because it supplied `colorScheme: 'green'` itself. Same
    // mechanism as Badge: extendTheme deep-merges defaultProps, so ours has to say green.
    Checkbox: {
      defaultProps: { colorScheme: 'green' },
      baseStyle: (props) => ({
        control: {
          _checked: checkedControl(props),
          // Chakra styles the mixed state separately; left at green.500 it would be the same
          // 2.78:1 failure in a state nobody thinks to screenshot.
          _indeterminate: checkedControl(props)
        }
      })
    },
    Radio: {
      defaultProps: { colorScheme: 'green' },
      baseStyle: (props) => ({
        control: {
          _checked: checkedControl(props)
        }
      })
    },
    Switch: {
      defaultProps: { colorScheme: 'green' },
      baseStyle: (props) => ({
        track: {
          _checked: {
            bg: mode(
              `${props.colorScheme || 'green'}.700`,
              `${props.colorScheme || 'green'}.300`
            )(props)
          }
        }
      })
    }
  }
};
