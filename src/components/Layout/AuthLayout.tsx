import React from 'react';
import { Box, Flex, Text, VStack, HStack, Grid, Container } from '@chakra-ui/react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  features?: string[];
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  features = ['USDA Certified Data', 'Blockchain Secured', 'Enterprise Ready'],
  children
}) => {
  return (
    <Grid
      templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
      minH="calc(100vh - 80px)"
      maxH="calc(100vh - 80px)"
      overflow="hidden"
    >
      {/* Left Side - Professional Carbon Intelligence */}
      <Flex
        direction="column"
        justify="center"
        align="center"
        bg="linear-gradient(135deg, #059669 0%, #047857 100%)"
        px={{ base: 6, md: 8, lg: 12 }}
        py={12}
      >
        <Container maxW="400px" textAlign="center">
          <VStack spacing={8}>
            <Text
              fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
              fontWeight="700"
              color="white"
              lineHeight="1.2"
            >
              {title}
            </Text>
            <Text fontSize="lg" color="green.50" lineHeight="1.6" maxW="350px">
              {subtitle}
            </Text>

            {/* Features list */}
            <VStack spacing={3} align="flex-start" w="full" maxW="320px">
              {features.map((feature, index) => (
                <HStack spacing={3} key={index}>
                  <Box w="6px" h="6px" bg="green.300" borderRadius="full" />
                  <Text fontSize="sm" color="green.100" fontWeight="500">
                    {feature}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Container>
      </Flex>

      {/* Right Side - Form Content */}
      <Flex
        direction="column"
        justify="center"
        align="center"
        bg="white"
        px={{ base: 6, md: 8, lg: 12 }}
        py={12}
      >
        <Container maxW="400px">{children}</Container>
      </Flex>
    </Grid>
  );
};

export default AuthLayout;
