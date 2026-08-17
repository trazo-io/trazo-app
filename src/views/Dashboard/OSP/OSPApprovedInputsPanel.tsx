/**
 * OSP Approved Inputs panel — Sprint 5.1 GA closer.
 *
 * Lets the farmer manage the OSP's approved-inputs list (the list the drift
 * detector cross-checks ChemicalEvent / SoilManagementEvent saves against).
 *
 * Backend contract:
 *   - GET  /osps/{id}/  exposes approved_national_list_substances + approved_omri_products
 *   - POST /osps/{id}/add-approved-input/    body: { kind, id }
 *   - POST /osps/{id}/remove-approved-input/ body: { kind, id }
 *   - GET  /certifications/verify-input/?name= → resolves text to NL/OMRI pks
 *
 * Both add/remove endpoints synchronously re-run the drift detector on every
 * event for the establishment, so a successful add immediately clears any
 * matching drift_warning the next time the producer dashboard is loaded.
 */

import React, { useRef, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  Input,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCheckCircle, FaPlus } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardCard, StandardSearchInput } from 'components/Design/StandardComponents';
import {
  useAddApprovedInputMutation,
  useLazyVerifyInputQuery,
  useRemoveApprovedInputMutation
} from 'store/api/ospApi';
import type { ApprovedInputChangeLog, ApprovedInputKind, InputVerifyResult, OSP } from 'types/osp';

interface ChangeLogSectionProps {
  logs: ApprovedInputChangeLog[];
  subtextColor: string;
}

/**
 * Collapsible change-log panel (Accordion) rendered below the search block.
 * Shows newest-first entries with action badge, date, input name, and any
 * certifier-notification reference supplied at the time of the change.
 * Satisfies § 205.400(f)(1) inspector query: "when was X added, what letter covers it?"
 */
