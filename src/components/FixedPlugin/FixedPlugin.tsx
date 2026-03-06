// Chakra Imports
import { Button, useColorModeValue } from '@chakra-ui/react';

import { SettingsIcon } from 'components/Icons/Icons';
import { useRef } from 'react';

type FixedPluginTypes = {
  secondary: boolean;
  onChange: () => void;
  onOpen: () => void;
  onSwitch: () => void;
  fixed: boolean;
};

function FixedPlugin(props: FixedPluginTypes) {
  const { secondary, onChange, onSwitch, fixed, onOpen, ...rest } = props;
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
