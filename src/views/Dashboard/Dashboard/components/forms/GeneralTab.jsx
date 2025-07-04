// Chakra imports
import {
  Button,
  Select as ChakraSelect,
  CircularProgress,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  Select,
  Text,
  Textarea,
  useColorModeValue,
  HStack,
  Box
} from '@chakra-ui/react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useState, useEffect, useRef } from 'react';
import { number, object, string } from 'zod';

import { FaPlus } from 'react-icons/fa';
import FormInput from 'components/Forms/FormInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
// Custom components

const formSchemaMainInfo = object({
  name: string().min(1, 'Name is required'),
  observation: string().optional()
});

const GeneralTab = ({ onSubmitHandler, onDataChange, onPrev, initialValues = {} }) => {
  const intl = useIntl();
  const bgPrevButton = useColorModeValue('gray.100', 'gray.100');
  const textColor = useColorModeValue('gray.700', 'white');
  const iconColor = useColorModeValue('gray.300', 'gray.700');

  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      name: initialValues.name || '',
      observation: initialValues.observation || ''
    }
  });

  // Update form values when initialValues change
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      mainInfoMethods.reset({
        name: initialValues.name || '',
        observation: initialValues.observation || ''
      });
    }
  }, [initialValues, mainInfoMethods]);

  const {
    reset: mainInfoReset,
    handleSubmit: mainInfoSubmit,
    errors: mainInfoErrors,
    formState: { errors, isSubmitSuccessful },
    register,
    watch
  } = mainInfoMethods;

  // Watch critical fields for real-time carbon calculation updates
  const watchedFields = watch(['name', 'observation']);

  // Track previous values to prevent unnecessary API calls
  const previousValuesRef = useRef({});

  // Real-time field watching for carbon calculation updates
  useEffect(() => {
    console.log('[GeneralTab]: Field watching triggered', {
      hasOnDataChange: !!onDataChange,
      watchedFields,
      firstField: watchedFields[0]
    });

    // Always check if callback exists inside the timeout to avoid stale closures
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = mainInfoMethods.getValues();

        // Compare with previous values to avoid unnecessary calls
        const relevantFields = ['name', 'observation'];
        const currentRelevantValues = {};
        relevantFields.forEach((field) => {
          currentRelevantValues[field] = currentValues[field];
        });

        const hasChanged =
          JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);

        console.log('[GeneralTab]: Value comparison', {
          currentValues: currentRelevantValues,
          previousValues: previousValuesRef.current,
          hasChanged
        });

        // Only trigger if we have meaningful data AND values have actually changed
        if (hasChanged && currentValues.name && currentValues.name.trim().length > 0) {
          console.log('[GeneralTab]: Triggering onDataChange with values', currentValues);
          previousValuesRef.current = currentRelevantValues;
          try {
            onDataChange(currentValues);
          } catch (error) {
            console.error('[GeneralTab]: Error calling onDataChange:', error);
          }
        } else {
          console.log('[GeneralTab]: Not triggering', {
            hasChanged,
            hasName: !!currentValues.name,
            nameLength: currentValues.name?.trim().length || 0
          });
        }
      } else {
        console.log('[GeneralTab]: onDataChange not available in timeout');
      }
    }, 500); // Debounced to prevent excessive API calls

    return () => clearTimeout(timeoutId);
  }, [watchedFields, onDataChange]);

  return (
    <FormProvider {...mainInfoMethods}>
      <form onSubmit={mainInfoSubmit(onSubmitHandler)} style={{ width: '100%' }}>
        <Flex direction="column" w="100%">
          <FormInput
            label={intl.formatMessage({ id: 'app.name' })}
            ms="4px"
            borderRadius="15px"
            type="text"
            placeholder={intl.formatMessage({ id: 'app.nameOfTheEvent' })}
            mb="24px"
            fontSize="xs"
            {...register('name')}
          />
          <FormLabel ms="4px" fontSize="xs" fontWeight="bold">
            {intl.formatMessage({ id: 'app.observations' })}
          </FormLabel>
          <Textarea
            fontSize="sm"
            ms="4px"
            borderRadius="15px"
            type="text"
            placeholder={intl.formatMessage({ id: 'app.descriptionOfTheEvent' })}
            mb="24px"
            size="lg"
            name="observation"
            {...register('observation')}
          />
          <Box pt={6} mt={4} borderTop="1px" borderColor="gray.200">
            <HStack justify="space-between">
              <Button
                variant="outline"
                onClick={onPrev}
                leftIcon={<FaChevronLeft />}
                size="md"
                px={6}
                h="42px"
                borderRadius="lg"
                fontWeight="600"
                _hover={{ transform: 'translateY(-1px)' }}
                transition="all 0.3s ease"
              >
                {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
              </Button>
              <Button
                colorScheme="green"
                type="submit"
                rightIcon={<FaChevronRight />}
                size="md"
                px={6}
                h="42px"
                borderRadius="lg"
                fontWeight="600"
                boxShadow="lg"
                _hover={{ boxShadow: 'xl', transform: 'translateY(-1px)' }}
                transition="all 0.3s ease"
              >
                {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
              </Button>
            </HStack>
          </Box>
        </Flex>
      </form>
    </FormProvider>
  );
};

export default GeneralTab;
