import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Circle,
  useColorModeValue,
  useBreakpointValue,
  Collapse,
  Divider
} from '@chakra-ui/react';
import {
  FaChartLine,
  FaQrcode,
  FaHandshake,
  FaStar,
  FaChevronDown,
  FaChevronUp,
  FaLightbulb
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { StandardPage, StandardCard } from '../../../components/Design/StandardComponents';

interface TopicSection {
  headingKey: string;
  bodyKey: string;
}

interface EducationTopic {
  id: string;
  titleKey: string;
  descriptionKey: string;
  tipKey: string;
  icon: React.ElementType;
  color: string;
  readMinutes: number;
  sections: TopicSection[];
}

const TOPICS: EducationTopic[] = [
  {
    id: 'topic1',
    titleKey: 'consumer.education.topic1.title',
    descriptionKey: 'consumer.education.topic1.description',
    tipKey: 'consumer.education.topic1.tip',
    icon: FaChartLine,
    color: 'green',
    readMinutes: 3,
    sections: [
      {
        headingKey: 'consumer.education.topic1.section1.heading',
        bodyKey: 'consumer.education.topic1.section1.body'
      },
      {
        headingKey: 'consumer.education.topic1.section2.heading',
        bodyKey: 'consumer.education.topic1.section2.body'
      },
      {
        headingKey: 'consumer.education.topic1.section3.heading',
        bodyKey: 'consumer.education.topic1.section3.body'
      }
    ]
  },
  {
    id: 'topic2',
    titleKey: 'consumer.education.topic2.title',
    descriptionKey: 'consumer.education.topic2.description',
    tipKey: 'consumer.education.topic2.tip',
    icon: FaQrcode,
    color: 'blue',
    readMinutes: 3,
    sections: [
      {
        headingKey: 'consumer.education.topic2.section1.heading',
        bodyKey: 'consumer.education.topic2.section1.body'
      },
      {
        headingKey: 'consumer.education.topic2.section2.heading',
        bodyKey: 'consumer.education.topic2.section2.body'
      },
      {
        headingKey: 'consumer.education.topic2.section3.heading',
        bodyKey: 'consumer.education.topic2.section3.body'
      }
    ]
  },
  {
    id: 'topic3',
    titleKey: 'consumer.education.topic3.title',
    descriptionKey: 'consumer.education.topic3.description',
    tipKey: 'consumer.education.topic3.tip',
    icon: FaHandshake,
    color: 'purple',
    readMinutes: 4,
    sections: [
      {
        headingKey: 'consumer.education.topic3.section1.heading',
        bodyKey: 'consumer.education.topic3.section1.body'
      },
      {
        headingKey: 'consumer.education.topic3.section2.heading',
        bodyKey: 'consumer.education.topic3.section2.body'
      },
      {
        headingKey: 'consumer.education.topic3.section3.heading',
        bodyKey: 'consumer.education.topic3.section3.body'
      }
    ]
  },
  {
    id: 'topic4',
    titleKey: 'consumer.education.topic4.title',
    descriptionKey: 'consumer.education.topic4.description',
    tipKey: 'consumer.education.topic4.tip',
    icon: FaStar,
    color: 'orange',
    readMinutes: 3,
    sections: [
      {
        headingKey: 'consumer.education.topic4.section1.heading',
        bodyKey: 'consumer.education.topic4.section1.body'
      },
      {
        headingKey: 'consumer.education.topic4.section2.heading',
        bodyKey: 'consumer.education.topic4.section2.body'
      },
      {
        headingKey: 'consumer.education.topic4.section3.heading',
        bodyKey: 'consumer.education.topic4.section3.body'
      }
    ]
  }
];

export default function ConsumerEducationHub() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const tipBg = useColorModeValue('green.50', 'green.900');
  const tipBorder = useColorModeValue('green.200', 'green.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const toggleTopic = (topicId: string) => {
    setExpandedTopic((prev) => (prev === topicId ? null : topicId));
  };

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'consumer.education.pageTitle' })}
      description={intl.formatMessage({ id: 'consumer.education.pageDescription' })}
      showBackButton
      onBack={() => navigate(-1)}>
      <VStack spacing={8} align="stretch">
        {TOPICS.map((topic) => {
          const isExpanded = expandedTopic === topic.id;

          return (
            <StandardCard key={topic.id} variant="outline" padding={0}>
              {/* Topic Header - Clickable */}
              <Box
                p={{ base: 4, md: 6 }}
                cursor="pointer"
                onClick={() => toggleTopic(topic.id)}
                _hover={{ bg: hoverBg }}
                transition="background 0.2s"
                borderRadius={{ base: 'lg', md: 'xl' }}>
                <HStack spacing={{ base: 3, md: 4 }} align="start">
                  <Circle
                    size={{ base: '44px', md: '50px' }}
                    bg={`${topic.color}.100`}
                    color={`${topic.color}.600`}
                    flexShrink={0}>
                    <Icon as={topic.icon} boxSize={{ base: 5, md: 6 }} />
                  </Circle>

                  <VStack align="start" spacing={1} flex={1} minW={0}>
                    <HStack justify="space-between" w="full">
                      <Text
                        fontWeight="bold"
                        fontSize={{ base: 'sm', md: 'md' }}
                        color={textColor}
                        noOfLines={2}>
                        {intl.formatMessage({ id: topic.titleKey })}
                      </Text>
                      <Icon
                        as={isExpanded ? FaChevronUp : FaChevronDown}
                        color={mutedColor}
                        boxSize={{ base: 3, md: 4 }}
                        flexShrink={0}
                        ml={2}
                      />
                    </HStack>
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color={mutedColor} noOfLines={2}>
                      {intl.formatMessage({ id: topic.descriptionKey })}
                    </Text>
                    <Text fontSize="xs" color={mutedColor} fontWeight="medium">
                      {intl.formatMessage(
                        { id: 'consumer.education.readTime' },
                        { minutes: topic.readMinutes }
                      )}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Topic Content - Expandable */}
              <Collapse in={isExpanded} animateOpacity>
                <Divider />
                <VStack spacing={4} align="stretch" p={{ base: 4, md: 6 }} pt={{ base: 4, md: 5 }}>
                  {topic.sections.map((section, idx) => (
                    <Box key={idx} bg={sectionBg} p={{ base: 4, md: 5 }} borderRadius="lg">
                      <Text
                        fontWeight="semibold"
                        fontSize={{ base: 'sm', md: 'md' }}
                        color={textColor}
                        mb={2}>
                        {intl.formatMessage({ id: section.headingKey })}
                      </Text>
                      <Text
                        fontSize={{ base: 'xs', md: 'sm' }}
                        color={mutedColor}
                        lineHeight="tall">
                        {intl.formatMessage({ id: section.bodyKey })}
                      </Text>
                    </Box>
                  ))}

                  {/* Tip Box */}
                  <Box
                    bg={tipBg}
                    p={4}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={tipBorder}>
                    <HStack align="start" spacing={3}>
                      <Icon
                        as={FaLightbulb}
                        color="green.500"
                        boxSize={{ base: 4, md: 5 }}
                        mt={0.5}
                        flexShrink={0}
                      />
                      <Text
                        fontSize={{ base: 'xs', md: 'sm' }}
                        color={textColor}
                        fontWeight="medium"
                        lineHeight="tall">
                        {intl.formatMessage({ id: topic.tipKey })}
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              </Collapse>
            </StandardCard>
          );
        })}
      </VStack>
    </StandardPage>
  );
}
