// Chakra imports
import {
  Avatar,
  AvatarBadge,
  Box,
  FormLabel,
  Input,
  Text,
  Grid,
  VStack,
  HStack,
  Icon
} from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import { object, string } from 'zod';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaChevronRight } from 'react-icons/fa';

import {
  StandardPage,
  StandardCard,
  StandardField,
  StandardInput,
  StandardButton
} from 'components/Design/StandardComponents';
import { FiCamera } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { useSelector } from 'react-redux';
import { useUpdateUserMutation } from 'store/api/userApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
const formSchemaBasic = object({
  first_name: string().min(1, 'First name is required'),
  last_name: string().min(1, 'Last name is required'),
  email: string().email('Invalid email').min(1, 'Email is required'),
  phone: string()
});

function ProfileUser() {
  const intl = useIntl();
  const navigate = useNavigate();
  const image = useRef<HTMLDivElement>(null);
  const [picture, setPicture] = useState<string | null>(null);
  const [pictureHasChange, setPictureHasChange] = useState(false);
  const dispatch = useDispatch();

  const currentUser = useSelector((state: any) => state.userState.user);

  useEffect(() => {
    if (currentUser) {
      setPicture(currentUser.image || '');
    }
  }, [currentUser]);

  const basicMethods = useForm({
    resolver: zodResolver(formSchemaBasic)
  });

  const {
    handleSubmit,
    setValue,
    formState: { errors },
    register
  } = basicMethods;

  const [updateUser, { data, isSuccess, isLoading }] = useUpdateUserMutation();

  const onSubmitUseInfo = (data: any) => {
    if (currentUser) {
      updateUser({
        userId: currentUser.id,
        userData: {
          ...data,
          ...(pictureHasChange && droppedFiles.length > 0 && { image: droppedFiles[0] })
        }
      });
    }
  };

  const { acceptedFiles: droppedFiles, getRootProps, getInputProps } = useDropzone({
    // onDrop,
    accept: {
      'image/*': []
    }, // Accepted file types  
    maxFiles: 1 // Maximum number of files
    // maxSize: 1024 * 1024 * 5, // Maximum file size (5 MB)
  });

  useEffect(() => {
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      setPicture(URL.createObjectURL(file));
      setPictureHasChange(true);
    }
  }, [droppedFiles]);

  useEffect(() => {
    if (currentUser) {
      setValue('first_name', currentUser.first_name || '');
      setValue('last_name', currentUser.last_name || '');
      setValue('email', currentUser.email || '');
      setValue('phone', currentUser.phone || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (isSuccess && data) {
      navigate(`/admin/dashboard/`);
    }
  }, [isSuccess, data, dispatch, navigate]);

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'app.userProfile' })}
      description={intl.formatMessage({ id: 'app.modifyFormToEditProfile' })}
    >
      <StandardCard title={intl.formatMessage({ id: 'app.mainInfo' })} variant="elevated">
        <FormProvider {...basicMethods}>
          <form onSubmit={handleSubmit(onSubmitUseInfo)} style={{ width: '100%' }}>
            <VStack spacing={6} align="stretch">
              {/* Avatar Upload Section */}
              <Box textAlign="center">
                <Avatar
                  ref={image}
                  src={picture || undefined}
                  w="120px"
                  h="120px"
                  borderRadius="2xl"
                  boxShadow="lg"
                  mx="auto"
                  mb={4}
                >
                  <AvatarBadge
                    boxSize="2em"
                    bg="green.100"
                    border="2px solid white"
                    borderRadius="full"
                    {...getRootProps({ className: 'dropzone' })}
                  >
                    <FiCamera color="#2E7D32" size={20} />
                    <Input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      position="absolute"
                      opacity={0}
                      aria-hidden="true"
                      width="100%"
                      height="100%"
                      top={0}
                      left={0}
                      zIndex={2}
                      cursor={'pointer'}
                      {...getInputProps()}
                    />
                  </AvatarBadge>
                </Avatar>
                <Text fontSize="sm" color="gray.600" mt={2}>
                  Click to update profile picture
                </Text>
              </Box>

              {/* Personal Information */}
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                <StandardField
                  label={intl.formatMessage({ id: 'app.firstName' })}
                  required
                  error={errors.first_name?.message as string}
                >
                  <StandardInput
                    placeholder={intl.formatMessage({ id: 'app.firstName' })}
                    {...register('first_name')}
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'app.lastName' })}
                  required
                  error={errors.last_name?.message as string}
                >
                  <StandardInput
                    placeholder={intl.formatMessage({ id: 'app.lastName' })}
                    {...register('last_name')}
                  />
                </StandardField>
              </Grid>

              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                <StandardField
                  label={intl.formatMessage({ id: 'app.email' })}
                  required
                  error={errors.email?.message as string}
                >
                  <StandardInput
                    type="email"
                    placeholder={intl.formatMessage({ id: 'app.email' })}
                    {...register('email')}
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'app.phone' })}
                  error={errors.phone?.message as string}
                >
                  <StandardInput
                    type="tel"
                    placeholder={intl.formatMessage({ id: 'app.phone' })}
                    {...register('phone')}
                  />
                </StandardField>
              </Grid>

              {/* Action Buttons */}
              <HStack spacing={4} justify="flex-end" pt={4}>
                <StandardButton
                  variant="primary"
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Saving..."
                  size="lg"
                  px={8}
                >
                  {intl.formatMessage({ id: 'app.save' })}
                </StandardButton>
              </HStack>
            </VStack>
          </form>
        </FormProvider>
      </StandardCard>

      {/* Security Settings Section */}
      <Box mt={6}>
        <StandardCard title="Security Settings" variant="elevated">
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Manage your account security and authentication settings
            </Text>
            
            {/* Change Password Link */}
            <Box
              as="button"
              onClick={() => navigate('/admin/dashboard/settings/change-password')}
              w="100%"
              p={4}
              bg="gray.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
              _hover={{
                bg: 'gray.100',
                borderColor: 'gray.300',
                transform: 'translateY(-1px)',
                boxShadow: 'sm'
              }}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon as={FaLock} color="green.500" boxSize={5} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold" color="gray.700">
                      Change Password
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Update your password to keep your account secure
                    </Text>
                  </VStack>
                </HStack>
                <Icon as={FaChevronRight} color="gray.400" />
              </HStack>
            </Box>
          </VStack>
        </StandardCard>
      </Box>
    </StandardPage>
  );
}

export default ProfileUser;
