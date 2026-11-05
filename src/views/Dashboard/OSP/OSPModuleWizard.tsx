/**
 * Guided OSP — generic module wizard runner (WS-2.4).
 *
 * Renders ANY module from its served definition: citation header, plain-language
 * education blocks, the N/A attestation gate, one page per lettered sub-section with
 * live branching (conditionEval — the tested twin of the backend evaluator), a review
 * step, and Complete. Answers autosave on page advance as a dirty-key delta; the
 * server is the validation authority (the client mirror only drives UX).
 *
 * Trazo imprint rules honored here: content arrives bilingual from the API and is
 * rendered in the user's locale; chrome strings ride the i18n catalogs; components are
 * StandardComponents/Chakra tokens; nothing is copied from any competitor rendering.
 *
 * Route: /admin/dashboard/farm/:farmId/osp/module/:moduleKey
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Flex,
  HStack,
  Progress,
  Radio,
  RadioGroup,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCheckCircle, FaFileAlt, FaMagic, FaPaperclip } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import {
  GuidanceNote,
  StandardButton,
  StandardCard,
  StandardInput,
  StandardPage,
  StandardPageLoading,
  StandardAlert,
  StandardSelect,
  StandardTextarea,
  STATUS_URGENCY_TOKENS
} from 'components/Design/StandardComponents';
import {
  answerValue,
  effectiveValue,
  missingRequired,
  visiblePages,
  visibleQuestions
} from 'config/osp/conditionEval';
import { pickText } from 'config/osp/types';
import type {
  AnswerValue,
  ModuleAnswers,
  ModuleDefinition,
  ModuleQuestion
} from 'config/osp/types';
import {
  useCreateOSPMutation,
  useGetOSPModuleQuery,
  useGetOSPQuery,
  useGetOSPsQuery,
  useSaveOSPModuleMutation
} from 'store/api/ospApi';
import { useGetFarmDocumentsQuery, useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import type { RootState } from 'store/index';
import type { OSP } from 'types/osp';
import { apiErrorMessage } from 'utils/apiErrorMessage';
import { OSPLockedNotice, StartNewVersionButton } from './OSPLockedNotice';
import OSPApprovedInputsPanel from './OSPApprovedInputsPanel';
import OSPMaterialsListPanel from './OSPMaterialsListPanel';
import OSPBrandOwnersPanel from './OSPBrandOwnersPanel';
import OSPEquipmentPanel from './OSPEquipmentPanel';
import OSPSourcedProductsPanel from './OSPSourcedProductsPanel';
import OSPSeedlingSuppliersPanel from './OSPSeedlingSuppliersPanel';
import OSPMaterialIdentityPanel from './OSPMaterialIdentityPanel';
import OSPMaterialRestrictionsPanel from './OSPMaterialRestrictionsPanel';
import OSPHandlerFacilitiesPanel from './OSPHandlerFacilitiesPanel';
import OSPRecordTypesPanel from './OSPRecordTypesPanel';
import { selectWorkingOsp } from './selectWorkingOsp';
import { holdsRetiredOption, offeredOptions, toggleCheckbox } from 'config/osp/optionChoices';
import { agentCaption, blankAskedKeys } from 'config/osp/agentCaption';

/**
 * `isReadOnly` is the plan-is-locked state, and it should now never be true: a locked plan
 * renders <LockedModuleDocument/> instead of this form (see the render branch below).
 *
 * It stays anyway, and stays wired to every control, on purpose. This is a compliance
 * surface, and the repeated failure here has been a single gate that some later branch
 * quietly stopped consulting — a flag proving nothing because the controls never read it.
 * Not rendering the form is the guarantee; this is the second lock on the same door, and
 * it costs nothing to leave on.
 *
 * Text inputs take `isReadOnly` rather than `isDisabled`, choice controls the reverse: a
 * disabled input greys its own text and leaves the tab order, while a native <select>
 * ignores the readOnly attribute entirely and would look locked while still accepting a
 * change.
 */
/**
 * The `upload` question kind, actually implemented.
 *
 * 🔴 2026-08-16. Every `kind: "upload"` question in every OSP module rendered a dashed
 * placeholder reading "File attachments arrive with the Documents page — keep this record on
 * paper for now". There are ~10 of them, and they cover exactly the records CCOF's grower
 * checklist asks a document for: supplier organic certificates for purchased seedlings, the
 * OFPP, handling SOPs, the § 11 audit-trail exhibit. The Documents page existed the whole
 * time; nothing connected the two.
 *
 * Files land in the `organic_system_plan` folder tagged with this module's key, which is what
 * makes them findable from the module and from the packet's document index.
 */
