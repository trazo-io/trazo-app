import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  Icon,
  useColorModeValue,
  useOutsideClick,
  Flex,
  Spinner,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { FaChevronDown, FaChevronUp, FaSearch, FaLeaf, FaBuilding, FaTimes } from 'react-icons/fa';

interface Production {
  id: number;
  name: string;
  start_date?: string;
  finish_date?: string;
  production_amount?: number;
  type?: string;
}

interface ProductionSelectorProps {
  selectedProductionId: string;
  productions: Production[];
  onProductionChange: (productionId: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  width?: string;
}

export const ProductionSelector: React.FC<ProductionSelectorProps> = ({
  selectedProductionId,
  productions = [],
  onProductionChange,
  isLoading = false,
  placeholder = 'Select Production',
  size = 'sm',
  width
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const ref = useRef<HTMLDivElement>(null);

  // Responsive behavior - use modal on mobile, dropdown on desktop
  const isMobile = useBreakpointValue({ base: true, md: false });
  const dropdownMaxWidth = useBreakpointValue({ base: '320px', md: '380px', lg: '420px' });

  // Theme colors following Trazo standards
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('green.50', 'green.900/20');
  const selectedBg = useColorModeValue('green.100', 'green.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const dropdownBg = useColorModeValue('white', 'gray.800');
  const borderRadius = 'xl';

  // Close dropdown when clicking outside
  useOutsideClick({
    ref: ref,
    handler: () => setIsOpen(false)
  });

  // Find selected production
  const selectedProduction = productions.find((p) => p.id.toString() === selectedProductionId);

  // Filter productions based on search term
  const filteredProductions = productions.filter(
    (production) =>
      production.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      production.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      production.id.toString().includes(searchTerm)
  );

  // Handle production selection
  const handleSelect = (productionId: string) => {
    onProductionChange(productionId);
    setIsOpen(false);
    onModalClose();
    setSearchTerm('');
  };

  // Handle button click - open modal on mobile, dropdown on desktop
  const handleButtonClick = () => {
    if (isMobile) {
      onModalOpen();
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Format production display name
  const formatProductionName = (production: Production) => {
    return production.name || `Production ${production.id}`;
  };

  // Get display text for button
  const getDisplayText = () => {
    if (selectedProductionId && selectedProduction) {
      return formatProductionName(selectedProduction);
    }
    return placeholder;
  };

  // Get production status badge
  const getProductionStatus = (production: Production) => {
    const now = new Date();
    const finishDate = production.finish_date ? new Date(production.finish_date) : null;

    if (!finishDate || finishDate > now) {
      return { label: 'Active', colorScheme: 'green' };
    }
    return { label: 'Completed', colorScheme: 'blue' };
  };

  // Production option component - reusable for both modal and dropdown
  const ProductionOption = ({
    production,
    isEstablishmentOverview = false
  }: {
    production?: Production;
    isEstablishmentOverview?: boolean;
  }) => {
    const isSelected = isEstablishmentOverview
      ? !selectedProductionId
      : selectedProductionId === production?.id.toString();

    return (
      <Box
        px={4}
        py={3}
        cursor="pointer"
        bg={isSelected ? selectedBg : 'transparent'}
        borderBottom="1px solid"
        borderColor={borderColor}
        _hover={{ bg: hoverBg }}
        transition="all 0.2s"
        onClick={() =>
          handleSelect(isEstablishmentOverview ? '' : production?.id.toString() || '')
        }>
        <HStack justify="space-between" spacing={3}>
          <HStack spacing={3} flex={1}>
            <Icon
              as={isEstablishmentOverview ? FaBuilding : FaLeaf}
              color={isEstablishmentOverview ? 'blue.500' : 'green.500'}
              boxSize={4}
            />
            <VStack align="start" spacing={0} flex={1}>
              <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
                {isEstablishmentOverview
                  ? 'Establishment Overview'
                  : formatProductionName(production!)}
              </Text>
              {isEstablishmentOverview ? (
                <Text fontSize="xs" color={mutedColor}>
                  All productions combined
                </Text>
              ) : (
                <HStack spacing={2}>
                  <Text fontSize="xs" color={mutedColor}>
                    ID: {production!.id}
                  </Text>
                  {production!.production_amount && (
                    <>
                      <Text fontSize="xs" color={mutedColor}>
                        •
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        {production!.production_amount} kg
                      </Text>
                    </>
                  )}
                </HStack>
              )}
            </VStack>
          </HStack>
          <VStack spacing={1} align="end" minW="80px">
            {isEstablishmentOverview ? (
              <Badge colorScheme="blue" variant="subtle" fontSize="xs" px={2} py={1}>
                All Data
              </Badge>
            ) : (
              <>
                <Badge
                  colorScheme={getProductionStatus(production!).colorScheme}
                  variant="subtle"
                  fontSize="xs"
                  px={2}
                  py={1}>
                  {getProductionStatus(production!).label}
                </Badge>
                {production!.finish_date && (
                  <Text fontSize="xs" color={mutedColor} fontWeight="medium">
                    {new Date(production!.finish_date).getFullYear()}
                  </Text>
                )}
              </>
            )}
          </VStack>
        </HStack>
      </Box>
    );
  };

  // Search input component - reusable for both modal and dropdown
  const SearchInput = () => (
    <Box p={3} borderBottom="1px solid" borderColor={borderColor}>
      <InputGroup size="sm">
        <InputLeftElement>
          <Icon as={FaSearch} color={mutedColor} boxSize={3} />
        </InputLeftElement>
        <Input
          placeholder="Search productions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg={bg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          fontSize="xs"
          _focus={{
            borderColor: 'green.300',
            boxShadow: '0 0 0 1px rgba(72, 187, 120, 0.2)'
          }}
        />
      </InputGroup>
    </Box>
  );

  // Options list component - reusable for both modal and dropdown
  const OptionsList = ({ maxHeight = '240px' }: { maxHeight?: string }) => (
    <VStack spacing={0} align="stretch" maxH={maxHeight} overflowY="auto">
      {/* Establishment Overview Option */}
      <ProductionOption isEstablishmentOverview={true} />

      {/* Production Options */}
      {filteredProductions.length > 0 ? (
        filteredProductions.map((production) => (
          <ProductionOption key={production.id} production={production} />
        ))
      ) : (
        <Box p={6} textAlign="center">
          <Text fontSize="sm" color={mutedColor}>
            No productions found
          </Text>
          <Text fontSize="xs" color={mutedColor} mt={1}>
            Try a different search term
          </Text>
        </Box>
      )}
    </VStack>
  );

  // Footer component - reusable for both modal and dropdown
  const Footer = () => (
    <>
      {productions.length > 0 && (
        <Box
          px={3}
          py={2}
          bg={useColorModeValue('gray.50', 'gray.700')}
          borderTop="1px solid"
          borderColor={borderColor}>
          <Text fontSize="xs" color={mutedColor} textAlign="center" fontWeight="medium">
            {filteredProductions.length} of {productions.length} productions
            {searchTerm && ' (filtered)'}
          </Text>
        </Box>
      )}
    </>
  );

  return (
    <>
      {/* Trigger Button - Unified for both mobile and desktop */}
      <Box
        ref={ref}
        position="relative"
        w={width || "fit-content"}
        minW="240px"
        maxW={width ? "none" : { base: '320px', md: '380px', lg: '420px' }}>
        <Button
          onClick={handleButtonClick}
          rightIcon={
            isLoading ? (
              <Spinner size="xs" color="green.500" />
            ) : (
              <Icon as={isOpen ? FaChevronUp : FaChevronDown} transition="transform 0.2s" />
            )
          }
          size={size}
          bg={bg}
          color={textColor}
          border="2px solid"
          borderColor={isOpen ? 'green.300' : borderColor}
          borderRadius={borderRadius}
          fontWeight="500"
          px={4}
          py={2}
          h={{ sm: '36px', md: '40px', lg: '44px' }[size]}
          w="100%"
          _hover={{
            borderColor: 'green.300',
            bg: hoverBg,
            transform: 'translateY(-1px)'
          }}
          _focus={{
            borderColor: 'green.500',
            boxShadow: '0 0 0 3px rgba(72, 187, 120, 0.1)'
          }}
          _active={{
            transform: 'translateY(0)'
          }}
          transition="all 0.2s ease"
          isDisabled={isLoading}>
          <HStack spacing={2} flex={1} justify="space-between">
            <HStack spacing={2}>
              <Icon as={selectedProductionId ? FaLeaf : FaBuilding} boxSize={3} color="green.500" />
              <Text fontSize="sm" noOfLines={1} textAlign="left" flex={1}>
                {getDisplayText()}
              </Text>
            </HStack>
          </HStack>
        </Button>

        {/* Desktop Dropdown */}
        {!isMobile && isOpen && (
          <Box
            position="absolute"
            top="100%"
            left={{ base: '0', md: '-138px', lg: '-178px' }}
            mt={2}
            bg={dropdownBg}
            border="2px solid"
            borderColor="green.200"
            borderRadius={borderRadius}
            boxShadow="xl"
            zIndex={9999}
            maxH="400px"
            w={dropdownMaxWidth}
            overflow="hidden">
            <SearchInput />
            <OptionsList />
            <Footer />
          </Box>
        )}
      </Box>

      {/* Mobile Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="full" motionPreset="slideInBottom">
        <ModalOverlay />
        <ModalContent maxH="90vh" mt="10vh" borderTopRadius="xl">
          <ModalHeader pb={2}>
            <HStack justify="space-between" align="center">
              <HStack spacing={3}>
                <Icon as={FaLeaf} color="green.500" boxSize={5} />
                <Text fontSize="lg" fontWeight="600">
                  Select Production
                </Text>
              </HStack>
              <ModalCloseButton position="relative" right={0} top={0} />
            </HStack>
          </ModalHeader>

          <ModalBody px={0} pb={6}>
            <VStack spacing={0} align="stretch">
              <Box px={6}>
                <SearchInput />
              </Box>
              <OptionsList maxHeight="60vh" />
              <Box px={6}>
                <Footer />
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProductionSelector;
