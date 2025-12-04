import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Progress,
  SimpleGrid,
  Flex,
  useColorModeValue,
  Heading,
  Divider,
  Avatar,
  Tooltip,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Center
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FaTrophy,
  FaStar,
  FaMedal,
  FaClipboardList,
  FaCheckCircle,
  FaCamera,
  FaClock,
  FaCalendarCheck,
  FaAward,
  FaChartLine,
  FaUserCheck,
  FaShieldAlt,
  FaCertificate,
  FaGem,
  FaCrown
} from 'react-icons/fa';
import { MdVerified, MdEco } from 'react-icons/md';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import confetti from 'canvas-confetti';

// Animation keyframes
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(72, 187, 120, 0.5); }
  50% { box-shadow: 0 0 20px rgba(72, 187, 120, 0.8); }
`;

export interface TransparencyAchievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  category: 'documentation' | 'consistency' | 'verification' | 'milestone' | 'quality';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number; // Number needed to unlock
  current: number; // Current progress
  isUnlocked: boolean;
  unlockedAt?: string;
  transparencyPoints?: number; // Points awarded for transparency score
  badge?: string; // Special badge identifier
}

export interface TransparencyLevel {
  level: number;
  name: string;
  minScore: number;
  maxScore: number;
  benefits: string[];
  icon: React.ComponentType;
  color: string;
}

interface TransparencyAchievementsProps {
  establishmentId: string;
  transparencyScore: number;
  eventCount: number;
  photoCount: number;
  verificationCount: number;
  consecutiveDays: number;
  onAchievementUnlocked?: (achievement: TransparencyAchievement) => void;
}

const transparencyLevels: TransparencyLevel[] = [
  {
    level: 1,
    name: 'Transparency Beginner',
    minScore: 0,
    maxScore: 25,
    benefits: ['Basic QR Code', 'Consumer Trust Badge'],
    icon: FaStar,
    color: 'gray'
  },
  {
    level: 2,
    name: 'Transparency Builder',
    minScore: 26,
    maxScore: 50,
    benefits: ['Enhanced QR Features', 'Bronze Trust Badge'],
    icon: FaMedal,
    color: 'orange'
  },
  {
    level: 3,
    name: 'Transparency Leader',
    minScore: 51,
    maxScore: 75,
    benefits: ['Priority Support', 'Silver Trust Badge', 'Featured Producer'],
    icon: FaAward,
    color: 'gray'
  },
  {
    level: 4,
    name: 'Transparency Champion',
    minScore: 76,
    maxScore: 90,
    benefits: ['Gold Trust Badge', 'Marketing Materials', 'Premium Analytics'],
    icon: FaTrophy,
    color: 'yellow'
  },
  {
    level: 5,
    name: 'Transparency Master',
    minScore: 91,
    maxScore: 100,
    benefits: ['Platinum Badge', 'Case Study Feature', 'Conference Speaker'],
    icon: FaCrown,
    color: 'purple'
  }
];

const achievementTemplates: Omit<
  TransparencyAchievement,
  'current' | 'isUnlocked' | 'unlockedAt'
>[] = [
  // Documentation Achievements
  {
    id: 'first_event',
    name: 'First Step',
    description: 'Document your first farming event',
    icon: FaClipboardList,
    category: 'documentation',
    tier: 'bronze',
    requirement: 1,
    transparencyPoints: 5
  },
  {
    id: 'event_10',
    name: 'Event Logger',
    description: 'Document 10 farming events',
    icon: FaClipboardList,
    category: 'documentation',
    tier: 'bronze',
    requirement: 10,
    transparencyPoints: 10
  },
  {
    id: 'event_25',
    name: 'Transparency Advocate',
    description: 'Document 25 farming events',
    icon: FaClipboardList,
    category: 'documentation',
    tier: 'silver',
    requirement: 25,
    transparencyPoints: 20
  },
  {
    id: 'event_50',
    name: 'Documentation Expert',
    description: 'Document 50 farming events',
    icon: FaClipboardList,
    category: 'documentation',
    tier: 'gold',
    requirement: 50,
    transparencyPoints: 35
  },
  {
    id: 'event_100',
    name: 'Transparency Master',
    description: 'Document 100 farming events',
    icon: FaClipboardList,
    category: 'documentation',
    tier: 'platinum',
    requirement: 100,
    transparencyPoints: 50,
    badge: 'TRANSPARENCY_MASTER'
  },

  // Photo Documentation Achievements
  {
    id: 'photo_5',
    name: 'Visual Storyteller',
    description: 'Add 5 photos to your events',
    icon: FaCamera,
    category: 'quality',
    tier: 'bronze',
    requirement: 5,
    transparencyPoints: 8
  },
  {
    id: 'photo_20',
    name: 'Farm Photographer',
    description: 'Add 20 photos to document your farm',
    icon: FaCamera,
    category: 'quality',
    tier: 'silver',
    requirement: 20,
    transparencyPoints: 15
  },
  {
    id: 'photo_50',
    name: 'Visual Transparency',
    description: 'Add 50 photos for complete transparency',
    icon: FaCamera,
    category: 'quality',
    tier: 'gold',
    requirement: 50,
    transparencyPoints: 25
  },

  // Consistency Achievements
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Document events for 7 consecutive days',
    icon: FaClock,
    category: 'consistency',
    tier: 'bronze',
    requirement: 7,
    transparencyPoints: 12
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Document events for 14 consecutive days',
    icon: FaClock,
    category: 'consistency',
    tier: 'silver',
    requirement: 14,
    transparencyPoints: 20
  },
  {
    id: 'streak_30',
    name: 'Monthly Champion',
    description: 'Document events for 30 consecutive days',
    icon: FaClock,
    category: 'consistency',
    tier: 'gold',
    requirement: 30,
    transparencyPoints: 40,
    badge: 'CONSISTENCY_CHAMPION'
  },

  // Verification Achievements
  {
    id: 'verify_1',
    name: 'Trust Builder',
    description: 'Get your first blockchain verification',
    icon: MdVerified,
    category: 'verification',
    tier: 'bronze',
    requirement: 1,
    transparencyPoints: 15
  },
  {
    id: 'verify_5',
    name: 'Verification Pro',
    description: 'Get 5 blockchain verifications',
    icon: MdVerified,
    category: 'verification',
    tier: 'silver',
    requirement: 5,
    transparencyPoints: 25
  },
  {
    id: 'verify_10',
    name: 'Blockchain Champion',
    description: 'Get 10 blockchain verifications',
    icon: MdVerified,
    category: 'verification',
    tier: 'gold',
    requirement: 10,
    transparencyPoints: 45,
    badge: 'BLOCKCHAIN_VERIFIED'
  },

  // Transparency Score Milestones
  {
    id: 'score_50',
    name: 'Halfway There',
    description: 'Achieve 50% transparency score',
    icon: FaChartLine,
    category: 'milestone',
    tier: 'bronze',
    requirement: 50,
    transparencyPoints: 20
  },
  {
    id: 'score_75',
    name: 'Transparency Leader',
    description: 'Achieve 75% transparency score',
    icon: FaChartLine,
    category: 'milestone',
    tier: 'silver',
    requirement: 75,
    transparencyPoints: 35
  },
  {
    id: 'score_90',
    name: 'Excellence in Transparency',
    description: 'Achieve 90% transparency score',
    icon: FaChartLine,
    category: 'milestone',
    tier: 'gold',
    requirement: 90,
    transparencyPoints: 50
  },
  {
    id: 'score_95',
    name: 'Transparency Perfection',
    description: 'Achieve 95% transparency score',
    icon: FaChartLine,
    category: 'milestone',
    tier: 'platinum',
    requirement: 95,
    transparencyPoints: 75,
    badge: 'TRANSPARENCY_CERTIFIED'
  }
];

export const TransparencyAchievements: React.FC<TransparencyAchievementsProps> = ({
  establishmentId,
  transparencyScore,
  eventCount,
  photoCount,
  verificationCount,
  consecutiveDays,
  onAchievementUnlocked
}) => {
  const [achievements, setAchievements] = useState<TransparencyAchievement[]>([]);
  const [currentLevel, setCurrentLevel] = useState<TransparencyLevel>(transparencyLevels[0]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<TransparencyAchievement[]>([]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Calculate achievements based on current progress
  useEffect(() => {
    const calculateAchievements = (): TransparencyAchievement[] => {
      return achievementTemplates.map((template) => {
        let current = 0;

        // Calculate current progress based on achievement type
        switch (template.id) {
          case 'first_event':
          case 'event_10':
          case 'event_25':
          case 'event_50':
          case 'event_100':
            current = eventCount;
            break;
          case 'photo_5':
          case 'photo_20':
          case 'photo_50':
            current = photoCount;
            break;
          case 'streak_7':
          case 'streak_14':
          case 'streak_30':
            current = consecutiveDays;
            break;
          case 'verify_1':
          case 'verify_5':
          case 'verify_10':
            current = verificationCount;
            break;
          case 'score_50':
          case 'score_75':
          case 'score_90':
          case 'score_95':
            current = transparencyScore;
            break;
        }

        const isUnlocked = current >= template.requirement;

        return {
          ...template,
          current,
          isUnlocked,
          unlockedAt: isUnlocked ? new Date().toISOString() : undefined
        };
      });
    };

    const newAchievements = calculateAchievements();

    // Check for newly unlocked achievements
    const justUnlocked = newAchievements.filter(
      (achievement) =>
        achievement.isUnlocked && !achievements.find((a) => a.id === achievement.id && a.isUnlocked)
    );

    if (justUnlocked.length > 0) {
      setNewlyUnlocked(justUnlocked);
      justUnlocked.forEach((achievement) => {
        onAchievementUnlocked?.(achievement);
        // Trigger celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#48BB78', '#38A169', '#68D391']
        });
      });
    }

    setAchievements(newAchievements);
  }, [eventCount, photoCount, verificationCount, consecutiveDays, transparencyScore]);

  // Calculate current level
  useEffect(() => {
    const level = transparencyLevels.find(
      (l) => transparencyScore >= l.minScore && transparencyScore <= l.maxScore
    );
    if (level) {
      setCurrentLevel(level);
    }
  }, [transparencyScore]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'orange';
      case 'silver':
        return 'gray';
      case 'gold':
        return 'yellow';
      case 'platinum':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const getCategoryAchievements = (category: string) =>
    achievements.filter((a) => a.category === category);

  return (
    <VStack spacing={6} w="full">
      {/* Transparency Level Card */}
      <Card bg={bgColor} p={6} borderRadius="xl" boxShadow="md" w="full">
        <CardHeader p={0} mb={4}>
          <Flex direction="column">
            <HStack spacing={2} align="center">
              <Icon as={FaShieldAlt} color="green.500" boxSize={6} />
              <Heading size="md" color={textColor}>
                Tu Nivel de Transparencia
              </Heading>
            </HStack>
            <Text fontSize="sm" color="gray.500" mt={1}>
              Gana recompensas por documentar tu producción
            </Text>
          </Flex>
        </CardHeader>

        <CardBody px={0}>
          <VStack spacing={4}>
            {/* Current Level Display */}
            <Box
              textAlign="center"
              p={4}
              bg={cardBg}
              borderRadius="lg"
              w="full"
              animation={newlyUnlocked.length > 0 ? `${glow} 2s infinite` : undefined}
            >
              <VStack spacing={3}>
                <Avatar
                  bg={`${currentLevel.color}.500`}
                  icon={<Icon as={currentLevel.icon} color="white" boxSize={8} />}
                  size="xl"
                />
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color={textColor}>
                    {currentLevel.name}
                  </Text>
                  <Badge colorScheme={currentLevel.color} size="lg">
                    Nivel {currentLevel.level}
                  </Badge>
                </VStack>

                {/* Level Progress */}
                <Box w="full">
                  <Flex justify="space-between" mb={2}>
                    <Text fontSize="xs" color="gray.500">
                      Puntuación: {transparencyScore}%
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Próximo: {Math.min(currentLevel.maxScore + 1, 100)}%
                    </Text>
                  </Flex>
                  <Progress
                    value={
                      ((transparencyScore - currentLevel.minScore) /
                        (currentLevel.maxScore - currentLevel.minScore)) *
                      100
                    }
                    colorScheme={currentLevel.color}
                    size="md"
                    borderRadius="full"
                  />
                </Box>

                {/* Level Benefits */}
                <VStack spacing={1} mt={2}>
                  <Text fontSize="xs" fontWeight="bold" color="gray.600">
                    Beneficios Actuales:
                  </Text>
                  {currentLevel.benefits.map((benefit, idx) => (
                    <Badge key={idx} colorScheme="green" variant="subtle">
                      {benefit}
                    </Badge>
                  ))}
                </VStack>
              </VStack>
            </Box>

            {/* Quick Stats */}
            <SimpleGrid columns={3} spacing={4} w="full">
              <Stat textAlign="center">
                <StatLabel fontSize="xs">Eventos</StatLabel>
                <StatNumber fontSize="lg">{eventCount}</StatNumber>
                <StatHelpText fontSize="xs">
                  <StatArrow type="increase" />
                  Documentados
                </StatHelpText>
              </Stat>
              <Stat textAlign="center">
                <StatLabel fontSize="xs">Fotos</StatLabel>
                <StatNumber fontSize="lg">{photoCount}</StatNumber>
                <StatHelpText fontSize="xs">
                  <StatArrow type="increase" />
                  Agregadas
                </StatHelpText>
              </Stat>
              <Stat textAlign="center">
                <StatLabel fontSize="xs">Racha</StatLabel>
                <StatNumber fontSize="lg">{consecutiveDays}</StatNumber>
                <StatHelpText fontSize="xs">días seguidos</StatHelpText>
              </Stat>
            </SimpleGrid>

            {/* Achievement Categories */}
            <VStack spacing={4} w="full" pt={2}>
              <Divider />
              <Heading size="sm" color={textColor}>
                Logros de Transparencia
              </Heading>

              {/* Documentation Achievements */}
              <Box w="full">
                <HStack mb={2}>
                  <Icon as={FaClipboardList} color="green.500" />
                  <Text fontSize="sm" fontWeight="bold" color={textColor}>
                    Documentación
                  </Text>
                </HStack>
                <SimpleGrid columns={{ base: 3, md: 5 }} spacing={2}>
                  {getCategoryAchievements('documentation').map((achievement) => (
                    <Tooltip
                      key={achievement.id}
                      label={`${achievement.description} (${achievement.current}/${achievement.requirement})`}
                    >
                      <Center>
                        <Avatar
                          size="md"
                          bg={
                            achievement.isUnlocked
                              ? `${getTierColor(achievement.tier)}.500`
                              : 'gray.300'
                          }
                          icon={<Icon as={achievement.icon} color="white" boxSize={5} />}
                          opacity={achievement.isUnlocked ? 1 : 0.5}
                          animation={
                            newlyUnlocked.find((a) => a.id === achievement.id)
                              ? `${pulse} 1s infinite`
                              : undefined
                          }
                        />
                      </Center>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Box>

              {/* Quality Achievements */}
              <Box w="full">
                <HStack mb={2}>
                  <Icon as={FaCamera} color="blue.500" />
                  <Text fontSize="sm" fontWeight="bold" color={textColor}>
                    Calidad
                  </Text>
                </HStack>
                <SimpleGrid columns={{ base: 3, md: 5 }} spacing={2}>
                  {getCategoryAchievements('quality').map((achievement) => (
                    <Tooltip
                      key={achievement.id}
                      label={`${achievement.description} (${achievement.current}/${achievement.requirement})`}
                    >
                      <Center>
                        <Avatar
                          size="md"
                          bg={
                            achievement.isUnlocked
                              ? `${getTierColor(achievement.tier)}.500`
                              : 'gray.300'
                          }
                          icon={<Icon as={achievement.icon} color="white" boxSize={5} />}
                          opacity={achievement.isUnlocked ? 1 : 0.5}
                        />
                      </Center>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Box>

              {/* Consistency Achievements */}
              <Box w="full">
                <HStack mb={2}>
                  <Icon as={FaClock} color="orange.500" />
                  <Text fontSize="sm" fontWeight="bold" color={textColor}>
                    Consistencia
                  </Text>
                </HStack>
                <SimpleGrid columns={{ base: 3, md: 5 }} spacing={2}>
                  {getCategoryAchievements('consistency').map((achievement) => (
                    <Tooltip
                      key={achievement.id}
                      label={`${achievement.description} (${achievement.current}/${achievement.requirement})`}
                    >
                      <Center>
                        <Avatar
                          size="md"
                          bg={
                            achievement.isUnlocked
                              ? `${getTierColor(achievement.tier)}.500`
                              : 'gray.300'
                          }
                          icon={<Icon as={achievement.icon} color="white" boxSize={5} />}
                          opacity={achievement.isUnlocked ? 1 : 0.5}
                        />
                      </Center>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Box>

              {/* Next Achievement to Unlock */}
              {achievements.filter((a) => !a.isUnlocked).length > 0 && (
                <Box w="full" p={4} bg="green.50" borderRadius="lg">
                  <Text fontSize="sm" fontWeight="bold" color="green.700" mb={2}>
                    Próximo Logro
                  </Text>
                  {(() => {
                    const next = achievements
                      .filter((a) => !a.isUnlocked)
                      .sort((a, b) => a.current / a.requirement - b.current / b.requirement)
                      .reverse()[0];
                    return (
                      <HStack spacing={3}>
                        <Icon as={next.icon} color="green.500" boxSize={6} />
                        <VStack flex={1} align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            {next.name}
                          </Text>
                          <Progress
                            value={(next.current / next.requirement) * 100}
                            colorScheme="green"
                            size="sm"
                            borderRadius="full"
                            w="full"
                          />
                          <Text fontSize="xs" color="gray.600">
                            {next.current}/{next.requirement} - {next.description}
                          </Text>
                        </VStack>
                      </HStack>
                    );
                  })()}
                </Box>
              )}
            </VStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default TransparencyAchievements;
