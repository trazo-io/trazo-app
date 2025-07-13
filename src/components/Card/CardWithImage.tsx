// Chakra imports
import { Button, Flex, Icon, Spacer, Text, useColorModeValue, Box } from '@chakra-ui/react';
import React, { useState } from 'react';

import { BsArrowRight } from 'react-icons/bs';
// Custom components
import Card from './Card';
import CardBody from './CardBody';
import CardHeader from './CardHeader';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import Shimmer from 'components/Shimmer/Shimmer';

type CardWithImageProps = {
  title: string;
  name: string;
  image: HTMLImageElement;
  readMoreLink: string;
  // Style props that should be forwarded to the Card component
  borderLeft?: string;
  borderColor?: string;
  boxShadow?: string;
  bgGradient?: string;
  _hover?: any;
  // Add other common Card props as needed
  description?: string;
  state?: string;
  city?: string;
  zone?: string;
};

const CardWithImage = ({ 
  title, 
  name, 
  image, 
  readMoreLink, 
  borderLeft,
  borderColor,
  boxShadow,
  bgGradient,
  _hover,
  description,
  state,
  city,
  zone,
  ...rest
}: CardWithImageProps) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [imageLoaded, setImageLoaded] = useState(false);

  const textColor = useColorModeValue('gray.700', 'white');

  return (
    <Card 
      maxHeight={'290.5px'}
      height={{ sm: '290.5px', lg: '290.5px' }} 
      p="0"
      overflow="hidden"
      {...rest}
    >
      <Flex direction="row" h="100%" w="100%">
        <Flex direction="column" p="16px" width={{ base: '100%', lg: '45%' }}>
          <Box mb={4}>
            <Text fontSize="lg" color={textColor} fontWeight="bold">
              {title}
            </Text>
            <Text fontSize="sm" color="gray.500" fontWeight="400">
              {name}
            </Text>
          </Box>
          <Spacer />
          <Flex align="center">
              <Button
                p="0px"
                variant="no-hover"
                bg="transparent"
                my={{ sm: '1.5rem', lg: '0px' }}
                onClick={() => navigate(readMoreLink)}
              >
                <Text
                  fontSize="sm"
                  color={textColor}
                  fontWeight="bold"
                  cursor="pointer"
                  transition="all .5s ease"
                  my={{ sm: '1.5rem', lg: '0px' }}
                  _hover={{ me: '4px' }}
                >
                  {intl.formatMessage({ id: 'app.readMore' })}
                </Text>
                <Icon
                  as={BsArrowRight}
                  w="20px"
                  h="20px"
                  fontSize="2xl"
                  transition="all .5s ease"
                  mx=".3rem"
                  cursor="pointer"
                  pt="4px"
                  _hover={{ transform: 'translateX(20%)' }}
                />
              </Button>
          </Flex>
        </Flex>
        <Box
          position="relative"
          width={{ base: '0', lg: '55%' }}
          height="100%"
          overflow="hidden"
        >
            {!imageLoaded && <Shimmer />}
            <Box
              position={!imageLoaded ? 'absolute' : 'relative'}
              top="0"
              left="0"
              width="100%"
              height="100%"
              opacity={imageLoaded ? 1 : 0}
              transition="opacity 0.3s ease-in-out"
            >
              {React.cloneElement(image as React.ReactElement, {
                onLoad: () => setImageLoaded(true)
              })}
            </Box>
        </Box>
      </Flex>
    </Card>
  );
};

export default CardWithImage;
