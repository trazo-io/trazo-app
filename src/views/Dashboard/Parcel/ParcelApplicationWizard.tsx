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
import { TransitionCard } from './TransitionCard';
import CertifiedBranchCard from './CertifiedBranchCard';
import CertifyingAgentPicker from 'components/Certifications/CertifyingAgentPicker';
import {
  Badge,
  Box,
  Checkbox,
  Divider,
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
import { FaCheckCircle, FaMapMarkedAlt, FaPlus, FaTrash } from 'react-icons/fa';
import { useIntl, type IntlShape } from 'react-intl';
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
import WizardActions from 'components/Design/WizardActions';
import CardWithMap from 'components/Map/CardWithMap';
import FieldHistorySection from 'views/Dashboard/Dashboard/Parcel/FieldHistorySection';
import { answerValue, visiblePages, visibleQuestions } from 'config/osp/conditionEval';
import { coverageRemedyKeys } from './coverageRemedies';
import {
  holdsOnlyPendingOptions,
  holdsRetiredOption,
  offeredOptions,
  toggleCheckbox
} from 'config/osp/optionChoices';
import { pickText } from 'config/osp/types';
import type { AnswerValue, ModuleAnswers, ModuleQuestion } from 'config/osp/types';
import {
  useGetParcelApplicationQuery,
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
// CCOF ORGB49 §G: a container parcel's signed statement (planting date, materials, contamination removal).
// Mirrors CONTAINER_STATEMENT_SECTION in trazo-back osp_module_pdf.py; the packet ships it per parcel.
const CONTAINER_STATEMENT_SECTION = 'parcel_application_container_statement';

/** The words one parcel upload uses; the map's are the defaults. */
const MAP_UPLOAD_MESSAGES = {
  title: 'parcelApp.map.uploadTitle',
  hint: 'parcelApp.map.uploadHint',
  attached: 'parcelApp.map.attached',
  action: 'parcelApp.map.uploadAction',
  done: 'parcelApp.map.uploadDone',
  failed: 'parcelApp.map.uploadFailed',
  loadFailed: 'parcelApp.map.uploadLoadFailed'
};
// No title: the question's own label already names it, and a second heading printed it twice.
const CONTAINER_STATEMENT_MESSAGES = {
  title: '',
  hint: 'parcelApp.containerStatement.hint',
  attached: 'parcelApp.containerStatement.attached',
  action: 'parcelApp.containerStatement.action',
  done: 'parcelApp.containerStatement.done',
  failed: 'parcelApp.containerStatement.failed',
  loadFailed: 'parcelApp.containerStatement.loadFailed'
};
import { env } from 'config/environment';
import type { BufferZoneRow, LandHistorySummary } from 'store/api/parcelApplicationApi';
import PlannedCropRows from './PlannedCropRows';
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
 * `c_livestock` owns the livestock answer since 2026.11.24 (CCOF ORGB49 §C: the parcel is either "not used
 * for organic livestock" or the section is completed).
 */
const PAGE_STATUS_CHECK: Record<string, string[]> = {
  // site_statements since 2026-11-21: container production and treated lumber are null until answered.
  a_location: ['identity', 'site_statements'],
  b_transition: ['transition'],
  c_livestock: ['livestock'],
  d_buffers: ['buffers'],
  e_map: ['map'],
  // Two checks since 2026-09-09: the 36-month history AND the "currently certified organic?"
  // answer that decides which evidence the parcel page prints (certificate vs. history table).
  f_land_history: ['land_history', 'certification_status']
};

const DIRECTIONS = ['North', 'South', 'East', 'West'];

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
    <VStack align="stretch" spacing={3} divider={<Divider borderColor="gray.200" />}>
      {rows.map((row, index) => (
        <Box key={index}>
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

/**
 * The certificate card's line: the certificate of record, or one recorded on the farm profile without its
 * number (not "no certificate": first-run audit, 2026-11-21), or none. Mirrors the parcel page's wording.
 */
export const certificateCardLine = (
  intl: IntlShape,
  landHistory?: Pick<LandHistorySummary, 'certificate' | 'certificate_unnumbered_agent'> | null
): string => {
  const cert = landHistory?.certificate;
  if (cert) {
    return intl.formatMessage(
      { id: 'parcelApp.certificate.onFile' },
      { number: cert.number, agent: cert.agent }
    );
  }
  const unnumbered = landHistory?.certificate_unnumbered_agent;
  if (unnumbered != null) {
    return intl.formatMessage(
      { id: 'parcelApp.certificate.unnumbered' },
      {
        agent:
          unnumbered || intl.formatMessage({ id: 'parcelApp.certificate.unnumberedAgentFallback' })
      }
    );
  }
  return intl.formatMessage({ id: 'parcelApp.certificate.none' });
};

/**
 * Text questions that name a certifying agent. They take the agent picker the farm profile and the plan
 * use, so a picked name is the spelling the packet resolves (first-run audit, 2026-11-21: a grower typed
 * "WSDA (Washington State Department of Agriculture)" here and all three parcels fell out of WSDA's
 * routing). A name not on the list stays possible under "Other".
 */
const AGENT_NAME_QUESTIONS = new Set(['prior_certifier_name']);

export const QuestionField = ({
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
      // A retired option (backend `Option.retired`) shows only while it is the stored answer, and
      // cannot be picked again: livestock's kept-only "No" (2026.11.24).
      control = (
        <RadioGroup
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v)}
          isDisabled={!canWrite}>
          <Stack spacing={2}>
            {offeredOptions(question, value).map((option) => (
              <Radio key={option.value} value={option.value} isDisabled={option.retired}>
                <Text fontSize="sm">{pickText(option.label, locale)}</Text>
              </Radio>
            ))}
          </Stack>
        </RadioGroup>
      );
      break;
    case 'checkbox_group': {
      // Same choice rules as the module wizard (`optionChoices`): exclusive options, and a
      // retired option shown only while it is the stored answer.
      const current = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <Stack spacing={2} data-testid={`parcel-q-${question.key}`}>
          {offeredOptions(question, current).map((option) => (
            <Checkbox
              key={option.value}
              isChecked={current.includes(option.value)}
              onChange={() => {
                const next = toggleCheckbox(question, current, option.value);
                onChange(next.length ? next : null);
              }}
              isDisabled={!canWrite || option.retired}
              minH="44px"
              alignItems="flex-start">
              <Text fontSize="sm">{pickText(option.label, locale)}</Text>
            </Checkbox>
          ))}
        </Stack>
      );
      break;
    }
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
      control = AGENT_NAME_QUESTIONS.has(question.key) ? (
        <CertifyingAgentPicker
          value={(value as string) ?? ''}
          onChange={(name) => onChange(name || null)}
          isDisabled={!canWrite}
          ariaLabel={label}
        />
      ) : (
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
      {/* Why a question that looks answered keeps its section open: the stored answer is a
          retired option (review of app #326; same hint as the module wizard). */}
      {holdsRetiredOption(question, value) ? (
        <Text
          fontSize="xs"
          color="gray.700"
          mt={1}
          data-testid={`parcel-q-retired-${question.key}`}>
          {intl.formatMessage({ id: 'osp.wizard.retiredOption' })}
        </Text>
      ) : null}
      {/* Same note as the module wizard: a not-yet-known answer stays open in the packet. */}
      {holdsOnlyPendingOptions(question, value) ? (
        <Text
          fontSize="xs"
          color="gray.700"
          mt={1}
          data-testid={`parcel-q-pending-${question.key}`}>
          {intl.formatMessage({
            id: canWrite ? 'osp.wizard.pendingOption' : 'osp.wizard.pendingOptionReadOnly'
          })}
        </Text>
      ) : null}
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
  canWrite,
  section = PARCEL_MAP_SECTION,
  messages = MAP_UPLOAD_MESSAGES
}: {
  companyId: string;
  farmId: string;
  parcelId: string;
  canWrite: boolean;
  /** The DMS section the file is linked to, per parcel. The map's by default. */
  section?: string;
  messages?: typeof MAP_UPLOAD_MESSAGES;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const scoped = Boolean(companyId && farmId && parcelId);

  const { data: attached = [], isError } = useGetFarmDocumentsQuery(
    { companyId, farmId, linkedSection: section },
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
        linkedSection: section
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: messages.done }),
        status: 'success',
        duration: 3000
      });
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: messages.failed }),
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
      {messages.title ? (
        <Text fontSize="sm" fontWeight="semibold">
          {intl.formatMessage({ id: messages.title })}
        </Text>
      ) : null}
      {/* A failed fetch is not an absence: saying "no map attached" because a request failed
          would state something about the operation's records that nobody checked. */}
      {isError ? (
        <Text fontSize="xs" color="red.800">
          {intl.formatMessage({ id: messages.loadFailed })}
        </Text>
      ) : forThisParcel.length > 0 ? (
        forThisParcel.map((doc) => (
          <Text key={doc.id} fontSize="xs" color="gray.700">
            {intl.formatMessage({ id: messages.attached }, { name: doc.title })}
          </Text>
        ))
      ) : (
        <Text fontSize="xs" color="gray.600">
          {intl.formatMessage({ id: messages.hint })}
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
        {intl.formatMessage({ id: messages.action })}
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
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={1}>
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
        // Which remedy fits a gap depends on who managed the land then (OV-FJ-C05): see
        // coverageRemedies.ts.
        const gapRemedies = (gaps: Array<[string, string]>) =>
          coverageRemedyKeys(
            gaps,
            lh?.current_manager.period_start ?? null,
            answerValue(answers, 'currently_certified') === 'yes'
          )
            .map((id) => intl.formatMessage({ id }))
            .join(' ');
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
          : `${intl.formatMessage(
              { id: 'parcelApp.managers.coverage.gaps' },
              {
                count: cov.gaps.length,
                start: fmt(cov.window_start),
                end: fmt(cov.window_end),
                ranges: cov.gaps.map(([a, b]) => `${fmt(a)} – ${fmt(b)}`).join('; ')
              }
            )} ${gapRemedies(cov.gaps)}`;
        const accounted = cov?.complete === true;
        return (
          <Box>
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
          <Box>
            <Stack spacing={1}>
              <Text fontSize="sm" fontWeight="600" data-testid="parcel-certificate-line">
                {certificateCardLine(intl, data?.land_history)}
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
          <Box>
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
      case 'crop_table':
        return (
          <PlannedCropRows
            crops={data?.planned_crops ?? []}
            openSeasonCrops={data?.open_season_crops ?? []}
            canWrite={canWrite}
            companyId={companyId}
            farmId={farmId || ''}
            parcelId={parcelId || ''}
          />
        );
      case 'location_coordinates': {
        // Read-only: the centre §A prints, from the boundary drawn on the map (section E).
        const centre = data?.boundary_centre;
        return (
          <Text fontSize="sm" color="gray.700" data-embed="location_coordinates">
            {centre
              ? intl.formatMessage(
                  { id: 'parcelApp.coordinates.centre' },
                  { lat: centre[0].toFixed(6), lng: centre[1].toFixed(6) }
                )
              : intl.formatMessage({ id: 'parcelApp.coordinates.none' })}
          </Text>
        );
      }
      case 'container_statement':
        return (
          <ParcelMapUpload
            companyId={companyId || ''}
            farmId={farmId || ''}
            parcelId={parcelId || ''}
            canWrite={canWrite}
            section={CONTAINER_STATEMENT_SECTION}
            messages={CONTAINER_STATEMENT_MESSAGES}
          />
        );
      case 'operation_export_answer':
        // The answer lives on the plan (G8.0) and prints on every parcel page; nothing to enter here.
        return (
          <Text fontSize="sm" color="gray.600" data-embed="operation_export_answer">
            {intl.formatMessage({ id: 'parcelApp.export.asked' })}
          </Text>
        );
      case 'parcel_change_notifications': {
        // Read-only: what §D prints. Filed on the OSP screen, not here.
        const rows = data?.change_notifications ?? [];
        return (
          <Box>
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
          <Box>
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
                {/* Plain text (2026-11-09): a green box read as "done", and it was a box inside
                    the page's card. */}
                {currentPage.education.map((block, i) => (
                  <Text key={i} fontSize="sm" color="gray.700" lineHeight="tall">
                    {pickText(block, locale)}
                  </Text>
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

        {/* The shared footer (2026-11-09). This page drew a greyed-out "Previous step" on
            the first section, which reads as broken; WizardActions leaves it off there. The
            last section saves rather than continuing. */}
        <WizardActions
          onBack={clamped > 0 ? () => goTo(clamped - 1) : undefined}
          backLabel={intl.formatMessage({ id: 'common.previousStep' })}
          backShortLabel={intl.formatMessage({ id: 'app.previous' })}
          primaryLabel={intl.formatMessage({
            id: clamped < pages.length - 1 ? 'app.continue' : 'app.save'
          })}
          onPrimary={clamped < pages.length - 1 ? () => goTo(clamped + 1) : () => flush()}
          primaryLeadsOn={clamped < pages.length - 1}
          isLoading={saving}
          // Every other control on this page reads `canWrite`; a Viewer got an enabled Save the
          // server then refused with a 403 (2026-08-15 edit-lock audit). Continue stays open:
          // a read-only user can still page through their own application.
          isDisabled={clamped === pages.length - 1 && !canWrite}
        />
      </VStack>
    </StandardPage>
  );
};

export default ParcelApplicationWizard;
