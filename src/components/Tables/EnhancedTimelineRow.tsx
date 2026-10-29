import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { TYPE_BADGE } from 'config/events/eventTypeAppearance';
import { activityLabel, subtypeOf } from 'config/events/narrative';
// Event Field Registry (Phase 5 — feature-flagged)
import { getFieldsForSurface } from 'src/config/events';

const USE_FIELD_REGISTRY = import.meta.env.VITE_USE_FIELD_REGISTRY === 'true';
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
  FaLayerGroup,
  FaBolt,
  FaBug,
  FaClipboardList
} from 'react-icons/fa';
import { MdEco } from 'react-icons/md';
import type { VerificationLevel } from '../../utils/verificationTierHelpers';
import { formatCO2e, getImpactLevel } from '../../utils/carbonDisplayUtils';
import { formatDateFromTimestamp, formatWallClockTime } from 'utils/dateOnly';
import {
  hasNoCarbonCalculation,
  isNotEstimated,
  NO_CARBON_CALCULATION_STATUS,
  showsAreaEstimateLabel,
  showsInputsBadge
} from 'utils/carbonStatus';
import { localizeFieldValue } from 'utils/fieldDisplayUtils';

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
  /** Null when nothing was estimated (see `utils/carbonStatus`). Unknown is not zero. */
  co2e: number | null;
  not_estimated?: boolean;
  // Still sent by the API, no longer rendered — see the removal note in the footer row.
  efficiency_score?: number;
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
/**
 * ⚠️ `color` is a `.700`/`.800` step ON PURPOSE, and moving it back to `.500` breaks two things.
 *
 * It is consumed FIVE ways (see the call sites below), and every one of them is a graphical
 * object owing WCAG's 3.0 non-text minimum — a 42px ring border, the glyph inside that ring, a
 * card hover border, and on mobile a filled circle carrying a WHITE glyph:
 *
 *   MEASURED on white, before this change:
 *     green.500   2.78  ⛔ FAILS the 3.0 floor outright — and `.claude/rules/frontend.md` bans
 *                        a white icon on green.500 by name, which is exactly what the mobile
 *                        32px circle did
 *     blue.500    3.12     clears 3.0 by 0.12
 *     orange.500  3.39     "
 *     teal.500    3.51     "
 *     yellow.700  3.64     "
 *     red.500     3.68     "
 *   After: 4.60 - 6.53. Every ring and every white-on-fill glyph now clears 4.5 with room.
 *
 * ⚠️ That open question — "should eight categories carry eight hues at all" — was ANSWERED on
 * 2026-08-29: no. Every entry below is now `green.700`, and the ring sits on `green.50`.
 *
 * The eight hues were decoration wearing the clothes of a code: blue for weather, yellow for
 * soil, teal for business, red for pest — four of them (orange, yellow, teal, purple) not even
 * Trazo scales but Chakra defaults, and two families, Weather and Equipment, resolving to
 * pixel-identical blues, so the code did not separate what it claimed to. Meanwhile red and
 * amber were spent on ordinary compliant records, which is the colour the dashboard needs for
 * a real blocker.
 *
 * ONE hue, weight carrying difference. The GLYPH separates a frost record from a spray — this
 * value only says the row belongs to Trazo. Status colour stays reserved for status.
 *
 * The old caution about string-splitting is spent: the category Badge stopped deriving its
 * palette from this value on 2026-08-28 and now renders from TYPE_BADGE. Hue here is free.
 *
 * ⚠️ `bgGradient` and `borderColor` below are DEAD — nothing reads either field. Left in place
 * rather than deleted so this change stays a pure contrast fix, but do not add more.
 */
