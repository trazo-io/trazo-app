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
  S3Image
} from '../Design';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, boolean, number } from 'zod';
import { useIntl } from 'react-intl';
import { GoogleMap, Polygon, Marker, useLoadScript } from '@react-google-maps/api';
import { TrazoImageUpload } from '../Upload';

// ✅ SUPPORTED BACKEND FIELDS CONFIGURATION
const SUPPORTED_PARCEL_FIELDS = {
  // Core fields (supported by backend)
  CORE: [
    'name', // CharField(30)
    'description', // TextField
    'area', // FloatField
    'certified', // BooleanField
    'polygon', // JSONField
    'map_metadata', // JSONField
    'soil_type', // CharField(50)
    'unique_code', // CharField(50)
    'certification_type', // CharField(50)
    'contact_person', // CharField(60)
    'contact_phone', // CharField(30)
    'contact_email', // EmailField
    'address' // CharField(200)
  ],

  // Advanced fields (NOT YET supported - will be hidden)
  ADVANCED: [
    'soil_ph',
    'soil_organic_matter',
    'soil_nitrogen',
    'soil_phosphorus',
    'soil_potassium',
    'soil_compaction_level',
    'erosion_risk',
    'last_soil_test_date',
    'soil_improvement_notes',
    'water_source_type',
    'water_rights_docs',
    'water_allocation_acre_feet',
    'water_quality_ph',
    'water_quality_tds',
    'irrigation_efficiency',
    'drainage_characteristics',
    'water_conservation_practices',
    'seasonal_water_availability',
    'cover_crop_management',
    'crop_rotation_pattern',
    'buffer_strips_windbreaks',
    'integrated_pest_management',
    'organic_certification_status',
    'nrcs_practices',
    'carbon_sequestration_practices',
    'biodiversity_measures',
    'slope_percentage',
    'topography_type',
    'microclimate_conditions',
    'frost_risk_zone',
    'wildlife_habitat_areas',
    'riparian_zones',
    'wetland_designation',
    'historical_yield_data',
    'land_use_restrictions'
  ]
} as const;

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
  FaChartLine,
  FaPhone
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
// ✅ PRODUCTION-READY Schema - Only Backend-Supported Fields
const parcelSchema = object({
  // Step 1: Basic Info (Required)
  name: string().min(1, 'Parcel name is required').max(100, 'Name too long'),
  area: number().min(0.01, 'Area must be greater than 0'),

  // Step 2: Location (Required - polygon validated separately)

  // Step 3: Description (Required)
  description: string().min(1, 'Description is required'),

  // Step 4: Contact & Details (Optional)
  contact_phone: string().optional(),
  contact_person: string().optional(),
  contact_email: string().email('Invalid email format').optional().or(string().length(0)),
  address: string().optional(),

  // Step 5: Agricultural Details (Optional)
  soil_type: string().optional(),
  unique_code: string().optional(),

  // Step 6: Certification (Optional)
  certified: boolean().default(false),
  certification_type: string().optional(),

  // ✅ Advanced Agricultural Fields - NOW SUPPORTED via agricultural_details JSONField
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
  
  // Water Management
  water_source_type: string().optional(),
  water_rights_docs: string().optional(),
  water_allocation_acre_feet: number().min(0).optional(),
  water_quality_ph: number().min(0).max(14).optional(),
  water_quality_tds: number().min(0).optional(),
  irrigation_efficiency: number().min(0).max(100).optional(),
  drainage_characteristics: string().optional(),
  seasonal_water_availability: string().optional(),
  water_conservation_practices: string().optional(),
  
  // Conservation Practices (if needed later)
  cover_crop_management: string().optional(),
  crop_rotation_pattern: string().optional(),
  buffer_strips_windbreaks: string().optional(),
  integrated_pest_management: string().optional(),
  organic_certification_status: string().optional(),
  nrcs_practices: string().optional(),
  carbon_sequestration_practices: string().optional(),
  biodiversity_measures: string().optional(),
  
  // Environmental & Topographic Data (if needed later)
  slope_percentage: number().min(0).max(100).optional(),
  topography_type: string().optional(),
  microclimate_conditions: string().optional(),
  frost_risk_zone: string().optional(),
  wildlife_habitat_areas: string().optional(),
  riparian_zones: string().optional(),
  wetland_designation: string().optional(),
  historical_yield_data: string().optional(),
  land_use_restrictions: string().optional()
});

