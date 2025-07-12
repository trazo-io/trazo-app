// Chakra imports
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardBody,
  Box,
  VStack,
  CircularProgress,
  Flex,
  Icon,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useBreakpointValue,
  Tooltip
} from '@chakra-ui/react';
import { FaRegCheckCircle, FaRegDotCircle, FaSeedling } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { IoCheckmarkDoneCircleSharp } from 'react-icons/io5';

import { useGetParcelHistoriesQuery } from 'store/api/historyApi';
import CarbonDashboardTableRow from './CarbonDashboardTableRow';

const HistoryCard = ({ title, amount, captions }) => {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const navigate = useNavigate();

  // Move useBreakpointValue to top level to fix hooks rule violation
  const hideTeamColumn = useBreakpointValue({ base: true, md: false });

  const currentCompany = useSelector((state) => state.company.currentCompany);

  const { parcelId, establishmentId } = useParams();

  const { data, error, isLoading, isFetching, refetch } = useGetParcelHistoriesQuery(
    { companyId: currentCompany?.id, establishmentId, parcelId },
    {
      skip: !parcelId || !establishmentId || !currentCompany || currentCompany?.id === undefined
    }
  );

  // Enhanced captions for carbon transparency focus
  const carbonFocusedCaptions = [
    'Production Overview', // Combined time frame and production info
    'Product & Verification', // Combined product and verification status
    'Team', // Members column (hidden on mobile)
    'Carbon Impact' // Enhanced carbon score with impact level
  ];

  return (
    <Card
      bg={cardBgColor}
      borderRadius="xl"
      boxShadow="lg"
      overflow="hidden"
      h={{ sm: 'fit-content', xl: 'fit-content' }}
      transition="all 0.3s ease"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
      border="1px solid"
      borderColor={borderColor}
      // Explicit background color for production builds
      style={{
        backgroundColor: cardBgColor === 'white' ? '#ffffff' : '#2D3748'
      }}>
      <CardHeader p="20px" pb="12px">
        <Flex direction="column" gap={4}>
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={3}>
              <Text fontSize="xl" color={textColor} fontWeight="bold">
                {intl.formatMessage({ id: 'app.productions' })}
              </Text>
              <Badge
                colorScheme="green"
                variant="solid"
                borderRadius="full"
                px={3}
                py={1}
                fontSize="xs"
                textTransform="none">
                Carbon Tracked
              </Badge>
            </Flex>
            <Tooltip
              label={
                data &&
                data.some(
                  (production) =>
                    !production.finish_date || new Date(production.finish_date) > new Date()
                )
                  ? 'Complete current production before starting a new one'
                  : 'Start a new production cycle'
              }
              placement="bottom-end">
              <Button
                size="sm"
                colorScheme="green"
                variant="ghost"
                leftIcon={<Icon as={IoCheckmarkDoneCircleSharp} />}
                isDisabled={
                  data &&
                  data.some(
                    (production) =>
                      !production.finish_date || new Date(production.finish_date) > new Date()
                  )
                }
                onClick={() =>
                  navigate(
                    `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/add`
                  )
                }>
                New Production
              </Button>
            </Tooltip>
          </Flex>

          <Flex align="center" gap={2}>
            <Icon as={IoCheckmarkDoneCircleSharp} color="green.500" w={5} h={5} />
            <Text fontSize="sm" color="gray.500" fontWeight="medium">
              <Text fontWeight="bold" as="span" color={textColor}>
                {amount}{' '}
                {amount > 1
                  ? intl.formatMessage({ id: 'app.productions' }).toLowerCase()
                  : intl.formatMessage({ id: 'app.production' }).toLowerCase()}
              </Text>{' '}
              {amount > 1
                ? intl.formatMessage({ id: 'app.completedThisYearPlural' })
                : intl.formatMessage({ id: 'app.completedThisYearSingular' })}
            </Text>
          </Flex>
        </Flex>
      </CardHeader>

      {isLoading ? (
        <Flex width={'100%'} height={'120px'} justifyContent={'center'} alignItems="center">
          <CircularProgress isIndeterminate color="green.500" size="40px" />
        </Flex>
      ) : (
        <CardBody p="20px" pt="0px">
          <Box
            bg={cardBgColor}
            borderRadius="lg"
            // Explicit background for production
            style={{
              backgroundColor: cardBgColor === 'white' ? '#ffffff' : '#2D3748'
            }}>
            {data && data.length > 0 ? (
              <Box overflowX="auto">
                <Table variant="simple" size="md">
                  <Thead>
                    <Tr>
                      {carbonFocusedCaptions.map((caption, index) => (
                        <Th
                          key={index}
                          color="gray.500"
                          fontSize="xs"
                          fontWeight="bold"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          py={4}
                          display={index === 2 && hideTeamColumn ? 'none' : 'table-cell'}>
                          {caption}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.map((production, index) => (
                      <CarbonDashboardTableRow
                        key={production.id}
                        production={production}
                        onClick={() =>
                          navigate(
                            `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/${production.id}`
                          )
                        }
                      />
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : (
              <VStack spacing={4} py={8}>
                <Icon as={FaSeedling} color="gray.400" boxSize={12} />
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    No productions yet
                  </Text>
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    Start your first production to track carbon footprint and sustainability metrics
                  </Text>
                </VStack>
                <Button
                  leftIcon={<Icon as={FaSeedling} />}
                  colorScheme="green"
                  onClick={() =>
                    navigate(
                      `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/add`
                    )
                  }>
                  Start Production
                </Button>
              </VStack>
            )}
          </Box>
        </CardBody>
      )}
    </Card>
  );
};

export default HistoryCard;
