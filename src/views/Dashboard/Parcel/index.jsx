// Chakra imports
import {
  Flex,
  Grid,
  Image,
  Text,
  Tooltip,
  useColorModeValue,
  Box,
  Button,
  Icon
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { dashboardTableData, timelineData } from 'variables/general';
import { useDispatch, useSelector } from 'react-redux';

import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody.tsx';
import CardWithImage from 'components/Card/CardWithImage';
import CardWithMap from 'components/Map/CardWithMap';
import Shimmer from 'components/Shimmer/Shimmer';
import HistoryCard from './components/HistoryCard';
import TrackList from './components/TrackList';
// assets
import { FaClipboardCheck } from 'react-icons/fa';
import imageMap from 'assets/img/imageMap.png';
import imageParcel1 from 'assets/img/ImageParcel1.png';
import { setParcel } from 'store/features/productSlice';
import { useGetParcelQuery } from 'store/api/productApi';
import LocationDisclosurePrompt from 'components/Parcel/LocationDisclosurePrompt';
import { useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { useTour } from 'hooks/useTour';

export default function ParcelView() {
  const intl = useIntl();
  const { farmId, parcelId } = useParams();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const mainText = useColorModeValue('gray.700', 'gray.200');
  const cardColor = useColorModeValue('white', 'gray.700');

  const currentCompany = useSelector((state) => state.company.currentCompany);
  // Get subscription from the company
  const subscription = currentCompany?.subscription;

  /**
   * Parcel dashboard tour — held until this parcel HAS a current production.
   *
   * Two of its four steps describe things that only exist then: the current-production summary,
   * and the "Add event" actions, which TrackList swaps for a "Start production" button while
   * there is no season (`!currentHistory?.id`). Ungated, the tour ran 3 of 4 steps on such a
   * parcel and then marked itself complete — measured live on 2026-08-16 — so the step about
   * logging events, the one that matters most, was never shown on that browser again.
   */
  const currentHistory = useSelector((state) => state.history?.currentHistory);
  useTour('parcel-dashboard', { enabled: !!currentHistory?.id });

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
      /*
        MEASURED 2026-08-23 at 430px. Three pages, three different mobile gutters, so a card's
        left edge moved as the farmer navigated:

          StandardPage (farm profile, parcel profile)  px base 3  -> card at 16
          this page                                    px base '16px' -> card at 20
          the other hand-rolled page                   Dashboard: px base 1 -> card at  8

        `.claude/rules/frontend.md` already says StandardPage owns the width; these two pages
        pre-date it and set their own. Aligned at `base` ONLY — the desktop values are left
        as they are, since the complaint and the measurement were both about a phone.

        The page title carried its OWN `px={{ base: '16px' }}` on top of this one, so it sat
        16px right of the cards it titles — the split-grid defect frontend.md names. Removed;
        the page gutter is the only horizontal inset now.
      */
      px={{ base: 3, md: '24px' }}
      w="100%"
      maxW="100%"
      overflow="hidden">
      {/* Mounted HERE, not on the parcel profile page. Profile is a drill-down at
          /parcel/:id/profile that a farmer reaches deliberately; this is the parcel dashboard
          they land on, and it is the page that draws the map. A consent prompt on a page nobody
          routinely opens collects no consent — the first version of this shipped on profile and
          simply never appeared. */}
      <LocationDisclosurePrompt
        parcelId={parcelId}
        level={data?.location_disclosure_level}
        choiceMade={data?.location_disclosure_choice_made}
        hasBoundary={Boolean(data?.polygon)}
      />

      <Flex
        mb={{ base: '16px', md: '24px' }}
        justify="space-between"
        align={{ base: 'stretch', smd: 'center' }}
        direction={{ base: 'column', smd: 'row' }}
        gap={3}>
        <Text color={mainText} fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold">
          {establishment?.name}
        </Text>
        {/* WS-5: THE entry to the per-parcel certifier record. Status text rides the
            button so farmers see where they stand without opening it. */}
        <Tooltip
          isDisabled={!data?.application_missing?.length}
          label={
            data?.application_missing?.length
              ? intl.formatMessage(
                  { id: 'parcelApp.missingTooltip' },
                  {
                    items: data.application_missing
                      .map((key) => intl.formatMessage({ id: `parcelApp.missing.${key}` }))
                      .join(' · ')
                  }
                )
              : undefined
          }
          hasArrow>
          <Button
            leftIcon={<Icon as={FaClipboardCheck} />}
            colorScheme="green"
            variant={data?.application_status === 'complete' ? 'outline' : 'solid'}
            /*
              The label is CONCATENATED — title + " · status" + " (n)" — so its length is not
              knowable from the code. In es-419 it becomes "Solicitud de parcela · En progreso
              (4)", and a Chakra Button is `white-space: nowrap`, so it simply overflowed; the
              page wrapper carries `overflow="hidden"` (which is what keeps the page from
              scrolling sideways), so the tail was CLIPPED — the farmer saw "…En progreso (4"
              with the count cut in half.

              Wrap on mobile, where the button is full-width anyway thanks to the parent's
              `align="stretch"`; keep nowrap from `smd` up, where it sits in a row and wrapping
              would shrink it into a narrow column. `h="auto"` lets it grow to two lines while
              `minH` holds the 44px touch target.
            */
            whiteSpace={{ base: 'normal', smd: 'nowrap' }}
            textAlign="left"
            h="auto"
            minH="44px"
            py={2}
            onClick={() =>
              navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/application`)
            }>
            {intl.formatMessage({ id: 'parcelApp.title' })}
            {data?.application_status
              ? ` · ${intl.formatMessage({ id: `parcelApp.status.${data.application_status}` })}`
              : ''}
            {data?.application_missing?.length ? ` (${data.application_missing.length})` : ''}
          </Button>
        </Tooltip>
      </Flex>
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
          <Card maxH="290.5px" p="0px" bg={cardColor}>
            <CardBody p="0px" w="100%" h={{ base: '200px', lg: '290px' }} borderRadius="15px">
              <Shimmer height="100%" borderRadius="15px" />
            </CardBody>
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
