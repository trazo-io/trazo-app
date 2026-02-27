// 1. Import the utilities
import { createBreakpoints } from '@chakra-ui/theme-tools';
// 2. Update the breakpoints as key-value pairs
export const breakpoints = createBreakpoints({
  sm: '320px',
  smd: '480px',
  smdd: '550px',
  smddd: '690px',
  md: '768px',
  lg: '960px',
  xl: '1200px',
  xl1: '1400px',
  '2xl': '1600px'
});
