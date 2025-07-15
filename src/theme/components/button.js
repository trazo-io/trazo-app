/*!

=========================================================
* Purity UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/purity-ui-dashboard-pro
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)

* Design by Creative Tim & Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Removed mode import to fix staging deployment issues

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
          color: 'green.500',
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
              base: 'green.600',
              _dark: 'green.400'
            }
          }
        },
        ghost: {
          bg: 'transparent',
          color: 'green.500',
          _hover: {
            bg: {
              base: 'green.50',
              _dark: 'green.900'
            },
            color: {
              base: 'green.600',
              _dark: 'green.400'
            }
          }
        }
      },
      baseStyle: {
        borderRadius: '12px',
        fontWeight: '500',
        _focus: {
          boxShadow: {
            base: '0 0 0 3px #C6F6D5', // green.100
            _dark: '0 0 0 3px #276749'  // green.800
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
