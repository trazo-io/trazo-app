/**
 * "Add a product to this tank": the products sprayed with product 1 from the same tank.
 *
 * Each line becomes its own full record on save (trazo-back `history/services/tank_mix.py`), so it
 * asks what one product's record holds: name and lookup, active ingredient, EPA number, the
 * concentration or "not on my record", the amount (one parcel) or the rate, REI, PHI and the
 * organic basis. What the pass shares (date, method, wind, applicator, target pest) is asked once
 * by the spray form around it. Adjuvants and spreader-stickers are lines with role `adjuvant`.
 *
 * Replaces the old "tank-mix adjuvants" block for new records: a partner there had no rate, REI,
 * PHI, lot, invoice, receipt or National List classification (overall review 2026-11, OV-RK-C04).
 *
 * Design-system controls only (StandardComponents); Chakra's themed Checkbox for the tick.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Box, Checkbox, HStack, SimpleGrid, Stack, Text, VStack } from '@chakra-ui/react';
import { FaFlask, FaPlus, FaTrash, FaTruck } from 'react-icons/fa';

import {
  CollapsibleSection,
  SectionBox,
  SectionHeader,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import InputVerifyHelper from 'components/Compliance/InputVerifyHelper';
import { ReceiptDocumentSelect } from 'components/Forms/ReceiptDocumentSelect';
// @ts-expect-error OrganicBasisBlankNotice is a .jsx module with no type declarations.
import OrganicBasisBlankNotice from 'views/Dashboard/Dashboard/components/forms/OrganicBasisBlankNotice';
import { getSubtypes } from 'config/events';
import { isCaCountyRestricted } from 'config/events/caRestrictedMaterials';
import { APPLICATION_PURPOSES, APPLICATION_RATE_UNITS } from 'config/events/enums';
import {
  TANK_LINE_VOLUME_UNITS,
  TANK_MIX,
  defaultTargetPest,
  newTankLine,
  type TankLineForm
} from 'config/events/tankMix';

/** The organic bases product 1 offers, in its order (ChemicalTab section 1). */
const ORGANIC_BASES = [
  ['omri_listed', 'events.organicApproved.omriListed'],
  ['wsda_listed', 'events.organicApproved.wsdaListed'],
  ['nop_seal_on_label', 'events.organicApproved.nopSeal'],
  ['certifier_approved', 'events.organicApproved.certifierApproved'],
  ['unverified', 'events.organicApproved.unverified'],
  ['not_organic', 'events.organicApproved.notOrganicOption'],
  ['transitional', 'events.organicApproved.transitionalOption']
] as const;

/** Labels of the product units a tank line offers (`TANK_LINE_VOLUME_UNITS`, config/events/tankMix). */
const UNIT_LABELS: Record<string, string> = {
  L: 'app.unit.liters',
  gal: 'app.unit.gallons',
  mL: 'app.unit.milliliters',
  fl_oz: 'app.unit.fluidOunces',
  oz_wt: 'app.unit.ouncesWeight',
  kg: 'app.unit.kilograms',
  lbs: 'app.unit.pounds'
};
const VOLUME_UNITS = TANK_LINE_VOLUME_UNITS.map((code) => [code, UNIT_LABELS[code]] as const);

export interface TankMixLinesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methods: UseFormReturn<any>;
  /** Several parcels: the amount of each product is asked per parcel card, not here. */
  severalParcels: boolean;
  /** On a farm whose farming method is organic the basis is required, as for product 1. */
  requiresOrganicBasis: boolean;
  /** The spray's own type (FE/PE/FU/HE): a line's type when the line names none. */
  sprayType?: string;
  /** A California farm: a county-restricted product line asks its permit, as product 1 does. */
  isCaFarm?: boolean;
}

