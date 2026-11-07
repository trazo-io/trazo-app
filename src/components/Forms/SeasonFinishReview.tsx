/**
 * "Check before you finish": the last step of the finish-season form (2026-11-07).
 *
 * It replaces a confirm dialog. The form used to end on the photo upload, and the button there
 * opened a modal that listed what finishing locks and asked about the buyer page, over a form
 * the farmer could no longer see. The activity wizard ends on its own review step since #305
 * (`ActivityReview`); finishing a season is the bigger commitment of the two (it locks every
 * activity in it and fixes the lot number, yield and grade the certifier packet prints), so it
 * gets the same: the record in rows, a Change link per section, what finishing does in plain
 * words, and the one reversible choice (publish the buyer page) as its own row.
 *
 * Editing a season that is already finished shows only the record: the locks and the publish
 * choice happened when it was finished, and the edit must not send `published` at all
 * (see `onSubmitForm`).
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { Box, Checkbox, Flex, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import {
  FaBoxes,
  FaCalendarAlt,
  FaCamera,
  FaClipboardCheck,
  FaLock,
  FaStickyNote,
  FaTag,
  FaTractor
} from 'react-icons/fa';

import { StandardButton } from 'components/Design/StandardComponents';
import { FieldList, InfoRow } from 'components/Design/ProfileField';

export interface SeasonFinishValues {
  amount: string;
  unitLabel: string;
  lotId: string;
  finishDate: string;
  qualityGrade: string;
  harvestMethod: string;
  observation: string;
}

interface Props {
  values: SeasonFinishValues;
  photoCount: number;
  isEdit: boolean;
  publish: boolean;
  onPublishChange: (publish: boolean) => void;
  /** Go back to a step to change something (0: season info, 1: photos). */
  onChange: (step: number) => void;
}

const SectionHead = ({
  title,
  changeLabel,
  onChange
}: {
  title: string;
  changeLabel: string;
  onChange: () => void;
}) => {
  const intl = useIntl();
  return (
    <Flex justify="space-between" align="center" gap={3} mb={2}>
      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
        {title}
      </Text>
      <StandardButton size="sm" variant="ghost" onClick={onChange} aria-label={changeLabel}>
        {intl.formatMessage({ id: 'events.review.changeShort' })}
      </StandardButton>
    </Flex>
  );
};

export default function SeasonFinishReview({
  values,
  photoCount,
  isEdit,
  publish,
  onPublishChange,
  onChange
}: Props) {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const notGiven = t('events.review.notGiven');
  const change = (section: string) =>
    intl.formatMessage({ id: 'events.review.change' }, { section });
  const infoTitle = t('finishProduction.step.info.title');
  const photosTitle = t('finishProduction.step.media.title');

  const finishedAt = values.finishDate ? new Date(values.finishDate) : null;
  const finishedLabel =
    finishedAt && !Number.isNaN(finishedAt.getTime())
      ? intl.formatDate(finishedAt, { dateStyle: 'medium', timeStyle: 'short' })
      : notGiven;

  return (
    <Box as="section" aria-labelledby="season-review-title">
      <Text id="season-review-title" fontSize="md" fontWeight="semibold" color="gray.800" mb={1}>
        {t(isEdit ? 'finishProduction.review.titleEdit' : 'finishProduction.review.title')}
      </Text>
      <Text fontSize="sm" color="gray.600" mb={4}>
        {t('finishProduction.review.body')}
      </Text>

      <VStack align="stretch" spacing={5}>
        <Box>
          <SectionHead
            title={infoTitle}
            changeLabel={change(infoTitle)}
            onChange={() => onChange(0)}
          />
          <FieldList>
            <InfoRow
              icon={FaBoxes}
              layout="inline"
              label={t('app.productionAmount')}
              value={`${values.amount} ${values.unitLabel}`.trim()}
            />
            <InfoRow icon={FaTag} layout="inline" label={t('app.lotNumber')} value={values.lotId} />
            <InfoRow
              icon={FaCalendarAlt}
              layout="inline"
              label={t('app.finishDate')}
              value={finishedLabel}
            />
            <InfoRow
              icon={FaClipboardCheck}
              layout="inline"
              label={t('finishProduction.qualityGrade.label')}
              value={values.qualityGrade || notGiven}
            />
            <InfoRow
              icon={FaTractor}
              layout="inline"
              label={t('finishProduction.harvestMethod.label')}
              value={values.harvestMethod || notGiven}
            />
            {values.observation && (
              <InfoRow
                icon={FaStickyNote}
                layout="inline"
                label={t('app.observations')}
                value={values.observation}
              />
            )}
          </FieldList>
        </Box>

        <Box>
          <SectionHead
            title={photosTitle}
            changeLabel={change(photosTitle)}
            onChange={() => onChange(1)}
          />
          <FieldList>
            <InfoRow
              icon={FaCamera}
              layout="inline"
              label={photosTitle}
              value={intl.formatMessage(
                { id: 'finishProduction.review.photoCount' },
                { count: photoCount }
              )}
            />
          </FieldList>
        </Box>

        {!isEdit && (
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={2}>
              {t('finishProduction.review.whenYouFinish')}
            </Text>
            <VStack as="ul" listStyleType="none" align="stretch" spacing={2} m={0}>
              {[
                'finishProduction.confirm.lockEvents',
                'finishProduction.confirm.retention',
                'finishProduction.confirm.certifierPacket'
              ].map((id) => (
                <HStack as="li" key={id} align="start" spacing={3}>
                  <Icon as={FaLock} boxSize={3} color="gray.500" mt={1} />
                  <Text fontSize="sm" color="gray.700">
                    {t(id)}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* The one consequence that can be undone, kept apart from the locks above: filing a
            reversible choice under a list of permanent ones misrepresents both. */}
        {!isEdit && (
          <Box borderTop="1px" borderColor="gray.200" pt={4}>
            <Checkbox
              colorScheme="green"
              isChecked={publish}
              onChange={(e) => onPublishChange(e.target.checked)}
              minH="44px"
              alignItems="center">
              <Text fontSize="sm" fontWeight="medium" color="gray.800">
                {t('finishProduction.confirm.publishLabel')}
              </Text>
            </Checkbox>
            <Text fontSize="xs" color="gray.600" mt={1} ml={6}>
              {t(
                publish
                  ? 'finishProduction.confirm.publishHelpOn'
                  : 'finishProduction.confirm.publishHelpOff'
              )}
            </Text>
          </Box>
        )}

        {!isEdit && (
          <Text fontSize="xs" color="gray.600">
            {t('finishProduction.confirm.footnote')}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
