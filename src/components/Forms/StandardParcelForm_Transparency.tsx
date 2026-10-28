import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFurthestStep } from 'hooks/useFurthestStep';
import {
  VStack,
  HStack,
  SimpleGrid,
  useToast,
  Text,
  Box,
  Flex,
  Icon,
  Modal,
  ModalContent,
  ModalOverlay
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardButton,
  StandardAlert,
  StandardStepper
} from '../Design';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number, array } from 'zod';
import { useIntl } from 'react-intl';
import type { IntlShape } from 'react-intl';
import { googleMapsLoaderOptions } from 'components/Map/mapsLoaderOptions';
import { outlinesOverlap, polygonAreaHectares, toLatLngPath } from 'utils/parcelPolygon';
import type { LatLng } from 'utils/parcelPolygon';
import { ParcelBoundaryEditor } from 'components/Map/ParcelBoundaryEditor';
import { useLoadScript } from '@react-google-maps/api';
import { TrazoImageUpload } from '../Upload';
import {
  FaMapMarkedAlt,
  FaBuilding,
  FaCheckCircle,
  FaChevronRight,
  FaChevronLeft,
  FaTrash,
  FaCamera,
  FaExpand,
  FaExclamationTriangle
} from 'react-icons/fa';
import { MdInfo } from 'react-icons/md';
import {
  StandardInput,
  StandardTextarea,
  StandardDecimalInput
} from 'components/Design/StandardComponents';

// A zod schema at MODULE SCOPE is untranslatable by construction — its messages are frozen
// at import, before any locale exists, and they surface twice: under the field via
// `errors.<field>.message` and inside the onInvalidSubmit toast. Built from `intl` instead,
// memoised on locale.
const buildParcelSchema = (intl: IntlShape) =>
  object({
    // Step 1: Identity (Required)
    name: string()
      .min(1, intl.formatMessage({ id: 'parcel.validation.nameRequired' }))
      .max(100, intl.formatMessage({ id: 'parcel.validation.nameTooLong' })),
    area: number().min(0.01, intl.formatMessage({ id: 'parcel.validation.areaPositive' })),

    // Step 2: Location (polygon validated separately)

    // Step 3: Parcel description (Required)
    transparency_description: string().min(
      3,
      intl.formatMessage({ id: 'parcel.validation.descriptionRequired' })
    ),
    sustainability_practices: string().optional(),

    // Step 4: Visual Documentation (Optional)
    images: array(string()).max(5).optional()
  });

const HECTARES_PER_ACRE = 0.404686;
// Below this the outline and the typed area agree as well as a tap on a phone can.
const AREA_GAP_TO_MENTION = 0.15;

// Utility functions for polygon calculations (same as original)
const calculatePolygonCenter = (points: Array<{ lat: number; lng: number }>) => {
  if (!points || points.length === 0) {
    return { lat: 36.7378, lng: -119.7871 }; // Fresno, CA default
  }

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

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return { lat: centerLat, lng: centerLng };
};

