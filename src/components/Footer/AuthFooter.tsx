import { Box, Flex, HStack, Text, useColorModeValue } from '@chakra-ui/react';

const LANDING_URL = 'https://trazo.io';

export default function AuthFooter() {
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const subtleColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Box
      as="footer"
      bg={useColorModeValue('gray.50', 'gray.900')}
      borderTop="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      py={6}
      px={8}
    >
      <Flex
        maxW="7xl"
        mx="auto"
        direction={{ base: 'column', md: 'row' }}
        align="center"
        justify="space-between"
        gap={4}
      >
        <HStack spacing={6} flexWrap="wrap" justify="center">
          <a href={`${LANDING_URL}/privacy-policy`} target="_blank" rel="noopener noreferrer">
            <Text
              fontSize="sm"
              color={textColor}
              _hover={{ color: 'green.500' }}
              transition="color 0.2s"
            >
              Privacy
            </Text>
          </a>
          <a href={`${LANDING_URL}/terms-conditions`} target="_blank" rel="noopener noreferrer">
            <Text
              fontSize="sm"
              color={textColor}
              _hover={{ color: 'green.500' }}
              transition="color 0.2s"
            >
              Terms
            </Text>
          </a>
          <a href={LANDING_URL} target="_blank" rel="noopener noreferrer">
            <Text
              fontSize="sm"
              color={textColor}
              _hover={{ color: 'green.500' }}
              transition="color 0.2s"
            >
              About
            </Text>
          </a>
          <a href={`${LANDING_URL}/contact`} target="_blank" rel="noopener noreferrer">
            <Text
              fontSize="sm"
              color={textColor}
              _hover={{ color: 'green.500' }}
              transition="color 0.2s"
            >
              Contact
            </Text>
          </a>
        </HStack>

        <Text fontSize="xs" color={subtleColor}>
          &copy; {new Date().getFullYear()} Trazo. Agricultural Transparency Platform.
        </Text>
      </Flex>
    </Box>
  );
}
