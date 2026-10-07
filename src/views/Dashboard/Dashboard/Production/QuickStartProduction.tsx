import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from 'store/index';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Grid,
  GridItem,
  Icon,
  Badge,
  useToast,
  InputGroup,
  InputLeftElement,
  Switch,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react';
import {
  FaRocket,
  FaSeedling,
  FaLeaf,
  FaCheckCircle,
  FaEdit,
  FaArrowRight,
  FaLock,
  FaSearch
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';
import { useGetCropTemplatesQuery, useGetCropTemplateDetailQuery } from 'store/api/carbonApi';
import { useStartProductionMutation, useGetCropTypesDropdownQuery } from 'store/api/companyApi';
import { useGetHistoryQuery, useUpdateProductionMutation } from 'store/api/historyApi';
import { useGetParcelQuery } from 'store/api/productApi';
import { setParcel } from 'store/features/productSlice';
import {
  StandardPage,
  StandardCard,
  StandardButton,
  StandardPageLoading,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert,
  ResponsiveModal
} from 'components/Design';
import { PlanLimitAlert } from 'components/Subscription/PlanLimitAlert';
import { useIntl, FormattedMessage } from 'react-intl';
// `hooks/*`, not `src/hooks/*` — see the note on the same import in
// components/Forms/StandardFinishProductionForm.tsx.
import { useDefaultUnits } from 'hooks/useMeasurementSystem';

// Form validation schema
const productionSchema = object({
  // 150 is History.name's max_length. It had no bound at all here, so an over-length name
  // reached the database and came back as a 500 rather than a field error. (Note the 30-char
  // cap inside generateProductionName is that helper's own formatting rule, not the column's.)
  name: string().min(1, 'Production name is required').max(150, 'Production name is too long'),
  start_date: string().min(1, 'Start date is required'),
  expected_harvest: string().optional(),
  description: string().optional(),
  // Required, with no default (2026-10-01). A preselected "conventional" was a claim nobody
  // made: the onboarding rehearsal started four seasons on a WSDA-certified farm and every one
  // came up Conventional. The farm's own farming_method still seeds it below; with nothing to
  // inherit, the grower chooses. The message is a key, rendered through intl at the field.
  production_method: string().min(1, 'quickStart.field.productionMethod.required'),
  type: string().min(1, 'Production type is required'),
  crop_type_id: string().min(1, 'Crop type is required')
}).superRefine((data, ctx) => {
  // A season cannot be expected to end before it starts. The backend accepts both dates
  // independently (start_production parses each on its own), and finish-time validation only
  // catches it much later — `_validate_finalization_fields` refuses a finish_date before
  // start_date, by which point the grower has lived with a wrong harvest window all season.
  if (!data.expected_harvest || !data.start_date) return;
  if (data.expected_harvest < data.start_date) {
    ctx.addIssue({
      code: 'custom',
      path: ['expected_harvest'],
      message: 'Expected harvest cannot be before the start date'
    });
  }
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

// Product tour
import { useTour } from 'hooks/useTour';

interface CropTypeOption {
  id: number;
  name: string;
  category: string;
  slug: string;
}

interface CropTypeSearchPickerProps {
  value: string;
  onSelect: (cropTypeId: string) => void;
  cropTypes: CropTypeOption[];
  recentIds: string[];
  isDisabled?: boolean;
}

// Searchable crop picker: type-to-filter over ~328 crop types with the farm's
// previously-used crops surfaced first under a "Recent" label.
const CropTypeSearchPicker: React.FC<CropTypeSearchPickerProps> = ({
  value,
  onSelect,
  cropTypes,
  recentIds,
  isDisabled = false
}) => {
  const intl = useIntl();
  const listId = React.useId();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selectedCrop = useMemo(
    () => cropTypes.find((ct) => ct.id.toString() === value) || null,
    [cropTypes, value]
  );

  const { recentOptions, otherOptions, flatOptions } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matches = cropTypes.filter((ct) => !term || ct.name.toLowerCase().includes(term));
    const sorted = [...matches].sort((a, b) => a.name.localeCompare(b.name));
    const recent = sorted.filter((ct) => recentIds.includes(ct.id.toString()));
    const rest = sorted.filter((ct) => !recentIds.includes(ct.id.toString()));
    return { recentOptions: recent, otherOptions: rest, flatOptions: [...recent, ...rest] };
  }, [cropTypes, recentIds, searchTerm]);

  // Reset highlight when the filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [searchTerm, isOpen]);

  // Keep the highlighted option visible while navigating with arrow keys
  useEffect(() => {
    if (!isOpen) return;
    document
      .getElementById(`${listId}-option-${highlightIndex}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, isOpen, listId]);

  const handleSelect = (cropType: CropTypeOption) => {
    onSelect(cropType.id.toString());
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightIndex((i) => Math.min(i + 1, Math.max(flatOptions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Select instead of submitting the surrounding form
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const option = flatOptions[highlightIndex] || flatOptions[0];
      if (option) handleSelect(option);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  if (isDisabled) {
    return (
      <StandardInput
        value={selectedCrop?.name || ''}
        isReadOnly
        isDisabled
        bg="gray.100"
        cursor="not-allowed"
      />
    );
  }

  const renderOption = (cropType: CropTypeOption, index: number) => {
    const isSelected = cropType.id.toString() === value;
    return (
      <Box
        key={cropType.id}
        id={`${listId}-option-${index}`}
        role="option"
        aria-selected={isSelected}
        px={4}
        minH="44px"
        display="flex"
        alignItems="center"
        cursor="pointer"
        bg={index === highlightIndex ? 'green.50' : 'transparent'}
        _hover={{ bg: 'green.50' }}
        onMouseDown={(e) => {
          // Select before the input blur closes the list
          e.preventDefault();
          handleSelect(cropType);
        }}
        onMouseEnter={() => setHighlightIndex(index)}>
        <Text fontSize="md" color="gray.700">
          {cropType.name}
        </Text>
        {isSelected && <Icon as={FaCheckCircle} color="green.500" ml="auto" boxSize={4} />}
      </Box>
    );
  };

  const groupLabel = (messageId: string) => (
    <Text
      px={4}
      pt={2}
      pb={1}
      fontSize="xs"
      fontWeight="semibold"
      color="gray.500"
      textTransform="uppercase"
      letterSpacing="wide">
      {intl.formatMessage({ id: messageId })}
    </Text>
  );

  return (
    <Box position="relative">
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none" h="full">
          <Icon as={FaSearch} color="gray.400" boxSize={4} />
        </InputLeftElement>
        <StandardInput
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          pl={10}
          value={isOpen ? searchTerm : selectedCrop?.name || ''}
          placeholder={intl.formatMessage({ id: 'production.cropSearch.placeholder' })}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setIsOpen(false);
            setSearchTerm('');
          }}
          onKeyDown={handleKeyDown}
        />
      </InputGroup>
      {isOpen && (
        <Box
          role="listbox"
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          maxH="240px"
          overflowY="auto"
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="lg"
          boxShadow="lg"
          zIndex={20}
          py={1}>
          {flatOptions.length === 0 ? (
            <Text px={4} py={3} fontSize="sm" color="gray.500">
              {intl.formatMessage(
                { id: 'production.cropSearch.noResults' },
                { search: searchTerm }
              )}
            </Text>
          ) : (
            <>
              {recentOptions.length > 0 && groupLabel('production.cropSearch.recent')}
              {recentOptions.map((cropType, index) => renderOption(cropType, index))}
              {recentOptions.length > 0 &&
                otherOptions.length > 0 &&
                groupLabel('production.cropSearch.allCrops')}
              {otherOptions.map((cropType, index) =>
                renderOption(cropType, recentOptions.length + index)
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

/**
 * The production-method vocabulary — MUST stay identical to
 * `History.PRODUCTION_METHOD_CHOICES` (trazo-back/history/models.py).
 *
 * This list used to be four hardcoded <option> tags, and they did not match the model:
 *
 *  • "sustainable" was offered here and is NOT a model choice. `start_production`
 *    (history/views.py) assigns `production_method` straight onto the model with no
 *    serializer and no full_clean(), so Django stored it anyway — leaving a value in a
 *    `choices` column that `get_production_method_display()` can only echo back raw.
 *    It is also exactly the kind of unqualified general-environmental-benefit claim FTC
 *    Green Guides 16 CFR 260.6 treats as deceptive, so it is removed rather than added
 *    to the model.
 *  • integrated / biodynamic / hydroponic / no_till are valid model choices that the
 *    select could not render. That mattered beyond the missing options: the template
 *    effect below maps a template's `system_type` onto this field and can set
 *    'integrated' or 'no_till' — values with no matching <option>, so the control went
 *    blank. The file already documents this trap for the FARM-inheritance path; the
 *    template path had it too.
 *
 * Labels are the model's own display strings verbatim, so the form and the certifier
 * packet name the same thing the same way.
 *
 * Guarded by trazo-back/history/tests/test_production_method_vocabulary.py, which reads
 * this array out of this file — same cross-repo pattern as the sale/harvest unit lists.
 */
export const PRODUCTION_METHOD_CHOICES = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'organic', label: 'Organic' },
  { value: 'regenerative', label: 'Regenerative' },
  { value: 'integrated', label: 'Integrated Pest Management' },
  { value: 'biodynamic', label: 'Biodynamic' },
  { value: 'hydroponic', label: 'Hydroponic' },
  { value: 'no_till', label: 'No-Till' }
] as const;

/**
 * Production methods under which a prohibited synthetic input must never be suggested.
 *
 * Biodynamic joined the list on 2026-08-19: Demeter certification requires organic
 * certification underneath it, so § 205.105 applies in full and leaving it out meant a
 * biodynamic grower was offered the conventional programme's synthetics.
 *
 * ⛔ Must stay byte-identical to `ORGANIC_PRODUCTION_METHODS` in
 * `history/services/season_plan_service.py`, which is the copy that decides. Guarded by
 * `history/tests/test_season_plan_not_records.py`.
 */
const ORGANIC_PRODUCTION_METHODS = ['organic', 'regenerative', 'biodynamic'];

/**
 * Is this catalogue suggestion one the operation is not permitted to perform at all?
 *
 * Crop templates are generic, so the walnut template ships "Roundup PowerMax 3 (glyphosate)"
 * (`organic_approved: 'not_organic'`). Performing that on a certified organic operation is a
 * § 205.105 hard disqualification, so Trazo does not put it on the plan: prohibited items start
 * unselected like every other, AND "Select all" refuses to turn them on.
 *
 * ⚠️ This is a UI affordance, not the rule. The rule is
 * `season_plan_service.is_prohibited_suggestion` on the server, which runs on every plan build
 * — a check that lives only in the browser is not a check. Keep the two in step.
 *
 * (Ticking one no longer writes a record: since 2026-08-19 a suggestion becomes a
 * ProductionPlanItem, and the operator authors the record themselves. The stakes are lower
 * than they were, which is exactly why the guard has to stay explicit rather than drift.)
 */
export function isProhibitedSuggestion(event: any, productionMethod?: string): boolean {
  const method = String(productionMethod || '').toLowerCase();
  // An unchosen method FAILS CLOSED (2026-10-01). Empty used to mean "conventional", because the
  // form preselected it; now it means "not chosen yet", and the farm may well be organic. Treating
  // it as conventional let "Select all" enable a template's prohibited inputs, unbadged, on a
  // farm with no inherited method (trazo-app#59 review). The server never sees an empty method:
  // the form requires one before it saves.
  if (method && !ORGANIC_PRODUCTION_METHODS.includes(method)) return false;

  // backend_event_fields is where the template carries the input's real attributes; the event
  // may also carry them flattened, so check both and let either mark it prohibited.
  const fields = { ...(event?.backend_event_fields || {}), ...(event || {}) };
  const approval = String(fields.organic_approved || '').toLowerCase();
  const subtype = String(fields.chemical_subtype || '').toLowerCase();
  return approval === 'not_organic' || subtype.includes('synthetic');
}

const QuickStartProduction: React.FC<QuickStartProductionProps> = ({
  parcelId: propParcelId,
  parcelName,
  cropType: propCropType,
  isEdit = false,
  productionId: propProductionId
}) => {
  const { parcelId: paramParcelId, farmId, productionId: paramProductionId } = useParams();
  const parcelId = propParcelId || paramParcelId;
  const productionId = propProductionId || paramProductionId;

  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const intl = useIntl();
  const {
    isOpen: isTemplateOpen,
    onOpen: onTemplateOpen,
    onClose: onTemplateClose
  } = useDisclosure();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [planSuggestions, setPlanSuggestions] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCropTypeId, setSelectedCropTypeId] = useState<string | null>(null);

  // Production creation tour — two steps, both present the moment the page opens.
  // (It used to declare a third, pointing at the pre-configured events list further down;
  // that list does not exist until a template has been applied. See src/tours/productionTour.ts.)
  useTour('production-first', { enabled: !isEdit });

  // Get parcel data from Redux store
  const currentParcel = useSelector((state: RootState) => state.product?.currentParcel);
  const currentCompany = useSelector((state: RootState) => state.company?.currentCompany);

  // Fetch parcel data directly if not in Redux
  const { data: parcelData } = useGetParcelQuery(
    { parcelId, farmId, companyId: currentCompany?.id },
    {
      skip: !parcelId || !farmId || !currentCompany || !!currentParcel
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

  // Parcel area, mirrored from the parcel record for display only. Never submitted — see the
  // note on the read-only field that renders it.
  const [areaInput, setAreaInput] = useState<number>(10);

  // Parcel.area is STORED in hectares (carbon maths depends on it) but was also DISPLAYED
  // in hectares on a US-only product, so a grower who entered 42.5 acres on the parcel form
  // — which already converts — then saw "17.1992 hectares" here and had to convert back to
  // recognise their own block. Storage is unchanged; only the read-out is localised.
  const areaUnits = useDefaultUnits(farmId);
  const ACRES_PER_HECTARE = 2.47105;
  const areaLabel =
    areaUnits.system === 'imperial'
      ? intl.formatMessage({
          id: 'production.parcelAreaAcres',
          defaultMessage: 'Parcel Area (acres)'
        })
      : intl.formatMessage({
          id: 'production.parcelAreaHectares',
          defaultMessage: 'Parcel Area (hectares)'
        });
  const areaDisplayValue =
    areaUnits.system === 'imperial'
      ? `${(areaInput * ACRES_PER_HECTARE).toFixed(2)} acres (${areaInput} ha)`
      : `${areaInput} hectares`;
  // API hooks - Dynamic template fetching based on crop type
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetCropTemplatesQuery(
    selectedCropTypeId ? { crop_type: selectedCropTypeId } : undefined
  );
  const { data: templateDetail } = useGetCropTemplateDetailQuery(selectedTemplateId!, {
    skip: !selectedTemplateId
  });
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

  // Crop immutability applies to a crop the production actually HAS in the DB.
  // A NULL crop (white-glove COG Pro import targets are created by hand without
  // one) is a repairable gap, not a change — the picker unlocks exactly once.
  // Keyed on productionData, never the form value: edit hydration fuzzy-guesses
  // a crop from the production NAME for display, and a guess must not lock.
  const cropIsLocked = isEdit && Boolean((productionData as any)?.crop_type);

  const {
    data: cropTypesData,
    error: cropTypesError,
    isLoading: isLoadingCropTypes
  } = useGetCropTypesDropdownQuery();

  // Previously-used crops for this farm (derived from parcels' current production
  // crop names already in the Redux company state — no extra fetch needed)
  const recentCropTypeIds = useMemo(() => {
    if (!cropTypesData?.length) return [] as string[];
    const farm = currentCompany?.establishments?.find(
      (est) => est?.id?.toString() === farmId?.toString()
    );
    const usedNames = new Set<string>();
    (farm?.parcels || []).forEach((parcel) => {
      if (parcel?.product) usedNames.add(parcel.product.toLowerCase());
    });
    if (usedNames.size === 0) return [] as string[];
    return cropTypesData
      .filter((ct) => usedNames.has(ct.name.toLowerCase()))
      .map((ct) => ct.id.toString());
  }, [cropTypesData, currentCompany, farmId]);

  // Pre-flight subscription limit check (informational only — backend enforces)
  const subscription = currentCompany?.subscription;
  const subscriptionLimits: Record<string, any> =
    subscription?.effective_limits || subscription?.plan?.features || {};
  const maxProductionsPerYear = subscriptionLimits?.max_productions_per_year;
  const usedProductions = subscription?.used_productions ?? 0;
  const isAtProductionLimit =
    !isEdit &&
    typeof maxProductionsPerYear === 'number' &&
    maxProductionsPerYear !== -1 &&
    usedProductions >= maxProductionsPerYear;

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors }
  } = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      name: `Production ${new Date().getFullYear()}`,
      start_date: new Date().toISOString().split('T')[0],
      type: 'OR',
      production_method: '',
      crop_type_id: ''
    }
  });

  /**
   * Seed production_method from the farm's own farming method.
   *
   * The static default above is "conventional" regardless of how the farm was set up,
   * so an organic operation started every production mislabelled and had to notice and
   * change it each time. The consumer page reads this value, so the wrong default was
   * surfacing on organic growers' QR pages — the opposite of the ICP. Only seeds when
   * the farmer hasn't already chosen, and never overrides an edit in progress.
   *
   * The farm's farming_method has a WIDER option set than production_method
   * (it also offers biodynamic and permaculture), so seeding blindly would put a value
   * in this <select> that has no matching <option> — the field would render blank and
   * submit something the backend doesn't accept. Only inherit values this select can
   * actually represent; anything else keeps the "conventional" default.
   */
  const PRODUCTION_METHOD_OPTIONS = useMemo(
    () => PRODUCTION_METHOD_CHOICES.map((c) => c.value) as readonly string[],
    []
  );

  const farmDefaultMethod = useMemo(() => {
    const farm = currentCompany?.establishments?.find(
      (est) => est?.id?.toString() === farmId?.toString()
    ) as { farming_method?: string } | undefined;
    const method = farm?.farming_method?.toLowerCase() ?? '';
    return PRODUCTION_METHOD_OPTIONS.includes(method) ? method : '';
  }, [currentCompany, farmId, PRODUCTION_METHOD_OPTIONS]);

  useEffect(() => {
    if (isEdit || !farmDefaultMethod) return;
    const current = getValues('production_method');
    if (!current) {
      setValue('production_method', farmDefaultMethod);
    }
  }, [farmDefaultMethod, isEdit, getValues, setValue]);

  // Populate form with existing production data when in edit mode
  useEffect(() => {
    if (isEdit && productionData && cropTypesData) {
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

      // A season saved without a method stays blank and asks, rather than being re-saved as
      // conventional the next time someone edits its name.
      const productionMethod = productionData.production_method || '';

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

      const expectedHarvestDate = productionData.expected_harvest || '';

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

  // Templates are filtered by the API on crop type; the API returns them in insertion order,
  // which puts the conventional one first for every crop. Surface the one matching how this
  // farm actually operates instead — an organic grower opening the picker should not have to
  // scroll past "Walnuts - Conventional Production" to find the programme that fits them, and
  // the conventional list is where the prohibited inputs live.
  //
  // Reads the method via `watch`, NOT `getValues`. `getValues` returns a STABLE function
  // reference, so listing it in the dependency array never invalidates the memo: the sort was
  // computed once at first render and never again. Selecting "Organic" left the conventional
  // template — the one carrying prohibited inputs — sitting first, which silently defeated the
  // entire mitigation. Verified live before and after.
  const watchedProductionMethod = watch('production_method');
  const filteredTemplates = useMemo(() => {
    const templates = templatesData?.templates || [];
    const method = (watchedProductionMethod || farmDefaultMethod || '').toLowerCase();
    if (!method) return templates;
    return [...templates].sort((a: any, b: any) => {
      const aMatch = String(a?.system_type || '').toLowerCase() === method ? 0 : 1;
      const bMatch = String(b?.system_type || '').toLowerCase() === method ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [templatesData, watchedProductionMethod, farmDefaultMethod]);

  // Resolved crop name for the template picker's copy. Undefined until a crop is chosen,
  // which is what switches the picker between its crop-specific and generic messages.
  const selectedCropName = useMemo(
    () =>
      selectedCropTypeId && cropTypesData
        ? cropTypesData.find((ct: any) => ct.id.toString() === selectedCropTypeId)?.name
        : undefined,
    [selectedCropTypeId, cropTypesData]
  );

  const cardBg = useColorModeValue('white', 'gray.700');
  const selectedCardBg = useColorModeValue('green.50', 'green.900');
  const cardBorderColor = useColorModeValue('gray.200', 'gray.600');

  // Templates are OPT-IN: choosing a crop must not apply one.
  //
  // This effect used to auto-select filteredTemplates[0] the moment a crop was picked, which
  // made the "Select a Smart Template" card below unreachable and turned the whole feature into
  // something that happened TO the farmer. Because a template's events are saved as real,
  // backdated records attributed to them by name, that meant a grower who only chose "Walnuts"
  // acquired ~20 documented operations they never performed — including, on a certified organic
  // farm, a glyphosate application. A template is a suggestion; the farmer opts in by picking
  // one from the modal (or "Change Template" once chosen).
  //
  // What remains here is only the CLEARING half. Switching crops is handled by the
  // watchedCropTypeId effect just below, which already resets the selection — so a walnut
  // template cannot survive a switch to almonds.
  useEffect(() => {
    if (isLoadingTemplates) {
      return;
    }
    if (!selectedCropTypeId || filteredTemplates.length === 0) {
      setSelectedTemplate(null);
      setSelectedTemplateId(null);
      setPlanSuggestions([]);
    }
  }, [selectedCropTypeId, filteredTemplates, isLoadingTemplates]);

  // Clear and reload templates when crop type selection changes from dropdown
  const watchedCropTypeId = watch('crop_type_id');
  useEffect(() => {
    if (watchedCropTypeId && watchedCropTypeId !== selectedCropTypeId) {
      setSelectedCropTypeId(watchedCropTypeId);
      // Clear current template selection to force reload
      setSelectedTemplate(null);
      setSelectedTemplateId(null);
      setPlanSuggestions([]);
      // RTK Query will automatically refetch when selectedCropTypeId changes
    }
  }, [watchedCropTypeId, selectedCropTypeId]);

  // Auto-fill form when template is selected.
  //
  // A template SUGGESTS; it must not overwrite what the farmer (or the farm) has already
  // said. Selecting a crop can auto-apply a template, and this effect used to clobber three
  // fields unconditionally — so typing "2025 Howard Walnut Season - Block 7", then choosing
  // the crop, silently replaced the name with "Walnuts 2026" and the description with the
  // template blurb.
  useEffect(() => {
    if (templateDetail) {
      const currentYear = new Date().getFullYear();
      // Only fill fields the farmer has left empty — never replace typed text.
      if (!getValues('name')?.trim()) {
        setValue('name', generateProductionName(templateDetail.name, currentYear));
      }
      if (!getValues('description')?.trim()) {
        // Was: "<blurb> This production includes N pre-configured events for optimal carbon
        // tracking." Both halves became false when templates stopped writing events: nothing
        // is pre-configured and no carbon is calculated until the farmer logs real records.
        // It was also hardcoded English in a file that otherwise routes everything through
        // intl. The template's own blurb is the part that was ever true.
        setValue('description', templateDetail.description || '');
      }

      // The production method is NOT taken from the template.
      //
      // History: a line here once set it from the template unconditionally, the third route into the
      // "organic farm, conventional production" bug: a generic crop template ("Comprehensive
      // production template for walnuts") carries a system_type that mapped to
      // `conventional`, overwriting both the farm's inherited farming_method and an explicit
      // choice by the farmer. The consumer QR page reads this value, so an organic grower's
      // lot was published as conventional. The farm is the authority on its own organic
      // status; a crop template is not. It was then narrowed to "only when nothing was chosen".
      // 2026-10-01: a template no longer fills the method at all. With the field now required
      // and empty by default, the template was the last thing still choosing for the grower,
      // and by the reasoning above it is the one source with no standing to.

      // Set custom events from template — ALL UNSELECTED.
      //
      // Each of these is saved as a REAL, backdated record attributed to the farmer by name.
      // Choosing a template says "these are the operations typical for this crop"; it does not
      // say "I performed all of them on these dates". Selecting the template is the first
      // opt-in; ticking an event is the second, and it is the one that turns a suggestion into
      // a claim in a certifier's audit file. "Select all" is right there for a farmer who really
      // did run the standard programme — one tap, but a tap they chose to make.
      if (templateDetail.events) {
        setPlanSuggestions(
          templateDetail.events.map((event, index) => ({
            ...event,
            // Spread backend_event_fields to make fields like pest_species available directly
            ...(event.backend_event_fields || {}),
            id: `template-${event.id ?? index}`,
            // The catalogue id. It is what the server builds the plan from — the server
            // reads the practice, the window and the prefill off its own EventTemplate row
            // rather than trusting anything sent from here.
            templateEventId: event.id,
            enabled: false
          }))
        );
      }
    }
  }, [templateDetail, setValue, getValues, farmDefaultMethod]);

  /**
   * ⚠️ RECONSTRUCTED 2026-08-19 — verify against git before relying on the exact string.
   *
   * A season name from the template's own name plus the year. The template is named for the
   * crop and the programme ("Apples - Conventional Production"); the season is named for the
   * crop and the year, so the programme half is dropped. Capped at 30 characters — that is
   * this helper's own formatting rule, NOT `History.name`'s 150-character column bound.
   *
   * Only ever used to fill a name the farmer left blank (see the caller); it never replaces
   * typed text.
   */
  const generateProductionName = (templateName: string, year: number): string => {
    const crop = String(templateName || '')
      .split(/\s+[-\u2013\u2014]\s+/)[0]
      .replace(/\s*(production|programme|program|template)\s*$/i, '')
      .trim();
    const suffix = String(year);
    const budget = 30 - suffix.length - 1;
    const head = crop.length > budget ? crop.slice(0, budget).trim() : crop;
    return head ? `${head} ${suffix}` : suffix;
  };

  /**
   * ⚠️ RECONSTRUCTED 2026-08-19 — verify against git.
   *
   * Picking a template is the FIRST of two opt-ins (the second is ticking each practice).
   * It records the choice, keys the detail query that loads the practice list, and closes
   * the picker. It deliberately does not touch the form's name or description: that is the
   * effect on `templateDetail`, which fills only fields the farmer left blank.
   */
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setSelectedTemplateId(template?.template_id != null ? String(template.template_id) : null);
    onTemplateClose();
  };

  /**
   * Undo a template choice.
   *
   * There was no way back. "Change" only swapped one template for another, and the picker's
   * footer read "Cancel" once something was selected — which closes and KEEPS it. The only
   * code path that cleared the selection fired when the crop type changed, so a farmer who
   * picked a 25-practice plan by mistake had to switch crops and switch back, losing the
   * autofilled production details on the way.
   *
   * Clearing the plan only. The name, dates and area the farmer typed are theirs and survive.
   */
  const handleTemplateRemove = () => {
    setSelectedTemplate(null);
    setSelectedTemplateId(null);
    setPlanSuggestions([]);
    onTemplateClose();
    toast({
      title: intl.formatMessage({ id: 'quickStart.templates.removed' }),
      description: intl.formatMessage({ id: 'quickStart.templates.removedDetail' }),
      status: 'info',
      duration: 4000,
      isClosable: true
    });
  };

  const handleSuggestionToggle = (eventId: string) => {
    setPlanSuggestions((events) =>
      events.map((event) => (event.id === eventId ? { ...event, enabled: !event.enabled } : event))
    );
  };

  /**
   * Are all the events "Select all" is allowed to turn on currently on?
   *
   * Measured over the SELECTABLE events only. Counting the prohibited ones would make this
   * permanently false on an organic farm — the master switch would read unchecked forever and
   * could never be used to clear the list again.
   */
  // Reads the WATCHED method, not getValues: getValues is a stable reference, so a memo keyed on
  // it never recomputes when the method changes (see templateSortReactsToMethod.test.ts).
  const allSelectableSuggestionsEnabled = useMemo(() => {
    const method = watchedProductionMethod || farmDefaultMethod || '';
    const selectable = planSuggestions.filter((event) => !isProhibitedSuggestion(event, method));
    return selectable.length > 0 && selectable.every((event) => event.enabled);
  }, [planSuggestions, watchedProductionMethod, farmDefaultMethod]);

  // A row enabled under one method must not stay enabled after a change makes it prohibited:
  // the row would render disabled while still being submitted.
  useEffect(() => {
    const method = watchedProductionMethod || farmDefaultMethod || '';
    setPlanSuggestions((events) =>
      events.some((event) => event.enabled && isProhibitedSuggestion(event, method))
        ? events.map((event) =>
            event.enabled && isProhibitedSuggestion(event, method)
              ? { ...event, enabled: false }
              : event
          )
        : events
    );
  }, [watchedProductionMethod, farmDefaultMethod]);

  const handleToggleAll = () => {
    const method = watchedProductionMethod || farmDefaultMethod || '';
    setPlanSuggestions((events) =>
      events.map((event) => ({
        ...event,
        // "Select all" must not be a one-tap route to a prohibited substance. On an organic
        // operation a template's synthetic inputs stay off; the farmer can still enable one
        // individually if they really did apply it (and lose their certification over it).
        enabled: !allSelectableSuggestionsEnabled && !isProhibitedSuggestion(event, method)
      }))
    );
  };

  const onSubmit = async (data: ProductionFormData) => {
    try {
      setIsCreating(true);

      // Ensure we have a valid crop type ID
      if (!data.crop_type_id) {
        toast({
          title: intl.formatMessage({ id: 'quickStart.toast.missingCropTitle' }),
          description: intl.formatMessage({
            id: isEdit ? 'quickStart.toast.missingCropUpdate' : 'quickStart.toast.missingCropCreate'
          }),
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
          // '' fails DRF DateTimeField validation outright — every edit of a
          // production without an expected harvest 400'd on this. null clears.
          expected_harvest: data.expected_harvest || null,
          description: data.description || '',
          production_method: data.production_method,
          type: data.type,
          // Repair-only: the server refuses crop changes; send the crop solely
          // when the production has none yet.
          ...(cropIsLocked ? {} : { crop_type_id: parseInt(data.crop_type_id) })
        };

        await updateProduction(updatePayload).unwrap();

        toast({
          title: intl.formatMessage({ id: 'quickStart.toast.updatedTitle' }),
          description: intl.formatMessage(
            { id: 'quickStart.toast.updatedDescription' },
            { name: data.name }
          ),
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
          // ⛔ Was `template_events: <the whole ticked rows>`, and the server turned each one
          // into a real dated event record. Now it is a list of catalogue ids and the server
          // builds a season PLAN — see history/models.py ProductionPlanItem. Records are
          // authored by the operator, in the activity wizard, with their own date.
          plan_item_ids: planSuggestions
            .filter((event) => event.enabled)
            .map((event) => event.templateEventId)
            .filter((id: number | undefined) => id != null)
        };

        await startProduction(productionPayload).unwrap();

        // A season with no plan item is a season with no checklist: say so instead of "Season
        // plan saved" (recordkeeping review F-21).
        const planned = productionPayload.plan_item_ids.length;
        toast({
          title: intl.formatMessage({ id: 'production.createdSuccessfully' }),
          description: intl.formatMessage({
            id: planned > 0 ? 'production.planSaved' : 'production.planEmpty'
          }),
          status: planned > 0 ? 'success' : 'info',
          duration: 6000,
          isClosable: true
        });
      }

      // Navigate to production dashboard
      navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`);
    } catch (error: any) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} production:`, error);

      // Parse error — backend uses {"error": "msg"} format, but also handle DRF {"field": ["msgs"]}
      let description = intl.formatMessage({
        id: isEdit
          ? 'quickStart.toast.errorUpdatingFallback'
          : 'quickStart.toast.errorCreatingFallback'
      });
      if (error?.data) {
        if (typeof error.data.detail === 'string') {
          description = error.data.detail;
        } else if (typeof error.data.error === 'string') {
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
        title: intl.formatMessage({
          id: isEdit ? 'quickStart.toast.errorUpdating' : 'quickStart.toast.errorCreating'
        }),
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

  // Show loading state for edit mode or template loading
  if (isLoadingTemplates || (isEdit && isLoadingProduction)) {
    return (
      <StandardPage title={isEdit ? 'Edit Production' : 'Quick Start Production'} showBackButton>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  // Show error state for edit mode
  if (isEdit && isProductionError) {
    return (
      <StandardPage title={intl.formatMessage({ id: 'quickStart.page.titleEdit' })} showBackButton>
        <VStack py={8} spacing={4}>
          <Text color="red.700" fontWeight="bold">
            {intl.formatMessage({ id: 'quickStart.error.loadTitle' })}
          </Text>
          <Text color="gray.600">
            {intl.formatMessage({ id: 'quickStart.error.productionId' }, { id: productionId })}
          </Text>
          <StandardButton
            onClick={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
            {intl.formatMessage({ id: 'quickStart.error.goBack' })}
          </StandardButton>
        </VStack>
      </StandardPage>
    );
  }

  // A finished season cannot be edited. The menu item that links here is already gated
  // (ProfileProduction), but the ROUTE was not — typing or bookmarking
  // /production/<id>/change loaded the full form for a closed record, let the farmer
  // refill it, and only failed at save. WriteAccessGuard above checks role, never state.
  // Refusing here, before the form renders, is the honest order: say no while it still
  // costs nothing, and offer the one thing they can actually do.
  if (isEdit && (productionData as any)?.finish_date) {
    return (
      <StandardPage title={intl.formatMessage({ id: 'quickStart.page.titleEdit' })} showBackButton>
        <VStack py={10} spacing={4} maxW="md" mx="auto" textAlign="center">
          <Icon as={FaLock} boxSize={8} color="gray.500" />
          <Text fontWeight="bold" color="gray.700">
            {intl.formatMessage({ id: 'quickStart.locked.title' })}
          </Text>
          <Text color="gray.600" fontSize="sm">
            {intl.formatMessage({ id: 'quickStart.locked.body' })}
          </Text>
          <StandardButton
            onClick={() =>
              navigate(
                `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${productionId}`
              )
            }>
            {intl.formatMessage({ id: 'quickStart.locked.viewRecord' })}
          </StandardButton>
        </VStack>
      </StandardPage>
    );
  }

  return (
    <WriteAccessGuard>
      <StandardPage
        title={intl.formatMessage({
          id: isEdit ? 'quickStart.page.titleEdit' : 'quickStart.page.title'
        })}
        description={
          isEdit
            ? productionData?.name
              ? intl.formatMessage(
                  { id: 'quickStart.page.descriptionEditNamed' },
                  { name: productionData.name }
                )
              : intl.formatMessage({ id: 'quickStart.page.descriptionEdit' })
            : parcelName
            ? intl.formatMessage(
                { id: 'quickStart.page.descriptionForParcel' },
                { parcel: parcelName }
              )
            : intl.formatMessage({ id: 'quickStart.page.description' })
        }
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={8} align="stretch">
            {/* Pre-flight plan limit warning (form stays usable; backend enforces) */}
            {isAtProductionLimit && (
              <PlanLimitAlert
                limit={maxProductionsPerYear}
                descriptionId="limits.productionsReached"
              />
            )}

            {/* Template Selection Section - Only show in create mode */}
            {!isEdit && (
              <Box data-tour="template-events">
                {/* "reduce setup time by 37+ minutes" removed from the subtitle. The comment
                    further down this file records deleting exactly that figure as unsourced —
                    it survived here, in the card subtitle, which is the most prominent place
                    it appeared. No measurement behind it, and no real users to have measured
                    it from. */}
                <StandardCard
                  title={intl.formatMessage({ id: 'quickStart.templates.title' })}
                  subtitle={intl.formatMessage({ id: 'quickStart.templates.subtitle' })}>
                  <VStack spacing={6} align="stretch">
                    {/* Current Template Display */}
                    {selectedTemplate ? (
                      <Box
                        p={4}
                        bg="green.50"
                        borderRadius="lg"
                        borderWidth="2px"
                        borderColor="green.200">
                        <HStack spacing={3}>
                          <Icon
                            as={getCropIcon(selectedTemplate.crop_type)}
                            color="green.500"
                            boxSize={6}
                          />
                          <VStack align="start" spacing={1} flex={1}>
                            <HStack>
                              <Text fontSize="lg" fontWeight="bold" color="green.700">
                                {intl.formatMessage(
                                  { id: 'quickStart.templates.selected' },
                                  { name: selectedTemplate.name }
                                )}
                              </Text>
                              {/* The "Smart Setup" badge is gone. "Smart Setup" is the name
                                  the 2026-08-02 incident is filed under — a crop template
                                  writing a backdated glyphosate application into a certified
                                  organic farm's audit trail — and keeping the brand on the
                                  feature keeps the mental model that produced it. */}
                            </HStack>
                            {/* "Setup time reduced by 37 minutes" removed: that figure appeared
                                exactly once in the whole codebase — no source, no calculation, no
                                backend value behind it. An unsourced statistic shown to a user is
                                the first thing .claude/rules/compliance.md rules out, and with no
                                real users yet there is nothing it could have been measured from.
                                The two remaining clauses are both facts we actually hold. */}
                            <Text fontSize="sm" color="green.700">
                              {intl.formatMessage(
                                { id: 'quickStart.templates.eventsConfigured' },
                                { count: selectedTemplate.events_count || planSuggestions.length }
                              )}
                            </Text>
                            {/* Was four badges: "Audit-Ready" + "NOP Compliant" on organic
                                templates, "EPA/USDA-Sourced" + "Transparency Ready" otherwise.
                                None is a property of a TEMPLATE — a farm's records may become
                                audit-ready; a template cannot be, and it certainly is not NOP
                                compliant before a single practice has been carried out. Same
                                claim shape as the deleted "Setup Time: 8 minutes" and the
                                `premium_pricing_potential` fields stripped from this payload.
                                The farming approach is the one fact the template actually
                                holds, and the picker card now carries it. */}
                            <HStack spacing={2} mt={1}>
                              <Badge
                                variant={
                                  selectedTemplate?.system_type === 'organic' ? 'subtle' : 'neutral'
                                }
                                textTransform="none">
                                {intl.formatMessage({
                                  id: `production.templateModal.approach.${
                                    selectedTemplate?.system_type || 'conventional'
                                  }`,
                                  defaultMessage: selectedTemplate?.system_type || 'conventional'
                                })}
                              </Badge>
                            </HStack>
                          </VStack>
                          <HStack spacing={2}>
                            <StandardButton size="sm" variant="outline" onClick={onTemplateOpen}>
                              {intl.formatMessage({ id: 'quickStart.templates.change' })}
                            </StandardButton>
                            <StandardButton
                              size="sm"
                              variant="ghost"
                              onClick={handleTemplateRemove}>
                              {intl.formatMessage({ id: 'quickStart.templates.remove' })}
                            </StandardButton>
                          </HStack>
                        </HStack>
                      </Box>
                    ) : (
                      // 2026-08-21: this was a bare <Box onClick> — cursor:pointer and nothing
                      // else. It is the ONLY way into the season-plan picker, so a farmer on a
                      // keyboard or a screen reader could not start a planned season at all,
                      // while the template cards inside the modal (below) already carry
                      // role/tabIndex/onKeyDown. Same treatment here.
                      <Box
                        as="button"
                        type="button"
                        w="full"
                        textAlign="left"
                        p={4}
                        bg="green.50"
                        borderRadius="lg"
                        borderWidth="2px"
                        borderColor="green.200"
                        cursor={selectedCropTypeId ? 'pointer' : 'not-allowed'}
                        transition="all 0.2s"
                        _hover={
                          selectedCropTypeId
                            ? { bg: 'green.100', borderColor: 'green.300' }
                            : undefined
                        }
                        onClick={selectedCropTypeId ? onTemplateOpen : undefined}
                        disabled={!selectedCropTypeId}
                        aria-disabled={!selectedCropTypeId}
                        aria-haspopup="dialog"
                        aria-label={intl.formatMessage({
                          id: selectedCropTypeId
                            ? 'quickStart.templates.selectPrompt'
                            : 'quickStart.templates.selectCropFirst'
                        })}
                        opacity={selectedCropTypeId ? 1 : 0.6}>
                        <HStack spacing={3}>
                          <Icon as={FaRocket} color="green.500" boxSize={6} />
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontSize="lg" fontWeight="bold" color="green.700">
                              {intl.formatMessage({
                                id: selectedCropTypeId
                                  ? 'quickStart.templates.selectPrompt'
                                  : 'quickStart.templates.selectCropFirst'
                              })}
                            </Text>
                            <Text fontSize="sm" color="green.700">
                              {selectedCropTypeId
                                ? intl.formatMessage(
                                    { id: 'quickStart.templates.availableCount' },
                                    { count: filteredTemplates.length }
                                  )
                                : intl.formatMessage({
                                    id: 'quickStart.templates.chooseCropAbove'
                                  })}
                            </Text>
                            <HStack spacing={2} mt={1}>
                              {selectedCropTypeId ? (
                                <>
                                  <Badge variant="subtle" fontSize="xs">
                                    {intl.formatMessage(
                                      { id: 'quickStart.templates.badge.count' },
                                      { count: filteredTemplates.length }
                                    )}
                                  </Badge>
                                  {/* "Farm Documented" and "QR Ready" removed: both assert an
                                      outcome, on a template the farmer has not picked yet, for
                                      a farm that has documented nothing. The count beside them
                                      is the only fact this row holds. */}
                                </>
                              ) : (
                                <Badge colorScheme="gray" variant="subtle" fontSize="xs">
                                  {intl.formatMessage({
                                    id: 'quickStart.templates.badge.selectCrop'
                                  })}
                                </Badge>
                              )}
                            </HStack>
                          </VStack>
                          {selectedCropTypeId && <Icon as={FaArrowRight} color="green.500" />}
                        </HStack>
                      </Box>
                    )}
                  </VStack>
                </StandardCard>
              </Box>
            )}

            {/* Production Details Form */}
            <StandardCard
              title={intl.formatMessage({ id: 'quickStart.details.title' })}
              subtitle={intl.formatMessage({ id: 'quickStart.details.subtitle' })}>
              <VStack spacing={6} align="stretch">
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                  {/* Crop Type Selection - First field */}
                  <GridItem colSpan={{ base: 1, md: 2 }} data-tour="crop-selector">
                    <StandardField
                      label={
                        <>
                          {intl.formatMessage({ id: 'quickStart.field.cropType' })}
                          {cropIsLocked && (
                            <Badge ml={2} colorScheme="gray" variant="subtle">
                              {intl.formatMessage({ id: 'quickStart.field.cropType.readOnly' })}
                            </Badge>
                          )}
                        </>
                      }
                      required={!cropIsLocked}
                      error={errors.crop_type_id?.message}
                      helpText={
                        cropIsLocked
                          ? intl.formatMessage({ id: 'quickStart.field.cropType.lockedHelp' })
                          : isEdit
                          ? intl.formatMessage({ id: 'quickStart.field.cropType.repairHelp' })
                          : undefined
                      }>
                      {/*
                        These three lines were labelled "Debug Info" and shipped as such: one
                        dumped the raw RTK Query error object at the farmer via
                        JSON.stringify, and one told them the app "Expected 6 crop types from
                        database" — an internal assertion, and a stale one (the seeder defines
                        32). Both are now operator-readable statements of what to do next.
                      */}
                      {!cropIsLocked && isLoadingCropTypes && (
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          {intl.formatMessage({ id: 'production.cropTypes.loading' })}
                        </Text>
                      )}
                      {!cropIsLocked &&
                        (cropTypesError ||
                          (!isLoadingCropTypes &&
                            (!cropTypesData || cropTypesData.length === 0))) && (
                          <StandardAlert
                            status="error"
                            description={intl.formatMessage({
                              id: 'production.cropTypes.unavailable'
                            })}
                          />
                        )}
                      <Controller
                        name="crop_type_id"
                        control={control}
                        render={({ field }) => (
                          <CropTypeSearchPicker
                            value={field.value}
                            onSelect={(cropTypeId) => {
                              if (!cropIsLocked) {
                                field.onChange(cropTypeId);
                                setSelectedCropTypeId(cropTypeId);
                              }
                            }}
                            cropTypes={cropTypesData || []}
                            recentIds={recentCropTypeIds}
                            isDisabled={cropIsLocked}
                          />
                        )}
                      />
                      {/*
                        The green "crop details" box that used to sit here rendered
                        `selectedCropType.description` and
                        `{selectedCropType.emissions_per_hectare} kg CO2e/ha`. This picker is
                        fed by /carbon/crop-types/dropdown/, whose serializer
                        (CropTypeDropdownSerializer) returns exactly id, name, category, slug —
                        so the description was always blank and every farmer who picked a crop
                        was shown the literal string "Emissions: undefined kg CO2e/ha".

                        Not restored by widening the endpoint, either: emissions_per_hectare is
                        a generic crop-type benchmark, and printing it under this farm's crop
                        selection reads as a figure for THIS block. It is also where the
                        `green.600` body text lived — a boundary colour at 4.12:1, below the
                        4.5 glyphs owe.
                      */}
                    </StandardField>
                  </GridItem>

                  <GridItem>
                    <StandardField
                      label={intl.formatMessage({ id: 'quickStart.field.name' })}
                      required
                      error={errors.name?.message}>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            maxLength={150}
                            placeholder={intl.formatMessage({
                              id: 'quickStart.field.name.placeholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>
                  </GridItem>

                  <GridItem>
                    <StandardField
                      label={intl.formatMessage({ id: 'quickStart.field.startDate' })}
                      required
                      error={errors.start_date?.message}>
                      <Controller
                        name="start_date"
                        control={control}
                        render={({ field }) => <StandardInput {...field} type="date" />}
                      />
                    </StandardField>
                  </GridItem>

                  <GridItem>
                    <StandardField
                      label={intl.formatMessage({ id: 'quickStart.field.expectedHarvest' })}
                      error={errors.expected_harvest?.message}>
                      <Controller
                        name="expected_harvest"
                        control={control}
                        render={({ field }) => <StandardInput {...field} type="date" />}
                      />
                    </StandardField>
                  </GridItem>

                  <GridItem>
                    <StandardField
                      label={intl.formatMessage({ id: 'quickStart.field.productionType' })}
                      required>
                      <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="OR">
                              {intl.formatMessage({
                                id: 'quickStart.field.productionType.orchard'
                              })}
                            </option>
                            <option value="GA">
                              {intl.formatMessage({ id: 'quickStart.field.productionType.garden' })}
                            </option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  </GridItem>

                  <GridItem>
                    <StandardField
                      label={intl.formatMessage({ id: 'quickStart.field.productionMethod' })}
                      required
                      error={
                        errors.production_method
                          ? intl.formatMessage({ id: 'quickStart.field.productionMethod.required' })
                          : undefined
                      }>
                      <Controller
                        name="production_method"
                        control={control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="" disabled>
                              {intl.formatMessage({
                                id: 'quickStart.field.productionMethod.placeholder'
                              })}
                            </option>
                            {PRODUCTION_METHOD_CHOICES.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  </GridItem>

                  <GridItem>
                    <StandardField
                      label={
                        <>
                          {areaLabel}
                          {currentParcel?.area && (
                            <Badge ml={2} colorScheme="green" variant="subtle">
                              {intl.formatMessage({ id: 'quickStart.field.area.badgeAutoLoaded' })}
                            </Badge>
                          )}
                        </>
                      }
                      helpText={
                        currentParcel?.area
                          ? intl.formatMessage({ id: 'quickStart.field.area.helpLoaded' })
                          : intl.formatMessage({ id: 'quickStart.field.area.helpUnset' })
                      }>
                      {/*
                        The empty state used to be an editable NumberInput, and it was a lie:
                        `areaInput` fed nothing but the read-out beside it. It was never added
                        to the create or update payload and never reached a carbon
                        calculation, so a farmer could type their real acreage, watch the
                        number change, submit, and have it silently discarded. Its placeholder
                        also said "in hectares" while the label above said "(acres)" for every
                        US farm — so the one number they could type was in the wrong unit too.

                        Area is the PARCEL's fact and the parcel form already owns it (and
                        already converts acres → the hectares storage layer). One editor per
                        fact: this field reports, it does not collect.
                      */}
                      <StandardInput
                        value={
                          currentParcel?.area
                            ? areaDisplayValue
                            : intl.formatMessage({ id: 'quickStart.field.area.notSet' })
                        }
                        isReadOnly
                        bg="gray.50"
                        cursor="not-allowed"
                      />
                    </StandardField>
                  </GridItem>

                  {/* NOTE: Irrigation Method removed - already captured at establishment level */}

                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <StandardField
                      label={intl.formatMessage({ id: 'quickStart.field.description' })}>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <StandardTextarea
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'quickStart.field.description.placeholder'
                            })}
                            rows={3}
                          />
                        )}
                      />
                    </StandardField>
                  </GridItem>
                </Grid>
              </VStack>
            </StandardCard>

            {/* Pre-configured Events - Only show in create mode.
                No `data-tour` here any more: this block appears only AFTER a template has been
                applied, so a tour step pointing at it could never run at the same time as the
                two steps that matter on arrival (crop, templates). It explains itself with the
                helper note below. See src/tours/productionTour.ts. */}
            {!isEdit && planSuggestions.length > 0 && (
              <Box>
                <StandardCard
                  title={intl.formatMessage({ id: 'quickStart.plan.title' })}
                  subtitle={intl.formatMessage({ id: 'quickStart.plan.subtitle' })}>
                  {/* Helper note */}
                  <Box
                    p={3}
                    mb={4}
                    bg="green.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="green.100">
                    <Text fontSize="xs" color="green.700">
                      {intl.formatMessage({ id: 'quickStart.plan.helperNote' })}
                    </Text>
                  </Box>

                  {planSuggestions.length > 0 &&
                    !planSuggestions.some((event) => event.enabled) && (
                      <Text
                        fontSize="sm"
                        color="gray.700"
                        mb={2}
                        data-testid="quickstart-plan-nothing-ticked">
                        {intl.formatMessage({ id: 'quickStart.plan.nothingTicked' })}
                      </Text>
                    )}
                  {/* Master Switch Controls */}
                  <HStack justify="space-between" mb={4} p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" color="gray.600">
                      {intl.formatMessage(
                        { id: 'quickStart.plan.selectedCount' },
                        {
                          selected: planSuggestions.filter((event) => event.enabled).length,
                          total: planSuggestions.length
                        }
                      )}
                    </Text>
                    <HStack spacing={3}>
                      <Switch
                        isChecked={allSelectableSuggestionsEnabled}
                        onChange={handleToggleAll}
                        colorScheme="green"
                        size="md"
                      />
                      <Text fontSize="sm" fontWeight="medium" color="gray.700">
                        {intl.formatMessage({
                          id: allSelectableSuggestionsEnabled
                            ? 'quickStart.events.unselectAll'
                            : 'quickStart.events.selectAll'
                        })}
                      </Text>
                    </HStack>
                  </HStack>
                  <VStack spacing={4} align="stretch">
                    {planSuggestions.map((event) => {
                      // 2026-08-21: crop templates are generic, so an ORGANIC carrot season was
                      // offered "Herbicide Application" and "Fungicide Treatment" as ordinary
                      // suggestions — no badge, no disabled toggle, nothing. Ticking one counted
                      // it in "n of 14 practices on your plan" and then the server dropped it
                      // (season_plan_service.is_prohibited_suggestion), so the count the farmer
                      // read was never the plan they got. The server rule is the rule; the row
                      // has to say so rather than let them toggle a thing that cannot happen.
                      const prohibited = isProhibitedSuggestion(
                        event,
                        watchedProductionMethod || farmDefaultMethod || ''
                      );
                      return (
                        <Box
                          key={event.id}
                          p={4}
                          bg={event.enabled ? 'gray.50' : 'gray.100'}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={event.enabled ? 'gray.200' : 'gray.300'}
                          opacity={event.enabled ? 1 : 0.6}>
                          <HStack justify="space-between" mb={2}>
                            <HStack>
                              <Switch
                                isChecked={event.enabled && !prohibited}
                                isDisabled={prohibited}
                                onChange={() => handleSuggestionToggle(event.id)}
                                colorScheme="green"
                              />
                              <VStack align="start" spacing={0}>
                                <HStack spacing={2}>
                                  <Text fontWeight="bold">{event.name}</Text>
                                  {prohibited && (
                                    <Badge variant="warning" fontSize="xs" textTransform="none">
                                      {intl.formatMessage({
                                        id: 'quickStart.plan.prohibitedBadge'
                                      })}
                                    </Badge>
                                  )}
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                  {prohibited
                                    ? intl.formatMessage({ id: 'quickStart.plan.prohibitedHelp' })
                                    : event.frequency}
                                </Text>
                              </VStack>
                            </HStack>
                            {/* A date picker used to sit here, pre-filled with the 15th of the
                              window's first month, and the row was saved as a dated record.
                              Nothing on a plan carries a day: the operator supplies the real
                              date when they log the activity. A CO2e estimate was here too —
                              an emissions figure for something that has not happened yet. */}
                            <VStack align="end" spacing={0}>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({ id: 'quickStart.plan.expectedWindow' })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                {event.timing ||
                                  intl.formatMessage({ id: 'quickStart.plan.windowAsNeeded' })}
                              </Text>
                            </VStack>
                          </HStack>
                          {event.efficiency_tips && (
                            <Box mt={2} p={2} bg="gray.50" borderRadius="sm">
                              <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={1}>
                                {intl.formatMessage({ id: 'quickStart.events.efficiencyTips' })}
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                <Icon as={FaCheckCircle} color="green.400" mr={1} />
                                {event.efficiency_tips}
                              </Text>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </VStack>
                </StandardCard>
              </Box>
            )}
            {/*
              ONE action bar, pinned to the bottom of the viewport.

              There were THREE action rows before — edit-mode, a create-mode "fallback" for when
              no template was chosen, and a third nested INSIDE the season-plan card. Which one
              you got depended on `planSuggestions.length`, so choosing a template did not just
              lengthen the page, it MOVED the commit button.

              MEASURED at 375x667 with the 25-practice apple template: the page ran 9,630px and
              "Start Production" sat at y=9,388 — about fourteen screens down. On 1800x1000 it
              was 5.7 screens. The plan list is data-dependent (22 practices organic, 25
              conventional, other crops differ), so the distance is unbounded from the farmer's
              side. A commit control cannot live at the end of a list whose length is data.
            */}
            {/* Spacer so the last card is never hidden behind the fixed bar. */}
            <Box h="72px" aria-hidden="true" />
            {/*
              `fixed`, not `sticky`, and that is not a preference.
              MEASURED: `.trazo-main-panel` (components/Layout/MainPanel.tsx) sets
              `overflowY="auto"` with `maxHeight="100%"`, so it sizes to its content and never
              scrolls — scrollHeight === clientHeight === 9671 here, the WINDOW is the scroller.
              But an overflow value other than `visible` still makes it the sticky containing
              scrollport, so `position: sticky` on any descendant never engages. Flipping it is
              not safe either: `overflowX="hidden"` forces the other axis to compute non-visible,
              and that clamp is what keeps wide tables from scrolling the page sideways.
              `left` tracks the sidebar the same way MainPanel does, via --sidebar-width at xl.
            */}
            <Box
              position="fixed"
              bottom={0}
              right={0}
              left={{ base: 0, xl: 'var(--sidebar-width, 275px)' }}
              zIndex={10}
              py={3}
              px={{ base: 3, md: 6 }}
              bg="white"
              borderTopWidth="1px"
              borderColor="gray.200">
              <HStack spacing={3} justify="flex-end">
                <StandardButton
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}>
                  {intl.formatMessage({ id: 'app.cancel' })}
                </StandardButton>
                <StandardButton
                  type="submit"
                  size="sm"
                  isLoading={isCreating || isUpdating}
                  loadingText={intl.formatMessage({
                    id: isEdit ? 'quickStart.action.updating' : 'quickStart.action.creating'
                  })}
                  leftIcon={isEdit ? <FaCheckCircle /> : <FaRocket />}>
                  {intl.formatMessage({
                    id: isEdit ? 'quickStart.action.update' : 'quickStart.action.start'
                  })}
                </StandardButton>
              </HStack>
            </Box>
          </VStack>
        </form>

        {/* Template Selection Modal — bottom sheet below `md`, centered modal above */}
        <ResponsiveModal
          isOpen={isTemplateOpen}
          onClose={onTemplateClose}
          size="4xl"
          header={
            <VStack align="start" spacing={2}>
              <HStack>
                <Icon as={FaRocket} color="green.500" />
                <Heading size={{ base: 'md', md: 'lg' }}>
                  {intl.formatMessage({ id: 'production.templateModal.title' })}
                </Heading>
              </HStack>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                {selectedCropName ? (
                  <FormattedMessage
                    id="production.templateModal.subtitle"
                    values={{
                      crop: selectedCropName,
                      count: filteredTemplates.length,
                      highlight: (chunks: React.ReactNode) => (
                        <Text as="span" fontWeight="semibold" color="green.700">
                          {chunks}
                        </Text>
                      )
                    }}
                  />
                ) : (
                  intl.formatMessage({ id: 'production.templateModal.subtitleGeneric' })
                )}
              </Text>
            </VStack>
          }
          footer={
            /* The label says what closing actually does. Picking a card applies it and closes
               the modal immediately, so there is never a pending change to "cancel" — and a
               farmer who opened the picker and wants none of these templates had no obvious
               way out. With a template already applied, closing keeps it, and "Cancel" is
               right; with none, closing means starting the season without one. */
            <HStack spacing={2}>
              {/* With a template applied, "Cancel" closes and KEEPS it — so this was a picker
                  you could enter but not leave empty-handed. The remove action is the way out. */}
              {selectedTemplate && (
                <StandardButton variant="ghost" onClick={handleTemplateRemove}>
                  {intl.formatMessage({ id: 'quickStart.templates.remove' })}
                </StandardButton>
              )}
              <StandardButton variant="ghost" onClick={onTemplateClose}>
                {intl.formatMessage({
                  id: selectedTemplate ? 'app.cancel' : 'production.templateModal.continueWithout'
                })}
              </StandardButton>
            </HStack>
          }>
          {filteredTemplates.length > 0 ? (
            <Grid templateColumns="repeat(auto-fit, minmax(min(320px, 100%), 1fr))" gap={6}>
              {filteredTemplates.map((template) => {
                const CropIcon = getCropIcon(template.crop_type);
                const isSelected = selectedTemplate?.template_id === template.template_id;
                return (
                  <Box
                    key={template.template_id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    p={4}
                    borderWidth="1px"
                    borderRadius="15px"
                    borderColor={isSelected ? 'green.700' : cardBorderColor}
                    bg={isSelected ? selectedCardBg : cardBg}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      transform: 'translateY(-2px)',
                      shadow: 'lg'
                    }}
                    // A bare Box gets no focus ring from Chakra's button styles, so a
                    // keyboard user tabbing the list would have no idea where they are.
                    _focusVisible={{
                      outline: '2px solid',
                      outlineColor: 'green.600',
                      outlineOffset: '2px'
                    }}
                    onClick={() => handleTemplateSelect(template)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTemplateSelect(template);
                      }
                    }}>
                    <HStack justify="space-between" align="start" mb={3} spacing={3}>
                      <HStack align="start" spacing={2} minW={0}>
                        <Icon as={CropIcon} color="green.500" boxSize={5} mt={1} flexShrink={0} />
                        <VStack align="start" spacing={0} minW={0}>
                          <Heading size="sm">{template.name}</Heading>
                          <Text fontSize="sm" color="gray.600">
                            {template.crop_type
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge variant="subtle" flexShrink={0}>
                        {intl.formatMessage(
                          { id: 'production.templateModal.eventsCount' },
                          { count: template.events_count }
                        )}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.700" mb={4} noOfLines={3}>
                      {template.description}
                    </Text>
                    {/* ONE fact about the template, as a theme Badge.
                        What was here: an `FaChartLine` icon over "Transparency"/"Audit-Ready"
                        in 12px medium, with "QR Ready"/"NOP Compliant" under it in 14px bold —
                        two different typographic treatments impersonating a badge pair, on
                        neither the theme's Badge nor any other standard component, with a
                        line-chart glyph standing in for "audit".
                        Worse than the styling: a template is not NOP compliant, audit-ready or
                        QR ready. A farm's RECORDS may become those things. Printing them on a
                        template the farmer has not even picked promises the outcome before any
                        work is done — the same reason "Setup Time: 8 minutes" was deleted from
                        this card, and the same claim shape .claude/rules/compliance.md rules
                        out. The farming approach IS a fact about the template. */}
                    <Badge
                      variant={template.system_type === 'organic' ? 'subtle' : 'neutral'}
                      // Chakra's Badge baseStyle capitalises; the `neutral` variant overrides
                      // that with 'none' and `subtle` does not, so the same label rendered
                      // "Organic Programme" beside "Conventional programme". Casing must not
                      // be decided by which semantic variant a row happens to get.
                      textTransform="none">
                      {intl.formatMessage({
                        id: `production.templateModal.approach.${
                          template.system_type || 'conventional'
                        }`,
                        defaultMessage: template.system_type || 'conventional'
                      })}
                    </Badge>
                  </Box>
                );
              })}
            </Grid>
          ) : (
            <VStack spacing={4} py={8} textAlign="center">
              <Icon as={FaSeedling} boxSize={12} color="gray.500" />
              <VStack spacing={2}>
                <Heading size="md" color="gray.600">
                  {intl.formatMessage({ id: 'production.templateModal.emptyTitle' })}
                </Heading>
                <Text color="gray.500" maxW="400px">
                  {selectedCropName
                    ? intl.formatMessage(
                        { id: 'production.templateModal.emptyForCrop' },
                        { crop: selectedCropName }
                      )
                    : intl.formatMessage({ id: 'production.templateModal.emptyNoCrop' })}
                </Text>
              </VStack>
              <StandardButton variant="outline" onClick={onTemplateClose} leftIcon={<FaEdit />}>
                {intl.formatMessage({ id: 'production.templateModal.continueWithout' })}
              </StandardButton>
            </VStack>
          )}
        </ResponsiveModal>
      </StandardPage>
    </WriteAccessGuard>
  );
};

export default QuickStartProduction;
