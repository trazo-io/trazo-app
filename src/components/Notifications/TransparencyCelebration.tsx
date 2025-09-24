import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Icon,
  Circle,
  Box,
  useColorModeValue,
  Button,
  Badge,
  Progress,
  SimpleGrid,
  Center,
  Flex,
  useToast
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FaTrophy,
  FaAward,
  FaMedal,
  FaCamera,
  FaClipboardList,
  FaShieldAlt,
  FaStar,
  FaHeart,
  FaLeaf,
  FaGem,
  FaCrown
} from 'react-icons/fa';
import {
  MdVerified,
  MdEco,
  MdStars,
  MdCelebration
} from 'react-icons/md';
import confetti from 'canvas-confetti';

// Celebration animations
const bounceIn = keyframes`
  0% {
    transform: scale(0.3) rotate(-10deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.05) rotate(5deg);
  }
  70% {
    transform: scale(0.9) rotate(-2deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
`;

const sparkle = keyframes`
  0%, 100% { 
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
  25% { 
    transform: scale(1.1) rotate(90deg);
    opacity: 0.8;
  }
  50% { 
    transform: scale(1.2) rotate(180deg);
    opacity: 0.6;
  }
  75% { 
    transform: scale(1.1) rotate(270deg);
    opacity: 0.8;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(72, 187, 120, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(72, 187, 120, 0.7);
  }
`;

export interface TransparencyCelebrationData {
  transparencyScore: number;
  farmName: string;
  productName: string;
  achievements: Array<{
    id: string;
    name: string;
    icon: React.ComponentType;
    description: string;
    isNew?: boolean;
  }>;
  milestones: Array<{
    level: string;
    description: string;
    unlocked: boolean;
  }>;
  impactMessage: string;
  consumerMessage: string;
}

interface TransparencyCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  celebrationData: TransparencyCelebrationData;
  triggerType: 'scan' | 'achievement' | 'milestone';
}