export const TankMixLines = ({
  methods,
  severalParcels,
  requiresOrganicBasis,
  sprayType = '',
  isCaFarm = false
}: TankMixLinesProps) => {
  const intl = useIntl();
  const { control } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'tank_lines' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineErrors = (methods.formState.errors.tank_lines as any) || [];
  const errorOf = (index: number, key: string) => lineErrors?.[index]?.[key]?.message as string;
  const at = (index: number, key: keyof TankLineForm) => `tank_lines.${index}.${key}`;

  // Same contract as product 1's lookup: attaching fills an EMPTY basis; detaching takes back only
  // what attaching gave.
  const attach = (
    index: number,
    key: 'omri_product' | 'wsda_material',
    basis: string,
    pk: number | null
  ) => {
    methods.setValue(at(index, key), pk, { shouldDirty: true });
    const current = String(methods.getValues(at(index, 'organic_approved')) ?? '').trim();
    if (pk != null) {
      if (!current) methods.setValue(at(index, 'organic_approved'), basis, { shouldDirty: true });
      return;
    }
    const other = key === 'omri_product' ? 'wsda_material' : 'omri_product';
    if (current === basis && methods.getValues(at(index, other)) == null) {
      methods.setValue(at(index, 'organic_approved'), '', { shouldDirty: true });
    }
  };

  const canAdd = fields.length + 1 < TANK_MIX.maxLines;
  // Read in render so the form subscribes to it: true only once the grower edits product 1's
  // target pest in this form, never for a value the form was opened with.
  const line1PestTyped = !!(methods.formState.dirtyFields as Record<string, unknown>)
    ?.target_pest_disease;

  return (
    <SectionBox>
      <SectionHeader
        icon={FaFlask}
        title={intl.formatMessage({ id: 'events.chemical.tankMix.title' })}
        description={intl.formatMessage({ id: 'events.chemical.tankMix.help' })}
      />
      <VStack spacing={3} align="stretch">
        {fields.length > 0 && (
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage({ id: 'events.chemical.tankMix.firstLineNote' })}
          </Text>
        )}
        {fields.map((item, index) => {
          const role = methods.watch(at(index, 'role'));
          // The type this line is recorded under: its own, or the spray's.
          const lineType = methods.watch(at(index, 'type')) || sprayType;
          // Product 1's CA permit gate, per line: a California farm and a county-restricted
          // product, or a line already holding a permit value (what was typed stays in sight).
          const holdsPermit = (
            ['ca_dpr_permit_number', 'ca_dpr_permit_county', 'ca_dpr_permit_expires'] as const
          ).some((key) => String(methods.watch(at(index, key)) ?? '').trim() !== '');
          const asksPermit =
            holdsPermit ||
            (isCaFarm && isCaCountyRestricted(methods.watch(at(index, 'commercial_name'))));
          const notOnRecord = methods.watch(at(index, 'concentration_not_recorded')) === 'true';
          return (
            <Box
              key={item.id}
              p={{ base: 3, md: 4 }}
              bg="white"
              borderRadius="lg"
              borderWidth="1px"
              borderColor={lineErrors?.[index] ? 'red.300' : 'gray.200'}
              data-testid={`tank-line-${index + 2}`}>
              <Stack
                direction={{ base: 'column', smd: 'row' }}
                align={{ base: 'stretch', smd: 'center' }}
                justify="space-between"
                spacing={2}
                mb={3}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  {intl.formatMessage(
                    { id: 'events.chemical.tankMix.lineLabel' },
                    { n: index + 2 }
                  )}
                </Text>
                <StandardButton
                  size="sm"
                  variant="ghost"
                  leftIcon={<FaTrash />}
                  alignSelf={{ base: 'flex-start', smd: 'auto' }}
                  onClick={() => remove(index)}>
                  {intl.formatMessage({ id: 'events.chemical.tankMix.remove' })}
                </StandardButton>
              </Stack>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <StandardField label={intl.formatMessage({ id: 'events.chemical.tankMix.role' })}>
                  <Controller
                    name={at(index, 'role')}
                    control={control}
                    render={({ field }) => (
                      <StandardSelect
                        {...field}
                        aria-label={intl.formatMessage({ id: 'events.chemical.tankMix.role' })}>
                        <option value="product">
                          {intl.formatMessage({ id: 'events.chemical.tankMix.roleProduct' })}
                        </option>
                        <option value="adjuvant">
                          {intl.formatMessage({ id: 'events.chemical.tankMix.roleAdjuvant' })}
                        </option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
                {role !== 'adjuvant' && (
                  <StandardField label={intl.formatMessage({ id: 'events.chemical.tankMix.type' })}>
                    <Controller
                      name={at(index, 'type')}
                      control={control}
                      render={({ field }) => (
                        <StandardSelect
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'events.chemical.tankMix.typeSame'
                          })}>
                          {getSubtypes(2).map((entry) => (
                            <option key={String(entry.code)} value={String(entry.code)}>
                              {intl.formatMessage({ id: entry.labelKey })}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                )}
              </SimpleGrid>

              <VStack spacing={3} align="stretch" mt={3}>
                <StandardField
                  label={intl.formatMessage({ id: 'events.chemical.form.commercialName' })}
                  required
                  error={errorOf(index, 'commercial_name')}>
                  <Controller
                    name={at(index, 'commercial_name')}
                    control={control}
                    render={({ field }) => (
                      <>
                        <StandardInput
                          {...field}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            field.onChange(e);
                            // The attached listing is for the name that was looked up.
                            if (methods.getValues(at(index, 'omri_product')) != null) {
                              methods.setValue(at(index, 'omri_product'), null, {
                                shouldDirty: true
                              });
                            }
                            if (methods.getValues(at(index, 'wsda_material')) != null) {
                              methods.setValue(at(index, 'wsda_material'), null, {
                                shouldDirty: true
                              });
                            }
                          }}
                          placeholder={intl.formatMessage({
                            id:
                              role === 'adjuvant'
                                ? 'events.chemical.tankMix.adjuvantPlaceholder'
                                : 'events.chemical.tankMix.productPlaceholder'
                          })}
                        />
                        <InputVerifyHelper
                          name={field.value || ''}
                          attachedOmriPk={methods.watch(at(index, 'omri_product'))}
                          attachedWsdaPk={methods.watch(at(index, 'wsda_material'))}
                          onAttachOmri={(pk) => attach(index, 'omri_product', 'omri_listed', pk)}
                          onAttachWsda={(pk) => attach(index, 'wsda_material', 'wsda_listed', pk)}
                        />
                      </>
                    )}
                  />
                </StandardField>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  <StandardField
                    label={intl.formatMessage({ id: 'events.chemical.form.activeIngredient' })}>
                    <Controller
                      name={at(index, 'active_ingredient')}
                      control={control}
                      render={({ field }) => <StandardInput {...field} />}
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.form.epaRegistrationNumber'
                    })}>
                    <Controller
                      name={at(index, 'epa_registration_number')}
                      control={control}
                      render={({ field }) => <StandardInput {...field} placeholder="62719-621" />}
                    />
                  </StandardField>
                </SimpleGrid>

                <StandardField
                  label={intl.formatMessage({
                    id: 'events.chemical.concentration.productConcentration'
                  })}
                  required={!notOnRecord}
                  error={errorOf(index, 'concentration')}
                  helpText={
                    notOnRecord
                      ? intl.formatMessage({
                          id: 'events.chemical.concentration.notOnMyRecordHelp'
                        })
                      : undefined
                  }>
                  <Controller
                    name={at(index, 'concentration')}
                    control={control}
                    render={({ field }) => (
                      <StandardInput {...field} isDisabled={notOnRecord} placeholder="22.5%" />
                    )}
                  />
                </StandardField>
                <Controller
                  name={at(index, 'concentration_not_recorded')}
                  control={control}
                  render={({ field: flag }) => (
                    <Checkbox
                      id={`tank-line-${index + 2}-not-recorded`}
                      colorScheme="green"
                      minH="44px"
                      alignItems="center"
                      isChecked={flag.value === 'true'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          methods.setValue(at(index, 'concentration'), '', { shouldDirty: true });
                        }
                        flag.onChange(e.target.checked ? 'true' : 'false');
                      }}>
                      <Text fontSize="sm" color="gray.700">
                        {intl.formatMessage({ id: 'events.chemical.concentration.notOnMyRecord' })}
                      </Text>
                    </Checkbox>
                  )}
                />

                <Stack direction={{ base: 'column', md: 'row' }} spacing={3} align="stretch">
                  {!severalParcels && (
                    <StandardField
                      label={intl.formatMessage({ id: 'app.volumeApplied' })}
                      required
                      error={errorOf(index, 'volume_numeric')}
                      flex={2}>
                      <Controller
                        name={at(index, 'volume_numeric')}
                        control={control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                          />
                        )}
                      />
                    </StandardField>
                  )}
                  <StandardField
                    label={intl.formatMessage({ id: 'app.volumeUnit' })}
                    required
                    error={errorOf(index, 'volume_unit')}
                    flex={1}>
                    <Controller
                      name={at(index, 'volume_unit')}
                      control={control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          {VOLUME_UNITS.map(([value, labelKey]) => (
                            <option key={value} value={value}>
                              {intl.formatMessage({ id: labelKey })}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </Stack>
                {severalParcels && (
                  <Text fontSize="xs" color="gray.600">
                    {intl.formatMessage({ id: 'events.chemical.tankMix.amountPerParcel' })}
                  </Text>
                )}

                <Stack direction={{ base: 'column', md: 'row' }} spacing={3} align="stretch">
                  <StandardField label={intl.formatMessage({ id: 'app.applicationRate' })} flex={2}>
                    <Controller
                      name={at(index, 'application_rate')}
                      control={control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0.0"
                        />
                      )}
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({ id: 'app.applicationRateUnit' })}
                    error={errorOf(index, 'application_rate_unit')}
                    flex={1}>
                    <Controller
                      name={at(index, 'application_rate_unit')}
                      control={control}
                      render={({ field }) => (
                        <StandardSelect
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'app.applicationRateUnitPlaceholder'
                          })}>
                          {APPLICATION_RATE_UNITS.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                              {intl.formatMessage({ id: unit.labelKey })}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </Stack>

                <SimpleGrid columns={{ base: 1, smd: 2 }} spacing={3}>
                  <StandardField
                    label={intl.formatMessage({ id: 'events.chemical.form.reiHours' })}
                    error={errorOf(index, 'rei_hours')}>
                    <Controller
                      name={at(index, 'rei_hours')}
                      control={control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="4"
                        />
                      )}
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({ id: 'events.chemical.form.phiDays' })}
                    error={errorOf(index, 'phi_days')}>
                    <Controller
                      name={at(index, 'phi_days')}
                      control={control}
                      render={({ field }) => (
                        <StandardInput {...field} type="number" step="1" min="0" placeholder="7" />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Restricted Use is this product's own fact (40 CFR 152.175); any line with it
                    makes the applicator's certification number required, as product 1 does. Asked
                    for the types that render it on product 1. */}
                {['PE', 'HE', 'FU'].includes(lineType) && (
                  <Controller
                    name={at(index, 'restricted_use_pesticide')}
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id={`tank-line-${index + 2}-rup`}
                        colorScheme="red"
                        minH="44px"
                        alignItems="center"
                        isChecked={field.value === 'true'}
                        onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}>
                        <Text fontSize="sm" color="gray.700">
                          {intl.formatMessage({ id: 'events.chemical.restrictedUse.statement' })}
                        </Text>
                      </Checkbox>
                    )}
                  />
                )}
                {asksPermit && (
                  <Box
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                    data-testid={`tank-line-${index + 2}-permit`}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={2}>
                      {intl.formatMessage({ id: 'events.section.chemical.dprPermit' })}
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.chemical.form.permitNumber' })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.permitNumberHelp'
                        })}>
                        <Controller
                          name={at(index, 'ca_dpr_permit_number')}
                          control={control}
                          render={({ field }) => (
                            <StandardInput {...field} placeholder="e.g., SD-2026-00147" />
                          )}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.chemical.form.permitCounty' })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.permitCountyHelp'
                        })}>
                        <Controller
                          name={at(index, 'ca_dpr_permit_county')}
                          control={control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.permitCountyPlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>
                    <Box mt={3}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.fields.caDprPermitExpires'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.permitExpiresHelp'
                        })}>
                        <Controller
                          name={at(index, 'ca_dpr_permit_expires')}
                          control={control}
                          render={({ field }) => <StandardInput {...field} type="date" />}
                        />
                      </StandardField>
                    </Box>
                  </Box>
                )}

                {/* This product's own target: one tank can carry an insecticide and a fungicide,
                    and a shared pest would print the wrong one on one of the two records. */}
                <StandardField
                  label={intl.formatMessage({ id: 'events.chemical.form.targetPest' })}
                  helpText={intl.formatMessage({ id: 'events.chemical.form.targetPestHelp' })}>
                  <Controller
                    name={at(index, 'target_pest_disease')}
                    control={control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        placeholder={intl.formatMessage({
                          id: 'events.chemical.form.targetPestPlaceholder'
                        })}
                      />
                    )}
                  />
                </StandardField>
                <StandardField
                  label={intl.formatMessage({ id: 'events.chemical.fields.applicationPurpose' })}>
                  <Controller
                    name={at(index, 'application_purpose')}
                    control={control}
                    render={({ field }) => (
                      <StandardSelect {...field}>
                        <option value="">
                          {intl.formatMessage({
                            id: 'events.chemical.fields.applicationPurposePlaceholder'
                          })}
                        </option>
                        {APPLICATION_PURPOSES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {intl.formatMessage({ id: opt.labelKey })}
                          </option>
                        ))}
                      </StandardSelect>
                    )}
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'events.chemical.form.organicBasis' })}
                  required={requiresOrganicBasis}
                  error={errorOf(index, 'organic_approved')}>
                  <Controller
                    name={at(index, 'organic_approved')}
                    control={control}
                    render={({ field }) => (
                      <StandardSelect
                        {...field}
                        placeholder={intl.formatMessage({
                          id: 'events.chemical.form.organicBasisPlaceholder'
                        })}>
                        {ORGANIC_BASES.map(([value, labelKey]) => (
                          <option key={value} value={value}>
                            {intl.formatMessage({ id: labelKey })}
                          </option>
                        ))}
                      </StandardSelect>
                    )}
                  />
                </StandardField>
                {/* The blank-basis warning (OV-FJ-C21) on every line, as on product 1; not where
                    the basis is required, which refuses the save with its own error instead. */}
                {!requiresOrganicBasis && (
                  <OrganicBasisBlankNotice
                    control={control}
                    name={at(index, 'organic_approved')}
                    messageId="events.chemical.organicBasis.blankWarning"
                  />
                )}

                {/* The purchase this product came from, asked as product 1's purchase section asks
                    it (same labels, units and receipt picker), so each product's invoice, lot,
                    receipt and quantity reach its own record (OV-RK-C04). Collapsed: optional. */}
                <CollapsibleSection
                  icon={FaTruck}
                  title={intl.formatMessage({ id: 'events.chemical.tankMix.purchaseDetails' })}
                  description={intl.formatMessage({
                    id: 'events.chemical.tankMix.purchaseDetailsHelp'
                  })}>
                  <VStack spacing={3} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.chemical.form.supplierName' })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.supplierNameHelp'
                        })}>
                        <Controller
                          name={at(index, 'supplier_name')}
                          control={control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.supplierNamePlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({ id: 'events.chemical.fields.purchaseDate' })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.purchaseDateHelp'
                        })}>
                        <Controller
                          name={at(index, 'purchase_date')}
                          control={control}
                          render={({ field }) => <StandardInput {...field} type="date" />}
                        />
                      </StandardField>
                    </SimpleGrid>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.chemical.form.purchaseInvoice' })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.form.purchaseInvoiceHelp'
                      })}>
                      <Controller
                        name={at(index, 'purchase_invoice')}
                        control={control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.form.purchaseInvoicePlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>
                    <Controller
                      name={at(index, 'receipt_document')}
                      control={control}
                      render={({ field }) => (
                        <ReceiptDocumentSelect value={field.value} onChange={field.onChange} />
                      )}
                    />
                    <StandardField
                      label={intl.formatMessage({ id: 'events.chemical.fields.chemicalLotNumber' })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.chemicalLotNumberHelp'
                      })}>
                      <Controller
                        name={at(index, 'chemical_lot_number')}
                        control={control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.chemicalLotNumberPlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.chemical.fields.quantityPurchased' })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.quantityPurchasedHelp'
                      })}>
                      <HStack spacing={2} align="start">
                        <Controller
                          name={at(index, 'quantity_purchased')}
                          control={control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                            />
                          )}
                        />
                        <Controller
                          name={at(index, 'quantity_purchased_unit')}
                          control={control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              maxW="130px"
                              aria-label={intl.formatMessage({
                                id: 'events.chemical.fields.quantityPurchased'
                              })}>
                              {VOLUME_UNITS.map(([value, labelKey]) => (
                                <option key={value} value={value}>
                                  {intl.formatMessage({ id: labelKey })}
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </HStack>
                    </StandardField>
                  </VStack>
                </CollapsibleSection>
              </VStack>
            </Box>
          );
        })}
        <HStack>
          <StandardButton
            variant="outline"
            leftIcon={<FaPlus />}
            isDisabled={!canAdd}
            onClick={() =>
              append(
                newTankLine('product', String(methods.getValues('volume_unit') || 'gal'), {
                  // Product 1's target pest as an editable default, only when the grower typed it.
                  targetPest: defaultTargetPest(
                    methods.getValues('target_pest_disease'),
                    line1PestTyped
                  )
                })
              )
            }>
            {intl.formatMessage({ id: 'events.chemical.tankMix.add' })}
          </StandardButton>
        </HStack>
      </VStack>
    </SectionBox>
  );
};

export default TankMixLines;
