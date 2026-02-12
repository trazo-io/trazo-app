import React from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { StandardParcelFormTransparency } from '../../../../components/Forms/StandardParcelForm_Transparency';
import {
  useCreateParcelMutation,
  useUpdateParcelMutation,
  useGetParcelQuery
} from 'store/api/productApi';
import { useGetEstablishmentQuery } from 'store/api/companyApi';
import { setEstablishmentParcel } from 'store/features/companySlice';
import { useToast } from '@chakra-ui/react';

interface AddParcelProps {
  isEdit?: boolean;
}

interface RootState {
  company: {
    currentCompany: {
      id: string;
      name: string;
    };
    currentEstablishment: {
      id: string;
      name: string;
      latitude?: number;
      longitude?: number;
    };
  };
}

function AddParcel({ isEdit = false }: AddParcelProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { establishmentId, parcelId } = useParams();
  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);
  const currentEstablishment = useSelector(
    (state: RootState) => state.company.currentEstablishment
  );

  const [createParcel, { isLoading: isCreating }] = useCreateParcelMutation();
  const [updateParcel, { isLoading: isUpdating }] = useUpdateParcelMutation();

  // Fetch establishment data to get coordinates for map centering
  const { data: establishmentData } = useGetEstablishmentQuery(
    {
      companyId: currentCompany?.id,
      establishmentId
    },
    {
      skip: !establishmentId || !currentCompany?.id
    }
  );

  // Fetch parcel data for edit mode
  const {
    data: parcelData,
    isLoading: isLoadingParcel,
    error: parcelError
  } = useGetParcelQuery(
    {
      companyId: currentCompany?.id,
      establishmentId,
      parcelId
    },
    {
      skip: !isEdit || !parcelId || !establishmentId || !currentCompany?.id
    }
  );

  // Get establishment coordinates - prefer fresh API data over Redux state
  const establishmentCoordinates =
    establishmentData?.latitude && establishmentData?.longitude
      ? { lat: establishmentData.latitude, lng: establishmentData.longitude }
      : currentEstablishment?.latitude && currentEstablishment?.longitude
      ? { lat: currentEstablishment.latitude, lng: currentEstablishment.longitude }
      : undefined;

  // 🎯 Transparency-focused initial data mapping
  const getInitialData = () => {
    if (!isEdit || !parcelData) return {};

    console.log('📊 Loading parcel data for transparency form:', parcelData);

    return {
      // Core transparency fields (map directly to new schema)
      name: parcelData.name || '',
      area: parcelData.area || 0,
      crop_focus: parcelData.crop_type || '', // Map crop_type → crop_focus

      // Transparency story fields (map description → transparency_description)
      transparency_description: parcelData.description || '',
      sustainability_practices:
        parcelData.agricultural_details?.carbon_sequestration_practices ||
        parcelData.agricultural_details?.cover_crop_management ||
        '',
      consumer_story: '', // New field, will be empty for existing parcels

      // Visual documentation
      images: parcelData.images || [],
      certified: parcelData.certified || false,
      certification_type: parcelData.certification_type || '',

      // System fields (maintain compatibility)
      polygon: parcelData.polygon || [],
      map_metadata: parcelData.map_metadata || {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 13
      },
      establishment: parseInt(parcelData.establishment) || undefined,

      // Legacy fields for backend compatibility (hidden from UI)
      description: parcelData.description || '',
      contact_phone: parcelData.contact_phone || '',
      contact_person: parcelData.contact_person || '',
      contact_email: parcelData.contact_email || '',
      address: parcelData.address || '',
      unique_code: parcelData.unique_code || ''
    };
  };

  const handleSubmit = async (data: any) => {
    try {
      console.log('🎯 Transparency form data received:', data);
      console.log('🎯 Transparency fields:', {
        transparency_description: data.transparency_description,
        sustainability_practices: data.sustainability_practices,
        consumer_story: data.consumer_story,
        crop_focus: data.crop_focus
      });

      // 🌱 Store transparency narrative in agricultural_details for carbon context
      const agriculturalDetails: any = {};

      // Store transparency story for consumer display
      if (data.sustainability_practices) {
        agriculturalDetails.carbon_sequestration_practices = data.sustainability_practices;
        agriculturalDetails.cover_crop_management = data.sustainability_practices;
      }

      if (data.consumer_story) {
        agriculturalDetails.consumer_narrative = data.consumer_story;
      }

      // Basic carbon tracking capability
      const hasTransparencyData = !!(
        data.transparency_description && data.sustainability_practices
      );

      console.log('🌱 Transparency agricultural details:', {
        agriculturalDetails,
        hasTransparencyData
      });

      // 🎯 Map transparency form to backend fields
      const parcelData = {
        name: data.name,
        area: Number(data.area),
        description: data.transparency_description || data.description, // Use transparency description as primary
        contact_phone: data.contact_phone || '',
        address: data.address || '',
        certified: data.certified || false,
        crop_focus: data.crop_focus || '', // Use crop_focus for backend transparency mapping
        unique_code: data.unique_code || '',
        certification_type: data.certification_type || '',
        contact_person: data.contact_person || '',
        contact_email: data.contact_email || '',
        polygon: data.polygon || [],
        map_metadata: data.map_metadata || {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 13
        },
        establishment: parseInt(establishmentId!),

        // ✅ Store transparency context for carbon calculations
        agricultural_details: agriculturalDetails,
        carbon_calculation_enabled: hasTransparencyData,
        transparency_ready: true, // Mark as transparency-focused parcel

        // Consumer-facing fields
        consumer_story: data.consumer_story || '',
        sustainability_practices: data.sustainability_practices || ''
      };

      console.log('🚀 Prepared parcelData:', parcelData);

      // Handle image upload data from the enhanced form
      const imageData: any = {};
      if (data.uploaded_image_urls?.length > 0) {
        imageData.uploaded_image_urls = data.uploaded_image_urls;
      }
      if (data.images_to_delete?.length > 0) {
        imageData.images_to_delete = data.images_to_delete;
      }
      if (data.new_images?.length > 0) {
        imageData.new_images = data.new_images;
      }

      const finalData = { ...parcelData, ...imageData };

      console.log('🎪 Final data to API:', finalData);
      console.log('🎪 Final data keys:', Object.keys(finalData));

      if (isEdit && parcelId) {
        // Update existing parcel
        await updateParcel({
          companyId: currentCompany?.id,
          establishmentId,
          parcelId,
          parcelData: finalData
        }).unwrap();

        // ✅ Redirect to parcel profile after update
        navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`);
      } else {
        // Create new parcel
        const result = await createParcel({
          companyId: currentCompany?.id,
          establishmentId,
          parcelData: finalData
        }).unwrap();

        // ✅ CRITICAL FIX: Update Redux state to include new parcel
        dispatch(
          setEstablishmentParcel({
            establishmentId: establishmentId!,
            parcel: result
          })
        );

        toast({
          title: 'Parcel Created',
          description: 'The parcel has been successfully created.',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });

        // ✅ Redirect to new parcel profile after creation
        navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${result.id}`);
      }
    } catch (error: any) {
      console.error('Failed to save parcel:', error);

      toast({
        title: isEdit ? 'Update Failed' : 'Creation Failed',
        description:
          error?.data?.detail || 'An error occurred while saving the parcel. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    }
  };

  const handleCancel = () => {
    navigate(`/admin/dashboard/establishment/${establishmentId}`);
  };

  // Show loading state while fetching parcel data in edit mode
  if (isEdit && isLoadingParcel) {
    return (
      <StandardParcelFormTransparency
        onSubmit={() => {}}
        onCancel={handleCancel}
        isLoading={true}
        isEdit={true}
        establishmentName={establishmentData?.name || currentEstablishment?.name || ''}
        establishmentCoordinates={establishmentCoordinates}
      />
    );
  }

  // Show error if failed to fetch parcel data
  if (isEdit && parcelError) {
    toast({
      title: 'Error Loading Parcel',
      description: 'Failed to load parcel data. Please try again.',
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top-right'
    });
    navigate(`/admin/dashboard/establishment/${establishmentId}`);
    return null;
  }

  return (
    <StandardParcelFormTransparency
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      initialData={getInitialData()}
      isLoading={isCreating || isUpdating}
      isEdit={isEdit}
      establishmentName={establishmentData?.name || currentEstablishment?.name || ''}
      establishmentCoordinates={establishmentCoordinates}
    />
  );
}

export default AddParcel;
