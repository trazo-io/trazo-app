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
  Stack,
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
  FaLayerGroup,
  FaPaste
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
  StandardAlert,
  StandardTextarea
} from 'components/Design/StandardComponents';
import { useEventDraft } from 'src/hooks/useEventDraft';
import { TrazoImageUpload } from 'components/Upload';
import { CorrectRecordModal } from 'components/Modals/CorrectRecordModal';
import { scrollAllToTop } from 'components/Utils/ScrollToTop';
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
import { useGetParcelQuery } from 'store/api/productApi';
import { useGetFieldNoteQuery } from 'store/api/fieldNoteApi';
import { isApplicationRecord, withoutInputValues } from 'config/events/crewNoteApplication';
import { useGetSeasonPlanQuery } from 'store/api/seasonPlanApi';
import { EventPreviewModal } from 'components/Events/EventPreviewModal';
import { PhotoRecommendationsBox } from 'components/Events/PhotoRecommendationsBox';
import { useGoogleMap } from '@react-google-maps/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import {
  // 🔴 `ACTIVITY_VERBS` was USED at the preset-clearing loop below and never imported, so
  // tapping any verb tile INSIDE the wizard threw `ReferenceError: ACTIVITY_VERBS is not
  // defined` and the error boundary rendered "We hit a snag loading this page". Reaching a form
  // through the Activities-page picker worked (it navigates with `?verb=`), which is why the
  // crash sat on the one path nobody re-tested. Found 2026-09-08 while verifying private_note.
  ACTIVITY_VERBS,
  HOISTED_SUBTYPE_EVENT_TYPES,
  subtypeChoicesFor,
  subtypeQuestionFor,
  verbForEvent,
  verbForKey
} from 'config/activityVerbs';
import { getFieldConfig, getSubtypes } from 'config/events';
import { buildVoiceFieldRequests } from 'config/events/voiceFields';
import { ActivitySubtypeChooser } from 'components/Events/ActivitySubtypeChooser';
import { VerbPickerGrid } from 'components/Events/VerbPickerGrid';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { VoiceEventCapture } from 'components/Events/VoiceEventCapture';
import {
  mapVoiceDataToFieldValues,
  mapVoiceTypeToTemplate,
  gateVoiceOverridesToForm,
  shouldOfferActivitySwitch,
  voiceTypeForActivity,
  VOICE_UNIT_COMPANIONS,
  mergeOfferedValues
} from 'utils/voiceDataMapper';
import { voiceBlockSuggestion } from 'utils/spokenBlock';
import { templatePrefillValues, templatesForEventType } from 'config/events/templateAccelerators';
import {
  formatDateFromTimestamp,
  isOperatorChosenDate,
  nowLocalDateTimeInput
} from 'utils/dateOnly';

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
/**
 * An attached catalog listing — OMRI or WSDA — belongs to the PRODUCT NAME it was looked up
 * under.
 *
 * `ChemicalEvent.omri_product` is what lets the audit dossier print a bare "OMRI Listed"
 * (instead of "OMRI Listed — grower-selected, no listing on file") and what lets the buyer
 * page speak OMRI's name at all, so it is only ever written by the grower tapping "Use this
 * listing" in `InputVerifyHelper` — see `consumer-omri-listing-leak-2026-08-09`, and the
 * guard in `components/Compliance/__tests__/omriAttachIsExplicit.test.tsx`.
 *
 * The tab keeps the pk and the name consistent because it owns both. Voice does not: it
 * merges a PARTIAL payload into `eventFormData` and then bumps `voiceSeq`, which remounts the
 * tab so it re-reads `initialValues`. So a listing attached to "Kocide 3000-O" before the
 * grower dictates "Entrust SC" would be reset straight back into the form beside the new
 * name and saved — a § 205.601 listing claim for a product that does not hold one, which is
 * the 08-09 leak one field over.
 *
 * Every voice merge runs through here. Type/subtype changes do not need it: they allow-list
 * what survives (`date`, `performed_by`), so the name and the pk are dropped together.
 * Template accelerators do not either: `PREFILLABLE_FIELDS` deliberately excludes
 * `commercial_name`.
 */
