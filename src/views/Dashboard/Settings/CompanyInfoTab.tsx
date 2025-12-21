import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  SimpleGrid,
  Icon,
  Badge,
  Link,
  Divider,
  useToast
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
  FaIndustry,
  FaLeaf,
  FaIdCard,
  FaEdit
} from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  StandardCard,
  StandardButton
} from 'components/Design/StandardComponents';
import { useUpdateCompanyMutation } from 'store/api/companyApi';
import { setCompany } from 'store/features/companySlice';
import EditCompanyModal from './EditCompanyModal';

interface CompanyInfoTabProps {
  company?: any;
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  type?: 'text' | 'link' | 'email' | 'phone';
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, type = 'text' }) => {
  if (!value) return null;

  const renderValue = () => {
    switch (type) {
      case 'link':
        return (
          <Link href={value as string} isExternal color="green.600" fontWeight="medium">
            {value}
          </Link>
        );
      case 'email':
        return (
          <Link href={`mailto:${value}`} color="green.600" fontWeight="medium">
            {value}
          </Link>
        );
      case 'phone':
        return (
          <Link href={`tel:${value}`} color="green.600" fontWeight="medium">
            {value}
          </Link>
        );
      default:
        return <Text fontWeight="medium" color="gray.800">{value}</Text>;
    }
  };

  return (
    <HStack spacing={3} align="flex-start">
      <Icon as={icon} color="green.500" boxSize={4} mt={1} flexShrink={0} />
      <Box>
        <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold">
          {label}
        </Text>
        {renderValue()}
      </Box>
    </HStack>
  );
};

