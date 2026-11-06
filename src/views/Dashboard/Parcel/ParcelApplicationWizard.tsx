/**
 * Parcel Application wizard (WS-5, plan #30 / Appendix A §f).
 *
 * The per-parcel § 205.202 module, running on the SAME serialized-module shape
 * and condition evaluator as the OSP runner. Difference: answers bind to real
 * Parcel columns server-side (a save here IS a parcel edit), and `embed`
 * questions mount live panels — the computed transition card, the buffer-zone
 * editor, the crop-history grid, the map status, and the affidavit card.
 *
 * Completion comes from the status service reading LIVE model state, so
 * evidence added anywhere in the app moves the checklist without re-entry.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateOnly } from 'utils/dateOnly';
import { backToLabel } from 'utils/backToLabel';
import { transitionState } from './transitionState';
import CertifiedBranchCard from './CertifiedBranchCard';
import {
  Badge,
  Box,
  Checkbox,
  Flex,
  HStack,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text,
  useToast,
  VStack
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkedAlt,
  FaPlus,
  FaTrash
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardPage,
  StandardPageLoading,
  StandardSectionTabs,
  StandardSelect,
  StandardTextarea
} from 'components/Design/StandardComponents';
import type { SectionTabStatus } from 'components/Design/StandardComponents';
import CardWithMap from 'components/Map/CardWithMap';
import FieldHistorySection from 'views/Dashboard/Dashboard/Parcel/FieldHistorySection';
import { answerValue, visiblePages, visibleQuestions } from 'config/osp/conditionEval';
import { pickText } from 'config/osp/types';
import type { AnswerValue, ModuleAnswers, ModuleQuestion } from 'config/osp/types';
import {
  useGetParcelApplicationQuery,
  useGetParcelTransitionStatusQuery,
  useSaveParcelApplicationMutation
} from 'store/api/parcelApplicationApi';
import { useGetOSPsQuery } from 'store/api/ospApi';
import { useGetParcelQuery } from 'store/api/productApi';
import { useGetFarmDocumentsQuery, useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import { OSP_MODULE_PDF_URL } from 'config';

/**
 * DMS `linked_section` for an operator-supplied parcel map. Must stay byte-identical to
 * `PARCEL_MAP_SECTION` in `certifications/services/osp_module_pdf.py` — the backend reads this
 * exact string to decide what rides in the packet under `parcels/maps/`, and a file saved under
 * any other section is a file the certifier never sees.
 */
const PARCEL_MAP_SECTION = 'parcel_application_map';
import { env } from 'config/environment';
import type { BufferZoneRow } from 'store/api/parcelApplicationApi';
import { useUserRole } from 'hooks/useUserRole';
import type { RootState } from 'store/index';
import { useComplianceExports } from 'components/Guards/ComplianceExportsGuard';

const STATUS_BADGE: Record<string, string> = {
  not_started: 'neutral',
  in_progress: 'warning',
  complete: 'brand'
};

/**
 * Which lettered section owns each completion check (a section may own several). Left side = page keys from
 * `certifications/osp_modules/parcel_application.py`; right side = the missing-keys emitted
 * by `product/services/parcel_application_status.py`. Add a row here when a check is added
 * there, or the new gap shows in the header badge with no section pointing at it.
 * `c_livestock` owns no check on purpose — it has no live-model evidence to read.
 */
const PAGE_STATUS_CHECK: Record<string, string[]> = {
  a_location: ['identity'],
  b_transition: ['transition'],
  d_buffers: ['buffers'],
  e_map: ['map'],
  // Two checks since 2026-09-09: the 36-month history AND the "currently certified organic?"
  // answer that decides which evidence the parcel page prints (certificate vs. history table).
  f_land_history: ['land_history', 'certification_status']
};

const DIRECTIONS = ['North', 'South', 'East', 'West'];

