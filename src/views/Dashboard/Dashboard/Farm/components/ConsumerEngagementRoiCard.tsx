import React, { useState } from 'react';
import { useIntl } from 'react-intl';

import {
  Badge,
  Box,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Select,
  SimpleGrid,
  Skeleton,
  Text,
  Tooltip,
  useColorModeValue,
  VStack
} from '@chakra-ui/react';
import {
  FaCertificate,
  FaChartLine,
  FaEnvelopeOpenText,
  FaQrcode,
  FaStar,
  FaUsers
} from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import {
  RoiSummary,
  BuyerDocRequestLead,
  useGetFarmRoiSummaryQuery,
  useGetBuyerDocRequestsQuery,
  useUpdateBuyerDocRequestStatusMutation
} from 'store/api/dashboardMetricsApi';

const MAX_VISIBLE_LEADS = 5;

export default function ConsumerEngagementRoiCard({ farmId }: { farmId: number }) {
  const intl = useIntl();
  const titleColor = useColorModeValue('green.600', 'green.400');
  const textColor = useColorModeValue('gray.700', 'gray.300');

  const {
    data: roi,
    isLoading: roiLoading,
    isError: roiError
  } = useGetFarmRoiSummaryQuery({ farmId });
  const {
    data: leads,
    isLoading: leadsLoading,
    isError: leadsError
  } = useGetBuyerDocRequestsQuery({ farmId });
  const [updateLeadStatus] = useUpdateBuyerDocRequestStatusMutation();
  // Track which lead is updating so only its select is disabled.
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);

  // Dashboard must not break if the ROI endpoints fail — render nothing.
  if (roiError || leadsError) return null;

  if (roiLoading || leadsLoading) {
    return (
      <Box>
        <Skeleton height="24px" width="240px" mb={1} />
        <Skeleton height="14px" width="120px" mb={4} />
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 2, md: 4 }} mb={4}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height="110px" borderRadius="xl" />
          ))}
        </SimpleGrid>
        <Skeleton height="16px" mb={2} />
        <Skeleton height="16px" width="70%" />
      </Box>
    );
  }

  if (!roi) return null;

  const renderTrendBadge = (momChangePct: RoiSummary['mom_change_pct']) => {
    if (momChangePct === null) {
      return (
        <Badge colorScheme="gray" borderRadius="full" px={2}>
          {intl.formatMessage({ id: 'roi.trendNew' })}
        </Badge>
      );
    }
    if (momChangePct > 0) {
      return (
        <Badge colorScheme="green" borderRadius="full" px={2}>
          {intl.formatMessage({ id: 'roi.trendUp' }, { pct: Math.round(momChangePct) })}
        </Badge>
      );
    }
    if (momChangePct < 0) {
      return (
        <Badge colorScheme="red" borderRadius="full" px={2}>
          {intl.formatMessage({ id: 'roi.trendDown' }, { pct: Math.round(Math.abs(momChangePct)) })}
        </Badge>
      );
    }
    return (
      <Badge colorScheme="gray" borderRadius="full" px={2}>
        {intl.formatMessage({ id: 'roi.trendFlat' })}
      </Badge>
    );
  };

  const recentLeads = [...(leads || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, MAX_VISIBLE_LEADS);
  const newLeadsCount = (leads || []).filter((lead) => lead.status === 'new').length;

  const handleStatusChange = async (
    lead: BuyerDocRequestLead,
    status: BuyerDocRequestLead['status']
  ) => {
    if (status === lead.status) return;
    setUpdatingLeadId(lead.id);
    try {
      await updateLeadStatus({ leadId: lead.id, status, farmId }).unwrap();
    } catch {
      // Cache invalidation resyncs the list; swallow so the dashboard stays usable.
    } finally {
      setUpdatingLeadId(null);
    }
  };

  return (
    <Box data-tour="consumer-engagement-roi">
      {/* Section header */}
      <HStack spacing={2} mb={1}>
        <Icon as={FaUsers} color="green.500" boxSize={5} />
        <Heading size="md" color={titleColor} fontSize={{ base: 'lg', md: 'xl' }}>
          {intl.formatMessage({ id: 'roi.title' })}
        </Heading>
      </HStack>
      <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" mb={4}>
        {intl.formatMessage({ id: 'roi.subtitle' })}
      </Text>

      {/* Stat mini-cards — matches Transparency Quick Stats pattern */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 2, md: 4 }} mb={6}>
        <Card bg="green.50" border="1px solid" borderColor="green.100" borderRadius="xl">
          <CardBody p={{ base: 3, md: 4 }} textAlign="center">
            <VStack spacing={{ base: 1, md: 2 }}>
              <Icon as={FaQrcode} color="green.500" boxSize={{ base: 5, md: 6 }} />
              <HStack spacing={2} justify="center">
                <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold" color="green.700">
                  {roi.scans_30d}
                </Text>
                {renderTrendBadge(roi.mom_change_pct)}
              </HStack>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="green.600" whiteSpace="nowrap">
                {intl.formatMessage({ id: 'roi.qrScans' })}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card bg="blue.50" border="1px solid" borderColor="blue.100" borderRadius="xl">
          <CardBody p={{ base: 3, md: 4 }} textAlign="center">
            <VStack spacing={{ base: 1, md: 2 }}>
              <Icon as={FaChartLine} color="blue.500" boxSize={{ base: 5, md: 6 }} />
              <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold" color="blue.700">
                {Math.round(roi.engaged_rate_pct)}%
              </Text>
              <Tooltip
                label={intl.formatMessage({ id: 'roi.engagedTooltip' })}
                placement="top"
                hasArrow
              >
                <Text
                  fontSize={{ base: 'xs', md: 'sm' }}
                  color="blue.600"
                  whiteSpace="nowrap"
                  cursor="help"
                  textDecoration="underline dotted"
                >
                  {intl.formatMessage({ id: 'roi.engagedScans' })}
                </Text>
              </Tooltip>
            </VStack>
          </CardBody>
        </Card>

        <Card bg="purple.50" border="1px solid" borderColor="purple.100" borderRadius="xl">
          <CardBody p={{ base: 3, md: 4 }} textAlign="center">
            <VStack spacing={{ base: 1, md: 2 }}>
              <Icon as={FaStar} color="purple.500" boxSize={{ base: 5, md: 6 }} />
              <HStack spacing={2} justify="center">
                <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold" color="purple.700">
                  {roi.reviews_count}
                </Text>
                {roi.average_rating !== null && (
                  <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="semibold" color="purple.600">
                    {intl.formatMessage(
                      { id: 'roi.avgRating' },
                      { rating: roi.average_rating.toFixed(1) }
                    )}
                  </Text>
                )}
              </HStack>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="purple.600" whiteSpace="nowrap">
                {intl.formatMessage({ id: 'roi.consumerReviews' })}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card bg="orange.50" border="1px solid" borderColor="orange.100" borderRadius="xl">
          <CardBody p={{ base: 3, md: 4 }} textAlign="center">
            <VStack spacing={{ base: 1, md: 2 }}>
              <Icon
                as={roi.has_verified_certification ? FaCertificate : FaQrcode}
                color="orange.500"
                boxSize={{ base: 5, md: 6 }}
              />
              <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold" color="orange.700">
                {roi.has_verified_certification
                  ? roi.certification_views_30d
                  : roi.total_scans_all_time}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="orange.600" whiteSpace="nowrap">
                {intl.formatMessage({
                  id: roi.has_verified_certification ? 'roi.certificationViews' : 'roi.allTimeScans'
                })}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Buyer requests */}
      <HStack spacing={2} mb={3}>
        <Icon as={FaEnvelopeOpenText} color="green.500" boxSize={4} />
        <Heading size="sm" color={titleColor} fontSize={{ base: 'md', md: 'lg' }}>
          {intl.formatMessage({ id: 'roi.buyerRequests' })}
        </Heading>
        {newLeadsCount > 0 && (
          <Badge colorScheme="green" borderRadius="full" px={2}>
            {newLeadsCount}
          </Badge>
        )}
      </HStack>

      {recentLeads.length === 0 ? (
        <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
          {intl.formatMessage({ id: 'roi.noBuyerRequests' })}
        </Text>
      ) : (
        <VStack align="stretch" spacing={3} divider={<Divider />}>
          {recentLeads.map((lead) => {
            const productLine = [lead.product_name || lead.production_name, lead.lot_id]
              .filter(Boolean)
              .join(' · ');
            const requestDate = new Date(lead.created_at).toLocaleDateString(intl.locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <Flex
                key={lead.id}
                direction={{ base: 'column', smd: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', smd: 'flex-start' }}
                gap={2}
              >
                <VStack align="start" spacing={1} flex={1} minW={0}>
                  <Text fontWeight="bold" fontSize="sm" color={textColor}>
                    {lead.organization
                      ? `${lead.requester_name} — ${lead.organization}`
                      : lead.requester_name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {productLine ? `${productLine} · ${requestDate}` : requestDate}
                  </Text>
                  {lead.message && (
                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                      {lead.message}
                    </Text>
                  )}
                  <Link
                    href={`mailto:${lead.requester_email}`}
                    fontSize="xs"
                    color="green.600"
                    fontWeight="semibold"
                  >
                    {lead.requester_email}
                  </Link>
                </VStack>
                <Select
                  size="sm"
                  width="auto"
                  flexShrink={0}
                  borderRadius="md"
                  value={lead.status}
                  isDisabled={updatingLeadId === lead.id}
                  aria-label={intl.formatMessage({ id: 'roi.statusSelectLabel' })}
                  onChange={(e) =>
                    handleStatusChange(lead, e.target.value as BuyerDocRequestLead['status'])
                  }
                >
                  <option value="new">{intl.formatMessage({ id: 'roi.statusNew' })}</option>
                  <option value="contacted">
                    {intl.formatMessage({ id: 'roi.statusContacted' })}
                  </option>
                  <option value="closed">{intl.formatMessage({ id: 'roi.statusClosed' })}</option>
                </Select>
              </Flex>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}
