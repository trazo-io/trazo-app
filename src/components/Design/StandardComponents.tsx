import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Badge,
  Icon,
  useColorModeValue,
  useBreakpointValue,
  Flex,
  Spinner,
  CircularProgress,
  Alert,
  AlertIcon,
  Divider,
  SimpleGrid,
  Circle,
  Grid,
  ResponsiveValue,
  Progress,
  Tooltip,
  Portal,
  IconButton,
  Image,
  CloseButton,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { S3Image } from '../Media/S3Image';
import { ReactNode, ReactElement, useState, useEffect, useCallback } from 'react';
import {
  FaLeaf,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaQuestionCircle,
  FaCamera,
  FaTimes,
  FaTrash,
  FaEye
} from 'react-icons/fa';
import { MdCheck, MdError, MdInfo, MdWarning } from 'react-icons/md';
import { IconType } from 'react-icons';
import { useDropzone } from 'react-dropzone';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

// Core Layout Components

interface StandardPageProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export const StandardPage = ({
  children,
  title,
  description,
  showBackButton = false,
  onBack,
  rightAction
}: StandardPageProps) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Determine if we need the full hero or just a minimal header
  const hasHeroContent = title || description;
  const needsMinimalHeader = showBackButton && !hasHeroContent;

  return (
    <Box bg={bgColor} minH="100vh">
      {/* Minimal Header - Just back button, aligned with content */}
      {needsMinimalHeader && (
        <Box
          bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
          pt={{ base: '120px', md: '120px' }}
          pb="24px"
          px={{ base: 3, md: 6 }}
        >
          <Button
            variant="outline"
            leftIcon={<FaChevronLeft />}
            onClick={onBack}
            size="sm"
          >
            Back
          </Button>
        </Box>
      )}

      {/* Full Hero Header Section - With title */}
      {hasHeroContent && (
        <Box bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)" pt={{ base: '120px', md: '120px' }} pb={{ base: '64px', md: '80px' }} px={{ base: 3, md: 4 }}>
          <Container maxW="6xl" mx="auto">
            <VStack spacing={4} textAlign={{ base: 'left', md: 'center' }}>
              {isMobile ? (
                // Mobile: Compact left-aligned header
                <VStack spacing={3} w="full" align="flex-start">
                  {showBackButton && (
                    <Button
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={onBack}
                      size="sm"
                      mb={1}
                    >
                      Back
                    </Button>
                  )}

                  {title && (
                    <Heading
                      as="h1"
                      size="lg"
                      color="green.600"
                      fontWeight="bold"
                      letterSpacing="-0.02em"
                      w="full"
                    >
                      {title}
                    </Heading>
                  )}
                  {description && (
                    <Text
                      fontSize="sm"
                      color="gray.600"
                      fontWeight="normal"
                      lineHeight="1.6"
                    >
                      {description}
                    </Text>
                  )}

                  {rightAction && <Box>{rightAction}</Box>}
                </VStack>
              ) : (
                // Desktop: Original horizontal layout
                <Flex
                  direction="row"
                  align="center"
                  gap={4}
                  w="full"
                  justify={showBackButton ? 'space-between' : 'center'}
                >
                  {showBackButton && (
                    <Button
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={onBack}
                      size="sm"
                    >
                      Back
                    </Button>
                  )}

                  <VStack spacing={2} flex={1}>
                    {title && (
                      <Heading
                        as="h1"
                        size="2xl"
                        color="green.600"
                        fontWeight="bold"
                        textAlign="center"
                        letterSpacing="-0.02em"
                      >
                        {title}
                      </Heading>
                    )}
                    {description && (
                      <Text
                        fontSize="lg"
                        color="gray.600"
                        fontWeight="normal"
                        maxW="70%"
                        lineHeight="1.7"
                        textAlign="center"
                      >
                        {description}
                      </Text>
                    )}
                  </VStack>

                  {rightAction && <Box>{rightAction}</Box>}
                </Flex>
              )}
            </VStack>
          </Container>
        </Box>
      )}

      {/* No header at all when no back button and no content */}
      {!showBackButton && !hasHeroContent && <Box pt={{ base: '110px', md: '80px' }} />}

      {/* Main Content with Overlapping Card Design - Match producer app spacing */}
      <Box
        w="100%"
        px={{ base: 2, md: 6 }}
        mt={needsMinimalHeader ? '16px' : hasHeroContent ? '-40px' : '0'}
        position="relative"
        zIndex={10}
      >
        {children}
      </Box>
    </Box>
  );
};

interface StandardCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  variant?: 'elevated' | 'flat' | 'outline';
  padding?: string | object;
}

