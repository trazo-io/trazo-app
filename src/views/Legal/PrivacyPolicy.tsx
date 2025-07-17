import React from 'react';
import {
  Box,
  Container,
  VStack,
  Text,
  Heading,
  List,
  ListItem,
  ListIcon,
  Divider,
  useColorModeValue,
  Link as ChakraLink,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { MdCheckCircle, MdSecurity, MdStorage, MdShare } from 'react-icons/md';
import { Link as RouterLink } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.900');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const headingColor = useColorModeValue('gray.900', 'white');
  const linkColor = useColorModeValue('green.600', 'green.400');
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Box bg={useColorModeValue('gray.50', 'gray.800')} minH="100vh" py={6}>
      <Container maxW="4xl" mx="auto">
        <VStack spacing={8} align="stretch" pt={112}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading as="h1" size="2xl" color={headingColor} fontWeight="700" letterSpacing="tight">
              Privacy Policy
            </Heading>
            <Text fontSize="lg" color={textColor}>
              Last updated: December 28, 2025
            </Text>
          </VStack>

          {/* Main Content */}
          <Box bg={bgColor} borderRadius="2xl" boxShadow="xl" p={8}>
            <VStack spacing={8} align="stretch">
              {/* Introduction */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  1. Introduction
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Trazo Inc. ("Trazo," "we," "us," or "our") respects your privacy and is committed
                  to protecting your personal information. This Privacy Policy explains how we
                  collect, use, disclose, and safeguard your information when you use our
                  agricultural carbon transparency platform.
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  This policy applies to our website, mobile applications, QR code scanning
                  services, and all related software and services (collectively, the "Platform").
                </Text>
              </Box>

              <Divider />

              {/* Information We Collect */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  2. Information We Collect
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  2.1 Personal Information
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We collect personal information that you provide directly to us:
                </Text>
                <List spacing={2} mb={6}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Account Information:</strong> Email address, first and last name, phone
                    number (optional)
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Profile Data:</strong> Profile images, user preferences, notification
                    settings
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Authentication Data:</strong> Email verification status, password
                    (encrypted), social login IDs
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  2.2 Business Information (Producer Accounts)
                </Heading>
                <List spacing={2} mb={6}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Company Details:</strong> Business name, trade name, description,
                    industry classification
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Business Address:</strong> Street address, city, state, country, postal
                    code
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Tax Information:</strong> Tax ID, EIN, RUT, or other fiscal
                    identification numbers
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Contact Information:</strong> Business email, phone, website, social
                    media profiles
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Business Metadata:</strong> Employee count, certifications,
                    sustainability practices
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  2.3 Agricultural Production Data
                </Heading>
                <List spacing={2} mb={6}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Farm Information:</strong> Establishment names, locations, geospatial
                    coordinates
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Crop Data:</strong> Crop types, production methods, agricultural
                    practices
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Carbon Calculations:</strong> Emission factors, carbon footprint data,
                    sustainability metrics
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Production Events:</strong> Agricultural timelines, equipment usage,
                    chemical applications
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Environmental Data:</strong> Weather conditions, soil data, irrigation
                    information
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  2.4 Usage and Analytics Data
                </Heading>
                <List spacing={2} mb={6}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Platform Usage:</strong> Feature utilization, session duration, user
                    interactions
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>QR Code Analytics:</strong> Scan counts, geographic data, consumer
                    engagement metrics
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Device Information:</strong> Browser type, device model, operating
                    system, IP address
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Educational Engagement:</strong> Content viewed, time spent, quiz
                    scores, course progress
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  2.5 Payment and Subscription Data
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Billing Information:</strong> Subscription plans, billing cycles,
                    payment history
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Usage Metrics:</strong> Storage used, QR scans, productions tracked for
                    billing
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Payment Processing:</strong> Payment methods handled securely by Stripe
                    (we do not store credit card numbers)
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* How We Use Information */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  3. How We Use Your Information
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  3.1 Platform Services
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Provide carbon footprint calculations using USDA-verified emission factors
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Generate and manage QR codes for consumer transparency access
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Store and verify carbon records on the Polygon blockchain
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Track agricultural production events and sustainability metrics
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  3.2 Account Management
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Create and maintain user accounts with role-based access control
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Process subscription payments and manage billing cycles
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Send service-related notifications and account updates
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Provide customer support and technical assistance
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  3.3 Platform Improvement and Research
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Analyze usage patterns to improve Platform functionality
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Create aggregated, anonymized datasets for agricultural research
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Develop new features and carbon calculation methodologies
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Monitor Platform performance and security
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  3.4 Legal Compliance
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Comply with USDA agricultural reporting requirements
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Meet carbon verification and certification standards
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Respond to legal requests and prevent fraud
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Maintain audit trails for regulatory compliance
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* Information Sharing */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  4. How We Share Your Information
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  4.1 Third-Party Service Providers
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We share information with trusted service providers who assist in operating our
                  Platform:
                </Text>

                <TableContainer mb={6}>
                  <Table variant="simple" size="sm">
                    <Thead bg={tableHeaderBg}>
                      <Tr>
                        <Th>Service Provider</Th>
                        <Th>Data Shared</Th>
                        <Th>Purpose</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>
                          <strong>USDA APIs</strong>
                        </Td>
                        <Td>Crop types, production methods</Td>
                        <Td>Emission factor validation and compliance</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>Stripe</strong>
                        </Td>
                        <Td>Billing information, usage metrics</Td>
                        <Td>Payment processing and subscription management</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>AWS</strong>
                        </Td>
                        <Td>All platform data</Td>
                        <Td>Cloud hosting, storage, and infrastructure</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>Polygon Network</strong>
                        </Td>
                        <Td>Carbon verification records</Td>
                        <Td>Immutable blockchain storage</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>OpenAI</strong>
                        </Td>
                        <Td>Voice recordings, text data</Td>
                        <Td>AI-powered data processing and insights</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  4.2 Consumer Transparency Sharing
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  As directed by Producer users, we share specific carbon and sustainability data
                  with consumers through:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdShare} color="blue.500" />
                    QR code scanning providing carbon footprint summaries
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdShare} color="blue.500" />
                    Public sustainability metrics and certification status
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdShare} color="blue.500" />
                    Agricultural practice information for transparency
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdShare} color="blue.500" />
                    Farm location and establishment information as authorized
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  4.3 Legal Requirements
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We may disclose information when required by law or to:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    Comply with legal process or government requests
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    Protect against fraud or security threats
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    Enforce our Terms of Service
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    Protect the rights, property, or safety of Trazo, users, or the public
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  4.4 Aggregated Data
                </Heading>
                <Text color={textColor} lineHeight="1.7">
                  We may share aggregated, anonymized data that cannot identify individual users or
                  businesses for research, industry reports, and platform improvement purposes.
                </Text>
              </Box>

              <Divider />

              {/* Data Storage and Security */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  5. Data Storage and Security
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  5.1 Data Storage Locations
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdStorage} color="purple.500" />
                    <strong>Primary Database:</strong> PostgreSQL hosted on AWS with Redis caching
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdStorage} color="purple.500" />
                    <strong>File Storage:</strong> AWS S3 for images, documents, and QR codes
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdStorage} color="purple.500" />
                    <strong>Blockchain Records:</strong> Polygon network (global, immutable storage)
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdStorage} color="purple.500" />
                    <strong>Security Logs:</strong> Rotating log files with 10MB size limits and 5
                    backup retention
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  5.2 Security Measures
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="green.500" />
                    <strong>Authentication:</strong> JWT tokens with 20-minute access and 1-day
                    refresh periods
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="green.500" />
                    <strong>Access Control:</strong> Role-based permissions with granular user roles
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="green.500" />
                    <strong>Rate Limiting:</strong> 100 requests/hour for anonymous users, 1000/hour
                    for authenticated users
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="green.500" />
                    <strong>Encryption:</strong> HTTPS for all data transmission, secure cookie
                    handling
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="green.500" />
                    <strong>Input Validation:</strong> Comprehensive validation, especially for
                    carbon calculation data
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  5.3 International Data Transfers
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Your data may be transferred to and processed in countries other than your own,
                  including the United States where our primary servers are located. For these
                  transfers, we implement:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="blue.500" />
                    <strong>EU-US Data Privacy Framework:</strong> Compliance with adequacy
                    decisions where applicable
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="blue.500" />
                    <strong>Standard Contractual Clauses (SCCs):</strong> EU Commission-approved
                    transfer mechanisms
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="blue.500" />
                    <strong>Technical Safeguards:</strong> Encryption, access controls, and
                    monitoring systems
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="blue.500" />
                    <strong>Contractual Protections:</strong> Data processing agreements with all
                    third-party processors
                  </ListItem>
                </List>
                <Text color={textColor} lineHeight="1.7">
                  EU residents can request details about specific transfer mechanisms and safeguards
                  applicable to their data.
                </Text>
              </Box>

              <Divider />

              {/* Data Retention */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  6. Data Retention
                </Heading>

                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We retain your information for different periods depending on the type of data and
                  legal requirements:
                </Text>

                <TableContainer mb={4}>
                  <Table variant="simple" size="sm">
                    <Thead bg={tableHeaderBg}>
                      <Tr>
                        <Th>Data Type</Th>
                        <Th>Retention Period</Th>
                        <Th>Rationale</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>
                          <strong>Account Information</strong>
                        </Td>
                        <Td>Until account deletion + 90 days</Td>
                        <Td>Account management and support</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>Agricultural Data</strong>
                        </Td>
                        <Td>7 years or until deletion request</Td>
                        <Td>Compliance and historical tracking</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>Blockchain Records</strong>
                        </Td>
                        <Td>Permanent (immutable)</Td>
                        <Td>Blockchain technology design</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>Payment Records</strong>
                        </Td>
                        <Td>7 years</Td>
                        <Td>Tax and financial compliance</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>Usage Analytics</strong>
                        </Td>
                        <Td>2 years</Td>
                        <Td>Platform improvement</Td>
                      </Tr>
                      <Tr>
                        <Td>
                          <strong>Security Logs</strong>
                        </Td>
                        <Td>1 year</Td>
                        <Td>Security monitoring</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider />

              {/* Your Rights */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  7. Your Privacy Rights
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  7.1 Access and Control
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  You have the following rights regarding your personal information:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Access:</strong> Request a copy of your personal information
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Correction:</strong> Update or correct inaccurate information
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Deletion:</strong> Request deletion of your personal information
                    (subject to limitations)
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Portability:</strong> Receive your data in a portable format
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Restriction:</strong> Limit how we process your information
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  7.2 California Consumer Privacy Act (CCPA) Rights
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  California residents have additional rights under the CCPA:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Right to know what personal information is collected and how it's used
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Right to delete personal information (with certain exceptions)
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Right to opt out of the sale of personal information (we do not sell personal
                    information)
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Right to non-discrimination for exercising CCPA rights
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  7.3 European Union GDPR Rights
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  EU residents have rights under the General Data Protection Regulation (GDPR):
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Legal basis for processing (legitimate interest, consent, contract performance)
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Right to withdraw consent where processing is based on consent
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Right to object to processing based on legitimate interests
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Right to file complaints with supervisory authorities
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  7.4 Limitations on Rights and GDPR Compliance
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Some privacy rights may be limited by technical and legal constraints:
                </Text>
                <List spacing={2} mt={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    <strong>Blockchain Immutability:</strong> Verification hashes stored on
                    blockchain cannot be deleted due to technical impossibility
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    <strong>Legal Requirements:</strong> Data required for compliance with
                    agricultural regulations and audit trails
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    <strong>Aggregated Data:</strong> Information that has been anonymized and
                    cannot identify individuals
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    <strong>Active Legal Proceedings:</strong> Data subject to litigation hold or
                    investigation requirements
                  </ListItem>
                </List>
                <Text color={textColor} lineHeight="1.7" fontSize="sm" fontStyle="italic">
                  <strong>Important:</strong> While blockchain records are immutable, we only store
                  cryptographic hashes and verification status on-chain, not personal information.
                  Personal data associated with these records can still be deleted from our
                  traditional databases. We will provide detailed explanations of any limitations
                  when processing your requests.
                </Text>
              </Box>

              <Divider />

              {/* Cookies and Tracking */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  8. Cookies and Tracking Technologies
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We use cookies and similar technologies to enhance your experience and analyze
                  Platform usage:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Essential Cookies:</strong> Required for Platform functionality and
                    security
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Performance Cookies:</strong> Help us understand how the Platform is
                    used
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Functional Cookies:</strong> Remember your preferences and settings
                  </ListItem>
                </List>
                <Text color={textColor} lineHeight="1.7">
                  You can control cookie settings through your browser preferences, though disabling
                  certain cookies may affect Platform functionality.
                </Text>
              </Box>

              <Divider />

              {/* Data Breach Procedures */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  9. Data Breach Notification
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  In the event of a data breach that may affect your personal information, we will:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    <strong>Authority Notification:</strong> Report to supervisory authorities
                    within 72 hours when required by law
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    <strong>Individual Notification:</strong> Notify affected users within 30 days
                    if high risk to rights and freedoms
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    <strong>Remedial Actions:</strong> Implement immediate containment and recovery
                    measures
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdSecurity} color="red.500" />
                    <strong>Documentation:</strong> Maintain records of breach assessment and
                    response actions
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* Children's Privacy */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  10. Children's Privacy and Age Verification
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Our Platform is not intended for children under 18. We implement age verification
                  during registration and do not knowingly collect personal information from
                  children under 18.
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  If we become aware that we have collected information from a child under 18, we
                  will delete it promptly. Parents or guardians who believe their child has provided
                  information to us should contact us immediately at privacy@trazo.com.
                </Text>
              </Box>

              <Divider />

              {/* Policy Changes */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  11. Changes to This Privacy Policy
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We may update this Privacy Policy from time to time to reflect changes in our
                  practices or applicable laws. We will notify you of material changes by:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Email notification to your registered email address
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Prominent notice on our Platform
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Updated "Last modified" date at the top of this policy
                  </ListItem>
                </List>
                <Text color={textColor} lineHeight="1.7">
                  Continued use of the Platform after changes constitutes acceptance of the updated
                  Privacy Policy.
                </Text>
              </Box>

              <Divider />

              {/* Contact Information */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  12. Contact Us
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  If you have questions about this Privacy Policy or want to exercise your privacy
                  rights, please contact us:
                </Text>
                <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                  <Text color={textColor} mb={4}>
                    <strong>Data Protection Officer</strong>
                    <br />
                    Email: privacy@trazo.com
                    <br />
                    Subject: Privacy Rights Request
                  </Text>
                  <Text color={textColor} mb={4}>
                    <strong>General Contact</strong>
                    <br />
                    Email: support@trazo.com
                    <br />
                    Address: [Company Address]
                    <br />
                    Phone: [Company Phone]
                  </Text>
                  <Text color={textColor}>
                    <strong>EU Representative</strong> (if applicable)
                    <br />
                    [EU Representative Contact Information]
                  </Text>
                </Box>
                <Text color={textColor} lineHeight="1.7" mt={4} fontSize="sm">
                  We will respond to your privacy requests within 30 days (or as required by
                  applicable law). For verification purposes, we may need to confirm your identity
                  before processing certain requests.
                </Text>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;
