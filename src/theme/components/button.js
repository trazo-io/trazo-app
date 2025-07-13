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
        // Restore original teal-focused variants
        brand: (props) => ({
          bg: mode('teal.500', 'teal.300')(props),
          color: 'white',
          _hover: {
            bg: mode('teal.600', 'teal.200')(props),
            transform: 'translateY(-1px)',
            boxShadow: 'lg'
          },
          _active: {
            bg: mode('teal.700', 'teal.100')(props),
            transform: 'translateY(0px)'
          }
        }),
        outline: (props) => ({
          border: '1px solid',
          borderColor: mode('teal.500', 'teal.300')(props),
          color: mode('teal.500', 'teal.300')(props),
          bg: 'transparent',
          _hover: {
            bg: mode('teal.50', 'teal.900')(props),
            borderColor: mode('teal.600', 'teal.200')(props),
            color: mode('teal.600', 'teal.200')(props)
          }
        }),
        ghost: (props) => ({
          bg: 'transparent',
          color: mode('teal.500', 'teal.300')(props),
          _hover: {
            bg: mode('teal.50', 'teal.900')(props),
            color: mode('teal.600', 'teal.200')(props)
          }
        })
      },
      baseStyle: (props) => ({
        borderRadius: '12px',
        fontWeight: '500',
        _focus: {
          boxShadow: `0 0 0 3px ${mode('teal.100', 'teal.800')(props)}`
        },
        _disabled: {
          opacity: 0.4,
          cursor: 'not-allowed',
          boxShadow: 'none'
        }
      }),
      defaultProps: {
        variant: 'brand',
        size: 'md'
      }
    }
  }
};
