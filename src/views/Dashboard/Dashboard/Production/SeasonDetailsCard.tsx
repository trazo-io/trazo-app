/**
 * The season's own fields, as one card (2026-11-06).
 *
 * Was a "Production record" section of three or four cards (Season, Agricultural information,
 * Location, Recorded by) in a two-column grid. They are one list of facts about one season, so
 * they are one list here, split only by where each field travels: the public page, or nowhere
 * outside the farm. That split is the disclosure the old cards carried per card (2026-08-07):
 * the farmer can see at a glance that their revenue and their own contact details do not go
 * out with the QR code.
 */
import React from 'react';
import { Icon, VStack } from '@chakra-ui/react';
import {
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaClipboardList,
  FaExchangeAlt,
  FaEye,
  FaEyeSlash,
  FaLeaf,
  FaMapMarkerAlt,
  FaSeedling,
  FaTractor,
  FaUser
} from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import { FieldList, InfoRow } from 'components/Design/ProfileField';
import { formatDateFromTimestamp } from 'utils/dateOnly';

interface Props {
  // The public history payload; typed loosely upstream (useGetPublicHistoryQuery).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  history: any;
  canWrite: boolean;
  onOpenFarm: () => void;
  onOpenParcel: () => void;
  onCorrectHeader: () => void;
}

export default function SeasonDetailsCard({
  history,
  canWrite,
  onOpenFarm,
  onOpenParcel,
  onCorrectHeader
}: Props) {
  const intl = useIntl();
  const t = (id: string, defaultMessage?: string) => intl.formatMessage({ id, defaultMessage });
  // Calendar dates stored as midnight UTC: the shared helper keeps west-of-UTC farms on the
  // right day, and agrees with the server-rendered packet.
  const date = (value?: string) => (value ? formatDateFromTimestamp(value) ?? '' : '');

  const typeLabel =
    history?.type === 'OR'
      ? t('production.type.orchard', 'Orchard')
      : history?.type === 'GA'
      ? t('production.type.garden', 'Garden')
      : history?.type || t('production.agriculturalProduction');

  const days =
    history?.start_date && history?.finish_date
      ? Math.ceil(
          (new Date(history.finish_date).getTime() - new Date(history.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  const operator = history?.operator;

  return (
    <StandardCard mb={0} title={t('season.details.title', 'Details')}>
      <VStack align="stretch" gap={5}>
        <FieldList caption={t('production.details.onPublicPage')} captionIcon={FaEye}>
          <InfoRow
            layout="inline"
            icon={FaSeedling}
            label={t('production.field.product')}
            value={history?.product?.name}
          />
          <InfoRow
            layout="inline"
            icon={FaTractor}
            label={t('production.field.type')}
            value={typeLabel}
          />
          <InfoRow
            layout="inline"
            icon={FaCalendarAlt}
            label={t('production.field.startDate')}
            value={date(history?.start_date)}
          />
          <InfoRow
            layout="inline"
            icon={FaCalendarAlt}
            label={t('production.field.endDate')}
            value={
              history?.finish_date ? date(history.finish_date) : t('production.status.inProgress')
            }
          />
          {days !== null && (
            <InfoRow
              layout="inline"
              icon={FaCalendarAlt}
              label={t('production.field.duration')}
              value={intl.formatMessage({ id: 'production.field.durationDays' }, { days })}
            />
          )}
          {/* Test the number: `amount && <Row/>` printed a bare "0" on an open season. */}
          {Number(history?.production_amount) > 0 && (
            <InfoRow
              layout="inline"
              icon={FaClipboardList}
              label={t('production.field.amount')}
              value={`${intl.formatNumber(Number(history.production_amount))} ${
                history.production_unit || 'units'
              }`}
            />
          )}
          <InfoRow
            layout="inline"
            icon={FaLeaf}
            label={t('production.environment')}
            value={history?.is_outdoor ? t('production.outdoor') : t('production.indoor')}
          />
          {history?.age_of_plants && (
            <InfoRow
              layout="inline"
              icon={FaSeedling}
              label={t('production.field.plantAge')}
              value={history.age_of_plants}
            />
          )}
          {history?.number_of_plants && (
            <InfoRow
              layout="inline"
              icon={FaSeedling}
              label={t('production.field.plantCount')}
              value={Number(history.number_of_plants).toLocaleString()}
            />
          )}
          {history?.soil_ph && (
            <InfoRow
              layout="inline"
              icon={FaLeaf}
              label={t('production.field.soilPh')}
              value={history.soil_ph}
            />
          )}
          {history?.crop_type && (
            <InfoRow
              layout="inline"
              icon={FaSeedling}
              label={t('production.field.cropType')}
              value={history.crop_type}
            />
          )}
          <InfoRow
            layout="inline"
            icon={FaBuilding}
            label={t('production.field.establishment')}
            value={history?.parcel?.establishment?.name}
            onClick={onOpenFarm}
          />
          <InfoRow
            layout="inline"
            icon={MdLocationOn}
            label={t('production.field.parcel')}
            value={history?.parcel?.name}
            onClick={onOpenParcel}
          />
          {history?.parcel?.establishment?.location && (
            <InfoRow
              layout="inline"
              icon={FaMapMarkerAlt}
              label={t('production.field.address')}
              value={history.parcel.establishment.location}
            />
          )}
        </FieldList>

        {/* `operator` is the ACCOUNT that owns the record (set to request.user on create), withheld
            from shoppers by _OWNER_ONLY_FIELDS because it carries an email. Revenue is not in the
            public serializer at all. */}
        {(operator || Number(history?.earning) > 0) && (
          <FieldList caption={t('production.details.offPublicPage')} captionIcon={FaEyeSlash}>
            {operator && (
              <InfoRow
                layout="inline"
                icon={FaUser}
                label={t('production.section.recordedBy')}
                value={operator.full_name || operator.email}
              />
            )}
            {Number(history?.earning) > 0 && (
              <InfoRow
                layout="inline"
                icon={FaChartLine}
                label={t('production.field.revenue')}
                value={`$${Number(history.earning).toLocaleString()}`}
              />
            )}
          </FieldList>
        )}

        {/* F7: the lot header is frozen once finished; this is its amendment path. */}
        {history?.finish_date && canWrite && (
          <StandardButton
            variant="ghost"
            size="sm"
            alignSelf="flex-start"
            leftIcon={<Icon as={FaExchangeAlt} />}
            onClick={onCorrectHeader}>
            {t('correct.season.action')}
          </StandardButton>
        )}
      </VStack>
    </StandardCard>
  );
}