const withListingAttachmentChecked = (prev, merged) =>
  (merged.omri_product != null || merged.wsda_material != null) &&
  typeof merged.commercial_name === 'string' &&
  merged.commercial_name !== prev.commercial_name
    ? { ...merged, omri_product: null, wsda_material: null }
    : merged;

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
  // Run 8 (R8-08): a basis recorded as "Not yet confirmed", on a chemical or a soil record.
  organic_approved: {
    id: 'app.completenessGap.organicBasis',
    defaultMessage: 'What shows the input is allowed (organic basis)'
  },
  amendment_organic_approved: {
    id: 'app.completenessGap.organicBasis',
    defaultMessage: 'What shows the input is allowed (organic basis)'
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

  // Field notes: "Log this" on a crew WhatsApp message arrives with ?field_note=<uuid>.
  //
  // A UUID, never a numeric id, so a hand-edited link cannot walk other operations' notes. And the
  // note is FETCHED below rather than carried in the URL, for the same reason the plan item is:
  // whatever seeds this form must come from the server, scoped to the caller. It matters more here.
  // These words steer the model's `event_type` and are interpolated into its prompt, so a
  // ?transcript= parameter would be a prompt-injection vector wearing a link, and it would also put
  // a crew member's sentence into browser history and every access log on the way.
  const fieldNoteIdFromUrl = searchParams.get('field_note');
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
    // `presetFields` (config/activityVerbs) — the tile's own identity, e.g. Cleanout ⇒ the
    // Equipment Maintenance operation type is "Cleaning". See the interface comment there.
    return presetVerb?.subtype
      ? { type: presetVerb.subtype, ...(presetVerb.presetFields || {}) }
      : {};
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
   * Step 0 refused to advance because the subtype question is still open.
   *
   * 🔴 Reachable only since chemical was hoisted (2026-09-01). The production families seed a
   * default the moment their tile is tapped, so `type` is never empty there; chemical
   * deliberately seeds nothing — a pesticide filed as a fertilizer is a false claim, not a
   * missing field — which means the farmer CAN reach Continue with the question unanswered.
   * With the tab's own select now hidden, letting that through lands them on a form that
   * rejects a required field it does not render. Refuse here, where the control is.
   */
  const [subtypeUnanswered, setSubtypeUnanswered] = useState(false);

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

  /*
   * An in-page tile pick answers the question the same way a preset does.
   *
   * Until 2026-09-03 only the three presets counted, so a tap INSIDE the wizard left all
   * fourteen tiles on screen and pushed the subtype ask and the date below them — on a
   * 375px phone the farmer scrolled past two screens of tiles they had already chosen
   * from, then scrolled back up after Continue. The page title carries the answer
   * (`activeVerbKey` below re-titles on a pick) and the "Not {verb}?" link is the way
   * back — on this path exactly as on the preset paths, one behaviour for four entries.
   */
  const typeChooserAnswered =
    (typePresetFromVerb || typePresetFromPlan || typePresetFromRepeat || !!pickedVerbKey) &&
    !chooserReopened;

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
  // Fetched, not trusted. The scoping is the server's (`company__in=user.companies`), so a link to
  // another operation's note returns 404 and seeds nothing.
  const { data: activeFieldNote } = useGetFieldNoteQuery(fieldNoteIdFromUrl, {
    skip: !fieldNoteIdFromUrl || isEdit
  });

  const { data: seasonPlanData } = useGetSeasonPlanQuery(
    { historyId: planProductionIdFromUrl },
    { skip: !planProductionIdFromUrl || !planItemIdFromUrl || isEdit }
  );
  // Hand the note's words to the panel that already knows what to do with somebody else's sentence.
  //
  // Nothing new is built here: the seeded path renders the parse as a HELD OFFER with an explicit
  // "Fill in N values" tap and asks which day the work happened, because on a pasted or forwarded
  // note the person confirming is not the person who spoke. A WhatsApp note needs the date question
  // MORE than a pasted one does: it can sit unread for days, so a Friday note about Tuesday's spray
  // would otherwise file under Friday and take the pre-harvest interval and the CA PUR day with it.
  //
  // Only a WAITING note seeds. A confirmed or discarded one opening a fresh offer would invite a
  // second record for work already logged.
  useEffect(() => {
    if (!activeFieldNote || activeFieldNote.status !== 'pending') return;
    if (!activeFieldNote.words) return;
    if (seededFromNoteRef.current === activeFieldNote.public_id) return;
    seededFromNoteRef.current = activeFieldNote.public_id;
    setVoiceSeedText(activeFieldNote.words);
    setShowVoiceCapture(true);
    // Here, not only when the parse returns. MEASURED in a browser 2026-09-26: the panel that holds
    // the seed mounts on step 2, so landing from the inbox showed step 1 with today's date already
    // filled in and nothing about the note on screen. The supervisor answered a date before they
    // had been told which message they were answering it for.
    reclaimGuessedDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFieldNote]);

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
        /* The list for the type IN FORCE, not production's. The fallback branches ask this
           when nothing upstream answered, and sixteen production codes on a chemical record
           would be a worse question than none. */
        allSubtypesForType:
          activeEventType == null ? [] : getSubtypes(activeEventType).map((entry) => entry.code)
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
  // A note the farmer PASTED rather than spoke: today a crew WhatsApp message, by hand. It runs
  // the same extraction as voice and then stops: `seeded` on the result makes the wizard hold the
  // values instead of merging them (handleVoiceEventDetected). Kept out of `eventFormData` so a
  // half-typed paste can never be submitted as part of a record.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteDraft, setPasteDraft] = useState('');
  const [voiceSeedText, setVoiceSeedText] = useState('');
  // One-shot, keyed on the note's id. The panel consumes the seed and clears it (so the mic works
  // again and the same words are never re-billed to a second parse), so without this guard the
  // effect would immediately re-seed from the still-present query and the offer could never be
  // dismissed.
  const seededFromNoteRef = useRef(null);
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

  // Date AND time. The record's field is a `datetime-local` and the application time feeds
  // re-entry intervals, so a banner that states the day while writing a minute hides half of what
  // it wrote.
  const localDateTimeLabel = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return localDateLabel(value);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  // Step management
  const [activeStep, setActiveStep] = useState(0);

  // The heading of whichever step card is mounted. One ref, three headings — only one
  // step renders at a time, so the ref always points at the visible one.
  const stepHeadingRef = useRef(null);

  // The seeded offer announces itself. A pasted note is somebody else's words arriving in a
  // form the farmer is already typing in, and the panel it replaces is gone by then, so nothing
  // told a screen-reader user that a set of values is now waiting for a decision (WCAG 4.1.3).
  const voiceOfferRef = useRef(null);

  // What the machine offered from a crew message and which of those values the confirmer applied.
  // Sent with the save as `field_note_proposal`: the server keeps it on the confirmation history and
  // refuses an application whose input details came from the message (OSP alignment audit T29).
  const fieldNoteProposalRef = useRef({
    offered: {},
    applied: [],
    model: '',
    language: '',
    negation: ''
  });

  // What a crew-note offer may hold for a given record type: on an application, never a product,
  // rate, quantity, area or unit. Applied wherever the offer is BUILT, so the banner never promises
  // values the tap will not write, and it names what was held back (review of app #63).
  const crewNoteOffer = (kept, eventType, form) =>
    // Decided by the record type alone, exactly like the apply step, so a pasted note (somebody
    // else's words with no crew note attached) is held to the same rule (review of app #64).
    isApplicationRecord(eventType, form)
      ? withoutInputValues(kept || {})
      : { allowed: kept || {}, withheld: [] };

  /*
   * A step change is a page change to the farmer, so it lands like one: at the top, with
   * focus on the new step's heading.
   *
   * Until 2026-09-03 `setActiveStep` swapped the card's content at the SAME scroll offset.
   * Continue sits at the bottom of step 0 and the details card is longer, so the farmer
   * landed mid-form in "Application Rate & Coverage" and scrolled up two screens to find
   * the start (375px). Back had the mirror problem. `ScrollToTop` only fires on a pathname
   * change, which a step is not.
   *
   * Instant, not smooth — same as a route change, so nothing to gate on
   * prefers-reduced-motion. Focus moves so assistive tech announces the step it is now on
   * (WCAG 2.4.3) instead of staying on a Continue button that no longer exists;
   * `preventScroll` keeps the focus jump from fighting the scroll. Second call inside the
   * frame callback: the ref points at the OLD heading until the swap has rendered.
   */
  const focusStepHeading = useCallback(() => {
    if (typeof window === 'undefined') return;
    scrollAllToTop();
    window.requestAnimationFrame(() => {
      scrollAllToTop();
      try {
        stepHeadingRef.current?.focus({ preventScroll: true });
      } catch {
        /* nothing focusable mounted — the scroll already did the useful part */
      }
    });
  }, []);

  // Skipped on first mount: that landing is ScrollToTop's, and stealing focus onto a
  // heading before the farmer has touched anything is wrong.
  const prevStepRef = useRef(activeStep);
  useEffect(() => {
    if (prevStepRef.current === activeStep) return;
    prevStepRef.current = activeStep;
    focusStepHeading();
  }, [activeStep, focusStepHeading]);

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

  // What step 0 seeded the date field with. Read off react-hook-form rather than recomputed, so
  // it is byte-identical to the value the operator was shown and cannot drift by a minute.
  const wizardDefaultDate = basicMethods.formState.defaultValues?.date;

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
    // See `subtypeUnanswered`: a hoisted type whose chooser is open and unanswered has no
    // second surface to answer on, so advancing strands the farmer on a form that demands a
    // field it does not render.
    if (pendingSubtypeChoices.length > 0 && !eventFormData.type) {
      setSubtypeUnanswered(true);
      return;
    }
    setSubtypeUnanswered(false);
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
    // `requested_fields` rides along on the result (see VoiceEventCapture) — the answer is
    // validated against what was actually asked for, so a key nobody requested is dropped
    // before the render gate ever sees it.
    // Per-activity answers are answers to the question WE asked, and we asked about the activity
    // the farmer chose. If the model heard a different activity, they answer the wrong question.
    //
    // MEASURED 2026-09-01: an irrigation sentence spoken on a Frost Protection form came back
    // with `protection_method: "other"` — a value the farmer never uttered, supplied because the
    // key was on the list. The mismatch notice is the right response to that utterance; carrying
    // its field answers onto the form as well is not. (The transcript still reaches the notes,
    // and the switch offer still lets them move to the activity they described.)
    const heardADifferentActivity = shouldOfferActivitySwitch(
      mapping,
      eventData.type,
      eventTypeId,
      subtypeCode,
      pickedVerbKey
    );
    const result = mapVoiceDataToFieldValues(
      eventData,
      mapping.templateId,
      heardADifferentActivity ? [] : eventData.requested_fields || []
    );
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

    // A block the farmer NAMED that voice could not fill — OFFERED, never written.
    //
    // Voice fills `block_id` only from the parcel's own blocks, and only when their exact name
    // was said. MEASURED 2026-09-11 in production: "…en el bloque 4, 10 libras por acre…" filled
    // product, method and rate and silently left the block — the parcel had no block 4 yet, and a
    // Spanish "bloque 4" could never have matched an English "Block 4" either. `spokenBlock`
    // lifts the block out of the words by pattern, so it can only be something said, and the
    // banner shows it as a button: the farmer's tap is what writes it (handleVoiceBlockAccept).
    // Never offered over a block the farmer already typed, or on an activity with no block field.
    const transcript = eventData.original_transcript || eventData.description || '';
    const formHasBlock =
      'block_id' in gateVoiceOverridesToForm({ block_id: '_' }, eventTypeId, subtypeCode).kept;
    const blockSuggestion =
      formHasBlock && !kept.block_id && !String(eventFormData.block_id ?? '').trim()
        ? voiceBlockSuggestion(transcript, knownBlockIds)
        : null;

    return {
      mapping,
      kept,
      detected,
      banner: {
        transcript,
        blockSuggestion,
        // WHICH fields, not just how many. "1 fields filled" with nothing visibly changed is
        // what a farmer sees when the only thing voice could keep was `observation` — the
        // notes box, which sits below the fold on every activity. A count alone cannot be
        // checked; a name can.
        keptFields: Object.keys(kept),
        droppedCount: dropped.length,
        // A mismatch is judged on the ACTIVITY, not on the backend event type.
        //
        // MEASURED 2026-08-30: farmer on Frost Protection says "irrigated the field for six
        // hours with the drip system". Irrigation and Frost Protection are both PRODUCTION
        // (event type 1), so `backendEventType !== eventTypeId` was false, no switch was
        // offered, and the panel simply announced "Sounds like: Irrigation" over a Frost
        // Protection form. The gate then dropped every irrigation field and the banner
        // reported "1 fields filled" — the transcript in the notes box. Nothing on screen
        // said the activity itself was wrong. Since the activity-verb pivot the farmer picks
        // a VERB (Irrigation and Frost protection are two separate tiles), so the subtype is
        // the activity and has to be part of this comparison.
        //
        // Two things still disqualify an offer:
        //   - an UNRECOGNISED utterance, which arrives as `general`: that is ignorance, not a
        //     detection (isRecognizedVoiceType);
        //   - a different subtype UNDER THE SAME VERB TILE (field_work covers CU/TH/MO), where
        //     the tile is already right and its own subtype select is the place to correct it,
        //     not a "switch activity" button that would name the tile the farmer is on.
        // An unknown subtype (soil/pest/business before the in-tab select) also stays quiet —
        // there is nothing yet to disagree with.
        suggestion: heardADifferentActivity ? mapping : null,
        // Provenance, and it must be its own flag: `seededPending` is nulled the moment the farmer
        // accepts or refuses, so keying copy on it relabels a pasted note as "Voice input applied"
        // one tap later. This survives both.
        seeded: Boolean(eventData.seeded),
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

  // What voice is allowed to ask for on THIS activity, resolved from the display registry.
  // Both are derived here, in the one place that owns the activity: the panel receives facts,
  // not the registry.
  const voiceActivitySlug = useMemo(
    () => voiceTypeForActivity(activeEventType, eventFormData.type),
    [activeEventType, eventFormData.type]
  );
  // The blocks this parcel has actually used. Same source the chips under the Block/Section
  // input read (`BlockIdField`), so voice offers the grower their own vocabulary instead of
  // transcribing an identifier letter by letter.
  const { data: voiceParcel } = useGetParcelQuery(
    { companyId: currentCompany?.id, farmId, parcelId },
    { skip: !currentCompany?.id || !farmId || !parcelId }
  );
  const knownBlockIds = useMemo(
    () => (Array.isArray(voiceParcel?.known_block_ids) ? voiceParcel.known_block_ids : []),
    [voiceParcel]
  );

  const voiceFieldRequests = useMemo(
    () =>
      buildVoiceFieldRequests(
        activeEventType,
        eventFormData.type || undefined,
        voiceActivitySlug,
        (labelKey) => intl.formatMessage({ id: labelKey, defaultMessage: '' }),
        { knownBlockIds }
      ),
    [activeEventType, eventFormData.type, voiceActivitySlug, intl, knownBlockIds]
  );

  // Labels for the fields voice actually wrote, resolved through the display registry so the
  // banner uses the same words the form does. A field with no registry label (or one whose
  // labelKey is missing from the catalogue) is skipped rather than printed as a raw key.
  const voiceFilledLabels = useMemo(() => {
    // Unit companions (`area_unit`, `fuel_unit`, `yield_unit`…) are excluded from BOTH the
    // count and the names, and they have to be excluded from the same place or the banner
    // contradicts itself: they have no display-registry entry of their own, so counting them
    // produced "8 fields filled" above a list of five names. A unit is part of a value, not a
    // fact the farmer needs to go and check.
    const named = (voiceBanner?.keptFields || []).filter((name) => !VOICE_UNIT_COMPANIONS[name]);

    // Fields the registry renders as ONE thing are named once here too.
    //
    // MEASURED 2026-09-01 on a farmer's phone, in Spanish: "NPK 10 guion 10 guion 10" filled
    // nitrogen, phosphorus and potassium, and the banner listed
    // "Relacion NPK, Fósforo (%), Potasio (%)" — three entries, one of them wearing the GROUP's
    // name because `nitrogen_percentage` is the group leader (`groupWith`, formatted by
    // formatNPK). So the farmer was told about a field called "NPK ratio" and never told about
    // nitrogen at all. The registry's own rule is that a group "is rendered by a single formatter
    // and the other fields are automatically hidden from their own render slots"; this banner is
    // another render slot.
    const absorbed = new Set();
    named.forEach((name) => {
      const cfg = getFieldConfig(activeEventType, name);
      (cfg?.groupWith || []).forEach((member) => absorbed.add(member));
    });
    const names = named.filter((name) => !absorbed.has(name));

    return names
      .map((name) => {
        const cfg = getFieldConfig(activeEventType, name);
        if (!cfg?.labelKey) return null;
        const label = intl.formatMessage({ id: cfg.labelKey, defaultMessage: '' });
        return label || null;
      })
      .filter(Boolean);
  }, [voiceBanner, activeEventType, intl]);

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

    // A SEEDED parse merges NOTHING. The values are offered and the farmer's tap writes them,
    // exactly like `blockSuggestion` above and the OSP "Use suggestion" button
    // (OSPModuleWizard.tsx) that § 205.201(a) requires.
    //
    // Why seeded is different from spoken, when both run the same gates: every echo gate
    // downstream asks "do these words appear in the transcript", and voiceDataMapper.ts:1199 says
    // why in its own comment: if the words are absent the answer came from somewhere other than
    // the FARMER. Those gates catch a MODEL inventing a value. They cannot catch a SENDER who is
    // wrong, and on a pasted note the sender is not the person confirming. Auto-filling a form
    // from a third party's words and letting a tired supervisor press save at 9pm is how a record
    // nobody performed reaches a certifier packet. That is the backdated-template class, one
    // channel over.
    if (eventData.seeded) {
      fieldNoteProposalRef.current = {
        ...fieldNoteProposalRef.current,
        offered: { ...(kept || {}) },
        model: String(eventData.model_used || eventData.source || ''),
        language: String(activeFieldNote?.transcript_language || ''),
        negation: String(eventData.negation || '')
      };
      // MANUAL REVIEW (audit T29). The message denies all or part of what it describes, or could not
      // be read: nothing is offered and nothing is guessed, including "nothing happened". The
      // confirmer reads the message and types what they decide.
      if (eventData.manual_review) {
        pendingVoiceRef.current = null;
        reclaimGuessedDate();
        setVoiceBanner({
          ...banner,
          droppedCount: 0,
          keptFields: [],
          seededPending: null,
          manualReview:
            eventData.negation === 'mixed'
              ? 'mixed'
              : eventData.negation === 'all'
              ? 'all'
              : 'unreadable'
        });
        setShowVoiceCapture(false);
        setVoiceSeedText('');
        return;
      }
      // THE HOLD SURVIVES ON THIS PATH TOO (2026-09-25).
      //
      // It used to be dropped here while `droppedCount` was still zeroed two lines below, so on
      // soil, pest and business (the three that ask their subtype INSIDE the tab, not with a verb
      // tile) every subtype-gated value was discarded AND the "not filled in" notice was
      // suppressed with it. Acreage is gated on 9 of the 10 soil subtypes, so the most common
      // soil note lost its area silently. Zeroing the count is right ONLY while something is
      // actually holding the values; the effect below sets the true number once the subtype lands.
      //
      // `seeded` on the ref is what keeps the promise: the effect re-OFFERS the newly gated set
      // rather than merging it, because on a pasted note the sender is still not the confirmer.
      // `transcript` rides along because the banner it will rebuild may not exist by then:
      // picking a verb tile nulls the banner, and a re-offer with no quoted words would ask the
      // farmer to accept values from a note they can no longer read.
      pendingVoiceRef.current = holding
        ? { detected, eventType: activeEventType, seeded: true, transcript: banner.transcript }
        : null;

      // A PASTED NOTE DESCRIBES WORK ALREADY DONE, so today is a guess (plan rule 5.5.1).
      //
      // Step 0 seeds the date with `nowLocalDateTimeInput()` before the paste box is ever
      // reached, so three notes from Tuesday's spray, pasted on Friday, become three records
      // dated Friday: wrong pre-harvest interval, wrong CA PUR day (it files strictly on
      // `event.date`), and a packet asserting an application on a day nobody sprayed. The spoken
      // path never had this problem because a farmer speaks about what they just did.
      //
      // So the inherited default is CLEARED and offered back as one tappable suggestion with its
      // provenance on screen, the same suggest-then-confirm shape as `blockSuggestion` and the
      // OSP "Use suggestion" button. A day the operator actually chose is left alone: this only
      // takes back the wizard's own guess.
      reclaimGuessedDate();

      setVoiceBanner({
        ...banner,
        droppedCount: holding ? 0 : banner.droppedCount,
        // NOTE: the date question is DERIVED from `eventFormData.date`, never stored here. It was
        // stored once (`dateSuggestion` / `confirmedDate`) and that is a second source of truth
        // for one fact: answering it on step 0 left the flag set, so the question came back with
        // its "It happened today" button live over the day the operator had just chosen, and one
        // tap overwrote it. Exactly the wrong-CA-PUR-day outcome this was written to prevent.
        // See `seededDateUnanswered` below.
        // The set the farmer is being offered, held OUTSIDE the form until they accept it.
        ...(() => {
          const offer = crewNoteOffer(kept, activeEventType, eventFormData);
          return {
            // Only when something was held back; otherwise the parse's own list stands.
            ...(offer.withheld.length ? { keptFields: Object.keys(offer.allowed) } : {}),
            withheldFields: offer.withheld,
            seededPending: { kept: offer.allowed, eventType: activeEventType, subtype }
          };
        })()
      });
      setShowVoiceCapture(false);
      // The note has been consumed. Without this the panel re-mounts with the SAME seed, so
      // "Fill by voice" never opens a mic again and every tap re-POSTs the old note to the
      // extractor (a second billed parse, and a voice-budget unit on a web-speech deploy).
      // Batched with setShowVoiceCapture, so there is no render in which the panel is open
      // with the seed already gone.
      setVoiceSeedText('');
      // No `voiceSeq` bump: nothing was merged, so there is nothing for the tabs to re-read.
      return;
    }

    setEventFormData((prev) => withListingAttachmentChecked(prev, { ...prev, ...kept }));
    setVoiceBanner(holding ? { ...banner, droppedCount: 0 } : banner);
    setShowVoiceCapture(false);
    setVoiceSeq((s) => s + 1);
  };

  // The tap that answers the date question with today.
  //
  // Writes the day ONLY when the farmer says so. `dateSuggestion` is cleared rather than kept as
  // "confirmed today", because the banner then has one less state to get wrong: a date on the
  // form is the form's fact from that point on, and step 0 is its one editor.
  const handleVoiceSeededUseToday = () => {
    // Now, to the minute, and the banner states it once written. A `datetime-local` record always
    // carries a time and this wizard has always supplied one; what this path fixes is the DAY.
    // The time is shown rather than hidden, and step 0 stays where it is changed.
    const value = nowLocalDateTimeInput();
    setEventFormData((prev) => ({ ...prev, date: value }));
    basicMethods.setValue('date', value);
  };

  // The other answer: the work happened on some other day, so go to the field that owns the date.
  //
  // Step 0 is the ONE editor for this fact (see the mutation-payload rule). A second date input
  // inside this banner would be a second editor for a § 205.103(b)(2) value, which is the shape
  // that produced the buffer and OFPP clobbers. The offer survives the trip: it lives on
  // `voiceBanner`, not on the step.
  const handleVoiceSeededPickAnotherDay = () => {
    setActiveStep(0);
  };

  // Take back the wizard's own guess at the day, and only its own guess.
  //
  // ONE function, called from both the seeded parse and the moment a field note loads, because two
  // spellings of one rule is how the may-send gate drifted from its own property earlier in this
  // work. Compared against the form's OWN seeded default rather than against "is it today": a
  // grower who set 06:30 for a dawn spray and opens the note at 11:43 chose that time.
  const reclaimGuessedDate = useCallback(() => {
    // Reads the FORM as well as the wizard's state, and that is the whole correctness of it.
    // MEASURED in a browser 2026-09-26: on arrival from the inbox `eventFormData.date` is not set
    // yet (it is written when step 0 is submitted) while the input on screen already shows the
    // wizard's seeded default. Testing only `eventFormData.date` returned early and cleared
    // nothing, so the operator was still looking at today.
    const onScreen = basicMethods.getValues('date');
    const inherited = eventFormData.date || onScreen;
    if (!inherited || isOperatorChosenDate(inherited, wizardDefaultDate)) return;
    setEventFormData((prev) => {
      const next = { ...prev };
      delete next.date;
      return next;
    });
    basicMethods.setValue('date', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFormData.date, wizardDefaultDate]);

  // ONE source of truth: the form's own date field. Answering on step 0 ends the question by
  // itself, `handleVoiceSwitchType` rebuilding the banner cannot lose it, and there is no flag to
  // reconcile against the value that will actually be filed.
  const voiceBannerHeadline = voiceBanner
    ? intl.formatMessage(
        {
          // Manual review first: nothing was filled, so neither "offered" nor "filled" is true, and
          // "0 fields filled" in success green read as done (review of app #63).
          id: voiceBanner.manualReview
            ? 'events.voice.crewNoteManualReviewHeadline'
            : voiceBanner.seeded
            ? voiceBanner.seededPending
              ? 'events.voice.pastedNoteOffered'
              : 'events.voice.pastedNoteApplied'
            : 'events.voice.applied'
        },
        { count: voiceFilledLabels.length }
      )
    : '';

  const seededDateUnanswered = Boolean(voiceBanner?.seeded) && !eventFormData.date;
  const seededDateAnswered = Boolean(voiceBanner?.seeded) && Boolean(eventFormData.date);

  // Move focus to the offer when one appears, the same way a step change moves it to the new
  // heading. Keyed on the OFFER, not on the banner: a spoken parse merges into the form and the
  // farmer is already looking at it, so stealing focus there would interrupt someone mid-type.
  const hasSeededOffer = Boolean(voiceBanner?.seeded && voiceBanner?.seededPending);
  useEffect(() => {
    if (!hasSeededOffer) return;
    try {
      voiceOfferRef.current?.focus({ preventScroll: true });
    } catch {
      /* nothing focusable mounted; the live region still announces */
    }
  }, [hasSeededOffer]);

  // The tap that turns an offered set into form values.
  //
  // FILLS EMPTIES ONLY. `kept` is a snapshot frozen at parse time, and the farmer is invited to
  // read the quoted note and type while the offer sits there: the buttons say "Would fill" and
  // "Fill in N values", which promise filling, not replacing. Spreading the snapshot over `prev`
  // silently replaced whatever they had typed in between, including `observation`, which is
  // published verbatim on the buyer page. The parse-time guard that protects `observation`
  // (see applyVoiceData) read the form BEFORE those keystrokes existed, so it could not fire.
  //
  // Skipped by VALUE PAIR, not by key. `VOICE_UNIT_COMPANIONS` pairs a unit with its amount,
  // and a tab supplies unit defaults of its own (ChemicalTab defaults volume_unit and area_unit),
  // so an empty-by-key test would write an amount while leaving a default unit that contradicts
  // the note: 40 with "gal" when the note said pounds. A pair is written together or not at all.
  const handleVoiceSeededApply = () => {
    const pending = voiceBanner?.seededPending;
    if (!pending) return;
    // On an application the message never fills a product, rate, quantity, area or unit: those come
    // from the confirmer's own records (audit T29). Decided by the record's type now, not by a hint.
    const applicationRecord = isApplicationRecord(activeEventType, eventFormData);
    const kept = applicationRecord ? withoutInputValues(pending.kept).allowed : pending.kept;

    // WHAT WAS ACTUALLY WRITTEN, not what was offered. `mergeOfferedValues` fills empties and
    // never overwrites, which is the point: while the offer stands the farmer is invited to read
    // the quoted note and type. So somebody who distrusts the sender's product name and enters
    // their own keeps it, and the merge skips that key.
    //
    // `keptFields` is the SOLE source of the "N fields filled / Filled: ..." line, and it was left
    // at the parse-time offer. The banner then credited the note with a value the farmer had typed
    // themselves, which is a false statement about provenance in the wizard that feeds certifier
    // packets. Recomputed from the merge result, the same way the late-subtype re-offer below
    // builds its own `keptFields` from `fresh` rather than from what was proposed.
    const written = mergeOfferedValues(eventFormData, kept);
    fieldNoteProposalRef.current = {
      ...fieldNoteProposalRef.current,
      applied: Array.from(
        new Set([...(fieldNoteProposalRef.current.applied || []), ...Object.keys(written)])
      )
    };

    setEventFormData((prev) => withListingAttachmentChecked(prev, { ...prev, ...written }));

    setVoiceBanner((prev) =>
      prev ? { ...prev, seededPending: null, keptFields: Object.keys(written) } : prev
    );
    // NOW the tabs must re-read initialValues, the same remount the spoken merge uses.
    setVoiceSeq((s) => s + 1);
  };

  // Clears the WHOLE banner, not just the offer. The headline is the else-branch of
  // `seededPending`, so nulling only the offer left the farmer who explicitly REFUSED a third
  // party's values reading "Voice input applied" with a filled-field count over an empty form, in the
  // wizard that feeds certifier packets.
  // Refusing a note refuses the HELD half as well. `pendingVoiceRef` used to be nulled on the
  // seeded path, and keeping it so the hold could be re-offered opened a worse door: Discard
  // cleared only the banner, so picking the subtype afterwards rebuilt the refused third party's
  // values as a brand new offer and pulled focus to it.
  const dismissVoiceBanner = () => {
    pendingVoiceRef.current = null;
    setVoiceBanner(null);
  };

  const handleVoiceSeededDiscard = () => {
    dismissVoiceBanner();
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

    // A HELD PASTED NOTE IS RE-OFFERED, NEVER MERGED.
    //
    // The subtype has arrived, so the values can finally be gated against a real form. What
    // cannot change is who said them: on a pasted note the sender is not the person signing the
    // record, so the tap that writes them still has to be the farmer's. Merging here would be the
    // same defect `handleVoiceSwitchType` had, one step later in the flow.
    //
    // A fresh offer, not a patch of the old one: `handleSubtypeSelect` nulls the banner, so on
    // the verb-tile activities there may be no `prev` left to spread.
    if (pending.seeded) {
      setVoiceBanner((prev) => ({
        ...(prev || {}),
        ...(prev ? {} : { seeded: true, transcript: pending.transcript }),
        seeded: true,
        droppedCount: dropped.length,
        // RECOMPUTED, not inherited. `keptFields` is what `voiceFilledLabels` reads, and Apply
        // renders only when that list is non-empty. At parse time, with no subtype, the gated set
        // is narrow and is often EMPTY (acreage is gated on 9 of the 10 soil subtypes), so
        // carrying the old list forward under-reported the re-offered values and, when it was
        // empty, left them with no button at all: the hold kept and then made unreachable, which
        // is the same silent loss this branch exists to end.
        ...(() => {
          const offer = crewNoteOffer(kept, activeEventType, { ...eventFormData, type: subtype });
          return {
            keptFields: Object.keys(offer.allowed),
            withheldFields: offer.withheld,
            seededPending: { kept: offer.allowed, eventType: activeEventType, subtype }
          };
        })()
      }));
      return;
    }

    // Never overwrite something the farmer typed in the meantime.
    const fresh = {};
    Object.entries(kept).forEach(([key, value]) => {
      const current = eventFormData[key];
      if (current === undefined || current === null || current === '') fresh[key] = value;
    });

    const added = Object.keys(fresh).length;
    setVoiceBanner((prev) =>
      prev
        ? {
            ...prev,
            keptFields: [...(prev.keptFields || []), ...Object.keys(fresh)],
            droppedCount: dropped.length
          }
        : prev
    );
    if (added === 0) return;
    setEventFormData((prev) => withListingAttachmentChecked(prev, { ...prev, ...fresh }));
    // The tabs read initialValues on mount only — same remount the template accelerator uses.
    setVoiceSeq((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEventType, eventFormData.type]);

  // The farmer tapped the block voice heard. This is the only way a voice-heard block that was
  // not already on the parcel (or not said in the grower's own spelling) reaches the record.
  const handleVoiceBlockAccept = () => {
    const suggestion = voiceBanner?.blockSuggestion;
    if (!suggestion) return;
    setEventFormData((prev) =>
      withListingAttachmentChecked(prev, { ...prev, block_id: suggestion.value })
    );
    setVoiceBanner((prev) =>
      prev
        ? {
            ...prev,
            blockSuggestion: null,
            keptFields: [...(prev.keptFields || []), 'block_id']
          }
        : prev
    );
    // The tabs read initialValues on mount only — same remount the voice merge uses.
    setVoiceSeq((n) => n + 1);
  };

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

    // A PASTED note is re-OFFERED here, never merged (2026-09-24, fresh-eyes review).
    //
    // This was the hole that defeated the whole feature. "Switch to <activity>" is the button a
    // farmer taps when the note describes work the form does not, the COMMON case, because the
    // sender never saw the form, and it wrote the third party's product name, rate and method
    // straight into `eventFormData` with no Apply step, then labelled it "Voice input applied".
    // Worse, the activity it switches TO is the one the MODEL chose from the untrusted text, so
    // this was also the only path on which a steered `event_type` reached a form unattended.
    //
    // `raw.seeded` is the gate, not `voiceBanner.seededPending`: the latter is null once the
    // farmer has accepted or refused an earlier offer, and the note is still pasted after that.
    // `applyVoiceData` above has already re-gated `kept` against the NEW type and subtype, so the
    // offer the farmer sees belongs to the form they are now looking at.
    //
    // The subtype write STAYS on both paths: handleEventTypeChange has just reset the form, so
    // without it the tab opens with no subtype and drops every subtype-gated field.
    if (raw.seeded) {
      setEventFormData((prev) =>
        withListingAttachmentChecked(prev, { ...prev, ...(subtype ? { type: subtype } : {}) })
      );
      setVoiceBanner({
        ...banner,
        suggestion: null,
        ...(() => {
          const offer = crewNoteOffer(kept, pending.backendEventType, {
            ...eventFormData,
            type: subtype
          });
          return {
            ...(offer.withheld.length ? { keptFields: Object.keys(offer.allowed) } : {}),
            withheldFields: offer.withheld,
            seededPending: { kept: offer.allowed, eventType: pending.backendEventType, subtype }
          };
        })()
      });
      setVoiceSeq((s) => s + 1);
      return;
    }

    setEventFormData((prev) =>
      withListingAttachmentChecked(prev, {
        ...prev,
        ...(subtype ? { type: subtype } : {}),
        ...kept
      })
    );
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
      setEventFormData((prev) => {
        // Drop every OTHER tile's presets first: a farmer who taps Cleanout, then "Not
        // Cleanout?", then Harvest must not carry `equipment_operation_type: 'CL'` around.
        // Named prev*: this IS the carried-forward state (omriAttachIsExplicit.test.tsx reads
        // the spread names), and presets are tile identity — never a product name or listing.
        const prevWithoutPresets = { ...prev };
        ACTIVITY_VERBS.forEach((v) => {
          if (v.key !== verb.key) {
            Object.keys(v.presetFields || {}).forEach((k) => delete prevWithoutPresets[k]);
          }
        });
        return { ...prevWithoutPresets, type: verb.subtype, ...(verb.presetFields || {}) };
      });
    }
    // Re-collapse after "Change activity": the reopened grid has done its job once a tile
    // is tapped. Left true, a farmer who corrected a preset kept the grid for the rest of
    // step 0 while a first-time picker did not.
    setChooserReopened(false);
    // The grid the farmer just tapped in unmounts under them and the page shortens by a
    // few phone screens. Land them on the next question, not wherever the clamp lands.
    focusStepHeading();
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
    setSubtypeUnanswered(false);
    if (eventFormData.type === code) return;
    // A held offer belongs to the activity it was gated against. The form is being reset to a
    // different one here, so a still-visible "Fill in N values" would write a frozen field set
    // onto a record it was never checked for: in-family that means real columns like
    // `yield_quantity` landing on an irrigation event. The offer dies with the activity; the
    // farmer pastes again if they still mean to. (handleVoiceSwitchType re-sets the banner
    // immediately after calling this, so the deliberate switch path is unaffected.)
    setVoiceBanner(null);
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

    // A held offer belongs to the activity it was gated against. The form is being reset to a
    // different one here, so a still-visible "Fill in N values" would write a frozen field set
    // onto a record it was never checked for: in-family that means real columns like
    // `yield_quantity` landing on an irrigation event. The offer dies with the activity; the
    // farmer pastes again if they still mean to. (handleVoiceSwitchType re-sets the banner
    // immediately after calling this, so the deliberate switch path is unaffected.)
    setVoiceBanner(null);

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
    // A record cannot leave here without a day. The seeded path clears the wizard's guessed date
    // (see handleVoiceEventDetected) and step 0's schema is the only thing that demands one, so a
    // farmer who pasted a note on step 1 could reach the save with no date at all. The backend
    // would refuse it (CommonEvent.date has no default, which is why the failure is loud rather
    // than a server-side guess), but a 400 at the end of a wizard is a worse way to be told.
    if (!eventFormData.date) {
      toast({
        title: intl.formatMessage({ id: 'events.voice.dateMissingTitle' }),
        description: intl.formatMessage({ id: 'events.voice.dateMissingBody' }),
        status: 'warning',
        duration: 6000,
        isClosable: true,
        position: 'top'
      });
      setActiveStep(0);
      return;
    }

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
            : {}),
          // ONE key, and the server does the rest. It resolves the note by UUID scoped to the
          // caller's companies and writes the link inside the same request that writes the record,
          // the way `_fulfil_plan_item` does. Sending a status, or the words, or anything else about
          // the note would be a second client-side writer of a fact the server owns.
          //
          // Gated on `pending`, like every other read of this note (the seed at :543, the step-0
          // card at :3049, the banner at :3256). This line was the only one that was not, and the
          // gap was reachable: a stale cached queue could offer a note already logged, and sending
          // its id again produced a second event that `_resolve_field_note` silently declined to
          // link, because it filters status=PENDING. Sending nothing is the honest payload for a
          // note that is already spent: the record still saves, it just claims no note.
          ...(activeFieldNote?.status === 'pending'
            ? {
                field_note: activeFieldNote.public_id,
                field_note_proposal: fieldNoteProposalRef.current
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
        {/* WHERE THE CREW MESSAGE WENT.
            "Start a season" navigates to the production wizard, which does not carry
            `?field_note=`, so a supervisor who clicked "Log this" on a message and landed here
            watches it disappear from the flow with nothing on screen to say why. The note itself
            is safe: nothing has consumed it, its status is still `pending`, and the inbox still
            lists it. Say that, rather than thread the id through a second wizard: the note is
            only spent when a record is authored, and a round trip through the inbox keeps that
            true. */}
        {activeFieldNote && activeFieldNote.status === 'pending' && (
          <StandardAlert
            status="info"
            description={intl.formatMessage({ id: 'events.noOpenSeason.noteStaysWaiting' })}
            mb={4}
          />
        )}
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
              date: existingEvent.date
                ? formatDateFromTimestamp(existingEvent.date, intl.locale)
                : ''
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
            <CircularProgress isIndeterminate color="green.700" />
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
                  {/* `tabIndex={-1}` + ref: programmatic focus target for focusStepHeading. */}
                  <Text
                    ref={stepHeadingRef}
                    tabIndex={-1}
                    fontSize="lg"
                    fontWeight="semibold"
                    color={textColor}>
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
                        {/* WHICH MESSAGE THIS RECORD ANSWERS, on the step the operator lands on.
                            MEASURED in a browser 2026-09-26: arriving from the inbox showed this
                            step with nothing about the note on it, because the panel that holds the
                            seeded text only mounts on the NEXT step. The supervisor had clicked
                            "Log this" on one specific message and was then asked for an activity and
                            a date with no sign of which message, which is how somebody answers for
                            the wrong one. The words are quoted, never an input: they are a record of
                            what a person reported. */}
                        {activeFieldNote && activeFieldNote.status === 'pending' && (
                          <Box
                            bg="green.50"
                            borderWidth="1px"
                            borderColor="green.200"
                            borderRadius="md"
                            p={3}>
                            <Text fontSize="sm" fontWeight="semibold" color="green.700">
                              {intl.formatMessage(
                                { id: 'events.fieldNote.loggingFrom' },
                                {
                                  who:
                                    activeFieldNote.sender?.display_name ||
                                    intl.formatMessage({ id: 'fieldNotes.unknownSender' })
                                }
                              )}
                            </Text>
                            <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap" pt={1}>
                              {`\u201C${activeFieldNote.words}\u201D`}
                            </Text>
                            <Text fontSize="xs" color="gray.700" pt={2}>
                              {intl.formatMessage({ id: 'events.fieldNote.theirWordsYourRecord' })}
                            </Text>
                          </Box>
                        )}
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
                              <Alert status="info" mb={4}>
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

                            {/* Edit's correction affordance — HOISTED types only.
                                  A type whose subtype is asked in step 0 has no in-tab control
                                  left to correct it with, so this link is the only way back to
                                  the question; a type that still owns its subtype as a single
                                  in-tab ask needs nothing here. Hidden while the chooser is
                                  open — the grid below IS the control. */}
                            {isEdit &&
                              HOISTED_SUBTYPE_EVENT_TYPES.includes(activeEventType) &&
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
                              /* Required on the ASK only, same rule as the verb grid above:
                                 edit RESTATES a saved answer and has nothing to fill in. */
                              badge={isEdit ? undefined : 'Required'}
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
                            {/* Refused Continue. `role="alert"` because the message appears
                                after the press, above the button the farmer just used — with
                                nothing announcing it, a screen-reader user gets silence and a
                                page that simply did not move. MEASURED on SectionBox's white:
                                red.700 #D32F2F is 4.98:1 ✓; red.600 is 4.23 and misses the
                                4.5 text floor. */}
                            {subtypeUnanswered && (
                              <Text
                                role="alert"
                                mt={3}
                                fontSize="sm"
                                fontWeight="medium"
                                color="red.700">
                                {intl.formatMessage({ id: 'activities.subtype.required' })}
                              </Text>
                            )}
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
                  <Text
                    ref={stepHeadingRef}
                    tabIndex={-1}
                    fontSize="lg"
                    fontWeight="semibold"
                    color={textColor}>
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
                          /* The activity is already decided by the time this panel exists —
                             its trigger sits in step 2, and step 1 is where the verb tile
                             and the production subtype are chosen. Passing it lets the
                             backend prompt extract FIELDS instead of guessing the activity. */
                          knownActivity={voiceActivitySlug}
                          fieldRequests={voiceFieldRequests}
                          /* `autoStart` stays true for the spoken path; the panel itself
                             refuses to open a mic when a seed is present. */
                          autoStart={true}
                          seedTranscript={voiceSeedText || undefined}
                          /* Parse the note in its own language, not the app's (audit T29). */
                          seedLanguage={activeFieldNote?.transcript_language || undefined}
                          seedNoteId={activeFieldNote?.public_id || undefined}
                          onClose={() => {
                            setShowVoiceCapture(false);
                            setVoiceSeedText('');
                          }}
                        />
                      ) : (
                        // `flexWrap` because this row is now THREE buttons, and Chakra's Button
                        // label is nowrap: at 375px the labels crossed their own borders in
                        // English and overlapped illegibly in es-419, which runs ~1.55x longer.
                        // Spacing is applied as `gap`, so wrapped rows keep their gutter. Two
                        // other rows in this file already wrap for the same reason.
                        <HStack spacing={3} flexWrap="wrap">
                          <Button
                            leftIcon={<Icon as={FaMicrophone} />}
                            variant="outline"
                            colorScheme="green"
                            size="sm"
                            minH="44px"
                            onClick={() => setShowVoiceCapture(true)}>
                            {intl.formatMessage({ id: 'events.voice.fillByVoice' })}
                          </Button>
                          <Button
                            leftIcon={<Icon as={FaPaste} />}
                            variant="outline"
                            colorScheme="green"
                            size="sm"
                            minH="44px"
                            onClick={() => setPasteOpen((open) => !open)}>
                            {intl.formatMessage({ id: 'events.voice.pasteNote' })}
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
                      {/* The paste box. Its only job is to hand text to the SAME extraction the
                          mic uses; it writes nothing itself. Closed as soon as the text is
                          handed over, so there is never a stale note sitting under a form the
                          farmer has since edited. */}
                      {pasteOpen && !showVoiceCapture && (
                        <VStack align="stretch" spacing={2} mt={3}>
                          <StandardTextarea
                            value={pasteDraft}
                            onChange={(e) => setPasteDraft(e.target.value)}
                            placeholder={intl.formatMessage({
                              id: 'events.voice.pasteNotePlaceholder'
                            })}
                            rows={3}
                          />
                          <Stack direction={{ base: 'column', smd: 'row' }} spacing={2}>
                            <Button
                              variant="outline"
                              colorScheme="green"
                              size="sm"
                              minH="44px"
                              isDisabled={!pasteDraft.trim()}
                              onClick={() => {
                                setVoiceSeedText(pasteDraft.trim());
                                setPasteOpen(false);
                                setPasteDraft('');
                                setShowVoiceCapture(true);
                              }}>
                              {intl.formatMessage({ id: 'events.voice.pasteNoteRead' })}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              minH="44px"
                              onClick={() => {
                                setPasteOpen(false);
                                setPasteDraft('');
                              }}>
                              {intl.formatMessage({ id: 'events.voice.pastedNoteDiscard' })}
                            </Button>
                          </Stack>
                        </VStack>
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
                      {/* The live region is the HEADLINE, not the container below. `role="status"`
                          is aria-atomic by default, so on the container every tap re-read the
                          entire banner (including the full quoted note, which `noOfLines` clips
                          visually but not for a screen reader) and focusing that same node
                          announced it a second time. The container is a named group instead, so
                          moving focus here says what it is and stops. */}
                      {voiceBanner && !showVoiceCapture && (
                        <Box
                          ref={voiceOfferRef}
                          tabIndex={-1}
                          role="group"
                          aria-label={voiceBannerHeadline}
                          mt={3}
                          p={3}
                          /* GREEN ONLY ONCE IT IS DONE. Status colour carries meaning here, and an
                             offer that still needs a tap is in progress, not a success: dressed in
                             the same green as the applied state it read as more final than it was,
                             on the one surface whose whole point is that a machine suggests and a
                             person confirms.

                             Neutral rather than a warning treatment, for two reasons. Nothing has
                             gone wrong, so warning would claim something too; and MEASURED in this
                             repo, the theme's amber cannot carry text (amber.900 on amber.50 is
                             3.57:1, StandardComponents.tsx:1694), so an amber ground would trade a
                             semantics bug for a contrast one. The date question a few lines below
                             already answers this the same way: neutral ground, plain border. */
                          bg={
                            voiceBanner.seededPending || voiceBanner.manualReview
                              ? 'white'
                              : 'green.50'
                          }
                          borderWidth="1px"
                          borderColor={
                            voiceBanner.seededPending || voiceBanner.manualReview
                              ? 'gray.300'
                              : 'green.200'
                          }
                          borderRadius="md">
                          <HStack justify="space-between" align="start">
                            <VStack align="start" spacing={1} flex={1}>
                              {/* Three states, not two. Provenance comes from `seeded` (durable);
                                  whether anything is filled yet comes from `seededPending`
                                  (cleared on Apply). Keying both on seededPending relabelled a
                                  pasted note "Voice input applied" one tap later. */}
                              <Text
                                role="status"
                                aria-live="polite"
                                fontSize="sm"
                                fontWeight="semibold"
                                color={
                                  voiceBanner.seededPending || voiceBanner.manualReview
                                    ? 'gray.800'
                                    : 'green.700'
                                }>
                                {voiceBannerHeadline}
                              </Text>
                              {/* Name them. The count on its own is unverifiable: when the
                                  only field voice could keep is `observation`, the farmer
                                  reads "1 field filled", looks at the form, and sees nothing
                                  changed — the notes box is below the fold on every
                                  activity. Labels come from the display registry, so they
                                  are the same words the field itself carries. */}
                              {voiceFilledLabels.length > 0 && (
                                <Text fontSize="xs" color="gray.700">
                                  {intl.formatMessage(
                                    {
                                      // "Would fill" only while the offer stands.
                                      id: voiceBanner.seededPending
                                        ? 'events.voice.pastedNoteWouldFill'
                                        : 'events.voice.filledFields'
                                    },
                                    { fields: voiceFilledLabels.join(', ') }
                                  )}
                                </Text>
                              )}
                              {/* WHICH DAY. Asked before the values, because it is the one fact a
                                  pasted note almost never carries and the wizard was happy to
                                  guess: step 0 seeds today before the paste box is reached. Today
                                  is offered back as a suggestion rather than left in the field, so
                                  the day on a § 205.103(b)(2) record is one the operator chose.
                                  Neutral ground and a plain border on purpose: this is a question,
                                  not an error, and status colour here would claim something. */}
                              {seededDateUnanswered && (
                                <Box
                                  w="full"
                                  mt={1}
                                  p={2}
                                  bg="white"
                                  borderWidth="1px"
                                  borderColor="gray.300"
                                  borderRadius="md">
                                  <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                                    {intl.formatMessage({ id: 'events.voice.pastedNoteDateAsk' })}
                                  </Text>
                                  <Text fontSize="xs" color="gray.700">
                                    {intl.formatMessage({ id: 'events.voice.pastedNoteDateWhy' })}
                                  </Text>
                                  <Stack
                                    direction={{ base: 'column', smd: 'row' }}
                                    spacing={2}
                                    pt={2}
                                    w={{ base: 'full', smd: 'auto' }}>
                                    <Button
                                      size="xs"
                                      minH="44px"
                                      variant="outline"
                                      colorScheme="green"
                                      onClick={handleVoiceSeededUseToday}>
                                      {intl.formatMessage(
                                        { id: 'events.voice.pastedNoteDateUseToday' },
                                        { date: localDateTimeLabel(nowLocalDateTimeInput()) }
                                      )}
                                    </Button>
                                    <Button
                                      size="xs"
                                      minH="44px"
                                      variant="ghost"
                                      onClick={handleVoiceSeededPickAnotherDay}>
                                      {intl.formatMessage({
                                        id: 'events.voice.pastedNoteDateAnother'
                                      })}
                                    </Button>
                                  </Stack>
                                </Box>
                              )}
                              {voiceBanner.manualReview && (
                                <Text
                                  fontSize="xs"
                                  color="gray.800"
                                  data-testid="crew-note-manual-review">
                                  {intl.formatMessage({
                                    id: `events.voice.crewNoteManualReview.${voiceBanner.manualReview}`
                                  })}
                                </Text>
                              )}
                              {voiceBanner.seeded &&
                                isApplicationRecord(activeEventType, eventFormData) && (
                                  <Text
                                    fontSize="xs"
                                    color="gray.800"
                                    data-testid="crew-note-application-mode">
                                    {intl.formatMessage({
                                      id: 'events.voice.crewNoteApplicationMode'
                                    })}
                                    {voiceBanner.withheldFields?.length
                                      ? ` ${intl.formatMessage(
                                          { id: 'events.voice.crewNoteWithheld' },
                                          { count: voiceBanner.withheldFields.length }
                                        )}`
                                      : ''}
                                  </Text>
                                )}
                              {/* Answered. Say which day it will file under, because the farmer
                                  chose it on another step and a date they cannot see is a date
                                  they cannot check. */}
                              {seededDateAnswered && (
                                <Text fontSize="xs" color="gray.700">
                                  {intl.formatMessage(
                                    { id: 'events.voice.pastedNoteDateSet' },
                                    { date: localDateTimeLabel(eventFormData.date) }
                                  )}
                                </Text>
                              )}
                              {/* The tap that writes them. Nothing above this line has touched
                                  the form: a pasted note is somebody else's words, so the person
                                  who signs the record is the one who puts them on it. Same shape
                                  as the block offer below and the OSP "Use suggestion" button. */}
                              {voiceBanner.seededPending && voiceFilledLabels.length > 0 && (
                                <Stack
                                  direction={{ base: 'column', smd: 'row' }}
                                  spacing={2}
                                  pt={1}
                                  w={{ base: 'full', smd: 'auto' }}>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    colorScheme="green"
                                    minH="44px"
                                    onClick={handleVoiceSeededApply}>
                                    {intl.formatMessage(
                                      { id: 'events.voice.pastedNoteApply' },
                                      { count: voiceFilledLabels.length }
                                    )}
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    minH="44px"
                                    onClick={handleVoiceSeededDiscard}>
                                    {intl.formatMessage({ id: 'events.voice.pastedNoteDiscard' })}
                                  </Button>
                                </Stack>
                              )}
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
                              {/* The block the farmer named, as an offer. A block is the lot a
                                  record belongs to (CA PUR box 22), so voice never writes one
                                  it had to work out — the tap does. */}
                              {voiceBanner.blockSuggestion && (
                                <VStack align="start" spacing={2} pt={1}>
                                  <Text fontSize="xs" color="gray.700">
                                    {voiceBanner.blockSuggestion.kind === 'new'
                                      ? intl.formatMessage(
                                          { id: 'events.voice.blockNew' },
                                          { block: voiceBanner.blockSuggestion.value }
                                        )
                                      : intl.formatMessage(
                                          { id: 'events.voice.blockKnown' },
                                          {
                                            spoken: voiceBanner.blockSuggestion.spoken,
                                            block: voiceBanner.blockSuggestion.value
                                          }
                                        )}
                                  </Text>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    colorScheme="green"
                                    minH="44px"
                                    onClick={handleVoiceBlockAccept}>
                                    {intl.formatMessage(
                                      {
                                        id:
                                          voiceBanner.blockSuggestion.kind === 'new'
                                            ? 'events.voice.blockAddNew'
                                            : 'events.voice.blockUseKnown'
                                      },
                                      { block: voiceBanner.blockSuggestion.value }
                                    )}
                                  </Button>
                                </VStack>
                              )}
                            </VStack>
                            {/* 24px and unlabelled until 2026-09-25: under the 44px touch floor
                                and announced as "button" with no name, on the control that
                                discards a third party's words. */}
                            <Button
                              size="xs"
                              variant="ghost"
                              minW="44px"
                              minH="44px"
                              aria-label={intl.formatMessage({
                                id: voiceBanner.seeded
                                  ? 'events.voice.dismissPastedNote'
                                  : 'events.voice.dismissVoiceInput'
                              })}
                              onClick={dismissVoiceBanner}>
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
                      /* Same contract as ProductionTab's hideSubtypeSelect, and unconditional
                         for the same reason: the wizard owns the activity question on BOTH
                         paths — create in the verb grid + step 0's ActivitySubtypeChooser,
                         edit in that same chooser behind the "Not Fertilizer?" link — so a
                         `type` select down here is a second surface for one fact whichever
                         path renders it.
                         ⛔ Hiding the control must never unregister the field: `type` still has
                         to reach onSubmit, and it gates the payload branches, the carbon
                         factor and what the PUR export asserts. */
                      hideTypeSelect
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
                  <Text
                    ref={stepHeadingRef}
                    tabIndex={-1}
                    fontSize="lg"
                    fontWeight="semibold"
                    color={textColor}>
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
