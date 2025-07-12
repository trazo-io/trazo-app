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
      // 3. We can add a new visual variant
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
        }
        // Removed custom solid and ghost variants that could override existing styles
      },
      baseStyle: (props) => ({
        borderRadius: '12px',
        _focus: {
          boxShadow: 'none'
        },
        // Only add color fallback if not already defined
        _disabled: {
          opacity: 0.4,
          cursor: 'not-allowed',
          boxShadow: 'none'
        }
      })
    }
  }
};
