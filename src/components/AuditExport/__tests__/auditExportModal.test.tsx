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
  it('opens on USDA Organic, not on the everything export', () => {
    const { unmount } = renderModal();
    expect(radioFor('USDA Organic')?.checked).toBe(true);
    unmount();
  });

  it('keeps the other standards behind a disclosure', () => {
    const { unmount } = renderModal();
    // Collapse keeps children mounted, so assert on the control, not on presence.
    const toggle = screen.getByRole('button', { name: /other standards and full export/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    unmount();
  });

  it('states that picking a standard is a filter, not a certification claim', () => {
    const { unmount } = renderModal();
    const text = () => document.body.textContent || '';
    fireEvent.click(screen.getByRole('button', { name: /other standards and full export/i }));
    expect(text()).toMatch(/not a claim that your operation is certified/i);
    unmount();
  });

  it('says what the standards it cannot fully cover are missing', () => {
    const { unmount } = renderModal();
    const text = () => document.body.textContent || '';
    fireEvent.click(screen.getByRole('button', { name: /other standards and full export/i }));
    fireEvent.click(screen.getByText('GlobalGAP'));
    // The old copy promised "water management records, and worker safety documentation";
    // neither section exists in the globalgap set.
    expect(text()).not.toMatch(/worker safety documentation/i);
    expect(text()).toMatch(/Trazo does not hold that data/i);
    unmount();
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
    expect(text()).toMatch(/Exportar para su certificadora/);
    expect(text()).not.toMatch(/Which standard|Download packet/);
    unmount();
  });
});