export const StandardCard = ({
  children,
  title,
  subtitle,
  headerAction,
  variant = 'elevated',
  padding = { base: 3, md: 4 }
}: StandardCardProps) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const cardProps = {
    elevated: {
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      borderRadius: { base: 'xl', md: '2xl' },
      bg: bgColor
    },
    flat: {
      bg: bgColor,
      borderRadius: { base: 'lg', md: 'xl' }
    },
    outline: {
      bg: bgColor,
      borderRadius: { base: 'lg', md: 'xl' },
      border: '1px solid',
      borderColor: borderColor
    }
  };

  return (
    <Card {...cardProps[variant]} mb={6}>
      {(title || headerAction) && (
        <CardHeader pb={title && subtitle ? 2 : 4}>
          <Flex justify="space-between" align="center" w="100%">
            <VStack align="start" spacing={1}>
              {title && (
                <Heading as="h3" size={{ base: 'sm', md: 'md' }} color="gray.700">
                  {title}
                </Heading>
              )}
              {subtitle && (
                <Text color="gray.500" fontSize={{ base: 'xs', md: 'sm' }}>
                  {subtitle}
                </Text>
              )}
            </VStack>
            {headerAction}
          </Flex>
        </CardHeader>
      )}
      <CardBody pt={title ? 2 : 6} pb={6} px={padding}>
        {children}
      </CardBody>
    </Card>
  );
};

// Modern Step Progress Indicator

interface Step {
  title: string;
  shortTitle?: string;
  description?: string;
  icon?: IconType;
}

interface StandardStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
  allowStepClick?: boolean;
}

export const StandardStepper = ({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  allowStepClick = false
}: StandardStepperProps) => {
  // Null safety for steps array
  if (!steps || !Array.isArray(steps)) {
    return null;
  }

  // Adjust spacing and sizing based on number of steps
  const manySteps = steps.length > 6;
  const spacing = manySteps ? { base: 2, md: 3 } : { base: 3, md: 6 };
  const circleSize = manySteps ? { base: '32px', md: '40px' } : { base: '36px', md: '44px' };
  const iconSize = manySteps ? '16px' : '18px';
  const titleFontSize = manySteps ? { base: '2xs', md: 'xs' } : { base: 'xs', md: 'sm' };

  return (
    <StandardCard padding={{ base: 2, md: 6 }}>
      <Box overflowX="auto" w="100%" py={2}>
        <HStack
          spacing={spacing}
          justify="center"
          align="center"
          w={manySteps ? 'max-content' : '100%'}
          minW="100%"
          maxW={manySteps ? 'none' : '800px'}
          mx="auto"
          px={{ base: 6, md: manySteps ? 4 : 0 }}
        >
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <VStack
                spacing={2}
                align="center"
                flex={manySteps ? '0 0 auto' : '1'}
                minW={manySteps ? '80px' : 'auto'}
                cursor={allowStepClick ? 'pointer' : 'default'}
                onClick={() => allowStepClick && onStepClick?.(index)}
                _hover={allowStepClick ? { opacity: 0.8 } : {}}
                transition="all 0.3s ease"
              >
                <Circle
                  size={circleSize}
                  bg={
                    completedSteps.includes(index) || index < currentStep
                      ? 'green.500'
                      : index === currentStep
                      ? 'green.400'
                      : 'gray.200'
                  }
                  color={index <= currentStep ? 'white' : 'gray.500'}
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="bold"
                  boxShadow={index === currentStep ? 'lg' : 'md'}
                  transition="all 0.3s"
                >
                  {completedSteps.includes(index) || index < currentStep ? (
                    <Icon as={step.icon || FaCheckCircle} boxSize={iconSize} />
                  ) : (
                    <Text>{index + 1}</Text>
                  )}
                </Circle>
                <VStack spacing={1} align="center">
                  <Text
                    fontSize={titleFontSize}
                    fontWeight="bold"
                    color={index <= currentStep ? 'green.500' : 'gray.500'}
                    textAlign="center"
                    lineHeight="1.2"
                    noOfLines={1}
                    maxW={manySteps ? '70px' : { base: '64px', smd: '80px', md: 'auto' }}
                    isTruncated
                  >
                    {step.shortTitle || step.title}
                  </Text>
                  {step.description && !manySteps && (
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textAlign="center"
                      display={{ base: 'none', md: 'block' }}
                      lineHeight="1.2"
                    >
                      {step.description}
                    </Text>
                  )}
                </VStack>
              </VStack>
              {index < steps.length - 1 && (
                <Box
                  height="3px"
                  flex={manySteps ? '0 0 40px' : '1'}
                  w={manySteps ? '40px' : 'auto'}
                  bg={index < currentStep ? 'green.500' : 'gray.200'}
                  borderRadius="full"
                  mx={{ base: 1, md: 2 }}
                  transition="all 0.3s"
                />
              )}
            </React.Fragment>
          ))}
        </HStack>
      </Box>
    </StandardCard>
  );
};

// Card-based Selection Component

interface SelectionOption {
  id: string;
  title: string;
  description?: string;
  icon?: IconType;
  color?: string;
  value?: any;
}

