// Chakra imports
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  useBreakpointValue,
  Badge,
  HStack,
  Icon,
  Skeleton
} from '@chakra-ui/react';
import { S3Image } from 'components/Design';

import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import Card from 'components/Card/Card';
import { FiMapPin } from 'react-icons/fi';
import { BsArrowRight } from 'react-icons/bs';

type CarouselCardProps = {
  id: number;
  image: string;
  name: string;
  category: string;
  buttonText: string;
  avatars: string[];
  presignedUrl?: string;
};

const CarouselCard = ({
  id,
  image,
  name,
  category,
  buttonText,
  avatars,
  presignedUrl
}: CarouselCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Chakra color mode
  const textColor = useColorModeValue('gray.900', 'white');
  const secondaryText = useColorModeValue('gray.600', 'gray.300');
  const tertiaryText = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const hoverBorderColor = useColorModeValue('green.200', 'green.700');
  const surfaceBg = useColorModeValue('white', 'gray.800');
  const isMobile = useBreakpointValue({ base: true, md: false });

  const { establishmentId } = useParams();
  const navigate = useNavigate();

  // Check if we should show placeholder - handle localhost URLs that don't need presigning
  const isLocalhost =
    image?.includes('localhost') || image?.startsWith('http://') || image?.startsWith('https://');
  const isValidImage = image && !image.includes('BgMusicCard');
  const shouldShowPlaceholder = !isValidImage || (!isLocalhost && !presignedUrl);

  // Debug logging to help identify image display issues
  console.log(`🖼️ [CarouselCard] Image analysis for ${name}:`, {
    image,
    isLocalhost,
    isValidImage,
    presignedUrl,
    shouldShowPlaceholder
  });

  return (
    <Card
      p={0}
      w={{ base: '290px', sm: '300px', md: '310px' }}
      minW={{ base: '290px', sm: '300px', md: '310px' }}
      maxW={{ base: '290px', sm: '300px', md: '310px' }}
      minH={{ base: '380px', md: '360px' }}
      h={{ base: '380px', md: '360px' }}
      className="trazo-card"
      cursor="pointer"
      flexShrink={0}
      overflow="hidden"
      bg={surfaceBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="20px"
      position="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
        borderColor: hoverBorderColor,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${id}`)}
    >
      <Flex direction="column" h="100%">
        {/* Modern 4:3 aspect ratio image section */}
        <Box w="100%" h="180px" position="relative" overflow="hidden" borderTopRadius="20px">
          {!imageLoaded && !shouldShowPlaceholder && (
            <Skeleton
              w="100%"
              h="100%"
              startColor="gray.100"
              endColor="gray.200"
              borderTopRadius="20px"
            />
          )}

          {/* Simple placeholder or actual image */}
          {shouldShowPlaceholder ? (
            <Box
              w="100%"
              h="100%"
              bg="gray.50"
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="relative"
              borderBottom="1px solid"
              borderColor="gray.100"
              borderTopRadius="20px"
            >
              <Text fontSize="sm" color="gray.400" fontWeight="500" textAlign="center">
                No Image
              </Text>
            </Box>
          ) : (
            <S3Image
              width="100%"
              height="100%"
              objectFit="cover"
              src={image}
              alt={`${name} parcel`}
              fallbackSrc="/images/parcel-placeholder.jpg"
              onLoad={() => setImageLoaded(true)}
              presignedUrl={presignedUrl}
              lazy={false}
              style={{
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px'
              }}
            />
          )}

          {/* Modern gradient overlay for real images only */}
          {!shouldShowPlaceholder && (
            <Box
              w="100%"
              h="100%"
              position="absolute"
              top="0"
              bgGradient="linear(to-b, blackAlpha.0, blackAlpha.200)"
            />
          )}
        </Box>

        {/* Modern content section with better hierarchy */}
        <Flex direction="column" flex="1" p="20px">
          {/* Product/Category name - primary emphasis with proper sizing */}
          <Text
            fontSize="lg"
            color={textColor}
            fontWeight="700"
            mb="4px"
            letterSpacing="-0.01em"
            lineHeight="1.3"
            noOfLines={2}
            minH="48px"
          >
            {category}
          </Text>

          {/* Parcel location/name with icon */}
          <HStack spacing={1} mb="16px">
            <Icon as={FiMapPin} boxSize="12px" color={tertiaryText} />
            <Text
              fontSize="xs"
              color={tertiaryText}
              fontWeight="500"
              textTransform="uppercase"
              letterSpacing="0.05em"
              noOfLines={1}
            >
              {name}
            </Text>
          </HStack>

          <Flex justifyContent="space-between" mt="auto" align="center">
            {/* Trazo standard button design - matching CardWithImage pattern */}
            <Button
              p="0px"
              variant="no-hover"
              bg="transparent"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${id}`);
              }}
            >
              <Text
                fontSize="sm"
                color="green.600"
                fontWeight="bold"
                cursor="pointer"
                transition="all .5s ease"
                _hover={{ me: '4px' }}
              >
                {buttonText || 'VIEW PARCEL'}
              </Text>
              <Icon
                as={BsArrowRight}
                w="20px"
                h="20px"
                fontSize="2xl"
                color="green.600"
                transition="all .5s ease"
                mx=".3rem"
                cursor="pointer"
                pt="4px"
                _hover={{ transform: 'translateX(20%)' }}
              />
            </Button>

            {/* Team avatars with improved spacing */}
            {avatars && avatars.length > 0 && (
              <AvatarGroup size="sm" max={3} spacing="-8px">
                {avatars?.map((el, idx) => (
                  <Avatar
                    src={el}
                    key={idx}
                    borderColor={surfaceBg}
                    borderWidth="2px"
                    boxSize="28px"
                  />
                ))}
              </AvatarGroup>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

export default CarouselCard;
