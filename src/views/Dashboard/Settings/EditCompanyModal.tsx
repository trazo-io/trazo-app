import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Icon,
  useBreakpointValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
  Circle,
  Progress
} from '@chakra-ui/react';
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaGlobe,
  FaLeaf,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaFlag
} from 'react-icons/fa';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number, boolean } from 'zod';
import {
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardSelect,
  StandardButton
} from 'components/Design/StandardComponents';

// Validation schema matching AddCompany
const editCompanySchema = object({
  name: string().min(1, 'El nombre de la compañía es requerido'),
  tradename: string().optional(),
  contact_email: string().email('Correo electrónico inválido').optional().or(string().length(0)),
  contact_phone: string().optional(),
  address: string().optional(),
  city: string().optional(),
  state: string().optional(), // 2-letter US state code for USDA API
  zip_code: string().optional(),
  website: string().url('URL inválida').optional().or(string().length(0)),
  description: string().optional(),
  fiscal_id: string().optional(),
  facebook: string().url('URL de Facebook inválida').optional().or(string().length(0)),
  instagram: string().url('URL de Instagram inválida').optional().or(string().length(0)),
  certifications: string().optional(),
  employee_count: number().optional().nullable(),
  is_active: boolean().optional(),
  industry: string().optional(),
  legal_structure: string().optional(),
  primary_commodities: string().optional(),
  sustainability_commitment: string().optional()
});

type EditCompanyFormData = {
  name: string;
  tradename?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string; // 2-letter US state code
  zip_code?: string;
  website?: string;
  description?: string;
  fiscal_id?: string;
  facebook?: string;
  instagram?: string;
  certifications?: string;
  employee_count?: number | null;
  is_active?: boolean;
  industry?: string;
  legal_structure?: string;
  primary_commodities?: string;
  sustainability_commitment?: string;
};

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any;
  onSubmit: (data: EditCompanyFormData) => Promise<void>;
  isLoading?: boolean;
}

const STEPS = [
  { title: 'Información Básica', icon: FaBuilding, description: 'Nombre y datos principales' },
  { title: 'Ubicación', icon: FaMapMarkerAlt, description: 'Dirección y contacto' },
  { title: 'Detalles', icon: FaGlobe, description: 'Web y redes sociales' },
  { title: 'Sostenibilidad', icon: FaLeaf, description: 'Información agrícola' }
];

// Stored values. Labels: `company.legalStructure.<value>`.
export const LEGAL_STRUCTURES = [
  'sole_proprietorship',
  'partnership',
  'llc',
  'corporation',
  'cooperative',
  'family_farm'
];

// Stored values. Labels: `company.industry.<value>`.
const INDUSTRIES = [
  'crop_production',
  'livestock',
  'dairy',
  'mixed_farming',
  'organic_farming',
  'greenhouse'
];

const PRIMARY_COMMODITIES = [
  { value: 'fruits_tree', label: 'Frutas de Árbol' },
  { value: 'fruits_vine', label: 'Frutas de Vid' },
  { value: 'vegetables', label: 'Vegetales' },
  { value: 'grains', label: 'Granos' },
  { value: 'nuts', label: 'Nueces' },
  { value: 'dairy', label: 'Lácteos' },
  { value: 'livestock', label: 'Ganado' },
  { value: 'mixed', label: 'Mixto' }
];

// Stored values. Labels: `company.sustainabilityCommitment.<value>`.
export const SUSTAINABILITY_COMMITMENTS = [
  'carbon_neutral',
  'sustainable_practices',
  'organic_certified',
  'regenerative',
  'exploring'
];

