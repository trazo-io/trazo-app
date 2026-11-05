/**
 * Farm home page header: the farm's name, where it is, and one muted line of counts.
 *
 * Replaces the solid green farm tile (which repeated the breadcrumb), the Farm Profile card and
 * the "Records and buyer page" card (2026-11-05). The counts are the producer-dashboard set in
 * .claude/rules/transparency-first.md: seasons, activities, photos, QR scans. Counts only, with
 * the QR window stated. No total, percentage or grade.
 */
import React from 'react';
import { Box, Flex, Heading, Link, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { FaArrowRight } from 'react-icons/fa';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

import { PageHeaderMeta } from 'components/Design/ProfileField';
import { StandardButton, TOUCH_TARGET } from 'components/Design/StandardComponents';
import { useGetFarmDashboardMetricsQuery } from 'store/api/dashboardMetricsApi';

interface Props {
  companyId?: number;
  farmId: number;
  name: string;
  location?: string;
  /** Show the seasons counts in the strip. Off when a seasons list sits right below. */
  showSeasonCounts?: boolean;
}

export default function FarmHomeHeader({
  companyId,
  farmId,
  name,
  location,
  showSeasonCounts = true
}: Props) {
  const intl = useIntl();
  const navigate = useNavigate();
  const titleColor = useColorModeValue('gray.800', 'white');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const { data } = useGetFarmDashboardMetricsQuery(
    // Skipped until the company loads; 0 is never sent.
    { companyId: companyId ?? 0, farmId },
    { skip: !companyId || !farmId }
  );
  const m = data?.metrics;
  const profilePath = `/admin/dashboard/farm/${farmId}/profile`;

  const fmt = (id: string, count: number | null | undefined) =>
    typeof count === 'number' ? intl.formatMessage({ id }, { count }) : null;

  return (
    <Flex justify="space-between" align="flex-start" gap={3} data-testid="farm-home-header">
      <VStack align="flex-start" spacing={1} minW={0}>
        <Heading as="h1" size={{ base: 'lg', md: 'xl' }} color={titleColor}>
          {name}
        </Heading>
        {location && (
          <Text fontSize="sm" color={muted}>
            {location}
          </Text>
        )}
        {m && (
          <PageHeaderMeta
            items={[
              showSeasonCounts
                ? fmt('farmHome.meta.seasonsUnderway', m.productions_in_progress)
                : null,
              showSeasonCounts ? fmt('farmHome.meta.seasonsFinished', m.scored_productions) : null,
              fmt('farmHome.meta.activities', m.total_documented_events),
              fmt('farmHome.meta.photos', m.photo_count),
              fmt('farmHome.meta.qrScans', m.monthly_scans)
            ]}
          />
        )}
        {/* Phone: a text link under the counts. The button beside the title took half of a
            390px row in Spanish ("Perfil de la finca") and squeezed the farm name. */}
        <Link
          as={RouterLink}
          to={profilePath}
          display={{ base: 'inline-flex', md: 'none' }}
          pt={1}
          fontSize="sm"
          fontWeight="semibold"
          color="green.700"
          {...TOUCH_TARGET}>
          {intl.formatMessage({ id: 'farmHome.profileLink' })}&nbsp;
          <span aria-hidden="true">→</span>
        </Link>
      </VStack>
      {/* From md, an outlined button: the profile holds the certifier link, the audit dossier and
          the exports, and a link in the corner of a wide header was easy to miss. */}
      <Box flexShrink={0} pt={2} display={{ base: 'none', md: 'block' }}>
        <StandardButton
          variant="outline"
          size="sm"
          rightIcon={<FaArrowRight aria-hidden />}
          onClick={() => navigate(profilePath)}>
          {intl.formatMessage({ id: 'farmHome.profileLink' })}
        </StandardButton>
      </Box>
    </Flex>
  );
}
