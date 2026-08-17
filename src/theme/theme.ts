import { badgeStyles } from './components/badge';
import { breakpoints } from './foundations/breakpoints';
import { buttonStyles } from './components/button';
import { checkboxStyles } from './components/checkbox';
import { drawerStyles } from './components/drawer';
import { extendTheme } from '@chakra-ui/react';
import { globalStyles } from './styles';
import { linkStyles } from './components/link';
import { progressStyles } from './components/progress';

export default extendTheme(
  { breakpoints },
  globalStyles,
  buttonStyles,
  badgeStyles,
  linkStyles,
  drawerStyles,
  progressStyles,
  checkboxStyles
);
