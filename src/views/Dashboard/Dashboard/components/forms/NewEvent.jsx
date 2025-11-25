/*!

=========================================================
* Purity UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/purity-ui-dashboard-pro
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)

* Design by Creative Tim & Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Chakra imports
import {
  Box,
  Button,
  Select as ChakraSelect,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  useColorModeValue,
  VStack,
  HStack,
  Badge,
  Progress,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Spinner,
  Grid,
  Circle
} from '@chakra-ui/react';
import { BsCircleFill, BsFillCloudLightningRainFill } from 'react-icons/bs';
import {
  FaLeaf,
  FaCamera,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaTools,
  FaSeedling,
  FaBusinessTime,
  FaBug,
  FaInfoCircle,
  FaEye
} from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { clearForm, setForm } from 'store/features/formSlice';
import { object, string } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardStepper
} from 'components/Design/StandardComponents';
import { TrazoImageUpload } from 'components/Upload';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import CardWithMap from '../CardWithMap';
import ChemicalTab from './ChemicalTab-ENHANCED';
import FormLayout from 'components/Forms/FormLayout';
import GeneralTab from './GeneralTab';
import EquipmentTab from './EquipmentTab';
import SoilManagementTab from './SoilManagementTab';
import BusinessTab from './BusinessTab-SIMPLIFIED';
import PestManagementTab from './PestManagementTab';
import Header from 'views/Pages/Profile/Overview/components/Header';
import ProductionTab from './ProductionTab';
import ProfileBgImage from 'assets/img/ProfileBackground.png';
import { RocketIcon } from 'components/Icons/Icons';
import Select from 'react-select';
import { SlChemistry } from 'react-icons/sl';
import WeatherTab from './WeatherTab';
import { addCompanyEstablishment } from 'store/features/companySlice';
import avatar4 from 'assets/img/avatars/avatar4.png';
import imageMap from 'assets/img/imageMap.png';
import {
  useCreateEventMutation,
  useGetEventQuery,
  useUpdateEventMutation
} from 'store/api/historyApi';
import { useCalculateEventCarbonImpactMutation } from 'store/api/carbonApi';
import { CarbonImpactPreview } from 'components/Events/CarbonImpactPreview';
import { EventPreviewModal } from 'components/Events/EventPreviewModal';
import { useGoogleMap } from '@react-google-maps/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// Enhanced form schemas with better validation
const formSchemaBasic = object({
  date: string().min(1, 'Date is required')
});

const formSchemaMainInfo = object({
  type: string().min(1, 'Event type is required')
});

// Removed formSchemaDescription - observations are now handled in individual event tabs

const formSchemaMedia = object({});

// Event type configuration
const eventTypeConfig = [
  {
    id: 0,
    name: 'weather',
    label: 'Weather',
    icon: BsFillCloudLightningRainFill,
    color: 'blue',
    description: 'Weather events affecting your crops'
  },
  {
    id: 1,
    name: 'production',
    label: 'Production',
    icon: RocketIcon,
    color: 'green',
    description: 'Agricultural production activities'
  },
  {
    id: 2,
    name: 'chemical',
    label: 'Chemical',
    icon: SlChemistry,
    color: 'purple',
    description: 'Chemical applications and treatments'
  },
  {
    id: 3,
    name: 'general',
    label: 'General',
    icon: FaEdit,
    color: 'green',
    description: 'Other farming activities'
  },
  {
    id: 4,
    name: 'equipment',
    label: 'Equipment',
    icon: FaTools,
    color: 'orange',
    description: 'Equipment maintenance and fuel tracking'
  },
  {
    id: 5,
    name: 'soil_management',
    label: 'Soil Management',
    icon: FaSeedling,
    color: 'green',
    description: 'Soil testing and amendments'
  },
  {
    id: 6,
    name: 'pest_management',
    label: 'Pest Management',
    icon: FaBug,
    color: 'red',
    description: 'IPM practices and beneficial releases'
  },
  {
    id: 7,
    name: 'business',
    label: 'Business',
    icon: FaBusinessTime,
    color: 'teal',
    description: 'Sales, certifications, and compliance'
  }
];

// Step configuration - Streamlined for mobile efficiency
const steps = [
  { title: 'Basic Info', description: 'Event type & date' },
  { title: 'Event Details', description: 'Specific information & observations' },
  { title: 'Photos', description: 'Documentation (optional)' }
];

function NewEvent({ isEdit = false, eventId = null }) {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { parcelId, establishmentId } = useParams();
  const [searchParams] = useSearchParams();

  // Get event type from URL parameters when editing
  const eventTypeFromUrl = searchParams.get('event_type');

  // Theme colors
  const textColor = useColorModeValue('gray.700', 'white');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // State management
  const [activeEventType, setActiveEventType] = useState(
    eventTypeFromUrl ? parseInt(eventTypeFromUrl) : 0
  );
  const [carbonCalculation, setCarbonCalculation] = useState(null);
  const [isCalculatingCarbon, setIsCalculatingCarbon] = useState(false);
  const [eventFormData, setEventFormData] = useState({});
  const [shouldShowCarbonTips, setShouldShowCarbonTips] = useState(false);

  // Preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // File upload state - declare early to avoid initialization issues
  const [acceptedFiles, setAcceptedFiles] = useState([]);

  // Redux state
  const currentEvent = useSelector((state) => state.form.currentForm?.event);
  const currentCompany = useSelector((state) => state.company.currentCompany);

  // Step management
  const [activeStep, setActiveStep] = useState(0);

  // Form methods for each step
  const basicMethods = useForm({
    resolver: zodResolver(formSchemaBasic),
    defaultValues: {
      date: new Date().toISOString().slice(0, 16)
    }
  });

  const mainInfoMethods = useForm({
    resolver: zodResolver(formSchemaMainInfo)
  });

  // Removed descriptionMethods - observations handled in event tabs

  const mediaMethods = useForm({
    resolver: zodResolver(formSchemaMedia)
  });

  // API mutations
  const [createEvent, { isLoading: isCreatingEvent, isSuccess: isCreateSuccess }] =
    useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdatingEvent, isSuccess: isUpdateSuccess }] =
    useUpdateEventMutation();
  const [calculateCarbonImpact, { isLoading: isCalculating }] =
    useCalculateEventCarbonImpactMutation();

  // Load existing event data when editing - now using event type from URL
  const {
    data: existingEvent,
    isLoading: isLoadingEvent,
    error: eventError
  } = useGetEventQuery(
    {
      companyId: currentCompany?.id,
      establishmentId: parseInt(establishmentId || '0'),
      eventId: parseInt(eventId || '0'),
      eventType: eventTypeFromUrl ? parseInt(eventTypeFromUrl) : undefined
    },
    {
      skip: !isEdit || !currentCompany?.id || !eventId || !eventTypeFromUrl
    }
  );

  // Parcel data
  const parcels = useSelector((state) =>
    state.company.currentCompany?.establishments?.reduce((res_parcels, establishment) => {
      const establishmentParcels = establishment.parcels
        .filter((parcel) => parcel.has_current_production)
        .map((parcel) => {
          if (parcel.id === Number(parcelId)) {
            return {
              value: parcel.id,
              label: parcel.name,
              isFixed: true
            };
          }
          return {
            value: parcel.id,
            label: parcel.name
          };
        });
      return res_parcels.concat(establishmentParcels);
    }, [])
  );

  // Carbon calculation with debouncing
  const carbonTimeoutRef = useRef(null);

  const calculateCarbonWithDebounce = useCallback(
    async (formData, eventType) => {
      console.log('🧮 calculateCarbonWithDebounce called:', { eventType, formDataKeys: Object.keys(formData || {}) });
      if (!formData || Object.keys(formData).length === 0) {
        console.log('🧮 No form data, clearing calculation');
        setCarbonCalculation(null);
        setShouldShowCarbonTips(false);
        return;
      }

      // 2025 PERFORMANCE: Clear previous timeout to prevent memory leaks
      if (carbonTimeoutRef.current) {
        clearTimeout(carbonTimeoutRef.current);
        carbonTimeoutRef.current = null;
      }

      carbonTimeoutRef.current = setTimeout(async () => {
        // Map event type to backend format (FIXED MAPPING TO MATCH backend constants)
        const eventTypeMap = {
          0: 'weather', // WEATHER_EVENT_TYPE = 0
          1: 'production', // PRODUCTION_EVENT_TYPE = 1
          2: 'chemical', // CHEMICAL_EVENT_TYPE = 2
          3: 'general', // GENERAL_EVENT_TYPE = 3
          4: 'equipment', // EQUIPMENT_EVENT_TYPE = 4
          5: 'soil_management', // SOIL_MANAGEMENT_EVENT_TYPE = 5
          6: 'pest_management', // ✅ FIXED: PEST_MANAGEMENT_EVENT_TYPE = 6
          7: 'business' // ✅ FIXED: BUSINESS_EVENT_TYPE = 7
        };

        try {
          setIsCalculatingCarbon(true);

          const event_type = eventTypeMap[eventType] || 'general';

          const event_data = {
            ...formData,
            date: formData.date || new Date().toISOString().slice(0, 16),
            event_type: event_type,
            // Add parcel context for better calculations
            parcel_id: parseInt(parcelId || '0'),
            establishment_id: parseInt(establishmentId || '0')
          };

          const result = await calculateCarbonImpact({
            event_type,
            event_data
          }).unwrap();

          setCarbonCalculation(result);
          setShouldShowCarbonTips(true);
        } catch (error) {
          console.error('Carbon calculation failed:', error);
          // Set fallback calculation based on event type
          const fallbackScores = {
            0: { co2e: 0.1, efficiency_score: 75 }, // Weather - minimal impact
            1: { co2e: 2.5, efficiency_score: 60 }, // Production - moderate impact
            2: { co2e: 1.8, efficiency_score: 50 }, // Chemical - higher impact
            3: { co2e: 0.5, efficiency_score: 70 }, // General - low impact
            4: { co2e: 1.0, efficiency_score: 60 }, // Equipment - moderate impact
            5: { co2e: 0.3, efficiency_score: 80 }, // Soil Management - high impact
            6: { co2e: 0.8, efficiency_score: 50 }, // Pest Management - moderate impact
            7: { co2e: 0.2, efficiency_score: 90 } // Business - very high impact
          };

          const fallback = fallbackScores[eventType] || fallbackScores[3];

          setCarbonCalculation({
            co2e: fallback.co2e,
            efficiency_score: fallback.efficiency_score,
            usda_verified: false,
            calculation_method: 'estimate',
            event_type: eventTypeMap[eventType] || 'general',
            timestamp: new Date().toISOString(),
            estimated_cost: fallback.co2e * 50, // Rough cost estimate
            warning: 'Using estimated values - calculations temporarily unavailable'
          });
          setShouldShowCarbonTips(true);
        } finally {
          setIsCalculatingCarbon(false);
          carbonTimeoutRef.current = null; // 2025 PERFORMANCE: Clean reference after completion
        }
      }, 300); // 2025 UX: Reduced delay for better responsiveness
    },
    [] // FIXED: Removed all dependencies - RTK mutations are stable and useParams() recreates objects on every render
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (carbonTimeoutRef.current) {
        clearTimeout(carbonTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to map backend event types to frontend codes
  const mapBackendTypeToFrontendCode = (backendType) => {
    if (!backendType) return '';

    // Map verbose backend types to frontend codes
    const typeMap = {
      'event.chemical.fertilizer': 'FE',
      'event.chemical.pesticide': 'PE',
      'event.chemical.fungicide': 'FU',
      'event.chemical.herbicide': 'HE'
    };

    // If it's already a code (FE, PE, FU, HE), return it as is
    if (['FE', 'PE', 'FU', 'HE'].includes(backendType)) {
      return backendType;
    }

    // Otherwise, try to map it
    return typeMap[backendType] || '';
  };

  // Load existing event data and pre-fill forms when editing
  const hasLoadedExistingData = useRef(false);

  useEffect(() => {
    if (isEdit && existingEvent && !hasLoadedExistingData.current) {
      console.log('[NewEvent] Loading existing event data:', existingEvent);
      console.log(
        '[NewEvent] RAW existingEvent.type:',
        existingEvent.type,
        typeof existingEvent.type
      );
      console.log(
        '[NewEvent] RAW existingEvent.volume_applied:',
        existingEvent.volume_applied,
        typeof existingEvent.volume_applied
      );
      console.log(
        '[NewEvent] RAW existingEvent.area_treated:',
        existingEvent.area_treated,
        typeof existingEvent.area_treated
      );
      console.log(
        '[NewEvent] RAW existingEvent.application_method:',
        existingEvent.application_method,
        typeof existingEvent.application_method
      );

      const eventDate = existingEvent.date
        ? new Date(existingEvent.date).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);

      // Map backend type to frontend code
      const mappedType = mapBackendTypeToFrontendCode(existingEvent.type);
      console.log('[NewEvent] Mapped type from', existingEvent.type, 'to', mappedType);

      // Update form data state with comprehensive data mapping
      // IMPORTANT: Use spread operator to preserve ALL fields from existingEvent,
      // including weather-specific fields (water_deficit, highest_temperature, etc.)
      const initialData = {
        ...existingEvent, // Include all fields from backend (weather, production, etc.)
        date: eventDate,
        // Override type field with frontend code mapping for Chemical events
        type: mappedType || existingEvent.type, // Preserve original type if no mapping found
        // Chemical event specific overrides
        commercial_name: existingEvent.commercial_name || existingEvent.name || '',
        active_ingredient: existingEvent.active_ingredient || '',
        concentration: existingEvent.concentration || '',
        // Safely handle numeric fields that might be undefined
        volume_applied:
          existingEvent.volume_applied !== undefined && existingEvent.volume_applied !== null
            ? existingEvent.volume_applied
            : '',
        volume_unit: existingEvent.volume_unit || 'L',
        area_treated:
          existingEvent.area_treated !== undefined && existingEvent.area_treated !== null
            ? existingEvent.area_treated
            : '',
        area_unit: existingEvent.area_unit || 'ha',
        application_method: existingEvent.application_method || '',
        weather_conditions: existingEvent.weather_conditions || '',
        application_timing: existingEvent.application_timing || '',
        target_pest_disease: existingEvent.target_pest_disease || '',
        description: existingEvent.description || ''
      };

      console.log('[NewEvent] Processed initialData:', initialData);
      console.log('[NewEvent] initialData.type:', initialData.type, typeof initialData.type);
      console.log(
        '[NewEvent] initialData.volume_applied:',
        initialData.volume_applied,
        typeof initialData.volume_applied
      );
      console.log(
        '[NewEvent] initialData.area_treated:',
        initialData.area_treated,
        typeof initialData.area_treated
      );
      console.log('[NewEvent] Setting eventFormData with initialData');

      // Set form data directly - no two-phase update needed
      setEventFormData(initialData);

      // Reset forms with existing data
      basicMethods.reset({
        date: eventDate
      });

      // Set event type from existing data
      const eventTypeFromData =
        existingEvent.event_type !== undefined ? existingEvent.event_type : 0;
      console.log('[NewEvent] Setting activeEventType:', eventTypeFromData);
      setActiveEventType(eventTypeFromData);

      // Store in Redux
      dispatch(
        setForm({
          event: {
            ...initialData
          }
        })
      );

      // Calculate carbon impact for existing data
      calculateCarbonWithDebounce(initialData, eventTypeFromData);

      // Mark as loaded to prevent re-initialization
      hasLoadedExistingData.current = true;
      console.log('[NewEvent] Existing event data loaded successfully');
    }
  }, [isEdit, existingEvent, basicMethods, dispatch]);

  // Form submission handlers
  const onSubmitBasic = (data) => {
    const updatedData = { ...eventFormData, ...data, event_type: activeEventType };
    setEventFormData(updatedData);

    // Store in Redux
    dispatch(
      setForm({
        event: {
          ...currentEvent,
          ...updatedData
        }
      })
    );

    // Calculate carbon impact
    calculateCarbonWithDebounce(updatedData, activeEventType);

    setActiveStep(1);
  };

  const onSubmitMainInfo = (data) => {
    const updatedData = { ...eventFormData, ...data };
    setEventFormData(updatedData);

    dispatch(
      setForm({
        event: {
          ...currentEvent,
          ...updatedData
        }
      })
    );

    // Recalculate carbon with new data
    calculateCarbonWithDebounce(updatedData, activeEventType);

    setActiveStep(2);
  };

  // Handle tab form submission (Event Details step)
  const onSubmitTab = (data) => {
    const updatedData = { ...eventFormData, ...data };
    setEventFormData(updatedData);

    dispatch(
      setForm({
        event: {
          ...currentEvent,
          ...updatedData
        }
      })
    );

    // Recalculate carbon with new data
    calculateCarbonWithDebounce(updatedData, activeEventType);

    // Move directly to Photos step (skip redundant description)
    setActiveStep(2);
  };

  // Handle real-time data changes from event tabs (for carbon preview updates)
  const onDataChange = useCallback(
    (data) => {
      console.log('🔥 onDataChange triggered:', { activeEventType, dataKeys: Object.keys(data || {}) });
      // Use functional update to avoid stale closure
      setEventFormData((prevData) => {
        const updatedData = { ...prevData, ...data };

        // Update Redux store for consistency - use current state snapshot
        dispatch(
          setForm({
            event: {
              ...prevData, // Use the previous data snapshot instead of currentEvent
              ...updatedData
            }
          })
        );

        // FIXED: Weather events (activeEventType === 0) do NOT trigger carbon calculations
        // Weather data is environmental context, not a source of carbon emissions
        // Only trigger carbon calculation for event types that actually produce emissions
        if (activeEventType !== 0) {
          console.log('🔥 Triggering carbon calculation for type:', activeEventType);
          // Recalculate carbon with new data (debounced)
          calculateCarbonWithDebounce(updatedData, activeEventType);
        }

        return updatedData;
      });
    },
    [activeEventType, dispatch] // FIXED: Removed calculateCarbonWithDebounce to prevent circular dependency
  );

  // Removed debug logging to reduce console noise

  // Form restoration effect - restore form data when navigating between steps
  useEffect(() => {
    if (activeStep === 1 && eventFormData && Object.keys(eventFormData).length > 0) {
      // WeatherTab manages its own form restoration via initialValues prop
      // No need to reset mainInfoMethods here as it can cause conflicts
      console.log('🔄 Restoring form data for step 2 via initialValues:', eventFormData);
    }

    // Also restore basic form data when going back to step 0
    if (activeStep === 0 && eventFormData && eventFormData.date) {
      console.log('🔄 Restoring basic form data for step 1:', { date: eventFormData.date });
      const currentBasicValues = basicMethods.getValues();
      if (
        !currentBasicValues.date ||
        currentBasicValues.date === new Date().toISOString().slice(0, 16)
      ) {
        basicMethods.reset({ date: eventFormData.date });
      }
    }

    // Restore photo data when going back to step 2 (where photos are uploaded)
    if (activeStep === 1 && eventFormData && eventFormData.acceptedFiles) {
      console.log('🔄 Restoring photo data for step 2:', eventFormData.acceptedFiles);
      // Always restore photos when going back to step 2 to ensure consistency
      if (eventFormData.acceptedFiles.length > 0) {
        setAcceptedFiles(eventFormData.acceptedFiles);
      }
    }
  }, [activeStep, mainInfoMethods, basicMethods, acceptedFiles.length]); // FIXED: Removed eventFormData to prevent infinite loop

  // Handle event type change
  const handleEventTypeChange = (eventTypeId) => {
    setActiveEventType(eventTypeId);

    // If we have form data, recalculate carbon for new event type
    if (Object.keys(eventFormData).length > 0) {
      calculateCarbonWithDebounce(eventFormData, eventTypeId);
    }
  };

  // Preview modal handlers
  const handleOpenPreview = () => {
    setIsPreviewModalOpen(true);
  };

  // Create complete form data including photos for preview
  const getCompleteFormDataForPreview = () => {
    return {
      ...eventFormData,
      acceptedFiles: acceptedFiles
    };
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
  };

  // File upload (now step 2 instead of step 3)
  // acceptedFiles state already declared at line 240

  const onSubmitMedia = async () => {
    try {
      // Use local eventTypeConfig to get the correct backend event type
      const selectedEventType = eventTypeConfig.find(config => config.id === activeEventType);
      const backendEventType = selectedEventType?.id ?? activeEventType;

      // Enhanced validation to prevent "Unknown" values
      const validateAndEnhanceEventData = (data) => {
        const enhancedData = { ...data };

        // Get current history's crop type for intelligent defaults
        const currentParcel = currentCompany?.establishments
          ?.find((est) => est.id === parseInt(establishmentId || '0'))
          ?.parcels?.find((p) => p.id === parseInt(parcelId || '0'));
        const cropType = currentParcel?.current_history?.crop_type?.name || 'general';

        // Validate required fields are present - don't add mocked values, instead ensure forms have proper inputs
        // FIXED: Corrected event type mapping to match backend constants
        // Backend constants: WEATHER_EVENT_TYPE = 0, PRODUCTION_EVENT_TYPE = 1, CHEMICAL_EVENT_TYPE = 2
        const requiredFieldsByType = {
          0: ['type'], // Weather
          1: ['type'], // Production - other fields are optional but encouraged
          2: ['type', 'commercial_name', 'volume', 'area', 'concentration', 'way_of_application'], // Chemical
          3: ['name'], // General
          4: ['type'], // Equipment - fuel data should come from form inputs
          5: ['type'], // Soil Management - specific fields should come from form inputs
          6: ['type'], // Pest Management - specific fields should come from form inputs
          7: ['type'] // Business
        };

        const requiredFields = requiredFieldsByType[backendEventType] || [];
        const missingFields = requiredFields.filter((field) => {
          const value = enhancedData[field];
          return (
            !value || value.toString().toLowerCase() === 'unknown' || value.toString().trim() === ''
          );
        });

        if (missingFields.length > 0) {
          console.warn(
            `Missing required fields for event type ${backendEventType}:`,
            missingFields
          );
          // Don't auto-fill - let the form validation catch this
          throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        }

        // No auto-generation of descriptions - users must provide their own
        // Only use the description field that users manually fill
        // Remove any mapping from observation to description as we're consolidating to description only

        return enhancedData;
      };

      console.log(
        '🔍 [NewEvent] activeEventType:',
        activeEventType,
        'typeof:',
        typeof activeEventType
      );
      console.log('🔍 [NewEvent] eventFormData before mapping:', eventFormData);

      // CHEMICAL EVENT FIX: Map frontend field names to backend field names for chemical events
      // IMPORTANT: This MUST happen BEFORE validateAndEnhanceEventData to pass validation
      let processedEventFormData = { ...eventFormData };

      if (activeEventType === 2) {
        // Chemical events (activeEventType 2)
        console.log('🧪 [NewEvent] Applying chemical field mapping for backend compatibility');
        console.log('🔍 [NewEvent] Raw chemical event data:', processedEventFormData);

        // Map frontend field names to backend field names
        if (processedEventFormData.volume_applied) {
          processedEventFormData.volume =
            processedEventFormData.volume_applied +
            ' ' +
            (processedEventFormData.volume_unit || 'L');
          console.log(
            '🔄 [NewEvent] Mapped volume_applied to volume:',
            processedEventFormData.volume
          );
        }

        if (processedEventFormData.area_treated) {
          processedEventFormData.area =
            processedEventFormData.area_treated + ' ' + (processedEventFormData.area_unit || 'ha');
          console.log('🔄 [NewEvent] Mapped area_treated to area:', processedEventFormData.area);
        }

        if (processedEventFormData.application_method) {
          processedEventFormData.way_of_application = processedEventFormData.application_method;
          console.log(
            '🔄 [NewEvent] Mapped application_method to way_of_application:',
            processedEventFormData.way_of_application
          );
        } else {
          console.warn(
            '⚠️ [NewEvent] application_method not found in form data. Available keys:',
            Object.keys(processedEventFormData)
          );
          console.warn(
            '⚠️ [NewEvent] application_method value:',
            processedEventFormData.application_method
          );
        }

        // Map observation to description for backend compatibility
        if (processedEventFormData.observation && !processedEventFormData.description) {
          processedEventFormData.description = processedEventFormData.observation;
          console.log(
            '🔄 [NewEvent] Mapped observation to description:',
            processedEventFormData.description
          );
        }

        // Ensure description is always present for backend validation
        if (!processedEventFormData.description) {
          processedEventFormData.description = `${
            processedEventFormData.commercial_name || 'Chemical'
          } application on ${processedEventFormData.area || ''} ${
            processedEventFormData.area_unit || 'area'
          }`;
          console.log(
            '🔄 [NewEvent] Generated default description:',
            processedEventFormData.description
          );
        }

        console.log(
          '✅ [NewEvent] Enhanced chemical event data after mapping:',
          processedEventFormData
        );
      }

      const enhancedEventFormData = validateAndEnhanceEventData(processedEventFormData);

      // Clean the data to remove any undefined or problematic fields
      const cleanEventData = (data) => {
        const cleaned = {};

        // UNIVERSAL FIELD MAPPING - BEST PRACTICE IMPLEMENTATION
        // Map event type to human-readable name for logging
        const eventTypeNames = {
          0: 'Weather',
          1: 'Production',
          2: 'Chemical',
          3: 'General',
          4: 'Equipment',
          5: 'Soil Management',
          6: 'Pest Management',
          7: 'Business'
        };
        const eventTypeName = eventTypeNames[activeEventType] || 'Unknown';

        // Events that require observation → description mapping (all except Chemical)
        const eventsWithObservation = [0, 1, 3, 4, 5, 6, 7]; // Weather, Production, General, Equipment, Soil Management, Pest Management, Business

        // Special handling for weather events (activeEventType === 0)
        if (activeEventType === 0) {
          // For weather events, send fields FLAT (not in extra_data)
          // The backend serializer's to_internal_value will handle moving them to extra_data
          Object.keys(data).forEach((key) => {
            const value = data[key];
            // Exclude problematic fields but include weather-specific fields and type
            if (
              value !== undefined &&
              value !== null &&
              value !== '' &&
              ![
                'carbon_data',
                'carbon_calculation',
                'image',
                'index',
                'companyId',
                'establishmentId',
                'parcelId',
                'volume_unit',
                'area_unit',
                'extra_data'
              ].includes(key)
            ) {
              let finalKey = key;

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
                console.log(
                  `🔧 [UNIVERSAL] ${eventTypeName} event mapping observation to description:`,
                  value
                );
              }

              cleaned[finalKey] = value;
            }
          });

          return cleaned;
        }

        // Special handling for production events (activeEventType === 1)
        if (activeEventType === 1) {
          // For production events, include the type field (PL, HA, IR, PR)
          // The backend ProductionEvent model requires this field
          Object.keys(data).forEach((key) => {
            const value = data[key];
            if (value !== undefined && value !== null && value !== '') {
              let finalKey = key;

              // CRITICAL FIX: Map operating_hours to equipment_hours for backend compatibility
              if (key === 'operating_hours') {
                finalKey = 'equipment_hours';
                console.log('🔧 [FIXED] Mapping operating_hours to equipment_hours:', value);
              }

              // CRITICAL: Include the 'type' field for production events (required by backend)
              if (key === 'type') {
                console.log('✅ [FIXED] Including production type field:', value);
              }

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
                console.log(
                  `🔧 [UNIVERSAL] ${eventTypeName} event mapping observation to description:`,
                  value
                );
              }

              cleaned[finalKey] = value;
            }
          });

          return cleaned;
        }

        // SOIL MANAGEMENT EVENT MAPPING (activeEventType === 5)
        if (activeEventType === 5) {
          Object.keys(data).forEach((key) => {
            const value = data[key];
            if (value !== undefined && value !== null && value !== '') {
              let finalKey = key;

              // CRITICAL FIX: Map form field 'depth' to backend field 'working_depth'
              if (key === 'depth') {
                finalKey = 'working_depth';
                console.log('🔧 [SOIL] Mapping depth to working_depth:', value);
              }

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
                console.log(
                  `🔧 [SOIL] ${eventTypeName} event mapping observation to description:`,
                  value
                );
              }

              cleaned[finalKey] = value;
            }
          });

          return cleaned;
        }

        // UNIVERSAL MAPPING for all other event types that use observation
        if (eventsWithObservation.includes(activeEventType)) {
          Object.keys(data).forEach((key) => {
            const value = data[key];
            if (value !== undefined && value !== null && value !== '') {
              let finalKey = key;

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
                console.log(
                  `🔧 [UNIVERSAL] ${eventTypeName} event mapping observation to description:`,
                  value
                );
              }

              cleaned[finalKey] = value;
            }
          });

          return cleaned;
        }

        // Default handling for Chemical events and any other event types
        // List of fields that should NOT be sent to the backend
        const excludedFields = [
          'carbon_data',
          'carbon_calculation',
          'image',
          'index', // Remove index field - not expected by backend
          'companyId', // Remove camelCase fields - use snake_case for backend
          'establishmentId',
          'parcelId',
          'volume_unit', // Remove unit fields if they're causing issues
          'area_unit'
        ];

        // Only exclude 'type' field for event types that don't use it
        // Weather, Production, and Soil Management events DO use the type field for sub-types
        const eventTypesUsingTypeField = ['weather', 'production', 'soil_management'];
        const backendEventType = Object.keys(eventTypeMap).find(key => eventTypeMap[key] === eventFormData.event_type) || '1';
        const currentEventTypeName = eventTypeMap[backendEventType] || 'general';
        
        if (!eventTypesUsingTypeField.includes(currentEventTypeName)) {
          excludedFields.push('type'); // Remove type field for event types that don't use sub-types
        }

        console.log('🔧 [NewEvent] Type field handling:', {
          currentEventTypeName,
          eventTypesUsingTypeField,
          includesType: eventTypesUsingTypeField.includes(currentEventTypeName),
          typeFieldIncluded: !excludedFields.includes('type'),
          excludedFields
        });

        Object.keys(data).forEach((key) => {
          const value = data[key];
          // Only include defined values and exclude problematic fields
          if (
            value !== undefined &&
            value !== null &&
            value !== '' &&
            !excludedFields.includes(key)
          ) {
            let finalKey = key;

            // CRITICAL FIX: Map operating_hours to equipment_hours for backend compatibility
            if (key === 'operating_hours') {
              finalKey = 'equipment_hours';
              console.log('🔧 [FIXED] Mapping operating_hours to equipment_hours:', value);
            }

            // CRITICAL FIX: Ensure extra_data is always a valid JSON object, not an array
            if (finalKey === 'extra_data') {
              // If extra_data is an array, convert it to an empty object
              // If it's already an object, keep it as is
              // If it's anything else, convert to empty object
              if (Array.isArray(value)) {
                console.warn('⚠️ [FIXED] Converting extra_data from array to object:', value);
                cleaned[finalKey] = {}; // Convert array to empty object
              } else if (typeof value === 'object' && value !== null) {
                cleaned[finalKey] = value; // Keep valid object
              } else {
                cleaned[finalKey] = {}; // Convert other types to empty object
              }
            } else {
              cleaned[finalKey] = value;
            }
          }
        });

        return cleaned;
      };

      const finalEventData = cleanEventData({
        ...enhancedEventFormData,
        event_type: backendEventType, // Use corrected event_type mapping
        parcels: parcelId ? [parcelId] : [], // Add parcels array required by backend
        // Add album images from S3 URLs (modern approach)
        album_images: acceptedFiles.map((f) => f.url).filter(Boolean)
      });

      console.log('Final event data being sent:', finalEventData);
      console.log('Final event data keys:', Object.keys(finalEventData));
      console.log('Final event data values:', Object.values(finalEventData));

      // DEBUGGING: Check extra_data specifically for weather events
      if (activeEventType === 0 && finalEventData.extra_data) {
        console.log('🔍 DEBUGGING extra_data for weather event:');
        console.log('extra_data type:', typeof finalEventData.extra_data);
        console.log('extra_data value:', finalEventData.extra_data);
        console.log('extra_data JSON.stringify:', JSON.stringify(finalEventData.extra_data));
      }

      if (isEdit) {
        // Update existing event
        await updateEvent({
          companyId: currentCompany.id,
          establishmentId: parseInt(establishmentId || '0'),
          eventId: parseInt(eventId || '0'),
          eventType: eventTypeFromUrl ? parseInt(eventTypeFromUrl) : backendEventType,
          ...finalEventData,
          id: existingEvent.id
        }).unwrap();

        toast({
          title: intl.formatMessage({ id: 'app.success' }) || 'Success',
          description:
            intl.formatMessage({ id: 'app.eventUpdatedSuccessfully' }) ||
            'Event updated successfully',
          status: 'success',
          duration: 5000,
          isClosable: true
        });
      } else {
        // Create new event
        await createEvent({
          companyId: currentCompany.id,
          establishmentId: parseInt(establishmentId || '0'),
          ...finalEventData
        }).unwrap();

        toast({
          title: intl.formatMessage({ id: 'app.success' }) || 'Success',
          description:
            intl.formatMessage({ id: 'app.eventCreatedSuccessfully' }) ||
            'Event created successfully with complete data for carbon calculation',
          status: 'success',
          duration: 5000,
          isClosable: true
        });
      }

      // Navigate back to the parcel details
      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`, {
        replace: true
      });
    } catch (error) {
      console.error('Error creating/updating event:', error);
      // Enhanced error logging for debugging
      console.error('🚨 [NewEvent] Full error details:');
      console.error('🚨 Error object:', JSON.stringify(error, null, 2));
      console.error('🚨 Error data:', JSON.stringify(error?.data, null, 2));
      console.error('🚨 Error status:', error?.status);
      console.error('🚨 Error message:', error?.message);
      
      // Note: Request data logged above before API call
      
      toast({
        title: intl.formatMessage({ id: 'app.error' }) || 'Error',
        description:
          intl.formatMessage({ id: 'app.errorCreatingEvent' }) ||
          'Failed to save event. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  // Navigation effects
  useEffect(() => {
    if (isCreateSuccess || isUpdateSuccess) {
      dispatch(clearForm());
      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`);
    }
  }, [isCreateSuccess, isUpdateSuccess, dispatch, navigate, establishmentId, parcelId]);

  // REMOVED: Watch for form data changes and recalculate carbon when on event details step
  // This was causing infinite loops with ChemicalTab's debounced onDataChange
  // Carbon calculation is now handled directly by form tabs via onDataChange callback

  // Get current history's crop type for intelligent defaults
  const currentParcel = currentCompany?.establishments
    ?.find((est) => est.id === parseInt(establishmentId || '0'))
    ?.parcels?.find((p) => p.id === parseInt(parcelId || '0'));

  const cropType = currentParcel?.current_history?.crop_type?.name || 'general';

  // 2025 PERFORMANCE: Removed excessive debug logging to prevent render loops and improve performance
  // Debug info available via React DevTools or selective logging when needed

  const tabConfig = [
    {
      id: 0,
      label: intl.formatMessage({ id: 'app.weather' }),
      component: (
        <WeatherTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    },
    {
      id: 1,
      label: intl.formatMessage({ id: 'app.production' }),
      component: (
        <ProductionTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    },
    {
      id: 2,
      label: intl.formatMessage({ id: 'app.chemical' }),
      component: (
        <ChemicalTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    },
    {
      id: 3,
      label: intl.formatMessage({ id: 'app.general' }),
      component: (
        <GeneralTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    },
    {
      id: 4,
      label: intl.formatMessage({ id: 'app.equipment' }),
      component: (
        <EquipmentTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    },
    {
      id: 5,
      label: intl.formatMessage({ id: 'app.soilManagement' }),
      component: (
        <SoilManagementTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    },
    {
      id: 6,
      label: intl.formatMessage({ id: 'app.pestManagement' }),
      component: (
        <PestManagementTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    },
    {
      id: 7,
      label: intl.formatMessage({ id: 'app.business' }),
      component: (
        <BusinessTab
          onSubmitHandler={onSubmitTab}
          onDataChange={onDataChange}
          onPrev={() => setActiveEventType(null)}
          initialValues={eventFormData}
          cropType={cropType}
        />
      )
    }
  ];

  return (
    <Box
      w="100%"
      bg={useColorModeValue('gray.50', 'gray.900')}
      minH="100vh"
      pt={{ base: 4, md: 5, lg: '54px' }}>
      {/* 2025 UX: Enhanced loading state with progress indication */}
      {isEdit && isLoadingEvent && (
        <Box maxW="1200px" mx="auto" p={{ base: 4, md: 6, lg: 8 }}>
          <StandardCard>
            <CardBody py={8} px={6}>
              <VStack spacing={4} align="center">
                <Spinner size="xl" color="green.500" />
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                  {intl.formatMessage({ id: 'app.loadingEvent' }) || 'Loading event data...'}
                </Text>
                <Progress value={60} colorScheme="green" w="200px" borderRadius="full" />
                <Text fontSize="sm" color="gray.500">
                  Retrieving agricultural data and calculations
                </Text>
              </VStack>
            </CardBody>
          </StandardCard>
        </Box>
      )}

      {/* Error state when editing */}
      {isEdit && eventError && (
        <Box maxW="1200px" mx="auto" p={{ base: 4, md: 6, lg: 8 }}>
          <Card boxShadow="xl" bg={bgColor} borderRadius="2xl">
            <CardBody py={8} px={6}>
              <VStack spacing={4} align="center">
                <Text fontSize="lg" fontWeight="semibold" color="red.500">
                  {intl.formatMessage({ id: 'app.errorLoadingEvent' }) ||
                    'Error loading event data'}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </Box>
      )}

      {/* Main Content - Show only when not loading or when creating */}
      {(!isEdit || !isLoadingEvent) && !eventError && (
        <>
          {/* Main Content */}
          <Box
            maxW="1200px"
            mx="auto"
            p={{ base: 4, md: 6, lg: 8 }}
            pt={{ base: '110px', md: '55px' }}>
            <VStack spacing={{ base: 8, md: 10 }} align="stretch">
              {/* Header Card - Full Width */}
              <Card boxShadow="xl" bg={bgColor} borderRadius="2xl">
                <CardBody py={4} px={4}>
                  <HStack spacing={4} align="center">
                    <VStack spacing={2} align="start" flex="1">
                      <Text fontSize="xl" fontWeight="bold" color={textColor} lineHeight="1.2">
                        {isEdit
                          ? intl.formatMessage({ id: 'app.editEvent' }) || 'Edit Event'
                          : intl.formatMessage({ id: 'app.createNewEvent' }) || 'Add a new event'}
                      </Text>
                      <Text fontSize="sm" color="gray.500" fontWeight="400">
                        {isEdit
                          ? intl.formatMessage({ id: 'app.editEventDescription' }) ||
                            'Update the event information below.'
                          : intl.formatMessage({ id: 'app.createNewEventDescription' }) ||
                            'Complete the form below to add a new event to your parcel history.'}
                      </Text>
                    </VStack>
                  </HStack>
                </CardBody>
              </Card>

              {/* Progress Stepper - Full Width */}
              <Card boxShadow="xl" bg={bgColor} borderRadius="2xl">
                <CardBody py={0} px={6}>
                  <HStack
                    spacing={{ base: 3, md: 6 }}
                    justify="center"
                    align="center"
                    w="100%"
                    maxW="800px"
                    mx="auto">
                    {steps.map((step, index) => (
                      <React.Fragment key={index}>
                        <VStack spacing={3} align="center" flex="1">
                          <Circle
                            size={{ base: '36px', md: '44px' }}
                            bg={
                              index < activeStep
                                ? 'green.500'
                                : index === activeStep
                                ? 'green.400'
                                : 'gray.200'
                            }
                            color={index <= activeStep ? 'white' : 'gray.500'}
                            fontSize={{ base: 'sm', md: 'md' }}
                            fontWeight="bold"
                            boxShadow={index === activeStep ? 'lg' : 'md'}
                            transition="all 0.3s">
                            {index < activeStep ? (
                              <FaCheckCircle size="18px" />
                            ) : (
                              <Text>{index + 1}</Text>
                            )}
                          </Circle>
                          <VStack spacing={1} align="center">
                            <Text
                              fontSize={{ base: 'xs', md: 'sm' }}
                              fontWeight="bold"
                              color={index <= activeStep ? 'green.500' : 'gray.500'}
                              textAlign="center"
                              lineHeight="1.2">
                              {step.title}
                            </Text>
                            <Text
                              fontSize="xs"
                              color="gray.500"
                              textAlign="center"
                              display={{ base: 'none', md: 'block' }}
                              lineHeight="1.2">
                              {step.description}
                            </Text>
                          </VStack>
                        </VStack>
                        {index < steps.length - 1 && (
                          <Box
                            height="3px"
                            flex="1"
                            bg={index < activeStep ? 'green.500' : 'gray.200'}
                            borderRadius="full"
                            mx={{ base: 1, md: 2 }}
                            transition="all 0.3s"
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </HStack>
                </CardBody>
              </Card>

              {/* Step Content */}
              <Flex direction={{ base: 'column', xl1: 'row-reverse' }} gap={10} align="start">
                {/* Carbon Impact Sidebar */}
                <Box
                  flex="0 0 auto"
                  w={{ base: '100%', xl1: '370px' }}
                  position={{ xl: 'sticky' }}
                  top="80px"
                  alignSelf="flex-start">
                  {(() => {
                    const showEmpty = !carbonCalculation && !isCalculatingCarbon && !isCalculating && activeStep === 0;
                    console.log('🎯 Carbon Preview Decision:', { showEmpty, carbonCalculation: !!carbonCalculation, isCalculatingCarbon, isCalculating, activeStep });
                    return showEmpty;
                  })() ? (
                      <Card boxShadow="lg" bg={bgColor} borderRadius="xl">
                        <CardBody>
                          <VStack spacing={4} align="center" py={8}>
                            <Icon as={FaLeaf} color="gray.400" boxSize={12} />
                            <Text fontSize="sm" color="gray.500" textAlign="center">
                              {intl.formatMessage({ id: 'app.enterEventDetailsToSeeCarbon' }) ||
                                'Enter event details to see carbon impact'}
                            </Text>
                          </VStack>
                        </CardBody>
                      </Card>
                    ) : (
                      <CarbonImpactPreview
                        eventType={eventTypeConfig[activeEventType]?.name}
                        formData={eventFormData}
                        calculation={carbonCalculation}
                        isCalculating={isCalculatingCarbon || isCalculating}
                      />
                  )}
                  {/* Tips and Guidelines */}
                  {activeStep === 1 && shouldShowCarbonTips && (
                    <Card mt={6} boxShadow="lg" bg={bgColor} borderRadius="xl">
                      <CardHeader pb={2}>
                        <HStack spacing={2}>
                          <Text fontSize="lg">💡</Text>
                          <Text fontSize="sm" fontWeight="bold" color={textColor}>
                            {intl.formatMessage({ id: 'app.carbonOptimizationTips' }) ||
                              'Optimization Suggestions'}
                          </Text>
                          {carbonCalculation?.efficiency_score && (
                            <Badge
                              colorScheme={
                                carbonCalculation.efficiency_score >= 70
                                  ? 'green'
                                  : carbonCalculation.efficiency_score >= 50
                                  ? 'yellow'
                                  : 'red'
                              }
                              fontSize="xs"
                              borderRadius="full"
                              // 2025 ACCESSIBILITY: Screen reader support for efficiency scores
                              aria-label={`Efficiency score: ${
                                carbonCalculation.efficiency_score
                              } out of 100. ${
                                carbonCalculation.efficiency_score >= 70
                                  ? 'Good'
                                  : carbonCalculation.efficiency_score >= 50
                                  ? 'Moderate'
                                  : 'Needs improvement'
                              } efficiency rating.`}>
                              {carbonCalculation.efficiency_score}/100
                            </Badge>
                          )}
                        </HStack>
                      </CardHeader>
                      <CardBody pt={0}>
                        <VStack spacing={2} align="stretch">
                          {activeEventType === 2 && (
                            <>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.usePreciseNPKValues' }) ||
                                  'Use precise NPK values for USDA-compliant carbon calculations'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.considerDripIrrigation' }) ||
                                  'Drip irrigation reduces emissions by 15-25% vs broadcast'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.applyDuringOptimalWeather' }) ||
                                  'Apply during calm, dry conditions to minimize losses'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.splitApplicationsReduce' }) ||
                                  'Split applications reduce N2O emissions by up to 30%'}
                              </Text>
                            </>
                          )}
                          {activeEventType === 1 && (
                            <>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.trackFuelConsumption' }) ||
                                  'Track precise fuel consumption for accurate emissions'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.optimizeRoutePlanning' }) ||
                                  'Optimize field patterns to reduce fuel use by 10-15%'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.combineOperationsWhenPossible' }) ||
                                  'Combined operations reduce emissions per hectare'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.maintainEquipmentProperly' }) ||
                                  'Well-maintained equipment uses 5-10% less fuel'}
                              </Text>
                            </>
                          )}
                          {activeEventType === 0 && (
                            <>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.monitorWeatherConditions' }) ||
                                  'Document weather events for insurance and carbon credits'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.useWeatherData' }) ||
                                  'Weather data improves yield predictions and planning'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.implementProtectiveMeasures' }) ||
                                  'Protective measures reduce crop stress and emissions'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.trackExtremeEvents' }) ||
                                  'Track extreme events for climate resilience planning'}
                              </Text>
                            </>
                          )}
                          {activeEventType === 3 && (
                            <>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.documentObservations' }) ||
                                  'Document observations for USDA compliance verification'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.maintainDetailedRecords' }) ||
                                  'Detailed records support carbon credit verification'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.considerSustainablePractices' }) ||
                                  'Sustainable practices often qualify for incentives'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.includePhotosForVerification' }) ||
                                  'Include photos for stronger verification evidence'}
                              </Text>
                            </>
                          )}
                          {(activeEventType === 4 ||
                            activeEventType === 5 ||
                            activeEventType === 6 ||
                            activeEventType === 7) && (
                            <>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.followBestPractices' }) ||
                                  'Follow USDA best practices for maximum efficiency'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.timingOptimization' }) ||
                                  'Optimal timing reduces environmental impact'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.precisionAgriculture' }) ||
                                  'Precision techniques improve cost and carbon efficiency'}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                •{' '}
                                {intl.formatMessage({ id: 'app.monitorOutcomes' }) ||
                                  'Monitor outcomes to improve future applications'}
                              </Text>
                            </>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  )}
                </Box>

                {/* Main Form */}
                <Box flex="1" maxW={{ base: '100%', xl1: '750px' }} w="100%">
                  {activeStep === 0 && (
                    <Card boxShadow="lg" bg={bgColor} borderRadius="xl">
                      <CardHeader pb={2}>
                        <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                          {intl.formatMessage({ id: 'app.basicEventInfo' }) ||
                            'Basic Event Information'}
                        </Text>
                      </CardHeader>
                      <CardBody pt={4} pb={6} px={{ base: 4, md: 6 }}>
                        <FormProvider {...basicMethods}>
                          <form onSubmit={basicMethods.handleSubmit(onSubmitBasic)}>
                            <VStack spacing={{ base: 5, md: 6 }} align="stretch">
                              {/* Event Type Selection */}
                              <Box>
                                <FormLabel fontSize="sm" fontWeight="bold" mb={4}>
                                  {intl.formatMessage({ id: 'app.selectEventType' }) ||
                                    'Select Event Type'}
                                </FormLabel>
                                {isEdit && (
                                  <Box
                                    mb={4}
                                    p={3}
                                    bg="yellow.50"
                                    borderRadius="md"
                                    borderWidth="1px"
                                    borderColor="yellow.200">
                                    <Text fontSize="sm" color="yellow.800">
                                      <Icon as={FaInfoCircle} mr={2} />
                                      {intl.formatMessage({ id: 'app.eventTypeCannotBeChanged' }) ||
                                        'Event type cannot be changed after creation for data integrity reasons.'}
                                    </Text>
                                  </Box>
                                )}
                                <Grid
                                  templateColumns={{
                                    base: 'repeat(2, 1fr)',
                                    sm: 'repeat(3, 1fr)',
                                    md: 'repeat(4, 1fr)'
                                  }}
                                  gap={4}>
                                  {eventTypeConfig.map((eventType) => (
                                    <Button
                                      key={eventType.id}
                                      variant={
                                        activeEventType === eventType.id ? 'solid' : 'outline'
                                      }
                                      colorScheme={eventType.color}
                                      size="lg"
                                      height={{ base: '120px', md: '140px' }}
                                      display="flex"
                                      flexDirection="column"
                                      justifyContent="center"
                                      alignItems="center"
                                      gap={2}
                                      p={4}
                                      onClick={() => handleEventTypeChange(eventType.id)}
                                      isDisabled={isEdit}
                                      opacity={isEdit && activeEventType !== eventType.id ? 0.4 : 1}
                                      _hover={
                                        !isEdit
                                          ? {
                                              transform: 'translateY(-2px)',
                                              boxShadow: 'lg'
                                            }
                                          : {}
                                      }
                                      transition="all 0.2s"
                                      whiteSpace="normal"
                                      overflow="hidden"
                                      // 2025 ACCESSIBILITY: Enhanced ARIA support
                                      aria-label={`Select ${eventType.label} event type. ${eventType.description}`}
                                      aria-pressed={activeEventType === eventType.id}
                                      role="button"
                                      tabIndex={isEdit ? -1 : 0}>
                                      <Icon as={eventType.icon} boxSize={6} />
                                      <VStack spacing={1} width="100%">
                                        <Text fontSize="sm" fontWeight="bold" textAlign="center">
                                          {eventType.label}
                                        </Text>
                                        <Text
                                          fontSize="xs"
                                          opacity={0.8}
                                          textAlign="center"
                                          lineHeight="1.2"
                                          noOfLines={2}
                                          display={{ base: 'none', md: 'block' }}>
                                          {eventType.description}
                                        </Text>
                                      </VStack>
                                    </Button>
                                  ))}
                                </Grid>
                              </Box>

                              {/* Date Selection */}
                              <StandardField
                                label={
                                  intl.formatMessage({ id: 'app.eventDateTime' }) ||
                                  'Event Date & Time'
                                }
                                required
                                error={basicMethods.formState.errors.date?.message}>
                                <StandardInput
                                  type="datetime-local"
                                  {...basicMethods.register('date')}
                                />
                              </StandardField>

                              {/* Action Buttons */}
                              <Box pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
                                <HStack justify="flex-end">
                                  <StandardButton
                                    variant="primary"
                                    type="submit"
                                    rightIcon={<FaChevronRight />}
                                    size="lg">
                                    {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
                                  </StandardButton>
                                </HStack>
                              </Box>
                            </VStack>
                          </form>
                        </FormProvider>
                      </CardBody>
                    </Card>
                  )}

                  {activeStep === 1 && (
                    <Card boxShadow="lg" bg={bgColor} borderRadius="xl">
                      <CardHeader pb={2}>
                        <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                          {intl.formatMessage({ id: 'app.eventDetails' }) || 'Event Details'}
                        </Text>
                      </CardHeader>
                      <CardBody pt={4} pb={6} px={{ base: 4, md: 6 }}>
                        {activeEventType === 0 && (
                          <WeatherTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}
                        {activeEventType === 1 && (
                          <ProductionTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}
                        {activeEventType === 2 && (
                          <ChemicalTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}
                        {activeEventType === 3 && (
                          <GeneralTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}
                        {activeEventType === 4 && (
                          <EquipmentTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}
                        {activeEventType === 5 && (
                          <SoilManagementTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}
                        {activeEventType === 6 && (
                          <PestManagementTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}
                        {activeEventType === 7 && (
                          <BusinessTab
                            onSubmitHandler={onSubmitMainInfo}
                            onDataChange={onDataChange}
                            onPrev={goToPreviousStep}
                            initialValues={eventFormData}
                            cropType={cropType}
                            hideActions={true}
                          />
                        )}

                        {/* Preview button integrated with navigation */}
                        <Box pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
                          <HStack justify="space-between">
                            <StandardButton
                              variant="outline"
                              onClick={goToPreviousStep}
                              leftIcon={<FaChevronLeft />}
                              size="lg">
                              {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                            </StandardButton>
                            <HStack spacing={3}>
                              <StandardButton
                                variant="outline"
                                colorScheme="blue"
                                onClick={handleOpenPreview}
                                leftIcon={<FaEye />}
                                size="lg">
                                Preview Event
                              </StandardButton>
                              <StandardButton
                                variant="primary"
                                onClick={() => setActiveStep(2)}
                                rightIcon={<FaChevronRight />}
                                size="lg">
                                {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
                              </StandardButton>
                            </HStack>
                          </HStack>
                        </Box>
                      </CardBody>
                    </Card>
                  )}

                  {activeStep === 2 && (
                    <Card boxShadow="lg" bg={bgColor} borderRadius="xl">
                      <CardHeader pb={2}>
                        <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                          {intl.formatMessage({ id: 'app.mediaAndDocumentation' }) ||
                            'Media & Documentation'}
                        </Text>
                      </CardHeader>
                      <CardBody pt={4} pb={6} px={{ base: 4, md: 6 }}>
                        <VStack spacing={{ base: 5, md: 6 }} align="stretch">
                          <StandardField
                            label={intl.formatMessage({ id: 'app.eventPhotos' }) || 'Event Photos'}
                            helpText="Upload photos documenting this agricultural event">
                            <TrazoImageUpload
                              maxFiles={5}
                              maxSize={10 * 1024 * 1024} // 10MB
                              existingImages={acceptedFiles.map((f) => f.url).filter(Boolean)}
                              onImagesChange={(urls) => {
                                const newAcceptedFiles = urls.map((url) => ({ url }));
                                setAcceptedFiles(newAcceptedFiles);
                                // Also update eventFormData to persist photos across steps
                                setEventFormData((prevData) => ({
                                  ...prevData,
                                  acceptedFiles: newAcceptedFiles
                                }));
                              }}
                            />
                          </StandardField>

                          <Box pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
                            <HStack justify="space-between">
                              <StandardButton
                                variant="outline"
                                onClick={goToPreviousStep}
                                leftIcon={<FaChevronLeft />}
                                size="lg">
                                {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                              </StandardButton>
                              <HStack spacing={3}>
                                <StandardButton
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={handleOpenPreview}
                                  leftIcon={<FaEye />}
                                  size="lg">
                                  Preview Event
                                </StandardButton>
                                <StandardButton
                                  variant="primary"
                                  onClick={onSubmitMedia}
                                  isLoading={isEdit ? isUpdatingEvent : isCreatingEvent}
                                  loadingText={
                                    isEdit
                                      ? intl.formatMessage({ id: 'app.updating' }) || 'Updating...'
                                      : intl.formatMessage({ id: 'app.creating' }) || 'Creating...'
                                  }
                                  rightIcon={<FaCheckCircle />}
                                  size="lg">
                                  {isEdit
                                    ? intl.formatMessage({ id: 'app.updateEvent' }) ||
                                      'Update Event'
                                    : intl.formatMessage({ id: 'app.createEvent' }) ||
                                      'Create Event'}
                                </StandardButton>
                              </HStack>
                            </HStack>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}
                </Box>
              </Flex>
            </VStack>
          </Box>
        </>
      )}

      {/* Event Preview Modal */}
      <EventPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        activeEventType={activeEventType}
        formData={getCompleteFormDataForPreview()}
      />
    </Box>
  );
}

export default NewEvent;
