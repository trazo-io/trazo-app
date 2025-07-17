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
  FormControl,
  FormLabel,
  Textarea,
  Flex,
  Badge,
  Image,
  IconButton,
  Button,
  Progress,
  Input,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tooltip,
  Grid,
  GridItem,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  Stack
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardSelect,
  StandardButton,
  StandardAlert,
  StandardStepper,
  StandardMediaUpload,
  S3Image
} from '../Design';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, boolean, number } from 'zod';
import { useIntl } from 'react-intl';
import { GoogleMap, Polygon, useLoadScript } from '@react-google-maps/api';
import { useFileUpload } from '../../services/uploadService';
import { CloseIcon } from '@chakra-ui/icons';
import {
  FaMapMarkedAlt,
  FaBuilding,
  FaCloudUploadAlt,
  FaCertificate,
  FaCheckCircle,
  FaChevronRight,
  FaChevronLeft,
  FaPlus,
  FaTrash,
  FaSeedling,
  FaTint,
  FaLeaf,
  FaMountain,
  FaFlask,
  FaThermometerHalf,
  FaWater,
  FaRecycle,
  FaShieldAlt,
  FaTree,
  FaChartLine
} from 'react-icons/fa';
import { MdInfo, MdNature, MdLandscape, MdWaves, MdEco } from 'react-icons/md';
import { Controller } from 'react-hook-form';

// Utility function to calculate polygon center
const calculatePolygonCenter = (points: Array<{ lat: number; lng: number }>) => {
  if (!points || points.length === 0) {
    return { lat: 36.7378, lng: -119.7871 }; // Fresno, CA default
  }

  // Calculate bounds
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

  // Calculate center
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return { lat: centerLat, lng: centerLng };
};