const calculatePolygonZoom = (points: Array<{ lat: number; lng: number }>) => {
  if (!points || points.length === 0) {
    return 13;
  }

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

  const latSpan = Math.abs(maxLat - minLat);
  const lngSpan = Math.abs(maxLng - minLng);
  const maxSpan = Math.max(latSpan, lngSpan);
  const paddedSpan = maxSpan * 1.4;

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

// 🎯 TRANSPARENCY-FOCUSED Interface
interface TransparencyParcelFormData {
  // Core transparency fields
  name: string;
  area: number;
  transparency_description: string;
  sustainability_practices?: string;

  // Visual documentation
  images?: string[];

  // System fields (inherited from original for backend compatibility)
  polygon?: Array<{ lat: number; lng: number }>;
  map_metadata?: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  establishment?: number;

  // Legacy fields for backend compatibility (hidden from UI)
  description?: string;
  contact_phone?: string;
  contact_person?: string;
  contact_email?: string;
  address?: string;
  unique_code?: string;
}

interface StandardParcelFormTransparencyProps {
  onSubmit: (data: TransparencyParcelFormData) => void;
  onCancel: () => void;
  /** Header Back label naming where `onCancel` goes. The footer has its own previous-step
      control, so a bare "Back" up here is ambiguous. Defaults to "Back". */
  backLabel?: React.ReactNode;
  initialData?: Partial<TransparencyParcelFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
  establishmentName?: string;
  // GPS coordinates from parent establishment to center map when creating new parcel
  establishmentCoordinates?: { lat: number; lng: number };
  /**
   * The farm's postal address, looked up on the boundary map when the farm has no coordinates.
   * `undefined` while the farm loads; an empty string when it has no address on file.
   */
  establishmentAddress?: string;
  // Optional informational content (e.g., plan-limit warning) rendered above the stepper
  preFormAlert?: React.ReactNode;
  /** Open on this step (the parcel page's "Edit outline" opens the boundary step). */
  initialStep?: number;
  /**
   * The farm's OTHER parcels with an outline, drawn read-only on the boundary map so a new or
   * edited outline can be placed against its neighbours. They take no clicks: a click on one
   * still adds a point to the outline being drawn.
   */
  otherParcels?: Array<{ id: number; name: string; path: Array<{ lat: number; lng: number }> }>;
  /**
   * Opened to change the outline only (the parcel page's shortcut): the boundary step saves
   * directly. The other steps' fields are the parcel's stored values, sent back unchanged, so
   * a gate on another step (a description a quick-added parcel never had) cannot stand
   * between the grower and the outline they came to fix.
   */
  saveFromBoundary?: boolean;
}

export const StandardParcelFormTransparency: React.FC<StandardParcelFormTransparencyProps> = ({
  onSubmit,
  onCancel,
  backLabel,
  initialData,
  isLoading = false,
  isEdit = false,
  establishmentName = '',
  establishmentCoordinates,
  establishmentAddress,
  preFormAlert,
  initialStep = 0,
  otherParcels = [],
  saveFromBoundary = false
}) => {
  const intl = useIntl();
  // Rebuilt when the locale changes, so a language switch retranslates the field errors.
  const transparencyParcelSchema = useMemo(() => buildParcelSchema(intl), [intl]);

  const methods = useForm<TransparencyParcelFormData>({
    resolver: zodResolver(transparencyParcelSchema),
    defaultValues: {
      name: '',
      area: 0,
      transparency_description: '',
      sustainability_practices: '',
      images: [],
      // `certified` / `certification_type` removed 2026-08-17. They lived ONLY here: absent
      // from transparencyParcelSchema, absent from TransparencyParcelFormData, and rendered
      // by no input in any of the four steps. Their only effect was to seed AddParcel's
      // payload with a hardcoded `certified: false` on every create — a claim field asserted
      // by a form that never asked. Certifications are structured records
      // (CertificationManager); see the note in AddParcel.handleSubmit.
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

  const [currentStep, setCurrentStep] = useState(initialStep);
  const furthestStep = useFurthestStep(currentStep);
  const [polygon, setPolygon] = useState<Array<{ lat: number; lng: number }>>(
    toLatLngPath(initialData?.polygon)
  );
  // Every outline before the current one, newest last: Undo walks back through adds, moves,
  // deletes and Clear alike. "Undo last point" only ever removed the last corner ADDED, so a
  // dragged corner or a cleared outline had no way back.
  const [polygonHistory, setPolygonHistory] = useState<LatLng[][]>([]);
  // The full-screen editor (a phone's whole screen for the map, Undo within thumb's reach).
  // Closing it remounts the inline map where the grower left the full-screen one.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inlineMapKey, setInlineMapKey] = useState(0);
  // The dialog focuses Done on open. Left to Chakra it focused the first enabled button, which
  // with nothing to undo is Clear boundary: one Enter away from wiping the outline.
  const fullscreenDoneRef = useRef<HTMLButtonElement>(null);
  // Escape hatch: farmer chose to save without drawing a boundary (can draw it later)
  const [boundarySkipped, setBoundarySkipped] = useState(false);

  const getPolygonLength = () => (polygon && Array.isArray(polygon) ? polygon.length : 0);
  const isValidPolygon = () => getPolygonLength() >= 3;

  const [mapCenter, setMapCenter] = useState(() => {
    // Priority 1: Use establishment coordinates (centers map near the farm)
    if (establishmentCoordinates) {
      return establishmentCoordinates;
    }
    // Priority 2: Use existing parcel map center (edit mode fallback)
    if (initialData?.map_metadata?.center) {
      return initialData.map_metadata.center;
    }
    // Priority 3: Calculate from existing polygon (edit mode fallback)
    if (polygon.length > 0) {
      return calculatePolygonCenter(polygon);
    }
    // Fallback: Default to Fresno, CA (Central Valley agricultural region)
    return { lat: 36.7378, lng: -119.7871 };
  });

  const [mapZoom, setMapZoom] = useState(() => {
    if (initialData?.map_metadata?.zoom) {
      return initialData.map_metadata.zoom;
    }
    if (polygon.length > 0) {
      return calculatePolygonZoom(polygon);
    }
    // Field scale: 13 showed a whole valley, and every grower's first job was to zoom in.
    return 16;
  });
  // The camera as the grower last left it, recorded as `map_metadata`. A ref, not state: the
  // editor owns the camera, and feeding it back as a prop is what made the map jump. Null
  // until the editor reports one: until then (the map has not loaded, or failed to) the
  // record is the live `mapCenter`/`mapZoom`, which follow the farm's coordinates and the saved
  // metadata as they arrive. Seeding the ref at mount saved the placeholder instead.
  const mapViewRef = useRef<{ center: LatLng; zoom: number } | null>(null);
  const currentMapView = () => mapViewRef.current ?? { center: mapCenter, zoom: mapZoom };
  // Nothing on file says where this farm is: no coordinates, no saved map, no outline. The map
  // centre is then a placeholder, and the editor says so instead of opening on it.
  const farmLocationUnknown =
    !establishmentCoordinates && !initialData?.map_metadata?.center && polygon.length === 0;

  // 🗺️ Update map center when establishment coordinates become available (async load fix)
  useEffect(() => {
    // Only update if we have establishment coordinates AND no existing polygon (new parcel)
    if (establishmentCoordinates && (!polygon || polygon.length === 0)) {
      setMapCenter(establishmentCoordinates);
    }
  }, [establishmentCoordinates, polygon]);

  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const currentImages = watch('images') || [];
  const toast = useToast();

  // Language follows the APP's locale, not the browser's — see mapsLoaderOptions.
  const loaderOptions = useMemo(() => googleMapsLoaderOptions(intl.locale), [intl.locale]);
  const { isLoaded, loadError } = useLoadScript(loaderOptions);

  // 🎯 SIMPLIFIED 4-STEP TRANSPARENCY STRUCTURE
  // `shortTitle` is what a phone column shows (below `md`); `title` still shows wherever
  // there is room. Without it these two wrap past the two-line clamp and lose words.
  const steps = [
    {
      title: intl.formatMessage({ id: 'parcel.wizard.step.identityTitle' }),
      shortTitle: intl.formatMessage({ id: 'parcel.wizard.step.identityShort' }),
      description: intl.formatMessage({ id: 'parcel.wizard.step.identityDesc' }),
      icon: FaBuilding,
      required: true
    },
    {
      title: intl.formatMessage({ id: 'parcel.wizard.step.locationTitle' }),
      description: intl.formatMessage({ id: 'parcel.wizard.step.locationDesc' }),
      icon: FaMapMarkedAlt,
      // The boundary is deferrable — `nextStep` records the deferral instead of blocking.
      // Marking it required here would print a red asterisk over a step you may skip.
      required: false
    },
    {
      title: intl.formatMessage({ id: 'parcel.wizard.step.descriptionTitle' }),
      description: intl.formatMessage({ id: 'parcel.wizard.step.descriptionDesc' }),
      icon: MdInfo,
      required: true
    },
    {
      title: intl.formatMessage({ id: 'parcel.wizard.step.photosTitle' }),
      shortTitle: intl.formatMessage({ id: 'parcel.wizard.step.photosShort' }),
      description: intl.formatMessage({ id: 'parcel.wizard.step.photosDesc' }),
      icon: FaCamera,
      required: false
    }
  ];

  // Step validation for transparency focus
  const validateStep = (stepNumber: number, formData: any): boolean => {
    switch (stepNumber) {
      case 0:
        return !!(formData.name && formData.name.trim() && formData.area > 0);
      case 1:
        return isValidPolygon() || boundarySkipped;
      case 2:
        // Braced: `case` shares one block scope, so bare `const` here leaks across the other
        // arms and trips no-case-declarations.
        return (formData.transparency_description || '').trim().length >= 3;
      case 3:
        return true; // Optional step
      default:
        return true;
    }
  };

  const isStepComplete = (step: number) => {
    const currentFormData = watch();
    const result = validateStep(step, currentFormData);
    return result;
  };

  const getCompletedSteps = () => {
    const completed = [];
    for (let i = 0; i < currentStep; i++) {
      if (isStepComplete(i)) {
        completed.push(i);
      }
    }
    return completed;
  };

  // Names the field that is actually blocking, so the toast says "Enter the parcel
  // area in acres" rather than the generic "complete all required fields".
  const blockingReason = (stepNumber: number, formData: any): string | null => {
    switch (stepNumber) {
      case 0:
        if (!formData.name || !formData.name.trim())
          return intl.formatMessage({ id: 'parcel.wizard.blocked.name' });
        if (!(formData.area > 0)) return intl.formatMessage({ id: 'parcel.wizard.blocked.area' });
        return null;
      // case 1 (map) is deliberately absent: the boundary is deferrable, so Continue must
      // never bounce here. Until 2026-09-08 it did — and the ghost "Continue without
      // boundary" link below the map was the ONLY control that actually advanced. The
      // primary button looked like the way forward and was the dead one.
      case 2:
        return (formData.transparency_description || '').trim().length >= 3
          ? null
          : intl.formatMessage({ id: 'parcel.wizard.blocked.description' });
      default:
        return null;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const formData = watch();
      const reason = blockingReason(currentStep, formData);

      if (reason) {
        toast({
          title: intl.formatMessage({ id: 'parcel.wizard.blocked.title' }),
          description: reason,
          status: 'warning',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      // Leaving the map step without a closed outline records the deferral (and drops any
      // 1-2 stray points, which `safePolygon` would discard at submit anyway) so the
      // boundary nudge on the parcel profile knows to ask again.
      if (currentStep === 1 && !isValidPolygon()) {
        deferBoundary();
      }

      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Record that the parcel is being saved without a closed boundary. Not a navigation
  // action — `nextStep` owns advancing, so there is exactly one Continue on this step.
  const deferBoundary = () => {
    setBoundarySkipped(true);
    setPolygon([]);
    setValue('polygon', []);
    setValue('map_metadata', currentMapView());
  };

  const editPolygon = (next: LatLng[]) => {
    setPolygonHistory((history) => [...history, polygon]);
    setPolygon(next);
    setValue('polygon', next);
  };

  const undo = () => {
    const previous = polygonHistory[polygonHistory.length - 1];
    if (!previous) return;
    setPolygonHistory((history) => history.slice(0, -1));
    setPolygon(previous);
    setValue('polygon', previous);
  };

  const clearBoundary = () => editPolygon([]);

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setInlineMapKey((key) => key + 1);
  };

  const onMapViewChange = (view: { center: LatLng; zoom: number }) => {
    mapViewRef.current = view;
    setValue('map_metadata', view);
  };

  // What the outline measures, next to what was typed on the first step. Not a gate: the
  // planted area a certifier asks for can honestly differ from the fence line (headlands,
  // roads, a ditch), so a big gap is pointed out, never blocked or "fixed" for the grower.
  const enteredHectares = Number(watch('area')) || 0;
  const drawnHectares = polygonAreaHectares(polygon);
  const areaGap =
    isValidPolygon() && enteredHectares > 0
      ? (drawnHectares - enteredHectares) / enteredHectares
      : 0;
  // Parcels on one farm that share ground (not just a fence) are counted twice in every
  // acreage total a certifier adds up.
  const overlapped = isValidPolygon()
    ? otherParcels.filter((other) => outlinesOverlap(polygon, other.path)).map((o) => o.name)
    : [];

  // One STATUS strip, no second CTA. What used to sit here was a green "Polygon Points /
  // Valid Polygon" box (jargon, and a `Badge colorScheme` that the theme ignores) plus a ghost
  // "Continue without boundary" button that competed with the footer's own Continue for the
  // same destination. State is reported here; advancing is the footer's single job. The
  // full-screen editor shows the same strip under its map, with its own Done.
  const renderBoundaryStatus = (done?: React.ReactNode) => (
    <Box
      p={4}
      borderRadius="lg"
      bg={isValidPolygon() ? 'green.50' : getPolygonLength() > 0 ? 'amber.50' : 'gray.50'}>
      <VStack align="stretch" spacing={2}>
        <Text
          fontSize="sm"
          fontWeight="semibold"
          // amber.800/900 over amber.50 measures 2.90:1 / 3.57:1 — both under the
          // 4.5 floor for 14px, so the amber tint carries the status and the
          // glyphs stay on a dark neutral. The sentence states the state outright,
          // so nothing here is signalled by colour alone.
          color={isValidPolygon() ? 'green.700' : 'gray.800'}>
          {isValidPolygon()
            ? intl.formatMessage(
                { id: 'parcel.boundary.statusDone' },
                { count: getPolygonLength() }
              )
            : getPolygonLength() > 0
            ? intl.formatMessage(
                { id: 'parcel.boundary.statusPartial' },
                { count: getPolygonLength() }
              )
            : intl.formatMessage({ id: 'parcel.boundary.statusNone' })}
        </Text>
        {isValidPolygon() && (
          <Text fontSize="sm" color="gray.800">
            {intl.formatMessage(
              { id: 'parcel.boundary.measured' },
              {
                acres: intl.formatNumber(drawnHectares / HECTARES_PER_ACRE, {
                  maximumFractionDigits: 1
                }),
                ha: intl.formatNumber(drawnHectares, { maximumFractionDigits: 1 })
              }
            )}
          </Text>
        )}
        {Math.abs(areaGap) > AREA_GAP_TO_MENTION && (
          <HStack align="start" spacing={2}>
            <Icon as={FaExclamationTriangle} color="amber.600" mt="3px" aria-hidden />
            <Text fontSize="sm" color="gray.800">
              {intl.formatMessage(
                { id: 'parcel.boundary.areaGap' },
                {
                  pct: Math.round(Math.abs(areaGap) * 100),
                  direction: areaGap > 0 ? 'more' : 'less',
                  entered: intl.formatNumber(enteredHectares / HECTARES_PER_ACRE, {
                    maximumFractionDigits: 1
                  })
                }
              )}
            </Text>
          </HStack>
        )}
        {overlapped.length > 0 && (
          <HStack align="start" spacing={2}>
            <Icon as={FaExclamationTriangle} color="amber.600" mt="3px" aria-hidden />
            <Text fontSize="sm" color="gray.800">
              {intl.formatMessage(
                { id: 'parcel.boundary.overlap' },
                { names: intl.formatList(overlapped, { type: 'conjunction' }) }
              )}
            </Text>
          </HStack>
        )}

        {!isValidPolygon() && (
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'parcel.skipBoundary.caption' })}
          </Text>
        )}

        {(getPolygonLength() > 0 || polygonHistory.length > 0) && (
          <HStack spacing={2} pt={1}>
            <StandardButton
              size="sm"
              variant="outline"
              onClick={undo}
              isDisabled={polygonHistory.length === 0}>
              {intl.formatMessage({ id: 'parcel.boundary.undo' })}
            </StandardButton>
            {getPolygonLength() > 0 && (
              <StandardButton
                size="sm"
                variant="outline"
                leftIcon={<FaTrash />}
                onClick={clearBoundary}>
                {intl.formatMessage({ id: 'parcel.boundary.clear' })}
              </StandardButton>
            )}
          </HStack>
        )}
        {done}
      </VStack>
    </Box>
  );

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
  };

  // Form effects (similar to original)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset(initialData);

      if (initialData.polygon) {
        // A seeded parcel stores GeoJSON; `[...polygon, newPoint]` on a map click threw
        // `polygon is not iterable`. See toLatLngPath.
        const path = toLatLngPath(initialData.polygon);
        setPolygon(path);
        setValue('polygon', path);
      }

      if (initialData.map_metadata?.center) {
        setMapCenter(initialData.map_metadata.center);
      }

      if (initialData.map_metadata?.zoom) {
        setMapZoom(initialData.map_metadata.zoom);
      }

      if (initialData.images && initialData.images.length > 0) {
        setUploadedImageUrls(initialData.images);
      }
    }
  }, [initialData, reset]);

  const handleImagesChange = useCallback(
    (newImageUrls: string[]) => {
      setUploadedImageUrls(newImageUrls);
      setValue('images', newImageUrls);
    },
    [setValue]
  );

  // Resolver rejected the submit. Jump to the step owning the first bad field and
  // name it — otherwise "Create Parcel" reads as a button that does nothing.
  const STEP_BY_FIELD: Record<string, number> = {
    name: 0,
    area: 0,
    transparency_description: 2,
    sustainability_practices: 2,
    images: 3
  };

  const onInvalidSubmit = (formErrors: Record<string, { message?: string }>) => {
    const badField = Object.keys(formErrors)[0];
    const stepIndex = STEP_BY_FIELD[badField];

    if (stepIndex !== undefined && stepIndex !== currentStep) {
      setCurrentStep(stepIndex);
    }

    toast({
      title: intl.formatMessage({ id: 'parcel.invalid.title' }),
      description:
        formErrors[badField]?.message || intl.formatMessage({ id: 'parcel.invalid.generic' }),
      status: 'error',
      duration: 5000,
      isClosable: true
    });
  };

  const onSubmitForm = (data: TransparencyParcelFormData) => {
    try {
      const imageUrls = data.images && data.images.length > 0 ? data.images : uploadedImageUrls;

      // Guard: only submit a complete boundary. Partial (1-2 point) or skipped
      // boundaries are sent as an empty array so the backend never receives an
      // invalid polygon. mapCenter/mapZoom always have safe defaults.
      const safePolygon = isValidPolygon() ? polygon : [];

      const finalData = {
        ...data,
        polygon: safePolygon,
        map_metadata: currentMapView(),
        images: imageUrls,
        // Legacy fields for backend compatibility
        description: data.transparency_description, // Map transparency to legacy description
        uploaded_image_urls: imageUrls
      };

      onSubmit(finalData as any);
    } catch (error) {
      console.error('❌ Form submission error:', error);
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'parcel.saveError' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <StandardPage
      title={intl.formatMessage({
        id: isEdit ? 'parcel.page.editTitle' : 'parcel.page.addTitle'
      })}
      // Was "Create a parcel for carbon transparency" — carbon is background work here
      // (progressive disclosure), and nothing on these four steps is a carbon input.
      description={[
        intl.formatMessage({
          id: isEdit ? 'parcel.page.editSubtitle' : 'parcel.page.addSubtitle'
        }),
        establishmentName
          ? intl.formatMessage(
              { id: 'parcel.page.inEstablishment' },
              { establishment: establishmentName }
            )
          : ''
      ]
        .filter(Boolean)
        .join(' ')}
      showBackButton
      onBack={onCancel}
      backLabel={backLabel}>
      {/* Optional pre-flight alert (e.g., subscription limit warning) */}
      {preFormAlert}

      {/* Modern Progress Stepper - 4 Steps */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        furthestStep={furthestStep}
        onStepClick={(step) => (step < currentStep ? goToStep(step) : nextStep())}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitForm, onInvalidSubmit)}>
          {/* 🎯 STEP 0: Parcel Identity */}
          {currentStep === 0 && (
            <StandardCard
              title={intl.formatMessage({ id: 'parcel.wizard.step.identityTitle' })}
              subtitle={intl.formatMessage({ id: 'parcel.step.identity.cardSubtitle' })}>
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'parcel.step.identity.nameLabel' })}
                    required
                    error={errors.name?.message}
                    helpText={intl.formatMessage({ id: 'parcel.step.identity.nameHelp' })}>
                    <StandardInput
                      {...methods.register('name')}
                      placeholder={intl.formatMessage({
                        id: 'parcel.step.identity.namePlaceholder'
                      })}
                    />
                  </StandardField>

                  {/*
                    Entered in ACRES, stored in hectares.
                    Trazo's ICP is US specialty-crop farms — a California walnut grower
                    says "42 acres", never "17 hectares". Asking for hectares made them
                    convert by hand, which is friction and an error source. `Parcel.area`
                    stays metric because the carbon calculations depend on it, so we
                    convert on the way in and echo the stored hectares underneath.
                  */}
                  <StandardField
                    label={intl.formatMessage({
                      id: 'parcel.areaAcres',
                      defaultMessage: 'Area (acres)'
                    })}
                    required
                    error={errors.area?.message}
                    helpText={intl.formatMessage({
                      id: 'parcel.areaAcresHelp',
                      defaultMessage:
                        'Total planted area in acres. We store hectares for carbon math.'
                    })}>
                    <Controller
                      name="area"
                      control={methods.control}
                      render={({ field }) => {
                        const acres = field.value ? field.value / HECTARES_PER_ACRE : 0;
                        return (
                          <>
                            {/*
                              MEASURED 2026-08-25 with real keystrokes: typing "14.5" stored
                              **145** acres — 58.68 ha instead of 5.87. This field already had
                              `precision={2}`, which is exactly why it is the proof that
                              precision is NOT the fix: the input was controlled by a number, so
                              "14." was rewritten to "14" before the "5" could land. See the
                              note on StandardDecimalInput.
                            */}
                            <StandardDecimalInput
                              value={acres ? Number(acres.toFixed(2)) : undefined}
                              onChange={(num) =>
                                field.onChange(
                                  num == null ? 0 : Number((num * HECTARES_PER_ACRE).toFixed(4))
                                )
                              }
                              min={0}
                              step={1}
                              // 44px touch target: this is a required field a farmer
                              // fills on a phone in the orchard.
                              placeholder={intl.formatMessage({
                                id: 'parcel.areaAcresPlaceholder',
                                defaultMessage: 'e.g., 42.5'
                              })}
                            />
                            {field.value > 0 && (
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                {intl.formatMessage(
                                  {
                                    id: 'parcel.areaHectaresEquivalent',
                                    defaultMessage: '= {ha} hectares'
                                  },
                                  { ha: Number(field.value).toFixed(2) }
                                )}
                              </Text>
                            )}
                          </>
                        );
                      }}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Reframed 2026-08-07 with the rest of this form. Name, area and crop are
                    what a certifier matches against your OSP and your field records — a
                    wholesale grower's buyer is a packer, not a shopper. */}
                <StandardAlert
                  status="info"
                  title={intl.formatMessage({ id: 'parcel.step.identity.whyTitle' })}
                  // "…by name, area and crop" — this step collects no crop, so the sentence
                  // named a field the form never asks for.
                  description={intl.formatMessage({ id: 'parcel.step.identity.whyBody' })}
                />

                <HStack spacing={3} justify="flex-end" pt={4}>
                  <StandardButton variant="outline" onClick={onCancel}>
                    {intl.formatMessage({ id: 'app.cancel' })}
                  </StandardButton>
                  <StandardButton onClick={nextStep} rightIcon={<FaChevronRight />}>
                    {intl.formatMessage({ id: 'app.continue' })}
                  </StandardButton>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* 🎯 STEP 1: Location (Same as original - works well) */}
          {currentStep === 1 && (
            <StandardCard
              title={intl.formatMessage({ id: 'parcel.boundary.stepTitle' })}
              // Was "Define boundaries for transparency" — same false premise as the alert
              // below: the boundary is withheld from every public page by default, so
              // "transparency" is the one thing it does not serve.
              subtitle={intl.formatMessage({ id: 'parcel.boundary.stepSubtitle' })}>
              <VStack spacing={6} align="stretch">
                {/* The map carried no instructions at all: clicking it adds a point, and
                    nothing on screen said so. */}
                <Text fontSize="sm" color="gray.600">
                  {intl.formatMessage({ id: 'parcel.boundary.drawHint' })}
                </Text>
                {otherParcels.length > 0 && (
                  <Text fontSize="sm" color="gray.600">
                    {intl.formatMessage(
                      { id: 'parcel.boundary.otherParcelsHint' },
                      { count: otherParcels.length }
                    )}
                  </Text>
                )}

                {/* The editor frames its own map (and puts its search above the frame), so
                    only the loading and error states carry a border here. */}
                <Box>
                  {loadError ? (
                    <Flex
                      h="400px"
                      align="center"
                      justify="center"
                      bg="red.50"
                      direction="column"
                      borderRadius="lg">
                      <Text color="red.700" mb={2}>
                        {intl.formatMessage({ id: 'parcel.boundary.mapError' })}
                      </Text>
                      <Text fontSize="sm" color="red.700">
                        {loadError.message}
                      </Text>
                    </Flex>
                  ) : !isLoaded ? (
                    <Flex h="400px" align="center" justify="center" bg="gray.100" borderRadius="lg">
                      <Text>{intl.formatMessage({ id: 'parcel.boundary.mapLoading' })}</Text>
                    </Flex>
                  ) : isFullscreen ? (
                    // Unmounted while the full-screen editor is open, not just hidden behind
                    // it: a hidden map still fitted itself to the outline drawn in full screen
                    // and reported that camera, overwriting where the grower actually was.
                    <Box h="400px" bg="gray.100" borderRadius="lg" />
                  ) : (
                    <ParcelBoundaryEditor
                      key={inlineMapKey}
                      path={polygon}
                      onChange={editPolygon}
                      neighbours={otherParcels}
                      // Re-mounted after full screen: open where the grower left that map.
                      center={inlineMapKey ? currentMapView().center : mapCenter}
                      zoom={inlineMapKey ? currentMapView().zoom : mapZoom}
                      fitOnOpen={inlineMapKey === 0}
                      locationUnknown={farmLocationUnknown}
                      farmAddress={establishmentAddress}
                      onViewChange={onMapViewChange}
                    />
                  )}
                </Box>
                {isLoaded && !loadError && (
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaExpand />}
                    alignSelf="flex-start"
                    onClick={() => setIsFullscreen(true)}>
                    {intl.formatMessage({ id: 'parcel.boundary.openFullscreen' })}
                  </StandardButton>
                )}
                {/* Chakra's Modal, not ResponsiveModal: on a phone that is a swipe-to-dismiss
                    bottom sheet, and here every swipe is meant for the map. */}
                <Modal
                  isOpen={isFullscreen}
                  onClose={closeFullscreen}
                  size="full"
                  initialFocusRef={fullscreenDoneRef}>
                  <ModalOverlay />
                  <ModalContent
                    m={0}
                    h="100dvh"
                    maxH="100dvh"
                    borderRadius={0}
                    aria-label={intl.formatMessage({ id: 'parcel.boundary.stepTitle' })}>
                    {isFullscreen && (
                      <ParcelBoundaryEditor
                        fullscreen
                        path={polygon}
                        onChange={editPolygon}
                        neighbours={otherParcels}
                        center={currentMapView().center}
                        zoom={currentMapView().zoom}
                        fitOnOpen={false}
                        onViewChange={onMapViewChange}
                        footer={renderBoundaryStatus(
                          <StandardButton
                            ref={fullscreenDoneRef}
                            onClick={closeFullscreen}
                            w="full">
                            {intl.formatMessage({ id: 'parcel.boundary.closeFullscreen' })}
                          </StandardButton>
                        )}
                      />
                    )}
                  </ModalContent>
                </Modal>

                {/* 🔴 2026-08-31 — was "Location Transparency / Geographic boundaries help
                    consumers see exactly where their food comes from, building trust through
                    location transparency."

                    Both halves were false. New parcels default to
                    `location_disclosure_level: "approximate"`, and `public_parcel_geo` publishes
                    NO boundary at that level — so a boundary drawn today never reaches a
                    consumer at all. The copy sold a benefit the product's own default forbids,
                    and asked for the most effortful step in onboarding on that basis.

                    What the boundary is actually for is the CERTIFIER:
                    `parcel_application_status.has_map` is satisfied by a polygon or an uploaded
                    map document, and `operation_readiness_service` raises a finding for parcels
                    with neither. Naming the real reason is also the more persuasive ask — a
                    grower drawing a block for their renewal packet has a reason to be accurate
                    about it, which "consumers will see this" never gave them. */}
                <StandardAlert
                  status="info"
                  title={intl.formatMessage({ id: 'parcel.boundary.whyTitle' })}
                  description={intl.formatMessage({ id: 'parcel.boundary.whyBody' })}
                />

                {renderBoundaryStatus()}

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.previousStep' })}
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      {intl.formatMessage({ id: 'app.cancel' })}
                    </StandardButton>
                    {saveFromBoundary ? (
                      <StandardButton
                        isLoading={isLoading}
                        onClick={() => onSubmitForm(methods.getValues())}>
                        {intl.formatMessage({ id: 'parcel.boundary.saveOutline' })}
                      </StandardButton>
                    ) : (
                      <StandardButton onClick={nextStep} rightIcon={<FaChevronRight />}>
                        {intl.formatMessage({ id: 'app.continue' })}
                      </StandardButton>
                    )}
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* 🎯 STEP 2: Parcel description */}
          {currentStep === 2 && (
            /* Reframed 2026-08-07 from "Transparency Story / Tell consumers about this
               parcel". The ICP is wholesale CA orchards whose buyer is a packer, not a
               shopper — and none of this text reaches a shopper anyway: the QR page reads
               the transparency endpoint, whose `_build_public_parcel` returns only
               name/area/polygon/map_metadata/location_disclosure_level.

               `transparency_description` is NOT marketing copy despite the old label — it is
               mapped straight onto `parcel.description` on submit (see finalData below), which
               is what the profile header renders and what scores 40 of the 100 readiness
               points. So the field stays; only the framing changes. */
            <StandardCard
              title={intl.formatMessage({ id: 'parcel.step.description.cardTitle' })}
              subtitle={intl.formatMessage({ id: 'parcel.step.description.cardSubtitle' })}>
              <VStack spacing={6} align="stretch">
                <StandardField
                  label={intl.formatMessage({ id: 'parcel.step.description.label' })}
                  required
                  error={errors.transparency_description?.message}
                  // "100+ characters recommended" dropped: its only basis was
                  // `Parcel.get_transparency_score()`, where a 100-character description
                  // scores 40 of 100. The score is retired as a concept, so a threshold
                  // derived from it does not get restated as writing advice.
                  helpText={intl.formatMessage({ id: 'parcel.step.description.help' })}>
                  <StandardTextarea
                    {...methods.register('transparency_description')}
                    placeholder={intl.formatMessage({
                      id: 'parcel.step.description.placeholder'
                    })}
                    minH="150px"
                  />
                </StandardField>

                {/* `consumer_story` ("Why should consumers care?") removed 2026-08-07 — it
                    scored nothing, no consumer surface rendered it, and its only read
                    (ProductDetail.tsx) resolved against a payload that never carried it, so
                    it was always undefined. Collecting storytelling from a wholesale grower
                    with no destination is the setup-wizard inversion §10.4 calls out. */}
                <SimpleGrid columns={1} spacing={6}>
                  <StandardField
                    label={intl.formatMessage({ id: 'parcel.step.description.practicesLabel' })}
                    error={errors.sustainability_practices?.message}
                    helpText={intl.formatMessage({ id: 'parcel.step.description.practicesHelp' })}>
                    <StandardTextarea
                      {...methods.register('sustainability_practices')}
                      placeholder={intl.formatMessage({
                        id: 'parcel.step.description.practicesPlaceholder'
                      })}
                      minH="120px"
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardAlert
                  status="info"
                  title={intl.formatMessage({ id: 'parcel.step.description.whereTitle' })}
                  description={intl.formatMessage({ id: 'parcel.step.description.whereBody' })}
                />

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.previousStep' })}
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      {intl.formatMessage({ id: 'app.cancel' })}
                    </StandardButton>
                    <StandardButton onClick={nextStep} rightIcon={<FaChevronRight />}>
                      {intl.formatMessage({ id: 'app.continue' })}
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* 🎯 STEP 3: Visual Documentation */}
          {currentStep === 3 && (
            <StandardCard
              title={intl.formatMessage({ id: 'parcel.wizard.step.photosTitle' })}
              subtitle={intl.formatMessage({ id: 'parcel.step.photos.cardSubtitle' })}>
              <VStack spacing={6} align="stretch">
                <StandardField
                  label={intl.formatMessage({ id: 'parcel.step.photos.label' })}
                  // Was "images that show consumers the practices in action (3+ images
                  // recommended for full points)". Both halves were false. `_build_public_parcel`
                  // returns name/area/polygon/map_metadata/location_disclosure_level and NO
                  // images, and every other reader of `parcel.album` is behind IsAuthenticated —
                  // so a parcel photo reaches no shopper. "Full points" was
                  // `Parcel.get_transparency_score()`, a retired concept. Same class as the
                  // boundary copy corrected on the map step: the ask was justified by a
                  // destination the product does not have.
                  helpText={intl.formatMessage({ id: 'parcel.step.photos.help' })}>
                  <TrazoImageUpload
                    maxFiles={5}
                    maxSize={5 * 1024 * 1024} // 5MB
                    existingImages={currentImages.length > 0 ? currentImages : uploadedImageUrls}
                    onImagesChange={handleImagesChange}
                    isLoading={false}
                  />
                </StandardField>

                <StandardAlert
                  status="info"
                  title={intl.formatMessage({ id: 'parcel.step.photos.whereTitle' })}
                  description={intl.formatMessage({ id: 'parcel.step.photos.whereBody' })}
                />

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.previousStep' })}
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      {intl.formatMessage({ id: 'app.cancel' })}
                    </StandardButton>
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={intl.formatMessage({
                        id: isEdit ? 'app.updating' : 'app.creating'
                      })}
                      leftIcon={<FaCheckCircle />}>
                      {intl.formatMessage({
                        id: isEdit ? 'parcel.submit.update' : 'parcel.submit.create'
                      })}
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

export { StandardParcelFormTransparency as default };