export const TransparencyCelebration: React.FC<TransparencyCelebrationProps> = ({
  isOpen,
  onClose,
  celebrationData,
  triggerType
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStage, setAnimationStage] = useState(0);
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');

  // Trigger celebration effects when modal opens
  useEffect(() => {
    if (isOpen && !showConfetti) {
      setShowConfetti(true);
      
      // Main confetti burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#48BB78', '#38A169', '#68D391', '#9AE6B4', '#C6F6D5']
        });
      }, 300);
      
      // Secondary confetti burst for high transparency
      if (celebrationData.transparencyScore >= 90) {
        setTimeout(() => {
          confetti({
            particleCount: 50,
            spread: 40,
            origin: { y: 0.7 },
            colors: ['#FFD700', '#FFA500', '#FF6347']
          });
        }, 800);
      }
      
      // Progressive animation stages
      const timer = setInterval(() => {
        setAnimationStage(prev => {
          if (prev < 3) return prev + 1;
          clearInterval(timer);
          return prev;
        });
      }, 500);
      
      return () => clearInterval(timer);
    }
  }, [isOpen, showConfetti, celebrationData.transparencyScore]);

  // Get celebration level based on transparency score
  const getCelebrationLevel = () => {
    if (celebrationData.transparencyScore >= 95) {
      return {
        title: '¡Transparencia Perfecta!',
        subtitle: 'Has elegido un producto con documentación completa',
        color: 'green',
        icon: FaCrown,
        gradient: 'linear(to-r, green.400, green.600)',
        emoji: '👑'
      };
    }
    if (celebrationData.transparencyScore >= 85) {
      return {
        title: '¡Excelente Elección!',
        subtitle: 'Este producto tiene transparencia excepcional',
        color: 'green',
        icon: FaTrophy,
        gradient: 'linear(to-r, green.400, green.500)',
        emoji: '🏆'
      };
    }
    if (celebrationData.transparencyScore >= 70) {
      return {
        title: '¡Gran Transparencia!',
        subtitle: 'Apoyas agricultura responsable',
        color: 'blue',
        icon: FaAward,
        gradient: 'linear(to-r, blue.400, blue.500)',
        emoji: '🥇'
      };
    }
    return {
      title: '¡Gracias por Elegir Transparencia!',
      subtitle: 'Cada escaneo promueve agricultura responsable',
      color: 'green',
      icon: FaHeart,
      gradient: 'linear(to-r, green.300, green.400)',
      emoji: '💚'
    };
  };

  const celebrationLevel = getCelebrationLevel();

  // Handle celebration actions
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${celebrationLevel.emoji} ${celebrationLevel.title}`,
        text: `Elegí ${celebrationData.productName} de ${celebrationData.farmName} - ${celebrationData.transparencyScore}% transparente. ${celebrationData.consumerMessage}`,
        url: window.location.href
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(
        `${celebrationLevel.emoji} ${celebrationLevel.title}\n\n` +
        `Elegí ${celebrationData.productName} de ${celebrationData.farmName} - ${celebrationData.transparencyScore}% transparente.\n\n` +
        `${celebrationData.consumerMessage}\n\n${window.location.href}`
      );
      toast({
        title: "¡Copiado!",
        description: "Texto copiado al portapapeles",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const handleLearnMore = () => {
    // Could navigate to educational content about transparency
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="xl" 
      closeOnOverlayClick={false}
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        bg={bgColor}
        borderRadius="2xl"
        overflow="hidden"
        position="relative"
      >
        {/* Celebration header with gradient */}
        <Box
          bgGradient={celebrationLevel.gradient}
          color="white"
          px={6}
          py={8}
          textAlign="center"
          position="relative"
          overflow="hidden"
        >
          {/* Animated background pattern */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            opacity={0.1}
            animation={`${sparkle} 4s ease-in-out infinite`}
          >
            {[...Array(8)].map((_, i) => (
              <Circle
                key={i}
                size={`${20 + i * 10}px`}
                position="absolute"
                top={`${Math.random() * 100}%`}
                left={`${Math.random() * 100}%`}
                bg="white"
                transform={`rotate(${Math.random() * 360}deg)`}
              />
            ))}
          </Box>
          
          <VStack spacing={4} position="relative" zIndex={1}>
            {/* Main celebration icon */}
            <Circle
              size={20}
              bg="whiteAlpha.200"
              color="white"
              animation={animationStage >= 1 ? `${bounceIn} 0.8s ease-out` : undefined}
              border="3px solid"
              borderColor="whiteAlpha.300"
            >
              <Icon as={celebrationLevel.icon} boxSize={10} />
            </Circle>
            
            {/* Celebration text */}
            <VStack
              spacing={2}
              opacity={animationStage >= 2 ? 1 : 0}
              animation={animationStage >= 2 ? `${bounceIn} 0.8s ease-out 0.3s both` : undefined}
            >
              <Text fontSize="3xl" fontWeight="bold">
                {celebrationLevel.title}
              </Text>
              <Text fontSize="lg" opacity={0.9}>
                {celebrationLevel.subtitle}
              </Text>
            </VStack>
            
            {/* Transparency score display */}
            <Box
              opacity={animationStage >= 3 ? 1 : 0}
              animation={animationStage >= 3 ? `${bounceIn} 0.8s ease-out 0.6s both` : undefined}
            >
              <VStack spacing={3}>
                <Text fontSize="sm" opacity={0.8}>
                  {celebrationData.farmName} • {celebrationData.productName}
                </Text>
                <HStack spacing={4}>
                  <Circle size={16} bg="whiteAlpha.200" color="white">
                    <VStack spacing={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        {celebrationData.transparencyScore}%
                      </Text>
                      <Text fontSize="xs" opacity={0.8}>
                        Transparente
                      </Text>
                    </VStack>
                  </Circle>
                </HStack>
              </VStack>
            </Box>
          </VStack>
          
          <ModalCloseButton color="white" />
        </Box>

        <ModalBody px={6} py={6}>
          <VStack spacing={6}>
            {/* Impact message */}
            <Box
              p={4}
              bg="green.50"
              borderRadius="xl"
              borderLeft="4px solid"
              borderColor="green.400"
              w="full"
            >
              <HStack spacing={3}>
                <Icon as={MdEco} color="green.500" boxSize={6} />
                <VStack align="start" spacing={1} flex={1}>
                  <Text fontSize="md" fontWeight="bold" color={textColor}>
                    Tu Impacto Positivo
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    {celebrationData.impactMessage}
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Achievements showcase */}
            {celebrationData.achievements.length > 0 && (
              <Box w="full">
                <Text fontSize="lg" fontWeight="bold" color={textColor} mb={3}>
                  Transparencia Destacada
                </Text>
                <SimpleGrid columns={2} spacing={3}>
                  {celebrationData.achievements.slice(0, 4).map((achievement, index) => (
                    <Box
                      key={achievement.id}
                      p={4}
                      bg="gray.50"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.200"
                      position="relative"
                      overflow="hidden"
                    >
                      {achievement.isNew && (
                        <Badge
                          colorScheme="green"
                          variant="solid"
                          position="absolute"
                          top={2}
                          right={2}
                          borderRadius="full"
                          fontSize="xs"
                          animation={`${sparkle} 2s ease-in-out infinite`}
                        >
                          NUEVO
                        </Badge>
                      )}
                      <VStack spacing={2}>
                        <Circle size={10} bg="green.100" color="green.600">
                          <Icon as={achievement.icon} boxSize={5} />
                        </Circle>
                        <VStack spacing={0}>
                          <Text fontSize="sm" fontWeight="bold" color={textColor} textAlign="center">
                            {achievement.name}
                          </Text>
                          <Text fontSize="xs" color={mutedColor} textAlign="center">
                            {achievement.description}
                          </Text>
                        </VStack>
                      </VStack>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Consumer action message */}
            <Box
              p={4}
              bg="blue.50"
              borderRadius="xl"
              w="full"
              textAlign="center"
            >
              <VStack spacing={3}>
                <Icon as={MdStars} color="blue.500" boxSize={8} />
                <VStack spacing={1}>
                  <Text fontSize="md" fontWeight="bold" color={textColor}>
                    ¡Gracias por Apoyar la Transparencia!
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    {celebrationData.consumerMessage}
                  </Text>
                </VStack>
              </VStack>
            </Box>

            {/* Action buttons */}
            <VStack spacing={3} w="full">
              <Button
                colorScheme="green"
                size="lg"
                leftIcon={<Icon as={FaLeaf} />}
                onClick={handleShare}
                w="full"
                borderRadius="xl"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }}
              >
                Compartir Mi Elección Transparente
              </Button>
              
              <Button
                variant="outline"
                colorScheme="blue"
                size="md"
                onClick={handleLearnMore}
                w="full"
                borderRadius="xl"
              >
                Aprender Sobre Transparencia Agrícola
              </Button>
            </VStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default TransparencyCelebration;