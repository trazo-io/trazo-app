import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Divider,
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Tooltip,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  Flex,
  Image,
  Link,
  useBreakpointValue,
  Grid,
  AspectRatio,
  Center
} from '@chakra-ui/react';
import {
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaUser,
  FaLeaf,
  FaEye,
  FaEyeSlash,
  FaMinus,
  FaTint,
  FaFlask,
  FaSeedling,
  FaSun,
  FaCertificate,
  FaExternalLinkAlt,
  FaChartLine,
  FaDollarSign,
  FaClock,
  FaShieldAlt,
  FaWrench
} from 'react-icons/fa';
import { MdVerified, MdInfo, MdOpenInNew } from 'react-icons/md';
import { useDeleteEventMutation } from 'store/api/historyApi';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

// Types
interface Member {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  image?: string;
}

interface Event {
  id: number;
  type: string;
  event_type: number;
  description: string;
  date: string;
  observation?: string;
  created_by: number;
  image?: string;
  name?: string;
  certified?: boolean;
  carbon_data?: CarbonCalculationResult;
  album?: {
    id: number;
    images: Array<{
      id: number;
      image: string; // Note: this is 'image' not 'image_url'
      caption?: string;
      created_at?: string;
    }>;
  };
  // Chemical event fields (stored directly on event object)
  commercial_name?: string;
  volume?: string;
  concentration?: string;
  area?: string;
  way_of_application?: string;
  weather_conditions?: string;
  application_timing?: string;
  target_pest_disease?: string;
  pre_harvest_interval?: number;
  active_ingredient?: string;
  // Production event fields (first-class fields from backend)
  area_covered?: number;
  area_unit?: string;
  yield_quantity?: number;
  yield_unit?: string;
  fuel_consumed?: number;
  fuel_unit?: string;
  equipment_hours?: number;
  transportation_distance?: number;
  transportation_unit?: string;
  production_type?: string;
  production_efficiency?: string;
  // Sprint 3 Epic 3.2: Consumer Trust Fields
  seeds_source?: string;
  water_source?: string;
  extra_data?: {
    // Weather Event specific fields
    lower_temperature?: number;
    way_of_protection?: string;
    highest_temperature?: number;
    duration?: number;
    damage_assessment?: string;
    protection_measures?: string;
    wind_speed?: number;
    precipitation_amount?: number;
    humidity_level?: number;
    crop_impact?: string;
    // Chemical Event specific fields
    commercial_name?: string;
    active_ingredient?: string;
    target_pest_disease?: string;
    application_method?: string;
    area_treated?: number;
    area_unit?: string;
    volume_applied?: number;
    volume_unit?: string;
    weather_conditions?: string;
    application_timing?: string;
    pre_harvest_interval?: number;
    concentration?: string;
    // Production Event specific fields
    area?: number;
    planting_density?: number;
    seed_variety?: string;
    quantityHarvested?: number;
    quality_grade?: string;
    harvest_method?: string;
    waterAmount?: number;
    irrigation_method?: string;
    water_efficiency?: number;
    soil_moisture?: number;
    pruning_type?: string;
    trees_pruned?: number;
    // Equipment Event specific fields
    equipment_type?: string;
    fuel_consumed?: number;
    fuel_unit?: string;
    fuel_type?: string;
    hours_operated?: number;
    area_worked?: number;
    fuel_efficiency?: number;
    operation_efficiency?: string;
    maintenance_type?: string;
    cost?: number;
    next_service?: string;
    // Soil Management specific fields
    ph_value?: number;
    organic_matter?: number;
    nitrogen_level?: number;
    phosphorus_level?: number;
    potassium_level?: number;
    test_laboratory?: string;
    recommendations?: string;
    lime_type?: string;
    application_rate?: number;
    target_ph?: number;
    material_type?: string;
    organic_content?: number;
    carbon_sequestered?: number;
    // Pest Management specific fields
    pests_found?: string;
    pest_count?: number;
    threshold_level?: number;
    action_taken?: string;
    beneficial_species?: string;
    target_pest?: string;
    release_rate?: number;
    effectiveness?: string;
    trap_type?: string;
    threshold?: number;
    action?: string;
    control_agent?: string;
    // Business Event specific fields
    certification_type?: string;
    certifying_body?: string;
    expiry_date?: string;
    certificate_number?: string;
    audit_type?: string;
    auditor?: string;
    result?: string;
    training_topic?: string;
    provider?: string;
    participants?: number;
    skills_gained?: string;
    [key: string]: any; // Allow for other fields
  };
}

