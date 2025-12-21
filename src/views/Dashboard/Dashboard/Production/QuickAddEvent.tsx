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
  IconButton,
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
import {
  TypeAwareFields,
  useTypeAwareFields
} from 'components/QuickEvent';
import {
  getQuickEventFields,
  getFieldsForBackend
} from 'config/quickEventFields';
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
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const intl = useIntl();

  // Map selected template to quickEventFields templateId
  const getTypeAwareTemplateId = (template: EventTemplate | null): string => {
    if (!template) return 'general_documentation';

    const id = template.id.toLowerCase();
    const type = template.type?.toLowerCase() || '';

    // Map based on template ID patterns
    if (id.includes('fertiliz') || type.includes('fertiliz')) return 'fertilization';
    if (id.includes('irrigation') || type.includes('irrigation')) return 'irrigation';
    if (id.includes('pest') || type.includes('pest')) return 'pest_control';
    if (id.includes('pruning') || type.includes('pruning') || type.includes('prune')) return 'pruning';
    if (id.includes('plant') || id.includes('seed') || type.includes('plant') || type.includes('seed')) return 'planting';
    if (id.includes('harvest') || type.includes('harvest')) return 'harvest';
    if (id.includes('herbicide') || type.includes('herbicide') || type.includes('weed')) return 'herbicide';
    if (id.includes('fungicide') || type.includes('fungicide') || type.includes('fungi')) return 'fungicide';

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

  // Reset type-aware fields when template changes
  React.useEffect(() => {
    if (selectedTemplate) {
      const config = getQuickEventFields(typeAwareTemplateId);
      if (config) {
        // Initialize with defaults
        const defaults: Record<string, unknown> = {};
        config.quickFields.forEach((field) => {
          if (field.default !== undefined) {
            defaults[field.name] = field.default;
          }
        });
        setTypeAwareFieldValues(defaults);
      }
    }
  }, [selectedTemplate, typeAwareTemplateId]);

  // RTK Query mutation and Redux state
  const [createEvent, { isLoading: isCreatingEvent }] = useCreateEventMutation();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);
  const currentUser = useSelector((state: any) => state.userState.user);
  const { establishmentId, parcelId } = useParams();

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
    console.log(`[QuickAddEvent] No crop type match found for "${cropType}"`);
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
          establishment_id: establishmentId,
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
      sustainabilityScore: Math.round(suggestion.confidence / 10),
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
      bestPractices: suggestion.best_practices
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
      await fetch(`/api/carbon/event-templates/${actualId}/use_template/`, {
        method: 'POST',
        credentials: 'include'
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
  const getEventIcon = useCallback(
    (eventType: string) => EVENT_ICON_MAP[eventType] || FaBug,
    []
  );

  // Helper function to map event types to colors - uses static maps for O(1) lookup
  const getEventColor = useCallback(
    (eventType: string, carbonCategory?: string) => {
      if (carbonCategory) {
        return CARBON_CATEGORY_COLOR_MAP[carbonCategory] || 'blue';
      }
      return EVENT_TYPE_COLOR_MAP[eventType] || 'blue';
    },
    []
  );

  // Smart event templates based on crop type - USDA-BASED CALCULATIONS
  const getEventTemplates = (crop: string): EventTemplate[] => {
    // ALL templates come from the database - this is the single source of truth
    // The seed command (create_comprehensive_production_templates_v2) creates all templates
    // with correct backend_event_type and backend_event_fields
    const dbTemplates: EventTemplate[] = [];

    // DEBUG: Log raw API response
    console.log('=== DEBUG: Raw API templates ===');
    console.log('dbEventTemplatesData:', dbEventTemplatesData);

    if (dbEventTemplatesData?.templates) {
      dbEventTemplatesData.templates.forEach((template) => {
        // DEBUG: Log each template's backend_event_type
        console.log(`Template ${template.id} (${template.name}): backend_event_type = ${template.backend_event_type}`);
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
  };

  const handleTemplateCreate = async () => {
    if (!selectedTemplate) return;

    // DEBUG: Log template data to trace event_type issue
    console.log('=== DEBUG: handleTemplateCreate ===');
    console.log('Selected template:', selectedTemplate);
    console.log('Template backend_event_type:', selectedTemplate.backend_event_type);
    console.log('getTemplateEventType result:', getTemplateEventType(selectedTemplate));

    setIsCreating(true);
    try {
      const backendEventData = {
        companyId: currentCompany.id,
        establishmentId: parseInt(establishmentId || '0'),
        parcelId: parseInt(parcelId || '0'),
        parcels: [parseInt(parcelId || '0')],
        event_type: getTemplateEventType(selectedTemplate),
        date: new Date().toISOString(),
        description: selectedTemplate.excludeFromCarbonCalculation
          ? `${selectedTemplate.name} - Documentation activity for transparency`
          : `${selectedTemplate.name} - USDA-verified farming activity`,
        album: { images: [] },
        observation: selectedTemplate.efficiency_tip || '',
        template_used: selectedTemplate.id,
        template_name: selectedTemplate.name,
        exclude_from_carbon_calculation: selectedTemplate.excludeFromCarbonCalculation || false,
        sustainability_score: selectedTemplate.sustainabilityScore,
        ...getTemplateEventFields(selectedTemplate)
      };

      console.log('=== DEBUG: backendEventData being sent ===');
      console.log('event_type:', backendEventData.event_type);
      console.log('Full payload:', JSON.stringify(backendEventData, null, 2));

      await createEvent(backendEventData).unwrap();

      toast({
        title: 'Farm Event Created!',
        description: `${selectedTemplate.name} added to your transparency timeline. Visible to consumers via QR codes.`,
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
        title: 'Error Creating Event',
        description: 'Failed to create farm event. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Helper functions for voice data conversion
  const getEventTypeFromVoiceData = (eventData: any): number => {
    // Handle both the old format (event_type: 'irrigation') and new format (event_type: 'production')
    // Backend constants from history/constants.py:
    // WEATHER=0, PRODUCTION=1, CHEMICAL=2, GENERAL=3, EQUIPMENT=4, SOIL=5, PEST=6, BUSINESS=7
    const eventType = eventData.event_type;

    console.log('Voice event type mapping:', eventType, eventData);

    if (eventType === 'production' || eventType === 'irrigation') {
      return 1; // Production Event (PRODUCTION_EVENT_TYPE = 1)
    } else if (
      eventType === 'chemical' ||
      eventType === 'fertilizer' ||
      eventType === 'pesticide' ||
      eventType === 'herbicide' ||
      eventType === 'fungicide'
    ) {
      return 2; // Chemical Event (CHEMICAL_EVENT_TYPE = 2)
    } else if (eventType === 'equipment') {
      return 4; // Equipment Event (EQUIPMENT_EVENT_TYPE = 4)
    } else if (eventType === 'weather') {
      return 0; // Weather Event (WEATHER_EVENT_TYPE = 0)
    } else if (eventType === 'general') {
      // Check if this is actually a production event that was misclassified
      if (
        eventData.production_type ||
        eventData.description?.toLowerCase().includes('irrigat') ||
        eventData.description?.toLowerCase().includes('harvest') ||
        eventData.description?.toLowerCase().includes('plant') ||
        eventData.description?.toLowerCase().includes('prun')
      ) {
        console.log('Reclassifying general event as production based on content');
        return 1; // Production Event (PRODUCTION_EVENT_TYPE = 1)
      }
      return 3; // General Event (GENERAL_EVENT_TYPE = 3)
    }

    return 1; // Default to Production (PRODUCTION_EVENT_TYPE = 1)
  };

  const convertVoiceDataToEventFields = (eventData: any): any => {
    const eventType = eventData.event_type;

    console.log('Converting voice data fields:', eventType, eventData);

    // Handle the actual data structure from VoiceEventCapture
    if (eventType === 'production') {
      // For production events, use the production_type field
      const productionType = eventData.production_type || 'IR';
      const productionTypeNames = {
        IR: 'Irrigation Event',
        HA: 'Harvest Event',
        PL: 'Planting Event',
        PR: 'Pruning Event'
      };
      return {
        type: productionType, // Use production_type from VoiceEventCapture
        production_name:
          productionTypeNames[productionType] || `${eventData.description || 'Production Event'}`,
        name:
          productionTypeNames[productionType] || `${eventData.description || 'Production Event'}`,
        observation:
          eventData.observation ||
          `Production activity: ${eventData.description || 'Not specified'}`
      };
    } else if (eventType === 'chemical') {
      // For chemical events, use the chemical_type field
      return {
        type: eventData.chemical_type || 'FE', // Use chemical_type from VoiceEventCapture
        commercial_name: eventData.commercial_name || 'Chemical Product',
        volume: eventData.volume || '',
        way_of_application: eventData.way_of_application || 'broadcast',
        time_period: eventData.time_period || 'morning'
      };
    } else if (eventType === 'equipment') {
      // For equipment events, use the equipment_type field
      return {
        type: eventData.equipment_type || 'FC', // Use equipment_type from VoiceEventCapture
        equipment_name: eventData.equipment_name || 'Farm Equipment',
        fuel_amount: eventData.fuel_amount || 0,
        fuel_type: eventData.fuel_type || 'diesel'
      };
    } else if (eventType === 'general') {
      // Handle misclassified general events
      if (
        eventData.production_type ||
        eventData.description?.toLowerCase().includes('irrigat') ||
        eventData.description?.toLowerCase().includes('harvest') ||
        eventData.description?.toLowerCase().includes('plant') ||
        eventData.description?.toLowerCase().includes('prun')
      ) {
        console.log('Converting misclassified general event to production fields');
        return {
          type: eventData.production_type || 'IR', // Default to irrigation
          observation:
            eventData.observation ||
            `Production activity: ${eventData.description || 'Not specified'}`
        };
      }
      // For actual general events, provide the required name field
      return {
        name: eventData.name || `${eventData.description || 'Voice Event'}`.substring(0, 50),
        observation: eventData.observation || eventData.description || 'Voice-detected activity'
      };
    }

    // Fallback for old format or unknown types
    if (eventData.event_type === 'fertilizer') {
      return {
        type: 'FE',
        commercial_name: eventData.detected_products?.[0] || 'Fertilizer',
        volume: eventData.detected_amounts?.[0] || '',
        way_of_application: 'broadcast',
        time_period: 'morning'
      };
    } else if (eventData.event_type === 'irrigation') {
      return {
        type: 'IR',
        observation: `Duration: ${eventData.detected_amounts?.[0] || 'Not specified'}. System: ${
          eventData.detected_systems?.[0] || 'Standard'
        }`
      };
    }

    return {};
  };

  // Helper functions for template data conversion
  // Database templates are the single source of truth - no fallback logic needed
  const getTemplateEventType = (template: EventTemplate): number => {
    // Database templates MUST have backend_event_type - this is enforced by the seed command
    // Backend constants from history/constants.py:
    // WEATHER=0, PRODUCTION=1, CHEMICAL=2, GENERAL=3, EQUIPMENT=4, SOIL=5, PEST=6, BUSINESS=7
    if (template.backend_event_type === undefined) {
      console.error(`Template ${template.id} is missing backend_event_type - this is a data integrity issue`);
      throw new Error(`Template ${template.id} is missing required backend_event_type`);
    }
    return template.backend_event_type;
  };

  const getTemplateEventFields = (template: EventTemplate): Record<string, unknown> => {
    // Database templates MUST have backend_event_fields - this is enforced by the seed command
    if (!template.backend_event_fields || Object.keys(template.backend_event_fields).length === 0) {
      console.error(`Template ${template.id} is missing backend_event_fields - this is a data integrity issue`);
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

  const handleVoiceEventDetected = async (eventData: any) => {
    // Handle voice-detected event
    console.log('Voice event detected:', eventData);

    // Enhanced validation for required fields based on event type
    const validateVoiceEventData = (voiceData: any) => {
      const eventType = getEventTypeFromVoiceData(voiceData);
      const eventFields = convertVoiceDataToEventFields(voiceData);

      // Required fields mapping (same as NewEvent.jsx)
      const requiredFieldsByType: { [key: number]: string[] } = {
        1: ['type', 'commercial_name', 'volume', 'area', 'concentration', 'way_of_application'], // Chemical
        2: ['type'], // Production - other fields are optional but encouraged
        4: ['type', 'equipment_name', 'fuel_amount', 'hours_used'], // Equipment
        5: ['type'], // Soil Management - specific fields should come from form inputs
        6: ['type'], // Pest Management - specific fields should come from form inputs
        7: ['type'], // Business Activity - specific fields should come from form inputs
        0: ['type'], // Weather
        3: ['name'] // General
      };

      const requiredFields = requiredFieldsByType[eventType] || [];
      const missingFields: string[] = [];
      const detectedFields: string[] = [];

      // Check required fields and detect what was actually captured from voice
      requiredFields.forEach((field: string) => {
        const value = eventFields[field];
        if (
          !value ||
          value.toString().toLowerCase() === 'unknown' ||
          value.toString().trim() === '' ||
          value.toString().includes('Voice-detected') ||
          value.toString().includes('50 liters') ||
          value.toString().includes('1.5 hectares') ||
          value.toString().includes('16-16-16') ||
          value.toString().includes('Farm Equipment') ||
          (typeof value === 'number' && value === 50)
        ) {
          missingFields.push(field);
        } else {
          detectedFields.push(field);
        }
      });

      return {
        isValid: missingFields.length === 0,
        missingFields,
        detectedFields,
        eventType,
        eventFields
      };
    };

    const validation = validateVoiceEventData(eventData);

    // Always show the detailed form for voice events to collect missing information
    setShowVoiceCapture(false);
    setShowDetailedForm(true);

    // Create a template based on voice data for the detailed form
    const voiceTemplate: EventTemplate & { _voiceEventType?: number; _voiceEventFields?: any } = {
      id: `voice-${Date.now()}`,
      name: `Voice: ${eventData.type} Event`,
      icon: getEventIcon(eventData.event_type),
      color: getEventColor(eventData.event_type),
      description: `Complete the voice-detected ${eventData.type} event`,
      carbonImpact: eventData.suggested_carbon_impact || 0,
      costEstimate: 0,
      efficiency_tip:
        validation.missingFields.length > 0
          ? `Please provide: ${validation.missingFields.join(', ')}`
          : 'Voice detection complete - verify details',
      typical_duration: '30 minutes',
      carbonCategory: 'medium' as const,
      sustainabilityScore: 8,
      qrVisibility: 'high' as const,
      type: eventData.event_type,
      // Add custom properties to help with event type mapping
      _voiceEventType: validation.eventType,
      _voiceEventFields: validation.eventFields
    };

    setSelectedTemplate(voiceTemplate);

    // Pre-fill form with voice data (only the fields that were actually detected)
    setEventDescription(eventData.description || '');

    // Extract duration from voice data - look for detected amounts that contain time units
    let detectedDuration = '';
    if (eventData.detected_amounts && eventData.detected_amounts.length > 0) {
      // Look for time-related amounts (hours, minutes, etc.)
      const timeAmount = eventData.detected_amounts.find(
        (amount: string) =>
          amount.toLowerCase().includes('hour') ||
          amount.toLowerCase().includes('minute') ||
          amount.toLowerCase().includes('hr')
      );
      if (timeAmount) {
        detectedDuration = timeAmount;
      }
    }

    // If we have a detected duration, set it, otherwise leave empty for user input
    if (detectedDuration) {
      setDuration(detectedDuration);
    } else {
      setDuration(''); // Clear duration field so user can input
    }

    // Extract application rate if available
    if (eventData.detected_amounts && eventData.detected_amounts.length > 0) {
      // Look for non-time amounts for application rate
      const rateAmount = eventData.detected_amounts.find(
        (amount: string) =>
          !amount.toLowerCase().includes('hour') &&
          !amount.toLowerCase().includes('minute') &&
          !amount.toLowerCase().includes('hr')
      );
      if (rateAmount) {
        setApplicationRate(rateAmount);
      }
    }

    // Create detailed observation with what was detected vs what's needed
    const detectedValues = [];
    if (eventData.detected_amounts && eventData.detected_amounts.length > 0) {
      detectedValues.push(`amounts: ${eventData.detected_amounts.join(', ')}`);
    }
    if (eventData.detected_products && eventData.detected_products.length > 0) {
      detectedValues.push(`products: ${eventData.detected_products.join(', ')}`);
    }
    if (eventData.detected_systems && eventData.detected_systems.length > 0) {
      detectedValues.push(`systems: ${eventData.detected_systems.join(', ')}`);
    }

    const observationParts = [
      `Voice input: "${eventData.description}"`,
      `Confidence: ${eventData.confidence || 0}%`,
      detectedValues.length > 0
        ? `Detected: ${detectedValues.join(', ')}`
        : 'No specific values detected',
      validation.missingFields.length > 0
        ? `Please provide: ${validation.missingFields.join(', ')}`
        : 'All required fields detected'
    ].filter(Boolean);

    setEventObservations(observationParts.join(' | '));

    // Show success message about voice detection
    toast({
      title: 'Voice Event Detected! 🎤',
      description:
        validation.missingFields.length > 0
          ? `Detected ${
              eventData.type
            } event. Please complete the required fields: ${validation.missingFields.join(', ')}`
          : `Voice detection complete! Please verify the details before creating the event.`,
      status: 'info',
      duration: 6000,
      isClosable: true
    });
  };

  const handleDetailedCreate = async () => {
    if (!selectedTemplate) return;

    // DEBUG: Log template data for detailed create
    console.log('=== DEBUG: handleDetailedCreate ===');
    console.log('Selected template:', selectedTemplate);
    console.log('Template backend_event_type:', selectedTemplate.backend_event_type);

    setIsCreating(true);
    try {
      // For voice events, use the enhanced event type mapping
      let eventType = getTemplateEventType(selectedTemplate);
      let eventTypeFields = getTemplateEventFields(selectedTemplate);

      console.log('eventType from getTemplateEventType:', eventType);

      // Check if this is a voice template with custom mapping
      if (selectedTemplate.id.startsWith('voice-') && (selectedTemplate as any)._voiceEventType) {
        eventType = (selectedTemplate as any)._voiceEventType;
        eventTypeFields = (selectedTemplate as any)._voiceEventFields || eventTypeFields;

        console.log('Using voice event type mapping:', eventType, eventTypeFields);
      }

      // Get type-aware fields in backend format (with carbon-critical data)
      const typeAwareBackendFields = hasTypeAwareFields
        ? getFieldsForBackend(typeAwareTemplateId, typeAwareFieldValues)
        : {};

      console.log('Type-aware backend fields:', typeAwareBackendFields);

      const backendEventData = {
        companyId: currentCompany.id,
        establishmentId: parseInt(establishmentId || '0'),
        parcelId: parseInt(parcelId || '0'),
        parcels: [parseInt(parcelId || '0')],
        event_type: eventType,
        date: eventDate,
        description: eventDescription,
        performed_by: performedBy || null,
        album: { images: [] },
        // Merge template fields with type-aware fields (type-aware takes precedence)
        ...eventTypeFields,
        ...typeAwareBackendFields,
        // User observation MUST come AFTER spreads to override template defaults
        observation: eventObservations || ''
      };

      console.log('Final backend event data:', backendEventData);

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
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent
        maxH="90vh"
        display="flex"
        flexDirection="column"
        borderRadius="xl"
        overflow="hidden"
      >
        <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
          <HStack spacing={3} justify="space-between" w="full" pr={8}>
            <HStack spacing={3}>
              <Box
                p={2}
                bg="green.50"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FaSeedling} color="green.500" boxSize={5} />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                  {intl.formatMessage({ id: 'quickAdd.title' })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'quickAdd.subtitle' })}
                </Text>
              </VStack>
              <Badge colorScheme="green" variant="subtle" fontSize="xs" px={2} py={1} borderRadius="md">
                {cropType}
              </Badge>
            </HStack>
            <Tooltip
              label={intl.formatMessage({ id: 'quickAdd.helpTooltip' })}
              placement="left"
              hasArrow
            >
              <IconButton
                aria-label={intl.formatMessage({ id: 'quickAdd.learnMore' })}
                icon={<FaQuestionCircle />}
                variant="ghost"
                colorScheme="green"
                size="sm"
                onClick={() => navigate('/education?topic=quick-add')}
              />
            </Tooltip>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

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
                <Box p={4} bg="green.50" borderRadius="xl" border="1px solid" borderColor="green.200">
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
                      <Badge colorScheme="green" variant="solid" fontSize="xs" px={3} py={1} borderRadius="full">
                        {selectedTemplate.sustainabilityScore}/10
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
                          <Text>{intl.formatMessage({ id: 'quickAdd.learnMoreAboutEventTypes' })}</Text>
                        </HStack>
                      </Link>
                    </HStack>
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
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color="gray.600"
                        mb={4}
                      >
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
                      title={intl.formatMessage({ id: 'quickAdd.aiSuggestionsTitle' }, { season: getCurrentSeason(new Date().getMonth() + 1).charAt(0).toUpperCase() + getCurrentSeason(new Date().getMonth() + 1).slice(1) })}
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
                          console.log(
                            `Template ${template.id}: selected=${isSelected}, selectedTemplate=${selectedTemplate?.id}`
                          );

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
                                  <Badge
                                    colorScheme={
                                      template.carbonImpact < 0
                                        ? 'green'
                                        : template.carbonImpact > 20
                                        ? 'red'
                                        : 'orange'
                                    }
                                    size="xs"
                                  >
                                    {template.carbonImpact > 0 ? '+' : ''}
                                    {template.carbonImpact} kg CO₂
                                  </Badge>
                                  {template.id.startsWith('ai-') && (
                                    <Badge
                                      colorScheme={isSelected ? 'purple' : 'gray'}
                                      size="xs"
                                      variant={isSelected ? 'solid' : 'outline'}
                                    >
                                      {Math.round((template as any).confidence)}%
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
              {!showVoiceCapture ? (
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
                      onClick={() => setShowVoiceCapture(true)}
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
              )}

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
            boxShadow="0 -4px 12px rgba(0, 0, 0, 0.08)"
          >
            {showDetailedForm ? (
              // Detailed Form Footer
              <VStack spacing={3}>
                <HStack justify="space-between" width="100%">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold" color="gray.800" fontSize="sm">
                      {intl.formatMessage({ id: 'quickAdd.addingDetails' }, { name: selectedTemplate.name.replace('🤖 ', '').replace('⭐ ', '') })}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {intl.formatMessage({ id: 'quickAdd.completeFormDescription' })}
                    </Text>
                  </VStack>
                  <Badge colorScheme="green" variant="solid" fontSize="xs" px={2} py={1}>
                    {selectedTemplate.sustainabilityScore}/10
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
                      {intl.formatMessage({ id: 'quickAdd.readyToCreate' }, { name: selectedTemplate.name.replace('🤖 ', '') })}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {intl.formatMessage({ id: 'quickAdd.visibleToConsumers' }, { visibility: selectedTemplate.qrVisibility })}
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
                  <StandardButton
                    variant="outline"
                    onClick={handleShowDetails}
                    size="lg"
                  >
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
