// Chakra Imports
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  Flex,
  FormControl,
  Icon,
  Select,
  Text
} from '@chakra-ui/react';
import { useContext, useRef } from 'react';
import { FiNavigation } from 'react-icons/fi';

import { HSeparator } from 'components/Separator/Separator';
import { LocaleContext } from 'i18n/LocaleContext';
import { locales } from 'i18n/i18n-config';
import { useIntl } from 'react-intl';
import { useTourStore } from 'store/tourStore';

type ConfiguratorProps = {
  secondary: boolean;
  isOpen: boolean;
  onClose: () => void;
  fixed: boolean;
};

function Configurator(props: ConfiguratorProps) {
  const intl = useIntl();
  const { secondary, isOpen, onClose, fixed, ...rest } = props;
  const { locale, setLocale } = useContext(LocaleContext);
  const resetAllTours = useTourStore((s) => s.resetAllTours);

  const settingsRef = useRef(null);

  const handleRestartTour = () => {
    resetAllTours();
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement={'right'}
      finalFocusRef={settingsRef}
      blockScrollOnMount={false}
    >
      <DrawerContent>
        <DrawerHeader pt="24px" px="24px">
          <DrawerCloseButton />
          <Text fontSize="xl" fontWeight="bold" mt="16px">
            {intl.formatMessage({ id: 'app.profileSettings' })}
          </Text>
          <Text fontSize="md" mb="16px">
            {intl.formatMessage({ id: 'app.configureSettings' })}
          </Text>
          <HSeparator />
        </DrawerHeader>
        <DrawerBody w="340px" ps="24px" pe="40px">
          <Flex flexDirection="column">
            {/* Product Tour */}
            <Flex justifyContent="space-between" alignItems="center" mb="24px">
              <Flex direction="column">
                <Text fontSize="md" fontWeight="600" mb="4px">
                  {intl.formatMessage({ id: 'app.productTour' })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'app.productTourDescription' })}
                </Text>
              </Flex>
              <Button
                size="sm"
                variant="outline"
                colorScheme="green"
                leftIcon={<Icon as={FiNavigation} />}
                onClick={handleRestartTour}
                ml={4}
                flexShrink={0}
              >
                {intl.formatMessage({ id: 'app.restartTour' })}
              </Button>
            </Flex>
            <HSeparator mb="24px" />
            {/* Language */}
            <Flex justifyContent="space-between" alignItems="center" mb="24px">
              <Text fontSize="md" fontWeight="600" mb="4px">
                {intl.formatMessage({ id: 'app.language' })}
              </Text>
              <FormControl paddingLeft={'24px'}>
                <Select
                  borderRadius="15px"
                  color="gray.600"
                  fontSize="xs"
                  onChange={(e) => setLocale(e.target.value)}
                  value={locale}
                >
                  {Object.keys(locales).map((loc) => {
                    return (
                      <option value={loc} key={loc}>
                        {locales[loc].name}
                      </option>
                    );
                  })}
                </Select>
              </FormControl>
            </Flex>
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export default Configurator;
