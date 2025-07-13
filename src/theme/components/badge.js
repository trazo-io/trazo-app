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

export const badgeStyles = {
  components: {
    Badge: {
      sizes: {
        md: {
          width: '65px',
          height: '25px'
        }
      },
      variants: {
        // Trazo brand-focused variants using forest green palette
        brand: (props) => ({
          bg: mode('green.500', 'green.500')(props),
          color: 'white',
          fontSize: 'xs',
          fontWeight: '600'
        }),
        outline: (props) => ({
          border: '1px solid',
          borderColor: mode('green.500', 'green.500')(props),
          color: mode('green.500', 'green.500')(props),
          bg: 'transparent',
          fontSize: 'xs',
          fontWeight: '600'
        }),
        subtle: (props) => ({
          bg: mode('green.50', 'green.900')(props),
          color: mode('green.700', 'green.200')(props),
          fontSize: 'xs',
          fontWeight: '600'
        })
      },
      baseStyle: (props) => ({
        textTransform: 'capitalize',
        borderRadius: '6px',
        px: 2,
        py: 1,
        fontSize: 'xs',
        fontWeight: '500'
      }),
      defaultProps: {
        variant: 'brand',
        size: 'md'
      }
    }
  }
};