const getEventConfig = (eventType: number, type: string, description: string) => {
  switch (eventType) {
    case 0: // Weather Event
      return {
        icon: FaCloudRain,
        color: 'green.700',
        category: 'Weather Event',
        bgGradient: 'linear(to-r, blue.50, blue.100)',
        borderColor: 'blue.200'
      };
    case 1: // Production Event
      return {
        icon: FaSeedling,
        color: 'green.700',
        category: 'Production Activity',
        bgGradient: 'linear(to-r, green.50, green.100)',
        borderColor: 'green.200'
      };
    case 2: // Chemical Event
      return {
        icon: FaFlask,
        // gray.600, not orange.700 (2026-08-28). See the note on case 6 — an approved organic
        // input is not a warning, and the badge beside this ring is now `neutral`.
        color: 'green.700',
        category: 'Chemical Application',
        bgGradient: 'linear(to-r, orange.50, orange.100)',
        borderColor: 'orange.200'
      };
    case 3: // Other Farm Activities (Sprint 2: renamed from General Event)
      return {
        icon: FaClipboardList,
        color: 'green.700',
        category: 'Other Farm Activity',
        bgGradient: 'linear(to-r, gray.50, gray.100)',
        borderColor: 'gray.200'
      };
    case 4: // Equipment Event
      return {
        icon: FaTractor,
        // blue.900, not blue.700 — Weather (case 0) was `blue.500` and became `blue.700` when
        // the steps were raised, which would have made these two categories the SAME colour.
        // They already share a Badge palette (both split to `blue`), so the ring was the only
        // thing telling them apart. 8.59:1 on white.
        color: 'green.700',
        category: 'Equipment Operation',
        bgGradient: 'linear(to-r, blue.50, blue.100)',
        borderColor: 'blue.200'
      };
    case 5: // Soil Management
      return {
        icon: FaLayerGroup,
        color: 'green.700',
        category: 'Soil Management',
        bgGradient: 'linear(to-r, yellow.50, yellow.100)',
        borderColor: 'yellow.300'
      };
    case 6: // Pest Management
      return {
        icon: FaBug,
        /*
         * gray.600, not red.700 (2026-08-28). A pheromone-trap reading rendered with a RED ring
         * and a red badge, which on a certifier-facing record reads as an incident. It is the
         * opposite: 7 CFR 205.206 is the crop pest, weed and disease management practice
         * standard, and monitoring is the documented preventive practice it asks for — this row
         * is compliance EVIDENCE. Red is reserved for something a grower must act on.
         *
         * Grey rather than a new hue because the GLYPH is the identity here — the bug separates
         * this from a spray, exactly as config/events/eventTypeAppearance.ts argues. Matches
         * case 3, which is already gray.600 (5.74:1 on white).
         */
        color: 'green.700',
        category: 'Pest Management',
        bgGradient: 'linear(to-r, red.50, red.100)',
        borderColor: 'red.200'
      };
    case 7: // Business Event
      return {
        icon: FaCertificate,
        color: 'green.700',
        category: 'Business Activity',
        bgGradient: 'linear(to-r, teal.50, teal.100)',
        borderColor: 'teal.200'
      };
    default:
      return {
        icon: FaLeaf,
        color: 'green.700',
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
    case 0: {
      // Weather Event — subtype-aware priority
      const ed = event.extra_data || {};
      const wType = event.weather_type || subtype;
      // Temperature unit lives alongside the value; defaults to "C" for
      // historical rows created before the °C/°F toggle existed.
      const tempUnitRaw = (event as any).temperature_unit || ed.temperature_unit || 'C';
      const tempUnit =
        typeof tempUnitRaw === 'string' && tempUnitRaw.toUpperCase() === 'F' ? '°F' : '°C';

      // Frost (FR): low temp → protection → duration
      if (wType === 'FR' || subtype.includes('frost')) {
        if (event.lower_temperature || ed.lower_temperature)
          fields.push({
            label: 'Low Temp',
            value: `${event.lower_temperature || ed.lower_temperature}${tempUnit}`,
            icon: FaThermometerHalf,
            color: 'blue.500'
          });
        const prot = event.way_of_protection || ed.way_of_protection;
        if (prot)
          fields.push({
            label: 'Protection',
            value: prot,
            icon: FaCheckCircle,
            color: 'green.500'
          });
      }
      // Drought (DR): water deficit → duration
      else if (wType === 'DR' || subtype.includes('drought')) {
        const wd = event.water_deficit || ed.water_deficit;
        if (wd)
          fields.push({
            label: 'Water Deficit',
            value: `${wd}mm`,
            icon: FaTint,
            color: 'blue.600'
          });
      }
      // Hailstorm (HL): diameter → damage → duration
      else if (wType === 'HL' || subtype.includes('hailstorm')) {
        const dia = event.diameter || ed.diameter || ed.average_hailstone_diameter;
        if (dia)
          fields.push({
            label: 'Hail Size',
            value: `${dia} ${dia.toString().includes('cm') ? '' : 'mm'}`,
            icon: FaCircle,
            color: 'gray.600'
          });
        const dmg = event.damage_assessment || ed.damage_assessment;
        if (dmg)
          fields.push({
            label: 'Damage',
            value: dmg,
            icon: FaExclamationTriangle,
            color: 'red.500'
          });
      }
      // High Temperature (HT): high temp → duration
      else if (wType === 'HT' || subtype.includes('high_temperature')) {
        if (event.highest_temperature || ed.highest_temperature)
          fields.push({
            label: 'High Temp',
            value: `${event.highest_temperature || ed.highest_temperature}${tempUnit}`,
            icon: FaThermometerHalf,
            color: 'red.500'
          });
      }
      // Tropical Storm (TS) / High Winds (HW): wind speed → precipitation → damage
      else if (
        wType === 'TS' ||
        wType === 'HW' ||
        subtype.includes('storm') ||
        subtype.includes('wind')
      ) {
        const ws = event.wind_speed || ed.wind_speed;
        if (ws)
          fields.push({
            label: 'Wind Speed',
            value: `${ws} km/h`,
            icon: FaLeaf,
            color: 'gray.500'
          });
        const precip = event.precipitation_amount || ed.precipitation_amount;
        if (precip)
          fields.push({
            label: 'Precipitation',
            value: `${precip}mm`,
            icon: FaCloudRain,
            color: 'blue.400'
          });
        const dmg = event.damage_assessment || ed.damage_assessment;
        if (dmg)
          fields.push({
            label: 'Damage',
            value: dmg,
            icon: FaExclamationTriangle,
            color: 'red.500'
          });
      }
      // Humidity (HH/LH): humidity level → crop impact → duration
      else if (wType === 'HH' || wType === 'LH' || subtype.includes('humidity')) {
        const hum = event.humidity_level || ed.humidity_level;
        if (hum)
          fields.push({ label: 'Humidity', value: `${hum}%`, icon: FaTint, color: 'cyan.500' });
        const impact = event.crop_impact || ed.crop_impact;
        if (impact)
          fields.push({
            label: 'Crop Impact',
            value: impact,
            icon: FaExclamationTriangle,
            color: 'orange.500'
          });
      }
      // Generic fallback: push whatever temperature/weather data exists
      else {
        if (event.highest_temperature || ed.highest_temperature)
          fields.push({
            label: 'High Temp',
            value: `${event.highest_temperature || ed.highest_temperature}${tempUnit}`,
            icon: FaThermometerHalf,
            color: 'red.500'
          });
        if (event.lower_temperature || ed.lower_temperature)
          fields.push({
            label: 'Low Temp',
            value: `${event.lower_temperature || ed.lower_temperature}${tempUnit}`,
            icon: FaThermometerHalf,
            color: 'blue.500'
          });
      }

      // Common weather fields: duration (useful across all subtypes)
      const dur = event.duration || ed.duration || ed.event_duration;
      if (dur && fields.length < 3) {
        const isHailstorm = wType === 'HL';
        const durStr = dur.toString().toLowerCase();
        const hasUnit = durStr.includes('hour') || durStr.includes('hr') || durStr.includes('min');
        fields.push({
          label: 'Duration',
          value: `${dur}${hasUnit ? '' : isHailstorm ? ' minutes' : ' hours'}`,
          icon: FaClock,
          color: 'purple.500'
        });
      }

      if (fields.length === 0) {
        fields.push({
          label: 'Weather Data',
          value: 'Details not available',
          icon: FaInfoCircle,
          color: 'gray.500'
        });
      }
      break;
    }

    case 1: {
      // Production Event — subtype-aware priority
      const prodType = event.production_type || subtype;

      // Harvest (HA): yield first, then quality grade, then area
      if (prodType === 'HA') {
        if (event.yield_quantity && event.yield_quantity > 0)
          fields.push({
            label: 'Yield',
            value: `${event.yield_quantity} ${event.yield_unit || 'units'}`,
            icon: FaWeightHanging,
            color: 'green.600'
          });
        if (event.harvest_quality_grade)
          fields.push({
            label: 'Quality',
            value: event.harvest_quality_grade
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaStar,
            color: 'yellow.500'
          });
        if (event.area_covered && event.area_covered > 0)
          fields.push({
            label: 'Area',
            value: `${event.area_covered} ${event.area_unit || 'ha'}`,
            icon: FaRulerCombined,
            color: 'green.500'
          });
      }
      // Irrigation (IR): method first, then area, then electricity_source (Phase 3) or water source
      else if (prodType === 'IR') {
        if (event.irrigation_method)
          fields.push({
            label: 'Method',
            value: event.irrigation_method
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaWater,
            color: 'blue.500'
          });
        if (event.area_covered && event.area_covered > 0)
          fields.push({
            label: 'Area',
            value: `${event.area_covered} ${event.area_unit || 'ha'}`,
            icon: FaRulerCombined,
            color: 'green.500'
          });
        // Phase 3: Prefer electricity_source over water_source as third field when present
        const elecSrc = event.electricity_source ?? event.extra_data?.electricity_source;
        if (elecSrc) {
          const elecSrcLabels: Record<string, string> = {
            grid: 'Grid',
            solar: 'Solar',
            wind: 'Wind',
            diesel_generator: 'Diesel Gen.',
            mixed: 'Mixed'
          };
          const isSustainable = elecSrc === 'solar' || elecSrc === 'wind';
          fields.push({
            label: 'Power Source',
            value: elecSrcLabels[elecSrc] || elecSrc,
            icon: FaBolt,
            color: isSustainable ? 'green.500' : 'orange.500'
          });
        } else if (event.water_source) {
          fields.push({
            label: 'Water Source',
            value: event.water_source
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaTint,
            color: 'blue.400'
          });
        }
      }
      // Planting (PL): quantity (seeds), area, seeds source
      else if (prodType === 'PL') {
        if (event.yield_quantity && event.yield_quantity > 0)
          fields.push({
            label: 'Seeds/Plants',
            value: `${event.yield_quantity} ${event.yield_unit || 'units'}`,
            icon: FaSeedling,
            color: 'green.600'
          });
        if (event.area_covered && event.area_covered > 0)
          fields.push({
            label: 'Area',
            value: `${event.area_covered} ${event.area_unit || 'ha'}`,
            icon: FaRulerCombined,
            color: 'green.500'
          });
        if (event.seeds_source)
          fields.push({
            label: 'Seed Source',
            value: event.seeds_source
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaLeaf,
            color: 'green.400'
          });
      }
      // Equipment Maintenance (EM): equipment type, fuel, hours
      else if (prodType === 'EM') {
        if (event.equipment_type)
          fields.push({
            label: 'Equipment',
            value: event.equipment_type
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaTractor,
            color: 'blue.500'
          });
        if (event.fuel_consumed && event.fuel_consumed > 0)
          fields.push({
            label: 'Fuel Used',
            value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`,
            icon: FaGasPump,
            color: 'orange.500'
          });
        if (event.equipment_hours && event.equipment_hours > 0)
          fields.push({
            label: 'Hours',
            value: `${event.equipment_hours} hours`,
            icon: FaClock,
            color: 'blue.500'
          });
      }
      // Pollination (PO): pollinator type and hive count
      else if (prodType === 'PO') {
        const ed = event.extra_data || {};
        const pollinatorType = event.pollinator_type || ed.pollinator_type;
        if (pollinatorType)
          fields.push({
            label: 'Pollinator',
            value: pollinatorType
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaLeaf,
            color: 'yellow.500'
          });
        const hiveCount = event.hive_count !== undefined ? event.hive_count : ed.hive_count;
        if (hiveCount !== undefined && hiveCount !== null)
          fields.push({
            label: 'Hives',
            value: `${hiveCount} hives`,
            icon: FaSeedling,
            color: 'yellow.600'
          });
      }
      // Post-Harvest Processing (PH): processing type and duration
      else if (prodType === 'PH') {
        const ed = event.extra_data || {};
        const processingType = event.processing_type || ed.processing_type;
        if (processingType)
          fields.push({
            label: 'Processing',
            value: processingType
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaCog,
            color: 'teal.500'
          });
        const processingDuration =
          event.processing_duration_hours !== undefined
            ? event.processing_duration_hours
            : ed.processing_duration_hours;
        if (processingDuration !== undefined && processingDuration !== null)
          fields.push({
            label: 'Duration',
            value: `${processingDuration} hours`,
            icon: FaClock,
            color: 'teal.600'
          });
      }
      // Canopy Management (CM): canopy operation and pass number
      else if (prodType === 'CM') {
        const ed = event.extra_data || {};
        const canopyOp = event.canopy_operation || ed.canopy_operation;
        if (canopyOp)
          fields.push({
            label: 'Operation',
            value: canopyOp.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaLeaf,
            color: 'green.600'
          });
        const passNum = event.pass_number !== undefined ? event.pass_number : ed.pass_number;
        if (passNum !== undefined && passNum !== null)
          fields.push({
            label: 'Pass',
            value: `${passNum}`,
            icon: FaLayerGroup,
            color: 'green.500'
          });
      }
      // Pruning (PR): area, pruning passes (summary), hours
      else if (prodType === 'PR') {
        if (event.area_covered && event.area_covered > 0)
          fields.push({
            label: 'Area',
            value: `${event.area_covered} ${event.area_unit || 'ha'}`,
            icon: FaRulerCombined,
            color: 'green.500'
          });
        const pruningPasses =
          event.pruning_passes !== undefined
            ? event.pruning_passes
            : (event.extra_data || {}).pruning_passes;
        if (pruningPasses !== undefined && pruningPasses !== null && fields.length < 3)
          fields.push({
            label: 'Pruning Passes',
            value: `${pruningPasses} pruning passes`,
            icon: FaLayerGroup,
            color: 'green.500'
          });
        if (event.equipment_hours && event.equipment_hours > 0 && fields.length < 3)
          fields.push({
            label: 'Hours',
            value: `${event.equipment_hours} hours`,
            icon: FaClock,
            color: 'blue.500'
          });
      }
      // Default production (TR, CU, TH): area, fuel, hours
      else {
        if (event.area_covered && event.area_covered > 0)
          fields.push({
            label: 'Area',
            value: `${event.area_covered} ${event.area_unit || 'ha'}`,
            icon: FaRulerCombined,
            color: 'green.500'
          });
        if (event.fuel_consumed && event.fuel_consumed > 0)
          fields.push({
            label: 'Fuel Used',
            value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`,
            icon: FaGasPump,
            color: 'orange.500'
          });
        if (event.equipment_hours && event.equipment_hours > 0)
          fields.push({
            label: 'Hours',
            value: `${event.equipment_hours} hours`,
            icon: FaClock,
            color: 'blue.500'
          });
      }

      // Secondary display: variety when present across all production subtypes
      if (fields.length < 3 && event.variety)
        fields.push({
          label: 'Variety',
          value: event.variety,
          icon: FaSeedling,
          color: 'green.400'
        });

      break;
    }

    case 2: {
      // Chemical Event — commercial_name is already the card title, don't repeat it
      const chemType = event.chemical_type || subtype;

      // Area treated — Phase 3: prefer area_numeric over legacy area_treated
      const areaNum = event.area_numeric ?? event.area_treated;
      if (areaNum && areaNum > 0)
        fields.push({
          label: 'Area Treated',
          value: `${areaNum} ${event.area_unit || 'acres'}`,
          icon: FaRulerCombined,
          color: 'orange.600'
        });
      else if (event.area && event.area !== '0')
        fields.push({
          label: 'Area Treated',
          value: event.area,
          icon: FaRulerCombined,
          color: 'orange.600'
        });

      // Volume/application rate — Phase 3: prefer volume_numeric over legacy volume_applied
      const volNum = event.volume_numeric ?? event.volume_applied;
      if (volNum && volNum > 0)
        fields.push({
          label: 'Volume',
          value: `${volNum} ${event.volume_unit || 'gal'}`,
          icon: FaTint,
          color: 'blue.500'
        });
      else if (event.volume && event.volume !== '0')
        fields.push({ label: 'Rate', value: event.volume, icon: FaTint, color: 'blue.500' });

      // Subtype-specific third field
      if (chemType === 'FE' || subtype.includes('fertilizer')) {
        // Fertilizer: NPK ratio or concentration
        const npk = event.npk_ratio || event.concentration;
        if (npk) fields.push({ label: 'NPK', value: npk, icon: FaLeaf, color: 'green.500' });
      } else if (
        chemType === 'PE' ||
        chemType === 'FU' ||
        chemType === 'HE' ||
        subtype.includes('pesticide') ||
        subtype.includes('fungicide') ||
        subtype.includes('herbicide')
      ) {
        // Pest/Fungi/Herb: target pest/disease or application method
        if (event.target_pest_disease)
          fields.push({
            label: 'Target',
            value: event.target_pest_disease,
            icon: FaLeaf,
            color: 'red.500'
          });
        else if (event.way_of_application || event.application_method_structured) {
          const method = event.application_method_structured || event.way_of_application;
          fields.push({
            label: 'Method',
            value: method.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            icon: FaCog,
            color: 'gray.600'
          });
        }
      }

      // Organic status as third field if we have room
      if (
        fields.length < 3 &&
        event.organic_approved &&
        event.organic_approved !== 'not_applicable'
      ) {
        const isOrganic = [
          'yes',
          'omri_listed',
          'usda_nop_approved',
          'organic_equivalent'
        ].includes(event.organic_approved);
        fields.push({
          label: 'Organic',
          value: isOrganic ? 'Yes' : 'Conventional',
          icon: FaLeaf,
          color: isOrganic ? 'green.500' : 'gray.500'
        });
      }
      break;
    }

    case 3: // General Event — OK as-is
      if (event.duration)
        fields.push({
          label: 'Duration',
          value: `${event.duration} hours`,
          icon: FaClock,
          color: 'gray.500'
        });
      if (event.people_involved)
        fields.push({
          label: 'Participants',
          value: `${event.people_involved} people`,
          icon: FaUser,
          color: 'blue.500'
        });
      break;

    case 4: // Equipment Event — add equipment identity first
      if (event.equipment_name || event.equipment_type_structured) {
        const eqName =
          event.equipment_name ||
          event.equipment_type_structured
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
        fields.push({ label: 'Equipment', value: eqName, icon: FaTractor, color: 'blue.500' });
      }
      if (event.fuel_consumed)
        fields.push({
          label: 'Fuel Used',
          value: `${event.fuel_consumed} ${event.fuel_unit || 'L'}`,
          icon: FaGasPump,
          color: 'orange.500'
        });
      if (event.hours_operated)
        fields.push({
          label: 'Hours',
          value: `${event.hours_operated} hours`,
          icon: FaClock,
          color: 'blue.500'
        });
      if (fields.length < 3 && event.maintenance_cost)
        fields.push({
          label: 'Cost',
          value: `$${event.maintenance_cost}`,
          icon: FaDollarSign,
          color: 'green.600'
        });
      if (fields.length < 3 && event.area_worked)
        fields.push({
          label: 'Area',
          value: `${event.area_worked} ${event.area_unit || 'ha'}`,
          icon: FaRulerCombined,
          color: 'green.500'
        });
      break;

    case 5: {
      // Soil Management — soil science fields first, operational fields last
      const soilType = event.soil_management_type || subtype;

      // Soil pH — critical for ST, PA events
      if (event.soil_ph)
        fields.push({
          label: 'Soil pH',
          value: `${event.soil_ph}`,
          icon: FaFlask,
          color: 'purple.500'
        });

      // Organic matter — critical for ST, OM events
      if (event.organic_matter_percentage)
        fields.push({
          label: 'Organic Matter',
          value: `${event.organic_matter_percentage}%`,
          icon: FaLeaf,
          color: 'green.600'
        });

      // Amendment type/amount — critical for PA, OM, SA events
      if (event.amendment_type)
        fields.push({
          label: 'Amendment',
          value: event.amendment_type
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: FaSeedling,
          color: 'green.500'
        });

      // Working depth — critical for TI events
      if (event.working_depth)
        fields.push({
          label: 'Depth',
          value: `${event.working_depth} ${event.depth_unit || 'cm'}`,
          icon: FaMapMarkerAlt,
          color: 'yellow.700'
        });

      // Area covered — universal fallback
      if (fields.length < 3 && event.area_covered)
        fields.push({
          label: 'Area',
          value: `${event.area_covered} ${event.area_unit || 'ha'}`,
          icon: FaRulerCombined,
          color: 'yellow.600'
        });

      // Equipment used
      if (fields.length < 3 && event.equipment_used)
        fields.push({
          label: 'Equipment',
          value: event.equipment_used,
          icon: FaTractor,
          color: 'blue.500'
        });
      break;
    }

    case 6: {
      // Pest Management — subtype-aware
      const pestType = event.pest_management_type || event.pest_type || subtype;

      // Beneficial Release (BR): species + quantity are the defining fields
      if (pestType === 'BR' || pestType === 'beneficial_release') {
        if (event.beneficial_species)
          fields.push({
            label: 'Species',
            value: event.beneficial_species,
            icon: FaLeaf,
            color: 'green.500'
          });
        if (event.release_quantity)
          fields.push({
            label: 'Quantity',
            value: `${event.release_quantity}`,
            icon: FaWeightHanging,
            color: 'green.600'
          });
        if (event.field_area_hectares)
          fields.push({
            label: 'Area',
            value: `${event.field_area_hectares} ha`,
            icon: FaRulerCombined,
            color: 'red.600'
          });
      }
      // Trap Monitoring (TM): trap count + pest species + findings
      else if (pestType === 'TM' || pestType === 'trap_monitoring') {
        if (event.trap_count)
          fields.push({
            label: 'Traps Checked',
            value: `${event.trap_count}`,
            icon: FaCog,
            color: 'orange.500'
          });
        if (event.pest_species)
          fields.push({
            label: 'Target Pest',
            value: event.pest_species,
            icon: FaLeaf,
            color: 'red.500'
          });
        if (event.field_area_hectares)
          fields.push({
            label: 'Area',
            value: `${event.field_area_hectares} ha`,
            icon: FaRulerCombined,
            color: 'red.600'
          });
      }
      // Scouting (SC), Identification (PI), Threshold (TA), IPM (IP): pest + damage + area
      else {
        if (event.pest_species)
          fields.push({
            label: 'Target Pest',
            value: event.pest_species,
            icon: FaLeaf,
            color: 'red.500'
          });
        if (event.damage_percentage)
          fields.push({
            label: 'Damage',
            value: `${event.damage_percentage}%`,
            icon: FaExclamationTriangle,
            color: 'orange.500'
          });
        if (event.field_area_hectares)
          fields.push({
            label: 'Area',
            value: `${event.field_area_hectares} ha`,
            icon: FaRulerCombined,
            color: 'red.600'
          });
      }

      // Chemical-free period — great trust indicator across all pest subtypes
      if (fields.length < 3 && event.chemical_free_period_days)
        fields.push({
          label: 'Chemical-Free',
          value: `${event.chemical_free_period_days} days`,
          icon: FaCheckCircle,
          color: 'green.500'
        });
      break;
    }

    case 7: // Business Event — certification + status + practice/certifier
      if (event.certification_type)
        fields.push({
          label: 'Certification',
          value:
            event.certification_type_display ||
            event.certification_type
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: FaCertificate,
          color: 'blue.500'
        });
      if (event.verification_status)
        fields.push({
          label: 'Status',
          value:
            event.verification_status_display ||
            event.verification_status.replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: FaCheckCircle,
          color: 'cyan.500'
        });
      // Sustainability practice or certifier name — more useful than trust_impact
      if (event.sustainability_practice)
        fields.push({
          label: 'Practice',
          value:
            event.sustainability_practice_display ||
            event.sustainability_practice
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          icon: FaLeaf,
          color: 'green.500'
        });
      else if (event.verified_certifier_name)
        fields.push({
          label: 'Certifier',
          value: event.verified_certifier_name,
          icon: FaStar,
          color: 'yellow.500'
        });
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
  // Prefer the observation field, then fall back to description. The frontend
  // save path (NewEvent.jsx) renames observation → description before POSTing
  // because CommonEvent.description is a NOT NULL column — so list/detail
  // serializers may return the farmer notes under either key depending on the
  // response path. Check both before falling back to the generic template.
  const notes =
    (event.observation && event.observation.trim()) ||
    ((event as any).description && String((event as any).description).trim()) ||
    '';
  if (notes && !notes.toLowerCase().includes('no additional details')) {
    return notes;
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
        const certDisplay =
          event.certification_type_display ||
          event.certification_type
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
        return `${certDisplay} activities`;
      }
      return 'Business sustainability activities completed';

    default:
      return event.observation || 'Agricultural activity completed';
  }
};

/**
 * Timeline geometry, in CSS pixels.
 *
 * The connector line and the node circle are laid out by two separate rules that have to agree;
 * when they were independent literals they drifted (the line started below one node and ran
 * through the next). Every position below is computed from these, so changing the circle size
 * or the row gap moves the line with it.
 */
const TIMELINE_NODE_SIZE = 42; // circle diameter
const TIMELINE_ROW_GAP = 16; // vertical margin between rows (was mb={4})
const TIMELINE_LINE_WIDTH = 2;
/* The node sits flush with the top of its row. It used to carry `mt="8px"`, which never
   applied: `theme/styles.js` forces `.chakra-stack > *:not(.chakra-divider) { margin: 0
   !important }`, so a margin prop on a direct child of any Stack is inert app-wide (the same
   trap is documented on SectionBox). MEASURED: the circle's top edge == the row's top edge.
   The connector was positioned as if the offset were real, which is half of why it missed. */

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

  // Weather (0), general (3) and business (7) records have no carbon calculation, so they read
  // as not estimated rather than as a 0 nobody computed (AC-14).
  // Annotated rather than inferred: without it the synthetic branch produced a narrower object
  // type, so `carbonData` became a union and every optional field read off it (usda_factors_based,
  // error) was a type error on the synthetic side. One declared type, one shape.
  const noCarbonCalculation = hasNoCarbonCalculation(event.event_type);
  const carbonData: CarbonCalculationResult | null = noCarbonCalculation
    ? {
        ...NO_CARBON_CALCULATION_STATUS,
        event_type: String(event.event_type),
        timestamp: event.date || ''
      }
    : event.carbon_data || null;

  // Get enhanced event configuration
  const eventConfig = getEventConfig(event.event_type, event.type, event.description);

  // Extract event-specific fields
  // When VITE_USE_FIELD_REGISTRY=true, use centralized registry instead of hardcoded switch.
  // The registry's timeline surface has maxFields=3 with automatic tier-based truncation.
  const registryTimelineFields = useMemo(() => {
    if (!USE_FIELD_REGISTRY) return null;
    const subtype = subtypeOf(event as never);
    // Same translate function `useEventFields` hands the resolver, so an enum value (canopy
    // operation, seed source, ...) renders as the label the form shows instead of a slug that
    // only the exact-string ES map can rescue.
    const translate = (id: string): string | null => {
      if (!id) return null;
      const translated = intl.formatMessage({ id });
      return translated && translated !== id ? translated : null;
    };
    const result = getFieldsForSurface(
      event.event_type,
      subtype,
      'timeline',
      event as any,
      translate
    );
    return [
      ...result.hero.filter((f) => f.name !== 'name' && f.name !== 'commercial_name'),
      ...result.immediate
    ]
      .slice(0, 3)
      .map((f) => {
        // The authored label, in the operator's language. The de-camelCased key segment this
        // replaced was English everywhere ("Water Deficit" authored as "Déficit hídrico") and
        // wrong where the authored wording differs from the key (AC-09). The humanised segment
        // survives only as the fallback for a key with no message.
        const translated = f.labelKey ? intl.formatMessage({ id: f.labelKey }) : '';
        const fallback =
          f.labelKey
            .split('.')
            .pop()
            ?.replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .trim() || f.name;
        return {
          label: translated && translated !== f.labelKey ? translated : fallback,
          // Registry formatters emit English; the consumer card localizes them, the producer
          // timeline never did.
          value: localizeFieldValue(f.formattedValue || '', intl.locale),
          icon: undefined,
          color: undefined
        };
      });
  }, [event, intl]);
  const eventFields = registryTimelineFields || extractEventFields(event);
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
    <Box position="relative" mb={`${TIMELINE_ROW_GAP}px`} w="100%" ref={timelineRef}>
      {/* Timeline Connector Line.
          Geometry is DERIVED from the node, never guessed: the segment must start at this
          row's circle and end exactly on the next row's circle. It used to be
          `top: 56px; height: calc(100% + 8px)`: MEASURED, that started 14px below a circle
          whose bottom edge is at 42px, and ran 48px past the next circle's top edge — so the
          line left a gap under one node and then ran on THROUGH the next one, poking out
          below it. The node read as disconnected from the thread it sits on. */}
      {!isLast && !isMobile && isMounted && (
        <Box
          position="absolute"
          left={`${TIMELINE_NODE_SIZE / 2 - TIMELINE_LINE_WIDTH / 2}px`}
          top={`${TIMELINE_NODE_SIZE}px`}
          w={`${TIMELINE_LINE_WIDTH}px`}
          /* ends on the next circle's top edge: (100% + row gap) - this row's node bottom */
          h={`calc(100% - ${TIMELINE_NODE_SIZE - TIMELINE_ROW_GAP}px)`}
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
          <VStack
            spacing={0}
            align="center"
            minW={`${TIMELINE_NODE_SIZE}px`}
            position="relative"
            zIndex={1}>
            <Circle
              size={`${TIMELINE_NODE_SIZE}px`}
              /* TONAL GREEN (2026-08-29): one hue for every family, on the brand tint.
                 green.700 is 4.98:1 both as the 3px boundary and as the glyph on green.50 —
                 comfortably over the 3.0 a meaningful graphic owes. */
              bg="green.50"
              borderWidth="3px"
              borderColor={eventConfig.color}
              color={eventConfig.color}
              boxShadow="0 2px 8px rgba(0,0,0,0.1)"
              _hover={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transform: 'translateY(-1px)'
              }}
              transition="all 0.2s ease">
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
          _hover={{
            borderColor: eventConfig.color,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)'
          }}
          onClick={() => (onEventClick ? onEventClick(event) : navigate(url))}
          className="trazo-card">
          <CardBody py={{ base: 3, md: 4 }} px={{ base: 0, md: 4 }}>
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
                        letterSpacing="-0.02em">
                        {title}
                      </Text>
                    </Tooltip>
                    <HStack spacing={2} wrap="wrap">
                      {/* Renders from TYPE_BADGE, the shared event-appearance SSOT, so this
                          timeline says the same thing as the activity feed and the event modal
                          (2026-08-28).

                          It used to derive a PALETTE from the category's decorative hue
                          (`colorScheme={eventConfig.color.split('.')[0]}`): seven hues across
                          eight categories, four of them — orange, yellow, teal, purple — not
                          Trazo scales at all but Chakra defaults. It made a routine record read
                          as a verdict, Pest Management in RED and Soil Management in YELLOW, and
                          it did not even separate the families it was decorating: Weather and
                          Equipment both split to `blue` and resolved to identical pixels, as the
                          note on `getEventConfig` case 4 already admits.

                          The fix is NOT "make them all neutral" — that was the first instinct and
                          it would have invented a FOURTH answer for a question this repo already
                          settled. `config/events/eventTypeAppearance.ts` owns it: semantic
                          VARIANTS, never per-family hues — inputs `warning`, pest `danger`, the
                          rest `neutral`/`subtle`/`brand`. Colour here says how much the reader
                          should care; the GLYPH is what separates a frost record from a spray.

                          `?? 'neutral'` because `getEventConfig` has a `default` branch for an
                          absent/unknown event_type, and an undefined variant would silently fall
                          back to Chakra's stock badge.

                          `colorScheme` is DROPPED, not left behind: these variants ignore it by
                          design (theme/components/badge.js), so keeping it would be a dead prop
                          implying a control that does nothing. */}
                      <Badge
                        variant={TYPE_BADGE[event.event_type] ?? 'neutral'}
                        fontSize="xs"
                        px={2}
                        py={1}
                        fontWeight="500"
                        borderRadius="6px">
                        {/* The ACTIVITY the grower filed, not the retired family name
                            (2026-08-29). `getEventConfig().category` returns a hardcoded English
                            literal from the seven-family vocabulary — "Production Activity",
                            "Chemical Application", "Soil Management" — which the create path
                            stopped using: "What did you do?" offers Irrigation, Input
                            application, Pest & scouting. So a record filed as Irrigation
                            displayed as "Production Activity", and an OMRI-listed fish
                            fertiliser displayed as a "Chemical Application" on a certified
                            ORGANIC operation. One record, two identities — the same defect
                            already fixed on the edit path.

                            `activityLabel` is the shared composer the activity feed and the
                            detail modal already render from, so all three now agree, and the
                            string is translated (these nine literals were English-only, on a
                            surface an es-419 grower reads). */}
                        {activityLabel(event.event_type, subtypeOf(event as never), intl)}
                      </Badge>

                      {/* Summary/Aggregate Badge */}
                      {(event.is_summary === true ||
                        event.extra_data?.is_summary === true ||
                        event.extra_data?.is_summary === 'true') && (
                        <Tooltip
                          label={`Aggregate of ${
                            event.event_count || event.extra_data?.event_count || 'multiple'
                          } ${
                            event.type === 'HA'
                              ? 'harvests'
                              : event.type === 'IR'
                              ? 'irrigations'
                              : event.type === 'PR'
                              ? 'pruning passes'
                              : 'events'
                          }`}
                          hasArrow
                          placement="top">
                          {/* A COUNT is a fact → `neutral`. This was `colorScheme="purple"`,
                              and frontend.md removes blue and purple from status badges by
                              name — they carry no meaning in this palette, and `purple` is not
                              even a Trazo scale (styles.js defines green/gray/amber/red/blue;
                              this resolved to Chakra's default). */}
                          <Badge
                            variant="neutral"
                            fontSize="xs"
                            px={2}
                            py={1}
                            fontWeight="600"
                            borderRadius="6px"
                            display="flex"
                            alignItems="center"
                            gap={1}
                            cursor="help">
                            <Icon as={FaLayerGroup} boxSize={3} />
                            {event.event_count || event.extra_data?.event_count || 'Summary'}
                          </Badge>
                        </Tooltip>
                      )}

                      {/* NO record-provenance chip here, deliberately.
                          A "Grower record" chip belongs on the BUYER page, where a shopper
                          does not know who authored the row. On the producer's own timeline
                          every record is the grower's by construction, so the chip was
                          identical on every row — zero information — and its tooltip
                          ("Trazo publishes the record; it does not inspect the farm") is
                          addressed to a shopper, told to the person who typed the record.

                          It was briefly added here on 2026-09-02 when the five-rung trust
                          ladder was retired, by copying the buyer card's words AND its
                          placement. The words were right; the placement was not. The ladder
                          it replaced at least VARIED per row (Photo Documented / Self
                          Reported), so a constant chip was strictly worse than what it
                          replaced.

                          Same failure mode the amber photo dot below documents: a signal on
                          every row stops being a signal. Photo presence — the one fact that
                          actually varies here — is already carried by the camera glyph in
                          the footer, and the engagement nudge lives in the completeness
                          toast and the transparency KPI. */}

                      {/* EPA/USDA-sourced Badge - ULTRA-COMPACT SECONDARY (Optimized Space).
                          Requires actual emissions (2026-08-04): the badge states that the
                          EMISSION FACTORS behind this event's number came from EPA/USDA
                          publications, so on an event with no emissions there is no factor to
                          have sourced. It was rendering on pest-trap installs and worker-training
                          records, where it reads as a government endorsement of the activity —
                          the "USDA Verified" implication `compliance.md` forbids. */}
                      {showsInputsBadge(carbonData) && (
                        <Tooltip
                          label={intl.formatMessage({ id: 'carbon.badge.epaUsdaTooltip' })}
                          hasArrow
                          placement="top">
                          {/* Provenance is a fact, not a status → `neutral`. This was
                              `colorScheme="blue"`, the other hue frontend.md strikes from status
                              badges (blue survives only on Chakra's `Alert status="info"`).
                              Neutral also suits the claim: per compliance.md the badge may say
                              the FACTORS are "EPA/USDA-sourced" and must not imply a government
                              endorsement — and a blue government-looking chip leans the wrong
                              way on exactly the line the comment above is policing. */}
                          <Badge
                            variant="neutral"
                            fontSize="xs"
                            px={1.5}
                            py={0.5}
                            fontWeight="600"
                            borderRadius="4px"
                            textTransform="uppercase"
                            letterSpacing="0.05em"
                            cursor="help">
                            {intl.formatMessage({ id: 'carbon.badge.epaUsdaSourced' })}
                          </Badge>
                        </Tooltip>
                      )}

                      {/* Area-estimate chip: the figure rests on the recorded area, not on a
                          recorded fuel or input amount. Neutral gray on purpose (a colour on a
                          carbon figure can be a self-created label), and never rendered together
                          with the inputs badge above (the two helpers are mutually exclusive).
                          The caption sits under the figure in the metrics row. */}
                      {showsAreaEstimateLabel(carbonData) && (
                        <Badge
                          variant="neutral"
                          fontSize="xs"
                          px={1.5}
                          py={0.5}
                          fontWeight="600"
                          borderRadius="4px"
                          textTransform="uppercase"
                          letterSpacing="0.05em">
                          {intl.formatMessage({ id: 'carbon.badge.areaEstimate' })}
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </HStack>

                {/* Clean Date Display */}
                <VStack align="flex-end" spacing={0} flexShrink={0} ml={4}>
                  {event.extra_data?.date_start && event.extra_data?.date_end ? (
                    <>
                      <Text fontSize="xs" fontWeight="600" color="gray.700">
                        {formatDateFromTimestamp(event.extra_data.date_start, intl.locale, {
                          month: 'short',
                          day: 'numeric'
                        })}
                        {' - '}
                        {formatDateFromTimestamp(event.extra_data.date_end, intl.locale, {
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
                        {formatDateFromTimestamp(event.date, intl.locale, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatWallClockTime(event.date, intl.locale)}
                      </Text>
                    </>
                  )}
                </VStack>
              </Flex>

              {/* Clean Description */}
              <Text
                fontSize={{ base: 'xs', md: 'sm' }}
                color="gray.600"
                lineHeight="relaxed"
                noOfLines={2}>
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
                        <Text
                          fontSize={{ base: 'xs', md: 'sm' }}
                          fontWeight="600"
                          color="gray.700"
                          noOfLines={1}>
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
                {!carbonData ||
                carbonData.error ||
                isNotEstimated(carbonData) ||
                typeof carbonData.co2e !== 'number' ? (
                  // Run 8 (R8-04): nothing recorded to count from. Said, never shown as 0.
                  // Also the answer when the record carries no carbon payload at all: that case
                  // used to print hardcoded English that no locale could translate, and it
                  // disagreed with the detail modal, which says "not estimated".
                  // A sentence, not a figure: it must shrink and wrap inside the card. With
                  // flexShrink={0} it ran 120px past a 375px screen (manual pass, 2026-10-06).
                  <HStack spacing={2} flex="1 1 auto" minW={0}>
                    <Circle size="24px" bg="gray.100">
                      <Icon as={MdEco} color="gray.400" boxSize={3} />
                    </Circle>
                    <Text fontSize="sm" color="gray.600">
                      {intl.formatMessage({
                        id: noCarbonCalculation
                          ? 'event.recordValue.zeroEmissions'
                          : 'carbon.notEstimated'
                      })}
                    </Text>
                  </HStack>
                ) : (
                  <Tooltip
                    // One wording for every computed figure, zero included: "(no emissions
                    // estimated)" beside "0 kg CO2e" said both at once (AC-14).
                    label={`${formatCO2e(carbonData.co2e)} kg CO₂e: ${intl.formatMessage({
                      id: 'eventDetails.carbonEstimate'
                    })}`}
                    placement="top"
                    hasArrow
                    bg="gray.700"
                    color="white"
                    fontSize="sm"
                    borderRadius="md"
                    px={3}
                    py={2}>
                    {/* An emissions figure is a MEASUREMENT, so it gets ONE treatment — it is
                        not graded (2026-08-28).

                        This interpolated `getImpactLevel(co2e).color`, a magnitude ramp:
                        green ≤5, blue ≤15, yellow ≤30, orange above. So a 581 kg fertigation
                        printed rust-orange and a 3 kg scouting pass printed green — a verdict
                        on the farmer's practice, delivered in colour.

                        Three reasons that had to go, in order of seriousness:

                        1. The bands are UNSOURCED and have NO DENOMINATOR. 5/15/30/60 kg is
                           tied to no EPA/USDA benchmark, no crop and no area, so a 12.5-acre
                           fertigation is marked worse than a hand-weeding pass purely for
                           covering more ground. This is the same class as the per-event
                           `efficiency_score` that was deleted on 2026-08-04 — a fabricated
                           grade — only wearing colour instead of a number.
                        2. `carbon-methodology.md` scopes this to DIRECT OPERATIONAL emissions,
                           explicitly not an LCA. There is no basis on which a Scope-1 number
                           can be called good or bad, and `compliance.md` treats an unsourced
                           sustainability judgement as the FTC 16 CFR 260.6 risk it is.
                        3. Two of the five bands were broken anyway: the `blue` glyph measured
                           2.62:1, under the 3.0 a non-text mark owes, and `yellow`/`orange`
                           are not Trazo scales at all (styles.js defines green/gray/amber/
                           red/blue) so they resolved to Chakra's palettes.

                        The magnitude is already in the digits, and the tooltip still carries
                        the detail. gray.600 on gray.100 is 5.88:1; gray.700 text is 10.05:1.

                        ⚠️ `getImpactLevel` is still imported for its `level` LABEL, which is
                        rendered by EventDetailsModal. Those band NAMES ("Core practice",
                        "Major activity") are the same unsourced banding in words and are worth
                        a separate look; this change does not touch copy. */}
                    <HStack spacing={2} cursor="help" flexShrink={0}>
                      <Circle size="24px" bg="gray.100">
                        <Icon as={MdEco} color="gray.600" boxSize={3} />
                      </Circle>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="600" color="gray.700" whiteSpace="nowrap">
                          {formatCO2e(carbonData.co2e)} kg CO₂e
                        </Text>
                        {showsAreaEstimateLabel(carbonData) && (
                          <Text fontSize="xs" color="gray.600" maxW="260px">
                            {intl.formatMessage({ id: 'carbon.badge.areaEstimateCaption' })}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Tooltip>
                )}

                {/* Operator & Photo Status.
                    The per-event "Efficiency {n}/100" readout was removed (2026-08-04): it was a
                    FOURTH scoring vocabulary on top of the transparency percentage, the parcel
                    card's /100 and the farm tier words — and in practice it printed the same
                    constant (90/100, 100/100) on every event, so it carried no information while
                    teaching the farmer that numbers on this page are decoration. Carbon is already
                    shown next to it as an absolute kg CO₂e, which is the actionable figure. */}
                <HStack spacing={3} flexShrink={0}>
                  <Text fontSize="xs" color="gray.500" textAlign="right" maxW="100px" noOfLines={1}>
                    {operatorName}
                  </Text>
                  {/* Shown when an event has NO photo. Neutral, not amber (2026-08-28).
                      It MEASURED 2.89:1 — orange.500 on orange.100, under the 3.0 floor a
                      meaningful glyph owes — and `orange` is not a Trazo scale. It also fired on
                      every photo-less record, so the amber that is supposed to mean "act on this"
                      became wallpaper; the deadlines card documents that exact failure mode. The
                      camera glyph itself carries the fact, and the real nudge lives in the
                      completeness toast and the transparency KPI, not in a coloured dot on every
                      row. gray.600 on gray.100 is 5.88:1. */}
                  {!event.image && (
                    <Circle size="20px" bg="gray.100" flexShrink={0}>
                      <Icon as={FaCamera} color="gray.600" boxSize={2.5} />
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
