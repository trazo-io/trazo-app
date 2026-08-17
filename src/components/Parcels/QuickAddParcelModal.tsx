/**
 * QuickAddParcelModal — WS-5 parcel quick-add (plan §1.4 #28–29).
 *
 * Two fields — name + area in acres — and the parcel exists; everything else
 * (boundaries, crops, contacts, buffers) is added later from the full form,
 * which stays one link away. Area is entered in ACRES (the operation's unit)
 * and stored in hectares, same convention as StandardParcelForm_Transparency.
 *
 * Shell: ResponsiveModal — centered dialog on desktop, bottom-sheet drawer on
 * mobile, per the app's one-dialog-shell rule.
 */

import React, { useMemo, useState } from 'react';
import { HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { useDispatch } from 'react-redux';

import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { StandardButton, StandardField, StandardInput } from 'components/Design/StandardComponents';
import { AREA_CONVERSION_FACTORS } from 'utils/areaUnits';
import { setFarmParcel } from 'store/features/companySlice';
import { useCreateParcelMutation } from 'store/api/productApi';

interface QuickAddParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string | number;
  farmId: string | number;
}

export const QuickAddParcelModal: React.FC<QuickAddParcelModalProps> = ({
  isOpen,
  onClose,
  companyId,
  farmId
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const [createParcel, { isLoading }] = useCreateParcelMutation();

  const [name, setName] = useState('');
  const [acres, setAcres] = useState('');

  const hectares = useMemo(() => {
    const value = parseFloat(acres);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value * AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES;
  }, [acres]);

  const canSubmit = name.trim().length > 0 && hectares != null;

  const reset = () => {
    setName('');
    setAcres('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!canSubmit || hectares == null) return;
    try {
      const result = await createParcel({
        companyId,
        farmId,
        parcelData: {
          name: name.trim(),
          description: '',
          area: hectares.toFixed(4)
        }
      }).unwrap();
      // Same post-create sync AddParcel does — the carousel reads the redux
      // company slice, not the RTK cache, so the new parcel must be dispatched in.
      dispatch(setFarmParcel({ farmId, parcel: result }));
      toast({
        title: intl.formatMessage({ id: 'parcel.quickAdd.created' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      handleClose();
    } catch (error: unknown) {
      const detail =
        (error as { data?: { detail?: string; message?: string } })?.data?.detail ||
        (error as { data?: { detail?: string; message?: string } })?.data?.message;
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: detail,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      isCloseDisabled={isLoading}
      header={
        <Text fontSize="lg" fontWeight="semibold">
          {intl.formatMessage({ id: 'parcel.quickAdd.title' })}
        </Text>
      }
      footer={
        <HStack spacing={3}>
          <StandardButton
            variant="outline"
            minH="44px"
            onClick={handleClose}
            isDisabled={isLoading}
          >
            {intl.formatMessage({ id: 'app.cancel' })}
          </StandardButton>
          <StandardButton
            minH="44px"
            onClick={handleCreate}
            isLoading={isLoading}
            isDisabled={!canSubmit}
          >
            {intl.formatMessage({ id: 'parcel.quickAdd.create' })}
          </StandardButton>
        </HStack>
      }
    >
      <VStack align="stretch" spacing={4}>
        <StandardField label={intl.formatMessage({ id: 'app.name' })} required>
          <StandardInput
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder={intl.formatMessage({ id: 'parcel.quickAdd.namePlaceholder' })}
            autoFocus
          />
        </StandardField>

        <StandardField
          label={intl.formatMessage({ id: 'parcel.areaAcres' })}
          required
          helpText={
            hectares != null
              ? intl.formatMessage(
                  { id: 'parcel.areaHectaresEquivalent' },
                  { ha: hectares.toFixed(2) }
                )
              : undefined
          }
        >
          <StandardInput
            value={acres}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcres(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder={intl.formatMessage({ id: 'parcel.quickAdd.acresPlaceholder' })}
          />
        </StandardField>

        <Text
          fontSize="sm"
          color="green.700"
          cursor="pointer"
          fontWeight="medium"
          onClick={() => {
            handleClose();
            navigate(`/admin/dashboard/farm/${farmId}/parcel/add`);
          }}
        >
          {intl.formatMessage({ id: 'parcel.quickAdd.fullForm' })}
        </Text>
      </VStack>
    </ResponsiveModal>
  );
};

export default QuickAddParcelModal;
