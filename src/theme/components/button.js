// Updated for Chakra UI v2.10.9 - restored mode function with improved CSS-in-JS support
import { mode } from '@chakra-ui/theme-tools';

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
        // Trazo brand-focused variants using forest green palette
        brand: {
          bg: 'green.500',
          color: 'white',
          _hover: {
            bg: {
              base: 'green.600',
              _dark: 'green.400'
            },
            transform: 'translateY(-1px)',
            boxShadow: 'lg'
          },
          _active: {
            bg: {
              base: 'green.700',
              _dark: 'green.300'
            },
            transform: 'translateY(0px)'
          }
        },
        outline: {
          border: '1px solid',
          borderColor: 'green.500',
          color: 'green.700', // green.700 #2E7D32 = 5.13:1 on white (WCAG AA); green.500 was 2.78:1
          bg: 'transparent',
          _hover: {
            bg: {
              base: 'green.50',
              _dark: 'green.900'
            },
            borderColor: {
              base: 'green.600',
              _dark: 'green.400'
            },
            color: {
              base: 'green.800', // darken on hover (rest is green.700) — was green.600 (lighter, backwards)
              _dark: 'green.400'
            }
          }
        },
        ghost: {
          bg: 'transparent',
          color: 'green.700', // WCAG AA on white (green.500 failed at 2.78:1)
          _hover: {
            bg: {
              base: 'green.50',
              _dark: 'green.900'
            },
            color: {
              base: 'green.800', // darken on hover (rest is green.700)
              _dark: 'green.400'
            }
          }
        }
      },
      baseStyle: {
        borderRadius: '12px',
        fontWeight: '500',
        _focusVisible: {
          // Visible keyboard focus ring (green.100 #C6F6D5 was too faint to see on white)
          boxShadow: {
            base: '0 0 0 3px rgba(76, 175, 80, 0.6)', // green.500 @ 60%
            _dark: '0 0 0 3px #276749' // green.800
          }
        },
        _disabled: {
          opacity: 0.4,
          cursor: 'not-allowed',
          boxShadow: 'none'
        }
      },
      defaultProps: {
        variant: 'brand',
        size: 'md'
      }
    }
  }
};
