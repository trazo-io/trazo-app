/**
 * Brand owners on the plan's G7.0 page C: CCOF G7.0 C, OTCO C8 8.3, WSDA 2121 N 6-7.
 *
 * The plan-layer view of the brand-owner register, read-only, with a link to its one editor on the
 * farm profile. Two editors would let one brand owner be described two ways. The link saves the
 * wizard page first: answers autosave on page advance only.
 */
import React from 'react';
import { Box, HStack, Icon, Skeleton, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { FaExclamationTriangle, FaTag } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { StandardButton, STATUS_URGENCY_TOKENS } from 'components/Design/StandardComponents';
import { useGetBrandOwnersQuery, type BrandOwner } from 'store/api/brandOwnerApi';
import BrandOwnerStateLine from './BrandOwnerStateLine';

interface Props {
  companyId: string;
  farmId: string;
  onNavigateAway?: () => Promise<boolean> | boolean;
}

const OSPBrandOwnersPanel: React.FC<Props> = ({ companyId, farmId, onNavigateAway }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const subtext = useColorModeValue('gray.600', 'gray.300');
  const scoped = Boolean(companyId && farmId);
  const { data, isLoading, isError, error } = useGetBrandOwnersQuery(
    { companyId, farmId },
    { skip: !scoped }
  );

  const open = async (owner?: BrandOwner) => {
    if (onNavigateAway && !(await onNavigateAway())) return;
    navigate(
      `/admin/dashboard/farm/${farmId}/profile${
        owner ? `?brandOwner=${owner.id}` : ''
      }#brand-owners`
    );
  };

  if (isLoading) return <Skeleton height="80px" borderRadius="md" />;

  // A failed fetch is not an absence: "no brand owner recorded" would be a claim made by an error.
  if (isError || !scoped) {
    const forbidden = (error as { status?: number } | undefined)?.status === 403;
    return (
      <Box p={3} bg={cardBg} borderRadius="md">
        <HStack spacing={2} align="flex-start" color={STATUS_URGENCY_TOKENS.crit.text}>
          <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
          <Text fontSize="sm">
            {intl.formatMessage({
              id: forbidden ? 'osp.brandOwners.forbidden' : 'osp.brandOwners.loadFailed'
            })}
          </Text>
        </HStack>
      </Box>
    );
  }

  const owners = data ?? [];
  if (!owners.length) {
    return (
      <Box p={3} bg={cardBg} borderRadius="md" data-testid="osp-brand-owners-empty">
        <Text fontSize="sm" color={subtext}>
          {intl.formatMessage({ id: 'osp.brandOwners.empty' })}
        </Text>
        <StandardButton size="sm" variant="ghost" mt={1} onClick={() => open()}>
          {intl.formatMessage({ id: 'osp.brandOwners.add' })}
        </StandardButton>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {owners.map((owner) => {
        const products = owner.products
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean);
        return (
          <Box key={owner.id} p={3} bg={cardBg} borderRadius="md" data-testid="osp-brand-owner">
            <HStack spacing={2} align="flex-start">
              <Icon as={FaTag} color="green.700" mt="3px" />
              <VStack align="stretch" spacing={1} flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="semibold">
                  {owner.name}
                </Text>
                {owner.brand_names ? (
                  <Text fontSize="xs" color={subtext}>
                    {intl.formatMessage(
                      { id: 'brandOwners.brandsLine' },
                      { brands: owner.brand_names.split('\n').filter(Boolean).join('; ') }
                    )}
                  </Text>
                ) : null}
                <BrandOwnerStateLine owner={owner} />
                <Text fontSize="xs" color={subtext}>
                  {products.length
                    ? intl.formatMessage(
                        { id: 'osp.brandOwners.products' },
                        { products: products.join('; ') }
                      )
                    : intl.formatMessage({ id: 'osp.brandOwners.noProducts' })}
                </Text>
                <Box>
                  <StandardButton size="sm" variant="ghost" onClick={() => open(owner)}>
                    {intl.formatMessage({ id: 'osp.brandOwners.open' })}
                  </StandardButton>
                </Box>
              </VStack>
            </HStack>
          </Box>
        );
      })}
      <Text fontSize="xs" color={subtext}>
        {intl.formatMessage({ id: 'osp.brandOwners.ownRecords' })}
      </Text>
    </VStack>
  );
};

export default OSPBrandOwnersPanel;
