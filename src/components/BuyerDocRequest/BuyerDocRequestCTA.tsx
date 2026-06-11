/**
 * BuyerDocRequestCTA — quiet buyer/retailer documentation request block for
 * the consumer proof view.
 *
 * Collapsed: one-line pitch + outline button. Expanded: inline form that
 * POSTs to the public /buyer_doc_requests/ endpoint (no auth). A duplicate
 * request (same email + production within 24h) returns 200 {duplicate:true}
 * and is shown as the same success state — idempotent UX.
 *
 * Copy is hardcoded English by consumer-page convention (see
 * TrustSummaryHeader). Compliance: "documented"/"records" language only —
 * no verification claims.
 */
import React, { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Icon,
  Input,
  Stack,
  Text,
  Textarea,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FaCheckCircle, FaFileAlt } from 'react-icons/fa';
import { useCreateBuyerDocRequestMutation } from 'store/api/transparencyQrApi';

interface BuyerDocRequestCTAProps {
  /** Production public UUID (consumer page route param) */
  productionId: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const BuyerDocRequestCTA: React.FC<BuyerDocRequestCTAProps> = ({ productionId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitError, setSubmitError] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const [createBuyerDocRequest, { isLoading }] = useCreateBuyerDocRequestMutation();

  const containerBg = useColorModeValue('gray.50', 'gray.700');
  const containerBorder = useColorModeValue('gray.200', 'gray.600');
  const titleColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const inputBg = useColorModeValue('white', 'gray.800');

  const validate = () => {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) {
      next.name = 'Please enter your name';
    }
    if (!email.trim()) {
      next.email = 'Please enter your work email';
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = 'Please enter a valid email address';
    }
    return next;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email) return;

    setSubmitError(false);
    try {
      // 201 {duplicate:false} and 200 {duplicate:true} both resolve here —
      // duplicates are shown as the same success state on purpose.
      await createBuyerDocRequest({
        production_id: productionId,
        requester_name: name.trim(),
        requester_email: email.trim(),
        ...(organization.trim() ? { organization: organization.trim() } : {}),
        ...(message.trim() ? { message: message.trim() } : {})
      }).unwrap();
      setSentToEmail(email.trim());
    } catch {
      // 400/404/429/500 — keep form values so the buyer can retry
      setSubmitError(true);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setErrors({});
    setSubmitError(false);
  };

  return (
    <Box
      bg={containerBg}
      borderWidth="1px"
      borderColor={containerBorder}
      borderRadius="xl"
      p={4}
    >
      {sentToEmail ? (
        <HStack spacing={3} align="flex-start">
          <Icon as={FaCheckCircle} color="green.500" boxSize={5} mt={0.5} flexShrink={0} />
          <Box>
            <Text fontSize="sm" fontWeight="bold" color={titleColor}>
              Request sent
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              The farm has been notified and will reply to {sentToEmail}.
            </Text>
          </Box>
        </HStack>
      ) : (
        <>
          <Stack
            direction={{ base: 'column', smd: 'row' }}
            spacing={3}
            align={{ base: 'stretch', smd: 'center' }}
          >
            <HStack spacing={3} align="flex-start" flex={1} minW={0}>
              <Icon as={FaFileAlt} color="green.600" boxSize={5} mt={0.5} flexShrink={0} />
              <Box>
                <Text fontSize="sm" fontWeight="bold" color={titleColor}>
                  Buyer or retailer?
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  Request supplier documentation for this lot — certificates and audit records,
                  sent by the farm.
                </Text>
              </Box>
            </HStack>
            {!isExpanded && (
              <Button
                variant="outline"
                colorScheme="green"
                size="sm"
                minH="44px"
                flexShrink={0}
                onClick={() => setIsExpanded(true)}
              >
                Request documentation
              </Button>
            )}
          </Stack>

          <Collapse in={isExpanded} animateOpacity>
            <VStack spacing={3} align="stretch" mt={4}>
              <FormControl isRequired isInvalid={!!errors.name}>
                <FormLabel fontSize="xs" mb={1}>
                  Name
                </FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  bg={inputBg}
                  h="44px"
                  fontSize="sm"
                />
                <FormErrorMessage fontSize="xs">{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.email}>
                <FormLabel fontSize="xs" mb={1}>
                  Work email
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg={inputBg}
                  h="44px"
                  fontSize="sm"
                />
                <FormErrorMessage fontSize="xs">{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" mb={1}>
                  Organization
                </FormLabel>
                <Input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  bg={inputBg}
                  h="44px"
                  fontSize="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" mb={1}>
                  Message
                </FormLabel>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  placeholder="What do you need? e.g. organic certificate, spray records…"
                  bg={inputBg}
                  fontSize="sm"
                  rows={3}
                />
              </FormControl>

              {submitError && (
                <Text fontSize="xs" color="red.500">
                  Couldn&apos;t send right now — please try again later.
                </Text>
              )}

              <Stack
                direction={{ base: 'column', smd: 'row' }}
                spacing={2}
                align={{ base: 'stretch', smd: 'center' }}
              >
                <Button
                  colorScheme="green"
                  size="sm"
                  minH="44px"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  loadingText="Sending…"
                >
                  Send request
                </Button>
                <Button variant="link" colorScheme="gray" size="sm" minH="44px" onClick={handleCancel}>
                  Cancel
                </Button>
              </Stack>
            </VStack>
          </Collapse>
        </>
      )}
    </Box>
  );
};

export default BuyerDocRequestCTA;
