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

import { cardAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(cardAnatomy.keys);

const baseStyle = definePartsStyle({
  container: {
    p: '22px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
    minWidth: '0px',
    wordWrap: 'break-word',
    bg: { base: 'white', _dark: 'gray.700' },
    boxShadow: '0px 3.5px 5.5px rgba(0, 0, 0, 0.02)',
    borderRadius: '15px',
    backgroundClip: 'border-box',
  },
  header: {
    display: 'flex',
    width: '100%',
  },
  body: {
    display: 'flex',
    width: '100%',
    backgroundColor: 'transparent',
  },
  footer: {
    display: 'flex',
    width: '100%',
  },
});

export const cardTheme = defineMultiStyleConfig({
  baseStyle,
  defaultProps: {},
});