// ✅ STEP VALIDATION CONFIGURATION - Updated to match actual form steps
const STEP_VALIDATION_CONFIG = [
  {
    stepNumber: 0,
    name: 'Basic Info',
    requiredFields: ['name', 'area'],
    optionalFields: [],
    canSkip: false
  },
  {
    stepNumber: 1,
    name: 'Location',
    requiredFields: [], // polygon validated separately
    optionalFields: [],
    canSkip: false,
    customValidation: 'polygon'
  },
  {
    stepNumber: 2,
    name: 'Description',
    requiredFields: ['description'],
    optionalFields: [],
    canSkip: false
  },
  {
    stepNumber: 3,
    name: 'Soil Health Management',
    requiredFields: [],
    optionalFields: ['soil_ph', 'soil_organic_matter', 'soil_nitrogen', 'soil_phosphorus', 'soil_potassium', 'soil_compaction_level', 'erosion_risk', 'last_soil_test_date', 'soil_improvement_notes'],
    canSkip: true
  },
  {
    stepNumber: 4,
    name: 'Water Management',
    requiredFields: [],
    optionalFields: ['water_source_type', 'water_rights_docs', 'water_allocation_acre_feet', 'water_quality_ph', 'water_quality_tds', 'irrigation_efficiency', 'drainage_characteristics', 'seasonal_water_availability', 'water_conservation_practices'],
    canSkip: true
  },
  {
    stepNumber: 5,
    name: 'Details & Media',
    requiredFields: [],
    optionalFields: ['soil_type', 'unique_code', 'certified', 'certification_type'],
    canSkip: true
  }
] as const;

// ✅ COMPREHENSIVE Interface - All Backend-Supported Fields
interface ParcelFormData {
  // Core required fields
  name: string;
  area: number;
  description: string;

  // Contact details (optional)
  contact_phone?: string;
  contact_person?: string;
  contact_email?: string;
  address?: string;

  // Agricultural details (optional)
  soil_type?: string;
  unique_code?: string;

  // Certification (optional)
  certified: boolean;
  certification_type?: string;

  // Media (optional)
  images?: string[];

  // System fields
  polygon?: Array<{ lat: number; lng: number }>;
  map_metadata?: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  establishment?: number;

  // ✅ NEW: Advanced Agricultural Data for Carbon Calculations
  // Soil Analysis
  soil_ph?: number;
  soil_organic_matter?: number;
  soil_nitrogen?: number;
  soil_phosphorus?: number;
  soil_potassium?: number;
  soil_compaction_level?: string;
  erosion_risk?: string;
  last_soil_test_date?: string;
  soil_improvement_notes?: string;

  // Water Management
  water_source_type?: string;
  water_rights_docs?: string;
  water_allocation_acre_feet?: number;
  water_quality_ph?: number;
  water_quality_tds?: number;
  irrigation_efficiency?: number;
  drainage_characteristics?: string;
  seasonal_water_availability?: string;
  water_conservation_practices?: string;

  // Conservation Practices
  cover_crop_management?: string;
  crop_rotation_pattern?: string;
  buffer_strips_windbreaks?: string;
  integrated_pest_management?: string;
  organic_certification_status?: string;
  nrcs_practices?: string;
  carbon_sequestration_practices?: string;
  biodiversity_measures?: string;

  // Environmental & Topographic
  slope_percentage?: number;
  topography_type?: string;
  microclimate_conditions?: string;
  frost_risk_zone?: string;
  wildlife_habitat_areas?: string;
  riparian_zones?: string;
  wetland_designation?: string;
  historical_yield_data?: string;
  land_use_restrictions?: string;

  // ✅ NEW: Carbon Calculation System Fields
  agricultural_details?: Record<string, any>;
  carbon_calculation_enabled?: boolean;
  usda_compliance_eligible?: boolean;
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
  // ✅ Initialize useForm first to make watch() available
  const methods = useForm<ParcelFormData>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      // Core required fields
      name: '',
      area: 0,
      description: '',

      // Contact details (optional)
      contact_phone: '',
      contact_person: '',
      contact_email: '',
      address: '',

      // Agricultural details (optional)
      soil_type: '',
      unique_code: '',

      // Certification (optional)
      certified: false,
      certification_type: '',

      // Media (optional)
      images: [],
      
      // ✅ Advanced Agricultural Fields (optional)
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
      
