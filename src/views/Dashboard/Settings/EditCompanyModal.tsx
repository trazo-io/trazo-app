/**
 * Edit the company from Company Settings.
 *
 * Every word comes from the catalogue: until 2026-11-09 this form was written in Spanish
 * literals, so an English-speaking company edited itself in Spanish. It uses the app's one
 * stepper and footer (StandardStepper + WizardActions, as the farm and company wizards do),
 * and it never lets Save fail silently: each Continue checks its own step, and a rejected
 * save jumps to the step that holds the bad field and says so. Before, clearing "Number of
 * employees" made the value NaN, the resolver refused the form on a step the person could
 * not see, and Save did nothing at all.
 */
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  SimpleGrid,
  Box,
  useBreakpointValue,
  useToast,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton
} from '@chakra-ui/react';
import { useForm, FormProvider, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string, number, boolean, literal } from 'zod';
import {
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardSelect,
  StandardStepper
} from 'components/Design/StandardComponents';
import WizardActions from 'components/Design/WizardActions';
import { useFurthestStep } from 'hooks/useFurthestStep';

// Messages are catalogue KEYS, rendered through intl at the field (a module-scope schema
// cannot hold a translated sentence).
const URL_KEY = 'company.edit.validation.url';
const optionalUrl = string().url(URL_KEY).optional().or(literal(''));

const editCompanySchema = object({
  name: string().trim().min(1, 'company.validation.name.required'),
  tradename: string().optional(),
  contact_email: string().email('company.validation.email.invalid').optional().or(literal('')),
  contact_phone: string().optional(),
  address: string().optional(),
  city: string().optional(),
  state: string().optional(), // 2-letter US state code
  zip_code: string().optional(),
  website: optionalUrl,
  description: string().optional(),
  fiscal_id: string().optional(),
  facebook: optionalUrl,
  instagram: optionalUrl,
  certifications: string().optional(),
  employee_count: number({ invalid_type_error: 'company.edit.validation.employees' })
    .int('company.edit.validation.employees')
    .min(0, 'company.edit.validation.employees')
    .nullable()
    .optional(),
  is_active: boolean().optional(),
  industry: string().optional(),
  legal_structure: string().optional(),
  primary_commodities: string().optional(),
  sustainability_commitment: string().optional()
});

type EditCompanyFormData = {
  name: string;
  tradename?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string; // 2-letter US state code
  zip_code?: string;
  website?: string;
  description?: string;
  fiscal_id?: string;
  facebook?: string;
  instagram?: string;
  certifications?: string;
  employee_count?: number | null;
  is_active?: boolean;
  industry?: string;
  legal_structure?: string;
  primary_commodities?: string;
  sustainability_commitment?: string;
};

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any;
  onSubmit: (data: EditCompanyFormData) => Promise<void>;
  isLoading?: boolean;
}

// The fields each step owns: Continue validates these, and a rejected save opens the step
// that holds the first bad one.
export const FIELDS_BY_STEP: Array<Array<keyof EditCompanyFormData>> = [
  [
    'name',
    'tradename',
    'contact_email',
    'contact_phone',
    'legal_structure',
    'industry',
    'fiscal_id',
    'employee_count',
    'description'
  ],
  ['address', 'city', 'state', 'zip_code'],
  ['website', 'facebook', 'instagram', 'certifications'],
  ['primary_commodities', 'sustainability_commitment']
];

// An empty number input is "no answer", not NaN.
const toCount = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));

// Stored values mapped to the labels the company wizard (AddCompany) already uses, so one
// stored legal structure reads the same on every screen.
export const LEGAL_STRUCTURE_LABEL_KEYS: Record<string, string> = {
  sole_proprietorship: 'company.form.legalStructure.soleProprietorship',
  partnership: 'company.form.legalStructure.partnership',
  llc: 'company.form.legalStructure.llc',
  corporation: 'company.form.legalStructure.corporation',
  cooperative: 'company.form.legalStructure.cooperative',
  family_farm: 'company.form.legalStructure.familyFarm'
};

// Stored values. Labels: `company.industry.<value>`.
export const INDUSTRIES = [
  'crop_production',
  'livestock',
  'dairy',
  'mixed_farming',
  'organic_farming',
  'greenhouse'
];

