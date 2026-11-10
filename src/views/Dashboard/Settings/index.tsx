// Chakra imports
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  useToast
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { FaUsers, FaBuilding } from 'react-icons/fa';
import React, { useEffect, useRef, useState } from 'react';

import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardPage,
  StandardSearchInput,
  StandardSectionTabs,
  StandardSpinner,
  StatusList
} from 'components/Design/StandardComponents';
import MemberRow, { ROLE_LABEL_KEYS } from './memberRow';
import CompanyInfoTab from './CompanyInfoTab';
import {
  useChangeCompanyMemberRoleMutation,
  useGetCompanyMembersQuery,
  useRemoveCompanyMemberMutation,
  useRotateCompanyCodeMutation
} from 'store/api/companyApi';
import { useGetUserRolesQuery } from 'store/api/userApi';
import { useSendInvitationMutation } from 'store/api/invitationApi';
import { ROLE_FARM_MANAGER } from 'config';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setCompany } from 'store/features/companySlice';
import { apiErrorMessage } from 'utils/apiErrorMessage';

// A team this size or smaller is read at a glance; past it the search box appears.
const SEARCH_FROM = 8;

// Types
interface RoleOption {
  id: string;
  name: string;
}

// One row of GET /companies/<id>/members/. `id` is the COMPANY; the row is `membership_id`.
interface CompanyMember {
  id: number;
  membership_id: number;
  user: string;
  role: string;
  role_code: string;
  is_you: boolean;
  is_setup_operator: boolean;
  can_manage: boolean;
  establishments_in_charge: { name: string }[];
}

