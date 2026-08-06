import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Circle
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaRecycle,
  FaAppleAlt,
  FaTruck,
  FaWater,
  FaSeedling,
  FaCarrot
} from 'react-icons/fa';
import { MdEco, MdLocalFlorist, MdNoFood } from 'react-icons/md';
import { useIntl } from 'react-intl';

interface SustainabilityPractice {
  icon: React.ReactElement;
  title: string;
  description: string;
}

/**
 * NOTE: this component used to take a `carbonScore` and drive a verdict ladder off it —
 * an "{Excellent|Good|Average|Fair} Score" badge, a tiered title/description
 * ("Excellent Choice", "lower carbon footprint than average"), and score-keyed colours.
 * The prop was removed in 2026-07 rather than merely unused, so no caller can reintroduce
 * the grading: a self-assigned 0-100 score rendered as a verdict on a consumer surface is
 * the self-created sustainability label banned by EU ECGT 2024/825 (live 2026-09-27), and
 * "lower carbon footprint than average" is an unsubstantiated comparative claim under FTC
 * 16 CFR 260.4(c). What remains — the documented practice list — is the factual story.
 */
interface ConsumerSustainabilityInfoProps {
  productName: string;
  sustainabilityPractices?: SustainabilityPractice[];
}

export const ConsumerSustainabilityInfo: React.FC<ConsumerSustainabilityInfoProps> = ({
  productName,
  sustainabilityPractices = []
}) => {
  const intl = useIntl();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const accentColor = useColorModeValue('green.500', 'green.300');

  // Default sustainability practices if none provided
  const defaultPractices: SustainabilityPractice[] = [
    {
      icon: <Icon as={FaWater} color="blue.400" />,
      title: intl.formatMessage({ id: 'app.waterConservation' }),
      description: 'This product is grown using water-saving techniques like drip irrigation'
    },
    {
      icon: <Icon as={MdNoFood} color="red.400" />,
      title: intl.formatMessage({ id: 'app.reducedPesticides' }),
      description: 'Minimal or no synthetic pesticides were used in growing this product'
    },
    {
      icon: <Icon as={FaLeaf} color="green.400" />,
      title: intl.formatMessage({ id: 'app.soilHealth' }),
      description: 'Practices like cover cropping maintain soil health and capture carbon'
    },
    {
      icon: <Icon as={FaRecycle} color="purple.400" />,
      title: intl.formatMessage({ id: 'app.sustainablePackaging' }),
      description: 'This product uses recyclable or biodegradable packaging materials'
    }
  ];

  const practices = sustainabilityPractices.length > 0 ? sustainabilityPractices : defaultPractices;

  // The score-tiered getConsumerImpact() ladder that used to live here was deleted — see
  // the note on ConsumerSustainabilityInfoProps above.

  return (
    <Box bg={bgColor} borderRadius="lg" boxShadow="md" p={6}>
      <VStack spacing={6} align="stretch">
        <Heading size="md" color={accentColor}>
          {intl.formatMessage({ id: 'app.sustainabilityHighlights' })}
        </Heading>

        {/* The "{Excellent|Good|Average|Fair} Score" badge and the score-tiered impact panel
            that used to sit here are gone — see the note on the props interface. Colour was
            part of the claim too: green-through-orange keyed to the score grades the farm
            wordlessly, which is the same label in a different medium. */}
        {/* Sustainability practices */}
        <Heading size="sm" mt={2}>
          {intl.formatMessage({ id: 'app.whatMakesProductSustainable' })}
        </Heading>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {practices.map((practice, index) => (
            <HStack
              key={index}
              p={3}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'sm' }}
              align="flex-start"
            >
              <Circle size="40px" bg="green.50" mt={1}>
                {practice.icon}
              </Circle>
              <Box>
                <Text fontWeight="bold" fontSize="sm">
                  {practice.title}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {practice.description}
                </Text>
              </Box>
            </HStack>
          ))}
        </SimpleGrid>

        {/* Consumer actions */}
        <Box p={4} bg="blue.50" borderRadius="md" mt={2}>
          <Heading size="sm" mb={3} color="blue.600">
            {intl.formatMessage({ id: 'app.whatYouCanDo' })}
          </Heading>
          <VStack spacing={2} align="stretch">
            <HStack>
              <Icon as={FaRecycle} color="blue.500" />
              <Text fontSize="sm">{intl.formatMessage({ id: 'app.recyclePackaging' })}</Text>
            </HStack>
            <HStack>
              <Icon as={FaLeaf} color="blue.500" />
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'app.shareSustainabilityStory' })}
              </Text>
            </HStack>
            <HStack>
              <Icon as={FaCarrot} color="blue.500" />
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'app.lookForHighScoreProducts' })}
              </Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};
