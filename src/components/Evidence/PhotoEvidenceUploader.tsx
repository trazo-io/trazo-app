import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
  Heading,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  Grid,
  GridItem,
  Icon,
  Spinner,
  Divider,
  SimpleGrid
} from '@chakra-ui/react';
import { AttachmentIcon, CheckCircleIcon, WarningIcon, ViewIcon } from '@chakra-ui/icons';
import {
  useUploadEvidencePhotoMutation,
  useGetEvidencePhotosQuery,
  useValidatePhotoEvidenceMutation
} from '../../store/api/carbonApi';

interface PhotoEvidenceUploaderProps {
  carbonEntryId: number;
  allowUpload?: boolean;
  showValidation?: boolean;
}

const PhotoEvidenceUploader: React.FC<PhotoEvidenceUploaderProps> = ({
  carbonEntryId,
  allowUpload = true,
  showValidation = true
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [uploadPhoto, { isLoading: isUploading }] = useUploadEvidencePhotoMutation();
  const [validateEvidence, { isLoading: isValidating }] = useValidatePhotoEvidenceMutation();
  const {
    data: evidenceData,
    isLoading: isLoadingPhotos,
    refetch
  } = useGetEvidencePhotosQuery(carbonEntryId);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file (JPEG, PNG, or WebP)',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 10MB',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    try {
      const result = await uploadPhoto({
        carbon_entry_id: carbonEntryId,
        photo: file,
        description: description.trim() || undefined,
        metadata: {
          file_size: file.size,
          file_type: file.type,
          file_name: file.name,
          upload_timestamp: new Date().toISOString()
        }
      }).unwrap();

      toast({
        title: 'Photo Uploaded Successfully',
        description: `Photo evidence uploaded with ${result.validation_status} status`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refetch();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error?.data?.error || 'Failed to upload photo evidence',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleValidateAll = async () => {
    try {
      const result = await validateEvidence({
        carbon_entry_id: carbonEntryId
      }).unwrap();

      toast({
        title: 'Validation Complete',
        description: result.is_valid
          ? 'All photo evidence passed validation'
          : 'Some validation issues were found',
        status: result.is_valid ? 'success' : 'warning',
        duration: 5000,
        isClosable: true
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Validation Failed',
        description: error?.data?.error || 'Failed to validate photo evidence',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <Badge colorScheme="green" variant="solid">
            Valid
          </Badge>
        );
      case 'pending':
        return (
          <Badge colorScheme="yellow" variant="outline">
            Pending
          </Badge>
        );
      case 'invalid':
        return (
          <Badge colorScheme="red" variant="subtle">
            Invalid
          </Badge>
        );
      default:
        return (
          <Badge colorScheme="gray" variant="outline">
            Unknown
          </Badge>
        );
    }
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircleIcon color="green.500" />;
      case 'invalid':
        return <WarningIcon color="red.500" />;
      default:
        return <ViewIcon color="gray.500" />;
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Upload Section */}
      {allowUpload && (
        <Card>
          <CardHeader>
            <Heading size="md" color="trazo.500">
              <Icon as={AttachmentIcon} mr={2} />
              Upload Photo Evidence
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this photo shows as evidence..."
                  rows={2}
                />
              </FormControl>

              <Box
                border="2px dashed"
                borderColor={dragActive ? 'trazo.500' : 'gray.300'}
                borderRadius="lg"
                p={8}
                textAlign="center"
                bg={dragActive ? 'trazo.50' : 'gray.50'}
                cursor="pointer"
                transition="all 0.2s"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <VStack spacing={2}>
                  <Icon as={AttachmentIcon} w={8} h={8} color="gray.400" />
                  <Text fontSize="lg" fontWeight="medium" color="gray.600">
                    {dragActive ? 'Drop photo here' : 'Click or drag photo to upload'}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Supports JPEG, PNG, WebP (max 10MB)
                  </Text>
                </VStack>

                {isUploading && (
                  <Box mt={4}>
                    <Progress isIndeterminate colorScheme="trazo" size="sm" />
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      Uploading and processing photo...
                    </Text>
                  </Box>
                )}
              </Box>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Evidence Gallery */}
      <Card>
        <CardHeader>
          <HStack justify="space-between" align="center">
            <Heading size="md" color="trazo.500">
              Photo Evidence Gallery
            </Heading>

            <HStack spacing={2}>
              {evidenceData && evidenceData.total_count > 0 && showValidation && (
                <Button
                  size="sm"
                  colorScheme="trazo"
                  variant="outline"
                  onClick={handleValidateAll}
                  isLoading={isValidating}
                  loadingText="Validating..."
                >
                  Validate All
                </Button>
              )}

              {evidenceData && (
                <Badge colorScheme="blue" variant="outline">
                  {evidenceData.total_count} photo{evidenceData.total_count !== 1 ? 's' : ''}
                </Badge>
              )}
            </HStack>
          </HStack>

          {evidenceData?.validation_summary && showValidation && (
            <Box mt={3}>
              <Alert
                status={evidenceData.validation_summary.overall_valid ? 'success' : 'warning'}
                size="sm"
              >
                <AlertIcon />
                <AlertTitle fontSize="sm">
                  {evidenceData.validation_summary.overall_valid
                    ? 'All Evidence Valid'
                    : 'Validation Issues Found'}
                </AlertTitle>
                {!evidenceData.validation_summary.overall_valid && (
                  <AlertDescription fontSize="sm">Some photos need attention</AlertDescription>
                )}
              </Alert>
            </Box>
          )}
        </CardHeader>

        <CardBody>
          {isLoadingPhotos && (
            <HStack justify="center" py={8}>
              <Spinner />
              <Text>Loading photo evidence...</Text>
            </HStack>
          )}

          {evidenceData && evidenceData.total_count === 0 && (
            <Box textAlign="center" py={8} color="gray.500">
              <Icon as={ViewIcon} w={12} h={12} mb={4} />
              <Text fontSize="lg" fontWeight="medium">
                No photo evidence yet
              </Text>
              <Text fontSize="sm">Upload photos to support your carbon claims</Text>
            </Box>
          )}

          {evidenceData && evidenceData.photos.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {evidenceData.photos.map((photo) => (
                <Card key={photo.id} size="sm">
                  <CardBody p={3}>
                    <VStack spacing={3} align="stretch">
                      <Box position="relative">
                        <Image
                          src={photo.photo_url}
                          alt={photo.description || 'Evidence photo'}
                          borderRadius="md"
                          maxH="200px"
                          w="100%"
                          objectFit="cover"
                        />

                        <Box position="absolute" top={2} right={2}>
                          {getValidationBadge(photo.validation_status)}
                        </Box>
                      </Box>

                      <VStack spacing={2} align="stretch">
                        <HStack justify="space-between" align="center">
                          <HStack>
                            {getValidationIcon(photo.validation_status)}
                            <Text fontSize="xs" color="gray.600">
                              {new Date(photo.upload_date).toLocaleDateString()}
                            </Text>
                          </HStack>
                        </HStack>

                        {photo.description && (
                          <Text fontSize="sm" color="gray.700" noOfLines={2}>
                            {photo.description}
                          </Text>
                        )}

                        {photo.metadata && (
                          <Text fontSize="xs" color="gray.500">
                            {photo.metadata.file_name} •{' '}
                            {Math.round(photo.metadata.file_size / 1024)}KB
                          </Text>
                        )}
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </CardBody>
      </Card>
    </VStack>
  );
};

export default PhotoEvidenceUploader;