// The refusals trazo-back users/team.py names, worded here in the reader's language. Any other
// error falls back to the server's message.
const TEAM_REFUSAL_KEYS: Record<string, string> = {
  self: 'settings.team.error.self',
  setup_operator: 'settings.team.error.setupOperator',
  setup_operator_caller: 'settings.team.error.setupOperatorCaller',
  last_admin: 'settings.team.error.lastAdmin',
  not_admin: 'settings.team.error.notAdmin'
};

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
  const [changeMemberRole] = useChangeCompanyMemberRoleMutation();
  const [removeMember, { isLoading: isRemovingMember }] = useRemoveCompanyMemberMutation();
  // Per row, not one shared id: two role changes in flight must each keep their own row disabled
  // until their own request settles (review of #352).
  const [busyMembershipIds, setBusyMembershipIds] = useState<ReadonlySet<number>>(new Set());
  const setBusy = (membershipId: number, busy: boolean) =>
    setBusyMembershipIds((current) => {
      const next = new Set(current);
      if (busy) next.add(membershipId);
      else next.delete(membershipId);
      return next;
    });
  const [pendingRemoval, setPendingRemoval] = useState<CompanyMember | null>(null);
  const cancelRemovalRef = useRef<HTMLButtonElement>(null);
  const dispatch = useDispatch();

  // Filter members based on search term
  const filteredMembers =
    companyMembers?.filter(
      (member: CompanyMember) =>
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

  const teamErrorToast = (error: unknown) => {
    const code = (error as { data?: { code?: string } })?.data?.code;
    const key = code ? TEAM_REFUSAL_KEYS[code] : undefined;
    toast({
      title: intl.formatMessage({ id: 'settings.team.error.title' }),
      description: key
        ? intl.formatMessage({ id: key })
        : // `code` is a slug for the catalogue above, never text to show (review of #352).
          apiErrorMessage(error, ['code']) ??
          intl.formatMessage({ id: 'settings.team.error.generic' }),
      status: 'error',
      duration: 5000,
      isClosable: true
    });
  };

  const roleName = (roleCode: string) =>
    roleOptions.find((option) => option.id === roleCode)?.name ?? roleCode;

  const handleRoleChange = async (member: CompanyMember, roleCode: string) => {
    if (!currentCompany?.id || roleCode === member.role_code) return;
    if (busyMembershipIds.has(member.membership_id)) return;
    setBusy(member.membership_id, true);
    try {
      await changeMemberRole({
        companyId: currentCompany.id,
        membershipId: member.membership_id,
        role: roleCode
      }).unwrap();
      toast({
        title: intl.formatMessage(
          { id: 'settings.team.roleChanged' },
          { name: member.user, role: roleName(roleCode) }
        ),
        status: 'success',
        duration: 4000,
        isClosable: true
      });
    } catch (error) {
      teamErrorToast(error);
    } finally {
      setBusy(member.membership_id, false);
    }
  };

  const handleConfirmRemoval = async () => {
    if (!currentCompany?.id || !pendingRemoval) return;
    const member = pendingRemoval;
    setBusy(member.membership_id, true);
    try {
      await removeMember({
        companyId: currentCompany.id,
        membershipId: member.membership_id
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'settings.team.removed' }, { name: member.user }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });
    } catch (error) {
      teamErrorToast(error);
    } finally {
      setBusy(member.membership_id, false);
      setPendingRemoval(null);
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

  const roleOptions: RoleOption[] =
    userRoles?.map((role) => ({
      id: role.id,
      name: ROLE_LABEL_KEYS[role.name]
        ? intl.formatMessage({ id: ROLE_LABEL_KEYS[role.name] })
        : role.name
    })) || [];

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'app.companySettings' })}
      description={intl.formatMessage({ id: 'app.companySettingsDescription' })}>
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
              // The page stack owns the gap: each card passes mb={0} (StandardCard's default
              // mb=6 stacked on spacing=10 drew a 64px gap above the invite cards).
              <VStack spacing={6} w="100%" pb={12}>
                <StandardCard
                  title={intl.formatMessage({ id: 'app.membersInThisCompany' })}
                  subtitle={
                    companyMembers
                      ? String(
                          intl.formatMessage(
                            { id: 'settings.team.count' },
                            { count: companyMembers.length }
                          )
                        )
                      : undefined
                  }
                  variant="elevated"
                  mb={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Search earns its place on a long list only. */}
                    {(companyMembers?.length ?? 0) > SEARCH_FROM && (
                      <StandardSearchInput
                        placeholder={intl.formatMessage({ id: 'settings.searchMembers' })}
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSearchTerm(e.target.value)
                        }
                        maxW={{ base: 'full', smd: '360px' }}
                      />
                    )}

                    {filteredMembers.length > 0 ? (
                      <StatusList testId="member-list">
                        {filteredMembers.map((member: CompanyMember, index: number) => (
                          <MemberRow
                            key={member.membership_id ?? `${member.user}-${index}`}
                            name={member.user}
                            establishments={member.establishments_in_charge.map((est) => est.name)}
                            role={member.role}
                            roleCode={member.role_code}
                            isYou={member.is_you}
                            isSetupOperator={member.is_setup_operator}
                            canManage={member.can_manage}
                            roleChoices={roleOptions}
                            isBusy={busyMembershipIds.has(member.membership_id)}
                            onRoleChange={(roleCode) => handleRoleChange(member, roleCode)}
                            onRemove={() => setPendingRemoval(member)}
                          />
                        ))}
                      </StatusList>
                    ) : (
                      <Text fontSize="sm" color="gray.600" py={3}>
                        {searchTerm
                          ? intl.formatMessage({ id: 'app.noMembersFound' })
                          : intl.formatMessage({ id: 'app.inviteFirstMember' })}
                      </Text>
                    )}
                  </VStack>
                </StandardCard>

                {/* Invite + Invitation Code: two halves of "add a person", so they sit side by
                side once there is room rather than costing a screen of scroll each. */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="100%" alignItems="start">
                  <Box w="100%">
                    <StandardCard
                      title={intl.formatMessage({ id: 'app.inviteNewMembers' })}
                      variant="elevated"
                      mb={0}>
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
                                {intl.formatMessage({ id: 'app.sendInvite' })}
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
                      variant="elevated"
                      mb={0}>
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

      {/* Removal names the person and what happens, in plain words, before anything is sent. */}
      <AlertDialog
        isOpen={pendingRemoval !== null}
        leastDestructiveRef={cancelRemovalRef}
        // Once the DELETE is sent, closing the dialog would not stop it: Cancel, Esc and the
        // overlay would only hide a removal that still happens (review of #352).
        onClose={() => !isRemovingMember && setPendingRemoval(null)}
        closeOnEsc={!isRemovingMember}
        closeOnOverlayClick={!isRemovingMember}
        isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="md" fontWeight="bold">
              {intl.formatMessage(
                { id: 'settings.team.removeConfirm.title' },
                { name: pendingRemoval?.user ?? '' }
              )}
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              {intl.formatMessage(
                { id: 'settings.team.removeConfirm.body' },
                { name: pendingRemoval?.user ?? '', company: currentCompany?.name ?? '' }
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <StandardButton
                ref={cancelRemovalRef}
                variant="ghost"
                size="sm"
                isDisabled={isRemovingMember}
                onClick={() => setPendingRemoval(null)}>
                {intl.formatMessage({ id: 'settings.team.removeConfirm.cancel' })}
              </StandardButton>
              <StandardButton
                size="sm"
                onClick={handleConfirmRemoval}
                isLoading={isRemovingMember}
                ml={2}>
                {intl.formatMessage({ id: 'settings.team.removeConfirm.confirm' })}
              </StandardButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </StandardPage>
  );
}