const TransitionCard = ({
  companyId,
  farmId,
  parcelId
}: {
  companyId: string;
  farmId: string;
  parcelId: string;
}) => {
  const intl = useIntl();
  const { data, isLoading } = useGetParcelTransitionStatusQuery({ companyId, farmId, parcelId });
  if (isLoading) return <StandardPageLoading />;
  if (!data) return null;
  // 🔴 2026-08-21 — this read `data.status` and `data.earliest_organic_harvest_date`, neither
  // of which the endpoint has ever emitted (`TransitionStatus.to_dict` sends `is_eligible`,
  // `transition_complete_date`, `days_remaining`, `note`). A farm certified continuously for
  // twenty years opened its Parcel Application and saw its § 205.202(b) status rendered as a
  // bare "—". Wrong in both directions: an eligible parcel looked unassessed, and a parcel
  // genuinely in transition would have shown the same dash with no date. Read what is sent.
  const state = transitionState(data);
  const eligible = state === 'eligible';
  const completeDate = data.transition_complete_date;
  const daysRemaining = data.days_remaining;
  const note = data.note;
  // 🔴 2026-09-30 (OSP alignment audit, T21): `is_eligible` is true by ABSENCE of a prohibited
  // record, so the badge said "Eligible" in green over a parcel with no history and no
  // declaration. It now states the record, in a neutral colour; eligibility under § 205.202(b)
  // is the certifying agent's determination, never a Trazo badge. 2026-10-01: "In transition"
  // needs a running clock (see transitionState).
  const badgeId = `parcelApp.transition.status.${state}`;
  return (
    <Box
      p={4}
      bg={eligible ? 'gray.50' : 'amber.50'}
      borderWidth="1px"
      borderColor={eligible ? 'gray.200' : 'amber.200'}
      borderRadius="md">
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="semibold" fontSize="sm">
          {intl.formatMessage({ id: 'parcelApp.transition.computed' })}
        </Text>
        <Badge variant={eligible ? 'neutral' : 'warning'} fontSize="11px">
          {intl.formatMessage({ id: badgeId })}
        </Badge>
      </HStack>
      {/* The recorded completion date shows whenever the server has one, whatever the badge
          says: a date on record is a fact, and hiding it behind "Not established" lost it. */}
      {completeDate ? (
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage(
            { id: 'parcelApp.transition.earliest' },
            { date: formatDateOnly(completeDate) }
          )}
          {typeof daysRemaining === 'number' && daysRemaining > 0
            ? ` · ${intl.formatMessage(
                { id: 'parcelApp.transition.daysRemaining' },
                { days: daysRemaining }
              )}`
            : ''}
        </Text>
      ) : null}
      {note ? (
        <Text fontSize="sm" color="gray.700">
          {note}
        </Text>
      ) : null}
      <Text fontSize="xs" color="gray.600" mt={1}>
        {intl.formatMessage({ id: 'parcelApp.transition.liveNote' })}
      </Text>
    </Box>
  );
};

/**
 * Yes / No / not answered, for a border question the agents ask as Y/N. A checkbox cannot say
 * "not answered": unticked read as No, so a border nobody answered and a border the grower said
 * was not organic looked the same (CCOF ORGB49 D1, OTCO C2 2.2; 2026-11-06).
 */
const TriStateSelect = ({
  value,
  onChange,
  isDisabled
}: {
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
  isDisabled: boolean;
}) => {
  const intl = useIntl();
  return (
    <StandardSelect
      value={value === true ? 'yes' : value === false ? 'no' : ''}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        onChange(e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)
      }
      isDisabled={isDisabled}>
      <option value="">{intl.formatMessage({ id: 'parcelApp.buffers.notAnswered' })}</option>
      <option value="yes">{intl.formatMessage({ id: 'osp.wizard.yes' })}</option>
      <option value="no">{intl.formatMessage({ id: 'osp.wizard.no' })}</option>
    </StandardSelect>
  );
};

