import { Controller, useFormContext } from 'react-hook-form';
// Chakra imports
import { FormControl, FormErrorMessage, FormLabel, useColorModeValue } from '@chakra-ui/react';
import { StandardInput } from 'components/Design/StandardComponents';

type FormInputProps = {
  name: string;
  label: string;
  placeholder: string;
  disabled: boolean;
};

const FormInput = ({ name, label, placeholder, disabled, ...otherProps }: FormInputProps) => {
  const textColor = useColorModeValue('gray.700', 'white');

  const {
    control,
    formState: { errors }
  } = useFormContext();

  return (
    <Controller
      control={control}
      defaultValue=""
      name={name}
      render={({ field }) => (
        <FormControl sx={{ mb: 2 }} isInvalid={!!errors[name]}>
          {label && (
            <FormLabel
              mb="4px"
              fontSize="xs"
              fontWeight="bold"
              color={disabled ? 'gray.300' : textColor}
              pl="12px">
              {label}
            </FormLabel>
          )}
          <StandardInput
            {...field}
            ms="4px"
            mb="0px"
            type="text"
            placeholder={placeholder}
            disabled={disabled}
            {...otherProps}
          />
          <FormErrorMessage fontSize="xs" pl="12px" mt="4px">
            {errors[name] ? errors[name]?.message : ''}
          </FormErrorMessage>
        </FormControl>
      )}
    />
  );
};

export default FormInput;
