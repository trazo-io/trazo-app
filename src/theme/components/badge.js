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
      baseStyle: (props) => ({
        textTransform: 'capitalize',
        // Only add minimal fallback styles for production
        borderRadius: '6px'
      })
      // Removed custom variants that could override existing badge styles
    }
  }
};
