// Chakra imports
import {
  Button,
  CircularProgress,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
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
  FaRegCheckCircle,
  FaRegDotCircle,
  FaClock,
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
import { IoEllipsisVerticalSharp } from 'react-icons/io5';
import EnhancedTimelineRow from 'components/Tables/EnhancedTimelineRow';
import { getTimelineEventTitle } from 'utils/eventDescriptions';
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

  const { data, error, isLoading, isFetching, refetch } = useGetCurrentHistoryQuery(
    {
      companyId: currentCompany?.id,
      farmId,
      parcelId: parcelId || ''
    },
    {
      skip: !parcelId || !currentCompany || !farmId || currentCompany?.id === undefined,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      pollingInterval: eventsPolling ? 3000 : 0
    }
  );

  // Start/stop polling based on events_status
  useEffect(() => {
    setEventsPolling(data?.events_status === 'pending');
  }, [data?.events_status]);

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
          error?.data?.detail ||
          error?.data?.message ||
          intl.formatMessage({ id: 'app.productionDeleteError' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <Card
      key={`track-list-${parcelId}`}
      h={{ base: '700px', md: '700px' }}
      maxH={{ base: '700px', md: '700px' }}
      minW={{ base: '100%', md: '400px' }}
      w="100%"
      className="trazo-card"
    >
      <CardHeader px={{ base: 4, md: 6 }} py={5} data-tour="current-production">
        <Flex direction="column" w="100%">
          {/* Header with consistent height */}
          <Flex justify="space-between" align="center" pb={4}>
            <HStack spacing={3}>
              <Text fontSize={{ base: 'md', md: 'lg' }} color={textColor} fontWeight="600">
                {intl.formatMessage({ id: 'app.currentProduction' })}
              </Text>
              {currentHistory?.product && (
                <Badge
                  bg="green.50"
                  color="green.700"
                  borderRadius="md"
                  px={2}
                  py={1}
                  fontSize="xs"
                  fontWeight="500"
                  textTransform="none"
                  w="fit-content"
                  border="1px solid"
                  borderColor="green.200"
                >
                  {currentHistory?.product}
                </Badge>
              )}
            </HStack>
            {canWrite && (
              <Menu isOpen={isOpen1} onClose={onClose1}>
                <MenuButton
                  onClick={onOpen1}
                  alignSelf="flex-start"
                  disabled={!currentHistory?.product}
                  cursor={!currentHistory?.product ? 'default' : 'pointer'}
                >
                  <Icon as={IoEllipsisVerticalSharp} color="gray.400" w="20px" h="20px" />
                </MenuButton>
                <MenuList>
                  <MenuItem
                    py={3}
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${currentHistory?.id}/change`
                      )
                    }
                  >
                    <Flex color={textColor} cursor="pointer" align="center" p="4px">
                      <Text fontSize="sm" fontWeight="500">
                        {intl.formatMessage({ id: 'app.edit' }).toUpperCase()}
                      </Text>
                    </Flex>
                  </MenuItem>
                  <MenuItem
                    py={3}
                    onClick={() => {
                      onClose1();
                      onDeleteOpen();
                    }}
                  >
                    <Flex color="red.500" cursor="pointer" align="center" p="4px">
                      <Text fontSize="sm" fontWeight="500">
                        {intl.formatMessage({ id: 'app.delete' }).toUpperCase()}
                      </Text>
                    </Flex>
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </Flex>

          <Divider />

          {/* Production info moved to be more compact */}
          {currentHistory?.product && (
            <HStack justify="space-between" pt={4}>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                {intl.formatMessage({ id: 'parcel.started' })}{' '}
                {new Date(currentHistory?.start_date).toLocaleDateString()}
              </Text>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                {intl.formatMessage({ id: 'parcel.activeProduction' })}
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
        data-tour="events-timeline"
      >
        <Box
          maxH={{ base: '400px', md: '450px' }}
          overflowY="auto"
          pt={2}
          pr={{ base: '8px', md: '12px' }}
          sx={{
            '&::-webkit-scrollbar': {
              width: '8px'
            },
            '&::-webkit-scrollbar-track': {
              bg: 'gray.100',
              borderRadius: 'full'
            },
            // Neutral, not brand: a scrollbar says "there is more content", which is
            // not a brand statement, and green.500 on this track is 2.64:1 anyway.
            '&::-webkit-scrollbar-thumb': {
              bg: 'gray.500',
              borderRadius: 'full',
              _hover: {
                bg: 'gray.600'
              }
            }
          }}
        >
          <Flex direction="column" width={'100%'} pb={4}>
            {isLoading || isFetching ? (
              <Flex width={'100%'} height={'120px'} justifyContent={'center'} alignItems="center">
                <CircularProgress isIndeterminate color="green.500" size="40px" />
              </Flex>
            ) : (
              <>
                {currentHistory?.events?.map((event, index, arr) => {
                  return (
                    <EnhancedTimelineRow
                      minW={{ base: '100%', md: '390px' }}
                      key={`${parcelId}-${event.id}-${index}`}
                      logo={event.certified ? FaRegCheckCircle : FaRegDotCircle}
                      title={getTimelineEventTitle(event, intl)}
                      date={new Date(event.date).toDateString()}
                      color={event.certified ? 'green.300' : 'blue.400'}
                      index={index}
                      arrLength={arr.length}
                      url={`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/${event.id}?event_type=${event.event_type}`}
                      event={event}
                      members={currentHistory?.members || []}
                      isLast={index === arr.length - 1}
                      onEventClick={() => handleEventClick(event)}
                    />
                  );
                })}
                {/* Progressive loading indicator: events exist but more are being created */}
                {currentHistory?.events?.length > 0 &&
                  currentHistory?.events_status === 'pending' && (
                    <HStack spacing={2} justify="center" py={3} px={4}>
                      <CircularProgress isIndeterminate color="green.500" size="16px" />
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({ id: 'parcel.creatingMoreEvents' })}
                      </Text>
                    </HStack>
                  )}
                {!currentHistory?.events?.length > 0 && !currentHistory?.product && (
                  <VStack spacing={8} py={16} align="center" px={6}>
                    <VStack spacing={4} textAlign="center">
                      <Icon as={FaSeedling} color="green.400" boxSize={12} />
                      <VStack spacing={2}>
                        <Text fontSize="lg" fontWeight="bold" color={textColor}>
                          {intl.formatMessage({ id: 'parcel.noCurrentProductionYet' })}
                        </Text>
                        <Text fontSize="sm" color="gray.500" maxW="350px" lineHeight="1.5">
                          {intl.formatMessage({ id: 'parcel.startProductionDescription' })}
                        </Text>
                      </VStack>
                    </VStack>
                  </VStack>
                )}
                {/* Pending: background event creation in progress, no events yet */}
                {!(currentHistory?.events?.length > 0) &&
                  currentHistory?.product &&
                  currentHistory?.events_status === 'pending' && (
                    <VStack spacing={8} py={8} align="center" px={6}>
                      <VStack spacing={4} textAlign="center">
                        <CircularProgress isIndeterminate color="green.500" />
                        <VStack spacing={2}>
                          <Text fontSize="md" fontWeight="bold" color={textColor}>
                            {intl.formatMessage({ id: 'parcel.settingUpEvents' })}
                          </Text>
                          <Text fontSize="sm" color="gray.500" maxW="300px" lineHeight="1.5">
                            {intl.formatMessage({ id: 'parcel.settingUpEventsDescription' })}
                          </Text>
                        </VStack>
                      </VStack>
                    </VStack>
                  )}
                {/* Failed: background event creation failed */}
                {!(currentHistory?.events?.length > 0) &&
                  currentHistory?.product &&
                  currentHistory?.events_status === 'failed' && (
                    <VStack spacing={8} py={8} align="center" px={6}>
                      <VStack spacing={4} textAlign="center">
                        <Icon as={FaClock} color="orange.400" boxSize={10} />
                        <VStack spacing={2}>
                          <Text fontSize="md" fontWeight="bold" color={textColor}>
                            {intl.formatMessage({ id: 'parcel.eventSetupFailed' })}
                          </Text>
                          <Text fontSize="sm" color="gray.500" maxW="300px" lineHeight="1.5">
                            {intl.formatMessage({ id: 'parcel.eventSetupFailedDescription' })}
                          </Text>
                        </VStack>
                      </VStack>
                    </VStack>
                  )}
                {/* Normal empty state: production exists, no events, not pending */}
                {!(currentHistory?.events?.length > 0) &&
                  currentHistory?.product &&
                  currentHistory?.events_status !== 'pending' &&
                  currentHistory?.events_status !== 'failed' && (
                    <VStack spacing={8} py={8} align="center" px={6}>
                      <VStack spacing={4} textAlign="center">
                        <Icon as={FaClock} color="blue.400" boxSize={10} />
                        <VStack spacing={2}>
                          <Text fontSize="md" fontWeight="bold" color={textColor}>
                            {intl.formatMessage({ id: 'parcel.noEventsRecordedYet' })}
                          </Text>
                          <Text fontSize="sm" color="gray.500" maxW="300px" lineHeight="1.5">
                            {intl.formatMessage({ id: 'parcel.addFirstEventDescription' })}
                          </Text>
                        </VStack>
                      </VStack>
                    </VStack>
                  )}
              </>
            )}
          </Flex>
        </Box>
      </CardBody>
      {/* Modern Action Buttons - Single Add Event Dropdown */}
      {!isLoading && !isFetching && (
        <Flex
          justify={{ base: 'stretch', smd: 'flex-end' }}
          gap={3}
          p={{ base: '16px', md: '20px' }}
        >
          {/* Existence of the CURRENT PRODUCTION decides the CTA. This used to test
              `!currentHistory?.product`, so a production without a product row rendered
              its timeline above while the button still said "Start production". */}
          {!currentHistory?.id ? (
            <Button
              bg={bgButton}
              color="white"
              fontSize="sm"
              fontWeight="semibold"
              variant="no-hover"
              minW={{ base: '100%', smd: '140px', md: '160px' }}
              w={{ base: '100%', smd: 'auto' }}
              h="44px"
              borderRadius="12px"
              _hover={{
                transform: 'translateY(-1px)',
                boxShadow: 'lg'
              }}
              transition="all 0.2s"
              onClick={() =>
                navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/add`)
              }
            >
              {intl.formatMessage({ id: 'app.startProduction' })}
            </Button>
          ) : (
            <Flex
              data-tour="add-event-actions"
              gap={{ base: 2, md: 3 }}
              justify={{ base: 'stretch', smd: 'flex-end' }}
              align={{ base: 'stretch', smd: 'center' }}
              w="100%"
              direction={{ base: 'column', smd: 'row' }}
            >
              {/* WS-4b entry convergence: Add event opens the SAME "What did you do?"
                  verb modal the Activities page uses (shared VerbPickerGrid) — all ten
                  verbs always visible, never a scroll-hidden dropdown subset. */}
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
                  onClick={onAddEventMenuOpen}
                >
                  {intl.formatMessage({ id: 'app.addEvent' })}
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
                  }
                >
                  <Text as="span" display={{ base: 'none', smd: 'inline' }}>
                    {intl.formatMessage({ id: 'app.finishProduction' })}
                  </Text>
                  <Text as="span" display={{ base: 'inline', smd: 'none' }}>
                    {intl.formatMessage({ id: 'app.finish' })}
                  </Text>
                </Button>
              )}
            </Flex>
          )}
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
        }
      >
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
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />

      {/* Delete Production Confirmation Dialog - Trazo Design Pattern */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
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
              <VStack align="start" spacing={3}>
                <Text color="gray.600">
                  {intl.formatMessage({ id: 'app.deleteProductionConfirm' })}
                </Text>
                {currentHistory?.events?.length > 0 && (
                  <Box p={3} bg="red.50" borderRadius="lg" w="full">
                    <Text fontSize="sm" color="red.700" fontWeight="medium">
                      {intl.formatMessage(
                        { id: 'app.deleteProductionWarning' },
                        { eventCount: currentHistory.events.length }
                      )}
                    </Text>
                  </Box>
                )}
              </VStack>
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
                  _hover={{ bg: 'gray.100' }}
                >
                  {intl.formatMessage({ id: 'app.cancel' })}
                </Button>
                <Button
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
                  transition="all 0.2s"
                >
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