export const ModuleUploadField = ({
  companyId,
  farmId,
  moduleKey,
  questionKey,
  isReadOnly
}: {
  companyId: string;
  farmId: string;
  moduleKey: string;
  questionKey: string;
  isReadOnly: boolean;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const canQuery = Boolean(companyId && farmId && moduleKey);
  // The one attachment this question asks for (OSP alignment audit T19). Until 2026-10-01 a file
  // was linked to the module only, so the certifier packet could never tell a label sample from
  // a soil test uploaded to the same section, and the label question could never close.
  const requirement = `${moduleKey}.${questionKey}`;

  const { data: attached = [] } = useGetFarmDocumentsQuery(
    { companyId, farmId, requirement },
    { skip: !canQuery }
  );
  const { data: sectionDocs = [] } = useGetFarmDocumentsQuery(
    { companyId, farmId, linkedSection: moduleKey },
    { skip: !canQuery }
  );
  // Files uploaded to this section before uploads named their question. Shown so they are not
  // lost, and said plainly: the packet does not count them as this attachment.
  const unlinked = sectionDocs.filter((doc) => !doc.requirement);
  const [uploadDocument, { isLoading: uploading }] = useUploadFarmDocumentMutation();

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadDocument({
        companyId,
        farmId,
        file,
        title: file.name.replace(/\.[^.]+$/, ''),
        folder: 'organic_system_plan',
        linkedSection: moduleKey,
        requirement
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'osp.wizard.uploadDone' }),
        status: 'success',
        duration: 3000
      });
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'osp.wizard.uploadFailed' }),
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
      {attached.length > 0 && (
        <VStack align="stretch" spacing={1}>
          {attached.map((doc) => (
            <HStack key={doc.id} spacing={2}>
              <Box as={FaPaperclip} color="green.700" />
              <Text fontSize="sm">{doc.title}</Text>
            </HStack>
          ))}
        </VStack>
      )}
      {unlinked.length > 0 && (
        <VStack align="stretch" spacing={1}>
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({
              id: 'osp.wizard.uploadUnlinked',
              defaultMessage:
                'Uploaded to this section, not to this question. The certifier packet does not count these as this attachment; upload the file here to link it.'
            })}
          </Text>
          {unlinked.map((doc) => (
            <HStack key={doc.id} spacing={2}>
              <Box as={FaPaperclip} color="gray.500" />
              <Text fontSize="sm" color="gray.600">
                {doc.title}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.tif,.tiff,.xlsx,.xls,.docx,.doc,.csv,.txt,.zip"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <StandardButton
        variant="outline"
        size="sm"
        isLoading={uploading}
        isDisabled={isReadOnly || !canQuery}
        leftIcon={<Box as={FaPaperclip} />}
        onClick={() => fileInput.current?.click()}>
        {intl.formatMessage({
          id: attached.length ? 'osp.wizard.uploadAnother' : 'osp.wizard.uploadAttach'
        })}
      </StandardButton>
    </VStack>
  );
};

const QuestionField = ({
  question,
  value,
  locale,
  showMissing,
  isReadOnly,
  onChange,
  companyId,
  farmId,
  moduleKey,
  osp,
  onNavigateAway,
  agentAsks,
  agentBlank
}: {
  question: ModuleQuestion;
  value: AnswerValue;
  locale: string;
  showMissing: boolean;
  isReadOnly: boolean;
  onChange: (value: AnswerValue) => void;
  companyId: string;
  farmId: string;
  moduleKey: string;
  osp?: OSP;
  /**
   * Threaded down to the embedded panels so a link OUT of one saves this page first. Answers
   * autosave on page advance, never on change, so an unguarded link inside an embed discards
   * everything typed beside it.
   */
  onNavigateAway?: () => Promise<boolean> | boolean;
  /** "WSDA asks this in K Storage (AGR 2121), item 3a." Absent for an agent with no register. */
  agentAsks?: string | null;
  /**
   * Set once the grower has tried to leave the page with this question blank while their agent
   * asks it. A soft flag in words, never a block: Trazo does not require it, the agent might.
   */
  agentBlank?: string | null;
}) => {
  const intl = useIntl();
  const label = pickText(question.label, locale);
  const coaching = question.coaching ? pickText(question.coaching, locale) : null;
  const missing = showMissing && question.required;

  let control: React.ReactNode = null;
  switch (question.kind) {
    case 'info':
      // 🔴 2026-08-21 — this was `control = null`, which threw away `question.embed`.
      // The backend has declared two embeds since the modules shipped: G8.0's § 11
      // record-types registry and Materials Application's approved-inputs list. Both
      // questions therefore rendered a heading and coaching reading "add materials in
      // this panel" / "the panel above" with NOTHING beneath them, and the attestation
      // directly below ("every input material I use is entered in this list") could
      // still be answered Yes and the module marked complete — an attestation with no
      // artefact behind it, which is the one thing a certifier packet must never carry.
      // Found filling a real OSP: 19 of 19 modules complete, materials list empty.
      control =
        question.embed && osp ? (
          <Box mt={2}>
            {question.embed === 'approved_inputs' ? (
              // Two panels, one embed: WHICH materials are on the plan, then the three
              // columns the Materials List attachment asks about each of them (reason,
              // manufacturer, in use vs intended). They belong together — the attestation
              // directly below this embed says every material in use is entered in this
              // list, and until 2026-09-07 "in use" was a question with no control anywhere
              // in the product.
              <Stack spacing={4}>
                <OSPApprovedInputsPanel companyId={companyId} farmId={farmId} osp={osp} />
                <OSPMaterialsListPanel companyId={companyId} farmId={farmId} osp={osp} />
                <OSPMaterialIdentityPanel companyId={companyId} farmId={farmId} osp={osp} />
                <OSPMaterialRestrictionsPanel companyId={companyId} farmId={farmId} osp={osp} />
              </Stack>
            ) : question.embed === 's11_record_types' ? (
              <OSPRecordTypesPanel
                companyId={companyId}
                farmId={farmId}
                osp={osp}
                onNavigateAway={onNavigateAway}
              />
            ) : question.embed === 'post_harvest_facilities' ? (
              <OSPHandlerFacilitiesPanel companyId={companyId} farmId={farmId} />
            ) : question.embed === 'sourced_products' ? (
              <OSPSourcedProductsPanel
                companyId={companyId}
                farmId={farmId}
                onNavigateAway={onNavigateAway}
              />
            ) : question.embed === 'brand_owners' ? (
              <OSPBrandOwnersPanel
                companyId={companyId}
                farmId={farmId}
                onNavigateAway={onNavigateAway}
              />
            ) : question.embed === 'equipment_inventory' ? (
              <OSPEquipmentPanel
                companyId={companyId}
                farmId={farmId}
                onNavigateAway={onNavigateAway}
              />
            ) : question.embed === 'seedling_suppliers' ? (
              <OSPSeedlingSuppliersPanel
                companyId={companyId}
                farmId={farmId}
                ospId={osp.id}
                onNavigateAway={onNavigateAway}
              />
            ) : null}
          </Box>
        ) : null;
      break;
    case 'upload':
      control = (
        <ModuleUploadField
          companyId={companyId}
          farmId={farmId}
          moduleKey={moduleKey}
          questionKey={question.key}
          isReadOnly={isReadOnly}
        />
      );
      break;
    case 'boolean':
      control = (
        <RadioGroup
          value={value === true ? 'yes' : value === false ? 'no' : ''}
          onChange={(v) => onChange(v === 'yes')}
          isDisabled={isReadOnly}>
          <Stack direction={{ base: 'column', smd: 'row' }} spacing={4}>
            <Radio value="yes" minH="44px">
              {intl.formatMessage({ id: 'osp.wizard.yes' })}
            </Radio>
            <Radio value="no" minH="44px">
              {intl.formatMessage({ id: 'osp.wizard.no' })}
            </Radio>
          </Stack>
        </RadioGroup>
      );
      break;
    case 'radio':
      control = (
        <RadioGroup
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v)}
          isDisabled={isReadOnly}>
          <Stack spacing={2}>
            {offeredOptions(question, value).map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                isDisabled={option.retired}
                minH="44px"
                alignItems="flex-start">
                <Text fontSize="sm">{pickText(option.label, locale)}</Text>
              </Radio>
            ))}
          </Stack>
        </RadioGroup>
      );
      break;
    case 'checkbox_group': {
      const current = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <Stack spacing={2}>
          {offeredOptions(question, current).map((option) => (
            <Checkbox
              key={option.value}
              isChecked={current.includes(option.value)}
              onChange={() => onChange(toggleCheckbox(question, current, option.value))}
              isDisabled={isReadOnly || option.retired}
              minH="44px"
              alignItems="flex-start">
              <Text fontSize="sm">{pickText(option.label, locale)}</Text>
            </Checkbox>
          ))}
        </Stack>
      );
      break;
    }
    case 'select':
      control = (
        <StandardSelect
          value={(value as string) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value || null)}
          isDisabled={isReadOnly}
          placeholder={intl.formatMessage({ id: 'osp.wizard.selectPlaceholder' })}>
          {offeredOptions(question, value).map((option) => (
            <option key={option.value} value={option.value} disabled={option.retired}>
              {pickText(option.label, locale)}
            </option>
          ))}
        </StandardSelect>
      );
      break;
    case 'date':
      control = (
        <StandardInput
          type="date"
          value={(value as string) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value || null)}
          // isDisabled, not isReadOnly: Chrome still opens the native date picker on a
          // readonly date input, so readOnly here would look locked and edit anyway.
          isDisabled={isReadOnly}
          maxW="240px"
        />
      );
      break;
    case 'textarea':
      control = (
        <StandardTextarea
          value={(value as string) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value || null)}
          isReadOnly={isReadOnly}
          rows={4}
          maxLength={question.max_length ?? undefined}
          placeholder={question.placeholder ? pickText(question.placeholder, locale) : undefined}
        />
      );
      break;
    default:
      control = (
        <StandardInput
          value={(value as string) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value || null)}
          isReadOnly={isReadOnly}
          maxLength={question.max_length ?? undefined}
          placeholder={question.placeholder ? pickText(question.placeholder, locale) : undefined}
        />
      );
  }

  return (
    <Box data-testid={`osp-q-${question.key}`}>
      <HStack spacing={2} align="flex-start" mb={coaching ? 1 : 2}>
        <Text fontWeight="medium" fontSize="sm">
          {label}
          {question.required && question.kind !== 'info' ? ' *' : ''}
        </Text>
        {question.nop_cite ? (
          <Badge variant="neutral" fontSize="11px" mt={0.5}>
            {question.nop_cite}
          </Badge>
        ) : null}
      </HStack>
      {agentAsks ? (
        <Text
          fontSize="xs"
          color="gray.600"
          mb={coaching ? 1 : 2}
          data-testid={`osp-q-agent-${question.key}`}>
          {agentAsks}
        </Text>
      ) : null}
      {coaching ? (
        <Text fontSize="xs" color="gray.600" mb={2}>
          {coaching}
        </Text>
      ) : null}
      {control}
      {holdsRetiredOption(question, value) ? (
        <Text fontSize="xs" color="gray.700" mt={1}>
          {intl.formatMessage({ id: 'osp.wizard.retiredOption' })}
        </Text>
      ) : null}
      {missing ? (
        <Text fontSize="xs" color="red.700" mt={1}>
          {intl.formatMessage({ id: 'osp.wizard.required' })}
        </Text>
      ) : null}
      {agentBlank ? (
        <Text
          fontSize="xs"
          color={STATUS_URGENCY_TOKENS.warn.text}
          mt={1}
          data-testid={`osp-q-agent-blank-${question.key}`}>
          {agentBlank}
        </Text>
      ) : null}
    </Box>
  );
};

