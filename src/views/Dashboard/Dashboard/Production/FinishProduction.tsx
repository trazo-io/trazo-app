import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useToast } from '@chakra-ui/react';
import { StandardFinishProductionForm } from '../../../../components/Forms';
import {
  useFinishCurrentHistoryMutation,
  useGetCurrentHistoryQuery
} from 'store/api/historyApi.js';
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';

function FinishProduction() {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { parcelId, farmId, productionId } = useParams();
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // Pull current production so the preview frame can show real product/farm
  // names while the farmer is still on the upload step. HistorySerializer
  // returns `product` and `parcel` as plain name strings, so use them
  // directly (no `.name` traversal).
  const { data: currentHistory } = useGetCurrentHistoryQuery(
    { companyId: currentCompany?.id, farmId, parcelId },
    { skip: !currentCompany?.id || !farmId || !parcelId }
  );

  // Same transparency endpoint the consumer page calls. Owners can fetch
  // unpublished histories (see `production_transparency_detail` perms),
  // so the preview can show the real score / farm name / harvest date
  // that consumers will see.
  const productionPublicId: string | undefined =
    typeof currentHistory?.public_id === 'string' ? currentHistory.public_id : undefined;

  const { data: transparency } = useGetTransparencyDetailsQuery(productionPublicId as string, {
    skip: !productionPublicId
  });

  // Mirror the consumer page's data extraction path so the preview can show
  // the same farm/product/harvest values shoppers will see. `farmer` and
  // `product` live at the response root (alongside `standard_view`), per
  // ProductDetail.tsx's existing logic.
  const productName: string =
    (transparency as any)?.product?.name ||
    (typeof currentHistory?.product === 'string' ? currentHistory.product : '');
  const parcelName: string =
    typeof currentHistory?.parcel === 'string' ? currentHistory.parcel : '';
  const farmName: string =
    (transparency as any)?.farmer?.name || currentCompany?.name || '';
  // ProductDetail.tsx passes `completeData.finish_date` to the live hero;
  // for unfinished productions this is null, so the preview omits the
  // "Harvested ..." suffix. After finish, the same field drives the
  // consumer hero exactly.
  const harvestDate: string | undefined =
    (transparency as any)?.finish_date ||
    (currentHistory as any)?.finish_date ||
    undefined;
  const previewScore: number | undefined =
    transparency?.quick_view?.transparency_score?.percentage;

  // Fallback cover used by ProductDetail when farmer uploads no photos:
  // first event-timeline photo. Surface it here so the preview shows the
  // farmer what consumers will actually see if they skip the upload.
  const fallbackImageUrl: string | undefined = (() => {
    const tl = (transparency as any)?.timeline as
      | Array<{ album?: { images?: Array<{ image?: string }> } }>
      | undefined;
    if (!tl) return undefined;
    const firstWithPhoto = tl.find((ev) => ev?.album?.images?.[0]?.image);
    return firstWithPhoto?.album?.images?.[0]?.image;
  })();

  const [finishCurrentHistory, { isLoading }] = useFinishCurrentHistoryMutation();

  const handleSubmit = async (data: any) => {
    try {
      await finishCurrentHistory({
        companyId: currentCompany?.id,
        farmId,
        parcelId: parcelId,
        historyData: {
          ...data,
          album: {
            images: data.images || []
          }
        }
      }).unwrap();

      navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`);
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
    navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/`);
  };

  return (
    <WriteAccessGuard>
      <StandardFinishProductionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        productName={productName}
        parcelName={parcelName}
        farmName={farmName}
        previewScore={previewScore}
        harvestDate={harvestDate}
        fallbackImageUrl={fallbackImageUrl}
      />
    </WriteAccessGuard>
  );
}

export default FinishProduction;
