import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
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
  Alert,
  AlertIcon,
  Divider,
  SimpleGrid,
  Circle,
  Grid,
  ResponsiveValue,
  Tooltip,
  Portal
} from '@chakra-ui/react';
import { ReactNode, ReactElement } from 'react';
import { FaLeaf, FaChevronLeft, FaChevronRight, FaCheckCircle, FaQuestionCircle, FaCamera } from 'react-icons/fa';
import { MdCheck, MdError, MdInfo, MdWarning } from 'react-icons/md';
import { IconType } from 'react-icons';
import { useDropzone } from 'react-dropzone';

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

  return (
    <Box bg={bgColor} minH="100vh">
      {/* Clean Header Section */}
      <Box bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)" pt="120px" pb="80px" px={4}>
        <Container maxW="6xl" mx="auto">
          <VStack spacing={4} textAlign="center">
            {title && (
              <>
                {/* <Badge
                  colorScheme="green"
                  variant="subtle"
                  fontSize="sm"
                  px={4}
                  py={2}
                  borderRadius="full"
                  textTransform="none">
                  <HStack spacing={2}>
                    <Icon as={FaLeaf} boxSize={4} />
                    <Text fontWeight="medium">Trazo Dashboard</Text>
                  </HStack>
                </Badge> */}

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
              </>
            )}
          </VStack>
        </Container>
      </Box>

      {/* Main Content with Overlapping Card Design */}
      <Container maxW="6xl" mx="auto" px={4} mt="-40px" position="relative" zIndex={10}>
        {children}
      </Container>
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
  padding = { base: 4, md: 6 }
}: StandardCardProps) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const cardProps = {
    elevated: {
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      borderRadius: '2xl',
      bg: bgColor
    },
    flat: {
      bg: bgColor,
      borderRadius: 'xl'
    },
    outline: {
      bg: bgColor,
      borderRadius: 'xl',
      border: '1px solid',
      borderColor: borderColor
    }
  };

  return (
    <Card {...cardProps[variant]} mb={6}>
      {(title || headerAction) && (
        <CardHeader pb={title && subtitle ? 2 : 4}>
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              {title && (
                <Heading as="h3" size="md" color="gray.700">
                  {title}
                </Heading>
              )}
              {subtitle && (
                <Text color="gray.500" fontSize="sm">
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
  return (
    <StandardCard>
      <HStack
        spacing={{ base: 3, md: 6 }}
        justify="center"
        align="center"
        w="100%"
        maxW="800px"
        mx="auto"
      >
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <VStack
              spacing={3}
              align="center"
              flex="1"
              cursor={allowStepClick ? 'pointer' : 'default'}
              onClick={() => allowStepClick && onStepClick?.(index)}
              _hover={allowStepClick ? { opacity: 0.8 } : {}}
              transition="all 0.3s ease"
            >
              <Circle
                size={{ base: '36px', md: '44px' }}
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
                  <Icon as={step.icon || FaCheckCircle} boxSize="18px" />
                ) : (
                  <Text>{index + 1}</Text>
                )}
              </Circle>
              <VStack spacing={1} align="center">
                <Text
                  fontSize={{ base: 'xs', md: 'sm' }}
                  fontWeight="bold"
                  color={index <= currentStep ? 'green.500' : 'gray.500'}
                  textAlign="center"
                  lineHeight="1.2"
                >
                  {step.title}
                </Text>
                {step.description && (
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
                flex="1"
                bg={index < currentStep ? 'green.500' : 'gray.200'}
                borderRadius="full"
                mx={{ base: 1, md: 2 }}
                transition="all 0.3s"
              />
            )}
          </React.Fragment>
        ))}
      </HStack>
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
        {required && (
          <Text as="span" color="red.500" ml={1}>
            *
          </Text>
        )}
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
    borderColor="gray.300"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
    size="lg"
    {...props}
  />
));
StandardInput.displayName = 'StandardInput';

export const StandardTextarea = React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
  <Textarea
    ref={ref}
    borderRadius="lg"
    borderColor="gray.300"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
    minH="120px"
    resize="vertical"
    {...props}
  />
));
StandardTextarea.displayName = 'StandardTextarea';

