// Chakra imports
import {
  Box,
  Badge,
  Flex,
  SimpleGrid,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  Td,
  VStack,
  HStack,
  useToast
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { FaUsers, FaBuilding } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';

import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardPage,
  StandardSearchInput,
  StandardSectionTabs,
  StandardSpinner
} from 'components/Design/StandardComponents';
import MemberRow from './memberRow';
import CompanyInfoTab from './CompanyInfoTab';
import { useGetCompanyMembersQuery, useRotateCompanyCodeMutation } from 'store/api/companyApi';
import { useGetUserRolesQuery } from 'store/api/userApi';
import { useSendInvitationMutation } from 'store/api/invitationApi';
import { ROLE_FARM_MANAGER } from 'config';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setCompany } from 'store/features/companySlice';
import { apiErrorMessage } from 'utils/apiErrorMessage';

// Types
interface RoleOption {
  id: string;
  name: string;
}

export default function SettingsView() {
  const intl = useIntl();
  const [settingsTab, setSettingsTab] = useState<'team' | 'company'>('team');
  const toast = useToast();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const currentCompany = useSelector((state) => state.company.currentCompany);
  const establishments = useSelector((state) => state.company.currentCompany?.establishments);

  const { data: companyMembers } = useGetCompanyMembersQuery(
    {
      companyId: currentCompany?.id
    },
    {
      skip: currentCompany?.id === undefined
    }
  );

  const { data: userRoles } = useGetUserRolesQuery();
  const [sendInvitation, { isLoading: isSendingInvitation }] = useSendInvitationMutation();
  const [rotateCompanyCode, { isLoading: isRotatingCode }] = useRotateCompanyCodeMutation();
  const dispatch = useDispatch();

  // Filter members based on search term
  const filteredMembers =
    companyMembers?.filter(
      (member) =>
        member.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleInviteSubmit = async () => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!inviteEmail || !emailRegex.test(inviteEmail)) {
      toast({
        title: intl.formatMessage({ id: 'app.invalidEmail' }),
        description: intl.formatMessage({ id: 'app.enterValidEmail' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!selectedRole) {
      toast({
        title: intl.formatMessage({ id: 'app.roleRequired' }),
        description: intl.formatMessage({ id: 'app.selectRoleError' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      // MVP: All users get access to all company establishments
      const allEstablishmentIds = establishments ? establishments.map((est) => est.id) : [];

      await sendInvitation({
        email: inviteEmail,
        role: selectedRole || ROLE_FARM_MANAGER,
        establishments: allEstablishmentIds,
        invitee_name: inviteEmail.split('@')[0] // Use email prefix as default name
      }).unwrap();

      toast({
        title: intl.formatMessage({ id: 'app.invitationSent' }),
        description: intl.formatMessage({ id: 'app.invitationSentTo' }, { email: inviteEmail }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      // Reset form
      setInviteEmail('');
      setSelectedRole(null);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: intl.formatMessage({ id: 'app.errorSendingInvitation' }),
        description:
          apiErrorMessage(error) ??
          intl.formatMessage({ id: 'app.errorSendingInvitationDescription' }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  const handleDiscardChanges = () => {
    setInviteEmail('');
    setSelectedRole(null);
  };

  // A new code stops a forwarded or leaked one from working. People who already joined keep
  // their access until they are removed from the team.
  const handleRotateCode = async () => {
    if (!currentCompany?.id) return;
    try {
      const { invitation_code } = await rotateCompanyCode({
        companyId: currentCompany.id
      }).unwrap();
      dispatch(setCompany({ ...currentCompany, invitation_code }));
      setCodeCopied(false);
      toast({
        title: intl.formatMessage({ id: 'app.newCompanyCodeReady' }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'app.couldNotRotateCode' }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  // Copy company code to clipboard
  const handleCopyCode = async () => {
    if (!currentCompany?.invitation_code) return;

    try {
      await navigator.clipboard.writeText(currentCompany.invitation_code);
      setCodeCopied(true);
      toast({
        title: intl.formatMessage({ id: 'app.codeCopied' }),
        description: intl.formatMessage({ id: 'app.codeCopiedDescription' }),
        status: 'success',
        duration: 2000,
        isClosable: true
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.errorCopying' }),
        description: intl.formatMessage({ id: 'app.couldNotCopyCode' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const roleNameMap: Record<string, string> = {
    'Company Admin': intl.formatMessage({ id: 'app.administrator' }),
    'Farm Manager': intl.formatMessage({ id: 'app.farmManager' }),
    Viewer: intl.formatMessage({ id: 'app.viewerRole' })
  };

  const roleOptions: RoleOption[] =
    userRoles?.map((role) => ({
      id: role.id,
      name: roleNameMap[role.name] || role.name
    })) || [];

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'app.companySettings' }) || 'Company Settings'}
      description={
        intl.formatMessage({ id: 'app.companySettingsDescription' }) ||
        'This screen is only visible to company admins'
      }>
      <VStack w="100%" align="stretch" spacing={6} className="main-content-area">
        {/* Left-aligned underline tabs, the app's tab style (2026-11-07). A centred segmented
            control here was the only centred tab row in the app. */}
        <StandardSectionTabs
          ariaLabel={intl.formatMessage({ id: 'app.companySettings' })}
          activeIndex={settingsTab === 'team' ? 0 : 1}
          onChange={(index) => setSettingsTab(index === 0 ? 'team' : 'company')}
          tabs={[
            {
              key: 'team',
              label: intl.formatMessage({ id: 'app.team' }),
              icon: FaUsers,
              status: 'none'
            },
            {
              key: 'company',
              label: intl.formatMessage({ id: 'app.companyInformation' }),
              icon: FaBuilding,
              status: 'none'
            }
          ]}>
          {/* The panels live INSIDE the tab widget (review of #316): as siblings below it, a
              screen reader that activated "Team" landed in an empty panel, and the members
              table was tied to no tab at all. */}
          <Box pt={4}>
            {/* Team Tab Panel */}
            {settingsTab === 'team' && (
              <VStack spacing={10} w="100%" pb={12}>
                {/* Members Overview Section - Most Important First */}
                <Box w="100%">
                  <StandardCard
                    title={
                      intl.formatMessage({ id: 'app.membersInThisCompany' }) ||
                      'Miembros de la Compañía'
                    }
                    subtitle={intl.formatMessage({ id: 'app.manageMembersSubtitle' })}
                    variant="elevated">
                    <Box py={4}>
                      <VStack spacing={8} align="stretch">
                        {/* Search Bar */}
                        <Flex
                          justify="space-between"
                          align="center"
                          w="100%"
                          flexWrap="wrap"
                          gap={4}>
                          <StandardSearchInput
                            placeholder={intl.formatMessage({ id: 'settings.searchMembers' })}
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setSearchTerm(e.target.value)
                            }
                            maxW={{ base: 'full', smd: '360px' }}
                          />
                          <Badge
                            px={4}
                            py={2}
                            borderRadius="full"
                            bg="green.100"
                            color="green.800"
                            fontSize="sm"
                            fontWeight="medium">
                            {filteredMembers.length}{' '}
                            {filteredMembers.length !== 1
                              ? intl.formatMessage({ id: 'app.members' })
                              : intl.formatMessage({ id: 'app.member' })}
                          </Badge>
                        </Flex>

                        {/* Members Table - Responsive with horizontal scroll on mobile */}
                        <Box
                          overflowX="auto"
                          overflowY="auto"
                          w="100%"
                          borderRadius={{ base: 'lg', md: '2xl' }}
                          border="1px solid"
                          borderColor="gray.100"
                          bg="white"
                          boxShadow="sm">
                          <Table variant="simple" size={{ base: 'sm', md: 'lg' }}>
                            <Thead
                              bg="gray.50"
                              borderBottom="2px solid"
                              borderColor="gray.100"
                              position="sticky"
                              top={0}
                              zIndex={1}>
                              <Tr>
                                <Th
                                  color="gray.700"
                                  fontWeight="bold"
                                  fontSize="xs"
                                  textTransform="uppercase"
                                  letterSpacing="wider"
                                  py={{ base: 3, md: 5 }}
                                  px={{ base: 3, md: 6 }}
                                  whiteSpace="nowrap">
                                  {intl.formatMessage({ id: 'app.name' }) || 'NOMBRE'}
                                </Th>
                                <Th
                                  color="gray.700"
                                  fontWeight="bold"
                                  fontSize="xs"
                                  textTransform="uppercase"
                                  letterSpacing="wider"
                                  py={{ base: 3, md: 5 }}
                                  px={{ base: 3, md: 6 }}
                                  whiteSpace="nowrap">
                                  {intl.formatMessage({ id: 'app.currentWorkingEstablishments' }) ||
                                    'ESTABLECIMIENTOS EN LOS QUE TRABAJA'}
                                </Th>
                                <Th
                                  color="gray.700"
                                  fontWeight="bold"
                                  fontSize="xs"
                                  textTransform="uppercase"
                                  letterSpacing="wider"
                                  py={{ base: 3, md: 5 }}
                                  px={{ base: 3, md: 6 }}
                                  whiteSpace="nowrap">
                                  {intl.formatMessage({ id: 'app.role' }) || 'ROL'}
                                </Th>
                                <Th
                                  color="gray.700"
                                  fontWeight="bold"
                                  fontSize="xs"
                                  textTransform="uppercase"
                                  letterSpacing="wider"
                                  py={{ base: 3, md: 5 }}
                                  px={{ base: 3, md: 6 }}
                                  whiteSpace="nowrap">
                                  {intl.formatMessage({ id: 'app.actions' }) || 'ACCIONES'}
                                </Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {filteredMembers.length > 0 ? (
                                filteredMembers.map((member: any, index: number) => (
                                  <MemberRow
                                    key={index}
                                    name={member.user}
                                    establishments={member.establishments_in_charge.map(
                                      (est: any) => est.name
                                    )}
                                    role={member.role}
                                  />
                                ))
                              ) : (
                                <Tr>
                                  <Td colSpan={4} textAlign="center" py={16}>
                                    <VStack spacing={4}>
                                      <Box
                                        w="60px"
                                        h="60px"
                                        borderRadius="full"
                                        bg="gray.100"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        mb={2}>
                                        <Text fontSize="2xl">👥</Text>
                                      </Box>
                                      <Text color="gray.600" fontSize="lg" fontWeight="semibold">
                                        {searchTerm
                                          ? intl.formatMessage({ id: 'app.noMembersFound' })
                                          : intl.formatMessage({ id: 'app.noMembersYet' })}
                                      </Text>
                                      <Text
                                        color="gray.500"
                                        fontSize="md"
                                        maxW="300px"
                                        textAlign="center">
                                        {searchTerm
                                          ? intl.formatMessage({ id: 'app.tryOtherSearch' })
                                          : intl.formatMessage({ id: 'app.inviteFirstMember' })}
                                      </Text>
                                    </VStack>
                                  </Td>
                                </Tr>
                              )}
                            </Tbody>
                          </Table>
                        </Box>
                      </VStack>
                    </Box>
                  </StandardCard>
                </Box>

                {/* Invite + Invitation Code: two halves of "add a person", so they sit side by
                side once there is room rather than costing a screen of scroll each. */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="100%" alignItems="start">
                  <Box w="100%">
                    <StandardCard
                      title={
                        intl.formatMessage({ id: 'app.inviteNewMembers' }) ||
                        'Invitar nuevos miembros'
                      }
                      variant="elevated">
                      <Box py={4}>
                        <VStack spacing={10} align="stretch">
                          <VStack spacing={6} w="100%">
                            <VStack spacing={6} w="100%">
                              <StandardField
                                label={intl.formatMessage({ id: 'app.newMemberEmail' })}
                                required>
                                <StandardInput
                                  placeholder={intl.formatMessage({
                                    id: 'settings.inviteEmailPlaceholder'
                                  })}
                                  value={inviteEmail}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setInviteEmail(e.target.value)
                                  }
                                  type="email"
                                />
                              </StandardField>

                              <StandardField
                                label={intl.formatMessage({ id: 'app.roleAndPermissions' })}
                                required>
                                <StandardSelect
                                  placeholder={intl.formatMessage({ id: 'app.selectARole' })}
                                  value={selectedRole || ''}
                                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    setSelectedRole(e.target.value || null);
                                  }}>
                                  {roleOptions.map((role: RoleOption) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))}
                                </StandardSelect>
                              </StandardField>
                            </VStack>

                            {/* Standard size, and Discard only once there is something to discard
                            (2026-11-07): two large buttons sat under an empty form. */}
                            <HStack spacing={2} w="100%" justify="flex-end">
                              {(inviteEmail || selectedRole) && (
                                <StandardButton variant="ghost" onClick={handleDiscardChanges}>
                                  {intl.formatMessage({ id: 'app.discardChanges' })}
                                </StandardButton>
                              )}
                              <StandardButton
                                variant="primary"
                                onClick={handleInviteSubmit}
                                isLoading={isSendingInvitation}
                                loadingText={intl.formatMessage({ id: 'app.sending' })}>
                                {intl.formatMessage({ id: 'app.sendInvite' }) ||
                                  'Enviar invitación'}
                              </StandardButton>
                            </HStack>
                          </VStack>
                        </VStack>
                      </Box>
                    </StandardCard>
                  </Box>

                  {/* Company Code Section - Secondary Tool */}
                  <Box w="100%">
                    <StandardCard
                      title={intl.formatMessage({ id: 'app.invitationCode' })}
                      subtitle={intl.formatMessage({ id: 'app.shareCodeSubtitle' })}
                      variant="elevated">
                      <Box py={3}>
                        <VStack spacing={4} align="stretch">
                          {/* One row: the code, Copy, and Generate new code (2026-11-07). Was a
                          green box with a round icon, the company name the page already shows,
                          a solid green code pill, a lone round copy icon, and a second green box
                          for the instructions. */}
                          {!currentCompany ? (
                            <StandardSpinner label={intl.formatMessage({ id: 'app.loading' })} />
                          ) : currentCompany.invitation_code ? (
                            <HStack spacing={2} flexWrap="wrap">
                              <Text
                                fontFamily="mono"
                                fontSize="xl"
                                fontWeight="semibold"
                                letterSpacing="wider"
                                color="gray.800"
                                bg="gray.50"
                                borderWidth="1px"
                                borderColor="gray.200"
                                borderRadius="md"
                                px={4}
                                py={1.5}>
                                {currentCompany.invitation_code}
                              </Text>
                              <StandardButton
                                size="sm"
                                variant="outline"
                                leftIcon={codeCopied ? <CheckIcon /> : <CopyIcon />}
                                aria-label={intl.formatMessage({ id: 'app.copyCompanyCode' })}
                                onClick={handleCopyCode}>
                                {codeCopied
                                  ? intl.formatMessage({ id: 'app.copied' })
                                  : intl.formatMessage({ id: 'app.copyCode' })}
                              </StandardButton>
                              <StandardButton
                                size="sm"
                                variant="ghost"
                                onClick={handleRotateCode}
                                isLoading={isRotatingCode}>
                                {intl.formatMessage({ id: 'app.generateNewCompanyCode' })}
                              </StandardButton>
                            </HStack>
                          ) : (
                            <Text fontSize="sm" color="gray.600">
                              {intl.formatMessage({ id: 'app.companyCodeAdminOnly' })}
                            </Text>
                          )}

                          <Box>
                            <Text fontSize="xs" fontWeight="semibold" color="gray.700" mb={1}>
                              {intl.formatMessage({ id: 'app.howToUseInvitationCode' })}
                            </Text>
                            <Box as="ol" pl={5} fontSize="xs" color="gray.600" lineHeight="1.6">
                              <li>{intl.formatMessage({ id: 'app.shareCodeWithMembers' })}</li>
                              <li>{intl.formatMessage({ id: 'app.chooseJoinExistingCompany' })}</li>
                              <li>{intl.formatMessage({ id: 'app.enterCodeToJoinAsViewer' })}</li>
                            </Box>
                          </Box>
                        </VStack>
                      </Box>
                    </StandardCard>
                  </Box>
                </SimpleGrid>
              </VStack>
            )}

            {/* Company Information Tab Panel */}
            {settingsTab === 'company' && <CompanyInfoTab />}
          </Box>
        </StandardSectionTabs>
      </VStack>
    </StandardPage>
  );
}
