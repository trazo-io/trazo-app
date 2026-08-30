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
import { StandardEmptyState } from 'components/Design/StandardComponents';
import CardHeader from 'components/Card/CardHeader';
import CarouselCard from './CarouselCard';
import { QuickAddParcelModal } from 'components/Parcels/QuickAddParcelModal';
import { canCreateMore, getLimit } from 'utils/subscriptionLimits';
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
  const { farmId } = useParams();

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

  // Subscription limits check for parcel creation.
  //
  // Goes through `canCreateMore` rather than reading plan.features inline. The previous version
  // gated on `max_parcels_per_establishment > 0`, which is FALSE for an unlimited plan (-1) — so
  // the `=== -1` branch below it was unreachable and the "+ Add Parcel" button never rendered on
  // Enterprise, and would not have rendered on the Pilot plan either. It also read base plan
  // features, ignoring purchased add-ons, so a customer the API allows 5 parcels lost the button
  // at 2 while AddParcel.tsx (which reads effective_limits) disagreed.
  const company = useSelector((state) => state.company?.currentCompany);
  // WS-5 parcel quick-add: "+ New" opens the two-field dialog; the full form
  // stays one link away inside it.
  const quickAdd = useDisclosure();
  const canCreateParcel = useMemo(() => {
    if (!company || !farmId) return false;

    const establishment = company.establishments?.find((e) => String(e.id) === String(farmId));
    const establishmentParcels = establishment?.parcels?.length || 0;

    if (getLimit(company, 'max_parcels_per_establishment') !== undefined) {
      return canCreateMore(company, 'max_parcels_per_establishment', establishmentParcels);
    }

    // Legacy plans expressed a single company-wide cap instead of a per-farm one.
    const totalParcels = (company.establishments || []).reduce(
      (sum: number, est: { parcels?: unknown[] }) => sum + (est.parcels?.length || 0),
      0
    );
    return canCreateMore(company, 'max_parcels', totalParcels);
  }, [company, farmId]);

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
              onClick={quickAdd.onOpen}>
              <Flex direction="column" align="center" justify="center" gap={0.5}>
                {/* `green.700`, not `green.500` (2026-08-27). MEASURED on the rendered farm
                    dashboard: this glyph was the palette's brand green on a white card at
                    2.78:1 — under even the 3.0 a non-text mark owes — while the "New" label
                    directly beneath it was already correct at `green.700` (5.13:1). One tile,
                    two greens, and the failing one was the glyph. This is the documented
                    ⛔ case: `green.500` is a fill/decorative colour and never renders glyphs. */}
                <Icon as={FaPlus} color="green.700" fontSize={{ base: '14px', md: '20px' }} />
                <Text fontSize="xs" fontWeight="medium" color="green.700">
                  {intl.formatMessage({ id: 'app.new' }) || 'New'}
                </Text>
              </Flex>
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardBody px={{ base: 0, md: 2 }}>
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
              }}>
              <Flex gap={{ base: 4, md: 6 }} pt={2} pb={2} pr="16px" pl={2} w="max-content">
                {data.map((parcel) => (
                  <Box
                    key={parcel.id}
                    flexShrink={0}
                    w={{ base: '260px', smd: '280px', md: '310px' }}
                    minW={{ base: '260px', smd: '280px', md: '310px' }}
                    maxW={{ base: '260px', smd: '280px', md: '310px' }}>
                    <CarouselCard
                      id={parcel.id}
                      image={parcel.image || BgMusicCard}
                      name={parcel.name}
                      category={parcel.product || undefined}
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
                      areaHa={parcel.area}
                      applicationStatus={parcel.application_status}
                      hasCurrentProduction={parcel.has_current_production === true}
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
          /* Third hand-rolled copy of the same block (TrackList and HistoryCard had the
             other two), and the third to carry `green.400` at 2.01:1. They had already
             drifted apart on `spacing` and `py`. */
          <StandardEmptyState
            icon={FaSeedling}
            title={intl.formatMessage({ id: 'app.noParcelsYet' })}
            description={intl.formatMessage({ id: 'app.noParcelsYetDescription' })}
          />
        )}
      </CardBody>

      {company?.id && farmId && (
        <QuickAddParcelModal
          isOpen={quickAdd.isOpen}
          onClose={quickAdd.onClose}
          companyId={company.id}
          farmId={farmId}
        />
      )}
    </Card>
  );
};

export default CarouselHorizontal;
