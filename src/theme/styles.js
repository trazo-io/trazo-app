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

export const globalStyles = {
  colors: {
    gray: {
      700: '#1f2733',
      800: '#1a202c',
      900: '#171923'
    },
    teal: {
      500: 'rgb(79, 209, 197)'
    },
    green: {
      500: '#38a169',
      600: '#2f855a'
    },
    blue: {
      500: '#3182ce',
      600: '#2c5282'
    }
  },
  styles: {
    global: (props) => ({
      body: {
        bg:
          typeof document !== 'undefined' && document.documentElement.layout === 'auth'
            ? mode('white', 'gray.800')(props)
            : mode('gray.50', 'gray.800')(props),
        fontFamily:
          "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: mode('gray.800', 'white')(props),
        lineHeight: 'base'
      },
      html: {
        fontFamily:
          "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
      }
      // Removed aggressive global selectors that could override component-specific colors
    })
  }
};
