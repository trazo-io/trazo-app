import React from 'react';
import { Box, HStack, Text, Progress, useColorModeValue } from '@chakra-ui/react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import {
  passwordValidator,
  DEFAULT_REQUIREMENTS,
  PasswordValidationResult
} from '../../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  userInfo?: { email?: string; firstName?: string; lastName?: string };
  validation: PasswordValidationResult | null;
}

interface RequirementProps {
  met: boolean;
  label: string;
}

const Requirement: React.FC<RequirementProps> = ({ met, label }) => {
  const metColor = 'green.500';
  const unmetColor = useColorModeValue('gray.400', 'gray.500');

  return (
    <HStack spacing={2} align="center">
      <Box as={met ? FaCheck : FaTimes} color={met ? metColor : unmetColor} boxSize="10px" flexShrink={0} />
      <Text fontSize="xs" color={met ? metColor : unmetColor} lineHeight="1.3">
        {label}
      </Text>
    </HStack>
  );
};

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  validation
}) => {
  if (!password || !validation) return null;

  const score = validation.score;
  const colorScheme = passwordValidator.getStrengthColor(score).split('.')[0];
  const label = passwordValidator.getStrengthLabel(score);

  return (
    <Box w="full" mt={2}>
      <Progress value={score} size="sm" borderRadius="full" bg="gray.200" colorScheme={colorScheme} />
      <Text
        fontSize="xs"
        color={useColorModeValue('gray.500', 'gray.400')}
        mt={1}
        mb={2}
      >
        Password strength: {label}
      </Text>

      <Box
        bg={useColorModeValue('gray.50', 'gray.800')}
        px={3}
        py={2}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
      >
        <Requirement
          met={password.length >= DEFAULT_REQUIREMENTS.minLength}
          label={`At least ${DEFAULT_REQUIREMENTS.minLength} characters`}
        />
        <Requirement met={/[A-Z]/.test(password)} label="One uppercase letter (A-Z)" />
        <Requirement met={/[a-z]/.test(password)} label="One lowercase letter (a-z)" />
        <Requirement met={/\d/.test(password)} label="One number (0-9)" />
        <Requirement
          met={/[!@#$%^&*(),.?":{}|<>]/.test(password)}
          label="One special character (!@#$%&*...)"
        />
        {validation.warnings.length > 0 &&
          validation.warnings.map((warning, i) => (
            <Text key={i} fontSize="xs" color="orange.500" mt={1}>
              {warning}
            </Text>
          ))}
      </Box>
    </Box>
  );
};
