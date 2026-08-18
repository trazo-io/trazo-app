// Chakra imports
import {
  Button,
  Flex,
  Link,
  Stack,
  Td,
  Text,
  Tr,
  useColorModeValue,
  Badge,
  HStack,
  VStack,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { FaUser, FaRobot, FaEye, FaChartLine } from 'react-icons/fa';

type ScansRowProps = {
  date: string;
  product: string;
  location: string;
  parcel: string;
  comment: string;
  isExpanded: boolean;
  onExpand: () => void;
  // Enhanced scan data
  bot_score?: number;
  engagement_score?: number;
  is_duplicate?: boolean;
  is_verified_human?: boolean;
  consent_given?: boolean;
};

const ScansRow = (props: ScansRowProps) => {
  const intl = useIntl();
  const {
    date,
    product,
    location,
    parcel,
    comment,
    isExpanded,
    onExpand,
    bot_score = 0.5,
    engagement_score = 0.5,
    is_duplicate = false,
    is_verified_human = false,
    consent_given = true
  } = props;
  const textColor = useColorModeValue('gray.700', 'white');

  // Calculate quality indicators following Trazo design standards
  const hasComment = comment && comment.trim().length > 0;

  // Intelligent human detection based on available data
  let isHumanLike: boolean;
  let isHighEngagement: boolean;

  // IMPORTANT: Default assumption is that scans are from real humans
  // Most QR code scans come from genuine consumers, not bots

  // If backend provides bot_score, use it
  if (bot_score !== undefined && bot_score !== 0.5 && bot_score !== 0.3) {
    // Ignore defaults
    isHumanLike = bot_score < 0.5;
  } else {
    // Default to human - this is more realistic
    // Real consumers scan without always leaving comments
    isHumanLike = true; // Assume human unless backend says otherwise
  }

  // If backend provides engagement_score, use it
  if (engagement_score !== undefined && engagement_score !== 0.5 && engagement_score !== 0.4) {
    // Ignore defaults
    isHighEngagement = engagement_score > 0.6;
  } else {
    // Comments indicate high engagement, no comment = medium engagement
    isHighEngagement = hasComment;
  }

  // Customer type badge based on engagement and authenticity
  const getCustomerTypeBadge = () => {
    if (!consent_given) {
      return (
        <Badge colorScheme="gray" size="sm">
          {intl.formatMessage({ id: 'commercial.privacy' })}
        </Badge>
      );
    }
    if (isHumanLike && isHighEngagement) {
      return (
        <Badge colorScheme="green" size="sm">
          {intl.formatMessage({ id: 'commercial.explorer' })}
        </Badge>
      );
    }
    if (isHumanLike && !isHighEngagement) {
      return (
        <Badge colorScheme="blue" size="sm">
          {intl.formatMessage({ id: 'commercial.viewer' })}
        </Badge>
      );
    }
    return (
      <Badge colorScheme="orange" size="sm">
        {intl.formatMessage({ id: 'commercial.bot' })}
      </Badge>
    );
  };

  // Engagement level indicator
  const getEngagementLevel = () => {
    if (!consent_given)
      return { label: intl.formatMessage({ id: 'commercial.engagementNA' }), color: 'gray' };
    if (engagement_score > 0.7)
      return { label: intl.formatMessage({ id: 'commercial.engagementHigh' }), color: 'green' };
    if (engagement_score > 0.4)
      return { label: intl.formatMessage({ id: 'commercial.engagementMedium' }), color: 'yellow' };
    return { label: intl.formatMessage({ id: 'commercial.engagementLow' }), color: 'red' };
  };

  const engagementLevel = getEngagementLevel();

  // Format date compactly for mobile
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${mm}/${dd}/${yy}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <Tr pe="0px" px={{ base: 2, md: 5 }} _hover={{ bg: 'gray.50' }}>
      {/* Date */}
      <Td pe="0px" px={{ base: 2, md: 5 }}>
        <Text
          color={textColor}
          fontSize={{ base: 'xs', md: 'sm' }}
          fontWeight="bold"
          whiteSpace="nowrap">
          {formatDate(date)}
        </Text>
      </Td>

      {/* Product */}
      <Td pe="0px" px={{ base: 2, md: 5 }} maxW={{ base: '100px', md: 'none' }}>
        <Text color={textColor} fontSize={{ base: 'xs', md: 'sm' }} noOfLines={1}>
          {product}
        </Text>
      </Td>

      {/* Customer Type - NEW */}
      <Td px={{ base: 2, md: 5 }}>
        <HStack spacing={1}>
          {getCustomerTypeBadge()}
          {is_duplicate && (
            <Tooltip
              label={intl.formatMessage({ id: 'commercial.duplicateSession' })}
              placement="top">
              <Badge colorScheme="gray" fontSize="xs" variant="outline">
                {intl.formatMessage({ id: 'commercial.dup' })}
              </Badge>
            </Tooltip>
          )}
        </HStack>
      </Td>

      {/* Engagement Level - NEW */}
      <Td px={{ base: 2, md: 5 }}>
        <HStack spacing={1}>
          <Badge colorScheme={engagementLevel.color} fontSize="xs" variant="subtle">
            {engagementLevel.label}
          </Badge>
          {consent_given && isHighEngagement && (
            <Tooltip
              label={intl.formatMessage(
                { id: 'commercial.engagementTooltip' },
                { score: Math.round(engagement_score * 100) }
              )}
              placement="top">
              <Icon as={FaChartLine} color="green.500" boxSize={3} />
            </Tooltip>
          )}
        </HStack>
      </Td>

      {/* Scan Quality - NEW */}
      <Td px={{ base: 2, md: 5 }}>
        <HStack spacing={1}>
          <Tooltip
            label={
              isHumanLike
                ? intl.formatMessage(
                    { id: 'commercial.humanScanTooltip' },
                    { probability: Math.round((1 - bot_score) * 100) }
                  )
                : intl.formatMessage(
                    { id: 'commercial.botScanTooltip' },
                    { probability: Math.round((1 - bot_score) * 100) }
                  )
            }
            placement="top"
            maxW="300px"
            hasArrow>
            <Badge
              colorScheme={isHumanLike ? 'green' : 'orange'}
              fontSize="xs"
              variant={isHumanLike ? 'solid' : 'outline'}>
              <HStack spacing={1}>
                <Icon as={isHumanLike ? FaUser : FaRobot} boxSize={2} />
                <Text>
                  {isHumanLike
                    ? intl.formatMessage({ id: 'commercial.human' })
                    : intl.formatMessage({ id: 'commercial.bot' })}
                </Text>
              </HStack>
            </Badge>
          </Tooltip>
        </HStack>
      </Td>

      {/* Location */}
      <Td px={{ base: 2, md: 5 }}>
        <Text color={textColor} fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">
          {location || '-'}
        </Text>
      </Td>

      {/* Comments */}
      <Td px={{ base: 2, md: 5 }}>
        <Button
          onClick={comment ? onExpand : undefined}
          variant="no-hover"
          bg={comment ? (isExpanded ? 'green.50' : 'white') : 'white'}
          w={{ base: '70px', md: '100px' }}
          h={{ base: '28px', md: '35px' }}
          fontSize="xs"
          color={comment ? (isExpanded ? 'green.700' : 'green.500') : '#CBD5E0'}
          border={comment ? '1px solid' : '1px solid #CBD5E0'}
          borderColor={comment ? (isExpanded ? 'green.200' : 'green.500') : '#CBD5E0'}
          cursor={comment ? 'pointer' : 'default'}
          fontWeight={comment ? 'semibold' : 'normal'}
          borderRadius="lg"
          _hover={
            comment
              ? {
                  bg: 'green.100',
                  borderColor: 'green.600',
                  color: 'green.700',
                  transform: 'translateY(-1px)'
                }
              : {}
          }
          transition="all 0.2s ease">
          {comment
            ? intl.formatMessage({ id: isExpanded ? 'app.hide' : 'app.view' })
            : intl.formatMessage({ id: 'app.view' })}
        </Button>
      </Td>
    </Tr>
  );
};

export default ScansRow;
