// Chakra imports
import {
  Box,
  Flex,
  Icon,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  useToast,
  CircularProgress,
  Grid
} from '@chakra-ui/react';
import { BsFillCloudLightningRainFill } from 'react-icons/bs';
import {
  FaLeaf,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaSeedling,
  FaBusinessTime,
  FaBug,
  FaEye,
  FaCalendarAlt,
  FaTasks,
  FaCloudRain,
  FaFlask,
  FaClipboardList,
  FaCertificate,
  FaLayerGroup
} from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { clearForm, setForm } from 'store/features/formSlice';
import { object, string } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardStepper,
  StandardPage,
  SectionBox,
  SectionHeader
} from 'components/Design/StandardComponents';
import { TrazoImageUpload } from 'components/Upload';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import CardWithMap from 'components/Map/CardWithMap';
import ChemicalTab from './ChemicalTab-ENHANCED';
import FormLayout from 'components/Forms/FormLayout';
import GeneralTab from './GeneralTab';
// EquipmentTab removed - Sprint 2 Epic 2.1: Equipment merged into Production as "Equipment Maintenance (EQ)" subtype
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
import { addCompanyFarm } from 'store/features/companySlice';
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
import { PhotoRecommendationsBox } from 'components/Events/PhotoRecommendationsBox';
import { useGoogleMap } from '@react-google-maps/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';

// Enhanced form schemas with better validation
// Sprint 1 Epic 1.4: Added performed_by for USDA GAP traceability compliance
const formSchemaBasic = object({
  date: string().min(1, 'Date is required'),
  performed_by: string().optional() // Optional — helps with traceability but not required
});

const formSchemaMainInfo = object({
  type: string().min(1, 'Event type is required')
});

// Removed formSchemaDescription - observations are now handled in individual event tabs

const formSchemaMedia = object({});

