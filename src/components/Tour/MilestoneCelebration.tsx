import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Box,
  Text,
  Button,
  VStack,
  Icon,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { FiCheck, FiArrowRight } from 'react-icons/fi';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { MilestoneDefinition } from '../../tours/types';

interface MilestoneCelebrationProps {
  milestone: MilestoneDefinition;
  isOpen: boolean;
  onClose: () => void;
  daysSinceSignup: number;
}

/**
 * Modal celebration for major milestones (first production finished, first review).
 * Shows time-aware copy based on daysSinceSignup.
 */
export const MilestoneCelebrationModal: React.FC<MilestoneCelebrationProps> = ({
  milestone,
  isOpen,
  onClose,
  daysSinceSignup
}) => {
  const navigate = useNavigate();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('gray.900', 'white');
  const primaryColor = useColorModeValue('green.500', 'green.400');
  const primaryHover = useColorModeValue('green.600', 'green.300');
  const accentBg = useColorModeValue('green.50', 'green.900');

  const isEarly = daysSinceSignup <= 7;
  const titleKey = isEarly ? milestone.titleKeyEarly : milestone.titleKeyLate;
  const bodyKey = isEarly ? milestone.bodyKeyEarly : milestone.bodyKeyLate;

  const handleAction = () => {
    onClose();
    navigate(milestone.actionPath);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay bg="rgba(0, 0, 0, 0.4)" backdropFilter="blur(4px)" />
      <ModalContent bg={bgColor} borderRadius="2xl" mx={4}>
        <ModalBody py={8} px={6}>
          <VStack spacing={5} textAlign="center">
            {/* Success icon */}
            <Box
              p={4}
              borderRadius="full"
              bg={accentBg}
            >
              <Icon as={FiCheck} boxSize={8} color={primaryColor} />
            </Box>

            {/* Title */}
            <Text fontSize="lg" fontWeight="700" color={headingColor}>
              <FormattedMessage id={titleKey} />
            </Text>

            {/* Body */}
            <Text fontSize="sm" color={textColor} lineHeight="tall">
              <FormattedMessage id={bodyKey} />
            </Text>

            {/* Primary action */}
            <Button
              bg={primaryColor}
              color="white"
              size="md"
              w="full"
              minH="44px"
              borderRadius="xl"
              rightIcon={<FiArrowRight />}
              _hover={{ bg: primaryHover }}
              onClick={handleAction}
            >
              <FormattedMessage id={milestone.actionKey} />
            </Button>

            {/* Dismiss */}
            <Button
              variant="ghost"
              size="sm"
              color={textColor}
              onClick={onClose}
              minH="44px"
            >
              <FormattedMessage id="tour.common.close" />
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

/**
 * Show a toast celebration for smaller milestones (first event, first scan).
 */
export function useMilestoneToast() {
  const toast = useToast();
  const intl = useIntl();

  const showToast = (
    milestone: MilestoneDefinition,
    daysSinceSignup: number
  ) => {
    const isEarly = daysSinceSignup <= 7;
    const titleKey = isEarly ? milestone.titleKeyEarly : milestone.titleKeyLate;
    const bodyKey = isEarly ? milestone.bodyKeyEarly : milestone.bodyKeyLate;

    toast({
      title: intl.formatMessage({ id: titleKey }),
      description: intl.formatMessage({ id: bodyKey }),
      status: 'success',
      duration: 5000,
      isClosable: true,
      position: 'bottom-right'
    });
  };

  return { showToast };
}
