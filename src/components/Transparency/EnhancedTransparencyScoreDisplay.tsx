import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Icon,
  Circle,
  useColorModeValue,
  useBreakpointValue,
  Progress,
  SimpleGrid,
  Flex
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import { FaShieldAlt, FaCheckCircle, FaEye, FaCertificate, FaLeaf, FaRegGem } from 'react-icons/fa';
import { BsShieldCheck } from 'react-icons/bs';
import { MdVerified } from 'react-icons/md';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface TransparencyBreakdown {
  category: string;
  score: number;
  maxScore: number;
  description: string;
  icon: any;
  color: string;
  isVerified: boolean;
}

export interface EnhancedTransparencyScoreDisplayProps {
  overallScore: number;
  breakdown: TransparencyBreakdown[];
  isUSDAVerified?: boolean;
  isBlockchainVerified?: boolean;
  productName?: string;
  showDetailedBreakdown?: boolean;
}

export const EnhancedTransparencyScoreDisplay: React.FC<EnhancedTransparencyScoreDisplayProps> = ({
  overallScore,
  breakdown,
  isUSDAVerified = false,
  isBlockchainVerified = false,
  productName = 'Product',
  showDetailedBreakdown = true
}) => {
  const intl = useIntl();

  // Theme colors following Trazo patterns
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Responsive values following Trazo mobile-first approach
  const scoreSize = useBreakpointValue({ base: '120px', md: '140px' });
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });
  const iconSize = useBreakpointValue({ base: 5, md: 6 });

  // Transparency grade calculation following Trazo patterns
  const getTransparencyGrade = (score: number) => {
    if (score >= 95)
      return { grade: 'A+', text: intl.formatMessage({ id: 'transparency.gradeMaximum' }), color: 'green', bgColor: 'green.500' };
    if (score >= 90)
      return { grade: 'A', text: intl.formatMessage({ id: 'transparency.gradeOutstanding' }), color: 'green', bgColor: 'green.500' };
    if (score >= 85)
      return { grade: 'A-', text: intl.formatMessage({ id: 'transparency.gradeExcellent' }), color: 'green', bgColor: 'green.400' };
    if (score >= 80)
      return { grade: 'B+', text: intl.formatMessage({ id: 'transparency.gradeVeryGood' }), color: 'blue', bgColor: 'blue.500' };
    if (score >= 70)
      return { grade: 'B', text: intl.formatMessage({ id: 'transparency.gradeGood' }), color: 'blue', bgColor: 'blue.400' };
    if (score >= 60)
      return {
        grade: 'C+',
        text: intl.formatMessage({ id: 'transparency.gradeSatisfactory' }),
        color: 'yellow',
        bgColor: 'yellow.500'
      };
    return { grade: 'C', text: intl.formatMessage({ id: 'transparency.gradeBuilding' }), color: 'orange', bgColor: 'orange.500' };
  };

  // Consumer-friendly transparency message following Trazo messaging patterns
  const getConsumerMessage = (score: number) => {
    if (score >= 95) {
      return {
        primary: `🏆 ${intl.formatMessage({ id: 'transparency.messageChampionPrimary' })}`,
        secondary: intl.formatMessage({ id: 'transparency.messageChampionSecondary' }, { productName }),
        action: intl.formatMessage({ id: 'transparency.messageChampionAction' })
      };
    } else if (score >= 85) {
      return {
        primary: `⭐ ${intl.formatMessage({ id: 'transparency.messageLeaderPrimary' })}`,
        secondary: intl.formatMessage({ id: 'transparency.messageLeaderSecondary' }, { productName }),
        action: intl.formatMessage({ id: 'transparency.messageLeaderAction' })
      };
    } else if (score >= 70) {
      return {
        primary: `✅ ${intl.formatMessage({ id: 'transparency.messageGoodPrimary' })}`,
        secondary: intl.formatMessage({ id: 'transparency.messageGoodSecondary' }, { productName }),
        action: intl.formatMessage({ id: 'transparency.messageGoodAction' })
      };
    } else {
      return {
        primary: `📈 ${intl.formatMessage({ id: 'transparency.messageBuildingPrimary' })}`,
        secondary: intl.formatMessage({ id: 'transparency.messageBuildingSecondary' }, { productName }),
        action: intl.formatMessage({ id: 'transparency.messageBuildingAction' })
      };
    }
  };

  const grade = getTransparencyGrade(overallScore);
  const message = getConsumerMessage(overallScore);

  return (
    <VStack spacing={cardSpacing} align="stretch">
      {/* Main Transparency Score Card */}
      <MotionCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        bg={`${grade.color}.50`}
        borderColor={`${grade.color}.200`}
        borderWidth="2px"
        borderRadius="xl"
      >
        <CardBody p={cardSpacing}>
          <VStack spacing={6}>
            {/* Score Circle and Grade */}
            <HStack spacing={8} justify="center" align="center" flexWrap="wrap">
              {/* Main Score Circle */}
              <Box position="relative">
                <Circle
                  size={scoreSize}
                  bg={bg}
                  borderWidth="6px"
                  borderColor={grade.bgColor}
                  boxShadow="xl"
                  position="relative"
                >
                  <VStack spacing={1}>
                    <Text
                      fontSize={{ base: '2xl', md: '3xl' }}
                      fontWeight="black"
                      color={grade.bgColor}
                      lineHeight="1"
                    >
                      {Math.round(overallScore)}
                    </Text>
                    <Text
                      fontSize={{ base: 'xs', md: 'sm' }}
                      fontWeight="bold"
                      color={textColor}
                      lineHeight="1"
                    >
                      {intl.formatMessage({ id: 'transparency.label' })}
                    </Text>
                  </VStack>

                  {/* Grade Badge */}
                  <Badge
                    position="absolute"
                    top="-2"
                    right="-2"
                    colorScheme={grade.color}
                    variant="solid"
                    px={2}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="bold"
                  >
                    {grade.grade}
                  </Badge>
                </Circle>

                {/* Progress Ring Animation */}
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  right="0"
                  bottom="0"
                  borderRadius="full"
                  background={`conic-gradient(${grade.bgColor} 0deg, ${grade.bgColor} ${
                    (overallScore / 100) * 360
                  }deg, transparent ${(overallScore / 100) * 360}deg)`}
                  opacity={0.1}
                  animation="spin 2s linear"
                />
              </Box>

              {/* Verification Indicators */}
              <VStack spacing={3} align="center">
                {isUSDAVerified && (
                  <HStack
                    spacing={2}
                    bg="green.50"
                    px={3}
                    py={2}
                    borderRadius="full"
                    border="1px"
                    borderColor="green.200"
                  >
                    <Icon as={MdVerified} color="green.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="medium" color="green.700">
                      {intl.formatMessage({ id: 'transparency.farmDocumented' })}
                    </Text>
                  </HStack>
                )}

                {isBlockchainVerified && (
                  <HStack
                    spacing={2}
                    bg="green.50"
                    px={3}
                    py={2}
                    borderRadius="full"
                    border="1px"
                    borderColor="green.200"
                  >
                    <Icon as={BsShieldCheck} color="green.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="medium" color="green.700">
                      {intl.formatMessage({ id: 'transparency.blockchainVerifiedLabel' })}
                    </Text>
                  </HStack>
                )}

                {!isUSDAVerified && !isBlockchainVerified && (
                  <HStack
                    spacing={2}
                    bg="gray.50"
                    px={3}
                    py={2}
                    borderRadius="full"
                    border="1px"
                    borderColor="gray.200"
                  >
                    <Icon as={FaEye} color="gray.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="medium" color="gray.600">
                      {intl.formatMessage({ id: 'transparency.basicDocumentation' })}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </HStack>

            {/* Consumer Message */}
            <VStack spacing={3} textAlign="center" maxW="lg">
              <Text
                fontSize={{ base: 'lg', md: 'xl' }}
                fontWeight="bold"
                color={`${grade.color}.600`}
              >
                {message.primary}
              </Text>
              <Text fontSize={{ base: 'md', md: 'lg' }} color={textColor} fontWeight="medium">
                {message.secondary}
              </Text>
              <Text fontSize="sm" color={mutedColor} fontStyle="italic">
                {message.action}
              </Text>
            </VStack>

            {/* Overall Progress Bar */}
            <Box w="full" maxW="md">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  {intl.formatMessage({ id: 'transparency.transparencyLevel' })}
                </Text>
                <Text fontSize="sm" color={`${grade.color}.600`} fontWeight="bold">
                  {grade.text}
                </Text>
              </HStack>
              <Progress
                value={overallScore}
                colorScheme={grade.color}
                size="lg"
                borderRadius="full"
                bg="gray.100"
              />
            </Box>
          </VStack>
        </CardBody>
      </MotionCard>

      {/* Detailed Breakdown */}
      {showDetailedBreakdown && breakdown.length > 0 && (
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          bg={bg}
          borderRadius="xl"
        >
          <CardBody p={cardSpacing}>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {intl.formatMessage({ id: 'transparency.breakdown' })}
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    {intl.formatMessage({ id: 'transparency.breakdownDescription' })}
                  </Text>
                </VStack>
                <Badge colorScheme="green" variant="outline" px={3} py={1}>
                  {intl.formatMessage({ id: 'transparency.categoriesCount' }, { count: breakdown.length })}
                </Badge>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {breakdown.map((item, index) => (
                  <MotionBox
                    key={item.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card
                      bg={cardBg}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="lg"
                      _hover={{
                        borderColor: `${item.color}.300`,
                        transform: 'translateY(-2px)',
                        shadow: 'md'
                      }}
                      transition="all 0.2s"
                    >
                      <CardBody p={4}>
                        <VStack spacing={3} align="stretch">
                          {/* Category Header */}
                          <HStack justify="space-between" align="start">
                            <HStack spacing={3}>
                              <Circle size="35px" bg={`${item.color}.100`}>
                                <Icon
                                  as={item.icon}
                                  color={`${item.color}.500`}
                                  boxSize={iconSize}
                                />
                              </Circle>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                                  {item.category}
                                </Text>
                                <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                                  {item.description}
                                </Text>
                              </VStack>
                            </HStack>

                            {item.isVerified && (
                              <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                            )}
                          </HStack>

                          {/* Score Progress */}
                          <Box>
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="xs" color={mutedColor}>
                                {intl.formatMessage({ id: 'transparency.score' })}
                              </Text>
                              <Text fontSize="xs" fontWeight="bold" color={`${item.color}.600`}>
                                {item.score}/{item.maxScore}
                              </Text>
                            </HStack>
                            <Progress
                              value={(item.score / item.maxScore) * 100}
                              colorScheme={item.color}
                              size="sm"
                              borderRadius="full"
                              bg="gray.100"
                            />
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </MotionBox>
                ))}
              </SimpleGrid>
            </VStack>
          </CardBody>
        </MotionCard>
      )}

      {/* Consumer Trust Message */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        bg={`${grade.color}.50`}
        p={cardSpacing}
        borderRadius="xl"
        border="1px"
        borderColor={`${grade.color}.200`}
        textAlign="center"
      >
        <VStack spacing={4}>
          <Icon as={FaShieldAlt} color={`${grade.color}.500`} boxSize={8} />
          <VStack spacing={2}>
            <Text fontSize="lg" fontWeight="bold" color={`${grade.color}.700`}>
              {intl.formatMessage({ id: 'transparency.whyMattersTitle' })}
            </Text>
            <Text fontSize="sm" color={`${grade.color}.600`} maxW="lg">
              {intl.formatMessage({ id: 'transparency.whyMattersDescription' })}
            </Text>
          </VStack>
          <Text fontSize="xs" color={mutedColor} fontStyle="italic">
            💡 {intl.formatMessage({ id: 'transparency.whyMattersNote' })}
          </Text>
        </VStack>
      </MotionBox>
    </VStack>
  );
};

export default EnhancedTransparencyScoreDisplay;
