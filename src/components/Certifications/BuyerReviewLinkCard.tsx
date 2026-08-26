/**
 * "Share with a buyer" — mint, inspect and revoke BUYER review links (2026-08-25).
 *
 * The wholesale counterpart of CertifierLinkCard, and deliberately a different
 * card: the two audiences open two disjoint content classes. A certifier link
 * resolves the audit dossier (supplier invoices, prices, applicator names); a
 * buyer link resolves ONLY the claim-safe consumer surface — the same uniform
 * policy the public product page enforces — but in-season and before publish,
 * because the farmer consents by minting the link.
 *
 * No readiness gate here: readiness is a certifier-submission concept, and a
 * buyer link exists precisely for the months when the season is still open.
 * Same paywall shape as the certifier card: minting is a Compliance artifact,
 * listing and revoking are not (a lapsed farm must still be able to withdraw
 * live tokens).
 */
import React, { useState } from 'react';
import { Box, HStack, Icon, Link, Text, Tooltip, VStack, useToast } from '@chakra-ui/react';
import { FaCopy, FaEye, FaLink } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard, StandardInput } from 'components/Design/StandardComponents';
import {
  useCreateCertifierLinkMutation,
  useGetCertifierLinksQuery,
  useRevokeCertifierLinkMutation,
  type CertifierAccessLink
} from 'store/api/certifierLinkApi';
import {
  ComplianceExportsUpsell,
  useComplianceExports
} from 'components/Guards/ComplianceExportsGuard';
import { formatDateOnly } from 'utils/dateOnly';

interface Props {
  companyId: string;
  farmId: string;
  canWrite: boolean;
}

/** The buyer opens this, not the authenticated API path. */
const buyerReviewUrl = (token: string) => `${window.location.origin}/buyer-review/${token}`;

const formatDate = (value?: string | null) => formatDateOnly(value) ?? null;

const BuyerReviewLinkCard: React.FC<Props> = ({ companyId, farmId, canWrite }) => {
  const intl = useIntl();
  const toast = useToast();
  const canMintLinks = useComplianceExports();
  const [label, setLabel] = useState('');

  const { data: links = [], isLoading } = useGetCertifierLinksQuery({ companyId, farmId });
  const [createLink, { isLoading: creating }] = useCreateCertifierLinkMutation();
  const [revokeLink] = useRevokeCertifierLinkMutation();

  const activeLinks = links.filter((l) => l.is_active && l.audience === 'buyer');

  const handleCreate = async () => {
    try {
      await createLink({
        companyId,
        farmId,
        data: { label: label.trim(), audience: 'buyer' }
      }).unwrap();
      setLabel('');
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'buyerLink.toast.created' })
      });
    } catch {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'buyerLink.toast.createFailed' })
      });
    }
  };

  const handleCopy = async (link: CertifierAccessLink) => {
    try {
      await navigator.clipboard.writeText(buyerReviewUrl(link.token));
      toast({
        status: 'success',
        duration: 2000,
        title: intl.formatMessage({ id: 'buyerLink.toast.copied' })
      });
    } catch {
      toast({
        status: 'warning',
        title: intl.formatMessage({ id: 'buyerLink.toast.copyFailed' })
      });
    }
  };

  const handleRevoke = async (link: CertifierAccessLink) => {
    try {
      await revokeLink({ companyId, farmId, linkId: link.id }).unwrap();
      toast({
        status: 'info',
        title: intl.formatMessage({ id: 'buyerLink.toast.revoked' })
      });
    } catch {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'buyerLink.toast.revokeFailed' })
      });
    }
  };

  return (
    <StandardCard
      title={intl.formatMessage({ id: 'buyerLink.title' })}
      variant="elevated"
      padding={{ base: 0, md: 4 }}
      mb={0}>
      <VStack align="stretch" gap={3}>
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage({ id: 'buyerLink.description' })}
        </Text>

        {canWrite && !canMintLinks && <ComplianceExportsUpsell compact />}

        {canWrite && canMintLinks && (
          <HStack flexDirection={{ base: 'column', smd: 'row' }} gap={2} align="stretch">
            <StandardInput
              size="sm"
              value={label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              placeholder={intl.formatMessage({ id: 'buyerLink.labelPlaceholder' })}
            />
            <StandardButton
              size="sm"
              leftIcon={<Icon as={FaLink} />}
              onClick={handleCreate}
              isLoading={creating}
              w={{ base: 'full', smd: 'auto' }}
              flexShrink={0}>
              {intl.formatMessage({ id: 'buyerLink.create' })}
            </StandardButton>
          </HStack>
        )}

        {isLoading && (
          <Text fontSize="sm" color="gray.500">
            {intl.formatMessage({ id: 'certifierLink.loading' })}
          </Text>
        )}

        {!isLoading && canMintLinks && activeLinks.length === 0 && (
          <Text fontSize="sm" color="gray.500">
            {intl.formatMessage({ id: 'buyerLink.empty' })}
          </Text>
        )}

        {activeLinks.map((link, index) => (
          <Box
            key={link.id}
            borderTopWidth={index === 0 ? 0 : '1px'}
            borderColor="gray.100"
            pt={index === 0 ? 0 : 3}>
            <VStack align="stretch" gap={2}>
              <HStack justify="space-between" align="baseline" gap={3} flexWrap="wrap">
                <Text fontSize="sm" fontWeight="semibold" color="gray.800" minW={0}>
                  {link.label || intl.formatMessage({ id: 'buyerLink.unlabelled' })}
                </Text>
                <HStack gap={2} flexWrap="wrap" justify="flex-end">
                  <Tooltip
                    label={
                      link.last_accessed_at
                        ? intl.formatMessage(
                            { id: 'certifierLink.lastOpened' },
                            { date: formatDate(link.last_accessed_at) }
                          )
                        : intl.formatMessage({ id: 'certifierLink.neverOpened' })
                    }>
                    <HStack gap={1} color="gray.500" fontSize="xs">
                      <Icon as={FaEye} boxSize={3} />
                      <Text>{link.access_count}</Text>
                    </HStack>
                  </Tooltip>
                  <Text fontSize="xs" color="gray.500">
                    {intl.formatMessage(
                      { id: 'buyerLink.expires' },
                      { date: formatDate(link.expires_at) ?? '' }
                    )}
                  </Text>
                </HStack>
              </HStack>
              <HStack gap={2}>
                <StandardInput
                  size="sm"
                  value={buyerReviewUrl(link.token)}
                  isReadOnly
                  fontSize="xs"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                />
                <StandardButton
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={FaCopy} />}
                  onClick={() => handleCopy(link)}
                  flexShrink={0}>
                  {intl.formatMessage({ id: 'buyerLink.copy' })}
                </StandardButton>
                {/* Same de-emphasised destructive pattern as CertifierLinkCard: a quiet
                    link that turns red on hover, not a 44px button competing with Copy. */}
                {canWrite && (
                  <Link
                    as="button"
                    type="button"
                    fontSize="xs"
                    color="gray.500"
                    fontWeight="medium"
                    flexShrink={0}
                    _hover={{ color: 'red.600' }}
                    onClick={() => handleRevoke(link)}>
                    {intl.formatMessage({ id: 'buyerLink.revoke' })}
                  </Link>
                )}
              </HStack>
            </VStack>
          </Box>
        ))}
      </VStack>
    </StandardCard>
  );
};

export default BuyerReviewLinkCard;
