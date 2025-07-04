/*!

=========================================================
* Purity UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/purity-ui-dashboard-pro
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)

* Design by Creative Tim & Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

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
  const { establishmentId } = useParams();
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [showAllScans, setShowAllScans] = useState(false);
  // Chakra Color Mode
  const textColor = useColorModeValue('gray.700', 'white');

  const handleExpandRow = (index) => {
    setExpandedRowId(expandedRowId === index ? null : index);
  };

  const handleViewAllScans = () => {
    // Navigate to dedicated scans page
    navigate(`/admin/dashboard/establishment/${establishmentId}/scans`);
  };

  // Show limited scans initially, all when requested
  const displayedScans = showAllScans ? scansData : scansData?.slice(0, 10);

  return (
    <StandardCard
      title={title}
      variant="elevated"
      headerAction={
        <StandardButton variant="outline" size="sm" onClick={handleViewAllScans}>
          {intl.formatMessage({ id: 'app.viewAll' })}
        </StandardButton>
      }
    >
      <VStack spacing={4} align="stretch">
        <Box
          overflowX="auto"
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          maxH="600px"
          overflowY="auto"
        >
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
                      letterSpacing="wider"
                      py={4}
                      px={6}
                      borderBottom="2px solid"
                      borderColor="gray.200"
                    >
                      {label}
                    </Th>
                  );
                })}
              </Tr>
            </Thead>
            <Tbody>
              {displayedScans && displayedScans.length > 0 ? (
                displayedScans.map((scan, index) => (
                  <React.Fragment key={index}>
                    <ScansRow
                      {...scan}
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
                            boxShadow="sm"
                          >
                            <Text
                              color={textColor}
                              fontSize="sm"
                              lineHeight="1.6"
                              fontStyle={scan.comment ? 'normal' : 'italic'}
                            >
                              {scan.comment || 'Sin comentarios adicionales'}
                            </Text>
                          </Box>
                        </Td>
                      </Tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <Tr>
                  <Td colSpan={labels.length} borderBottom="none">
                    <Flex justify="center" align="center" py={12}>
                      <VStack spacing={3}>
                        <Text color="gray.500" fontSize="lg" fontWeight="medium">
                          {intl.formatMessage({ id: 'app.noScansAvailable' })}
                        </Text>
                        <Text color="gray.400" fontSize="sm" textAlign="center">
                          Los escaneos aparecerán aquí cuando los consumidores interactúen con tus
                          productos
                        </Text>
                      </VStack>
                    </Flex>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>

        {/* Show More/Less Controls */}
        {scansData && scansData.length > 10 && (
          <Flex justify="space-between" align="center" pt={2}>
            <Text fontSize="sm" color="gray.600">
              Mostrando {displayedScans?.length || 0} de {scansData.length} escaneos
            </Text>
            <Flex gap={2}>
              {!showAllScans ? (
                <StandardButton variant="outline" size="sm" onClick={() => setShowAllScans(true)}>
                  Ver todos
                </StandardButton>
              ) : (
                <StandardButton variant="outline" size="sm" onClick={() => setShowAllScans(false)}>
                  Ver menos
                </StandardButton>
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