// Stored values. Labels: `company.commodity.<value>` (they were Spanish literals, so an
// English-speaking company read "Frutas de Árbol" on its own settings page).
export const PRIMARY_COMMODITIES = [
  'fruits_tree',
  'fruits_vine',
  'vegetables',
  'grains',
  'nuts',
  'dairy',
  'livestock',
  'mixed'
];

/** The label for a stored commodity, or the stored text itself when it is not one we know. */
export const commodityLabel = (
  value: string | null | undefined,
  format: (id: string) => string
): string | null => {
  if (!value) return null;
  return PRIMARY_COMMODITIES.includes(value) ? format(`company.commodity.${value}`) : value;
};

// Stored values a farmer may pick. Labels: `company.sustainabilityCommitment.<value>`.
export const SUSTAINABILITY_COMMITMENTS = [
  'sustainable_practices',
  'organic_certified',
  'regenerative',
  'exploring'
];

/**
 * Retired from the picker on 2026-10-14 (Run 8b F1), same rule as the business-event
 * certification types retired on 2026-08-27 (`config/events/businessEvent.ts`).
 *
 * "Carbon neutral" is a general environmental benefit claim (FTC 16 CFR 260.4) and the exact
 * phrase compliance.md marks unsafe. Trazo's carbon figure is the operation's own emissions
 * plus the manufacturing of the inputs it buys, not a full LCA, so it cannot back a neutrality
 * claim either. Retiring is a WRITE-path decision: a company that already stored the value
 * keeps it (never remapped, never cleared on save), and the label it reads back states a goal
 * that is no longer offered rather than asserting neutrality.
 */
export const RETIRED_SUSTAINABILITY_COMMITMENTS = ['carbon_neutral'];

export const isKnownSustainabilityCommitment = (value: string): boolean =>
  SUSTAINABILITY_COMMITMENTS.includes(value) || RETIRED_SUSTAINABILITY_COMMITMENTS.includes(value);

/**
 * The options the picker renders for a company whose stored value is `stored`. A retired value
 * appears only when it is the one on file, and disabled, so the select can still show it and a
 * save writes it back unchanged instead of falling back to blank.
 */
export const sustainabilityCommitmentOptions = (
  stored?: string | null
): Array<{ value: string; retired: boolean }> => [
  ...SUSTAINABILITY_COMMITMENTS.map((value) => ({ value, retired: false })),
  ...(stored && RETIRED_SUSTAINABILITY_COMMITMENTS.includes(stored)
    ? [{ value: stored, retired: true }]
    : [])
];