/**
 * An answer as a person reads it: option labels for choice kinds, Yes/No for booleans,
 * the raw text otherwise. Empty string when there is nothing recorded — callers decide
 * what to show in its place.
 *
 * Lifted out of the review step because the locked document needs the identical rendering:
 * a farmer must not be shown one thing while filling the module in and a different thing
 * when reading back what was filed.
 *
 * An option value with no matching option in the current definition falls back to the raw
 * value rather than being dropped. The review step used to drop it (`find(...)?.label &&
 * pickText(...)` yields undefined, and `.filter(Boolean)` removes it), which on a filed
 * record is the worse failure: a definition edited after the plan was approved would erase
 * an answer from the page while leaving it in the database.
 */
const displayAnswer = (
  question: ModuleQuestion,
  value: AnswerValue,
  locale: string,
  intl: ReturnType<typeof useIntl>
): string => {
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const option = question.options.find((o) => o.value === v);
        return option ? pickText(option.label, locale) || String(v) : String(v);
      })
      .filter(Boolean)
      .join('; ');
  }
  if (typeof value === 'boolean') {
    return intl.formatMessage({ id: value ? 'osp.wizard.yes' : 'osp.wizard.no' });
  }
  if (question.options.length) {
    const option = question.options.find((o) => o.value === value);
    return (option ? pickText(option.label, locale) : null) || String(value ?? '');
  }
  return String(value ?? '');
};

