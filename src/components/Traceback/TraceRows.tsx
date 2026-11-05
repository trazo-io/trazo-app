/**
 * Rows split by a hairline, for the traceback's lists: picks, inputs, sales, matches, storage
 * locations (2026-11-04). Each item used to be its own bordered box inside a card, so one trace
 * was a stack of boxes. The same sibling rule StatusList draws (a CSS sibling border, so a row
 * that renders null leaves no rule); gray.200, because the theme's gray.100 is the page canvas
 * and would be invisible on a white card. Give each row `py={3}`.
 */
import React, { ReactNode } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

export const TraceRows = ({ children, testId }: { children: ReactNode; testId?: string }) => {
  const rule = useColorModeValue('gray.200', 'gray.600');
  return (
    <Box data-testid={testId} sx={{ '& > * + *': { borderTopWidth: '1px', borderTopColor: rule } }}>
      {children}
    </Box>
  );
};

export default TraceRows;
