import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useColorModeValue,
  Flex,
  CircularProgress,
  Button
} from '@chakra-ui/react';
import { IoIosArrowDown } from 'react-icons/io';
import { useIntl } from 'react-intl';
import ModernLineBarChart from './ModernLineBarChart';

interface PeriodFilter {
  id: string;
  name: string;
}

interface ExpandableChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  lineDataKey?: string;
  barDataKey?: string;
  xDataKey?: string;
  lineLabel?: string;
  barLabel?: string;
  isLoading?: boolean;
  noDataMessage?: string;
  currentPeriod: PeriodFilter;
  periodOptions: PeriodFilter[];
  onPeriodChange: (period: PeriodFilter) => void;
}

const ExpandableChartModal: React.FC<ExpandableChartModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  lineDataKey = 'scans',
  barDataKey = 'reviews',
  xDataKey = 'name',
  lineLabel = 'Scans',
  barLabel = 'Reviews',
  isLoading = false,
  noDataMessage = 'No data available',
  currentPeriod,
  periodOptions,
  onPeriodChange
}) => {
  const intl = useIntl();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
      <ModalOverlay bg="blackAlpha.500" />
      <ModalContent bg={bgColor} borderRadius="2xl" boxShadow="xl" mx={4}>
        <ModalHeader borderBottomWidth="1px" borderColor={borderColor} pb={4}>
          <Flex justify="space-between" align="center" w="100%" pr={8}>
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>
              {title}
            </Text>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<IoIosArrowDown />}
                size="sm"
                minW="120px"
                bg="green.500"
                color="white"
                fontWeight="medium"
                borderRadius="lg"
                _hover={{ bg: 'green.600' }}
                _active={{ bg: 'green.700' }}
              >
                {currentPeriod.name}
              </MenuButton>
              <MenuList minW="120px">
                {periodOptions.map((period) => (
                  <MenuItem
                    key={period.id}
                    onClick={() => onPeriodChange(period)}
                    fontSize="sm"
                    color="gray.600"
                    fontWeight={currentPeriod.id === period.id ? 'semibold' : 'normal'}
                    bg={currentPeriod.id === period.id ? 'green.50' : 'transparent'}
                    _hover={{ bg: 'gray.50' }}
                    py={2}
                  >
                    {period.name}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p={6}>
          <Box w="100%">
            {isLoading ? (
              <Flex justify="center" align="center" h="400px">
                <CircularProgress isIndeterminate color="green.500" size="40px" />
                <Text ml={4} color={textColor} fontSize="sm">
                  {intl.formatMessage({ id: 'commercial.loadingChartData' })}
                </Text>
              </Flex>
            ) : !data || data.length === 0 ? (
              <Flex justify="center" align="center" h="400px">
                <Text color="gray.500">{noDataMessage}</Text>
              </Flex>
            ) : (
              <ModernLineBarChart
                data={data}
                lineDataKey={lineDataKey}
                barDataKey={barDataKey}
                xDataKey={xDataKey}
                height={450}
                showGrid={true}
                lineLabel={lineLabel}
                barLabel={barLabel}
              />
            )}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ExpandableChartModal;