export const BufferEditor = ({
  rows,
  canWrite,
  onChange
}: {
  rows: BufferZoneRow[];
  canWrite: boolean;
  onChange: (rows: BufferZoneRow[]) => void;
}) => {
  const intl = useIntl();

  const update = (index: number, patch: Partial<BufferZoneRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <VStack align="stretch" spacing={3}>
      {rows.map((row, index) => (
        <Box key={index} p={3} borderWidth="1px" borderColor="gray.200" borderRadius="md">
          <Flex justify="space-between" align="center" mb={2}>
            <Badge variant="subtle" fontSize="11px">
              {row.direction || intl.formatMessage({ id: 'parcelApp.buffers.border' })}
            </Badge>
            {canWrite && (
              <StandardButton
                variant="ghost"
                size="sm"
                aria-label={intl.formatMessage({ id: 'app.delete' })}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}>
                <FaTrash />
              </StandardButton>
            )}
          </Flex>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.direction' })}>
              <StandardSelect
                value={row.direction ?? ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  update(index, { direction: e.target.value })
                }
                placeholder={intl.formatMessage({ id: 'app.select' })}
                isDisabled={!canWrite}>
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {intl.formatMessage({ id: `parcelApp.buffers.dir.${d.toLowerCase()}` })}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.adjoiningUse' })}>
              <StandardInput
                value={row.adjoining_land_use ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update(index, { adjoining_land_use: e.target.value })
                }
                placeholder={intl.formatMessage({ id: 'parcelApp.buffers.adjoiningPlaceholder' })}
                isDisabled={!canWrite}
              />
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.type' })}>
              <StandardInput
                value={row.buffer_type ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update(index, { buffer_type: e.target.value })
                }
                placeholder={intl.formatMessage({ id: 'parcelApp.buffers.typePlaceholder' })}
                isDisabled={!canWrite}
              />
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.widthFt' })}>
              <StandardInput
                type="number"
                min="0"
                value={row.buffer_width_ft ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update(index, {
                    buffer_width_ft: e.target.value === '' ? undefined : Number(e.target.value)
                  })
                }
                isDisabled={!canWrite}
              />
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.adjacentOrganicQ' })}>
              <TriStateSelect
                value={row.adjacent_is_organic}
                onChange={(v) => update(index, { adjacent_is_organic: v })}
                isDisabled={!canWrite}
              />
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.cropGrownQ' })}>
              <TriStateSelect
                value={row.buffer_crop_grown}
                onChange={(v) =>
                  // A "no" with a crop named is refused by the server; clear the name with the no.
                  update(
                    index,
                    v === false
                      ? { buffer_crop_grown: v, crop_grown_in_buffer: '' }
                      : { buffer_crop_grown: v }
                  )
                }
                isDisabled={!canWrite}
              />
            </StandardField>
            {row.buffer_crop_grown !== false && (
              <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.cropGrown' })}>
                <StandardInput
                  value={row.crop_grown_in_buffer ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    update(index, { crop_grown_in_buffer: e.target.value })
                  }
                  placeholder={intl.formatMessage({ id: 'parcelApp.buffers.cropPlaceholder' })}
                  isDisabled={!canWrite}
                />
              </StandardField>
            )}
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.distanceFt' })}>
              <StandardInput
                type="number"
                min="0"
                value={row.prohibited_use_distance_ft ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update(index, {
                    prohibited_use_distance_ft:
                      e.target.value === '' ? null : Number(e.target.value)
                  })
                }
                isDisabled={!canWrite}
              />
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.driftRisk' })}>
              <StandardSelect
                value={row.drift_risk ?? ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  update(index, { drift_risk: e.target.value || undefined })
                }
                placeholder={intl.formatMessage({ id: 'app.select' })}
                isDisabled={!canWrite}>
                <option value="low">
                  {intl.formatMessage({ id: 'parcelApp.buffers.driftRisk.low' })}
                </option>
                <option value="medium">
                  {intl.formatMessage({ id: 'parcelApp.buffers.driftRisk.medium' })}
                </option>
                <option value="high">
                  {intl.formatMessage({ id: 'parcelApp.buffers.driftRisk.high' })}
                </option>
              </StandardSelect>
            </StandardField>
            <StandardField label={intl.formatMessage({ id: 'parcelApp.buffers.prevention' })}>
              <StandardInput
                value={row.prevention ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update(index, { prevention: e.target.value })
                }
                placeholder={intl.formatMessage({ id: 'parcelApp.buffers.preventionPlaceholder' })}
                isDisabled={!canWrite}
              />
            </StandardField>
            <StandardField
              label={intl.formatMessage({ id: 'parcelApp.buffers.prohibitedUseDate' })}
              helpText={intl.formatMessage({ id: 'parcelApp.buffers.prohibitedUseHelp' })}>
              <StandardInput
                type="date"
                value={row.prohibited_use_last_date ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update(index, {
                    prohibited_use_last_date: e.target.value === '' ? undefined : e.target.value
                  })
                }
                isDisabled={!canWrite}
              />
            </StandardField>
            <Box pt={{ md: 8 }}>
              <Checkbox
                isChecked={row.neighbor_notified === true}
                onChange={(e) =>
                  update(index, {
                    neighbor_notified: e.target.checked,
                    ...(e.target.checked ? {} : { neighbor_notification_date: undefined })
                  })
                }
                isDisabled={!canWrite}>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'parcelApp.buffers.neighborNotified' })}
                </Text>
              </Checkbox>
              {row.neighbor_notified === true && (
                <StandardField
                  label={intl.formatMessage({ id: 'parcelApp.buffers.neighborNotifiedDate' })}>
                  <StandardInput
                    type="date"
                    value={row.neighbor_notification_date ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      update(index, {
                        neighbor_notification_date:
                          e.target.value === '' ? undefined : e.target.value
                      })
                    }
                    isDisabled={!canWrite}
                  />
                </StandardField>
              )}
            </Box>
          </SimpleGrid>
        </Box>
      ))}
      {canWrite && (
        <StandardButton
          variant="outline"
          leftIcon={<FaPlus />}
          onClick={() => onChange([...rows, {}])}>
          {intl.formatMessage({ id: 'parcelApp.buffers.addBorder' })}
        </StandardButton>
      )}
    </VStack>
  );
};

const QuestionField = ({
  question,
  value,
  locale,
  canWrite,
  onChange
}: {
  question: ModuleQuestion;
  value: AnswerValue;
  locale: string;
  canWrite: boolean;
  onChange: (value: AnswerValue) => void;
}) => {
  const intl = useIntl();
  const label = pickText(question.label, locale);
  const coaching = question.coaching ? pickText(question.coaching, locale) : null;

  let control: React.ReactNode = null;
  switch (question.kind) {
    case 'info':
      control = null;
      break;
    case 'boolean':
      control = (
        <RadioGroup
          value={value === true ? 'yes' : value === false ? 'no' : ''}
          onChange={(v) => onChange(v === 'yes')}
          isDisabled={!canWrite}>
          <Stack direction={{ base: 'column', smd: 'row' }} spacing={4}>
            <Radio value="yes">{intl.formatMessage({ id: 'osp.wizard.yes' })}</Radio>
            <Radio value="no">{intl.formatMessage({ id: 'osp.wizard.no' })}</Radio>
          </Stack>
        </RadioGroup>
      );
      break;
    case 'radio':
      control = (
        <RadioGroup
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v)}
          isDisabled={!canWrite}>
          <Stack spacing={2}>
            {question.options.map((option) => (
              <Radio key={option.value} value={option.value}>
                <Text fontSize="sm">{pickText(option.label, locale)}</Text>
              </Radio>
            ))}
          </Stack>
        </RadioGroup>
      );
      break;
    case 'date':
      control = (
        <StandardInput
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          maxW="240px"
          isDisabled={!canWrite}
        />
      );
      break;
    case 'textarea':
      control = (
        <StandardTextarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          rows={4}
          placeholder={question.placeholder ? pickText(question.placeholder, locale) : undefined}
          isDisabled={!canWrite}
        />
      );
      break;
    default:
      control = (
        <StandardInput
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={question.placeholder ? pickText(question.placeholder, locale) : undefined}
          isDisabled={!canWrite}
        />
      );
  }

  return (
    <Box>
      <HStack spacing={2} align="flex-start" mb={coaching ? 1 : 2}>
        <Text fontWeight="medium" fontSize="sm">
          {label}
        </Text>
        {question.nop_cite ? (
          <Badge variant="neutral" fontSize="11px" mt={0.5}>
            {question.nop_cite}
          </Badge>
        ) : null}
      </HStack>
      {coaching ? (
        <Text fontSize="xs" color="gray.600" mb={2}>
          {coaching}
        </Text>
      ) : null}
      {control}
    </Box>
  );
};