// US States - 2-letter codes required for USDA API and carbon calculations
// Must match AddCompany.jsx for consistency
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onSubmit,
  isLoading = false
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const furthestStep = useFurthestStep(currentStep);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const t = (id: string) => intl.formatMessage({ id });

  const steps = [
    { title: t('company.form.step.identity.title') },
    { title: t('company.form.step.location.title') },
    { title: t('company.edit.step.web') },
    { title: t('company.edit.step.farming') }
  ];
  const lastStep = steps.length - 1;

  const methods = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanySchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      tradename: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      website: '',
      description: '',
      fiscal_id: '',
      facebook: '',
      instagram: '',
      certifications: '',
      employee_count: null,
      is_active: true,
      industry: '',
      legal_structure: '',
      primary_commodities: '',
      sustainability_commitment: ''
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors }
  } = methods;

  // A field's message: a catalogue key from the schema, or (for anything zod says on its
  // own) the sentence as it came.
  const err = (field: keyof EditCompanyFormData) => {
    const message = errors[field]?.message as string | undefined;
    if (!message) return undefined;
    return intl.messages[message] ? t(message) : message;
  };

  // Reset form when company changes or modal opens
  useEffect(() => {
    if (company && isOpen) {
      reset({
        name: company.name || '',
        tradename: company.tradename || '',
        contact_email: company.contact_email || company.email || '',
        contact_phone: company.contact_phone || company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip_code: company.zip_code || '',
        website: company.website || '',
        description: company.description || '',
        fiscal_id: company.fiscal_id || '',
        facebook: company.facebook || '',
        instagram: company.instagram || '',
        certifications: company.certifications || '',
        employee_count: company.employee_count ?? null,
        is_active: company.is_active !== false,
        industry: company.industry || '',
        legal_structure: company.legal_structure || '',
        primary_commodities: company.primary_commodities || '',
        sustainability_commitment: company.sustainability_commitment || ''
      });
      setCurrentStep(0);
    }
  }, [company, isOpen, reset]);

  const handleFormSubmit = async (data: EditCompanyFormData) => {
    // Clean up empty strings to null
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? null : value])
    );
    // Always set country to US since we're US-only
    (cleanedData as any).country = 'US';
    await onSubmit(cleanedData as EditCompanyFormData);
  };

  const handleInvalidSubmit = (formErrors: FieldErrors<EditCompanyFormData>) => {
    const badField = Object.keys(formErrors)[0] as keyof EditCompanyFormData;
    const stepIndex = FIELDS_BY_STEP.findIndex((fields) => fields.includes(badField));
    if (stepIndex >= 0) setCurrentStep(stepIndex);
    const message = formErrors[badField]?.message as string | undefined;
    toast({
      title: t('company.form.toast.invalid.title'),
      description:
        message && intl.messages[message] ? t(message) : t('company.form.toast.invalid.body'),
      status: 'error',
      duration: 5000,
      isClosable: true
    });
  };

  const nextStep = async () => {
    if (currentStep >= lastStep) return;
    const valid = await trigger(FIELDS_BY_STEP[currentStep]);
    if (valid) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  // Steps are rendered by plain functions, not components declared in the body: a component
  // type made on every render remounts its inputs, which drops focus mid-edit.
  const renderIdentity = () => (
    <VStack spacing={5} align="stretch">
      <StandardField label={t('company.form.name.label')} required error={err('name')}>
        <StandardInput placeholder={t('company.form.name.placeholder')} {...register('name')} />
      </StandardField>

      <StandardField label={t('company.form.tradename.label')} error={err('tradename')}>
        <StandardInput
          placeholder={t('company.form.tradename.placeholder')}
          {...register('tradename')}
        />
      </StandardField>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label={t('company.form.email.label')} error={err('contact_email')}>
          <StandardInput
            type="email"
            placeholder={t('company.form.email.placeholder')}
            {...register('contact_email')}
          />
        </StandardField>

        <StandardField label={t('company.form.phone.label')} error={err('contact_phone')}>
          <StandardInput
            type="tel"
            placeholder={t('company.form.phone.placeholder')}
            {...register('contact_phone')}
          />
        </StandardField>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField
          label={t('company.form.legalStructure.label')}
          error={err('legal_structure')}>
          <StandardSelect {...register('legal_structure')}>
            <option value="">{t('company.form.legalStructure.placeholder')}</option>
            {Object.entries(LEGAL_STRUCTURE_LABEL_KEYS).map(([value, id]) => (
              <option key={value} value={value}>
                {t(id)}
              </option>
            ))}
          </StandardSelect>
        </StandardField>

        <StandardField label={t('app.industry')} error={err('industry')}>
          <StandardSelect {...register('industry')}>
            <option value="">{t('app.select')}</option>
            {INDUSTRIES.map((value) => (
              <option key={value} value={value}>
                {t(`company.industry.${value}`)}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label={t('app.fiscalId')} error={err('fiscal_id')}>
          <StandardInput
            placeholder={t('company.edit.fiscalId.placeholder')}
            {...register('fiscal_id')}
          />
        </StandardField>

        <StandardField label={t('app.employeeCount')} error={err('employee_count')}>
          <StandardInput
            type="number"
            min={0}
            step={1}
            {...register('employee_count', { setValueAs: toCount })}
          />
        </StandardField>
      </SimpleGrid>

      <StandardField label={t('app.description')} error={err('description')}>
        <StandardTextarea
          placeholder={t('company.edit.description.placeholder')}
          {...register('description')}
        />
      </StandardField>
    </VStack>
  );

  // The state is the company's headquarters. It no longer claims to feed "precise carbon
  // calculations with USDA regional data": nothing reads the company's state for carbon,
  // and the farm's own location is set on the farm.
  const renderLocation = () => (
    <VStack spacing={5} align="stretch">
      <StandardField label={t('company.form.address.label')} error={err('address')}>
        <StandardInput
          placeholder={t('company.form.address.placeholder')}
          {...register('address')}
        />
      </StandardField>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label={t('company.form.city.label')} error={err('city')}>
          <StandardInput placeholder={t('company.form.city.placeholder')} {...register('city')} />
        </StandardField>

        <StandardField
          label={t('company.form.state.label')}
          error={err('state')}
          helpText={t('company.form.state.help')}>
          <StandardSelect {...register('state')}>
            {/* US state names are postal identifiers and stay as they are. */}
            <option value="">{t('company.form.state.placeholder')}</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>

      <StandardField label={t('company.form.zip.label')} error={err('zip_code')}>
        <StandardInput placeholder={t('company.form.zip.placeholder')} {...register('zip_code')} />
      </StandardField>
    </VStack>
  );

  const renderWeb = () => (
    <VStack spacing={5} align="stretch">
      <StandardField label={t('app.website')} error={err('website')}>
        <StandardInput
          type="url"
          placeholder={t('company.edit.website.placeholder')}
          {...register('website')}
        />
      </StandardField>

      <StandardField label="Facebook" error={err('facebook')}>
        <StandardInput
          type="url"
          placeholder={t('company.edit.facebook.placeholder')}
          {...register('facebook')}
        />
      </StandardField>

      <StandardField label="Instagram" error={err('instagram')}>
        <StandardInput
          type="url"
          placeholder={t('company.edit.instagram.placeholder')}
          {...register('instagram')}
        />
      </StandardField>

      <StandardField
        label={t('app.certificationsList')}
        helpText={t('company.edit.certifications.help')}
        error={err('certifications')}>
        <StandardInput
          placeholder={t('company.edit.certifications.placeholder')}
          {...register('certifications')}
        />
      </StandardField>
    </VStack>
  );

  // The green "commitment to transparency" box that sat under these two fields is gone: it
  // said the answers help "your consumers" learn about your practices, and neither value
  // reaches any consumer surface (sustainabilityCommitmentRetired.test.ts).
  const renderFarming = () => (
    <VStack spacing={5} align="stretch">
      <StandardField label={t('app.primaryCommodities')} error={err('primary_commodities')}>
        <StandardSelect {...register('primary_commodities')}>
          <option value="">{t('app.select')}</option>
          {PRIMARY_COMMODITIES.map((value) => (
            <option key={value} value={value}>
              {t(`company.commodity.${value}`)}
            </option>
          ))}
        </StandardSelect>
      </StandardField>

      <StandardField
        label={t('app.sustainabilityCommitment')}
        error={err('sustainability_commitment')}>
        <StandardSelect {...register('sustainability_commitment')}>
          <option value="">{t('app.select')}</option>
          {sustainabilityCommitmentOptions(company?.sustainability_commitment).map(
            ({ value, retired }) => (
              <option key={value} value={value} disabled={retired}>
                {t(`company.sustainabilityCommitment.${value}`)}
              </option>
            )
          )}
        </StandardSelect>
      </StandardField>
    </VStack>
  );

  const renderStep = [renderIdentity, renderLocation, renderWeb, renderFarming][currentStep];

  const body = (
    <FormProvider {...methods}>
      <VStack spacing={6} align="stretch">
        <StandardStepper
          steps={steps}
          currentStep={currentStep}
          allowStepClick
          furthestStep={furthestStep}
          onStepClick={(step) => (step < currentStep ? setCurrentStep(step) : nextStep())}
        />
        <Box>{renderStep()}</Box>
      </VStack>
    </FormProvider>
  );

  // No Cancel: the close button in the header leaves. Same footer as every wizard.
  const actions = (
    <Box w="100%">
      <WizardActions
        onBack={currentStep > 0 ? prevStep : undefined}
        backLabel={t('common.previousStep')}
        backShortLabel={t('app.previous')}
        primaryLabel={currentStep < lastStep ? t('app.continue') : t('company.edit.save')}
        primaryLeadsOn={currentStep < lastStep}
        onPrimary={
          currentStep < lastStep ? nextStep : handleSubmit(handleFormSubmit, handleInvalidSubmit)
        }
        isLoading={isLoading}
        loadingText={t('app.saving')}
      />
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} onClose={handleClose} placement="bottom" size="full">
        <DrawerOverlay />
        <DrawerContent borderTopRadius="2xl">
          <DrawerCloseButton />
          <DrawerHeader fontSize="lg">{t('company.edit.title')}</DrawerHeader>
          <DrawerBody pb={6}>{body}</DrawerBody>
          <DrawerFooter pt={0}>{actions}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent borderRadius="2xl" mx={4}>
        <ModalHeader fontSize="xl">{t('company.edit.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>{body}</ModalBody>
        <ModalFooter pt={0}>{actions}</ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditCompanyModal;
