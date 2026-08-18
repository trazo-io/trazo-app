// Chakra imports
import {
  Button,
  Flex,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  Td,
  useColorModeValue,
  Box,
  VStack
} from '@chakra-ui/react';

// Custom components
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import React, { useState } from 'react';
import ScansRow from 'components/Tables/ScansRow';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';

const ScansList = ({ title, labels, scansData }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { farmId } = useParams();
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [showAllScans, setShowAllScans] = useState(false);
  // Chakra Color Mode
  const textColor = useColorModeValue('gray.700', 'white');

  const handleExpandRow = (index) => {
    setExpandedRowId(expandedRowId === index ? null : index);
  };

  const handleViewAllScans = () => {
    // Navigate to dedicated scans page
    navigate(`/admin/dashboard/farm/${farmId}/scans`);
  };

  // Show limited scans initially, all when requested
  const displayedScans = showAllScans ? scansData : scansData?.slice(0, 10);

  return (
    <StandardCard title={title} variant="elevated" padding={{ base: 2, md: 4 }}>
      <VStack spacing={4} align="stretch">
        <Box
          overflowX="auto"
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          maxH="600px"
          overflowY="auto">
          <Table variant="simple" size="sm">
            <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
              <Tr>
                {labels.map((label, index) => {
                  return (
                    <Th
                      key={index}
                      color="gray.600"
                      fontSize="xs"
                      fontWeight="semibold"
                      textTransform="uppercase"
                      letterSpacing={{ base: 'normal', md: 'wider' }}
                      py={{ base: 2, md: 3 }}
                      px={{ base: 2, md: 6 }}
                      borderBottom="2px solid"
                      borderColor="gray.200"
                      whiteSpace="nowrap">
                      {label}
                    </Th>
                  );
                })}
              </Tr>
            </Thead>
            <Tbody>
              {displayedScans && displayedScans.length > 0 ? (
                displayedScans.map((scan, index) => {
                  // Enhance scan data with intelligent defaults if backend doesn't provide them
                  const enhancedScan = {
                    ...scan,
                    // If backend doesn't provide these fields, calculate them intelligently
                    // DEFAULT ASSUMPTION: Most scans are from real humans (not bots)
                    bot_score:
                      scan.bot_score !== undefined
                        ? scan.bot_score
                        : scan.comment && scan.comment.trim().length > 0
                        ? 0.1
                        : 0.3, // Default to human-like (0.3 = 70% human)
                    engagement_score:
                      scan.engagement_score !== undefined
                        ? scan.engagement_score
                        : scan.comment && scan.comment.trim().length > 0
                        ? 0.8
                        : 0.4, // Default to medium engagement
                    is_duplicate: scan.is_duplicate !== undefined ? scan.is_duplicate : false,
                    is_verified_human:
                      scan.is_verified_human !== undefined ? scan.is_verified_human : false,
                    consent_given: scan.consent_given !== undefined ? scan.consent_given : true
                  };

                  return (
                    <React.Fragment key={index}>
                      <ScansRow
                        {...enhancedScan}
                        isExpanded={expandedRowId === index}
                        onExpand={() => handleExpandRow(index)}
                      />
                      {expandedRowId === index && (
                        <Tr>
                          <Td colSpan={labels.length} px={6} py={4} bg="green.50">
                            <Box
                              p={4}
                              bg="white"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="green.200"
                              boxShadow="sm">
                              <Text
                                color={textColor}
                                fontSize="sm"
                                lineHeight="1.6"
                                fontStyle={scan.comment ? 'normal' : 'italic'}>
                                {scan.comment ||
                                  intl.formatMessage({ id: 'commercial.noAdditionalComments' })}
                              </Text>
                            </Box>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={labels.length} borderBottom="none">
                    <Flex justify="center" align="center" py={12}>
                      <VStack spacing={3}>
                        <Text color="gray.500" fontSize="lg" fontWeight="medium">
                          {intl.formatMessage({ id: 'app.noScansAvailable' })}
                        </Text>
                        <Text color="gray.400" fontSize="sm" textAlign="center">
                          {intl.formatMessage({ id: 'commercial.scansWillAppear' })}
                        </Text>
                      </VStack>
                    </Flex>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>

        {/* Always show controls when there are scans */}
        {scansData && scansData.length > 0 && (
          <Flex justify="space-between" align="center" pt={2}>
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage(
                { id: 'commercial.showingScans' },
                { displayed: displayedScans?.length || 0, total: scansData.length }
              )}
            </Text>
            <Flex gap={2}>
              {/* Only show expand/collapse if more than 10 scans */}
              {scansData.length > 10 && (
                <>
                  {!showAllScans ? (
                    <StandardButton
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllScans(true)}>
                      {intl.formatMessage({ id: 'commercial.showAll' })}
                    </StandardButton>
                  ) : (
                    <StandardButton
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllScans(false)}>
                      {intl.formatMessage({ id: 'commercial.showLess' })}
                    </StandardButton>
                  )}
                </>
              )}
              <StandardButton variant="primary" size="sm" onClick={handleViewAllScans}>
                {intl.formatMessage({ id: 'app.viewAll' })}
              </StandardButton>
            </Flex>
          </Flex>
        )}
      </VStack>
    </StandardCard>
  );
};

export default ScansList;