/**
 * The operator's own parcel map — CCOF ORGB49 §E, WSDA AGR 2264.
 *
 * 🔴 The last register defect that stops a filing rather than merely overstating one. Both
 * certifiers require the map as a MANDATORY ATTACHMENT ("must be reviewed by CCOF prior to
 * inspection of a new parcel"; "must be submitted with each site application") and Trazo shipped
 * a packet with no map in it at all.
 *
 * Trazo draws a boundary schematic from the recorded geometry, and that is a floor, not the
 * answer: it is not satellite imagery and it cannot carry roads, landmarks, block identifiers or
 * the other operation areas CCOF lists. This is where the real map goes. It is linked to the
 * PARCEL, not just the module, because the packet writes one map per parcel — a file attached
 * without the parcel would sit in the DMS and never reach the certifier.
 */
const ParcelMapUpload = ({
  companyId,
  farmId,
  parcelId,
  canWrite
}: {
  companyId: string;
  farmId: string;
  parcelId: string;
  canWrite: boolean;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const scoped = Boolean(companyId && farmId && parcelId);

  const { data: attached = [], isError } = useGetFarmDocumentsQuery(
    { companyId, farmId, linkedSection: PARCEL_MAP_SECTION },
    { skip: !scoped }
  );
  const [uploadDocument, { isLoading: uploading }] = useUploadFarmDocumentMutation();

  // The list endpoint filters by section, not by parcel, so narrow it here — otherwise every
  // parcel's page would show every parcel's map.
  const forThisParcel = attached.filter((doc) => String(doc.parcel ?? '') === String(parcelId));

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadDocument({
        companyId,
        farmId,
        file,
        title: file.name.replace(/\.[^.]+$/, ''),
        folder: 'organic_system_plan',
        parcel: Number(parcelId),
        linkedSection: PARCEL_MAP_SECTION
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'parcelApp.map.uploadDone' }),
        status: 'success',
        duration: 3000
      });
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'parcelApp.map.uploadFailed' }),
        description: apiErrorMessage(err) ?? undefined,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="sm" fontWeight="semibold">
        {intl.formatMessage({ id: 'parcelApp.map.uploadTitle' })}
      </Text>
      {/* A failed fetch is not an absence: saying "no map attached" because a request failed
          would state something about the operation's records that nobody checked. */}
      {isError ? (
        <Text fontSize="xs" color="red.800">
          {intl.formatMessage({ id: 'parcelApp.map.uploadLoadFailed' })}
        </Text>
      ) : forThisParcel.length > 0 ? (
        forThisParcel.map((doc) => (
          <Text key={doc.id} fontSize="xs" color="gray.700">
            {intl.formatMessage({ id: 'parcelApp.map.attached' }, { name: doc.title })}
          </Text>
        ))
      ) : (
        <Text fontSize="xs" color="gray.600">
          {intl.formatMessage({ id: 'parcelApp.map.uploadHint' })}
        </Text>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <StandardButton
        size="sm"
        variant="outline"
        isLoading={uploading}
        isDisabled={!canWrite || !scoped}
        onClick={() => fileInput.current?.click()}>
        {intl.formatMessage({ id: 'parcelApp.map.uploadAction' })}
      </StandardButton>
    </VStack>
  );
};

