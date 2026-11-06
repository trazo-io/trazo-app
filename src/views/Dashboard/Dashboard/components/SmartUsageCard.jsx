/**
 * Farm home: records and buyer page, as counts.
 *
 * Two groups of plain rows, the same shape as the readiness card above it: what the farm has on
 * record (activities, seasons underway, finished seasons) and what its QR page saw in the last
 * 30 days (scans, unique visitors). One text link to the buyer page.
 *
 * Rebuilt 2026-11-05. The card it replaces was titled "Share Your Farm's Page" while most of it
 * was about records, put three tinted stat tiles over a green-to-blue gradient box, decorated the
 * counts with a leaf, a shield and a lightning bolt, and printed scan growth in green ("367% scan
 * growth" on a farm with 14 scans). It also carried two dormant headlines that could fire: "Ready
 * to Scale / Unlock Premium Features" for a retired-ladder contract near its production cap, and
 * "Building Trust / Your transparency efforts are creating consumer confidence" past 500 scans, a
 * claim about shoppers nothing measures. Counts only, no score, no verdict
 * (.claude/rules/transparency-first.md, "Dashboard Metrics").
 *
 * Unique visitors can be UNKNOWN (`consumer_reach: null`) when scans carry no fingerprint. It
 * then reads "Not recorded", never an estimate.
 */

import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FaQrcode } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { FieldList, InfoRow } from 'components/Design/ProfileField';
import { TOUCH_TARGET } from 'components/Design/StandardComponents';
import React from 'react';
import { useIntl } from 'react-intl';
import { useGetFarmDashboardMetricsQuery } from 'store/api/dashboardMetricsApi';

const GroupLabel = ({ children, color }) => (
  <Text fontSize="xs" fontWeight="bold" color={color} textTransform="uppercase" mb={1}>
    {children}
  </Text>
);

const SmartUsageCard = ({ companyId, farmId, buyerPagePath }) => {
  const intl = useIntl();
  const titleColor = useColorModeValue('gray.700', 'gray.200');
  const iconColor = useColorModeValue('gray.600', 'gray.400');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const {
    data: dashboardResponse,
    isLoading,
    isUninitialized,
    error
  } = useGetFarmDashboardMetricsQuery(
    { companyId, farmId },
    {
      skip: !companyId || !farmId,
      pollingInterval: 10 * 60 * 1000, // 10 minutes
      refetchOnMountOrArgChange: 300 // 5 minutes
    }
  );
  const metrics = dashboardResponse?.metrics;

  const count = (n) => (typeof n === 'number' ? n.toLocaleString(intl.locale) : null);

  let body;
  // A skipped query (no company or farm yet) is not a failure: it reports no data and no error
  // with `isUninitialized`, and until 2026-11-05 fell through to "Unable to load" (review of #284).
  if (isLoading || isUninitialized) {
    body = (
      <Flex justify="center" align="center" minH="200px">
        <Spinner color="gray.400" />
      </Flex>
    );
  } else if (error || !metrics) {
    body = (
      <Text fontSize="sm" color={mutedColor}>
        {intl.formatMessage({ id: 'dashboard.unableLoadMetrics' })}
      </Text>
    );
  } else {
    body = (
      <VStack align="stretch" spacing={3}>
        {/* Side by side from md, so the card matches the Farm Profile card beside it (290px at
            1366, where one column made it 356px). Stacked on a phone: the cards stack there anyway,
            and two columns wrapped "Buyer page, last 30 days" out of line at 390px. */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={3}>
          <Box data-testid="records-counts">
            <GroupLabel color={mutedColor}>
              {intl.formatMessage({ id: 'dashboard.recordsCard.records' })}
            </GroupLabel>
            <FieldList>
              <InfoRow
                layout="inline"
                dense
                label={intl.formatMessage({ id: 'dashboard.recordsCard.activities' })}
                value={count(metrics.total_documented_events)}
              />
              <InfoRow
                layout="inline"
                dense
                label={intl.formatMessage({ id: 'dashboard.recordsCard.seasonsUnderway' })}
                value={count(metrics.productions_in_progress)}
              />
              <InfoRow
                layout="inline"
                dense
                label={intl.formatMessage({ id: 'dashboard.finishedSeasons' })}
                value={count(metrics.scored_productions)}
              />
            </FieldList>
          </Box>
          <Box data-testid="buyer-page-counts">
            <GroupLabel color={mutedColor}>
              {intl.formatMessage({ id: 'dashboard.recordsCard.buyerPage' })}
            </GroupLabel>
            <FieldList>
              <InfoRow
                layout="inline"
                dense
                label={intl.formatMessage({ id: 'dashboard.recordsCard.qrScans' })}
                value={count(metrics.monthly_scans)}
              />
              <InfoRow
                layout="inline"
                dense
                label={intl.formatMessage({ id: 'dashboard.consumerReach' })}
                value={count(metrics.consumer_reach)}
              />
            </FieldList>
            {/* An unknown count is said in words, under the rows, not squeezed into the value
                slot: at 1366 each column is ~160px and "Not recorded" broke as "Not record / ed". */}
            {metrics.consumer_reach == null && (
              <Text fontSize="xs" color={mutedColor} pt={1} data-testid="visitors-not-recorded">
                {intl.formatMessage({ id: 'dashboard.recordsCard.visitorsNotRecorded' })}
              </Text>
            )}
          </Box>
        </SimpleGrid>
        <Box>
          <Link
            as={RouterLink}
            to={buyerPagePath}
            fontSize="sm"
            fontWeight="semibold"
            color="green.700"
            sx={{ '@media (hover: hover)': { '&:hover': { textDecoration: 'underline' } } }}
            {...TOUCH_TARGET}>
            {intl.formatMessage({ id: 'dashboard.recordsCard.share' })}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </Box>
      </VStack>
    );
  }

  return (
    <Card h="100%">
      <CardBody>
        <VStack align="stretch" spacing={3} w="100%">
          <HStack spacing={3} align="start">
            <Icon as={FaQrcode} color={iconColor} boxSize={5} mt={1} aria-hidden />
            <Heading as="h3" size="sm" fontWeight="600" color={titleColor} pt={1}>
              {intl.formatMessage({ id: 'dashboard.recordsCard.title' })}
            </Heading>
          </HStack>
          {body}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default SmartUsageCard;
