// Chakra imports
import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  Td,
  useColorModeValue,
  VStack,
  HStack,
  useToast,
  Badge,
  Checkbox,
  Stack,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Icon,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { SearchIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { FaUsers, FaShare } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';

import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardPage
} from 'components/Design/StandardComponents';
import MemberRow from './memberRow';
import { useGetCompanyMembersQuery } from 'store/api/companyApi';
import { useGetUserRolesQuery } from 'store/api/userApi';
import { useSendInvitationMutation } from 'store/api/invitationApi';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Types
interface EstablishmentOption {
  id: number;
  name: string;
}

interface RoleOption {
  id: string;
  name: string;
}

export default function SettingsView() {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const textColor = useColorModeValue('gray.700', 'white');

  const [selectedEstablishments, setSelectedEstablishments] = useState<number[]>([]);
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
        title: 'Email inválido',
        description: 'Por favor ingresa un email válido',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!selectedRole) {
      toast({
        title: 'Rol requerido',
        description: 'Por favor selecciona un rol',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Company Admins don't need establishment selection (they get all automatically)
    if (selectedRole !== 'CA' && selectedEstablishments.length === 0) {
      toast({
        title: 'Establecimiento requerido',
        description: 'Por favor selecciona al menos un establecimiento',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      // For Company Admin, use all establishments; for others, use selected ones
      const establishmentsToSend =
        selectedRole === 'CA' && establishments
          ? establishments.map((est) => est.id)
          : selectedEstablishments;

      await sendInvitation({
        email: inviteEmail,
        role: selectedRole || 'DW',
        establishments: establishmentsToSend,
        invitee_name: inviteEmail.split('@')[0] // Use email prefix as default name
      }).unwrap();

      toast({
        title: 'Invitación enviada',
        description: `Invitación enviada exitosamente a ${inviteEmail}`,
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      // Reset form
      setInviteEmail('');
      setSelectedRole(null);
      setSelectedEstablishments([]);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error al enviar invitación',
        description: error?.data?.error || 'Ocurrió un error al enviar la invitación',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  const handleDiscardChanges = () => {
    setInviteEmail('');
    setSelectedRole(null);
    setSelectedEstablishments([]);
  };

  // Copy company code to clipboard
  const handleCopyCode = async () => {
    if (!currentCompany?.invitation_code) return;

    try {
      await navigator.clipboard.writeText(currentCompany.invitation_code);
      setCodeCopied(true);
      toast({
        title: 'Código copiado',
        description: 'El código de la compañía ha sido copiado al portapapeles',
        status: 'success',
        duration: 2000,
        isClosable: true
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error al copiar',
        description: 'No se pudo copiar el código al portapapeles',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const establishmentOptions: EstablishmentOption[] =
    establishments?.map((est) => ({
      id: est.id,
      name: est.name
    })) || [];

  const roleOptions: RoleOption[] =
    userRoles?.map((role) => ({
      id: role.id,
      name: role.name
    })) || [];

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'app.companySettings' }) || 'Configuración de la Compañía'}
      description={
        intl.formatMessage({ id: 'app.companySettingsDescription' }) ||
        'Gestiona la configuración y miembros de tu compañía'
      }
      showBackButton
      onBack={() => navigate(-1)}
    >
      <Box w="100%" maxW="1200px" mx="auto" className="main-content-area">
        <VStack spacing={10} w="100%" pb={12}>
          {/* Members Overview Section - Most Important First */}
          <Box w="100%">
            <StandardCard
              title={
                intl.formatMessage({ id: 'app.membersInThisCompany' }) || 'Miembros de la Compañía'
              }
              subtitle="Gestiona los miembros actuales y sus permisos"
              variant="elevated"
              shadow="lg"
            >
              <Box py={4}>
                <VStack spacing={8} align="stretch">
                  {/* Search Bar */}
                  <Flex justify="space-between" align="center" w="100%" flexWrap="wrap" gap={4}>
                    <InputGroup maxW="500px" size="lg">
                      <InputLeftElement h="full">
                        <SearchIcon color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder={
                          intl.formatMessage({ id: 'app.typeHere' }) || 'Escribe aquí...'
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        borderRadius="xl"
                        bg="white"
                        h="48px"
                        fontSize="md"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{
                          borderColor: 'green.400',
                          boxShadow: '0 0 0 1px rgb(72, 187, 120)',
                          bg: 'white'
                        }}
                      />
                    </InputGroup>
                    <Badge
                      px={4}
                      py={2}
                      borderRadius="full"
                      bg="green.100"
                      color="green.800"
                      fontSize="sm"
                      fontWeight="medium"
                    >
                      {filteredMembers.length} miembro{filteredMembers.length !== 1 ? 's' : ''}
                    </Badge>
                  </Flex>

                  {/* Members Table */}
                  <Box
                    overflowX="auto"
                    w="100%"
                    borderRadius="2xl"
                    border="1px solid"
                    borderColor="gray.100"
                    bg="white"
                    boxShadow="sm"
                  >
                    <Table variant="simple" size="lg">
                      <Thead bg="gray.50" borderBottom="2px solid" borderColor="gray.100">
                        <Tr>
                          <Th
                            color="gray.700"
                            fontWeight="bold"
                            fontSize="xs"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            py={5}
                            px={6}
                          >
                            {intl.formatMessage({ id: 'app.name' }) || 'NOMBRE'}
                          </Th>
                          <Th
                            color="gray.700"
                            fontWeight="bold"
                            fontSize="xs"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            py={5}
                            px={6}
                          >
                            {intl.formatMessage({ id: 'app.currentWorkingEstablishments' }) ||
                              'ESTABLECIMIENTOS EN LOS QUE TRABAJA'}
                          </Th>
                          <Th
                            color="gray.700"
                            fontWeight="bold"
                            fontSize="xs"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            py={5}
                            px={6}
                          >
                            {intl.formatMessage({ id: 'app.role' }) || 'ROL'}
                          </Th>
                          <Th
                            color="gray.700"
                            fontWeight="bold"
                            fontSize="xs"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            py={5}
                            px={6}
                          >
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
                                  mb={2}
                                >
                                  <Text fontSize="2xl">👥</Text>
                                </Box>
                                <Text color="gray.600" fontSize="lg" fontWeight="semibold">
                                  {searchTerm
                                    ? 'No se encontraron miembros'
                                    : 'No hay miembros aún'}
                                </Text>
                                <Text
                                  color="gray.500"
                                  fontSize="md"
                                  maxW="300px"
                                  textAlign="center"
                                >
                                  {searchTerm
                                    ? 'Intenta con otros términos de búsqueda'
                                    : 'Invita a tu primer miembro del equipo usando el formulario abajo'}
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

          {/* Invite New Members Section - Primary Action */}
          <Box w="100%">
            <StandardCard
              title={
                intl.formatMessage({ id: 'app.inviteNewMembers' }) || 'Invitar nuevos miembros'
              }
              variant="elevated"
              shadow="lg"
            >
              <Box py={4}>
                <VStack spacing={10} align="stretch">
                  <VStack spacing={6} w="100%">
                    <VStack spacing={6} w="100%">
                      <StandardField label="Correo electrónico del nuevo miembro" required>
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

                      <HStack spacing={6} w="100%" align="flex-start">
                        <Box flex={1}>
                          <StandardField label="Establecimientos donde trabajará" required>
                            <Box>
                              {/* Show selected establishments as tags */}
                              {selectedEstablishments.length > 0 && (
                                <Wrap spacing={2} mb={3}>
                                  {selectedEstablishments.map((estId) => {
                                    const establishment = establishmentOptions.find(
                                      (e) => e.id === estId
                                    );
                                    return (
                                      <WrapItem key={estId}>
                                        <Tag
                                          size="md"
                                          borderRadius="full"
                                          variant="solid"
                                          colorScheme="green"
                                        >
                                          <TagLabel>{establishment?.name}</TagLabel>
                                          <TagCloseButton
                                            onClick={() => {
                                              setSelectedEstablishments((prev) =>
                                                prev.filter((id) => id !== estId)
                                              );
                                            }}
                                          />
                                        </Tag>
                                      </WrapItem>
                                    );
                                  })}
                                </Wrap>
                              )}

                              {/* Checkbox list for selecting establishments */}
                              <Box
                                border="1px solid"
                                borderColor="gray.300"
                                borderRadius="lg"
                                p={4}
                                maxH="200px"
                                overflowY="auto"
                                bg="white"
                              >
                                <Stack spacing={2}>
                                  {establishmentOptions.map((est: EstablishmentOption) => (
                                    <Checkbox
                                      key={est.id}
                                      isChecked={selectedEstablishments.includes(est.id)}
                                      isDisabled={selectedRole === 'CA'}
                                      onChange={(e) => {
                                        // Don't allow changes if Company Admin is selected
                                        if (selectedRole === 'CA') return;

                                        if (e.target.checked) {
                                          setSelectedEstablishments((prev) => [...prev, est.id]);
                                        } else {
                                          setSelectedEstablishments((prev) =>
                                            prev.filter((id) => id !== est.id)
                                          );
                                        }
                                      }}
                                      colorScheme="green"
                                    >
                                      <Text
                                        fontSize="sm"
                                        color={selectedRole === 'CA' ? 'gray.500' : 'inherit'}
                                      >
                                        {est.name}
                                        {selectedRole === 'CA' && (
                                          <Text as="span" fontSize="xs" color="blue.600" ml={2}>
                                            (incluido automáticamente)
                                          </Text>
                                        )}
                                      </Text>
                                    </Checkbox>
                                  ))}
                                  {establishmentOptions.length === 0 && (
                                    <Text color="gray.500" fontSize="sm" textAlign="center">
                                      No hay establecimientos disponibles
                                    </Text>
                                  )}
                                </Stack>
                              </Box>
                            </Box>

                            {/* Company Admin Notice */}
                            {selectedRole === 'CA' && (
                              <Box
                                mt={3}
                                p={3}
                                bg="blue.50"
                                border="1px solid"
                                borderColor="blue.200"
                                borderRadius="lg"
                              >
                                <HStack spacing={2}>
                                  <Box
                                    w="6px"
                                    h="6px"
                                    bg="blue.500"
                                    borderRadius="full"
                                    flexShrink={0}
                                    mt={1}
                                  />
                                  <Text fontSize="sm" color="blue.700" lineHeight="1.5">
                                    <Text as="span" fontWeight="600">
                                      Administrador de Compañía:
                                    </Text>{' '}
                                    Tendrá acceso a todos los establecimientos automáticamente
                                  </Text>
                                </HStack>
                              </Box>
                            )}
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField label="Rol y permisos" required>
                            <StandardSelect
                              placeholder="Selecciona un rol..."
                              value={selectedRole || ''}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const value = e.target.value;
                                setSelectedRole(value || null);

                                // If Company Admin is selected, automatically select all establishments
                                if (value === 'CA' && establishments) {
                                  const allEstablishmentIds = establishments.map((est) => est.id);
                                  setSelectedEstablishments(allEstablishmentIds);
                                }
                                // If other role is selected, clear establishments to let user choose
                                else if (value && value !== 'CA') {
                                  setSelectedEstablishments([]);
                                }
                              }}
                            >
                              <option value="">Selecciona un rol...</option>
                              {roleOptions.map((role: RoleOption) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </StandardSelect>
                          </StandardField>
                        </Box>
                      </HStack>
                    </VStack>

                    <HStack spacing={4} w="100%" justify="flex-end">
                      <StandardButton variant="outline" onClick={handleDiscardChanges} size="lg">
                        {intl.formatMessage({ id: 'app.discardChanges' }) || 'Descartar cambios'}
                      </StandardButton>
                      <StandardButton
                        variant="primary"
                        onClick={handleInviteSubmit}
                        size="lg"
                        isLoading={isSendingInvitation}
                        loadingText="Enviando..."
                      >
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
              title="Código de Invitación"
              subtitle="Comparte este código para que nuevos miembros se unan durante el registro"
              variant="elevated"
              shadow="lg"
            >
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
                    borderColor="green.200"
                  >
                    {/* Company Icon */}
                    <Flex
                      align="center"
                      justify="center"
                      w={{ base: 'full', md: 'auto' }}
                      mb={{ base: 4, md: 0 }}
                    >
                      <Box
                        bg="green.500"
                        p={4}
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon as={FaUsers} color="white" boxSize={6} />
                      </Box>
                    </Flex>

                    {/* Company Details */}
                    <VStack align={{ base: 'center', md: 'start' }} spacing={2} flex={1}>
                      <Text fontSize="md" fontWeight="semibold" color="gray.700">
                        {currentCompany?.name || 'Tu Compañía'}
                      </Text>
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        textAlign={{ base: 'center', md: 'left' }}
                        lineHeight="1.4"
                      >
                        Los nuevos miembros pueden unirse usando este código durante el registro
                      </Text>
                    </VStack>

                    {/* Code Display and Copy */}
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
                        textAlign="center"
                      >
                        {currentCompany?.invitation_code || 'LOADING...'}
                      </Badge>

                      {/* Copy Button */}
                      <Tooltip
                        label={codeCopied ? 'Copiado!' : 'Copiar código'}
                        placement="top"
                        closeOnClick={false}
                        fontSize="xs"
                      >
                        <IconButton
                          aria-label="Copiar código de compañía"
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
                    </VStack>
                  </Flex>

                  {/* Instructions */}
                  <Box
                    p={3}
                    bg="blue.50"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="blue.200"
                  >
                    <HStack spacing={2} align="start">
                      <Icon as={FaShare} color="blue.500" mt={0.5} flexShrink={0} boxSize={3} />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" fontWeight="medium" color="blue.800">
                          Cómo usar el código de invitación:
                        </Text>
                        <VStack align="start" spacing={0.5} pl={1}>
                          <Text fontSize="2xs" color="blue.600" lineHeight="1.3">
                            • Comparte este código con nuevos miembros del equipo
                          </Text>
                          <Text fontSize="2xs" color="blue.600" lineHeight="1.3">
                            • Durante el registro, deben elegir "Unirse a compañía existente"
                          </Text>
                          <Text fontSize="2xs" color="blue.600" lineHeight="1.3">
                            • Ingresar el código para unirse automáticamente como Trabajador de
                            Dominio
                          </Text>
                        </VStack>
                      </VStack>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            </StandardCard>
          </Box>
        </VStack>
      </Box>
    </StandardPage>
  );
}