interface CarbonCalculationResult {
  co2e: number;
  efficiency_score: number;
  usda_factors_based?: boolean;
  verification_status?: string;
  data_source?: string;
  calculation_method?: string; // Make optional since it can be undefined
  event_type: string;
  timestamp: string;
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
  error?: string;
  // Keep old field for backward compatibility during transition
  usda_verified?: boolean;
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  members: Member[];
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

// Helper functions
const getEventConfig = (type: string, description: string, eventType?: number) => {
  // 🚨 PRIORITY 1: Check numeric event_type FIRST (definitive source of truth)
  // This prevents description keywords from overriding the actual event type
  if (eventType !== undefined) {
    switch (eventType) {
      case 0: // Weather Event
        return {
          icon: FaSun,
          color: 'purple.500',
          category: 'Weather Event',
          bgGradient: 'linear(to-r, purple.400, indigo.400)'
        };
      case 1: // Production Activity
        return {
          icon: FaSeedling,
          color: 'green.500',
          category: 'Production',
          bgGradient: 'linear(to-r, green.400, emerald.400)'
        };
      case 2: // Chemical Application
        return {
          icon: FaFlask,
          color: 'orange.500',
          category: 'Chemical Application',
          bgGradient: 'linear(to-r, orange.400, yellow.400)'
        };
      case 3: // General Activity
        return {
          icon: FaLeaf,
          color: 'green.500',
          category: 'Farm Activity',
          bgGradient: 'linear(to-r, green.400, emerald.400)'
        };
      case 4: // Equipment Operation
        return {
          icon: FaWrench,
          color: 'blue.500',
          category: 'Equipment Operation',
          bgGradient: 'linear(to-r, blue.400, cyan.400)'
        };
      case 5: // Soil Management
        return {
          icon: FaLeaf,
          color: 'amber.600',
          category: 'Soil Management',
          bgGradient: 'linear(to-r, amber.500, yellow.500)'
        };
      case 6: // Pest Management
        return {
          icon: FaShieldAlt,
          color: 'red.500',
          category: 'Pest Management',
          bgGradient: 'linear(to-r, red.400, orange.400)'
        };
      case 7: // Business Activity
        return {
          icon: FaCheckCircle,
          color: 'blue.600',
          category: 'Business Activity',
          bgGradient: 'linear(to-r, blue.500, purple.500)'
        };
    }
  }

  // 🔄 PRIORITY 2: Fallback to description keywords only if event_type is unknown
  const desc = description.toLowerCase();

  if (desc.includes('riego') || desc.includes('irrigation') || type.includes('irrigation')) {
    return {
      icon: FaTint,
      color: 'blue.500',
      category: 'Water Management',
      bgGradient: 'linear(to-r, blue.400, cyan.400)'
    };
  }

  if (type.includes('chemical') || desc.includes('fertilizer') || desc.includes('pesticide')) {
    return {
      icon: FaFlask,
      color: 'orange.500',
      category: 'Chemical Application',
      bgGradient: 'linear(to-r, orange.400, yellow.400)'
    };
  }

  if (desc.includes('harvest') || desc.includes('cosecha') || desc.includes('production')) {
    return {
      icon: FaSeedling,
      color: 'green.500',
      category: 'Production',
      bgGradient: 'linear(to-r, green.400, emerald.400)'
    };
  }

  if (desc.includes('weather') || desc.includes('climate') || desc.includes('temperature')) {
    return {
      icon: FaSun,
      color: 'purple.500',
      category: 'Weather Event',
      bgGradient: 'linear(to-r, purple.400, indigo.400)'
    };
  }

  return {
    icon: FaLeaf,
    color: 'green.500',
    category: 'Farm Activity',
    bgGradient: 'linear(to-r, green.400, emerald.400)'
  };
};

// Helper function to get human-readable event names
const getEventDisplayName = (event: Event, intl: any): string => {
  // If it's a general event (event_type 3), use the name field
  if (event.event_type === 3 && event.name) {
    return event.name;
  }

  // For chemical events (Type 2), prioritize commercial name from direct field or extra_data
  if (event.event_type === 2) {
    if ((event as any).commercial_name) {
      return (event as any).commercial_name;
    }
    if (event.extra_data?.commercial_name) {
      return event.extra_data.commercial_name;
    }
  }

  // For other event types, map the type to a human-readable name
  const eventTypeMap: Record<string, string> = {
    // Chemical events
    'event.chemical.fertilizer':
      intl.formatMessage({ id: 'event.chemical.fertilizer' }) || 'Fertilizer Application',
    'event.chemical.pesticide':
      intl.formatMessage({ id: 'event.chemical.pesticide' }) || 'Pesticide Application',
    'event.chemical.herbicide':
      intl.formatMessage({ id: 'event.chemical.herbicide' }) || 'Herbicide Application',
    'event.chemical.fungicide':
      intl.formatMessage({ id: 'event.chemical.fungicide' }) || 'Fungicide Application',
    'event.chemical.insecticide':
      intl.formatMessage({ id: 'event.chemical.insecticide' }) || 'Insecticide Application',

    // Weather events
    'event.weather.frost': intl.formatMessage({ id: 'event.weather.frost' }) || 'Frost Event',
    'event.weather.drought': intl.formatMessage({ id: 'event.weather.drought' }) || 'Drought Event',
    'event.weather.hailstorm': intl.formatMessage({ id: 'event.weather.hailstorm' }) || 'Hailstorm',
    'event.weather.high_temperature':
      intl.formatMessage({ id: 'event.weather.high_temperature' }) || 'High Temperature',

    // Equipment events
    'event.equipment.fuel_consumption':
      intl.formatMessage({ id: 'event.equipment.fuel_consumption' }) || 'Fuel Consumption',
    'event.equipment.tractor':
      intl.formatMessage({ id: 'event.equipment.tractor' }) || 'Tractor Operation',
    'event.equipment.harvester':
      intl.formatMessage({ id: 'event.equipment.harvester' }) || 'Harvester Operation',
    'event.equipment.pump': intl.formatMessage({ id: 'event.equipment.pump' }) || 'Pump Operation',
    'event.equipment.other':
      intl.formatMessage({ id: 'event.equipment.other' }) || 'Equipment Operation',

    // Production events
    'event.production.harvest': intl.formatMessage({ id: 'event.production.harvest' }) || 'Harvest',
    'event.production.pruning': intl.formatMessage({ id: 'event.production.pruning' }) || 'Pruning',
    'event.production.planting':
      intl.formatMessage({ id: 'event.production.planting' }) || 'Planting',
    'event.production.irrigation':
      intl.formatMessage({ id: 'event.production.irrigation' }) || 'Irrigation',
    'event.production.harvesting':
      intl.formatMessage({ id: 'event.production.harvesting' }) || 'Harvesting',

    // Soil events
    'event.soil.soil_test': intl.formatMessage({ id: 'event.soil.soil_test' }) || 'Soil Testing',
    'event.soil.preparation':
      intl.formatMessage({ id: 'event.soil.preparation' }) || 'Soil Preparation',
    'event.soil.amendment': intl.formatMessage({ id: 'event.soil.amendment' }) || 'Soil Amendment',
    'event.soil.management':
      intl.formatMessage({ id: 'event.soil.management' }) || 'Soil Management',

    // Pest events
    'event.pest.monitoring':
      intl.formatMessage({ id: 'event.pest.monitoring' }) || 'Pest Monitoring',
    'event.pest.control': intl.formatMessage({ id: 'event.pest.control' }) || 'Pest Control',
    'event.pest.prevention':
      intl.formatMessage({ id: 'event.pest.prevention' }) || 'Pest Prevention',

    // Certification events
    'event.certification.inspection':
      intl.formatMessage({ id: 'event.certification.inspection' }) || 'Certification Inspection',
    'event.certification.organic':
      intl.formatMessage({ id: 'event.certification.organic' }) || 'Organic Certification',

    // Cover crop events
    'event.cover_crop.establishment':
      intl.formatMessage({ id: 'event.cover_crop.establishment' }) || 'Cover Crop Establishment',
    'event.cover_crop.termination':
      intl.formatMessage({ id: 'event.cover_crop.termination' }) || 'Cover Crop Termination',

    // Tree/plant events
    'event.tree.planting': intl.formatMessage({ id: 'event.tree.planting' }) || 'Tree Planting',
    'event.plant.establishment':
      intl.formatMessage({ id: 'event.plant.establishment' }) || 'Plant Establishment',

    // Site preparation
    'event.site.preparation':
      intl.formatMessage({ id: 'event.site.preparation' }) || 'Site Preparation',
    'event.site.design': intl.formatMessage({ id: 'event.site.design' }) || 'Site Design',

    // Fertilization programs
    'event.fertilization.program':
      intl.formatMessage({ id: 'event.fertilization.program' }) || 'Fertilization Program',
    'event.fertilization.application':
      intl.formatMessage({ id: 'event.fertilization.application' }) || 'Fertilizer Application',

    // Seeding events
    'event.seeding.wheat': intl.formatMessage({ id: 'event.seeding.wheat' }) || 'Wheat Seeding',
    'event.seeding.cotton': intl.formatMessage({ id: 'event.seeding.cotton' }) || 'Cotton Seeding',

    // Nitrogen application
    'event.nitrogen.application':
      intl.formatMessage({ id: 'event.nitrogen.application' }) || 'Nitrogen Application',

    // Beneficial insect release
    'event.beneficial.insect_release':
      intl.formatMessage({ id: 'event.beneficial.insect_release' }) || 'Beneficial Insect Release',

    // Orchard establishment
    'event.orchard.establishment':
      intl.formatMessage({ id: 'event.orchard.establishment' }) || 'Orchard Establishment',

    // Irrigation management
    'event.irrigation.management':
      intl.formatMessage({ id: 'event.irrigation.management' }) || 'Irrigation Management',

    // Cover crop system
    'event.cover_crop.system':
      intl.formatMessage({ id: 'event.cover_crop.system' }) || 'Cover Crop System',

    // Winter cover crop
    'event.winter.cover_crop':
      intl.formatMessage({ id: 'event.winter.cover_crop' }) || 'Winter Cover Crop',

    // High-density site design
    'event.high_density.site_design':
      intl.formatMessage({ id: 'event.high_density.site_design' }) || 'High-Density Site Design',

    // Organic soil preparation
    'event.organic.soil_preparation':
      intl.formatMessage({ id: 'event.organic.soil_preparation' }) || 'Organic Soil Preparation'
  };

  // Try to get mapped name first
  if (eventTypeMap[event.type]) {
    return eventTypeMap[event.type];
  }

  // Fallback: try direct translation
  const directTranslation = intl.formatMessage({ id: event.type });
  if (directTranslation && directTranslation !== event.type) {
    return directTranslation;
  }

  // Last fallback: use description or a cleaned-up version of the type
  if (event.description) {
    return event.description;
  }

  // Clean up the type string for display
  return event.type
    .replace(/^event\./, '')
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const extractEventData = (event: Event) => {
  const observation = event.observation || '';

  const durationMatch = observation.match(/(\d+)\s*hour/i);
  const duration = durationMatch ? parseInt(durationMatch[1]) : null;

  const amountMatch = observation.match(/(\d+)\s*(kg|lbs?|liters?|l)/i);
  const amount = amountMatch ? parseInt(amountMatch[1]) : null;
  const unit = amountMatch ? amountMatch[2] : null;

  return {
    duration,
    amount,
    unit,
    hasQuantifiableData: duration !== null || amount !== null
  };
};

/**
 * Get the appropriate label for fuel/energy consumption based on fuel type
 * Electric equipment uses "Energy Consumed" while fuel-based equipment uses "Fuel Consumed"
 *
 * NOTE: Icons (⚡/⛽) are provided by the rendering component, not in the label text,
 * to avoid duplicate icons in the display.
 */
const getFuelConsumptionLabel = (fuelType?: string): string => {
  if (!fuelType) {
    return 'Fuel Consumed';
  }

  const normalizedFuelType = fuelType.toLowerCase();
  return normalizedFuelType === 'electric' ? 'Energy Consumed' : 'Fuel Consumed';
};

const getQRVisibility = (event: Event): 'high' | 'medium' | 'low' => {
  const desc = event.description.toLowerCase();
  const type = event.type.toLowerCase();

  if (type.includes('chemical') || desc.includes('pesticide') || desc.includes('fertilizer')) {
    return 'high';
  }

  if (desc.includes('harvest') || desc.includes('cosecha') || desc.includes('organic')) {
    return 'high';
  }

  if (desc.includes('irrigation') || desc.includes('riego')) {
    return 'medium';
  }

  return 'low';
};

// Helper function to convert technical calculation methods to user-friendly descriptions
const getCalculationMethodDescription = (
  method: string | undefined | null,
  carbonData: CarbonCalculationResult
): string => {
  // Handle undefined/null method
  if (!method || typeof method !== 'string') {
    const isUsdaFactorsBased = carbonData.usda_factors_based ?? carbonData.usda_verified ?? false;
    return isUsdaFactorsBased
      ? 'Verified using USDA agricultural standards'
      : 'Estimated using agricultural emission benchmarks';
  }

  // Check if using USDA factors (new field) or fallback to old field
  const isUsdaFactorsBased = carbonData.usda_factors_based ?? carbonData.usda_verified ?? false;

  // Convert technical method names to user-friendly descriptions
  if (method.includes('production_irrigation') || method.includes('irrigation')) {
    return isUsdaFactorsBased
      ? 'Based on USDA irrigation emission standards'
      : 'Estimated using industry irrigation benchmarks';
  }

  if (
    method.includes('chemical') ||
    method.includes('fertilizer') ||
    method.includes('pesticide')
  ) {
    return isUsdaFactorsBased
      ? 'Based on USDA chemical application standards'
      : 'Estimated using agricultural chemical emission factors';
  }

  if (method.includes('equipment') || method.includes('fuel')) {
    return isUsdaFactorsBased
      ? 'Based on USDA equipment emission standards'
      : 'Estimated using equipment fuel consumption data';
  }

  if (method.includes('production_activity') || method.includes('crop_specific')) {
    return isUsdaFactorsBased
      ? 'Based on USDA crop-specific emission factors'
      : 'Estimated using crop production benchmarks';
  }

  if (method.includes('soil_management') || method.includes('soil')) {
    return isUsdaFactorsBased
      ? 'Based on USDA soil management standards'
      : 'Estimated using soil carbon sequestration models';
  }

  if (method.includes('weather') || method.includes('climate')) {
    return 'Estimated using climate impact models';
  }

  if (method.includes('general_event')) {
    return 'Standard baseline calculation for farm activities';
  }

  if (method.includes('unavailable') || method.includes('error')) {
    return 'Carbon data temporarily unavailable';
  }

  // Fallback for unknown methods
  return isUsdaFactorsBased
    ? 'Verified using USDA agricultural standards'
    : 'Estimated using agricultural emission benchmarks';
};

// Helper function to get data source confidence level
const getDataSourceConfidence = (
  carbonData: CarbonCalculationResult
): 'high' | 'medium' | 'low' => {
  if (carbonData.error) return 'low';

  // Check for USDA verification using new field (usda_factors_based) with fallback to old field
  if (carbonData.usda_factors_based || carbonData.usda_verified) return 'high';

  // Check verification status for certified data
  if (
    carbonData.verification_status === 'usda_certified' ||
    carbonData.verification_status === 'factors_verified'
  ) {
    return 'high';
  }

  // Check if calculation_method exists before calling includes
  if (
    carbonData.calculation_method &&
    (carbonData.calculation_method.includes('standard') ||
      carbonData.calculation_method.includes('specific'))
  )
    return 'medium';
  return 'low';
};

// Helper function to render specific event fields based on event type
const renderSpecificEventFields = (event: Event, cardBg: string, textColor: string) => {
  const fields: Array<{ label: string; value: string; priority: 'immediate' | 'secondary' }> = [];

  // Extract extra_data for easier access
  const extraData = event.extra_data || {};

  // Weather Events (Type 0)
  if (event.event_type === 0) {
    // Cast event to access weather-specific fields that come at root level from backend
    const weatherEvent = event as any;

    // Frost event fields
    if (extraData.lower_temperature !== undefined || weatherEvent.lower_temperature !== undefined) {
      const temp = extraData.lower_temperature ?? weatherEvent.lower_temperature;
      fields.push({
        label: 'Lower Temperature',
        value: `${temp}°C (${((temp * 9) / 5 + 32).toFixed(1)}°F)`,
        priority: 'immediate'
      });
    }
    if (extraData.way_of_protection || weatherEvent.way_of_protection) {
      fields.push({
        label: 'Protection Method',
        value: extraData.way_of_protection || weatherEvent.way_of_protection,
        priority: 'immediate'
      });
    }

    // Drought event fields - water_deficit comes at root level from backend
    if (extraData.water_deficit !== undefined || weatherEvent.water_deficit !== undefined) {
      const waterDeficit = extraData.water_deficit ?? weatherEvent.water_deficit;
      if (waterDeficit !== 0) {
        fields.push({
          label: 'Water Deficit',
          value: `${waterDeficit}mm`,
          priority: 'immediate'
        });
      }
    }

    // High temperature event fields
    if (extraData.highest_temperature !== undefined || weatherEvent.highest_temperature !== undefined) {
      const temp = extraData.highest_temperature ?? weatherEvent.highest_temperature;
      fields.push({
        label: 'Highest Temperature',
        value: `${temp}°C (${((temp * 9) / 5 + 32).toFixed(1)}°F)`,
        priority: 'immediate'
      });
    }

    // Start Date for High Temperature events
    if (extraData.start_date || weatherEvent.start_date) {
      const startDateValue = extraData.start_date || weatherEvent.start_date;
      const formattedStartDate = new Date(startDateValue).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      fields.push({
        label: 'Start Date',
        value: formattedStartDate,
        priority: 'immediate'
      });
    }

    // End Date for High Temperature events
    if (extraData.end_date || weatherEvent.end_date) {
      const endDateValue = extraData.end_date || weatherEvent.end_date;
      const formattedEndDate = new Date(endDateValue).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      fields.push({
        label: 'End Date',
        value: formattedEndDate,
        priority: 'immediate'
      });
    }

    // 🚨 DEPRECATED: Hailstorm weight and diameter fields removed in Sprint 2 Epic 2.1.3
    // Backend no longer sends these fields for Hailstorm events
    // Keeping defensive checks in case old events still have this data
    if (extraData.weight !== undefined || weatherEvent.weight !== undefined) {
      const weight = extraData.weight ?? weatherEvent.weight;
      // Only show if weight exists AND is greater than 0
      if (weight && weight > 0) {
        fields.push({
          label: 'Hail Weight',
          value: `${weight} g`,
          priority: 'immediate'
        });
      }
    }
    if (extraData.diameter !== undefined || weatherEvent.diameter !== undefined) {
      const diameter = extraData.diameter ?? weatherEvent.diameter;
      // Only show if diameter exists AND is greater than 0
      if (diameter && diameter > 0) {
        fields.push({
          label: 'Hail Diameter',
          value: `${diameter} mm`,
          priority: 'immediate'
        });
      }
    }

    // Common weather fields
    if (extraData.duration !== undefined || weatherEvent.duration !== undefined) {
      const duration = extraData.duration ?? weatherEvent.duration;
      if (duration !== 0) {
        // 🚨 CRITICAL: Hailstorm (HL) uses minutes, other weather events use hours
        // The event.type field contains a translation key like "event.weather.hailstorm"
        // We check if it contains 'hailstorm' to determine the unit
        const weatherType = event.type || '';
        console.log('[EventDetailsModal] Weather type for duration:', weatherType, 'Duration:', duration);
        const isHailstorm = weatherType.toLowerCase().includes('hailstorm');
        const durationUnit = isHailstorm ? 'minutes' : 'hours';
        fields.push({
          label: 'Duration',
          value: `${duration} ${durationUnit}`,
          priority: 'secondary'
        });
      }
    }
    if (extraData.damage_assessment || weatherEvent.damage_assessment) {
      fields.push({
        label: 'Damage Assessment',
        value: extraData.damage_assessment || weatherEvent.damage_assessment,
        priority: 'immediate'
      });
    }
    // 🚨 CRITICAL: Only show Protection Measures if way_of_protection wasn't already shown
    // This prevents duplicate protection fields for Hailstorm events
    const hasProtectionMethod = extraData.way_of_protection || weatherEvent.way_of_protection;
    if ((extraData.protection_measures || weatherEvent.protection_measures) && !hasProtectionMethod) {
      fields.push({
        label: 'Protection Measures',
        value: extraData.protection_measures || weatherEvent.protection_measures,
        priority: 'immediate'
      });
    }
    if (extraData.wind_speed !== undefined || weatherEvent.wind_speed !== undefined) {
      const windSpeed = extraData.wind_speed ?? weatherEvent.wind_speed;
      if (windSpeed !== 0) {
        fields.push({
          label: 'Wind Speed',
          value: `${windSpeed} km/h`,
          priority: 'immediate'
        });
      }
    }
    if (extraData.precipitation_amount !== undefined || weatherEvent.precipitation_amount !== undefined) {
      const precipitation = extraData.precipitation_amount ?? weatherEvent.precipitation_amount;
      if (precipitation !== 0) {
        fields.push({
          label: 'Rainfall',
          value: `${precipitation}mm`,
          priority: 'immediate'
        });
      }
    }
    if (extraData.humidity_level !== undefined || weatherEvent.humidity_level !== undefined) {
      const humidity = extraData.humidity_level ?? weatherEvent.humidity_level;
      if (humidity !== 0) {
        fields.push({
          label: 'Humidity Level',
          value: `${humidity}%`,
          priority: 'immediate'
        });
      }
    }
    if (extraData.crop_impact || weatherEvent.crop_impact) {
      fields.push({
        label: 'Crop Impact',
        value: extraData.crop_impact || weatherEvent.crop_impact,
        priority: 'immediate'
      });
    }
  }

  // Chemical Events (Type 2)
  if (event.event_type === 2) {
    const eventData = event as any;

    // Product Name (commercial_name)
    const commercialName = eventData.commercial_name || extraData.commercial_name;
    if (commercialName) {
      fields.push({
        label: 'Product Name',
        value: commercialName,
        priority: 'immediate'
      });
    }

    // Active Ingredient
    const activeIngredient = eventData.active_ingredient || extraData.active_ingredient;
    if (activeIngredient) {
      fields.push({
        label: 'Active Ingredient',
        value: activeIngredient,
        priority: 'immediate'
      });
    }

    // Concentration/Application Rate
    const concentration = eventData.concentration || extraData.concentration;
    if (concentration) {
      fields.push({
        label: 'Concentration / Application Rate',
        value: concentration,
        priority: 'immediate'
      });
    }

    // Volume Applied
    const volume = eventData.volume;
    if (volume) {
      fields.push({
        label: 'Volume Applied',
        value: `${volume} L`,
        priority: 'immediate'
      });
    }

    // Area Treated
    const area = eventData.area;
    if (area) {
      fields.push({
        label: 'Area Treated',
        value: `${area} ha`,
        priority: 'immediate'
      });
    }

    // Application Method
    const applicationMethod =
      eventData.way_of_application || eventData.application_method || extraData.application_method;
    if (applicationMethod) {
      fields.push({
        label: 'Application Method',
        value: applicationMethod,
        priority: 'immediate'
      });
    }

    // Weather Conditions
    const weatherConditions = eventData.weather_conditions || extraData.weather_conditions;
    if (weatherConditions) {
      fields.push({
        label: 'Weather Conditions',
        value: weatherConditions,
        priority: 'immediate'
      });
    }

    // Application Timing
    const applicationTiming = eventData.application_timing || extraData.application_timing;
    if (applicationTiming) {
      fields.push({
        label: 'Application Timing',
        value: applicationTiming,
        priority: 'immediate'
      });
    }

    // Target/Purpose
    const targetPestDisease = eventData.target_pest_disease || extraData.target_pest_disease;
    if (targetPestDisease) {
      fields.push({
        label: 'Target/Purpose',
        value: targetPestDisease,
        priority: 'immediate'
      });
    }

    // NPK percentages if available (check for actual values, not just undefined)
    if (
      (eventData.nitrogen_percentage !== undefined && eventData.nitrogen_percentage !== null) ||
      (eventData.phosphorus_percentage !== undefined && eventData.phosphorus_percentage !== null) ||
      (eventData.potassium_percentage !== undefined && eventData.potassium_percentage !== null)
    ) {
      const npk = `${eventData.nitrogen_percentage || 0}-${eventData.phosphorus_percentage || 0}-${
        eventData.potassium_percentage || 0
      }`;
      fields.push({
        label: 'NPK Formula',
        value: npk,
        priority: 'immediate'
      });
    } else if (concentration && concentration.match(/^\d+-\d+-\d+$/)) {
      // Use concentration as NPK formula if it matches N-P-K pattern
      fields.push({
        label: 'NPK Formula',
        value: concentration,
        priority: 'immediate'
      });
    }

    // Pre-harvest interval
    const preHarvestInterval = eventData.pre_harvest_interval || extraData.pre_harvest_interval;
    if (preHarvestInterval !== undefined) {
      fields.push({
        label: 'Pre-Harvest Interval',
        value: `${preHarvestInterval} days`,
        priority: 'secondary'
      });
    }
  }

  // Production Events (Type 1) - Enhanced transparency with all collected fields
  if (event.event_type === 1) {
    // Production Type - Critical field to understand the operation
    if (event.production_type || event.type) {
      const typeLabels = {
        PL: 'Planting',
        HA: 'Harvesting',
        IR: 'Irrigation',
        PR: 'Pruning/Trimming',
        TR: 'Transplanting',
        EM: 'Equipment Maintenance',
        CU: 'Cultivation',
        TH: 'Thinning',
        cultivation: 'Soil Cultivation',
        fertilization: 'Fertilizer Application',
        weeding: 'Weed Management',
        mulching: 'Mulching Application',
        planting: 'Planting',
        harvesting: 'Harvesting',
        irrigation: 'Irrigation',
        pruning: 'Pruning/Trimming',
        // API format mappings
        'event.production.planting': 'Planting',
        'event.production.harvesting': 'Harvesting',
        'event.production.irrigation': 'Irrigation',
        'event.production.pruning': 'Pruning/Trimming',
        'event.production.cultivation': 'Soil Cultivation',
        'event.production.fertilization': 'Fertilizer Application',
        'event.production.weeding': 'Weed Management',
        'event.production.mulching': 'Mulching Application',
        'event.production.transplanting': 'Transplanting',
        'event.production.thinning': 'Thinning',
        'event.production.equipment_maintenance': 'Equipment Maintenance'
      };
      const productionType = event.production_type || event.type;
      fields.push({
        label: 'Production Type',
        value: typeLabels[productionType] || productionType,
        priority: 'immediate'
      });
    }

    // Area Covered - Essential for all production activities
    if (event.area_covered !== undefined && event.area_covered !== null) {
      const areaUnit = event.area_unit || 'hectares';
      const unitLabels = {
        ha: 'hectares',
        acres: 'acres',
        m2: 'square meters',
        km2: 'square kilometers'
      };
      fields.push({
        label: 'Area Covered',
        value: `${event.area_covered} ${unitLabels[areaUnit] || areaUnit}`,
        priority: 'immediate'
      });
    }

    // Yield/Output Quantity - For harvesting and planting
    // CRITICAL FIX: Check both first-class field AND custom_fields for backward compatibility
    let yieldQuantityValue = event.yield_quantity;
    let yieldQuantityUnit = event.yield_unit || 'kg';

    // If first-class field is empty, check custom_fields (backward compatibility)
    if (
      (!yieldQuantityValue || Number(yieldQuantityValue) === 0) &&
      event.extra_data?.custom_fields &&
      Array.isArray(event.extra_data.custom_fields)
    ) {
      const yieldCustomField = event.extra_data.custom_fields.find(
        (field: any) => field.label?.toLowerCase() === 'yield quantity' || field.label?.toLowerCase() === 'quantity'
      );
      if (yieldCustomField && yieldCustomField.value) {
        // Extract numeric value from "50 trees" format
        const parts = yieldCustomField.value.toString().split(' ');
        const numericValue = parseFloat(parts[0]);
        if (!isNaN(numericValue)) {
          yieldQuantityValue = numericValue;
          // Extract unit from value (e.g., "trees" from "50 trees")
          if (parts.length > 1) {
            const unitFromValue = parts[parts.length - 1].toLowerCase();
            if (unitFromValue === 'trees') yieldQuantityUnit = 'trees';
            else if (unitFromValue === 'seedlings') yieldQuantityUnit = 'seedlings';
            // Add more unit mappings as needed
          }
        }
      }
    }

    if (
      yieldQuantityValue !== undefined &&
      yieldQuantityValue !== null &&
      yieldQuantityValue !== '' &&
      Number(yieldQuantityValue) > 0  // Handle both string and number types
    ) {
      const unitLabels = {
        kg: 'kilograms',
        tons: 'tonnes',
        lbs: 'pounds',
        boxes: 'boxes',
        plants: 'plants',
        seeds: 'seeds',
        trees: 'trees',
        seedlings: 'seedlings'
      };
      fields.push({
        label: 'Yield Quantity',
        value: `${yieldQuantityValue} ${unitLabels[yieldQuantityUnit] || yieldQuantityUnit}`,
        priority: 'secondary'
      });

      // Calculate yield efficiency for harvesting events
      const productionType = event.production_type || event.type;
      const isHarvesting = productionType === 'HA' || productionType === 'harvesting' || productionType === 'event.production.harvesting';

      if (isHarvesting && event.area_covered && event.area_covered > 0) {
        const yieldPerHa = (Number(yieldQuantityValue) / event.area_covered).toFixed(2);
        fields.push({
          label: 'Yield per Hectare',
          value: `${yieldPerHa} ${unitLabels[yieldQuantityUnit] || yieldQuantityUnit}/ha`,
          priority: 'immediate'
        });
      }
    }

    // Equipment & Fuel Usage - Critical for carbon calculations
    if (
      event.fuel_consumed !== undefined &&
      event.fuel_consumed !== null &&
      event.fuel_consumed > 0
    ) {
      const fuelUnit = event.fuel_unit || 'L';
      const unitLabels = {
        L: 'liters',
        gal: 'gallons',
        kg: 'kilograms',
        kWh: 'kWh'
      };
      fields.push({
        label: getFuelConsumptionLabel(event.extra_data?.fuel_type),
        value: `${event.fuel_consumed} ${unitLabels[fuelUnit] || fuelUnit}`,
        priority: 'immediate'
      });
    }

    if (
      event.equipment_hours !== undefined &&
      event.equipment_hours !== null &&
      event.equipment_hours > 0
    ) {
      fields.push({
        label: 'Equipment Operating Hours',
        value: `${event.equipment_hours} hours`,
        priority: 'immediate'
      });
    }

    // Fuel efficiency calculation
    if (
      event.fuel_consumed &&
      event.equipment_hours &&
      event.fuel_consumed > 0 &&
      event.equipment_hours > 0
    ) {
      const fuelEfficiency = (event.fuel_consumed / event.equipment_hours).toFixed(1);
      const fuelUnit = event.fuel_unit || 'L';
      fields.push({
        label: 'Fuel Efficiency',
        value: `${fuelEfficiency} ${fuelUnit}/hour`,
        priority: 'secondary'
      });
    }

    // Transportation - For harvesting logistics
    if (
      event.transportation_distance !== undefined &&
      event.transportation_distance !== null &&
      event.transportation_distance > 0
    ) {
      const transportUnit = event.transportation_unit || 'km';
      const unitLabels = {
        km: 'kilometers',
        miles: 'miles',
        m: 'meters'
      };
      fields.push({
        label: 'Transportation Distance',
        value: `${event.transportation_distance} ${unitLabels[transportUnit] || transportUnit}`,
        priority: 'immediate'
      });
    }

    // Production Efficiency Rating
    if (event.production_efficiency) {
      const efficiencyLabels = {
        high: 'High Efficiency (optimal conditions)',
        normal: 'Normal Efficiency (standard operation)',
        low: 'Low Efficiency (adverse conditions)'
      };
      fields.push({
        label: 'Production Efficiency',
        value: efficiencyLabels[event.production_efficiency] || event.production_efficiency,
        priority: 'secondary'
      });
    }

    // ============================================================
    // Sprint 3 Epic 3.2: Consumer Trust Fields for Production Events
    // These fields enhance consumer confidence in agricultural practices
    // ============================================================

    // Seeds/Seedlings Source - For Planting and Transplanting events
    if (event.seeds_source) {
      const seedSourceLabels: Record<string, string> = {
        certified_organic: '🌱 Certified Organic Seeds',
        farm_saved: '♻️ Farm-Saved Seeds',
        local: '🏡 Local Nursery/Supplier',
        cooperative: '🤝 Farmer Cooperative',
        commercial: '🏭 Commercial Supplier',
        other: '📝 Other Source'
      };
      fields.push({
        label: 'Seeds/Seedlings Source',
        value: seedSourceLabels[event.seeds_source] || event.seeds_source,
        priority: 'secondary'
      });
    }

    // Water Source - For Irrigation events
    if (event.water_source) {
      const waterSourceLabels: Record<string, string> = {
        well_groundwater: '💧 Well/Groundwater',
        municipal: '🏢 Municipal Water Supply',
        rainwater_harvesting: '🌧️ Rainwater Harvesting',
        irrigation_canal: '🚿 Irrigation Canal/District',
        river_stream: '🏞️ River/Stream',
        pond_reservoir: '🌊 Pond/Reservoir',
        recycled_water: '♻️ Recycled/Reclaimed Water',
        other: '📝 Other Source'
      };
      fields.push({
        label: 'Water Source',
        value: waterSourceLabels[event.water_source] || event.water_source,
        priority: 'secondary'
      });
    }

    // Legacy extraData fields for backward compatibility
    if (extraData.quality_grade) {
      fields.push({
        label: 'Quality Grade',
        value: extraData.quality_grade,
        priority: 'secondary'
      });
    }
    if (extraData.harvest_method) {
      fields.push({
        label: 'Harvest Method',
        value: extraData.harvest_method,
        priority: 'secondary'
      });
    }
    if (extraData.irrigation_method) {
      fields.push({
        label: 'Irrigation Method',
        value: extraData.irrigation_method,
        priority: 'secondary'
      });
    }
    if (extraData.seed_variety) {
      fields.push({
        label: 'Seed Variety',
        value: extraData.seed_variety,
        priority: 'secondary'
      });
    }
    if (extraData.pruning_type) {
      fields.push({
        label: 'Pruning Type',
        value: extraData.pruning_type,
        priority: 'secondary'
      });
    }
  }

  // Equipment Events (Type 4)
  if (event.event_type === 4) {
    if (extraData.equipment_type) {
      fields.push({
        label: 'Equipment',
        value: extraData.equipment_type,
        priority: 'immediate'
      });
    }
    if (extraData.fuel_consumed && extraData.fuel_unit) {
      fields.push({
        label: getFuelConsumptionLabel(extraData.fuel_type),
        value: `${extraData.fuel_consumed} ${extraData.fuel_unit}`,
        priority: 'immediate'
      });
    }
    // Note: Fuel Type is now indicated by emoji prefix in label (⚡ Electric / ⛽ Diesel)
    // Separate field removed to avoid redundancy
    if (extraData.hours_operated !== undefined) {
      fields.push({
        label: 'Operating Hours',
        value: `${extraData.hours_operated} hours`,
        priority: 'immediate'
      });
    }
    if (extraData.area_worked !== undefined) {
      fields.push({
        label: 'Area Worked',
        value: `${extraData.area_worked} hectares`,
        priority: 'immediate'
      });
    }
    if (extraData.fuel_consumed && extraData.area_worked) {
      const fuel_efficiency = (extraData.fuel_consumed / extraData.area_worked).toFixed(2);
      fields.push({
        label: 'Fuel Efficiency',
        value: `${fuel_efficiency} ${extraData.fuel_unit || 'L'}/ha`,
        priority: 'immediate'
      });
    }
    if (extraData.operation_efficiency) {
      fields.push({
        label: 'Operation Efficiency',
        value: extraData.operation_efficiency,
        priority: 'secondary'
      });
    }
    if (extraData.maintenance_type) {
      fields.push({
        label: 'Maintenance Type',
        value: extraData.maintenance_type,
        priority: 'immediate'
      });
    }
    if (extraData.next_service) {
      fields.push({
        label: 'Next Service',
        value: extraData.next_service,
        priority: 'secondary'
      });
    }
  }

  // Soil Management Events (Type 5)
  if (event.event_type === 5) {
    if (extraData.ph_value !== undefined) {
      fields.push({
        label: 'Soil pH',
        value: `${extraData.ph_value} ${
          extraData.ph_value >= 6.0 && extraData.ph_value <= 7.0
            ? '(optimal)'
            : extraData.ph_value < 6.0
            ? '(acidic)'
            : '(alkaline)'
        }`,
        priority: 'immediate'
      });
    }
    if (extraData.organic_matter !== undefined) {
      fields.push({
        label: 'Organic Matter',
        value: `${extraData.organic_matter}% ${
          extraData.organic_matter >= 4
            ? '(excellent)'
            : extraData.organic_matter >= 2
            ? '(good)'
            : '(needs improvement)'
        }`,
        priority: 'immediate'
      });
    }
    if (extraData.nitrogen_level !== undefined) {
      fields.push({
        label: 'Nitrogen Level',
        value: `${extraData.nitrogen_level} ppm`,
        priority: 'secondary'
      });
    }
    if (extraData.phosphorus_level !== undefined) {
      fields.push({
        label: 'Phosphorus Level',
        value: `${extraData.phosphorus_level} ppm`,
        priority: 'secondary'
      });
    }
    if (extraData.potassium_level !== undefined) {
      fields.push({
        label: 'Potassium Level',
        value: `${extraData.potassium_level} ppm`,
        priority: 'secondary'
      });
    }
    if (extraData.test_laboratory) {
      fields.push({
        label: 'Testing Laboratory',
        value: extraData.test_laboratory,
        priority: 'secondary'
      });
    }
    if (extraData.recommendations) {
      fields.push({
        label: 'Recommendations',
        value: extraData.recommendations,
        priority: 'immediate'
      });
    }
    if (extraData.lime_type) {
      fields.push({
        label: 'Lime Type',
        value: extraData.lime_type,
        priority: 'immediate'
      });
    }
    if (extraData.application_rate !== undefined) {
      fields.push({
        label: 'Application Rate',
        value: `${extraData.application_rate} tons/ha`,
        priority: 'immediate'
      });
    }
    if (extraData.target_ph !== undefined) {
      fields.push({
        label: 'Target pH',
        value: `${extraData.target_ph}`,
        priority: 'immediate'
      });
    }
    if (extraData.material_type) {
      fields.push({
        label: 'Material Type',
        value: extraData.material_type,
        priority: 'immediate'
      });
    }
    if (extraData.organic_content !== undefined) {
      fields.push({
        label: 'Organic Content Boost',
        value: `+${extraData.organic_content}%`,
        priority: 'immediate'
      });
    }
    if (extraData.carbon_sequestered !== undefined) {
      fields.push({
        label: 'Carbon Sequestered',
        value: `${extraData.carbon_sequestered} tons`,
        priority: 'immediate'
      });
    }
  }

  // Pest Management Events (Type 6)
  if (event.event_type === 6) {
    if (extraData.pests_found) {
      fields.push({
        label: 'Pests Found',
        value: extraData.pests_found,
        priority: 'immediate'
      });
    }
    if (extraData.pest_count !== undefined) {
      fields.push({
        label: 'Pest Count',
        value: `${extraData.pest_count} per plant`,
        priority: 'secondary'
      });
    }
    if (extraData.threshold_level !== undefined) {
      fields.push({
        label: 'Action Threshold',
        value: `${extraData.threshold_level} per plant`,
        priority: 'immediate'
      });
    }
    if (extraData.action_taken) {
      fields.push({
        label: 'Action Taken',
        value: extraData.action_taken,
        priority: 'immediate'
      });
    }
    if (extraData.beneficial_species) {
      fields.push({
        label: 'Beneficial Species Released',
        value: extraData.beneficial_species,
        priority: 'immediate'
      });
    }
    if (extraData.target_pest) {
      fields.push({
        label: 'Target Pest',
        value: extraData.target_pest,
        priority: 'immediate'
      });
    }
    if (extraData.release_rate !== undefined) {
      fields.push({
        label: 'Release Rate',
        value: `${extraData.release_rate} per ha`,
        priority: 'secondary'
      });
    }
    if (extraData.effectiveness) {
      fields.push({
        label: 'Effectiveness',
        value: extraData.effectiveness,
        priority: 'immediate'
      });
    }
    if (extraData.trap_type) {
      fields.push({
        label: 'Trap Type',
        value: extraData.trap_type,
        priority: 'immediate'
      });
    }
    if (extraData.control_agent) {
      fields.push({
        label: 'Biological Control Agent',
        value: extraData.control_agent,
        priority: 'immediate'
      });
    }
  }

  // Business Events (Type 7)
  if (event.event_type === 7) {
    if (extraData.certification_type) {
      fields.push({
        label: 'Certification Type',
        value: extraData.certification_type,
        priority: 'immediate'
      });
    }
    if (extraData.certifying_body) {
      fields.push({
        label: 'Certifying Body',
        value: extraData.certifying_body,
        priority: 'immediate'
      });
    }
    if (extraData.expiry_date) {
      fields.push({
        label: 'Valid Until',
        value: new Date(extraData.expiry_date).toLocaleDateString(),
        priority: 'secondary'
      });
    }
    if (extraData.audit_type) {
      fields.push({
        label: 'Audit Type',
        value: extraData.audit_type,
        priority: 'immediate'
      });
    }
    if (extraData.auditor) {
      fields.push({
        label: 'Auditor',
        value: extraData.auditor,
        priority: 'secondary'
      });
    }
    if (extraData.result) {
      fields.push({
        label: 'Result',
        value: extraData.result,
        priority: 'immediate'
      });
    }
    if (extraData.training_topic) {
      fields.push({
        label: 'Training Topic',
        value: extraData.training_topic,
        priority: 'immediate'
      });
    }
    if (extraData.provider) {
      fields.push({
        label: 'Training Provider',
        value: extraData.provider,
        priority: 'secondary'
      });
    }
    if (extraData.participants !== undefined) {
      fields.push({
        label: 'Participants',
        value: `${extraData.participants} staff members`,
        priority: 'secondary'
      });
    }
    if (extraData.skills_gained) {
      fields.push({
        label: 'Skills Gained',
        value: extraData.skills_gained,
        priority: 'immediate'
      });
    }
  }

  // Display all custom fields from custom_fields array (user-added via CustomFieldsForm)
  // Each custom field is shown with its original label and value
  // Farmer is responsible for avoiding duplicates during event creation
  if (event.extra_data?.custom_fields && Array.isArray(event.extra_data.custom_fields)) {
    event.extra_data.custom_fields.forEach((customField: any) => {
      // Display the custom field with its original label and value
      if (customField.label && customField.value) {
        fields.push({
          label: customField.label,
          value: String(customField.value),
          priority: 'secondary'  // Custom fields shown in Additional Details
        });
      }
    });
  }

  if (fields.length === 0) return null;

  // Separate immediate and secondary fields for progressive disclosure
  const immediateFields = fields.filter((field) => field.priority === 'immediate');
  const secondaryFields = fields.filter((field) => field.priority === 'secondary');

  return (
    <VStack spacing={4} align="stretch">
      {/* Immediate Fields */}
      {immediateFields.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {immediateFields.map((field, index) => (
            <Box key={index} p={4} bg={cardBg} borderRadius="lg">
              <Text fontSize="sm" color="gray.500" mb={1}>
                {field.label}
              </Text>
              <Text fontWeight="medium" color={textColor}>
                {field.value}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Secondary Fields - Expandable */}
      {secondaryFields.length > 0 && (
        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
            Additional Details
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {secondaryFields.map((field, index) => (
              <Box key={index} p={4} bg={cardBg} borderRadius="lg">
                <Text fontSize="sm" color="gray.500" mb={1}>
                  {field.label}
                </Text>
                <Text fontWeight="medium" color={textColor}>
                  {field.value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  );
};

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  members,
  onEventUpdated,
  onEventDeleted
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentCompany } = useSelector((state: RootState) => state.company);

  // Get URL parameters
  const { establishmentId, parcelId } = useParams<{
    establishmentId: string;
    parcelId: string;
  }>();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Modal size based on screen
  const modalSize = useBreakpointValue({ base: 'full', md: '4xl' });

  // State for carbon data - now using embedded data
  const [carbonData, setCarbonData] = useState<CarbonCalculationResult | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Delete confirmation modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // API hooks - only need delete now
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();

  // Load carbon data when modal opens - now uses embedded data
  useEffect(() => {
    if (isOpen && event) {
      // Use embedded carbon data if available, otherwise provide fallback
      if (event.carbon_data) {
        setCarbonData(event.carbon_data);
        setDataLoaded(true);
      } else {
        // Fallback for events without embedded carbon data
        setCarbonData({
          co2e: 0.1,
          efficiency_score: 50.0,
          usda_factors_based: false,
          verification_status: 'estimated',
          data_source: 'Unknown',
          calculation_method: 'embedded_data_unavailable',
          event_type: 'unknown',
          timestamp: new Date().toISOString(),
          error: 'Carbon data not available in event response'
        });
        setDataLoaded(true);
      }
    }
  }, [isOpen, event]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCarbonData(null);
      setDataLoaded(false);
    }
  }, [isOpen]);

  if (!event) return null;

  const eventConfig = getEventConfig(event.type, event.description, event.event_type);
  const eventData = extractEventData(event);
  const qrVisibility = getQRVisibility(event);
  const operator = members.find((member) => member.id === event.created_by);

  const handleEdit = () => {
    navigate(
      `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/event/${event.id}/change?event_type=${event.event_type}`
    );
    onClose();
  };

  const handleDelete = () => {
    if (!currentCompany || !establishmentId || !event) return;

    deleteEvent({
      companyId: currentCompany.id.toString(),
      establishmentId: establishmentId,
      eventId: event.id.toString(),
      eventType: event.event_type.toString()
    })
      .unwrap()
      .then(() => {
        toast({
          title: 'Event Deleted',
          description: 'The event has been successfully deleted.',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        onDeleteClose();
        onClose();
        onEventDeleted?.();
      })
      .catch((error: any) => {
        console.error('Failed to delete event:', error);
        toast({
          title: 'Error Deleting Event',
          description: 'An error occurred while deleting the event.',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size={modalSize} isCentered>
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent
          bg={bgColor}
          borderRadius="xl"
          maxH="90vh"
          display="flex"
          flexDirection="column"
        >
          {/* Modern Minimalist Header */}
          <ModalHeader p={6} pb={4} borderBottom="1px" borderColor={borderColor} flexShrink={0}>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={3} flex={1}>
                <HStack spacing={3}>
                  <Box
                    p={3}
                    borderRadius="lg"
                    bg={useColorModeValue(
                      `${eventConfig.color.split('.')[0]}.50`,
                      `${eventConfig.color.split('.')[0]}.900`
                    )}
                  >
                    <Icon as={eventConfig.icon} boxSize={6} color={eventConfig.color} />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xl" fontWeight="bold" color={textColor}>
                      {getEventDisplayName(event, intl)}
                    </Text>
                    <Badge
                      colorScheme={eventConfig.color.split('.')[0]}
                      variant="subtle"
                      fontSize="sm"
                      px={3}
                      py={1}
                      borderRadius="full"
                    >
                      {eventConfig.category}
                    </Badge>
                  </VStack>
                </HStack>

                <HStack spacing={6} color="gray.500" fontSize="sm">
                  <HStack spacing={2}>
                    <Icon as={FaCalendarAlt} boxSize={4} />
                    <Text>{new Date(event.date).toLocaleDateString()}</Text>
                  </HStack>
                  {operator && (
                    <HStack spacing={2}>
                      <Icon as={FaUser} boxSize={4} />
                      <Text>{operator.full_name}</Text>
                    </HStack>
                  )}
                  {event.certified && (
                    <HStack spacing={2}>
                      <Icon as={MdVerified} boxSize={4} color="green.500" />
                      <Text color="green.500" fontWeight="medium">
                        Certified
                      </Text>
                    </HStack>
                  )}
                </HStack>
              </VStack>

              <ModalCloseButton position="static" size="lg" />
            </HStack>
          </ModalHeader>

          <ModalBody p={6} overflowY="auto" flex={1}>
            <VStack spacing={6} align="stretch">
              {/* Event Details Section */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                  Event Details
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Box p={4} bg={cardBg} borderRadius="lg">
                    <Text fontSize="sm" color="gray.500" mb={1}>
                      Description
                    </Text>
                    <Text fontWeight="medium">{event.description}</Text>
                  </Box>

                  {eventData.duration && (
                    <Box p={4} bg={cardBg} borderRadius="lg">
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Duration
                      </Text>
                      <Text fontWeight="medium">{eventData.duration} hours</Text>
                    </Box>
                  )}

                  {eventData.amount && (
                    <Box p={4} bg={cardBg} borderRadius="lg">
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Amount Applied
                      </Text>
                      <Text fontWeight="medium">
                        {eventData.amount} {eventData.unit}
                      </Text>
                    </Box>
                  )}
                </SimpleGrid>
              </Box>

              {/* Album Images Section */}
              {event.album && event.album.images && event.album.images.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                      Event Photos
                    </Text>
                    <Grid
                      templateColumns={{
                        base: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)'
                      }}
                      gap={4}
                    >
                      {event.album.images.map((image, index) => (
                        <Box key={image.id || index}>
                          <AspectRatio ratio={1}>
                            <Image
                              src={image.image}
                              alt={`Event photo ${index + 1}`}
                              borderRadius="lg"
                              objectFit="cover"
                              border="1px"
                              borderColor={borderColor}
                              cursor="pointer"
                              transition="all 0.2s"
                              _hover={{
                                transform: 'scale(1.05)',
                                boxShadow: 'lg'
                              }}
                              onError={(e) => {
                                console.error('Image failed to load:', image.image, e);
                              }}
                              fallback={
                                <Center
                                  h="100%"
                                  bg={cardBg}
                                  borderRadius="lg"
                                  border="1px"
                                  borderColor={borderColor}
                                  flexDirection="column"
                                  gap={2}
                                >
                                  <Box fontSize="2xl">📷</Box>
                                  <Text fontSize="xs" color="gray.500" textAlign="center">
                                    Image not available
                                  </Text>
                                </Center>
                              }
                            />
                          </AspectRatio>
                        </Box>
                      ))}
                    </Grid>
                  </Box>
                </>
              )}

              {/* Specific Event Fields Section */}
              {renderSpecificEventFields(event, cardBg, textColor) && (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                      Detailed Information
                    </Text>
                    {renderSpecificEventFields(event, cardBg, textColor)}
                  </Box>
                </>
              )}

              <Divider />

              {/* Carbon Impact Section */}
              <Box>
                <HStack justify="space-between" align="center" mb={4}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    Carbon Impact Analysis
                  </Text>
                  {carbonData && carbonData.error && <Spinner size="sm" color="red.500" />}
                </HStack>

                {carbonData && !carbonData.error ? (
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    {/* Carbon Impact */}
                    <Stat
                      bg={cardBg}
                      p={4}
                      borderRadius="lg"
                      border="1px"
                      borderColor={borderColor}
                    >
                      <StatLabel>Carbon Impact</StatLabel>
                      <StatNumber color={carbonData.co2e < 0 ? 'green.500' : 'orange.500'}>
                        {carbonData.co2e > 0 ? '+' : ''}
                        {carbonData.co2e} kg CO₂
                      </StatNumber>
                      <StatHelpText>
                        <StatArrow type={carbonData.co2e > 0 ? 'increase' : 'decrease'} />
                        {carbonData.co2e > 0 ? 'Emission' : 'Reduction'}
                      </StatHelpText>
                      {(carbonData.usda_factors_based || carbonData.usda_verified) && (
                        <Badge colorScheme="blue" variant="solid" fontSize="xs" mt={2}>
                          <HStack spacing={1}>
                            <Icon as={FaCertificate} boxSize={3} />
                            <Text>USDA Verified</Text>
                          </HStack>
                        </Badge>
                      )}
                    </Stat>

                    {/* Efficiency Score */}
                    {carbonData.efficiency_score > 0 && (
                      <Stat
                        bg={cardBg}
                        p={4}
                        borderRadius="lg"
                        border="1px"
                        borderColor={borderColor}
                      >
                        <StatLabel>Efficiency Score</StatLabel>
                        <StatNumber>{carbonData.efficiency_score}/100</StatNumber>
                        <Progress
                          value={carbonData.efficiency_score}
                          colorScheme={
                            carbonData.efficiency_score >= 70
                              ? 'green'
                              : carbonData.efficiency_score >= 50
                              ? 'yellow'
                              : 'red'
                          }
                          size="sm"
                          mt={2}
                          borderRadius="full"
                        />
                      </Stat>
                    )}

                    {/* Cost Analysis */}
                    {carbonData.cost_analysis?.estimated_cost && (
                      <Stat
                        bg={cardBg}
                        p={4}
                        borderRadius="lg"
                        border="1px"
                        borderColor={borderColor}
                      >
                        <StatLabel>Estimated Cost</StatLabel>
                        <StatNumber>${carbonData.cost_analysis.estimated_cost}</StatNumber>
                        <StatHelpText>
                          ${carbonData.cost_analysis.cost_per_co2e?.toFixed(2)}/kg CO₂
                        </StatHelpText>
                      </Stat>
                    )}
                  </SimpleGrid>
                ) : carbonData && carbonData.error ? (
                  <Box textAlign="center" py={8}>
                    <Spinner size="lg" color="red.500" />
                    <Text mt={4} color="red.500">
                      {carbonData.error}
                    </Text>
                  </Box>
                ) : (
                  <Alert status="warning" borderRadius="lg">
                    <AlertIcon />
                    <Text>Carbon impact data is not available for this event type.</Text>
                  </Alert>
                )}
              </Box>

              <Divider />

              {/* Consumer Visibility Section */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                  Consumer Transparency
                </Text>

                <HStack spacing={4} align="center">
                  <HStack spacing={2}>
                    <Icon
                      as={
                        qrVisibility === 'high'
                          ? FaEye
                          : qrVisibility === 'medium'
                          ? FaMinus
                          : FaEyeSlash
                      }
                      color={
                        qrVisibility === 'high'
                          ? 'green.500'
                          : qrVisibility === 'medium'
                          ? 'yellow.500'
                          : 'gray.400'
                      }
                      boxSize={5}
                    />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" textTransform="capitalize">
                        {qrVisibility} QR Visibility
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {qrVisibility === 'high' && 'Highly relevant to consumers'}
                        {qrVisibility === 'medium' && 'Moderately relevant to consumers'}
                        {qrVisibility === 'low' && 'Internal farming activity'}
                      </Text>
                    </VStack>
                  </HStack>

                  <Tooltip
                    label="This indicates how relevant this event is to consumers scanning your product QR codes"
                    placement="top"
                    hasArrow
                  >
                    <Box cursor="help">
                      <Icon as={MdInfo} color="gray.400" boxSize={4} />
                    </Box>
                  </Tooltip>
                </HStack>
              </Box>

              {/* Data Source Information - Updated to use new fields */}
              {carbonData && (
                <Box p={4} bg={cardBg} borderRadius="lg">
                  <HStack justify="space-between" align="start" mb={3}>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                        Carbon Data Source
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {getCalculationMethodDescription(carbonData.calculation_method, carbonData)}
                      </Text>
                      {carbonData.data_source && (
                        <Text fontSize="xs" color="gray.400" fontStyle="italic">
                          Source: {carbonData.data_source}
                        </Text>
                      )}
                    </VStack>
                    <Badge
                      colorScheme={
                        carbonData.verification_status === 'usda_certified' ||
                        carbonData.verification_status === 'factors_verified' ||
                        carbonData.usda_factors_based
                          ? 'green'
                          : carbonData.error
                          ? 'red'
                          : 'blue'
                      }
                      variant="subtle"
                      fontSize="xs"
                    >
                      {carbonData.verification_status === 'usda_certified'
                        ? '✓ USDA Certified'
                        : carbonData.verification_status === 'factors_verified' ||
                          carbonData.usda_factors_based
                        ? '📊 USDA Factors'
                        : carbonData.error
                        ? '⚠ Data Unavailable'
                        : '📈 Estimated'}
                    </Badge>
                  </HStack>

                  {/* Data confidence indicator - Updated */}
                  <HStack spacing={2} align="center">
                    <Text fontSize="xs" color="gray.400">
                      Confidence:
                    </Text>
                    <HStack spacing={1}>
                      {[1, 2, 3].map((level) => (
                        <Box
                          key={level}
                          w={2}
                          h={2}
                          borderRadius="full"
                          bg={
                            level <=
                            (getDataSourceConfidence(carbonData) === 'high'
                              ? 3
                              : getDataSourceConfidence(carbonData) === 'medium'
                              ? 2
                              : 1)
                              ? carbonData.verification_status === 'usda_certified'
                                ? 'green.400'
                                : carbonData.usda_factors_based ||
                                  carbonData.verification_status === 'factors_verified'
                                ? 'blue.400'
                                : 'yellow.400'
                              : 'gray.200'
                          }
                        />
                      ))}
                    </HStack>
                    <Text fontSize="xs" color="gray.500" textTransform="capitalize">
                      {getDataSourceConfidence(carbonData)}
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          </ModalBody>

          {/* Fixed Footer */}
          <ModalFooter
            borderTop="1px"
            borderColor={borderColor}
            p={6}
            flexShrink={0}
            bg={useColorModeValue('white', 'gray.800')}
            borderBottomRadius="xl"
          >
            <Flex w="full" justify="space-between" align="center">
              <Button
                variant="ghost"
                onClick={onClose}
                size="lg"
                color="gray.600"
                _hover={{ bg: 'gray.100' }}
                borderRadius="lg"
              >
                Close
              </Button>

              <HStack spacing={3}>
                <Button
                  leftIcon={<FaTrash />}
                  colorScheme="red"
                  variant="outline"
                  onClick={onDeleteOpen}
                  size="lg"
                  borderRadius="lg"
                  fontWeight="semibold"
                  isLoading={isDeleting}
                  loadingText="Deleting..."
                  _hover={{
                    bg: 'red.50',
                    color: 'red.600',
                    borderColor: 'red.600'
                  }}
                  transition="all 0.2s"
                >
                  Delete
                </Button>

                <Button
                  leftIcon={<FaEdit />}
                  colorScheme="blue"
                  variant="solid"
                  onClick={handleEdit}
                  size="lg"
                  borderRadius="lg"
                  fontWeight="semibold"
                  _hover={{
                    transform: 'translateY(-1px)',
                    boxShadow: 'lg'
                  }}
                  transition="all 0.2s"
                >
                  Edit Event
                </Button>
              </HStack>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modern Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.300" backdropFilter="blur(10px)">
          <AlertDialogContent borderRadius="xl" p={2}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" pb={4}>
              <HStack spacing={3}>
                <Box p={2} borderRadius="lg" bg="red.50">
                  <Icon as={FaTrash} boxSize={5} color="red.500" />
                </Box>
                <Text>Delete Event</Text>
              </HStack>
            </AlertDialogHeader>

            <AlertDialogBody pb={6}>
              <VStack align="start" spacing={3}>
                <Text color="gray.600">
                  Are you sure you want to delete this event? This action cannot be undone.
                </Text>
                <Box p={3} bg="red.50" borderRadius="lg" w="full">
                  <Text fontSize="sm" color="red.700" fontWeight="medium">
                    ⚠️ This will permanently remove:
                  </Text>
                  <VStack align="start" spacing={1} mt={2} fontSize="sm" color="red.600">
                    <Text>• Event details and observations</Text>
                    <Text>• Associated carbon impact data</Text>
                    <Text>• Consumer QR code visibility</Text>
                  </VStack>
                </Box>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter pt={4}>
              <HStack spacing={3} w="full" justify="flex-end">
                <Button
                  ref={cancelRef}
                  onClick={onDeleteClose}
                  variant="ghost"
                  size="lg"
                  borderRadius="lg"
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleDelete}
                  size="lg"
                  borderRadius="lg"
                  fontWeight="semibold"
                  isLoading={isDeleting}
                  loadingText="Deleting..."
                  _hover={{
                    transform: 'translateY(-1px)',
                    boxShadow: 'lg'
                  }}
                  transition="all 0.2s"
                >
                  Delete Event
                </Button>
              </HStack>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
