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
      300: '#81e6d9',
      400: '#4fd1c5',
      500: 'rgb(79, 209, 197)', // Primary brand color
      600: '#319795',
      700: '#2c7a7b'
    },
    green: {
      400: '#68d391',
      500: '#48bb78',
      600: '#38a169'
    },
    blue: {
      400: '#63b3ed',
      500: '#4299e1',
      600: '#3182ce'
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
        color: mode('gray.700', 'white')(props),
        lineHeight: 'base'
      },
      html: {
        fontFamily:
          "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
      },
      // Restore original global styles with teal focus
      '*': {
        boxSizing: 'border-box'
      },
      a: {
        color: mode('teal.500', 'teal.300')(props),
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
          color: mode('teal.600', 'teal.200')(props)
        }
      }
    })
  }
};
