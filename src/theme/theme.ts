import { badgeStyles } from './components/badge';
import { breakpoints } from './foundations/breakpoints';
import { buttonStyles } from './components/button';
import { drawerStyles } from './components/drawer';
import { extendTheme } from '@chakra-ui/react';
import { globalStyles } from './styles';
import { linkStyles } from './components/link';

export default extendTheme(
  { breakpoints },
  globalStyles,
  buttonStyles,
  badgeStyles,
  linkStyles,
  drawerStyles
);
