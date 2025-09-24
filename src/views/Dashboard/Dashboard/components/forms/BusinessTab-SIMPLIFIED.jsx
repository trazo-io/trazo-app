// SIMPLIFIED BUSINESS TAB - CARBON TRANSPARENCY FOCUSED
// Only tracks business activities relevant to carbon transparency and consumer value

import {
  Flex,
  HStack,
  Box,
  VStack,
  Badge,
  Text,
  Icon
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
import { FaChevronLeft, FaChevronRight, FaCertificate, FaLeaf, FaAward } from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// CARBON-FOCUSED BUSINESS SCHEMA - Only carbon-relevant business activities
const formSchemaMainInfo = object({
  business_type: string().min(1, 'Business activity type is required'),
  certification_type: string().optional(),
  carbon_credits_earned: string().optional(),
  carbon_credits_unit: string().optional(),
  verification_status: string().optional(),
  sustainability_practice: string().optional(),
  observation: string().optional()
});

const BusinessTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      business_type: initialValues.business_type || '',
      certification_type: initialValues.certification_type || '',
      carbon_credits_earned: initialValues.carbon_credits_earned?.toString() || '',
      carbon_credits_unit: initialValues.carbon_credits_unit || 'tCO2e',
      verification_status: initialValues.verification_status || 'pending',
      sustainability_practice: initialValues.sustainability_practice || '',
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
        verification_status: initialValues.verification_status || 'pending',
        sustainability_practice: initialValues.sustainability_practice || '',
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

  // Real-time carbon calculation updates - only for carbon-relevant events
  const watchedFields = watch(['business_type', 'carbon_credits_earned', 'certification_type']);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();
        
        // Only trigger for carbon-relevant business activities
        if (currentValues.business_type && 
            ['certification', 'carbon_credits', 'sustainability_audit'].includes(currentValues.business_type)) {
          
          const relevantFields = ['business_type', 'certification_type', 'carbon_credits_earned', 'verification_status'];
          const currentRelevantValues = {};
          relevantFields.forEach((field) => {
            currentRelevantValues[field] = currentValues[field];
          });

          const hasChanged = JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);

          if (hasChanged) {
            previousValuesRef.current = currentRelevantValues;
            try {
              onDataChange(currentValues);
            } catch (error) {
              console.error('[BusinessTab]: Error calling onDataChange:', error);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange, methods]);

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
          
          {/* Carbon Focus Alert */}
          <StandardAlert status="info" title="Carbon Transparency Focus">
            <Text fontSize="sm">
              This form tracks only business activities that provide carbon transparency value to consumers.
              Revenue and sales data are tracked separately for business purposes.
            </Text>
          </StandardAlert>

          {/* Business Activity Type */}
          <StandardCard
            title={
              <HStack>
                <Icon as={FaCertificate} color="teal.500" />
                <Text>Carbon-Relevant Business Activity</Text>
                <Badge colorScheme="teal" size="sm">Consumer Value</Badge>
              </HStack>
            }
          >
            <VStack spacing={4} align="stretch">
              
              <StandardField
                label="Business Activity Type"
                required
                error={errors.business_type?.message}
                helpText="Select activities that provide carbon transparency or certification value"
              >
                <Controller
                  name="business_type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect
                      {...field}
                      placeholder="Select business activity type..."
                    >
                      <option value="certification">Certification Event (Organic, Carbon, etc.)</option>
                      <option value="carbon_credits">Carbon Credits Transaction</option>
                      <option value="sustainability_audit">Sustainability Audit/Assessment</option>
                      <option value="verification">Third-Party Verification</option>
                      <option value="compliance">Regulatory Compliance Activity</option>
                      <option value="transparency">Consumer Transparency Initiative</option>
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

          {/* Navigation */}
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default BusinessTab;