import React from 'react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, Text, Wrap, WrapItem } from '@chakra-ui/react';

import { StandardField, StandardInput } from 'components/Design/StandardComponents';
import { useGetParcelQuery } from 'store/api/productApi';

/**
 * Block / row / section identifier, with the blocks already used on this parcel offered as
 * tappable chips.
 *
 * WHY THIS FIELD IS SPECIAL: `block_id` is free text and load-bearing. It becomes **CA PUR
 * box 22**, it is folded into the audit export's Input Application Log, and it is where a COG Pro
 * migration lands the grower's "Row/Section ID".
 *
 * Free text with no vocabulary degrades silently. A grower types "Block 3" in March, "block 3" in
 * May and "Blk 3" in July; a certifier asking "what happened in Block 3" receives a third of it,
 * and nothing reports the gap. `audit_export_service.py` already carries a regex written
 * specifically because growers name blocks "Block 1" and a blind prefix produced "Blk Block 1" on
 * a live export.
 *
 * WHY CHIPS AND NOT `<datalist>`: the first cut used a datalist. It is the wrong control here.
 * The popup is browser chrome rather than DOM, so it cannot be verified end-to-end at all; mobile
 * support is inconsistent and this ICP logs events on a phone in the field; there is no affordance
 * telling the grower that options exist; the browser filters options against typed text, so typing
 * "b" can hide "Block 4"; and it cannot be styled to the 44px touch minimum. A picker the farmer
 * cannot discover is the same as no picker.
 *
 * Chips are visible without interaction, testable, touch-sized, identical on every browser, and
 * they show the grower their own vocabulary. The text input stays, because a block being used for
 * the first time must always be typeable.
 */
interface BlockIdFieldProps {
  /** react-hook-form control from the parent form's `methods`. */
  control: any;
  /** Field name; defaults to the model field. */
  name?: string;
}

interface SectionInputProps {
  value: string;
  onChange: (value: string) => void;
  /** This parcel's sections already in use, offered as chips. */
  knownSections: string[];
  /** Extra props for the text input (a form binding's `name`, `onBlur`, `ref`). */
  inputProps?: Record<string, unknown>;
}

/**
 * The text input plus the known-sections chips, without a form binding. `BlockIdField` wraps it for
 * the single-parcel forms; the multi-parcel cards use it directly, one per parcel, each with that
 * parcel's own sections (a chip from parcel A offered on parcel B's card would be a guess).
 */
export const SectionInput: React.FC<SectionInputProps> = ({
  value,
  onChange,
  knownSections,
  inputProps = {}
}) => {
  const intl = useIntl();
  const current = (value ?? '').trim().toLowerCase();
  return (
    <>
      <StandardInput
        {...inputProps}
        value={value ?? ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={intl.formatMessage({ id: 'fieldDetails.blockIdPlaceholder' })}
      />
      {knownSections.length > 0 && (
        <>
          <Text fontSize="xs" color="gray.600" mt={2} mb={1}>
            {intl.formatMessage({ id: 'fieldDetails.blockIdKnown' })}
          </Text>
          <Wrap spacing={2} data-testid="block-id-suggestions">
            {knownSections.map((section) => {
              const isSelected = current === section.trim().toLowerCase();
              return (
                <WrapItem key={section}>
                  <Button
                    type="button"
                    size="sm"
                    minH="44px"
                    variant={isSelected ? 'solid' : 'outline'}
                    colorScheme="green"
                    fontWeight="normal"
                    // Tapping a selected chip clears it, so a mis-tap on a phone is
                    // recoverable without opening the keyboard to delete text.
                    onClick={() => onChange(isSelected ? '' : section)}
                    aria-pressed={isSelected}>
                    {section}
                  </Button>
                </WrapItem>
              );
            })}
          </Wrap>
        </>
      )}
    </>
  );
};

export const BlockIdField: React.FC<BlockIdFieldProps> = ({ control, name = 'block_id' }) => {
  const intl = useIntl();
  const { farmId, parcelId } = useParams();
  const companyId = useSelector((state: any) => state.company?.currentCompany?.id);

  // Fetch the parcel rather than reading an ambient `currentParcel` from the store. An earlier
  // version selected `state.product.currentParcel`, which is ALWAYS null: the only writer for
  // that slice is the `setParcel` action, and nothing in the app dispatches it. The picker
  // rendered empty on the live page while every unit test passed.
  const { data: parcel } = useGetParcelQuery(
    { companyId, farmId, parcelId },
    { skip: !companyId || !farmId || !parcelId }
  );

  const knownBlockIds: string[] = Array.isArray(parcel?.known_block_ids)
    ? parcel.known_block_ids
    : [];

  return (
    <StandardField
      label={intl.formatMessage({ id: 'fieldDetails.blockId' })}
      helpText={intl.formatMessage({ id: 'fieldDetails.blockIdHelp' })}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <SectionInput
            value={field.value ?? ''}
            onChange={field.onChange}
            knownSections={knownBlockIds}
            inputProps={{ name: field.name, onBlur: field.onBlur, ref: field.ref }}
          />
        )}
      />
    </StandardField>
  );
};

export default BlockIdField;