export const StandardSelect = (props: any) => (
  <Select
    borderRadius="lg"
    borderColor="gray.300"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
    size="lg"
    {...props}
  />
);

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
      _focus={{ boxShadow: '0 0 0 3px rgba(56, 161, 105, 0.15)' }}
      _hover={{
        boxShadow: 'lg',
        transform: 'translateY(-1px)'
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
export const StandardSpinner = () => (
  <Flex justify="center" align="center" py={8}>
    <VStack spacing={3}>
      <Spinner size="lg" color="green.500" thickness="3px" />
      <Text color="gray.600" fontSize="sm">
        Loading...
      </Text>
    </VStack>
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
          {tooltip && (
            <Icon as={FaQuestionCircle} boxSize={3} color="gray.400" />
          )}
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
        <Box cursor="help">
          {MetricContent}
        </Box>
      </ConsumerTooltip>
    );
  }

  return MetricContent;
};

// Standardized Media Upload Component

interface StandardMediaUploadProps {
  onFilesChange: (files: File[]) => void;
  acceptedFiles?: File[];
  maxFiles?: number;
  maxSize?: number;
  accept?: {[key: string]: string[]};
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
}

export const StandardMediaUpload = ({
  onFilesChange,
  acceptedFiles = [],
  maxFiles = 5,
  maxSize = 10485760, // 10MB
  accept = { 'image/*': [] },
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
  previewMode = 'grid'
}: StandardMediaUploadProps) => {
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const bgColor = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.700', 'white');
  const hoverBgColor = useColorModeValue('green.25', 'green.800');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFilesChange,
    accept,
    multiple,
    maxFiles,
    maxSize,
    disabled
  });

  const isImage = (file: File) => {
    return file.type && file.type.startsWith('image/');
  };

  const renderFilePreview = (file: File, index: number) => {
    if (isImage(file)) {
      return (
        <Box key={index} textAlign="center">
          <Box 
            borderRadius="xl" 
            overflow="hidden" 
            mb={2} 
            boxShadow="md"
            border="1px solid"
            borderColor="gray.200"
          >
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              style={{
                width: '100%',
                height: previewMode === 'thumbnails' ? '80px' : '120px',
                objectFit: 'cover'
              }}
            />
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
      >
        <Icon as={FaCheckCircle} boxSize={6} color="green.500" mb={2} />
        <Text fontSize="xs" color={textColor} noOfLines={1} fontWeight="medium">
          {file.name}
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

  return (
    <VStack spacing={3} align="stretch" w="100%">
      <Box
        border={variantStyles.borderStyle || "2px dashed"}
        borderWidth={variantStyles.borderWidth || "2px"}
        borderColor={
          error 
            ? 'red.300' 
            : isDragActive 
              ? 'green.400' 
              : borderColor
        }
        borderRadius="xl"
        p={variant === 'consumer' ? 4 : 6}
        minH={variantStyles.height}
        textAlign="center"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        transition="all 0.3s ease"
        bg={isDragActive ? bgColor : error ? 'red.25' : 'transparent'}
        _hover={{
          borderColor: disabled ? borderColor : error ? 'red.400' : 'green.400',
          bg: disabled ? 'transparent' : error ? 'red.50' : hoverBgColor,
          transform: disabled ? 'none' : 'translateY(-1px)',
          boxShadow: disabled ? 'none' : 'md'
        }}
        opacity={disabled ? 0.6 : 1}
        {...getRootProps()}
      >
        <input {...getInputProps()} style={{ display: 'none' }} />

        {acceptedFiles.length > 0 ? (
          <VStack spacing={4} justify="center" h="full">
            <Circle size="50px" bg="green.100" color="green.600">
              <Icon as={FaCheckCircle} boxSize={6} />
            </Circle>
            <Text fontWeight="semibold" fontSize={variantStyles.textSize} color={textColor}>
              {acceptedFiles.length} file{acceptedFiles.length !== 1 ? 's' : ''} selected
            </Text>

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
                {acceptedFiles.slice(0, 3).map((file, index) => renderFilePreview(file, index))}
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
                {description || `Maximum ${maxFiles} files, up to ${Math.round(maxSize / 1048576)}MB each`}
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>

      {/* Error and Help Text */}
      {helpText && !error && (
        <Text fontSize="xs" color="gray.500">
          {helpText}
        </Text>
      )}
      {error && (
        <Text fontSize="xs" color="red.500" fontWeight="medium">
          {error}
        </Text>
      )}
    </VStack>
  );
};