const CompanyInfoTab: React.FC<CompanyInfoTabProps> = () => {
  const intl = useIntl();
  const toast = useToast();
  const dispatch = useDispatch();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentCompany = useSelector((state: any) => state.company.currentCompany);
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();

  const handleUpdateCompany = async (formData: any) => {
    if (!currentCompany?.id) return;

    try {
      const result = await updateCompany({
        companyId: currentCompany.id,
        companyData: formData
      }).unwrap();

      // Update Redux state
      dispatch(setCompany({ ...currentCompany, ...result }));

      toast({
        title: intl.formatMessage({ id: 'app.companyUpdated' }),
        description: intl.formatMessage({ id: 'app.companyUpdatedSuccess' }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: intl.formatMessage({ id: 'app.errorUpdating' }),
        description: error?.data?.message || intl.formatMessage({ id: 'app.errorUpdatingCompany' }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  if (!currentCompany) {
    return (
      <Box py={8} textAlign="center">
        <Text color="gray.500">{intl.formatMessage({ id: 'app.noCompanyInfo' })}</Text>
      </Box>
    );
  }

  // Format address
  const formatAddress = () => {
    const parts = [
      currentCompany.address,
      currentCompany.city,
      currentCompany.state,
      currentCompany.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Get legal structure label
  const getLegalStructureLabel = (value?: string) => {
    const structures: Record<string, string> = {
      sole_proprietorship: 'Propietario Único',
      partnership: 'Sociedad',
      llc: 'LLC',
      corporation: 'Corporación',
      cooperative: 'Cooperativa',
      family_farm: 'Granja Familiar'
    };
    return value ? structures[value] || value : null;
  };

  // Get sustainability commitment label
  const getSustainabilityLabel = (value?: string) => {
    const commitments: Record<string, string> = {
      carbon_neutral: 'Carbono Neutral',
      sustainable_practices: 'Prácticas Sostenibles',
      organic_certified: 'Certificado Orgánico',
      regenerative: 'Agricultura Regenerativa',
      exploring: 'En Exploración'
    };
    return value ? commitments[value] || value : null;
  };

  // Get sustainability goal label (transparency-first language)
  const getSustainabilityGoalLabel = (goalId: string) => {
    const goals: Record<string, string> = {
      full_transparency: 'Full Farming Transparency',
      carbon_reduction: 'Environmental Impact Tracking',
      water_conservation: 'Water Conservation',
      soil_health: 'Soil Health Focus',
      biodiversity: 'Biodiversity Protection',
      local_sourcing: 'Local Community Support'
    };
    return goals[goalId] || goalId;
  };

  // Get sustainability goals from sustainability_metadata
  const getSustainabilityGoals = () => {
    if (currentCompany.sustainability_metadata?.sustainability_goals) {
      return currentCompany.sustainability_metadata.sustainability_goals;
    }
    return [];
  };

  // Get crop focus from sustainability_metadata
  const getCropFocus = () => {
    if (currentCompany.sustainability_metadata?.crop_template?.title) {
      return currentCompany.sustainability_metadata.crop_template.title;
    }
    return null;
  };

  // Get primary commodities label
  const getCommoditiesLabel = (value?: string) => {
    const commodities: Record<string, string> = {
      fruits_tree: 'Frutas de Árbol',
      fruits_vine: 'Frutas de Vid',
      vegetables: 'Vegetales',
      grains: 'Granos',
      nuts: 'Nueces',
      dairy: 'Lácteos',
      livestock: 'Ganado',
      mixed: 'Mixto'
    };
    return value ? commodities[value] || value : null;
  };

  return (
    <VStack spacing={8} w="100%">
      {/* Logo & Company Identity Section */}
      <StandardCard
        title={intl.formatMessage({ id: 'app.companyIdentity' })}
        variant="elevated"
        headerAction={
          <StandardButton
            variant="outline"
            size="sm"
            leftIcon={<Icon as={FaEdit} />}
            onClick={() => setIsEditModalOpen(true)}
          >
            {intl.formatMessage({ id: 'app.edit' })}
          </StandardButton>
        }
      >
        <HStack spacing={6} align="flex-start" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
          <Avatar
            size="2xl"
            src={currentCompany.logo || currentCompany.image}
            name={currentCompany.name}
            bg="green.500"
            color="white"
            icon={<Icon as={FaBuilding} boxSize={10} />}
          />
          <VStack align="start" spacing={3} flex={1}>
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                {currentCompany.name}
              </Text>
              {currentCompany.tradename && (
                <Text fontSize="md" color="gray.500">
                  {currentCompany.tradename}
                </Text>
              )}
            </Box>
            {currentCompany.description && (
              <Text color="gray.600" fontSize="sm" lineHeight="1.6">
                {currentCompany.description}
              </Text>
            )}
            <HStack spacing={2} flexWrap="wrap">
              {currentCompany.is_active !== false && (
                <Badge colorScheme="green" variant="subtle" px={2} py={1} borderRadius="full">
                  {intl.formatMessage({ id: 'app.active' })}
                </Badge>
              )}
              {currentCompany.subscription_plan && (
                <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="full">
                  {currentCompany.subscription_plan.name || intl.formatMessage({ id: 'app.subscribed' })}
                </Badge>
              )}
            </HStack>
          </VStack>
        </HStack>
      </StandardCard>

      {/* Contact Information Section */}
      <StandardCard title={intl.formatMessage({ id: 'app.contactInformation' })} variant="elevated">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <InfoRow
            icon={FaEnvelope}
            label={intl.formatMessage({ id: 'app.email' })}
            value={currentCompany.contact_email || currentCompany.email}
            type="email"
          />
          <InfoRow
            icon={FaPhone}
            label={intl.formatMessage({ id: 'app.phone' })}
            value={currentCompany.contact_phone || currentCompany.phone}
            type="phone"
          />
          <InfoRow
            icon={FaMapMarkerAlt}
            label={intl.formatMessage({ id: 'app.address' })}
            value={formatAddress()}
          />
          {currentCompany.zip_code && (
            <InfoRow
              icon={FaMapMarkerAlt}
              label={intl.formatMessage({ id: 'app.postalCode' })}
              value={currentCompany.zip_code}
            />
          )}
          <InfoRow
            icon={FaGlobe}
            label={intl.formatMessage({ id: 'app.website' })}
            value={currentCompany.website}
            type="link"
          />
        </SimpleGrid>
      </StandardCard>

      {/* Social Media Section */}
      {(currentCompany.facebook || currentCompany.instagram) && (
        <StandardCard title={intl.formatMessage({ id: 'app.socialMedia' })} variant="elevated">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {currentCompany.facebook && (
              <InfoRow
                icon={FaFacebook}
                label="Facebook"
                value={currentCompany.facebook}
                type="link"
              />
            )}
            {currentCompany.instagram && (
              <InfoRow
                icon={FaInstagram}
                label="Instagram"
                value={currentCompany.instagram}
                type="link"
              />
            )}
          </SimpleGrid>
        </StandardCard>
      )}

      {/* Business Information Section */}
      <StandardCard title={intl.formatMessage({ id: 'app.businessInformation' })} variant="elevated">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <InfoRow
            icon={FaIdCard}
            label={intl.formatMessage({ id: 'app.fiscalId' })}
            value={currentCompany.fiscal_id}
          />
          <InfoRow
            icon={FaIndustry}
            label={intl.formatMessage({ id: 'app.industry' })}
            value={currentCompany.industry}
          />
          <InfoRow
            icon={FaUsers}
            label={intl.formatMessage({ id: 'app.employeeCount' })}
            value={currentCompany.employee_count}
          />
          <InfoRow
            icon={FaBuilding}
            label={intl.formatMessage({ id: 'app.legalStructure' })}
            value={getLegalStructureLabel(currentCompany.legal_structure)}
          />
        </SimpleGrid>
      </StandardCard>

      {/* Agricultural Information Section */}
      <StandardCard title={intl.formatMessage({ id: 'app.agriculturalInformation' })} variant="elevated">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <InfoRow
            icon={FaLeaf}
            label={intl.formatMessage({ id: 'app.primaryCommodities' })}
            value={getCommoditiesLabel(currentCompany.primary_commodities)}
          />
          <InfoRow
            icon={FaLeaf}
            label={intl.formatMessage({ id: 'app.sustainabilityCommitment' })}
            value={getSustainabilityLabel(currentCompany.sustainability_commitment)}
          />
          {/* Crop Focus from onboarding */}
          {getCropFocus() && (
            <InfoRow
              icon={FaLeaf}
              label={intl.formatMessage({ id: 'app.cropFocus' })}
              value={getCropFocus()}
            />
          )}
          {currentCompany.certifications && (
            <Box gridColumn={{ md: 'span 2' }}>
              <HStack spacing={3} align="flex-start">
                <Icon as={FaLeaf} color="green.500" boxSize={4} mt={1} flexShrink={0} />
                <Box>
                  <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold">
                    {intl.formatMessage({ id: 'app.certificationsList' })}
                  </Text>
                  <HStack spacing={2} mt={1} flexWrap="wrap">
                    {currentCompany.certifications.split(',').map((cert: string, index: number) => (
                      <Badge
                        key={index}
                        colorScheme="green"
                        variant="subtle"
                        px={2}
                        py={1}
                        borderRadius="full"
                      >
                        {cert.trim()}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              </HStack>
            </Box>
          )}
          {/* Sustainability Goals from onboarding (transparency-first) */}
          {getSustainabilityGoals().length > 0 && (
            <Box gridColumn={{ md: 'span 2' }}>
              <HStack spacing={3} align="flex-start">
                <Icon as={FaLeaf} color="green.500" boxSize={4} mt={1} flexShrink={0} />
                <Box>
                  <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold">
                    {intl.formatMessage({ id: 'app.sustainabilityGoals' })}
                  </Text>
                  <HStack spacing={2} mt={1} flexWrap="wrap">
                    {getSustainabilityGoals().map((goalId: string, index: number) => (
                      <Badge
                        key={index}
                        colorScheme="green"
                        variant="subtle"
                        px={2}
                        py={1}
                        borderRadius="full"
                      >
                        {getSustainabilityGoalLabel(goalId)}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              </HStack>
            </Box>
          )}
        </SimpleGrid>
      </StandardCard>

      {/* Edit Company Modal */}
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={currentCompany}
        onSubmit={handleUpdateCompany}
        isLoading={isUpdating}
      />
    </VStack>
  );
};

export default CompanyInfoTab;
