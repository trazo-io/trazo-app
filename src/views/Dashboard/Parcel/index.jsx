// Chakra imports
import {
  Flex,
  Grid,
  Text,
  useColorModeValue,
  Box,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuList
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { dashboardTableData, timelineData } from 'variables/general';
import { useDispatch, useSelector } from 'react-redux';

import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody.tsx';
import ParcelApplicationCard from './components/ParcelApplicationCard';
import { PageHeaderMeta } from 'components/Design/ProfileField';
import CardWithMap from 'components/Map/CardWithMap';
import Shimmer from 'components/Shimmer/Shimmer';
import HistoryCard from './components/HistoryCard';
import TrackList from './components/TrackList';
// assets
import { FaArrowRight, FaDrawPolygon, FaEllipsisH } from 'react-icons/fa';
import {
  PAGE_MAX_W,
  StandardButton,
  StandardMenuItem,
  TOUCH_TARGET
} from 'components/Design/StandardComponents';
import { useUserRole } from 'hooks/useUserRole';
import { toLatLngPath } from 'utils/parcelPolygon';
import imageMap from 'assets/img/imageMap.png';
import imageParcel1 from 'assets/img/ImageParcel1.png';
import { setParcel } from 'store/features/productSlice';
import { useGetParcelQuery } from 'store/api/productApi';
import { useGetParcelGeometryQuery } from 'store/api/parcelGeometryApi';
import LocationDisclosurePrompt from 'components/Parcel/LocationDisclosurePrompt';
import { useIntl } from 'react-intl';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTour } from 'hooks/useTour';

export default function ParcelView() {
  const intl = useIntl();
  const { farmId, parcelId } = useParams();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { canWrite } = useUserRole();

  const mainText = useColorModeValue('gray.700', 'gray.200');
  const cardColor = useColorModeValue('white', 'gray.700');

  const currentCompany = useSelector((state) => state.company.currentCompany);
  // The farm's other parcels, drawn around this one on the map card.
  const { data: farmGeometry } = useGetParcelGeometryQuery(
    { companyId: currentCompany?.id, farmId },
    { skip: !farmId || !currentCompany?.id }
  );
  const otherParcels = React.useMemo(
    () =>
      (farmGeometry || [])
        .filter((parcel) => String(parcel.id) !== String(parcelId) && parcel.path?.length >= 3)
        .map((parcel) => ({ id: parcel.id, name: parcel.name, path: parcel.path })),
    [farmGeometry, parcelId]
  );
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
      // The app's one page width (PAGE_MAX_W, the same cap as StandardPage and the farm home).
      // Uncapped, a 1,780px screen stretched the cards to 1,430px (2026-11-06).
      maxW={PAGE_MAX_W}
      mx="auto"
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

      {/* Page header, the same shape as the farm home: the PARCEL's name (this page titled
          itself with the farm's name until 2026-11-06, so every parcel page read "Calapooia Bend
          Farm"), one muted line of facts, and the profile one click away. The Parcel Application
          moved from a green status-in-the-label button here to its own card below. */}
      <Flex
        mb={{ base: '16px', md: '24px' }}
        justify="space-between"
        align="flex-start"
        gap={3}
        data-testid="parcel-page-header">
        <Box minW={0}>
          <Text
            as="h1"
            color={mainText}
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight="bold"
            lineHeight="1.2">
            {data?.name || '\u00a0'}
          </Text>
          <PageHeaderMeta
            items={[
              establishment?.name,
              [establishment?.city || establishment?.zone, establishment?.state]
                .filter(Boolean)
                .join(', '),
              data?.area != null && data?.area !== '' && !Number.isNaN(Number(data.area))
                ? intl.formatMessage(
                    { id: 'parcel.card.acres' },
                    { count: (Number(data.area) * 2.47105).toFixed(1) }
                  )
                : null,
              data?.product || null
            ]}
          />
          {/* Phone: a text link under the facts (the farm home's pattern). */}
          <Box display={{ base: 'block', md: 'none' }} pt={1}>
            <Text
              as={RouterLink}
              to={`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/profile`}
              fontSize="sm"
              fontWeight="semibold"
              color="green.700"
              {...TOUCH_TARGET}>
              {intl.formatMessage({ id: 'parcelPage.profileLink' })}&nbsp;
              <span aria-hidden="true">→</span>
            </Text>
          </Box>
        </Box>
        <Box flexShrink={0} display={{ base: 'none', md: 'block' }}>
          <StandardButton
            variant="outline"
            size="sm"
            rightIcon={<FaArrowRight aria-hidden />}
            onClick={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/profile`)}>
            {intl.formatMessage({ id: 'parcelPage.profileLink' })}
          </StandardButton>
        </Box>
      </Flex>
      <Grid
        templateColumns={{ md: '1fr', lg: '1.8fr 1.2fr' }}
        templateRows={{ md: '1fr auto', lg: '1fr' }}
        my={{ base: '20px', md: '26px' }}
        gap={{ base: '16px', md: '24px' }}
        w="100%"
        maxW="100%">
        <CardWithMap
          polygon={isFetching ? null : data?.polygon}
          center={isFetching ? null : data?.map_metadata?.center}
          zoom={isFetching ? null : data?.map_metadata?.zoom}
          otherParcels={isFetching ? [] : otherParcels}
          name={isFetching ? null : data?.name}
          menu={
            canWrite && !isFetching ? (
              // A shortcut to the parcel's boundary step, which also shows the farm's other
              // parcels. Styled like Google's own map controls beside it (white, square).
              <Menu placement="bottom-end">
                <MenuButton
                  as={IconButton}
                  icon={<Icon as={FaEllipsisH} />}
                  aria-label={intl.formatMessage({ id: 'parcel.map.menu' })}
                  size="md"
                  // 44px: the touch floor (Google's own controls beside it are 40px).
                  w="44px"
                  minW="44px"
                  h="44px"
                  bg="white"
                  color="gray.700"
                  borderRadius="2px"
                  boxShadow="0 1px 4px rgba(0,0,0,0.3)"
                  _hover={{ bg: 'gray.50' }}
                />
                <MenuList>
                  <StandardMenuItem
                    icon={<Icon as={FaDrawPolygon} />}
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/change?step=boundary`
                      )
                    }>
                    {intl.formatMessage({
                      id:
                        toLatLngPath(data?.polygon).length >= 3
                          ? 'parcel.map.editOutline'
                          : 'parcel.map.drawOutline'
                    })}
                  </StandardMenuItem>
                </MenuList>
              </Menu>
            ) : null
          }
        />
        {data && !isFetching ? (
          <ParcelApplicationCard
            farmId={farmId}
            parcelId={parcelId}
            status={data.application_status}
            missing={data.application_missing}
            evidenceStatus={data.evidence_status}
            evidenceMissing={data.evidence_missing}
          />
        ) : (
          <Card p="0px" bg={cardColor}>
            <CardBody p="0px" w="100%" h={{ base: '200px', lg: '290px' }} borderRadius="15px">
              <Shimmer height="100%" borderRadius="15px" />
            </CardBody>
          </Card>
        )}
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
