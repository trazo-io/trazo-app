import React from 'react';
// Chakra imports
import { Avatar, Box, Flex, Text, Grid, VStack, HStack, Icon } from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import { object, string } from 'zod';
import { useNavigate } from 'react-router-dom';

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
import ChangeEmailModal from './ChangeEmailModal';

function ProfileUser() {
  const intl = useIntl();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const formSchemaBasic = object({
    first_name: string().min(1, intl.formatMessage({ id: 'profile.firstNameRequired' })),
    last_name: string().min(1, intl.formatMessage({ id: 'profile.lastNameRequired' })),
    email: string()
      .email(intl.formatMessage({ id: 'profile.invalidEmail' }))
      .min(1, intl.formatMessage({ id: 'profile.emailRequired' })),
    phone: string()
  });
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

  const {
    acceptedFiles: droppedFiles,
    getRootProps,
    getInputProps
  } = useDropzone({
    // onDrop,
    accept: 'image/*', // Accepted file types for v11 syntax
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
      description={intl.formatMessage({ id: 'app.modifyFormToEditProfile' })}>
      <StandardCard title={intl.formatMessage({ id: 'app.mainInfo' })} variant="elevated" mb={0}>
        <FormProvider {...basicMethods}>
          <form onSubmit={handleSubmit(onSubmitUseInfo)} style={{ width: '100%' }}>
            <VStack spacing={6} align="stretch">
              {/* The photo as a row: a 64px avatar and a "Change photo" control beside it (was a
                  120px gray silhouette centred over the form, with a camera badge to aim for). */}
              <HStack spacing={4}>
                <Avatar ref={image} src={picture || undefined} size="lg" bg="gray.200" />
                <Box position="relative" {...getRootProps({ className: 'dropzone' })}>
                  <StandardButton
                    variant="outline"
                    size="sm"
                    leftIcon={<Icon as={FiCamera} />}
                    as="span"
                    cursor="pointer">
                    {intl.formatMessage({ id: 'profile.clickToUpdatePicture' })}
                  </StandardButton>
                  <StandardInput
                    {...(getInputProps() as React.ComponentProps<typeof StandardInput>)}
                    aria-label={intl.formatMessage({ id: 'profile.clickToUpdatePicture' })}
                  />
                </Box>
              </HStack>

              {/* Personal Information */}
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                <StandardField
                  label={intl.formatMessage({ id: 'app.firstName' })}
                  required
                  error={errors.first_name?.message as string}>
                  <StandardInput
                    placeholder={intl.formatMessage({ id: 'app.firstName' })}
                    {...register('first_name')}
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'app.lastName' })}
                  required
                  error={errors.last_name?.message as string}>
                  <StandardInput
                    placeholder={intl.formatMessage({ id: 'app.lastName' })}
                    {...register('last_name')}
                  />
                </StandardField>
              </Grid>

              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                {/* Read-only here (overall review 2026-11, OV-SEC-C03): the login email changes
                    with the password and a link to the new address, never with Save. */}
                <StandardField label={intl.formatMessage({ id: 'app.email' })} required>
                  <StandardInput type="email" isReadOnly {...register('email')} />
                  <StandardButton
                    variant="ghost"
                    size="sm"
                    mt={1}
                    px={0}
                    _hover={{ bg: 'transparent', textDecoration: 'underline' }}
                    onClick={() => setIsEmailModalOpen(true)}>
                    {intl.formatMessage({ id: 'account.email.title' })}
                  </StandardButton>
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'app.phone' })}
                  error={errors.phone?.message as string}>
                  <StandardInput
                    type="tel"
                    placeholder={intl.formatMessage({ id: 'app.phone' })}
                    {...register('phone')}
                  />
                </StandardField>
              </Grid>

              {/* Action Buttons */}
              <HStack spacing={4} justify="flex-end">
                <StandardButton
                  variant="primary"
                  type="submit"
                  isLoading={isLoading}
                  loadingText={intl.formatMessage({ id: 'profile.saving' })}>
                  {intl.formatMessage({ id: 'app.save' })}
                </StandardButton>
              </HStack>
            </VStack>
          </form>
        </FormProvider>
      </StandardCard>

      {/* The password as one row: what it is, and the button that changes it (was a gray
          bordered box with a green lock and a chevron, under a paragraph about "authentication
          settings" the account does not have). */}
      <Box mt={6}>
        <StandardCard
          title={intl.formatMessage({ id: 'profile.securitySettings' })}
          variant="elevated"
          mb={0}>
          <Flex justify="space-between" align="center" gap={4} wrap="wrap">
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'profile.changePasswordDescription' })}
            </Text>
            <StandardButton
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/dashboard/settings/change-password')}>
              {intl.formatMessage({ id: 'profile.changePassword' })}
            </StandardButton>
          </Flex>
        </StandardCard>
      </Box>
      <ChangeEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={currentUser?.email || ''}
      />
    </StandardPage>
  );
}

export default ProfileUser;
