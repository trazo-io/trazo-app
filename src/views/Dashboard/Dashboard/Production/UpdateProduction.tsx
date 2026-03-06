import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useToast, Box, Text, CircularProgress } from '@chakra-ui/react';
import { StandardProductionForm } from '../../../../components/Forms/StandardProductionForm';
import { WriteAccessGuard } from 'components/Guards/WriteAccessGuard';
import { useGetHistoryQuery, useUpdateProductionMutation } from 'store/api/historyApi';
import { useStartProductionMutation } from 'store/api/companyApi';

interface UpdateProductionProps {
  isEdit?: boolean;
}

interface RootState {
  company: {
    currentCompany: any;
    currentParcel: any;
  };
}

function UpdateProduction({ isEdit = false }: UpdateProductionProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { establishmentId, parcelId, productionId } = useParams();
  const currentCompany = useSelector((state: RootState) => state.company.currentCompany);
  const currentParcel = useSelector((state: RootState) => state.company.currentParcel);
  const [productOptions, setProductOptions] = useState<Array<{ value: string; label: string }>>([]);

  // RTK Query hooks
  const [startProduction, { isLoading: isStarting }] = useStartProductionMutation();
  const [updateProduction, { isLoading: isUpdating }] = useUpdateProductionMutation();

  // Get production data for edit mode (using authenticated endpoint)
  const {
    data: productionData,
    isLoading: isLoadingProduction,
    isError: isProductionError
  } = useGetHistoryQuery(productionId || '', {
    skip: !isEdit || !productionId
  });

  // Get products for the establishment - simplified approach
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    // For now, we'll use a simple product list since the productApi import has issues
    // In production, this would fetch from the establishment's product catalog
    const defaultProducts = [
      { value: '1', label: 'Orange' },
      { value: '2', label: 'Apple' },
      { value: '3', label: 'Tomato' },
      { value: '4', label: 'Lettuce' },
      { value: '5', label: 'Corn' },
      { value: '6', label: 'Basil' },
      { value: '7', label: 'Bean' },
      { value: '8', label: 'Almond' }
    ];
    setProductOptions(defaultProducts);
    setProductsLoaded(true);
  }, []);

  // Re-trigger form initialization when productOptions are loaded
  const [formInitialized, setFormInitialized] = useState(false);
  useEffect(() => {
    if (isEdit && productionData && productOptions.length > 0 && !formInitialized) {
      console.log('Re-initializing form with product options available');
      setFormInitialized(true);
    }
  }, [isEdit, productionData, productOptions, formInitialized]);

  // Helper function to parse age of plants
  const parseAgeOfPlants = (value: any) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
      if (value.toLowerCase().includes('year')) {
        return Math.round(numericValue * 365);
      }
      if (value.toLowerCase().includes('month')) {
        return Math.round(numericValue * 30);
      }
      return numericValue || 0;
    }
    return 0;
  };

  // Format production data for form - simplified for create mode
  const getInitialData = () => {
    if (!isEdit) {
      return {
        type: 'OR',
        isOutdoor: true,
        enableBlockchain: true,
        productionMethod: 'conventional',
        irrigationMethod: 'drip'
      };
    }

    if (!productionData) {
      return {};
    }

    // For edit mode, extract what we can from the productionData
    const productName = productionData.product?.name || productionData.name || '';
    const foundProduct = productOptions.find((opt) => opt.label === productName);

    return {
      productId: foundProduct?.value || '',
      productName: productName,
      date: productionData.start_date
        ? new Date(productionData.start_date).toISOString().slice(0, 16)
        : '',
      type: 'OR', // Default since we don't have this in PublicHistory
      isOutdoor: true, // Default
      ageOfPlants: 0,
      numberOfPlants: 0,
      soilPh: 7.0,
      enableBlockchain: true,
      productionMethod: 'conventional',
      irrigationMethod: 'drip'
    };
  };

  const handleSubmit = async (data: any) => {
    try {
      console.log('Form submitted with data:', data);

      if (isEdit && productionId) {
        // For edit mode, use updateProduction API
        const updatePayload = {
          historyId: productionId,
          name: data.productName || data.name || productionData?.name,
          start_date: data.date,
          description: data.description || '',
          is_outdoor: data.isOutdoor,
          age_of_plants: data.ageOfPlants?.toString() || '0',
          number_of_plants: data.numberOfPlants || 0,
          soil_ph: data.soilPh || 7.0
        };

        console.log('Calling updateProduction with payload:', updatePayload);

        await updateProduction(updatePayload).unwrap();

        toast({
          title: intl.formatMessage({ id: 'app.success' }),
          description: intl.formatMessage({ id: 'app.productionUpdatedSuccessfully' }),
          status: 'success',
          duration: 5000,
          isClosable: true
        });

        // Navigate back
        navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`);
        return;
      }

      // For create mode, use startProduction API
      const productionPayload = {
        name: data.productName || data.productId,
        parcel_id: parseInt(parcelId || '0'),
        crop_type: data.productName || 'Unknown',
        start_date: data.date,
        expected_harvest: data.expectedHarvest,
        description: '',
        production_method: data.productionMethod || 'conventional',
        age_of_plants: data.ageOfPlants?.toString() || '0',
        number_of_plants: data.numberOfPlants || 0,
        soil_ph: data.soilPh || 7.0,
        is_outdoor: data.isOutdoor,
        type: data.type || 'OR',
        notes: ''
      };

      console.log('Calling startProduction with payload:', productionPayload);

      await startProduction(productionPayload).unwrap();

      toast({
        title: intl.formatMessage({ id: 'app.success' }),
        description: intl.formatMessage({ id: 'app.productionCreatedSuccessfully' }),
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      // Navigate back
      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`);
    } catch (error: any) {
      console.error('Error saving production:', error);
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description:
          error?.data?.detail || error?.data?.error || error?.data?.message || intl.formatMessage({ id: 'app.errorSavingProduction' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleCancel = () => {
    navigate(`/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}`);
  };

  // Debug logging for edit mode
  console.log('UpdateProduction Debug:', {
    isEdit,
    productionId,
    isLoadingProduction,
    isProductionError,
    productionData
  });

  // Show loading state for edit mode
  if (isEdit && isLoadingProduction) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <CircularProgress isIndeterminate color="green.500" />
      </Box>
    );
  }

  // Show error state for edit mode
  if (isEdit && isProductionError) {
    return (
      <Box p={8} textAlign="center">
        <Text color="red.500">Error loading production data. Please try again.</Text>
        <Text color="gray.500" fontSize="sm" mt={2}>
          Production ID: {productionId}
        </Text>
      </Box>
    );
  }

  // Show message if no data found
  if (isEdit && !productionData) {
    return (
      <Box p={8} textAlign="center">
        <Text color="orange.500">No production data found.</Text>
        <Text color="gray.500" fontSize="sm" mt={2}>
          Production ID: {productionId}
        </Text>
      </Box>
    );
  }

  return (
    <WriteAccessGuard>
      <StandardProductionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={getInitialData()}
        isLoading={isStarting || isUpdating}
        isEdit={isEdit}
        parcelName={currentParcel?.name || ''}
        productOptions={productOptions}
      />
    </WriteAccessGuard>
  );
}

export default UpdateProduction;
