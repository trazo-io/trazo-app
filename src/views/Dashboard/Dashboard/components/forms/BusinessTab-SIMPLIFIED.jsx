// BUSINESS TAB - TRANSPARENCY & TRUST BUILDING FOCUSED
// Tracks business activities that enhance agricultural transparency and consumer trust
// Phase 1 Enhanced: Trust indicators, progressive disclosure, consumer value messaging

import {
  Flex,
  HStack,
  Box,
  VStack,
  Badge,
  Text,
  Icon,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert
} from 'components/Design/StandardComponents';
import { FaChevronLeft, FaChevronRight, FaCertificate, FaLeaf, FaAward, FaCheckCircle, FaShieldAlt, FaChartLine } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// TRANSPARENCY-FOCUSED BUSINESS SCHEMA - Activities that build consumer trust
const formSchemaMainInfo = object({
  business_type: string().min(1, 'Business activity type is required'),
  certification_type: string().optional(),
  carbon_credits_earned: string().optional(),
  carbon_credits_unit: string().optional(),
  verification_status: string().optional(),
  sustainability_practice: string().optional(),
  trust_impact: string().optional(), // NEW: Impact on consumer trust
  transparency_benefit: string().optional(), // NEW: Transparency benefit
  observation: string().optional()
});

const BusinessTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }) => {
  const intl = useIntl();
  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      business_type: initialValues.business_type || '',
      certification_type: initialValues.certification_type || '',
      carbon_credits_earned: initialValues.carbon_credits_earned?.toString() || '',
      carbon_credits_unit: initialValues.carbon_credits_unit || 'tCO2e',
      verification_status: initialValues.verification_status || '',
      sustainability_practice: initialValues.sustainability_practice || '',
      trust_impact: initialValues.trust_impact || '',
      transparency_benefit: initialValues.transparency_benefit || '',
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      methods.reset({
        business_type: initialValues.business_type || '',
        certification_type: initialValues.certification_type || '',
        carbon_credits_earned: initialValues.carbon_credits_earned?.toString() || '',
        carbon_credits_unit: initialValues.carbon_credits_unit || 'tCO2e',
        verification_status: initialValues.verification_status || '',
        sustainability_practice: initialValues.sustainability_practice || '',
        trust_impact: initialValues.trust_impact || '',
        transparency_benefit: initialValues.transparency_benefit || '',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, methods]);

  const {
    handleSubmit,
    watch,
    formState: { errors }
  } = methods;

  const businessType = watch('business_type');
  const verificationStatus = watch('verification_status');
  
  // Watch all form fields for real-time updates
  const allValues = watch();
  
  // Call onDataChange whenever form values change (for real-time preview updates)
  useEffect(() => {
    if (onDataChange && Object.keys(allValues).length > 0) {
      onDataChange(allValues);
    }
  }, [allValues]); // FIXED: Removed onDataChange to prevent infinite loop

  // Business events do NOT trigger carbon calculations
  // These are administrative/documentation events, not direct agricultural activities
  // Carbon calculations are only appropriate for: Equipment, Soil, Pest, Chemical, Production events
  
  // NOTE: Business events provide transparency value through:
  // - Certification badges on consumer QR pages
  // - Trust indicators for transparency scores  
  // - Verification status for consumer confidence
  // - Documentation of sustainability practices
  //
  // They do NOT generate meaningful carbon emissions and should not call carbon APIs

  const onSubmit = (data) => {
    // Process numeric data
    const processedData = {
      ...data,
      carbon_credits_earned: data.carbon_credits_earned ? parseFloat(data.carbon_credits_earned) : undefined
    };
    onSubmitHandler(processedData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          
          {/* Transparency Focus Alert */}
          <StandardAlert status="info" title="Agricultural Transparency Documentation">
            <HStack spacing={2} mb={2}>
              <Icon as={FaShieldAlt} color="blue.500" />
              <Text fontSize="sm" fontWeight="bold">Building Consumer Trust Through Verification</Text>
            </HStack>
            <Text fontSize="sm">
              Document certifications, verifications, and sustainability practices that enhance consumer confidence
              in your agricultural transparency. These trust indicators appear on your product's transparency page.
            </Text>
          </StandardAlert>

          {/* Section 1: Business Activity Selection */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaCertificate} color="teal.500" />
                <Text>Trust-Building Business Activity</Text>
                <Badge colorScheme="teal" size="sm">Consumer Trust</Badge>
                {verificationStatus === 'verified' && (
                  <Badge colorScheme="green" size="sm" ml={2}>
                    <HStack spacing={1}>
                      <Icon as={FaCheckCircle} />
                      <Text>Verified</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              <StandardField
                label="Business Activity Type"
                required
                error={errors.business_type?.message}
                helpText="Select activities that build consumer trust and enhance transparency"
              >
                <Controller
                  name="business_type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect
                      {...field}
                      placeholder="Select business activity type..."
                    >
                      <option value="certification">Certification Achievement (Organic, Fair Trade, etc.)</option>
                      <option value="verification">Third-Party Verification Completed</option>
                      <option value="sustainability_audit">Sustainability Assessment Passed</option>
                      <option value="transparency">Transparency Initiative Launched</option>
                      <option value="carbon_credits">Carbon Credits Earned</option>
                      <option value="compliance">Regulatory Compliance Achieved</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              {/* Certification Details - Only for certification events */}
              {businessType === 'certification' && (
                <StandardField
                  label="Certification Type"
                  error={errors.certification_type?.message}
                  helpText="Type of certification obtained or renewed"
                >
                  <Controller
                    name="certification_type"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="">Select certification...</option>
                        <option value="organic_usda">USDA Organic</option>
                        <option value="carbon_neutral">Carbon Neutral Certification</option>
                        <option value="rainforest_alliance">Rainforest Alliance</option>
                        <option value="fair_trade">Fair Trade Certified</option>
                        <option value="regenerative">Regenerative Organic Certified</option>
                        <option value="sustainable_agriculture">Sustainable Agriculture Standard</option>
                        <option value="water_stewardship">Water Stewardship Certification</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              )}

              {/* Carbon Credits - Only for carbon credit events */}
              {businessType === 'carbon_credits' && (
                <HStack spacing={4} align="end">
                  <StandardField
                    label="Carbon Credits Earned"
                    error={errors.carbon_credits_earned?.message}
                    helpText="Amount of carbon credits generated or traded"
                    flex={2}
                  >
                    <Controller
                      name="carbon_credits_earned"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                        />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="Unit"
                    flex={1}
                  >
                    <Controller
                      name="carbon_credits_unit"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          <option value="tCO2e">tCO2e (tonnes CO2 equivalent)</option>
                          <option value="kgCO2e">kgCO2e (kilograms CO2 equivalent)</option>
                          <option value="credits">Carbon Credits (units)</option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </HStack>
              )}

              {/* Verification Status */}
              <StandardField
                label="Verification Status"
                error={errors.verification_status?.message}
                helpText="Status of verification for consumer transparency"
              >
                <Controller
                  name="verification_status"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="pending">Pending Verification</option>
                      <option value="verified">Verified</option>
                      <option value="in_progress">Verification In Progress</option>
                      <option value="failed">Verification Failed</option>
                      <option value="not_applicable">Not Applicable</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Sustainability Practice - For transparency context */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaLeaf} color="green.500" />
                <Text>Sustainability Practice</Text>
                <Badge colorScheme="green" size="sm">Consumer Story</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              <StandardField
                label="Sustainability Practice Implemented"
                error={errors.sustainability_practice?.message}
                helpText="Practice that enhances carbon transparency or environmental benefit"
              >
                <Controller
                  name="sustainability_practice"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="">Select practice...</option>
                      <option value="cover_cropping">Cover Cropping Implementation</option>
                      <option value="no_till">No-Till Farming Adoption</option>
                      <option value="integrated_pest">Integrated Pest Management</option>
                      <option value="water_conservation">Water Conservation Measures</option>
                      <option value="renewable_energy">Renewable Energy Installation</option>
                      <option value="composting">On-Farm Composting Program</option>
                      <option value="biodiversity">Biodiversity Conservation</option>
                      <option value="soil_health">Soil Health Improvement</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>
            </VStack>
          </StandardCard>

          {/* Observations */}
          <StandardField 
            label={intl.formatMessage({ id: 'app.observations' })}
            error={errors.observation?.message}
            helpText="Additional context about this business activity's impact on carbon transparency"
          >
            <Controller
              name="observation"
              control={methods.control}
              render={({ field }) => (
                <StandardTextarea
                  {...field}
                  placeholder="e.g., Certification process improved carbon tracking accuracy, new practice reduced emissions by 15%..."
                  rows={3}
                />
              )}
            />
          </StandardField>

          {/* Navigation - Hidden when hideActions is true */}
          {!hideActions && (
            <Box pt={4} mt={4} borderTop="1px" borderColor="gray.200">
              <HStack justify="space-between">
                <StandardButton
                  variant="outline"
                  onClick={onPrev}
                  leftIcon={<FaChevronLeft />}
                  size="lg"
                >
                  {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                </StandardButton>
                <StandardButton
                  variant="primary"
                  type="submit"
                  rightIcon={<FaChevronRight />}
                  size="lg"
                >
                  {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
                </StandardButton>
              </HStack>
            </Box>
          )}
        </VStack>
      </form>
    </FormProvider>
  );
};

export default BusinessTab;