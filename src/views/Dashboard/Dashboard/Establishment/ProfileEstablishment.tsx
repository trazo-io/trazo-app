import React from 'react';
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
  useToast,
  Spinner,
  Center
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
  FaLeaf,
  FaEdit,
  FaTractor,
  FaCalendar,
  FaCertificate,
  FaSeedling,
  FaTint,
  FaShare
} from 'react-icons/fa';
// MdEco removed - climate_zone display removed for transparency-first approach
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useUserRole } from 'hooks/useUserRole';
import { useIntl } from 'react-intl';
import { StandardCard, StandardButton, StandardPage } from 'components/Design/StandardComponents';
import { useGetEstablishmentQuery } from 'store/api/companyApi';
import { StandardImageGallery } from 'components/ImageGallery';

// Type definitions
interface RootState {
  company: {
    currentCompany: {
      id: string;
      name: string;
    };
  };
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  type?: 'text' | 'link' | 'email' | 'phone';
}

// InfoRow component - matching CompanyInfoTab pattern exactly
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
        return (
          <Text fontWeight="medium" color="gray.800">
            {value}
          </Text>
        );
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

// Utility function to format snake_case values to Title Case
const formatDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

function ProfileEstablishment() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { canWrite } = useUserRole();
  const { establishmentId } = useParams();

  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);

  const {
    data: establishmentData,
    error,
    isLoading
  } = useGetEstablishmentQuery(
    {
      companyId: currentCompany?.id,
      establishmentId
    },
    {
      skip: !establishmentId || currentCompany?.id === undefined
    }
  );

  // Helper functions
  const getCertifications = () => {
    if (!establishmentData?.certifications) return [];
    if (typeof establishmentData.certifications === 'string') {
      return establishmentData.certifications
        .split(',')
        .map((cert: string) => cert.trim())
        .filter(Boolean);
    }
    if (Array.isArray(establishmentData.certifications)) {
      return establishmentData.certifications;
    }
    return [];
  };

  const getCropsGrown = () => {
    if (!establishmentData?.crops_grown) return [];
    if (Array.isArray(establishmentData.crops_grown)) {
      return establishmentData.crops_grown;
    }
    return [];
  };

  const getSustainabilityPractices = () => {
    if (!establishmentData?.sustainability_practices) return [];
    if (Array.isArray(establishmentData.sustainability_practices)) {
      return establishmentData.sustainability_practices;
    }
    return [];
  };

  const getWaterSources = () => {
    if (!establishmentData?.water_sources) return [];
    if (Array.isArray(establishmentData.water_sources)) {
      return establishmentData.water_sources;
    }
    try {
      return JSON.parse(establishmentData.water_sources);
    } catch {
      return [];
    }
  };

  // Updated: getSoilHealthPractices replaces getSoilTypes for transparency-first approach
  // Includes backward compatibility with old soil_types field
  const getSoilHealthPractices = () => {
    // Try new field first
    if (establishmentData?.soil_health_practices) {
      if (Array.isArray(establishmentData.soil_health_practices)) {
        return establishmentData.soil_health_practices;
      }
      try {
        const parsed = JSON.parse(establishmentData.soil_health_practices);
        if (parsed.length > 0) return parsed;
      } catch {}
    }
    // Fall back to old soil_types field for backward compatibility
    if (establishmentData?.soil_types) {
      if (Array.isArray(establishmentData.soil_types)) {
        return establishmentData.soil_types;
      }
      try {
        return JSON.parse(establishmentData.soil_types);
      } catch {
        return [];
      }
    }
    return [];
  };

  const getIrrigationMethods = () => {
    if (!establishmentData?.irrigation_methods) return [];
    if (Array.isArray(establishmentData.irrigation_methods)) {
      return establishmentData.irrigation_methods;
    }
    try {
      return JSON.parse(establishmentData.irrigation_methods);
    } catch {
      return [];
    }
  };

  const formatAddress = () => {
    const parts = [
      establishmentData?.address,
      establishmentData?.city,
      establishmentData?.state,
      establishmentData?.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  const formatCoordinates = () => {
    if (
      typeof establishmentData?.latitude === 'number' &&
      typeof establishmentData?.longitude === 'number' &&
      !isNaN(establishmentData.latitude) &&
      !isNaN(establishmentData.longitude)
    ) {
      return `${establishmentData.latitude.toFixed(6)}, ${establishmentData.longitude.toFixed(6)}`;
    }
    return null;
  };

  // Handle sharing
  const handleShare = async () => {
    try {
      const baseUrl = window.location.hostname.includes('localhost')
        ? 'http://localhost:3000'
        : `https://consumer.${import.meta.env.VITE_APP_BASE_DOMAIN}`;

      const publicProfileUrl = `${baseUrl}/establishment/${establishmentId}`;

      if (navigator.share) {
        await navigator.share({
          title: `${establishmentData?.name} - Sustainable Agriculture`,
          text: `Check out this sustainable farm! ${establishmentData?.description || ''}`,
          url: publicProfileUrl
        });
      } else {
        await navigator.clipboard.writeText(publicProfileUrl);
        toast({
          title: 'Enlace copiado',
          description: 'El enlace del perfil público ha sido copiado al portapapeles.',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return (
      <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
        <Center py={20}>
          <Spinner size="xl" color="green.500" />
        </Center>
      </StandardPage>
    );
  }

  if (error || !establishmentData) {
    return (
      <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
        <Center py={20}>
          <Text color="red.500">Error al cargar los datos del establecimiento.</Text>
        </Center>
      </StandardPage>
    );
  }

  return (
    <StandardPage showBackButton onBack={() => navigate('/admin/dashboard')}>
      <VStack spacing={8} w="100%">
        {/* Identity Section */}
        <StandardCard
          title={intl.formatMessage({ id: 'app.establishmentInformation' })}
          variant="elevated"
          headerAction={
            <HStack spacing={2}>
              <StandardButton
                variant="ghost"
                size="sm"
                leftIcon={<Icon as={FaShare} />}
                onClick={handleShare}
              >
                {intl.formatMessage({ id: 'app.share' })}
              </StandardButton>
              {canWrite && (
                <StandardButton
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon as={FaEdit} />}
                  onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/change`)}
                >
                  {intl.formatMessage({ id: 'app.edit' })}
                </StandardButton>
              )}
            </HStack>
          }
        >
          <HStack spacing={6} align="flex-start" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
            <Avatar
              size="2xl"
              src={establishmentData.images?.[0]?.url || establishmentData.images?.[0]}
              name={establishmentData.name}
              bg="green.500"
              color="white"
              icon={<Icon as={FaBuilding} boxSize={10} />}
            />
            <VStack align="start" spacing={3} flex={1}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  {establishmentData.name}
                </Text>
                {establishmentData.company?.name && (
                  <Text fontSize="md" color="gray.500">
                    {establishmentData.company.name}
                  </Text>
                )}
              </Box>
              {establishmentData.description && (
                <Text color="gray.600" fontSize="sm" lineHeight="1.6">
                  {establishmentData.description}
                </Text>
              )}
              <HStack spacing={2} flexWrap="wrap">
                {establishmentData.is_active !== false && (
                  <Badge colorScheme="green" variant="subtle" px={2} py={1} borderRadius="full">
                    Activo
                  </Badge>
                )}
                {(establishmentData.establishment_type || establishmentData.type) && (
                  <Badge colorScheme="blue" variant="subtle" px={2} py={1} borderRadius="full">
                    {formatDisplayValue(
                      establishmentData.establishment_type || establishmentData.type
                    )}
                  </Badge>
                )}
                {establishmentData.farming_method && (
                  <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="full">
                    {formatDisplayValue(establishmentData.farming_method)}
                  </Badge>
                )}
              </HStack>
            </VStack>
          </HStack>
        </StandardCard>

        {/* Photo Gallery */}
        {establishmentData.images && establishmentData.images.length > 0 && (
          <StandardCard title="Galería de Fotos" variant="elevated">
            <StandardImageGallery
              images={establishmentData.images}
              title="Fotos del Establecimiento"
              variant="default"
              enablePreview={true}
              showImageCount={true}
              height={{ base: '200px', md: '280px' }}
              maxDisplayImages={4}
            />
          </StandardCard>
        )}

        {/* Quick Stats - Updated: Removed employee_count (not consumer-relevant) */}
        <StandardCard title="Estadísticas Rápidas" variant="elevated">
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={6}>
            <VStack spacing={1} align="center" p={4} bg="green.50" borderRadius="lg">
              <Icon as={FaTractor} color="green.500" boxSize={6} />
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                {establishmentData.total_acreage || 0}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Acres
              </Text>
            </VStack>
            <VStack spacing={1} align="center" p={4} bg="purple.50" borderRadius="lg">
              <Icon as={FaCalendar} color="purple.500" boxSize={6} />
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                {establishmentData.year_established || '--'}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Fundado
              </Text>
            </VStack>
            <VStack spacing={1} align="center" p={4} bg="orange.50" borderRadius="lg">
              <Icon as={FaSeedling} color="orange.500" boxSize={6} />
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                {getCropsGrown().length}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Cultivos
              </Text>
            </VStack>
          </SimpleGrid>
        </StandardCard>

        {/* Contact Information */}
        <StandardCard title="Información de Contacto" variant="elevated">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <InfoRow
              icon={FaEnvelope}
              label="Correo Electrónico"
              value={establishmentData.email || establishmentData.contact_email}
              type="email"
            />
            <InfoRow
              icon={FaPhone}
              label="Teléfono"
              value={establishmentData.phone || establishmentData.contact_phone}
              type="phone"
            />
            <InfoRow
              icon={FaUsers}
              label="Persona de Contacto"
              value={establishmentData.contact_person}
            />
            <InfoRow
              icon={FaGlobe}
              label="Sitio Web"
              value={establishmentData.company?.website}
              type="link"
            />
          </SimpleGrid>
        </StandardCard>

        {/* Location Details */}
        <StandardCard title="Ubicación" variant="elevated">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <InfoRow icon={FaMapMarkerAlt} label="Dirección" value={formatAddress()} />
            <InfoRow
              icon={FaMapMarkerAlt}
              label="Código Postal"
              value={establishmentData.zip_code}
            />
            <InfoRow icon={FaMapMarkerAlt} label="Zona" value={establishmentData.zone} />
            <InfoRow icon={FaMapMarkerAlt} label="Coordenadas" value={formatCoordinates()} />
          </SimpleGrid>
        </StandardCard>

        {/* Operations - Updated: Removed employee_count (not consumer-relevant) */}
        <StandardCard title="Operaciones" variant="elevated">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <InfoRow
              icon={FaTractor}
              label="Método de Cultivo"
              value={establishmentData.farming_method}
            />
            <InfoRow
              icon={FaTractor}
              label="Área Total"
              value={
                establishmentData.total_acreage ? `${establishmentData.total_acreage} acres` : null
              }
            />
            <InfoRow
              icon={FaCalendar}
              label="Año de Fundación"
              value={establishmentData.year_established}
            />
          </SimpleGrid>
        </StandardCard>

        {/* Agricultural Information - Updated: Removed climate_zone, updated soil types to soil health practices */}
        {(getWaterSources().length > 0 ||
          getSoilHealthPractices().length > 0 ||
          getIrrigationMethods().length > 0) && (
          <StandardCard title="Información Agrícola" variant="elevated">
            <VStack spacing={6} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {getWaterSources().length > 0 && (
                  <InfoRow
                    icon={FaTint}
                    label="Fuentes de Agua"
                    value={getWaterSources().join(', ')}
                  />
                )}
                {getSoilHealthPractices().length > 0 && (
                  <InfoRow
                    icon={FaLeaf}
                    label="Prácticas de Salud del Suelo"
                    value={getSoilHealthPractices().join(', ')}
                  />
                )}
                {getIrrigationMethods().length > 0 && (
                  <InfoRow
                    icon={FaTint}
                    label="Métodos de Riego"
                    value={getIrrigationMethods().join(', ')}
                  />
                )}
              </SimpleGrid>
            </VStack>
          </StandardCard>
        )}

        {/* Crops Grown */}
        {getCropsGrown().length > 0 && (
          <StandardCard title="Cultivos" variant="elevated">
            <HStack spacing={2} flexWrap="wrap">
              {getCropsGrown().map((crop: string, index: number) => (
                <Badge
                  key={index}
                  colorScheme="green"
                  variant="subtle"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                >
                  {crop}
                </Badge>
              ))}
            </HStack>
          </StandardCard>
        )}

        {/* Certifications */}
        {getCertifications().length > 0 && (
          <StandardCard title="Certificaciones" variant="elevated">
            <HStack spacing={2} flexWrap="wrap">
              {getCertifications().map((cert: string, index: number) => (
                <Badge
                  key={index}
                  colorScheme="blue"
                  variant="subtle"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                >
                  <HStack spacing={1}>
                    <Icon as={FaCertificate} boxSize={3} />
                    <Text>{cert}</Text>
                  </HStack>
                </Badge>
              ))}
            </HStack>
          </StandardCard>
        )}

        {/* Sustainability Practices */}
        {getSustainabilityPractices().length > 0 && (
          <StandardCard title="Prácticas de Sostenibilidad" variant="elevated">
            <HStack spacing={2} flexWrap="wrap">
              {getSustainabilityPractices().map((practice: string, index: number) => (
                <Badge
                  key={index}
                  colorScheme="green"
                  variant="subtle"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                >
                  <HStack spacing={1}>
                    <Icon as={FaLeaf} boxSize={3} />
                    <Text>{practice}</Text>
                  </HStack>
                </Badge>
              ))}
            </HStack>
          </StandardCard>
        )}

        {/* Social Media */}
        {(establishmentData.company?.facebook || establishmentData.company?.instagram) && (
          <StandardCard title="Redes Sociales" variant="elevated">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {establishmentData.company?.facebook && (
                <InfoRow
                  icon={FaFacebook}
                  label="Facebook"
                  value={establishmentData.company.facebook}
                  type="link"
                />
              )}
              {establishmentData.company?.instagram && (
                <InfoRow
                  icon={FaInstagram}
                  label="Instagram"
                  value={establishmentData.company.instagram}
                  type="link"
                />
              )}
            </SimpleGrid>
          </StandardCard>
        )}

        {/* About Section */}
        {(establishmentData.about ||
          establishmentData.main_activities ||
          establishmentData.location_highlights) && (
          <StandardCard title="Acerca del Establecimiento" variant="elevated">
            <VStack spacing={4} align="stretch">
              {establishmentData.about && (
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    Descripción
                  </Text>
                  <Text color="gray.700" lineHeight="1.7">
                    {establishmentData.about}
                  </Text>
                </Box>
              )}
              {establishmentData.main_activities && (
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    Actividades Principales
                  </Text>
                  <Text color="gray.700" lineHeight="1.7">
                    {establishmentData.main_activities}
                  </Text>
                </Box>
              )}
              {establishmentData.location_highlights && (
                <Box>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="semibold"
                    mb={1}
                  >
                    Aspectos Destacados
                  </Text>
                  <Text color="gray.700" lineHeight="1.7">
                    {establishmentData.location_highlights}
                  </Text>
                </Box>
              )}
            </VStack>
          </StandardCard>
        )}

        {/* Company Details */}
        {establishmentData.company && (
          <StandardCard title="Información de la Compañía" variant="elevated">
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <InfoRow icon={FaBuilding} label="Compañía" value={establishmentData.company.name} />
              {establishmentData.company.tradename &&
                establishmentData.company.tradename !== establishmentData.company.name && (
                  <InfoRow
                    icon={FaBuilding}
                    label="Nombre Comercial"
                    value={establishmentData.company.tradename}
                  />
                )}
              <InfoRow
                icon={FaBuilding}
                label="Industria"
                value={establishmentData.company.industry}
              />
              <InfoRow
                icon={FaBuilding}
                label="Estructura Legal"
                value={establishmentData.company.legal_structure}
              />
              <InfoRow
                icon={FaLeaf}
                label="Productos Principales"
                value={establishmentData.company.primary_commodities}
              />
              <InfoRow
                icon={FaLeaf}
                label="Compromiso de Sostenibilidad"
                value={establishmentData.company.sustainability_commitment}
              />
            </SimpleGrid>
          </StandardCard>
        )}
      </VStack>
    </StandardPage>
  );
}

export default ProfileEstablishment;
