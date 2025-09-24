import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Text,
  Icon,
  Box,
  Textarea,
  Flex,
  Badge,
  Button,
  Input,
  Select,
  Divider
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardButton,
  StandardAlert,
  StandardStepper
} from '../Design';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, boolean, number, array } from 'zod';
import { useIntl } from 'react-intl';
import { GoogleMap, Polygon, Marker, useLoadScript } from '@react-google-maps/api';
import { TrazoImageUpload } from '../Upload';
import {
  FaMapMarkedAlt,
  FaBuilding,
  FaCertificate,
  FaCheckCircle,
  FaChevronRight,
  FaChevronLeft,
  FaTrash,
  FaSeedling,
  FaUsers,
  FaCamera,
  FaLeaf
} from 'react-icons/fa';
import { MdInfo, MdNature } from 'react-icons/md';

// 🎯 CARBON TRANSPARENCY FOCUSED SCHEMA
const transparencyParcelSchema = object({
  // Step 1: Identity (Required)
  name: string().min(1, 'Parcel name is required').max(100, 'Name too long'),
  area: number().min(0.01, 'Area must be greater than 0'),
  crop_focus: string().optional(),

  // Step 2: Location (polygon validated separately)

  // Step 3: Transparency Story (Required)
  transparency_description: string().min(3, 'Tell consumers about this parcel'),
  sustainability_practices: string().optional(),
  consumer_story: string().optional(),

  // Step 4: Visual Documentation (Optional)
  images: array(string()).max(5).optional(),
  certified: boolean().default(false),
  certification_type: string().optional()
});

// Utility functions for polygon calculations (same as original)
const calculatePolygonCenter = (points: Array<{ lat: number; lng: number }>) => {
  if (!points || points.length === 0) {
    return { lat: 36.7378, lng: -119.7871 }; // Fresno, CA default
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  points.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return { lat: centerLat, lng: centerLng };
};

const calculatePolygonZoom = (points: Array<{ lat: number; lng: number }>) => {
  if (!points || points.length === 0) {
    return 13;
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  points.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });

  const latSpan = Math.abs(maxLat - minLat);
  const lngSpan = Math.abs(maxLng - minLng);
  const maxSpan = Math.max(latSpan, lngSpan);
  const paddedSpan = maxSpan * 1.4;

  if (paddedSpan > 2.0) return 6;
  if (paddedSpan > 1.0) return 7;
  if (paddedSpan > 0.5) return 8;
  if (paddedSpan > 0.3) return 9;
  if (paddedSpan > 0.2) return 10;
  if (paddedSpan > 0.1) return 11;
  if (paddedSpan > 0.05) return 12;
  if (paddedSpan > 0.02) return 13;
  if (paddedSpan > 0.01) return 14;
  return 15;
};

// 🎯 TRANSPARENCY-FOCUSED Interface
interface TransparencyParcelFormData {
  // Core transparency fields
  name: string;
  area: number;
  crop_focus?: string;
  transparency_description: string;
  sustainability_practices?: string;
  consumer_story?: string;

  // Visual documentation
  images?: string[];
  certified: boolean;
  certification_type?: string;

  // System fields (inherited from original for backend compatibility)
  polygon?: Array<{ lat: number; lng: number }>;
  map_metadata?: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  establishment?: number;

  // Legacy fields for backend compatibility (hidden from UI)
  description?: string;
  contact_phone?: string;
  contact_person?: string;
  contact_email?: string;
  address?: string;
  soil_type?: string;
  unique_code?: string;
}

interface StandardParcelFormTransparencyProps {
  onSubmit: (data: TransparencyParcelFormData) => void;
  onCancel: () => void;
  initialData?: Partial<TransparencyParcelFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
  establishmentName?: string;
}

const options = {
  googleMapApiKey: 'AIzaSyCLHij6DjbLLkhTsTvrRhwuKf8ZGXrx-Q8'
};

