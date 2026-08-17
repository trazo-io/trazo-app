import React from 'react';
import { useIntl } from 'react-intl';
import { useSwipeToDismiss } from 'hooks/useSwipeToDismiss';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Icon,
  Image,
  Divider,
  SimpleGrid,
  useColorModeValue,
  Flex,
  Link,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Avatar,
  Button,
  useBreakpointValue
} from '@chakra-ui/react';
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaFacebook,
  FaInstagram,
  FaUsers,
  FaCalendarAlt,
  FaCertificate,
  FaLeaf,
  FaExternalLinkAlt,
  FaIndustry,
  FaChartLine
} from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyData: {
    id: string;
    name: string;
    tradename?: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    facebook?: string;
    instagram?: string;
    logo?: string;
    fiscal_id?: string;
    contact_email?: string;
    established_year?: number;
    employee_count?: number;
    total_establishments?: number;
    total_parcels?: number;
    certifications?: string[];
    // New agricultural compliance fields
    legal_structure?: string;
    primary_commodities?: string;
    sustainability_commitment?: string;
    subscription_plan?: {
      name: string;
      tier: string;
    };
  };
}

export const CompanyModal: React.FC<CompanyModalProps> = ({ isOpen, onClose, companyData }) => {
  const intl = useIntl();
  const swipeHandlers = useSwipeToDismiss({ onClose });
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const accentColor = useColorModeValue('green.700', 'green.300');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const iconBg = useColorModeValue('green.50', 'green.900');
  const isMobile = useBreakpointValue({ base: true, md: false });

  const headerContent = (
    <HStack spacing={4}>
      <Box p={3} borderRadius="lg" bg={iconBg}>
        <Icon as={FaBuilding} boxSize={6} color={accentColor} />
      </Box>
      <VStack align="start" spacing={1}>
        <Heading size={{ base: 'md', md: 'lg' }} color={textColor}>
          {companyData.name}
        </Heading>
        {companyData.tradename && (
          <Text fontSize="sm" color="gray.500">
            Trading as: {companyData.tradename}
          </Text>
        )}
        {companyData.subscription_plan && (
          <Badge
            colorScheme="green"
            variant="subtle"
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="full">
            {companyData.subscription_plan.name} Plan
          </Badge>
        )}
      </VStack>
    </HStack>
  );

  const bodyContent = (
    <VStack spacing={6} align="stretch" pb={{ base: 6, md: 0 }}>
      {/* Company Logo and Description */}
      {(companyData.logo || companyData.description) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <VStack spacing={4} align="stretch">
              {companyData.logo && (
                <Flex justify="center">
                  <Avatar
                    size="xl"
                    src={companyData.logo}
                    name={companyData.name}
                    bg={accentColor}
                    color="white"
                  />
                </Flex>
              )}
              {companyData.description && (
                <Text color={textColor} textAlign="center" lineHeight="tall">
                  {companyData.description}
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Company Statistics */}
      <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
        <CardBody p={6}>
          <Heading size="md" color={textColor} mb={4}>
            {intl.formatMessage({
              id: 'consumer.modal.companyOverview',
              defaultMessage: 'Company Overview'
            })}
          </Heading>
          <StatGroup>
            <Stat>
              <StatLabel color="gray.500">
                {intl.formatMessage({
                  // Shopper-facing count of farms. "Establishments" is internal vocabulary.
                  id: 'consumer.modal.establishments',
                  defaultMessage: 'Farms'
                })}
              </StatLabel>
              <StatNumber color={accentColor}>{companyData.total_establishments || 0}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel color="gray.500">
                {intl.formatMessage({
                  id: 'consumer.modal.totalParcels',
                  defaultMessage: 'Total Parcels'
                })}
              </StatLabel>
              <StatNumber color={accentColor}>{companyData.total_parcels || 0}</StatNumber>
            </Stat>
            {companyData.employee_count && (
              <Stat>
                <StatLabel color="gray.500">
                  {intl.formatMessage({
                    id: 'consumer.modal.employees',
                    defaultMessage: 'Employees'
                  })}
                </StatLabel>
                <StatNumber color={accentColor}>{companyData.employee_count}</StatNumber>
              </Stat>
            )}
          </StatGroup>
        </CardBody>
      </Card>

      {/* Contact Information */}
      <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
        <CardBody p={6}>
          <Heading size="md" color={textColor} mb={4}>
            {intl.formatMessage({
              id: 'consumer.modal.contactInformation',
              defaultMessage: 'Contact Information'
            })}
          </Heading>
          <VStack spacing={4} align="stretch">
            {companyData.address && (
              <HStack spacing={3}>
                <Icon as={FaMapMarkerAlt} color={accentColor} flexShrink={0} />
                <Text color={textColor}>
                  {companyData.address}
                  {companyData.city && `, ${companyData.city}`}
                  {companyData.state && `, ${companyData.state}`}
                  {companyData.country && `, ${companyData.country}`}
                </Text>
              </HStack>
            )}
            {companyData.phone && (
              <HStack spacing={3}>
                <Icon as={FaPhone} color={accentColor} flexShrink={0} />
                <Link href={`tel:${companyData.phone}`} color={textColor}>
                  {companyData.phone}
                </Link>
              </HStack>
            )}
            {companyData.email && (
              <HStack spacing={3}>
                <Icon as={FaEnvelope} color={accentColor} flexShrink={0} />
                <Link href={`mailto:${companyData.email}`} color={textColor}>
                  {companyData.email}
                </Link>
              </HStack>
            )}
            {companyData.contact_email && companyData.contact_email !== companyData.email && (
              <HStack spacing={3}>
                <Icon as={FaEnvelope} color={accentColor} flexShrink={0} />
                <Text color="gray.500" fontSize="sm">
                  {intl.formatMessage({
                    id: 'consumer.modal.contactColon',
                    defaultMessage: 'Contact:'
                  })}
                </Text>
                <Link href={`mailto:${companyData.contact_email}`} color={textColor}>
                  {companyData.contact_email}
                </Link>
              </HStack>
            )}
            {companyData.website && (
              <HStack spacing={3}>
                <Icon as={FaGlobe} color={accentColor} flexShrink={0} />
                <Link
                  href={companyData.website}
                  isExternal
                  color={textColor}
                  _hover={{ color: accentColor }}>
                  {companyData.website}
                  <Icon as={FaExternalLinkAlt} ml={2} boxSize={3} />
                </Link>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Social Media */}
      {(companyData.facebook || companyData.instagram) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              {intl.formatMessage({
                id: 'consumer.modal.socialMedia',
                defaultMessage: 'Social Media'
              })}
            </Heading>
            <HStack spacing={4}>
              {companyData.facebook && (
                <Button
                  as={Link}
                  href={companyData.facebook}
                  isExternal
                  leftIcon={<FaFacebook />}
                  colorScheme="facebook"
                  variant="outline"
                  size="sm">
                  Facebook
                </Button>
              )}
              {companyData.instagram && (
                <Button
                  as={Link}
                  href={companyData.instagram}
                  isExternal
                  leftIcon={<FaInstagram />}
                  colorScheme="pink"
                  variant="outline"
                  size="sm">
                  Instagram
                </Button>
              )}
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Certifications */}
      {companyData.certifications && companyData.certifications.length > 0 && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={FaCertificate} color={accentColor} />
                <Text>
                  {intl.formatMessage({
                    id: 'consumer.modal.certifications',
                    defaultMessage: 'Certifications'
                  })}
                </Text>
              </HStack>
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
              {companyData.certifications
                .filter((cert) => {
                  // "Other" is a non-meaningful cert category — don't show to consumers.
                  const name =
                    typeof cert === 'object' && cert !== null
                      ? (cert as any).display_name || (cert as any).name
                      : cert;
                  return name !== 'Other';
                })
                .map((cert, index) => (
                  <Badge
                    key={index}
                    colorScheme="green"
                    variant="subtle"
                    px={3}
                    py={2}
                    borderRadius="md"
                    fontSize="sm">
                    {typeof cert === 'object' && cert !== null
                      ? (cert as any).display_name || (cert as any).name || 'Certification'
                      : cert}
                  </Badge>
                ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      )}

      {/* Agricultural Compliance */}
      {(companyData.legal_structure ||
        companyData.primary_commodities ||
        companyData.sustainability_commitment) && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              <HStack>
                <Icon as={FaLeaf} color={accentColor} />
                <Text>
                  {intl.formatMessage({
                    id: 'consumer.modal.agriculturalInformation',
                    defaultMessage: 'Agricultural Information'
                  })}
                </Text>
              </HStack>
            </Heading>
            <VStack spacing={4} align="stretch">
              {companyData.legal_structure && (
                <Box>
                  <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={1}>
                    {intl.formatMessage({
                      id: 'consumer.modal.legalStructure',
                      defaultMessage: 'Legal Structure'
                    })}
                  </Text>
                  <Badge colorScheme="blue" p={2} borderRadius="md">
                    {companyData.legal_structure}
                  </Badge>
                </Box>
              )}

              {companyData.primary_commodities && (
                <Box>
                  <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={1}>
                    {intl.formatMessage({
                      id: 'consumer.modal.primaryAgriculturalFocus',
                      defaultMessage: 'Primary Agricultural Focus'
                    })}
                  </Text>
                  <Badge colorScheme="green" p={2} borderRadius="md">
                    {companyData.primary_commodities}
                  </Badge>
                </Box>
              )}

              {companyData.sustainability_commitment && (
                <Box>
                  <Text fontWeight="semibold" color={textColor} fontSize="sm" mb={1}>
                    {intl.formatMessage({
                      id: 'consumer.modal.sustainabilityCommitment',
                      defaultMessage: 'Sustainability Commitment'
                    })}
                  </Text>
                  <Badge colorScheme="orange" p={2} borderRadius="md">
                    {companyData.sustainability_commitment}
                  </Badge>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Legal Information */}
      {companyData.fiscal_id && (
        <Card bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
          <CardBody p={6}>
            <Heading size="md" color={textColor} mb={4}>
              {intl.formatMessage({
                id: 'consumer.modal.legalInformation',
                defaultMessage: 'Legal Information'
              })}
            </Heading>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text color="gray.500" fontSize="sm">
                  {intl.formatMessage({ id: 'consumer.modal.taxId', defaultMessage: 'Tax ID:' })}
                </Text>
                <Text color={textColor} fontSize="sm" fontFamily="mono">
                  {companyData.fiscal_id}
                </Text>
              </HStack>
              {companyData.established_year && (
                <HStack justify="space-between">
                  <Text color="gray.500" fontSize="sm">
                    {intl.formatMessage({
                      id: 'consumer.modal.establishedColon',
                      defaultMessage: 'Established:'
                    })}
                  </Text>
                  <Text color={textColor} fontSize="sm">
                    {companyData.established_year}
                  </Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );

  // Mobile: Bottom sheet (Drawer)
  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} placement="bottom">
        <DrawerOverlay bg="blackAlpha.400" />
        <DrawerContent
          bg={bgColor}
          borderTopRadius="2xl"
          maxH="82vh"
          containerProps={{ style: { zIndex: 10000 } }}>
          {/* Drag handle - swipe down to dismiss */}
          <Box
            pt={3}
            pb={1}
            display="flex"
            justifyContent="center"
            cursor="grab"
            {...swipeHandlers}>
            <Box w="36px" h="4px" borderRadius="full" bg="gray.300" />
          </Box>
          <DrawerCloseButton top={4} />
          <DrawerHeader px={5} pt={2} pb={4} borderBottomWidth="1px" borderColor={borderColor}>
            {headerContent}
          </DrawerHeader>
          <DrawerBody px={5} py={4} overflowY="auto">
            {bodyContent}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Centered modal
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent bg={bgColor} borderRadius="xl" maxH="90vh" mx={4}>
        <ModalHeader p={6} pb={4} borderBottom="1px" borderColor={borderColor}>
          {headerContent}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6} overflowY="auto">
          {bodyContent}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CompanyModal;
