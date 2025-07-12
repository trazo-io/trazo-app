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

const Card = {
  baseStyle: (props: any) => ({
    p: '22px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
    minWidth: '0px',
    wordWrap: 'break-word',
    backgroundClip: 'border-box',
    bg: mode('white', 'gray.700')(props),
    boxShadow: '0px 3.5px 5.5px rgba(0, 0, 0, 0.02)',
    borderRadius: '15px'
  }),
  defaultProps: {
    variant: 'panel'
  }
};

export const CardComponent = {
  components: {
    Card
  }
};
