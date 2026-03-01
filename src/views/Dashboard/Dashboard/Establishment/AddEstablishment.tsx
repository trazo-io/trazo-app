import React, { useEffect } from 'react';
import { Box, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { StandardEstablishmentForm } from '../../../../components/Forms/StandardEstablishmentForm';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';
import subscriptionToastHelper from '../../../../utils/toast/SubscriptionToastHelper';
import { useSelector, useDispatch } from 'react-redux';
import {
  useCreateEstablishmentMutation,
  useEditEstablishmentMutation,
  useGetEstablishmentQuery
} from 'store/api/companyApi';
import { addCompanyEstablishment } from 'store/features/companySlice';

interface Props {
  isEdit?: boolean;
}

function AddEstablishment({ isEdit = false }: Props) {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { establishmentId } = useParams();
  const isUpgrade = searchParams.get('return') === 'upgrade';
  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  const [createEstablishment, { isLoading: isCreating }] = useCreateEstablishmentMutation();
  const [editEstablishment, { isLoading: isUpdating }] = useEditEstablishmentMutation();

  // Fetch establishment data for editing
  const {
    data: establishmentData,
    isLoading: isLoadingEstablishment,
    isSuccess: isEstablishmentLoaded
  } = useGetEstablishmentQuery(
    {
      companyId: currentCompany?.id,
      establishmentId: establishmentId!
    },
    {
      skip: !isEdit || !currentCompany?.id || !establishmentId
    }
  );

  // Clear any subscription success toasts when this component mounts
  useEffect(() => {
    subscriptionToastHelper.clearAllSubscriptionToastFlags();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      if (isEdit) {
        // Handle edit mode
        const establishmentUpdateData = {
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          zone: data.zone || '',
          state: data.state || '',
          country: data.country || '',
          zip_code: data.zipCode || '',
          description: data.description || '',
          about: data.about || '',
          main_activities: data.main_activities || '',
          location_highlights: data.location_highlights || '',
          custom_message: data.custom_message || '',
          establishment_type: data.establishmentType || '',
          farming_method: data.farmingMethod || '',
          total_acreage: data.totalAcreage || 0,
          employee_count: data.employeeCount || 0,
          year_established: data.yearEstablished || null,
          is_active: data.isActive !== undefined ? data.isActive : true,
          type: data.type || data.establishmentType || '',
          latitude: data.latitude !== undefined ? data.latitude : null,
          longitude: data.longitude !== undefined ? data.longitude : null,
          crops_grown: JSON.stringify(data.cropsGrown || []),
          certifications: Array.isArray(data.certifications)
            ? data.certifications.join(', ')
            : data.certifications || '',
          sustainability_practices: JSON.stringify(data.sustainabilityPractices || []),
          // Operational fields - updated for transparency-first approach
          // climate_zone removed from UI but kept for backward compatibility
          climate_zone: data.climateZone || '',
          water_sources: JSON.stringify(data.waterSources || []),
          soil_types: JSON.stringify(data.soilHealthPractices || []),
          // conservation_practices merged into sustainability_practices
          conservation_practices: JSON.stringify([]),
          irrigation_methods: JSON.stringify(data.irrigationMethods || []),
          contact_person: data.contact_person || '',
          contact_phone: data.contact_phone || data.phone || '',
          contact_email: data.contact_email || data.email || '',
          // Image upload fields - only include if there are changes
          ...(data.uploaded_image_urls &&
            data.uploaded_image_urls.length > 0 && {
              uploaded_image_urls: data.uploaded_image_urls
            }),
          ...(data.images_to_delete &&
            data.images_to_delete.length > 0 && {
              images_to_delete: data.images_to_delete
            }),
          ...(data.new_images &&
            data.new_images.length > 0 && {
              new_images: data.new_images
            })
        };

        console.log('Updating establishment data:', establishmentUpdateData);

        const result = await editEstablishment({
          companyId: currentCompany.id,
          establishmentId: establishmentId!,
          establishmentData: establishmentUpdateData
        }).unwrap();

        // Small delay to allow Redux cache invalidation to complete before navigation
        setTimeout(() => {
          navigate(`/admin/dashboard/establishment/${result.id}`);
        }, 100);
      } else {
        // Handle create mode
        const establishmentData = {
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          zone: data.zone || '',
          state: data.state || '',
          country: data.country || '',
          zip_code: data.zipCode || '',
          description: data.description || '',
          about: data.about || '',
          main_activities: data.main_activities || '',
          location_highlights: data.location_highlights || '',
          custom_message: data.custom_message || '',
          establishment_type: data.establishmentType || '',
          farming_method: data.farmingMethod || '',
          total_acreage: data.totalAcreage || 0,
          employee_count: data.employeeCount || 0,
          year_established: data.yearEstablished || null,
          is_active: data.isActive !== undefined ? data.isActive : true,
          type: data.type || data.establishmentType || '',
          latitude: data.latitude !== undefined ? data.latitude : null,
          longitude: data.longitude !== undefined ? data.longitude : null,
          crops_grown: JSON.stringify(data.cropsGrown || []),
          certifications: Array.isArray(data.certifications)
            ? data.certifications.join(', ')
            : data.certifications || '',
          sustainability_practices: JSON.stringify(data.sustainabilityPractices || []),
          // Operational fields - updated for transparency-first approach
          // climate_zone removed from UI but kept for backward compatibility
          climate_zone: data.climateZone || '',
          water_sources: JSON.stringify(data.waterSources || []),
          soil_types: JSON.stringify(data.soilHealthPractices || []),
          // conservation_practices merged into sustainability_practices
          conservation_practices: JSON.stringify([]),
          irrigation_methods: JSON.stringify(data.irrigationMethods || []),
          contact_person: data.contact_person || '',
          contact_phone: data.contact_phone || data.phone || '',
          contact_email: data.contact_email || data.email || '',
          company: currentCompany.id,
          // Image upload fields - only include if there are uploaded images
          ...(data.uploaded_image_urls &&
            data.uploaded_image_urls.length > 0 && {
              uploaded_image_urls: data.uploaded_image_urls
            }),
          ...(data.new_images &&
            data.new_images.length > 0 && {
              new_images: data.new_images
            })
        };

        console.log('Sending establishment data to backend:', establishmentData);

        const result = await createEstablishment({
          companyId: currentCompany.id,
          establishment: establishmentData
        }).unwrap();

        console.log('✅ Establishment created successfully:', result);
        console.log('🚀 New establishment ID:', result.id);

        // CRITICAL FIX: Dispatch Redux action to set currentEstablishment
        // This ensures the newly created establishment becomes the active one in Redux state
        dispatch(addCompanyEstablishment(result));
        console.log('🔄 Redux: Set currentEstablishment to newly created establishment');

        // Set sessionStorage flags to prevent Authenticated.jsx from redirecting during cache update
        sessionStorage.setItem('creating_establishment', 'true');
        sessionStorage.setItem('just_created_establishment_id', result.id.toString());

        // Success toast
        toast({
          title: 'Establishment Created Successfully',
          description: `"${data.name}" has been created and is ready for use.`,
          status: 'success',
          duration: 5000,
          isClosable: true
        });

        // Navigate immediately - RTK Query optimistic update + sessionStorage flags prevent race conditions
        const targetUrl = `/admin/dashboard/establishment/${result.id}`;
        console.log('🔄 Navigating to:', targetUrl);
        navigate(targetUrl);
      }
    } catch (error) {
      console.error(`Failed to ${isEdit ? 'update' : 'create'} establishment:`, error);

      // Parse DRF field-level validation errors into readable message
      let description = 'Please check all required fields and try again.';
      if (error?.data && typeof error.data === 'object') {
        if (error.data.detail) {
          description = error.data.detail;
        } else if (error.data.message) {
          description = error.data.message;
        } else {
          // DRF returns {field: [errors]} format
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
        title: `Error ${isEdit ? 'Updating' : 'Creating'} Establishment`,
        description,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
    }
  };

  const handleCancel = () => {
    if (isEdit) {
      navigate(`/admin/dashboard/establishment/${establishmentId}`);
    } else {
      navigate('/admin/dashboard');
    }
  };

  // Transform establishment data for the form
  const getInitialData = () => {
    if (!isEdit || !establishmentData) return undefined;

    return {
      name: establishmentData.name || '',
      email: establishmentData.email || '',
      phone: establishmentData.phone || '',
      address: establishmentData.address || '',
      city: establishmentData.city || '',
      zone: establishmentData.zone || '',
      state: establishmentData.state || '',
      country: establishmentData.country || '',
      zipCode: establishmentData.zip_code || '',
      description: establishmentData.description || '',
      about: establishmentData.about || '',
      main_activities: establishmentData.main_activities || '',
      location_highlights: establishmentData.location_highlights || '',
      custom_message: establishmentData.custom_message || '',
      establishmentType: establishmentData.establishment_type || establishmentData.type || '',
      farmingMethod: establishmentData.farming_method || '',
      totalAcreage: establishmentData.total_acreage || 0,
      employeeCount: establishmentData.employee_count || 0,
      yearEstablished: establishmentData.year_established || undefined,
      isActive: establishmentData.is_active !== false,
      type: establishmentData.type || '',
      latitude: establishmentData.latitude || undefined,
      longitude: establishmentData.longitude || undefined,
      cropsGrown: (() => {
        if (Array.isArray(establishmentData.crops_grown)) {
          return establishmentData.crops_grown;
        }
        if (typeof establishmentData.crops_grown === 'string') {
          try {
            return JSON.parse(establishmentData.crops_grown);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      certifications: establishmentData.certifications
        ? typeof establishmentData.certifications === 'string'
          ? establishmentData.certifications
              .split(',')
              .map((cert: string) => cert.trim())
              .filter(Boolean)
          : Array.isArray(establishmentData.certifications)
          ? establishmentData.certifications
          : []
        : [],
      // sustainabilityPractices now includes merged conservation_practices for backward compatibility
      sustainabilityPractices: (() => {
        let practices: string[] = [];

        // Get sustainability practices
        if (Array.isArray(establishmentData.sustainability_practices)) {
          practices = [...establishmentData.sustainability_practices];
        } else if (typeof establishmentData.sustainability_practices === 'string') {
          try {
            practices = JSON.parse(establishmentData.sustainability_practices);
          } catch {
            practices = [];
          }
        }

        // Merge in old conservation_practices for backward compatibility
        let conservationPractices: string[] = [];
        if (Array.isArray(establishmentData.conservation_practices)) {
          conservationPractices = establishmentData.conservation_practices;
        } else if (typeof establishmentData.conservation_practices === 'string') {
          try {
            conservationPractices = JSON.parse(establishmentData.conservation_practices);
          } catch {
            conservationPractices = [];
          }
        }

        // Merge without duplicates
        const merged = [...new Set([...practices, ...conservationPractices])];
        return merged;
      })(),
      // Add missing operational fields for EDIT data loading
      climateZone: establishmentData.climate_zone || '',
      waterSources: (() => {
        if (Array.isArray(establishmentData.water_sources)) {
          return establishmentData.water_sources;
        }
        if (typeof establishmentData.water_sources === 'string') {
          try {
            return JSON.parse(establishmentData.water_sources);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      soilHealthPractices: (() => {
        if (Array.isArray(establishmentData.soil_types)) {
          return establishmentData.soil_types;
        }
        if (typeof establishmentData.soil_types === 'string') {
          try {
            return JSON.parse(establishmentData.soil_types);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      // conservationPractices merged into sustainabilityPractices - keep empty for form
      // Old conservation data is handled by merging into sustainabilityPractices above
      conservationPractices: [],
      irrigationMethods: (() => {
        if (Array.isArray(establishmentData.irrigation_methods)) {
          return establishmentData.irrigation_methods;
        }
        if (typeof establishmentData.irrigation_methods === 'string') {
          try {
            return JSON.parse(establishmentData.irrigation_methods);
          } catch {
            return [];
          }
        }
        return [];
      })(),
      contact_person: establishmentData.contact_person || '',
      contact_phone: establishmentData.contact_phone || '',
      contact_email: establishmentData.contact_email || '',
      // Images field for edit mode
      images: establishmentData.images || establishmentData.album?.images || []
    };
  };

  // Show loading state during data fetch for edit mode
  if (isEdit && isLoadingEstablishment) {
    return (
      <Box p={8} textAlign="center">
        <Text>Loading establishment data...</Text>
      </Box>
    );
  }

  return (
    <WriteAccessGuard>
      <StandardEstablishmentForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={getInitialData()}
        isLoading={isCreating || isUpdating}
        isEdit={isEdit}
        companyName={currentCompany?.name || ''}
      />
    </WriteAccessGuard>
  );
}

export default AddEstablishment;