interface StandardSelectionGridProps {
  options: SelectionOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  columns?: ResponsiveValue<string>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StandardSelectionGrid = ({
  options,
  selectedValue,
  onSelect,
  columns = { base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
  disabled = false,
  size = 'md'
}: StandardSelectionGridProps) => {
  const cardSizes = {
    sm: { height: '100px', iconSize: 5, fontSize: 'sm' },
    md: { height: '130px', iconSize: 6, fontSize: 'md' },
    lg: { height: '160px', iconSize: 8, fontSize: 'lg' }
  };

  const { height, iconSize, fontSize } = cardSizes[size];

  return (
    <Grid templateColumns={columns} gap={4}>
      {options.map((option) => (
        <Box
          key={option.id}
          p={4}
          borderRadius="xl"
          border="2px solid"
          borderColor={selectedValue === option.id ? `${option.color || 'green'}.500` : 'gray.200'}
          bg={selectedValue === option.id ? `${option.color || 'green'}.50` : 'white'}
          cursor={disabled ? 'not-allowed' : 'pointer'}
          opacity={disabled ? 0.5 : 1}
          height={height}
          transition="all 0.2s"
          _hover={
            !disabled
              ? {
                  borderColor: `${option.color || 'green'}.300`,
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }
              : {}
          }
          onClick={() => !disabled && onSelect(option.id)}
        >
          <VStack spacing={3} justify="center" height="100%">
            {option.icon && (
              <Circle
                size="50px"
                bg={`${option.color || 'green'}.100`}
                color={`${option.color || 'green'}.600`}
              >
                <Icon as={option.icon} boxSize={iconSize} />
              </Circle>
            )}

            <VStack spacing={1} flex={1} justify="center">
              <Text fontWeight="semibold" fontSize={fontSize} textAlign="center" noOfLines={2}>
                {option.title}
              </Text>
              {option.description && (
                <Text
                  fontSize="xs"
                  color="gray.600"
                  textAlign="center"
                  noOfLines={2}
                  display={{ base: 'none', md: 'block' }}
                >
                  {option.description}
                </Text>
              )}
            </VStack>

            {selectedValue === option.id && (
              <Badge colorScheme={option.color || 'green'} variant="solid">
                Selected
              </Badge>
            )}
          </VStack>
        </Box>
      ))}
    </Grid>
  );
};

// Form Components

interface StandardFormProps {
  children: ReactNode;
  title: string;
  description?: string;
  onSubmit?: (data: any) => void;
  isLoading?: boolean;
  submitText?: string;
  showCancel?: boolean;
  onCancel?: () => void;
}

export const StandardForm = ({
  children,
  title,
  description,
  onSubmit,
  isLoading = false,
  submitText = 'Save',
  showCancel = false,
  onCancel
}: StandardFormProps) => {
  return (
    <StandardCard title={title} subtitle={description}>
      <form onSubmit={onSubmit}>
        <VStack spacing={6} align="stretch">
          {children}

          <Divider />

          <HStack spacing={3} justify="flex-end">
            {showCancel && (
              <Button variant="outline" onClick={onCancel} isDisabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              colorScheme="green"
              isLoading={isLoading}
              loadingText="Saving..."
              size="lg"
              px={8}
            >
              {submitText}
            </Button>
          </HStack>
        </VStack>
      </form>
    </StandardCard>
  );
};

interface StandardFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: ReactNode;
}

export const StandardField = ({
  label,
  required = false,
  error,
  helpText,
  children
}: StandardFieldProps) => {
  return (
    <FormControl isRequired={required} isInvalid={!!error}>
      <FormLabel fontWeight="semibold" color="gray.700" fontSize="sm" mb={2}>
        {label}
      </FormLabel>
      {children}
      {helpText && !error && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {helpText}
        </Text>
      )}
      {error && (
        <Text fontSize="xs" color="red.500" mt={1}>
          {error}
        </Text>
      )}
    </FormControl>
  );
};

// Standard Input Components
export const StandardInput = React.forwardRef<HTMLInputElement, any>((props, ref) => (
  <Input
    ref={ref}
    borderRadius="lg"
    borderColor="gray.200"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #2E7D32' }}
    size="lg"
    {...props}
  />
));
StandardInput.displayName = 'StandardInput';

export const StandardTextarea = React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
  <Textarea
    ref={ref}
    borderRadius="lg"
    borderColor="gray.200"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #2E7D32' }}
    minH="120px"
    resize="vertical"
    {...props}
  />
));
StandardTextarea.displayName = 'StandardTextarea';

export const StandardSelect = React.forwardRef<HTMLSelectElement, any>((props, ref) => (
  <Select
    ref={ref}
    borderRadius="lg"
    borderColor="gray.200"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #2E7D32' }}
    size="lg"
    {...props}
  />
));
StandardSelect.displayName = 'StandardSelect';

// Action Components
interface StandardButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactElement;
  rightIcon?: ReactElement;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  w?: string;
  width?: string;
  isDisabled?: boolean;
}

