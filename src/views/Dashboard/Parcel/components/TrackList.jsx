// Chakra imports
import {
  Button,
  CircularProgress,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  HStack,
  Box,
  Badge,
  Divider,
  Tooltip,
  ButtonGroup,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react';
import {
  FaRegDotCircle,
  FaPlus,
  FaPlay,
  FaFlag,
  FaSeedling,
  FaChartLine,
  FaTrash
} from 'react-icons/fa';
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import SeasonActivityList from './SeasonActivityList';
import { IoEllipsisVerticalSharp } from 'react-icons/io5';
import { setCurrentHistory } from 'store/features/historySlice';
import { useGetCurrentHistoryQuery, useDeleteProductionMutation } from 'store/api/historyApi';
import { useIntl } from 'react-intl';
import { VerbPickerGrid } from 'components/Events/VerbPickerGrid';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { EventDetailsModal } from 'components/Modals/EventDetailsModal';
import { useUserRole } from 'hooks/useUserRole';

// Custom components
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody.tsx';
import CardHeader from 'components/Card/CardHeader.tsx';
import {
  StandardButton,
  StandardEmptyState,
  StandardMenuItem
} from 'components/Design/StandardComponents';
import { formatDateFromTimestamp } from 'utils/dateOnly';
import { apiErrorMessage } from 'utils/apiErrorMessage';

const TrackList = ({ amount }) => {
  const textColor = useColorModeValue('gray.700', 'white');
  const intl = useIntl();
  const { canWrite } = useUserRole();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isOpenFinishModal,
    onOpen: onOpenFinishModal,
    onClose: onCloseFinishModal
  } = useDisclosure();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentHistory = useSelector((state) => state.history.currentHistory);
  const currentCompany = useSelector((state) => state.company.currentCompany);

  const { farmId, parcelId } = useParams();

  const { isOpen: isOpen1, onOpen: onOpen1, onClose: onClose1 } = useDisclosure();
  const {
    isOpen: isAddEventMenuOpen,
    onOpen: onAddEventMenuOpen,
    onClose: onAddEventMenuClose
  } = useDisclosure();

  // Event Details Modal state
  const {
    isOpen: isEventDetailsOpen,
    onOpen: onEventDetailsOpen,
    onClose: onEventDetailsClose
  } = useDisclosure();
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Delete Production state
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();
  const [deleteProduction, { isLoading: isDeleting }] = useDeleteProductionMutation();

  // Track polling state separately to avoid TDZ error
  // (can't reference `data` in the same hook's options)
  const [eventsPolling, setEventsPolling] = useState(false);

  const { data, error, isLoading, isFetching, isUninitialized, refetch } =
    useGetCurrentHistoryQuery(
      {
        companyId: currentCompany?.id,
        farmId,
        parcelId: parcelId || ''
      },
      {
        skip: !parcelId || !currentCompany || !farmId || currentCompany?.id === undefined,
        // 30 s, not `true`: a result the boot prefetch fetched a second ago is fresh, and every
        // event write invalidates the 'History' tag anyway (2026-09-06).
        refetchOnMountOrArgChange: 30,
        refetchOnFocus: false,
        pollingInterval: eventsPolling ? 3000 : 0
      }
    );

  // Clear Redux state when parcel changes to prevent stale data
  useEffect(() => {
    dispatch(setCurrentHistory(null));
  }, [parcelId, dispatch]);

  // Update Redux state when new data arrives
  useEffect(() => {
    if (data) dispatch(setCurrentHistory(data));
  }, [data, dispatch]);

  // green.700: this fills two buttons that both carry WHITE labels ("Start production",
  // "Add event"). green.500 under white is 2.78:1 — the same failure fixed app-wide; it was
  // missed by the sweep because the colour arrives through a variable, not a literal prop.
  const bgButton = useColorModeValue('green.700', 'gray.800');

  // "See all N activities" → the Activities list filtered to this parcel, starting at the
  // season's earliest record. Not `start_date` alone: an activity can be dated before the
  // season's start (residue worked in on Jun 16 for a Jun 20 sowing) and still belong to it,
  // and the page would then show 11 where the card promised 12.
  const seasonFrom = [
    currentHistory?.start_date,
    ...(currentHistory?.events || []).map((e) => e.date)
  ]
    .filter(Boolean)
    .map((d) => String(d).slice(0, 10))
    .sort()[0];
  const allActivitiesPath = `/admin/dashboard/farm/${farmId}/activities?parcel=${parcelId}&view=list${
    seasonFrom ? `&from=${seasonFrom}` : ''
  }`;

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    onEventDetailsOpen();
  };

  const handleEventUpdated = () => {
    refetch();
    onEventDetailsClose();
  };

  const handleEventDeleted = () => {
    refetch();
    onEventDetailsClose();
  };

  const seasonHasActivities = currentHistory?.events?.length > 0;

  const handleDeleteProduction = async () => {
    if (!currentHistory?.id) return;

    try {
      await deleteProduction(currentHistory.id).unwrap();
      toast({
        title: intl.formatMessage({ id: 'app.productionDeleted' }),
        description: intl.formatMessage({ id: 'app.productionDeletedSuccess' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      onDeleteClose();
      // Clear the current history from state
      dispatch(setCurrentHistory(null));
      // Refetch to update the UI
      refetch();
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description:
          apiErrorMessage(error) ?? intl.formatMessage({ id: 'app.productionDeleteError' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <Card
      key={`track-list-${parcelId}`}
      /* No fixed height. This was `h`/`maxH` 700px at BOTH breakpoints (an identical
         responsive object, so just `700px`), which MEASURED 226px of dead space on a 375px
         screen when the card was empty — 32% of the card. The parent in `Parcel/index.jsx`
         is a CSS Grid, and grid items stretch to the row height for free, so the lock bought
         nothing on desktop and only capped the card. The sibling HistoryCard locked 650px on
         mobile against this one's 700px, so the two did not even match where they stack. */
      minW={{ base: '100%', md: '400px' }}
      w="100%"
      className="trazo-card">
      <CardHeader px={{ base: 0, md: 6 }} py={5} data-tour="current-production">
        <Flex direction="column" w="100%">
          {/* Header with consistent height */}
          <Flex justify="space-between" align="center" pb={4}>
            <HStack spacing={3}>
              <Text fontSize={{ base: 'md', md: 'lg' }} color={textColor} fontWeight="600">
                {intl.formatMessage({ id: 'parcelPage.currentSeason' })}
              </Text>
              {currentHistory?.product && (
                // The crop is a fact, not a status: neutral, as on the farm home (2026-11-06).
                <Badge variant="neutral" fontSize="11px" w="fit-content">
                  {currentHistory?.product}
                </Badge>
              )}
            </HStack>
            {/* HIDDEN, not disabled, when there is no production. It offers Edit and Delete;
                with nothing to edit or delete the control has no meaning. It was previously
                rendered `disabled` — MEASURED computed opacity 1.0 and the same `gray.400`
                glyph — so it looked identical to the live control and did nothing on tap.
                `gray.400` is also 2.68:1, under the 3.0 a non-text mark owes. */}
            {canWrite && currentHistory?.product && (
              <Menu isOpen={isOpen1} onClose={onClose1}>
                <MenuButton onClick={onOpen1} alignSelf="flex-start" cursor="pointer">
                  <Icon as={IoEllipsisVerticalSharp} color="gray.600" w="20px" h="20px" />
                </MenuButton>
                <MenuList>
                  <StandardMenuItem
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${currentHistory?.id}/change`
                      )
                    }>
                    {/* No `.toUpperCase()`. That uppercased the TRANSLATED string in
                        JavaScript, so the label could not be authored per locale, and it made
                        this the only menu in the app shouting at the farmer. */}
                    {intl.formatMessage({ id: 'app.edit' })}
                  </StandardMenuItem>
                  <StandardMenuItem
                    isDestructive
                    onClick={() => {
                      onClose1();
                      onDeleteOpen();
                    }}>
                    {intl.formatMessage({ id: 'app.delete' })}
                  </StandardMenuItem>
                </MenuList>
              </Menu>
            )}
          </Flex>

          <Divider />

          {/* Production info moved to be more compact */}
          {currentHistory?.product && (
            <HStack justify="space-between" pt={4}>
              {/* "Active Production" sat opposite this date: the card's title already says so. */}
              <Text fontSize="xs" color="gray.600" fontWeight="medium">
                {intl.formatMessage({ id: 'parcel.started' })}{' '}
                {formatDateFromTimestamp(currentHistory?.start_date, intl.locale)}
              </Text>
            </HStack>
          )}
        </Flex>
      </CardHeader>
      <CardBody
        ps={{ base: '0px', md: '20px' }}
        pe="0px"
        mb="12px"
        position="relative"
        data-tour="events-timeline">
        {/* No inner scroll (2026-11-06): the season's activities are month groups of one-line
            rows, the latest six shown and the rest behind "Show all", so the card grows with
            the page instead of hiding most of the season behind a 450px scroll box. */}
        <Box pt={2} pe={{ base: 0, md: '20px' }}>
          <Flex direction="column" width={'100%'} pb={4}>
            {/* `isUninitialized` — see HistoryCard: a skip gated on `currentCompany?.id`
                reports `isLoading: false` before it has ever run, which reached the empty
                state below and claimed this parcel has no current production. */}
            {isLoading || isFetching || isUninitialized ? (
              <Flex width={'100%'} height={'120px'} justifyContent={'center'} alignItems="center">
                <CircularProgress isIndeterminate color="green.700" size="40px" />
              </Flex>
            ) : (
              <>
                {currentHistory?.events?.length > 0 && (
                  <SeasonActivityList
                    events={currentHistory.events}
                    onOpen={handleEventClick}
                    allActivitiesPath={allActivitiesPath}
                  />
                )}
                {/* `!(x?.length > 0)`, not `!x?.length > 0`. The old form parsed as
                    `(!length) > 0` and worked only by accident — `true > 0` coerces to
                    `1 > 0`. The three sibling branches below already used the correct form. */}
                {!(currentHistory?.events?.length > 0) && !currentHistory?.product && (
                  <StandardEmptyState
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'parcelPage.noSeasonUnderway' })}
                    description={intl.formatMessage({ id: 'parcelPage.startSeasonDescription' })}
                    action={
                      canWrite ? (
                        <StandardButton
                          onClick={() =>
                            navigate(
                              `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/add`
                            )
                          }>
                          {intl.formatMessage({ id: 'parcelPage.startSeason' })}
                        </StandardButton>
                      ) : undefined
                    }
                  />
                )}
                {/* The "Setting up events" and "Event setup failed" states that used to sit
                    here were DELETED 2026-08-22. Both keyed on `currentHistory.events_status`,
                    a field removed from the `History` model by backend migration 0220
                    (2026-08-19) when picking a crop template stopped writing dated event
                    records and started writing a season PLAN instead. There is no longer any
                    background event creation to report on, so neither state could ever render.
                    The `orange.400` icon on the failed state was also Chakra's orange — the
                    theme defines `amber` — at 2.55:1. */}
                {/* Production exists, nothing recorded against it yet. The two
                    `events_status !== …` guards this used to carry were always true — see
                    above. `FaClock` in `blue.400` (2.65:1, and blue carries no meaning in this
                    palette) becomes the seedling's sibling glyph at the shared colour. */}
                {!(currentHistory?.events?.length > 0) && currentHistory?.product && (
                  <StandardEmptyState
                    size="sm"
                    icon={FaRegDotCircle}
                    title={intl.formatMessage({ id: 'parcel.noEventsRecordedYet' })}
                    description={intl.formatMessage({ id: 'parcel.addFirstEventDescription' })}
                  />
                )}
              </>
            )}
          </Flex>
        </Box>
      </CardBody>
      {/* Action bar for a production that EXISTS.
          "Start production" used to live here, in a footer pinned to the bottom of a 700px
          card — MEASURED 179px below the sentence that asked for it. It now sits inside the
          empty state, beside its own copy.

          ⚠️ `currentHistory?.id` gates the WRAPPER, not just its contents. When the inner
          content alone was conditional, the wrapper still rendered on an empty parcel with
          `p="16px"` and no children — MEASURED a 32px-tall empty box under the card. It was
          invisible as a shape and visible as unexplained space.

          The id, not `product`: a production without a product row used to render its
          timeline above while the button still said "Start production". */}
      {!isLoading && !isFetching && currentHistory?.id && (
        <Flex
          justify={{ base: 'stretch', smd: 'flex-end' }}
          gap={3}
          p={{ base: '16px', md: '20px' }}>
          <Flex
            data-tour="add-event-actions"
            gap={{ base: 2, md: 3 }}
            justify={{ base: 'stretch', smd: 'flex-end' }}
            align={{ base: 'stretch', smd: 'center' }}
            w="100%"
            direction={{ base: 'column', smd: 'row' }}>
            {/* WS-4b entry convergence: Add event opens the SAME "What did you do?"
                  verb modal the Activities page uses (shared VerbPickerGrid) — every
                  verb always visible, never a scroll-hidden dropdown subset. */}
            {canWrite && (
              <Button
                leftIcon={<Icon as={FaPlus} />}
                bg={bgButton}
                color="white"
                fontSize="sm"
                fontWeight="semibold"
                variant="no-hover"
                minW={{ base: '100%', smd: '120px', md: '140px' }}
                w={{ base: '100%', smd: 'auto' }}
                h="44px"
                borderRadius="12px"
                _hover={{
                  transform: 'translateY(-1px)',
                  boxShadow: 'lg'
                }}
                _active={{
                  transform: 'translateY(0px)',
                  boxShadow: 'md'
                }}
                transition="all 0.2s"
                onClick={onAddEventMenuOpen}>
                {intl.formatMessage({ id: 'parcelPage.logActivity' })}
              </Button>
            )}

            {/* Finish Production Button - Only show if there are events */}
            {canWrite && currentHistory?.events && currentHistory?.events.length > 0 && (
              <Button
                px={{ base: 4, md: '16px' }}
                leftIcon={<Icon as={FaFlag} />}
                variant="outline"
                colorScheme="green"
                fontSize="sm"
                fontWeight="semibold"
                w={{ base: '100%', smd: 'auto' }}
                h="44px"
                borderRadius="12px"
                _hover={{
                  transform: 'translateY(-1px)',
                  boxShadow: 'md'
                }}
                transition="all 0.2s"
                onClick={() =>
                  navigate(
                    `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${currentHistory?.id}/finish`
                  )
                }>
                <Text as="span" display={{ base: 'none', smd: 'inline' }}>
                  {intl.formatMessage({ id: 'farmHome.seasons.finish' })}
                </Text>
                <Text as="span" display={{ base: 'inline', smd: 'none' }}>
                  {intl.formatMessage({ id: 'app.finish' })}
                </Text>
              </Button>
            )}
          </Flex>
        </Flex>
      )}

      {/* WS-4b: shared "What did you do?" verb modal (same grid as Activities page).
          Quick log rides on top as the voice/template accelerator until WS-4c ports
          those into the wizard itself. */}
      <ResponsiveModal
        isOpen={isAddEventMenuOpen}
        onClose={onAddEventMenuClose}
        size="2xl"
        header={
          <Text fontSize="lg" fontWeight="semibold">
            {intl.formatMessage({ id: 'activities.pickVerb' })}
          </Text>
        }>
        {/* WS-4 complete: voice + template accelerators live INSIDE the wizard
            now, so the Quick-vs-Manual fork is gone — one grid, one flow. */}
        <VerbPickerGrid
          columns={{ base: 2, smd: 2, md: 3 }}
          onSelect={(verb) => {
            onAddEventMenuClose();
            navigate(
              `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/add?event_type=${verb.eventType}&verb=${verb.key}`
            );
          }}
        />
      </ResponsiveModal>

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={isEventDetailsOpen}
        onClose={onEventDetailsClose}
        event={selectedEvent}
        members={currentHistory?.members || []}
        // Latent today — this card reads `current_history`, which finishing nulls
        // (Parcel.finish_current_history), so a closed season empties the card rather
        // than rendering here. Passed anyway: it is the same guarantee the activity
        // feed needs, and leaving it unpassed is exactly how the prop went dead in the
        // first place. If `current_history` ever points at a finished row, this shows
        // the locked state instead of an Edit button that 423s.
        isProductionFinished={!!(currentHistory?.finish_date || currentHistory?.published)}
        // AC-15: the buyer-page hint says "appears" only when the season is published.
        // `current_history` points at the open season and publishing needs `finish_date`, so
        // this is false in practice and the hint reads "once the season is published". The
        // published case is wired where the season lives: ProfileProduction.
        isSeasonPublished={!!currentHistory?.published}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />

      {/* Delete Production Confirmation Dialog - Trazo Design Pattern */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered>
        <AlertDialogOverlay bg="blackAlpha.300" backdropFilter="blur(10px)">
          <AlertDialogContent borderRadius="xl" p={2} mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" pb={4}>
              <HStack spacing={3}>
                <Box p={2} borderRadius="lg" bg="red.50">
                  <Icon as={FaTrash} boxSize={5} color="red.500" />
                </Box>
                <Text>{intl.formatMessage({ id: 'app.deleteProduction' })}</Text>
              </HStack>
            </AlertDialogHeader>

            <AlertDialogBody pb={6}>
              {/* OV-ST-C02 (2026-11-13): the server refuses to delete a season that holds
                  activities, finished or not, because records are kept 5 years from the day
                  they are logged. So the dialog no longer offers a delete that takes them with
                  it: it says why, and how to remove a season started by mistake. */}
              {seasonHasActivities ? (
                <Text color="gray.600" data-testid="delete-season-has-records">
                  {intl.formatMessage(
                    { id: 'app.deleteSeasonHasRecords' },
                    { eventCount: currentHistory.events.length }
                  )}
                </Text>
              ) : (
                <Text color="gray.600">
                  {intl.formatMessage({ id: 'app.deleteProductionConfirm' })}
                </Text>
              )}
            </AlertDialogBody>

            <AlertDialogFooter pt={4}>
              <HStack spacing={3} w="full" justify="flex-end">
                <Button
                  ref={cancelRef}
                  onClick={onDeleteClose}
                  variant="ghost"
                  size="lg"
                  color="gray.600"
                  borderRadius="lg"
                  _hover={{ bg: 'gray.100' }}>
                  {intl.formatMessage({ id: seasonHasActivities ? 'app.close' : 'app.cancel' })}
                </Button>
                <Button
                  display={seasonHasActivities ? 'none' : undefined}
                  leftIcon={<Icon as={FaTrash} />}
                  onClick={handleDeleteProduction}
                  size="lg"
                  borderRadius="lg"
                  fontWeight="semibold"
                  isLoading={isDeleting}
                  loadingText={intl.formatMessage({ id: 'parcel.deleting' })}
                  bg="transparent"
                  color="red.500"
                  border="1px solid"
                  borderColor="red.500"
                  _hover={{
                    bg: 'red.50',
                    color: 'red.600',
                    borderColor: 'red.600'
                  }}
                  transition="all 0.2s">
                  {intl.formatMessage({ id: 'app.delete' })}
                </Button>
              </HStack>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Card>
  );
};

export default TrackList;
