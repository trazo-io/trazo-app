// Chakra imports
import {
  Box,
  Button,
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
  CircularProgress
} from '@chakra-ui/react';
import { BsFillCloudLightningRainFill } from 'react-icons/bs';
import {
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaSeedling,
  FaBusinessTime,
  FaBug,
  FaEye,
  FaCalendarAlt,
  FaMicrophone,
  FaTasks,
  FaCloudRain,
  FaFlask,
  FaClipboardList,
  FaCertificate,
  FaLayerGroup
} from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  SectionHeader, // D9 — both were built for this screen and had never been mounted anywhere.
  DraftRestorationAlert,
  AutoSaveStatus,
  StandardAlert
} from 'components/Design/StandardComponents';
import { useEventDraft } from 'src/hooks/useEventDraft';
import { TrazoImageUpload } from 'components/Upload';
import { CorrectRecordModal } from 'components/Modals/CorrectRecordModal';
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
  useGetHistoryQuery,
  useGetParcelHistoriesQuery,
  useUpdateEventMutation
} from 'store/api/historyApi';
import { useCalculateEventCarbonImpactMutation } from 'store/api/carbonApi';
import { useGetSeasonPlanQuery } from 'store/api/seasonPlanApi';
import { EventPreviewModal } from 'components/Events/EventPreviewModal';
import { PhotoRecommendationsBox } from 'components/Events/PhotoRecommendationsBox';
import { useGoogleMap } from '@react-google-maps/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import {
  subtypeChoicesFor,
  subtypeQuestionFor,
  verbForEvent,
  verbForKey
} from 'config/activityVerbs';
import { getSubtypes } from 'config/events';
import { ActivitySubtypeChooser } from 'components/Events/ActivitySubtypeChooser';
import { VerbPickerGrid } from 'components/Events/VerbPickerGrid';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { VoiceEventCapture } from 'components/Events/VoiceEventCapture';
import {
  mapVoiceDataToFieldValues,
  mapVoiceTypeToTemplate,
  gateVoiceOverridesToForm,
  isRecognizedVoiceType
} from 'utils/voiceDataMapper';
import { templatePrefillValues, templatesForEventType } from 'config/events/templateAccelerators';
import { nowLocalDateTimeInput } from 'utils/dateOnly';

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
/*
 * Built INSIDE the component, from `intl`.
 *
 * This was a module-scope array of hardcoded English — the same shape as the module-scope zod
 * schema in select-company, and untranslatable for the same structural reason: `intl` does not
 * exist yet at module load, so no amount of "sweep the file for user-facing strings" can reach
 * it. Every farmer, in every locale, read "Basic Info · Event type & date".
 *
 * The wording is also the retired vocabulary. Step 0 asks "What did you do?" and renders the
 * verb grid; it has not asked for an "event type" since WS-4b, and "Event Details" names the
 * backend model rather than the thing the farmer is describing.
 */
const useWizardSteps = (intl) =>
  useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'events.wizard.step.basic' }),
        description: intl.formatMessage({ id: 'events.wizard.step.basicHint' })
      },
      {
        title: intl.formatMessage({ id: 'events.wizard.step.details' }),
        description: intl.formatMessage({ id: 'events.wizard.step.detailsHint' })
      },
      {
        title: intl.formatMessage({ id: 'events.wizard.step.photos' }),
        description: intl.formatMessage({ id: 'events.wizard.step.photosHint' })
      }
    ],
    [intl]
  );

// Save-time record-completeness nudge. The backend echoes `completeness_gaps` — machine keys
// from history/services/record_completeness.py (§ 205.103(b)(2) / § 205.206(a) / § 205.204)
// still blank on the saved row. Keys, not labels, cross the wire; the human wording is owned
// here via i18n.
//
// ⛔ This map must cover EVERY key both backend registries can emit. The fallback below renders
// the raw Python identifier, so a key with no entry here reaches the farmer as
// "seed_certification_status" — untranslated, in both locales. It did: the map was written for
// the four chemical fields of v1 and never grew when the backend added `quantity_purchased` and
// the five § 205.204 seed fields, which is six of ten keys leaking raw. The invariant is a
// backend test, not this comment: history/tests/test_completeness_gap_label_parity.py.
const COMPLETENESS_GAP_LABELS = {
  // CHEMICAL_EVENT_REQUIRED_FIELDS
  commercial_name: { id: 'app.completenessGap.commercialName', defaultMessage: 'Product name' },
  volume: { id: 'app.completenessGap.volume', defaultMessage: 'Amount applied' },
  area: { id: 'app.completenessGap.area', defaultMessage: 'Area treated' },
  target_pest_disease: {
    id: 'app.completenessGap.targetPestDisease',
    defaultMessage: 'Target pest/disease'
  },
  quantity_purchased: {
    id: 'app.completenessGap.quantityPurchased',
    defaultMessage: 'Quantity purchased'
  },
  // PLANTING_EVENT_REQUIRED_FIELDS (§ 205.204 — PL / TR / SS)
  seed_certification_status: {
    id: 'app.completenessGap.seedCertificationStatus',
    defaultMessage: 'Seed organic status'
  },
  seed_nonavailability_reason: {
    id: 'app.completenessGap.seedNonavailabilityReason',
    defaultMessage: 'Reason organic seed was unavailable'
  },
  seed_search_attempts: {
    id: 'app.completenessGap.seedSearchAttempts',
    defaultMessage: 'Three documented supplier searches'
  },
  seed_treatment_allowed_basis: {
    id: 'app.completenessGap.seedTreatmentAllowedBasis',
    defaultMessage: 'Why the seed treatment is allowed'
  },
  seed_supplier_name: {
    id: 'app.completenessGap.seedSupplierName',
    defaultMessage: 'Seed supplier'
  }
};

