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
  Badge
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import React, { useEffect, useState } from 'react';

import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import MemberRow from './memberRow';
import { useGetCompanyMembersQuery } from 'store/api/companyApi';
import { useGetUserRolesQuery } from 'store/api/userApi';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

// Types
interface EstablishmentOption {
  id: number;
  name: string;
}

interface RoleOption {
  id: number;
  name: string;
}

export default function SettingsView() {
  const intl = useIntl();
  const toast = useToast();
  const textColor = useColorModeValue('gray.700', 'white');

  const [selectedEstablishments, setSelectedEstablishments] = useState<number[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

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

  // Filter members based on search term
  const filteredMembers =
    companyMembers?.filter(
      (member) =>
        member.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleInviteSubmit = () => {
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

    if (selectedEstablishments.length === 0) {
      toast({
        title: 'Establecimiento requerido',
        description: 'Por favor selecciona al menos un establecimiento',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // TODO: Implement invite logic
    console.log('Inviting:', {
      email: inviteEmail,
      role: selectedRole,
      establishments: selectedEstablishments
    });

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
  };

  const handleDiscardChanges = () => {
    setInviteEmail('');
    setSelectedRole(null);
    setSelectedEstablishments([]);
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
    <Box
      w="100vw"
      minH="100vh"
      ml={{ base: 0, md: '-280px' }}
      position="relative"
      px={{ base: 4, md: 8, lg: 24 }}
    >
      {/* Header Section */}
      <Box
        bg="linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)"
        pt={{ base: '100px', md: '120px' }}
        pb={{ base: '60px', md: '80px' }}
        px={{ base: 4, md: 8 }}
        mb="-50px"
        w="100%"
      >
        <Box maxW="none" mx="auto" pl={{ base: 0, md: '300px' }}>
          <VStack spacing={3} textAlign="center">
            <Text
              fontSize={{ base: '2xl', md: '4xl' }}
              color="green.600"
              fontWeight="bold"
              letterSpacing="-0.02em"
            >
              {intl.formatMessage({ id: 'app.companySettings' }) || 'Config. de la compañía'}
            </Text>
            <Text
              fontSize={{ base: 'md', md: 'lg' }}
              color="gray.600"
              fontWeight="normal"
              maxW={{ base: '90%', md: '70%' }}
              lineHeight="1.6"
            >
              {intl.formatMessage({ id: 'app.companySettingsDescription' }) ||
                'Esta pantalla es solo visible para administradores de compañía'}
            </Text>
          </VStack>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        w="100%"
        px={{ base: 4, md: 8 }}
        pl={{ base: 4, md: '320px' }}
        position="relative"
        zIndex={10}
      >
        <VStack spacing={8} w="100%" pb={10}>
          {/* Invite New Members Section */}
          <Box w="100%">
            <StandardCard
              title={
                intl.formatMessage({ id: 'app.inviteNewMembers' }) || 'Invitar nuevos miembros'
              }
              variant="elevated"
            >
              <Box py={2}>
                <VStack spacing={8} align="stretch">
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
                          <StandardField label="Establecimiento donde trabajará" required>
                            <StandardSelect
                              placeholder="Selecciona un establecimiento..."
                              value={
                                selectedEstablishments.length > 0 ? selectedEstablishments[0] : ''
                              }
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const value = parseInt(e.target.value);
                                if (value) {
                                  setSelectedEstablishments([value]);
                                } else {
                                  setSelectedEstablishments([]);
                                }
                              }}
                            >
                              <option value="">Selecciona un establecimiento...</option>
                              {establishmentOptions.map((est: EstablishmentOption) => (
                                <option key={est.id} value={est.id}>
                                  {est.name}
                                </option>
                              ))}
                            </StandardSelect>
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField label="Rol y permisos" required>
                            <StandardSelect
                              placeholder="Selecciona un rol..."
                              value={selectedRole || ''}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const value = parseInt(e.target.value);
                                setSelectedRole(value || null);
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
                      <StandardButton variant="primary" onClick={handleInviteSubmit} size="lg">
                        {intl.formatMessage({ id: 'app.sendInvite' }) || 'Enviar invitación'}
                      </StandardButton>
                    </HStack>
                  </VStack>
                </VStack>
              </Box>
            </StandardCard>
          </Box>

          <Box w="100%">
            <StandardCard
              title={
                intl.formatMessage({ id: 'app.membersInThisCompany' }) ||
                'Miembros en esta compañía'
              }
              variant="elevated"
            >
              <Box py={2}>
                <VStack spacing={6} align="stretch">
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
                                    : 'Invita a tu primer miembro del equipo usando el formulario arriba'}
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
        </VStack>
      </Box>
    </Box>
  );
}
