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

  const { isOpen: isOpen1, onOpen: onOpen1, onClose: onClose1 } = useDisclosure();

  return (
    <Tr
      _hover={{ bg: 'gray.50' }}
      transition="all 0.2s"
      borderBottom="1px solid"
      borderColor="gray.100"
    >
      <Td py={5} px={6}>
        <Text color={textColor} fontSize="md" fontWeight="semibold">
          {name}
        </Text>
      </Td>
      <Td py={5} px={6}>
        <HStack spacing={2} flexWrap="wrap">
          {establishments?.length > 0 ? (
            establishments.map((establishment, index) => (
              <Badge
                key={index}
                px={3}
                py={1.5}
                borderRadius="full"
                bg="green.50"
                color="green.700"
                fontSize="xs"
                fontWeight="medium"
                border="1px solid"
                borderColor="green.200"
              >
                {establishment}
              </Badge>
            ))
          ) : (
            <Badge
              px={3}
              py={1.5}
              borderRadius="full"
              bg="gray.50"
              color="gray.500"
              fontSize="xs"
              fontWeight="medium"
              border="1px solid"
              borderColor="gray.200"
            >
              Sin establecimientos
            </Badge>
          )}
        </HStack>
      </Td>
      <Td py={5} px={6}>
        <Badge
          px={4}
          py={1.5}
          borderRadius="full"
          bg="blue.50"
          color="blue.700"
          fontSize="xs"
          fontWeight="semibold"
          border="1px solid"
          borderColor="blue.200"
          textTransform="capitalize"
        >
          {role}
        </Badge>
      </Td>
      <Td py={5} px={6}>
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
            <MenuItem onClick={() => {}} _hover={{ bg: 'red.50' }} borderRadius="lg" mx={2}>
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
