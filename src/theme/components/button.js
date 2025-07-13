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
        // Trazo brand-focused variants using forest green palette
        brand: (props) => ({
          bg: mode('green.500', 'green.500')(props),
          color: 'white',
          _hover: {
            bg: mode('green.600', 'green.400')(props),
            transform: 'translateY(-1px)',
            boxShadow: 'lg'
          },
          _active: {
            bg: mode('green.700', 'green.300')(props),
            transform: 'translateY(0px)'
          }
        }),
        outline: (props) => ({
          border: '1px solid',
          borderColor: mode('green.500', 'green.500')(props),
          color: mode('green.500', 'green.500')(props),
          bg: 'transparent',
          _hover: {
            bg: mode('green.50', 'green.900')(props),
            borderColor: mode('green.600', 'green.400')(props),
            color: mode('green.600', 'green.400')(props)
          }
        }),
        ghost: (props) => ({
          bg: 'transparent',
          color: mode('green.500', 'green.500')(props),
          _hover: {
            bg: mode('green.50', 'green.900')(props),
            color: mode('green.600', 'green.400')(props)
          }
        })
      },
      baseStyle: (props) => ({
        borderRadius: '12px',
        fontWeight: '500',
        _focus: {
          boxShadow: `0 0 0 3px ${mode('green.100', 'green.800')(props)}`
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
