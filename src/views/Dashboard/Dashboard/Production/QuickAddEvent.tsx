import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  Grid,
  Icon,
  Badge,
  Box,
  Divider,
  useToast,
  Skeleton,
  Tooltip,
  Link
} from '@chakra-ui/react';
import {
  FaSeedling,
  FaTint,
  FaSprayCan,
  FaCut,
  FaLeaf,
  FaMicrophone,
  FaCamera,
  FaArrowLeft,
  FaClock,
  FaRuler,
  FaTractor,
  FaFlask,
  FaTools,
  FaBug,
  FaChartLine,
  FaRobot,
  FaLightbulb,
  FaCheckCircle,
  FaQuestionCircle,
  FaBook
} from 'react-icons/fa';
import {
  StandardButton,
  StandardInput,
  StandardTextarea,
  StandardField,
  SectionBox,
  SectionHeader
} from 'components/Design';
import { VoiceEventCapture } from 'components/Events/VoiceEventCapture';
import { EducationalTooltip } from 'components/Education/EducationalTooltip';
import { TypeAwareFields, useTypeAwareFields } from 'components/QuickEvent';
import { getQuickEventFields, getFieldsForBackend } from 'config/quickEventFields';
// @ts-ignore - JS file import
import { useCreateEventMutation } from 'store/api/historyApi.js';
import {
  useGetEventTemplatesByCropTypeQuery,
  useGetAIEventSuggestionsQuery
} from 'store/api/carbonApi';
import { useGetCropTypesDropdownQuery } from 'store/api/companyApi';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

// Import crop type mapping service for robust crop matching
import { findCropTypeId, getCropTypeMapping } from 'utils/cropTypeMapping';
import {
  mapVoiceTypeToTemplate,
  mapVoiceDataToFieldValues,
  generateVoiceSummary,
  type ParsedVoiceData,
  type VoiceFieldMappingResult
} from 'utils/voiceDataMapper';

// Import real USDA API hooks for enhanced suggestions
import {
  useGetUSDAEmissionFactorsQuery,
  useGetUSDABenchmarkComparisonQuery
} from 'store/api/carbonApi';
import USDASmartSuggestions from 'components/Events/USDASmartSuggestions';

interface EventTemplate {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  carbonImpact: number;
  costEstimate: number;
  efficiency_tip: string;
  typical_duration: string;
  carbonCategory: 'high' | 'medium' | 'low';
  sustainabilityScore: number;
  qrVisibility: 'high' | 'medium' | 'low';
  type: string;
  timing?: string;
  usage_count?: number;
  excludeFromCarbonCalculation?: boolean;
  // New fields from backend for better organization
  displayPriority?: number;
  templateCategory?: string;
  translationKey?: string;
  // Backend event fields for form pre-population
  backend_event_fields?: Record<string, any>;
  typical_amounts?: Record<string, any>;
  // Backend event type (0-7) for correct event creation
  backend_event_type?: number;
  // AI suggestion specific fields (set by getAISmartSuggestions)
  aiPowered?: boolean;
  confidence?: number;
  reasoning?: string;
  bestPractices?: string[];
  timing_relevance?: string;
}

// ============================================================================
// STATIC MAPS - Extracted outside component to prevent recreation on every render
// ============================================================================

// Icon map for event types - O(1) lookup, no memory allocation per render
const EVENT_ICON_MAP: Record<string, any> = {
  fertilization: FaSeedling,
  irrigation: FaTint,
  pest_control: FaSprayCan,
  pruning: FaCut,
  planting: FaSeedling,
  harvest: FaLeaf,
  soil_management: FaFlask,
  equipment: FaTractor,
  weather_protection: FaCamera,
  certification: FaChartLine,
  monitoring: FaTools,
  other: FaBug
} as const;

// Color map for carbon categories
const CARBON_CATEGORY_COLOR_MAP: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'green',
  negative: 'teal',
  neutral: 'gray'
} as const;

// Color map for event types (fallback)
const EVENT_TYPE_COLOR_MAP: Record<string, string> = {
  fertilization: 'green',
  irrigation: 'blue',
  pest_control: 'orange',
  pruning: 'purple',
  planting: 'green',
  harvest: 'yellow',
  soil_management: 'brown',
  equipment: 'gray',
  weather_protection: 'cyan',
  certification: 'teal',
  monitoring: 'pink',
  other: 'gray'
} as const;

// Helper to convert snake_case to camelCase for backend field normalization
const snakeToCamel = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

// Normalize backend fields from snake_case to camelCase
const normalizeBackendFields = (fields: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};
  Object.entries(fields).forEach(([key, value]) => {
    // Keep original snake_case key for backend compatibility
    normalized[key] = value;
    // Also add camelCase version for frontend form compatibility
    const camelKey = snakeToCamel(key);
    if (camelKey !== key) {
      normalized[camelKey] = value;
    }
  });
  return normalized;
};

interface QuickAddEventProps {
  isOpen: boolean;
  onClose: () => void;
  cropType: string;
  onEventAdded?: (event: any) => void;
}

