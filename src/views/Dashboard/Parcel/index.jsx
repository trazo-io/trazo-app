// Chakra imports
import { Flex, Grid, Image, Text, useColorModeValue, Box, Button, Icon } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { dashboardTableData, timelineData } from 'variables/general';
import { useDispatch, useSelector } from 'react-redux';

import Card from 'components/Card/Card';
import CardWithImage from 'components/Card/CardWithImage';
import CardWithMap from 'components/Map/CardWithMap';
import Shimmer from 'components/Shimmer/Shimmer';
import HistoryCard from './components/HistoryCard';
import TrackList from './components/TrackList';
// assets
import imageMap from 'assets/img/imageMap.png';
import imageParcel1 from 'assets/img/ImageParcel1.png';
import { setParcel } from 'store/features/productSlice';
import { useGetParcelQuery } from 'store/api/productApi';
import { useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { useTour } from 'hooks/useTour';

export default function ParcelView() {
  const intl = useIntl();
  const { farmId, parcelId } = useParams();

  // Parcel dashboard tour — auto-starts on first visit
  useTour('parcel-dashboard');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const mainText = useColorModeValue('gray.700', 'gray.200');
  const cardColor = useColorModeValue('white', 'gray.700');

  const currentCompany = useSelector((state) => state.company.currentCompany);
  // Get subscription from the company
  const subscription = currentCompany?.subscription;

  const establishment = useSelector(
    (state) =>
      state.company.currentCompany?.establishments?.filter(
        (establishment) => establishment.id === Number(farmId)
      )[0]
  );

  const { data, error, isLoading, isFetching, refetch } = useGetParcelQuery(
    { parcelId, farmId, companyId: currentCompany?.id },
    {
      skip: !parcelId || !farmId || !currentCompany || currentCompany?.id === undefined
    }
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (data) dispatch(setParcel(data));
  }, [data]);

  const historyCardTitles = [
    intl.formatMessage({ id: 'app.timeFrame' }),
    intl.formatMessage({ id: 'app.product' }),
    intl.formatMessage({ id: 'app.members' }),
    intl.formatMessage({ id: 'app.certified' })
  ];

  return (
    <Flex
      flexDirection="column"
      pt={{ base: '120px', md: '75px' }}
      px={{ base: '16px', md: '24px' }}
      w="100%"
      maxW="100%"
      overflow="hidden">

      <Box mb={{ base: '16px', md: '24px' }}>
        <Text
          color={mainText}
          fontSize={{ base: 'xl', md: '2xl' }}
          fontWeight="bold"
          px={{ base: '16px', md: '0' }}>
          {establishment?.name}
        </Text>
      </Box>
      <Grid
        templateColumns={{ md: '1fr', lg: '1.8fr 1.2fr' }}
        templateRows={{ md: '1fr auto', lg: '1fr' }}
        my={{ base: '20px', md: '26px' }}
        gap={{ base: '16px', md: '24px' }}
        w="100%"
        maxW="100%">
        {establishment && !isFetching ? (
          <CardWithImage
            title={`${establishment?.city || establishment?.zone || ''}, ${establishment?.state}`}
            name={data?.name}
            description={data?.description}
            state={establishment?.state}
            city={establishment?.city}
            zone={establishment?.zone}
            readMoreLink={`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/profile`}
            image={
              data?.image ? (
                <Image
                  src={data.image}
                  alt={intl.formatMessage({ id: 'parcel.parcelImageAlt' })}
                  objectFit={'cover'}
                  minWidth={{ md: '300px', lg: 'auto' }}
                  width="100%"
                  borderRadius="15px"
                  height="100%"
                />
              ) : undefined
            }
          />
        ) : (
          <Card minH="290px" bg={cardColor}>
            <Shimmer height="290px" borderRadius="15px" />
          </Card>
        )}

        <CardWithMap
          polygon={isFetching ? null : data?.polygon}
          center={isFetching ? null : data?.map_metadata?.center}
          zoom={isFetching ? null : data?.map_metadata?.zoom}
        />
      </Grid>
      <Grid
        templateColumns={{ sm: '1fr', md: '1fr', lg: '1fr 1fr' }}
        templateRows={{ sm: '1fr auto', md: '1fr', lg: '1fr' }}
        gap={{ base: '16px', md: '24px' }}
        w="100%"
        maxW="100%">
        <TrackList amount={40} />
        <HistoryCard
          title={intl.formatMessage({ id: 'parcel.history' })}
          amount={data?.productions_completed}
          captions={historyCardTitles}
        />
      </Grid>
    </Flex>
  );
}
