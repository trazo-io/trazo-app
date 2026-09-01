import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  useToast,
  Text,
  Box,
  Flex,
  Badge,
  Input
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
import { googleMapsLoaderOptions } from 'components/Map/mapsLoaderOptions';
import { GoogleMap, Polygon, Marker, useLoadScript } from '@react-google-maps/api';
import { TrazoImageUpload } from '../Upload';
import {
  FaMapMarkedAlt,
  FaBuilding,
  FaCheckCircle,
  FaChevronRight,
  FaChevronLeft,
  FaTrash,
  FaCamera
} from 'react-icons/fa';
import { MdInfo } from 'react-icons/md';
import {
  StandardNumberInput,
  StandardInput,
  StandardTextarea,
  StandardDecimalInput
} from 'components/Design/StandardComponents';

// 🎯 CARBON TRANSPARENCY FOCUSED SCHEMA
const transparencyParcelSchema = object({
  // Step 1: Identity (Required)
  name: string().min(1, 'Parcel name is required').max(100, 'Name too long'),
  area: number().min(0.01, 'Area must be greater than 0'),

  // Step 2: Location (polygon validated separately)

  // Step 3: Parcel description (Required)
  transparency_description: string().min(3, 'Describe this parcel'),
  sustainability_practices: string().optional(),

  // Step 4: Visual Documentation (Optional)
  images: array(string()).max(5).optional()
});

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
  initialData?: Partial<TransparencyParcelFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
  establishmentName?: string;
  // GPS coordinates from parent establishment to center map when creating new parcel
  establishmentCoordinates?: { lat: number; lng: number };
  // Optional informational content (e.g., plan-limit warning) rendered above the stepper
  preFormAlert?: React.ReactNode;
}

