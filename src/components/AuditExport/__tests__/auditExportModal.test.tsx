/**
 * The certifier-export picker, rendered.
 *
 * 🔴 2026-08-22 — it opened on "All Certifications" with five branded standards as peers.
 * `all` carries the carbon appendix that the organic export deliberately omits ("USDA
 * inspectors do not grade on environmental footprint, and including emissions data in an
 * audit PDF risks greenwashing-by-association claims" — audit_export_service.py), so the
 * DEFAULT handed an organic grower the one variant carrying the risk the organic variant
 * exists to avoid. And `all` was not even the superset its label promised: it dropped the
 * CDFA producer-registration section that the organic export includes.
 *
 * The section-set half is pinned server-side in
 * `history/tests/test_audit_export_section_sets.py`. This pins what the farmer sees.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import AuditExportModal from '../AuditExportModal';

const MESSAGES: Record<string, Record<string, string>> = { 'en-US': enUS, 'es-419': es419 };

const renderModal = (locale = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={MESSAGES[locale]} onError={() => undefined}>
        <AuditExportModal
          isOpen
          onClose={() => undefined}
          productionId="test-production"
          productionName="Duke 2025"
        />
      </IntlProvider>
    </ChakraProvider>
  );

const radioFor = (labelText: string) => {
  const label = screen.getByText(labelText).closest('label');
  return label?.querySelector('input[type="radio"]') as HTMLInputElement | null;
};

describe('AuditExportModal', () => {
  /*
    The four tests that used to live here pinned the STANDARD PICKER: that it opened on organic
    rather than the everything export, that the other standards sat behind a disclosure, that
    choosing one was framed as a filter and not a certification claim, and that each named what
    it could not cover. They were good tests and they did their job — the default-is-a-claim
    finding of 2026-08-22 came from that work.

    The picker was removed on 2026-08-29, so those assertions now pin a control that should never
    come back. What replaces them is the reason it was removed, stated as tests: the export is
    organic, the other standards are not offered, and nothing on screen claims certification.
  */

  it('offers no standard picker at all', () => {
    renderModal();
    // Every brand the picker used to list. None may be selectable here again without a decision.
    for (const brand of [
      'GlobalGAP',
      'GlobalG.A.P.',
      'FSMA 204',
      'SCS',
      'Sustainably Grown',
      'Regenerative Organic'
    ]) {
      expect(screen.queryByText(new RegExp(brand, 'i'))).toBeNull();
    }
    expect(screen.queryByText(/all sections/i)).toBeNull();
  });

  it('still says what the USDA Organic export contains', () => {
    renderModal();
    expect(screen.getByText(/OSP reference and attestation/i)).toBeTruthy();
  });

  it('does not describe itself as the renewal filing', () => {
    // The production export is one season's records. The renewal FILING is the OSP packet, and
    // this copy used to call itself "the full renewal packet" — the same phrase used for that ZIP.
    renderModal();
    expect(screen.queryByText(/full renewal packet/i)).toBeNull();
    expect(screen.getByText(/your renewal filing is the OSP packet/i)).toBeTruthy();
  });

  it('says which of the three certifier exports this one is', () => {
    renderModal();
    expect(screen.getByText(/Covers this season only/i)).toBeTruthy();
  });

  it('does not call the output an audit Trazo performed', () => {
    const { unmount } = renderModal();
    const text = () => document.body.textContent || '';
    expect(text()).not.toMatch(/audit report/i);
    expect(text()).toMatch(/Export for your certifier/i);
    unmount();
  });

  it('renders in Spanish without falling back to English', () => {
    const { unmount } = renderModal('es-419');
    const text = () => document.body.textContent || '';
    expect(text()).toMatch(/Exportar para tu certificadora/);
    expect(text()).not.toMatch(/Which standard|Download packet/);
    unmount();
  });
});
