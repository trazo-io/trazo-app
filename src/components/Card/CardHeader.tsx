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

import { Box, useStyles } from '@chakra-ui/react';

import { SystemProps } from '@chakra-ui/react';

interface CardHeaderProps extends SystemProps {
  children?: React.ReactNode;
}

function CardHeader(props: CardHeaderProps) {
  const { children, ...rest } = props;
  const styles = useStyles();
  return (
    <Box __css={styles.header} {...rest}>
      {children}
    </Box>
  );
}

export default CardHeader;
