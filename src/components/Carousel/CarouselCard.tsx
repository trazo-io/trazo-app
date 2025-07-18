// Chakra imports
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Flex,
  Image,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import { S3Image } from 'components/Design';

import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import Shimmer from 'components/Shimmer/Shimmer';
import Card from 'components/Card/Card';

type CarouselCardProps = {
  id: number;
  image: string;
  name: string;
  category: string;
  buttonText: string;
  avatars: string[];
  presignedUrl?: string | null;
};

const CarouselCard = ({ id, image, name, category, buttonText, avatars, presignedUrl }: CarouselCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  // Chakra color mode
  const textColor = useColorModeValue('gray.700', 'white');

  const { establishmentId } = useParams();
  const navigate = useNavigate();

  return (
    <Card 
      p="16px" 
      w={{ sm: '290px', md: '300px' }} 
      minH="300px"
      className="trazo-card"
    >
      <Flex direction="column" h="100%">
        <Box
          w="100%"
          h={{ sm: '190px', md: '200px' }}
          mb="20px"
          position="relative"
          borderRadius="15px"
          overflow="hidden"
        >
          <S3Image
            width="100%"
            height="100%"
            objectFit="cover"
            src={image}
            alt={`${name} parcel`}
            borderRadius="15px"
            fallbackSrc="/images/parcel-placeholder.jpg"
            onLoad={() => setImageLoaded(true)}
            presignedUrl={presignedUrl}
          />
          <Box
            w="100%"
            h="100%"
            position="absolute"
            top="0"
            bg="linear-gradient(360deg, rgba(49, 56, 96, 0.16) 0%, rgba(21, 25, 40, 0.28) 100%)"
            borderRadius="15px"
          ></Box>
        </Box>
        <Flex direction="column" flex="1">
          <Text fontSize="md" color="gray.500" fontWeight="600" mb="10px">
            {name}
          </Text>
          <Text fontSize="lg" color={textColor} fontWeight="bold" mb="10px">
            {category}
          </Text>
          <Flex justifyContent="space-between" mt="auto">
            <Button
              variant="outline"
              colorScheme="green"
              minW="110px"
              h="40px"
              fontSize="sm"
              fontWeight="500"
              px="1.5rem"
              borderRadius="lg"
              onClick={() => {
                navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${id}`, {
                  replace: true
                });
              }}
            >
              {buttonText}
            </Button>
            <AvatarGroup size="xs">
              {avatars?.map((el, idx) => {
                return <Avatar src={el} key={idx} />;
              })}
            </AvatarGroup>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

export default CarouselCard;