export const StandardButton = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  disabled = false,
  w,
  width,
  isDisabled,
  ...rest
}: StandardButtonProps) => {
  const variants = {
    primary: {
      colorScheme: 'green',
      variant: 'solid'
    },
    secondary: {
      colorScheme: 'gray',
      variant: 'solid'
    },
    outline: {
      colorScheme: 'green',
      variant: 'outline'
    },
    ghost: {
      colorScheme: 'green',
      variant: 'ghost'
    }
  };

  return (
    <Button
      {...variants[variant]}
      size={size}
      isLoading={isLoading}
      loadingText={loadingText}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      onClick={onClick}
      type={type}
      isDisabled={disabled || isDisabled}
      w={w}
      width={width}
      borderRadius="lg"
      fontWeight="semibold"
      _focus={{ boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.15)' }}
      _hover={{
        boxShadow: 'lg',
        transform: 'translateY(-1px)',
        _disabled: {
          boxShadow: 'none',
          transform: 'none'
        }
      }}
      transition="all 0.2s ease"
      {...rest}
    >
      {children}
    </Button>
  );
};

// Status & Feedback Components
interface StandardAlertProps {
  status: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description?: string;
  children?: ReactNode;
}

export const StandardAlert = ({ status, title, description, children }: StandardAlertProps) => {
  const icons = {
    success: MdCheck,
    error: MdError,
    warning: MdWarning,
    info: MdInfo
  };

  return (
    <Alert
      status={status}
      borderRadius="lg"
      variant="left-accent"
      bg={`${status}.50`}
      borderLeft="4px solid"
      marginBottom={6}
      borderLeftColor={`${status}.500`}
    >
      <AlertIcon as={icons[status]} />
      <VStack align="start" spacing={1}>
        {title && (
          <Text fontWeight="semibold" fontSize="sm">
            {title}
          </Text>
        )}
        {description && <Text fontSize="sm">{description}</Text>}
        {children}
      </VStack>
    </Alert>
  );
};

// Loading States

// Full-page loading - use when loading replaces the entire page content
export const StandardPageLoading = () => (
  <Flex justify="center" align="center" py={20} minH="200px">
    <CircularProgress isIndeterminate color="green.500" />
  </Flex>
);

// Section/inline loading - use within cards, tables, sections
export const StandardSpinner = () => (
  <Flex justify="center" align="center" py={8}>
    <CircularProgress isIndeterminate color="green.500" size="40px" />
  </Flex>
);

export const StandardSkeleton = ({ count = 3 }: { count?: number }) => (
  <VStack spacing={4}>
    {Array.from({ length: count }).map((_, i) => (
      <Box key={i} w="full" h="80px" bg="gray.200" borderRadius="lg" />
    ))}
  </VStack>
);

// Grid Components
interface StandardGridProps {
  children: ReactNode;
  columns?: number | object;
  spacing?: number;
}

export const StandardGrid = ({
  children,
  columns = { base: 1, md: 2, lg: 3 },
  spacing = 6
}: StandardGridProps) => (
  <SimpleGrid columns={columns} spacing={spacing}>
    {children}
  </SimpleGrid>
);

// Section Components
interface StandardSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export const StandardSection = ({ title, description, action, children }: StandardSectionProps) => (
  <Box mb={8}>
    <Flex justify="space-between" align="center" mb={4}>
      <VStack align="start" spacing={1}>
        <Heading as="h2" size="lg" color="gray.700">
          {title}
        </Heading>
        {description && (
          <Text color="gray.500" fontSize="sm">
            {description}
          </Text>
        )}
      </VStack>
      {action}
    </Flex>
    {children}
  </Box>
);

// Sprint 2 Epic 2.3: Section Header Component for Form Tabs
// Provides consistent header styling across all event form tabs

interface SectionHeaderProps {
  icon: IconType;
  iconColor?: string;
  title: string;
  badge?: string;
  badgeColorScheme?: string;
  description?: string;
}

export const SectionHeader = ({
  icon,
  iconColor = 'green.500',
  title,
  badge,
  badgeColorScheme = 'green',
  description
}: SectionHeaderProps) => (
  <Box mb={4}>
    <HStack justify="space-between" align="center" mb={description ? 2 : 0}>
      <HStack spacing={2}>
        <Icon as={icon} color={iconColor} boxSize={5} />
        <Text fontSize="md" fontWeight="bold" color="gray.700">
          {title}
        </Text>
      </HStack>
      {badge && (
        <Badge colorScheme={badgeColorScheme} fontSize="xs">
          {badge}
        </Badge>
      )}
    </HStack>
    {description && (
      <Text fontSize="sm" color="gray.600">
        {description}
      </Text>
    )}
  </Box>
);

// Section Box Component - wrapper with border styling for form sections
interface SectionBoxProps {
  children: ReactNode;
  variant?: 'default' | 'highlighted';
  borderColor?: string;
  bg?: string;
}

export const SectionBox = ({ children, variant = 'default', borderColor, bg }: SectionBoxProps) => {
  const defaultBorderColor = variant === 'highlighted' ? 'green.200' : 'gray.200';
  const defaultBg = variant === 'highlighted' ? 'green.50' : 'white';

  return (
    <Box
      mb={6}
      p={{ base: 3, md: 4 }}
      border="1px"
      borderColor={borderColor || defaultBorderColor}
      borderRadius="lg"
      bg={bg || defaultBg}
    >
      {children}
    </Box>
  );
};

// Sprint 3 Epic 3.3: Collapsible Section for Progressive Field Display
// Provides expandable/collapsible sections for advanced or optional fields

interface CollapsibleSectionProps {
  title: string;
  icon?: IconType;
  iconColor?: string;
  badge?: string;
  badgeColorScheme?: string;
  description?: string;
  children: ReactNode;
  defaultIsOpen?: boolean;
  variant?: 'default' | 'highlighted';
}

export const CollapsibleSection = ({
  title,
  icon,
  iconColor = 'gray.500',
  badge,
  badgeColorScheme = 'gray',
  description,
  children,
  defaultIsOpen = false,
  variant = 'default'
}: CollapsibleSectionProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen });
  const borderColor = variant === 'highlighted' ? 'green.200' : 'gray.200';
  const bgColor = variant === 'highlighted' ? 'green.50' : 'white';
  const headerBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Box
      mb={6}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      bg={bgColor}
      overflow="hidden"
    >
      {/* Clickable Header */}
      <Box
        as="button"
        type="button"
        onClick={onToggle}
        w="100%"
        p={4}
        bg={headerBg}
        borderBottom={isOpen ? '1px' : '0'}
        borderColor={borderColor}
        cursor="pointer"
        _hover={{ bg: variant === 'highlighted' ? 'green.100' : 'gray.100' }}
        transition="all 0.2s"
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            {icon && <Icon as={icon} color={iconColor} boxSize={5} />}
            <Text fontSize="md" fontWeight="bold" color="gray.700">
              {title}
            </Text>
            {badge && (
              <Badge colorScheme={badgeColorScheme} fontSize="xs">
                {badge}
              </Badge>
            )}
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.500">
              {isOpen ? 'Hide' : 'Show'}
            </Text>
            <Icon
              as={isOpen ? FaChevronUp : FaChevronDown}
              color="gray.500"
              boxSize={4}
              transition="transform 0.2s"
            />
          </HStack>
        </Flex>
        {description && !isOpen && (
          <Text fontSize="sm" color="gray.500" mt={2} textAlign="left">
            {description}
          </Text>
        )}
      </Box>

      {/* Collapsible Content */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4}>
          {description && (
            <Text fontSize="sm" color="gray.600" mb={4}>
              {description}
            </Text>
          )}
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