/**
 * One label/value row. The shape the review step already used, now shared.
 *
 * `_last` drops the rule under the final row. Every row carried one, so each card closed
 * with a divider separating its last answer from nothing — visible in the rendered page as
 * a stray line above the card's bottom padding. A separator between two things is
 * structure; a separator after the last thing is just a line.
 */
const AnswerRow = ({ label, value }: { label: string; value: string }) => {
  const intl = useIntl();
  return (
    <Flex
      justify="space-between"
      gap={4}
      borderBottomWidth="1px"
      pb={2}
      _last={{ borderBottomWidth: 0, pb: 0 }}
      direction={{ base: 'column', smd: 'row' }}>
      <Text fontSize="sm" color="gray.600" flex="1">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium" flex="1">
        {value || intl.formatMessage({ id: 'osp.wizard.unanswered' })}
      </Text>
    </Flex>
  );
};

/**
 * What a locked module looks like: the record, as a record.
 *
 * A locked plan used to render the ordinary wizard with every control disabled — two
 * paged steps, a progress bar, and a column of greyed-out checkboxes where exactly one
 * was ticked. Three things were wrong with that, and only the first is cosmetic:
 *
 *   1. Disabled Chakra controls sit near 2.7:1. The one piece of information on the
 *      screen — which box is ticked — was rendered in the least legible way available.
 *   2. It reads as a broken form, not a finished document. The explanation lived in a
 *      banner at the top, so anyone who scrolled past it met a form that simply refused
 *      to respond, with nothing on screen saying why.
 *   3. Step 1 of 2, a progress bar, and a Continue button are the furniture of unfinished
 *      work. This plan is finished; that is the entire point of it being locked.
 *
 * So: no steps, no progress, no controls. Section headings and answers, in the order the
 * certifier reads them. The wizard's own review step already proved this shape works —
 * this is that shape, grouped by section and given the whole page.
 */
/** Whether any question of the module carries the named embed. */
const moduleHasEmbed = (definition: ModuleDefinition, embed: string): boolean =>
  definition.pages.some((page) => page.questions.some((q) => q.embed === embed));

const LockedModuleDocument = ({
  definition,
  answers,
  notApplicable
}: {
  definition: ModuleDefinition;
  answers: ModuleAnswers;
  notApplicable: boolean;
}) => {
  const intl = useIntl();
  const locale = intl.locale;
  const pages = visiblePages(definition, answers);
  const visible = visibleQuestions(definition, answers);

  // An attested exclusion is the whole content of the module — there are no answers under
  // it to list, and a disabled ticked checkbox was a strange way to state a fact.
  if (notApplicable) {
    return (
      <StandardCard>
        <HStack spacing={3} align="flex-start">
          <Box as={FaCheckCircle} color="green.700" boxSize={5} mt={0.5} />
          <VStack align="flex-start" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">
              {definition.na_label
                ? pickText(definition.na_label, locale)
                : intl.formatMessage({ id: 'osp.wizard.naDefault' })}
            </Text>
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage({ id: 'osp.wizard.naExplainer' })}
            </Text>
          </VStack>
        </HStack>
      </StandardCard>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      {pages.map((page) => {
        const questions = page.questions.filter(
          (q) => q.kind !== 'info' && visible.some(({ question }) => question.key === q.key)
        );
        if (!questions.length) return null;
        return (
          // The test id goes on a wrapper, NOT on StandardCard. StandardCard destructures a
          // fixed prop list with no rest-spread, so `data-testid` on it reaches no DOM node
          // — MEASURED in the browser: querySelectorAll('[data-testid^="osp-module-"]')
          // returns [] on the live list page, where the same mistake has been silently
          // disabling a hook since that card was written. A test id that renders nothing is
          // worse than none: the next person writes a selector against it and it never matches.
          <Box key={page.key} data-testid={`osp-locked-page-${page.key}`}>
            <StandardCard title={page.title ? pickText(page.title, locale) : undefined}>
              <VStack align="stretch" spacing={3}>
                {questions.map((question) => (
                  <AnswerRow
                    key={question.key}
                    label={pickText(question.label, locale)}
                    value={displayAnswer(
                      question,
                      answerValue(answers, question.key),
                      locale,
                      intl
                    )}
                  />
                ))}
              </VStack>
            </StandardCard>
          </Box>
        );
      })}
    </VStack>
  );
};

