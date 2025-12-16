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
        title: 'Compañía actualizada',
        description: 'La información de la compañía ha sido actualizada exitosamente',
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: 'Error al actualizar',
        description: error?.data?.message || 'Ocurrió un error al actualizar la compañía',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  if (!currentCompany) {
    return (
      <Box py={8} textAlign="center">
        <Text color="gray.500">No hay información de compañía disponible</Text>
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
        title="Identidad de la Compañía"
        variant="elevated"
        headerAction={
          <StandardButton
            variant="outline"
            size="sm"
            leftIcon={<Icon as={FaEdit} />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Editar
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
                  Activa
                </Badge>
              )}
              {currentCompany.subscription_plan && (
                <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="full">
                  {currentCompany.subscription_plan.name || 'Suscrito'}
                </Badge>
              )}
            </HStack>
          </VStack>
        </HStack>
      </StandardCard>

      {/* Contact Information Section */}
      <StandardCard title="Información de Contacto" variant="elevated">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <InfoRow
            icon={FaEnvelope}
            label="Correo Electrónico"
            value={currentCompany.contact_email || currentCompany.email}
            type="email"
          />
          <InfoRow
            icon={FaPhone}
            label="Teléfono"
            value={currentCompany.contact_phone || currentCompany.phone}
            type="phone"
          />
          <InfoRow
            icon={FaMapMarkerAlt}
            label="Dirección"
            value={formatAddress()}
          />
          {currentCompany.zip_code && (
            <InfoRow
              icon={FaMapMarkerAlt}
              label="Código Postal"
              value={currentCompany.zip_code}
            />
          )}
          <InfoRow
            icon={FaGlobe}
            label="Sitio Web"
            value={currentCompany.website}
            type="link"
          />
        </SimpleGrid>
      </StandardCard>

      {/* Social Media Section */}
      {(currentCompany.facebook || currentCompany.instagram) && (
        <StandardCard title="Redes Sociales" variant="elevated">
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
      <StandardCard title="Información del Negocio" variant="elevated">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <InfoRow
            icon={FaIdCard}
            label="ID Fiscal"
            value={currentCompany.fiscal_id}
          />
          <InfoRow
            icon={FaIndustry}
            label="Industria"
            value={currentCompany.industry}
          />
          <InfoRow
            icon={FaUsers}
            label="Número de Empleados"
            value={currentCompany.employee_count}
          />
          <InfoRow
            icon={FaBuilding}
            label="Estructura Legal"
            value={getLegalStructureLabel(currentCompany.legal_structure)}
          />
        </SimpleGrid>
      </StandardCard>

      {/* Agricultural Information Section */}
      <StandardCard title="Información Agrícola" variant="elevated">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <InfoRow
            icon={FaLeaf}
            label="Productos Principales"
            value={getCommoditiesLabel(currentCompany.primary_commodities)}
          />
          <InfoRow
            icon={FaLeaf}
            label="Compromiso de Sostenibilidad"
            value={getSustainabilityLabel(currentCompany.sustainability_commitment)}
          />
          {currentCompany.certifications && (
            <Box gridColumn={{ md: 'span 2' }}>
              <HStack spacing={3} align="flex-start">
                <Icon as={FaLeaf} color="green.500" boxSize={4} mt={1} flexShrink={0} />
                <Box>
                  <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold">
                    Certificaciones
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
