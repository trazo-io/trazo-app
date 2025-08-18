// Chakra imports
import { 
  Box, 
  Button, 
  Flex, 
  Icon, 
  Text, 
  VStack, 
  useColorModeValue,
  Badge
} from '@chakra-ui/react';

// react icons
import { BsArrowRight } from 'react-icons/bs';
import { FaLeaf, FaQrcode, FaShieldAlt } from 'react-icons/fa';
// Custom components
import Card from 'components/Card/Card';
import React from 'react';
import { useIntl } from 'react-intl';

const CardWithBackground = ({ title, description, backgroundImage }) => {
  const intl = useIntl();
  
  // Trazo's clean color scheme
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'white');
  const subtitleColor = useColorModeValue('gray.500', 'gray.300');
  const accentColor = useColorModeValue('green.500', 'green.400');
  const iconBg = useColorModeValue('green.50', 'green.900');
  const badgeBg = useColorModeValue('green.100', 'green.800');
  
  return (
    <Card 
      h="290px" 
      p={6}
      bg={cardBg}
      borderRadius="15px"
      boxShadow="0px 3.5px 5.5px rgba(0, 0, 0, 0.02)"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease'
      }}
      transition="all 0.2s ease"
      className="trazo-card">
      <VStack spacing={4} align="stretch" h="full">
        {/* Header with icon */}
        <Flex align="center" gap={3}>
          <Box
            bg={iconBg}
            p={3}
            borderRadius="lg"
            flexShrink={0}>
            <Icon 
              as={FaLeaf}
              w="24px"
              h="24px"
              color={accentColor}
            />
          </Box>
          <Box flex="1">
            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              fontWeight="700"
              color={textColor}
              lineHeight="1.3"
              noOfLines={2}>
              {title}
            </Text>
          </Box>
        </Flex>

        {/* Key benefits - mission-aligned transparency focus */}
        <VStack spacing={3} align="stretch" flex="1">
          <Flex align="center" gap={2}>
            <Icon as={FaQrcode} color={accentColor} fontSize="sm" />
            <Text 
              fontSize={{ base: 'sm', md: 'sm' }}
              color={textColor}
              fontWeight="500">
              Share verified carbon data with consumers
            </Text>
          </Flex>
          
          <Flex align="center" gap={2}>
            <Icon as={FaShieldAlt} color={accentColor} fontSize="sm" />
            <Text 
              fontSize={{ base: 'sm', md: 'sm' }}
              color={textColor}
              fontWeight="500">
              USDA-verified calculations & blockchain trust
            </Text>
          </Flex>
          
          <Badge 
            colorScheme="green" 
            fontSize="xs" 
            px={3} 
            py={1} 
            borderRadius="full"
            bg={badgeBg}
            color={accentColor}
            fontWeight="600"
            alignSelf="flex-start">
            Build consumer trust through transparency
          </Badge>
        </VStack>

        {/* CTA button */}
        <Flex justify="flex-start" pt={2}>
          <Button
            variant="ghost"
            size="sm"
            fontSize="sm"
            color={accentColor}
            fontWeight="600"
            px={0}
            _hover={{
              transform: 'translateX(4px)',
              bg: 'transparent'
            }}
            transition="all 0.3s ease">
            {intl.formatMessage({ id: 'app.readMore' })}
            <Icon
              as={BsArrowRight}
              w="16px"
              h="16px"
              ml={2}
              transition="all 0.3s ease"
              _hover={{ transform: 'translateX(20%)' }}
            />
          </Button>
        </Flex>
      </VStack>
    </Card>
  );
};

export default CardWithBackground;