function NewEvent({ isEdit = false, eventId = null }) {
  const intl = useIntl();
  const toast = useToast();
  const steps = useWizardSteps(intl);

  // D7 — move the farmer to the first field that failed validation. react-hook-form marks
  // invalid inputs with aria-invalid, so this works for every tab without each one having to
  // report its state upward (only WeatherTab ever did, which is why the old disabled-Continue
  // gate was dead for the other six).
  const focusFirstInvalidField = useCallback(() => {
    if (typeof document === 'undefined') return;
    const firstInvalid = document.querySelector('[aria-invalid="true"]');
    if (!firstInvalid) return;
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus after the scroll settles so the browser doesn't fight the smooth scroll.
    window.setTimeout(() => {
      try {
        firstInvalid.focus({ preventScroll: true });
      } catch {
        /* not focusable — the scroll already did the useful part */
      }
    }, 350);
  }, []);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { parcelId, farmId } = useParams();
  const [searchParams] = useSearchParams();

  // Get event type from URL parameters when editing
  const eventTypeFromUrl = searchParams.get('event_type');

  // WS-4b entry convergence: arriving from a verb entry point (Activities picker,
  // parcel Add Event menu) carries ?event_type=&verb= — the type is already known, so
  // the chooser must not render again, the page titles itself by the verb, and the
  // verb's production subtype (config/activityVerbs) seeds the form. With no preset,
  // create mode shows the same verb grid instead of backend categories.
  const verbFromUrl = searchParams.get('verb');
  // "Log this again" (2026-08-25): copy the farmer's OWN previous record into a fresh
  // create form — date reset to now, photos not copied. Suggest-and-confirm on their
  // own words, so it does not touch the template->record red line.
  const repeatIdFromUrl = searchParams.get('repeat');
  const isRepeat = !isEdit && !!repeatIdFromUrl;
  const typePresetFromVerb = !isEdit && verbFromUrl != null && eventTypeFromUrl != null;

  // Season plan: "Log this" on a planned practice arrives with ?plan_item=&production=.
  // The item's catalogue values PREFILL the form; the farmer reviews them and supplies the
  // date. Nothing about the plan item is a record until this form is saved — which is the
  // whole point of ProductionPlanItem (history/models.py). The id rides along on the POST so
  // the server can close the checklist item against the record it actually wrote.
  const planItemIdFromUrl = searchParams.get('plan_item');
  const planProductionIdFromUrl = searchParams.get('production');

  // A plan item answers "what did you do" as completely as a verb tile does, and it does so
  // for practices the curated verb grid has no tile for — pruning, thinning, transplanting.
  // Without this the farmer taps "Log this" on "Annual Structural Pruning" and lands back on
  // a "What did you do?" grid, which is the opposite of what the button promised.
  const typePresetFromPlan = !isEdit && planItemIdFromUrl != null && eventTypeFromUrl != null;

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
  // WS-4b: when a verb pre-answers the production subtype (planting→PL, harvest→HA…),
  // seed it so ProductionTab opens on the right type instead of the PL default.
  const [eventFormData, setEventFormData] = useState(() => {
    const presetVerb = typePresetFromVerb ? verbForKey(verbFromUrl) : undefined;
    return presetVerb?.subtype ? { type: presetVerb.subtype } : {};
  });
  // Verb picked in-page (no URL preset) — drives title + tile selection state.
  const [pickedVerbKey, setPickedVerbKey] = useState(null);

  // Escape hatch for a wrong tile.
  //
  // The subtype is deliberately NOT echoed back as a locked summary row — the page title
  // already says "Log activity — Harvest", and a second read-only copy of the same word is
  // the same clutter the duplicate select was, minus the bug. But with the chooser hidden a
  // mis-tap would otherwise strand the farmer, so step 0 offers one quiet text link that
  // brings the grid back.
  const [chooserReopened, setChooserReopened] = useState(false);
  /*
   * Edit's correction affordance — opt-in, same reason `chooserReopened` is.
   *
   * The activity IS correctable on a saved record, but a farmer who opened the page to fix a
   * date should not be met by a sixteen-tile grid restating a question they already answered.
   */
  const [correctingActivity, setCorrectingActivity] = useState(false);

  /*
   * "Log this again" answers the activity question the same way a plan item does.
   *
   * 🔴 2026-08-27: `?repeat=639&event_type=1` carries no `verb=`, so `typePresetFromVerb` was
   * false and the wizard opened on "What did you do?" — a farmer who pressed *Log this again*
   * on their own Seed search was asked what they had just done. Same shape as the plan-item
   * bug this preset was built for: a link that names the practice, landing on a grid that asks
   * for it.
   *
   * Derived from the LOADED RECORD, not from the URL — deliberately, and for the same reason
   * the plan item is fetched rather than passed: the practice is read from the farmer's own
   * row, so a hand-edited `?repeat=` link cannot assert one. It also fixes every caller at
   * once instead of requiring each "Log this again" CTA to append the right `&verb=`.
   *
   * `undefined` until the fetch lands (no production verb matches on eventType alone), which
   * is why the main content is gated on the repeat fetch below — otherwise the grid renders
   * for a frame and then vanishes under the farmer.
   */
  const repeatVerb = isRepeat ? verbForEvent(activeEventType, eventFormData.type) : undefined;
  const typePresetFromRepeat = isRepeat && !!repeatVerb;

  const typeChooserAnswered =
    (typePresetFromVerb || typePresetFromPlan || typePresetFromRepeat) && !chooserReopened;

  // The verb in force: an in-page pick always wins over the URL, so re-choosing after
  // "Change activity" re-titles the page instead of leaving the old verb in the header.
  const activeVerbKey =
    pickedVerbKey ||
    (typePresetFromVerb ? verbFromUrl : null) ||
    (typePresetFromRepeat ? repeatVerb.key : null);
  const activeVerb = verbForKey(activeVerbKey);

  /*
   * EDIT mode names the ACTIVITY, exactly as the create path does.
   *
   * WS-4b moved every entry point to the farmer verb vocabulary ("Log activity — Seed
   * search"), but edit was left rendering the old seven-tile CATEGORY grid with six tiles
   * greyed out. The same record was therefore "Seed search" while it was written and
   * "Production" while it was corrected — and "Production" is not a fact a farmer recognises
   * about their own record: sixteen different practices answer to it. Worse, the grid was a
   * PICKER for something that cannot be picked (every tile `disabled`), under a header that
   * said "Required" and instructed "Select the type…", i.e. seven controls that do nothing.
   *
   * Derived, not stored: `eventFormData.type` is still editable in edit mode (ProductionTab
   * keeps its select — correcting a saved subtype is not a second ask, see
   * `subtypeQuestionFor`), so this restatement has to track it rather than snapshot the
   * loaded value. Undefined for legacy event_type 4 (Equipment), which has no verb; the
   * fallback below names the category instead of rendering nothing.
   */
  const editVerb = useMemo(
    () => (isEdit ? verbForEvent(activeEventType, eventFormData.type) : undefined),
    [isEdit, activeEventType, eventFormData.type]
  );
  const editVerbLabel = editVerb
    ? intl.formatMessage({ id: `activities.verb.${editVerb.key}` })
    : eventTypeConfig.find((c) => c.id === activeEventType)?.label || null;
  /*
   * A FAMILY verb does not name the record on its own: "Field work" is cultivation, thinning
   * or mowing, three different forms. Name the subtype beside it — from the display registry,
   * never a local map, so this row, ActivitySubtypeChooser, the timeline and the certifier
   * packet all word a subtype identically. A 1:1 verb pinned its subtype and gets nothing
   * here, for the same reason the create path shows no locked summary row.
   */
  const editSubtypeLabel = useMemo(() => {
    if (!editVerb || !subtypeChoicesFor(editVerb).length) return null;
    const entry = getSubtypes(activeEventType).find((s) => s.code === eventFormData.type);
    return entry ? intl.formatMessage({ id: entry.labelKey }) : null;
  }, [editVerb, activeEventType, eventFormData.type, intl]);

  // The plan item is fetched, not passed through the URL: the practice this record answers is
  // read from the operator's own plan, so a hand-edited link cannot invent one.
  const { data: seasonPlanData } = useGetSeasonPlanQuery(
    { historyId: planProductionIdFromUrl },
    { skip: !planProductionIdFromUrl || !planItemIdFromUrl || isEdit }
  );
  const activePlanItem = useMemo(
    () =>
      (seasonPlanData?.items || []).find((item) => String(item.id) === String(planItemIdFromUrl)),
    [seasonPlanData, planItemIdFromUrl]
  );

  // What the wizard must still ask about the subtype — [] when the answer is already in.
  // The branching lives in config/activityVerbs (`subtypeQuestionFor`) because it is pure,
  // fiddly, and got it wrong twice while it was inline here; its branches are covered by
  // config/events/__tests__/subtypeQuestion.test.ts.
  const pendingSubtypeChoices = useMemo(
    () =>
      subtypeQuestionFor({
        isEdit,
        isCorrecting: correctingActivity,
        eventType: activeEventType,
        verb: activeVerb,
        fromPlanItem: typePresetFromPlan,
        planItem: activePlanItem,
        /*
         * `!pickedVerbKey`: the repeat preset yields the moment the farmer picks in-page.
         *
         * Without it, reopening the grid on a repeat and choosing a FAMILY verb ("Field work")
         * would still take the repeat branch — `handleVerbSelect` seeds the family's default
         * subtype (CU), `knownSubtype` goes truthy, and the CU/TH/MO question is silently
         * skipped for a farmer who has explicitly changed their mind. Once they pick, the
         * ordinary create rules apply.
         */
        fromRepeat: isRepeat && !pickedVerbKey,
        knownSubtype: eventFormData.type,
        allProductionSubtypes: getSubtypes(1).map((entry) => entry.code)
      }),
    [
      isEdit,
      correctingActivity,
      activeEventType,
      typePresetFromPlan,
      activePlanItem,
      activeVerb,
      isRepeat,
      pickedVerbKey,
      eventFormData.type
    ]
  );

  // WS-4c: voice accelerator on the details step (ported from QuickAddEvent).
  // voiceSeq keys the tab components — ChemicalTab resets from initialValues only
  // once (hasInitialized guard), so a voice merge remounts the tab to re-read the
  // merged eventFormData. onDataChange keeps eventFormData live, so nothing the
  // farmer already typed is lost by the remount.
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [voiceBanner, setVoiceBanner] = useState(null);
  const [voiceSeq, setVoiceSeq] = useState(0);
  // WS-4 template accelerator: picking a template is an explicit practice choice —
  // its defaults (minus *_unit keys; the tab's US units win) prefill the form.
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [appliedTemplateKey, setAppliedTemplateKey] = useState(null);

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

  // Door check (2026-08-25): a parcel with NO open season used to dead-end in the
  // backend's 400 ("No active production found") AFTER the farmer had filled the
  // whole form. Ask at the door instead: start the next season, or log post-harvest
  // work against the latest finished one — the finish DATE is the line
  // (history/tests/test_post_harvest_continuation.py), so the backend accepts an
  // explicit `history` with a later-dated record.
  const { data: parcelHistories, isLoading: parcelHistoriesLoading } = useGetParcelHistoriesQuery(
    { companyId: currentCompany?.id, farmId, parcelId },
    { skip: isEdit || !parcelId || !farmId || !currentCompany?.id }
  );
  const openSeason = useMemo(
    () => (parcelHistories || []).find((h) => !h.finish_date),
    [parcelHistories]
  );

  const latestFinished = useMemo(() => {
    const finished = (parcelHistories || []).filter((h) => h.finish_date);
    // A plan link (?production=<id>) names its own season: when that season is
    // finished, the door must offer THAT one, not whichever finished last —
    // otherwise the plan item would bind to one season and the record to another.
    const fromPlan = finished.find((h) => String(h.id) === String(planProductionIdFromUrl ?? ''));
    if (fromPlan) return fromPlan;
    finished.sort((a, b) => new Date(b.finish_date) - new Date(a.finish_date));
    return finished[0] || null;
  }, [parcelHistories, planProductionIdFromUrl]);
  const [postHarvestTarget, setPostHarvestTarget] = useState(null);
  // Crop context for the voice parser.
  //
  // `cropType` was the literal string "general" at the call site, on a platform with 33
  // crops — so the backend's GPT prompt, which interpolates `Crop Type: {crop_type}` and
  // treats it as required, was told nothing useful about what was growing. The season the
  // record will actually be logged against knows: OptimizedHistoryListSerializer (the list
  // action behind /parcels/<id>/histories/) exposes crop_type as {id, name, category, slug}.
  // Post-harvest records target a finished season, so read that one when it is in play.
  const voiceCropType = useMemo(() => {
    const season = postHarvestTarget || openSeason;
    return season?.crop_type?.name || season?.product?.name || 'general';
  }, [postHarvestTarget, openSeason]);
  // finish_date is a DATE-ONLY string; new Date("2026-01-15") parses as UTC midnight
  // and prints the PREVIOUS day west of Greenwich. Build the local date explicitly.
  const localDateLabel = (value) => {
    if (!value) return '';
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString();
    return new Date(value).toLocaleDateString();
  };

  // Step management
  const [activeStep, setActiveStep] = useState(0);

  // D9 — persist the in-progress event so a refresh, a locked phone or a stray Back does not
  // discard a half-filled chemical application. Scoped per parcel and per create/edit target.
  const {
    hasDraft,
    draftSavedAt,
    draftPhotoCount,
    lastSaved: draftLastSaved,
    isSaving: isSavingDraft,
    saveDraft,
    restoreDraft,
    discardDraft,
    clearDraft
  } = useEventDraft({
    parcelId,
    eventId,
    // Repeat mode prefills from the SOURCE record; letting a stale per-parcel
    // draft restore over it (or the prefill silently overwrite a draft the
    // farmer meant to finish) makes the form's contents unexplainable.
    enabled: !isEdit && !isRepeat
  });

  // D9 — write a draft whenever the form state or the chosen type changes. The hook debounces
  // and refuses to store an empty form, so this stays cheap and does not arm a restore banner
  // for someone who merely opened the wizard.
  useEffect(() => {
    saveDraft(activeEventType, eventFormData, acceptedFiles?.length || 0);
  }, [activeEventType, eventFormData, acceptedFiles, saveDraft]);

  const handleRestoreDraft = useCallback(() => {
    const draft = restoreDraft();
    if (!draft) return;
    if (draft.activeEventType != null) setActiveEventType(draft.activeEventType);
    setEventFormData(draft.eventFormData || {});
    toast({
      title: intl.formatMessage({ id: 'events.draft.restored', defaultMessage: 'Draft restored' }),
      // Photos are the one thing a draft cannot carry, so say so rather than let the farmer
      // submit an event they believe still has its photo evidence attached.
      description: draft.photoCount
        ? intl.formatMessage(
            {
              id: 'events.draft.restoredPhotos',
              defaultMessage:
                'Your entries are back. {count, plural, one {# photo} other {# photos}} could not be saved with the draft — please attach them again.'
            },
            { count: draft.photoCount }
          )
        : intl.formatMessage({
            id: 'events.draft.restoredBody',
            defaultMessage: 'Your entries are back where you left them.'
          }),
      status: 'success',
      duration: 7000,
      isClosable: true,
      position: 'top'
    });
  }, [restoreDraft, intl, toast]);

  // Form methods for each step
  const basicMethods = useForm({
    resolver: zodResolver(formSchemaBasic),
    defaultValues: {
      date: nowLocalDateTimeInput()
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
      eventId: parseInt(eventId || repeatIdFromUrl || '0'),
      eventType: eventTypeFromUrl ? parseInt(eventTypeFromUrl) : undefined
    },
    {
      skip:
        !(isEdit || isRepeat) ||
        !currentCompany?.id ||
        !(eventId || repeatIdFromUrl) ||
        !eventTypeFromUrl
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
            date: formData.date || nowLocalDateTimeInput(),
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
        } catch (error) {
          // When the calculator is unreachable we show NOTHING. This used to invent a
          // number per event type (Production 2.5 kg, Chemical 1.8 kg) plus an
          // `estimated_cost` of co2e × 50 — a dollar figure with no source anywhere in the
          // codebase — and render it in the same panel, same typography, as a real EPA
          // 40 CFR Part 98 result. The only thing separating them was a `warning` string
          // the panel never displayed. A fabricated figure on a compliance product is
          // worse than a blank space: the farmer cannot tell it apart, and it prints into
          // the record they hand a certifier.
          setCarbonCalculation(null);
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
      // F42 fix (2026-06): PO/PH/CM were missing — a verbose backend type string
      // for these leaked unmapped into the type select on edit.
      'event.production.pollination': 'PO',
      'event.production.post_harvest': 'PH',
      'event.production.post_harvest_processing': 'PH',
      'event.production.canopy_management': 'CM',
      // Batch 3 (2026-06): frost protection + mowing/orchard-floor
      'event.production.frost_protection': 'FP',
      'event.production.mowing': 'MO',

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
      // Production (11)
      'PL',
      'TR',
      'HA',
      'IR',
      'PR',
      'EM',
      'CU',
      'TH',
      // F42 fix (2026-06): PO/PH/CM were absent from validCodes, so editing these
      // subtypes only round-tripped via the mappedType||existingEvent.type fallback.
      'PO',
      'PH',
      'CM',
      // Batch 3 (2026-06): Frost Protection + Mowing/Orchard-Floor
      'FP',
      'MO',
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
    if ((isEdit || isRepeat) && existingEvent && !hasLoadedExistingData.current) {
      // Repeat mode reuses the whole edit mapping below but stays a CREATE:
      // the date resets to now and the album block is skipped further down.
      const eventDate =
        !isRepeat && existingEvent.date
          ? new Date(existingEvent.date).toISOString().slice(0, 16)
          : nowLocalDateTimeInput();

      // Map backend type to frontend code
      const mappedType = mapBackendTypeToFrontendCode(existingEvent.type);

      // Update form data state with comprehensive data mapping
      // IMPORTANT: Use spread operator to preserve ALL fields from existingEvent,
      // including weather-specific fields (water_deficit, highest_temperature, etc.)
      const initialData = {
        ...existingEvent, // Include all fields from backend (weather, production, etc.)
        // Repeat mode copies VALUES, never identity or season binding: the source
        // event's `id`/`history`/`album` riding into the create payload would bind
        // the copy to the ORIGINAL (possibly closed) season and confuse the album
        // dedup. Edit mode keeps them — same record, same season.
        ...(isRepeat ? { id: undefined, history: undefined, album: undefined } : {}),
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
        // Pre-fill the notes box from `observation` ONLY — no `description` fallback.
        //
        // That fallback existed because, before the create path started persisting
        // `observation`, editing an event would otherwise show an empty notes box. It is now
        // actively unsafe: `observation` is what ConsumerEventCard quotes as the grower's own
        // words, and `description` on a legacy row is just as likely to be output from one of
        // the 328+ AI templates. Seeding the box from it meant that merely opening and saving
        // an old event would promote machine copy into a quoted farmer voice on the public
        // page — the exact fabrication eventDataNormalizer's mirror was removed to prevent.
        //
        // Nothing is lost on legacy rows: their text stays in `description`, which still shows
        // as "Field Notes" in the producer detail modal and still prints in the certifier PDF.
        // The box starts empty, and whatever the farmer types is genuinely theirs.
        observation: existingEvent.observation || '',

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
        !isRepeat &&
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
      if (!currentBasicValues.date || currentBasicValues.date === nowLocalDateTimeInput()) {
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
  // WS-4c: voice result → merge ONLY the AI-detected fields into the form.
  // The mapper's template DEFAULTS stay out — in the wizard the farmer sees and
  // confirms every field, and defaults they never said would be silent data
  // (suggest → confirm red line). Keys are backend field names, so they merge
  // straight into eventFormData and the tabs re-read them on remount.
  //
  // 🔴 2026-08-25 — voice never routed the event type, and nothing downstream noticed.
  //
  // `mapVoiceTypeToTemplate` reads the type the AI HEARD; `activeEventType` and
  // `eventFormData.type` stay on what the farmer picked at step 0. Only `templateId` was
  // ever used, so a harvest utterance on an Irrigation form produced `yield_quantity` —
  // which ProductionTab seeds for all 16 subtypes, emits with no subtype gate, and
  // `cleanEventData` passes straight through to a real ProductionEvent column. The farmer
  // saw "I understood: Harvest", saw no yield input (the registry gates it to HA/PH/PL),
  // and saved a yield anyway.
  //
  // Two things close it. `gateVoiceOverridesToForm` asks the display registry which fields
  // THIS subtype actually renders and drops the rest. And when the AI heard a different
  // activity entirely, we do not quietly keep the leftovers — we say so and offer the
  // switch. Suggest → confirm, the same line the season plan and the OSP §11 panel draw.
  const applyVoiceData = (eventData, eventTypeId, subtypeCode) => {
    const mapping = mapVoiceTypeToTemplate(eventData.type);
    const result = mapVoiceDataToFieldValues(eventData, mapping.templateId);
    const detected = {};
    result.overriddenFields.forEach((key) => {
      detected[key] = result.values[key];
    });

    const { kept, dropped } = gateVoiceOverridesToForm(detected, eventTypeId, subtypeCode);

    // Never type over the farmer's own notes. Every other field voice fills is a measurement
    // it just heard, so replacing one is correct; `observation` is prose the farmer may have
    // already written, and clobbering it would lose work they cannot get back.
    if (kept.observation && String(eventFormData.observation ?? '').trim()) {
      delete kept.observation;
    }

    return {
      mapping,
      kept,
      detected,
      banner: {
        transcript: eventData.original_transcript || eventData.description || '',
        count: Object.keys(kept).length,
        droppedCount: dropped.length,
        // Only a real cross-activity mismatch earns the switch offer. Two things disqualify
        // one: the same event type with a different subtype (Harvest heard on a Pruning
        // form) — the gate already handles that, nothing unseen is written either way — and
        // an UNRECOGNISED utterance, which arrives as `general` and is ignorance, not a
        // detection. See isRecognizedVoiceType: the eight newest production subtypes are in
        // no prompt enum, so a correct Transport record would otherwise be told to switch.
        suggestion:
          isRecognizedVoiceType(eventData.type) && mapping.backendEventType !== eventTypeId
            ? mapping
            : null,
        raw: eventData
      }
    };
  };

  // Voice values this form cannot show YET because the subtype is still unchosen.
  //
  // Production always knows its subtype by step 1 — every production tile in ACTIVITY_VERBS
  // declares one. Soil, pest and business do not: their subtype is a select INSIDE the tab
  // (SoilManagementTab opens on `type: formType || ''`), so voice can run before it exists.
  // Gating against an unknown subtype drops every subtype-gated field — `area_covered` is
  // `visibleForSubtypes` on nine of the ten soil subtypes — and then tells the farmer "this
  // activity does not record it", which is false: it does, we just could not know it yet.
  // So hold them, and re-gate the moment the subtype arrives.
  const pendingVoiceRef = useRef(null);

  const handleVoiceEventDetected = (eventData) => {
    const subtype = eventFormData.type;
    const { kept, banner, detected } = applyVoiceData(eventData, activeEventType, subtype);

    // Only HOLD when the subtype was genuinely unknown. With a subtype in hand a dropped
    // field really is unrecordable on this activity, and saying so is the honest answer.
    const holding = !subtype && banner.droppedCount > 0;
    // Pinned to the event type it was heard against. Changing the event type clears
    // eventFormData.type, so without this a soil utterance held for a missing subtype would
    // re-apply itself onto whatever type the farmer switched to next.
    pendingVoiceRef.current = holding ? { detected, eventType: activeEventType } : null;

    setEventFormData((prev) => ({ ...prev, ...kept }));
    setVoiceBanner(holding ? { ...banner, droppedCount: 0 } : banner);
    setShowVoiceCapture(false);
    setVoiceSeq((s) => s + 1);
  };

  // The subtype arrived (the farmer picked it in the tab). Re-gate what we held back and
  // merge whatever this subtype really does render.
  //
  // Loop-safe by construction: the ref is cleared BEFORE any setState, and the deps are the
  // event type and subtype — neither of which this effect writes.
  useEffect(() => {
    const pending = pendingVoiceRef.current;
    const subtype = eventFormData.type;
    if (!pending) return;
    if (pending.eventType !== activeEventType) {
      pendingVoiceRef.current = null; // different activity now — the held values do not apply
      return;
    }
    if (!subtype) return;
    pendingVoiceRef.current = null;

    const { kept, dropped } = gateVoiceOverridesToForm(pending.detected, activeEventType, subtype);
    // Never overwrite something the farmer typed in the meantime.
    const fresh = {};
    Object.entries(kept).forEach(([key, value]) => {
      const current = eventFormData[key];
      if (current === undefined || current === null || current === '') fresh[key] = value;
    });

    const added = Object.keys(fresh).length;
    setVoiceBanner((prev) =>
      prev ? { ...prev, count: prev.count + added, droppedCount: dropped.length } : prev
    );
    if (added === 0) return;
    setEventFormData((prev) => ({ ...prev, ...fresh }));
    // The tabs read initialValues on mount only — same remount the template accelerator uses.
    setVoiceSeq((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEventType, eventFormData.type]);

  // The farmer accepted the switch. Change the event type through the SAME handler a manual
  // change uses (it clears type-specific fields — see handleEventTypeChange), seed the
  // subtype the AI implied, then re-gate the utterance against the new form. Both
  // setEventFormData calls are functional, so the clear lands before the merge.
  const handleVoiceSwitchType = () => {
    const pending = voiceBanner?.suggestion;
    const raw = voiceBanner?.raw;
    if (!pending || !raw) return;

    const subtype = pending.backendSubtype || undefined;
    handleEventTypeChange(pending.backendEventType);
    // `activeVerbKey` titles the page and, for production, the subtype select is hidden
    // (the tab's subtype select is hidden) — leaving the old verb in place would title an Irrigation
    // page over a Harvest form with no visible way to correct it. verbKey is asserted against
    // ACTIVITY_VERBS in voiceRenderGate.test.ts.
    setPickedVerbKey(pending.verbKey);
    pendingVoiceRef.current = null;
    const { kept, banner } = applyVoiceData(raw, pending.backendEventType, subtype);
    setEventFormData((prev) => ({
      ...prev,
      ...(subtype ? { type: subtype } : {}),
      ...kept
    }));
    setVoiceBanner({ ...banner, suggestion: null });
    setVoiceSeq((s) => s + 1);
  };

  // WS-4 template accelerator: merge subtype + template defaults, remount the tab
  // (same voiceSeq mechanism — ChemicalTab only reads initialValues on mount).
  const handleTemplateSelect = (tpl) => {
    setEventFormData((prev) => ({ ...prev, ...templatePrefillValues(tpl) }));
    setAppliedTemplateKey(tpl.nameKey);
    setShowTemplatePicker(false);
    setVoiceSeq((s) => s + 1);
  };

  // WS-4b: verb tile click — routes to the backend type and pre-answers the
  // production subtype where the verb implies it (same clearing rules as a
  // raw type change, then the subtype seed on top).
  const handleVerbSelect = (verb) => {
    handleEventTypeChange(verb.eventType);
    setPickedVerbKey(verb.key);
    if (verb.subtype) {
      setEventFormData((prev) => ({ ...prev, type: verb.subtype }));
    }
  };

  /**
   * Second-level pick (family verbs only) — same clearing contract as changing the event type.
   *
   * The subtype decides which fields the details step renders, so carrying values across a
   * change is the "stale field rides along in the payload" class: a farmer who fills a Harvest
   * record, walks Back to step 0 and switches to Post-Harvest would otherwise POST the harvest
   * keys the new subtype never showed them. ProductionTab's per-subtype payload gates catch
   * most of those keys and not all of them, and a gate that has to be complete for correctness
   * is a worse guarantee than not having the values at all.
   *
   * Date and operator survive — they are step 0's own fields and describe the farmer, not the
   * practice. voiceSeq remounts the tab so it re-reads the cleared initialValues (ChemicalTab
   * and friends only read them on mount).
   */
  const handleSubtypeSelect = (code) => {
    if (eventFormData.type === code) return;
    setEventFormData((prev) => {
      const kept = {};
      ['date', 'performed_by'].forEach((f) => {
        if (prev[f] !== undefined) kept[f] = prev[f];
      });
      return { ...kept, type: code };
    });
    setCarbonCalculation(null);
    dispatch(clearForm());
    setVoiceSeq((n) => n + 1);
  };

  /**
   * Edit-mode correction — sets the subtype and NOTHING else.
   *
   * ⛔ Deliberately NOT `handleSubtypeSelect`. That one clears every field but date and
   * operator, which is right on the create path (nothing typed yet, or typed for the wrong
   * subtype) and destructive here: the form is populated from a SAVED record, so clearing it
   * would blank the row on the next PATCH. This matches exactly what ProductionTab's select
   * did before the ask moved — the change is where the question is asked and in what words,
   * not what answering it does.
   *
   * ⚠️ Known, pre-existing and unchanged by this: correcting SS→HA leaves the old subtype's
   * values in `eventFormData`, and `cleanEventData` is a passthrough with no allowlist, so
   * ProductionTab's per-subtype payload gates are the only thing keeping them out of the
   * PATCH. Same hazard the select carried; fixing it is its own change.
   */
  const handleCorrectSubtype = (code) => {
    setCorrectingActivity(false);
    if (eventFormData.type === code) return;
    setEventFormData((prev) => ({ ...prev, type: code }));
    setCarbonCalculation(null);
    setVoiceSeq((n) => n + 1);
  };

  // Seed the SUBTYPE from the season-plan item, once, when it arrives.
  //
  // ⛔ The subtype and nothing else. A plan item deliberately carries no field values: this
  // form's `cleanEventData` is a passthrough with no allowlist, so anything merged in here
  // lands on the saved record whether the form renders it or not — and the catalogue's field
  // sets are full of measurements and product names (`soil_ph: 6.5`,
  // `organic_matter_percentage: 3.0`, `amendment_type: "Crimson Clover + White Mustard seed
  // mix"`). Writing those unseen is a fabricated observation, which is the class the plan
  // model exists to close. The render-verified way to prefill values is the template
  // accelerator below, which the farmer picks explicitly.
  const planSubtypeApplied = useRef(false);
  useEffect(() => {
    if (!activePlanItem || planSubtypeApplied.current) return;
    planSubtypeApplied.current = true;
    if (!activePlanItem.event_subtype) return;
    setEventFormData((prev) => ({ ...prev, type: activePlanItem.event_subtype }));
    // Remount the tab so it re-reads initialValues (ChemicalTab only reads them on mount).
    setVoiceSeq((s) => s + 1);
  }, [activePlanItem]);

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
          // The chemical tab commits `way_of_application` (the model name) for the form's
          // `application_method`; either spelling satisfies the requirement.
          const value =
            enhancedData[field] ??
            (field === 'application_method' ? enhancedData.way_of_application : undefined);
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

        // Write the notes box onto the payload.
        //
        // 🔴 2026-08-15. This used to be `finalKey = 'description'` — a RENAME, repeated in
        // six branches — and it caused two separate bugs:
        //
        //  1. DATA LOSS on edit. The notes box is prefilled from `observation` only (by
        //     design: `description` on a legacy row may be AI-template output, and seeding
        //     the box from it would promote machine copy into the quoted farmer voice on the
        //     consumer page). So a row whose text lives in `description` opens with an empty
        //     box, and the rename posted that empty string straight back over the stored
        //     description. Measured: opening a Planting event and pressing Update without
        //     touching anything replaced "Replanted 40 Hass on Duke 7 rootstock, rows 1-12,
        //     east buffer." with "Production activity: Planting".
        //  2. `observation` WAS NEVER STORED. Because it was renamed rather than copied, no
        //     event created through this form ever wrote the column — so ConsumerEventCard's
        //     "Farmer's Field Notes" block, which quotes `observation`, could never render
        //     for a form-created event.
        //
        // Both are fixed by copying instead of renaming, and by refusing to blank a stored
        // description with an empty box. The backend carries the same guard
        // (ensure_event_description) so an API client cannot reintroduce case 1.
        const applyNotesField = (target, value) => {
          target.observation = value;
          if (String(value ?? '').trim() || !isEdit) {
            target.description = value;
          }
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

              if (key === 'observation') {
                applyNotesField(cleaned, value);
                return;
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

              if (key === 'observation') {
                applyNotesField(cleaned, value);
                return;
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

              if (key === 'observation') {
                applyNotesField(cleaned, value);
                return;
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
              if (key === 'observation') {
                applyNotesField(cleaned, value);
                return;
              }

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

              if (key === 'observation') {
                applyNotesField(cleaned, value);
                return;
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

            if (key === 'observation') {
              applyNotesField(cleaned, value);
              return;
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
        // Post-harvest continuation: name the finished season explicitly so the
        // backend logs against it instead of answering "no active production".
        ...(postHarvestTarget ? { history: postHarvestTarget.id } : {}),
        // Add ONLY NEW album images from S3 URLs (prevents duplicates on edit)
        album_images: newImagesOnly,
        // 🚨 CRITICAL: Send IDs of images to delete (for edit mode)
        delete_image_ids: isEdit ? deletedImageIds : []
      });

      // Keep the farmer's own words as `observation`, not only as `description`.
      //
      // Every branch of cleanEventData renames observation → description, because
      // CommonEvent.description is NOT NULL. That rename is still needed — but it was also the
      // ONLY thing that happened, so the observation column stayed empty on every UI-logged
      // event. ConsumerEventCard renders `observation` (quoted, italic, "Farmer's Field Notes")
      // and nothing else, so a grower was shown "Your notes will be public — published as
      // written", typed a paragraph about their season, and no shopper ever saw a word of it.
      //
      // Why not mirror description → observation on the way out instead: 328+ AI templates
      // write `description`, and quoting machine copy as a grower's own words is exactly the
      // dishonesty eventDataNormalizer removed that mirror to prevent (see its comment, and
      // history/serializers.py's note on why the API does not mirror either). Provenance has to
      // come from the input the human actually typed, which is this one. Only send it when the
      // farmer left something: an empty observation must not blank an existing note on edit.
      const farmerNote =
        typeof enhancedEventFormData?.observation === 'string'
          ? enhancedEventFormData.observation.trim()
          : '';
      if (farmerNote) {
        finalEventData.observation = farmerNote;
      }

      let savedEvent;
      if (isEdit) {
        // Update existing event
        savedEvent = await updateEvent({
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
        savedEvent = await createEvent({
          companyId: currentCompany.id,
          farmId: parseInt(farmId || '0'),
          ...finalEventData,
          // Closes the season-plan item, server-side, in the same request that writes the
          // record. A plan item may not claim to be done except by pointing at a record.
          //
          // `history` rides along because the endpoint otherwise derives the production from
          // `parcel.current_history` — which is the wrong season for a plan item on any
          // production that is not the parcel's current one, and would leave the record in one
          // place and the checklist item open in another.
          // The season binding and the plan item are SEPARATE facts. `history` was previously
          // sent only when a plan item resolved, so an activity logged straight from a
          // production page carried no season and the server fell back to
          // `parcel.current_history` — the wrong season on any block with two open ones.
          // Numeric only. `?production=` carries the route's numeric id from the production
          // page but a `public_id` UUID from the season-plan link, and the serializer validates
          // `history` as a PK — a UUID is rejected outright. The plan path supplies the numeric
          // id separately below, so this covers the production-page case without breaking it.
          ...(/^\d+$/.test(String(planProductionIdFromUrl ?? ''))
            ? { history: Number(planProductionIdFromUrl) }
            : {}),
          ...(activePlanItem
            ? {
                plan_item_id: activePlanItem.id,
                ...(seasonPlanData?.history_id ? { history: seasonPlanData.history_id } : {})
              }
            : {})
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

      // Non-blocking nudge: the record IS saved (a farmer logs what they know standing in the
      // orchard), but surface what a certifier will still ask for so it can be filled in later.
      const completenessGaps = Array.isArray(savedEvent?.completeness_gaps)
        ? savedEvent.completeness_gaps
        : [];
      if (completenessGaps.length > 0) {
        const gapNames = completenessGaps
          .map((key) =>
            COMPLETENESS_GAP_LABELS[key]
              ? intl.formatMessage(COMPLETENESS_GAP_LABELS[key])
              : // Belt and braces behind the parity test. An unmapped key used to render as the
                // bare Python identifier; sentence-casing the words at least keeps a farmer's
                // toast readable if the registries ever get ahead of this map again.
                key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
          )
          .join(', ');
        toast({
          title:
            intl.formatMessage({
              id: 'app.completenessGapsSavedTitle',
              defaultMessage: 'Saved — a certifier will also want:'
            }) || 'Saved — a certifier will also want:',
          description: gapNames,
          status: 'warning',
          duration: 8000,
          isClosable: true
        });
      }

      // D9 — the event is saved, so the draft is done. Without this the next visit would offer
      // to restore work that already exists as a real event, inviting a duplicate.
      clearDraft();

      // Navigate back to the parcel details
      navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`, {
        replace: true
      });
    } catch (error) {
      // A locked record is not a validation failure and must not be reported as one: the
      // farmer did nothing wrong, the season is simply filed. Keep the notice on screen with
      // the way forward attached.
      if (error?.status === 423 && error?.data?.correctable) {
        setLockedRecord({
          detail: error.data.detail || intl.formatMessage({ id: 'events.locked.detail' }),
          productionId: error.data.production_id
        });
        return;
      }

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

  // 🔴 2026-08-21 — a closed season answers 423 to an event edit, and this form surfaced the
  // server's (good) message as a 7-second toast AFTER the farmer had filled three wizard
  // steps. The reply already carries everything needed to act — `correctable`, the
  // production id, and the sentence explaining that the original is kept beside the
  // correction — so hold it and offer the correction path instead of letting it fade.
  const [lockedRecord, setLockedRecord] = useState(null);
  const [isCorrectOpen, setIsCorrectOpen] = useState(false);

  // Detect the lock on LOAD, not only on save. The 423 fires when the farmer submits, which
  // is three wizard steps too late — and a deep link or a bookmark walks straight in. The
  // event already names its production; ask that production whether it is filed.
  const { data: parentProduction } = useGetHistoryQuery(existingEvent?.history, {
    skip: !isEdit || !existingEvent?.history
  });
  const parentIsFiled = !!(parentProduction?.finish_date || parentProduction?.published);

  useEffect(() => {
    if (parentIsFiled && !lockedRecord) {
      setLockedRecord({
        detail: intl.formatMessage({ id: 'events.locked.detail' }),
        productionId: existingEvent?.history
      });
    }
  }, [parentIsFiled, lockedRecord, existingEvent?.history, intl]);

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

  // The locked-record notice replaces the form entirely rather than sitting above it. Leaving
  // an editable form under a "this cannot be edited" banner invites the farmer to fill it in
  // again and hit the same wall; the only useful control here is the correction path.
  if (lockedRecord) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'events.locked.title' })}
        description={intl.formatMessage({ id: 'events.locked.description' })}
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`)}>
        {/*
          The actions sit BELOW the alert, not inside it.
          An alert is a passive announcement of state; a button is a decision. Putting solid
          controls inside one makes the notice the page's action bar, which is why this screen
          had no action row of its own and why the loudest thing on it was a banner. Same
          correction already applied to the OSP locked notice and the OSP submission card.
        */}
        <StandardAlert status="info" description={lockedRecord.detail} mb={4} />
        <HStack spacing={3} flexWrap="wrap">
          <StandardButton size="sm" onClick={() => setIsCorrectOpen(true)}>
            {intl.formatMessage({ id: 'events.locked.correctCta' })}
          </StandardButton>
          <StandardButton
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`)}>
            {intl.formatMessage({ id: 'events.locked.backCta' })}
          </StandardButton>
        </HStack>

        <CorrectRecordModal
          isOpen={isCorrectOpen}
          onClose={() => setIsCorrectOpen(false)}
          eventId={parseInt(eventId || '0')}
          eventType={eventTypeFromUrl ? parseInt(eventTypeFromUrl) : backendEventType}
          onCorrected={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`)}
        />
      </StandardPage>
    );
  }

  if (!isEdit && !parcelHistoriesLoading && parcelHistories && !openSeason && !postHarvestTarget) {
    // The door: no open season on this parcel. Two honest ways forward, asked
    // BEFORE the form — mirrors the locked-record screen's alert+actions pattern.
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'events.noOpenSeason.title' })}
        description={intl.formatMessage({ id: 'events.noOpenSeason.description' })}
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`)}>
        <StandardAlert
          status="info"
          description={
            latestFinished
              ? intl.formatMessage(
                  { id: 'events.noOpenSeason.bodyWithFinished' },
                  {
                    name: latestFinished.name,
                    date: localDateLabel(latestFinished.finish_date)
                  }
                )
              : intl.formatMessage({ id: 'events.noOpenSeason.bodyNoFinished' })
          }
          mb={4}
        />
        <HStack spacing={3} flexWrap="wrap">
          <StandardButton
            size="sm"
            onClick={() =>
              navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/add`)
            }>
            {intl.formatMessage({ id: 'events.noOpenSeason.startCta' })}
          </StandardButton>
          {latestFinished && (
            <StandardButton
              size="sm"
              variant="outline"
              onClick={() => setPostHarvestTarget(latestFinished)}>
              {intl.formatMessage(
                { id: 'events.noOpenSeason.postHarvestCta' },
                { name: latestFinished.name }
              )}
            </StandardButton>
          )}
        </HStack>
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title={
        isEdit
          ? // Same vocabulary as the create header: a record the farmer opened as
            // "Log activity — Seed search" must not come back as "Edit Event". The
            // fallback is only reachable for legacy event_type 4 (Equipment), the one
            // category with no verb.
            editVerbLabel
            ? intl.formatMessage({ id: 'activities.editTitle' }, { verb: editVerbLabel })
            : intl.formatMessage({ id: 'app.editEvent' })
          : // A plan item titles the page with the practice's own name ("Annual Structural
          // Pruning"), which is more specific than any verb the grid could offer.
          activePlanItem
          ? intl.formatMessage({ id: 'activities.logTitle' }, { verb: activePlanItem.name })
          : // An in-page pick wins over the URL preset — after "Change activity" the header
          // must name what the farmer just chose, not what the link they followed said.
          activeVerbKey
          ? intl.formatMessage(
              { id: 'activities.logTitle' },
              { verb: intl.formatMessage({ id: `activities.verb.${activeVerbKey}` }) }
            )
          : intl.formatMessage({ id: 'app.createNewEvent' }) || 'Add Event'
      }
      description={
        isEdit
          ? intl.formatMessage({ id: 'activities.editDescription' })
          : intl.formatMessage({ id: 'app.createNewEventDescription' }) ||
            'Complete the form to add a new event to your parcel history'
      }
      showBackButton
      // The sanctioned narrow-page override (see frontend.md): this is a single-column
      // form now, and a form field stretched across the full 8xl is harder to scan, not
      // easier. 5xl rather than the OSP wizard's 4xl because the activity tabs lay fields
      // out in 2- and 3-column grids where OSP is a reading column of questions.
      // Net effect at 1440px: the form goes from 591px to 1024px.
      contentMaxW="5xl"
      onBack={handleBack}
      rightAction={
        <Badge colorScheme="green" variant="subtle" px={3} py={1} borderRadius="full">
          <HStack spacing={1}>
            <Icon as={FaTasks} boxSize={3} />
            <Text fontSize="sm">
              {/* The key is `osp.*` only because the OSP wizard needed it first; it is a
                  generic "Paso {current} de {total}" and both locales already have it.
                  Left hardcoded, this badge stayed English beside a fully translated
                  form. */}
              {intl.formatMessage(
                { id: 'osp.wizard.stepCount' },
                { current: activeStep + 1, total: steps.length }
              )}
            </Text>
          </HStack>
        </Badge>
      }>
      {isRepeat && existingEvent && (
        <StandardAlert
          status="info"
          title={intl.formatMessage({ id: 'events.repeat.bannerTitle' })}
          description={intl.formatMessage(
            { id: 'events.repeat.bannerBody' },
            {
              date: existingEvent.date ? new Date(existingEvent.date).toLocaleDateString() : ''
            }
          )}
          mb={4}
        />
      )}

      {postHarvestTarget && (
        <StandardAlert
          status="info"
          title={intl.formatMessage(
            { id: 'events.postHarvest.bannerTitle' },
            { name: postHarvestTarget.name }
          )}
          description={intl.formatMessage(
            { id: 'events.postHarvest.bannerBody' },
            { date: localDateLabel(postHarvestTarget.finish_date) }
          )}
          mb={4}
        />
      )}

      {/* 2025 UX: Enhanced loading state with progress indication */}
      {/* `isEdit || isRepeat`: repeat fetches the SAME record through the same query, and the
          activity it is repeating is not known until it lands. Showing the form meanwhile put
          the verb grid on screen for a frame — asking a question the next frame answered. */}
      {(isEdit || isRepeat) && isLoadingEvent && (
        <StandardCard>
          {/* No <CardBody> here: StandardCard already renders one. Nesting a second put a
              third inset inside the card's forced 14px and this body's 16px — 42px each
              side on a 375px screen. */}
          <Flex justify="center" align="center" py={8}>
            <CircularProgress isIndeterminate color="green.500" />
          </Flex>
        </StandardCard>
      )}

      {/* Error state when editing */}
      {isEdit && eventError && (
        <Card boxShadow="xl" bg={bgColor} borderRadius="2xl">
          <CardBody py={8} px={{ base: 0, md: 6 }}>
            <VStack spacing={4} align="center">
              <Text fontSize="lg" fontWeight="semibold" color="red.700">
                {intl.formatMessage({ id: 'app.errorLoadingEvent' }) || 'Error loading event data'}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Main Content - Show only when not loading or when creating */}
      {(!(isEdit || isRepeat) || !isLoadingEvent) && !eventError && (
        <VStack spacing={{ base: 6, md: 8 }} align="stretch">
          {/* D9 — offered only on step 0: restoring mid-wizard would replace the form under
                the farmer's hands while they are typing in it. */}
          {activeStep === 0 && (
            <DraftRestorationAlert
              hasDraft={hasDraft}
              lastSaved={draftSavedAt}
              onRestore={handleRestoreDraft}
              onDiscard={discardDraft}
            />
          )}

          {/* Progress Stepper - Using StandardStepper */}
          <VStack spacing={2} align="stretch">
            <StandardStepper
              steps={steps}
              currentStep={activeStep}
              completedSteps={Array.from({ length: activeStep }, (_, i) => i)}
            />
            <Flex justify="flex-end">
              <AutoSaveStatus lastSaved={draftLastSaved} isSaving={isSavingDraft} />
            </Flex>
          </VStack>

          {/* Step Content */}
          {/* ONE column. The carbon sidebar that used to sit here took 42% of the content
              row at 1440px (450px of 1073px, MEASURED), leaving the form 591px — and on
              step 0 it rendered an empty placeholder card reading "Enter event details to
              see carbon impact" beside the verb grid, which is the only control on that
              step. A panel earns a permanent column by changing what the operator types;
              this one echoed what they had already typed. The carbon figure now appears
              where it is actionable — inline under the fuel fields that drive it — and at
              review, where EventPreviewModal and EventDetailsModal already showed it. */}
          <Box>
            {activeStep === 0 && (
              <Card boxShadow="lg" bg={bgColor} borderRadius="xl">
                <CardHeader pb={2} px={{ base: 0, md: 6 }}>
                  <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                    {/* Not "Basic Event Info". This card carries the activity identity and
                        the date/operator pair; "event" is the backend model's word, and the
                        farmer chose an ACTIVITY to get here. */}
                    {intl.formatMessage({ id: 'events.wizard.step.basic' })}
                  </Text>
                </CardHeader>
                <CardBody pt={4} pb={6} px={{ base: 0, md: 6 }}>
                  <FormProvider {...basicMethods}>
                    <form onSubmit={basicMethods.handleSubmit(onSubmitBasic)} noValidate>
                      <VStack spacing={{ base: 5, md: 6 }} align="stretch">
                        {/* Event Type Selection Section — hidden when the verb
                              entry already answered it — a verb tile, or a season-plan
                              item, which names the practice more precisely than any tile. */}
                        {!typeChooserAnswered && (
                          <SectionBox>
                            {/* Edit states the activity; create asks for it. The badge is
                                  "Required" only on the ASK — a locked restatement has
                                  nothing to fill in, and a Required chip over a control the
                                  farmer cannot touch is the same broken promise as the
                                  "Select the type…" instruction that used to sit here. */}
                            <SectionHeader
                              icon={FaTasks}
                              title={
                                isEdit
                                  ? intl.formatMessage({
                                      id: 'activities.editActivityTitle',
                                      defaultMessage: 'Activity'
                                    })
                                  : intl.formatMessage({
                                      id: 'activities.pickVerb',
                                      defaultMessage: 'What did you do?'
                                    })
                              }
                              badge={isEdit ? undefined : 'Required'}
                              description={
                                isEdit
                                  ? intl.formatMessage({
                                      id: 'activities.editActivityHint',
                                      defaultMessage: 'What this record documents'
                                    })
                                  : intl.formatMessage({
                                      id: 'activities.pickVerbHint',
                                      defaultMessage: 'Pick the activity you want to log'
                                    })
                              }
                            />
                            {isEdit && (
                              /* `info`, not `warning`. Nothing is wrong and there is nothing
                                 to fix — this is the one Chakra convention blue still carries
                                 (frontend.md). A warning fill next to a control the farmer
                                 cannot act on reads as an error they caused. */
                              <Alert status="info" mb={4} borderRadius="md">
                                <AlertIcon />
                                <Text fontSize="sm">
                                  {intl.formatMessage({ id: 'app.eventTypeCannotBeChanged' })}
                                </Text>
                              </Alert>
                            )}
                            {/* WS-4b: create mode shows the SHARED farmer-verb grid
                                  (components/Events/VerbPickerGrid — same tiles as the
                                  Activities page and parcel Add Event modal).

                                  Edit mode RESTATES the activity instead of re-rendering
                                  that grid disabled. A disabled picker is not a read-only
                                  display: it puts seven tap targets on screen, six of them
                                  dimmed to 0.4 (2.4:1 — below the 4.5 its own label owes),
                                  to communicate one word. It also spoke the wrong vocabulary
                                  — "Production" / "Other Farm Activities" are backend
                                  categories, hardcoded in English in `eventTypeConfig`, and
                                  sixteen distinct practices share the first of them. */}
                            {!isEdit ? (
                              <VerbPickerGrid
                                onSelect={handleVerbSelect}
                                selectedKey={pickedVerbKey}
                              />
                            ) : (
                              <HStack
                                spacing={4}
                                align="center"
                                borderWidth="1px"
                                borderColor="gray.200"
                                borderRadius="lg"
                                bg="gray.50"
                                px={4}
                                py={3}
                                width="100%">
                                {/* green.700, not green.500: a glyph is non-text and owes
                                    3.0, and green.500 is 2.78 even for that (frontend.md). */}
                                <Icon
                                  as={editVerb?.icon || FaClipboardList}
                                  boxSize={6}
                                  color="green.700"
                                  flexShrink={0}
                                  aria-hidden="true"
                                />
                                <VStack align="start" spacing={0} minW={0}>
                                  <Text fontWeight="semibold" color="gray.700">
                                    {editVerbLabel}
                                  </Text>
                                  {editSubtypeLabel && (
                                    <Text fontSize="sm" color="gray.600">
                                      {editSubtypeLabel}
                                    </Text>
                                  )}
                                </VStack>
                              </HStack>
                            )}

                            {/* Edit's correction affordance, production only.
                                  Every other tab owns its subtype as its single in-tab ask, so
                                  there is nothing to correct from here; production's ask lives
                                  in step 0 on both paths, which is why this is the one type
                                  that needs a way back to it. Hidden while the chooser is
                                  open — the grid below IS the control. */}
                            {isEdit &&
                              activeEventType === 1 &&
                              !correctingActivity &&
                              editVerbLabel && (
                                <Box mt={3}>
                                  <StandardButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCorrectingActivity(true)}>
                                    {intl.formatMessage(
                                      { id: 'activities.correctActivity' },
                                      { verb: editVerbLabel }
                                    )}
                                  </StandardButton>
                                </Box>
                              )}
                          </SectionBox>
                        )}

                        {/* Second-level activity question — family verbs only.
                              A tile that already pinned its subtype renders NOTHING here:
                              the page title carries the answer, and echoing it back as a
                              locked row is the same clutter the duplicate select was. */}
                        {pendingSubtypeChoices.length > 0 && (
                          <SectionBox>
                            <SectionHeader
                              icon={FaTasks}
                              title={intl.formatMessage({ id: 'activities.subtype.title' })}
                              description={intl.formatMessage({ id: 'activities.subtype.hint' })}
                            />
                            {/* One chooser, two clearing contracts. Create wipes the fields
                                  the wrong subtype collected; edit must not, because they came
                                  from a saved record. See handleCorrectSubtype. */}
                            <ActivitySubtypeChooser
                              eventType={activeEventType}
                              choices={pendingSubtypeChoices}
                              value={eventFormData.type || null}
                              onChange={isEdit ? handleCorrectSubtype : handleSubtypeSelect}
                            />
                          </SectionBox>
                        )}

                        {/* Wrong tile? One quiet way back to the grid — see chooserReopened. */}
                        {typeChooserAnswered && activeVerbKey && (
                          <Box>
                            <StandardButton
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Seed the grid's selection from the verb in force. Without
                                // it the grid opens with NOTHING highlighted while the page
                                // header still names a verb — the farmer cannot tell which
                                // tile they are changing away from.
                                setPickedVerbKey(activeVerbKey);
                                setChooserReopened(true);
                              }}>
                              {intl.formatMessage(
                                { id: 'activities.changeActivity' },
                                {
                                  verb: intl.formatMessage({
                                    id: `activities.verb.${activeVerbKey}`
                                  })
                                }
                              )}
                            </StandardButton>
                          </Box>
                        )}

                        {/* Event Timing & Traceability Section */}
                        <SectionBox>
                          {/* Date and operator are the certifier record — § 205.103(b)(2)
                                audit trail, and the "Responsible Party" column NOP form C21
                                asks for. This badge said "USDA GAP", a separate voluntary
                                food-safety audit scheme Trazo does not produce, on the two
                                fields every organic record starts with. */}
                          <SectionHeader
                            icon={FaCalendarAlt}
                            title={intl.formatMessage({
                              id: 'events.wizard.timing',
                              defaultMessage: 'Event Timing & Traceability'
                            })}
                            badge={intl.formatMessage({
                              id: 'events.section.badge.certifierRecord'
                            })}
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
                              helpText={intl.formatMessage({
                                id: 'events.wizard.dateHelp',
                                defaultMessage:
                                  'Select the exact date and time when this activity was performed'
                              })}
                              error={basicMethods.formState.errors.date?.message}>
                              <StandardInput
                                type="datetime-local"
                                {...basicMethods.register('date')}
                              />
                            </StandardField>

                            {/* Sprint 1 Epic 1.4: USDA GAP Traceability - Who performed this activity */}
                            <StandardField
                              label={intl.formatMessage({
                                id: 'events.wizard.performedBy',
                                defaultMessage: 'Performed By'
                              })}
                              helpText={intl.formatMessage({
                                id: 'events.wizard.performedByHelp',
                                defaultMessage:
                                  'Name of person who performed this activity (optional, helps with traceability)'
                              })}
                              required={false}
                              error={basicMethods.formState.errors.performed_by?.message}>
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
                              size="lg">
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
                <CardHeader pb={2} px={{ base: 0, md: 6 }}>
                  <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                    {/* The step-0 card names itself with its own step title; this one now
                        does the same. "Event Details" named the backend MODEL — the same
                        defect the stepper labels were fixed for, left standing on the card
                        heading directly beneath them. `app.eventDetails` is retired: this
                        was its last call site apart from EventDetailsModal, which now
                        heads that block with what is actually under it. */}
                    {intl.formatMessage({ id: 'events.wizard.step.details' })}
                  </Text>
                </CardHeader>
                <CardBody pt={4} pb={6} px={{ base: 0, md: 6 }}>
                  {/* WS-4c: voice accelerator — every entry path gets it, not just Quick */}
                  {!isEdit && activeEventType !== 0 && (
                    <Box mb={4}>
                      {showVoiceCapture ? (
                        <VoiceEventCapture
                          onEventDetected={handleVoiceEventDetected}
                          isActive={true}
                          cropType={voiceCropType}
                          autoStart={true}
                          onClose={() => setShowVoiceCapture(false)}
                        />
                      ) : (
                        <HStack spacing={3}>
                          <Button
                            leftIcon={<Icon as={FaMicrophone} />}
                            variant="outline"
                            colorScheme="green"
                            size="sm"
                            minH="44px"
                            onClick={() => setShowVoiceCapture(true)}>
                            {intl.formatMessage({ id: 'events.voice.fillByVoice' })}
                          </Button>
                          {templatesForEventType(activeEventType).length > 0 && (
                            <Button
                              leftIcon={<Icon as={FaClipboardList} />}
                              variant="outline"
                              colorScheme="green"
                              size="sm"
                              minH="44px"
                              onClick={() => setShowTemplatePicker(true)}>
                              {intl.formatMessage({ id: 'events.template.use' })}
                            </Button>
                          )}
                        </HStack>
                      )}
                      {/* Arrived from "Log this" on the season plan. The banner says out
                            loud that the values on screen are the CATALOGUE's, not the
                            farm's — the suggest→confirm red line the OSP § 11 panel and the
                            template accelerator both draw. The date is deliberately blank. */}
                      {activePlanItem && !showVoiceCapture && (
                        <Box
                          mt={3}
                          p={3}
                          bg="green.50"
                          borderWidth="1px"
                          borderColor="green.200"
                          borderRadius="md">
                          <Text fontSize="sm" fontWeight="semibold" color="green.700" mb={1}>
                            {activePlanItem.name}
                          </Text>
                          <Text fontSize="xs" color="gray.700">
                            {intl.formatMessage({ id: 'seasonPlan.logFromPlanNote' })}
                          </Text>
                        </Box>
                      )}
                      {appliedTemplateKey && !showVoiceCapture && (
                        <Box
                          mt={3}
                          p={3}
                          bg="green.50"
                          borderWidth="1px"
                          borderColor="green.200"
                          borderRadius="md">
                          <HStack justify="space-between">
                            <Text fontSize="sm" fontWeight="semibold" color="green.700">
                              {intl.formatMessage(
                                { id: 'events.template.applied' },
                                { name: intl.formatMessage({ id: appliedTemplateKey }) }
                              )}
                            </Text>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setAppliedTemplateKey(null)}>
                              ✕
                            </Button>
                          </HStack>
                        </Box>
                      )}
                      {voiceBanner && !showVoiceCapture && (
                        <Box
                          mt={3}
                          p={3}
                          bg="green.50"
                          borderWidth="1px"
                          borderColor="green.200"
                          borderRadius="md">
                          <HStack justify="space-between" align="start">
                            <VStack align="start" spacing={1} flex={1}>
                              <Text fontSize="sm" fontWeight="semibold" color="green.700">
                                {intl.formatMessage(
                                  { id: 'events.voice.applied' },
                                  { count: voiceBanner.count }
                                )}
                              </Text>
                              {voiceBanner.transcript ? (
                                <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                  “{voiceBanner.transcript}”
                                </Text>
                              ) : null}
                              {/* Say out loud what was NOT written. A value the farmer spoke
                                  and cannot see on the form has to be accounted for, or the
                                  banner's own count becomes the misleading part. */}
                              {voiceBanner.droppedCount > 0 && (
                                <Text fontSize="xs" color="gray.700">
                                  {intl.formatMessage(
                                    { id: 'events.voice.notRecordedHere' },
                                    { count: voiceBanner.droppedCount }
                                  )}
                                </Text>
                              )}
                              {voiceBanner.suggestion && (
                                <VStack align="start" spacing={2} pt={1}>
                                  <Text fontSize="xs" color="gray.700">
                                    {intl.formatMessage(
                                      { id: 'events.voice.typeMismatch' },
                                      {
                                        heard: intl.formatMessage({
                                          id: `activities.verb.${voiceBanner.suggestion.verbKey}`
                                        })
                                      }
                                    )}
                                  </Text>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    colorScheme="green"
                                    minH="44px"
                                    onClick={handleVoiceSwitchType}>
                                    {intl.formatMessage(
                                      { id: 'events.voice.switchTo' },
                                      {
                                        heard: intl.formatMessage({
                                          id: `activities.verb.${voiceBanner.suggestion.verbKey}`
                                        })
                                      }
                                    )}
                                  </Button>
                                </VStack>
                              )}
                            </VStack>
                            <Button size="xs" variant="ghost" onClick={() => setVoiceBanner(null)}>
                              ✕
                            </Button>
                          </HStack>
                        </Box>
                      )}
                    </Box>
                  )}
                  {activeEventType === 0 && (
                    <WeatherTab
                      key={`w-${voiceSeq}`}
                      ref={weatherTabRef}
                      onSubmitHandler={onSubmitMainInfo}
                      onDataChange={onDataChange}
                      onPrev={goToPreviousStep}
                      initialValues={eventFormData}
                      hideActions={true}
                    />
                  )}
                  {activeEventType === 1 && (
                    <ProductionTab
                      key={`p-${voiceSeq}`}
                      ref={productionTabRef}
                      onSubmitHandler={onSubmitMainInfo}
                      onDataChange={onDataChange}
                      onPrev={goToPreviousStep}
                      initialValues={eventFormData}
                      hideActions={true}
                      /* Create mode has already asked: a verb tile pinned the subtype, a plan
                         item named it, or step 0's ActivitySubtypeChooser collected it. Asking
                         again here — in raw codes, against all sixteen, with the page title
                         locked to the verb — is the double-ask this replaced. Edit mode keeps
                         the select: there, changing it is a correction, not a second ask. */
                      /* Unconditional now — it used to be gated on the edit flag. The wizard
                         owns the activity question on BOTH paths (create in the verb grid, edit
                         in step 0's chooser behind the "Not X?" link), so a `type` select down
                         here is a second surface for one fact whichever path renders it.
                         ⛔ Hiding the control must never unregister the field: `type` still has
                         to reach onSubmit, which is the half subtypeAskedOnce.test.tsx pins. */
                      hideSubtypeSelect
                      carbonCalculation={carbonCalculation}
                      isCalculatingCarbon={isCalculatingCarbon || isCalculating}
                    />
                  )}
                  {activeEventType === 2 && (
                    <ChemicalTab
                      key={`c-${voiceSeq}`}
                      ref={chemicalTabRef}
                      onSubmitHandler={onSubmitMainInfo}
                      onDataChange={onDataChange}
                      onPrev={goToPreviousStep}
                      initialValues={eventFormData}
                      hideActions={true}
                      carbonCalculation={carbonCalculation}
                      isCalculatingCarbon={isCalculatingCarbon || isCalculating}
                    />
                  )}
                  {activeEventType === 3 && (
                    <GeneralTab
                      key={`g-${voiceSeq}`}
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
                      key={`s-${voiceSeq}`}
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
                      key={`pm-${voiceSeq}`}
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
                      key={`b-${voiceSeq}`}
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
                      gap={3}>
                      <StandardButton
                        variant="outline"
                        onClick={goToPreviousStep}
                        leftIcon={<FaChevronLeft />}
                        size={{ base: 'md', md: 'lg' }}
                        order={{ base: 3, md: 1 }}
                        w={{ base: '100%', md: 'auto' }}>
                        {intl.formatMessage({ id: 'common.back' }) || 'Previous'}
                      </StandardButton>
                      <Flex
                        direction={{ base: 'row', md: 'row' }}
                        gap={3}
                        order={{ base: 1, md: 2 }}
                        w={{ base: '100%', md: 'auto' }}>
                        <StandardButton
                          variant="outline"
                          colorScheme="blue"
                          onClick={handleOpenPreview}
                          leftIcon={<FaEye />}
                          size={{ base: 'md', md: 'lg' }}
                          flex={{ base: 1, md: 'none' }}>
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
                                // D7 — validation failure used to be a console.warn, which a
                                // farmer never sees: Continue simply did nothing and the page
                                // did not move. Tell them what happened and take them to it.
                                focusFirstInvalidField();
                                toast({
                                  title: intl.formatMessage({
                                    id: 'events.form.validationFailedTitle',
                                    defaultMessage: 'Some required details are missing'
                                  }),
                                  description: intl.formatMessage({
                                    id: 'events.form.validationFailedBody',
                                    defaultMessage:
                                      'We highlighted the first field that needs attention.'
                                  }),
                                  status: 'error',
                                  duration: 6000,
                                  isClosable: true,
                                  position: 'top'
                                });
                              }
                            } else {
                              // Fallback for any tab that doesn't have submitForm yet
                              currentTabRef?.current?.flushData?.();
                              setActiveStep(2);
                            }
                          }}
                          rightIcon={<FaChevronRight />}
                          size={{ base: 'md', md: 'lg' }}
                          flex={{ base: 1, md: 'none' }}>
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
                <CardHeader pb={2} px={{ base: 0, md: 6 }}>
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
                      label={intl.formatMessage({ id: 'events.wizard.step.photos' })}
                      helpText={intl.formatMessage({
                        id: 'events.wizard.photosHelp',
                        defaultMessage: 'Upload photos documenting this agricultural event'
                      })}>
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
                        gap={3}>
                        <StandardButton
                          variant="outline"
                          onClick={goToPreviousStep}
                          leftIcon={<FaChevronLeft />}
                          size={{ base: 'md', md: 'lg' }}
                          order={{ base: 3, md: 1 }}
                          w={{ base: '100%', md: 'auto' }}>
                          {intl.formatMessage({ id: 'common.back' }) || 'Previous'}
                        </StandardButton>
                        <Flex
                          direction={{ base: 'row', md: 'row' }}
                          gap={3}
                          order={{ base: 1, md: 2 }}
                          w={{ base: '100%', md: 'auto' }}>
                          <StandardButton
                            variant="outline"
                            colorScheme="blue"
                            onClick={handleOpenPreview}
                            leftIcon={<FaEye />}
                            size={{ base: 'md', md: 'lg' }}
                            flex={{ base: 1, md: 'none' }}>
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
                            flex={{ base: 1, md: 'none' }}>
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

      {/* WS-4 template accelerator picker */}
      <ResponsiveModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        size="md"
        header={
          <Text fontSize="lg" fontWeight="semibold">
            {intl.formatMessage({ id: 'events.template.pickTitle' })}
          </Text>
        }>
        <VStack align="stretch" spacing={2}>
          {templatesForEventType(activeEventType).map((tpl) => (
            <StandardButton
              key={tpl.id}
              variant="outline"
              minH="44px"
              justifyContent="flex-start"
              onClick={() => handleTemplateSelect(tpl)}>
              {intl.formatMessage({ id: tpl.nameKey })}
            </StandardButton>
          ))}
        </VStack>
      </ResponsiveModal>
    </StandardPage>
  );
}

export default NewEvent;