// Consumer-Friendly Tooltip Component

interface ConsumerTooltipProps {
  label: string;
  explanation: string;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const ConsumerTooltip = ({
  label,
  explanation,
  children,
  placement = 'top'
}: ConsumerTooltipProps) => {
  return (
    <Tooltip
      label={
        <Box maxW="280px" p={2}>
          <Text fontWeight="bold" mb={1} fontSize="sm">
            {label}
          </Text>
          <Text fontSize="xs" lineHeight="1.4">
            {explanation}
          </Text>
        </Box>
      }
      placement={placement}
      bg="gray.800"
      color="white"
      borderRadius="md"
      fontSize="xs"
      hasArrow
      closeOnClick={false}
      openDelay={300}
    >
      {children}
    </Tooltip>
  );
};

// Metric Card Component for Consistent Dashboard Displays

interface StandardMetricCardProps {
  icon: IconType;
  iconColor?: string;
  iconBg?: string;
  value: string | number;
  label: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: string;
  tooltip?: {
    label: string;
    explanation: string;
  };
}

export const StandardMetricCard = ({
  icon,
  iconColor = 'green.600',
  iconBg = 'green.100',
  value,
  label,
  subtitle,
  size = 'md',
  colorScheme = 'green',
  tooltip
}: StandardMetricCardProps) => {
  const iconSize = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;
  const circleSize = size === 'sm' ? '40px' : size === 'lg' ? '80px' : '60px';
  const valueSize = size === 'sm' ? 'lg' : size === 'lg' ? '3xl' : '2xl';
  const labelSize = size === 'sm' ? 'xs' : 'sm';

  const MetricContent = (
    <VStack spacing={3}>
      <Circle size={circleSize} bg={iconBg} color={iconColor}>
        <Icon as={icon} boxSize={iconSize} />
      </Circle>
      <VStack spacing={1}>
        <Text fontSize={valueSize} fontWeight="bold" color={iconColor}>
          {value}
        </Text>
        <HStack spacing={1} align="center">
          <Text fontSize={labelSize} color="gray.600" textAlign="center">
            {label}
          </Text>
          {tooltip && <Icon as={FaQuestionCircle} boxSize={3} color="gray.400" />}
        </HStack>
        {subtitle && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            {subtitle}
          </Text>
        )}
      </VStack>
    </VStack>
  );