// Utility function to calculate appropriate zoom level based on polygon bounds
const calculatePolygonZoom = (points: Array<{ lat: number; lng: number }>) => {
  if (!points || points.length === 0) {
    return 13; // Default zoom
  }

  // Calculate bounds
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

  // Calculate the span of the polygon
  const latSpan = Math.abs(maxLat - minLat);
  const lngSpan = Math.abs(maxLng - minLng);
  const maxSpan = Math.max(latSpan, lngSpan);

  // Add padding factor to ensure polygon doesn't touch edges (20% padding)
  const paddedSpan = maxSpan * 1.4;

  // More conservative zoom levels to ensure full polygon visibility
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

// Enhanced Form Schema with Advanced Agricultural Features
const parcelSchema = object({
  name: string().min(1, 'Parcel name is required').max(100, 'Name too long'),
  area: number().min(0.01, 'Area must be greater than 0'),
  description: string().min(1, 'Description is required'),
  contact_phone: string().optional(),
  address: string().optional(),
  certified: boolean().default(false),

  // Basic Land Info
  soil_type: string().optional(),
  unique_code: string().optional(),
  certification_type: string().optional(),
  contact_person: string().optional(),
  contact_email: string().email('Invalid email format').optional().or(string().length(0)),

  // Soil Health Management
  soil_ph: number().min(0).max(14).optional(),
  soil_organic_matter: number().min(0).max(100).optional(),
  soil_nitrogen: number().min(0).optional(),
  soil_phosphorus: number().min(0).optional(),
  soil_potassium: number().min(0).optional(),
  soil_compaction_level: string().optional(),
  erosion_risk: string().optional(),
  last_soil_test_date: string().optional(),
  soil_improvement_notes: string().optional(),

  // Water Rights and Management
  water_source_type: string().optional(),
  water_rights_docs: string().optional(),
  water_allocation_acre_feet: number().min(0).optional(),
  water_quality_ph: number().min(0).max(14).optional(),
  water_quality_tds: number().min(0).optional(),
  irrigation_efficiency: number().min(0).max(100).optional(),
  drainage_characteristics: string().optional(),
  water_conservation_practices: string().optional(),
  seasonal_water_availability: string().optional(),

  // Conservation Practices
  cover_crop_management: string().optional(),
  crop_rotation_pattern: string().optional(),
  buffer_strips_windbreaks: boolean().default(false),
  integrated_pest_management: boolean().default(false),
  organic_certification_status: string().optional(),
  nrcs_practices: string().optional(),
  carbon_sequestration_practices: string().optional(),
  biodiversity_measures: string().optional(),

  // Advanced Land Characteristics
  slope_percentage: number().min(0).max(100).optional(),
  topography_type: string().optional(),
  microclimate_conditions: string().optional(),
  frost_risk_zone: string().optional(),
  wildlife_habitat_areas: string().optional(),
  riparian_zones: boolean().default(false),
  wetland_designation: boolean().default(false),
  historical_yield_data: string().optional(),
  land_use_restrictions: string().optional()
});

interface ParcelFormData {
  name: string;
  area: number;
  description: string;
  contact_phone?: string;
  address?: string;
  certified: boolean;

  // Basic Land Info
  soil_type?: string;
  unique_code?: string;
  certification_type?: string;
  contact_person?: string;
  contact_email?: string;

  // Soil Health Management
  soil_ph?: number;
  soil_organic_matter?: number;
  soil_nitrogen?: number;
  soil_phosphorus?: number;
  soil_potassium?: number;
  soil_compaction_level?: string;
  erosion_risk?: string;
  last_soil_test_date?: string;
  soil_improvement_notes?: string;

  // Water Rights and Management
  water_source_type?: string;
  water_rights_docs?: string;
  water_allocation_acre_feet?: number;
  water_quality_ph?: number;
  water_quality_tds?: number;
  irrigation_efficiency?: number;
  drainage_characteristics?: string;
  water_conservation_practices?: string;
  seasonal_water_availability?: string;

  // Conservation Practices
  cover_crop_management?: string;
  crop_rotation_pattern?: string;
  buffer_strips_windbreaks?: boolean;
  integrated_pest_management?: boolean;
  organic_certification_status?: string;
  nrcs_practices?: string;
  carbon_sequestration_practices?: string;
  biodiversity_measures?: string;

  // Advanced Land Characteristics
  slope_percentage?: number;
  topography_type?: string;
  microclimate_conditions?: string;
  frost_risk_zone?: string;
  wildlife_habitat_areas?: string;
  riparian_zones?: boolean;
  wetland_designation?: boolean;
  historical_yield_data?: string;
  land_use_restrictions?: string;

  polygon?: Array<{ lat: number; lng: number }>;
  map_metadata?: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  images?: File[];
  establishment?: number;
}

interface StandardParcelFormProps {
  onSubmit: (data: ParcelFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ParcelFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
  establishmentName?: string;
}

const options = {
  googleMapApiKey: 'AIzaSyCLHij6DjbLLkhTsTvrRhwuKf8ZGXrx-Q8'
};

export const StandardParcelForm: React.FC<StandardParcelFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false,
  establishmentName = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [polygon, setPolygon] = useState<Array<{ lat: number; lng: number }>>(
    initialData?.polygon || []
  );

  // Enhanced map centering logic
  const [mapCenter, setMapCenter] = useState(() => {
    if (initialData?.map_metadata?.center) {
      return initialData.map_metadata.center;
    }
    if (initialData?.polygon && initialData.polygon.length > 0) {
      return calculatePolygonCenter(initialData.polygon);
    }
    return { lat: 36.7378, lng: -119.7871 }; // Fresno, CA - Central Valley agricultural region
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

  // Image upload state management
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadMultipleFiles } = useFileUpload();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Handle selected files from StandardMediaUpload
  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  // Handle removing selected files
  const handleRemoveSelectedFile = (file: File) => {
    setSelectedFiles((prev) => prev.filter((f) => f !== file));
  };

  // Handle removing uploaded files (existing images)
  const handleRemoveUploadedFile = (index: number, url: string) => {
    // Find the image object by URL in existingImages
    const imageToDelete = existingImages.find((img) => img.url === url);
    
    if (imageToDelete) {
      // Only add to imagesToDelete if it's a real database ID (not temporary)
      if (!imageToDelete.id.toString().startsWith('uploaded-')) {
        setImagesToDelete((prev) => [...prev, imageToDelete.id]);
      }
      // Always remove from UI
      setExistingImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
    }
  };
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  const intl = useIntl();
  const toast = useToast();

  const polygonRef = useRef<google.maps.Polygon>();
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: options.googleMapApiKey
  });

  // Define steps for enhanced stepper
  const steps = [
    { title: 'Basic Info', description: 'Name, area & location', icon: FaBuilding },
    { title: 'Location', description: 'Map & boundaries', icon: FaMapMarkedAlt },
    { title: 'Description', description: 'Details & characteristics', icon: MdInfo },
    { title: 'Soil Health', description: 'pH, nutrients & testing', icon: FaSeedling },
    { title: 'Water Management', description: 'Sources & conservation', icon: FaTint },
    { title: 'Conservation', description: 'Practices & sustainability', icon: FaLeaf },
    { title: 'Land Features', description: 'Topography & environment', icon: FaMountain },
    { title: 'Media & Certification', description: 'Images & certification', icon: FaCertificate }
  ];

  const methods = useForm<ParcelFormData>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      certified: false,
      area: 0,
      name: '',
      description: '',
      contact_phone: '',
      address: '',

      // Basic Land Info
      soil_type: '',
      unique_code: '',
      certification_type: '',
      contact_person: '',
      contact_email: '',

      // Soil Health Management
      soil_ph: undefined,
      soil_organic_matter: undefined,
      soil_nitrogen: undefined,
      soil_phosphorus: undefined,
      soil_potassium: undefined,
      soil_compaction_level: '',
      erosion_risk: '',
      last_soil_test_date: '',
      soil_improvement_notes: '',

      // Water Rights and Management
      water_source_type: '',
      water_rights_docs: '',
      water_allocation_acre_feet: undefined,
      water_quality_ph: undefined,
      water_quality_tds: undefined,
      irrigation_efficiency: undefined,
      drainage_characteristics: '',
      water_conservation_practices: '',
      seasonal_water_availability: '',

      // Conservation Practices
      cover_crop_management: '',
      crop_rotation_pattern: '',
      buffer_strips_windbreaks: false,
      integrated_pest_management: false,
      organic_certification_status: '',
      nrcs_practices: '',
      carbon_sequestration_practices: '',
      biodiversity_measures: '',

      // Advanced Land Characteristics
      slope_percentage: undefined,
      topography_type: '',
      microclimate_conditions: '',
      frost_risk_zone: '',
      wildlife_habitat_areas: '',
      riparian_zones: false,
      wetland_designation: false,
      historical_yield_data: '',
      land_use_restrictions: '',

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

  // Update form when initialData changes - Simplified approach
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset({
        certified: false,
        area: 0,
        name: '',
        description: '',
        contact_phone: '',
        address: '',

        // Basic Land Info
        soil_type: '',
        unique_code: '',
        certification_type: '',
        contact_person: '',
        contact_email: '',

        // Soil Health Management
        soil_ph: undefined,
        soil_organic_matter: undefined,
        soil_nitrogen: undefined,
        soil_phosphorus: undefined,
        soil_potassium: undefined,
        soil_compaction_level: '',
        erosion_risk: '',
        last_soil_test_date: '',
        soil_improvement_notes: '',

        // Water Rights and Management
        water_source_type: '',
        water_rights_docs: '',
        water_allocation_acre_feet: undefined,
        water_quality_ph: undefined,
        water_quality_tds: undefined,
        irrigation_efficiency: undefined,
        drainage_characteristics: '',
        water_conservation_practices: '',
        seasonal_water_availability: '',

        // Conservation Practices
        cover_crop_management: '',
        crop_rotation_pattern: '',
        buffer_strips_windbreaks: false,
        integrated_pest_management: false,
        organic_certification_status: '',
        nrcs_practices: '',
        carbon_sequestration_practices: '',
        biodiversity_measures: '',

        // Advanced Land Characteristics
        slope_percentage: undefined,
        topography_type: '',
        microclimate_conditions: '',
        frost_risk_zone: '',
        wildlife_habitat_areas: '',
        riparian_zones: false,
        wetland_designation: false,
        historical_yield_data: '',
        land_use_restrictions: '',

        ...initialData
      });

      // Handle existing images for edit mode
      if (isEdit && initialData.images) {
        const formattedImages = (initialData.images as any[]).map((img: any, index: number) => ({
          id: img.id || `existing-${index}`,
          url: typeof img === 'string' ? img : img.url || img.image_url
        }));
        setExistingImages(formattedImages);
      }
    }
  }, [initialData, reset, isEdit]);

  // Update map center and zoom when polygon changes
  useEffect(() => {
    if (polygon.length >= 3) {
      const newCenter = calculatePolygonCenter(polygon);
      const newZoom = calculatePolygonZoom(polygon);
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    }
  }, [polygon]);



  const handleImageUpload = async () => {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Use the real upload service
      const uploadedUrls = await uploadMultipleFiles(selectedFiles);

      // Move new images to existing images with real S3 URLs
      const newExistingImages = uploadedUrls.map((url, index) => ({
        id: `uploaded-${Date.now()}-${index}`,
        url: url
      }));

      setExistingImages((prev) => [...prev, ...newExistingImages]);
      setSelectedFiles([]);
      setUploadProgress(100);

      toast({
        title: 'Images Uploaded',
        description: `${selectedFiles.length} image(s) uploaded successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload images. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return [];
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

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

  const onSubmitForm = (data: ParcelFormData) => {
    try {
      console.log('🔍 Form submission data received:', data);
      console.log('🔍 All form values from watch():', watch());
      console.log('🔍 Address field specifically:', {
        fromData: data.address,
        fromWatch: watch('address'),
        isDefined: data.address !== undefined,
        isEmpty: !data.address || data.address.trim() === ''
      });

      const finalData = {
        ...data,
        polygon,
        map_metadata: {
          center: mapCenter,
          zoom: mapZoom
        },
        // Pass image data - only URLs now since files are uploaded separately
        uploaded_image_urls: existingImages.map((img) => img.url),
        images_to_delete: imagesToDelete
      };

      // Remove the images property since we're handling it differently
      const { images, ...submissionData } = finalData;

      console.log('🚀 Final submission data:', submissionData);
      console.log('🔑 Submission data keys:', Object.keys(submissionData));
      console.log('📍 Address in final data:', submissionData.address);

      onSubmit(submissionData as any);
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

  // Enhanced step validation for all 8 steps
  const isStepComplete = (step: number) => {
    const formData = watch();
    const currentErrors = errors;

    switch (step) {
      case 0:
        // Basic Info: name and area required, no validation errors
        const basicFieldErrors = ['name', 'area'].some(
          (field) => currentErrors[field as keyof typeof currentErrors]
        );
        const hasName = formData.name && formData.name.trim().length > 0;
        const hasValidArea = formData.area && formData.area > 0;
        return hasName && hasValidArea && !basicFieldErrors;

      case 1:
        // Location: polygon with at least 3 points required
        return polygon.length >= 3;

      case 2:
        // Description: description required, no validation errors in basic description fields
        const descriptionFieldErrors = [
          'description',
          'soil_type',
          'unique_code',
          'certification_type',
          'address',
          'contact_person',
          'contact_email'
        ].some((field) => currentErrors[field as keyof typeof currentErrors]);
        const hasDescription = formData.description && formData.description.trim().length > 0;
        return hasDescription && !descriptionFieldErrors;

      case 3:
        // Soil Health: optional step, check for validation errors in soil-related fields
        const soilFieldErrors = [
          'soil_ph',
          'soil_organic_matter',
          'soil_nitrogen',
          'soil_phosphorus',
          'soil_potassium',
          'soil_compaction_level',
          'erosion_risk',
          'last_soil_test_date',
          'soil_improvement_notes'
        ].some((field) => currentErrors[field as keyof typeof currentErrors]);
        return !soilFieldErrors;

      case 4:
        // Water Management: optional step, check for validation errors in water-related fields
        const waterFieldErrors = [
          'water_source_type',
          'water_rights_docs',
          'water_allocation_acre_feet',
          'water_quality_ph',
          'water_quality_tds',
          'irrigation_efficiency',
          'drainage_characteristics',
          'water_conservation_practices',
          'seasonal_water_availability'
        ].some((field) => currentErrors[field as keyof typeof currentErrors]);
        return !waterFieldErrors;

      case 5:
        // Conservation: optional step, check for validation errors in conservation fields
        const conservationFieldErrors = [
          'cover_crop_management',
          'crop_rotation_pattern',
          'organic_certification_status',
          'nrcs_practices',
          'carbon_sequestration_practices',
          'biodiversity_measures'
        ].some((field) => currentErrors[field as keyof typeof currentErrors]);
        return !conservationFieldErrors;

      case 6:
        // Land Features: optional step, check for validation errors in land characteristic fields
        const landFieldErrors = [
          'slope_percentage',
          'topography_type',
          'microclimate_conditions',
          'frost_risk_zone',
          'wildlife_habitat_areas',
          'historical_yield_data',
          'land_use_restrictions'
        ].some((field) => currentErrors[field as keyof typeof currentErrors]);
        return !landFieldErrors;

      case 7:
        // Media & Certification: optional step, check for validation errors
        const mediaFieldErrors = ['contact_phone'].some(
          (field) => currentErrors[field as keyof typeof currentErrors]
        );
        return !mediaFieldErrors;

      default:
        return false;
    }
  };

  // Get completed steps
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
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <StandardPage
      title={isEdit ? 'Edit Parcel' : 'Add New Parcel'}
      description={`${isEdit ? 'Update' : 'Create'} a parcel${
        establishmentName ? ` in ${establishmentName}` : ''
      }`}
      showBackButton
      onBack={onCancel}
    >
      {/* Modern Progress Stepper */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        onStepClick={(step) => setCurrentStep(step)}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitForm)}>
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <StandardCard title="Parcel Information" subtitle="Basic details about your parcel">
              <VStack spacing={6} align="stretch">
                {/* Name & Area */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Parcel Name"
                    required
                    error={errors.name?.message}
                    helpText="Unique name for this parcel"
                  >
                    <Input
                      {...methods.register('name')}
                      placeholder="e.g., North Field, Block A"
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
                    helpText="Total area in acres"
                  >
                    <Controller
                      name="area"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || 0}
                          onChange={(_, num) => field.onChange(num || 0)}
                          min={0.01}
                          step={0.1}
                          precision={2}
                        >
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

                {/* Progress Info */}
                <StandardAlert
                  status="info"
                  title="Next Steps"
                  description="After providing basic information, you'll map the parcel boundaries and add detailed descriptions."
                />

                {/* Navigation */}
                <HStack spacing={3} justify="flex-end" pt={4}>
                  <StandardButton variant="outline" onClick={onCancel}>
                    Cancel
                  </StandardButton>
                  <StandardButton
                    onClick={nextStep}
                    rightIcon={<FaChevronRight />}
                    disabled={!isStepComplete(0)}
                  >
                    Continue to Location
                  </StandardButton>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 1: Location Mapping */}
          {currentStep === 1 && (
            <StandardCard title="Parcel Location" subtitle="Define parcel boundaries on the map">
              <VStack spacing={6} align="stretch">
                {/* Map Container */}
                <Box borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.200">
                  {loadError ? (
                    <Flex h="400px" align="center" justify="center" bg="red.50" direction="column">
                      <Text color="red.500" mb={2}>
                        Failed to load Google Maps
                      </Text>
                      <Text fontSize="sm" color="red.400">
                        {loadError.message}
                      </Text>
                    </Flex>
                  ) : !isLoaded ? (
                    <Flex h="400px" align="center" justify="center" bg="gray.100">
                      <Text>Loading map...</Text>
                    </Flex>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={{
                        width: '100%',
                        height: '400px'
                      }}
                      zoom={mapZoom}
                      center={mapCenter}
                      onClick={(e) => {
                        if (e.latLng) {
                          const newPoint = {
                            lat: e.latLng.lat(),
                            lng: e.latLng.lng()
                          };
                          setPolygon([...polygon, newPoint]);
                        }
                      }}
                      onZoomChanged={() => {
                        // Update zoom when changed
                      }}
                      onCenterChanged={() => {
                        // Update center when changed
                      }}
                    >
                      {polygon.length > 2 && (
                        <Polygon
                          path={polygon}
                          onLoad={onLoadPolygon}
                          onUnmount={onUnmount}
                          options={{
                            fillColor: '#00ff00',
                            fillOpacity: 0.35,
                            strokeColor: '#00ff00',
                            strokeOpacity: 1,
                            strokeWeight: 2,
                            editable: true,
                            draggable: true
                          }}
                        />
                      )}
                    </GoogleMap>
                  )}
                </Box>

                {/* Map Instructions */}
                <StandardAlert
                  status="info"
                  title="Drawing Instructions"
                  description="Click on the map to add points and create the parcel boundary. You need at least 3 points to form a polygon."
                />

                {/* Polygon Info */}
                {polygon.length > 0 && (
                  <Box p={4} bg="green.50" borderRadius="lg">
                    <Text fontWeight="semibold" color="green.700" mb={2}>
                      Polygon Points: {polygon.length}
                    </Text>
                    <HStack>
                      <Badge colorScheme="green" variant="solid">
                        {polygon.length >= 3 ? 'Valid Polygon' : 'Need more points'}
                      </Badge>
                      {polygon.length > 0 && (
                        <StandardButton
                          size="sm"
                          variant="outline"
                          leftIcon={<FaTrash />}
                          onClick={() => setPolygon([])}
                        >
                          Clear Points
                        </StandardButton>
                      )}
                    </HStack>
                  </Box>
                )}

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Basic Info
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(1)}
                    >
                      Continue to Description
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 2: Description */}
          {currentStep === 2 && (
            <StandardCard
              title="Parcel Description"
              subtitle="Detailed information about the parcel"
            >
              <VStack spacing={6} align="stretch">
                {/* Description */}
                <StandardField
                  label="Description"
                  required
                  error={errors.description?.message}
                  helpText="Describe the parcel, its characteristics, soil type, drainage, etc."
                >
                  <Textarea
                    {...methods.register('description')}
                    placeholder="Describe the parcel including soil type, drainage, topography, existing vegetation, and any other relevant characteristics..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="120px"
                  />
                </StandardField>

                {/* Additional Parcel Information */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  Additional Information
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Soil Type"
                    error={errors.soil_type?.message}
                    helpText="Type of soil in this parcel"
                  >
                    <Input
                      {...methods.register('soil_type')}
                      placeholder="e.g., Clay, Sandy loam, Silty clay"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    />
                  </StandardField>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Unique Code"
                    error={errors.unique_code?.message}
                    helpText="Internal parcel identifier or code"
                  >
                    <Input
                      {...methods.register('unique_code')}
                      placeholder="e.g., P001, NorthField-A"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    />
                  </StandardField>

                  <StandardField
                    label="Certification Type"
                    error={errors.certification_type?.message}
                    helpText="Type of agricultural certification"
                  >
                    <Input
                      {...methods.register('certification_type')}
                      placeholder="e.g., USDA Organic, Fair Trade"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardField
                  label="Address"
                  error={errors.address?.message}
                  helpText="Specific address or location reference"
                >
                  <Input
                    {...methods.register('address')}
                    placeholder="e.g., 123 Farm Road, North Section"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                  />
                </StandardField>

                {/* Contact Information */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  Contact Information
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Contact Person"
                    error={errors.contact_person?.message}
                    helpText="Person responsible for this parcel"
                  >
                    <Input
                      {...methods.register('contact_person')}
                      placeholder="e.g., John Smith"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    />
                  </StandardField>

                  <StandardField
                    label="Contact Email"
                    error={errors.contact_email?.message}
                    helpText="Contact email for this parcel"
                  >
                    <Input
                      {...methods.register('contact_email')}
                      type="email"
                      placeholder="e.g., john@farm.com"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Summary */}
                <Box p={4} bg="gray.50" borderRadius="lg">
                  <Text fontWeight="semibold" mb={2}>
                    Parcel Summary:
                  </Text>
                  <SimpleGrid columns={2} spacing={2} fontSize="sm">
                    <Text>Name: {watch('name') || 'Not specified'}</Text>
                    <Text>Area: {watch('area') || 0} acres</Text>
                    <Text>Boundary Points: {polygon.length}</Text>
                    <Text>Status: {polygon.length >= 3 ? 'Ready' : 'Incomplete'}</Text>
                  </SimpleGrid>
                </Box>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Location
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(2)}
                    >
                      Continue to Soil Health
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 3: Soil Health Management */}
          {currentStep === 3 && (
            <StandardCard
              title="Soil Health Management"
              subtitle="Soil composition, nutrients, and testing information"
            >
              <VStack spacing={6} align="stretch">
                {/* Soil Testing Information */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mb={2}>
                  <Icon as={FaFlask} mr={2} color="green.500" />
                  Soil Testing & Composition
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  <StandardField
                    label="Soil pH"
                    helpText="pH level (0-14, optimal: 6.0-7.0)"
                    error={errors.soil_ph?.message}
                  >
                    <Controller
                      name="soil_ph"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          max={14}
                          step={0.1}
                          precision={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 6.5"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
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
                    label="Organic Matter %"
                    helpText="Percentage of organic matter (0-100%)"
                    error={errors.soil_organic_matter?.message}
                  >
                    <Controller
                      name="soil_organic_matter"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          max={100}
                          step={0.1}
                          precision={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 3.5"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
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
                    label="Last Soil Test Date"
                    helpText="When was the last soil test conducted?"
                    error={errors.last_soil_test_date?.message}
                  >
                    <Input
                      {...methods.register('last_soil_test_date')}
                      type="date"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Nutrient Levels */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={FaSeedling} mr={2} color="green.500" />
                  Nutrient Levels (ppm or lbs/acre)
                </Text>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <StandardField
                    label="Nitrogen (N)"
                    helpText="Available nitrogen in ppm"
                    error={errors.soil_nitrogen?.message}
                  >
                    <Controller
                      name="soil_nitrogen"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 25"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
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
                    label="Phosphorus (P)"
                    helpText="Available phosphorus in ppm"
                    error={errors.soil_phosphorus?.message}
                  >
                    <Controller
                      name="soil_phosphorus"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 45"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
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
                    label="Potassium (K)"
                    helpText="Available potassium in ppm"
                    error={errors.soil_potassium?.message}
                  >
                    <Controller
                      name="soil_potassium"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 180"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Soil Conditions */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={MdLandscape} mr={2} color="green.500" />
                  Soil Conditions & Assessment
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Soil Compaction Level"
                    helpText="Assessment of soil compaction"
                    error={errors.soil_compaction_level?.message}
                  >
                    <Select
                      {...methods.register('soil_compaction_level')}
                      placeholder="Select compaction level"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="low">Low - No significant compaction</option>
                      <option value="moderate">Moderate - Some compaction present</option>
                      <option value="high">High - Significant compaction issues</option>
                      <option value="severe">Severe - Major compaction requiring treatment</option>
                    </Select>
                  </StandardField>

                  <StandardField
                    label="Erosion Risk"
                    helpText="Assessment of erosion susceptibility"
                    error={errors.erosion_risk?.message}
                  >
                    <Select
                      {...methods.register('erosion_risk')}
                      placeholder="Select erosion risk"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="low">Low - Stable soil, minimal risk</option>
                      <option value="moderate">Moderate - Some erosion potential</option>
                      <option value="high">High - Significant erosion risk</option>
                      <option value="severe">Severe - Active erosion requiring intervention</option>
                    </Select>
                  </StandardField>
                </SimpleGrid>

                <StandardField
                  label="Soil Improvement Notes"
                  helpText="Notes on soil improvement needs and recommendations"
                  error={errors.soil_improvement_notes?.message}
                >
                  <Textarea
                    {...methods.register('soil_improvement_notes')}
                    placeholder="Describe any soil improvement needs, fertilization plans, or recommendations from soil tests..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="100px"
                  />
                </StandardField>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Description
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(3)}
                    >
                      Continue to Water Management
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 4: Water Rights and Management */}
          {currentStep === 4 && (
            <StandardCard
              title="Water Rights and Management"
              subtitle="Water sources, allocation, and conservation practices"
            >
              <VStack spacing={6} align="stretch">
                {/* Water Source & Rights */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mb={2}>
                  <Icon as={FaTint} mr={2} color="blue.500" />
                  Water Source & Rights
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Water Source Type"
                    helpText="Primary source of irrigation water"
                    error={errors.water_source_type?.message}
                  >
                    <Select
                      {...methods.register('water_source_type')}
                      placeholder="Select water source"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="well">Well/Groundwater</option>
                      <option value="surface">Surface Water (river, lake)</option>
                      <option value="municipal">Municipal/District Water</option>
                      <option value="reservoir">Reservoir/Pond</option>
                      <option value="recycled">Recycled/Reclaimed Water</option>
                      <option value="rainwater">Rainwater Harvesting</option>
                      <option value="multiple">Multiple Sources</option>
                    </Select>
                  </StandardField>

                  <StandardField
                    label="Water Allocation (acre-feet/year)"
                    helpText="Annual water allocation or usage rights"
                    error={errors.water_allocation_acre_feet?.message}
                  >
                    <Controller
                      name="water_allocation_acre_feet"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={0.1}
                          precision={2}
                        >
                          <NumberInputField
                            placeholder="e.g., 25.5"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          />
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
                  label="Water Rights Documentation"
                  helpText="Description of water rights, permits, or agreements"
                  error={errors.water_rights_docs?.message}
                >
                  <Textarea
                    {...methods.register('water_rights_docs')}
                    placeholder="Describe water rights, permit numbers, irrigation district agreements, or other relevant documentation..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="80px"
                  />
                </StandardField>

                {/* Water Quality */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={FaFlask} mr={2} color="blue.500" />
                  Water Quality Parameters
                </Text>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <StandardField
                    label="Water pH"
                    helpText="pH level of irrigation water (0-14)"
                    error={errors.water_quality_ph?.message}
                  >
                    <Controller
                      name="water_quality_ph"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          max={14}
                          step={0.1}
                          precision={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 7.2"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
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
                    label="TDS (ppm)"
                    helpText="Total Dissolved Solids"
                    error={errors.water_quality_tds?.message}
                  >
                    <Controller
                      name="water_quality_tds"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 450"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
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
                    label="Irrigation Efficiency %"
                    helpText="System efficiency percentage (0-100%)"
                    error={errors.irrigation_efficiency?.message}
                  >
                    <Controller
                      name="irrigation_efficiency"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          max={100}
                          step={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 85"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                          />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Water Management */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={MdWaves} mr={2} color="blue.500" />
                  Water Management & Conservation
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Drainage Characteristics"
                    helpText="Soil drainage and water retention"
                    error={errors.drainage_characteristics?.message}
                  >
                    <Select
                      {...methods.register('drainage_characteristics')}
                      placeholder="Select drainage type"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="excellent">Excellent - Fast drainage</option>
                      <option value="good">Good - Moderate drainage</option>
                      <option value="fair">Fair - Slow drainage</option>
                      <option value="poor">Poor - Standing water issues</option>
                      <option value="variable">Variable across parcel</option>
                    </Select>
                  </StandardField>

                  <StandardField
                    label="Seasonal Water Availability"
                    helpText="Water availability throughout the year"
                    error={errors.seasonal_water_availability?.message}
                  >
                    <Select
                      {...methods.register('seasonal_water_availability')}
                      placeholder="Select availability"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="year_round">Year-round availability</option>
                      <option value="seasonal">Seasonal restrictions</option>
                      <option value="summer_limited">Limited in summer</option>
                      <option value="winter_limited">Limited in winter</option>
                      <option value="drought_affected">Drought-affected</option>
                    </Select>
                  </StandardField>
                </SimpleGrid>

                <StandardField
                  label="Water Conservation Practices"
                  helpText="Describe water conservation methods in use"
                  error={errors.water_conservation_practices?.message}
                >
                  <Textarea
                    {...methods.register('water_conservation_practices')}
                    placeholder="Describe drip irrigation, mulching, soil moisture monitoring, deficit irrigation, or other water conservation practices..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="100px"
                  />
                </StandardField>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Soil Health
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(4)}
                    >
                      Continue to Conservation
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 5: Conservation Practices */}
          {currentStep === 5 && (
            <StandardCard
              title="Conservation Practices"
              subtitle="Sustainable farming and environmental conservation methods"
            >
              <VStack spacing={6} align="stretch">
                {/* Crop Management */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mb={2}>
                  <Icon as={FaLeaf} mr={2} color="green.500" />
                  Crop Management Practices
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Cover Crop Management"
                    helpText="Cover crops used and management practices"
                    error={errors.cover_crop_management?.message}
                  >
                    <Textarea
                      {...methods.register('cover_crop_management')}
                      placeholder="Describe cover crops used (legumes, grasses, brassicas), seeding rates, termination methods..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="100px"
                    />
                  </StandardField>

                  <StandardField
                    label="Crop Rotation Pattern"
                    helpText="Multi-year crop rotation sequence"
                    error={errors.crop_rotation_pattern?.message}
                  >
                    <Textarea
                      {...methods.register('crop_rotation_pattern')}
                      placeholder="Describe rotation cycle (e.g., corn-soy-wheat-cover crop), timing, and benefits..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="100px"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Conservation Features */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={FaShieldAlt} mr={2} color="green.500" />
                  Conservation Features
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <VStack align="stretch" spacing={4}>
                    <StandardField label="Buffer Strips & Windbreaks">
                      <HStack>
                        <Switch
                          {...methods.register('buffer_strips_windbreaks')}
                          colorScheme="green"
                          size="md"
                        />
                        <Text fontSize="sm" color="gray.600">
                          {watch('buffer_strips_windbreaks') ? 'Present' : 'Not present'}
                        </Text>
                      </HStack>
                    </StandardField>

                    <StandardField label="Integrated Pest Management (IPM)">
                      <HStack>
                        <Switch
                          {...methods.register('integrated_pest_management')}
                          colorScheme="green"
                          size="md"
                        />
                        <Text fontSize="sm" color="gray.600">
                          {watch('integrated_pest_management') ? 'Implemented' : 'Not implemented'}
                        </Text>
                      </HStack>
                    </StandardField>
                  </VStack>

                  <StandardField
                    label="Organic Certification Status"
                    helpText="Current organic certification status"
                    error={errors.organic_certification_status?.message}
                  >
                    <Select
                      {...methods.register('organic_certification_status')}
                      placeholder="Select certification status"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="certified">USDA Organic Certified</option>
                      <option value="transitional">In Transition (3-year period)</option>
                      <option value="applying">Applying for Certification</option>
                      <option value="conventional">Conventional (not organic)</option>
                      <option value="natural">Natural methods (not certified)</option>
                    </Select>
                  </StandardField>
                </SimpleGrid>

                {/* Government Programs */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={FaRecycle} mr={2} color="green.500" />
                  Government Programs & Carbon Practices
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="NRCS Practices"
                    helpText="NRCS conservation practices implemented"
                    error={errors.nrcs_practices?.message}
                  >
                    <Textarea
                      {...methods.register('nrcs_practices')}
                      placeholder="List NRCS practice codes and descriptions (e.g., CPS 328 - Conservation Crop Rotation)..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="100px"
                    />
                  </StandardField>

                  <StandardField
                    label="Carbon Sequestration Practices"
                    helpText="Practices that enhance carbon storage"
                    error={errors.carbon_sequestration_practices?.message}
                  >
                    <Textarea
                      {...methods.register('carbon_sequestration_practices')}
                      placeholder="Describe no-till, agroforestry, biochar application, or other carbon storage practices..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="100px"
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardField
                  label="Biodiversity Enhancement Measures"
                  helpText="Practices that support biodiversity and wildlife habitat"
                  error={errors.biodiversity_measures?.message}
                >
                  <Textarea
                    {...methods.register('biodiversity_measures')}
                    placeholder="Describe pollinator habitat, native plant corridors, beneficial insect habitat, or other biodiversity initiatives..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="100px"
                  />
                </StandardField>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Water Management
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(5)}
                    >
                      Continue to Land Features
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 6: Advanced Land Characteristics */}
          {currentStep === 6 && (
            <StandardCard
              title="Advanced Land Characteristics"
              subtitle="Topography, climate, and environmental features"
            >
              <VStack spacing={6} align="stretch">
                {/* Topography & Physical Features */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mb={2}>
                  <Icon as={FaMountain} mr={2} color="gray.600" />
                  Topography & Physical Features
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  <StandardField
                    label="Slope Percentage"
                    helpText="Average slope of the parcel (0-100%)"
                    error={errors.slope_percentage?.message}
                  >
                    <Controller
                      name="slope_percentage"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          max={100}
                          step={0.1}
                          precision={1}
                        >
                          <NumberInputField
                            placeholder="e.g., 2.5"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
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
                    label="Topography Type"
                    helpText="Overall land topography"
                    error={errors.topography_type?.message}
                  >
                    <Select
                      {...methods.register('topography_type')}
                      placeholder="Select topography"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="flat">Flat/Level</option>
                      <option value="gently_sloping">Gently Sloping</option>
                      <option value="moderately_sloping">Moderately Sloping</option>
                      <option value="steep">Steep</option>
                      <option value="rolling">Rolling Hills</option>
                      <option value="terraced">Terraced</option>
                      <option value="variable">Variable</option>
                    </Select>
                  </StandardField>

                  <StandardField
                    label="Frost Risk Zone"
                    helpText="Susceptibility to frost damage"
                    error={errors.frost_risk_zone?.message}
                  >
                    <Select
                      {...methods.register('frost_risk_zone')}
                      placeholder="Select frost risk"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                    >
                      <option value="low">Low Risk - Rare frost events</option>
                      <option value="moderate">Moderate Risk - Occasional frost</option>
                      <option value="high">High Risk - Frequent frost</option>
                      <option value="frost_pocket">Frost Pocket - Very high risk</option>
                      <option value="protected">Protected - Natural windbreaks</option>
                    </Select>
                  </StandardField>
                </SimpleGrid>

                {/* Climate & Environment */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={FaThermometerHalf} mr={2} color="orange.500" />
                  Climate & Microenvironment
                </Text>

                <StandardField
                  label="Microclimate Conditions"
                  helpText="Specific microclimate characteristics of this parcel"
                  error={errors.microclimate_conditions?.message}
                >
                  <Textarea
                    {...methods.register('microclimate_conditions')}
                    placeholder="Describe wind patterns, temperature variations, humidity levels, sun exposure, or other microclimate factors..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="100px"
                  />
                </StandardField>

                {/* Environmental Features */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={MdNature} mr={2} color="green.600" />
                  Environmental Features & Designations
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <VStack align="stretch" spacing={4}>
                    <StandardField label="Riparian Zones">
                      <HStack>
                        <Switch
                          {...methods.register('riparian_zones')}
                          colorScheme="green"
                          size="md"
                        />
                        <Text fontSize="sm" color="gray.600">
                          {watch('riparian_zones') ? 'Present' : 'Not present'}
                        </Text>
                      </HStack>
                    </StandardField>

                    <StandardField label="Wetland Designation">
                      <HStack>
                        <Switch
                          {...methods.register('wetland_designation')}
                          colorScheme="green"
                          size="md"
                        />
                        <Text fontSize="sm" color="gray.600">
                          {watch('wetland_designation')
                            ? 'Designated wetland'
                            : 'No wetland designation'}
                        </Text>
                      </HStack>
                    </StandardField>
                  </VStack>

                  <StandardField
                    label="Wildlife Habitat Areas"
                    helpText="Wildlife habitats and protected areas"
                    error={errors.wildlife_habitat_areas?.message}
                  >
                    <Textarea
                      {...methods.register('wildlife_habitat_areas')}
                      placeholder="Describe wildlife corridors, nesting areas, protected species habitat, or conservation easements..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="100px"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Historical & Regulatory */}
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" mt={4} mb={2}>
                  <Icon as={FaChartLine} mr={2} color="purple.500" />
                  Historical Data & Regulations
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Historical Yield Data"
                    helpText="Past production records and trends"
                    error={errors.historical_yield_data?.message}
                  >
                    <Textarea
                      {...methods.register('historical_yield_data')}
                      placeholder="Describe yield trends, average production, best/worst years, and factors affecting yield..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="100px"
                    />
                  </StandardField>

                  <StandardField
                    label="Land Use Restrictions"
                    helpText="Zoning, easements, or other restrictions"
                    error={errors.land_use_restrictions?.message}
                  >
                    <Textarea
                      {...methods.register('land_use_restrictions')}
                      placeholder="Describe zoning restrictions, conservation easements, covenant restrictions, or other limitations..."
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg"
                      minH="100px"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Conservation
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(6)}
                    >
                      Continue to Media & Certification
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 7: Media & Certification */}
          {currentStep === 7 && (
            <StandardCard
              title="Media & Certification"
              subtitle="Upload images and set certification status"
            >
              <VStack spacing={6} align="stretch">
                {/* Image Upload Section with StandardMediaUpload */}
                <StandardField
                  label="Parcel Images"
                  helpText="Upload up to 5 high-quality images (JPG, PNG, GIF - max 5MB each)"
                >
                  <VStack spacing={4}>
                    <StandardMediaUpload
                      onFilesChange={handleFilesChange}
                      acceptedFiles={selectedFiles}
                      uploadedFiles={existingImages.map((img) => img.url)}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      onRemoveFile={handleRemoveSelectedFile}
                      onRemoveUploadedFile={handleRemoveUploadedFile}
                      maxFiles={5}
                      helpText="Upload up to 5 high-quality images. Images help showcase your parcel."
                    />
                    
                    {/* Upload Button for New Images */}
                    {selectedFiles.length > 0 && (
                      <Button
                        onClick={handleImageUpload}
                        isLoading={isUploading}
                        loadingText="Uploading..."
                        colorScheme="green"
                        leftIcon={<FaCloudUploadAlt />}
                        size="lg"
                        w="full"
                      >
                        Upload {selectedFiles.length} Image{selectedFiles.length > 1 ? 's' : ''}
                      </Button>
                    )}
                  </VStack>
                </StandardField>

                {/* Certification */}
                <StandardField
                  label="Certification"
                  helpText="Mark this parcel as certified if it meets certification standards"
                >
                  <VStack align="stretch" spacing={4}>
                    <HStack>
                      <Switch {...methods.register('certified')} colorScheme="green" size="md" />
                      <Text fontSize="sm" color="gray.600">
                        {watch('certified') ? 'Certified Parcel' : 'Not Certified'}
                      </Text>
                    </HStack>

                    {watch('certified') && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label="Contact Number"
                          helpText="For certification inquiries"
                        >
                          <Input
                            {...methods.register('contact_phone')}
                            placeholder="(555) 123-4567"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                        </StandardField>

                        <StandardField label="Certification Address" helpText="Physical address">
                          <Input
                            {...methods.register('address')}
                            placeholder="123 Farm Road, City, State"
                            borderRadius="lg"
                            borderColor="gray.300"
                            _hover={{ borderColor: 'green.400' }}
                            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                            size="lg"
                          />
                        </StandardField>
                      </SimpleGrid>
                    )}
                  </VStack>
                </StandardField>

                {/* Comprehensive Agricultural Summary */}
                <StandardAlert
                  status="info"
                  title="Agricultural Data Summary"
                  description="Review your comprehensive parcel information before submitting."
                />

                <Accordion allowToggle defaultIndex={[0]}>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontWeight="semibold">
                          <Icon as={FaSeedling} mr={2} color="green.500" />
                          Soil Health Summary
                        </Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} fontSize="sm">
                        {watch('soil_ph') && (
                          <Text>
                            <strong>pH:</strong> {watch('soil_ph')}
                          </Text>
                        )}
                        {watch('soil_organic_matter') && (
                          <Text>
                            <strong>Organic Matter:</strong> {watch('soil_organic_matter')}%
                          </Text>
                        )}
                        {watch('soil_nitrogen') && (
                          <Text>
                            <strong>Nitrogen:</strong> {watch('soil_nitrogen')} ppm
                          </Text>
                        )}
                        {watch('soil_phosphorus') && (
                          <Text>
                            <strong>Phosphorus:</strong> {watch('soil_phosphorus')} ppm
                          </Text>
                        )}
                        {watch('soil_potassium') && (
                          <Text>
                            <strong>Potassium:</strong> {watch('soil_potassium')} ppm
                          </Text>
                        )}
                        {watch('soil_compaction_level') && (
                          <Text>
                            <strong>Compaction:</strong> {watch('soil_compaction_level')}
                          </Text>
                        )}
                        {watch('erosion_risk') && (
                          <Text>
                            <strong>Erosion Risk:</strong> {watch('erosion_risk')}
                          </Text>
                        )}
                        {watch('last_soil_test_date') && (
                          <Text>
                            <strong>Last Test:</strong> {watch('last_soil_test_date')}
                          </Text>
                        )}
                      </SimpleGrid>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontWeight="semibold">
                          <Icon as={FaTint} mr={2} color="blue.500" />
                          Water Management Summary
                        </Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} fontSize="sm">
                        {watch('water_source_type') && (
                          <Text>
                            <strong>Source:</strong> {watch('water_source_type')}
                          </Text>
                        )}
                        {watch('water_allocation_acre_feet') && (
                          <Text>
                            <strong>Allocation:</strong> {watch('water_allocation_acre_feet')}{' '}
                            acre-ft/yr
                          </Text>
                        )}
                        {watch('water_quality_ph') && (
                          <Text>
                            <strong>Water pH:</strong> {watch('water_quality_ph')}
                          </Text>
                        )}
                        {watch('irrigation_efficiency') && (
                          <Text>
                            <strong>Efficiency:</strong> {watch('irrigation_efficiency')}%
                          </Text>
                        )}
                        {watch('drainage_characteristics') && (
                          <Text>
                            <strong>Drainage:</strong> {watch('drainage_characteristics')}
                          </Text>
                        )}
                        {watch('seasonal_water_availability') && (
                          <Text>
                            <strong>Availability:</strong> {watch('seasonal_water_availability')}
                          </Text>
                        )}
                      </SimpleGrid>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontWeight="semibold">
                          <Icon as={FaLeaf} mr={2} color="green.500" />
                          Conservation Practices Summary
                        </Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3} fontSize="sm">
                        {watch('organic_certification_status') && (
                          <Text>
                            <strong>Organic Status:</strong> {watch('organic_certification_status')}
                          </Text>
                        )}
                        <HStack spacing={6}>
                          <Text>
                            <strong>IPM:</strong>{' '}
                            {watch('integrated_pest_management') ? 'Yes' : 'No'}
                          </Text>
                          <Text>
                            <strong>Buffer Strips:</strong>{' '}
                            {watch('buffer_strips_windbreaks') ? 'Yes' : 'No'}
                          </Text>
                          <Text>
                            <strong>Riparian Zones:</strong>{' '}
                            {watch('riparian_zones') ? 'Yes' : 'No'}
                          </Text>
                          <Text>
                            <strong>Wetlands:</strong> {watch('wetland_designation') ? 'Yes' : 'No'}
                          </Text>
                        </HStack>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontWeight="semibold">
                          <Icon as={FaMountain} mr={2} color="gray.600" />
                          Land Characteristics Summary
                        </Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} fontSize="sm">
                        {watch('slope_percentage') && (
                          <Text>
                            <strong>Slope:</strong> {watch('slope_percentage')}%
                          </Text>
                        )}
                        {watch('topography_type') && (
                          <Text>
                            <strong>Topography:</strong> {watch('topography_type')}
                          </Text>
                        )}
                        {watch('frost_risk_zone') && (
                          <Text>
                            <strong>Frost Risk:</strong> {watch('frost_risk_zone')}
                          </Text>
                        )}
                      </SimpleGrid>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>

                <StandardAlert
                  status="success"
                  title="Ready to Submit"
                  description="Your comprehensive parcel information is complete. All agricultural data will be saved for carbon calculation and farm management."
                />

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}
                  >
                    Back to Land Features
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={isEdit ? 'Updating...' : 'Creating...'}
                      leftIcon={<FaCheckCircle />}
                    >
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

export default StandardParcelForm;
