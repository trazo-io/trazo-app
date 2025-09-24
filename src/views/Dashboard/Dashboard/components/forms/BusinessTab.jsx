// SIMPLIFIED BUSINESS TAB - CARBON TRANSPARENCY FOCUSED
// Only tracks business activities relevant to carbon transparency and consumer value

import React, { useEffect, useRef } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  useColorModeValue,
  Box,
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
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number, optional } from 'zod';
import { FaChevronLeft, FaChevronRight, FaCertificate, FaLeaf, FaAward } from 'react-icons/fa';
import { useIntl } from 'react-intl';

// PHASE 1.4: BUSINESS EVENT VALIDATION SCHEMA
// Comprehensive validation with business logic constraints matching backend validation
const businessSchema = object({
  type: string().min(1, 'Business event type is required'),
  name: string().min(1, 'Event name is required'),
  business_type: string()
    .min(1, 'Business type is required')
    .refine((value) => value.length > 0, {
      message: 'Please select the type of business activity (e.g., certification, carbon credits, audit)'
    }),
  certification_type: optional(string()),
  carbon_credits_earned: optional(string()),
  carbon_credits_unit: string().optional(),
  verification_status: string().optional(),
  sustainability_practice: string().optional(),
  observation: string().optional()
}).refine((data) => {
  // BUSINESS LOGIC VALIDATION - Phase 1.4 constraints

  // Rule 1: Certification events require certification_type
  if (data.business_type === 'certification' && !data.certification_type) {
    return false;
  }

  // Rule 2: Carbon credit events require carbon_credits_earned
  if (data.business_type === 'carbon_credits' && !data.carbon_credits_earned) {
    return false;
  }

  // Rule 3: Carbon credits must be non-negative and reasonable
  if (data.carbon_credits_earned) {
    const credits = parseFloat(data.carbon_credits_earned);
    if (isNaN(credits) || credits < 0) {
      return false;
    }
    // Business logic: Flag unusually large amounts (>10,000 credits)
    if (credits > 10000) {
      return false;
    }
  }

  // Rule 4: Verification events should not have pending status
  if (data.business_type === 'verification' && data.verification_status === 'pending') {
    return false;
  }

  return true;
}, {
  message: "Business event validation failed",
  path: ["business_validation"] // This will be refined below with specific field errors
}).superRefine((data, ctx) => {
  // DETAILED FIELD-SPECIFIC VALIDATION with helpful error messages

  // Certification type validation
  if (data.business_type === 'certification' && !data.certification_type) {
    ctx.addIssue({
      code: 'custom',
      path: ['certification_type'],
      message: 'Certification type is required for certification events'
    });
  }

  // Carbon credits validation with multiple helpful messages
  if (data.business_type === 'carbon_credits') {
    if (!data.carbon_credits_earned) {
      ctx.addIssue({
        code: 'custom',
        path: ['carbon_credits_earned'],
        message: 'Carbon credits amount is required for carbon credit transactions'
      });
    } else {
      const credits = parseFloat(data.carbon_credits_earned);
      
      if (isNaN(credits)) {
        ctx.addIssue({
          code: 'custom',
          path: ['carbon_credits_earned'],
          message: 'Please enter a valid number for carbon credits'
        });
      } else if (credits < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['carbon_credits_earned'],
          message: 'Carbon credits earned cannot be negative - credits represent positive environmental impact'
        });
      } else if (credits > 10000) {
        ctx.addIssue({
          code: 'custom',
          path: ['carbon_credits_earned'],
          message: 'Carbon credits amount seems unusually large (>10,000). Typical farm operations generate 0.1-100 credits per transaction.'
        });
      }
    }
  }

  // Verification status validation
  if (data.business_type === 'verification' && data.verification_status === 'pending') {
    ctx.addIssue({
      code: 'custom',
      path: ['verification_status'],
      message: 'Verification events should have a definitive verification status (verified, failed, etc.)'
    });
  }
});

const BusinessTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const methods = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      type: initialValues.type || 'CE', // Default to Certification for carbon focus
      name: initialValues.name || '',
      business_type: initialValues.business_type || 'certification',
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
        type: initialValues.type || 'CE',
        name: initialValues.name || '',
        business_type: initialValues.business_type || 'certification',
        certification_type: initialValues.certification_type || '',
        carbon_credits_earned: initialValues.carbon_credits_earned?.toString() || '',
        carbon_credits_unit: initialValues.carbon_credits_unit || 'tCO2e',
        verification_status: initialValues.verification_status || 'pending',
        sustainability_practice: initialValues.sustainability_practice || '',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, methods]);

  const { watch } = methods;
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
      <form onSubmit={methods.handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          
          {/* Carbon Focus Alert */}
          <StandardAlert status="info" title="Carbon Transparency Focus">
            <Text fontSize="sm">
              🏆 This form tracks only business activities that provide carbon transparency value to consumers.
              Revenue and sales data are tracked separately for business purposes.
            </Text>
          </StandardAlert>

          {/* Phase 1.4: Business Event Validation Summary */}
          {(() => {
            const currentData = methods.watch();
            const errors = methods.formState.errors;
            let validationIssues = [];
            let validationSuccess = [];

            // Check business logic validation
            if (currentData.business_type === 'certification' && !currentData.certification_type) {
              validationIssues.push('Certification events require certification type');
            } else if (currentData.business_type === 'certification' && currentData.certification_type) {
              validationSuccess.push('Certification type specified');
            }

            if (currentData.business_type === 'carbon_credits') {
              if (!currentData.carbon_credits_earned) {
                validationIssues.push('Carbon credit events require amount');
              } else {
                const credits = parseFloat(currentData.carbon_credits_earned);
                if (credits < 0) {
                  validationIssues.push('Carbon credits cannot be negative');
                } else if (credits > 10000) {
                  validationIssues.push('Carbon credits amount seems unusually large');
                } else {
                  validationSuccess.push(`Valid carbon credits: ${credits.toFixed(2)}`);
                }
              }
            }

            if (currentData.business_type === 'verification' && currentData.verification_status === 'pending') {
              validationIssues.push('Verification events should have definitive status');
            }

            if (validationIssues.length > 0 || validationSuccess.length > 0) {
              return (
                <Box p={4} bg="gray.50" borderRadius="md" border="1px" borderColor="gray.200">
                  <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
                    📋 Business Event Validation Status (Phase 1.4)
                  </Text>
                  {validationSuccess.length > 0 && (
                    <VStack spacing={1} align="stretch" mb={validationIssues.length > 0 ? 2 : 0}>
                      {validationSuccess.map((success, index) => (
                        <Text key={index} fontSize="xs" color="green.600">
                          ✅ {success}
                        </Text>
                      ))}
                    </VStack>
                  )}
                  {validationIssues.length > 0 && (
                    <VStack spacing={1} align="stretch">
                      {validationIssues.map((issue, index) => (
                        <Text key={index} fontSize="xs" color="orange.600">
                          ⚠️ {issue}
                        </Text>
                      ))}
                    </VStack>
                  )}
                </Box>
              );
            }
            return null;
          })()}

          {/* Event Name */}
          <StandardField
            label={intl.formatMessage({ id: 'app.eventName' }) || 'Event Name'}
            required
            error={methods.formState.errors.name?.message}
          >
            <StandardInput
              {...methods.register('name')}
              placeholder="e.g., Organic Certification, Carbon Credit Verification"
            />
          </StandardField>

          {/* Business Event Type - Simplified for carbon focus */}
          <StandardField
            label={intl.formatMessage({ id: 'app.businessEventType' }) || 'Business Event Type'}
            required
            error={methods.formState.errors.type?.message}
            helpText="Focus on certification and sustainability activities"
          >
            <StandardSelect {...methods.register('type')}>
              <option value="CE">
                {intl.formatMessage({ id: 'app.certification' }) || 'Certification'}
              </option>
              <option value="CM">
                {intl.formatMessage({ id: 'app.compliance' }) || 'Compliance'}
              </option>
              <option value="IN">
                {intl.formatMessage({ id: 'app.inspection' }) || 'Inspection'}
              </option>
            </StandardSelect>
          </StandardField>

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
                error={methods.formState.errors.business_type?.message}
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

              {/* Certification Details - Only for certification events (Phase 1.4 Validation) */}
              {businessType === 'certification' && (
                <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                  <VStack spacing={3} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="blue.700">
                      🏆 Certification Details Required
                    </Text>
                    <StandardField
                      label="Certification Type"
                      required
                      error={methods.formState.errors.certification_type?.message}
                      helpText="Certification type is required for certification events - Examples: USDA Organic, Carbon Neutral"
                    >
                      <Controller
                        name="certification_type"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect 
                            {...field}
                            placeholder="Select certification type (required)..."
                          >
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
                    {!methods.watch('certification_type') && (
                      <Text fontSize="xs" color="orange.600" bg="orange.50" p={2} borderRadius="md">
                        ⚠️ Certification events must specify the certification type
                      </Text>
                    )}
                  </VStack>
                </Box>
              )}

              {/* Carbon Credits - Only for carbon credit events (Phase 1.4 Validation) */}
              {businessType === 'carbon_credits' && (
                <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="sm" fontWeight="bold" color="green.700">
                      🌱 Carbon Credits Transaction Details Required
                    </Text>
                    
                    <HStack spacing={4} align="end">
                      <StandardField
                        label="Carbon Credits Earned"
                        required
                        error={methods.formState.errors.carbon_credits_earned?.message}
                        helpText="Please enter the number of credits generated or traded"
                        flex={2}
                      >
                        <Controller
                          name="carbon_credits_earned"
                          control={methods.control}
                          render={({ field }) => (
                            <NumberInput min={0} precision={2} step={0.01}>
                              <NumberInputField 
                                {...field}
                                placeholder="0.00 (required)"
                              />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
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

                    {/* Real-time validation feedback for carbon credits (Phase 1.4) */}
                    {(() => {
                      const creditsValue = methods.watch('carbon_credits_earned');
                      const credits = parseFloat(creditsValue);
                      
                      if (!creditsValue) {
                        return (
                          <Text fontSize="xs" color="orange.600" bg="orange.50" p={2} borderRadius="md">
                            ⚠️ Carbon credits amount is required for carbon credit transactions
                          </Text>
                        );
                      } else if (isNaN(credits)) {
                        return (
                          <Text fontSize="xs" color="red.600" bg="red.50" p={2} borderRadius="md">
                            ❌ Please enter a valid number for carbon credits
                          </Text>
                        );
                      } else if (credits < 0) {
                        return (
                          <Text fontSize="xs" color="red.600" bg="red.50" p={2} borderRadius="md">
                            ❌ Carbon credits cannot be negative - credits represent positive environmental impact
                          </Text>
                        );
                      } else if (credits > 10000) {
                        return (
                          <Text fontSize="xs" color="yellow.600" bg="yellow.50" p={2} borderRadius="md">
                            ⚠️ Carbon credits amount seems unusually large (&gt;10,000). Typical farm operations generate 0.1-100 credits per transaction.
                          </Text>
                        );
                      } else if (credits > 0 && credits <= 10000) {
                        return (
                          <Text fontSize="xs" color="green.600" bg="green.50" p={2} borderRadius="md">
                            ✅ Valid carbon credits amount ({credits.toFixed(2)} {methods.watch('carbon_credits_unit')})
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </VStack>
                </Box>
              )}

              {/* Verification Status (Phase 1.4 Validation) */}
              <StandardField
                label="Verification Status"
                error={methods.formState.errors.verification_status?.message}
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

              {/* Real-time verification status validation (Phase 1.4) */}
              {businessType === 'verification' && methods.watch('verification_status') === 'pending' && (
                <Text fontSize="xs" color="orange.600" bg="orange.50" p={2} borderRadius="md">
                  ⚠️ Verification events should have a definitive verification status (verified, failed, etc.)
                </Text>
              )}
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
                error={methods.formState.errors.sustainability_practice?.message}
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
            label={intl.formatMessage({ id: 'app.observations' }) || 'Observations'}
            error={methods.formState.errors.observation?.message}
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
          <HStack justify="space-between" pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
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
        </VStack>
      </form>
    </FormProvider>
  );
};

export default BusinessTab;