const QuickAddEvent: React.FC<QuickAddEventProps> = ({
  isOpen,
  onClose,
  cropType,
  onEventAdded
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 16));
  const [performedBy, setPerformedBy] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventObservations, setEventObservations] = useState('');
  const [applicationRate, setApplicationRate] = useState('');
  const [duration, setDuration] = useState('');
  const [templateSuggestions, setTemplateSuggestions] = useState<EventTemplate[]>([]);
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);
  const [typeAwareFieldValues, setTypeAwareFieldValues] = useState<Record<string, unknown>>({});
  const [voiceBanner, setVoiceBanner] = useState<{
    transcript: string;
    confidence: number;
    eventType: string;
    detectedFields: string[];
  } | null>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const intl = useIntl();

  // Map selected template to quickEventFields templateId
  const getTypeAwareTemplateId = (template: EventTemplate | null): string => {
    if (!template) return 'general_documentation';

    const id = template.id.toLowerCase();
    const type = template.type?.toLowerCase() || '';
    // Also check template name for AI suggestions where id is "ai-1-0" and type is the AI category
    const name = template.name?.toLowerCase() || '';

    // Map based on template ID, type, and name patterns
    // IMPORTANT: Organic-specific templates must be checked BEFORE generic matches.
    // "Organic Seed Sourcing" must match before generic "seed" → planting.
    // "Organic Amendment" must match before generic "soil" → cultivation.
    if (name.includes('organic seed') || name.includes('organic transplant'))
      return 'organic_seed_sourcing';
    if (name.includes('organic amendment') || name.includes('organic matter addition'))
      return 'organic_amendment';
    // IMPORTANT: Specific chemical types (fungicide, herbicide) must be checked BEFORE
    // generic pest_control, because AI backend sends all chemical pest events as
    // category 'pest_control' — the specific type is only in the suggestion name.
    if (id.includes('fertiliz') || type.includes('fertiliz') || name.includes('fertiliz'))
      return 'fertilization';
    if (id.includes('irrigation') || type.includes('irrigation') || name.includes('irrigat'))
      return 'irrigation';
    if (
      id.includes('herbicide') ||
      type.includes('herbicide') ||
      type.includes('weed') ||
      name.includes('herbicide') ||
      name.includes('weed')
    )
      return 'herbicide';
    if (
      id.includes('fungicide') ||
      type.includes('fungicide') ||
      type.includes('fungi') ||
      name.includes('fungicide') ||
      name.includes('copper') ||
      name.includes('sulfur')
    )
      return 'fungicide';
    if (id.includes('pest') || type.includes('pest') || name.includes('pest'))
      return 'pest_control';
    if (
      id.includes('pruning') ||
      type.includes('pruning') ||
      type.includes('prune') ||
      name.includes('pruning') ||
      name.includes('prune')
    )
      return 'pruning';
    if (
      id.includes('plant') ||
      id.includes('seed') ||
      type.includes('plant') ||
      type.includes('seed') ||
      name.includes('planting') ||
      name.includes('seeding')
    )
      return 'planting';
    if (id.includes('harvest') || type.includes('harvest') || name.includes('harvest'))
      return 'harvest';
    if (id.includes('transplant') || type.includes('transplant') || name.includes('transplant'))
      return 'transplanting';
    if (
      id.includes('cultivat') ||
      type.includes('cultivat') ||
      type.includes('tillage') ||
      name.includes('cultivat') ||
      name.includes('tillage')
    )
      return 'cultivation';
    if (id.includes('thin') || type.includes('thin') || name.includes('thinning'))
      return 'thinning';
    if (
      id.includes('equipment') ||
      id.includes('maintenance') ||
      type.includes('equipment') ||
      type.includes('maintenance') ||
      name.includes('equipment') ||
      name.includes('maintenance')
    )
      return 'equipment_maintenance';
    if (
      id.includes('soil') ||
      type.includes('soil') ||
      name.includes('soil') ||
      name.includes('sampling')
    )
      return 'cultivation';

    return 'general_documentation';
  };

  // Map template ID to educational tooltip term
  const getEducationalTooltipTerm = (templateId: string): string => {
    const termMap: Record<string, string> = {
      fertilization: 'fertilization_event',
      irrigation: 'irrigation_event',
      pest_control: 'pest_control_event',
      pruning: 'pruning_event',
      planting: 'planting_event',
      harvest: 'harvest_event',
      herbicide: 'herbicide_event',
      fungicide: 'fungicide_event',
      general_documentation: 'quick_add'
    };
    return termMap[templateId] || 'quick_add';
  };

  // Get current type-aware template ID based on selected template
  const typeAwareTemplateId = React.useMemo(
    () => getTypeAwareTemplateId(selectedTemplate),
    [selectedTemplate]
  );

  // Check if this template has type-aware fields
  const hasTypeAwareFields = React.useMemo(
    () => !!getQuickEventFields(typeAwareTemplateId),
    [typeAwareTemplateId]
  );

  // Handle type-aware field changes
  const handleTypeAwareFieldChange = React.useCallback((fieldName: string, value: unknown) => {
    setTypeAwareFieldValues((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  // Extract pre-fill values from AI suggestion context
  const getAIPreFillValues = (
    template: EventTemplate,
    templateId: string
  ): Record<string, unknown> => {
    if (!template.id.startsWith('ai-')) return {};
    const overrides: Record<string, unknown> = {};
    const name = template.name.toLowerCase();
    const desc = (template.description || '').toLowerCase();
    const reasoning = (template.reasoning || '').toLowerCase();
    const timing = (template.timing || '').toLowerCase();

    // ── Chemical events: target pest/disease ──
    if (
      templateId === 'fungicide' ||
      templateId === 'pest_control' ||
      templateId === 'herbicide'
    ) {
      // Fungicide / pest control disease keywords
      if (templateId === 'fungicide' || templateId === 'pest_control') {
        if (name.includes('pruning') || desc.includes('pruning')) {
          overrides.target_pest_disease = 'Wound infection prevention, Phytophthora';
        } else if (name.includes('mildew') || desc.includes('mildew')) {
          overrides.target_pest_disease = 'Powdery mildew';
        } else if (name.includes('canker') || desc.includes('canker')) {
          overrides.target_pest_disease = 'Citrus canker';
        } else if (name.includes('blight') || desc.includes('blight')) {
          overrides.target_pest_disease = 'Blight';
        } else if (name.includes('rot') || desc.includes('rot')) {
          overrides.target_pest_disease = 'Root rot, Phytophthora';
        } else if (name.includes('scale') || desc.includes('scale')) {
          overrides.target_pest_disease = 'Scale insects';
        } else if (name.includes('aphid') || desc.includes('aphid')) {
          overrides.target_pest_disease = 'Aphids';
        } else if (name.includes('mite') || desc.includes('mite')) {
          overrides.target_pest_disease = 'Spider mites';
        } else if (name.includes('thrip') || desc.includes('thrip')) {
          overrides.target_pest_disease = 'Thrips';
        }
      }

      // Herbicide weed keywords
      if (templateId === 'herbicide') {
        if (name.includes('grass') || desc.includes('grass')) {
          overrides.target_pest_disease = 'Grassy weeds';
        } else if (name.includes('broadleaf') || desc.includes('broadleaf')) {
          overrides.target_pest_disease = 'Broadleaf weeds';
        } else if (name.includes('sedge') || desc.includes('sedge') || desc.includes('nutsedge')) {
          overrides.target_pest_disease = 'Sedges';
        } else if (name.includes('pre-emergent') || desc.includes('pre-emergent')) {
          overrides.target_pest_disease = 'Pre-emergent weed control';
        } else {
          overrides.target_pest_disease = 'General weed control';
        }
      }
    }

    // ── Chemical events: application timing from AI context ──
    if (
      templateId === 'fungicide' ||
      templateId === 'pest_control' ||
      templateId === 'herbicide' ||
      templateId === 'fertilization'
    ) {
      const timingContext = `${name} ${desc} ${timing} ${reasoning}`;
      if (timingContext.includes('dormant') || timingContext.includes('winter') || timingContext.includes('pruning')) {
        overrides.application_timing = 'dormant';
      } else if (timingContext.includes('bloom') || timingContext.includes('flower') || timingContext.includes('blossom')) {
        overrides.application_timing = 'flowering';
      } else if (timingContext.includes('fruit') || timingContext.includes('set')) {
        overrides.application_timing = 'fruit_development';
      } else if (timingContext.includes('pre-harvest') || timingContext.includes('preharvest')) {
        overrides.application_timing = 'harvest';
      } else if (timingContext.includes('pre-plant') || timingContext.includes('preplant') || timingContext.includes('before planting')) {
        overrides.application_timing = 'pre_plant';
      }
      // If no match, let config default stand
    }

    // ── Chemical events: weather conditions default ──
    if (
      templateId === 'fertilization' ||
      templateId === 'pest_control' ||
      templateId === 'herbicide' ||
      templateId === 'fungicide'
    ) {
      overrides.weather_conditions = 'calm_dry';
    }

    // ── Chemical events: map AI best_practices to application_details ──
    if (
      templateId === 'fertilization' ||
      templateId === 'pest_control' ||
      templateId === 'herbicide' ||
      templateId === 'fungicide'
    ) {
      if (template.bestPractices && template.bestPractices.length > 0) {
        overrides.application_details = template.bestPractices.join('. ');
      } else if (template.reasoning && template.reasoning.trim()) {
        overrides.application_details = template.reasoning;
      }
    }

    // ── Harvest: quality grade default ──
    if (templateId === 'harvest') {
      overrides.harvest_quality_grade = 'grade_a';
    }

    return overrides;
  };

  // Reset type-aware fields when template changes
  // Merges: config defaults (generic) < backend_event_fields (crop-specific from DB) < AI overrides
  // NOTE: Voice templates are skipped here — handleVoiceEventDetected sets field values
  // directly via mapVoiceDataToFieldValues() which already merges defaults + AI-extracted data.
  React.useEffect(() => {
    if (selectedTemplate) {
      // Voice templates already have field values set by handleVoiceEventDetected
      if (selectedTemplate.id.startsWith('voice-')) return;

      const config = getQuickEventFields(typeAwareTemplateId);
      if (config) {
        // Start with generic config defaults
        const defaults: Record<string, unknown> = {};
        config.quickFields.forEach((field) => {
          if (field.default !== undefined) {
            defaults[field.name] = field.default;
          }
        });

        // Override with crop-specific values from backend_event_fields (DB template data)
        if (selectedTemplate.backend_event_fields) {
          const templateFields = selectedTemplate.backend_event_fields;
          config.quickFields.forEach((field) => {
            const backendValue = templateFields[field.name];
            if (backendValue !== undefined && backendValue !== null) {
              defaults[field.name] = backendValue;
            }
          });
        }

        // Apply AI suggestion overrides (highest priority for context-aware pre-fills)
        const aiOverrides = getAIPreFillValues(selectedTemplate, typeAwareTemplateId);
        Object.assign(defaults, aiOverrides);

        setTypeAwareFieldValues(defaults);
      }
    }
  }, [selectedTemplate, typeAwareTemplateId]);

  // RTK Query mutation and Redux state
  const [createEvent, { isLoading: isCreatingEvent }] = useCreateEventMutation();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);
  const currentUser = useSelector((state: any) => state.userState.user);
  const { farmId, parcelId, productionId } = useParams();

  // Get crop types and find the crop type ID for the current production
  const { data: cropTypesData } = useGetCropTypesDropdownQuery();

  // Real USDA data for enhanced suggestions
  // Get state from establishment data or default to user's company location
  const farmState =
    currentCompany?.establishments?.[0]?.state || currentUser?.company?.state || 'CA'; // Fallback if no establishment data available

  // Real USDA API queries for enhanced event suggestions
  const { data: realUSDAData } = useGetUSDAEmissionFactorsQuery(
    {
      crop_type: cropType.toLowerCase(),
      state: farmState
    },
    {
      skip: !cropType || !isOpen // Only fetch when modal is open
    }
  );

  const { data: benchmarkData } = useGetUSDABenchmarkComparisonQuery(
    {
      carbon_intensity: 0.001, // Default value for suggestions
      crop_type: cropType.toLowerCase(),
      state: farmState
    },
    {
      skip: !cropType || !isOpen // Only fetch when modal is open
    }
  );

  // Find the crop type ID based on the cropType prop using robust mapping service
  // This uses USDA-compliant crop type matching with aliases and keyword fallbacks
  const currentCropTypeId = React.useMemo(() => {
    if (!cropTypesData || !cropType) return null;

    // Use the robust crop type mapping service for matching
    // This handles:
    // 1. Exact name match (case-insensitive)
    // 2. Slug match
    // 3. Alias match (including Spanish names, regional variations)
    // 4. Keyword match (partial matching)
    // 5. Category match as fallback
    const matchedId = findCropTypeId(cropType, cropTypesData);

    if (matchedId) {
      return matchedId;
    }

    // If no match found through mapping service, log for debugging
    // and return null (base templates will still be shown)
    return null;
  }, [cropTypesData, cropType]);

  // Get crop type mapping info for display purposes
  const cropTypeMapping = React.useMemo(() => {
    return getCropTypeMapping(cropType);
  }, [cropType]);

  // Get event templates from database for the current crop type
  const { data: dbEventTemplatesData } = useGetEventTemplatesByCropTypeQuery(
    { cropTypeId: currentCropTypeId || 0 },
    { skip: !currentCropTypeId }
  );

  const getCurrentSeason = (month: number): string => {
    // Detect Southern Hemisphere via establishment latitude or country
    const establishment = currentCompany?.establishments?.[0];
    const latitude = establishment?.latitude;
    const country = (establishment?.country || '').toLowerCase();
    const southernCountries = [
      'uruguay',
      'argentina',
      'brazil',
      'chile',
      'australia',
      'new zealand',
      'south africa',
      'paraguay',
      'bolivia',
      'peru'
    ];
    const isSouthern =
      (latitude != null && latitude < 0) || southernCountries.includes(country);

    if (isSouthern) {
      if (month >= 12 || month <= 2) return 'summer';
      if (month >= 3 && month <= 5) return 'fall';
      if (month >= 6 && month <= 8) return 'winter';
      return 'spring';
    }
    // Northern Hemisphere (default)
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  };

  // 🤖 AI-Powered Smart Event Suggestions (Backend now handles recent events)
  const { data: aiSuggestionsData, isLoading: isLoadingAISuggestions } =
    useGetAIEventSuggestionsQuery(
      {
        crop_type: cropType,
        location: farmState,
        season: getCurrentSeason(new Date().getMonth() + 1),
        // recent_events removed - backend fetches directly from database
        farm_context: {
          establishment_id: farmId,
          parcel_id: parcelId,
          current_month: new Date().getMonth() + 1
        }
      },
      {
        skip: !cropType || !isOpen // Only fetch when modal is open
      }
    );

  // 🆕 Phase 2: Smart template suggestions based on timing and recent events
  useEffect(() => {
    if (isOpen) {
      // Use AI suggestions if available, otherwise fall back to database templates
      if (aiSuggestionsData?.suggestions) {
        getAISmartSuggestions();
      } else if (dbEventTemplatesData?.templates) {
        getSmartTemplateSuggestions();
      }
    }
  }, [isOpen, aiSuggestionsData, dbEventTemplatesData]);

  // 🆕 Phase 2: Generate smart template suggestions
  const getSmartTemplateSuggestions = async () => {
    if (!dbEventTemplatesData?.templates) return;

    const currentMonth = new Date().getMonth() + 1;
    const currentSeason = getCurrentSeason(currentMonth);

    // Filter templates by timing and usage patterns
    const suggestions = dbEventTemplatesData.templates
      .filter((template) => {
        // Seasonal relevance
        const isSeasonallyRelevant =
          template.timing?.toLowerCase().includes(currentSeason) ||
          template.timing?.toLowerCase().includes('year-round');

        // High usage templates (popular ones) - based on sustainability score
        const isPopular = (template.sustainability_score || 0) > 7;

        // High carbon impact visibility (important for QR)
        const isHighVisibility = template.qr_visibility === 'high';

        return isSeasonallyRelevant || isPopular || isHighVisibility;
      })
      .sort((a, b) => {
        // Sort by relevance score
        const aScore =
          (a.sustainability_score || 0) +
          (a.qr_visibility === 'high' ? 3 : a.qr_visibility === 'medium' ? 2 : 1) +
          (a.carbon_impact || 0) / 10;
        const bScore =
          (b.sustainability_score || 0) +
          (b.qr_visibility === 'high' ? 3 : b.qr_visibility === 'medium' ? 2 : 1) +
          (b.carbon_impact || 0) / 10;
        return bScore - aScore;
      })
      .slice(0, 3); // Top 3 suggestions

    // Convert to EventTemplate format
    const templateSuggestions = suggestions.map((template) => ({
      id: `suggested-${template.id}`,
      name: `⭐ ${template.name}`,
      icon: getEventIcon(template.event_type),
      color: getEventColor(template.event_type, template.carbon_category),
      description: `${template.description} (Suggested for ${currentSeason})`,
      carbonImpact: template.carbon_impact || 0,
      costEstimate: template.cost_estimate || 0,
      efficiency_tip: template.efficiency_tips || 'Smart suggestion based on timing and usage',
      typical_duration: template.typical_duration || '2-3 hours',
      carbonCategory: template.carbon_category as 'high' | 'medium' | 'low',
      sustainabilityScore: template.sustainability_score || 7,
      qrVisibility: template.qr_visibility as 'high' | 'medium' | 'low',
      type: template.type || template.event_type
    }));

    setTemplateSuggestions(templateSuggestions);
    setShowTemplateSuggestions(templateSuggestions.length > 0);
  };

  // Map AI category to backend event type constant
  // Backend constants from history/constants.py:
  // WEATHER=0, PRODUCTION=1, CHEMICAL=2, GENERAL=3, EQUIPMENT=4, SOIL=5, PEST=6, BUSINESS=7
  const getBackendEventTypeFromCategory = (category: string): number => {
    switch (category) {
      case 'fertilization':
        return 2; // CHEMICAL — fertilizer application
      case 'irrigation':
        return 1; // PRODUCTION — irrigation management
      case 'pest_control':
        return 2; // CHEMICAL — pesticide application (ChemicalEvent with type='PE')
      case 'harvest':
        return 1; // PRODUCTION — harvest activity
      case 'pruning':
        return 1; // PRODUCTION — pruning activity
      case 'cultivation':
        return 1; // PRODUCTION — cultivation activity
      case 'equipment':
        return 1; // PRODUCTION — equipment usage mapped to cultivation
      case 'soil_management':
        return 5; // SOIL — soil management
      default:
        return 1; // PRODUCTION — safe default
    }
  };

  // Get minimal backend_event_fields for AI suggestions based on category
  // Type codes must match Django model choices for each event type
  const getBackendEventFieldsFromCategory = (category: string): Record<string, unknown> => {
    switch (category) {
      case 'fertilization':
        return { type: 'FE', area_unit: 'ha', observation: '' }; // ChemicalEvent.FERTILIZER
      case 'irrigation':
        return { type: 'IR', area_unit: 'ha', fuel_type: 'diesel', observation: '' }; // ProductionEvent.IRRIGATION
      case 'pest_control':
        return { type: 'PE', area_unit: 'ha', observation: '' }; // ChemicalEvent.PESTICIDE - matches pestControlFields config
      case 'harvest':
        return { type: 'HA', area_unit: 'ha', fuel_type: 'diesel', observation: '' }; // ProductionEvent.HARVEST
      case 'pruning':
        return { type: 'PR', area_unit: 'ha', fuel_type: 'diesel', observation: '' }; // ProductionEvent.PRUNING
      case 'cultivation':
        return { type: 'CU', area_unit: 'ha', fuel_type: 'diesel', observation: '' }; // ProductionEvent.CULTIVATION
      case 'equipment':
        return { type: 'EM', area_unit: 'ha', fuel_type: 'diesel', observation: '' }; // ProductionEvent.EQUIPMENT_MAINTENANCE
      case 'soil_management':
        return { type: 'PA', area_unit: 'ha', fuel_type: 'diesel', observation: '' }; // SoilManagementEvent.PREPARATION
      default:
        return { type: 'PR', observation: '' }; // ProductionEvent.PRUNING
    }
  };

  // 🤖 NEW: Generate AI-powered smart suggestions
  const getAISmartSuggestions = () => {
    if (!aiSuggestionsData?.suggestions) return;

    const aiSuggestions = aiSuggestionsData.suggestions.map((suggestion, index) => ({
      id: `ai-${suggestion.id}-${index}`,
      name: `🤖 ${suggestion.name}`,
      icon: getEventIconFromCategory(suggestion.category),
      color: getPriorityColor(suggestion.priority),
      description: suggestion.description,
      carbonImpact: suggestion.carbon_impact,
      costEstimate: 0,
      efficiency_tip: suggestion.efficiency_tips.join('. ') || suggestion.reasoning,
      typical_duration: suggestion.estimated_duration,
      carbonCategory: getCarbonCategoryFromImpact(suggestion.carbon_impact),
      sustainabilityScore: 0,
      qrVisibility:
        suggestion.priority === 'high'
          ? 'high'
          : suggestion.priority === 'medium'
          ? 'medium'
          : 'low',
      type: suggestion.category,
      timing: suggestion.timing_relevance,
      usage_count: 0,
      aiPowered: true,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      bestPractices: suggestion.best_practices,
      backend_event_type: getBackendEventTypeFromCategory(suggestion.category),
      backend_event_fields: getBackendEventFieldsFromCategory(suggestion.category)
    })) as EventTemplate[];

    setTemplateSuggestions(aiSuggestions);
    setShowTemplateSuggestions(aiSuggestions.length > 0);
  };

  // Helper function to get icon from AI category
  const getEventIconFromCategory = (category: string) => {
    switch (category) {
      case 'fertilization':
        return FaSeedling;
      case 'irrigation':
        return FaTint;
      case 'pest_control':
        return FaSprayCan;
      case 'harvest':
        return FaCut;
      case 'equipment':
        return FaTractor;
      case 'soil_management':
        return FaFlask;
      default:
        return FaLeaf;
    }
  };

  // Helper function to get color from priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'blue';
    }
  };

  // Helper function to get carbon category from impact
  const getCarbonCategoryFromImpact = (impact: number): 'high' | 'medium' | 'low' => {
    if (Math.abs(impact) > 30) return 'high';
    if (Math.abs(impact) > 10) return 'medium';
    return 'low';
  };

  // Track template usage when selected
  const handleTemplateSelect = (template: EventTemplate) => {
    setSelectedTemplate(template);

    // Track template usage analytics
    if (template.id.startsWith('db-') || template.id.startsWith('suggested-')) {
      trackTemplateUsage(template.id);
    }

    // Pre-populate form fields with enhanced template data (clean names without emojis)
    const cleanName = template.name.replace('🤖 ', '').replace('⭐ ', '');
    setEventDescription(`${cleanName} - ${template.description}`);
    setApplicationRate(getDefaultApplicationRate(template));
    setDuration(template.typical_duration);

    // FIXED: Do NOT pre-populate observation with system metadata
    // The observation field should remain empty for user's actual notes
    // System metadata (transparency score, QR visibility, tips) is stored in separate backend fields
    setEventObservations('');
  };

  // 🆕 Enhanced application rate defaults
  const getDefaultApplicationRate = (template: EventTemplate): string => {
    if (template.id.includes('fertilization') || template.id.includes('fertilizer'))
      return '200 lbs/acre';
    if (template.id.includes('irrigation')) return 'Variable by system';
    if (template.id.includes('pest_control') || template.id.includes('pesticide'))
      return '1-2 gallons/acre';
    if (template.id.includes('pruning')) return 'Per tree/plant';
    if (template.id.includes('bloom_nutrition')) return '150-180 lbs/acre';

    // Check database template for typical amounts
    if (template.id.startsWith('db-') || template.id.startsWith('suggested-')) {
      const dbTemplate = dbEventTemplatesData?.templates.find(
        (t) => `db-${t.id}` === template.id || `suggested-${t.id}` === template.id
      );
      if (dbTemplate?.typical_amounts?.application_rate) {
        return dbTemplate.typical_amounts.application_rate;
      }
    }

    return 'As needed';
  };

  // 🆕 Template usage tracking
  const trackTemplateUsage = async (templateId: string) => {
    try {
      // Extract actual template ID from prefixed ID
      const actualId = templateId.replace(/^(db-|suggested-)/, '');

      // Call backend to increment usage counter
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
      await fetch(`/api/carbon/event-templates/${actualId}/use_template/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken || '',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('Template usage tracking failed:', error);
      // Non-critical error, don't show to user
    }
  };

  // Reset form when modal opens
  const resetForm = () => {
    setSelectedTemplate(null);
    setShowDetailedForm(false);
    setShowVoiceCapture(false);
    setEventDate(new Date().toISOString().slice(0, 16));
    setPerformedBy('');
    setEventDescription('');
    setEventObservations('');
    setApplicationRate('');
    setDuration('');
    setVoiceBanner(null);
  };

  // Reset when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Helper function to map event types to icons - uses static map for O(1) lookup
  const getEventIcon = useCallback((eventType: string) => EVENT_ICON_MAP[eventType] || FaBug, []);

  // Helper function to map event types to colors - uses static maps for O(1) lookup
  const getEventColor = useCallback((eventType: string, carbonCategory?: string) => {
    if (carbonCategory) {
      return CARBON_CATEGORY_COLOR_MAP[carbonCategory] || 'blue';
    }
    return EVENT_TYPE_COLOR_MAP[eventType] || 'blue';
  }, []);

  // Smart event templates based on crop type - USDA-BASED CALCULATIONS
  const getEventTemplates = (crop: string): EventTemplate[] => {
    // ALL templates come from the database - this is the single source of truth
    // The seed command (create_comprehensive_production_templates_v2) creates all templates
    // with correct backend_event_type and backend_event_fields
    const dbTemplates: EventTemplate[] = [];

    if (dbEventTemplatesData?.templates) {
      dbEventTemplatesData.templates.forEach((template) => {
        // Use template data directly from database - names are already in the correct language
        dbTemplates.push({
          id: `db-${template.id}`,
          name: template.name,
          icon: getEventIcon(template.event_type),
          color: getEventColor(template.event_type, template.carbon_category),
          description: template.description,
          carbonImpact: template.carbon_impact || 0,
          costEstimate: template.cost_estimate || 0,
          efficiency_tip: template.efficiency_tips || '',
          typical_duration: template.typical_duration || '2-3 hours',
          carbonCategory: template.carbon_category as 'high' | 'medium' | 'low',
          sustainabilityScore: template.sustainability_score || 7,
          qrVisibility: template.qr_visibility as 'high' | 'medium' | 'low',
          type: template.type || template.event_type,
          excludeFromCarbonCalculation: template.exclude_from_carbon_calculation || false,
          // New fields for better organization
          displayPriority: template.display_priority || 3,
          templateCategory: template.template_category || 'core',
          translationKey: template.translation_key || '',
          // CRITICAL: Include backend_event_fields for form pre-population
          backend_event_fields: template.backend_event_fields || {},
          typical_amounts: template.typical_amounts || {},
          // CRITICAL: Include backend_event_type for correct event type mapping
          // This prevents fallback logic from misidentifying event types
          backend_event_type: template.backend_event_type
        });
      });
    }

    // ALL templates come from database - no hardcoded templates
    // The seed command (create_comprehensive_production_templates_v2) creates all templates
    // including crop-specific ones like "Bloom Nutrition" for citrus
    // Each template has correct backend_event_type and backend_event_fields
    return dbTemplates;
  };

  // Memoize event templates to prevent 682-line array rebuild on every render
  const eventTemplates = useMemo(
    () => getEventTemplates(cropType),
    [cropType, dbEventTemplatesData, intl]
  );

  const handleShowDetails = () => {
    setShowDetailedForm(true);
    // Scroll modal body to top when showing detailed form
    setTimeout(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handleBackToTemplates = () => {
    setShowDetailedForm(false);
    setVoiceBanner(null);
  };

  const handleTemplateCreate = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    try {
      const backendEventData = {
        companyId: currentCompany.id,
        farmId: parseInt(farmId || '0'),
        parcelId: parseInt(parcelId || '0'),
        parcels: [parseInt(parcelId || '0')],
        history: productionId ? parseInt(productionId) : undefined,
        event_type: getTemplateEventType(selectedTemplate),
        date: new Date().toISOString(),
        album: { images: [] },
        template_used: selectedTemplate.id,
        template_name: selectedTemplate.name,
        exclude_from_carbon_calculation: selectedTemplate.excludeFromCarbonCalculation || false,
        sustainability_score: selectedTemplate.sustainabilityScore,
        // Template fields provide type, area, fuel defaults from DB
        ...getTemplateEventFields(selectedTemplate),
        // These MUST come AFTER the spread to override template defaults
        description: selectedTemplate.excludeFromCarbonCalculation
          ? `${selectedTemplate.name} - Documentation activity for transparency`
          : `${selectedTemplate.name} - Documented farming activity`,
        performed_by: currentUser?.first_name
          ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
          : null,
        // Quick Create has no farmer input, so observation must be empty
        // Template backend_event_fields includes system observation text that
        // would appear as fake "Farmer's Field Notes" on consumer page
        observation: ''
      };

      await createEvent(backendEventData).unwrap();

      toast({
        title: intl.formatMessage({ id: 'quickAdd.eventCreatedTitle' }),
        description: intl.formatMessage(
          { id: 'quickAdd.eventCreatedDescription' },
          { name: selectedTemplate.name.replace('🤖 ', '').replace('⭐ ', '') }
        ),
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      if (onEventAdded) {
        onEventAdded(selectedTemplate);
      }

      handleClose();
    } catch (error) {
      console.error('Error creating template event:', error);
      toast({
        title: intl.formatMessage({ id: 'quickAdd.errorCreatingTitle' }),
        description: intl.formatMessage({ id: 'quickAdd.errorCreatingDescription' }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Helper functions for template data conversion
  // Database templates are the single source of truth - no fallback logic needed
  const getTemplateEventType = (template: EventTemplate): number => {
    // Database templates MUST have backend_event_type - this is enforced by the seed command
    // Backend constants from history/constants.py:
    // WEATHER=0, PRODUCTION=1, CHEMICAL=2, GENERAL=3, EQUIPMENT=4, SOIL=5, PEST=6, BUSINESS=7
    if (template.backend_event_type === undefined) {
      console.error(
        `Template ${template.id} is missing backend_event_type - this is a data integrity issue`
      );
      throw new Error(`Template ${template.id} is missing required backend_event_type`);
    }
    return template.backend_event_type;
  };

  const getTemplateEventFields = (template: EventTemplate): Record<string, unknown> => {
    // Database templates MUST have backend_event_fields - this is enforced by the seed command
    if (!template.backend_event_fields || Object.keys(template.backend_event_fields).length === 0) {
      console.error(
        `Template ${template.id} is missing backend_event_fields - this is a data integrity issue`
      );
      return {};
    }

    // Normalize snake_case to camelCase for frontend compatibility
    const normalizedFields = normalizeBackendFields(template.backend_event_fields);
    const normalizedAmounts = template.typical_amounts
      ? normalizeBackendFields(template.typical_amounts)
      : {};

    return {
      ...normalizedFields,
      ...normalizedAmounts
    };
  };

  const handleVoiceEventDetected = async (eventData: ParsedVoiceData) => {
    // Map AI voice type to template using voiceDataMapper
    const templateMapping = mapVoiceTypeToTemplate(eventData.type);
    const templateId = templateMapping.templateId;

    // Map AI-extracted values to form field values via the standard pipeline
    const mappingResult = mapVoiceDataToFieldValues(eventData, templateId);

    // Generate summary of what was detected vs defaulted
    const summary = generateVoiceSummary(eventData, mappingResult, templateId);

    // Switch from voice capture to detailed form view
    setShowVoiceCapture(false);
    setShowDetailedForm(true);

    // Create a synthetic voice template that integrates with the existing form pipeline
    const voiceTemplate: EventTemplate = {
      id: `voice-${templateId}-${Date.now()}`,
      name: `Voice: ${templateMapping.displayName}`,
      icon: getEventIcon(templateId),
      color: getEventColor(templateId),
      description: eventData.description || `Voice-detected ${templateMapping.displayName}`,
      carbonImpact: 0,
      costEstimate: 0,
      efficiency_tip: summary.detected.length > 0
        ? `Detected: ${summary.detected.join(', ')}`
        : 'Please review and complete the fields below',
      typical_duration: '30 minutes',
      carbonCategory: 'medium' as const,
      sustainabilityScore: 8,
      qrVisibility: 'high' as const,
      type: templateId,
      backend_event_type: templateMapping.backendEventType,
      backend_event_fields: {
        type: templateMapping.backendSubtype
      }
    };

    setSelectedTemplate(voiceTemplate);

    // Pre-fill description from voice
    const cleanDesc = eventData.description || '';
    setEventDescription(cleanDesc);

    // Set voice-populated field values (will be picked up by TypeAwareFields)
    setTypeAwareFieldValues(mappingResult.values);

    // Set voice banner for the form UI
    setVoiceBanner({
      transcript: eventData.original_transcript || eventData.description,
      confidence: eventData.confidence,
      eventType: templateMapping.displayName,
      detectedFields: summary.detected
    });

    // Clear observation - user can add their own notes
    setEventObservations('');

    toast({
      title: intl.formatMessage({ id: 'quickAdd.voiceDetected' }, { type: templateMapping.displayName }),
      description: intl.formatMessage({ id: 'quickAdd.voiceReviewPrompt' }),
      status: 'info',
      duration: 4000,
      isClosable: true
    });
  };

  const handleDetailedCreate = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    try {
      // Voice templates use standard backend_event_type/backend_event_fields,
      // so they flow through the same pipeline as DB/AI templates
      const eventType = getTemplateEventType(selectedTemplate);
      const eventTypeFields = getTemplateEventFields(selectedTemplate);

      // Get type-aware fields in backend format (with carbon-critical data)
      const typeAwareBackendFields = hasTypeAwareFields
        ? getFieldsForBackend(typeAwareTemplateId, typeAwareFieldValues)
        : {};

      // Determine correct sub-type code:
      // - typeAwareBackendFields.type comes from form config (e.g., 'FU' for fungicide)
      // - template.backend_event_fields.type comes from AI/DB (e.g., 'PE' for pest_control)
      // Config type is more specific when we re-mapped within the SAME model
      //   (e.g., pest_control → fungicide, both Chemical event_type=2).
      // Template type is authoritative for CROSS-MODEL mappings
      //   (e.g., soil_management/event_type=5 → cultivation config sends 'CU' which is Production-only).
      const configType = typeAwareBackendFields.type;
      const templateType = selectedTemplate.backend_event_fields?.type;

      // Valid subtypes per backend event model (from Django model choices)
      const VALID_SUBTYPES: Record<number, string[]> = {
        1: ['PL', 'HA', 'IR', 'PR', 'TR', 'EM', 'CU', 'TH'], // ProductionEvent
        2: ['FE', 'PE', 'HE', 'FU'],                            // ChemicalEvent
        4: ['MN', 'RE', 'CA', 'EI'],                            // EquipmentEvent
        5: ['ST', 'PA', 'OM', 'CC', 'TI', 'CO'],               // SoilManagementEvent
      };
      const validForModel = VALID_SUBTYPES[eventType] || [];
      // Use config type only if it's valid for the target model; otherwise fall back to template type
      const resolvedType = (configType && validForModel.includes(configType as string))
        ? configType
        : (templateType || configType);

      const backendEventData = {
        companyId: currentCompany.id,
        farmId: parseInt(farmId || '0'),
        parcelId: parseInt(parcelId || '0'),
        parcels: [parseInt(parcelId || '0')],
        history: productionId ? parseInt(productionId) : undefined,
        event_type: eventType,
        date: eventDate,
        description: eventDescription,
        performed_by: performedBy || null,
        album: { images: [] },
        // Merge template fields with type-aware fields (type-aware takes precedence)
        ...eventTypeFields,
        ...typeAwareBackendFields,
        // Resolved sub-type code (config > template)
        ...(resolvedType ? { type: resolvedType } : {}),
        // User observation MUST come AFTER spreads to override template defaults
        observation: eventObservations || ''
      };

      await createEvent(backendEventData).unwrap();

      toast({
        title: intl.formatMessage({ id: 'quickAdd.eventCreatedTitle' }),
        description: intl.formatMessage(
          { id: 'quickAdd.eventCreatedDescription' },
          { name: selectedTemplate.name.replace('🤖 ', '').replace('⭐ ', '') }
        ),
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      if (onEventAdded) {
        onEventAdded(selectedTemplate);
      }

      handleClose();
    } catch (error) {
      console.error('Error creating detailed event:', error);
      toast({
        title: intl.formatMessage({ id: 'quickAdd.errorCreatingTitle' }),
        description: intl.formatMessage({ id: 'quickAdd.errorCreatingDescription' }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={{ base: 'full', md: '2xl' }} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent
        maxH={{ base: '100vh', md: '90vh' }}
        minH={{ base: '100vh', md: 'auto' }}
        my={{ base: 0, md: '3.75rem' }}
        borderRadius={{ base: 0, md: 'xl' }}
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={3} pt={4} pr={12}>
          <HStack spacing={3} align="center">
            <Box
              p={2}
              bg="green.50"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Icon as={FaSeedling} color="green.500" boxSize={5} />
            </Box>
            <VStack align="start" spacing={0} flex={1} minW={0}>
              <HStack spacing={2} align="center">
                <Text fontSize="lg" fontWeight="bold" color="gray.800" lineHeight="short">
                  {intl.formatMessage({ id: 'quickAdd.title' })}
                </Text>
                <Tooltip
                  label={intl.formatMessage({ id: 'quickAdd.helpTooltip' })}
                  placement="bottom"
                  hasArrow
                  openDelay={300}
                >
                  <Box as="span" display="inline-flex" tabIndex={-1}>
                    <Icon
                      as={FaQuestionCircle}
                      color="gray.400"
                      boxSize={4}
                      cursor="pointer"
                      _hover={{ color: 'green.500' }}
                      onClick={() => navigate('/education?topic=quick-add')}
                    />
                  </Box>
                </Tooltip>
              </HStack>
              <HStack spacing={2} align="center">
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'quickAdd.subtitle' })}
                </Text>
                <Badge
                  colorScheme="green"
                  variant="subtle"
                  fontSize="xs"
                  px={1.5}
                  py={0.5}
                  borderRadius="md"
                >
                  {cropType}
                </Badge>
              </HStack>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton top={4} />

        <ModalBody
          ref={modalBodyRef}
          flex="1"
          overflowY="auto"
          overflowX="hidden"
          pb={selectedTemplate ? '120px' : '4'}
          px={4}
        >
          {showDetailedForm ? (
            // DETAILED FORM VIEW
            <VStack spacing={6} align="stretch">
              {/* Selected Template Summary */}
              {selectedTemplate && (
                <Box
                  p={4}
                  bg="green.50"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="green.200"
                >
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <Box p={2} bg="green.100" borderRadius="lg">
                          <Icon as={selectedTemplate.icon} color="green.600" boxSize={5} />
                        </Box>
                        <VStack align="start" spacing={0}>
                          <EducationalTooltip term={getEducationalTooltipTerm(typeAwareTemplateId)}>
                            <Text fontWeight="semibold" color="gray.800" fontSize="sm">
                              {selectedTemplate.name.replace('🤖 ', '').replace('⭐ ', '')}
                            </Text>
                          </EducationalTooltip>
                          <Text fontSize="xs" color="gray.500">
                            {selectedTemplate.excludeFromCarbonCalculation
                              ? intl.formatMessage({ id: 'quickAdd.documentationActivity' })
                              : intl.formatMessage({ id: 'quickAdd.usdaVerifiedActivity' })}
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge
                        colorScheme={selectedTemplate.id.startsWith('ai-') ? 'purple' : 'green'}
                        variant="solid"
                        fontSize="xs"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        {selectedTemplate.id.startsWith('ai-')
                          ? `${intl.formatMessage({ id: 'quickAdd.aiMatch' })} ${Math.round((selectedTemplate as any).confidence)}%`
                          : `${selectedTemplate.sustainabilityScore}/10`}
                      </Badge>
                    </HStack>
                    {/* Learn More Link */}
                    <HStack justify="flex-end">
                      <Link
                        color="green.600"
                        fontSize="xs"
                        fontWeight="medium"
                        onClick={() => navigate('/education?topic=quick-add')}
                        _hover={{ textDecoration: 'underline', color: 'green.700' }}
                        cursor="pointer"
                      >
                        <HStack spacing={1}>
                          <Icon as={FaBook} boxSize={3} />
                          <Text>
                            {intl.formatMessage({ id: 'quickAdd.learnMoreAboutEventTypes' })}
                          </Text>
                        </HStack>
                      </Link>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Voice Detection Banner */}
              {voiceBanner && selectedTemplate?.id.startsWith('voice-') && (
                <Box
                  p={4}
                  bg={voiceBanner.confidence >= 70 ? 'green.50' : 'yellow.50'}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={voiceBanner.confidence >= 70 ? 'green.300' : 'yellow.300'}
                >
                  <VStack spacing={2} align="stretch">
                    <HStack>
                      <Icon
                        as={FaMicrophone}
                        color={voiceBanner.confidence >= 70 ? 'green.500' : 'yellow.500'}
                        boxSize={4}
                      />
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {voiceBanner.confidence >= 70
                          ? intl.formatMessage({ id: 'quickAdd.voiceLooksGood' })
                          : intl.formatMessage({ id: 'quickAdd.voiceReviewNeeded' })}
                      </Text>
                      <Badge colorScheme={voiceBanner.confidence >= 70 ? 'green' : 'yellow'} size="sm">
                        {voiceBanner.confidence}%
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" fontStyle="italic">
                      "{voiceBanner.transcript}"
                    </Text>
                    {voiceBanner.detectedFields.length > 0 && (
                      <HStack flexWrap="wrap" gap={1}>
                        <Text fontSize="xs" color="gray.500">
                          {intl.formatMessage({ id: 'quickAdd.voiceFilledFields' })}:
                        </Text>
                        {voiceBanner.detectedFields.map((field) => (
                          <Badge key={field} colorScheme="green" size="sm" variant="subtle">
                            {field.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </HStack>
                    )}
                  </VStack>
                </Box>
              )}

              {/* Detailed Form Fields - Using StandardComponents + TypeAwareFields */}
              <VStack spacing={6} align="stretch" pb={'20px'}>
                {/* Common fields for all event types */}
                <StandardField
                  label={intl.formatMessage({ id: 'quickAdd.eventDateTime' })}
                  required
                  helpText={intl.formatMessage({ id: 'quickAdd.eventDateTimeHelp' })}
                >
                  <StandardInput
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </StandardField>

                {/* Performed By - USDA GAP traceability requirement */}
                <StandardField
                  label={intl.formatMessage({ id: 'quickAdd.performedBy' })}
                  required={!selectedTemplate?.excludeFromCarbonCalculation}
                  helpText={intl.formatMessage({ id: 'quickAdd.performedByHelp' })}
                >
                  <StandardInput
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'quickAdd.performedByPlaceholder' })}
                    isDisabled={isCreating}
                  />
                </StandardField>

                {/* Note: Event Description is auto-generated from template name and sent to backend.
                    The Manual Event form does not have a user-editable Event Description field either.
                    The Additional Observations field below serves the user's need to add notes. */}

                {/* Type-Aware Fields - Dynamic based on event type */}
                {hasTypeAwareFields && (
                  <>
                    <Divider borderColor="gray.200" />
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={4}>
                        {intl.formatMessage({ id: 'quickAdd.typeSpecificFields' })}
                      </Text>
                      <TypeAwareFields
                        templateId={typeAwareTemplateId}
                        values={typeAwareFieldValues}
                        onChange={handleTypeAwareFieldChange}
                        isDisabled={isCreating}
                      />
                    </Box>
                    <Divider borderColor="gray.200" />
                  </>
                )}

                {/* Additional Observations */}
                <StandardField
                  label={intl.formatMessage({ id: 'quickAdd.additionalObservations' })}
                  helpText={intl.formatMessage({ id: 'quickAdd.additionalObservationsHelp' })}
                >
                  <StandardTextarea
                    value={eventObservations}
                    onChange={(e) => setEventObservations(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'quickAdd.observationsPlaceholder' })}
                  />
                </StandardField>
              </VStack>
            </VStack>
          ) : (
            // MAIN TEMPLATE SELECTION VIEW
            <VStack spacing={6} align="stretch">
              {/* Smart Template Suggestions - Transparency First */}
              {showTemplateSuggestions && (
                <SectionBox variant="highlighted" borderColor="green.200" bg="green.50">
                  <VStack spacing={4} align="stretch">
                    <SectionHeader
                      icon={aiSuggestionsData?.ai_confidence ? FaRobot : FaChartLine}
                      iconColor="green.500"
                      title={intl.formatMessage(
                        { id: 'quickAdd.aiSuggestionsTitle' },
                        {
                          season:
                            getCurrentSeason(new Date().getMonth() + 1)
                              .charAt(0)
                              .toUpperCase() + getCurrentSeason(new Date().getMonth() + 1).slice(1)
                        }
                      )}
                      badge={aiSuggestionsData?.ai_confidence ? 'OpenAI Powered' : 'AI Powered'}
                      badgeColorScheme="green"
                      description={
                        aiSuggestionsData?.ai_confidence
                          ? `AI Confidence: ${aiSuggestionsData.ai_confidence}% • ${aiSuggestionsData.reasoning}`
                          : 'Based on timing, usage patterns, and transparency visibility'
                      }
                    />

                    {/* Skeleton Loading for AI Suggestions */}
                    {isLoadingAISuggestions ? (
                      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={3}>
                        {[1, 2, 3].map((i) => (
                          <Box
                            key={i}
                            p={4}
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor="purple.200"
                            bg="purple.50"
                          >
                            <VStack spacing={2}>
                              <Skeleton height="20px" width="80%" />
                              <Skeleton height="16px" width="60%" />
                              <HStack>
                                <Skeleton height="16px" width="40px" />
                                <Skeleton height="16px" width="30px" />
                              </HStack>
                            </VStack>
                          </Box>
                        ))}
                      </Grid>
                    ) : templateSuggestions.length > 0 ? (
                      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={3}>
                        {templateSuggestions.map((template) => {
                          const isSelected = selectedTemplate?.id === template.id;

                          return (
                            <Button
                              key={template.id}
                              variant={isSelected ? 'solid' : 'outline'}
                              colorScheme={template.id.startsWith('ai-') ? 'purple' : 'blue'}
                              size="md"
                              height="auto"
                              py={3}
                              onClick={() => handleTemplateSelect(template)}
                              display="flex"
                              flexDirection="column"
                              justifyContent="center"
                              alignItems="center"
                              gap={2}
                              borderWidth={isSelected ? '3px' : '1px'}
                              borderColor={isSelected ? 'purple.400' : undefined}
                              bg={isSelected ? 'purple.100' : undefined}
                              _hover={{
                                transform: 'translateY(-2px)',
                                boxShadow: 'lg',
                                borderColor: template.id.startsWith('ai-')
                                  ? 'purple.300'
                                  : 'blue.300'
                              }}
                              transition="all 0.2s"
                            >
                              <HStack>
                                <Icon as={template.icon} boxSize={4} />
                                {template.id.startsWith('ai-') && (
                                  <Icon as={FaRobot} boxSize={3} color="purple.400" />
                                )}
                              </HStack>
                              <VStack spacing={1} align="center">
                                <Text
                                  fontSize="xs"
                                  textAlign="center"
                                  lineHeight={1.2}
                                  fontWeight="bold"
                                  noOfLines={2}
                                  maxW="180px"
                                  color={isSelected ? 'purple.700' : undefined}
                                >
                                  {template.name}
                                </Text>
                                <HStack spacing={1}>
                                  {template.id.startsWith('ai-') ? (
                                    <Badge
                                      colorScheme={isSelected ? 'purple' : 'blue'}
                                      size="xs"
                                      variant={isSelected ? 'solid' : 'outline'}
                                    >
                                      {intl.formatMessage({ id: 'quickAdd.aiMatch' })}{' '}
                                      {Math.round((template as any).confidence)}%
                                    </Badge>
                                  ) : (
                                    <Badge colorScheme="green" size="xs">
                                      {template.sustainabilityScore}/10
                                    </Badge>
                                  )}
                                </HStack>
                              </VStack>
                            </Button>
                          );
                        })}
                      </Grid>
                    ) : (
                      <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                        No AI suggestions available at the moment
                      </Text>
                    )}

                    {/* AI Reasoning Display */}
                    {aiSuggestionsData?.ai_confidence && selectedTemplate?.id.startsWith('ai-') && (
                      <Box
                        p={3}
                        bg="purple.50"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="purple.200"
                      >
                        <VStack spacing={2} align="start">
                          <HStack>
                            <Icon as={FaLightbulb} color="purple.500" boxSize={4} />
                            <Text fontSize="sm" fontWeight="bold" color="purple.700">
                              AI Reasoning
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="purple.600">
                            {(selectedTemplate as any).reasoning}
                          </Text>
                          {(selectedTemplate as any).bestPractices &&
                            (selectedTemplate as any).bestPractices.length > 0 && (
                              <Box>
                                <Text fontSize="xs" fontWeight="bold" color="purple.700" mb={1}>
                                  Best Practices:
                                </Text>
                                {(selectedTemplate as any).bestPractices.map(
                                  (practice: string, index: number) => (
                                    <Text key={index} fontSize="xs" color="purple.600" ml={2}>
                                      • {practice}
                                    </Text>
                                  )
                                )}
                              </Box>
                            )}
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                </SectionBox>
              )}

              {/* Voice Input Section */}
              {(() => {
                const plan = currentCompany?.subscription_plan || currentCompany?.subscription?.plan;
                const hasVoiceFeature = !!plan?.features?.voice_recording;

                if (!hasVoiceFeature) {
                  return (
                    <SectionBox variant="default" borderColor="gray.200" bg="gray.50">
                      <VStack spacing={3}>
                        <SectionHeader
                          icon={FaMicrophone}
                          iconColor="gray.400"
                          title={intl.formatMessage({ id: 'quickAdd.voiceInputTitle' })}
                          badge={intl.formatMessage({ id: 'quickAdd.fastestMethod' })}
                          badgeColorScheme="gray"
                        />
                        <Text fontSize="sm" color="gray.600" textAlign="center">
                          Voice input is available on Basic ($69/mo) and higher plans. Upgrade to capture farm events by simply speaking.
                        </Text>
                      </VStack>
                    </SectionBox>
                  );
                }

                return !showVoiceCapture ? (
                  <SectionBox variant="default" borderColor="blue.200" bg="blue.50">
                    <VStack spacing={4}>
                      <SectionHeader
                        icon={FaMicrophone}
                        iconColor="blue.500"
                        title={intl.formatMessage({ id: 'quickAdd.voiceInputTitle' })}
                        badge={intl.formatMessage({ id: 'quickAdd.fastestMethod' })}
                        badgeColorScheme="blue"
                      />

                      <Text fontSize="sm" color="gray.600" textAlign="center">
                        Say: "Applied fertilizer today, 200 pounds per acre"
                      </Text>

                      <StandardButton
                        variant="primary"
                        leftIcon={<Icon as={FaMicrophone} />}
                        onClick={() => {
                          setSelectedTemplate(null);
                          setShowVoiceCapture(true);
                        }}
                        size="lg"
                      >
                        {intl.formatMessage({ id: 'quickAdd.startVoiceInput' })}
                      </StandardButton>
                    </VStack>
                  </SectionBox>
                ) : (
                  <VoiceEventCapture
                    onEventDetected={handleVoiceEventDetected}
                    isActive={true}
                    cropType={cropType}
                    onClose={() => setShowVoiceCapture(false)}
                  />
                );
              })()}

              <Divider />

              {/* Enhanced Smart Templates Section - Transparency First */}
              <Box>
                <SectionHeader
                  icon={FaSeedling}
                  iconColor="green.500"
                  title={intl.formatMessage({ id: 'quickAdd.smartTemplatesTitle' })}
                  badge={intl.formatMessage({ id: 'quickAdd.consumerVisible' })}
                  badgeColorScheme="green"
                  description={intl.formatMessage({ id: 'quickAdd.smartTemplatesDescription' })}
                />

                {/* General Templates */}
                <Box mb={6}>
                  <Text fontWeight="medium" fontSize="md" color="gray.700" mb={3}>
                    📋 {intl.formatMessage({ id: 'quickAdd.otherFarmActivities' })}
                  </Text>
                  <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                    gap={4}
                    width="100%"
                  >
                    {eventTemplates
                      .filter((template) => !template.id.startsWith('db-'))
                      .map((template) => (
                        <Box
                          key={template.id}
                          p={4}
                          borderRadius="lg"
                          borderWidth="2px"
                          borderColor={
                            selectedTemplate?.id === template.id
                              ? `${template.color}.300`
                              : 'gray.200'
                          }
                          bg={
                            selectedTemplate?.id === template.id ? `${template.color}.50` : 'white'
                          }
                          cursor="pointer"
                          onClick={() => handleTemplateSelect(template)}
                          _hover={{
                            borderColor: `${template.color}.300`,
                            transform: 'translateY(-2px)',
                            boxShadow: 'md'
                          }}
                          transition="all 0.2s"
                          minW={0}
                        >
                          <VStack spacing={3} align="start" width="100%">
                            <HStack justify="space-between" width="100%" flexWrap="wrap" gap={2}>
                              <HStack flex="1" minW={0}>
                                <Icon
                                  as={template.icon}
                                  color={`${template.color}.500`}
                                  boxSize={4}
                                  flexShrink={0}
                                />
                                <Text
                                  fontWeight="bold"
                                  fontSize="sm"
                                  noOfLines={2}
                                  wordBreak="break-word"
                                >
                                  {template.name}
                                </Text>
                              </HStack>
                              {template.excludeFromCarbonCalculation ? (
                                <Badge colorScheme="gray" size="xs" flexShrink={0}>
                                  {intl.formatMessage({ id: 'quickAdd.documentation' })}
                                </Badge>
                              ) : (
                                <Badge colorScheme="green" size="xs" flexShrink={0}>
                                  {intl.formatMessage({ id: 'quickAdd.usdaVerified' })}
                                </Badge>
                              )}
                            </HStack>

                            <Text fontSize="xs" color="gray.600" noOfLines={2}>
                              {template.description}
                            </Text>

                            <HStack justify="space-between" width="100%">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="xs" color="gray.500">
                                  {intl.formatMessage({ id: 'quickAdd.transparency' })}
                                </Text>
                                <Text fontSize="sm" fontWeight="bold" color="green.600">
                                  {template.sustainabilityScore}/10
                                </Text>
                              </VStack>
                              <VStack align="end" spacing={0}>
                                <Text fontSize="xs" color="gray.500">
                                  {intl.formatMessage({ id: 'quickAdd.qrVisibility' })}
                                </Text>
                                <Badge colorScheme="green" variant="subtle" size="xs">
                                  {template.qrVisibility}
                                </Badge>
                              </VStack>
                            </HStack>

                            <Box p={2} bg="green.50" borderRadius="md" width="100%">
                              <Text fontSize="xs" color="green.700" noOfLines={2}>
                                💡 {template.efficiency_tip}
                              </Text>
                            </Box>
                          </VStack>
                        </Box>
                      ))}
                  </Grid>
                </Box>

                {/* Crop-Specific Events Section */}
                {eventTemplates.filter((template) => template.id.startsWith('db-')).length > 0 && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={FaSeedling} color="green.500" boxSize={4} />
                      <Text fontWeight="semibold" fontSize="md" color="green.700">
                        🎯 {dbEventTemplatesData?.crop_type?.name || cropType} Specific Events
                      </Text>
                      <Badge colorScheme="green" size="sm">
                        Database Optimized
                      </Badge>
                    </HStack>

                    <Grid
                      templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                      gap={4}
                      width="100%"
                    >
                      {eventTemplates
                        .filter((template) => template.id.startsWith('db-'))
                        .map((template) => (
                          <Box
                            key={template.id}
                            p={4}
                            borderRadius="lg"
                            borderWidth="2px"
                            borderColor={
                              selectedTemplate?.id === template.id
                                ? `${template.color}.300`
                                : 'gray.200'
                            }
                            bg={
                              selectedTemplate?.id === template.id
                                ? `${template.color}.50`
                                : 'white'
                            }
                            cursor="pointer"
                            onClick={() => handleTemplateSelect(template)}
                            _hover={{
                              borderColor: `${template.color}.300`,
                              transform: 'translateY(-2px)',
                              boxShadow: 'md'
                            }}
                            transition="all 0.2s"
                            minW={0}
                          >
                            <VStack spacing={3} align="start" width="100%">
                              <HStack justify="space-between" width="100%" flexWrap="wrap" gap={2}>
                                <HStack flex="1" minW={0}>
                                  <Icon
                                    as={template.icon}
                                    color={`${template.color}.500`}
                                    boxSize={4}
                                    flexShrink={0}
                                  />
                                  <Text
                                    fontWeight="bold"
                                    fontSize="sm"
                                    noOfLines={2}
                                    wordBreak="break-word"
                                  >
                                    {template.name}
                                  </Text>
                                </HStack>
                                {template.excludeFromCarbonCalculation ? (
                                  <Badge colorScheme="gray" size="xs" flexShrink={0}>
                                    {intl.formatMessage({ id: 'quickAdd.documentation' })}
                                  </Badge>
                                ) : (
                                  <Badge colorScheme="green" size="xs" flexShrink={0}>
                                    {intl.formatMessage({ id: 'quickAdd.usdaVerified' })}
                                  </Badge>
                                )}
                              </HStack>

                              <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                {template.description}
                              </Text>

                              <HStack justify="space-between" width="100%">
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="xs" color="gray.500">
                                    {intl.formatMessage({ id: 'quickAdd.transparency' })}
                                  </Text>
                                  <Text fontSize="sm" fontWeight="bold" color="green.600">
                                    {template.sustainabilityScore}/10
                                  </Text>
                                </VStack>
                                <VStack align="end" spacing={0}>
                                  <Text fontSize="xs" color="gray.500">
                                    {intl.formatMessage({ id: 'quickAdd.qrVisibility' })}
                                  </Text>
                                  <Badge colorScheme="green" variant="subtle" size="xs">
                                    {template.qrVisibility}
                                  </Badge>
                                </VStack>
                              </HStack>

                              {template.efficiency_tip && (
                                <Box p={2} bg="green.50" borderRadius="md" width="100%">
                                  <Text fontSize="xs" color="green.700" noOfLines={2}>
                                    🎯 {template.efficiency_tip}
                                  </Text>
                                </Box>
                              )}
                            </VStack>
                          </Box>
                        ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            </VStack>
          )}
        </ModalBody>

        {/* Fixed Bottom Action Section - Show when template is selected */}
        {selectedTemplate && (
          <Box
            position="absolute"
            bottom="0"
            left="0"
            right="0"
            bg="white"
            borderTop="1px solid"
            borderColor="gray.100"
            p={4}
            pb={{ base: 6, md: 4 }}
            boxShadow="0 -4px 12px rgba(0, 0, 0, 0.08)"
            zIndex={10}
          >
            {showDetailedForm ? (
              // Detailed Form Footer
              <VStack spacing={3}>
                <HStack justify="space-between" width="100%">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold" color="gray.800" fontSize="sm">
                      {intl.formatMessage(
                        { id: 'quickAdd.addingDetails' },
                        { name: selectedTemplate.name.replace('🤖 ', '').replace('⭐ ', '') }
                      )}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {intl.formatMessage({ id: 'quickAdd.completeFormDescription' })}
                    </Text>
                  </VStack>
                  <Badge
                    colorScheme={selectedTemplate.id.startsWith('ai-') ? 'purple' : 'green'}
                    variant="solid"
                    fontSize="xs"
                    px={2}
                    py={1}
                  >
                    {selectedTemplate.id.startsWith('ai-')
                      ? `${intl.formatMessage({ id: 'quickAdd.aiMatch' })} ${Math.round((selectedTemplate as any).confidence)}%`
                      : `${selectedTemplate.sustainabilityScore}/10`}
                  </Badge>
                </HStack>

                <HStack spacing={3} width="100%">
                  <StandardButton
                    variant="outline"
                    onClick={handleBackToTemplates}
                    leftIcon={<Icon as={FaArrowLeft} />}
                    size="lg"
                  >
                    {intl.formatMessage({ id: 'quickAdd.back' })}
                  </StandardButton>
                  <StandardButton
                    variant="primary"
                    w="full"
                    onClick={handleDetailedCreate}
                    isLoading={isCreating}
                    loadingText={intl.formatMessage({ id: 'quickAdd.creating' })}
                    leftIcon={<Icon as={FaCheckCircle} />}
                    size="lg"
                  >
                    {intl.formatMessage({ id: 'quickAdd.createFarmEvent' })}
                  </StandardButton>
                </HStack>
              </VStack>
            ) : (
              // Template Selection Footer
              <VStack spacing={4}>
                <HStack justify="space-between" width="100%">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold" color="gray.800" fontSize="sm">
                      {intl.formatMessage(
                        { id: 'quickAdd.readyToCreate' },
                        { name: selectedTemplate.name.replace('🤖 ', '') }
                      )}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {intl.formatMessage(
                        { id: 'quickAdd.visibleToConsumers' },
                        { visibility: selectedTemplate.qrVisibility }
                      )}
                    </Text>
                  </VStack>
                  <Badge colorScheme="gray" variant="subtle" fontSize="xs" px={2} py={1}>
                    {selectedTemplate.typical_duration}
                  </Badge>
                </HStack>

                <HStack spacing={3} width="100%">
                  <StandardButton
                    variant="primary"
                    w="full"
                    onClick={handleTemplateCreate}
                    isLoading={isCreating}
                    loadingText={intl.formatMessage({ id: 'quickAdd.creatingEvent' })}
                    leftIcon={<Icon as={FaSeedling} />}
                    size="lg"
                  >
                    {intl.formatMessage({ id: 'quickAdd.quickCreateEvent' })}
                  </StandardButton>
                  <StandardButton variant="outline" onClick={handleShowDetails} size="lg">
                    {intl.formatMessage({ id: 'quickAdd.addDetails' })}
                  </StandardButton>
                </HStack>
              </VStack>
            )}
          </Box>
        )}
      </ModalContent>
    </Modal>
  );
};

export default QuickAddEvent;
