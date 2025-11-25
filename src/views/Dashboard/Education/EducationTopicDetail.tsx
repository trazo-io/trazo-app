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
  Grid
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
  FaMobile
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

  const documentationTopics: DocumentationTopic[] = useMemo(() => [
    {
      id: 'getting-started',
      title: 'Understanding Trazo: Your Agricultural Transparency Platform',
      description: 'Learn how Trazo transforms farm documentation into consumer trust and premium pricing',
      icon: FaRocket,
      category: 'Getting Started',
      content: (
        <VStack spacing={6} align="start">
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Welcome to Trazo!</AlertTitle>
              <AlertDescription>
                Trazo is the first agricultural transparency platform that rewards farmers for detailed documentation.
                The more you document, the higher your transparency score, and the more consumers trust your products.
              </AlertDescription>
            </Box>
          </Alert>

          <Heading size="md" color="green.700">How Trazo Works</Heading>
          <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
            <VStack spacing={3} align="start">
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Document Everything:</strong> Log all 8 types of agricultural events as they happen</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Build Transparency:</strong> More documented events = higher transparency score (0-100%)</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Generate QR Codes:</strong> Create scannable codes for each production batch</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Share with Consumers:</strong> Customers scan QR codes to see your transparency score</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Build Trust & Premium:</strong> Higher transparency = more consumer trust = better prices</Text>
              </HStack>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Why Transparency Matters</Heading>
          <Text>
            87% of consumers want to know how their food was grown, but traditional agriculture offers little visibility.
            Trazo bridges this gap by making your farming practices visible and trustworthy to consumers.
          </Text>
          
          <Text>
            <strong>Key Benefits:</strong>
          </Text>
          <UnorderedList spacing={2} pl={6}>
            <ListItem><strong>Premium Pricing:</strong> Transparent farms command 15-30% price premiums</ListItem>
            <ListItem><strong>Consumer Trust:</strong> Build direct relationships with conscious consumers</ListItem>
            <ListItem><strong>Market Differentiation:</strong> Stand out from conventional agriculture</ListItem>
            <ListItem><strong>Blockchain Verification:</strong> Immutable proof of your farming practices</ListItem>
            <ListItem><strong>Effortless Marketing:</strong> QR codes do the storytelling for you</ListItem>
          </UnorderedList>

          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Trazo's Revolutionary Approach</AlertTitle>
              <AlertDescription>
                Unlike carbon platforms that penalize farmers for logging events (more data = higher emissions = worse score),
                Trazo rewards comprehensive documentation (more events = higher transparency = better consumer trust).
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'farm-events',
      title: 'The 8 Core Event Types: Your Transparency Building Blocks',
      description: 'Master each event type to maximize your transparency score and consumer trust',
      icon: FaTractor,
      category: 'Farm Documentation',
      content: (
        <VStack spacing={6} align="start">
          <Text fontSize="lg">
            Every agricultural activity you document increases your transparency score. 
            Here are the 8 core event types that build consumer trust:
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaTractor} color="green.600" />
                  <Heading size="sm" color="green.700">Production Events</Heading>
                </HStack>
                <Text fontSize="sm">Core farming activities like planting, harvesting, irrigation</Text>
                <Text fontSize="xs" color="gray.600">Examples: Seed planting, watering, harvesting dates</Text>
              </VStack>
            </Box>

            <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaLeaf} color="blue.600" />
                  <Heading size="sm" color="blue.700">Chemical Events</Heading>
                </HStack>
                <Text fontSize="sm">Fertilizer and pesticide applications</Text>
                <Text fontSize="xs" color="gray.600">Examples: Organic fertilizer, pest control treatments</Text>
              </VStack>
            </Box>

            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaTractor} color="purple.600" />
                  <Heading size="sm" color="purple.700">Equipment Events</Heading>
                </HStack>
                <Text fontSize="sm">Machinery and tool usage</Text>
                <Text fontSize="xs" color="gray.600">Examples: Tractor operations, harvester use</Text>
              </VStack>
            </Box>

            <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaLeaf} color="orange.600" />
                  <Heading size="sm" color="orange.700">Soil Management</Heading>
                </HStack>
                <Text fontSize="sm">Soil health and preparation activities</Text>
                <Text fontSize="xs" color="gray.600">Examples: Composting, cover crops, soil testing</Text>
              </VStack>
            </Box>

            <Box bg="red.50" p={4} borderRadius="lg" border="1px solid" borderColor="red.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaShieldAlt} color="red.600" />
                  <Heading size="sm" color="red.700">Pest Management</Heading>
                </HStack>
                <Text fontSize="sm">Integrated pest management practices</Text>
                <Text fontSize="xs" color="gray.600">Examples: Beneficial insects, organic treatments</Text>
              </VStack>
            </Box>

            <Box bg="cyan.50" p={4} borderRadius="lg" border="1px solid" borderColor="cyan.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaQrcode} color="cyan.600" />
                  <Heading size="sm" color="cyan.700">Weather Events</Heading>
                </HStack>
                <Text fontSize="sm">Weather conditions and climate data</Text>
                <Text fontSize="xs" color="gray.600">Examples: Rainfall, temperature, drought conditions</Text>
              </VStack>
            </Box>

            <Box bg="pink.50" p={4} borderRadius="lg" border="1px solid" borderColor="pink.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaChartLine} color="pink.600" />
                  <Heading size="sm" color="pink.700">Business Events</Heading>
                </HStack>
                <Text fontSize="sm">Commercial and certification activities</Text>
                <Text fontSize="xs" color="gray.600">Examples: Organic certification, market sales</Text>
              </VStack>
            </Box>

            <Box bg="gray.50" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaBook} color="gray.600" />
                  <Heading size="sm" color="gray.700">General Events</Heading>
                </HStack>
                <Text fontSize="sm">Other farm activities and notes</Text>
                <Text fontSize="xs" color="gray.600">Examples: Farm visits, maintenance, observations</Text>
              </VStack>
            </Box>
          </Grid>

          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Pro Tip: Document Everything!</AlertTitle>
              <AlertDescription>
                Each event you log increases your transparency score. Aim for 90%+ transparency 
                by documenting all major farming activities. This builds maximum consumer trust 
                and positions you for premium pricing.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'transparency-score',
      title: 'Transparency Scoring: Your Consumer Trust Metric',
      description: 'Understanding how Trazo calculates transparency scores and what they mean to consumers',
      icon: FaChartLine,
      category: 'Transparency System',
      content: (
        <VStack spacing={6} align="start">
          <Text fontSize="lg">
            Your transparency score (0-100%) is the key metric that consumers see when they scan your QR codes.
            It directly impacts their trust and purchasing decisions.
          </Text>

          <Heading size="md" color="green.700">How Scoring Works</Heading>
          <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack spacing={3} align="start">
              <Text><strong>Event Documentation:</strong> Each farming event you log contributes to your score</Text>
              <Text><strong>Verification Status:</strong> Blockchain-verified events receive higher weight</Text>
              <Text><strong>Completeness:</strong> Comprehensive event details boost transparency</Text>
              <Text><strong>Photo Evidence:</strong> Images and documentation add credibility</Text>
              <Text><strong>Real-time Data:</strong> IoT sensors and live monitoring increase trust</Text>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Transparency Score Ranges</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>✅ Excellent Transparency (90%+)</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>"95% transparency - comprehensive documentation"</ListItem>
                <ListItem>Green trust indicators</ListItem>
                <ListItem>Complete farming timeline</ListItem>
                <ListItem>Blockchain verification status</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
              <Heading size="sm" color="yellow.700" mb={2}>⚡ Good Transparency (70-89%)</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>"78% transparency - well documented"</ListItem>
                <ListItem>Yellow progress indicators</ListItem>
                <ListItem>Most practices documented</ListItem>
                <ListItem>Some verification gaps</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
              <Heading size="sm" color="orange.700" mb={2}>⚠️ Low Transparency (below 60%)</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>"45% transparency - limited information"</ListItem>
                <ListItem>Yellow warning indicators</ListItem>
                <ListItem>"Some farming practices documented"</ListItem>
                <ListItem>Basic production info only</ListItem>
                <ListItem>No verification status</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Consumer Impact</AlertTitle>
              <AlertDescription>
                Farms with 90%+ transparency scores see 3x higher consumer engagement and 25% price premiums.
                Transparency builds the trust that drives sustainable farming success.
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
          <Heading size="md" color="green.700">How Consumer QR Pages Work</Heading>
          <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack spacing={3} align="start">
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Progressive Loading:</strong> Transparency score loads first (under 1.5s), then details</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Consumer-Friendly Language:</strong> "95% transparency" not "2.4kg CO2e"</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Farming Journey:</strong> Timeline of documented practices</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Trust Indicators:</strong> Verification badges and photo evidence</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Carbon Details:</strong> Environmental data available on request</Text>
              </HStack>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">QR Code Best Practices</Heading>
          <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
            <VStack spacing={3} align="start">
              <Text><strong>📱 Mobile-First Design:</strong> Pages load in under 1.5s on mobile devices</Text>
              <Text><strong>🎯 Clear Value Proposition:</strong> "Scan to see how this was grown"</Text>
              <Text><strong>📍 Strategic Placement:</strong> Product packaging, farmers market signs, website</Text>
              <Text><strong>🔄 Regular Updates:</strong> Fresh content keeps consumers engaged</Text>
              <Text><strong>📊 Track Performance:</strong> Monitor scan rates and consumer engagement</Text>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">What Consumers See</Heading>
          <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
            <VStack spacing={3} align="start">
              <Text><strong>Instant Trust:</strong> Large transparency score with verification badges</Text>
              <Text><strong>Farm Story:</strong> "See exactly how this avocado was grown"</Text>
              <Text><strong>Event Timeline:</strong> Chronological farming practices with photos</Text>
              <Text><strong>Trust Builders:</strong> Blockchain verification, real farmer photos</Text>
              <Text><strong>Environmental Details:</strong> Carbon footprint in expandable section</Text>
            </VStack>
          </Box>

          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Success Metrics</AlertTitle>
              <AlertDescription>
                Farms using Trazo QR codes see average 78% consumer page completion rates, 
                340% higher engagement than traditional carbon labels, and direct consumer 
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
            Every farming event you document can be permanently recorded on the Polygon blockchain, 
            creating immutable proof of your agricultural practices that consumers can independently verify.
          </Text>

          <Heading size="md" color="green.700">Why Blockchain for Agriculture?</Heading>
          <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack spacing={3} align="start">
              <Text><strong>🔒 Immutable Records:</strong> Once recorded, farming data cannot be changed or deleted</Text>
              <Text><strong>🌍 Global Verification:</strong> Anyone can independently verify your claims</Text>
              <Text><strong>⚡ Low Cost:</strong> Polygon network enables affordable verification at scale</Text>
              <Text><strong>🤝 Consumer Trust:</strong> Blockchain removes "trust us" and enables "verify yourself"</Text>
              <Text><strong>📱 Easy Access:</strong> Verification status visible on every QR code page</Text>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">What Gets Verified</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>📋 Event Documentation</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Farming activity timestamps</ListItem>
                <ListItem>Geolocation data</ListItem>
                <ListItem>Product quantities and varieties</ListItem>
                <ListItem>Chemical and fertilizer applications</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={2}>🔬 Environmental Data</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Carbon footprint calculations</ListItem>
                <ListItem>USDA emission factor sources</ListItem>
                <ListItem>Transparency score calculations</ListItem>
                <ListItem>Sustainability metrics</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Consumer Verification Process</Heading>
          <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
            <VStack spacing={3} align="start">
              <Text><strong>Step 1:</strong> Consumer scans QR code and sees "Blockchain Verified ✅" badge</Text>
              <Text><strong>Step 2:</strong> Consumer can click verification badge to see blockchain transaction</Text>
              <Text><strong>Step 3:</strong> Independent verification through Polygonscan explorer</Text>
              <Text><strong>Step 4:</strong> Consumer gains confidence in farming claims</Text>
            </VStack>
          </Box>

          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Technical Note</AlertTitle>
              <AlertDescription>
                Trazo uses energy-efficient Polygon blockchain, consuming 99% less energy than Bitcoin 
                while providing the same level of verification security. This aligns with sustainable 
                farming values and environmental responsibility.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'carbon-data',
      title: 'Carbon Data\'s Supporting Role in the Transparency-First Approach',
      description: 'Understanding how environmental data enhances transparency without overwhelming consumers',
      icon: FaLeaf,
      category: 'Environmental Impact',
      content: (
        <VStack spacing={6} align="start">
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Important Context: Trazo's Strategic Evolution</AlertTitle>
              <AlertDescription>
                Trazo evolved from carbon-first to transparency-first after discovering that carbon-focused 
                systems penalize farmers for comprehensive documentation. Our new approach rewards 
                transparency while maintaining full carbon accuracy for B2B customers.
              </AlertDescription>
            </Box>
          </Alert>

          <Heading size="md" color="green.700">The Transparency-First Philosophy</Heading>
          <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
            <VStack spacing={3} align="start">
              <Text><strong>Primary Metric:</strong> Transparency Score (0-100%) - rewards comprehensive documentation</Text>
              <Text><strong>Secondary Data:</strong> Carbon Footprint - available for interested consumers and B2B</Text>
              <Text><strong>Consumer Focus:</strong> "95% transparency - see how this was grown"</Text>
              <Text><strong>Progressive Disclosure:</strong> Environmental details in expandable sections</Text>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Carbon Data Still Matters For:</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
              <Heading size="sm" color="blue.700" mb={2}>🏢 B2B Customers</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Supply chain sustainability reporting</ListItem>
                <ListItem>Corporate environmental compliance</ListItem>
                <ListItem>LCA methodology requirements</ListItem>
                <ListItem>Regulatory carbon reporting</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={2}>📊 Internal Farm Management</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Identifying optimization opportunities</ListItem>
                <ListItem>Benchmarking against industry standards</ListItem>
                <ListItem>Track improvement over time</ListItem>
                <ListItem>Carbon credit opportunity assessment</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">USDA Integration & Accuracy</Heading>
          <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
            <VStack spacing={3} align="start">
              <Text><strong>Government-Verified Data:</strong> All emission factors sourced from EPA and USDA</Text>
              <Text><strong>Real Farm Operations:</strong> Calculations based on actual fuel, fertilizer, and equipment use</Text>
              <Text><strong>Scope Definition:</strong> Focus on farmer-controlled emissions (direct operations only)</Text>
              <Text><strong>Continuous Updates:</strong> Emission factors updated with latest government data</Text>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Consumer Presentation Strategy</Heading>
          <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
            <VStack spacing={3} align="start">
              <Text><strong>Lead with Transparency:</strong> "95% transparency" prominently displayed</Text>
              <Text><strong>Environmental Context:</strong> "Low environmental impact" vs "2.4 kg CO2e"</Text>
              <Text><strong>Expandable Details:</strong> Full carbon data available for interested consumers</Text>
              <Text><strong>Trust Building:</strong> Focus on documented practices over numerical accuracy</Text>
            </VStack>
          </Box>

          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Best of Both Worlds</AlertTitle>
              <AlertDescription>
                Trazo maintains full carbon calculation accuracy for technical users while presenting 
                consumer-friendly transparency scores that build trust and drive purchasing decisions. 
                This dual approach serves both farmers and their diverse customer base.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'first-production',
      title: 'Starting Your First Production: From Setup to Success',
      description: 'Complete walkthrough of creating your first production batch and setting up your farm profile',
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
                setting up your farm profile, and beginning your path to agricultural transparency success.
              </AlertDescription>
            </Box>
          </Alert>

          <Heading size="md" color="green.700">Step 1: Set Up Your Farm Profile</Heading>
          <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack spacing={3} align="start">
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Farm Information:</strong> Complete your farm name, location, and contact details</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Crop Selection:</strong> Choose your primary crops from Trazo's supported varieties</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Farm Size & Parcels:</strong> Define your growing areas and plot boundaries</Text>
              </HStack>
              <HStack>
                <Icon as={FaCheckCircle} color="green.600" />
                <Text><strong>Farming Approach:</strong> Select conventional, organic, or transitional methods</Text>
              </HStack>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Step 2: Create Your First Production Batch</Heading>
          <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
            <VStack spacing={3} align="start">
              <Text><strong>Production Details:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem>Product name and variety (e.g., "Organic Hass Avocados")</ListItem>
                <ListItem>Planting/starting date</ListItem>
                <ListItem>Expected harvest timeframe</ListItem>
                <ListItem>Production goals and quantity estimates</ListItem>
              </UnorderedList>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Step 3: Log Your First Events</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={2}>📝 Start with Production Events</Heading>
              <Text fontSize="sm">Log planting, seed preparation, or transplanting activities</Text>
            </Box>
            <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
              <Heading size="sm" color="orange.700" mb={2}>📸 Add Photo Evidence</Heading>
              <Text fontSize="sm">Take photos of your farming activities to boost verification</Text>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Step 4: Generate Your First QR Code</Heading>
          <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
            <VStack spacing={3} align="start">
              <Text><strong>QR Code Creation:</strong> Once you have 3+ documented events, Trazo automatically generates QR codes</Text>
              <Text><strong>Consumer Testing:</strong> Scan your own QR code to see the consumer experience</Text>
              <Text><strong>Transparency Score:</strong> Watch your score increase as you add more documented events</Text>
            </VStack>
          </Box>

          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Quick Start Tip</AlertTitle>
              <AlertDescription>
                Document everything from day one! Even basic activities like soil preparation 
                and seed planting contribute to your transparency score. The more you document early, 
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
      description: 'When and how to log events, photo evidence strategies, and real-time documentation workflows',
      icon: FaCamera,
      category: 'Farm Documentation',
      content: (
        <VStack spacing={6} align="start">
          <Text fontSize="lg">
            Master the art of agricultural documentation to maximize your transparency score and build unshakeable consumer trust.
            This guide covers proven strategies from successful Trazo farmers.
          </Text>

          <Heading size="md" color="green.700">Real-Time vs Batch Documentation</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>⚡ Real-Time Documentation (Best)</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Log events as they happen in the field</ListItem>
                <ListItem>Use mobile app for instant photo capture</ListItem>
                <ListItem>Voice recording feature for quick notes</ListItem>
                <ListItem>Higher transparency score weight</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
              <Heading size="sm" color="yellow.700" mb={2}>📝 Batch Documentation (Good)</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Log multiple events at end of day</ListItem>
                <ListItem>Upload photos from camera later</ListItem>
                <ListItem>Use farm notes to remember details</ListItem>
                <ListItem>Still contributes to transparency</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Photo Evidence Best Practices</Heading>
          <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack spacing={3} align="start">
              <Text><strong>📸 What to Photograph:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem>Equipment in action (tractors, harvesters, irrigation systems)</ListItem>
                <ListItem>Product application (fertilizers, organic amendments, pest treatments)</ListItem>
                <ListItem>Crop progress (planting, growth stages, harvest)</ListItem>
                <ListItem>Quality indicators (soil conditions, plant health, weather conditions)</ListItem>
                <ListItem>Verification documents (organic certificates, test results)</ListItem>
              </UnorderedList>
              
              <Text><strong>📱 Technical Tips:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem>Use good lighting - avoid shadows on equipment/crops</ListItem>
                <ListItem>Include context - show the broader field/operation</ListItem>
                <ListItem>Capture before/after shots for treatments</ListItem>
                <ListItem>Include measurement tools for scale reference</ListItem>
              </UnorderedList>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Voice Recording & Quick Notes</Heading>
          <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
            <VStack spacing={3} align="start">
              <HStack>
                <Icon as={FaMicrophone} color="purple.600" />
                <Text><strong>Voice Commands:</strong> "Record fertilizer application, 50 pounds organic compost, north field"</Text>
              </HStack>
              <HStack>
                <Icon as={FaMicrophone} color="purple.600" />
                <Text><strong>Quick Notes:</strong> Perfect for recording observations while working</Text>
              </HStack>
              <HStack>
                <Icon as={FaMicrophone} color="purple.600" />
                <Text><strong>Hands-Free Operation:</strong> Continue working while documentation happens</Text>
              </HStack>
              <HStack>
                <Icon as={FaMicrophone} color="purple.600" />
                <Text><strong>Auto-Transcription:</strong> Voice notes automatically converted to text</Text>
              </HStack>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Seasonal Documentation Strategy</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>🌱 Planting Season</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Soil preparation events</ListItem>
                <ListItem>Seed/seedling documentation</ListItem>
                <ListItem>Initial irrigation setup</ListItem>
                <ListItem>Baseline soil testing</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
              <Heading size="sm" color="yellow.700" mb={2}>🌾 Growing Season</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Regular fertilizer applications</ListItem>
                <ListItem>Pest management activities</ListItem>
                <ListItem>Irrigation and weather events</ListItem>
                <ListItem>Growth progress photos</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
              <Heading size="sm" color="orange.700" mb={2}>🍂 Harvest Season</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Harvest timing and methods</ListItem>
                <ListItem>Quality assessment results</ListItem>
                <ListItem>Post-harvest handling</ListItem>
                <ListItem>Final production quantities</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Documentation Success Formula</AlertTitle>
              <AlertDescription>
                Successful farms document 12-15 events per production cycle with 80% photo evidence. 
                This typically results in 90%+ transparency scores and maximum consumer trust.
                Remember: every documented activity tells your farm's story to consumers.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'score-optimization',
      title: 'Maximizing Your Transparency Score: 90%+ Strategies',
      description: 'Proven techniques to achieve excellent transparency scores and maximize consumer trust',
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

          <Heading size="md" color="green.700">Transparency Score Calculation Weights</Heading>
          <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack spacing={3} align="start">
              <Text><strong>Event Documentation (40%):</strong> Number of documented agricultural events</Text>
              <Text><strong>Verification Status (25%):</strong> Blockchain verification and photo evidence</Text>
              <Text><strong>Completeness (20%):</strong> Detailed event descriptions and context</Text>
              <Text><strong>Real-time Data (15%):</strong> IoT sensors and immediate documentation</Text>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">The 90%+ Scoring Strategy</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>✅ Must-Have Events (60 points)</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>3+ Production events (planting, harvest, processing)</ListItem>
                <ListItem>2+ Chemical events (fertilizer, organic amendments)</ListItem>
                <ListItem>2+ Equipment events (tractor work, irrigation)</ListItem>
                <ListItem>1+ Soil management event (composting, testing)</ListItem>
                <ListItem>1+ Weather event (rainfall, drought response)</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={2}>🏆 Excellence Boosters (30+ points)</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Photo evidence for 80%+ of events</ListItem>
                <ListItem>Blockchain verification enabled</ListItem>
                <ListItem>Real-time event logging (not batch)</ListItem>
                <ListItem>Detailed event descriptions</ListItem>
                <ListItem>Business events (certifications, sales)</ListItem>
                <ListItem>Pest management documentation</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Common Scoring Mistakes to Avoid</Heading>
          <Box bg="red.50" p={4} borderRadius="lg" border="1px solid" borderColor="red.200">
            <VStack spacing={3} align="start">
              <Text><strong>❌ Batch Documentation:</strong> Logging events weeks after they happened</Text>
              <Text><strong>❌ Missing Photos:</strong> Events without visual evidence lose verification weight</Text>
              <Text><strong>❌ Vague Descriptions:</strong> "Applied fertilizer" vs "Applied 50 lbs organic compost to north field"</Text>
              <Text><strong>❌ Skipping Minor Events:</strong> Small activities still contribute to transparency</Text>
              <Text><strong>❌ Inconsistent Logging:</strong> Large gaps in documentation timeline</Text>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Optimization Techniques by Crop Type</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} w="full">
            <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
              <Heading size="sm" color="yellow.700" mb={2}>🥑 Tree Fruits (Avocados, Citrus)</Heading>
              <UnorderedList spacing={1} fontSize="xs">
                <ListItem>Pruning and tree maintenance events</ListItem>
                <ListItem>Irrigation system documentation</ListItem>
                <ListItem>Seasonal pest management</ListItem>
                <ListItem>Harvest timing and methods</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>🌾 Annual Crops (Vegetables, Grains)</Heading>
              <UnorderedList spacing={1} fontSize="xs">
                <ListItem>Soil preparation and planting</ListItem>
                <ListItem>Growth stage monitoring</ListItem>
                <ListItem>Regular fertilizer applications</ListItem>
                <ListItem>Harvest and post-harvest handling</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={2}>🫐 Berries & Specialty Crops</Heading>
              <UnorderedList spacing={1} fontSize="xs">
                <ListItem>Specialized growing techniques</ListItem>
                <ListItem>Quality control measures</ListItem>
                <ListItem>Careful harvest documentation</ListItem>
                <ListItem>Cold chain and storage events</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Success Benchmark</AlertTitle>
              <AlertDescription>
                Target: 12-15 documented events per production cycle with 80% photo evidence. 
                This consistently achieves 90%+ transparency scores. Remember: consumers value 
                comprehensive documentation over perfect farming - show them everything!
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'consumer-engagement',
      title: 'Consumer Engagement & Marketing Success',
      description: 'QR code placement, scan analytics, and building direct customer relationships',
      icon: FaUsers,
      category: 'Consumer Engagement',
      content: (
        <VStack spacing={6} align="start">
          <Text fontSize="lg">
            Transform your transparency data into powerful marketing that builds direct consumer relationships and drives premium pricing.
            Learn from farms achieving 78% QR scan completion rates and 25% price premiums.
          </Text>

          <Heading size="md" color="green.700">Strategic QR Code Placement</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>📦 Product Packaging</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Primary Placement:</strong> Front panel, above brand logo</Text>
                <Text fontSize="sm"><strong>Call to Action:</strong> "Scan to see how this was grown"</Text>
                <Text fontSize="sm"><strong>Size Guidelines:</strong> Minimum 1 inch square for easy scanning</Text>
                <Text fontSize="sm"><strong>Testing:</strong> Scan from 3 feet to ensure readability</Text>
              </VStack>
            </Box>
            <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
              <Heading size="sm" color="blue.700" mb={2}>🛒 Point of Sale</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Farmers Markets:</strong> Table signs with transparency scores</Text>
                <Text fontSize="sm"><strong>Retail Stores:</strong> Shelf talkers highlighting verification</Text>
                <Text fontSize="sm"><strong>Online Sales:</strong> Product page QR codes for digital purchases</Text>
                <Text fontSize="sm"><strong>Farm Store:</strong> Large displays showcasing farm transparency</Text>
              </VStack>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Understanding Your Scan Analytics</Heading>
          <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
            <VStack spacing={3} align="start">
              <Text><strong>📊 Key Metrics Trazo Tracks:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem><strong>Scan Rate:</strong> Percentage of products scanned by consumers</ListItem>
                <ListItem><strong>Completion Rate:</strong> Percentage of scanners who view full transparency info</ListItem>
                <ListItem><strong>Engagement Time:</strong> How long consumers spend on your transparency page</ListItem>
                <ListItem><strong>Return Scans:</strong> Repeat customers checking your latest productions</ListItem>
                <ListItem><strong>Geographic Data:</strong> Where your products are being scanned</ListItem>
                <ListItem><strong>Peak Times:</strong> When consumers are most likely to scan</ListItem>
              </UnorderedList>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Building Direct Consumer Relationships</Heading>
          <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
            <VStack spacing={3} align="start">
              <HStack>
                <Icon as={FaUsers} color="yellow.600" />
                <Text><strong>Consumer Education:</strong> QR pages become teaching moments about sustainable farming</Text>
              </HStack>
              <HStack>
                <Icon as={FaUsers} color="yellow.600" />
                <Text><strong>Trust Building:</strong> Transparency creates emotional connection beyond just product quality</Text>
              </HStack>
              <HStack>
                <Icon as={FaUsers} color="yellow.600" />
                <Text><strong>Premium Positioning:</strong> 95% transparency score justifies 20-30% price premiums</Text>
              </HStack>
              <HStack>
                <Icon as={FaUsers} color="yellow.600" />
                <Text><strong>Repeat Purchases:</strong> Consumers return to farmers they trust and understand</Text>
              </HStack>
              <HStack>
                <Icon as={FaUsers} color="yellow.600" />
                <Text><strong>Word of Mouth:</strong> Transparent farms get 3x more consumer recommendations</Text>
              </HStack>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Optimizing Consumer Page Performance</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>⚡ Speed Optimization</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Under 1.5s load time on mobile</ListItem>
                <ListItem>Progressive loading design</ListItem>
                <ListItem>Transparency score appears first</ListItem>
                <ListItem>Photos optimized for mobile data</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
              <Heading size="sm" color="blue.700" mb={2}>📱 Mobile Experience</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Touch-friendly interface design</ListItem>
                <ListItem>Easy scrolling through farm timeline</ListItem>
                <ListItem>Clear trust indicators and badges</ListItem>
                <ListItem>Social sharing buttons prominent</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
              <Heading size="sm" color="orange.700" mb={2}>💬 Consumer Communication</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Clear, jargon-free language</ListItem>
                <ListItem>Visual timeline of farming practices</ListItem>
                <ListItem>Environmental benefits explained simply</ListItem>
                <ListItem>Direct farmer contact information</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Marketing Integration Strategies</Heading>
          <Box bg="red.50" p={4} borderRadius="lg" border="1px solid" borderColor="red.200">
            <VStack spacing={3} align="start">
              <Text><strong>🌐 Website Integration:</strong> Embed transparency scores on product pages</Text>
              <Text><strong>📱 Social Media:</strong> Share transparency milestones and behind-the-scenes content</Text>
              <Text><strong>📧 Email Marketing:</strong> Include QR codes in newsletters and customer communications</Text>
              <Text><strong>🏪 Retail Partnerships:</strong> Work with stores to highlight your transparency advantage</Text>
              <Text><strong>🎯 Targeted Campaigns:</strong> Use scan data to understand and reach your ideal customers</Text>
            </VStack>
          </Box>

          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Success Metrics to Track</AlertTitle>
              <AlertDescription>
                Target a 15%+ scan rate and 70%+ completion rate for excellent consumer engagement. 
                Farms achieving these metrics typically see 25% price premiums and develop loyal 
                customer bases that drive sustainable business growth.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'subscription-features',
      title: 'Subscription Features & ROI Optimization',
      description: 'Understanding feature tiers, upgrade benefits, and calculating your return on investment',
      icon: FaCrown,
      category: 'Business Growth',
      content: (
        <VStack spacing={6} align="start">
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Maximize Your Trazo Investment</AlertTitle>
              <AlertDescription>
                Understanding Trazo's subscription tiers helps you choose the right features for your farm size and goals.
                Most farms see 300-500% ROI through premium pricing and improved market access.
              </AlertDescription>
            </Box>
          </Alert>

          <Heading size="md" color="green.700">Trazo Subscription Tiers</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} w="full">
            <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
              <Heading size="sm" color="blue.700" mb={2}>🌱 Starter Plan</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Best For:</strong> Small farms, first-time users</Text>
                <Text fontSize="sm"><strong>Productions:</strong> Up to 5 active productions</Text>
                <Text fontSize="sm"><strong>Events:</strong> Basic event logging</Text>
                <Text fontSize="sm"><strong>QR Codes:</strong> Standard QR generation</Text>
                <Text fontSize="sm"><strong>Storage:</strong> Limited photo storage</Text>
                <Text fontSize="sm"><strong>Support:</strong> Email support</Text>
              </VStack>
            </Box>
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>🚀 Professional Plan</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Best For:</strong> Growing farms, market sellers</Text>
                <Text fontSize="sm"><strong>Productions:</strong> Unlimited productions</Text>
                <Text fontSize="sm"><strong>Events:</strong> Advanced event features</Text>
                <Text fontSize="sm"><strong>Blockchain:</strong> Verification included</Text>
                <Text fontSize="sm"><strong>Analytics:</strong> Scan and engagement data</Text>
                <Text fontSize="sm"><strong>Integrations:</strong> API access for farm software</Text>
              </VStack>
            </Box>
            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={2}>👑 Enterprise Plan</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Best For:</strong> Large operations, distributors</Text>
                <Text fontSize="sm"><strong>Volume:</strong> High-volume productions</Text>
                <Text fontSize="sm"><strong>IoT:</strong> Sensor integration included</Text>
                <Text fontSize="sm"><strong>White Label:</strong> Custom branding options</Text>
                <Text fontSize="sm"><strong>Priority Support:</strong> Phone and dedicated support</Text>
                <Text fontSize="sm"><strong>Custom Features:</strong> Tailored development</Text>
              </VStack>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Feature Unlocks by Subscription Level</Heading>
          <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
            <VStack spacing={3} align="start">
              <Text><strong>🔓 Professional Plan Unlocks:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem>Blockchain verification for all productions</ListItem>
                <ListItem>Advanced photo storage and organization</ListItem>
                <ListItem>Consumer engagement analytics dashboard</ListItem>
                <ListItem>Voice recording and transcription</ListItem>
                <ListItem>Custom QR code branding</ListItem>
                <ListItem>Export data for compliance reporting</ListItem>
              </UnorderedList>
              
              <Text><strong>🏆 Enterprise Plan Adds:</strong></Text>
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

          <Heading size="md" color="green.700">ROI Calculation Framework</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>💰 Revenue Benefits</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Premium Pricing:</strong> 20-30% higher prices for transparent products</Text>
                <Text fontSize="sm"><strong>Market Access:</strong> Entry to premium retailers and farmers markets</Text>
                <Text fontSize="sm"><strong>Direct Sales:</strong> Build consumer loyalty and repeat purchases</Text>
                <Text fontSize="sm"><strong>Certification Support:</strong> Streamline organic/sustainable certifications</Text>
              </VStack>
            </Box>
            <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
              <Heading size="sm" color="blue.700" mb={2}>⚡ Efficiency Gains</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Documentation Time:</strong> 50% faster with mobile app and voice features</Text>
                <Text fontSize="sm"><strong>Marketing Costs:</strong> QR codes reduce traditional marketing needs</Text>
                <Text fontSize="sm"><strong>Compliance:</strong> Automated reporting saves administrative time</Text>
                <Text fontSize="sm"><strong>Quality Control:</strong> Photo documentation prevents disputes</Text>
              </VStack>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Upgrade Decision Framework</Heading>
          <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
            <VStack spacing={3} align="start">
              <Text><strong>Consider Professional Plan When:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem>Managing 5+ productions simultaneously</ListItem>
                <ListItem>Selling direct to consumers or farmers markets</ListItem>
                <ListItem>Needing blockchain verification for premium positioning</ListItem>
                <ListItem>Wanting detailed consumer engagement analytics</ListItem>
                <ListItem>Requiring integration with existing farm management software</ListItem>
              </UnorderedList>
              
              <Text><strong>Consider Enterprise Plan When:</strong></Text>
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
              <AlertTitle>Typical ROI Timeline</AlertTitle>
              <AlertDescription>
                Most farms see subscription ROI within 2-3 months through premium pricing. 
                Professional plan users typically achieve 400-600% annual ROI, while enterprise 
                users see 300-500% ROI plus significant operational efficiency gains.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    },
    {
      id: 'advanced-features',
      title: 'Integration & Advanced Features: Scaling Your Operation',
      description: 'IoT sensors, voice commands, API integration, and automation for efficient farm management',
      icon: FaCogs,
      category: 'Advanced Features',
      content: (
        <VStack spacing={6} align="start">
          <Text fontSize="lg">
            Scale your transparency operation with advanced features that automate documentation, 
            integrate with existing systems, and provide enterprise-level capabilities for serious agricultural operations.
          </Text>

          <Heading size="md" color="green.700">IoT Sensor Integration</Heading>
          <Box bg="blue.50" p={4} borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack spacing={3} align="start">
              <HStack>
                <Icon as={FaWifi} color="blue.600" />
                <Text><strong>Soil Monitoring:</strong> Automatic soil moisture, pH, and nutrient level tracking</Text>
              </HStack>
              <HStack>
                <Icon as={FaWifi} color="blue.600" />
                <Text><strong>Weather Stations:</strong> Real-time temperature, humidity, rainfall data</Text>
              </HStack>
              <HStack>
                <Icon as={FaWifi} color="blue.600" />
                <Text><strong>Irrigation Systems:</strong> Water usage tracking and automated documentation</Text>
              </HStack>
              <HStack>
                <Icon as={FaWifi} color="blue.600" />
                <Text><strong>Equipment Monitoring:</strong> Tractor hours, fuel consumption, GPS tracking</Text>
              </HStack>
              <HStack>
                <Icon as={FaWifi} color="blue.600" />
                <Text><strong>Environmental Sensors:</strong> Air quality, pest monitoring, plant health indicators</Text>
              </HStack>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Voice Command & AI Features</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
            <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
              <Heading size="sm" color="green.700" mb={2}>🎤 Voice Documentation</Heading>
              <VStack spacing={2} align="start">
                <HStack>
                  <Icon as={FaMicrophone} color="green.600" />
                  <Text fontSize="sm">"Log fertilizer application, north field, 50 pounds organic compost"</Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="green.600" />
                  <Text fontSize="sm">"Record harvest activity, avocados, 500 pounds collected"</Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="green.600" />
                  <Text fontSize="sm">"Note weather event, heavy rainfall, 2.5 inches overnight"</Text>
                </HStack>
              </VStack>
            </Box>
            <Box bg="purple.50" p={4} borderRadius="lg" border="1px solid" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={2}>🤖 AI Processing</Heading>
              <VStack spacing={2} align="start">
                <Text fontSize="sm"><strong>Auto-Transcription:</strong> Voice notes converted to structured data</Text>
                <Text fontSize="sm"><strong>Smart Classification:</strong> AI categorizes events automatically</Text>
                <Text fontSize="sm"><strong>Photo Analysis:</strong> AI identifies crops, equipment, and activities</Text>
                <Text fontSize="sm"><strong>Completion Suggestions:</strong> AI recommends missing documentation</Text>
              </VStack>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">API Integration & System Connectivity</Heading>
          <Box bg="yellow.50" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.200">
            <VStack spacing={3} align="start">
              <Text><strong>🔗 Supported Integrations:</strong></Text>
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm"><strong>Farm Management Software:</strong></Text>
                  <UnorderedList spacing={1} fontSize="xs" pl={4}>
                    <ListItem>FarmLogs integration for automated event sync</ListItem>
                    <ListItem>Granular field management data import</ListItem>
                    <ListItem>Equipment scheduling synchronization</ListItem>
                  </UnorderedList>
                </VStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm"><strong>Business Systems:</strong></Text>
                  <UnorderedList spacing={1} fontSize="xs" pl={4}>
                    <ListItem>QuickBooks for financial event tracking</ListItem>
                    <ListItem>Inventory management system sync</ListItem>
                    <ListItem>E-commerce platform integration</ListItem>
                  </UnorderedList>
                </VStack>
              </Grid>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Automation Rules & Workflows</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} w="full">
            <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
              <Heading size="sm" color="orange.700" mb={2}>⚡ Trigger-Based Events</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Equipment start → Log equipment event</ListItem>
                <ListItem>Irrigation system → Record water usage</ListItem>
                <ListItem>Weather threshold → Create weather event</ListItem>
                <ListItem>Sensor alert → Document environmental condition</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="red.50" p={4} borderRadius="lg" border="1px solid" borderColor="red.200">
              <Heading size="sm" color="red.700" mb={2}>📅 Scheduled Automation</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Weekly soil monitoring reports</ListItem>
                <ListItem>Monthly production summaries</ListItem>
                <ListItem>Seasonal compliance documentation</ListItem>
                <ListItem>Automated QR code generation</ListItem>
              </UnorderedList>
            </Box>
            <Box bg="cyan.50" p={4} borderRadius="lg" border="1px solid" borderColor="cyan.200">
              <Heading size="sm" color="cyan.700" mb={2}>🔄 Smart Suggestions</Heading>
              <UnorderedList spacing={1} fontSize="sm">
                <ListItem>Missing event notifications</ListItem>
                <ListItem>Optimal documentation timing</ListItem>
                <ListItem>Photo evidence reminders</ListItem>
                <ListItem>Transparency score optimization tips</ListItem>
              </UnorderedList>
            </Box>
          </Grid>

          <Heading size="md" color="green.700">Enterprise Dashboard & Multi-Farm Management</Heading>
          <Box bg="gray.50" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
            <VStack spacing={3} align="start">
              <Text><strong>📊 Centralized Management:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem><strong>Multi-Location Overview:</strong> Manage multiple farm locations from single dashboard</ListItem>
                <ListItem><strong>Aggregate Analytics:</strong> Combined transparency scores and performance metrics</ListItem>
                <ListItem><strong>Bulk Operations:</strong> Create productions and events across multiple farms</ListItem>
                <ListItem><strong>Team Management:</strong> Role-based access for farm managers and workers</ListItem>
                <ListItem><strong>Compliance Reporting:</strong> Automated reports for certifications and audits</ListItem>
                <ListItem><strong>Custom Branding:</strong> White-label consumer pages with your farm branding</ListItem>
              </UnorderedList>
            </VStack>
          </Box>

          <Heading size="md" color="green.700">Getting Started with Advanced Features</Heading>
          <Box bg="green.50" p={4} borderRadius="lg" border="1px solid" borderColor="green.200">
            <VStack spacing={3} align="start">
              <Text><strong>🚀 Implementation Pathway:</strong></Text>
              <UnorderedList spacing={1} pl={6}>
                <ListItem><strong>Phase 1:</strong> Master basic event documentation and transparency scoring</ListItem>
                <ListItem><strong>Phase 2:</strong> Upgrade to Professional plan, enable blockchain verification</ListItem>
                <ListItem><strong>Phase 3:</strong> Implement voice documentation for efficiency gains</ListItem>
                <ListItem><strong>Phase 4:</strong> Add IoT sensors for automated data collection</ListItem>
                <ListItem><strong>Phase 5:</strong> Configure API integrations with existing farm software</ListItem>
                <ListItem><strong>Phase 6:</strong> Scale to Enterprise plan for multi-farm operations</ListItem>
              </UnorderedList>
            </VStack>
          </Box>

          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Advanced Features Best Practice</AlertTitle>
              <AlertDescription>
                Start with solid manual documentation practices before adding automation. 
                Farms that master basic transparency principles first see better results 
                from advanced features and avoid over-automation pitfalls.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      )
    }
  ], []);

  const topic = documentationTopics.find(t => t.id === topicId);

  if (!topic) {
    return (
      <StandardPage
        title="Topic Not Found"
        showBackButton
        onBack={() => navigate('/admin/dashboard/education')}>
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
      onBack={() => navigate('/admin/dashboard/education')}>
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
          <CardBody>
            {topic.content}
          </CardBody>
        </Card>
      </VStack>
    </StandardPage>
  );
};

export default EducationTopicDetail;