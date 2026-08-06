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
      >
        <SettingsIcon cursor="pointer" ref={settingsRef} color={navbarIcon} w="20px" h="20px" />
      </Button>
    </>
  );
}

export default FixedPlugin;