// US States - 2-letter codes required for USDA API and carbon calculations
// Must match AddCompany.jsx for consistency
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onSubmit,
  isLoading = false
}) => {
  const intl = useIntl();
  const [currentStep, setCurrentStep] = useState(0);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const methods = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanySchema),
    defaultValues: {
      name: '',
      tradename: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      state: '', // 2-letter US state code
      zip_code: '',
      website: '',
      description: '',
      fiscal_id: '',
      facebook: '',
      instagram: '',
      certifications: '',
      employee_count: null,
      is_active: true,
      industry: '',
      legal_structure: '',
      primary_commodities: '',
      sustainability_commitment: ''
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = methods;

  // Reset form when company changes or modal opens
  useEffect(() => {
    if (company && isOpen) {
      reset({
        name: company.name || '',
        tradename: company.tradename || '',
        contact_email: company.contact_email || company.email || '',
        contact_phone: company.contact_phone || company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '', // 2-letter US state code
        zip_code: company.zip_code || '',
        website: company.website || '',
        description: company.description || '',
        fiscal_id: company.fiscal_id || '',
        facebook: company.facebook || '',
        instagram: company.instagram || '',
        certifications: company.certifications || '',
        employee_count: company.employee_count || null,
        is_active: company.is_active !== false,
        industry: company.industry || '',
        legal_structure: company.legal_structure || '',
        primary_commodities: company.primary_commodities || '',
        sustainability_commitment: company.sustainability_commitment || ''
      });
      setCurrentStep(0);
    }
  }, [company, isOpen, reset]);

  const handleFormSubmit = async (data: EditCompanyFormData) => {
    // Clean up empty strings to null/undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
    );
    // Always set country to US since we're US-only
    (cleanedData as any).country = 'US';
    await onSubmit(cleanedData as EditCompanyFormData);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  // Step Progress Indicator
  const StepIndicator = () => (
    <Box mb={6}>
      <HStack spacing={2} justify="center" mb={4}>
        {STEPS.map((step, index) => (
          <React.Fragment key={index}>
            <VStack spacing={1}>
              <Circle
                size="36px"
                bg={index <= currentStep ? 'green.500' : 'gray.200'}
                color={index <= currentStep ? 'white' : 'gray.500'}
                cursor="pointer"
                onClick={() => setCurrentStep(index)}
                transition="all 0.2s"
                _hover={{ transform: 'scale(1.05)' }}>
                {index < currentStep ? (
                  <Icon as={FaCheck} boxSize={4} />
                ) : (
                  <Icon as={step.icon} boxSize={4} />
                )}
              </Circle>
              <Text
                fontSize="xs"
                fontWeight={index === currentStep ? 'bold' : 'normal'}
                color={index <= currentStep ? 'green.600' : 'gray.500'}
                display={{ base: 'none', md: 'block' }}>
                {step.title}
              </Text>
            </VStack>
            {index < STEPS.length - 1 && (
              <Box
                h="2px"
                w={{ base: '20px', md: '40px' }}
                bg={index < currentStep ? 'green.500' : 'gray.200'}
                transition="all 0.2s"
              />
            )}
          </React.Fragment>
        ))}
      </HStack>
      <Progress
        value={(currentStep / (STEPS.length - 1)) * 100}
        size="xs"
        colorScheme="green"
        borderRadius="full"
      />
    </Box>
  );

  // Step 1: Basic Information
  const BasicInfoStep = () => (
    <VStack spacing={5} align="stretch">
      <StandardField label="Nombre de la Compañía" required error={errors.name?.message}>
        <StandardInput placeholder="Ej: Green Valley Farms" {...register('name')} />
      </StandardField>

      <StandardField label="Nombre Comercial" error={errors.tradename?.message}>
        <StandardInput placeholder="Nombre comercial (opcional)" {...register('tradename')} />
      </StandardField>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label="Correo Electrónico" error={errors.contact_email?.message}>
          <StandardInput
            type="email"
            placeholder="contacto@empresa.com"
            {...register('contact_email')}
          />
        </StandardField>

        <StandardField label="Teléfono" error={errors.contact_phone?.message}>
          <StandardInput
            type="tel"
            placeholder="+1 (555) 123-4567"
            {...register('contact_phone')}
          />
        </StandardField>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label="Estructura Legal" error={errors.legal_structure?.message}>
          <StandardSelect {...register('legal_structure')}>
            <option value="">Seleccionar...</option>
            {LEGAL_STRUCTURES.map((value) => (
              <option key={value} value={value}>
                {intl.formatMessage({ id: `company.legalStructure.${value}` })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>

        <StandardField label="Industria" error={errors.industry?.message}>
          <StandardSelect {...register('industry')}>
            <option value="">Seleccionar...</option>
            {INDUSTRIES.map((value) => (
              <option key={value} value={value}>
                {intl.formatMessage({ id: `company.industry.${value}` })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label="ID Fiscal" error={errors.fiscal_id?.message}>
          <StandardInput placeholder="RFC / EIN" {...register('fiscal_id')} />
        </StandardField>

        <StandardField label="Número de Empleados" error={errors.employee_count?.message}>
          <StandardInput
            type="number"
            placeholder="15"
            {...register('employee_count', { valueAsNumber: true })}
          />
        </StandardField>
      </SimpleGrid>

      <StandardField label="Descripción" error={errors.description?.message}>
        <StandardTextarea
          placeholder="Breve descripción de su compañía..."
          {...register('description')}
        />
      </StandardField>
    </VStack>
  );

  // Step 2: Location
  const LocationStep = () => (
    <VStack spacing={5} align="stretch">
      <Box p={4} bg="blue.50" borderRadius="lg" border="1px solid" borderColor="blue.200" mb={2}>
        <HStack spacing={3} align="flex-start">
          <Icon as={FaFlag} color="blue.500" boxSize={5} mt={0.5} />
          <Box>
            <Text fontWeight="semibold" color="blue.800" fontSize="sm">
              Estados Unidos
            </Text>
            <Text fontSize="xs" color="blue.700" mt={1}>
              Tu estado es necesario para cálculos precisos de carbono usando datos regionales de la
              USDA.
            </Text>
          </Box>
        </HStack>
      </Box>

      <StandardField label="Dirección" error={errors.address?.message}>
        <StandardInput placeholder="123 Farm Road" {...register('address')} />
      </StandardField>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label="Ciudad" error={errors.city?.message}>
          <StandardInput placeholder="Farmington" {...register('city')} />
        </StandardField>

        <StandardField
          label="Estado"
          error={errors.state?.message}
          helpText="Requerido para cálculos de carbono">
          <StandardSelect {...register('state')}>
            <option value="">Seleccionar estado...</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>

      <StandardField label="Código Postal" error={errors.zip_code?.message}>
        <StandardInput placeholder="12345" {...register('zip_code')} />
      </StandardField>
    </VStack>
  );

  // Step 3: Details (Web & Social)
  const DetailsStep = () => (
    <VStack spacing={5} align="stretch">
      <StandardField label="Sitio Web" error={errors.website?.message}>
        <StandardInput
          type="url"
          placeholder="https://www.miempresa.com"
          {...register('website')}
        />
      </StandardField>

      <StandardField label="Facebook" error={errors.facebook?.message}>
        <StandardInput
          type="url"
          placeholder="https://facebook.com/miempresa"
          {...register('facebook')}
        />
      </StandardField>

      <StandardField label="Instagram" error={errors.instagram?.message}>
        <StandardInput
          type="url"
          placeholder="https://instagram.com/miempresa"
          {...register('instagram')}
        />
      </StandardField>

      <StandardField
        label="Certificaciones"
        helpText="Separe múltiples certificaciones con comas"
        error={errors.certifications?.message}>
        <StandardInput
          placeholder="USDA Organic, Fair Trade, Rainforest Alliance"
          {...register('certifications')}
        />
      </StandardField>
    </VStack>
  );

  // Step 4: Sustainability
  const SustainabilityStep = () => (
    <VStack spacing={5} align="stretch">
      <StandardField label="Productos Principales" error={errors.primary_commodities?.message}>
        <StandardSelect {...register('primary_commodities')}>
          <option value="">Seleccionar...</option>
          {PRIMARY_COMMODITIES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </StandardSelect>
      </StandardField>

      <StandardField
        label="Compromiso de Sostenibilidad"
        error={errors.sustainability_commitment?.message}>
        <StandardSelect {...register('sustainability_commitment')}>
          <option value="">Seleccionar...</option>
          {SUSTAINABILITY_COMMITMENTS.map((value) => (
            <option key={value} value={value}>
              {intl.formatMessage({ id: `company.sustainabilityCommitment.${value}` })}
            </option>
          ))}
        </StandardSelect>
      </StandardField>

      <Box p={4} bg="green.50" borderRadius="lg" border="1px solid" borderColor="green.200">
        <HStack spacing={3} align="flex-start">
          <Icon as={FaLeaf} color="green.500" boxSize={5} mt={0.5} />
          <Box>
            <Text fontWeight="semibold" color="green.800" fontSize="sm">
              Compromiso con la Transparencia
            </Text>
            <Text fontSize="xs" color="green.700" mt={1}>
              Al completar esta información, ayudas a tus consumidores a conocer mejor tus prácticas
              agrícolas y tu compromiso con la sostenibilidad.
            </Text>
          </Box>
        </HStack>
      </Box>
    </VStack>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep />;
      case 1:
        return <LocationStep />;
      case 2:
        return <DetailsStep />;
      case 3:
        return <SustainabilityStep />;
      default:
        return <BasicInfoStep />;
    }
  };

  const NavigationButtons = () => (
    <HStack spacing={3} w="100%" justify="space-between">
      <StandardButton
        variant="outline"
        onClick={currentStep === 0 ? handleClose : prevStep}
        leftIcon={currentStep === 0 ? undefined : <Icon as={FaChevronLeft} />}>
        {currentStep === 0 ? 'Cancelar' : 'Anterior'}
      </StandardButton>

      {currentStep < STEPS.length - 1 ? (
        <StandardButton
          variant="primary"
          onClick={nextStep}
          rightIcon={<Icon as={FaChevronRight} />}>
          Siguiente
        </StandardButton>
      ) : (
        <StandardButton
          variant="primary"
          onClick={handleSubmit(handleFormSubmit)}
          isLoading={isLoading}
          loadingText="Guardando..."
          leftIcon={<Icon as={FaCheck} />}>
          Guardar Cambios
        </StandardButton>
      )}
    </HStack>
  );

  const modalContent = (
    <FormProvider {...methods}>
      <StepIndicator />
      <Box minH="400px">{renderCurrentStep()}</Box>
    </FormProvider>
  );

  // Use Drawer on mobile, Modal on desktop
  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} onClose={handleClose} placement="bottom" size="full">
        <DrawerOverlay />
        <DrawerContent borderTopRadius="2xl">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <VStack align="start" spacing={1}>
              <Text fontSize="lg" fontWeight="bold">
                Editar Compañía
              </Text>
              <Text fontSize="sm" color="gray.500">
                {STEPS[currentStep].description}
              </Text>
            </VStack>
          </DrawerHeader>
          <DrawerBody py={6}>{modalContent}</DrawerBody>
          <DrawerFooter borderTopWidth="1px">
            <NavigationButtons />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl" mx={4}>
        <ModalHeader borderBottomWidth="1px" pb={4}>
          <VStack align="start" spacing={1}>
            <Text fontSize="xl" fontWeight="bold">
              Editar Compañía
            </Text>
            <Text fontSize="sm" color="gray.500" fontWeight="normal">
              {STEPS[currentStep].description}
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6}>{modalContent}</ModalBody>
        <ModalFooter borderTopWidth="1px" pt={4}>
          <NavigationButtons />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditCompanyModal;