  if (tooltip) {
    return (
      <ConsumerTooltip label={tooltip.label} explanation={tooltip.explanation}>
        <Box cursor="help">{MetricContent}</Box>
      </ConsumerTooltip>
    );
  }

  return MetricContent;
};

// Standardized Media Upload Component

interface StandardMediaUploadProps {
  onFilesChange: (files: File[]) => void;
  acceptedFiles?: File[];
  uploadedFiles?: string[]; // URLs of successfully uploaded files
  maxFiles?: number;
  maxSize?: number;
  accept?: string | string[] | { [key: string]: string[] };
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helpText?: string;
  placeholder?: string;
  description?: string;
  height?: string;
  variant?: 'default' | 'compact' | 'consumer';
  showFileNames?: boolean;
  previewMode?: 'grid' | 'list' | 'thumbnails';
  isUploading?: boolean;
  uploadProgress?: number;
  onRemoveFile?: (index: number) => void;
  onRemoveUploadedFile?: (index: number, url: string) => void;
}

export const StandardMediaUpload = ({
  onFilesChange,
  acceptedFiles = [],
  uploadedFiles = [],
  maxFiles = 5,
  maxSize = 10485760, // 10MB
  accept = 'image/*',
  multiple = true,
  disabled = false,
  required = false,
  error,
  helpText,
  placeholder,
  description,
  height = '280px',
  variant = 'default',
  showFileNames = true,
  previewMode = 'grid',
  isUploading = false,
  uploadProgress = 0,
  onRemoveFile,
  onRemoveUploadedFile
}: StandardMediaUploadProps) => {
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const bgColor = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.700', 'white');
  const hoverBgColor = useColorModeValue('green.25', 'green.800');
  const successColor = useColorModeValue('green.500', 'green.300');

  // State for managing object URLs to prevent memory leaks
  const [fileObjectUrls, setFileObjectUrls] = useState<Map<File, string>>(new Map());

  // Clean up object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      fileObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fileObjectUrls]);

  // Update object URLs when accepted files change
  useEffect(() => {
    const newUrls = new Map();
    acceptedFiles.forEach((file) => {
      if (fileObjectUrls.has(file)) {
        newUrls.set(file, fileObjectUrls.get(file)!);
      } else {
        newUrls.set(file, URL.createObjectURL(file));
      }
    });

    // Clean up old URLs
    fileObjectUrls.forEach((url, file) => {
      if (!acceptedFiles.includes(file)) {
        URL.revokeObjectURL(url);
      }
    });

    setFileObjectUrls(newUrls);
  }, [acceptedFiles]);

  // Convert string accept prop to object format for react-dropzone v14+
  const acceptObject = typeof accept === 'string' ? { [accept]: [] } : accept;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (droppedFiles: File[]) => {
      if (onFilesChange && Array.isArray(droppedFiles)) {
        onFilesChange(droppedFiles);
      }
    },
    accept: acceptObject,
    multiple,
    maxFiles,
    maxSize,
    disabled: disabled || isUploading
  });

  const isImage = (file: File) => {
    return file.type && file.type.startsWith('image/');
  };

  const handleRemoveFile = useCallback(
    (index: number) => {
      if (onRemoveFile) {
        onRemoveFile(index);
      }
    },
    [onRemoveFile]
  );

  const handleRemoveUploadedFile = useCallback(
    (index: number, url: string) => {
      if (onRemoveUploadedFile) {
        onRemoveUploadedFile(index, url);
      }
    },
    [onRemoveUploadedFile]
  );

  const renderFilePreview = (file: File, index: number, isFromAccepted = true) => {
    if (isImage(file)) {
      const objectUrl = fileObjectUrls.get(file) || URL.createObjectURL(file);

      return (
        <Box key={index} position="relative" textAlign="center">
          <Box
            borderRadius="xl"
            overflow="hidden"
            mb={2}
            boxShadow="md"
            border="1px solid"
            borderColor="gray.200"
            position="relative"
          >
            <Image
              src={objectUrl}
              alt={file.name}
              w="100%"
              h={previewMode === 'thumbnails' ? '80px' : '120px'}
              objectFit="cover"
            />

            {/* Remove button */}
            {isFromAccepted && onRemoveFile && (
              <IconButton
                aria-label="Remove image"
                icon={<FaTimes />}
                position="absolute"
                top={1}
                right={1}
                size="xs"
                colorScheme="red"
                variant="solid"
                borderRadius="full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
              />
            )}
          </Box>
          {showFileNames && (
            <Text fontSize="xs" color="gray.600" noOfLines={1} fontWeight="medium">
              {file.name}
            </Text>
          )}
        </Box>
      );
    }

    return (
      <Box
        key={index}
        textAlign="center"
        p={3}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        bg="gray.50"
        position="relative"
      >
        <Icon as={FaCheckCircle} boxSize={6} color="green.500" mb={2} />
        <Text fontSize="xs" color={textColor} noOfLines={1} fontWeight="medium">
          {file.name}
        </Text>
        {isFromAccepted && onRemoveFile && (
          <IconButton
            aria-label="Remove file"
            icon={<FaTimes />}
            position="absolute"
            top={1}
            right={1}
            size="xs"
            colorScheme="red"
            variant="solid"
            borderRadius="full"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFile(index);
            }}
          />
        )}
      </Box>
    );
  };

  const renderUploadedImage = (url: string, index: number) => {
    return (
      <Box key={`uploaded-${index}`} position="relative" textAlign="center">
        <Box
          borderRadius="xl"
          overflow="hidden"
          mb={2}
          boxShadow="md"
          border="2px solid"
          borderColor={successColor}
          position="relative"
        >
          <S3Image
            src={url}
            alt={`Uploaded image ${index + 1}`}
            w="100%"
            h={previewMode === 'thumbnails' ? '80px' : '120px'}
            objectFit="cover"
            fallbackSrc="/images/placeholder.jpg"
          />

          {/* Success badge */}
          <Box
            position="absolute"
            top={1}
            left={1}
            bg={successColor}
            color="white"
            borderRadius="full"
            p={1}
          >
            <Icon as={FaCheckCircle} boxSize={3} />
          </Box>

          {/* Remove button */}
          {onRemoveUploadedFile && (
            <IconButton
              aria-label="Remove uploaded image"
              icon={<FaTrash />}
              position="absolute"
              top={1}
              right={1}
              size="xs"
              colorScheme="red"
              variant="solid"
              borderRadius="full"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveUploadedFile(index, url);
              }}
            />
          )}
        </Box>
        <Text fontSize="xs" color={successColor} fontWeight="medium">
          Uploaded
        </Text>
      </Box>
    );
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          height: '160px',
          iconSize: 8,
          textSize: 'md'
        };
      case 'consumer':
        return {
          height: '140px',
          iconSize: 6,
          textSize: 'sm',
          borderStyle: 'solid',
          borderWidth: '1px'
        };
      default:
        return {
          height: height,
          iconSize: 12,
          textSize: 'lg'
        };
    }
  };

  const variantStyles = getVariantStyles();
  const totalFiles = acceptedFiles.length + uploadedFiles.length;
  const hasFiles = totalFiles > 0;

  return (
    <VStack spacing={4} align="stretch" w="100%">
      {/* Upload Progress */}
      {isUploading && (
        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium" color={textColor}>
              Uploading images...
            </Text>
            <Text fontSize="sm" color="gray.500">
              {Math.round(uploadProgress)}%
            </Text>
          </Flex>
          <Progress
            value={uploadProgress}
            colorScheme="green"
            borderRadius="md"
            bg="gray.100"
            size="sm"
          />
        </Box>
      )}

      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" color={successColor} mb={3}>
            Successfully uploaded ({uploadedFiles.length})
          </Text>
          <Grid
            templateColumns={
              previewMode === 'thumbnails'
                ? 'repeat(auto-fill, minmax(100px, 1fr))'
                : 'repeat(auto-fill, minmax(140px, 1fr))'
            }
            gap={3}
            w="100%"
          >
            {uploadedFiles.map((url, index) => renderUploadedImage(url, index))}
          </Grid>
        </Box>
      )}

      {/* File Drop Zone */}
      <Box
        border={variantStyles.borderStyle || '2px dashed'}
        borderWidth={variantStyles.borderWidth || '2px'}
        borderColor={
          error ? 'red.300' : isUploading ? 'blue.300' : isDragActive ? 'green.400' : borderColor
        }
        borderRadius="xl"
        p={variant === 'consumer' ? 4 : 6}
        minH={hasFiles ? 'auto' : variantStyles.height}
        textAlign="center"
        cursor={disabled || isUploading ? 'not-allowed' : 'pointer'}
        transition="all 0.3s ease"
        bg={isUploading ? 'blue.25' : isDragActive ? bgColor : error ? 'red.25' : 'transparent'}
        _hover={{
          borderColor: disabled || isUploading ? borderColor : error ? 'red.400' : 'green.400',
          bg: disabled || isUploading ? 'transparent' : error ? 'red.50' : hoverBgColor,
          transform: disabled || isUploading ? 'none' : 'translateY(-1px)',
          boxShadow: disabled || isUploading ? 'none' : 'md'
        }}
        opacity={disabled ? 0.6 : 1}
        {...getRootProps()}
      >
        <input {...getInputProps()} style={{ display: 'none' }} />

        {acceptedFiles.length > 0 ? (
          <VStack spacing={4} justify="center">
            <HStack>
              <Circle
                size="40px"
                bg={isUploading ? 'blue.100' : 'green.100'}
                color={isUploading ? 'blue.600' : 'green.600'}
              >
                {isUploading ? <Spinner size="sm" /> : <Icon as={FaCheckCircle} boxSize={5} />}
              </Circle>
              <VStack spacing={0} align="start">
                <Text fontWeight="semibold" fontSize="md" color={textColor}>
                  {acceptedFiles.length} file{acceptedFiles.length !== 1 ? 's' : ''} ready
                </Text>
                {isUploading && (
                  <Text fontSize="sm" color="blue.600">
                    Processing upload...
                  </Text>
                )}
              </VStack>
            </HStack>

            {previewMode !== 'list' && (
              <Grid
                templateColumns={
                  previewMode === 'thumbnails'
                    ? 'repeat(auto-fill, minmax(100px, 1fr))'
                    : 'repeat(auto-fill, minmax(140px, 1fr))'
                }
                gap={3}
                w="100%"
                maxW="500px"
                mx="auto"
              >
                {acceptedFiles
                  .slice(0, 3)
                  .map((file, index) => renderFilePreview(file, index, true))}
                {acceptedFiles.length > 3 && (
                  <Box
                    textAlign="center"
                    p={3}
                    borderRadius="lg"
                    bg="gray.100"
                    border="1px dashed"
                    borderColor="gray.300"
                  >
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      +{acceptedFiles.length - 3} more
                    </Text>
                  </Box>
                )}
              </Grid>
            )}
          </VStack>
        ) : (
          <VStack spacing={4} justify="center" h="full">
            <Circle size="60px" bg="gray.100" color="gray.500">
              <Icon as={FaCamera} boxSize={variantStyles.iconSize} />
            </Circle>
            <VStack spacing={2}>
              <Text
                fontSize={variantStyles.textSize}
                color="gray.600"
                fontWeight="semibold"
                textAlign="center"
              >
                {placeholder || 'Drag & drop images here, or click to select'}
              </Text>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                {description ||
                  `Maximum ${maxFiles} files, up to ${Math.round(maxSize / 1048576)}MB each`}
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>

      {/* Status and Help Text */}
      {helpText && !error && !isUploading && (
        <Text fontSize="xs" color="gray.500">
          {helpText}
        </Text>
      )}
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}
    </VStack>
  );
};