const ChangeLogSection: React.FC<ChangeLogSectionProps> = ({ logs, subtextColor }) => {
  const intl = useIntl();
  const addedBg = 'green.50';
  const removedBg = 'red.50';

  return (
    <>
      <Divider mt={2} />
      <Accordion allowToggle mt={2}>
        <AccordionItem border="none">
          <AccordionButton px={0} py={2} _hover={{ bg: 'transparent' }}>
            <Box flex="1" textAlign="left">
              <Text fontWeight="semibold" fontSize="sm">
                {intl.formatMessage({ id: 'osp.approvedInputs.log.title' })}
                <Text as="span" fontWeight="normal" color={subtextColor} ml={2} fontSize="xs">
                  ({logs.length})
                </Text>
              </Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel px={0} pb={2}>
            {logs.length === 0 ? (
              <Text fontSize="xs" color={subtextColor}>
                {intl.formatMessage({ id: 'osp.approvedInputs.log.empty' })}
              </Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {logs.map((entry) => {
                  const isAdded = entry.action === 'added';
                  const date = new Date(entry.changed_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  return (
                    <Box
                      key={entry.id}
                      p={2}
                      borderRadius="md"
                      bg={isAdded ? addedBg : removedBg}
                      borderLeft="3px solid"
                      borderLeftColor={isAdded ? 'green.400' : 'red.400'}>
                      <HStack spacing={2} mb={entry.change_notification_reference ? 1 : 0}>
                        <Badge
                          colorScheme={isAdded ? 'green' : 'red'}
                          fontSize="11px"
                          textTransform="uppercase">
                          {intl.formatMessage({
                            id: isAdded
                              ? 'osp.approvedInputs.log.action.added'
                              : 'osp.approvedInputs.log.action.removed'
                          })}
                        </Badge>
                        <Text fontSize="xs" fontWeight="semibold" flex={1} noOfLines={1}>
                          {entry.target_name_at_change}
                        </Text>
                        <Text fontSize="xs" color={subtextColor} flexShrink={0}>
                          {date}
                        </Text>
                      </HStack>
                      {entry.change_notification_reference && (
                        <Text fontSize="xs" color={subtextColor} fontStyle="italic">
                          {intl.formatMessage({ id: 'osp.approvedInputs.log.ref' })}:{' '}
                          {entry.change_notification_reference}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </VStack>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
};

interface OSPApprovedInputsPanelProps {
  companyId: string;
  farmId: string;
  osp: OSP;
}

const OSPApprovedInputsPanel: React.FC<OSPApprovedInputsPanelProps> = ({
  companyId,
  farmId,
  osp
}) => {
  const intl = useIntl();
  const toast = useToast();

  const subtextColor = useColorModeValue('gray.600', 'gray.400');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');

  const [query, setQuery] = useState('');
  const [certRef, setCertRef] = useState('');
  const [verify, { data: verifyResult, isFetching: searching, isUninitialized }] =
    useLazyVerifyInputQuery();
  const [addInput, { isLoading: adding }] = useAddApprovedInputMutation();
  const [removeInput, { isLoading: removing }] = useRemoveApprovedInputMutation();

  // Remove confirmation — approved_inputs are regulatory records; an accidental
  // click on the × should not silently delete. Certifiers may audit the
  // change history of this list, so removals need intent.
  const [pendingRemove, setPendingRemove] = useState<{
    kind: ApprovedInputKind;
    id: number;
    label: string;
  } | null>(null);
  const [removeCertRef, setRemoveCertRef] = useState('');
  const cancelRemoveRef = useRef<HTMLButtonElement | null>(null);

  // Active OSPs are what the drift detector reads. Drafts are editable so the
  // farmer can pre-stage inputs before submission. Submitted OSPs are LOCKED
  // (snapshot PDF has already shipped to the certifier) — matches backend
  // _ensure_approved_inputs_editable gate.
  const isActive = osp.status === 'active';
  const isEditable = osp.status === 'draft' || osp.status === 'active';

  const nlList = osp.approved_national_list_substances || [];
  const omriList = osp.approved_omri_products || [];
  const wsdaList = osp.approved_wsda_materials || [];
  const totalApproved = nlList.length + omriList.length + wsdaList.length;

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      await verify({ name: trimmed }).unwrap();
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.error.search' }),
        description: String(err?.data?.error || err?.message || err),
        duration: 5000
      });
    }
  };

  const handleAdd = async (kind: ApprovedInputKind, id: number, label: string) => {
    try {
      await addInput({
        companyId,
        farmId,
        ospId: osp.id,
        kind,
        id,
        change_notification_reference: certRef.trim() || undefined
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.approvedInputs.toast.added' }, { name: label }),
        duration: 4000
      });
      setQuery('');
      setCertRef('');
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.error.add' }),
        description: String(err?.data?.error || err?.message || err),
        duration: 5000
      });
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;
    const { kind, id, label } = pendingRemove;
    try {
      await removeInput({
        companyId,
        farmId,
        ospId: osp.id,
        kind,
        id,
        change_notification_reference: removeCertRef.trim() || undefined
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'osp.approvedInputs.toast.removed' }, { name: label }),
        duration: 4000
      });
      setPendingRemove(null);
      setRemoveCertRef('');
    } catch (err: any) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'osp.approvedInputs.error.remove' }),
        description: String(err?.data?.error || err?.message || err),
        duration: 5000
      });
      setPendingRemove(null);
      setRemoveCertRef('');
    }
  };

  const renderSearchResult = (result: InputVerifyResult) => {
    if (!result) return null;
    const omriAlreadyApproved =
      result.omri_product_pk != null && omriList.some((p) => p.id === result.omri_product_pk);
    const nlAlreadyApproved =
      result.national_list_substance_pk != null &&
      nlList.some((s) => s.id === result.national_list_substance_pk);
    const wsdaAlreadyApproved =
      result.wsda_material_pk != null && wsdaList.some((w) => w.id === result.wsda_material_pk);

    const hasOMRI = result.omri_product_pk != null;
    const hasNL = result.national_list_substance_pk != null;
    const hasWSDA = result.wsda_material_pk != null;

    if (!hasOMRI && !hasNL && !hasWSDA) {
      // Trazo's OMRI catalog is a licensed reference subset, not the full
      // ~6,000-product listing, so "no match" is the COMMON case for a real
      // grower, not the exception. The old copy stated the consequence
      // (events keep flagging as drift) and offered no action — a dead end on
      // the flagship feature. Name the two routes that actually work.
      return (
        <Alert status="warning" fontSize="sm" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <VStack align="stretch" spacing={1}>
            <Text>{intl.formatMessage({ id: 'osp.approvedInputs.search.noMatch' })}</Text>
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.search.noMatchNextStep' })}
            </Text>
          </VStack>
        </Alert>
      );
    }

    return (
      <VStack align="stretch" spacing={2} mt={3}>
        <Text fontSize="xs" color={subtextColor}>
          {intl.formatMessage({ id: 'osp.approvedInputs.search.results' })}
        </Text>
        {hasOMRI && (
          <Flex
            p={3}
            bg={sectionBg}
            borderRadius="md"
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap">
            <VStack align="start" spacing={0} minW={0} flex={1}>
              <HStack spacing={2}>
                <Badge colorScheme="purple" fontSize="11px">
                  OMRI
                </Badge>
                {result.omri_product_id && (
                  <Text fontSize="xs" color={subtextColor}>
                    #{result.omri_product_id}
                  </Text>
                )}
              </HStack>
              <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                {result.omri_product_name}
              </Text>
            </VStack>
            {omriAlreadyApproved ? (
              <HStack color="green.600" fontSize="sm">
                <Icon as={FaCheckCircle} />
                <Text>{intl.formatMessage({ id: 'osp.approvedInputs.search.alreadyAdded' })}</Text>
              </HStack>
            ) : (
              <Button
                size="sm"
                colorScheme="green"
                leftIcon={<FaPlus />}
                isLoading={adding}
                onClick={() =>
                  handleAdd(
                    'omri',
                    result.omri_product_pk as number,
                    result.omri_product_name || ''
                  )
                }>
                {intl.formatMessage({ id: 'osp.approvedInputs.search.add' })}
              </Button>
            )}
          </Flex>
        )}
        {hasNL && (
          <Flex
            p={3}
            bg={sectionBg}
            borderRadius="md"
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap">
            <VStack align="start" spacing={0} minW={0} flex={1}>
              <HStack spacing={2}>
                <Badge colorScheme="blue" fontSize="11px">
                  {intl.formatMessage({ id: 'osp.approvedInputs.kind.national_list' })}
                </Badge>
                {result.national_list_cfr_section && (
                  <Text fontSize="xs" color={subtextColor}>
                    {result.national_list_cfr_section}
                  </Text>
                )}
              </HStack>
              <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                {result.national_list_substance_name}
              </Text>
            </VStack>
            {nlAlreadyApproved ? (
              <HStack color="green.600" fontSize="sm">
                <Icon as={FaCheckCircle} />
                <Text>{intl.formatMessage({ id: 'osp.approvedInputs.search.alreadyAdded' })}</Text>
              </HStack>
            ) : (
              <Button
                size="sm"
                colorScheme="green"
                leftIcon={<FaPlus />}
                isLoading={adding}
                onClick={() =>
                  handleAdd(
                    'national_list',
                    result.national_list_substance_pk as number,
                    result.national_list_substance_name || ''
                  )
                }>
                {intl.formatMessage({ id: 'osp.approvedInputs.search.add' })}
              </Button>
            )}
          </Flex>
        )}
        {hasWSDA && (
          <Flex
            p={3}
            bg={sectionBg}
            borderRadius="md"
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap">
            <VStack align="start" spacing={0} minW={0} flex={1}>
              <HStack spacing={2}>
                <Badge colorScheme="teal" fontSize="11px">
                  WSDA
                </Badge>
                {result.wsda_material_id && (
                  <Text fontSize="xs" color={subtextColor}>
                    {result.wsda_material_id}
                  </Text>
                )}
                {result.wsda_material_category && (
                  <Text fontSize="xs" color={subtextColor} textTransform="capitalize">
                    {result.wsda_material_category}
                  </Text>
                )}
              </HStack>
              <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                {result.wsda_material_name}
              </Text>
            </VStack>
            {wsdaAlreadyApproved ? (
              <HStack color="green.600" fontSize="sm">
                <Icon as={FaCheckCircle} />
                <Text>{intl.formatMessage({ id: 'osp.approvedInputs.search.alreadyAdded' })}</Text>
              </HStack>
            ) : (
              <Button
                size="sm"
                colorScheme="green"
                leftIcon={<FaPlus />}
                isLoading={adding}
                onClick={() =>
                  handleAdd(
                    'wsda',
                    result.wsda_material_pk as number,
                    result.wsda_material_name || ''
                  )
                }>
                {intl.formatMessage({ id: 'osp.approvedInputs.search.add' })}
              </Button>
            )}
          </Flex>
        )}
      </VStack>
    );
  };

  return (
    <StandardCard mt={4}>
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="start" wrap="wrap" gap={2}>
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" fontSize="md">
              {intl.formatMessage({ id: 'osp.approvedInputs.title' })}
            </Text>
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.cfr' })}
            </Text>
          </VStack>
          <Badge colorScheme={totalApproved > 0 ? 'green' : 'gray'} variant="subtle" fontSize="xs">
            {intl.formatMessage({ id: 'osp.approvedInputs.count' }, { count: totalApproved })}
          </Badge>
        </Flex>

        {!isEditable && (
          <Alert status="warning" fontSize="xs" borderRadius="md">
            <AlertIcon />
            <Text>{intl.formatMessage({ id: 'osp.approvedInputs.lockedHint' })}</Text>
          </Alert>
        )}
        {isEditable && !isActive && (
          <Alert status="info" fontSize="xs" borderRadius="md">
            <AlertIcon />
            <Text>{intl.formatMessage({ id: 'osp.approvedInputs.notActiveHint' })}</Text>
          </Alert>
        )}
        {/* P0-5 — Registry ↔ § 205.201(a)(2) narrative sync warning. Inspector
            reads "registered inputs not mentioned in narrative" as an incomplete
            OSP filing. The diff is computed server-side and carried on the OSP
            serializer. */}
        {osp.registry_sync_diff?.has_warning && (
          <Alert status="warning" fontSize="xs" borderRadius="md" alignItems="start">
            <AlertIcon />
            <VStack align="start" spacing={1} flex={1}>
              {osp.registry_sync_diff.entries_not_in_narrative.length > 0 ? (
                <>
                  <Text fontWeight="semibold">
                    {intl.formatMessage(
                      { id: 'osp.approvedInputs.syncDiff.notInNarrative' },
                      {
                        count: osp.registry_sync_diff.entries_not_in_narrative.length
                      }
                    )}
                  </Text>
                  <Text color={subtextColor}>
                    {osp.registry_sync_diff.entries_not_in_narrative
                      .slice(0, 5)
                      .map((e) => `${e.source}: ${e.name}`)
                      .join(' · ')}
                    {osp.registry_sync_diff.entries_not_in_narrative.length > 5 && ' …'}
                  </Text>
                </>
              ) : (
                <Text>
                  {intl.formatMessage(
                    { id: 'osp.approvedInputs.syncDiff.narrativeLongRegistryThin' },
                    {
                      chars: osp.registry_sync_diff.narrative_char_count,
                      registry: osp.registry_sync_diff.registry_total
                    }
                  )}
                </Text>
              )}
            </VStack>
          </Alert>
        )}

        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {intl.formatMessage({ id: 'osp.approvedInputs.section.omri' })}
            <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
              ({omriList.length})
            </Text>
          </Text>
          {omriList.length === 0 ? (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.empty.omri' })}
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {omriList.map((p) => (
                <Tooltip
                  key={`omri-${p.id}`}
                  label={p.omri_id ? `OMRI #${p.omri_id}` : undefined}
                  hasArrow>
                  <Tag size="md" colorScheme="purple" borderRadius="md">
                    <TagLabel>{p.product_name}</TagLabel>
                    <TagCloseButton
                      isDisabled={!isEditable}
                      onClick={() =>
                        setPendingRemove({
                          kind: 'omri',
                          id: p.id,
                          label: p.product_name
                        })
                      }
                      aria-label={intl.formatMessage(
                        { id: 'osp.approvedInputs.removeAria' },
                        { name: p.product_name }
                      )}
                    />
                  </Tag>
                </Tooltip>
              ))}
            </Flex>
          )}
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {intl.formatMessage({ id: 'osp.approvedInputs.section.national_list' })}
            <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
              ({nlList.length})
            </Text>
          </Text>
          {nlList.length === 0 ? (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.empty.national_list' })}
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {nlList.map((s) => (
                <Tooltip key={`nl-${s.id}`} label={s.cfr_section || undefined} hasArrow>
                  <Tag size="md" colorScheme="blue" borderRadius="md">
                    <TagLabel>{s.substance_name}</TagLabel>
                    <TagCloseButton
                      isDisabled={!isEditable}
                      onClick={() =>
                        setPendingRemove({
                          kind: 'national_list',
                          id: s.id,
                          label: s.substance_name
                        })
                      }
                      aria-label={intl.formatMessage(
                        { id: 'osp.approvedInputs.removeAria' },
                        { name: s.substance_name }
                      )}
                    />
                  </Tag>
                </Tooltip>
              ))}
            </Flex>
          )}
        </Box>

        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {intl.formatMessage({ id: 'osp.approvedInputs.section.wsda' })}
            <Text as="span" color={subtextColor} fontWeight="normal" ml={2}>
              ({wsdaList.length})
            </Text>
          </Text>
          {wsdaList.length === 0 ? (
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'osp.approvedInputs.empty.wsda' })}
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {wsdaList.map((w) => (
                <Tooltip
                  key={`wsda-${w.id}`}
                  label={w.wsda_id ? `WSDA ${w.wsda_id}` : undefined}
                  hasArrow>
                  <Tag size="md" colorScheme="teal" borderRadius="md">
                    <TagLabel>{w.brand_name}</TagLabel>
                    <TagCloseButton
                      isDisabled={!isEditable}
                      onClick={() =>
                        setPendingRemove({
                          kind: 'wsda',
                          id: w.id,
                          label: w.brand_name
                        })
                      }
                      aria-label={intl.formatMessage(
                        { id: 'osp.approvedInputs.removeAria' },
                        { name: w.brand_name }
                      )}
                    />
                  </Tag>
                </Tooltip>
              ))}
            </Flex>
          )}
        </Box>

        {isEditable && (
          <Box>
            <Text fontWeight="semibold" fontSize="sm" mb={2}>
              {intl.formatMessage({ id: 'osp.approvedInputs.search.title' })}
            </Text>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={2}>
              <StandardSearchInput
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter' && !searching && query.trim()) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder={intl.formatMessage({
                  id: 'osp.approvedInputs.search.placeholder'
                })}
                flex="1"
              />
              <Button
                size="sm"
                // 44px to match the field beside it and the project's touch-target floor.
                // No leftIcon: the field now carries the magnifier, and two in a row read as
                // two different actions.
                minH="44px"
                colorScheme="green"
                onClick={handleSearch}
                isLoading={searching}
                isDisabled={!query.trim()}
                flexShrink={0}>
                {intl.formatMessage({ id: 'osp.approvedInputs.search.button' })}
              </Button>
            </Stack>
            <Text fontSize="xs" color={subtextColor} mt={1}>
              {intl.formatMessage({ id: 'osp.approvedInputs.search.hint' })}
            </Text>
            {!isUninitialized && verifyResult && renderSearchResult(verifyResult)}
            {/*
              Cert-notification reference is placed BELOW the results so the
              farmer reads in natural order: search → results → (optional ref) → Add.
              Only shown when results exist — no point asking for a ref when
              there's nothing to add yet.
            */}
            {!isUninitialized &&
              verifyResult &&
              (verifyResult.omri_product_pk != null ||
                verifyResult.national_list_substance_pk != null ||
                verifyResult.wsda_material_pk != null) && (
                <FormControl mt={3}>
                  <FormLabel fontSize="xs" mb={1}>
                    {intl.formatMessage({ id: 'osp.approvedInputs.log.certRefLabel' })}
                  </FormLabel>
                  <Input
                    value={certRef}
                    onChange={(e) => setCertRef(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: 'osp.approvedInputs.log.certRefPlaceholder'
                    })}
                    size="sm"
                  />
                  <FormHelperText fontSize="xs">
                    {intl.formatMessage({ id: 'osp.approvedInputs.log.certRefHint' })}
                  </FormHelperText>
                </FormControl>
              )}
          </Box>
        )}
        <ChangeLogSection logs={osp.approved_input_changes || []} subtextColor={subtextColor} />
      </VStack>

      <AlertDialog
        isOpen={!!pendingRemove}
        leastDestructiveRef={cancelRemoveRef}
        onClose={() => !removing && setPendingRemove(null)}
        isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {intl.formatMessage({ id: 'osp.approvedInputs.removeConfirm.title' })}
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text mb={3}>
                {intl.formatMessage(
                  { id: 'osp.approvedInputs.removeConfirm.body' },
                  { name: pendingRemove?.label || '' }
                )}
              </Text>
              <Alert status="warning" fontSize="xs" borderRadius="md" mb={3}>
                <AlertIcon />
                <Text>
                  {intl.formatMessage({
                    id: 'osp.approvedInputs.removeConfirm.warning'
                  })}
                </Text>
              </Alert>
              <FormControl>
                <FormLabel fontSize="xs" mb={1}>
                  {intl.formatMessage({ id: 'osp.approvedInputs.log.certRefLabel' })}
                </FormLabel>
                <Input
                  value={removeCertRef}
                  onChange={(e) => setRemoveCertRef(e.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'osp.approvedInputs.log.certRefPlaceholder'
                  })}
                  size="sm"
                />
                <FormHelperText fontSize="xs">
                  {intl.formatMessage({ id: 'osp.approvedInputs.log.certRefHint' })}
                </FormHelperText>
              </FormControl>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRemoveRef}
                onClick={() => setPendingRemove(null)}
                isDisabled={removing}>
                {intl.formatMessage({ id: 'osp.approvedInputs.removeConfirm.cancel' })}
              </Button>
              <Button colorScheme="red" onClick={handleConfirmRemove} ml={3} isLoading={removing}>
                {intl.formatMessage({ id: 'osp.approvedInputs.removeConfirm.confirm' })}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </StandardCard>
  );
};

export default OSPApprovedInputsPanel;