export const StandardParcelFormTransparency: React.FC<StandardParcelFormTransparencyProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false,
  establishmentName = '',
  establishmentCoordinates,
  preFormAlert
}) => {
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

  const [currentStep, setCurrentStep] = useState(0);
  const [polygon, setPolygon] = useState<Array<{ lat: number; lng: number }>>(
    initialData?.polygon || []
  );
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
    if (initialData?.polygon && initialData.polygon.length > 0) {
      return calculatePolygonCenter(initialData.polygon);
    }
    // Fallback: Default to Fresno, CA (Central Valley agricultural region)
    return { lat: 36.7378, lng: -119.7871 };
  });

  const [mapZoom, setMapZoom] = useState(() => {
    if (initialData?.map_metadata?.zoom) {
      return initialData.map_metadata.zoom;
    }
    if (initialData?.polygon && initialData.polygon.length > 0) {
      return calculatePolygonZoom(initialData.polygon);
    }
    return 13;
  });

  // 🗺️ Update map center when establishment coordinates become available (async load fix)
  useEffect(() => {
    // Only update if we have establishment coordinates AND no existing polygon (new parcel)
    if (establishmentCoordinates && (!polygon || polygon.length === 0)) {
      setMapCenter(establishmentCoordinates);
    }
  }, [establishmentCoordinates, polygon]);

  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const currentImages = watch('images') || [];
  const intl = useIntl();
  const toast = useToast();
  const polygonRef = useRef<google.maps.Polygon>();
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // Language follows the APP's locale, not the browser's — see mapsLoaderOptions.
  const loaderOptions = useMemo(() => googleMapsLoaderOptions(intl.locale), [intl.locale]);
  const { isLoaded, loadError } = useLoadScript(loaderOptions);

  // 🎯 SIMPLIFIED 4-STEP TRANSPARENCY STRUCTURE
  // `shortTitle` is what a phone column shows (below `md`); `title` still shows wherever
  // there is room. Without it these two wrap past the two-line clamp and lose words.
  const steps = [
    {
      title: 'Parcel Identity',
      shortTitle: 'Identity',
      description: 'Name & area',
      icon: FaBuilding,
      required: true
    },
    {
      title: 'Location',
      description: 'Map boundaries',
      icon: FaMapMarkedAlt,
      required: true
    },
    {
      title: 'Description',
      description: 'What this block is',
      icon: MdInfo,
      required: true
    },
    {
      title: 'Visual Documentation',
      shortTitle: 'Photos',
      description: 'Photos of this block',
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
        if (!formData.name || !formData.name.trim()) return 'Enter a parcel name.';
        if (!(formData.area > 0)) return 'Enter the parcel area in acres.';
        return null;
      case 1:
        return isValidPolygon() || boundarySkipped
          ? null
          : 'Draw the parcel boundary on the map, or choose to add it later.';
      case 2:
        return (formData.transparency_description || '').trim().length >= 3
          ? null
          : 'Add a short description of what grows on this parcel.';
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
          title: 'Almost there',
          description: reason,
          status: 'warning',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Skip boundary drawing: mark map step satisfied with an empty polygon and advance.
  // The boundary improves the consumer page map but is not required to start logging events.
  const handleSkipBoundary = () => {
    setBoundarySkipped(true);
    setPolygon([]);
    setValue('polygon', []);
    setValue('map_metadata', {
      center: mapCenter,
      zoom: mapZoom
    });
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
  };

  // Form effects (similar to original)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset(initialData);

      if (initialData.polygon) {
        setPolygon(initialData.polygon);
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

  useEffect(() => {
    if (getPolygonLength() >= 3) {
      const newCenter = calculatePolygonCenter(polygon);
      const newZoom = calculatePolygonZoom(polygon);
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    }
  }, [polygon]);

  const handleImagesChange = useCallback(
    (newImageUrls: string[]) => {
      setUploadedImageUrls(newImageUrls);
      setValue('images', newImageUrls);
    },
    [setValue]
  );

  // Google Maps polygon editing
  const onEdit = useCallback(() => {
    if (polygonRef.current) {
      const nextPath = polygonRef.current
        .getPath()
        .getArray()
        .map((latLng: google.maps.LatLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng()
        }));
      setPolygon(nextPath);
    }
  }, []);

  const onLoadPolygon = useCallback(
    (polygonInstance: google.maps.Polygon) => {
      polygonRef.current = polygonInstance;
      const path = polygonInstance.getPath();
      listenersRef.current.push(
        path.addListener('set_at', onEdit),
        path.addListener('insert_at', onEdit),
        path.addListener('remove_at', onEdit)
      );
    },
    [onEdit]
  );

  const onUnmount = useCallback(() => {
    listenersRef.current.forEach((listener) => listener.remove());
    polygonRef.current = undefined;
  }, []);

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
      title: 'Check your details',
      description:
        formErrors[badField]?.message || 'Some required information is missing or invalid.',
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
        map_metadata: {
          center: mapCenter,
          zoom: mapZoom
        },
        images: imageUrls,
        // Legacy fields for backend compatibility
        description: data.transparency_description, // Map transparency to legacy description
        uploaded_image_urls: imageUrls
      };

      onSubmit(finalData as any);
    } catch (error) {
      console.error('❌ Form submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save parcel. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <StandardPage
      title={isEdit ? 'Edit Parcel' : 'Add New Parcel'}
      description={`${isEdit ? 'Update' : 'Create'} a parcel for carbon transparency${
        establishmentName ? ` in ${establishmentName}` : ''
      }`}
      showBackButton
      onBack={onCancel}>
      {/* Optional pre-flight alert (e.g., subscription limit warning) */}
      {preFormAlert}

      {/* Modern Progress Stepper - 4 Steps */}
      <StandardStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
        allowStepClick={true}
        onStepClick={goToStep}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitForm, onInvalidSubmit)}>
          {/* 🎯 STEP 0: Parcel Identity */}
          {currentStep === 0 && (
            <StandardCard title="Parcel Identity" subtitle="Basic information for transparency">
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Parcel Name"
                    required
                    error={errors.name?.message}
                    helpText="Consumer-friendly name for this parcel">
                    <StandardInput
                      {...methods.register('name')}
                      placeholder="e.g., North Avocado Grove, Organic Block A"
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
                        const HECTARES_PER_ACRE = 0.404686;
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
                  title="Why this matters"
                  description="Your certifier identifies each field by name, area and crop — these are the details that tie your records to the right block."
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
                <Box borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.200">
                  {loadError ? (
                    <Flex h="400px" align="center" justify="center" bg="red.50" direction="column">
                      <Text color="red.700" mb={2}>
                        Failed to load Google Maps
                      </Text>
                      <Text fontSize="sm" color="red.700">
                        {loadError.message}
                      </Text>
                    </Flex>
                  ) : !isLoaded ? (
                    <Flex h="400px" align="center" justify="center" bg="gray.100">
                      <Text>Loading map...</Text>
                    </Flex>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '400px' }}
                      zoom={mapZoom}
                      center={mapCenter}
                      onClick={(e) => {
                        if (e.latLng) {
                          const newPoint = {
                            lat: e.latLng.lat(),
                            lng: e.latLng.lng()
                          };
                          const updatedPolygon = [...polygon, newPoint];
                          setPolygon(updatedPolygon);
                          setValue('polygon', updatedPolygon);
                          setValue('map_metadata', {
                            center: mapCenter,
                            zoom: mapZoom
                          });
                        }
                      }}
                      options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        mapTypeControl: true,
                        scaleControl: true,
                        streetViewControl: false,
                        rotateControl: false,
                        fullscreenControl: true,
                        gestureHandling: 'cooperative',
                        clickableIcons: false,
                        mapTypeId: 'satellite'
                      }}>
                      {getPolygonLength() > 2 && (
                        <Polygon
                          path={polygon}
                          onLoad={onLoadPolygon}
                          onUnmount={onUnmount}
                          options={{
                            fillColor: isValidPolygon() ? '#4CAF50' : '#FF9800',
                            fillOpacity: 0.25,
                            strokeColor: isValidPolygon() ? '#4CAF50' : '#FB8C00',
                            strokeOpacity: 1,
                            strokeWeight: 2,
                            editable: true,
                            draggable: true
                          }}
                        />
                      )}

                      {polygon &&
                        Array.isArray(polygon) &&
                        polygon.map((point, index) => (
                          <Marker
                            key={index}
                            position={point}
                            title={`Point ${index + 1}`}
                            icon={{
                              path: google.maps.SymbolPath.CIRCLE,
                              scale: 8,
                              fillColor: isValidPolygon() ? '#4CAF50' : '#FB8C00',
                              fillOpacity: 1,
                              strokeColor: '#FFFFFF',
                              strokeWeight: 2
                            }}
                            onClick={() => {
                              const newPolygon =
                                polygon && Array.isArray(polygon)
                                  ? polygon.filter((_, i) => i !== index)
                                  : [];
                              setPolygon(newPolygon);
                              setValue('polygon', newPolygon);
                            }}
                          />
                        ))}
                    </GoogleMap>
                  )}
                </Box>

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

                {getPolygonLength() > 0 && (
                  <Box p={4} bg="green.50" borderRadius="lg">
                    <Text fontWeight="semibold" color="green.700" mb={2}>
                      Polygon Points: {getPolygonLength()}
                    </Text>
                    <HStack>
                      <Badge colorScheme="green" variant="solid">
                        {isValidPolygon() ? 'Valid Polygon' : 'Need more points'}
                      </Badge>
                      {getPolygonLength() > 0 && (
                        <StandardButton
                          size="sm"
                          variant="outline"
                          leftIcon={<FaTrash />}
                          onClick={() => setPolygon([])}>
                          Clear Points
                        </StandardButton>
                      )}
                    </HStack>
                  </Box>
                )}

                {/* Escape hatch: boundary drawing is the primary flow, but farmers can skip it */}
                {!isValidPolygon() && (
                  <VStack spacing={1} align="center" pt={2}>
                    <StandardButton variant="ghost" size="sm" onClick={handleSkipBoundary}>
                      {intl.formatMessage({
                        id: 'parcel.skipBoundary.action',
                        defaultMessage: 'Continue without boundary — draw it later'
                      })}
                    </StandardButton>
                    <Text fontSize="xs" color="gray.500" textAlign="center" maxW="420px">
                      {intl.formatMessage({
                        id: 'parcel.skipBoundary.caption',
                        defaultMessage:
                          "You can start logging events right away. Your certifier's parcel application needs a map of this block, so Trazo will ask for it again before your renewal packet is complete."
                      })}
                    </Text>
                  </VStack>
                )}

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.back' })}
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
              title="Parcel description"
              subtitle="What this block is, in your own words">
              <VStack spacing={6} align="stretch">
                <StandardField
                  label="Describe this parcel"
                  required
                  error={errors.transparency_description?.message}
                  helpText="Crop, plantings, irrigation, anything that distinguishes this block from your others. 100+ characters recommended.">
                  <StandardTextarea
                    {...methods.register('transparency_description')}
                    placeholder="e.g., 12.5-acre Hass avocado block on the east slope, planted 2011 on Dusa rootstock. Drip irrigation from the deep well, cover cropped between rows over winter..."
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
                    label="Soil & conservation practices"
                    error={errors.sustainability_practices?.message}
                    helpText="Cover cropping, compost, buffer plantings — the practices your certifier asks about under 7 CFR 205.203.">
                    <StandardTextarea
                      {...methods.register('sustainability_practices')}
                      placeholder="e.g., Water conservation through drip irrigation, soil health improvement through cover crops, biodiversity support through native plant borders..."
                      minH="120px"
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardAlert
                  status="info"
                  title="Where this goes"
                  description="Your description appears on this parcel's profile and in the records you share with your certifier."
                />

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.back' })}
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
              title="Visual Documentation"
              subtitle="Photos of this block — certifications are managed as records on the farm profile">
              <VStack spacing={6} align="stretch">
                <StandardField
                  label="Parcel Images"
                  helpText="Upload high-quality images that show consumers the practices in action (3+ images recommended for full points)">
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
                  title="Visual Trust Building"
                  description="Images help consumers see the real practices behind their food, building confidence in their purchasing decisions."
                />

                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    {intl.formatMessage({ id: 'common.back' })}
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      {intl.formatMessage({ id: 'app.cancel' })}
                    </StandardButton>
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={isEdit ? 'Updating...' : 'Creating...'}
                      leftIcon={<FaCheckCircle />}>
                      {isEdit ? 'Update Parcel' : 'Create Parcel'}
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
