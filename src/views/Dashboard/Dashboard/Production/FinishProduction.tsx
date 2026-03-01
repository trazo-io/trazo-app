import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useToast } from '@chakra-ui/react';
import { StandardFinishProductionForm } from '../../../../components/Forms';
import { useFinishCurrentHistoryMutation } from 'store/api/historyApi.js';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';

function FinishProduction() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { parcelId, establishmentId, productionId } = useParams();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  const [finishCurrentHistory, { isLoading }] = useFinishCurrentHistoryMutation();

  const handleSubmit = async (data: any) => {
    try {
      await finishCurrentHistory({
        companyId: currentCompany?.id,
        establishmentId,
        parcelId: parcelId,
        historyData: {
          ...data,
          album: {
            images: data.images || []
          }
        }
      }).unwrap();

      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`);
    } catch (error: any) {
      console.error('Error finishing production:', error);

      let description = 'Failed to finish production. Please try again.';
      if (error?.data) {
        if (typeof error.data.detail === 'string') {
          description = error.data.detail;
        } else if (typeof error.data.error === 'string') {
          description = error.data.error;
        } else if (typeof error.data === 'object') {
          const fieldErrors = Object.entries(error.data)
            .filter(([, msgs]) => Array.isArray(msgs))
            .map(([field, msgs]) => {
              const label = field.replace(/_/g, ' ');
              return `${label}: ${(msgs as string[]).join(', ')}`;
            });
          if (fieldErrors.length > 0) {
            description = fieldErrors.join(' | ');
          }
        }
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title: intl.formatMessage({ id: 'app.errorUpdating' }),
        description,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
    }
  };

  const handleCancel = () => {
    navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/`);
  };

  return (
    <WriteAccessGuard>
      <StandardFinishProductionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </WriteAccessGuard>
  );
}

export default FinishProduction;
