// Chakra imports
import {
  Badge,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Td,
  Text,
  Tr,
  useColorModeValue,
  useDisclosure,
  HStack
} from '@chakra-ui/react';

import { IoEllipsisVerticalSharp } from 'react-icons/io5';
import { useIntl } from 'react-intl';

interface MemberRowProps {
  name: string;
  establishments: string[];
  role: string;
}

const MemberRow = (props: MemberRowProps) => {
  const intl = useIntl();
  const { name, establishments, role } = props;
  const textColor = useColorModeValue('gray.700', 'white');

  const roleNameMap: Record<string, string> = {
    'Company Admin': intl.formatMessage({ id: 'app.administrator' }),
    'Farm Manager': intl.formatMessage({ id: 'app.farmManager' }),
    'Viewer': intl.formatMessage({ id: 'app.viewerRole' })
  };
  const displayRole = roleNameMap[role] || role;

  const { isOpen: isOpen1, onOpen: onOpen1, onClose: onClose1 } = useDisclosure();

  return (
    <Tr
      _hover={{ bg: 'gray.50' }}
      transition="all 0.2s"
      borderBottom="1px solid"
      borderColor="gray.100"
    >
      <Td py={{ base: 3, md: 5 }} px={{ base: 3, md: 6 }}>
        <Text color={textColor} fontSize={{ base: 'xs', md: 'md' }} fontWeight="semibold" whiteSpace="nowrap">
          {name}
        </Text>
      </Td>
      <Td py={{ base: 3, md: 5 }} px={{ base: 3, md: 6 }}>
        <HStack spacing={2} flexWrap="nowrap">
          {establishments?.length > 0 ? (
            establishments.map((establishment, index) => (
              <Badge
                key={index}
                px={{ base: 2, md: 3 }}
                justifyContent="center"
                alignItems="center"
                py={1}
                borderRadius="full"
                bg="green.50"
                color="green.700"
                fontSize="xs"
                fontWeight="medium"
                border="1px solid"
                w="fit-content"
                borderColor="green.200"
                whiteSpace="nowrap"
              >
                {establishment}
              </Badge>
            ))
          ) : (
            <Badge
              px={{ base: 2, md: 3 }}
              py={1}
              w="fit-content"
              borderRadius="full"
              bg="gray.50"
              color="gray.500"
              fontSize="xs"
              fontWeight="medium"
              border="1px solid"
              borderColor="gray.200"
              whiteSpace="nowrap"
            >
              {intl.formatMessage({ id: 'app.noEstablishmentsAssigned' })}
            </Badge>
          )}
        </HStack>
      </Td>
      <Td py={{ base: 3, md: 5 }} px={{ base: 3, md: 6 }}>
        <Badge
          w="fit-content"
          px={{ base: 2, md: 4 }}
          py={1}
          borderRadius="full"
          bg="gray.100"
          color="gray.700"
          fontSize="xs"
          fontWeight="semibold"
          border="1px solid"
          borderColor="gray.200"
          textTransform="capitalize"
          whiteSpace="nowrap"
        >
          {displayRole}
        </Badge>
      </Td>
      <Td py={{ base: 3, md: 5 }} px={{ base: 3, md: 6 }}>
        <Menu isOpen={isOpen1} onClose={onClose1}>
          <MenuButton
            onClick={onOpen1}
            as="button"
            p={2}
            borderRadius="lg"
            border="1px solid"
            borderColor="transparent"
            _hover={{
              bg: 'gray.100',
              borderColor: 'gray.200'
            }}
            _active={{
              bg: 'gray.200',
              borderColor: 'gray.300'
            }}
            transition="all 0.2s"
          >
            <Icon as={IoEllipsisVerticalSharp} color="gray.600" w="18px" h="18px" />
          </MenuButton>
          <MenuList
            borderRadius="xl"
            boxShadow="lg"
            border="1px solid"
            borderColor="gray.100"
            py={2}
          >
            <MenuItem
              py={3}
              onClick={() => {}}
              _hover={{ bg: 'green.50' }}
              borderRadius="lg"
              mx={2}
              mb={1}
            >
              <Flex color={textColor} cursor="pointer" align="center">
                <Text fontSize="sm" fontWeight="medium">
                  {intl.formatMessage({ id: 'app.edit' })}
                </Text>
              </Flex>
            </MenuItem>
            <MenuItem py={3} onClick={() => {}} _hover={{ bg: 'red.50' }} borderRadius="lg" mx={2}>
              <Flex color="red.500" cursor="pointer" align="center">
                <Text fontSize="sm" fontWeight="medium">
                  {intl.formatMessage({ id: 'app.delete' })}
                </Text>
              </Flex>
            </MenuItem>
          </MenuList>
        </Menu>
      </Td>
    </Tr>
  );
};

export default MemberRow;
