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
  Link as ChakraLink
} from '@chakra-ui/react';
import { MdCheckCircle } from 'react-icons/md';
import { Link as RouterLink } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.900');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const headingColor = useColorModeValue('gray.900', 'white');
  const linkColor = useColorModeValue('green.600', 'green.400');

  return (
    <Box bg={useColorModeValue('gray.50', 'gray.800')} minH="100vh" py={6}>
      <Container maxW="4xl" mx="auto">
        <VStack spacing={8} align="stretch" pt={112}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading as="h1" size="2xl" color={headingColor} fontWeight="700" letterSpacing="tight">
              Terms of Service
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
                  1. Introduction and Acceptance
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Welcome to Trazo, an agricultural carbon transparency platform operated by Trazo
                  Inc. ("Trazo," "we," "us," or "our"). These Terms of Service ("Terms") govern your
                  access to and use of our platform, including our website, mobile applications, QR
                  code scanning services, and all related software and services (collectively, the
                  "Platform").
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  By accessing or using our Platform, you agree to be bound by these Terms and our
                  Privacy Policy. If you do not agree to these Terms, please do not use our
                  Platform.
                </Text>
              </Box>

              <Divider />

              {/* Platform Description */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  2. Platform Description
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Trazo provides agricultural carbon transparency services that enable:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Real-time carbon footprint calculations using USDA-verified emission factors
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Blockchain-verified carbon records on the Polygon network
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    QR code generation for consumer transparency access
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Agricultural production tracking and sustainability metrics
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Integration with third-party agricultural systems and certification bodies
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* User Accounts */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  3. User Accounts and Registration
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  3.1 Account Types
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Our Platform supports different user types with varying access levels:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Consumers:</strong> General public accessing QR code transparency data
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Producers:</strong> Agricultural businesses and farmers managing carbon
                    data
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Certifiers:</strong> Third-party verification entities
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  3.2 Registration Requirements
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  To create an account, you must:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Provide accurate and complete information
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Be at least 18 years old or have legal authority to enter contracts
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Verify your email address
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Maintain the security of your account credentials
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* Subscription Services */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  4. Subscription Services and Billing
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  4.1 Subscription Plans
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Trazo offers various subscription plans with different features and usage limits.
                  Producer accounts require paid subscriptions, while Consumer accounts have free
                  access to transparency data.
                </Text>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  4.2 Billing and Payment
                </Heading>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Subscriptions are billed monthly or annually via Stripe
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Payments are due in advance for each billing period
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Usage overage charges may apply for exceeding plan limits
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Failed payments may result in service suspension
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  4.3 Cancellation and Refunds
                </Heading>
                <Text color={textColor} lineHeight="1.7">
                  You may cancel your subscription at any time. Cancellations take effect at the end
                  of the current billing period. Refunds are generally not provided except as
                  required by applicable law.
                </Text>
              </Box>

              <Divider />

              {/* Data Ownership and Use */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  5. Data Ownership and Use Rights
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  5.1 Your Agricultural Data
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  You retain ownership of all agricultural production data, carbon calculations, and
                  business information you provide to the Platform ("Your Data"). We do not claim
                  ownership of Your Data.
                </Text>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  5.2 License to Use Your Data
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  By using our Platform, you grant Trazo a limited, non-exclusive license to:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Process and store Your Data to provide our services
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Generate carbon footprint calculations and transparency reports
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Create aggregated, anonymized data for research and platform improvement
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Share specific data as directed by you for transparency purposes
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  5.3 Blockchain Data Immutability and Privacy Rights
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Carbon verification records stored on the Polygon blockchain are immutable by
                  design.
                  <strong>IMPORTANT:</strong> By choosing to submit data for blockchain
                  verification, you acknowledge that:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    Once recorded, this data cannot be modified, deleted, or erased from the
                    blockchain
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    This may conflict with certain data privacy rights, including GDPR "Right to be
                    Forgotten"
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    Only cryptographic hashes and verification status are stored on-chain, not
                    personal information
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="red.500" />
                    You provide explicit consent for this permanent storage by submitting
                    verification requests
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* Platform Usage */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  6. Acceptable Use and Restrictions
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  6.1 Permitted Uses
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  You may use our Platform only for lawful agricultural carbon tracking and
                  transparency purposes.
                </Text>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  6.2 Prohibited Activities
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  You agree not to:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Submit false, misleading, or inaccurate agricultural or carbon data
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Attempt to reverse engineer, hack, or compromise our Platform
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Exceed API rate limits or abuse our services
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Violate any applicable laws or regulations
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    Share account credentials with unauthorized users
                  </ListItem>
                </List>
              </Box>

              <Divider />

              {/* Third-Party Integrations */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  7. Third-Party Integrations and Services
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Our Platform integrates with various third-party services including:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>USDA APIs:</strong> For agricultural emission factors and compliance
                    data
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Stripe:</strong> For payment processing and subscription management
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>Polygon Blockchain:</strong> For immutable carbon record verification
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>AWS Services:</strong> For data storage and platform infrastructure
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="green.500" />
                    <strong>OpenAI:</strong> For AI-powered data processing and insights
                  </ListItem>
                </List>
                <Text color={textColor} lineHeight="1.7">
                  These integrations are governed by their respective terms of service. We are not
                  responsible for the availability or performance of third-party services.
                </Text>
              </Box>

              <Divider />

              {/* Privacy and Security */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  8. Privacy and Data Security
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Your privacy is important to us. Our collection and use of your information is
                  governed by our{' '}
                  <ChakraLink
                    as={RouterLink}
                    to="/privacy-policy"
                    color={linkColor}
                    fontWeight="medium"
                  >
                    Privacy Policy
                  </ChakraLink>
                  , which is incorporated into these Terms by reference.
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  We implement industry-standard security measures including JWT authentication,
                  HTTPS encryption, rate limiting, and secure data storage practices.
                </Text>
              </Box>

              <Divider />

              {/* Disclaimers */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  9. Disclaimers and Limitations
                </Heading>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  9.1 Carbon Data Accuracy and Limitations
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Carbon footprint calculations are estimates based on available data sources
                  including USDA emission factors, user-provided information, and third-party
                  measurements. These calculations:
                </Text>
                <List spacing={2} mb={4}>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="orange.500" />
                    May not reflect actual field conditions, seasonal variations, or regional
                    differences
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="orange.500" />
                    Are subject to inherent limitations in agricultural data collection
                    methodologies
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="orange.500" />
                    Should not be relied upon for regulatory compliance without independent
                    verification
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="orange.500" />
                    Are intended for transparency purposes and not for trading or financial
                    certifications
                  </ListItem>
                  <ListItem color={textColor}>
                    <ListIcon as={MdCheckCircle} color="orange.500" />
                    May vary significantly from other calculation methodologies or tools
                  </ListItem>
                </List>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  9.2 Service Availability
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We strive to maintain high service availability but do not guarantee uninterrupted
                  access. The Platform may be temporarily unavailable due to maintenance, updates,
                  or technical issues.
                </Text>

                <Heading as="h3" size="md" color={headingColor} mb={3}>
                  9.3 Third-Party Content
                </Heading>
                <Text color={textColor} lineHeight="1.7">
                  We are not responsible for the accuracy or reliability of third-party data
                  sources, including USDA databases, weather services, or user-generated content.
                </Text>
              </Box>

              <Divider />

              {/* Liability Limitation */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  10. Limitation of Liability
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRAZO SHALL NOT BE LIABLE FOR ANY
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT
                  NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATING TO YOUR
                  USE OF THE PLATFORM.
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  Our total liability to you for all claims shall not exceed the amount you paid to
                  Trazo in the twelve months preceding the claim.
                </Text>
              </Box>

              <Divider />

              {/* Termination */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  11. Termination
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Either party may terminate these Terms at any time. We may suspend or terminate
                  your access immediately for violations of these Terms or applicable law.
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  Upon termination, your access rights will cease, but data retention will be
                  governed by our Privacy Policy. Blockchain records remain permanently stored and
                  cannot be deleted.
                </Text>
              </Box>

              <Divider />

              {/* Governing Law */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  12. Governing Law and Disputes
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  These Terms are governed by the laws of the State of Delaware, United States,
                  without regard to conflict of law principles. For users in the European Union,
                  certain provisions may be subject to applicable EU laws and regulations.
                </Text>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  Any disputes arising from these Terms will be resolved through binding arbitration
                  in accordance with the rules of the American Arbitration Association, conducted in
                  Delaware. This arbitration clause does not prevent either party from seeking
                  emergency injunctive relief in courts.
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  EU users retain the right to bring disputes before the courts of their Member
                  State of residence for matters related to consumer protection laws.
                </Text>
              </Box>

              <Divider />

              {/* Force Majeure */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  13. Force Majeure
                </Heading>
                <Text color={textColor} lineHeight="1.7">
                  Neither party shall be liable for any failure or delay in performance due to
                  circumstances beyond reasonable control, including but not limited to acts of God,
                  natural disasters, government regulations, internet outages, third-party API
                  failures (including USDA services), blockchain network congestion, or agricultural
                  seasonal limitations affecting data collection.
                </Text>
              </Box>

              <Divider />

              {/* Changes */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  14. Changes to Terms
                </Heading>
                <Text color={textColor} lineHeight="1.7" mb={4}>
                  We may update these Terms from time to time. We will notify you of material
                  changes by email or through the Platform at least 30 days before they take effect.
                  Continued use after changes constitutes acceptance of the new Terms.
                </Text>
                <Text color={textColor} lineHeight="1.7">
                  If you do not agree to the changes, you may terminate your account before the
                  effective date. Some changes may require your explicit consent under applicable
                  law.
                </Text>
              </Box>

              <Divider />

              {/* Contact */}
              <Box>
                <Heading as="h2" size="lg" color={headingColor} mb={4}>
                  15. Contact Information
                </Heading>
                <Text color={textColor} lineHeight="1.7">
                  If you have questions about these Terms, please contact us at:
                </Text>
                <Box mt={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                  <Text color={textColor}>
                    Email: legal@trazo.com
                    <br />
                    Address: [Company Address]
                    <br />
                    Phone: [Company Phone]
                  </Text>
                </Box>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default TermsOfService;
