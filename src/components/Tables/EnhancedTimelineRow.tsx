import React, { useRef, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  Button,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useDisclosure,
  HStack,
  VStack,
  Badge,
  Circle,
  Tooltip,
  Avatar,
  useBreakpointValue,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  Divider,
  SimpleGrid,
  Progress,
  Tag,
  TagLabel,
  TagLeftIcon
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  FaEllipsisH,
  FaWater,
  FaLeaf,
  FaTractor,
  FaFlask,
  FaSeedling,
  FaInfoCircle,
  FaDollarSign,
  FaChartLine,
  FaEye,
  FaCalendarAlt,
  FaUser,
  FaSun,
  FaRegCheckCircle,
  FaRegDotCircle,
  FaTint,
  FaEyeSlash,
  FaMinus,
  FaCamera,
  FaRulerCombined,
  FaClock,
  FaWeightHanging,
  FaThermometerHalf,
  FaCloudRain,
  FaGasPump,
  FaCog,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCertificate,
  FaStar,
  FaCircle,
  FaLayerGroup
} from 'react-icons/fa';
import { MdEco } from 'react-icons/md';
import { getVerificationBadgeConfig, VerificationLevel } from '../../utils/verificationTierHelpers';
import { formatCO2e, getImpactLevel } from '../../utils/carbonDisplayUtils';

// Real interfaces matching API data
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
  verification_level?: VerificationLevel;
  carbon_data?: CarbonCalculationResult;
  // Type-specific fields
  [key: string]: any;
}

interface EnhancedTimelineRowProps {
  logo: any;
  title: string;
  date: string;
  color: string;
  isLast?: boolean;
  url: string;
  type?: string;
  event: Event;
  members: Member[];
  onEventClick?: (event: Event) => void;
}

// Real carbon calculation result from API
interface CarbonCalculationResult {
  co2e: number;
  efficiency_score: number;
  usda_factors_based?: boolean;
  verification_status?: string;
  data_source?: string;
  calculation_method: string;
  event_type: string;
  timestamp: string;
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
  error?: string;
  usda_factors_used?: boolean;
}

// Enhanced event configuration for better categorization
const getEventConfig = (eventType: number, type: string, description: string) => {
  switch (eventType) {
    case 0: // Weather Event
      return {
        icon: FaSun,
        color: 'purple.500',
        category: 'Weather Event',
        bgGradient: 'linear(to-r, purple.50, purple.100)',
        borderColor: 'purple.200'
      };
    case 1: // Production Event
      return {
        icon: FaSeedling,
        color: 'green.500',
        category: 'Production Activity',
        bgGradient: 'linear(to-r, green.50, green.100)',
        borderColor: 'green.200'
      };
    case 2: // Chemical Event
      return {
        icon: FaFlask,
        color: 'orange.500',
        category: 'Chemical Application',
        bgGradient: 'linear(to-r, orange.50, orange.100)',
        borderColor: 'orange.200'
      };
    case 3: // Other Farm Activities (Sprint 2: renamed from General Event)
      return {
        icon: FaLeaf,
        color: 'gray.500',
        category: 'Other Farm Activity',
        bgGradient: 'linear(to-r, gray.50, gray.100)',
        borderColor: 'gray.200'
      };
    case 4: // Equipment Event
      return {
        icon: FaTractor,
        color: 'blue.500',
        category: 'Equipment Operation',
        bgGradient: 'linear(to-r, blue.50, blue.100)',
        borderColor: 'blue.200'
      };
    case 5: // Soil Management
      return {
        icon: FaMapMarkerAlt,
        color: 'brown.500',
        category: 'Soil Management',
        bgGradient: 'linear(to-r, yellow.50, yellow.100)',
        borderColor: 'yellow.300'
      };
    case 6: // Pest Management
      return {
        icon: FaLeaf,
        color: 'red.500',
        category: 'Pest Management',
        bgGradient: 'linear(to-r, red.50, red.100)',
        borderColor: 'red.200'
      };
    case 7: // Business Event
      return {
        icon: FaDollarSign,
        color: 'cyan.500',
        category: 'Business Activity',
        bgGradient: 'linear(to-r, cyan.50, cyan.100)',
        borderColor: 'cyan.200'
      };
    default:
      return {
        icon: FaLeaf,
        color: 'gray.500',
        category: 'Farm Activity',
        bgGradient: 'linear(to-r, gray.50, gray.100)',
        borderColor: 'gray.200'
      };
  }
};