// Event type configuration
// Sprint 2 Epic 2.1: Equipment (id: 4) is now merged into Production as "Equipment Maintenance" subtype
// Equipment type is kept here ONLY for backward compatibility with editing existing Equipment events
const eventTypeConfig = [
  {
    id: 0,
    name: 'weather',
    label: 'Weather',
    icon: FaCloudRain,
    color: 'blue',
    description: 'Weather events affecting your crops'
  },
  {
    id: 1,
    name: 'production',
    label: 'Production',
    icon: FaSeedling,
    color: 'green',
    description: 'Agricultural production activities' // Now includes Equipment Maintenance
  },
  {
    id: 2,
    name: 'chemical',
    label: 'Chemical',
    icon: FaFlask,
    color: 'orange',
    description: 'Chemical applications and treatments'
  },
  {
    id: 3,
    name: 'general', // Backend name stays 'general' for compatibility
    label: 'Other Farm Activities', // Sprint 2: Renamed from 'General'
    icon: FaClipboardList,
    color: 'gray',
    description: 'Farm activities not covered by other categories'
  },
  // Sprint 2 Epic 2.1: Equipment (id: 4) REMOVED - merged into Production as "Equipment Maintenance (EQ)" subtype
  // Users should select Production > Equipment Maintenance for equipment operations
  {
    id: 5,
    name: 'soil_management',
    label: 'Soil Management',
    icon: FaLayerGroup,
    color: 'yellow',
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
    icon: FaCertificate,
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
  const { parcelId, farmId } = useParams();
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
  const [previewFormData, setPreviewFormData] = useState(null);

  // Ref to access latest eventFormData in callbacks without stale closures
  const eventFormDataRef = useRef(eventFormData);
  eventFormDataRef.current = eventFormData;

  // File upload state - declare early to avoid initialization issues
  const [acceptedFiles, setAcceptedFiles] = useState([]);
  // Track deleted image IDs for edit mode - send to backend for deletion
  const [deletedImageIds, setDeletedImageIds] = useState([]);

  // Redux state — NOTE: removed currentEvent selector to prevent render loops.
  // eventFormData (local state) is the source of truth for form data.
  const currentCompany = useSelector((state) => state.company.currentCompany);

  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const [tabHasErrors, setTabHasErrors] = useState(false); // Track validation errors from event tabs

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
      farmId: parseInt(farmId || '0'),
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

  // DEBOUNCE FIX: Refs to event tabs for flushing data before step change
  const chemicalTabRef = useRef(null);
  const weatherTabRef = useRef(null);
  const productionTabRef = useRef(null);
  const generalTabRef = useRef(null);
  const soilManagementTabRef = useRef(null);
  const pestManagementTabRef = useRef(null);
  const businessTabRef = useRef(null);

  const calculateCarbonWithDebounce = useCallback(
    async (formData, eventType) => {
      if (!formData || Object.keys(formData).length === 0) {
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
            // Ensure production type is always sent (default PL matches ProductionTab default)
            ...(event_type === 'production' && !formData.type && { type: 'PL' }),
            // Add parcel context for better calculations
            parcel_id: parseInt(parcelId || '0'),
            establishment_id: parseInt(farmId || '0')
          };

          const result = await calculateCarbonImpact({
            event_type,
            event_data
          }).unwrap();

          setCarbonCalculation(result);
          setShouldShowCarbonTips(true);
        } catch (error) {
          // Set fallback calculation based on event type
          const fallbackScores = {
            0: { co2e: 0, efficiency_score: 100 }, // Weather - no emissions, pure transparency
            1: { co2e: 2.5, efficiency_score: 60 }, // Production - moderate impact
            2: { co2e: 1.8, efficiency_score: 50 }, // Chemical - higher impact
            3: { co2e: 0, efficiency_score: 100 }, // General - no emissions (excludeFromCarbonCalculation)
            4: { co2e: 1.0, efficiency_score: 60 }, // Equipment - moderate impact
            5: { co2e: 0.3, efficiency_score: 80 }, // Soil Management - high impact
            6: { co2e: 0.8, efficiency_score: 50 }, // Pest Management - moderate impact
            7: { co2e: 0, efficiency_score: 100 } // Business - no emissions (administrative/documentation)
          };

          const fallback = fallbackScores[eventType] || fallbackScores[3];

          setCarbonCalculation({
            co2e: fallback.co2e,
            efficiency_score: fallback.efficiency_score,
            usda_factors_used: false,
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
  // COMPREHENSIVE EVENT TYPE MAPPING - ALL 8 EVENT TYPES, ALL 30+ SUBTYPES
  const mapBackendTypeToFrontendCode = (backendType) => {
    if (!backendType) {
      return '';
    }

    // COMPREHENSIVE MAP: Backend verbose property paths → Frontend short codes
    // Covers all 8 event types (Weather, Production, Chemical, General, Equipment, Soil, Pest, Business)
    const typeMap = {
      // ================== WEATHER EVENT TYPES (Type 0) ==================
      // 8 weather subtypes
      'event.weather.frost': 'FR',
      'event.weather.drought': 'DR',
      'event.weather.hail': 'HL',
      'event.weather.heat': 'HT',
      'event.weather.storm': 'TS',
      'event.weather.high_winds': 'HW',
      'event.weather.heavy_rain': 'HH',
      'event.weather.low_humidity': 'LH',

      // ================== PRODUCTION EVENT TYPES (Type 1) ==================
      // 8 production subtypes (including Equipment Maintenance merged in Sprint 2)
      'event.production.planting': 'PL',
      'event.production.transplanting': 'TR',
      'event.production.harvesting': 'HA',
      'event.production.irrigation': 'IR',
      'event.production.pruning': 'PR',
      'event.production.equipment_maintenance': 'EM',
      'event.production.cultivation': 'CU',
      'event.production.thinning': 'TH',

      // ================== CHEMICAL EVENT TYPES (Type 2) ==================
      // 4 chemical subtypes
      'event.chemical.fertilizer': 'FE',
      'event.chemical.pesticide': 'PE',
      'event.chemical.fungicide': 'FU',
      'event.chemical.herbicide': 'HE',

      // ================== GENERAL EVENT TYPES (Type 3) ==================
      // 1 general subtype (catch-all for other farm activities)
      'event.general.general': 'GN',

      // ================== EQUIPMENT EVENT TYPES (Type 4) ==================
      // Note: Sprint 2 Epic 2.1 merged Equipment into Production as "Equipment Maintenance (EM)"
      // But we keep this for backward compatibility with existing Equipment events
      'event.equipment.equipment': 'EQ',

      // ================== SOIL MANAGEMENT EVENT TYPES (Type 5) ==================
      // 1 soil management subtype
      'event.soil.soil_test': 'ST',

      // ================== PEST MANAGEMENT EVENT TYPES (Type 6) ==================
      // 2 pest management subtypes
      'event.pest.scouting': 'SC',
      'event.pest.trap_monitoring': 'TM',

      // ================== BUSINESS EVENT TYPES (Type 7) ==================
      // 1 business subtype
      'event.business.certification': 'CE'
    };

    // ALL VALID SHORT CODES - Complete reference list
    const validCodes = [
      // Weather (8)
      'FR',
      'DR',
      'HL',
      'HT',
      'TS',
      'HW',
      'HH',
      'LH',
      // Production (8)
      'PL',
      'TR',
      'HA',
      'IR',
      'PR',
      'EM',
      'CU',
      'TH',
      // Chemical (4)
      'FE',
      'PE',
      'FU',
      'HE',
      // General (1)
      'GN',
      // Equipment (1)
      'EQ',
      // Soil (1)
      'ST',
      // Pest (2)
      'SC',
      'TM',
      // Business (1)
      'CE'
    ];

    // If it's already a short code, return it as is
    if (validCodes.includes(backendType)) {
      return backendType;
    }

    // Try to map verbose backend type to short code
    const mappedCode = typeMap[backendType];

    if (mappedCode) {
      return mappedCode;
    } else {
      return ''; // Return empty string for unknown types (form will use default)
    }
  };

  // Load existing event data and pre-fill forms when editing
  const hasLoadedExistingData = useRef(false);

  useEffect(() => {
    if (isEdit && existingEvent && !hasLoadedExistingData.current) {
      const eventDate = existingEvent.date
        ? new Date(existingEvent.date).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);

      // Map backend type to frontend code
      const mappedType = mapBackendTypeToFrontendCode(existingEvent.type);

      // Update form data state with comprehensive data mapping
      // IMPORTANT: Use spread operator to preserve ALL fields from existingEvent,
      // including weather-specific fields (water_deficit, highest_temperature, etc.)
      const initialData = {
        ...existingEvent, // Include all fields from backend (weather, production, etc.)
        date: eventDate,
        // Override type field with frontend code mapping
        // GENERAL EVENT FIX: General events store activity category in activity_type,
        // but the serializer returns a verbose type string (e.g. "event.general.tractor...")
        // that doesn't match GeneralTab's OTHER_FARM_ACTIVITY_TYPES select options.
        // Use activity_type with 'other' fallback for General events (type 3).
        type:
          eventTypeFromUrl === '3'
            ? existingEvent.activity_type || 'other'
            : mappedType || existingEvent.type,
        // Name field: use existing name or extra_data name only.
        // Do NOT fallback to description — description can be very long (observation text)
        // and name has a 150-char DB limit. Pest Management derives name separately in its tab.
        name: existingEvent.name || existingEvent.extra_data?.name || '',
        // Chemical event specific overrides
        commercial_name: existingEvent.commercial_name || existingEvent.name || '',
        active_ingredient:
          existingEvent.active_ingredient || existingEvent.extra_data?.active_ingredient || '',
        concentration: existingEvent.concentration || '',
        // FIELD NAME HANDLING:
        // Backend serializer now returns: volume_applied, area_treated, application_method
        // Fallback to old names (volume, area, way_of_application) for backward compatibility
        // with events created before serializer fix was deployed
        volume_applied: existingEvent.volume_applied ?? existingEvent.volume ?? '',
        volume_unit: existingEvent.volume_unit || existingEvent.extra_data?.volume_unit || 'L',
        area_treated: existingEvent.area_treated ?? existingEvent.area ?? '',
        area_unit: existingEvent.area_unit || existingEvent.extra_data?.area_unit || 'ha',
        application_method:
          existingEvent.application_method ||
          existingEvent.way_of_application ||
          existingEvent.application_method_structured ||
          '',
        weather_conditions: existingEvent.weather_conditions || '',
        application_timing: existingEvent.application_timing || existingEvent.time_period || '',
        target_pest_disease: existingEvent.target_pest_disease || '',
        // NPK values - convert to string for form inputs
        nitrogen_percentage: existingEvent.nitrogen_percentage?.toString() ?? '',
        phosphorus_percentage: existingEvent.phosphorus_percentage?.toString() ?? '',
        potassium_percentage: existingEvent.potassium_percentage?.toString() ?? '',
        // Chemical subtype for carbon calculations
        chemical_subtype: existingEvent.chemical_subtype || '',
        // Fuel/equipment fields with backward compatibility
        application_fuel_type: existingEvent.application_fuel_type || existingEvent.fuel_type || '',
        application_fuel_consumed:
          existingEvent.application_fuel_consumed ?? existingEvent.fuel_consumed ?? '',
        description: existingEvent.description || '',
        // 🚨 CRITICAL FIX: Ensure observation field is preserved for Weather Events
        // Weather Events have both description and observation fields
        // When creating, observation → description mapping happens
        // When editing, we need to ensure observation field is populated
        observation: existingEvent.observation || existingEvent.description || '', // Fallback to description if observation is empty

        // SOIL MANAGEMENT FIX (2025-12-25): Map backend field names to form field names
        // Backend stores: working_depth, but form uses: depth
        // On save, NewEvent.jsx line ~1297 maps depth → working_depth
        // On load, we need the reverse mapping: working_depth → depth
        depth: existingEvent.working_depth ?? existingEvent.depth ?? '',
        depth_unit: existingEvent.depth_unit ?? 'cm',

        // TILLAGE FIX (2025-12-25): Extract tillage-specific fields from extra_data for editing
        // SoilManagementEvent stores tillage fields in extra_data JSONField, not as model columns
        // These fields need to be extracted and set as top-level form fields for the UI to display them
        ...(existingEvent.extra_data?.tillage_type && {
          tillage_type: existingEvent.extra_data.tillage_type
        }),
        ...(existingEvent.extra_data?.tillage_intensity && {
          tillage_intensity: existingEvent.extra_data.tillage_intensity
        }),
        ...(existingEvent.extra_data?.tillage_direction && {
          tillage_direction: existingEvent.extra_data.tillage_direction
        }),
        ...(existingEvent.extra_data?.residue_management && {
          residue_management: existingEvent.extra_data.residue_management
        }),

        // SUMMARY MODE FIX: Extract summary fields from extra_data for editing
        // These are stored in extra_data (not model fields)
        ...(existingEvent.extra_data?.is_summary != null && {
          is_summary: existingEvent.extra_data.is_summary
        }),
        ...(existingEvent.extra_data?.date_start && {
          date_start: existingEvent.extra_data.date_start
        }),
        ...(existingEvent.extra_data?.date_end && {
          date_end: existingEvent.extra_data.date_end
        }),
        ...(existingEvent.extra_data?.event_count != null && {
          event_count: existingEvent.extra_data.event_count
        }),
        // AGGREGATE CARBON FIELDS FIX: Extract aggregate chemical fields from extra_data
        // These are stored in extra_data by ChemicalTab onSubmit for summary/aggregate events
        ...(existingEvent.extra_data?.active_ingredient_total_kg != null && {
          active_ingredient_total_kg: existingEvent.extra_data.active_ingredient_total_kg
        }),
        ...(existingEvent.extra_data?.volume_applied_total != null && {
          volume_applied_total: existingEvent.extra_data.volume_applied_total
        }),
        ...(existingEvent.extra_data?.area_treated_total != null && {
          area_treated_total: existingEvent.extra_data.area_treated_total
        }),
        ...(existingEvent.extra_data?.fuel_consumption_total != null && {
          fuel_consumption_total: existingEvent.extra_data.fuel_consumption_total
        }),
        ...(existingEvent.extra_data?.nitrogen_total_kg != null && {
          nitrogen_total_kg: existingEvent.extra_data.nitrogen_total_kg
        }),
        ...(existingEvent.extra_data?.phosphorus_total_kg != null && {
          phosphorus_total_kg: existingEvent.extra_data.phosphorus_total_kg
        }),
        ...(existingEvent.extra_data?.potassium_total_kg != null && {
          potassium_total_kg: existingEvent.extra_data.potassium_total_kg
        }),
        // Fuel fields: summary mode stores as fuel_type/fuel_unit,
        // non-summary mode stores as application_fuel_type/application_fuel_unit
        ...((existingEvent.extra_data?.fuel_type ||
          existingEvent.extra_data?.application_fuel_type) && {
          application_fuel_type:
            existingEvent.extra_data.fuel_type || existingEvent.extra_data.application_fuel_type
        }),
        ...((existingEvent.extra_data?.fuel_unit ||
          existingEvent.extra_data?.application_fuel_unit) && {
          application_fuel_unit:
            existingEvent.extra_data.fuel_unit || existingEvent.extra_data.application_fuel_unit
        }),
        ...(existingEvent.extra_data?.application_fuel_consumed != null && {
          application_fuel_consumed: existingEvent.extra_data.application_fuel_consumed
        }),
        ...(existingEvent.extra_data?.water_volume_total != null && {
          water_volume_total: existingEvent.extra_data.water_volume_total
        }),
        ...(existingEvent.extra_data?.water_volume_unit && {
          water_volume_unit: existingEvent.extra_data.water_volume_unit
        }),

        // PEST MANAGEMENT AGGREGATE FIELDS: Extract pest scouting summary fields from extra_data
        ...(existingEvent.extra_data?.area_covered_total != null && {
          area_covered_total: existingEvent.extra_data.area_covered_total
        }),
        ...(existingEvent.extra_data?.fuel_consumed_total != null && {
          fuel_consumed_total: existingEvent.extra_data.fuel_consumed_total
        }),
        ...(existingEvent.extra_data?.pest_species_observed && {
          pest_species_observed: existingEvent.extra_data.pest_species_observed
        }),
        ...(existingEvent.extra_data?.average_pest_pressure && {
          average_pest_pressure: existingEvent.extra_data.average_pest_pressure
        }),
        ...(existingEvent.extra_data?.observations_summary && {
          observations_summary: existingEvent.extra_data.observations_summary
        }),
        ...(existingEvent.extra_data?.crop_growth_stage && {
          crop_growth_stage: existingEvent.extra_data.crop_growth_stage
        }),
        ...(existingEvent.extra_data?.economic_threshold_met && {
          economic_threshold_met: existingEvent.extra_data.economic_threshold_met
        }),
        ...(existingEvent.extra_data?.action_recommended && {
          action_recommended: existingEvent.extra_data.action_recommended
        }),
        ...(existingEvent.extra_data?.equipment_hours != null && {
          equipment_hours: existingEvent.extra_data.equipment_hours
        }),
        ...(existingEvent.extra_data?.production_efficiency && {
          production_efficiency: existingEvent.extra_data.production_efficiency
        }),
        // EM events: map production_efficiency (model field) → operation_efficiency (form field)
        // The ProductionTab form uses operation_efficiency for EM equipment events,
        // but the API returns production_efficiency as the model column name
        ...(existingEvent.production_efficiency && {
          operation_efficiency: existingEvent.production_efficiency
        }),

        // IRRIGATION BACKWARD COMPAT: Model fields may be in extra_data for old events
        water_source: existingEvent.water_source || existingEvent.extra_data?.water_source || '',
        irrigation_method:
          existingEvent.irrigation_method || existingEvent.extra_data?.irrigation_method || '',
        irrigation_depth:
          existingEvent.irrigation_depth || existingEvent.extra_data?.irrigation_depth || '',
        irrigation_depth_unit:
          existingEvent.irrigation_depth_unit ||
          existingEvent.extra_data?.irrigation_depth_unit ||
          'inches',
        // IRRIGATION: pump_depth_ft and electricity_source are model fields
        // but well_depth_ft may exist in extra_data from older events
        pump_depth_ft: existingEvent.pump_depth_ft || existingEvent.extra_data?.well_depth_ft || '',
        electricity_source:
          existingEvent.electricity_source || existingEvent.extra_data?.electricity_source || '',

        // POLLINATION (PO): Extract pollination-specific fields from extra_data for editing
        // These are stored in extra_data JSONField, not as model columns
        ...(existingEvent.extra_data?.pollinator_type && {
          pollinator_type: existingEvent.extra_data.pollinator_type
        }),
        ...(existingEvent.extra_data?.hive_count != null && {
          hive_count: existingEvent.extra_data.hive_count
        }),
        ...(existingEvent.extra_data?.placement_date && {
          placement_date: existingEvent.extra_data.placement_date
        }),
        ...(existingEvent.extra_data?.removal_date && {
          removal_date: existingEvent.extra_data.removal_date
        }),

        // GENERAL EVENT FIELD MAPPING: Backend model uses different field names
        // duration → duration_hours, people_involved → participants
        duration_hours: existingEvent.duration_hours || existingEvent.duration?.toString() || '',
        participants: existingEvent.participants || existingEvent.people_involved?.toString() || '',

        // SOIL MANAGEMENT: amendment_unit stored in extra_data (no model column)
        ...(existingEvent.extra_data?.amendment_unit && {
          amendment_unit: existingEvent.extra_data.amendment_unit
        }),

        // BUSINESS EVENT: trust_impact and transparency_benefit stored in extra_data (no model columns)
        ...(existingEvent.extra_data?.trust_impact && {
          trust_impact: existingEvent.extra_data.trust_impact
        }),
        ...(existingEvent.extra_data?.transparency_benefit && {
          transparency_benefit: existingEvent.extra_data.transparency_benefit
        })
      };

      // Set form data directly - no two-phase update needed
      setEventFormData(initialData);

      // 🚨 CRITICAL FIX: Map backend album.images structure to frontend acceptedFiles format
      // Backend returns: { album: { id: X, images: [{ id, image, caption, created_at }] } }
      // Frontend expects: acceptedFiles: [{ url: "...", isExisting?: boolean, imageId?: number }]
      // NOTE: We mark existing images with isExisting: true so we DON'T re-upload them on submit
      // NOTE: We store imageId so we can tell the backend which images to delete
      if (
        existingEvent.album &&
        existingEvent.album.images &&
        existingEvent.album.images.length > 0
      ) {
        const mappedImages = existingEvent.album.images.map((img) => ({
          url: img.image, // Backend uses 'image' field, frontend uses 'url'
          isExisting: true, // 🚨 Mark as existing so we don't duplicate on submit
          imageId: img.id // 🚨 Store ID so we can delete if removed
        }));
        setAcceptedFiles(mappedImages);
        setDeletedImageIds([]); // Reset deleted IDs when loading existing event
        // 🚨 ALSO sync to eventFormData for step navigation consistency
        setEventFormData((prev) => ({ ...prev, acceptedFiles: mappedImages }));
      }

      // Reset forms with existing data
      // 🚨 CRITICAL FIX: Include performed_by field when editing
      basicMethods.reset({
        date: eventDate,
        performed_by: existingEvent.performed_by || ''
      });

      // Set event type from existing data
      // 🚨 CRITICAL FIX: Use eventTypeFromUrl if event_type is missing from backend response
      // Backend API uses event_type as query param but doesn't always return it in response body
      const eventTypeFromData =
        existingEvent.event_type !== undefined
          ? existingEvent.event_type
          : eventTypeFromUrl
          ? parseInt(eventTypeFromUrl)
          : 0;
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
    }
  }, [isEdit, existingEvent, basicMethods, dispatch]);

  // Form submission handlers
  const onSubmitBasic = (data) => {
    const updatedData = { ...eventFormData, ...data, event_type: activeEventType };
    setEventFormData(updatedData);

    // Calculate carbon impact
    calculateCarbonWithDebounce(updatedData, activeEventType);

    setActiveStep(1);
  };

  const onSubmitMainInfo = (data) => {
    const updatedData = { ...eventFormData, ...data };
    setEventFormData(updatedData);

    // Recalculate carbon with new data
    calculateCarbonWithDebounce(updatedData, activeEventType);

    setActiveStep(2);
  };

  // Note: Tab form submission is handled by onSubmitMainInfo (used directly in JSX render)

  // Handle real-time data changes from event tabs (for carbon preview updates)
  // NOTE: Do NOT dispatch to Redux here — useSelector(currentEvent) creates a
  // render loop because each dispatch produces a new object reference, triggering
  // a re-render that fires onDataChange again. Local state is the source of truth.
  const onDataChange = useCallback(
    (data) => {
      setEventFormData((prevData) => ({ ...prevData, ...data }));

      // Carbon calculation outside of setState updater (no side effects in updaters)
      // Merge with latest form data via ref so carbon API gets full context
      if (activeEventType !== 0) {
        calculateCarbonWithDebounce({ ...eventFormDataRef.current, ...data }, activeEventType);
      }
    },
    [activeEventType] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Removed debug logging to reduce console noise

  // Form restoration effect - restore form data when navigating between steps
  useEffect(() => {
    if (activeStep === 1 && eventFormData && Object.keys(eventFormData).length > 0) {
      // WeatherTab manages its own form restoration via initialValues prop
      // No need to reset mainInfoMethods here as it can cause conflicts
    }

    // Also restore basic form data when going back to step 0
    if (activeStep === 0 && eventFormData && eventFormData.date) {
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
      // Always restore photos when going back to step 2 to ensure consistency
      if (eventFormData.acceptedFiles.length > 0) {
        setAcceptedFiles(eventFormData.acceptedFiles);
      }
    }
  }, [activeStep, mainInfoMethods, basicMethods, acceptedFiles.length]); // FIXED: Removed eventFormData to prevent infinite loop

  // Handle event type change
  const handleEventTypeChange = (eventTypeId) => {
    setActiveEventType(eventTypeId);

    // CRITICAL FIX: Clear type-specific form data when switching event types
    // This prevents fields from one event type bleeding into another's preview
    // (e.g., Harvesting's yield_quantity showing in Irrigation preview)
    // Only preserve truly shared fields (date, performed_by)
    setEventFormData((prevData) => {
      const sharedFields = {};
      const fieldsToKeep = ['date', 'performed_by'];
      fieldsToKeep.forEach((field) => {
        if (prevData[field] !== undefined) {
          sharedFields[field] = prevData[field];
        }
      });
      return sharedFields;
    });

    // Reset carbon calculation for new event type
    setCarbonCalculation(null);

    // Also reset Redux form store to prevent stale data
    dispatch(clearForm());
  };

  // Preview modal handlers
  // NOTE: All data computation happens here (event handler), NOT during render.
  // getCompleteFormDataForPreview was removed because calling flushData() during
  // render triggered onDataChange → setEventFormData → infinite re-render loop.
  const handleOpenPreview = () => {
    // Flush active tab's form data before capturing snapshot
    const tabRefs = {
      0: weatherTabRef,
      1: productionTabRef,
      2: chemicalTabRef,
      3: generalTabRef,
      5: soilManagementTabRef,
      6: pestManagementTabRef,
      7: businessTabRef
    };
    const currentTabRef = tabRefs[activeEventType];
    if (currentTabRef?.current?.flushData) {
      currentTabRef.current.flushData();
    }

    // Snapshot form data for preview (read AFTER flushData updated eventFormData)
    // Use setTimeout(0) to let React process the flushData setState before reading
    setTimeout(() => {
      // Propagate calculated carbon impact so the ConsumerEventCard badge reflects
      // the actual activity level (Major Activity, Core Practice, etc.) instead of
      // the generic "Supplementary" fallback. Only override when we have a fresh
      // calculation — otherwise preserve any backend-supplied value from edit mode.
      const rawCo2e = carbonCalculation?.co2e;
      const hasCalculatedCo2e = typeof rawCo2e === 'number' && Number.isFinite(rawCo2e);
      setPreviewFormData({
        ...eventFormDataRef.current,
        acceptedFiles: acceptedFiles,
        ...(hasCalculatedCo2e && { carbon_impact: rawCo2e })
      });
      setIsPreviewModalOpen(true);
    }, 0);
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewFormData(null);
  };

  // File upload (now step 2 instead of step 3)
  // acceptedFiles state already declared at line 240

  const onSubmitMedia = async () => {
    try {
      // Use local eventTypeConfig to get the correct backend event type
      const selectedEventType = eventTypeConfig.find((config) => config.id === activeEventType);
      const backendEventType = selectedEventType?.id ?? activeEventType;

      // Enhanced validation to prevent "Unknown" values
      const validateAndEnhanceEventData = (data) => {
        const enhancedData = { ...data };

        // Validate required fields are present - don't add mocked values, instead ensure forms have proper inputs
        // FIXED: Corrected event type mapping to match backend constants
        // Backend constants: WEATHER_EVENT_TYPE = 0, PRODUCTION_EVENT_TYPE = 1, CHEMICAL_EVENT_TYPE = 2
        // Check if this is a summary mode event
        const isSummaryMode =
          enhancedData.is_summary === true ||
          enhancedData.is_summary === 'true' ||
          enhancedData.is_summary === 'on';

        const requiredFieldsByType = {
          0: ['type'], // Weather
          1: ['type'], // Production - other fields are optional but encouraged
          2: isSummaryMode
            ? ['type', 'commercial_name', 'application_method'] // Summary mode: AI total used instead of volume/area/concentration
            : [
                'type',
                'commercial_name',
                'volume_applied',
                'area_treated',
                'concentration',
                'application_method'
              ], // Chemical
          3: ['name'], // General
          4: ['type'], // Equipment - fuel data should come from form inputs
          5: ['type'], // Soil Management - specific fields should come from form inputs
          6: ['type'], // Pest Management - specific fields should come from form inputs
          7: ['business_type'] // Business - uses business_type field, not legacy 'type'
        };

        const requiredFields = requiredFieldsByType[backendEventType] || [];
        const missingFields = requiredFields.filter((field) => {
          const value = enhancedData[field];
          return (
            !value || value.toString().toLowerCase() === 'unknown' || value.toString().trim() === ''
          );
        });

        if (missingFields.length > 0) {
          const fieldLabels = {
            type: 'Event Type',
            commercial_name: 'Commercial Name',
            volume_applied: 'Volume Applied',
            area_treated: 'Area Treated',
            concentration: 'Concentration',
            application_method: 'Application Method',
            name: 'Event Name',
            business_type: 'Business Type'
          };
          const friendlyNames = missingFields.map((f) => fieldLabels[f] || f);
          throw new Error(`Please fill in all required fields: ${friendlyNames.join(', ')}`);
        }

        // No auto-generation of descriptions - users must provide their own
        // Only use the description field that users manually fill
        // Remove any mapping from observation to description as we're consolidating to description only

        return enhancedData;
      };

      // CHEMICAL EVENT FIX: Map frontend field names to backend field names for chemical events
      // IMPORTANT: This MUST happen BEFORE validateAndEnhanceEventData to pass validation
      let processedEventFormData = { ...eventFormData };

      if (activeEventType === 2) {
        // Chemical events (activeEventType 2)
        // 🔧 FIELD UNIFICATION FIX: Send separate numeric values and units
        // Backend UpdateChemicalEventSerializer handles:
        //   - volume_applied → maps to volume field
        //   - volume_unit → stores in extra_data
        //   - area_treated → maps to area field
        //   - area_unit → stores in extra_data
        // Do NOT combine into strings like "400 L" - keep them separate!
        if (processedEventFormData.volume_applied) {
          processedEventFormData.volume = processedEventFormData.volume_applied;
        }

        if (processedEventFormData.area_treated) {
          processedEventFormData.area = processedEventFormData.area_treated;
        }

        if (processedEventFormData.application_method) {
          processedEventFormData.way_of_application = processedEventFormData.application_method;
        }

        // Map observation to description for backend compatibility
        if (processedEventFormData.observation && !processedEventFormData.description) {
          processedEventFormData.description = processedEventFormData.observation;
        }

        // ChemicalTab's onSubmit already handles:
        // - Moving active_ingredient, application_details, weather_conditions,
        //   application_timing, target_pest_disease into extra_data
        // - Setting those fields to undefined at top level
        // - Constructing all aggregate/summary fields (fuel_consumption_total, NPK totals, etc.)
        // No extra_data patching needed here — submitForm() triggers the tab's onSubmit.
      }

      // TILLAGE FIX (2025-12-25): Move tillage-specific fields to extra_data
      // SoilManagementEvent model doesn't have tillage_type, tillage_intensity, etc. as columns
      // These fields are only used for Tillage subtype (type='TI') and must be stored in extra_data
      if (activeEventType === 5 && processedEventFormData.type === 'TI') {
        const tillageFieldsForExtraData = {};

        // Extract tillage-specific fields
        const tillageType = processedEventFormData.tillage_type;
        const tillageIntensity = processedEventFormData.tillage_intensity;
        const tillageDirection = processedEventFormData.tillage_direction;
        const residueManagement = processedEventFormData.residue_management;

        // Add to extra_data if defined
        if (tillageType !== undefined && tillageType !== null && tillageType !== '') {
          tillageFieldsForExtraData.tillage_type = tillageType;
        }
        if (
          tillageIntensity !== undefined &&
          tillageIntensity !== null &&
          tillageIntensity !== ''
        ) {
          tillageFieldsForExtraData.tillage_intensity = tillageIntensity;
        }
        if (
          tillageDirection !== undefined &&
          tillageDirection !== null &&
          tillageDirection !== ''
        ) {
          tillageFieldsForExtraData.tillage_direction = tillageDirection;
        }
        if (
          residueManagement !== undefined &&
          residueManagement !== null &&
          residueManagement !== ''
        ) {
          tillageFieldsForExtraData.residue_management = residueManagement;
        }

        // Merge into extra_data
        processedEventFormData.extra_data = {
          ...(processedEventFormData.extra_data || {}),
          ...tillageFieldsForExtraData
        };

        // Remove from top level so they don't get rejected by serializer
        processedEventFormData.tillage_type = undefined;
        processedEventFormData.tillage_intensity = undefined;
        processedEventFormData.tillage_direction = undefined;
        processedEventFormData.residue_management = undefined;
      }

      const enhancedEventFormData = validateAndEnhanceEventData(processedEventFormData);

      // Clean the data to remove any undefined or problematic fields
      const cleanEventData = (data) => {
        const cleaned = {};

        // System/structural fields that should NOT be sent as empty strings
        // All other fields (user inputs) CAN be cleared to empty
        const systemFields = [
          'carbon_data',
          'carbon_calculation',
          'image',
          'index',
          'companyId',
          'establishmentId',
          'parcelId',
          'extra_data'
          // NOTE: volume_unit and area_unit ARE now included - they're needed for proper unit display
        ];

        // Helper: Check if a field value should be included
        // - Always exclude undefined and null
        // - For system fields: also exclude empty strings
        // - For user fields: allow empty strings (so they can be cleared)
        const shouldIncludeField = (key, value) => {
          if (value === undefined || value === null) return false;
          if (value === '' && systemFields.includes(key)) return false;
          return true;
        };

        // UNIVERSAL FIELD MAPPING - BEST PRACTICE IMPLEMENTATION
        // Map event type to human-readable name for logging
        const eventTypeNames = {
          0: 'Weather',
          1: 'Production',
          2: 'Chemical',
          3: 'Other Farm Activities', // Sprint 2: Renamed from 'General'
          4: 'Equipment',
          5: 'Soil Management',
          6: 'Pest Management',
          7: 'Business'
        };
        const eventTypeName = eventTypeNames[activeEventType] || 'Unknown';

        // Events that require observation → description mapping (all except Chemical)
        const eventsWithObservation = [0, 1, 3, 4, 5, 6, 7]; // Weather, Production, Other Farm Activities, Equipment, Soil Management, Pest Management, Business

        // Special handling for weather events (activeEventType === 0)
        if (activeEventType === 0) {
          // For weather events, send fields FLAT (not in extra_data)
          // The backend serializer's to_internal_value will handle moving them to extra_data
          Object.keys(data).forEach((key) => {
            const value = data[key];
            // Use shouldIncludeField helper - allows empty strings for user fields
            if (shouldIncludeField(key, value) && !systemFields.includes(key)) {
              let finalKey = key;

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
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
            // Use shouldIncludeField helper - allows empty strings for user fields
            if (shouldIncludeField(key, value)) {
              let finalKey = key;

              // CRITICAL FIX: Map operating_hours to equipment_hours for backend compatibility
              if (key === 'operating_hours') {
                finalKey = 'equipment_hours';
              }

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
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
            // Use shouldIncludeField helper - allows empty strings for user fields
            if (shouldIncludeField(key, value)) {
              let finalKey = key;

              // CRITICAL FIX: Map form field 'depth' to backend field 'working_depth'
              // For TI (Tillage) events, SoilManagementTab sends 'tillage_depth' instead of 'depth'
              if (key === 'depth' || key === 'tillage_depth') {
                finalKey = 'working_depth';
              }
              if (key === 'tillage_depth_unit') {
                finalKey = 'depth_unit';
              }

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
              }

              cleaned[finalKey] = value;
            }
          });

          return cleaned;
        }

        // GENERAL EVENT MAPPING (activeEventType === 3)
        // Frontend form uses different field names than the backend model:
        //   type → activity_type, duration_hours → duration, participants → people_involved
        // NOP contamination booleans come in as 'true'/'false' strings from the
        // Switch controllers — coerce to real booleans, and let empty date/decimal
        // fields fall through as null (backend nullable_fields also strips them).
        if (activeEventType === 3) {
          const generalBooleanKeys = new Set(['is_contamination_incident', 'certifier_notified']);
          const generalNullableKeys = new Set([
            'contamination_source',
            'contamination_affected_area',
            'corrective_action_taken',
            'corrective_action_date',
            'certifier_notification_date'
          ]);

          Object.keys(data).forEach((key) => {
            let value = data[key];

            // Coerce NOP booleans first so shouldIncludeField sees the real type
            if (generalBooleanKeys.has(key)) {
              value = value === true || value === 'true';
              cleaned[key] = value;
              return;
            }

            // Empty strings on nullable date/decimal/text fields must become null,
            // otherwise DateField/DecimalField reject them with 400.
            if (generalNullableKeys.has(key) && (value === '' || value == null)) {
              cleaned[key] = null;
              return;
            }

            if (shouldIncludeField(key, value)) {
              let finalKey = key;

              // Field name remapping: frontend form → backend model
              if (key === 'type') finalKey = 'activity_type';
              if (key === 'duration_hours') finalKey = 'duration';
              if (key === 'participants') finalKey = 'people_involved';
              if (key === 'observation') finalKey = 'description';

              cleaned[finalKey] = value;
            }
          });

          return cleaned;
        }

        // UNIVERSAL MAPPING for all other event types that use observation
        if (eventsWithObservation.includes(activeEventType)) {
          Object.keys(data).forEach((key) => {
            const value = data[key];
            // Use shouldIncludeField helper - allows empty strings for user fields
            if (shouldIncludeField(key, value)) {
              let finalKey = key;

              // UNIVERSAL FIX: Map observation to description (required by CommonEvent model)
              if (key === 'observation') {
                finalKey = 'description';
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
          'parcelId'
          // NOTE: volume_unit and area_unit ARE now included - they're needed for proper unit display
        ];

        // Only exclude 'type' field for event types that don't use it
        // Weather, Production, Soil Management, and Chemical events DO use the type field for sub-types
        // SPRINT 6 FIX (2025-12-24): Added 'chemical' - Chemical events use type for FE/PE/FU/HE
        const eventTypesUsingTypeField = ['weather', 'production', 'soil_management', 'chemical'];
        // Use activeEventType and eventTypeConfig to get the current event type name
        const currentEventConfig = eventTypeConfig.find((config) => config.id === activeEventType);
        const currentEventTypeName = currentEventConfig?.name || 'general';

        if (!eventTypesUsingTypeField.includes(currentEventTypeName)) {
          excludedFields.push('type'); // Remove type field for event types that don't use sub-types
        }

        Object.keys(data).forEach((key) => {
          const value = data[key];

          // Use shouldIncludeField helper - allows empty strings for user fields
          // Only include valid values and exclude problematic fields
          if (shouldIncludeField(key, value) && !excludedFields.includes(key)) {
            let finalKey = key;

            // CRITICAL FIX: Map operating_hours to equipment_hours for backend compatibility
            if (key === 'operating_hours') {
              finalKey = 'equipment_hours';
            }

            // CRITICAL FIX: Map observation to description for Chemical events
            // CommonEvent model requires 'description' field, but form sends 'observation'
            if (key === 'observation') {
              finalKey = 'description';
            }

            // CRITICAL FIX: Ensure extra_data is always a valid JSON object, not an array
            if (finalKey === 'extra_data') {
              // If extra_data is an array, convert it to an empty object
              // If it's already an object, keep it as is
              // If it's anything else, convert to empty object
              if (Array.isArray(value)) {
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

      // 🚨 CRITICAL FIX: Only send NEW images, not existing ones (prevents duplicates on edit)
      // Existing images have isExisting: true, new uploads do NOT have this flag
      const newImagesOnly = acceptedFiles
        .filter((f) => !f.isExisting) // Only include images that are NOT from existing album
        .map((f) => f.url)
        .filter(Boolean);

      const finalEventData = cleanEventData({
        ...enhancedEventFormData,
        event_type: backendEventType, // Use corrected event_type mapping
        parcels: parcelId ? [parcelId] : [], // Add parcels array required by backend
        // Add ONLY NEW album images from S3 URLs (prevents duplicates on edit)
        album_images: newImagesOnly,
        // 🚨 CRITICAL: Send IDs of images to delete (for edit mode)
        delete_image_ids: isEdit ? deletedImageIds : []
      });

      if (isEdit) {
        // Update existing event
        await updateEvent({
          companyId: currentCompany.id,
          farmId: parseInt(farmId || '0'),
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
          farmId: parseInt(farmId || '0'),
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
      navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`, {
        replace: true
      });
    } catch (error) {
      // Surface the actual error message so users know what to fix
      const isValidationError = error?.message?.includes('required fields');
      const apiErrorMessage = error?.data?.detail || error?.data?.message || error?.data?.error;

      // Parse DRF field validation errors: {"field": ["error message"]}
      let fieldErrors = '';
      if (!apiErrorMessage && error?.data && typeof error.data === 'object') {
        const fieldEntries = Object.entries(error.data)
          .filter(([, v]) => Array.isArray(v))
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`);
        if (fieldEntries.length > 0) {
          fieldErrors = fieldEntries.join('; ');
        }
      }

      const errorDescription = isValidationError
        ? error.message
        : apiErrorMessage ||
          fieldErrors ||
          (isEdit
            ? intl.formatMessage({ id: 'app.errorUpdatingEvent' }) ||
              'Failed to update event. Please try again.'
            : intl.formatMessage({ id: 'app.errorCreatingEvent' }) ||
              'Failed to create event. Please try again.');

      toast({
        title: intl.formatMessage({ id: 'app.error' }) || 'Error',
        description: errorDescription,
        status: 'error',
        duration: 7000,
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
      navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`);
    }
  }, [isCreateSuccess, isUpdateSuccess, dispatch, navigate, farmId, parcelId]);

  // REMOVED: Watch for form data changes and recalculate carbon when on event details step
  // This was causing infinite loops with ChemicalTab's debounced onDataChange
  // Carbon calculation is now handled directly by form tabs via onDataChange callback

  // 2025 PERFORMANCE: Removed excessive debug logging to prevent render loops and improve performance
  // Debug info available via React DevTools or selective logging when needed
  // Note: Tab components are rendered directly via conditional rendering in JSX (activeEventType === X)

  // Handler for back navigation
  const handleBack = () => {
    navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`);
  };

  return (
    <StandardPage
      title={
        isEdit
          ? intl.formatMessage({ id: 'app.editEvent' }) || 'Edit Event'
          : intl.formatMessage({ id: 'app.createNewEvent' }) || 'Add Event'
      }
      description={
        isEdit
          ? intl.formatMessage({ id: 'app.editEventDescription' }) ||
            'Update the event information below'
          : intl.formatMessage({ id: 'app.createNewEventDescription' }) ||
            'Complete the form to add a new event to your parcel history'
      }
      showBackButton
      onBack={handleBack}
      rightAction={
        <Badge colorScheme="green" variant="subtle" px={3} py={1} borderRadius="full">
          <HStack spacing={1}>
            <Icon as={FaTasks} boxSize={3} />
            <Text fontSize="sm">
              Step {activeStep + 1} of {steps.length}
            </Text>
          </HStack>
        </Badge>
      }
    >
      {/* 2025 UX: Enhanced loading state with progress indication */}
      {isEdit && isLoadingEvent && (
        <StandardCard>
          <CardBody py={8} px={{ base: 0, md: 6 }}>
            <Flex justify="center" align="center">
              <CircularProgress isIndeterminate color="green.500" />
            </Flex>
          </CardBody>
        </StandardCard>
      )}

      {/* Error state when editing */}
      {isEdit && eventError && (
        <Card boxShadow="xl" bg={bgColor} borderRadius="2xl">
          <CardBody py={8} px={{ base: 0, md: 6 }}>
            <VStack spacing={4} align="center">
              <Text fontSize="lg" fontWeight="semibold" color="red.500">
                {intl.formatMessage({ id: 'app.errorLoadingEvent' }) || 'Error loading event data'}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Main Content - Show only when not loading or when creating */}
      {(!isEdit || !isLoadingEvent) && !eventError && (
        <VStack spacing={{ base: 6, md: 8 }} align="stretch">
          {/* Progress Stepper - Using StandardStepper */}
          <StandardStepper
            steps={steps}
            currentStep={activeStep}
            completedSteps={Array.from({ length: activeStep }, (_, i) => i)}
          />

          {/* Step Content */}
          <Flex
            direction={{ base: 'column', lg: 'row-reverse' }}
            gap={{ base: 4, lg: 8 }}
            align="flex-start"
          >
            {/* Carbon Impact Sidebar */}
            <Box
              flex={{ base: 'none', lg: '0 0 370px', xl1: '0 0 450px' }}
              w={{ base: '100%', lg: '370px', xl1: '450px' }}
              position={{ lg: 'sticky' }}
              top="80px"
              alignSelf="flex-start"
            >
              {!carbonCalculation && !isCalculatingCarbon && !isCalculating && activeStep === 0 ? (
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
                          } efficiency rating.`}
                        >
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
                      {activeEventType === 1 && eventFormData?.type === 'PO' && (
                        <>
                          <Text fontSize="xs" color="gray.600">
                            • Pollination is a zero-emission biological service — no fuel or
                            equipment needed
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            • Document hive count and placement dates for full transparency
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            • Pollination events build your transparency score by showing natural
                            processes
                          </Text>
                        </>
                      )}
                      {activeEventType === 1 && eventFormData?.type !== 'PO' && (
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
                              'Document observations to build consumer trust'}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            •{' '}
                            {intl.formatMessage({ id: 'app.maintainDetailedRecords' }) ||
                              'Detailed records increase your transparency score'}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            •{' '}
                            {intl.formatMessage({ id: 'app.considerSustainablePractices' }) ||
                              'Complete documentation helps buyers trust your practices'}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            •{' '}
                            {intl.formatMessage({ id: 'app.includePhotosForVerification' }) ||
                              'Include photos for stronger documentation evidence'}
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
                              'Follow best practices for complete documentation'}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            •{' '}
                            {intl.formatMessage({ id: 'app.timingOptimization' }) ||
                              'Optimal timing improves both efficiency and transparency'}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            •{' '}
                            {intl.formatMessage({ id: 'app.precisionAgriculture' }) ||
                              'Precision techniques improve cost efficiency and documentation quality'}
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
            <Box
              flex={{ base: 'none', lg: '1' }}
              w={{ base: '100%', lg: 'auto' }}
              minW={{ lg: '0' }}
            >
              {activeStep === 0 && (
                <Card boxShadow="lg" bg={bgColor} borderRadius="xl">
                  <CardHeader pb={2}>
                    <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                      {intl.formatMessage({ id: 'app.basicEventInfo' }) ||
                        'Basic Event Information'}
                    </Text>
                  </CardHeader>
                  <CardBody pt={4} pb={6} px={{ base: 0, md: 6 }}>
                    <FormProvider {...basicMethods}>
                      <form onSubmit={basicMethods.handleSubmit(onSubmitBasic)} noValidate>
                        <VStack spacing={{ base: 5, md: 6 }} align="stretch">
                          {/* Event Type Selection Section */}
                          <SectionBox>
                            <SectionHeader
                              icon={FaTasks}
                              iconColor="green.500"
                              title="Event Type"
                              badge="Required"
                              badgeColorScheme="green"
                              description="Select the type of agricultural activity you want to document"
                            />
                            {isEdit && (
                              <Alert status="warning" borderRadius="md" mb={4}>
                                <AlertIcon />
                                <Text fontSize="sm">
                                  {intl.formatMessage({ id: 'app.eventTypeCannotBeChanged' }) ||
                                    'Event type cannot be changed after creation for data integrity reasons.'}
                                </Text>
                              </Alert>
                            )}
                            <Grid
                              templateColumns={{
                                base: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                                lg: 'repeat(3, 1fr)',
                                '2xl': 'repeat(4, 1fr)'
                              }}
                              gap={{ base: 2, md: 3, lg: 4 }}
                              width="100%"
                            >
                              {/* Sprint 2 Epic 2.1: Equipment removed from event types - now a Production subtype */}
                              {eventTypeConfig.map((eventType) => (
                                <Box
                                  key={eventType.id}
                                  as="button"
                                  type="button"
                                  onClick={() => !isEdit && handleEventTypeChange(eventType.id)}
                                  disabled={isEdit}
                                  cursor={isEdit ? 'not-allowed' : 'pointer'}
                                  opacity={isEdit && activeEventType !== eventType.id ? 0.4 : 1}
                                  bg={
                                    activeEventType === eventType.id
                                      ? `${eventType.color}.500`
                                      : 'white'
                                  }
                                  color={activeEventType === eventType.id ? 'white' : 'gray.700'}
                                  borderWidth="2px"
                                  borderColor={
                                    activeEventType === eventType.id
                                      ? `${eventType.color}.500`
                                      : 'gray.200'
                                  }
                                  borderRadius={{ base: 'lg', md: 'xl' }}
                                  p={{ base: 3, md: 4 }}
                                  minH={{ base: '90px', md: '130px' }}
                                  minW={0}
                                  display="flex"
                                  flexDirection="column"
                                  justifyContent="center"
                                  alignItems="center"
                                  gap={2}
                                  transition="all 0.2s ease"
                                  _hover={
                                    !isEdit
                                      ? {
                                          transform: 'translateY(-2px)',
                                          boxShadow: 'lg',
                                          borderColor: `${eventType.color}.400`
                                        }
                                      : {}
                                  }
                                  _focus={{
                                    outline: 'none',
                                    boxShadow: `0 0 0 3px var(--chakra-colors-${eventType.color}-200)`
                                  }}
                                  aria-label={`Select ${eventType.label} event type. ${eventType.description}`}
                                  aria-pressed={activeEventType === eventType.id}
                                  role="button"
                                  tabIndex={isEdit ? -1 : 0}
                                >
                                  <Icon
                                    as={eventType.icon}
                                    boxSize={{ base: 5, md: 6 }}
                                    color={
                                      activeEventType === eventType.id
                                        ? 'white'
                                        : `${eventType.color}.500`
                                    }
                                  />
                                  <VStack spacing={0.5} width="100%">
                                    <Text
                                      fontSize={{ base: 'xs', md: 'sm' }}
                                      fontWeight="semibold"
                                      textAlign="center"
                                    >
                                      {eventType.label}
                                    </Text>
                                    <Text
                                      fontSize="xs"
                                      opacity={activeEventType === eventType.id ? 0.9 : 0.7}
                                      textAlign="center"
                                      lineHeight="1.2"
                                      noOfLines={2}
                                      display={{ base: 'none', md: 'block' }}
                                    >
                                      {eventType.description}
                                    </Text>
                                  </VStack>
                                </Box>
                              ))}
                            </Grid>
                          </SectionBox>

                          {/* Event Timing & Traceability Section */}
                          <SectionBox>
                            <SectionHeader
                              icon={FaCalendarAlt}
                              iconColor="blue.500"
                              title="Event Timing & Traceability"
                              badge="USDA GAP"
                              badgeColorScheme="blue"
                              description="When did this activity occur and who performed it?"
                            />
                            <VStack spacing={4} align="stretch">
                              {/* Date Selection */}
                              <StandardField
                                label={
                                  intl.formatMessage({ id: 'app.eventDateTime' }) ||
                                  'Event Date & Time'
                                }
                                required
                                helpText="Select the exact date and time when this activity was performed"
                                error={basicMethods.formState.errors.date?.message}
                              >
                                <StandardInput
                                  type="datetime-local"
                                  {...basicMethods.register('date')}
                                />
                              </StandardField>

                              {/* Sprint 1 Epic 1.4: USDA GAP Traceability - Who performed this activity */}
                              <StandardField
                                label="Performed By"
                                helpText="Name of person who performed this activity (optional, helps with traceability)"
                                required={false}
                                error={basicMethods.formState.errors.performed_by?.message}
                              >
                                <StandardInput
                                  placeholder={
                                    activeEventType === 0
                                      ? 'Optional for weather observations'
                                      : 'Enter operator/worker name'
                                  }
                                  {...basicMethods.register('performed_by')}
                                />
                              </StandardField>
                            </VStack>
                          </SectionBox>

                          {/* Action Buttons */}
                          <Box pt={4}>
                            <HStack justify="flex-end">
                              <StandardButton
                                variant="primary"
                                type="submit"
                                rightIcon={<FaChevronRight />}
                                size="lg"
                              >
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
                  <CardBody pt={4} pb={6} px={{ base: 0, md: 6 }}>
                    {activeEventType === 0 && (
                      <WeatherTab
                        ref={weatherTabRef}
                        onSubmitHandler={onSubmitMainInfo}
                        onDataChange={onDataChange}
                        onValidationChange={setTabHasErrors}
                        onPrev={goToPreviousStep}
                        initialValues={eventFormData}
                        hideActions={true}
                      />
                    )}
                    {activeEventType === 1 && (
                      <ProductionTab
                        ref={productionTabRef}
                        onSubmitHandler={onSubmitMainInfo}
                        onDataChange={onDataChange}
                        onPrev={goToPreviousStep}
                        initialValues={eventFormData}
                        hideActions={true}
                      />
                    )}
                    {activeEventType === 2 && (
                      <ChemicalTab
                        ref={chemicalTabRef}
                        onSubmitHandler={onSubmitMainInfo}
                        onDataChange={onDataChange}
                        onPrev={goToPreviousStep}
                        initialValues={eventFormData}
                        hideActions={true}
                      />
                    )}
                    {activeEventType === 3 && (
                      <GeneralTab
                        ref={generalTabRef}
                        onSubmitHandler={onSubmitMainInfo}
                        onDataChange={onDataChange}
                        onPrev={goToPreviousStep}
                        initialValues={eventFormData}
                        hideActions={true}
                      />
                    )}
                    {/* Sprint 2 Epic 2.1: Equipment (activeEventType === 4) REMOVED - merged into Production */}
                    {activeEventType === 5 && (
                      <SoilManagementTab
                        ref={soilManagementTabRef}
                        onSubmitHandler={onSubmitMainInfo}
                        onDataChange={onDataChange}
                        onPrev={goToPreviousStep}
                        initialValues={eventFormData}
                        hideActions={true}
                      />
                    )}
                    {activeEventType === 6 && (
                      <PestManagementTab
                        ref={pestManagementTabRef}
                        onSubmitHandler={onSubmitMainInfo}
                        onDataChange={onDataChange}
                        onPrev={goToPreviousStep}
                        initialValues={eventFormData}
                        hideActions={true}
                      />
                    )}
                    {activeEventType === 7 && (
                      <BusinessTab
                        ref={businessTabRef}
                        onSubmitHandler={onSubmitMainInfo}
                        onDataChange={onDataChange}
                        onPrev={goToPreviousStep}
                        initialValues={eventFormData}
                        hideActions={true}
                      />
                    )}

                    {/* Preview button integrated with navigation */}
                    <Box pt={6} mt={4} borderTop="1px" borderColor={borderColor}>
                      <Flex
                        direction={{ base: 'column', md: 'row' }}
                        justify="space-between"
                        align={{ base: 'stretch', md: 'center' }}
                        gap={3}
                      >
                        <StandardButton
                          variant="outline"
                          onClick={goToPreviousStep}
                          leftIcon={<FaChevronLeft />}
                          size={{ base: 'md', md: 'lg' }}
                          order={{ base: 3, md: 1 }}
                          w={{ base: '100%', md: 'auto' }}
                        >
                          {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                        </StandardButton>
                        <Flex
                          direction={{ base: 'row', md: 'row' }}
                          gap={3}
                          order={{ base: 1, md: 2 }}
                          w={{ base: '100%', md: 'auto' }}
                        >
                          <StandardButton
                            variant="outline"
                            colorScheme="blue"
                            onClick={handleOpenPreview}
                            leftIcon={<FaEye />}
                            size={{ base: 'md', md: 'lg' }}
                            flex={{ base: 1, md: 'none' }}
                          >
                            Preview
                          </StandardButton>
                          <StandardButton
                            variant="primary"
                            onClick={async () => {
                              // Programmatically submit the tab's form via useImperativeHandle
                              // This triggers the tab's onSubmit (which constructs extra_data with
                              // aggregate fields) and then onSubmitMainInfo (which advances to step 2)
                              const tabRefs = {
                                0: weatherTabRef,
                                1: productionTabRef,
                                2: chemicalTabRef,
                                3: generalTabRef,
                                5: soilManagementTabRef,
                                6: pestManagementTabRef,
                                7: businessTabRef
                              };
                              const currentTabRef = tabRefs[activeEventType];
                              if (currentTabRef?.current?.submitForm) {
                                try {
                                  await currentTabRef.current.submitForm();
                                  // onSubmitMainInfo handles setActiveStep(2)
                                } catch (errors) {
                                  // Validation failed — do NOT advance step
                                  console.warn('Form validation failed:', errors);
                                }
                              } else {
                                // Fallback for any tab that doesn't have submitForm yet
                                currentTabRef?.current?.flushData?.();
                                setActiveStep(2);
                              }
                            }}
                            rightIcon={<FaChevronRight />}
                            size={{ base: 'md', md: 'lg' }}
                            flex={{ base: 1, md: 'none' }}
                            isDisabled={tabHasErrors}
                            title={
                              tabHasErrors ? 'Please fix validation errors before continuing' : ''
                            }
                          >
                            {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
                          </StandardButton>
                        </Flex>
                      </Flex>
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
                  <CardBody pt={4} pb={6} px={{ base: 0, md: 6 }}>
                    <VStack spacing={{ base: 5, md: 6 }} align="stretch">
                      {/* Photo Recommendations - Event-Type & Subtype-Specific Guidance */}
                      <PhotoRecommendationsBox
                        activeEventType={activeEventType}
                        photoCount={acceptedFiles?.length || 0}
                        subtype={activeEventType === 1 ? eventFormData.type : undefined}
                      />

                      <StandardField
                        label={intl.formatMessage({ id: 'app.eventPhotos' }) || 'Event Photos'}
                        helpText="Upload photos documenting this agricultural event"
                      >
                        <TrazoImageUpload
                          maxFiles={5}
                          maxSize={10 * 1024 * 1024} // 10MB
                          existingImages={acceptedFiles.map((f) => f.url).filter(Boolean)}
                          onImagesChange={(urls) => {
                            // 🚨 CRITICAL FIX: Track deleted images and preserve isExisting flag
                            // This prevents duplicates AND enables proper deletion on edit

                            // Find which existing images were removed (for deletion)
                            const removedImages = acceptedFiles.filter((f) => {
                              return f.isExisting && f.imageId && !urls.includes(f.url);
                            });

                            if (removedImages.length > 0) {
                              const removedIds = removedImages.map((f) => f.imageId);
                              setDeletedImageIds((prev) => [...prev, ...removedIds]);
                            }

                            // Build new accepted files array
                            const newAcceptedFiles = urls.map((url) => {
                              // Check if this URL was already in acceptedFiles with isExisting flag
                              const existingEntry = acceptedFiles.find((f) => f.url === url);
                              if (existingEntry && existingEntry.isExisting) {
                                return {
                                  url,
                                  isExisting: true,
                                  imageId: existingEntry.imageId // Preserve the ID too
                                };
                              }
                              return { url }; // New image - no flag
                            });

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
                        <Flex
                          direction={{ base: 'column', md: 'row' }}
                          justify="space-between"
                          align={{ base: 'stretch', md: 'center' }}
                          gap={3}
                        >
                          <StandardButton
                            variant="outline"
                            onClick={goToPreviousStep}
                            leftIcon={<FaChevronLeft />}
                            size={{ base: 'md', md: 'lg' }}
                            order={{ base: 3, md: 1 }}
                            w={{ base: '100%', md: 'auto' }}
                          >
                            {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                          </StandardButton>
                          <Flex
                            direction={{ base: 'row', md: 'row' }}
                            gap={3}
                            order={{ base: 1, md: 2 }}
                            w={{ base: '100%', md: 'auto' }}
                          >
                            <StandardButton
                              variant="outline"
                              colorScheme="blue"
                              onClick={handleOpenPreview}
                              leftIcon={<FaEye />}
                              size={{ base: 'md', md: 'lg' }}
                              flex={{ base: 1, md: 'none' }}
                            >
                              Preview
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
                              size={{ base: 'md', md: 'lg' }}
                              flex={{ base: 1, md: 'none' }}
                            >
                              {isEdit
                                ? intl.formatMessage({ id: 'app.updateEvent' }) || 'Update'
                                : intl.formatMessage({ id: 'app.createEvent' }) || 'Create'}
                            </StandardButton>
                          </Flex>
                        </Flex>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </Box>
          </Flex>
        </VStack>
      )}

      {/* Event Preview Modal — data is pre-computed in handleOpenPreview (event handler) */}
      {isPreviewModalOpen && previewFormData && (
        <EventPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={handleClosePreview}
          activeEventType={activeEventType}
          formData={previewFormData}
        />
      )}
    </StandardPage>
  );
}

export default NewEvent;
