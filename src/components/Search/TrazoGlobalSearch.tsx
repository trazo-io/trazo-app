import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  useDisclosure,
  useColorModeValue,
  Flex,
  Kbd,
  Spinner,
  Portal,
  Icon,
  Image,
  useBreakpointValue
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import { FaBuilding, FaMap, FaArrowRight, FaLeaf } from 'react-icons/fa';
import { StandardInput, StandardSearchInput } from 'components/Design/StandardComponents';
import { useGlobalSearch } from 'hooks/useGlobalSearch';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'establishment' | 'parcel';
  name: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  metadata: {
    carbonScore?: number;
    area?: string;
    status?: string;
  };
  href: string;
}

interface TrazoGlobalSearchProps {
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TrazoGlobalSearch: React.FC<TrazoGlobalSearchProps> = ({
  placeholder = 'Search',
  size = 'md'
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Modal state management with close protection
  const handleOnOpen = () => {
    onOpen();
  };

  const handleOnClose = () => {
    setIsClosing(true);
    onClose();

    // Prevent immediate reopening for 300ms
    setTimeout(() => {
      setIsClosing(false);
    }, 300);
  };
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Custom hook for search logic (will implement next)
  const { searchResults, isLoading, searchHistory } = useGlobalSearch(query);

  // Responsive settings - Mobile up to 1200px
  const isMobile = useBreakpointValue({ base: true, xl: false });
  const modalSize = useBreakpointValue({ base: 'full', xl: 'xl' });

  // Color scheme
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const modalBg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(26, 32, 44, 0.95)');
  const overlayBg = useColorModeValue('blackAlpha.300', 'blackAlpha.500');

  // Keyboard shortcut to open search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when modal is closed
      if (isOpen) return;

      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        handleOnOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOnOpen, isOpen]);

  // Focus modal input when opened and reset state when closed
  useEffect(() => {
    if (isOpen && modalInputRef.current) {
      setTimeout(() => modalInputRef.current?.focus(), 100);
    } else if (!isOpen) {
      // Clean up state when modal closes
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation in modal
  const handleModalKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        if (searchResults.length > 0) {
          event.preventDefault();
          setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
        }
        break;
      case 'ArrowUp':
        if (searchResults.length > 0) {
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
        }
        break;
      case 'Enter':
        if (searchResults.length > 0 && searchResults[selectedIndex]) {
          event.preventDefault();
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();

        // Blur the trigger input to prevent focus events
        if (inputRef.current) {
          inputRef.current.blur();
        }

        handleOnClose();
        break;
    }
  };

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    handleOnClose();
    setQuery('');
  };

  // Handle input focus (open modal)
  const handleInputFocus = () => {
    if (!isOpen && !isClosing) {
      handleOnOpen();
    }
  };

  // Get entity icon
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'establishment':
        return FaBuilding;
      case 'parcel':
        return FaMap;
      default:
        return FaBuilding;
    }
  };

  // Get entity color
  const getEntityColor = (type: string) => {
    switch (type) {
      case 'establishment':
        return 'green';
      case 'parcel':
        return 'blue';
      default:
        return 'gray';
    }
  };

  // On small screens, show compact icon button instead of full input
  const isCompactSearch = useBreakpointValue({ base: true, md: false });

  return (
    <>
      {/* Search Trigger - Icon button on mobile, full input on desktop */}
      {isCompactSearch ? (
        <IconButton
          ref={inputRef as any}
          aria-label="Search"
          icon={<SearchIcon boxSize={4} />}
          variant="ghost"
          size="sm"
          color="gray.500"
          onClick={handleInputFocus}
          minW="32px"
          h="36px"
          borderRadius="lg"
          _hover={{ bg: 'gray.100', color: 'gray.700' }}
        />
      ) : (
        <Box
          position="relative"
          width={{ md: '100%', lg: '100%', xl: '320px' }}
          flex="1"
          maxW={{ md: 'none', lg: 'none', xl: '320px' }}>
          {/* This input's shape IS the app's search shape — it now comes from
              StandardSearchInput so a page that needs a search field cannot quietly ship a
              different one (Activities had a bare Input with no icon and another height). */}
          <StandardSearchInput
            ref={inputRef}
            placeholder="Search"
            value=""
            onFocus={handleInputFocus}
            onClick={handleInputFocus}
            readOnly
            cursor="pointer"
            rightHint={navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
          />
        </Box>
      )}

      {/* Search Modal */}
      <Portal>
        <Modal
          isOpen={isOpen}
          onClose={() => {
            // Blur the trigger input to prevent focus events
            if (inputRef.current) {
              inputRef.current.blur();
            }

            handleOnClose();
          }}
          size={modalSize}
          closeOnOverlayClick={true}
          closeOnEsc={true}
          motionPreset="slideInTop">
          <ModalOverlay bg={overlayBg} backdropFilter="blur(8px)" />
          <ModalContent
            bg={modalBg}
            backdropFilter="blur(12px)"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            boxShadow="xl"
            mt={isMobile ? 0 : '10vh'}
            mx={isMobile ? 0 : 4}
            maxH={isMobile ? '100vh' : '70vh'}
            overflow="hidden"
            onKeyDown={handleModalKeyDown}>
            <VStack spacing={0} align="stretch">
              {/* Search Header */}
              <Flex align="center" p={4} borderBottom="1px solid" borderColor={borderColor}>
                <InputGroup>
                  <InputLeftElement
                    h="auto"
                    w="44px"
                    children={<SearchIcon color="gray.500" boxSize={5} />}
                  />
                  <StandardInput
                    ref={modalInputRef}
                    placeholder="Search establishments, parcels..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedIndex(0); // Reset selection on new search
                    }}
                    variant="unstyled"
                    fontSize="lg"
                    fontWeight="medium"
                    pl="44px"
                    _focus={{ boxShadow: 'none' }}
                    _placeholder={{ color: 'gray.400' }}
                  />
                </InputGroup>
                <IconButton
                  aria-label="Close search"
                  icon={<CloseIcon />}
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Blur the trigger input to prevent focus events
                    if (inputRef.current) {
                      inputRef.current.blur();
                    }

                    handleOnClose();
                  }}
                  ml={2}
                />
              </Flex>

              {/* Search Results */}
              <Box flex="1" overflowY="auto" maxH={isMobile ? 'calc(100vh - 80px)' : '50vh'}>
                {isLoading ? (
                  <Flex justify="center" align="center" py={8}>
                    <VStack spacing={3}>
                      <Spinner size="md" color="green.700" />
                      <Text fontSize="sm" color="gray.500">
                        Searching...
                      </Text>
                    </VStack>
                  </Flex>
                ) : query && searchResults.length === 0 ? (
                  <VStack spacing={4} py={8} px={4}>
                    <Icon as={SearchIcon} boxSize={8} color="gray.500" />
                    <VStack spacing={1}>
                      <Text fontSize="md" fontWeight="medium" color="gray.600">
                        No results found
                      </Text>
                      <Text fontSize="sm" color="gray.500" textAlign="center">
                        Try searching for establishment or parcel names
                      </Text>
                    </VStack>
                  </VStack>
                ) : !query && searchHistory.length > 0 ? (
                  <VStack spacing={0} align="stretch" p={2}>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color="gray.500"
                      px={3}
                      py={2}
                      textTransform="uppercase">
                      Recent Searches
                    </Text>
                    {searchHistory.slice(0, 5).map((item, index) => (
                      <SearchResultItem
                        key={`history-${index}`}
                        result={item}
                        isSelected={false}
                        onClick={() => handleResultClick(item)}
                        getEntityIcon={getEntityIcon}
                        getEntityColor={getEntityColor}
                      />
                    ))}
                  </VStack>
                ) : query ? (
                  <VStack spacing={0} align="stretch" p={2}>
                    {searchResults.map((result, index) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        isSelected={index === selectedIndex}
                        onClick={() => handleResultClick(result)}
                        getEntityIcon={getEntityIcon}
                        getEntityColor={getEntityColor}
                      />
                    ))}
                  </VStack>
                ) : (
                  <VStack spacing={4} py={8} px={4}>
                    <Icon as={FaLeaf} boxSize={8} color="green.700" />
                    <VStack spacing={1}>
                      <Text fontSize="md" fontWeight="medium" color="gray.600">
                        Search your carbon data
                      </Text>
                      <Text fontSize="sm" color="gray.500" textAlign="center">
                        Find establishments, parcels, and production data instantly
                      </Text>
                    </VStack>
                    <HStack spacing={2} fontSize="xs" color="gray.500">
                      <Text>Use</Text>
                      <Kbd>↑</Kbd>
                      <Kbd>↓</Kbd>
                      <Text>to navigate,</Text>
                      <Kbd>↵</Kbd>
                      <Text>to select</Text>
                    </HStack>
                  </VStack>
                )}
              </Box>
            </VStack>
          </ModalContent>
        </Modal>
      </Portal>
    </>
  );
};

