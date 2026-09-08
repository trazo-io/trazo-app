/**
 * The screen-side half of the Starter/Compliance boundary.
 *
 * Starter is bounded by what it can PRODUCE, not by how much it can log (backend: migration
 * `subscriptions/0014`, enforcement: `subscriptions/gating.py`). The certifier artifacts — the
 * OSP renewal packet and its module PDFs, the audit dossiers, the CA PUR export and the certifier
 * review link — are what the paid tier buys.
 *
 * That gate MUST also exist before the click. Enforcement alone means a farmer fills in a
 * certification type, picks a month, presses Download, waits, and gets a red toast — the app
 * offering something it already knows it will refuse. This renders the boundary as a state of the
 * page instead: what the section is for, that the records are already theirs, and the one link
 * that changes the answer.
 *
 * Deliberately NOT a route guard. It wraps a section, because the surrounding page (the farm
 * profile) is entirely available on Starter — only this one group of actions is not.
 */
import React from 'react';
import { Box, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { FaFileSignature } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import { RootState } from 'store';

/**
 * Whether the active company's plan includes the certifier documents.
 *
 * Reads `effective_limits` first — that is the plan's features merged with purchased add-ons, so
 * it is the same number the backend gate answers with — and falls back to the raw plan features
 * for any payload assembled before `effective_limits` existed.
 *
 * Defaults to FALSE while the company is still loading. A gate that opens on missing data would
 * flash the export buttons on every page load and then retract them, which reads as a bug and, on
 * a slow connection, is long enough to click.
 */
export const useComplianceExports = (): boolean => {
  const company = useSelector((state: RootState) => (state as any)?.company?.currentCompany);
  const subscription = company?.subscription;
  const fromEffective = subscription?.effective_limits?.compliance_exports;
  if (typeof fromEffective === 'boolean') return fromEffective;
  return subscription?.plan?.features?.compliance_exports === true;
};

interface Props {
  children: React.ReactNode;
  /** Optional override, for a surface that has the flag already and does not want a second read. */
  allowed?: boolean;
}

/**
 * The upsell on its own, for a surface that gates PART of itself.
 *
 * CertifierLinkCard is the case: the backend gates minting a link but deliberately not listing or
 * revoking one, so that a farm which lapses to Starter can still withdraw a token its certifier
 * already holds. Wrapping that whole card in the Guard would have honoured the paywall and broken
 * the revocation path in the same stroke.
 */
export const ComplianceExportsUpsell: React.FC<{ compact?: boolean; messageId?: string }> = ({
  compact = false,
  // WHICH document is behind the wall, said in the compact line. The default names the
  // certifier link because that was the first surface to use it; the OSP page passes its own,
  // because "Creating a new certifier link is part of the Compliance plan" above a Download
  // packet button answers a question the grower did not ask.
  messageId = 'app.complianceExports.compact'
}) => {
  const intl = useIntl();
  const navigate = useNavigate();

  // COMPACT is for a surface that sits directly above or below the full card.
  //
  // Measured on the live farm profile (2026-08-15, Starter plan): the first cut rendered the full
  // card twice in a row — once inside CertifierLinkCard replacing its create half, once for the
  // export section below it — so the page said "Certifier documents are part of Compliance",
  // verbatim and at full size, twice within one screen. One line inside the card, one card for
  // the section.
  // `align="center"`, not "baseline": a Button's baseline is its own label box, so
  // baseline-aligning it against a paragraph drops the control a few pixels below the text it
  // belongs to.
  if (compact) {
    return (
      <HStack gap={2} align="center" flexWrap="wrap">
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage({ id: messageId })}
        </Text>
        {/* `ghost`, not `link`: StandardButton's variant union is
            'primary' | 'secondary' | 'outline' | 'ghost' — a `link` variant does not exist and
            would have silently fallen through to the default primary fill, painting a solid
            button inside a one-line note. */}
        <StandardButton
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/dashboard/pricing')}>
          {intl.formatMessage({ id: 'app.complianceExports.cta' })}
        </StandardButton>
      </HStack>
    );
  }

  return (
    <StandardCard variant="elevated" padding={{ base: 0, md: 5 }} mb={0}>
      <VStack align="flex-start" gap={3} w="100%">
        <HStack gap={3} align="flex-start">
          {/* green.500 is a decorative fill here, never a text or icon colour on white —
              it fails AA at 2.78:1. The icon sits on a tint, the text uses green.700. */}
          <Box bg="green.50" borderRadius="md" p={2} flexShrink={0}>
            <Icon as={FaFileSignature} boxSize={5} color="green.700" />
          </Box>
          <VStack align="flex-start" gap={1}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
              {intl.formatMessage({ id: 'app.complianceExports.title' })}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'app.complianceExports.body' })}
            </Text>
            {/* The reassurance, said where the paywall is: a grower meeting a wall is exactly
                the person wondering whether a season of their own records is now hostage.
                Worded as CONTINUED ACCESS, not portability — it used to say "your records stay
                yours", which a farmer reasonably reads as "I can take them with me", and Trazo
                currently has no plain data export (the only exports are the certifier artifacts,
                which are what this card is gating). Do not restore a portability claim here until
                a free CSV export of a farm's own records exists. */}
            <Text fontSize="xs" color="gray.500">
              {intl.formatMessage({ id: 'app.complianceExports.recordsAreYours' })}
            </Text>
          </VStack>
        </HStack>
        <StandardButton
          variant="primary"
          size="sm"
          onClick={() => navigate('/admin/dashboard/pricing')}
          w={{ base: 'full', smd: 'auto' }}>
          {intl.formatMessage({ id: 'app.complianceExports.cta' })}
        </StandardButton>
      </VStack>
    </StandardCard>
  );
};

export const ComplianceExportsGuard: React.FC<Props> = ({ children, allowed }) => {
  const hasExports = useComplianceExports();
  if (allowed ?? hasExports) return <>{children}</>;
  return <ComplianceExportsUpsell />;
};

export default ComplianceExportsGuard;
