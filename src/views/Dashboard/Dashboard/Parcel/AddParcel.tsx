import React from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { StandardParcelForm } from '../../../../components/Forms/StandardParcelForm';
import {
  useCreateParcelMutation,
  useUpdateParcelMutation,
  useGetParcelQuery
} from 'store/api/productApi';
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
    };
  };
}

function AddParcel({ isEdit = false }: AddParcelProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { establishmentId, parcelId } = useParams();
  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);
  const currentEstablishment = useSelector(
    (state: RootState) => state.company.currentEstablishment
  );

  const [createParcel, { isLoading: isCreating }] = useCreateParcelMutation();
  const [updateParcel, { isLoading: isUpdating }] = useUpdateParcelMutation();

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

  // Helper function to get initial data for edit mode
  const getInitialData = () => {
    if (!isEdit || !parcelData) return {};

    console.log('📊 Loading parcel data for edit:', parcelData);
    console.log('📊 Agricultural details:', parcelData.agricultural_details);
    console.log('📊 Polygon data:', parcelData.polygon);
    
    // Extract agricultural details from the JSON field
    const agriculturalDetails = parcelData.agricultural_details || {};
    
    return {
      name: parcelData.name || '',
      area: parcelData.area || 0,
      description: parcelData.description || '',
      contact_phone: parcelData.contact_phone || '',
      address: parcelData.address || '',
      certified: parcelData.certified || false,
      crop_type: parcelData.crop_type || '',
      soil_type: parcelData.soil_type || '',
      unique_code: parcelData.unique_code || '',
      certification_type: parcelData.certification_type || '',
      contact_person: parcelData.contact_person || '',
      contact_email: parcelData.contact_email || '',
      polygon: parcelData.polygon || [],
      map_metadata: parcelData.map_metadata || {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 13
      },
      
      // ✅ Agricultural Details - Extract from agricultural_details JSON field
      // Soil Health Management
      soil_ph: agriculturalDetails.soil_ph || undefined,
      soil_organic_matter: agriculturalDetails.soil_organic_matter || undefined,
      soil_nitrogen: agriculturalDetails.soil_nitrogen || undefined,
      soil_phosphorus: agriculturalDetails.soil_phosphorus || undefined,
      soil_potassium: agriculturalDetails.soil_potassium || undefined,
      soil_compaction_level: agriculturalDetails.soil_compaction_level || '',
      erosion_risk: agriculturalDetails.erosion_risk || '',
      last_soil_test_date: agriculturalDetails.last_soil_test_date || '',
      soil_improvement_notes: agriculturalDetails.soil_improvement_notes || '',
      
      // Water Management
      water_source_type: agriculturalDetails.water_source_type || '',
      water_rights_docs: agriculturalDetails.water_rights_docs || '',
      water_allocation_acre_feet: agriculturalDetails.water_allocation_acre_feet || undefined,
      water_quality_ph: agriculturalDetails.water_quality_ph || undefined,
      water_quality_tds: agriculturalDetails.water_quality_tds || undefined,
      irrigation_efficiency: agriculturalDetails.irrigation_efficiency || undefined,
      drainage_characteristics: agriculturalDetails.drainage_characteristics || '',
      seasonal_water_availability: agriculturalDetails.seasonal_water_availability || '',
      water_conservation_practices: agriculturalDetails.water_conservation_practices || '',
      
      // Conservation Practices (if stored)
      cover_crop_management: agriculturalDetails.cover_crop_management || '',
      crop_rotation_pattern: agriculturalDetails.crop_rotation_pattern || '',
      buffer_strips_windbreaks: agriculturalDetails.buffer_strips_windbreaks || '',
      integrated_pest_management: agriculturalDetails.integrated_pest_management || '',
      organic_certification_status: agriculturalDetails.organic_certification_status || '',
      nrcs_practices: agriculturalDetails.nrcs_practices || '',
      carbon_sequestration_practices: agriculturalDetails.carbon_sequestration_practices || '',
      biodiversity_measures: agriculturalDetails.biodiversity_measures || '',
      
      // Environmental & Topographic Data (if stored)
      slope_percentage: agriculturalDetails.slope_percentage || undefined,
      topography_type: agriculturalDetails.topography_type || '',
      microclimate_conditions: agriculturalDetails.microclimate_conditions || '',
      frost_risk_zone: agriculturalDetails.frost_risk_zone || '',
      wildlife_habitat_areas: agriculturalDetails.wildlife_habitat_areas || '',
      riparian_zones: agriculturalDetails.riparian_zones || '',
      wetland_designation: agriculturalDetails.wetland_designation || '',
      historical_yield_data: agriculturalDetails.historical_yield_data || '',
      land_use_restrictions: agriculturalDetails.land_use_restrictions || '',
      
      // Images
      images: parcelData.images || [],
      uploaded_image_urls: parcelData.images || []
    };
  };

  const handleSubmit = async (data: any) => {
    try {
      console.log('🎯 Parent handleSubmit received data:', data);
      console.log('🎯 Data keys:', Object.keys(data));
      console.log('🎯 Individual field values:', {
        name: data.name,
        description: data.description,
        crop_type: data.crop_type,
        soil_type: data.soil_type,
        unique_code: data.unique_code,
        certification_type: data.certification_type,
        address: data.address,
        contact_person: data.contact_person,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone
      });

      // ✅ Collect agricultural details for carbon calculations
      const agriculturalDetails: any = {};
      
      console.log('🌱 Agricultural Data Debug:', {
        soil_ph: data.soil_ph,
        soil_organic_matter: data.soil_organic_matter,
        soil_nitrogen: data.soil_nitrogen,
        water_source_type: data.water_source_type,
        soil_compaction_level: data.soil_compaction_level,
        erosion_risk: data.erosion_risk
      });
      
      // Soil Analysis Data
      if (data.soil_ph) agriculturalDetails.soil_ph = data.soil_ph;
      if (data.soil_organic_matter) agriculturalDetails.soil_organic_matter = data.soil_organic_matter;
      if (data.soil_nitrogen) agriculturalDetails.soil_nitrogen = data.soil_nitrogen;
      if (data.soil_phosphorus) agriculturalDetails.soil_phosphorus = data.soil_phosphorus;
      if (data.soil_potassium) agriculturalDetails.soil_potassium = data.soil_potassium;
      if (data.soil_compaction_level) agriculturalDetails.soil_compaction_level = data.soil_compaction_level;
      if (data.erosion_risk) agriculturalDetails.erosion_risk = data.erosion_risk;
      if (data.last_soil_test_date) agriculturalDetails.last_soil_test_date = data.last_soil_test_date;
      if (data.soil_improvement_notes) agriculturalDetails.soil_improvement_notes = data.soil_improvement_notes;
      
      // Water Management Data
      if (data.water_source_type) agriculturalDetails.water_source_type = data.water_source_type;
      if (data.water_rights_docs) agriculturalDetails.water_rights_docs = data.water_rights_docs;
      if (data.water_allocation_acre_feet) agriculturalDetails.water_allocation_acre_feet = data.water_allocation_acre_feet;
      if (data.water_quality_ph) agriculturalDetails.water_quality_ph = data.water_quality_ph;
      if (data.water_quality_tds) agriculturalDetails.water_quality_tds = data.water_quality_tds;
      if (data.irrigation_efficiency) agriculturalDetails.irrigation_efficiency = data.irrigation_efficiency;
      if (data.drainage_characteristics) agriculturalDetails.drainage_characteristics = data.drainage_characteristics;
      if (data.seasonal_water_availability) agriculturalDetails.seasonal_water_availability = data.seasonal_water_availability;
      if (data.water_conservation_practices) agriculturalDetails.water_conservation_practices = data.water_conservation_practices;
      
      // Conservation Practices
      if (data.cover_crop_management) agriculturalDetails.cover_crop_management = data.cover_crop_management;
      if (data.crop_rotation_pattern) agriculturalDetails.crop_rotation_pattern = data.crop_rotation_pattern;
      if (data.buffer_strips_windbreaks) agriculturalDetails.buffer_strips_windbreaks = data.buffer_strips_windbreaks;
      if (data.integrated_pest_management) agriculturalDetails.integrated_pest_management = data.integrated_pest_management;
      if (data.organic_certification_status) agriculturalDetails.organic_certification_status = data.organic_certification_status;
      if (data.nrcs_practices) agriculturalDetails.nrcs_practices = data.nrcs_practices;
      if (data.carbon_sequestration_practices) agriculturalDetails.carbon_sequestration_practices = data.carbon_sequestration_practices;
      if (data.biodiversity_measures) agriculturalDetails.biodiversity_measures = data.biodiversity_measures;
      
      // Environmental & Topographic Data
      if (data.slope_percentage) agriculturalDetails.slope_percentage = data.slope_percentage;
      if (data.topography_type) agriculturalDetails.topography_type = data.topography_type;
      if (data.microclimate_conditions) agriculturalDetails.microclimate_conditions = data.microclimate_conditions;
      if (data.frost_risk_zone) agriculturalDetails.frost_risk_zone = data.frost_risk_zone;
      if (data.wildlife_habitat_areas) agriculturalDetails.wildlife_habitat_areas = data.wildlife_habitat_areas;
      if (data.riparian_zones) agriculturalDetails.riparian_zones = data.riparian_zones;
      if (data.wetland_designation) agriculturalDetails.wetland_designation = data.wetland_designation;
      if (data.historical_yield_data) agriculturalDetails.historical_yield_data = data.historical_yield_data;
      if (data.land_use_restrictions) agriculturalDetails.land_use_restrictions = data.land_use_restrictions;
      
      // Calculate carbon readiness and USDA compliance
      const hasAgriculturalData = Object.keys(agriculturalDetails).length > 0;
      const hasSoilData = !!(data.soil_ph || data.soil_organic_matter || data.soil_nitrogen);
      const hasConservationData = !!(data.cover_crop_management || data.crop_rotation_pattern || data.carbon_sequestration_practices);
      
      console.log('🧪 Agricultural Details Summary:', {
        agriculturalDetails,
        hasAgriculturalData,
        hasSoilData, 
        hasConservationData,
        agriculturalDetailKeys: Object.keys(agriculturalDetails)
      });
      
      // Map the form data to match backend field names
      const parcelData = {
        name: data.name,
        area: Number(data.area),
        description: data.description,
        contact_phone: data.contact_phone || '',
        address: data.address || '',
        certified: data.certified || false,
        crop_type: data.crop_type || '',
        soil_type: data.soil_type || '',
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
        
        // ✅ Add agricultural details for carbon tracking
        agricultural_details: agriculturalDetails,
        carbon_calculation_enabled: hasAgriculturalData,
        usda_compliance_eligible: hasSoilData && hasConservationData
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

        toast({
          title: 'Parcel Updated',
          description: 'The parcel has been successfully updated.',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
      } else {
        // Create new parcel
        await createParcel({
          companyId: currentCompany?.id,
          establishmentId,
          parcelData: finalData
        }).unwrap();

        toast({
          title: 'Parcel Created',
          description: 'The parcel has been successfully created.',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
      }

      navigate(`/admin/dashboard/establishment/${establishmentId}`);
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
      <StandardParcelForm
        onSubmit={() => {}}
        onCancel={handleCancel}
        isLoading={true}
        isEdit={true}
        establishmentName={currentEstablishment?.name || ''}
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
    <StandardParcelForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      initialData={getInitialData()}
      isLoading={isCreating || isUpdating}
      isEdit={isEdit}
      establishmentName={currentEstablishment?.name || ''}
    />
  );
}

export default AddParcel;
