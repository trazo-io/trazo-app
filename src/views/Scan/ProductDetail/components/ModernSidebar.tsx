import React from 'react';
import {
  HStack,
  VStack,
  Circle,
  Icon,
  Text,
  Heading,
  Button,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import { FaCoins, FaGift, FaStar, FaHeart, FaAward, FaMedal, FaChartLine } from 'react-icons/fa';
import { CarbonImpactVisualizer } from '../../../../components/Education';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

interface ModernSidebarProps {
  isAuthenticated: boolean;
  productName?: string;
  carbonScore: number;
  onAuthPrompt: () => void;
  onNavigateToAchievements: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({
  isAuthenticated,
  productName,
  carbonScore,
  onAuthPrompt,
  onNavigateToAchievements
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <VStack spacing={6} align="stretch">
      {/* Gamification Section - Only for Authenticated Users */}
      {isAuthenticated && (
        <Card bg={cardBg} shadow="lg" borderRadius="xl">
          <CardHeader pb={8}>
            <HStack spacing={3}>
              <Circle size="40px" bg="yellow.100">
                <Icon as={FaCoins} color="yellow.600" />
              </Circle>
              <VStack align="start" spacing={0}>
                <Heading size="sm" color={textColor}>
                  Green Points
                </Heading>
                <Text fontSize="xs" color={mutedColor}>
                  Earn rewards for engagement
                </Text>
              </VStack>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm">Review this product</Text>
                <Badge colorScheme="green">+100 pts</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Share with friends</Text>
                <Badge colorScheme="blue">+50 pts</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Learn about sustainability</Text>
                <Badge colorScheme="purple">+25 pts</Badge>
              </HStack>

              <Button
                size="md"
                colorScheme="green"
                leftIcon={<Icon as={FaMedal} />}
                onClick={onAuthPrompt}
              >
                View Achievements
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};
