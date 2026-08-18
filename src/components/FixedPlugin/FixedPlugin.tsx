// Chakra Imports
import { Button, useColorModeValue } from '@chakra-ui/react';

import { SettingsIcon } from 'components/Icons/Icons';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

// Only `onOpen` and `fixed` are ever passed (layouts/Admin.tsx). The other three were declared
// required, so the single call site has always been a type error; they are also destructured below
// and never used. Marked optional to match reality rather than deleting them, since `Configurator`
// still takes the same shape.
type FixedPluginTypes = {
  secondary?: boolean;
  onChange?: () => void;
  onOpen: () => void;
  onSwitch?: () => void;
  fixed: boolean;
};

/**
 * ⚠️ DESKTOP ONLY — and it is a duplicate control, not the only one.
 *
 * `AdminNavbarLinks.tsx` already renders a `SettingsIcon` button wired to this exact same
 * `onOpen` (layouts/Admin.tsx passes one `onOpen` to both), so the drawer this opens is
 * reachable from the top bar at every breakpoint. This 52px puck is a second door to the
 * same room.
 *
 * It carried no breakpoint guard, so on a phone it planted itself over the page content at
 * `right: 35px / bottom: 30px` with `zIndex: 99` — measured 2026-08-17 sitting on top of a
 * document card's Download button on `/documents`, i.e. covering a real 44px touch target,
 * not merely looking untidy. Hidden below `md`; nothing is lost, because the navbar gear is
 * the same button.
 */
function FixedPlugin(props: FixedPluginTypes) {
  const intl = useIntl();
  const { onOpen } = props;
  // Chakra Color Mode
  let navbarIcon = useColorModeValue('gray.500', 'gray.200');
  let bgButton = useColorModeValue('white', 'gray.600');

  const settingsRef = useRef(null);

  return (
    <>
      <Button
        h="52px"
        w="52px"
        onClick={onOpen}
        // Icon-only button: without an accessible name a screen reader announces just "button".
        // It opens the settings drawer (product tour + language), so say that.
        aria-label={intl.formatMessage({ id: 'app.profileSettings' })}
        bg={bgButton}
        position="fixed"
        variant="no-hover"
        left={''}
        right={'35px'}
        bottom="30px"
        borderRadius="50px"
        boxShadow="0 2px 12px 0 rgb(0 0 0 / 16%)"
        zIndex={99}
        display={{ base: 'none', md: 'inline-flex' }}>
        <SettingsIcon cursor="pointer" ref={settingsRef} color={navbarIcon} w="20px" h="20px" />
      </Button>
    </>
  );
}

export default FixedPlugin;
