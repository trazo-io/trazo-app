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
  useToast,
  Icon,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { FaUsers, FaShare, FaBuilding } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';

import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardPage,
  StandardSearchInput,
  StandardSegmentedControl
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
          error?.data?.error || intl.formatMessage({ id: 'app.errorSendingInvitationDescription' }),
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
        {/* Tab Navigation */}
        <StandardSegmentedControl
          ariaLabel={intl.formatMessage({ id: 'app.companySettings' })}
          value={settingsTab}
          onChange={setSettingsTab}
          stretchOnMobile={false}
          options={[
            { key: 'team', label: intl.formatMessage({ id: 'app.team' }), icon: FaUsers },
            {
              key: 'company',
              label: intl.formatMessage({ id: 'app.companyInformation' }),
              icon: FaBuilding
            }
          ]}
        />

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
                    <Flex justify="space-between" align="center" w="100%" flexWrap="wrap" gap={4}>
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
                    intl.formatMessage({ id: 'app.inviteNewMembers' }) || 'Invitar nuevos miembros'
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
                              placeholder="ejemplo@empresa.com"
                              value={inviteEmail}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setInviteEmail(e.target.value)
                              }
                              type="email"
                              size="lg"
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

                        <HStack spacing={4} w="100%" justify="flex-end">
                          <StandardButton
                            variant="outline"
                            onClick={handleDiscardChanges}
                            size="lg">
                            {intl.formatMessage({ id: 'app.discardChanges' }) ||
                              'Descartar cambios'}
                          </StandardButton>
                          <StandardButton
                            variant="primary"
                            onClick={handleInviteSubmit}
                            size="lg"
                            isLoading={isSendingInvitation}
                            loadingText={intl.formatMessage({ id: 'app.sending' })}>
                            {intl.formatMessage({ id: 'app.sendInvite' }) || 'Enviar invitación'}
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
                      {/* Company Info Display */}
                      <Flex
                        direction={{ base: 'column', md: 'row' }}
                        gap={4}
                        align={{ base: 'stretch', md: 'center' }}
                        p={4}
                        bg="green.50"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="green.200">
                        {/* Company Icon */}
                        <Flex
                          align="center"
                          justify="center"
                          w={{ base: 'full', md: 'auto' }}
                          mb={{ base: 4, md: 0 }}>
                          <Box
                            bg="green.700"
                            p={4}
                            borderRadius="full"
                            display="flex"
                            alignItems="center"
                            justifyContent="center">
                            <Icon as={FaUsers} color="white" boxSize={6} />
                          </Box>
                        </Flex>

                        {/* Company Details */}
                        <VStack align={{ base: 'center', md: 'start' }} spacing={2} flex={1}>
                          <Text fontSize="md" fontWeight="semibold" color="gray.700">
                            {currentCompany?.name || intl.formatMessage({ id: 'app.yourCompany' })}
                          </Text>
                          <Text
                            fontSize="xs"
                            color="gray.500"
                            textAlign={{ base: 'center', md: 'left' }}
                            lineHeight="1.4">
                            {intl.formatMessage({ id: 'app.membersCanJoinWithCode' })}
                          </Text>
                        </VStack>

                        {/* Code Display and Copy. The API sends the code to company admins only. */}
                        {/* Three states: not loaded yet, admin (code sent), anyone else (null). */}
                        {!currentCompany ? (
                          <Text fontSize="xs" color="gray.500">
                            {intl.formatMessage({ id: 'app.loading' })}
                          </Text>
                        ) : currentCompany.invitation_code ? (
                          <VStack spacing={3} align="center" minW={{ base: 'full', md: '200px' }}>
                            {/* Code Badge */}
                            <Badge
                              colorScheme="green"
                              variant="solid"
                              fontSize="lg"
                              px={5}
                              py={2}
                              borderRadius="full"
                              fontFamily="mono"
                              letterSpacing="wide"
                              minW="120px"
                              textAlign="center">
                              {currentCompany.invitation_code}
                            </Badge>

                            {/* Copy Button */}
                            <Tooltip
                              label={
                                codeCopied
                                  ? intl.formatMessage({ id: 'app.copied' })
                                  : intl.formatMessage({ id: 'app.copyCode' })
                              }
                              placement="top"
                              closeOnClick={false}
                              fontSize="xs">
                              <IconButton
                                aria-label={intl.formatMessage({ id: 'app.copyCompanyCode' })}
                                icon={codeCopied ? <CheckIcon /> : <CopyIcon />}
                                colorScheme={codeCopied ? 'green' : 'green'}
                                variant={codeCopied ? 'solid' : 'outline'}
                                size="sm"
                                borderRadius="full"
                                onClick={handleCopyCode}
                                _hover={{
                                  transform: 'translateY(-1px)',
                                  boxShadow: 'sm'
                                }}
                                transition="all 0.2s ease"
                              />
                            </Tooltip>
                            <StandardButton
                              variant="ghost"
                              onClick={handleRotateCode}
                              isLoading={isRotatingCode}>
                              {intl.formatMessage({ id: 'app.generateNewCompanyCode' })}
                            </StandardButton>
                          </VStack>
                        ) : (
                          <Text fontSize="xs" color="gray.500" maxW={{ base: 'full', md: '200px' }}>
                            {intl.formatMessage({ id: 'app.companyCodeAdminOnly' })}
                          </Text>
                        )}
                      </Flex>

                      {/* Instructions */}
                      <Box
                        p={3}
                        bg="green.50"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="green.200">
                        <HStack spacing={2} align="start">
                          <Icon
                            as={FaShare}
                            color="green.600"
                            mt={0.5}
                            flexShrink={0}
                            boxSize={3}
                          />
                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" fontWeight="medium" color="green.800">
                              {intl.formatMessage({ id: 'app.howToUseInvitationCode' })}
                            </Text>
                            <VStack align="start" spacing={0.5} pl={1}>
                              <Text fontSize="xs" color="green.700" lineHeight="1.3">
                                • {intl.formatMessage({ id: 'app.shareCodeWithMembers' })}
                              </Text>
                              <Text fontSize="xs" color="green.700" lineHeight="1.3">
                                • {intl.formatMessage({ id: 'app.chooseJoinExistingCompany' })}
                              </Text>
                              <Text fontSize="xs" color="green.700" lineHeight="1.3">
                                • {intl.formatMessage({ id: 'app.enterCodeToJoinAsViewer' })}
                              </Text>
                            </VStack>
                          </VStack>
                        </HStack>
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
      </VStack>
    </StandardPage>
  );
}
