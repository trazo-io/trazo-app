// Chakra imports
import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  CircularProgress,
  Grid,
  VStack,
  HStack
} from '@chakra-ui/react';
import { NavLink, useLocation, useMatch, useParams } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import {
  barChartDataCharts1,
  barChartOptionsCharts1,
  lineBarChartData,
  lineBarChartOptions
} from 'variables/charts';
import {
  useGetEstablishmentHistoriesQuery,
  useGetEstablishmentProductsQuery,
  useGetEstablishmentScansVsSalesChartInfoQuery
} from 'store/api/productApi';

import BarChart from 'components/Charts/BarChart';
import {
  StandardPage,
  StandardCard,
  StandardButton,
  StandardSelect
} from 'components/Design/StandardComponents';
import { IoIosArrowDown } from 'react-icons/io';
import LineBarChart from 'components/Charts/LineBarChart';
import LineChart from 'components/Charts/LineChart';
import MiniStatistics from '../Dashboard/components/MiniStatistics';
import Reviews from './components/Reviews';
import SalesOverview from './components/SalesOverview';
import ScansList from './components/ScansList';
import { historyApi } from 'store/api/historyApi';
import { productApi } from 'store/api/productApi';
import { scansData } from 'variables/general';
import { useGetEstablishmentProductReputationQuery } from 'store/api/reviewApi';
import { useGetScansByEstablishmentQuery } from 'store/api/historyApi';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

// Custom icons
// assets