// Search Result Item Component
interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  getEntityIcon: (type: string) => any;
  getEntityColor: (type: string) => string;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  isSelected,
  onClick,
  getEntityIcon,
  getEntityColor
}) => {
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const selectedBg = useColorModeValue('green.50', 'green.900');
  const selectedBorderColor = useColorModeValue('green.200', 'green.600');

  return (
    <Flex
      align="center"
      p={3}
      borderRadius="lg"
      cursor="pointer"
      bg={isSelected ? selectedBg : 'transparent'}
      border="1px solid"
      borderColor={isSelected ? selectedBorderColor : 'transparent'}
      _hover={{ bg: isSelected ? selectedBg : hoverBg }}
      onClick={onClick}
      transition="all 0.2s">
      {/* Entity Icon */}
      <Flex
        align="center"
        justify="center"
        w={10}
        h={10}
        borderRadius="lg"
        bg={`${getEntityColor(result.type)}.100`}
        color={`${getEntityColor(result.type)}.600`}
        mr={3}>
        <Icon as={getEntityIcon(result.type)} boxSize={4} />
      </Flex>

      {/* Content */}
      <Box flex="1" minW={0}>
        <HStack spacing={2} align="center" mb={1}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800" noOfLines={1}>
            {result.name}
          </Text>
          <Badge
            colorScheme={getEntityColor(result.type)}
            variant="subtle"
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="full">
            {result.type === 'establishment' ? 'Farm' : 'Parcel'}
          </Badge>
        </HStack>

        <VStack spacing={1} align="start">
          {result.description && (
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {result.description}
            </Text>
          )}

          <HStack spacing={3} fontSize="xs" color="gray.500">
            {result.location && <Text>{result.location}</Text>}
            {result.metadata.carbonScore && (
              <HStack spacing={1}>
                <Icon as={FaLeaf} color="green.500" />
                <Text>{result.metadata.carbonScore} kg CO₂</Text>
              </HStack>
            )}
            {result.metadata.area && <Text>{result.metadata.area}</Text>}
          </HStack>
        </VStack>
      </Box>

      {/* Arrow Icon */}
      <Icon
        as={FaArrowRight}
        boxSize={3}
        color="gray.400"
        ml={3}
        opacity={isSelected ? 1 : 0}
        transition="opacity 0.2s"
      />
    </Flex>
  );
};

export default TrazoGlobalSearch;
