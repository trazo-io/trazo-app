import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from 'store/index';
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Grid,
  GridItem,
  Icon,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Divider,
  List,
  ListItem,
  ListIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import {
  FaRocket,
  FaSeedling,
  FaLeaf,
  FaClock,
  FaChartLine,
  FaCheckCircle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaEdit,
  FaPlus,
  FaMinus,
  FaArrowRight
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';
import {
  useGetCropTemplatesQuery,
  useGetCropTemplateDetailQuery,
  useCalculateEventCarbonImpactMutation
} from 'store/api/carbonApi';
import { useStartProductionMutation, useGetCropTypesDropdownQuery } from 'store/api/companyApi';
import { useGetHistoryQuery, useUpdateProductionMutation } from 'store/api/historyApi';
import { useGetParcelQuery } from 'store/api/productApi';
import { setParcel } from 'store/features/productSlice';
import { StandardPage, StandardCard, StandardButton } from 'components/Design';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { getEventTypeMapping, getEventDataForType } from 'utils/eventTypeMapping';

// Utility function for formatting carbon values with appropriate precision
const formatCarbonValue = (value: number): string => {
  if (value < 0.01) return value.toFixed(4); // Very small values: 0.0018 -> "0.0018"
  if (value < 0.1) return value.toFixed(3); // Small values: 0.018 -> "0.018"
  if (value < 10) return value.toFixed(2); // Medium values: 2.45 -> "2.45"
  return value.toFixed(1); // Large values: 15.3 -> "15.3"
};

// Form validation schema
const productionSchema = object({
  name: string().min(1, 'Production name is required'),
  start_date: string().min(1, 'Start date is required'),
  expected_harvest: string().optional(),
  description: string().optional(),
  production_method: string().optional(),
  type: string().min(1, 'Production type is required'),
  crop_type_id: string().min(1, 'Crop type is required')
});

interface ProductionFormData {
  name: string;
  start_date: string;
  expected_harvest?: string;
  description?: string;
  production_method?: string;
  type: string;
  crop_type_id: string;
}

interface QuickStartProductionProps {
  parcelId?: string;
  parcelName?: string;
  cropType?: string;
  isEdit?: boolean;
  productionId?: string;
}

const QuickStartProduction: React.FC<QuickStartProductionProps> = ({
  parcelId: propParcelId,
  parcelName,
  cropType: propCropType,
  isEdit = false,
  productionId: propProductionId
}) => {
  const { parcelId: paramParcelId, establishmentId, productionId: paramProductionId } = useParams();
  const parcelId = propParcelId || paramParcelId;
  const productionId = propProductionId || paramProductionId;

  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const {
    isOpen: isTemplateOpen,
    onOpen: onTemplateOpen,
    onClose: onTemplateClose
  } = useDisclosure();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customEvents, setCustomEvents] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCropTypeId, setSelectedCropTypeId] = useState<string | null>(null);

  // Get parcel data from Redux store
  const currentParcel = useSelector((state: RootState) => state.product?.currentParcel);
  const currentCompany = useSelector((state: RootState) => state.company?.currentCompany);

  // Fetch parcel data directly if not in Redux
  const { data: parcelData } = useGetParcelQuery(
    { parcelId, establishmentId, companyId: currentCompany?.id },
    {
      skip: !parcelId || !establishmentId || !currentCompany || !!currentParcel
    }
  );

  // Update Redux with fetched parcel data
  useEffect(() => {
    if (parcelData && !currentParcel) {
      dispatch(setParcel(parcelData));
    }
  }, [parcelData, currentParcel, dispatch]);

  // Update area input when parcel data becomes available
  useEffect(() => {
    if (currentParcel?.area) {
      setAreaInput(currentParcel.area);
    }
  }, [currentParcel?.area]);

  // Debug logging (remove in production)
  useEffect(() => {
    console.log('QuickStartProduction - Current parcel:', currentParcel);
    console.log('QuickStartProduction - Fetched parcel data:', parcelData);
  }, [currentParcel, parcelData]);

  // ✅ NEW: State for USDA-based carbon calculations
  // IMPORTANT: Area from Redux parcel data, fallback to user input or 10 hectares
  const [areaInput, setAreaInput] = useState<number>(10);
  const [carbonPreviews, setCarbonPreviews] = useState<Record<string, any>>({});

  // API hooks - Dynamic template fetching based on crop type
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetCropTemplatesQuery(
    selectedCropTypeId ? { crop_type: selectedCropTypeId } : undefined
  );
  const { data: templateDetail, isLoading: isLoadingDetail } = useGetCropTemplateDetailQuery(
    selectedTemplateId!,
    { skip: !selectedTemplateId }
  );
  const [startProduction] = useStartProductionMutation();
  const [updateProduction, { isLoading: isUpdating }] = useUpdateProductionMutation();

  // Fetch production data for edit mode
  const {
    data: productionData,
    isLoading: isLoadingProduction,
    isError: isProductionError
  } = useGetHistoryQuery(productionId || '', {
    skip: !isEdit || !productionId
  });

  const {
    data: cropTypesData,
    error: cropTypesError,
    isLoading: isLoadingCropTypes
  } = useGetCropTypesDropdownQuery();

  // ✅ NEW: API hook for real-time USDA carbon calculations
  const [calculateCarbonPreview] = useCalculateEventCarbonImpactMutation();

  // Debug logging for crop types
  React.useEffect(() => {
    console.log('🌾 Crop Types Debug:', {
      data: cropTypesData,
      error: cropTypesError,
      isLoading: isLoadingCropTypes
    });
  }, [cropTypesData, cropTypesError, isLoadingCropTypes]);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      name: `Production ${new Date().getFullYear()}`,
      start_date: new Date().toISOString().split('T')[0],
      type: 'OR',
      production_method: 'conventional',
      crop_type_id: ''
    }
  });

  // Populate form with existing production data when in edit mode
  useEffect(() => {
    if (isEdit && productionData && cropTypesData) {
      console.log('QuickStartProduction - Populating form with production data:', productionData);
      console.log('QuickStartProduction - Available crop types:', cropTypesData);

      // Find matching crop type - check multiple possible data structures
      // productionData.crop_type could be: number ID, string ID, object with id/name, or the product object
      let matchingCropType = null;

      // 1. Try matching by crop_type ID (if it's a number or string ID)
      const cropTypeId = productionData.crop_type;
      if (cropTypeId) {
        matchingCropType = cropTypesData.find(
          (ct) => ct.id === cropTypeId || ct.id.toString() === cropTypeId.toString()
        );
      }

      // 2. Try matching by crop_type object (if it has an id property)
      if (!matchingCropType && typeof cropTypeId === 'object' && cropTypeId?.id) {
        matchingCropType = cropTypesData.find(
          (ct) => ct.id === cropTypeId.id || ct.id.toString() === cropTypeId.id.toString()
        );
      }

      // 3. Try matching by product name or crop_type name
      if (!matchingCropType) {
        const productName = productionData.product?.name || productionData.crop_type?.name || '';
        if (productName) {
          matchingCropType = cropTypesData.find(
            (ct) => ct.name.toLowerCase() === productName.toLowerCase()
          );
        }
      }

      // 4. Try fuzzy matching by production name (e.g., "Avocados 2025" -> "Avocado")
      if (!matchingCropType && productionData.name) {
        const prodNameLower = productionData.name.toLowerCase();
        matchingCropType = cropTypesData.find(
          (ct) =>
            prodNameLower.includes(ct.name.toLowerCase()) ||
            ct.name.toLowerCase().includes(prodNameLower.split(' ')[0])
        );
      }

      console.log('QuickStartProduction - Matched crop type:', matchingCropType);

      // Get production method from extra_data if available
      const extraData = productionData.extra_data || {};
      const productionMethod = extraData.production_method || 'conventional';

      // Format dates properly
      const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      const cropTypeIdValue = matchingCropType?.id.toString() || '';

      // Handle expected harvest - backend may use end_date, finish_date, or expected_harvest
      const expectedHarvestDate =
        productionData.expected_harvest ||
        productionData.end_date ||
        productionData.finish_date ||
        extraData?.end_date ||
        '';

      reset({
        name: productionData.name || `Production ${new Date().getFullYear()}`,
        start_date: formatDate(productionData.start_date) || new Date().toISOString().split('T')[0],
        expected_harvest: formatDate(expectedHarvestDate),
        description: productionData.description || '',
        production_method: productionMethod,
        type: productionData.type || 'OR',
        crop_type_id: cropTypeIdValue
      });

      // Update selectedCropTypeId to trigger template loading
      if (cropTypeIdValue) {
        setSelectedCropTypeId(cropTypeIdValue);
      }
    }
  }, [isEdit, productionData, cropTypesData, reset]);

  // Auto-select template based on crop type
  useEffect(() => {
    if (propCropType && templatesData?.templates && cropTypesData) {
      // First find the crop type by slug to get its category
      const matchingCropType = cropTypesData.find(
        (cropType) => cropType.slug.toLowerCase() === propCropType.toLowerCase()
      );

      if (matchingCropType) {
        // Then find template by category
        const matchingTemplate = templatesData.templates.find(
          (template) => template.crop_type.toLowerCase() === matchingCropType.category.toLowerCase()
        );
        if (matchingTemplate && matchingTemplate.template_id) {
          setSelectedTemplateId(matchingTemplate.template_id.toString());
          setSelectedTemplate(matchingTemplate);
        }
      }
    }
  }, [propCropType, templatesData, cropTypesData]);

  // Auto-select crop type when propCropType is provided
  useEffect(() => {
    if (propCropType && cropTypesData) {
      const matchingCropType = cropTypesData.find(
        (cropType) => cropType.slug.toLowerCase() === propCropType.toLowerCase()
      );
      if (matchingCropType) {
        setSelectedCropTypeId(matchingCropType.id.toString());
        setValue('crop_type_id', matchingCropType.id.toString());
      }
    }
  }, [propCropType, cropTypesData, setValue]);

  // Templates are now filtered by the API based on crop type
  const filteredTemplates = templatesData?.templates || [];

  // Auto-select template when crop type changes
  useEffect(() => {
    if (selectedCropTypeId && filteredTemplates.length > 0) {
      const firstTemplate = filteredTemplates[0];
      if (firstTemplate.template_id) {
        setSelectedTemplateId(firstTemplate.template_id.toString());
        setSelectedTemplate(firstTemplate);
      }
    } else if (!selectedCropTypeId) {
      setSelectedTemplate(null);
      setSelectedTemplateId(null);
      setCustomEvents([]); // Clear events when no crop type is selected
    }
  }, [selectedCropTypeId, filteredTemplates]);

  // Clear and reload templates when crop type selection changes from dropdown
  const watchedCropTypeId = watch('crop_type_id');
  useEffect(() => {
    if (watchedCropTypeId && watchedCropTypeId !== selectedCropTypeId) {
      setSelectedCropTypeId(watchedCropTypeId);
      // Clear current template selection to force reload
      setSelectedTemplate(null);
      setSelectedTemplateId(null);
      setCustomEvents([]);
      // RTK Query will automatically refetch when selectedCropTypeId changes
    }
  }, [watchedCropTypeId, selectedCropTypeId]);

  // Update area input when parcel data changes
  useEffect(() => {
    if (currentParcel?.area) {
      setAreaInput(currentParcel.area);
    }
  }, [currentParcel?.area]);

  // Auto-fill form when template is selected
  useEffect(() => {
    if (templateDetail) {
      const currentYear = new Date().getFullYear();
      setValue('name', generateProductionName(templateDetail.name, currentYear));
      setValue(
        'description',
        `${templateDetail.description} This production includes ${
          templateDetail.events?.length || 4
        } pre-configured events for optimal carbon tracking.`
      );

      // Set custom events from template
      if (templateDetail.events) {
        setCustomEvents(
          templateDetail.events.map((event, index) => ({
            ...event,
            // Spread backend_event_fields to make fields like pest_species available directly
            ...(event.backend_event_fields || {}),
            id: `template-${index}`,
            scheduled_date: calculateEventDate(event.timing),
            enabled: true
          }))
        );
      }
    }
  }, [templateDetail, setValue]);

  // ✅ NEW: Calculate carbon previews when events change
  useEffect(() => {
    if (customEvents.length > 0) {
      customEvents.forEach((event) => {
        if (!event.excludeFromCarbonCalculation) {
          calculateCarbonPreviewForEvent(event);
        }
      });
    }
  }, [customEvents, areaInput]);

  const calculateEventDate = (timing: string) => {
    const startDate = new Date(watch('start_date') || new Date());

    // Parse timing like "December - February", "March - April", etc.
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11
    };

    const timingLower = timing.toLowerCase();
    const firstMonth = Object.keys(monthMap).find((month) => timingLower.includes(month));

    if (firstMonth) {
      const eventDate = new Date(startDate.getFullYear(), monthMap[firstMonth], 15);
      return eventDate.toISOString().split('T')[0];
    }

    // Default to 30 days from start
    const defaultDate = new Date(startDate);
    defaultDate.setDate(defaultDate.getDate() + 30);
    return defaultDate.toISOString().split('T')[0];
  };

  // Helper function to generate production names within 30-character limit
  const generateProductionName = (templateName: string, year: number): string => {
    // Create shorter versions of template names
    const nameMap: Record<string, string> = {
      'Citrus (Oranges)': 'Citrus',
      Almonds: 'Almonds',
      Soybeans: 'Soybeans',
      'Corn (Field)': 'Corn'
    };

    const shortName = nameMap[templateName] || templateName.split(' ')[0];
    const yearStr = year.toString();

    // Format: "Citrus 2025" (max 30 chars)
    const productionName = `${shortName} ${yearStr}`;

    // Ensure it's within 30 characters
    return productionName.length <= 30 ? productionName : productionName.substring(0, 30);
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    if (template.template_id) {
      setSelectedTemplateId(template.template_id.toString()); // Convert to string and check existence
    }
    onTemplateClose();

    toast({
      title: 'Template Selected! 🚀',
      description: `${template.name} template will accelerate your production setup.`,
      status: 'success',
      duration: 4000,
      isClosable: true
    });
  };

  const handleEventToggle = (eventId: string) => {
    setCustomEvents((events) =>
      events.map((event) => (event.id === eventId ? { ...event, enabled: !event.enabled } : event))
    );
  };

  const handleToggleAll = () => {
    const allSelected = customEvents.every((event) => event.enabled);
    setCustomEvents((events) => events.map((event) => ({ ...event, enabled: !allSelected })));
  };

  const handleEventDateChange = (eventId: string, newDate: string) => {
    setCustomEvents((events) =>
      events.map((event) => (event.id === eventId ? { ...event, scheduled_date: newDate } : event))
    );
  };

  const onSubmit = async (data: ProductionFormData) => {
    try {
      setIsCreating(true);

      // Find the selected crop type to get its slug for the backend
      const selectedCropType = cropTypesData?.find((ct) => ct.id.toString() === data.crop_type_id);

      // Ensure we have a valid crop type ID
      if (!data.crop_type_id) {
        toast({
          title: 'Missing Crop Type',
          description: `Please select a crop type before ${
            isEdit ? 'updating' : 'creating'
          } the production.`,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        return;
      }

      if (isEdit && productionId) {
        // Update existing production
        const updatePayload = {
          historyId: productionId,
          name: data.name,
          start_date: data.start_date,
          expected_harvest: data.expected_harvest,
          description: data.description || '',
          production_method: data.production_method,
          type: data.type,
          crop_type: parseInt(data.crop_type_id)
        };

        console.log('QuickStartProduction - Updating production with payload:', updatePayload);

        await updateProduction(updatePayload).unwrap();

        toast({
          title: 'Production Updated Successfully! ✅',
          description: `${data.name} has been updated.`,
          status: 'success',
          duration: 5000,
          isClosable: true
        });
      } else {
        // Create new production
        const productionPayload = {
          name: data.name,
          parcel_id: parseInt(parcelId!),
          crop_type: parseInt(data.crop_type_id), // Send the numeric ID, not the slug
          start_date: data.start_date,
          expected_harvest: data.expected_harvest,
          description: data.description,
          production_method: data.production_method,
          type: data.type,
          template_id: selectedTemplate?.template_id,
          template_events: customEvents.filter((event) => event.enabled)
        };

        await startProduction(productionPayload).unwrap();

        toast({
          title: 'Production Started Successfully! 🎉',
          description: `${data.name} has been created with ${
            customEvents.filter((e) => e.enabled).length
          } pre-configured events.`,
          status: 'success',
          duration: 6000,
          isClosable: true
        });
      }

      // Navigate to production dashboard
      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`);
    } catch (error: any) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} production:`, error);

      // Parse error — backend uses {"error": "msg"} format, but also handle DRF {"field": ["msgs"]}
      let description = `Failed to ${isEdit ? 'update' : 'create'} production. Please try again.`;
      if (error?.data) {
        if (typeof error.data.error === 'string') {
          description = error.data.error;
        } else if (typeof error.data === 'object') {
          const fieldErrors = Object.entries(error.data)
            .filter(([, msgs]) => Array.isArray(msgs))
            .map(([field, msgs]) => {
              const label = field.replace(/_/g, ' ');
              return `${label}: ${(msgs as string[]).join(', ')}`;
            });
          if (fieldErrors.length > 0) {
            description = fieldErrors.join(' | ');
          }
        }
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title: `Error ${isEdit ? 'Updating' : 'Creating'} Production`,
        description,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getCropIcon = (cropType: string) => {
    const iconMap: Record<string, any> = {
      citrus: FaLeaf,
      almonds: FaSeedling,
      soybeans: FaSeedling,
      corn: FaSeedling,
      wheat: FaSeedling,
      cotton: FaLeaf
    };
    return iconMap[cropType?.toLowerCase()] || FaSeedling;
  };

  // ✅ NEW: Real-time carbon calculation function using USDA emission factors
  const calculateCarbonPreviewForEvent = async (event: any) => {
    if (event.excludeFromCarbonCalculation) {
      return null; // No carbon calculation for General Events
    }

    try {
      // Map event names to proper backend event types (covers all 29 backend types)
      const getEventType = (eventName: string) => {
        const name = eventName?.toLowerCase() || '';

        // Chemical events (fertilizers, pesticides, herbicides, fungicides)
        if (
          name.includes('fertiliz') ||
          name.includes('nutrient') ||
          name.includes('nitrogen') ||
          name.includes('phosphor') ||
          name.includes('potassium')
        )
          return 'chemical';
        if (
          name.includes('spray') ||
          name.includes('pesticide') ||
          name.includes('insecticide') ||
          name.includes('pest control')
        )
          return 'chemical';
        if (name.includes('herbicide') || name.includes('weed') || name.includes('glyphosate'))
          return 'chemical';
        if (
          name.includes('fungicide') ||
          name.includes('fungus') ||
          name.includes('disease control')
        )
          return 'chemical';

        // Equipment events (machinery, fuel consumption, maintenance)
        if (
          name.includes('equipment') ||
          name.includes('machinery') ||
          name.includes('tractor') ||
          name.includes('harvester')
        )
          return 'equipment';
        if (name.includes('fuel') || name.includes('diesel') || name.includes('gasoline'))
          return 'equipment';
        if (
          name.includes('maintenance') ||
          name.includes('repair') ||
          name.includes('service') ||
          name.includes('calibration')
        )
          return 'equipment';
        if (
          name.includes('preparation') ||
          name.includes('tillage') ||
          name.includes('cultivation') ||
          name.includes('plowing')
        )
          return 'equipment';
        if (
          name.includes('field preparation') ||
          name.includes('planting/seeding') ||
          name.includes('seeding equipment')
        )
          return 'equipment';

        // Weather events (frost, drought, storms, temperature monitoring)
        if (
          name.includes('weather') ||
          name.includes('climate') ||
          name.includes('temperature') ||
          name.includes('monitoring weather')
        )
          return 'weather';
        if (name.includes('frost') || name.includes('freeze') || name.includes('cold protection'))
          return 'weather';
        if (
          name.includes('drought') ||
          name.includes('water stress') ||
          name.includes('irrigation need')
        )
          return 'weather';
        if (
          name.includes('storm') ||
          name.includes('wind') ||
          name.includes('hail') ||
          name.includes('rain')
        )
          return 'weather';

        // Soil events (testing, amendments, management)
        if (
          name.includes('soil') &&
          (name.includes('test') || name.includes('analysis') || name.includes('ph'))
        )
          return 'soil';
        if (
          name.includes('soil amendment') ||
          name.includes('lime') ||
          name.includes('compost') ||
          name.includes('organic matter')
        )
          return 'soil';
        if (
          name.includes('soil preparation') ||
          name.includes('soil management') ||
          name.includes('tillage')
        )
          return 'soil';
        if (
          name.includes('ph management') ||
          name.includes('ph adjustment') ||
          name.includes('ph control')
        )
          return 'soil';

        // Pest management events (scouting, monitoring, biological control)
        if (
          name.includes('scout') ||
          name.includes('monitoring') ||
          name.includes('inspection') ||
          name.includes('pest monitoring')
        )
          return 'pest';
        if (
          name.includes('biological control') ||
          name.includes('beneficial') ||
          name.includes('predator')
        )
          return 'pest';
        if (name.includes('trap') || name.includes('pheromone') || name.includes('ipm'))
          return 'pest';

        // Business events (certification, audit, training)
        if (
          name.includes('certif') ||
          name.includes('organic') ||
          name.includes('audit') ||
          name.includes('compliance')
        )
          return 'business';
        if (name.includes('training') || name.includes('education') || name.includes('workshop'))
          return 'business';
        if (name.includes('record') || name.includes('documentation') || name.includes('reporting'))
          return 'business';

        // Production events (biological/manual operations) - must be after more specific checks
        if (
          name.includes('irrigation') ||
          name.includes('watering') ||
          name.includes('water application')
        )
          return 'production';
        if (name.includes('harvest') || name.includes('picking') || name.includes('collection'))
          return 'production';
        if (name.includes('planting') && !name.includes('equipment') && !name.includes('seeding'))
          return 'production';
        if (name.includes('pruning') || name.includes('trimming') || name.includes('cutting back'))
          return 'production';
        if (name.includes('bloom') || name.includes('flower') || name.includes('pollination'))
          return 'production';
        if (
          name.includes('thinning') ||
          name.includes('selective removal') ||
          name.includes('crop management')
        )
          return 'production';

        return 'production'; // Default to production for agricultural events
      };

      const eventType = getEventType(event.name);

      // Map event type to proper sub-type (covers all 29 backend sub-types)
      const getEventSubType = (eventType: string, eventName: string) => {
        const name = eventName?.toLowerCase() || '';

        if (eventType === 'chemical') {
          if (
            name.includes('fertiliz') ||
            name.includes('nutrient') ||
            name.includes('nitrogen') ||
            name.includes('phosphor')
          )
            return 'FE'; // Fertilizer
          if (
            name.includes('pesticide') ||
            name.includes('insecticide') ||
            name.includes('pest control')
          )
            return 'PE'; // Pesticide
          if (name.includes('herbicide') || name.includes('weed') || name.includes('glyphosate'))
            return 'HE'; // Herbicide
          if (name.includes('fungicide') || name.includes('fungus') || name.includes('disease'))
            return 'FU'; // Fungicide
          return 'FE'; // Default to fertilizer for chemical events
        }

        if (eventType === 'production') {
          if (name.includes('irrigation') || name.includes('watering')) return 'IR'; // Irrigation
          if (name.includes('harvest') || name.includes('picking')) return 'HA'; // Harvest
          if (name.includes('plant') && !name.includes('equipment')) return 'PL'; // Planting
          if (name.includes('pruning') || name.includes('trimming')) return 'PR'; // Pruning
          if (name.includes('thinning') || name.includes('selective removal')) return 'TH'; // Thinning
          if (name.includes('bloom') || name.includes('flower') || name.includes('pollination'))
            return 'BL'; // Bloom Support
          return 'GE'; // Default to general for production events
        }

        if (eventType === 'equipment') {
          if (name.includes('fuel') || name.includes('diesel') || name.includes('gasoline'))
            return 'FC'; // Fuel Consumption
          if (name.includes('maintenance') || name.includes('service')) return 'MN'; // Maintenance
          if (name.includes('repair') || name.includes('fix')) return 'RE'; // Repair
          if (name.includes('calibration') || name.includes('adjustment')) return 'CA'; // Calibration
          if (name.includes('breakdown') || name.includes('failure')) return 'BR'; // Breakdown
          if (name.includes('inspection') || name.includes('check')) return 'IN'; // Inspection
          return 'FC'; // Default to fuel consumption for equipment events
        }

        if (eventType === 'weather') {
          if (name.includes('frost') || name.includes('freeze')) return 'FR'; // Frost Protection
          if (name.includes('drought') || name.includes('water stress')) return 'DR'; // Drought Management
          if (name.includes('storm') || name.includes('wind') || name.includes('hail')) return 'ST'; // Storm Impact
          if (name.includes('temperature') || name.includes('monitoring')) return 'TM'; // Temperature Monitoring
          if (name.includes('humidity') || name.includes('moisture')) return 'HU'; // Humidity Tracking
          if (name.includes('precipitation') || name.includes('rain')) return 'PR'; // Precipitation Tracking
          if (name.includes('heat') || name.includes('cooling')) return 'HE'; // Heat Management
          if (name.includes('microclimate') || name.includes('local weather')) return 'MC'; // Microclimate Monitoring
          return 'TM'; // Default to temperature monitoring
        }

        if (eventType === 'soil') {
          if (name.includes('test') || name.includes('analysis')) return 'ST'; // Soil Testing
          if (name.includes('amendment') || name.includes('lime') || name.includes('compost'))
            return 'SA'; // Soil Amendment
          if (name.includes('ph') || name.includes('acidity') || name.includes('alkalinity'))
            return 'PH'; // pH Management
          if (name.includes('compaction') || name.includes('aeration')) return 'CO'; // Compaction Management
          if (name.includes('erosion') || name.includes('conservation')) return 'ER'; // Erosion Control
          if (name.includes('organic matter') || name.includes('carbon')) return 'OM'; // Organic Matter
          return 'ST'; // Default to soil testing
        }

        if (eventType === 'pest') {
          if (name.includes('scout') || name.includes('monitoring')) return 'SC'; // Scouting
          if (name.includes('biological') || name.includes('beneficial')) return 'BC'; // Biological Control
          if (name.includes('trap') || name.includes('pheromone')) return 'TR'; // Trap Monitoring
          if (name.includes('threshold') || name.includes('economic')) return 'TH'; // Threshold Assessment
          if (name.includes('resistance') || name.includes('management')) return 'RM'; // Resistance Management
          if (name.includes('integrated') || name.includes('ipm')) return 'IP'; // Integrated Pest Management
          return 'SC'; // Default to scouting
        }

        if (eventType === 'business') {
          if (name.includes('certif') || name.includes('organic')) return 'CE'; // Certification
          if (name.includes('audit') || name.includes('compliance')) return 'AU'; // Audit
          if (name.includes('training') || name.includes('education')) return 'TR'; // Training
          return 'CE'; // Default to certification
        }

        return 'GE'; // General fallback
      };

      const eventSubType = getEventSubType(eventType, event.name);

      const response = await calculateCarbonPreview({
        event_type: eventType,
        event_data: {
          type: eventSubType,
          cropType: selectedCropTypeId || propCropType || 'general',
          applicationRate: event.application_rate || 200,
          area_covered: areaInput,
          area_unit: 'ha',
          unit: event.unit || 'kg/ha',
          name: event.name,
          description: event.description,
          // Add chemical-specific data for fertilization
          ...(eventType === 'chemical' && {
            concentration: '10-10-10', // NPK ratio
            volume: '100', // liters
            volume_unit: 'liters',
            way_of_application: 'broadcast',
            commercial_name: event.name || 'General Fertilizer'
          }),
          // Add equipment-specific data for fuel consumption
          ...(eventType === 'equipment' && {
            fuel_amount: 10, // Default fuel consumption in liters
            fuel_type: 'diesel',
            equipment_type: 'tractor',
            hours_operated: 2,
            efficiency: 'normal'
          }),
          // Add weather-specific data
          ...(eventType === 'weather' && {
            temperature: 20, // Default temperature in Celsius
            humidity: 60, // Default humidity percentage
            wind_speed: 5, // Default wind speed in m/s
            precipitation: 0, // Default precipitation in mm
            monitoring_duration: 24 // Default monitoring duration in hours
          }),
          // Add soil-specific data
          ...(eventType === 'soil' && {
            soil_ph: 7.0, // Default neutral pH
            organic_matter: 3.5, // Default organic matter percentage
            nitrogen_level: 20, // Default nitrogen level in ppm
            phosphorus_level: 15, // Default phosphorus level in ppm
            potassium_level: 150, // Default potassium level in ppm
            sample_depth: 20 // Default sampling depth in cm
          }),
          // Add pest-specific data
          ...(eventType === 'pest' && {
            pest_type: 'general', // Default pest type
            severity_level: 'low', // Default severity
            affected_area: 10, // Default affected area percentage
            treatment_method: 'monitoring', // Default treatment method
            beneficial_insects: true, // Default beneficial presence
            economic_threshold: 'below' // Default threshold status
          }),
          // Add business-specific data
          ...(eventType === 'business' && {
            certification_type: 'organic', // Default certification
            compliance_status: 'compliant', // Default compliance
            training_hours: 4, // Default training duration
            documentation_level: 'complete', // Default documentation
            audit_score: 85, // Default audit score
            cost_impact: 100 // Default cost in USD
          })
        }
      }).unwrap();

      const preview = {
        estimated_carbon: response.co2e || 0, // Backend returns co2e
        calculation_source: response.calculation_method || 'USDA Agricultural Research Service',
        area_hectares: areaInput,
        application_rate: event.application_rate || 200,
        emission_factor: response.emission_factor || 0,
        confidence_level: response.efficiency_score || 0.8,
        usda_verified: response.usda_verified || false
      };

      setCarbonPreviews((prev) => ({
        ...prev,
        [event.id]: preview
      }));

      return preview;
    } catch (error) {
      console.error(`Error calculating carbon preview for ${event.id}:`, error);
      return null;
    }
  };

  // Show loading state for edit mode or template loading
  if (isLoadingTemplates || (isEdit && isLoadingProduction)) {
    return (
      <StandardPage title={isEdit ? 'Edit Production' : 'Quick Start Production'} showBackButton>
        <VStack py={8}>
          <Spinner size="xl" color="green.500" />
          <Text>{isEdit ? 'Loading production data...' : 'Loading smart templates...'}</Text>
        </VStack>
      </StandardPage>
    );
  }

  // Show error state for edit mode
  if (isEdit && isProductionError) {
    return (
      <StandardPage title="Edit Production" showBackButton>
        <VStack py={8} spacing={4}>
          <Text color="red.500" fontWeight="bold">
            Error loading production data
          </Text>
          <Text color="gray.600">Production ID: {productionId}</Text>
          <Button
            colorScheme="green"
            onClick={() =>
              navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
            }
          >
            Go Back
          </Button>
        </VStack>
      </StandardPage>
    );
  }

  return (
    <WriteAccessGuard>
    <StandardPage
      title={isEdit ? 'Edit Production' : 'Quick Start Production'}
      description={
        isEdit
          ? `Update production details${productionData?.name ? ` for ${productionData.name}` : ''}`
          : `Start a new production cycle${
              parcelName ? ` for ${parcelName}` : ''
            } with smart templates`
      }
      showBackButton
      onBack={() =>
        navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={8} align="stretch">
          {/* Template Selection Section - Only show in create mode */}
          {!isEdit && (
            <StandardCard
              title="Smart Setup Templates"
              subtitle="Choose a pre-configured template to reduce setup time by 37+ minutes"
            >
              <VStack spacing={6} align="stretch">
                {/* Current Template Display */}
                {selectedTemplate ? (
                  <Box
                    p={4}
                    bg="green.50"
                    borderRadius="lg"
                    borderWidth="2px"
                    borderColor="green.200"
                  >
                    <HStack spacing={3}>
                      <Icon
                        as={getCropIcon(selectedTemplate.crop_type)}
                        color="green.500"
                        boxSize={6}
                      />
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontSize="lg" fontWeight="bold" color="green.700">
                            {selectedTemplate.name} Template Selected
                          </Text>
                          <Badge colorScheme="green" variant="solid">
                            Smart Setup
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="green.600">
                          ⏱️ Setup time reduced by 37 minutes • 📅{' '}
                          {selectedTemplate.events_count || customEvents.length} events configured •
                          💰 USDA-based carbon calculation will be applied
                        </Text>
                        <HStack spacing={2} mt={1}>
                          <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                            Science-Based
                          </Badge>
                          <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                            Transparency Ready
                          </Badge>
                        </HStack>
                      </VStack>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="green"
                        onClick={onTemplateOpen}
                      >
                        Change Template
                      </Button>
                    </HStack>
                  </Box>
                ) : (
                  <Box
                    p={4}
                    bg="blue.50"
                    borderRadius="lg"
                    borderWidth="2px"
                    borderColor="blue.200"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{ bg: 'blue.100', borderColor: 'blue.300' }}
                    onClick={selectedCropTypeId ? onTemplateOpen : undefined}
                    opacity={selectedCropTypeId ? 1 : 0.6}
                  >
                    <HStack spacing={3}>
                      <Icon as={FaRocket} color="blue.500" boxSize={6} />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontSize="lg" fontWeight="bold" color="blue.700">
                          {selectedCropTypeId
                            ? 'Select a Smart Template'
                            : 'Select Crop Type First'}
                        </Text>
                        <Text fontSize="sm" color="blue.600">
                          {selectedCropTypeId
                            ? `🚀 ${filteredTemplates.length} template${
                                filteredTemplates.length !== 1 ? 's' : ''
                              } available for your crop type`
                            : '🌱 Choose your crop type above to see available templates'}
                        </Text>
                        <HStack spacing={2} mt={1}>
                          {selectedCropTypeId ? (
                            <>
                              <Badge colorScheme="green" variant="subtle" fontSize="xs">
                                {filteredTemplates.length} Templates
                              </Badge>
                              <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                                Farm Documented
                              </Badge>
                              <Badge colorScheme="orange" variant="subtle" fontSize="xs">
                                QR Ready
                              </Badge>
                            </>
                          ) : (
                            <Badge colorScheme="gray" variant="subtle" fontSize="xs">
                              Select crop type to continue
                            </Badge>
                          )}
                        </HStack>
                      </VStack>
                      {selectedCropTypeId && <Icon as={FaArrowRight} color="blue.400" />}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </StandardCard>
          )}

          {/* Production Details Form */}
          <StandardCard title="Production Details" subtitle="Configure your production cycle">
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
              {/* Crop Type Selection - First field */}
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <FormControl isRequired={!isEdit} isInvalid={!!errors.crop_type_id}>
                  <FormLabel>
                    Crop Type
                    {isEdit && (
                      <Badge ml={2} colorScheme="gray" variant="subtle">
                        Read-only
                      </Badge>
                    )}
                  </FormLabel>
                  {/* Debug Info - only in create mode */}
                  {!isEdit && isLoadingCropTypes && (
                    <Text fontSize="sm" color="blue.500" mb={2}>
                      Loading crop types...
                    </Text>
                  )}
                  {!isEdit && cropTypesError && (
                    <Text fontSize="sm" color="red.500" mb={2}>
                      Error loading crop types: {JSON.stringify(cropTypesError)}
                    </Text>
                  )}
                  {!isEdit &&
                    !isLoadingCropTypes &&
                    !cropTypesError &&
                    (!cropTypesData || cropTypesData.length === 0) && (
                      <Text fontSize="sm" color="orange.500" mb={2}>
                        No crop types available. Expected 6 crop types from database.
                      </Text>
                    )}
                  <Controller
                    name="crop_type_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        size="lg"
                        placeholder="Select your crop type..."
                        isDisabled={isEdit}
                        bg={isEdit ? 'gray.100' : 'white'}
                        cursor={isEdit ? 'not-allowed' : 'pointer'}
                        onChange={(e) => {
                          if (!isEdit) {
                            field.onChange(e);
                            setSelectedCropTypeId(e.target.value);
                          }
                        }}
                      >
                        {cropTypesData?.map((cropType) => (
                          <option key={cropType.id} value={cropType.id.toString()}>
                            {cropType.name} - {cropType.category.replace('_', ' ')}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                  {isEdit && (
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      Crop type cannot be changed after production is created. To change crop type,
                      create a new production.
                    </Text>
                  )}
                  {errors.crop_type_id && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.crop_type_id.message}
                    </Text>
                  )}
                  {selectedCropTypeId && cropTypesData && (
                    <Box mt={2} p={3} bg="green.50" borderRadius="md">
                      {(() => {
                        const selectedCropType = cropTypesData.find(
                          (ct) => ct.id.toString() === selectedCropTypeId
                        );
                        return selectedCropType ? (
                          <VStack align="start" spacing={1}>
                            <Text fontSize="sm" fontWeight="medium" color="green.700">
                              {selectedCropType.description}
                            </Text>
                            <HStack spacing={4} fontSize="xs" color="green.600">
                              <Text>
                                <Text as="span" fontWeight="medium">
                                  Emissions:
                                </Text>{' '}
                                {selectedCropType.emissions_per_hectare} kg CO2e/ha
                              </Text>
                              {/* Carbon Credit Potential removed - transparency-first approach */}
                            </HStack>
                          </VStack>
                        ) : null;
                      })()}
                    </Box>
                  )}
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl isRequired isInvalid={!!errors.name}>
                  <FormLabel>Production Name</FormLabel>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} placeholder="e.g., Spring 2024 Orange Harvest" size="lg" />
                    )}
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl isRequired isInvalid={!!errors.start_date}>
                  <FormLabel>Start Date</FormLabel>
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => <Input {...field} type="date" size="lg" />}
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl>
                  <FormLabel>Expected Harvest Date</FormLabel>
                  <Controller
                    name="expected_harvest"
                    control={control}
                    render={({ field }) => <Input {...field} type="date" size="lg" />}
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Production Type</FormLabel>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} size="lg">
                        <option value="OR">Orchard (Perennial Crops)</option>
                        <option value="GA">Garden (Annual Crops)</option>
                      </Select>
                    )}
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl>
                  <FormLabel>Production Method</FormLabel>
                  <Controller
                    name="production_method"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} size="lg">
                        <option value="conventional">Conventional</option>
                        <option value="organic">Organic</option>
                        <option value="regenerative">Regenerative</option>
                        <option value="sustainable">Sustainable</option>
                      </Select>
                    )}
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl>
                  <FormLabel>
                    Parcel Area (hectares)
                    {currentParcel?.area && (
                      <Badge ml={2} colorScheme="green" variant="subtle">
                        Auto-loaded
                      </Badge>
                    )}
                  </FormLabel>
                  {currentParcel?.area ? (
                    // Read-only display when parcel data is available
                    <Input
                      value={`${areaInput} hectares`}
                      isReadOnly
                      bg="gray.50"
                      size="lg"
                      cursor="not-allowed"
                    />
                  ) : (
                    // Editable input only when no parcel data available
                    <NumberInput
                      value={areaInput}
                      onChange={(valueString) => setAreaInput(Number(valueString) || 10)}
                      min={0.1}
                      max={10000}
                      step={0.1}
                      size="lg"
                    >
                      <NumberInputField placeholder="Enter parcel area in hectares" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {currentParcel?.area
                      ? `Area from parcel data (read-only). To change, edit the parcel settings.`
                      : 'Used for carbon footprint calculations. Default: 10 hectares'}
                  </Text>
                </FormControl>
              </GridItem>

              {/* NOTE: Irrigation Method removed - already captured at establishment level */}

              <GridItem colSpan={{ base: 1, md: 2 }}>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Describe this production cycle, goals, and special considerations..."
                        rows={3}
                        size="lg"
                      />
                    )}
                  />
                </FormControl>
              </GridItem>
            </Grid>
          </StandardCard>

          {/* Pre-configured Events - Only show in create mode */}
          {!isEdit && customEvents.length > 0 && (
            <StandardCard
              title="Pre-configured Events"
              subtitle="Review and customize the events from your selected template"
            >
              {/* Master Switch Controls */}
              <HStack justify="space-between" mb={4} p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" color="gray.600">
                  {customEvents.filter((event) => event.enabled).length} of {customEvents.length}{' '}
                  events selected
                </Text>
                <HStack spacing={3}>
                  <Switch
                    isChecked={customEvents.every((event) => event.enabled)}
                    onChange={handleToggleAll}
                    colorScheme="green"
                    size="md"
                  />
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    {customEvents.every((event) => event.enabled) ? 'Unselect All' : 'Select All'}
                  </Text>
                </HStack>
              </HStack>
              <VStack spacing={4} align="stretch">
                {customEvents.map((event) => (
                  <Box
                    key={event.id}
                    p={4}
                    bg={event.enabled ? 'gray.50' : 'gray.100'}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={event.enabled ? 'gray.200' : 'gray.300'}
                    opacity={event.enabled ? 1 : 0.6}
                  >
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <Switch
                          isChecked={event.enabled}
                          onChange={() => handleEventToggle(event.id)}
                          colorScheme="green"
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{event.name}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {event.timing} • {event.frequency}
                          </Text>
                        </VStack>
                      </HStack>
                      <VStack align="end" spacing={0}>
                        {/* ✅ NEW: USDA-based carbon display */}
                        {event.excludeFromCarbonCalculation ? (
                          <Text fontSize="sm" fontWeight="bold" color="gray.500">
                            No Carbon Calc
                          </Text>
                        ) : carbonPreviews[event.id] ? (
                          <Text fontSize="sm" fontWeight="bold" color="green.600">
                            {formatCarbonValue(carbonPreviews[event.id].estimated_carbon)} kg CO2e
                            <Text fontSize="xs" color="gray.500">
                              USDA calculated
                            </Text>
                          </Text>
                        ) : (
                          <Text fontSize="sm" fontWeight="bold" color="blue.500">
                            Calculating...
                          </Text>
                        )}
                        <Input
                          type="date"
                          size="sm"
                          value={event.scheduled_date}
                          onChange={(e) => handleEventDateChange(event.id, e.target.value)}
                          isDisabled={!event.enabled}
                          width="150px"
                        />
                      </VStack>
                    </HStack>
                    {event.efficiency_tips && (
                      <Box mt={2} p={2} bg="blue.50" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="medium" color="blue.600" mb={1}>
                          💡 Efficiency Tips:
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          <Icon as={FaCheckCircle} color="green.400" mr={1} />
                          {event.efficiency_tips}
                        </Text>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            </StandardCard>
          )}

          {/* Action Buttons */}
          <HStack spacing={4} justify="flex-end">
            <StandardButton
              variant="outline"
              onClick={() =>
                navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`)
              }
            >
              Cancel
            </StandardButton>
            <StandardButton
              type="submit"
              isLoading={isCreating || isUpdating}
              loadingText={isEdit ? 'Updating Production...' : 'Creating Production...'}
              leftIcon={isEdit ? <FaCheckCircle /> : <FaRocket />}
            >
              {isEdit ? 'Update Production' : 'Start Production'}
            </StandardButton>
          </HStack>
        </VStack>
      </form>

      {/* Template Selection Modal */}
      <Modal isOpen={isTemplateOpen} onClose={onTemplateClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh" overflowY="auto">
          <ModalHeader>
            <VStack align="start" spacing={2}>
              <HStack>
                <Icon as={FaRocket} color="blue.500" />
                <Heading size="lg">Select Production Template</Heading>
              </HStack>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                {selectedCropTypeId && cropTypesData ? (
                  <>
                    Templates for{' '}
                    <Text as="span" fontWeight="semibold" color="green.600">
                      {cropTypesData.find((ct) => ct.id.toString() === selectedCropTypeId)?.name}
                    </Text>{' '}
                    • {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}{' '}
                    available
                  </>
                ) : (
                  'Choose a pre-configured template to accelerate your production setup'
                )}
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {filteredTemplates.length > 0 ? (
              <Grid templateColumns="repeat(auto-fit, minmax(350px, 1fr))" gap={6}>
                {filteredTemplates.map((template) => {
                  const CropIcon = getCropIcon(template.crop_type);
                  return (
                    <Box
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{
                        transform: 'translateY(-2px)',
                        shadow: 'lg'
                      }}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <Card
                        key={template.template_id}
                        borderWidth="1px"
                        borderColor={
                          selectedTemplate?.template_id === template.template_id
                            ? 'blue.300'
                            : 'gray.200'
                        }
                        bg={
                          selectedTemplate?.template_id === template.template_id
                            ? 'blue.50'
                            : 'white'
                        }
                      >
                        <CardHeader pb={2}>
                          <HStack justify="space-between">
                            <HStack>
                              <Icon as={CropIcon} color="green.500" boxSize={5} />
                              <VStack align="start" spacing={0}>
                                <Heading size="md">{template.name}</Heading>
                                <Text fontSize="sm" color="gray.600">
                                  {template.crop_type.charAt(0).toUpperCase() +
                                    template.crop_type.slice(1)}
                                </Text>
                              </VStack>
                            </HStack>
                            <Badge colorScheme="blue" variant="subtle">
                              {template.events_count} events
                            </Badge>
                          </HStack>
                        </CardHeader>
                        <CardBody pt={0}>
                          <Text fontSize="sm" color="gray.700" mb={4} noOfLines={2}>
                            {template.description}
                          </Text>
                          <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                            <VStack align="start" spacing={1}>
                              <HStack>
                                <Icon as={FaClock} color="blue.500" boxSize={3} />
                                <Text fontSize="xs" fontWeight="medium">
                                  Setup Time
                                </Text>
                              </HStack>
                              <Text fontSize="sm" fontWeight="bold">
                                {template.setup_time_minutes} minutes
                              </Text>
                            </VStack>
                            <VStack align="start" spacing={1}>
                              <HStack>
                                <Icon as={FaChartLine} color="green.500" boxSize={3} />
                                <Text fontSize="xs" fontWeight="medium">
                                  Transparency
                                </Text>
                              </HStack>
                              <Text fontSize="sm" fontWeight="bold">
                                QR Ready
                              </Text>
                            </VStack>
                          </Grid>
                        </CardBody>
                      </Card>
                    </Box>
                  );
                })}
              </Grid>
            ) : (
              <VStack spacing={4} py={8} textAlign="center">
                <Icon as={FaSeedling} boxSize={12} color="gray.400" />
                <VStack spacing={2}>
                  <Heading size="md" color="gray.600">
                    No Templates Available
                  </Heading>
                  <Text color="gray.500" maxW="400px">
                    {selectedCropTypeId
                      ? `We don't have pre-configured templates for ${
                          cropTypesData?.find((ct) => ct.id.toString() === selectedCropTypeId)?.name
                        } yet. You can still create a production manually.`
                      : 'Select a crop type to see available templates.'}
                  </Text>
                </VStack>
                <Button
                  variant="outline"
                  colorScheme="blue"
                  onClick={onTemplateClose}
                  leftIcon={<FaEdit />}
                >
                  Continue Without Template
                </Button>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTemplateClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </StandardPage>
    </WriteAccessGuard>
  );
};

export default QuickStartProduction;