export default function CommercialView() {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white');
  const { establishmentId } = useParams();
  const chartRef = useRef(null);
  const reputationChartRef = useRef(null);
  const [filters, setFilters] = useState({
    parcel: null,
    product: null,
    production: null,
    period: { id: 'week', name: intl.formatMessage({ id: 'app.thisWeek' }) }
  });
  const [currentEstablishmentId, setCurrentEstablishmentId] = useState(null);
  const [establishment, setEstablishment] = useState(null);
  const [currentView, setCurrentView] = useState(null);

  const cardColor = useColorModeValue('white', 'gray.700');

  const establishments = useSelector((state) => state.company.currentCompany?.establishments);

  const currentCompany = useSelector((state) => state.company.currentCompany);

  const queryParams = React.useMemo(
    () => ({
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      periodId: filters.period.id,
      productId: filters.product?.id,
      parcelId: filters.parcel?.id,
      productionId: filters.production?.id
    }),
    [
      currentCompany?.id,
      currentEstablishmentId,
      filters.period.id,
      filters.product?.id,
      filters.parcel?.id,
      filters.production?.id
    ]
  );

  const { data: dataEstablishmentScans } = useGetScansByEstablishmentQuery(
    {
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      period: filters.period.id,
      productId: filters.product?.id,
      parcelId: filters.parcel?.id,
      productionId: filters.production?.id
    },
    {
      skip:
        !currentEstablishmentId ||
        !filters?.period ||
        !currentCompany ||
        currentCompany?.id === undefined
    }
  );

  const { data: dataEstablishmentScansVsSaleInfo, isFetching } =
    useGetEstablishmentScansVsSalesChartInfoQuery(queryParams, {
      skip: !queryParams.companyId || !queryParams.establishmentId || !queryParams.periodId,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true
    });

  const {
    data: dataEstablishmentProductsReputation,
    isFetching: isFetchingEstablishmentProductsReputation
  } = useGetEstablishmentProductReputationQuery(queryParams, {
    skip: !queryParams.companyId || !queryParams.establishmentId || !queryParams.periodId,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true
  });

  const [fetchScansByEstablishment, { data: filteredScans, isLoading: isLoadingScans }] =
    historyApi.endpoints.getScansByEstablishment.useLazyQuery();

  const [
    getEstablishmentProducts,
    { data: establishmentProducts, isLoading: isLoadingEstablishmentProducts }
  ] = productApi.endpoints.getEstablishmentProducts.useLazyQuery();

  // to check for active links and opened collapses
  let location = useLocation();

  const iconBoxInside = useColorModeValue('white', 'white');
  let mainText = useColorModeValue('gray.700', 'gray.200');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const updateEstablishment = async () => {
      if (establishments) {
        const establishment = establishments.find((est) => est.id.toString() === establishmentId);

        if (establishment) {
          // First update establishment ID
          setCurrentEstablishmentId(establishmentId);

          // Then update establishment
          setEstablishment(establishment);

          // Wait for next tick before updating filters
          await new Promise((resolve) => setTimeout(resolve, 0));

          // Finally update filters
          setFilters((prev) => ({
            parcel: null,
            product: null,
            production: null,
            period: {
              id: 'week',
              name: intl.formatMessage({ id: 'app.thisWeek' })
            }
          }));
        }
      }
    };

    updateEstablishment();
  }, [establishmentId, establishments, intl]);

  const { data: dataProducts } = useGetEstablishmentProductsQuery(
    { companyId: currentCompany?.id, establishmentId: currentEstablishmentId },
    { skip: !currentEstablishmentId || !currentCompany || currentCompany?.id === undefined }
  );

  const { data: dataHistories } = useGetEstablishmentHistoriesQuery(
    {
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      periodId: filters.period?.id,
      parcelId: filters.parcel?.id,
      productId: filters.product?.id
    },
    {
      skip:
        !currentCompany ||
        !currentEstablishmentId ||
        !filters?.period ||
        !filters?.parcel ||
        !filters?.product ||
        currentCompany?.id === undefined
    }
  );

  const onParcelFilterChange = (parcel) => {
    setFilters({
      ...filters,
      parcel: parcel ? { id: parcel.id, name: parcel.name } : null
    });
    getEstablishmentProducts({
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      parcelId: parcel?.id
    });
  };

  const onProductFilterChange = (product) => {
    setFilters({
      ...filters,
      product: product ? { id: product.id, name: product.name } : null
    });
  };

  const onProductionFilterChange = (production) => {
    setFilters({
      ...filters,
      production: production ? { id: production.id, period: production.period } : null
    });
  };

  const onPeriodFilterChange = (period) => {
    setFilters({
      ...filters,
      period: period ? { id: period.id, name: period.name } : null
    });
  };

  const formatCategories = (options: string[]) => {
    if (!options) return [];

    switch (filters.period.id) {
      case 'week':
        return options.map((day) => intl.formatMessage({ id: `app.days.${day.toLowerCase()}` }));
      case 'year':
        return options.map((month) =>
          intl.formatMessage({ id: `app.months.${month.toLowerCase()}` })
        );
      default:
        return options;
    }
  };

  useEffect(() => {
    console.log('currentEstablishmentId', currentEstablishmentId);
    let isSubscribed = true;

    const updateChart = async () => {
      try {
        // Wait for next tick to ensure chart is mounted
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (!isSubscribed || !chartRef.current?.chart) return;

        // Reset chart first
        chartRef.current.chart.updateOptions({
          ...lineBarChartOptions,
          chart: {
            ...lineBarChartOptions.chart,
            animations: {
              enabled: false
            }
          }
        });

        if (dataEstablishmentScansVsSaleInfo?.scans_vs_sales) {
          const series = lineBarChartData.map((data) => ({
            name: data.name,
            type: data.type,
            data:
              data.name === 'Sales'
                ? dataEstablishmentScansVsSaleInfo.scans_vs_sales.series.sales || []
                : dataEstablishmentScansVsSaleInfo.scans_vs_sales.series.scans || []
          }));

          chartRef.current.chart.updateOptions(
            {
              ...lineBarChartOptions,
              chart: {
                ...lineBarChartOptions.chart,
                animations: {
                  enabled: true,
                  dynamicAnimation: {
                    speed: 350
                  }
                }
              },
              xaxis: {
                ...lineBarChartOptions.xaxis,
                categories: formatCategories(
                  dataEstablishmentScansVsSaleInfo.scans_vs_sales.options
                ),
                labels: {
                  show: true,
                  style: {
                    colors: textColor,
                    fontSize: '12px'
                  }
                }
              }
            },
            false,
            true
          );

          chartRef.current.chart.updateSeries(series);
        }
      } catch (error) {
        console.error('Error updating chart:', error, {
          hasChartRef: !!chartRef.current,
          hasChartInstance: !!chartRef.current?.chart,
          hasData: !!dataEstablishmentScansVsSaleInfo?.scans_vs_sales
        });
      }
    };

    updateChart();

    return () => {
      isSubscribed = false;
    };
  }, [
    dataEstablishmentScansVsSaleInfo,
    textColor,
    filters.period.id,
    intl,
    currentEstablishmentId
  ]);

  useEffect(() => {
    let isSubscribed = true;

    const updateReputationChart = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (!isSubscribed || !reputationChartRef.current?.chart) return;

        // Reset chart first
        reputationChartRef.current.chart.updateOptions({
          ...barChartOptionsCharts1,
          chart: {
            ...barChartOptionsCharts1.chart,
            animations: {
              enabled: false
            }
          }
        });

        if (dataEstablishmentProductsReputation?.products_reputation) {
          reputationChartRef.current.chart.updateSeries([
            {
              name: 'Average',
              data: dataEstablishmentProductsReputation.products_reputation.series
            }
          ]);

          reputationChartRef.current.chart.updateOptions({
            ...barChartOptionsCharts1,
            chart: {
              ...barChartOptionsCharts1.chart,
              animations: {
                enabled: true
              },
              toolbar: {
                show: false
              }
            },
            xaxis: {
              ...barChartOptionsCharts1.xaxis,
              categories: dataEstablishmentProductsReputation.products_reputation.options,
              labels: {
                show: true,
                style: {
                  colors: textColor,
                  fontSize: '12px'
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Error updating reputation chart:', error, {
          hasChartRef: !!reputationChartRef.current,
          hasChartInstance: !!reputationChartRef.current?.chart,
          hasData: !!dataEstablishmentProductsReputation?.products_reputation
        });
      }
    };

    updateReputationChart();

    return () => {
      isSubscribed = false;
    };
  }, [dataEstablishmentProductsReputation, textColor, currentEstablishmentId]);

  const scansColumnsNames = [
    intl.formatMessage({ id: 'app.date' }),
    intl.formatMessage({ id: 'app.product' }),
    intl.formatMessage({ id: 'app.location' }),
    intl.formatMessage({ id: 'app.parcel' }),
    intl.formatMessage({ id: 'app.comment' })
  ];

  return (
    <Box w="100%" minH="100vh">
      {/* Header Section */}
      <Box bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)" pt="120px" pb="80px" px={4}>
        <Box maxW="full" mx="auto">
          <VStack spacing={4} textAlign="center">
            <Text fontSize="3xl" color="green.600" fontWeight="bold" letterSpacing="-0.02em">
              {intl.formatMessage({ id: 'app.commercialDashboard' }) || 'Commercial Dashboard'}
            </Text>
            <Text fontSize="lg" color="gray.600" fontWeight="normal" maxW="70%" lineHeight="1.7">
              Monitorea y gestiona tus escaneos y resultados con análisis en tiempo real
            </Text>
          </VStack>
        </Box>
      </Box>

      {/* Main Content */}
      <Box maxW="full" mx="auto" px={6} mt="-40px" position="relative" zIndex={10}>
        {/* Filters Section */}
        <StandardCard title="Filtros de Análisis" variant="outline">
          <VStack spacing={6}>
            <Flex
              direction={{ base: 'column', lg: 'row' }}
              gap={6}
              w="100%"
              align={{ base: 'stretch', lg: 'center' }}
              justify="space-between"
            >
              <HStack spacing={4} flex={1} wrap="wrap">
                <Menu>
                  <MenuButton
                    as={StandardButton}
                    variant="outline"
                    rightIcon={<IoIosArrowDown />}
                    size="md"
                    minW="180px"
                  >
                    {filters.parcel
                      ? filters.parcel.name
                      : intl.formatMessage({ id: 'app.allParcels' })}
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => onParcelFilterChange(null)} color="gray.500">
                      {intl.formatMessage({ id: 'app.allParcels' })}
                    </MenuItem>
                    <MenuDivider />
                    {establishment &&
                      establishment.parcels.map((parcel, index) => (
                        <MenuItem
                          key={index}
                          onClick={() => onParcelFilterChange(parcel)}
                          color="gray.500"
                        >
                          {parcel.name}
                        </MenuItem>
                      ))}
                  </MenuList>
                </Menu>

                <Menu>
                  <MenuButton
                    as={StandardButton}
                    variant="outline"
                    rightIcon={<IoIosArrowDown />}
                    size="md"
                    minW="180px"
                  >
                    {filters.product
                      ? filters.product.name
                      : intl.formatMessage({ id: 'app.allProducts' })}
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => onProductFilterChange(null)} color="gray.500">
                      {intl.formatMessage({ id: 'app.allProducts' })}
                    </MenuItem>
                    <MenuDivider />
                    {filters?.parcel
                      ? establishmentProducts &&
                        establishmentProducts.map((product, index) => (
                          <MenuItem
                            key={index}
                            onClick={() => onProductFilterChange(product)}
                            color="gray.500"
                          >
                            {product.name}
                          </MenuItem>
                        ))
                      : dataProducts &&
                        dataProducts.map((product, index) => (
                          <MenuItem
                            key={index}
                            onClick={() => onProductFilterChange(product)}
                            color="gray.500"
                          >
                            {product.name}
                          </MenuItem>
                        ))}
                  </MenuList>
                </Menu>

                <Menu>
                  <MenuButton
                    as={StandardButton}
                    variant="outline"
                    rightIcon={<IoIosArrowDown />}
                    size="md"
                    minW="180px"
                    isDisabled={filters.product == null || filters.parcel == null}
                  >
                    {filters.production
                      ? filters.production.period
                      : intl.formatMessage({ id: 'app.allProductions' })}
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => onProductionFilterChange(null)} color="gray.500">
                      {intl.formatMessage({ id: 'app.allProductions' })}
                    </MenuItem>
                    <MenuDivider />
                    {dataHistories &&
                      dataHistories.map((history, index) => (
                        <MenuItem
                          key={index}
                          onClick={() => onProductionFilterChange(history)}
                          color="gray.500"
                        >
                          {history.period}
                        </MenuItem>
                      ))}
                  </MenuList>
                </Menu>
              </HStack>

              <Menu>
                <MenuButton
                  as={StandardButton}
                  variant="primary"
                  rightIcon={<IoIosArrowDown />}
                  size="md"
                  minW="150px"
                >
                  {filters.period.name}
                </MenuButton>
                <MenuList>
                  <MenuItem
                    onClick={() =>
                      onPeriodFilterChange({
                        id: 'week',
                        name: intl.formatMessage({ id: 'app.thisWeek' })
                      })
                    }
                    color="gray.500"
                  >
                    {intl.formatMessage({ id: 'app.thisWeek' })}
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      onPeriodFilterChange({
                        id: 'month',
                        name: intl.formatMessage({ id: 'app.thisMonth' })
                      })
                    }
                    color="gray.500"
                  >
                    {intl.formatMessage({ id: 'app.thisMonth' })}
                  </MenuItem>
                  <MenuItem
                    onClick={() =>
                      onPeriodFilterChange({
                        id: 'year',
                        name: intl.formatMessage({ id: 'app.thisYear' })
                      })
                    }
                    color="gray.500"
                  >
                    {intl.formatMessage({ id: 'app.thisYear' })}
                  </MenuItem>
                </MenuList>
              </Menu>
            </Flex>
          </VStack>
        </StandardCard>
        {/* Main Dashboard Content */}
        <VStack spacing={6} w="100%">
          {/* Scans Table - Full Width */}
          <Box w="100%">
            <ScansList
              title={intl.formatMessage({ id: 'app.scans' })}
              labels={scansColumnsNames}
              scansData={dataEstablishmentScans}
            />
          </Box>

          {/* Charts Row - Side by Side */}
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} w="100%">
            {/* Scans vs Sales Chart */}
            <StandardCard
              title={intl.formatMessage({ id: 'app.numberScansAndSales' })}
              variant="elevated"
            >
              <Box w="100%" h="350px">
                {isFetching ? (
                  <Flex justify="center" align="center" h="100%">
                    <CircularProgress isIndeterminate color="green.500" />
                    <Text ml={4} color={textColor}>
                      Cargando datos del gráfico...
                    </Text>
                  </Flex>
                ) : !dataEstablishmentScansVsSaleInfo?.scans_vs_sales ? (
                  <Flex justify="center" align="center" h="100%">
                    <Text color={textColor}>No hay datos disponibles</Text>
                  </Flex>
                ) : (
                  <LineBarChart
                    chartRef={chartRef}
                    chartData={lineBarChartData.map((data) => ({
                      name: data.name,
                      type: data.type,
                      data:
                        data.name === 'Sales'
                          ? dataEstablishmentScansVsSaleInfo.scans_vs_sales.series.sales || []
                          : dataEstablishmentScansVsSaleInfo.scans_vs_sales.series.scans || []
                    }))}
                    chartOptions={{
                      ...lineBarChartOptions,
                      chart: {
                        ...lineBarChartOptions.chart,
                        animations: {
                          enabled: true,
                          dynamicAnimation: {
                            speed: 350
                          }
                        }
                      },
                      xaxis: {
                        ...lineBarChartOptions.xaxis,
                        categories: formatCategories(
                          dataEstablishmentScansVsSaleInfo.scans_vs_sales.options
                        ),
                        labels: {
                          show: true,
                          style: {
                            colors: textColor,
                            fontSize: '12px'
                          }
                        }
                      }
                    }}
                  />
                )}
              </Box>
            </StandardCard>

            {/* Products Reputation Chart */}
            <StandardCard
              title={`${intl.formatMessage({ id: 'app.productsReputation' })} ⭐️`}
              variant="elevated"
            >
              <Box w="100%" h="350px">
                {isFetchingEstablishmentProductsReputation ? (
                  <Flex justify="center" align="center" h="100%">
                    <CircularProgress isIndeterminate color="green.500" />
                  </Flex>
                ) : (
                  <BarChart
                    chartRef={reputationChartRef}
                    chartData={[
                      {
                        name: 'Average',
                        data: dataEstablishmentProductsReputation?.products_reputation?.series || []
                      }
                    ]}
                    chartOptions={{
                      ...barChartOptionsCharts1,
                      chart: {
                        ...barChartOptionsCharts1.chart,
                        animations: {
                          enabled: true
                        },
                        toolbar: {
                          show: false
                        }
                      },
                      xaxis: {
                        ...barChartOptionsCharts1.xaxis,
                        categories:
                          dataEstablishmentProductsReputation?.products_reputation?.options || [],
                        labels: {
                          show: true,
                          style: {
                            colors: textColor,
                            fontSize: '12px'
                          }
                        }
                      }
                    }}
                  />
                )}
              </Box>
            </StandardCard>
          </Grid>
        </VStack>

        {/* Reviews Section - Full Width */}
        <Box w="100%">
          <Reviews />
        </Box>
      </Box>
    </Box>
  );
}
