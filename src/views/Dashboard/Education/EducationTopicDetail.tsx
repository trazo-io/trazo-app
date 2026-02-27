import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  UnorderedList,
  ListItem,
  Grid,
  Link
} from '@chakra-ui/react';
import {
  FaBook,
  FaLeaf,
  FaQrcode,
  FaChartLine,
  FaRocket,
  FaTractor,
  FaShieldAlt,
  FaCheckCircle,
  FaPlayCircle,
  FaCamera,
  FaTrophy,
  FaUsers,
  FaCrown,
  FaCogs,
  FaDollarSign,
  FaMicrophone,
  FaWifi,
  FaMobile,
  FaCalculator,
  FaFlask,
  FaDatabase,
  FaGasPump,
  FaBolt,
  FaSeedling,
  FaExternalLinkAlt,
  FaLink,
  FaPlug,
  FaUnlock,
  FaLightbulb,
  FaBullhorn,
  FaBuilding,
  FaSyncAlt
} from 'react-icons/fa';
import { StandardPage } from 'components/Design/StandardComponents';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface DocumentationTopic {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
  content: React.ReactNode;
}

const EducationTopicDetail: React.FC = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const documentationTopics: DocumentationTopic[] = useMemo(
    () => [
      {
        id: 'getting-started',
        title: 'Understanding Trazo: Your Agricultural Transparency Platform',
        description:
          'Learn how Trazo transforms farm documentation into consumer trust and premium pricing',
        icon: FaRocket,
        category: 'Getting Started',
        content: (
          <VStack spacing={6} align="start">
            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Welcome to Trazo!</AlertTitle>
                <AlertDescription>
                  Trazo is the first agricultural transparency platform that rewards farmers for
                  detailed documentation. The more you document, the higher your transparency score,
                  and the more consumers trust your products.
                </AlertDescription>
              </Box>
            </Alert>

            <HStack spacing={2} mb={3}>
              <Icon as={FaPlayCircle} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                How Trazo Works
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Document Everything:</strong> Log all 8 types of agricultural events as
                    they happen
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Build Transparency:</strong> More documented events = higher
                    transparency score (0-100%)
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Generate QR Codes:</strong> Create scannable codes for each production
                    batch
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Share with Consumers:</strong> Customers scan QR codes to see your
                    transparency score
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Build Trust & Premium:</strong> Higher transparency = more consumer
                    trust = better prices
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaChartLine} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Why Transparency Matters
              </Heading>
            </HStack>
            <Text>
              87% of consumers want to know how their food was grown, but traditional agriculture
              offers little visibility. Trazo bridges this gap by making your farming practices
              visible and trustworthy to consumers.
            </Text>

            <Text>
              <strong>Key Benefits:</strong>
            </Text>
            <UnorderedList spacing={2} pl={6}>
              <ListItem>
                <strong>Premium Pricing:</strong> Transparent farms command 15-30% price premiums
              </ListItem>
              <ListItem>
                <strong>Consumer Trust:</strong> Build direct relationships with conscious consumers
              </ListItem>
              <ListItem>
                <strong>Market Differentiation:</strong> Stand out from conventional agriculture
              </ListItem>
              <ListItem>
                <strong>Blockchain Verification:</strong> Immutable proof of your farming practices
              </ListItem>
              <ListItem>
                <strong>Effortless Marketing:</strong> QR codes do the storytelling for you
              </ListItem>
            </UnorderedList>

            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Trazo's Revolutionary Approach</AlertTitle>
                <AlertDescription>
                  Unlike carbon platforms that penalize farmers for logging events (more data =
                  higher emissions = worse score), Trazo rewards comprehensive documentation (more
                  events = higher transparency = better consumer trust).
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'farm-events',
        title: 'The 8 Core Event Types: Your Transparency Building Blocks',
        description:
          'Master each event type to maximize your transparency score and consumer trust',
        icon: FaTractor,
        category: 'Farm Documentation',
        content: (
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              Every agricultural activity you document increases your transparency score. Here are
              the 8 core event types that build consumer trust:
            </Text>

            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaTractor} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Production Events
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      Core farming activities like planting, harvesting, irrigation
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Seed planting, watering, harvesting dates
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaFlask} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Chemical Events
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">Fertilizer and pesticide applications</Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Organic fertilizer, pest control treatments
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaCogs} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Equipment Events
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">Machinery and tool usage</Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Tractor operations, harvester use
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaSeedling} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Soil Management
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">Soil health and preparation activities</Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Composting, cover crops, soil testing
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaShieldAlt} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Pest Management
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">Integrated pest management practices</Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Beneficial insects, organic treatments
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaLeaf} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Weather Events
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">Weather conditions and climate data</Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Rainfall, temperature, drought conditions
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaChartLine} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Business Events
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">Commercial and certification activities</Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Organic certification, market sales
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaBook} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        Other Farm Activities
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">Other farm activities and notes</Text>
                    <Text fontSize="xs" color="gray.600">
                      Examples: Farm visits, maintenance, observations
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Pro Tip: Document Everything!</AlertTitle>
                <AlertDescription>
                  Each event you log increases your transparency score. Aim for 90%+ transparency by
                  documenting all major farming activities. This builds maximum consumer trust and
                  positions you for premium pricing.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'transparency-score',
        title: 'Transparency Scoring: Your Consumer Trust Metric',
        description:
          'Understanding how Trazo calculates transparency scores, category weights, and the 3-tier photo system',
        icon: FaChartLine,
        category: 'Transparency System',
        content: (
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              Your transparency score (0-100%) is the key metric that consumers see when they scan
              your QR codes. It is calculated from <strong>7 weighted categories</strong> of farming
              events, each with smart photo requirements that recognize not every event needs a photo.
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCalculator} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Category Weights
              </Heading>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Your score is a weighted average across 7 documentation categories. Categories with
              higher weight have more impact on your final score.
            </Text>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={3}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="2px solid" borderColor="green.200" bg="green.50">
                  <Heading size="sm" color="green.700" mb={1}>Growing Practices &mdash; 30%</Heading>
                  <Text fontSize="xs" color="gray.600">Planting, harvesting, irrigation, pruning, transplanting, cultivation</Text>
                </Box>
                <Box p={4} borderRadius="lg" border="2px solid" borderColor="orange.200" bg="orange.50">
                  <Heading size="sm" color="orange.700" mb={1}>Treatment Details &mdash; 20%</Heading>
                  <Text fontSize="xs" color="gray.600">Fertilizer, pesticide, fungicide, and herbicide applications</Text>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={1}>Soil Care &mdash; 18%</Heading>
                  <Text fontSize="xs" color="gray.600">Soil tests, organic matter, composting, cover crops, pH adjustments</Text>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={1}>Pest Management &mdash; 12%</Heading>
                  <Text fontSize="xs" color="gray.600">Scouting, beneficial releases, pest ID, trap monitoring, IPM</Text>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={1}>Certifications &mdash; 10%</Heading>
                  <Text fontSize="xs" color="gray.600">Organic certifications, inspections, quality standards</Text>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={1}>Weather &amp; General &mdash; 5% each</Heading>
                  <Text fontSize="xs" color="gray.600">Weather observations, farm notes, and other activities</Text>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCamera} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                3-Tier Photo System
              </Heading>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Not every event needs a photo. Trazo classifies each event type into one of three tiers
              based on how important visual evidence is for consumer trust.
            </Text>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="2px solid" borderColor="red.200" bg="red.50">
                  <Heading size="sm" color="red.700" mb={2}>
                    Essential (up to 50% penalty)
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mb={2}>
                    Missing photos on these events cuts their contribution in half.
                  </Text>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>Planting &amp; Harvesting</ListItem>
                    <ListItem>All chemical applications (fertilizer, pesticide, fungicide, herbicide)</ListItem>
                    <ListItem>Cover crops</ListItem>
                    <ListItem>Beneficial insect releases &amp; Pest identification</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="2px solid" borderColor="yellow.200" bg="yellow.50">
                  <Heading size="sm" color="yellow.700" mb={2}>
                    Recommended (up to 25% penalty)
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mb={2}>
                    Photos add value, but we understand these are harder to capture.
                  </Text>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>Pruning, transplanting, cultivation</ListItem>
                    <ListItem>Soil tests, organic matter, composting</ListItem>
                    <ListItem>Scouting, trap monitoring, IPM</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="2px solid" borderColor="green.200" bg="green.50">
                  <Heading size="sm" color="green.700" mb={2}>
                    No Penalty
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mb={2}>
                    Photos are optional &mdash; these events score fully from documentation alone.
                  </Text>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>Irrigation, equipment maintenance, thinning</ListItem>
                    <ListItem>All weather events</ListItem>
                    <ListItem>All business/certification events</ListItem>
                    <ListItem>General notes and observations</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaTrophy} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Transparency Score Ranges
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="green.600" mb={2}>
                    Excellent (90%+)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>All 7 categories documented</ListItem>
                    <ListItem>Essential events have photos</ListItem>
                    <ListItem>Green trust indicators on QR page</ListItem>
                    <ListItem>Maximum consumer confidence</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="yellow.600" mb={2}>
                    Good (70-89%)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Most categories documented</ListItem>
                    <ListItem>Some photo gaps in essential events</ListItem>
                    <ListItem>Strong consumer trust</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="orange.600" mb={2}>
                    Needs Improvement (below 60%)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Several empty categories</ListItem>
                    <ListItem>Missing photos on essential events</ListItem>
                    <ListItem>Limited consumer trust</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Consumer Impact</AlertTitle>
                <AlertDescription>
                  Farms with 90%+ transparency scores see 3x higher consumer engagement and 25%
                  price premiums. Focus your photo effort on essential events (planting, harvest,
                  chemical applications) for the biggest score improvement.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'qr-codes',
        title: 'QR Codes & Consumer Pages: Your Digital Farm Story',
        description: 'Create compelling consumer experiences that showcase your transparency',
        icon: FaQrcode,
        category: 'Consumer Engagement',
        content: (
          <VStack spacing={6} align="start">
            <HStack spacing={2} mb={3}>
              <Icon as={FaQrcode} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                How Consumer QR Pages Work
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Progressive Loading:</strong> Transparency score loads first (under
                    1.5s), then details
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Consumer-Friendly Language:</strong> "95% transparency" not "2.4kg CO2e"
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Farming Journey:</strong> Timeline of documented practices
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Trust Indicators:</strong> Verification badges and photo evidence
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Carbon Details:</strong> Environmental data available on request
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCheckCircle} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                QR Code Best Practices
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>📱 Mobile-First Design:</strong> Pages load in under 1.5s on mobile
                  devices
                </Text>
                <Text>
                  <strong>🎯 Clear Value Proposition:</strong> "Scan to see how this was grown"
                </Text>
                <Text>
                  <strong>📍 Strategic Placement:</strong> Product packaging, farmers market signs,
                  website
                </Text>
                <Text>
                  <strong>🔄 Regular Updates:</strong> Fresh content keeps consumers engaged
                </Text>
                <Text>
                  <strong>📊 Track Performance:</strong> Monitor scan rates and consumer engagement
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaUsers} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                What Consumers See
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Instant Trust:</strong> Large transparency score with verification badges
                </Text>
                <Text>
                  <strong>Farm Story:</strong> "See exactly how this avocado was grown"
                </Text>
                <Text>
                  <strong>Event Timeline:</strong> Chronological farming practices with photos
                </Text>
                <Text>
                  <strong>Trust Builders:</strong> Blockchain verification, real farmer photos
                </Text>
                <Text>
                  <strong>Environmental Details:</strong> Carbon footprint in expandable section
                </Text>
              </VStack>
            </Box>

            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Success Metrics</AlertTitle>
                <AlertDescription>
                  Farms using Trazo QR codes see average 78% consumer page completion rates, 340%
                  higher engagement than traditional carbon labels, and direct consumer
                  relationships that drive repeat purchases.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'blockchain',
        title: 'Blockchain Verification: Immutable Trust Infrastructure',
        description: 'How Trazo uses Polygon blockchain to create unshakeable consumer confidence',
        icon: FaShieldAlt,
        category: 'Verification System',
        content: (
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              When you finish a production, Trazo creates a permanent, tamper-proof record of
              everything you documented on the Polygon blockchain. Consumers can independently
              verify this record, building unshakeable confidence in your farming practices.
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaShieldAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Why Blockchain for Agriculture?
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Immutable Records:</strong> Once recorded, farming data cannot be
                  changed or deleted &mdash; not even by Trazo
                </Text>
                <Text>
                  <strong>Global Verification:</strong> Anyone can independently verify your
                  claims through a public blockchain explorer
                </Text>
                <Text>
                  <strong>Low Cost:</strong> Polygon network enables affordable verification
                  (about $0.01 per production)
                </Text>
                <Text>
                  <strong>Consumer Trust:</strong> Replaces &quot;trust us&quot; with
                  &quot;verify it yourself&quot;
                </Text>
                <Text>
                  <strong>Easy Access:</strong> Verification badge visible on every QR code page
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCheckCircle} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                How It Works
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Step 1 &mdash; Document as usual:</strong> Log your farming events
                  throughout the production cycle (planting, irrigation, fertilization, harvest, etc.)
                </Text>
                <Text>
                  <strong>Step 2 &mdash; Finish your production:</strong> When you click
                  &quot;Finish Production,&quot; Trazo creates a digital fingerprint of ALL your
                  documented events. This seals the record.
                </Text>
                <Text>
                  <strong>Step 3 &mdash; Automatic blockchain submission:</strong> Trazo
                  automatically submits your production&apos;s fingerprint to the Polygon
                  blockchain in the next monthly batch.
                </Text>
                <Text>
                  <strong>Step 4 &mdash; Badge appears:</strong> Your QR code page displays a
                  &quot;Blockchain Verified&quot; badge with a link to the public transaction.
                </Text>
              </VStack>
            </Box>

            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>One Record Per Production</AlertTitle>
                <AlertDescription>
                  Blockchain verification covers your entire production &mdash; all events in one
                  permanent record. You don&apos;t need to do anything special. Just document your
                  farming as usual and finish your production when it&apos;s ready.
                </AlertDescription>
              </Box>
            </Alert>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCheckCircle} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                What Gets Verified
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    All Farming Events
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Every event you documented during the production</ListItem>
                    <ListItem>Activity types, dates, and details</ListItem>
                    <ListItem>Product quantities and varieties</ListItem>
                    <ListItem>Chemical and fertilizer applications</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    Production Data
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Carbon footprint calculations per activity</ListItem>
                    <ListItem>Complete production timeline (start to finish)</ListItem>
                    <ListItem>Data integrity fingerprint</ListItem>
                    <ListItem>Total environmental impact</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaUsers} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                What Consumers See
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Verification Badge:</strong> A &quot;Blockchain Verified&quot; badge
                  appears on your product&apos;s QR code page
                </Text>
                <Text>
                  <strong>Explorer Link:</strong> Consumers can click through to Polygonscan
                  to see the actual blockchain transaction
                </Text>
                <Text>
                  <strong>Trust Signal:</strong> The badge proves your data was sealed at a
                  specific point in time and hasn&apos;t been changed
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaShieldAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Getting Started
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>1. Purchase the add-on:</strong> Go to your subscription page and add
                  &quot;Blockchain Verification&quot; to your plan
                </Text>
                <Text>
                  <strong>2. Document your production:</strong> Log events as you normally do
                </Text>
                <Text>
                  <strong>3. Finish your production:</strong> Click &quot;Finish Production&quot;
                  when the growing cycle is complete
                </Text>
                <Text>
                  <strong>4. Automatic verification:</strong> Your production is submitted to
                  blockchain in the next monthly batch &mdash; no extra steps needed
                </Text>
              </VStack>
            </Box>

            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>About Polygon</AlertTitle>
                <AlertDescription>
                  Trazo uses the energy-efficient Polygon blockchain, consuming 99% less energy than
                  Bitcoin while providing the same level of verification security. Each production
                  costs about $0.01 to verify &mdash; included in your subscription.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'carbon-data',
        title: "Carbon Data's Supporting Role in the Transparency-First Approach",
        description:
          'Understanding how environmental data enhances transparency without overwhelming consumers',
        icon: FaLeaf,
        category: 'Environmental Impact',
        content: (
          <VStack spacing={6} align="start">
            <Alert status="warning" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Important Context: Trazo's Strategic Evolution</AlertTitle>
                <AlertDescription>
                  Trazo evolved from carbon-first to transparency-first after discovering that
                  carbon-focused systems penalize farmers for comprehensive documentation. Our new
                  approach rewards transparency while maintaining full carbon accuracy for B2B
                  customers.
                </AlertDescription>
              </Box>
            </Alert>

            <HStack spacing={2} mb={3}>
              <Icon as={FaLeaf} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                The Transparency-First Philosophy
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Primary Metric:</strong> Transparency Score (0-100%) - rewards
                  comprehensive documentation
                </Text>
                <Text>
                  <strong>Secondary Data:</strong> Carbon Footprint - available for interested
                  consumers and B2B
                </Text>
                <Text>
                  <strong>Consumer Focus:</strong> "95% transparency - see how this was grown"
                </Text>
                <Text>
                  <strong>Progressive Disclosure:</strong> Environmental details in expandable
                  sections
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaChartLine} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Carbon Data Still Matters For:
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🏢 B2B Customers
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Supply chain sustainability reporting</ListItem>
                    <ListItem>Corporate environmental compliance</ListItem>
                    <ListItem>LCA methodology requirements</ListItem>
                    <ListItem>Regulatory carbon reporting</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📊 Internal Farm Management
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Identifying optimization opportunities</ListItem>
                    <ListItem>Benchmarking against industry standards</ListItem>
                    <ListItem>Track improvement over time</ListItem>
                    <ListItem>Transparency improvement tracking</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaDatabase} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                USDA Integration & Accuracy
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Government-Verified Data:</strong> All emission factors sourced from EPA
                  and USDA
                </Text>
                <Text>
                  <strong>Real Farm Operations:</strong> Calculations based on actual fuel,
                  fertilizer, and equipment use
                </Text>
                <Text>
                  <strong>Scope Definition:</strong> Focus on farmer-controlled emissions (direct
                  operations only)
                </Text>
                <Text>
                  <strong>Continuous Updates:</strong> Emission factors updated with latest
                  government data
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaUsers} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Consumer Presentation Strategy
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Lead with Transparency:</strong> "95% transparency" prominently displayed
                </Text>
                <Text>
                  <strong>Environmental Context:</strong> "Low environmental impact" vs "2.4 kg
                  CO2e"
                </Text>
                <Text>
                  <strong>Expandable Details:</strong> Full carbon data available for interested
                  consumers
                </Text>
                <Text>
                  <strong>Trust Building:</strong> Focus on documented practices over numerical
                  accuracy
                </Text>
              </VStack>
            </Box>

            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Best of Both Worlds</AlertTitle>
                <AlertDescription>
                  Trazo maintains full carbon calculation accuracy for technical users while
                  presenting consumer-friendly transparency scores that build trust and drive
                  purchasing decisions. This dual approach serves both farmers and their diverse
                  customer base.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'carbon-methodology',
        title: 'Carbon Calculation Methodology: How We Calculate Environmental Impact',
        description:
          'Detailed explanation of our carbon calculation methods using published EPA emission factors',
        icon: FaCalculator,
        category: 'Environmental Impact',
        content: (
          <VStack spacing={6} align="start">
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Verified Government Sources</AlertTitle>
                <AlertDescription>
                  All emission factors in Trazo are sourced from official EPA and USDA publications.
                  This ensures accuracy, credibility, and alignment with government regulatory
                  standards.
                </AlertDescription>
              </Box>
            </Alert>

            <HStack spacing={2} mb={3}>
              <Icon as={FaDatabase} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Our Data Sources
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={4} align="start">
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">EPA Greenhouse Gas Emission Factors Hub</Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    40 CFR Part 98 - The official U.S. Environmental Protection Agency source for
                    stationary and mobile combustion emission factors. Updated annually.
                  </Text>
                  <Link
                    href="https://www.epa.gov/climateleadership/ghg-emission-factors-hub"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    epa.gov/climateleadership/ghg-emission-factors-hub
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">EPA eGRID2023 Summary Tables</Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    U.S. average electricity emission factors (767.2 lbs/MWh for 2023). Accounts for
                    the mix of energy sources in the electrical grid.
                  </Text>
                  <Link
                    href="https://www.epa.gov/egrid/summary-data"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    epa.gov/egrid/summary-data
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">EIA Annual Energy Review</Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    U.S. Energy Information Administration - electricity generation and emissions
                    data validation (0.81 lbs/kWh = 0.367 kg/kWh for 2023).
                  </Text>
                  <Link
                    href="https://www.eia.gov/tools/faqs/faq.php?id=74&t=11"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    eia.gov - Electricity CO₂ FAQ
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">IPCC 2006/2019 Guidelines</Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    Intergovernmental Panel on Climate Change - N₂O emission factors for
                    agricultural soils (EF1 = 1% of applied N, GWP = 265).
                  </Text>
                  <Link
                    href="https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_11_Ch11_N2O&CO2.pdf"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    IPCC Vol 4 Ch 11 - N₂O Emissions (PDF)
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">USDA Agricultural Research Service</Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    Farm energy use data, crop production fuel consumption, and agricultural
                    machinery efficiency standards.
                  </Text>
                  <Link
                    href="https://www.ars.usda.gov"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    ars.usda.gov
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">USDA NRCS Irrigation Pumping Plants Guide</Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    National Engineering Handbook Chapter 8 - Energy consumption factors for
                    irrigation pumping systems based on depth, volume, and equipment efficiency.
                  </Text>
                  <Link
                    href="https://www.wcc.nrcs.usda.gov/ftpref/wntsc/waterMgt/irrigation/NEH15/ch8.pdf"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    NRCS National Engineering Handbook - Chapter 8 (PDF)
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">Pesticide Manufacturing LCA Studies</Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    Lal (2004): Herbicides 6.3±2.7, Insecticides 5.1±3.0, Fungicides 3.9±2.2 kg
                    CO₂e/kg AI. Audsley et al.: Higher estimates (18-27 kg for herbicides).
                  </Text>
                  <Link
                    href="https://www.sciencedirect.com/science/article/abs/pii/S0160412004000832"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center"
                  >
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    Lal 2004 - Carbon emission from farm operations
                  </Link>
                </Box>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaGasPump} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Diesel Fuel Emission Factors
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>EPA Mobile Combustion Factor:</strong> 10.21 kg CO₂ per gallon of diesel
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Source: EPA Greenhouse Gas Emission Factors Hub (40 CFR Part 98) - Mobile
                  combustion for agricultural equipment
                </Text>
                <Text fontSize="sm">
                  <strong>Confidence Level:</strong> 95% - This is the most reliable emission factor
                  as it comes directly from federal regulatory standards.
                </Text>
                <Box bg="white" p={3} borderRadius="md" w="full">
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    How We Use This:
                  </Text>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Harvesting equipment: 0.7 gallons per hectare</ListItem>
                    <ListItem>Planting equipment: 1.8 gallons per hectare</ListItem>
                    <ListItem>Transplanting operations: 2.4 gallons per hectare</ListItem>
                    <ListItem>General production: 2.5 gallons per hectare</ListItem>
                  </UnorderedList>
                </Box>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaBolt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Electricity Emission Factors
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>EPA eGRID U.S. Average:</strong> 0.39 kg CO₂ per kWh (delivered
                  electricity)
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Source: EPA eGRID2023 Summary Tables (767.2 lbs/MWh) + 5.12% T&D losses
                </Text>

                <Text fontSize="sm">
                  <strong>Confidence Level:</strong> 95% - Based on the national electricity grid
                  mix; actual emissions vary by region.
                </Text>
                <Box bg="white" p={3} borderRadius="md" w="full">
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Agricultural Applications:
                  </Text>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      Irrigation pumps (deep well 200+ ft): 3.5 kWh per 1,000 gallons pumped
                    </ListItem>
                    <ListItem>
                      Irrigation pumps (standard 50-100 ft): 0.85 kWh per 1,000 gallons pumped
                    </ListItem>
                    <ListItem>Wind machines (frost protection): 35 kWh per hour</ListItem>
                    <ListItem>Misting systems: 12 kWh per hour per acre</ListItem>
                  </UnorderedList>
                </Box>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaSeedling} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Fertilizer Emission Factors
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Box overflowX="auto" w="full">
                  <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                    gap={3}
                    minW={{ base: '280px', md: 'auto' }}
                  >
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontWeight="bold" color="gray.700">
                        Nitrogen (N)
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        10.5 kg CO₂/kg N
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Manufacturing (~2.6) + N₂O (~4.2) + indirect (~3.7)
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontWeight="bold" color="gray.700">
                        Phosphorus (P₂O₅)
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        1.19 kg CO₂/kg
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Manufacturing emissions
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontWeight="bold" color="gray.700">
                        Potassium (K₂O)
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        0.65 kg CO₂/kg
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Manufacturing emissions
                      </Text>
                    </Box>
                  </Grid>
                </Box>
                <Text fontSize="sm" color="gray.600">
                  Source: EPA 40 CFR Part 98 (manufacturing) + IPCC 2006/2019 Guidelines (N₂O: EF1 =
                  1% of applied N × 44/28 × GWP 265)
                </Text>
                <Alert status="success" size="sm" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm">
                    <strong>Organic fertilizers</strong> (compost, manure) have much lower
                    emissions: only 0.5 kg CO₂/kg due to minimal manufacturing process.
                  </Text>
                </Alert>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaFlask} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Chemical Application Emission Factors
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text fontWeight="bold">Pesticides & Herbicides</Text>
                <Box overflowX="auto" w="full">
                  <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                    gap={3}
                    minW={{ base: '280px', md: 'auto' }}
                  >
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Synthetic Pesticide
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
                        8.8 kg CO₂/kg AI
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Active ingredient manufacturing
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Organic Pesticide
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        3.5 kg CO₂/kg
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Neem, pyrethrin extraction
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Synthetic Herbicide
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
                        5.5 kg CO₂/kg AI
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Active ingredient manufacturing
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Organic Herbicide
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        1.2 kg CO₂/kg
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Acetic acid/vinegar based
                      </Text>
                    </Box>
                  </Grid>
                </Box>
                <Text fontWeight="bold" mt={2}>
                  Fungicides
                </Text>
                <Box overflowX="auto" w="full">
                  <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                    gap={3}
                    minW={{ base: '280px', md: 'auto' }}
                  >
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Synthetic
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        4.5 kg CO₂/kg AI
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Copper-based
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        5.5 kg CO₂/kg AI
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Higher due to mining
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Sulfur-based
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        1.8 kg CO₂/kg
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Byproduct of refining
                      </Text>
                    </Box>
                  </Grid>
                </Box>
                <Text fontSize="sm" color="gray.600" mt={2}>
                  Sources: EPA Industrial Manufacturing Emission Factors, International Copper
                  Association LCA Studies, ScienceDirect LCA Studies for organic chemicals
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCalculator} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                How We Calculate Total Emissions
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={4} align="start">
                <Text>
                  <strong>Step 1: Event Data Collection</strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  When you log an event, we capture fuel used, area covered, chemicals applied, and
                  equipment hours.
                </Text>

                <Text>
                  <strong>Step 2: Emission Factor Application</strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  We apply the appropriate EPA/USDA emission factor based on the activity type and
                  inputs.
                </Text>

                <Text>
                  <strong>Step 3: Unit Conversion</strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  All values are converted to kg CO₂e (carbon dioxide equivalent) for consistent
                  comparison.
                </Text>

                <Text>
                  <strong>Step 4: Aggregation</strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  Total production footprint = Manufacturing emissions + Application fuel emissions
                </Text>

                <Box bg="white" p={3} borderRadius="md" w="full" mt={2}>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Example Calculation:
                  </Text>
                  <Text fontSize="sm">
                    Applying 100 liters of synthetic herbicide over 5 hectares:
                  </Text>
                  <UnorderedList spacing={1} fontSize="sm" pl={4}>
                    <ListItem>
                      Manufacturing: 100L × 1.0 kg/L × 41% AI × 5.5 kg CO₂/kg = 22.55 kg CO₂e
                    </ListItem>
                    <ListItem>
                      Application fuel: 5 ha × 0.8 L diesel/ha ÷ 3.79 × 10.21 kg/gal = 10.8 kg CO₂e
                    </ListItem>
                    <ListItem>
                      <strong>Total: 33.35 kg CO₂e</strong>
                    </ListItem>
                  </UnorderedList>
                </Box>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaLeaf} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Our Calculation Philosophy
              </Heading>
            </HStack>
            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Direct Operational Focus</AlertTitle>
                <AlertDescription>
                  Trazo calculates <strong>Direct Operational Emissions</strong> - the emissions you
                  directly control through farming decisions. We focus on fuel combustion,
                  fertilizer application, and equipment operation. This approach empowers you with
                  actionable data while maintaining scientific accuracy through EPA and USDA
                  verified emission factors.
                </AlertDescription>
              </Box>
            </Alert>

            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <Heading size="sm" color="gray.700" mb={3}>
                What We Include (Farmer-Controlled)
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">Direct fuel combustion</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">Fertilizer manufacturing + application</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">Equipment operation energy</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">Chemical manufacturing + application</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">Irrigation pumping electricity</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">On-farm processing energy</Text>
                </HStack>
              </Grid>
            </Box>

            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Continuous Improvement</AlertTitle>
                <AlertDescription>
                  Our emission factors are updated regularly as EPA and USDA publish new data. Last
                  update: January 2025. We continuously refine our methodology based on the latest
                  agricultural research and regulatory guidance.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'first-production',
        title: 'Starting Your First Production: From Setup to Success',
        description:
          'Complete walkthrough of creating your first production batch and setting up your farm profile',
        icon: FaPlayCircle,
        category: 'Getting Started',
        content: (
          <VStack spacing={6} align="start">
            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Ready to Start Your Transparency Journey?</AlertTitle>
                <AlertDescription>
                  This guide walks you through creating your first production batch in Trazo,
                  setting up your farm profile, and beginning your path to agricultural transparency
                  success.
                </AlertDescription>
              </Box>
            </Alert>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCogs} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Step 1: Set Up Your Farm Profile
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Farm Information:</strong> Complete your farm name, location, and
                    contact details
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Crop Selection:</strong> Choose your primary crops from Trazo's
                    supported varieties
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Farm Size & Parcels:</strong> Define your growing areas and plot
                    boundaries
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>Farming Approach:</strong> Select conventional, organic, or transitional
                    methods
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaSeedling} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Step 2: Create Your First Production Batch
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Production Details:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>Product name and variety (e.g., "Organic Hass Avocados")</ListItem>
                  <ListItem>Planting/starting date</ListItem>
                  <ListItem>Expected harvest timeframe</ListItem>
                  <ListItem>Production goals and quantity estimates</ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaBook} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Step 3: Log Your First Events
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📝 Start with Production Events
                  </Heading>
                  <Text fontSize="sm">
                    Log planting, seed preparation, or transplanting activities
                  </Text>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📸 Add Photo Evidence
                  </Heading>
                  <Text fontSize="sm">
                    Take photos of your farming activities to boost verification
                  </Text>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaQrcode} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Step 4: Generate Your First QR Code
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>QR Code Creation:</strong> Once you have 3+ documented events, Trazo
                  automatically generates QR codes
                </Text>
                <Text>
                  <strong>Consumer Testing:</strong> Scan your own QR code to see the consumer
                  experience
                </Text>
                <Text>
                  <strong>Transparency Score:</strong> Watch your score increase as you add more
                  documented events
                </Text>
              </VStack>
            </Box>

            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Quick Start Tip</AlertTitle>
                <AlertDescription>
                  Document everything from day one! Even basic activities like soil preparation and
                  seed planting contribute to your transparency score. The more you document early,
                  the higher your consumer trust rating will be at harvest time.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'event-mastery',
        title: 'Mastering Event Documentation: Best Practices Guide',
        description:
          'When and how to log events, photo evidence strategies, and real-time documentation workflows',
        icon: FaCamera,
        category: 'Farm Documentation',
        content: (
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              Master the art of agricultural documentation to maximize your transparency score and
              build unshakeable consumer trust. This guide covers proven strategies from successful
              Trazo farmers.
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCamera} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Real-Time vs Batch Documentation
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="green.600" mb={2}>
                    ⚡ Real-Time Documentation (Best)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Log events as they happen in the field</ListItem>
                    <ListItem>Use mobile app for instant photo capture</ListItem>
                    <ListItem>Voice recording feature for quick notes</ListItem>
                    <ListItem>Higher transparency score weight</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="yellow.600" mb={2}>
                    📝 Batch Documentation (Good)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Log multiple events at end of day</ListItem>
                    <ListItem>Upload photos from camera later</ListItem>
                    <ListItem>Use farm notes to remember details</ListItem>
                    <ListItem>Still contributes to transparency</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCamera} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Photo Evidence Best Practices
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>📸 What to Photograph:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    Equipment in action (tractors, harvesters, irrigation systems)
                  </ListItem>
                  <ListItem>
                    Product application (fertilizers, organic amendments, pest treatments)
                  </ListItem>
                  <ListItem>Crop progress (planting, growth stages, harvest)</ListItem>
                  <ListItem>
                    Quality indicators (soil conditions, plant health, weather conditions)
                  </ListItem>
                  <ListItem>Verification documents (organic certificates, test results)</ListItem>
                </UnorderedList>

                <Text>
                  <strong>📱 Technical Tips:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>Use good lighting - avoid shadows on equipment/crops</ListItem>
                  <ListItem>Include context - show the broader field/operation</ListItem>
                  <ListItem>Capture before/after shots for treatments</ListItem>
                  <ListItem>Include measurement tools for scale reference</ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaMicrophone} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Voice Recording & Quick Notes
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>Voice Commands:</strong> "Record fertilizer application, 50 pounds
                    organic compost, north field"
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>Quick Notes:</strong> Perfect for recording observations while working
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>Hands-Free Operation:</strong> Continue working while documentation
                    happens
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>Auto-Transcription:</strong> Voice notes automatically converted to text
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaLeaf} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Seasonal Documentation Strategy
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="green.600" mb={2}>
                    🌱 Planting Season
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Soil preparation events</ListItem>
                    <ListItem>Seed/seedling documentation</ListItem>
                    <ListItem>Initial irrigation setup</ListItem>
                    <ListItem>Baseline soil testing</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="yellow.600" mb={2}>
                    🌾 Growing Season
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Regular fertilizer applications</ListItem>
                    <ListItem>Pest management activities</ListItem>
                    <ListItem>Irrigation and weather events</ListItem>
                    <ListItem>Growth progress photos</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="orange.600" mb={2}>
                    🍂 Harvest Season
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Harvest timing and methods</ListItem>
                    <ListItem>Quality assessment results</ListItem>
                    <ListItem>Post-harvest handling</ListItem>
                    <ListItem>Final production quantities</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Documentation Success Formula</AlertTitle>
                <AlertDescription>
                  Successful farms document 12-15 events per production cycle with 80% photo
                  evidence. This typically results in 90%+ transparency scores and maximum consumer
                  trust. Remember: every documented activity tells your farm's story to consumers.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'score-optimization',
        title: 'Maximizing Your Transparency Score: 90%+ Strategies',
        description:
          'Proven techniques to achieve excellent transparency scores and maximize consumer trust',
        icon: FaTrophy,
        category: 'Transparency System',
        content: (
          <VStack spacing={6} align="start">
            <Alert status="warning" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Goal: 90%+ Transparency Score</AlertTitle>
                <AlertDescription>
                  Farms with 90%+ transparency scores command 25% price premiums and see 3x higher
                  consumer engagement. This guide shows you exactly how to achieve these scores.
                </AlertDescription>
              </Box>
            </Alert>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCalculator} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Category Weights (What Matters Most)
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Growing Practices (30%):</strong> Planting, harvesting, irrigation, pruning &mdash; the core of your story
                </Text>
                <Text>
                  <strong>Treatment Details (20%):</strong> Fertilizer and chemical applications &mdash; highest consumer sensitivity
                </Text>
                <Text>
                  <strong>Soil Care (18%):</strong> Soil tests, composting, cover crops &mdash; sustainability signals
                </Text>
                <Text>
                  <strong>Pest Management (12%):</strong> Scouting, beneficial releases, IPM practices
                </Text>
                <Text>
                  <strong>Certifications (10%):</strong> Third-party trust &mdash; organic, inspections, quality standards
                </Text>
                <Text>
                  <strong>Weather &amp; General (5% each):</strong> Environmental context and supplementary notes
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaTrophy} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                The 90%+ Scoring Strategy
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    Must-Have Events
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>3+ Production events (planting, harvest, irrigation)</ListItem>
                    <ListItem>2+ Chemical events (fertilizer, organic amendments)</ListItem>
                    <ListItem>1+ Soil management event (composting, soil test)</ListItem>
                    <ListItem>1+ Pest management event (scouting, IPM)</ListItem>
                    <ListItem>1+ Business event (certification, inspection)</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    Photo Strategy (Smart, Not Exhaustive)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem><strong>Always photograph:</strong> planting, harvest, chemical labels</ListItem>
                    <ListItem><strong>When practical:</strong> pruning, soil tests, scouting</ListItem>
                    <ListItem><strong>Skip guilt-free:</strong> irrigation, weather, general notes</ListItem>
                    <ListItem>Chemical events need 2 photos (label + application)</ListItem>
                    <ListItem>All other events need just 1 photo</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaShieldAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Common Scoring Mistakes to Avoid
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Missing photos on essential events:</strong> Planting, harvest, and
                  chemical application photos have the biggest impact &mdash; a 50% penalty per event
                </Text>
                <Text>
                  <strong>Empty high-weight categories:</strong> Having zero events in Growing
                  Practices (30%) or Treatment Details (20%) is more costly than gaps in Weather (5%)
                </Text>
                <Text>
                  <strong>Batch documentation:</strong> Logging events weeks after they happened &mdash;
                  photos must be within 7 days of the event date
                </Text>
                <Text>
                  <strong>Photographing everything equally:</strong> Focus your photo effort on
                  essential events first; irrigation and weather notes don&apos;t need photos at all
                </Text>
                <Text>
                  <strong>Ignoring certifications:</strong> Business events now carry 10% weight &mdash;
                  logging a single certification adds meaningful points
                </Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaSeedling} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Optimization Techniques by Crop Type
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🥑 Tree Fruits (Avocados, Citrus)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>Pruning and tree maintenance events</ListItem>
                    <ListItem>Irrigation system documentation</ListItem>
                    <ListItem>Seasonal pest management</ListItem>
                    <ListItem>Harvest timing and methods</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🌾 Annual Crops (Vegetables, Grains)
                  </Heading>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>Soil preparation and planting</ListItem>
                    <ListItem>Growth stage monitoring</ListItem>
                    <ListItem>Regular fertilizer applications</ListItem>
                    <ListItem>Harvest and post-harvest handling</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🫐 Berries & Specialty Crops
                  </Heading>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>Specialized growing techniques</ListItem>
                    <ListItem>Quality control measures</ListItem>
                    <ListItem>Careful harvest documentation</ListItem>
                    <ListItem>Cold chain and storage events</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Success Benchmark</AlertTitle>
                <AlertDescription>
                  Target: 12-15 documented events per production cycle across all 7 categories.
                  Photograph your essential events (planting, harvest, chemical applications) and you
                  will consistently hit 90%+. Remember: the system rewards you for logging more, not
                  less &mdash; every event raises your score.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'consumer-engagement',
        title: 'Consumer Engagement & Marketing Success',
        description:
          'QR code placement, scan analytics, and building direct customer relationships',
        icon: FaUsers,
        category: 'Consumer Engagement',
        content: (
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              Transform your transparency data into powerful marketing that builds direct consumer
              relationships and drives premium pricing. Learn from farms achieving 78% QR scan
              completion rates and 25% price premiums.
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaQrcode} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Strategic QR Code Placement
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📦 Product Packaging
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Primary Placement:</strong> Front panel, above brand logo
                    </Text>
                    <Text fontSize="sm">
                      <strong>Call to Action:</strong> "Scan to see how this was grown"
                    </Text>
                    <Text fontSize="sm">
                      <strong>Size Guidelines:</strong> Minimum 1 inch square for easy scanning
                    </Text>
                    <Text fontSize="sm">
                      <strong>Testing:</strong> Scan from 3 feet to ensure readability
                    </Text>
                  </VStack>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🛒 Point of Sale
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Farmers Markets:</strong> Table signs with transparency scores
                    </Text>
                    <Text fontSize="sm">
                      <strong>Retail Stores:</strong> Shelf talkers highlighting verification
                    </Text>
                    <Text fontSize="sm">
                      <strong>Online Sales:</strong> Product page QR codes for digital purchases
                    </Text>
                    <Text fontSize="sm">
                      <strong>Farm Store:</strong> Large displays showcasing farm transparency
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaChartLine} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Understanding Your Scan Analytics
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>📊 Key Metrics Trazo Tracks:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    <strong>Scan Rate:</strong> Percentage of products scanned by consumers
                  </ListItem>
                  <ListItem>
                    <strong>Completion Rate:</strong> Percentage of scanners who view full
                    transparency info
                  </ListItem>
                  <ListItem>
                    <strong>Engagement Time:</strong> How long consumers spend on your transparency
                    page
                  </ListItem>
                  <ListItem>
                    <strong>Return Scans:</strong> Repeat customers checking your latest productions
                  </ListItem>
                  <ListItem>
                    <strong>Geographic Data:</strong> Where your products are being scanned
                  </ListItem>
                  <ListItem>
                    <strong>Peak Times:</strong> When consumers are most likely to scan
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaUsers} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Building Direct Consumer Relationships
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>Consumer Education:</strong> QR pages become teaching moments about
                    sustainable farming
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>Trust Building:</strong> Transparency creates emotional connection
                    beyond just product quality
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>Premium Positioning:</strong> 95% transparency score justifies 20-30%
                    price premiums
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>Repeat Purchases:</strong> Consumers return to farmers they trust and
                    understand
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>Word of Mouth:</strong> Transparent farms get 3x more consumer
                    recommendations
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaRocket} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Optimizing Consumer Page Performance
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    ⚡ Speed Optimization
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Under 1.5s load time on mobile</ListItem>
                    <ListItem>Progressive loading design</ListItem>
                    <ListItem>Transparency score appears first</ListItem>
                    <ListItem>Photos optimized for mobile data</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📱 Mobile Experience
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Touch-friendly interface design</ListItem>
                    <ListItem>Easy scrolling through farm timeline</ListItem>
                    <ListItem>Clear trust indicators and badges</ListItem>
                    <ListItem>Social sharing buttons prominent</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    💬 Consumer Communication
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Clear, jargon-free language</ListItem>
                    <ListItem>Visual timeline of farming practices</ListItem>
                    <ListItem>Environmental benefits explained simply</ListItem>
                    <ListItem>Direct farmer contact information</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaBullhorn} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Marketing Integration Strategies
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>🌐 Website Integration:</strong> Embed transparency scores on product
                  pages
                </Text>
                <Text>
                  <strong>📱 Social Media:</strong> Share transparency milestones and
                  behind-the-scenes content
                </Text>
                <Text>
                  <strong>📧 Email Marketing:</strong> Include QR codes in newsletters and customer
                  communications
                </Text>
                <Text>
                  <strong>🏪 Retail Partnerships:</strong> Work with stores to highlight your
                  transparency advantage
                </Text>
                <Text>
                  <strong>🎯 Targeted Campaigns:</strong> Use scan data to understand and reach your
                  ideal customers
                </Text>
              </VStack>
            </Box>

            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Success Metrics to Track</AlertTitle>
                <AlertDescription>
                  Target a 15%+ scan rate and 70%+ completion rate for excellent consumer
                  engagement. Farms achieving these metrics typically see 25% price premiums and
                  develop loyal customer bases that drive sustainable business growth.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'subscription-features',
        title: 'Subscription Features & Benefits',
        description:
          'Understanding feature tiers, upgrade benefits, and maximizing transparency value',
        icon: FaCrown,
        category: 'Business Growth',
        content: (
          <VStack spacing={6} align="start">
            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Maximize Your Trazo Value</AlertTitle>
                <AlertDescription>
                  Understanding Trazo's subscription tiers helps you choose the right features for
                  your farm size and goals. Premium transparency features improve market access and
                  consumer trust.
                </AlertDescription>
              </Box>
            </Alert>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCrown} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Trazo Subscription Tiers
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🌱 Starter Plan
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Best For:</strong> Small farms, first-time users
                    </Text>
                    <Text fontSize="sm">
                      <strong>Productions:</strong> Up to 5 active productions
                    </Text>
                    <Text fontSize="sm">
                      <strong>Events:</strong> Basic event logging
                    </Text>
                    <Text fontSize="sm">
                      <strong>QR Codes:</strong> Standard QR generation
                    </Text>
                    <Text fontSize="sm">
                      <strong>Storage:</strong> Limited photo storage
                    </Text>
                    <Text fontSize="sm">
                      <strong>Support:</strong> Email support
                    </Text>
                  </VStack>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🚀 Professional Plan
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Best For:</strong> Growing farms, market sellers
                    </Text>
                    <Text fontSize="sm">
                      <strong>Productions:</strong> Unlimited productions
                    </Text>
                    <Text fontSize="sm">
                      <strong>Events:</strong> Advanced event features
                    </Text>
                    <Text fontSize="sm">
                      <strong>Blockchain:</strong> Verification included
                    </Text>
                    <Text fontSize="sm">
                      <strong>Analytics:</strong> Scan and engagement data
                    </Text>
                    <Text fontSize="sm">
                      <strong>Integrations:</strong> API access for farm software
                    </Text>
                  </VStack>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    👑 Enterprise Plan
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Best For:</strong> Large operations, distributors
                    </Text>
                    <Text fontSize="sm">
                      <strong>Volume:</strong> High-volume productions
                    </Text>
                    <Text fontSize="sm">
                      <strong>IoT:</strong> Sensor integration included
                    </Text>
                    <Text fontSize="sm">
                      <strong>White Label:</strong> Custom branding options
                    </Text>
                    <Text fontSize="sm">
                      <strong>Priority Support:</strong> Phone and dedicated support
                    </Text>
                    <Text fontSize="sm">
                      <strong>Custom Features:</strong> Tailored development
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaUnlock} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Feature Unlocks by Subscription Level
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>🔓 Professional Plan Unlocks:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>Blockchain verification for all productions</ListItem>
                  <ListItem>Advanced photo storage and organization</ListItem>
                  <ListItem>Consumer engagement analytics dashboard</ListItem>
                  <ListItem>Voice recording and transcription</ListItem>
                  <ListItem>Custom QR code branding</ListItem>
                  <ListItem>Export data for compliance reporting</ListItem>
                </UnorderedList>

                <Text>
                  <strong>🏆 Enterprise Plan Adds:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>IoT sensor data integration</ListItem>
                  <ListItem>Multi-farm management dashboard</ListItem>
                  <ListItem>Bulk production creation tools</ListItem>
                  <ListItem>White-label consumer pages</ListItem>
                  <ListItem>API access for system integration</ListItem>
                  <ListItem>Custom transparency scoring models</ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCalculator} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Value & Benefits Framework
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    💰 Revenue Benefits
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Premium Pricing:</strong> 20-30% higher prices for transparent
                      products
                    </Text>
                    <Text fontSize="sm">
                      <strong>Market Access:</strong> Entry to premium retailers and farmers markets
                    </Text>
                    <Text fontSize="sm">
                      <strong>Direct Sales:</strong> Build consumer loyalty and repeat purchases
                    </Text>
                    <Text fontSize="sm">
                      <strong>Certification Support:</strong> Streamline organic/sustainable
                      certifications
                    </Text>
                  </VStack>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    ⚡ Efficiency Gains
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Documentation Time:</strong> 50% faster with mobile app and voice
                      features
                    </Text>
                    <Text fontSize="sm">
                      <strong>Marketing Costs:</strong> QR codes reduce traditional marketing needs
                    </Text>
                    <Text fontSize="sm">
                      <strong>Compliance:</strong> Automated reporting saves administrative time
                    </Text>
                    <Text fontSize="sm">
                      <strong>Quality Control:</strong> Photo documentation prevents disputes
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaLightbulb} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Upgrade Decision Framework
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>Consider Professional Plan When:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>Managing 5+ productions simultaneously</ListItem>
                  <ListItem>Selling direct to consumers or farmers markets</ListItem>
                  <ListItem>Needing blockchain verification for premium positioning</ListItem>
                  <ListItem>Wanting detailed consumer engagement analytics</ListItem>
                  <ListItem>Requiring integration with existing farm management software</ListItem>
                </UnorderedList>

                <Text>
                  <strong>Consider Enterprise Plan When:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>Operating multiple farm locations or large acreage</ListItem>
                  <ListItem>Using IoT sensors for precision agriculture</ListItem>
                  <ListItem>Serving B2B customers requiring custom reporting</ListItem>
                  <ListItem>Needing white-label solutions for retail partners</ListItem>
                  <ListItem>Managing 50+ productions per year</ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Typical Benefits Timeline</AlertTitle>
                <AlertDescription>
                  Most farms see transparency benefits within 2-3 months through improved consumer
                  trust. Professional plan users typically achieve significant market access
                  improvements, while enterprise users see operational efficiency gains and premium
                  positioning.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'advanced-features',
        title: 'Integration & Advanced Features: Scaling Your Operation',
        description:
          'IoT sensors, voice commands, API integration, and automation for efficient farm management',
        icon: FaCogs,
        category: 'Advanced Features',
        content: (
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              Scale your transparency operation with advanced features that automate documentation,
              integrate with existing systems, and provide enterprise-level capabilities for serious
              agricultural operations.
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaWifi} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                IoT Sensor Integration
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaWifi} color="blue.600" />
                  <Text>
                    <strong>Soil Monitoring:</strong> Automatic soil moisture, pH, and nutrient
                    level tracking
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaWifi} color="blue.600" />
                  <Text>
                    <strong>Weather Stations:</strong> Real-time temperature, humidity, rainfall
                    data
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaWifi} color="blue.600" />
                  <Text>
                    <strong>Irrigation Systems:</strong> Water usage tracking and automated
                    documentation
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaWifi} color="blue.600" />
                  <Text>
                    <strong>Equipment Monitoring:</strong> Tractor hours, fuel consumption, GPS
                    tracking
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaWifi} color="blue.600" />
                  <Text>
                    <strong>Environmental Sensors:</strong> Air quality, pest monitoring, plant
                    health indicators
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaMicrophone} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Voice Command & AI Features
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🎤 Voice Documentation
                  </Heading>
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaMicrophone} color="green.600" />
                      <Text fontSize="sm">
                        "Log fertilizer application, north field, 50 pounds organic compost"
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaMicrophone} color="green.600" />
                      <Text fontSize="sm">
                        "Record harvest activity, avocados, 500 pounds collected"
                      </Text>
                    </HStack>
                    <HStack>
                      <Icon as={FaMicrophone} color="green.600" />
                      <Text fontSize="sm">
                        "Note weather event, heavy rainfall, 2.5 inches overnight"
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🤖 AI Processing
                  </Heading>
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm">
                      <strong>Auto-Transcription:</strong> Voice notes converted to structured data
                    </Text>
                    <Text fontSize="sm">
                      <strong>Smart Classification:</strong> AI categorizes events automatically
                    </Text>
                    <Text fontSize="sm">
                      <strong>Photo Analysis:</strong> AI identifies crops, equipment, and
                      activities
                    </Text>
                    <Text fontSize="sm">
                      <strong>Completion Suggestions:</strong> AI recommends missing documentation
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaPlug} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                API Integration & System Connectivity
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>🔗 Supported Integrations:</strong>
                </Text>
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm">
                      <strong>Farm Management Software:</strong>
                    </Text>
                    <UnorderedList spacing={1} fontSize="xs" pl={4}>
                      <ListItem>FarmLogs integration for automated event sync</ListItem>
                      <ListItem>Granular field management data import</ListItem>
                      <ListItem>Equipment scheduling synchronization</ListItem>
                    </UnorderedList>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm">
                      <strong>Business Systems:</strong>
                    </Text>
                    <UnorderedList spacing={1} fontSize="xs" pl={4}>
                      <ListItem>QuickBooks for financial event tracking</ListItem>
                      <ListItem>Inventory management system sync</ListItem>
                      <ListItem>E-commerce platform integration</ListItem>
                    </UnorderedList>
                  </VStack>
                </Grid>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaSyncAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Automation Rules & Workflows
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}
              >
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    ⚡ Trigger-Based Events
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Equipment start → Log equipment event</ListItem>
                    <ListItem>Irrigation system → Record water usage</ListItem>
                    <ListItem>Weather threshold → Create weather event</ListItem>
                    <ListItem>Sensor alert → Document environmental condition</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📅 Scheduled Automation
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Weekly soil monitoring reports</ListItem>
                    <ListItem>Monthly production summaries</ListItem>
                    <ListItem>Seasonal compliance documentation</ListItem>
                    <ListItem>Automated QR code generation</ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🔄 Smart Suggestions
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>Missing event notifications</ListItem>
                    <ListItem>Optimal documentation timing</ListItem>
                    <ListItem>Photo evidence reminders</ListItem>
                    <ListItem>Transparency score optimization tips</ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaBuilding} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Enterprise Dashboard & Multi-Farm Management
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>📊 Centralized Management:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    <strong>Multi-Location Overview:</strong> Manage multiple farm locations from
                    single dashboard
                  </ListItem>
                  <ListItem>
                    <strong>Aggregate Analytics:</strong> Combined transparency scores and
                    performance metrics
                  </ListItem>
                  <ListItem>
                    <strong>Bulk Operations:</strong> Create productions and events across multiple
                    farms
                  </ListItem>
                  <ListItem>
                    <strong>Team Management:</strong> Role-based access for farm managers and
                    workers
                  </ListItem>
                  <ListItem>
                    <strong>Compliance Reporting:</strong> Automated reports for certifications and
                    audits
                  </ListItem>
                  <ListItem>
                    <strong>Custom Branding:</strong> White-label consumer pages with your farm
                    branding
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaRocket} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                Getting Started with Advanced Features
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>🚀 Implementation Pathway:</strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    <strong>Phase 1:</strong> Master basic event documentation and transparency
                    scoring
                  </ListItem>
                  <ListItem>
                    <strong>Phase 2:</strong> Upgrade to Professional plan, enable blockchain
                    verification
                  </ListItem>
                  <ListItem>
                    <strong>Phase 3:</strong> Implement voice documentation for efficiency gains
                  </ListItem>
                  <ListItem>
                    <strong>Phase 4:</strong> Add IoT sensors for automated data collection
                  </ListItem>
                  <ListItem>
                    <strong>Phase 5:</strong> Configure API integrations with existing farm software
                  </ListItem>
                  <ListItem>
                    <strong>Phase 6:</strong> Scale to Enterprise plan for multi-farm operations
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <Alert status="warning" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Advanced Features Best Practice</AlertTitle>
                <AlertDescription>
                  Start with solid manual documentation practices before adding automation. Farms
                  that master basic transparency principles first see better results from advanced
                  features and avoid over-automation pitfalls.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      }
    ],
    []
  );

  const topic = documentationTopics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <StandardPage
        title="Topic Not Found"
        showBackButton
        onBack={() => navigate('/admin/dashboard/education')}
      >
        <VStack spacing={6} py={8}>
          <Text>The requested topic could not be found.</Text>
        </VStack>
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title={topic.title}
      description={topic.description}
      showBackButton
      onBack={() => navigate('/admin/dashboard/education')}
    >
      <VStack spacing={6} w="full" maxW="6xl" mx="auto">
        {/* Topic Header with Icon */}
        <Card w="full">
          <CardBody>
            <HStack>
              <Icon as={topic.icon} boxSize={8} color="green.500" />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" color="green.500" fontWeight="medium">
                  {topic.category}
                </Text>
                <Heading size="md" color="gray.700">
                  Learn about {topic.title.toLowerCase()}
                </Heading>
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {/* Topic Content */}
        <Card w="full">
          <CardBody>{topic.content}</CardBody>
        </Card>
      </VStack>
    </StandardPage>
  );
};

export default EducationTopicDetail;
