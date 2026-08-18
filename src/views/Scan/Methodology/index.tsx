/**
 * MethodologyPage — consumer-facing disclosure of how Trazo data works.
 *
 * This is a substantiation document, not a marketing page. It exists so that
 * every number and badge on a Trazo product page has a plain-language
 * explanation of what it means AND what it does not mean.
 *
 * Regulatory context:
 *  - EU ECGT Directive 2024/825 (applies 2026-09-27): environmental claims
 *    must be substantiated; self-created labels must not imply third-party
 *    verification.
 *  - FTC Green Guides (16 CFR 260.6): certification/verification claims must
 *    not overstate the basis of the claim.
 *
 * Conventions:
 *  - Copy is hardcoded English (consumer-page convention, see
 *    TrustSummaryHeader).
 *  - Each section has a stable anchor id so claims elsewhere in the app can
 *    deep-link: #transparency #carbon #photos #certifications
 *    #data.
 *  - "Last updated" is a string literal by design — do not compute at
 *    runtime; it must only change when the content changes.
 */

import React, { useEffect } from 'react';
import { Box, Container, Divider, Heading, Link, Text, VStack } from '@chakra-ui/react';
import { useLocation } from 'react-router-dom';

const LANDING_URL = 'https://trazo.io';
const LAST_UPDATED = 'June 2026';

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

/**
 * Plain Box section (not Card — protected CSS forces white bg + padding on
 * Card via !important). scrollMarginTop keeps anchors clear of the navbar.
 */
const Section: React.FC<SectionProps> = ({ id, title, children }) => (
  <Box as="section" id={id} sx={{ scrollMarginTop: '96px' }} w="100%">
    <Heading as="h2" fontSize={{ base: 'lg', smd: 'xl' }} color="gray.800" mb={3}>
      {title}
    </Heading>
    <VStack align="start" spacing={3}>
      {children}
    </VStack>
  </Box>
);

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text fontSize="sm" color="gray.700" lineHeight="1.7" maxW="60ch">
    {children}
  </Text>
);

/** "What it does not mean" callout — the honest half of every section. */
const NotClaim: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    borderLeft="3px solid"
    borderLeftColor="gray.300"
    pl={3}
    py={1}
    bg="gray.50"
    borderRadius="sm"
    maxW="60ch">
    <Text fontSize="sm" color="gray.600" lineHeight="1.7">
      {children}
    </Text>
  </Box>
);

const MethodologyPage: React.FC = () => {
  const { hash } = useLocation();

  // react-router does not scroll to hash anchors; handle deep links like
  // /methodology#carbon ourselves.
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [hash]);

  return (
    <Container maxW="container.md" px={{ base: 4, smd: 6 }} pt={{ base: 6, md: 10 }} pb={12}>
      <Box
        bg="white"
        borderRadius="xl"
        border="1px solid"
        borderColor="gray.200"
        p={{ base: 5, smd: 8 }}>
        <VStack align="start" spacing={8}>
          {/* Header */}
          <Box as="header">
            <Heading as="h1" fontSize={{ base: 'xl', smd: '2xl' }} color="gray.800" mb={2}>
              How Trazo data works
            </Heading>
            <Text fontSize="sm" color="gray.600" lineHeight="1.7" maxW="60ch">
              What every number and badge on a Trazo product page means — and what it doesn&apos;t.
            </Text>
          </Box>

          <Divider />

          <Section id="transparency" title="Practice documentation">
            <Body>
              Every Trazo product page is built from event records the farmer logs during the season
              — planting, irrigation, soil work, pest management, harvest, and more. Farmers enter
              these records through forms, guided templates, or voice notes.
            </Body>
            <Body>
              A count like &ldquo;20 practices documented&rdquo; means exactly that: 20 records are
              on file for this production. It measures how thoroughly the farm documented its work.
            </Body>
            <NotClaim>
              Documentation counts and transparency scores are based on farmer-reported records.
              They are not independently audited, and they are not a quality or safety grade for the
              food itself.
            </NotClaim>
            <Body>
              Records that include photos and timestamps are stronger evidence than text alone, and
              the score weighs them accordingly.
            </Body>
          </Section>

          <Section id="carbon" title="Environmental impact numbers">
            <Body>
              The environmental figures on a product page cover direct operational emissions — the
              emissions the farmer controls on the farm:
            </Body>
            <Box as="ul" pl={5} maxW="60ch">
              <Text as="li" fontSize="sm" color="gray.700" lineHeight="1.7">
                Fuel burned on the farm (tractors, harvesters, irrigation pumps)
              </Text>
              <Text as="li" fontSize="sm" color="gray.700" lineHeight="1.7">
                Fertilizer — manufacturing emissions plus the fuel used to apply it
              </Text>
              <Text as="li" fontSize="sm" color="gray.700" lineHeight="1.7">
                Energy used by farm equipment (electricity and diesel)
              </Text>
            </Box>
            <Body>
              We multiply the quantities the farmer reports by emission factors published by the EPA
              and USDA.
            </Body>
            <NotClaim>
              This is not a full life-cycle footprint. It does not include transport to the store,
              packaging, retail, or anything after the product leaves the farm. Per-kilogram figures
              are estimates calculated from farmer-reported data, not measured emissions.
            </NotClaim>
          </Section>

          <Section id="photos" title="Photos">
            <Body>
              Photos on a product page are submitted by the farmer alongside their event records.
            </Body>
            <Body>
              Before a photo counts as evidence, an automated AI check screens it for blank,
              duplicate, or unrelated images. The check is a simple pass or fail.
            </Body>
            <NotClaim>
              Passing the check means the image appears to be a real, relevant photo. It does not
              verify that the practice shown in the photo was performed as described.
            </NotClaim>
          </Section>

          <Section id="certifications" title="Certifications">
            <Body>
              A USDA Organic certification shows &ldquo;Verified&rdquo; only when we match the
              farm&apos;s certificate against the USDA Organic Integrity Database — the federal
              public registry of certified organic operations.
            </Body>
            <NotClaim>
              That match is a database cross-reference. It is not a farm inspection by Trazo, and
              Trazo does not certify farms or issue certifications of its own.
            </NotClaim>
            <Body>
              Certifications we cannot match against a public database are labeled
              &ldquo;Self-Reported&rdquo; instead.
            </Body>
            <Body>
              A note on lots: certification belongs to the farm, but each product page describes one
              specific lot. When the records for a lot show a prohibited input or a harvest outside
              the certificate window, we do not present that lot as organic — even if the farm
              itself is certified.
            </Body>
          </Section>

          <Section id="data" title="Reviews & scan data">
            <Body>
              Reviews come from consumers who scanned this product&apos;s QR code. We do not source
              reviews from anywhere else.
            </Body>
            <Body>
              Scan analytics shown to farms — such as how many people scanned a product — are
              aggregated and privacy-safe. They do not identify individual shoppers.
            </Body>
            <Body>
              For details on what we collect and how it is used, see our{' '}
              <Link
                href={`${LANDING_URL}/privacy-policy`}
                color="green.700"
                isExternal
                _hover={{ color: 'green.500' }}>
                Privacy Policy
              </Link>
              .
            </Body>
          </Section>

          <Divider />

          {/* Page footer */}
          <Box>
            <Text fontSize="sm" color="gray.600" lineHeight="1.7">
              Questions?{' '}
              <Link
                href="mailto:support@trazo.io"
                color="green.700"
                _hover={{ color: 'green.500' }}>
                support@trazo.io
              </Link>
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Last updated: {LAST_UPDATED}
            </Text>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
};

export default MethodologyPage;