      // Water Management
      water_source_type: '',
      water_rights_docs: '',
      water_allocation_acre_feet: undefined,
      water_quality_ph: undefined,
      water_quality_tds: undefined,
      irrigation_efficiency: undefined,
      drainage_characteristics: '',
      seasonal_water_availability: '',
      water_conservation_practices: '',

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

  // ✅ Helper function to safely get polygon properties
  const getPolygonLength = () => polygon && Array.isArray(polygon) ? polygon.length : 0;
  const isValidPolygon = () => getPolygonLength() >= 3;

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

  // Image upload state integrated with form
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  
  // Watch for images field in form
  const currentImages = watch('images') || [];

  const intl = useIntl();
  const toast = useToast();

  const polygonRef = useRef<google.maps.Polygon>();
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: options.googleMapApiKey
  });
  
  // ✅ Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('🔄 Resetting form with initial data:', initialData);
      reset(initialData);
      
      // Also update polygon state
      if (initialData.polygon) {
        setPolygon(initialData.polygon);
      }
      
      // Update map center if available
      if (initialData.map_metadata?.center) {
        setMapCenter(initialData.map_metadata.center);
      }
      
      // Update map zoom if available
      if (initialData.map_metadata?.zoom) {
        setMapZoom(initialData.map_metadata.zoom);
      }
      
      // Update images if available
      if (initialData.images && initialData.images.length > 0) {
        setUploadedImageUrls(initialData.images);
      }
    }
  }, [initialData, reset]);

  // ✅ UPDATED Steps - Only Backend-Supported Features
  const steps = [
    { title: 'Basic Info', description: 'Name, area & location', icon: FaBuilding, required: true },
    { title: 'Location', description: 'Map & boundaries', icon: FaMapMarkedAlt, required: true },
    {
      title: 'Description',
      description: 'Details & characteristics',
      icon: MdInfo,
      required: true
    },
    {
      title: 'Soil Health',
      description: 'Soil analysis & nutrients',
      icon: FaSeedling,
      required: false
    },
    {
      title: 'Water Management',
      description: 'Water rights & quality',
      icon: FaTint,
      required: false
    },
    {
      title: 'Details & Media',
      description: 'Codes, images & certification',
      icon: FaCertificate,
      required: false
    }
  ];

  // ✅ STEP VALIDATION FUNCTIONS
  const validateStep = (stepNumber: number, formData: any): boolean => {
    const stepConfig = STEP_VALIDATION_CONFIG[stepNumber];
    if (!stepConfig) return true;

    // Check required fields
    for (const field of stepConfig.requiredFields) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return false;
      }
    }

    // Custom validation for polygon
    if (stepConfig.customValidation === 'polygon' && !polygon?.length) {
      return false;
    }

    return true;
  };

  const canNavigateToStep = (targetStep: number): boolean => {
    const formData = watch();

    // Always allow navigation backwards
    if (targetStep <= currentStep) return true;

    // For forward navigation, validate all intermediate steps
    for (let step = currentStep; step < targetStep; step++) {
      const stepConfig = STEP_VALIDATION_CONFIG[step];
      if (!stepConfig?.canSkip && !validateStep(step, formData)) {
        return false;
      }
    }

    return true;
  };

  const getStepStatus = (
    stepNumber: number
  ): 'completed' | 'current' | 'incomplete' | 'disabled' => {
    if (stepNumber < currentStep) {
      return validateStep(stepNumber, watch()) ? 'completed' : 'incomplete';
    }
    if (stepNumber === currentStep) return 'current';
    return canNavigateToStep(stepNumber) ? 'disabled' : 'disabled';
  };

  // Form methods were already initialized at the top of the component

  // Update form when initialData changes - Simplified approach
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const formData = {
        certified: false,
        area: 0,
        name: '',
        description: '',
        contact_phone: '',
        address: '',
        soil_type: '',
        unique_code: '',
        certification_type: '',
        contact_person: '',
        contact_email: '',
        images: [],
        ...initialData
      };

      reset(formData);

      // Handle existing images for edit mode
      if (isEdit && initialData.images) {
        const imageUrls = Array.isArray(initialData.images) 
          ? initialData.images.map((img: any) => (typeof img === 'string' ? img : img.url || img.image_url)).filter(Boolean)
          : [];
        setUploadedImageUrls(imageUrls);
        setValue('images', imageUrls);
      }
    }
  }, [initialData, reset, isEdit, setValue]);

  // Update map center and zoom when polygon changes
  useEffect(() => {
    if (getPolygonLength() >= 3) {
      const newCenter = calculatePolygonCenter(polygon);
      const newZoom = calculatePolygonZoom(polygon);
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    }
  }, [polygon]);

  // Sync uploadedImageUrls with form images field for persistence
  useEffect(() => {
    const formImages = watch('images') || [];
    if (formImages.length > 0 && formImages !== uploadedImageUrls) {
      setUploadedImageUrls(formImages);
    }
  }, [currentImages, uploadedImageUrls, watch]);

  // Handle image changes from TrazoImageUpload
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

  const onSubmitForm = (data: ParcelFormData) => {
    try {
      // Use images from form state, fallback to uploadedImageUrls state
      const imageUrls = data.images && data.images.length > 0 ? data.images : uploadedImageUrls;
      
      const finalData = {
        ...data,
        polygon,
        map_metadata: {
          center: mapCenter,
          zoom: mapZoom
        },
        images: imageUrls,
        uploaded_image_urls: imageUrls // Keep for backward compatibility
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
        return isValidPolygon();

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

  // ✅ IMPROVED Navigation with Validation
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      // Use dynamic step count
      const formData = watch();

      // Validate current step before proceeding
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

  // ✅ NEW: Direct step navigation with validation
  const goToStep = (stepNumber: number) => {
    if (canNavigateToStep(stepNumber)) {
      setCurrentStep(stepNumber);
    } else {
      toast({
        title: 'Complete Required Steps',
        description: 'Please complete all required fields in previous steps before skipping ahead.',
        status: 'warning',
        duration: 4000,
        isClosable: true
      });
    }
  };

  return (
    <StandardPage
      title={isEdit ? 'Edit Parcel' : 'Add New Parcel'}
      description={`${isEdit ? 'Update' : 'Create'} a parcel${
        establishmentName ? ` in ${establishmentName}` : ''
      }`}
      showBackButton
      onBack={onCancel}>
      {/* Modern Progress Stepper */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        onStepClick={goToStep}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitForm)}>
          {/* ✅ STEP 0: Basic Information */}
          {currentStep === 0 && (
            <StandardCard title="Parcel Information" subtitle="Basic details about your parcel">
              <VStack spacing={6} align="stretch">
                {/* Name & Area */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Parcel Name"
                    required
                    error={errors.name?.message}
                    helpText="Unique name for this parcel">
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
                    helpText="Total area in acres">
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

                {/* Progress Info */}
                <StandardAlert
                  status="success"
                  title="Ready for Location Mapping"
                  description="Basic parcel information captured. Click 'Next' to define the geographic boundaries on the map."
                />

                {/* Navigation */}
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
                        // Improved map click handler with better UX
                        if (e.latLng) {
                          const newPoint = {
                            lat: e.latLng.lat(),
                            lng: e.latLng.lng()
                          };
                          
                          // Add point to polygon
                          const updatedPolygon = [...polygon, newPoint];
                          setPolygon(updatedPolygon);
                          
                          // Update form field for persistence
                          setValue('polygon', updatedPolygon);
                          
                          // Save map metadata
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
                        clickableIcons: false, // Prevent poi clicks from interfering
                        mapTypeId: 'satellite' // Better for agricultural land visualization
                      }}>
                      {getPolygonLength() > 2 && (
                        <Polygon
                          path={polygon}
                          onLoad={onLoadPolygon}
                          onUnmount={onUnmount}
                          options={{
                            fillColor: isValidPolygon() ? '#22C55E' : '#F59E0B', // Green when valid, orange when incomplete
                            fillOpacity: 0.25,
                            strokeColor: isValidPolygon() ? '#16A34A' : '#D97706',
                            strokeOpacity: 1,
                            strokeWeight: 2,
                            editable: true,
                            draggable: true
                          }}
                        />
                      )}
                      
                      {/* Add visual markers for each point */}
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
                            // Allow removing individual points by clicking them
                            const newPolygon = polygon && Array.isArray(polygon) ? polygon.filter((_, i) => i !== index) : [];
                            setPolygon(newPolygon);
                            setValue('polygon', newPolygon);
                          }}
                        />
                      ))}
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

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Basic Info
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(1)}>
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
              subtitle="Detailed information about the parcel">
              <VStack spacing={6} align="stretch">
                {/* Description */}
                <StandardField
                  label="Description"
                  required
                  error={errors.description?.message}
                  helpText="Describe the parcel, its characteristics, soil type, drainage, etc.">
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
                    helpText="Type of soil in this parcel">
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
                    helpText="Internal parcel identifier or code">
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
                    helpText="Type of agricultural certification">
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
                  helpText="Specific address or location reference">
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
                    helpText="Person responsible for this parcel">
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
                    helpText="Contact email for this parcel">
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


                {/* Navigation */}
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
                      disabled={!isStepComplete(2)}>
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
              subtitle="Soil composition, nutrients, and testing information">
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
                    error={errors.soil_ph?.message}>
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
                          precision={1}>
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
                    error={errors.soil_organic_matter?.message}>
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
                          precision={1}>
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
                    error={errors.last_soil_test_date?.message}>
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
                    error={errors.soil_nitrogen?.message}>
                    <Controller
                      name="soil_nitrogen"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}>
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
                    error={errors.soil_phosphorus?.message}>
                    <Controller
                      name="soil_phosphorus"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}>
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
                    error={errors.soil_potassium?.message}>
                    <Controller
                      name="soil_potassium"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}>
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
                    error={errors.soil_compaction_level?.message}>
                    <Select
                      {...methods.register('soil_compaction_level')}
                      placeholder="Select compaction level"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg">
                      <option value="low">Low - No significant compaction</option>
                      <option value="moderate">Moderate - Some compaction present</option>
                      <option value="high">High - Significant compaction issues</option>
                      <option value="severe">Severe - Major compaction requiring treatment</option>
                    </Select>
                  </StandardField>

                  <StandardField
                    label="Erosion Risk"
                    helpText="Assessment of erosion susceptibility"
                    error={errors.erosion_risk?.message}>
                    <Select
                      {...methods.register('erosion_risk')}
                      placeholder="Select erosion risk"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg">
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
                  error={errors.soil_improvement_notes?.message}>
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
                    onClick={previousStep}>
                    Back to Description
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(3)}>
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
              subtitle="Water sources, allocation, and conservation practices">
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
                    error={errors.water_source_type?.message}>
                    <Select
                      {...methods.register('water_source_type')}
                      placeholder="Select water source"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg">
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
                    error={errors.water_allocation_acre_feet?.message}>
                    <Controller
                      name="water_allocation_acre_feet"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={0.1}
                          precision={2}>
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
                  error={errors.water_rights_docs?.message}>
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
                    error={errors.water_quality_ph?.message}>
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
                          precision={1}>
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
                    error={errors.water_quality_tds?.message}>
                    <Controller
                      name="water_quality_tds"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          step={1}>
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
                    error={errors.irrigation_efficiency?.message}>
                    <Controller
                      name="irrigation_efficiency"
                      control={methods.control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || ''}
                          onChange={(_, num) => field.onChange(num)}
                          min={0}
                          max={100}
                          step={1}>
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
                    error={errors.drainage_characteristics?.message}>
                    <Select
                      {...methods.register('drainage_characteristics')}
                      placeholder="Select drainage type"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg">
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
                    error={errors.seasonal_water_availability?.message}>
                    <Select
                      {...methods.register('seasonal_water_availability')}
                      placeholder="Select availability"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'green.400' }}
                      _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                      size="lg">
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
                  error={errors.water_conservation_practices?.message}>
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
                    onClick={previousStep}>
                    Back to Soil Health
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      onClick={nextStep}
                      rightIcon={<FaChevronRight />}
                      disabled={!isStepComplete(4)}>
                      Continue to Conservation
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* Step 5: Certification & Media */}
          {currentStep === 5 && (
            <StandardCard
              title="Certification & Media"
              subtitle="Upload images and set certification status">
              <VStack spacing={6} align="stretch">
                {/* 2025 Modern Image Upload */}
                <StandardField
                  label="Parcel Images"
                  helpText="Upload up to 5 high-quality images (JPG, PNG, GIF, WEBP - max 5MB each)">
                  <TrazoImageUpload
                    maxFiles={5}
                    maxSize={5 * 1024 * 1024} // 5MB
                    existingImages={currentImages.length > 0 ? currentImages : uploadedImageUrls}
                    onImagesChange={handleImagesChange}
                    isLoading={false}
                  />
                </StandardField>

                {/* Certification */}
                <StandardField
                  label="Certification"
                  helpText="Mark this parcel as certified if it meets certification standards">
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
                          helpText="For certification inquiries">
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

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Agricultural Details
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

export default StandardParcelForm;