const ParcelApplicationWizard = () => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const { farmId, parcelId } = useParams();
  const { canWrite } = useUserRole();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';
  // The parcel-application PDF is a module PDF, gated by `subscriptions/gating.py` like the rest
  // of the certifier documents. The wizard itself stays open on Starter — only the export goes.
  const hasComplianceExports = useComplianceExports();
  const locale = intl.locale;

  const args = { companyId, farmId: farmId || '', parcelId: parcelId || '' };
  const { data, isLoading } = useGetParcelApplicationQuery(args, {
    skip: !companyId || !farmId || !parcelId
  });
  const [saveApplication, { isLoading: saving }] = useSaveParcelApplicationMutation();
  const { data: osps } = useGetOSPsQuery(
    { companyId, farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );
  const ospId = osps?.[0]?.id;
  // For the header Back label only. Same args as the parcel page, so this is normally a
  // cache hit on the page the farmer just came from.
  const { data: parcel } = useGetParcelQuery(
    { parcelId, farmId, companyId: currentCompany?.id },
    { skip: !parcelId || !farmId || currentCompany?.id == null }
  );

  const definition = data?.definition;
  const [answers, setAnswers] = useState<ModuleAnswers>({});
  const [bufferRows, setBufferRows] = useState<BufferZoneRow[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const dirtyKeys = useRef<Set<string>>(new Set());
  const buffersDirty = useRef(false);
  const hydrated = useRef(false);

  // Same route, different parcel — React Router keeps the component mounted, so
  // the once-only hydration must re-arm or parcel B would show parcel A's answers.
  useEffect(() => {
    hydrated.current = false;
    dirtyKeys.current.clear();
    buffersDirty.current = false;
    setAnswers({});
    setBufferRows([]);
    setStepIndex(0);
  }, [parcelId]);

  useEffect(() => {
    if (data && !hydrated.current) {
      hydrated.current = true;
      const wrapped: ModuleAnswers = {};
      Object.entries(data.values || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined) wrapped[key] = { value: value as AnswerValue };
      });
      setAnswers(wrapped);
      setBufferRows(data.buffer_zones || []);
    }
  }, [data]);

  const pages = useMemo(
    () => (definition ? visiblePages(definition, answers) : []),
    [definition, answers]
  );
  const clamped = Math.min(stepIndex, Math.max(pages.length - 1, 0));
  const currentPage = pages[clamped];
  const status = data?.status;

  // Per-section completion for the tab row. Sections here are independent and saved as you
  // go, so the nav has to say WHERE the gaps are — the header badge only grades the whole
  // record, which leaves a farmer opening all six to find the one that owes something.
  //
  // The ONLY completion signal is status.missing, from
  // product/services/parcel_application_status.py: it reads live model state, so it counts
  // evidence that never came through this form (a boundary drawn on the map, crop-history
  // rows, an affidavit). Deliberately NOT the module's own required flags — every question
  // in this module is required=False precisely because those checks decide completion.
  // Same source as the header badge, so the two can never contradict each other.
  const sectionTabs = useMemo(() => {
    // No status on the response ⇒ mark NOTHING. An absent answer is not a passed check, and
    // "complete" is a claim about a compliance record — the empty-Set reading would paint
    // every section green the moment the status field went missing.
    const openChecks = status ? new Set(status.missing || []) : null;
    return pages.map((page) => {
      const checks = PAGE_STATUS_CHECK[page.key];
      const state: SectionTabStatus =
        !checks || !openChecks
          ? 'none'
          : checks.some((check) => openChecks.has(check))
          ? 'incomplete'
          : 'complete';
      return {
        key: page.key,
        label: pickText(page.title, locale),
        status: state,
        statusLabel:
          state === 'none'
            ? undefined
            : state === 'complete'
            ? intl.formatMessage({ id: 'parcelApp.section.complete' })
            : intl.formatMessage({ id: 'parcelApp.section.evidenceNeeded' })
      };
    });
  }, [pages, locale, intl, status]);

  const setAnswer = (key: string, value: AnswerValue) => {
    dirtyKeys.current.add(key);
    setAnswers((prev) => ({ ...prev, [key]: { value } }));
  };

  const flush = async () => {
    if (!definition) return true;
    // A disabled button is a courtesy, not a gate: `flush()` is also called from the
    // step-advance path, so the check belongs here too. Returns true so a read-only user can
    // still page through their own application without every Continue reporting a failure.
    if (!canWrite) return true;
    const values: Record<string, AnswerValue> = {};
    dirtyKeys.current.forEach((key) => {
      values[key] = answerValue(answers, key);
    });
    if (!Object.keys(values).length && !buffersDirty.current) return true;
    try {
      await saveApplication({
        ...args,
        values,
        ...(buffersDirty.current ? { buffer_zones: bufferRows } : {})
      }).unwrap();
      dirtyKeys.current.clear();
      buffersDirty.current = false;
      toast({
        title: intl.formatMessage({ id: 'parcelApp.saved' }),
        status: 'success',
        duration: 2000,
        isClosable: true
      });
      return true;
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'osp.wizard.saveFailed' }),
        description: (err as { data?: { detail?: string } })?.data?.detail,
        status: 'error',
        duration: 6000
      });
      return false;
    }
  };

  const goTo = async (index: number) => {
    if (!(await flush())) return;
    setStepIndex(index);
  };

  if (isLoading || !definition) {
    return (
      <StandardPage title={intl.formatMessage({ id: 'parcelApp.title' })}>
        <StandardPageLoading />
      </StandardPage>
    );
  }

  const renderEmbed = (embed: string) => {
    switch (embed) {
      case 'transition_card':
        return <TransitionCard {...args} />;
      case 'buffer_editor':
        return (
          <BufferEditor
            rows={bufferRows}
            canWrite={canWrite}
            onChange={(rows) => {
              buffersDirty.current = true;
              setBufferRows(rows);
            }}
          />
        );
      case 'crop_history':
        return <FieldHistorySection parcelId={parcelId || ''} canWrite={canWrite} />;
      case 'parcel_map':
        return (
          <VStack align="stretch" spacing={4}>
            {data?.has_polygon ? (
              <>
                <CardWithMap
                  polygon={data.polygon}
                  center={(data.map_metadata as { center?: unknown } | null)?.center}
                  zoom={(data.map_metadata as { zoom?: unknown } | null)?.zoom}
                />
                {bufferRows.length > 0 ? (
                  <Box
                    p={3}
                    bg="green.50"
                    borderWidth="1px"
                    borderColor="green.200"
                    borderRadius="md">
                    <Text fontSize="sm" fontWeight="semibold" color="green.700" mb={1}>
                      {intl.formatMessage(
                        { id: 'parcelApp.map.bufferSummary' },
                        { count: bufferRows.length }
                      )}
                    </Text>
                    {bufferRows.map((row, i) => (
                      <Text key={i} fontSize="xs" color="gray.700">
                        {[
                          row.direction,
                          row.adjoining_land_use,
                          row.buffer_width_ft ? `${row.buffer_width_ft} ft` : null
                        ]
                          .filter(Boolean)
                          .join(' — ')}
                      </Text>
                    ))}
                  </Box>
                ) : null}
                <HStack>
                  <StandardButton
                    variant="outline"
                    onClick={() =>
                      navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/change`)
                    }>
                    {intl.formatMessage({ id: 'parcelApp.map.edit' })}
                  </StandardButton>
                </HStack>
              </>
            ) : (
              <VStack
                spacing={3}
                py={10}
                px={6}
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="gray.200"
                borderRadius="xl"
                align="center">
                <Box as={FaMapMarkedAlt} color="gray.300" fontSize="40px" />
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  {intl.formatMessage({ id: 'parcelApp.map.missing' })}
                </Text>
                <Text fontSize="xs" color="gray.500" textAlign="center" maxW="360px">
                  {intl.formatMessage({ id: 'parcelApp.map.missingHint' })}
                </Text>
                <StandardButton
                  onClick={() =>
                    navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/change`)
                  }>
                  {intl.formatMessage({ id: 'parcelApp.map.draw' })}
                </StandardButton>
              </VStack>
            )}
            {/* CCOF ORGB49 §E prefers satellite imagery and lists eleven required elements —
                roads and landmarks, block identifiers, other operation areas, livestock and
                treated-lumber notes — most of which a drawn boundary cannot carry. WSDA AGR 2264
                additionally wants the operation and site name printed ON the map. So the drawn
                boundary is a floor, and the operator's own map is what actually satisfies the
                requirement; it rides in the packet under `parcels/maps/`. */}
            <ParcelMapUpload
              companyId={companyId || ''}
              farmId={farmId || ''}
              parcelId={parcelId || ''}
              canWrite={canWrite}
            />
          </VStack>
        );
      case 'landowner_affidavit': {
        // 2026-09-09 — mirrors what the parcel PDF prints in §F (the manager table and the
        // 36-month accounting) from the same backend summary, so the operator reads the facts
        // the certifier will read rather than a bare "affidavit on file" glyph. Built from the
        // structured fields, never from the server's English sentence (i18n).
        const lh = data?.land_history;
        const fmt = (iso: string | null) =>
          iso
            ? intl.formatDate(new Date(`${iso}T00:00:00`), {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : intl.formatMessage({ id: 'parcelApp.managers.notRecorded' });
        const cov = lh?.coverage;
        const coverageText = !cov
          ? null
          : cov.not_asked
          ? intl.formatMessage({ id: 'parcelApp.managers.coverage.notAsked' })
          : cov.complete === null
          ? intl.formatMessage({ id: 'parcelApp.managers.coverage.unknown' })
          : cov.complete && lh?.prior_managers.length === 0
          ? intl.formatMessage(
              { id: 'parcelApp.managers.coverage.full' },
              { since: fmt(lh?.current_manager.period_start ?? null) }
            )
          : cov.complete
          ? intl.formatMessage(
              { id: 'parcelApp.managers.coverage.complete' },
              { start: fmt(cov.window_start), end: fmt(cov.window_end) }
            )
          : intl.formatMessage(
              { id: 'parcelApp.managers.coverage.gaps' },
              {
                count: cov.gaps.length,
                start: fmt(cov.window_start),
                end: fmt(cov.window_end),
                ranges: cov.gaps.map(([a, b]) => `${fmt(a)} – ${fmt(b)}`).join('; ')
              }
            );
        const accounted = cov?.complete === true;
        return (
          <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            <Stack spacing={2}>
              <HStack spacing={3} align="flex-start">
                {/* green.700 / gray.500, not green.500 / gray.300 (2.78 and 1.94). This glyph is
                    the state marker for "the window is accounted for", so it is a non-text
                    graphic carrying meaning and owes 3.0. */}
                <Box as={FaCheckCircle} color={accounted ? 'green.700' : 'gray.500'} mt={1} />
                <Text fontSize="sm">
                  {coverageText ??
                    (data?.has_affidavit
                      ? intl.formatMessage({ id: 'parcelApp.affidavit.onFile' })
                      : intl.formatMessage({ id: 'parcelApp.affidavit.none' }))}
                </Text>
              </HStack>
              {lh ? (
                <Stack spacing={1} pl={8}>
                  <Text fontSize="sm" color="gray.700">
                    {intl.formatMessage(
                      { id: 'parcelApp.managers.current' },
                      {
                        name: lh.current_manager.name,
                        since: fmt(lh.current_manager.period_start)
                      }
                    )}
                  </Text>
                  {lh.prior_managers.length === 0 ? (
                    <Text fontSize="sm" color="gray.600">
                      {intl.formatMessage({ id: 'parcelApp.managers.priorNone' })}
                    </Text>
                  ) : (
                    lh.prior_managers.map((m, i) => (
                      <Text key={`${m.name}-${i}`} fontSize="sm" color="gray.700">
                        {intl.formatMessage(
                          { id: 'parcelApp.managers.prior' },
                          {
                            name: m.name,
                            from: fmt(m.period_start),
                            to: fmt(m.period_end),
                            attached: m.attached
                              ? intl.formatMessage({ id: 'parcelApp.managers.attached' })
                              : intl.formatMessage({ id: 'parcelApp.managers.notAttached' })
                          }
                        )}
                      </Text>
                    ))
                  )}
                </Stack>
              ) : null}
            </Stack>
          </Box>
        );
      }
      case 'certified_branch':
        return (
          <CertifiedBranchCard
            branch={data?.land_history?.certified_branch}
            companyId={companyId}
            farmId={farmId || ''}
            parcelId={parcelId || ''}
            canWrite={canWrite}
          />
        );
      case 'certificate_of_record': {
        // Printed on the certifier packet from the operation's certificate on file; the card shows
        // that exact line (or that there is none) so the operator sees what the certifier will read.
        const cert = data?.land_history?.certificate;
        return (
          <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            <Stack spacing={1}>
              <Text fontSize="sm" fontWeight="600">
                {cert
                  ? intl.formatMessage(
                      { id: 'parcelApp.certificate.onFile' },
                      { number: cert.number, agent: cert.agent }
                    )
                  : intl.formatMessage({ id: 'parcelApp.certificate.none' })}
              </Text>
              {cert?.effective ? (
                <Text fontSize="sm" color="gray.700">
                  {intl.formatMessage(
                    { id: 'parcelApp.certificate.effective' },
                    {
                      date: intl.formatDate(new Date(`${cert.effective}T00:00:00`), {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    }
                  )}
                </Text>
              ) : null}
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'parcelApp.certificateCard.note' })}
              </Text>
            </Stack>
          </Box>
        );
      }
      case 'adjoining_land_affidavit': {
        // Was a bare label: no case here, so the card printed its title and nothing else.
        const rows = data?.adjoining_affidavits ?? [];
        return (
          <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            {rows.length === 0 ? (
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'parcelApp.adjoining.none' })}
              </Text>
            ) : (
              <Stack spacing={1}>
                {rows.map((r, i) => (
                  <Text key={`${r.neighbor_name}-${i}`} fontSize="sm" color="gray.700">
                    {intl.formatMessage(
                      { id: 'parcelApp.adjoining.row' },
                      {
                        side:
                          r.border_side ||
                          intl.formatMessage({ id: 'parcelApp.managers.notRecorded' }),
                        name: r.neighbor_farm_name
                          ? `${r.neighbor_name} (${r.neighbor_farm_name})`
                          : r.neighbor_name,
                        signed: r.signed
                          ? intl.formatDate(new Date(`${r.signed}T00:00:00`), {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : intl.formatMessage({ id: 'parcelApp.adjoining.unsigned' })
                      }
                    )}
                  </Text>
                ))}
              </Stack>
            )}
          </Box>
        );
      }
      case 'parcel_change_notifications': {
        // Read-only: what §D prints. Filed on the OSP screen, not here.
        const rows = data?.change_notifications ?? [];
        return (
          <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            {rows.length === 0 ? (
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'parcelApp.changes.none' })}
              </Text>
            ) : (
              <Stack spacing={2} data-embed="parcel_change_notifications">
                {rows.map((n, i) => (
                  <Box key={`${n.category}-${i}`}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      {`${
                        n.date_notified
                          ? formatDateOnly(n.date_notified, intl.locale)
                          : n.recorded
                          ? intl.formatMessage(
                              { id: 'parcelApp.changes.recorded' },
                              { date: formatDateOnly(n.recorded, intl.locale) }
                            )
                          : '—'
                      } · ${intl.formatMessage({
                        id: `osp.changeNotifications.category.${n.category}`,
                        defaultMessage: n.category
                      })}`}
                    </Text>
                    {n.description && (
                      <Text fontSize="sm" color="gray.700">
                        {n.description}
                      </Text>
                    )}
                    <Text fontSize="xs" color="gray.600">
                      {n.acknowledged
                        ? intl.formatMessage(
                            { id: 'parcelApp.changes.acknowledged' },
                            { date: formatDateOnly(n.acknowledged, intl.locale) }
                          )
                        : intl.formatMessage({ id: 'parcelApp.changes.notAcknowledged' })}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        );
      }
      case 'contamination_incidents': {
        // Read-only: what §D prints. Recorded as a General activity on the season.
        const rows = data?.contamination_incidents ?? [];
        return (
          <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            {rows.length === 0 ? (
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'parcelApp.incidents.none' })}
              </Text>
            ) : (
              <Stack spacing={2} data-embed="contamination_incidents">
                {rows.map((e, i) => (
                  <Box key={`${e.date}-${i}`}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      {`${e.date ? formatDateOnly(e.date, intl.locale) : '—'} · ${
                        e.source
                          ? intl.formatMessage({
                              id: `enums.contamination_sources.${e.source}`,
                              defaultMessage: e.source
                            })
                          : intl.formatMessage({ id: 'parcelApp.incidents.sourceUnknown' })
                      }`}
                    </Text>
                    {e.description && (
                      <Text fontSize="sm" color="gray.700">
                        {e.description}
                      </Text>
                    )}
                    <Text fontSize="xs" color="gray.600">
                      {e.certifier_notified
                        ? e.certifier_notification_date
                          ? intl.formatMessage(
                              { id: 'parcelApp.incidents.notifiedOn' },
                              { date: formatDateOnly(e.certifier_notification_date, intl.locale) }
                            )
                          : intl.formatMessage({ id: 'parcelApp.incidents.notified' })
                        : intl.formatMessage({ id: 'parcelApp.incidents.notNotified' })}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        );
      }
      default:
        return null;
    }
  };

  return (
    <StandardPage
      title={pickText(definition.title, locale)}
      description={intl.formatMessage({ id: 'parcelApp.description' })}
      showBackButton
      onBack={() => navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}`)}
      // Names the destination: the page nav below has its own previous-page control.
      backLabel={backToLabel(intl, parcel?.name, 'common.backToParcel')}
      rightAction={
        <HStack spacing={3}>
          {status ? (
            <Badge variant={STATUS_BADGE[status.state]} fontSize="11px">
              {intl.formatMessage({ id: `parcelApp.status.${status.state}` })}
            </Badge>
          ) : null}
          {ospId != null && hasComplianceExports ? (
            <StandardButton
              as="a"
              href={env.getApiUrl(
                OSP_MODULE_PDF_URL(
                  companyId,
                  farmId || '',
                  ospId,
                  'parcel_application',
                  parcelId || ''
                )
              )}
              size="sm"
              variant="outline">
              {intl.formatMessage({ id: 'parcelApp.downloadPdf' })}
            </StandardButton>
          ) : null}
        </HStack>
      }>
      <VStack align="stretch" spacing={5}>
        <StandardSectionTabs
          tabs={sectionTabs}
          activeIndex={clamped}
          onChange={goTo}
          ariaLabel={intl.formatMessage({ id: 'parcelApp.sections' })}>
          {currentPage ? (
            <StandardCard>
              <VStack align="stretch" spacing={5}>
                {currentPage.education.map((block, i) => (
                  <Box key={i} p={3} bg="green.50" borderRadius="md">
                    <Text fontSize="sm" color="gray.700">
                      {pickText(block, locale)}
                    </Text>
                  </Box>
                ))}
                {visibleQuestions(definition, answers)
                  .filter(({ page }) => page.key === currentPage.key)
                  .map(({ question }) => (
                    <Box key={question.key}>
                      <QuestionField
                        question={question}
                        value={answerValue(answers, question.key)}
                        locale={locale}
                        canWrite={canWrite}
                        onChange={(value) => setAnswer(question.key, value)}
                      />
                      {question.embed ? <Box mt={3}>{renderEmbed(question.embed)}</Box> : null}
                    </Box>
                  ))}
              </VStack>
            </StandardCard>
          ) : null}
        </StandardSectionTabs>

        <Flex justify="space-between">
          {/* size="sm" = 14px, the app's button label size. These were Chakra's default md
              (16px), so the wizard's own nav read a size larger than the page's Back button
              sitting directly above them. */}
          <StandardButton
            variant="outline"
            size="sm"
            leftIcon={<FaChevronLeft />}
            isDisabled={clamped === 0}
            onClick={() => goTo(clamped - 1)}>
            {intl.formatMessage({ id: 'common.previousStep' })}
          </StandardButton>
          {clamped < pages.length - 1 ? (
            <StandardButton
              size="sm"
              rightIcon={<FaChevronRight />}
              isLoading={saving}
              onClick={() => goTo(clamped + 1)}>
              {intl.formatMessage({ id: 'app.continue' })}
            </StandardButton>
          ) : (
            <StandardButton
              size="sm"
              isLoading={saving}
              // Every other control on this page reads `canWrite`; this one did not, so a
              // Viewer got an enabled Save that the server then refused with a 403. The server
              // IS the gate (`ReadOnlyForViewers` blocks non-safe methods and its role set
              // matches `canWrite` exactly) — this is the control finally reading the flag it
              // was already surrounded by. Open since the 2026-08-15 edit-lock audit.
              isDisabled={!canWrite}
              onClick={() => flush()}>
              {intl.formatMessage({ id: 'app.save' })}
            </StandardButton>
          )}
        </Flex>
      </VStack>
    </StandardPage>
  );
};

export default ParcelApplicationWizard;