// Sprint 3 Epic 3.3: Draft Restoration Alert Component
// Shows when a saved draft is available for restoration

interface DraftRestorationAlertProps {
  /** Whether there's a draft available */
  hasDraft: boolean;
  /** Timestamp of the last save */
  lastSaved: Date | null;
  /** Callback to restore the draft */
  onRestore: () => void;
  /** Callback to discard the draft */
  onDiscard: () => void;
  /** Whether to show the alert */
  show?: boolean;
}

export const DraftRestorationAlert = ({
  hasDraft,
  lastSaved,
  onRestore,
  onDiscard,
  show = true
}: DraftRestorationAlertProps) => {
  if (!hasDraft || !show) return null;

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'some time ago';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <Alert
      status="info"
      borderRadius="lg"
      variant="left-accent"
      bg="blue.50"
      borderLeft="4px solid"
      borderLeftColor="blue.500"
      mb={4}
    >
      <AlertIcon color="blue.500" />
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'flex-start', md: 'center' }}
        flex={1}
        gap={3}
      >
        <VStack align="flex-start" spacing={0}>
          <Text fontWeight="semibold" fontSize="sm" color="blue.700">
            Draft Available
          </Text>
          <Text fontSize="xs" color="blue.600">
            You have an unsaved draft from {formatTimeAgo(lastSaved)}
          </Text>
        </VStack>
        <HStack spacing={2}>
          <Button size="sm" colorScheme="blue" variant="solid" onClick={onRestore}>
            Restore Draft
          </Button>
          <Button size="sm" colorScheme="gray" variant="outline" onClick={onDiscard}>
            Discard
          </Button>
        </HStack>
      </Flex>
    </Alert>
  );
};

// Sprint 3 Epic 3.3: Auto-Save Status Indicator
// Shows when form data was last auto-saved

interface AutoSaveStatusProps {
  /** Timestamp of the last save */
  lastSaved: Date | null;
  /** Whether currently saving */
  isSaving: boolean;
}

export const AutoSaveStatus = ({ lastSaved, isSaving }: AutoSaveStatusProps) => {
  if (!lastSaved && !isSaving) return null;

  return (
    <HStack spacing={2} fontSize="xs" color="gray.500">
      {isSaving ? (
        <>
          <Spinner size="xs" color="green.500" />
          <Text>Saving draft...</Text>
        </>
      ) : lastSaved ? (
        <>
          <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
          <Text>
            Draft saved at{' '}
            {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </>
      ) : null}
    </HStack>
  );
};
