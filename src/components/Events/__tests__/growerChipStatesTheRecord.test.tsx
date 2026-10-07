/**
 * The grower-reported input chip states a record, and its tooltip names a National List link.
 *
 * Recordkeeping review F-09 (2026-10-07). The chip read "Organic-approved · grower-reported":
 * "Approved" led a chip for an answer nobody but the grower had given. And for a record that
 * carries a National List substance on an UNCONFIRMED basis (Rex Lime Sulfur, Entrust SC on the
 * specimen) the tooltip said Trazo had found nothing in the OMRI or National List catalogs,
 * which was false. The server now names the link; the tooltip states it and its state.
 * Red on the old card and the old catalogue.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { ConsumerEventCard } from '../ConsumerEventCard';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const renderCard = (event: Record<string, unknown>, locale = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
        <ConsumerEventCard event={event as never} isLast />
      </IntlProvider>
    </ChakraProvider>
  );

const limeSulfur = (input_status: Record<string, unknown>) => ({
  event_type: 2,
  type: 'PE',
  chemical_type: 'PE',
  date: '2026-05-11T07:00:00Z',
  description: 'Dormant spray',
  commercial_name: 'Rex Lime Sulfur',
  input_status
});

describe('the grower-reported chip', () => {
  it('is worded as a record, not a verdict', () => {
    renderCard(limeSulfur({ status: 'organic_approved', label: 'ignored, the key is used' }));
    expect(screen.getByText('Recorded by the farm as allowed for organic use')).toBeTruthy();
    expect(screen.queryByText(/Organic-approved/)).toBeNull();
  });

  it('names an unconfirmed National List link in the tooltip', () => {
    renderCard(
      limeSulfur({
        status: 'organic_approved',
        label: 'x',
        national_list_link: {
          substance: 'Lime sulfur',
          cfr_section: '205.601',
          basis: 'not_confirmed'
        }
      })
    );
    const chip = screen.getByLabelText(/Lime sulfur/);
    expect(chip.getAttribute('aria-label')).toContain('7 CFR § 205.601');
    expect(chip.getAttribute('aria-label')).toContain('not yet confirmed');
    expect(chip.getAttribute('aria-label')).not.toContain('did not find');
  });

  it('says no entry is linked only when none is', () => {
    renderCard(limeSulfur({ status: 'organic_approved', label: 'x' }));
    expect(screen.getByLabelText(/No OMRI, WSDA or National List entry is linked/)).toBeTruthy();
  });

  it('a partial or differently based link falls back to the plain record wording', () => {
    // Review of app #91: `{ basis: 'confirmed' }` alone is truthy and printed "(, 7 CFR § )".
    for (const link of [
      { basis: 'confirmed' },
      { substance: 'Lime sulfur' },
      { substance: 'Lime sulfur', cfr_section: '205.601', basis: 'exact' }
    ]) {
      const { unmount } = renderCard(
        limeSulfur({ status: 'organic_approved', label: 'x', national_list_link: link })
      );
      const chip = screen.getByLabelText(/No OMRI, WSDA or National List entry is linked/);
      expect(chip.getAttribute('aria-label')).not.toContain('7 CFR §');
      unmount();
    }
  });

  it('reads the same in Spanish, with finca', () => {
    renderCard(
      limeSulfur({
        status: 'organic_approved',
        label: 'x',
        national_list_link: {
          substance: 'Lime sulfur',
          cfr_section: '205.601',
          basis: 'not_confirmed'
        }
      }),
      'es-419'
    );
    expect(
      screen.getByText('Registrado por la finca como permitido para uso orgánico')
    ).toBeTruthy();
    expect(screen.getByLabelText(/aún no está confirmada/)).toBeTruthy();
  });
});
