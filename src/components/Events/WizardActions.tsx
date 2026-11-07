/**
 * The action row at the foot of each activity wizard step (2026-11-07).
 *
 * One primary action per step. On a phone it fills the row beside Previous step, at the bottom
 * where the thumb is, both 48px tall. The old footer stacked three equal buttons there: Preview
 * and Save side by side, and a full-width "Previous step" under them, the largest target on
 * the screen and the one the farmer least wants.
 *
 * Preview is a third kind of action (look at the shopper's card, change nothing), so it is a
 * text button above the row rather than a third button in it.
 */
import React from 'react';
import { Box, Grid, Icon } from '@chakra-ui/react';
import { FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton } from 'components/Design/StandardComponents';

interface Props {
  /** Absent on the first step. */
  onBack?: () => void;
  /**
   * The previous-step label, from the caller. Never "Back": the page header's Back leaves the
   * wizard ("Back to Bottom Ground A"), and two Backs sent farmers to the parcel page
   * (wizardBackNavigation.test.tsx).
   */
  backLabel?: string;
  /** The same, short enough to leave the primary the wider button on a phone ("Previous"). */
  backShortLabel?: string;
  primaryLabel: string;
  /** Omit for a form submit button (`type="submit"`). */
  onPrimary?: () => void;
  /** Continue points onward; a save does not. */
  primaryLeadsOn?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  onPreview?: () => void;
}

export default function WizardActions({
  onBack,
  backLabel,
  backShortLabel,
  primaryLabel,
  onPrimary,
  primaryLeadsOn = true,
  isLoading,
  loadingText,
  onPreview
}: Props) {
  const intl = useIntl();
  // Grid areas, so each width gets its own arrangement without rendering a button twice.
  // Phone: Preview (a text button) on its own line, then Previous step and the primary sharing the
  // bottom row with the primary taking the rest. Wider: Previous step on the left, Preview and the primary right.
  const phone = [
    onPreview ? '"preview preview"' : '',
    onBack ? '"back primary"' : '"primary primary"'
  ]
    .filter(Boolean)
    .join(' ');
  const wide = `"${onBack ? 'back' : '.'} . ${onPreview ? 'preview' : '.'} primary"`;
  return (
    <Box pt={5} mt={2} borderTop="1px" borderColor="gray.200">
      <Grid
        templateAreas={{ base: phone, md: wide }}
        templateColumns={{ base: 'auto 1fr', md: 'auto 1fr auto auto' }}
        columnGap={3}
        rowGap={2}
        alignItems="center">
        {onPreview && (
          <StandardButton
            gridArea="preview"
            variant="ghost"
            size="md"
            leftIcon={<Icon as={FaEye} />}
            onClick={onPreview}
            justifySelf={{ base: 'start', md: 'end' }}
            ml={{ base: -3, md: 0 }}>
            {intl.formatMessage({ id: 'events.wizard.preview' })}
          </StandardButton>
        )}
        {onBack && (
          <StandardButton
            gridArea="back"
            variant="outline"
            size="lg"
            leftIcon={<Icon as={FaChevronLeft} />}
            aria-label={backLabel}
            onClick={onBack}>
            <Box as="span" display={{ base: 'inline', md: 'none' }}>
              {backShortLabel || backLabel}
            </Box>
            <Box as="span" display={{ base: 'none', md: 'inline' }}>
              {backLabel}
            </Box>
          </StandardButton>
        )}
        <StandardButton
          gridArea="primary"
          variant="primary"
          size="lg"
          type={onPrimary ? 'button' : 'submit'}
          onClick={onPrimary}
          isLoading={isLoading}
          loadingText={loadingText}
          rightIcon={primaryLeadsOn ? <Icon as={FaChevronRight} /> : undefined}>
          {primaryLabel}
        </StandardButton>
      </Grid>
    </Box>
  );
}