export const StandardParcelFormTransparency: React.FC<StandardParcelFormTransparencyProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false,
  establishmentName = ''
}) => {
  const methods = useForm<TransparencyParcelFormData>({
    resolver: zodResolver(transparencyParcelSchema),
    defaultValues: {
      name: '',
      area: 0,
      crop_focus: '',
      transparency_description: '',
      sustainability_practices: '',
      consumer_story: '',
      images: [],
      certified: false,
      certification_type: '',
      ...initialData
    }
  });

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = methods;

  const [currentStep, setCurrentStep] = useState(0);
  const [polygon, setPolygon] = useState<Array<{ lat: number; lng: number }>>(
    initialData?.polygon || []
  );

  const getPolygonLength = () => polygon && Array.isArray(polygon) ? polygon.length : 0;
  const isValidPolygon = () => getPolygonLength() >= 3;

  const [mapCenter, setMapCenter] = useState(() => {
    if (initialData?.map_metadata?.center) {
      return initialData.map_metadata.center;
    }
    if (initialData?.polygon && initialData.polygon.length > 0) {
      return calculatePolygonCenter(initialData.polygon);
    }
    return { lat: 36.7378, lng: -119.7871 };
  });

  const [mapZoom, setMapZoom] = useState(() => {
    if (initialData?.map_metadata?.zoom) {
      return initialData.map_metadata.zoom;
    }
    if (initialData?.polygon && initialData.polygon.length > 0) {
      return calculatePolygonZoom(initialData.polygon);
    }
    return 13;
  });

  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const currentImages = watch('images') || [];
  const intl = useIntl();
  const toast = useToast();
  const polygonRef = useRef<google.maps.Polygon>();
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: options.googleMapApiKey
  });

  // 🎯 SIMPLIFIED 4-STEP TRANSPARENCY STRUCTURE
  const steps = [
    { 
      title: 'Parcel Identity', 
      description: 'Name, area & crop focus', 
      icon: FaBuilding, 
      required: true 
    },
    { 
      title: 'Location', 
      description: 'Map boundaries', 
      icon: FaMapMarkedAlt, 
      required: true 
    },
    {
      title: 'Transparency Story',
      description: 'Consumer-facing narrative',
      icon: MdInfo,
      required: true
    },
    {
      title: 'Visual Documentation',
      description: 'Images & certification',
      icon: FaCamera,
      required: false
    }
  ];

  // Step validation for transparency focus
  const validateStep = (stepNumber: number, formData: any): boolean => {
    switch (stepNumber) {
      case 0:
        return !!(formData.name && formData.name.trim() && formData.area > 0);
      case 1:
        return isValidPolygon();
      case 2:
        const transparencyDesc = formData.transparency_description || '';
        const isValid = transparencyDesc.trim().length >= 3;
        console.log('🔍 Step 2 validation:', {
          transparency_description: transparencyDesc,
          length: transparencyDesc.trim().length,
          isValid,
          formData
        });
        return isValid;
      case 3:
        return true; // Optional step
      default:
        return true;
    }
  };

  const isStepComplete = (step: number) => {
    const currentFormData = watch();
    const result = validateStep(step, currentFormData);
    console.log('🔍 isStepComplete:', { 
      step, 
      result, 
      currentFormData,
      name: currentFormData.name,
      area: currentFormData.area,
      transparency_description: currentFormData.transparency_description
    });
    return result;
  };

  const getCompletedSteps = () => {
    const completed = [];
    for (let i = 0; i < currentStep; i++) {
      if (isStepComplete(i)) {
        completed.push(i);
      }
    }
    return completed;
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const formData = watch();

      if (!validateStep(currentStep, formData)) {
        toast({
          title: 'Required Fields Missing',
          description: `Please complete all required fields in ${steps[currentStep].title} before continuing.`,
          status: 'warning',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
  };

  // Form effects (similar to original)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset(initialData);
      
      if (initialData.polygon) {
        setPolygon(initialData.polygon);
      }
      
      if (initialData.map_metadata?.center) {
        setMapCenter(initialData.map_metadata.center);
      }
      
      if (initialData.map_metadata?.zoom) {
        setMapZoom(initialData.map_metadata.zoom);
      }
      
      if (initialData.images && initialData.images.length > 0) {
        setUploadedImageUrls(initialData.images);
      }
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (getPolygonLength() >= 3) {
      const newCenter = calculatePolygonCenter(polygon);
      const newZoom = calculatePolygonZoom(polygon);
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    }
  }, [polygon]);

  const handleImagesChange = useCallback((newImageUrls: string[]) => {
    setUploadedImageUrls(newImageUrls);
    setValue('images', newImageUrls);
  }, [setValue]);

  // Google Maps polygon editing
  const onEdit = useCallback(() => {
    if (polygonRef.current) {
      const nextPath = polygonRef.current
        .getPath()
        .getArray()
        .map((latLng: google.maps.LatLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng()
        }));
      setPolygon(nextPath);
    }
  }, []);

  const onLoadPolygon = useCallback(
    (polygonInstance: google.maps.Polygon) => {
      polygonRef.current = polygonInstance;
      const path = polygonInstance.getPath();
      listenersRef.current.push(
        path.addListener('set_at', onEdit),
        path.addListener('insert_at', onEdit),
        path.addListener('remove_at', onEdit)
      );
    },
    [onEdit]
  );

  const onUnmount = useCallback(() => {
    listenersRef.current.forEach((listener) => listener.remove());
    polygonRef.current = undefined;
  }, []);

  const onSubmitForm = (data: TransparencyParcelFormData) => {
    try {
      const imageUrls = data.images && data.images.length > 0 ? data.images : uploadedImageUrls;
      
      const finalData = {
        ...data,
        polygon,
        map_metadata: {
          center: mapCenter,
          zoom: mapZoom
        },
        images: imageUrls,
        // Legacy fields for backend compatibility
        description: data.transparency_description, // Map transparency to legacy description
        uploaded_image_urls: imageUrls
      };

      onSubmit(finalData as any);
      toast({
        title: isEdit ? 'Parcel Updated' : 'Parcel Created',
        description: `"${data.name}" has been ${isEdit ? 'updated' : 'created'} successfully.`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      console.error('❌ Form submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save parcel. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <StandardPage
      title={isEdit ? 'Edit Parcel' : 'Add New Parcel'}
      description={`${isEdit ? 'Update' : 'Create'} a parcel for carbon transparency${
        establishmentName ? ` in ${establishmentName}` : ''
      }`}
      showBackButton
      onBack={onCancel}>
      
      {/* Modern Progress Stepper - 4 Steps */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        onStepClick={goToStep}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitForm)}>
          
          {/* 🎯 STEP 0: Parcel Identity */}
          {currentStep === 0 && (
            <StandardCard title="Parcel Identity" subtitle="Basic information for transparency">
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Parcel Name"
                    required
                    error={errors.name?.message}
                    helpText="Consumer-friendly name for this parcel">
                    <Input
                      {...methods.register('name')}
                      placeholder="e.g., North Avocado Grove, Organic Block A"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    />
                  </StandardField>

                  <StandardField
                    label="Area (acres)"
                    required
                    error={errors.area?.message}
                    helpText="Provides scale context for consumers">
                    <Controller
                      name="area"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || 0}
                          onChange={(_, num) => field.onChange(num || 0)}
                          min={0.01}
                          step={0.1}
                          precision={2}>
                          <NumberInputField borderRadius="lg" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardField
                  label="Primary Crop Focus"
                  error={errors.crop_focus?.message}
                  helpText="What crop is primarily grown here? (helps connect to products)">
                  <Select
                    {...methods.register('crop_focus')}
                    placeholder="Select primary crop"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg">
                    <option value="avocado">Avocado</option>
                    <option value="citrus">Citrus</option>
                    <option value="tomato">Tomato</option>
                    <option value="lettuce">Lettuce</option>
                    <option value="strawberry">Strawberry</option>
                    <option value="grape">Grape</option>
                    <option value="apple">Apple</option>
                    <option value="other">Other</option>
                  </Select>
                </StandardField>

                <StandardAlert
                  status="info"
                  title="Transparency Focus"
                  description="This information helps consumers understand the scale and purpose of this land, connecting them to the products they purchase."
                />

                <HStack spacing={3} justify="flex-end" pt={4}>
                  <StandardButton variant="outline" onClick={onCancel}>
                    Cancel
                  </StandardButton>
                  <StandardButton
                    onClick={nextStep}
                    rightIcon={<FaChevronRight />}
                    disabled={!isStepComplete(0)}>
                    Continue to Location
                  </StandardButton>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* 🎯 STEP 1: Location (Same as original - works well) */}
          {currentStep === 1 && (
            <StandardCard title="Parcel Location" subtitle="Define boundaries for transparency">
              <VStack spacing={6} align="stretch">
                <Box borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.200">
                  {loadError ? (
                    <Flex h="400px" align="center" justify="center" bg="red.50" direction="column">
                      <Text color="red.500" mb={2}>Failed to load Google Maps</Text>
                      <Text fontSize="sm" color="red.400">{loadError.message}</Text>
                    </Flex>
                  ) : !isLoaded ? (
                    <Flex h="400px" align="center" justify="center" bg="gray.100">
                      <Text>Loading map...</Text>
                    </Flex>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '400px' }}
                      zoom={mapZoom}
                      center={mapCenter}
                      onClick={(e) => {
                        if (e.latLng) {
                          const newPoint = {
                            lat: e.latLng.lat(),
                            lng: e.latLng.lng()
                          };
                          const updatedPolygon = [...polygon, newPoint];
                          setPolygon(updatedPolygon);
                          setValue('polygon', updatedPolygon);
                          setValue('map_metadata', {
                            center: mapCenter,
                            zoom: mapZoom
                          });
                        }
                      }}
                      options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        mapTypeControl: true,
                        scaleControl: true,
                        streetViewControl: false,
                        rotateControl: false,
                        fullscreenControl: true,
                        gestureHandling: 'cooperative',
                        clickableIcons: false,
                        mapTypeId: 'satellite'
                      }}>
                      {getPolygonLength() > 2 && (
                        <Polygon
                          path={polygon}
                          onLoad={onLoadPolygon}
                          onUnmount={onUnmount}
                          options={{
                            fillColor: isValidPolygon() ? '#22C55E' : '#F59E0B',
                            fillOpacity: 0.25,
                            strokeColor: isValidPolygon() ? '#16A34A' : '#D97706',
                            strokeOpacity: 1,
                            strokeWeight: 2,
                            editable: true,
                            draggable: true
                          }}
                        />
                      )}
                      
                      {polygon && Array.isArray(polygon) && polygon.map((point, index) => (
                        <Marker
                          key={index}
                          position={point}
                          title={`Point ${index + 1}`}
                          icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: isValidPolygon() ? '#16A34A' : '#D97706',
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 2
                          }}
                          onClick={() => {
                            const newPolygon = polygon && Array.isArray(polygon) ? polygon.filter((_, i) => i !== index) : [];
                            setPolygon(newPolygon);
                            setValue('polygon', newPolygon);
                          }}
                        />
                      ))}
                    </GoogleMap>
                  )}
                </Box>

                <StandardAlert
                  status="info"
                  title="Location Transparency"
                  description="Geographic boundaries help consumers see exactly where their food comes from, building trust through location transparency."
                />

                {getPolygonLength() > 0 && (
                  <Box p={4} bg="green.50" borderRadius="lg">
                    <Text fontWeight="semibold" color="green.700" mb={2}>
                      Polygon Points: {getPolygonLength()}
                    </Text>
                    <HStack>
                      <Badge colorScheme="green" variant="solid">
                        {isValidPolygon() ? 'Valid Polygon' : 'Need more points'}
                      </Badge>
                      {getPolygonLength() > 0 && (
                        <StandardButton
                          size="sm"
                          variant="outline"
                          leftIcon={<FaTrash />}
                          onClick={() => setPolygon([])}>
                          Clear Points
                        </StandardButton>
                      )}
                    </HStack>
                  </Box>
                )}

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Identity
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(1)}>
                      Continue to Story
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* 🎯 STEP 2: Transparency Story */}
          {currentStep === 2 && (
            <StandardCard
              title="Transparency Story"
              subtitle="Tell consumers about this parcel">
              <VStack spacing={6} align="stretch">
                
                <StandardField
                  label="What makes this parcel special?"
                  required
                  error={errors.transparency_description?.message}
                  helpText="Describe this parcel in a way that helps consumers understand its role in sustainable food production">
                  <Textarea
                    {...methods.register('transparency_description')}
                    placeholder="e.g., This 12.5-acre organic avocado grove uses precision irrigation and cover cropping to reduce water usage by 30% while maintaining soil health. The grove has been certified organic since 2018 and serves as a demonstration site for sustainable farming practices..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="150px"
                  />
                </StandardField>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Key Sustainability Practices"
                    error={errors.sustainability_practices?.message}
                    helpText="Highlight practices that consumers care about">
                    <Textarea
                      {...methods.register('sustainability_practices')}
                      placeholder="e.g., Water conservation through drip irrigation, soil health improvement through cover crops, biodiversity support through native plant borders..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="120px"
                    />
                  </StandardField>

                  <StandardField
                    label="Why should consumers care?"
                    error={errors.consumer_story?.message}
                    helpText="Connect this parcel to the consumer's values">
                    <Textarea
                      {...methods.register('consumer_story')}
                      placeholder="e.g., By choosing products from this parcel, consumers support regenerative agriculture that builds soil health, protects water resources, and creates habitat for beneficial insects..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="120px"
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardAlert
                  status="success"
                  title="Consumer Transparency"
                  description="This story helps consumers understand the positive impact of their food choices and builds trust through transparency."
                />

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Location
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={(() => {
                        const currentStepValid = validateStep(currentStep, watch());
                        console.log('🔍 Button state:', { 
                          currentStep, 
                          currentStepValid, 
                          formData: watch() 
                        });
                        return !currentStepValid;
                      })()}>
                      Continue to Documentation
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* 🎯 STEP 3: Visual Documentation */}
          {currentStep === 3 && (
            <StandardCard
              title="Visual Documentation"
              subtitle="Build trust through images and certification">
              <VStack spacing={6} align="stretch">
                
                <StandardField
                  label="Parcel Images"
                  helpText="Upload high-quality images that show consumers the practices in action (max 5 images)">
                  <TrazoImageUpload
                    maxFiles={5}
                    maxSize={5 * 1024 * 1024} // 5MB
                    existingImages={currentImages.length > 0 ? currentImages : uploadedImageUrls}
                    onImagesChange={handleImagesChange}
                    isLoading={false}
                  />
                </StandardField>

                <Divider />

                <StandardField
                  label="Certification Status"
                  helpText="Mark this parcel as certified to build consumer trust">
                  <VStack align="stretch" spacing={4}>
                    <HStack>
                      <Switch {...methods.register('certified')} colorScheme="green" size="md" />
                      <Text fontSize="sm" color="gray.600">
                        {watch('certified') ? 'Certified for Transparency' : 'Not Certified'}
                      </Text>
                    </HStack>

                    {watch('certified') && (
                      <StandardField
                        label="Certification Type"
                        helpText="Type of certification (shown to consumers)">
                        <Select
                          {...methods.register('certification_type')}
                          placeholder="Select certification type"
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'green.400' }}
                          _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          size="lg">
                          <option value="usda_organic">USDA Organic</option>
                          <option value="biodynamic">Biodynamic</option>
                          <option value="fair_trade">Fair Trade</option>
                          <option value="regenerative">Regenerative Organic</option>
                          <option value="carbon_neutral">Carbon Neutral</option>
                          <option value="water_steward">Water Stewardship</option>
                          <option value="other">Other</option>
                        </Select>
                      </StandardField>
                    )}
                  </VStack>
                </StandardField>

                <StandardAlert
                  status="info"
                  title="Visual Trust Building"
                  description="Images and certifications help consumers see the real practices behind their food, building confidence in their purchasing decisions."
                />

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Story
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={isEdit ? 'Updating...' : 'Creating...'}
                      leftIcon={<FaCheckCircle />}>
                      {isEdit ? 'Update Parcel' : 'Create Parcel'}
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

        </form>
      </FormProvider>
    </StandardPage>
  );
};

export { StandardParcelFormTransparency as default };