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
  Icon
} from '@chakra-ui/react';
import { S3Image, EmptyImageState } from 'components/Design';
import Shimmer from 'components/Shimmer/Shimmer';

import { useIntl } from 'react-intl';
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
  category?: string;
  buttonText: string;
  avatars: string[];
  presignedUrl?: string;
  /** Hectares from the API; rendered as acres (US-units rule). */
  areaHa?: number | string;
  /** parcel_application_status state: not_started | in_progress | complete */
  applicationStatus?: string;
  hasCurrentProduction?: boolean;
};

const CarouselCard = ({
  id,
  image,
  name,
  category,
  buttonText,
  avatars,
  presignedUrl,
  areaHa,
  applicationStatus,
  hasCurrentProduction = false
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

  const intl = useIntl();
  const { farmId } = useParams();
  const navigate = useNavigate();

  // Check if we should show placeholder - handle localhost URLs that don't need presigning
  const isLocalhost =
    image?.includes('localhost') || image?.startsWith('http://') || image?.startsWith('https://');
  const isValidImage = image && !image.includes('BgMusicCard');
  const shouldShowPlaceholder = !isValidImage || (!isLocalhost && !presignedUrl);

  return (
    <Card
      p={0}
      w={{ base: '260px', smd: '280px', md: '310px' }}
      minW={{ base: '260px', smd: '280px', md: '310px' }}
      maxW={{ base: '260px', smd: '280px', md: '310px' }}
      minH={{ base: '310px', md: '360px' }}
      h={{ base: '310px', md: '360px' }}
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
      onClick={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${id}`)}
    >
      <Flex direction="column" h="100%">
        {/* One band height whether or not a photo exists — two heights made the
            carousel row ragged (2026-08-09 feedback). Photos render cover; the
            empty state is a quiet brand-tinted fill, not a "No Image" notice. */}
        <Box
          w="100%"
          h={{ base: '110px', md: '130px' }}
          flexShrink={0}
          position="relative"
          overflow="hidden"
          borderTopRadius="20px"
        >
          {!imageLoaded && !shouldShowPlaceholder && (
            <Shimmer width="100%" height="100%" borderRadius="20px" />
          )}

          {/* Empty state or actual image */}
          {shouldShowPlaceholder ? (
            <EmptyImageState variant="small" height="100%" borderRadius="20px" showBorder={false} />
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

        {/* Content — the parcel's NAME leads (farmers think in parcel names);
            the crop is a chip. The old order put the crop huge and truncated the
            name into small caps. */}
        <Flex direction="column" flex="1" p={{ base: '12px', md: '20px' }}>
          <Text
            fontSize={{ base: 'md', md: 'lg' }}
            color={textColor}
            fontWeight="700"
            mb="4px"
            letterSpacing="-0.01em"
            lineHeight="1.3"
            noOfLines={1}
          >
            {name}
          </Text>

          <HStack spacing={2} mb="10px" flexWrap="wrap" minH="22px">
            {category && (
              <Badge variant="subtle" fontSize="11px">
                {category}
              </Badge>
            )}
            {areaHa != null && areaHa !== '' && (
              <HStack spacing={1}>
                <Icon as={FiMapPin} boxSize="12px" color={tertiaryText} />
                <Text fontSize="xs" color={tertiaryText} fontWeight="500">
                  {intl.formatMessage(
                    { id: 'parcel.card.acres' },
                    { count: (Number(areaHa) * 2.47105).toFixed(1) }
                  )}
                </Text>
              </HStack>
            )}
          </HStack>

          {/* Load-bearing status row: the application chip is the renewal nudge
              (click-through to the wizard); the season indicator says work is
              live. ONE nowrap row — a wrapped chip added a row on some cards
              and broke the fixed-height footer pin (2026-08-09). */}
          <Flex mb="12px" minH="22px" align="center" justify="space-between" gap={2}>
            {applicationStatus && applicationStatus !== 'complete' && (
              <Badge
                variant="warning"
                fontSize="11px"
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/dashboard/farm/${farmId}/parcel/${id}/application`);
                }}
              >
                {intl.formatMessage({
                  id:
                    applicationStatus === 'in_progress'
                      ? 'parcel.card.appInProgress'
                      : 'parcel.card.appNotStarted'
                })}
              </Badge>
            )}
            {applicationStatus === 'complete' && (
              <Badge variant="brand" fontSize="11px">
                {intl.formatMessage({ id: 'parcel.card.appComplete' })}
              </Badge>
            )}
            {hasCurrentProduction && (
              <HStack spacing={1.5} flexShrink={0}>
                {/* Decorative: the "Active" label beside it carries the meaning, so this dot
                    is a brand fill (green.500), not a status colour. green.400 was neither. */}
                <Box w="7px" h="7px" borderRadius="full" bg="green.500" />
                <Text fontSize="xs" color={tertiaryText} fontWeight="500">
                  {intl.formatMessage({ id: 'parcel.card.active' })}
                </Text>
              </HStack>
            )}
          </Flex>

          {/* Fixed footer height so VIEW PARCEL aligns across cards whether or
              not the avatar group renders (avatars are taller than the link). */}
          <Flex justifyContent="space-between" mt="auto" align="center" minH="32px">
            {/* Trazo standard button design - matching CardWithImage pattern */}
            <Button
              p="0px"
              variant="no-hover"
              bg="transparent"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/dashboard/farm/${farmId}/parcel/${id}`);
              }}
            >
              <Text
                fontSize="xs"
                color="green.700"
                fontWeight="bold"
                cursor="pointer"
                transition="all .5s ease"
                _hover={{ me: '4px' }}
              >
                {buttonText || 'VIEW PARCEL'}
              </Text>
              <Icon
                as={BsArrowRight}
                w="14px"
                h="14px"
                fontSize="md"
                color="green.600"
                transition="all .5s ease"
                mx=".3rem"
                cursor="pointer"
                pt="2px"
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