const OSPModuleWizard = () => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const { farmId, moduleKey } = useParams();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';

  const {
    data: osps,
    isLoading: ospsLoading,
    isFetching: ospsFetching
  } = useGetOSPsQuery({ companyId, farmId: farmId || '' }, { skip: !companyId || !farmId });
  // Not `osps[0]` — see selectWorkingOsp. This matters more here than on the list page:
  // when the farmer forks a new version from the notice below, the query refetches and
  // this has to start resolving to the new draft, which is what unlocks the page in place.
  const workingOsp = selectWorkingOsp(osps);
  const ospId = workingOsp?.id;
  const ospIsDraft = workingOsp?.status === 'draft';
  // The list endpoint returns summaries; the embedded panels (approved inputs, § 11 record
  // types) read the full plan, so fetch it once the working plan is known.
  const { data: fullOsp } = useGetOSPQuery(
    { companyId, farmId: farmId || '', ospId: String(ospId) },
    { skip: !ospId || !farmId }
  );
  /**
   * Read-only mode, stated positively.
   *
   * The render branch below keyed off `!ospIsDraft`, which is ALSO true when there is no
   * working plan at all — an unresolved list, or a farm with no OSP reached by typing the
   * URL. That branch would then have rendered the locked document with no notice above it
   * and no fork button below: a page explaining nothing and offering nothing.
   *
   * Unreachable today, because `definition` is undefined without an `ospId` and the page
   * returns the loader before it gets here. Unreachable by accident is not the same as
   * correct, and this is a compliance surface where the difference between "locked" and
   * "we do not know yet" should never rest on a negation.
   */
  const isLocked = Boolean(workingOsp) && !ospIsDraft;

  const { data, isLoading } = useGetOSPModuleQuery(
    { companyId, farmId: farmId || '', ospId: ospId ?? '', moduleKey: moduleKey || '' },
    { skip: !companyId || !farmId || ospId == null || !moduleKey }
  );
  const [saveModule, { isLoading: saving }] = useSaveOSPModuleMutation();
  const [createOSP, { isLoading: creating }] = useCreateOSPMutation();

  /**
   * No plan yet is a STATE, not a loading state.
   *
   * `ProfileFarm` deep-links straight to module g6_0_production from the § 205.272 card,
   * and it has no idea whether the farm has an OSP at all. With no plan, `ospId` is
   * undefined, `useGetOSPModuleQuery` is SKIPPED — and a skipped RTK Query reports
   * `isLoading: false` with no data, so the `!definition` guard below returned the page
   * loader forever. The farmer clicked "Answer in your plan" and got a spinner with no
   * plan, no error and no way out.
   *
   * The module list page already owns the answer ("Start my OSP"); it just was not on the
   * one route a farmer can reach without passing through it. Starting from here refetches
   * the list, `workingOsp` resolves, and the wizard renders THIS module — the farmer keeps
   * the destination they asked for instead of being bounced to the index.
   */
  // `isFetching`, not just `isLoading`: after `createOSP` invalidates the list, RTK Query
  // refetches while still serving the OLD empty cache. Without it the start card renders a
  // second time the instant the button stops spinning, which reads as "nothing happened" —
  // and invites a second click that creates a second plan.
  const ospsResolved =
    Boolean(companyId) && Boolean(farmId) && !ospsLoading && !ospsFetching && osps !== undefined;

  const handleStartOsp = async () => {
    try {
      await createOSP({ companyId, farmId: farmId || '', data: {} }).unwrap();
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'osp.modules.createFailed' }),
        description: apiErrorMessage(err),
        status: 'error',
        duration: 6000
      });
    }
  };

  const definition: ModuleDefinition | undefined = data?.definition;
  const [answers, setAnswers] = useState<ModuleAnswers>({});
  const [notApplicable, setNotApplicable] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showMissing, setShowMissing] = useState(false);
  /**
   * Pages the grower has tried to leave with a blank question their agent asks. Next stops once
   * on such a page and names them; pressed again it goes on. Asked once, never nagged.
   */
  const [flaggedPages, setFlaggedPages] = useState<string[]>([]);
  const dirtyKeys = useRef<Set<string>>(new Set());
  /**
   * Hydrate once per (plan, module) — not once per mount.
   *
   * It used to be a bare `hydrated` boolean, which was fine while `ospId` could never
   * change under a mounted page. Forking a new version from this page changes it: the
   * module query refetches against the new plan and returns ITS answers, and a plain
   * once-ever guard would have kept showing the old plan's state on top of the new
   * plan's id. Today the fork clones the answers so the two agree and nothing would
   * look wrong — which is exactly the kind of bug that ships and then surfaces the
   * first time cloning stops being a straight copy.
   */
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = `${ospId ?? ''}:${moduleKey ?? ''}`;
    if (data && hydratedFor.current !== key) {
      hydratedFor.current = key;
      setAnswers(data.answers ?? {});
      setNotApplicable(Boolean(data.response?.not_applicable));
      setStepIndex(0);
      setShowMissing(false);
      setFlaggedPages([]);
      dirtyKeys.current.clear();
    }
  }, [data, ospId, moduleKey]);

  const pages = useMemo(
    () => (definition ? visiblePages(definition, answers) : []),
    [definition, answers]
  );
  const clampedStep = Math.min(stepIndex, Math.max(pages.length - 1, 0));
  const onReview = stepIndex >= pages.length && !notApplicable;
  const currentPage = onReview ? null : pages[clampedStep];

  const missing = useMemo(
    () => (definition ? missingRequired(definition, answers, notApplicable) : []),
    [definition, answers, notApplicable]
  );
  // Blank questions the plan's own agent asks that Trazo does not require. Never blocks.
  const blankAsked = useMemo(
    () => (definition ? blankAskedKeys(definition, answers, data?.agent_refs, notApplicable) : []),
    [definition, answers, data?.agent_refs, notApplicable]
  );
  const blankHere = currentPage
    ? currentPage.questions.filter((q) => blankAsked.includes(q.key)).map((q) => q.key)
    : [];
  const pageFlagged = Boolean(currentPage && flaggedPages.includes(currentPage.key));

  /**
   * What actually went wrong, in the farmer's words.
   *
   * This used to read `err.data.missing` and nothing else, so every failure that
   * was NOT an unanswered-question list — a locked non-draft plan, a rejected
   * answer, a 500 — showed "Could not save your answers" with an empty body and
   * no way to act on it. Order matters: `missing` is rendered from the module's
   * own question labels (the payload carries raw keys like `q_pest_methods`,
   * which mean nothing to the reader), and anything else defers to the server's
   * message, which is written for this audience.
   */
  const saveErrorDescription = (err: unknown): string => {
    const payload = (err as { data?: { missing?: unknown } })?.data;
    const missingKeys = Array.isArray(payload?.missing) ? (payload!.missing as string[]) : [];
    if (missingKeys.length && definition) {
      const questions = visibleQuestions(definition, answers);
      const labels = missingKeys.map(
        (key) =>
          pickText(
            questions.find(({ question }) => question.key === key)?.question.label ?? null,
            intl.locale
          ) || key
      );
      return intl.formatMessage(
        { id: 'osp.wizard.saveFailedMissing' },
        { fields: labels.join(', ') }
      );
    }
    return (
      apiErrorMessage(err, ['missing']) ??
      intl.formatMessage({ id: 'osp.wizard.saveFailedGeneric' })
    );
  };

  const flushDirty = async (extra: { not_applicable?: boolean; complete?: boolean } = {}) => {
    if (!definition || ospId == null) return false;
    const delta: Record<string, AnswerValue> = {};
    dirtyKeys.current.forEach((key) => {
      delta[key] = answerValue(answers, key);
    });
    const payload = {
      ...(Object.keys(delta).length ? { answers: delta } : {}),
      ...extra
    };
    if (!Object.keys(payload).length) return true;
    try {
      await saveModule({
        companyId,
        farmId: farmId || '',
        ospId,
        moduleKey: definition.key,
        data: payload
      }).unwrap();
      dirtyKeys.current.clear();
      return true;
    } catch (err) {
      toast({
        title: intl.formatMessage({ id: 'osp.wizard.saveFailed' }),
        description: saveErrorDescription(err),
        status: 'error',
        duration: 8000
      });
      return false;
    }
  };

  const setAnswer = (key: string, value: AnswerValue) => {
    dirtyKeys.current.add(key);
    setAnswers((prev) => ({ ...prev, [key]: { value } }));
  };

  const suggestions = data?.suggestions ?? {};
  const agentRefs = data?.agent_refs ?? null;
  // `rgba(74, 222, 128, .08)` was TAILWIND green-400 — a foreign palette literal, the exact
  // class `.claude/rules/frontend.md` bans. Same tint derived from OUR green.700 (#2E7D32).
  // Neutral (2026-11-04): a suggestion is not an answer until the farm accepts it, so it must
  // not wear the green an accepted answer gets.
  const suggestionBg = useColorModeValue('gray.50', 'gray.700');
  // Dark mode: gray.600 on the gray.700 fill is ~1.6:1, under the 3.0 non-text floor, so the
  // border and the wand step up to gray.500 / gray.300.
  const suggestionBorder = useColorModeValue('gray.200', 'gray.500');
  const suggestionIconColor = useColorModeValue('gray.600', 'gray.300');

  const isUnanswered = (value: AnswerValue): boolean =>
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  /** Human form of a suggested value: option labels for choice kinds, text otherwise. */
  const suggestionDisplay = (question: ModuleQuestion, value: AnswerValue): string => {
    if (Array.isArray(value)) {
      return value
        .map((v) => {
          const opt = question.options.find((o) => o.value === v);
          return opt ? pickText(opt.label, locale) : String(v);
        })
        .filter(Boolean)
        .join('; ');
    }
    if (question.options.length) {
      const opt = question.options.find((o) => o.value === value);
      if (opt) return pickText(opt.label, locale) ?? String(value);
    }
    return String(value ?? '');
  };

  const handleNaToggle = async (checked: boolean) => {
    setNotApplicable(checked);
    if (ospId == null || !definition) return;
    try {
      await saveModule({
        companyId,
        farmId: farmId || '',
        ospId,
        moduleKey: definition.key,
        data: { not_applicable: checked }
      }).unwrap();
    } catch (err) {
      setNotApplicable(!checked);
      toast({
        title: intl.formatMessage({ id: 'osp.wizard.saveFailed' }),
        description: saveErrorDescription(err),
        status: 'error',
        duration: 8000
      });
    }
  };

  const handleNext = async () => {
    // Only reachable on a draft now — a locked plan renders a document with no steps to
    // advance through. The button that used to say "Continue" here (a page-turn dressed as
    // progress through a form nobody could fill in) is gone with it.
    if (!(await flushDirty())) return;
    setShowMissing(false);
    if (currentPage && blankHere.length && !pageFlagged) {
      // Saved, then held once: the grower sees which ones their agent asks before moving on.
      setFlaggedPages((pages) => [...pages, currentPage.key]);
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handleComplete = async () => {
    if (missing.length) {
      setShowMissing(true);
      toast({
        title: intl.formatMessage({ id: 'osp.wizard.missingTitle' }),
        description: intl.formatMessage(
          { id: 'osp.wizard.missingBody' },
          { count: missing.length }
        ),
        status: 'warning',
        duration: 6000
      });
      return;
    }
    if (!(await flushDirty({ not_applicable: notApplicable, complete: true }))) return;
    toast({
      title: intl.formatMessage({ id: 'osp.wizard.completedTitle' }),
      status: 'success',
      duration: 4000
    });
    navigate(`/admin/dashboard/farm/${farmId}/osp`);
  };

  if (!workingOsp) {
    if (!ospsResolved) return <StandardPageLoading />;
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'osp.modules.pageTitle' })}
        description={intl.formatMessage({ id: 'osp.modules.pageDescription' })}
        showBackButton
        onBack={() => navigate(`/admin/dashboard/farm/${farmId}/osp`)}
        contentMaxW="4xl">
        <StandardCard>
          <VStack spacing={4} py={6}>
            <Box as={FaFileAlt} boxSize={8} color="green.700" />
            <Text fontWeight="semibold">
              {intl.formatMessage({ id: 'osp.modules.emptyTitle' })}
            </Text>
            <Text fontSize="sm" color="gray.600" textAlign="center" maxW="lg">
              {intl.formatMessage({ id: 'osp.modules.emptyBody' })}
            </Text>
            <StandardButton minH="44px" onClick={handleStartOsp} isLoading={creating}>
              {intl.formatMessage({ id: 'osp.modules.startOsp' })}
            </StandardButton>
          </VStack>
        </StandardCard>
      </StandardPage>
    );
  }

  if (isLoading || !definition) return <StandardPageLoading />;

  const locale = intl.locale;
  const title = `${definition.code ? `${definition.code} · ` : ''}${pickText(
    definition.title,
    locale
  )}`;

  return (
    // Back navigation goes through StandardPage's own `showBackButton`/`onBack`, the same
    // affordance Settings, Change Password, the Parcel Application wizard and the Education
    // dashboard use. This page had rolled its own ghost text link INSIDE the body instead, so
    // the one control every other page puts in the header sat below the header here, in a
    // different shape and weight.
    <StandardPage
      title={title}
      description={definition.nop_cites.join(' · ')}
      showBackButton
      onBack={() => navigate(`/admin/dashboard/farm/${farmId}/osp`)}
      // A form/reading page: header and body share one centred column. The `maxW="3xl"` that used
      // to live on the VStack below only narrowed the CONTENT, leaving it pinned to the left of a
      // full-width area under a full-width header — a column of questions with a third of the
      // screen empty beside it.
      contentMaxW="4xl">
      <VStack align="stretch" spacing={5}>
        {/*
          Named the state wrong for years: this said "This plan has been submitted" for
          EVERY non-draft status, so an approved/active plan — the common case — was
          described to the farmer as still sitting with the certifier. The phrase now
          comes from the status itself and matches the wording the API uses when it
          refuses the write, so the notice and the error toast tell one story.

          Explanation only. The button it names is at the foot of the document, which is
          also the right reading order here: this page exists to be read through, and the
          action belongs after the record, not on top of it.
        */}
        {isLocked && workingOsp ? <OSPLockedNotice osp={workingOsp} /> : null}

        {/*
          Module education is static teaching copy, not a status — see GuidanceNote. It used
          to render as `status="success" variant="left-accent"` with the checkmark swapped
          out for an info glyph, which put Trazo's success green behind text that reports no
          success and announced it in an assertive live region.
        */}
        {definition.education.map((block, i) => (
          <GuidanceNote key={i}>{pickText(block, locale)}</GuidanceNote>
        ))}

        {isLocked ? (
          <>
            <LockedModuleDocument
              definition={definition}
              answers={answers}
              notApplicable={notApplicable}
            />
            {/* The identity panel is not part of the locked document (it is an embed on an
                info question, and the document lists answers), but identity decisions are
                made against the ACTIVE plan: that is the plan the drift findings were measured
                against, and the one the banner's "Confirm names on the plan" link opens
                (review of app #90). So it renders here too, read-write, under the read-only
                answers. */}
            {workingOsp && !notApplicable && moduleHasEmbed(definition, 'approved_inputs') ? (
              <OSPMaterialIdentityPanel
                companyId={companyId}
                farmId={farmId || ''}
                osp={workingOsp}
              />
            ) : null}
            {/* Where "Complete module" used to sit greyed out. A farmer who read the whole
                module to the bottom arrived at a disabled button and nothing else, while the
                one action actually available to them was described — not offered — in a
                banner they had long since scrolled past. */}
            {workingOsp ? (
              <Flex justify="flex-end">
                <StartNewVersionButton
                  osp={workingOsp}
                  companyId={companyId}
                  farmId={farmId || ''}
                />
              </Flex>
            ) : null}
          </>
        ) : (
          <>
            {definition.allows_not_applicable ? (
              <StandardCard>
                <Checkbox
                  isChecked={notApplicable}
                  onChange={(e) => handleNaToggle(e.target.checked)}
                  minH="44px"
                  alignItems="flex-start">
                  <Text fontSize="sm" fontWeight="medium">
                    {definition.na_label
                      ? pickText(definition.na_label, locale)
                      : intl.formatMessage({ id: 'osp.wizard.naDefault' })}
                  </Text>
                </Checkbox>
                {notApplicable ? (
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    {intl.formatMessage({ id: 'osp.wizard.naExplainer' })}
                  </Text>
                ) : null}
              </StandardCard>
            ) : null}

            {notApplicable ? (
              <StandardButton minH="44px" onClick={handleComplete} isLoading={saving}>
                {intl.formatMessage({ id: 'osp.wizard.completeNa' })}
              </StandardButton>
            ) : (
              <>
                <Box>
                  <Progress
                    value={
                      pages.length
                        ? ((onReview ? pages.length : clampedStep) / pages.length) * 100
                        : 0
                    }
                    size="sm"
                    borderRadius="md"
                    colorScheme="green"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {onReview
                      ? intl.formatMessage({ id: 'osp.wizard.reviewStep' })
                      : intl.formatMessage(
                          { id: 'osp.wizard.stepCount' },
                          { current: clampedStep + 1, total: pages.length }
                        )}
                  </Text>
                </Box>

                {currentPage ? (
                  <StandardCard
                    title={currentPage.title ? pickText(currentPage.title, locale) : undefined}>
                    <VStack align="stretch" spacing={5}>
                      {/*
                    Same content class as the module-level education above — this file used to
                    render it a third way (bare grey Text), so one page showed guidance in three
                    different shapes. One component, both call sites.
                  */}
                      {currentPage.education.map((block, i) => (
                        <GuidanceNote key={i}>{pickText(block, locale)}</GuidanceNote>
                      ))}
                      {currentPage.questions
                        .filter((q) =>
                          visibleQuestions(definition, answers).some(
                            ({ question }) => question.key === q.key
                          )
                        )
                        .map((question) => {
                          const suggestion = suggestions[question.key];
                          // No suggestions on a locked plan: "Use suggestion" writes an
                          // answer, and the write is exactly what the server refuses.
                          const showSuggestion =
                            ospIsDraft &&
                            Boolean(suggestion) &&
                            // A retired option alone is not an answer, the same test
                            // missingRequired applies, so the suggestion stays on offer.
                            isUnanswered(
                              effectiveValue(question, answerValue(answers, question.key))
                            );
                          return (
                            <Box key={question.key}>
                              <QuestionField
                                question={question}
                                value={answerValue(answers, question.key)}
                                locale={locale}
                                showMissing={showMissing && missing.includes(question.key)}
                                isReadOnly={!ospIsDraft}
                                onChange={(value) => setAnswer(question.key, value)}
                                companyId={companyId}
                                farmId={farmId || ''}
                                moduleKey={moduleKey || ''}
                                osp={fullOsp}
                                onNavigateAway={flushDirty}
                                agentAsks={agentCaption(intl, agentRefs, question.key)}
                                agentBlank={
                                  pageFlagged && blankHere.includes(question.key) && agentRefs
                                    ? intl.formatMessage(
                                        { id: 'osp.wizard.agentAskedBlank' },
                                        { agent: agentRefs.agent }
                                      )
                                    : null
                                }
                              />
                              {showSuggestion && (
                                <Box
                                  mt={2}
                                  p={2.5}
                                  borderWidth="1px"
                                  borderColor={suggestionBorder}
                                  bg={suggestionBg}
                                  borderRadius="md">
                                  <HStack align="flex-start" spacing={2}>
                                    <Box
                                      as={FaMagic}
                                      color={suggestionIconColor}
                                      mt={0.5}
                                      flexShrink={0}
                                    />
                                    <Box minW={0}>
                                      <Text fontSize="sm">
                                        <Text as="span" fontWeight="semibold">
                                          {intl.formatMessage({
                                            id: 'osp.wizard.suggestion.title'
                                          })}
                                        </Text>{' '}
                                        {suggestionDisplay(question, suggestion.value)}
                                      </Text>
                                      <Text fontSize="xs" color="gray.500" mt={0.5}>
                                        {suggestion.basis}
                                      </Text>
                                      <StandardButton
                                        size="sm"
                                        variant="outline"
                                        mt={2}
                                        onClick={() => setAnswer(question.key, suggestion.value)}>
                                        {intl.formatMessage({ id: 'osp.wizard.suggestion.use' })}
                                      </StandardButton>
                                    </Box>
                                  </HStack>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                    </VStack>
                  </StandardCard>
                ) : (
                  <StandardCard
                    titleIcon={<Box as={FaCheckCircle} color="green.700" />}
                    title={intl.formatMessage({ id: 'osp.wizard.reviewTitle' })}>
                    <VStack align="stretch" spacing={4}>
                      {blankAsked.length && agentRefs ? (
                        // Named here, not enforced: Trazo does not require these, the agent's form
                        // asks them. Each opens the page it is on.
                        <StandardAlert
                          status="warning"
                          mb={0}
                          title={intl.formatMessage(
                            { id: 'osp.wizard.agentAskedBlankReviewTitle' },
                            { agent: agentRefs.agent, count: blankAsked.length }
                          )}
                          description={intl.formatMessage(
                            { id: 'osp.wizard.agentAskedBlankReviewBody' },
                            { agent: agentRefs.agent, count: blankAsked.length }
                          )}>
                          <VStack align="start" spacing={1}>
                            {visibleQuestions(definition, answers)
                              .filter(({ question }) => blankAsked.includes(question.key))
                              .map(({ page, question }) => (
                                <StandardButton
                                  key={question.key}
                                  variant="ghost"
                                  size="sm"
                                  h="auto"
                                  whiteSpace="normal"
                                  textAlign="left"
                                  data-testid={`osp-review-agent-blank-${question.key}`}
                                  onClick={() =>
                                    setStepIndex(
                                      Math.max(
                                        pages.findIndex((p) => p.key === page.key),
                                        0
                                      )
                                    )
                                  }>
                                  {pickText(question.label, locale)}
                                </StandardButton>
                              ))}
                          </VStack>
                        </StandardAlert>
                      ) : null}
                      {/* Same renderer the locked document uses. It was duplicated inline here,
                      which is how the two came to disagree about a stale option value. */}
                      {visibleQuestions(definition, answers)
                        .filter(({ question }) => question.kind !== 'info')
                        .map(({ question }) => (
                          <AnswerRow
                            key={question.key}
                            label={pickText(question.label, locale)}
                            value={displayAnswer(
                              question,
                              answerValue(answers, question.key),
                              locale,
                              intl
                            )}
                          />
                        ))}
                    </VStack>
                  </StandardCard>
                )}

                {!onReview && pageFlagged && blankHere.length && agentRefs ? (
                  <StandardAlert
                    status="warning"
                    mb={0}
                    title={intl.formatMessage(
                      { id: 'osp.wizard.agentAskedBlankTitle' },
                      { agent: agentRefs.agent, count: blankHere.length }
                    )}
                    description={intl.formatMessage(
                      { id: 'osp.wizard.agentAskedBlankBody' },
                      { count: blankHere.length }
                    )}
                  />
                ) : null}

                <Flex justify="space-between" gap={3}>
                  <StandardButton
                    variant="outline"
                    minH="44px"
                    onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
                    isDisabled={clampedStep === 0 && !onReview}>
                    {intl.formatMessage({ id: 'common.previousStep' })}
                  </StandardButton>
                  {onReview ? (
                    <StandardButton minH="44px" onClick={handleComplete} isLoading={saving}>
                      {intl.formatMessage({ id: 'osp.wizard.complete' })}
                    </StandardButton>
                  ) : (
                    <StandardButton minH="44px" onClick={handleNext} isLoading={saving}>
                      {intl.formatMessage({
                        id:
                          pageFlagged && blankHere.length
                            ? 'osp.wizard.continueAnyway'
                            : 'osp.wizard.next'
                      })}
                    </StandardButton>
                  )}
                </Flex>
              </>
            )}
          </>
        )}
      </VStack>
    </StandardPage>
  );
};

export default OSPModuleWizard;
