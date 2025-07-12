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

const MainPanel = {
  baseStyle: {
    float: 'right',
    maxWidth: '100%',
    overflow: 'auto',
    position: 'relative',
    maxHeight: '100%',
    minHeight: '100vh',
    transition: 'all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)',
    transitionDuration: '.2s, .2s, .35s',
    transitionProperty: 'top, bottom, width, margin-left',
    transitionTimingFunction: 'linear, linear, ease',
    // Ensure proper spacing in production
    '@media screen and (min-width: 1280px)': {
      marginLeft: 'var(--sidebar-width, 275px)',
      width: 'calc(100% - var(--sidebar-width, 275px))'
    }
  },
  variants: {
    main: () => ({
      float: 'right',
      // Ensure proper layout on all screen sizes
      '@media screen and (max-width: 1279px)': {
        marginLeft: 0,
        width: '100%'
      }
    }),
    rtl: () => ({
      float: 'left',
      '@media screen and (max-width: 1279px)': {
        marginRight: 0,
        width: '100%'
      }
    })
  },
  defaultProps: {
    variant: 'main'
  }
};

export const MainPanelComponent = {
  components: {
    MainPanel
  }
};