// Subtype-aware field extraction — shows the 3 most important fields per event type/subtype
const extractEventFields = (event: Event) => {
  const fields: Array<{ label: string; value: string; icon?: any; color?: string }> = [];
  const subtype = event.type || '';

  switch (event.event_type) {
    case 0: { // Weather Event — subtype-aware priority
      const ed = event.extra_data || {};
      const wType = event.weather_type || subtype;

      // Frost (FR): low temp → protection → duration
      if (wType === 'FR' || subtype.includes('frost')) {
        if (event.lower_temperature || ed.lower_temperature)
          fields.push({ label: 'Low Temp', value: `${event.lower_temperature || ed.lower_temperature}°C`, icon: FaThermometerHalf, color: 'blue.500' });
        const prot = event.way_of_protection || ed.way_of_protection;
        if (prot) fields.push({ label: 'Protection', value: prot, icon: FaCheckCircle, color: 'green.500' });
      }
      // Drought (DR): water deficit → duration
      else if (wType === 'DR' || subtype.includes('drought')) {
        const wd = event.water_deficit || ed.water_deficit;
        if (wd) fields.push({ label: 'Water Deficit', value: `${wd}mm`, icon: FaTint, color: 'blue.600' });
      }
      // Hailstorm (HL): diameter → damage → duration
      else if (wType === 'HL' || subtype.includes('hailstorm')) {
        const dia = event.diameter || ed.diameter || ed.average_hailstone_diameter;
        if (dia) fields.push({ label: 'Hail Size', value: `${dia} ${dia.toString().includes('cm') ? '' : 'mm'}`, icon: FaCircle, color: 'gray.600' });
        const dmg = event.damage_assessment || ed.damage_assessment;
        if (dmg) fields.push({ label: 'Damage', value: dmg, icon: FaExclamationTriangle, color: 'red.500' });
      }
      // High Temperature (HT): high temp → duration
      else if (wType === 'HT' || subtype.includes('high_temperature')) {
        if (event.highest_temperature || ed.highest_temperature)
          fields.push({ label: 'High Temp', value: `${event.highest_temperature || ed.highest_temperature}°C`, icon: FaThermometerHalf, color: 'red.500' });
      }
      // Tropical Storm (TS) / High Winds (HW): wind speed → precipitation → damage
      else if (wType === 'TS' || wType === 'HW' || subtype.includes('storm') || subtype.includes('wind')) {
        const ws = event.wind_speed || ed.wind_speed;
        if (ws) fields.push({ label: 'Wind Speed', value: `${ws} km/h`, icon: FaLeaf, color: 'gray.500' });
        const precip = event.precipitation_amount || ed.precipitation_amount;
        if (precip) fields.push({ label: 'Precipitation', value: `${precip}mm`, icon: FaCloudRain, color: 'blue.400' });
        const dmg = event.damage_assessment || ed.damage_assessment;
        if (dmg) fields.push({ label: 'Damage', value: dmg, icon: FaExclamationTriangle, color: 'red.500' });
      }
      // Humidity (HH/LH): humidity level → crop impact → duration
      else if (wType === 'HH' || wType === 'LH' || subtype.includes('humidity')) {
        const hum = event.humidity_level || ed.humidity_level;
        if (hum) fields.push({ label: 'Humidity', value: `${hum}%`, icon: FaTint, color: 'cyan.500' });
        const impact = event.crop_impact || ed.crop_impact;
        if (impact) fields.push({ label: 'Crop Impact', value: impact, icon: FaExclamationTriangle, color: 'orange.500' });
      }
      // Generic fallback: push whatever temperature/weather data exists
      else {
        if (event.highest_temperature || ed.highest_temperature)
          fields.push({ label: 'High Temp', value: `${event.highest_temperature || ed.highest_temperature}°C`, icon: FaThermometerHalf, color: 'red.500' });
        if (event.lower_temperature || ed.lower_temperature)
          fields.push({ label: 'Low Temp', value: `${event.lower_temperature || ed.lower_temperature}°C`, icon: FaThermometerHalf, color: 'blue.500' });
      }

      // Common weather fields: duration (useful across all subtypes)
      const dur = event.duration || ed.duration || ed.event_duration;
      if (dur && fields.length < 3) {
        const isHailstorm = wType === 'HL';
        const durStr = dur.toString().toLowerCase();
        const hasUnit = durStr.includes('hour') || durStr.includes('hr') || durStr.includes('min');
        fields.push({ label: 'Duration', value: `${dur}${hasUnit ? '' : isHailstorm ? ' minutes' : ' hours'}`, icon: FaClock, color: 'purple.500' });
      }

      if (fields.length === 0) {
        fields.push({ label: 'Weather Data', value: 'Details not available', icon: FaInfoCircle, color: 'gray.500' });
      }
      break;
    }

    case 1: { // Production Event — subtype-aware priority
      const prodType = event.production_type || subtype;

      // Harvest (HA): yield first, then quality grade, then area
      if (prodType === 'HA') {
        if (event.yield_quantity && event.yield_quantity > 0)
          fields.push({ label: 'Yield', value: `${event.yield_quantity} ${event.yield_unit || 'units'}`, icon: FaWeightHanging, color: 'green.600' });
        if (event.harvest_quality_grade)
          fields.push({ label: 'Quality', value: event.harvest_quality_grade.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: FaStar, color: 'yellow.500' });
        if (event.area_covered && event.area_covered > 0)
          fields.push({ label: 'Area', value: `${event.area_covered} ${event.area_unit || 'ha'}`, icon: FaRulerCombined, color: 'green.500' });
      }
      // Irrigation (IR): method first, then area, then water source
      else if (prodType === 'IR') {
        if (event.irrigation_method)
          fields.push({ label: 'Method', value: event.irrigation_method.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: FaWater, color: 'blue.500' });
        if (event.area_covered && event.area_covered > 0)
          fields.push({ label: 'Area', value: `${event.area_covered} ${event.area_unit || 'ha'}`, icon: FaRulerCombined, color: 'green.500' });
        if (event.water_source)
          fields.push({ label: 'Water Source', value: event.water_source.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: FaTint, color: 'blue.400' });
      }
      // Planting (PL): quantity (seeds), area, seeds source
      else if (prodType === 'PL') {
        if (event.yield_quantity && event.yield_quantity > 0)
          fields.push({ label: 'Seeds/Plants', value: `${event.yield_quantity} ${event.yield_unit || 'units'}`, icon: FaSeedling, color: 'green.600' });
        if (event.area_covered && event.area_covered > 0)
          fields.push({ label: 'Area', value: `${event.area_covered} ${event.area_unit || 'ha'}`, icon: FaRulerCombined, color: 'green.500' });
        if (event.seeds_source)
          fields.push({ label: 'Seed Source', value: event.seeds_source.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: FaLeaf, color: 'green.400' });
      }
      // Equipment Maintenance (EM): equipment type, fuel, hours
      else if (prodType === 'EM') {
        if (event.equipment_type)
          fields.push({ label: 'Equipment', value: event.equipment_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: FaTractor, color: 'blue.500' });
        if (event.fuel_consumed && event.fuel_consumed > 0)
          fields.push({ label: 'Fuel Used', value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`, icon: FaGasPump, color: 'orange.500' });
        if (event.equipment_hours && event.equipment_hours > 0)
          fields.push({ label: 'Hours', value: `${event.equipment_hours} hours`, icon: FaClock, color: 'blue.500' });
      }
      // Default production (PR, TR, CU, TH): area, fuel, hours
      else {
        if (event.area_covered && event.area_covered > 0)
          fields.push({ label: 'Area', value: `${event.area_covered} ${event.area_unit || 'ha'}`, icon: FaRulerCombined, color: 'green.500' });
        if (event.fuel_consumed && event.fuel_consumed > 0)
          fields.push({ label: 'Fuel Used', value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`, icon: FaGasPump, color: 'orange.500' });
        if (event.equipment_hours && event.equipment_hours > 0)
          fields.push({ label: 'Hours', value: `${event.equipment_hours} hours`, icon: FaClock, color: 'blue.500' });
      }
      break;
    }

    case 2: { // Chemical Event — commercial_name is already the card title, don't repeat it
      const chemType = event.chemical_type || subtype;

      // Area treated — universal priority for all chemical events
      if (event.area_treated && event.area_treated > 0)
        fields.push({ label: 'Area Treated', value: `${event.area_treated} ${event.area_unit || 'ha'}`, icon: FaRulerCombined, color: 'orange.600' });
      else if (event.area && event.area !== '0')
        fields.push({ label: 'Area Treated', value: event.area, icon: FaRulerCombined, color: 'orange.600' });

      // Volume/application rate — universal
      if (event.volume_applied && event.volume_applied > 0)
        fields.push({ label: 'Volume', value: `${event.volume_applied} ${event.volume_unit || 'L'}`, icon: FaTint, color: 'blue.500' });
      else if (event.volume && event.volume !== '0')
        fields.push({ label: 'Rate', value: event.volume, icon: FaTint, color: 'blue.500' });

      // Subtype-specific third field
      if (chemType === 'FE' || subtype.includes('fertilizer')) {
        // Fertilizer: NPK ratio or concentration
        const npk = event.npk_ratio || event.concentration;
        if (npk) fields.push({ label: 'NPK', value: npk, icon: FaLeaf, color: 'green.500' });
      } else if (chemType === 'PE' || chemType === 'FU' || chemType === 'HE' || subtype.includes('pesticide') || subtype.includes('fungicide') || subtype.includes('herbicide')) {
        // Pest/Fungi/Herb: target pest/disease or application method
        if (event.target_pest_disease)
          fields.push({ label: 'Target', value: event.target_pest_disease, icon: FaLeaf, color: 'red.500' });
        else if (event.way_of_application || event.application_method_structured) {
          const method = event.application_method_structured || event.way_of_application;
          fields.push({ label: 'Method', value: method.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: FaCog, color: 'gray.600' });
        }
      }

      // Organic status as third field if we have room
      if (fields.length < 3 && event.organic_approved && event.organic_approved !== 'not_applicable') {
        const isOrganic = ['yes', 'omri_listed', 'usda_nop_approved', 'organic_equivalent'].includes(event.organic_approved);
        fields.push({ label: 'Organic', value: isOrganic ? 'Yes' : 'Conventional', icon: FaLeaf, color: isOrganic ? 'green.500' : 'gray.500' });
      }
      break;
    }

    case 3: // General Event — OK as-is
      if (event.duration)
        fields.push({ label: 'Duration', value: `${event.duration} hours`, icon: FaClock, color: 'gray.500' });
      if (event.people_involved)
        fields.push({ label: 'Participants', value: `${event.people_involved} people`, icon: FaUser, color: 'blue.500' });
      break;

    case 4: // Equipment Event — add equipment identity first
      if (event.equipment_name || event.equipment_type_structured) {
        const eqName = event.equipment_name || event.equipment_type_structured.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        fields.push({ label: 'Equipment', value: eqName, icon: FaTractor, color: 'blue.500' });
      }
      if (event.fuel_consumed)
        fields.push({ label: 'Fuel Used', value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`, icon: FaGasPump, color: 'orange.500' });
      if (event.hours_operated)
        fields.push({ label: 'Hours', value: `${event.hours_operated} hours`, icon: FaClock, color: 'blue.500' });
      if (fields.length < 3 && event.maintenance_cost)
        fields.push({ label: 'Cost', value: `$${event.maintenance_cost}`, icon: FaDollarSign, color: 'green.600' });
      if (fields.length < 3 && event.area_worked)
        fields.push({ label: 'Area', value: `${event.area_worked} ${event.area_unit || 'ha'}`, icon: FaRulerCombined, color: 'green.500' });
      break;

    case 5: { // Soil Management — soil science fields first, operational fields last
      const soilType = event.soil_management_type || subtype;

      // Soil pH — critical for ST, PA events
      if (event.soil_ph)
        fields.push({ label: 'Soil pH', value: `${event.soil_ph}`, icon: FaFlask, color: 'purple.500' });

      // Organic matter — critical for ST, OM events
      if (event.organic_matter_percentage)
        fields.push({ label: 'Organic Matter', value: `${event.organic_matter_percentage}%`, icon: FaLeaf, color: 'green.600' });

      // Amendment type/amount — critical for PA, OM, SA events
      if (event.amendment_type)
        fields.push({ label: 'Amendment', value: event.amendment_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), icon: FaSeedling, color: 'green.500' });

      // Working depth — critical for TI events
      if (event.working_depth)
        fields.push({ label: 'Depth', value: `${event.working_depth} ${event.depth_unit || 'cm'}`, icon: FaMapMarkerAlt, color: 'yellow.700' });

      // Area covered — universal fallback
      if (fields.length < 3 && event.area_covered)
        fields.push({ label: 'Area', value: `${event.area_covered} ${event.area_unit || 'ha'}`, icon: FaRulerCombined, color: 'yellow.600' });

      // Equipment used
      if (fields.length < 3 && event.equipment_used)
        fields.push({ label: 'Equipment', value: event.equipment_used, icon: FaTractor, color: 'blue.500' });
      break;
    }

    case 6: { // Pest Management — subtype-aware
      const pestType = event.pest_management_type || event.pest_type || subtype;

      // Beneficial Release (BR): species + quantity are the defining fields
      if (pestType === 'BR' || pestType === 'beneficial_release') {
        if (event.beneficial_species)
          fields.push({ label: 'Species', value: event.beneficial_species, icon: FaLeaf, color: 'green.500' });
        if (event.release_quantity)
          fields.push({ label: 'Quantity', value: `${event.release_quantity}`, icon: FaWeightHanging, color: 'green.600' });
        if (event.field_area_hectares)
          fields.push({ label: 'Area', value: `${event.field_area_hectares} ha`, icon: FaRulerCombined, color: 'red.600' });
      }
      // Trap Monitoring (TM): trap count + pest species + findings
      else if (pestType === 'TM' || pestType === 'trap_monitoring') {
        if (event.trap_count)
          fields.push({ label: 'Traps Checked', value: `${event.trap_count}`, icon: FaCog, color: 'orange.500' });
        if (event.pest_species)
          fields.push({ label: 'Target Pest', value: event.pest_species, icon: FaLeaf, color: 'red.500' });
        if (event.field_area_hectares)
          fields.push({ label: 'Area', value: `${event.field_area_hectares} ha`, icon: FaRulerCombined, color: 'red.600' });
      }
      // Scouting (SC), Identification (PI), Threshold (TA), IPM (IP): pest + damage + area
      else {
        if (event.pest_species)
          fields.push({ label: 'Target Pest', value: event.pest_species, icon: FaLeaf, color: 'red.500' });
        if (event.damage_percentage)
          fields.push({ label: 'Damage', value: `${event.damage_percentage}%`, icon: FaExclamationTriangle, color: 'orange.500' });
        if (event.field_area_hectares)
          fields.push({ label: 'Area', value: `${event.field_area_hectares} ha`, icon: FaRulerCombined, color: 'red.600' });
      }

      // Chemical-free period — great trust indicator across all pest subtypes
      if (fields.length < 3 && event.chemical_free_period_days)
        fields.push({ label: 'Chemical-Free', value: `${event.chemical_free_period_days} days`, icon: FaCheckCircle, color: 'green.500' });
      break;
    }

    case 7: // Business Event — certification + status + practice/certifier
      if (event.certification_type)
        fields.push({
          label: 'Certification',
          value: event.certification_type_display || event.certification_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: FaCertificate, color: 'blue.500'
        });
      if (event.verification_status)
        fields.push({
          label: 'Status',
          value: event.verification_status_display || event.verification_status.replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: FaCheckCircle, color: 'cyan.500'
        });
      // Sustainability practice or certifier name — more useful than trust_impact
      if (event.sustainability_practice)
        fields.push({
          label: 'Practice',
          value: event.sustainability_practice_display || event.sustainability_practice.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: FaLeaf, color: 'green.500'
        });
      else if (event.verified_certifier_name)
        fields.push({ label: 'Certifier', value: event.verified_certifier_name, icon: FaStar, color: 'yellow.500' });
      break;
  }

  return fields.slice(0, 3); // Display max 3 fields in the timeline card grid
};

// Get operator name from members array
const getOperatorName = (event: Event, members: Member[]) => {
  const operator = members.find((member) => member.id === event.created_by);
  return operator ? operator.full_name : 'Unknown Operator';
};

// Enhanced description generation
const getEnhancedDescription = (event: Event) => {
  // Use the observation field if it contains meaningful content
  if (
    event.observation &&
    event.observation.trim() &&
    !event.observation.toLowerCase().includes('no additional details')
  ) {
    return event.observation;
  }

  // Generate smart description based on event type and data
  switch (event.event_type) {
    case 0: // Weather
      if (event.water_deficit) {
        return `Drought conditions with ${event.water_deficit}mm water deficit recorded`;
      }
      if (event.precipitation_amount) {
        return `Rainfall event with ${event.precipitation_amount}mm precipitation`;
      }
      return 'Weather event recorded for agricultural monitoring';

    case 1: // Production
      const productionDetails = [];
      if (event.area_covered)
        productionDetails.push(`${event.area_covered} ${event.area_unit || 'ha'}`);
      if (event.yield_quantity)
        productionDetails.push(`${event.yield_quantity} ${event.yield_unit || 'units'}`);

      if (productionDetails.length > 0) {
        return `Agricultural production activity covering ${productionDetails.join(' • ')}`;
      }
      return 'Production activity completed as part of sustainable farming';

    case 2: // Chemical
      if (event.commercial_name && event.area_treated) {
        return `Applied ${event.commercial_name} to ${event.area_treated} ${
          event.area_unit || 'ha'
        }`;
      }
      return 'Chemical application for crop management';

    case 3: // General
      if (event.activity_name) {
        return `${event.activity_name} completed with ${
          event.people_involved || '1'
        } participant(s)`;
      }
      return 'General farm activity completed';

    case 4: // Equipment
      if (event.hours_operated && event.area_worked) {
        return `Equipment operation for ${event.hours_operated} hours covering ${event.area_worked} ha`;
      }
      return 'Equipment operation completed';

    case 5: // Soil Management
      if (event.area_covered) {
        return `Soil management activities covering ${event.area_covered} ${
          event.area_unit || 'ha'
        }`;
      }
      return 'Soil management activities completed';

    case 6: // Pest Management
      if (event.pest_species && event.damage_percentage) {
        return `${event.pest_species} management with ${event.damage_percentage}% damage level`;
      }
      if (event.pest_species) {
        return `Pest management targeting ${event.pest_species}`;
      }
      return 'Integrated pest management activities';

    case 7: // Business
      // Carbon credits tooltip removed - transparency-first approach
      if (event.certification_type) {
        const certDisplay = event.certification_type_display || event.certification_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        return `${certDisplay} activities`;
      }
      return 'Business sustainability activities completed';

    default:
      return event.observation || 'Agricultural activity completed';
  }
};

function EnhancedTimelineRow(props: EnhancedTimelineRowProps) {
  const { logo, title, date, color, isLast, url, type, event, members, onEventClick } = props;
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white.300');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const navigate = useNavigate();

  // State to handle timeline rendering after mount
  const [isMounted, setIsMounted] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Mobile responsiveness
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Use embedded carbon data — weather (0), general (3), and business (7) events always have 0 emissions
  const isZeroEmissionType = event.event_type === 0 || event.event_type === 3 || event.event_type === 7;
  const zeroEmissionLabels: Record<number, string> = { 0: 'weather', 3: 'general', 7: 'business' };
  const carbonData = isZeroEmissionType
    ? { co2e: 0, efficiency_score: 100, calculation_method: `${zeroEmissionLabels[event.event_type]}_transparency` }
    : (event.carbon_data || null);

  // Get enhanced event configuration
  const eventConfig = getEventConfig(event.event_type, event.type, event.description);

  // Extract event-specific fields
  const eventFields = extractEventFields(event);
  const operatorName = getOperatorName(event, members);
  const enhancedDescription = getEnhancedDescription(event);

  // Force re-render after mount to fix timeline positioning
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box position="relative" mb={4} w="100%" ref={timelineRef}>
      {/* Timeline Connector Line */}
      {!isLast && !isMobile && isMounted && (
        <Box
          position="absolute"
          left="20px"
          top="56px"
          w="2px"
          h="calc(100% + 8px)"
          bg={useColorModeValue('gray.200', 'gray.600')}
          borderRadius="full"
          zIndex={0}
          opacity={isMounted ? 1 : 0}
          transition="all 0.3s ease-in-out"
        />
      )}

      <HStack spacing={isMobile ? 0 : 4} align="flex-start" w="100%">
        {/* Minimal Timeline Icon */}
        {!isMobile && (
          <VStack spacing={0} align="center" minW="42px" position="relative" zIndex={1} mt="8px">
            <Circle
              size="42px"
              bg="white"
              borderWidth="3px"
              borderColor={eventConfig.color}
              color={eventConfig.color}
              boxShadow="0 2px 8px rgba(0,0,0,0.1)"
              _hover={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transform: 'translateY(-1px)'
              }}
              transition="all 0.2s ease"
            >
              <Icon as={eventConfig.icon} boxSize={5} />
            </Circle>
          </VStack>
        )}

        {/* Clean Modern Card */}
        <Card
          flex={1}
          bg={bgColor}
          borderRadius="12px"
          border="1px solid"
          borderColor={borderColor}
          cursor="pointer"
          transition="all 0.2s ease"
          position="relative"
          overflow="hidden"
          _hover={{
            borderColor: eventConfig.color,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)'
          }}
          onClick={() => (onEventClick ? onEventClick(event) : navigate(url))}
          className="trazo-card"
        >
          <CardBody p={{ base: 3, md: 4 }}>
            <VStack align="stretch" spacing={{ base: 3, md: 4 }}>
              {/* Clean Header */}
              <Flex justify="space-between" align="flex-start" w="100%">
                <HStack spacing={3} flex={1} minW={0}>
                  {/* Mobile icon */}
                  {isMobile && (
                    <Circle size="32px" bg={eventConfig.color} color="white" flexShrink={0}>
                      <Icon as={eventConfig.icon} boxSize={4} />
                    </Circle>
                  )}
                  <VStack align="flex-start" spacing={1} flex={1} minW={0}>
                    <Tooltip label={title} placement="top" hasArrow openDelay={500}>
                      <Text
                        fontSize={{ base: 'md', md: 'lg' }}
                        fontWeight="600"
                        color={textColor}
                        noOfLines={2}
                        letterSpacing="-0.02em"
                      >
                        {title}
                      </Text>
                    </Tooltip>
                    <HStack spacing={2} wrap="wrap">
                      {/* Event Category Badge - Subtle */}
                      <Badge
                        colorScheme={eventConfig.color.split('.')[0]}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        fontWeight="500"
                        borderRadius="6px"
                      >
                        {eventConfig.category}
                      </Badge>

                      {/* Summary/Aggregate Badge */}
                      {(event.is_summary === true ||
                        event.extra_data?.is_summary === true ||
                        event.extra_data?.is_summary === 'true') && (
                        <Tooltip
                          label={`Aggregate of ${
                            event.event_count || event.extra_data?.event_count || 'multiple'
                          } events`}
                          hasArrow
                          placement="top"
                        >
                          <Badge
                            colorScheme="purple"
                            variant="subtle"
                            fontSize="xs"
                            px={2}
                            py={1}
                            fontWeight="600"
                            borderRadius="6px"
                            display="flex"
                            alignItems="center"
                            gap={1}
                            cursor="help"
                          >
                            <Icon as={FaLayerGroup} boxSize={3} />
                            {event.event_count || event.extra_data?.event_count || 'Summary'}
                          </Badge>
                        </Tooltip>
                      )}

                      {/* Verification Badge - COMPACT PRIMARY (Optimized Space) */}
                      {event.verification_level && (
                        <Tooltip
                          label={getVerificationBadgeConfig(event.verification_level).tooltip}
                          hasArrow
                          placement="top"
                        >
                          <Badge
                            colorScheme={
                              getVerificationBadgeConfig(event.verification_level).color.split(
                                '.'
                              )[0]
                            }
                            variant="solid"
                            fontSize="xs"
                            px={2}
                            py={1}
                            fontWeight="600"
                            borderRadius="6px"
                            display="flex"
                            alignItems="center"
                            gap={1}
                            boxShadow="0 1px 2px rgba(0,0,0,0.08)"
                            cursor="help"
                          >
                            <Icon
                              as={getVerificationBadgeConfig(event.verification_level).icon}
                              boxSize={3}
                            />
                            <Text display={{ base: 'none', md: 'inline' }}>
                              {getVerificationBadgeConfig(event.verification_level).label}
                            </Text>
                          </Badge>
                        </Tooltip>
                      )}

                      {/* EPA/USDA-sourced Badge - ULTRA-COMPACT SECONDARY (Optimized Space) */}
                      {carbonData?.usda_factors_based && (
                        <Tooltip
                          label={intl.formatMessage({ id: 'carbon.badge.epaUsdaTooltip' })}
                          hasArrow
                          placement="top"
                        >
                          <Badge
                            colorScheme="blue"
                            variant="subtle"
                            fontSize="2xs"
                            px={1.5}
                            py={0.5}
                            fontWeight="600"
                            borderRadius="4px"
                            textTransform="uppercase"
                            letterSpacing="0.05em"
                            cursor="help"
                          >
                            {intl.formatMessage({ id: 'carbon.badge.epaUsda' })}
                          </Badge>
                        </Tooltip>
                      )}
                    </HStack>
                  </VStack>
                </HStack>

                {/* Clean Date Display */}
                <VStack align="flex-end" spacing={0} flexShrink={0} ml={4}>
                  {event.extra_data?.date_start && event.extra_data?.date_end ? (
                    <>
                      <Text fontSize="xs" fontWeight="600" color="gray.700">
                        {new Date(event.extra_data.date_start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                        {' - '}
                        {new Date(event.extra_data.date_end).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Date Range
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600" color="gray.700">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(event.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </>
                  )}
                </VStack>
              </Flex>

              {/* Clean Description */}
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" lineHeight="relaxed" noOfLines={2}>
                {enhancedDescription}
              </Text>

              {/* Simplified Key Details */}
              {eventFields.length > 0 && (
                <Grid templateColumns="repeat(auto-fit, minmax(100px, 1fr))" gap={2} w="100%">
                  {eventFields.slice(0, 3).map((field, index) => (
                    <VStack key={index} align="flex-start" spacing={1} minW={0}>
                      <Text fontSize="xs" color="gray.500" fontWeight="500" noOfLines={1}>
                        {field.label}
                      </Text>
                      <HStack spacing={1}>
                        {field.icon && <Icon as={field.icon} color={field.color} boxSize={3} />}
                        <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600" color="gray.700" noOfLines={1}>
                          {field.value}
                        </Text>
                      </HStack>
                    </VStack>
                  ))}
                </Grid>
              )}

              {/* Clean Metrics Section */}
              <Divider />

              <Flex wrap="wrap" justify="space-between" align="center" gap={2}>
                {/* Carbon Impact */}
                {carbonData && !carbonData.error ? (
                  <Tooltip
                    label={`Environmental Impact: ${formatCO2e(carbonData.co2e)} kg CO₂e ${
                      carbonData.co2e === 0
                        ? '(no direct emissions)'
                        : '(carbon footprint estimate)'
                    }`}
                    placement="top"
                    hasArrow
                    bg="gray.700"
                    color="white"
                    fontSize="sm"
                    borderRadius="md"
                    px={3}
                    py={2}
                  >
                    <HStack spacing={2} cursor="help" flexShrink={0}>
                      <Circle size="24px" bg={carbonData.co2e === 0 ? 'gray.100' : `${getImpactLevel(carbonData.co2e).color}.100`}>
                        <Icon
                          as={MdEco}
                          color={carbonData.co2e === 0 ? 'gray.500' : `${getImpactLevel(carbonData.co2e).color}.600`}
                          boxSize={3}
                        />
                      </Circle>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color={carbonData.co2e === 0 ? 'gray.500' : `${getImpactLevel(carbonData.co2e).color}.700`}
                        whiteSpace="nowrap"
                      >
                        {formatCO2e(carbonData.co2e)} kg CO₂e
                      </Text>
                    </HStack>
                  </Tooltip>
                ) : (
                  <HStack spacing={2} flexShrink={0}>
                    <Circle size="24px" bg="gray.100">
                      <Icon as={MdEco} color="gray.400" boxSize={3} />
                    </Circle>
                    <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                      No CO₂ data
                    </Text>
                  </HStack>
                )}

                {/* Efficiency Score & Operator */}
                <HStack spacing={3} flexShrink={0}>
                  {carbonData?.efficiency_score && carbonData.efficiency_score > 0 && (
                    <HStack spacing={1}>
                      <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                        Efficiency
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        whiteSpace="nowrap"
                        color={
                          carbonData.efficiency_score >= 70
                            ? 'green.600'
                            : carbonData.efficiency_score >= 50
                            ? 'yellow.600'
                            : 'red.600'
                        }
                      >
                        {carbonData.efficiency_score}/100
                      </Text>
                    </HStack>
                  )}

                  {/* Operator & Photo Status */}
                  <Text fontSize="xs" color="gray.500" textAlign="right" maxW="100px" noOfLines={1}>
                    {operatorName}
                  </Text>
                  {!event.image && (
                    <Circle size="20px" bg="orange.100" flexShrink={0}>
                      <Icon as={FaCamera} color="orange.500" boxSize={2.5} />
                    </Circle>
                  )}
                </HStack>
              </Flex>
            </VStack>
          </CardBody>
        </Card>
      </HStack>
    </Box>
  );
}

export default EnhancedTimelineRow;
