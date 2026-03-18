import { config } from 'config/environment';
// Chakra imports
import {
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
  useDisclosure,
  useBreakpointValue,
  Box,
  HStack,
  Center,
  VStack
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useBatchS3Images } from 'hooks/useBatchS3Images';
import { useSelector } from 'react-redux';

import BgMusicCard from 'assets/img/BgMusicCard.png';
// Custom components
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import CarouselCard from './CarouselCard';
import { FaPlus, FaSeedling } from 'react-icons/fa';
// Assets
import avatar2 from 'assets/img/avatars/avatar2.png';
import avatar4 from 'assets/img/avatars/avatar4.png';
import avatar6 from 'assets/img/avatars/avatar6.png';
import { useIntl } from 'react-intl';

type CarouselHorizontalProps = {
  title: string;
  description: string;
  data: any[];
};

const CarouselHorizontal = ({ title, description, data }: CarouselHorizontalProps) => {
  // Chakra color mode
  const textColor = useColorModeValue('gray.700', 'white');
  const intl = useIntl();
  const navigate = useNavigate();
  const { establishmentId } = useParams();

  // State for scroll progress tracking
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if content is scrollable
  const checkScrollability = () => {
    if (!scrollContainerRef.current || !data || data.length <= 1) {
      setIsScrollable(false);
      return;
    }

    const { scrollWidth, clientWidth } = scrollContainerRef.current;
    const canScroll = scrollWidth > clientWidth;

    console.log('🔍 [CarouselHorizontal] Checking scrollability:', {
      scrollWidth,
      clientWidth,
      canScroll,
      dataLength: data.length
    });

    setIsScrollable(canScroll);
  };

  // Check scrollability on mount and when data changes
  useEffect(() => {
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(checkScrollability, 100);
    return () => clearTimeout(timer);
  }, [data]);

  // Check scrollability on window resize
  useEffect(() => {
    const handleResize = () => {
      checkScrollability();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  // Scroll handler to track progress through parcels - now works on all screen sizes
  const handleParcelScroll = (e) => {
    console.log('🖱️ [CarouselHorizontal] Scroll event:', {
      dataLength: data?.length,
      scrollLeft: e.target.scrollLeft,
      scrollWidth: e.target.scrollWidth,
      clientWidth: e.target.clientWidth
    });

    if (!data || data.length <= 1) {
      console.log('⏸️ [CarouselHorizontal] Scroll disabled - not enough data:', {
        dataLength: data?.length
      });
      return;
    }

    const scrollLeft = e.target.scrollLeft;
    const scrollWidth = e.target.scrollWidth;
    const clientWidth = e.target.clientWidth;
    const maxScroll = scrollWidth - clientWidth;

    // Update scrollable state based on whether there's overflow
    const canScroll = maxScroll > 0;
    if (canScroll !== isScrollable) {
      setIsScrollable(canScroll);
      console.log('📊 [CarouselHorizontal] Scrollable state updated:', canScroll);
    }

    console.log('📏 [CarouselHorizontal] Scroll calculations:', {
      scrollLeft,
      scrollWidth,
      clientWidth,
      maxScroll,
      canScroll
    });

    if (maxScroll > 0) {
      const progress = Math.min(scrollLeft / maxScroll, 1);
      console.log('📊 [CarouselHorizontal] Setting scroll progress:', progress);
      setScrollProgress(progress);
    }
  };

  // Subscription limits check for parcel creation
  const company = useSelector((state) => state.company?.currentCompany);
  const canCreateParcel = useMemo(() => {
    if (!company || !establishmentId) return false;

    const plan = company.subscription_plan || company.subscription?.plan;
    if (!plan?.features) return false;

    // For Corporate plans with per-establishment limits
    if (plan.features.max_parcels_per_establishment > 0) {
      const establishment = company.establishments?.find(
        (e) => e.id === parseInt(String(establishmentId))
      );
      const establishmentParcels = establishment?.parcels?.length || 0;
      const maxParcelsPerEst = plan.features.max_parcels_per_establishment;
      return maxParcelsPerEst === -1 || establishmentParcels < maxParcelsPerEst;
    }

    // For Basic/Standard plans with global parcel limits
    if (plan.features.max_parcels > 0) {
      let totalParcels = 0;
      company.establishments?.forEach((est) => {
        totalParcels += est.parcels?.length || 0;
      });
      const maxParcels = plan.features.max_parcels;
      return maxParcels === -1 || totalParcels < maxParcels;
    }

    return false;
  }, [company, establishmentId]);

  // 2025 Best Practice: Batch load all parcel images at once
  const parcelImageUrls = useMemo(() => {
    console.log('🎠 [CarouselHorizontal] Processing parcel data:', {
      data,
      dataType: typeof data,
      isArray: Array.isArray(data)
    });

    if (!data || !Array.isArray(data)) {
      console.log('❌ [CarouselHorizontal] No valid data for parcels:', data);
      return [];
    }

    const imageUrls = data
      .map((parcel) => {
        console.log('🖼️ [CarouselHorizontal] Processing parcel:', { parcel, image: parcel?.image });
        return parcel?.image;
      })
      .filter(Boolean);

    console.log('✅ [CarouselHorizontal] Extracted image URLs:', imageUrls);
    return imageUrls;
  }, [data]);

  console.log('🔄 [CarouselHorizontal] Calling useBatchS3Images with:', {
    parcelImageUrls,
    enabled: parcelImageUrls.length > 0
  });

  const { presignedUrls, isLoading: batchLoading } = useBatchS3Images({
    s3Urls: parcelImageUrls,
    enabled: parcelImageUrls.length > 0
  });

  console.log('📊 [CarouselHorizontal] Batch results:', { presignedUrls, batchLoading });

  return (
    <Card p={{ base: 4, md: 5 }} bg="white" borderRadius="2xl" overflow="hidden">
      <CardHeader p={{ base: '0px 0px 16px 0px', md: '0px 0px 20px 0px' }}>
        <Flex justify={'space-between'} width={'100%'} align="center">
          <Flex direction="column">
            <Text fontSize={{ base: 'lg', md: 'xl' }} color={textColor} fontWeight="700" mb={1}>
              {title}
            </Text>
            <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500" fontWeight="400">
              {description}
            </Text>
          </Flex>
          {canCreateParcel && (
            <Button
              p="0px"
              w={{ base: '60px', md: '90px' }}
              h={{ base: '60px', md: '90px' }}
              bg="transparent"
              color="green.500"
              borderRadius="xl"
              border="2px dashed"
              borderColor="gray.200"
              flexShrink={0}
              _hover={{
                bg: 'green.50',
                borderColor: 'green.500',
                transform: 'translateY(-2px)',
                boxShadow: 'lg'
              }}
              onClick={() =>
                navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/add`)
              }
            >
              <Flex direction="column" align="center" justify="center" gap={0.5}>
                <Icon as={FaPlus} color="green.500" fontSize={{ base: '14px', md: '20px' }} />
                <Text fontSize="xs" fontWeight="medium" color="green.600">
                  {intl.formatMessage({ id: 'app.new' }) || 'New'}
                </Text>
              </Flex>
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardBody px={{ base: 1, md: 2 }}>
        {data && data.length > 0 ? (
          <>
            {/* Unified Horizontal Scrollable Layout for ALL screen sizes */}
            <Box
              ref={scrollContainerRef}
              overflowX="scroll"
              overflowY="hidden"
              onScroll={handleParcelScroll}
              w="100%"
              sx={{
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <Flex gap={{ base: 4, md: 6 }} pt={2} pb={2} pr="16px" pl={2} w="max-content">
                {data.map((parcel) => (
                  <Box
                    key={parcel.id}
                    flexShrink={0}
                    w={{ base: '260px', smd: '280px', md: '310px' }}
                    minW={{ base: '260px', smd: '280px', md: '310px' }}
                    maxW={{ base: '260px', smd: '280px', md: '310px' }}
                  >
                    <CarouselCard
                      id={parcel.id}
                      image={parcel.image || BgMusicCard}
                      name={parcel.name}
                      category={
                        parcel.product || intl.formatMessage({ id: 'app.noCurrentProduction' })
                      }
                      buttonText={intl.formatMessage({ id: 'app.viewParcel' }).toUpperCase()}
                      avatars={
                        parcel.members
                          ?.map((member: any) => {
                            if (!member.image) return null;
                            // Prepend backend URL if image is a relative path
                            const backendUrl = config.API_ROOT_URL;
                            return member.image.startsWith('http')
                              ? member.image
                              : `${backendUrl}${member.image}`;
                          })
                          .filter(Boolean) || []
                      }
                      presignedUrl={parcel.image ? presignedUrls[parcel.image] : undefined}
                    />
                  </Box>
                ))}
              </Flex>
            </Box>

            {/* Dynamic progress line indicator - only show when content is actually scrollable */}
            {isScrollable && (
              <Box w="100%" h="3px" bg="gray.200" borderRadius="full" position="relative" mt={3}>
                <Box
                  h="full"
                  bg="green.500"
                  borderRadius="full"
                  w={`${scrollProgress * 100}%`}
                  position="absolute"
                  left="0"
                  top="0"
                  transition="width 0.2s ease"
                />
              </Box>
            )}
          </>
        ) : (
          <VStack spacing={6} py={12} align="center" px={6}>
            <VStack spacing={4} textAlign="center">
              <Icon as={FaSeedling} color="green.400" boxSize={12} />
              <VStack spacing={2}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {intl.formatMessage({ id: 'app.noParcelsYet' })}
                </Text>
                <Text fontSize="sm" color="gray.500" maxW="350px" lineHeight="1.5">
                  {intl.formatMessage({ id: 'app.noParcelsYetDescription' })}
                </Text>
              </VStack>
            </VStack>
          </VStack>
        )}
      </CardBody>
    </Card>
  );
};

export default CarouselHorizontal;
