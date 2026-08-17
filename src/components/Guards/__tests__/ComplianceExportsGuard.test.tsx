/**
 * The screen-side half of the Starter/Compliance boundary.
 *
 * The backend refuses a Starter farm's certifier documents (`subscriptions/gating.py`, proven by
 * mutation in `test_starter_bounded_by_outputs.py`). These tests cover the half that enforcement
 * cannot: that the app does not OFFER what it already knows it will refuse, and — the failure
 * mode that matters more — that it does not withhold what a paying farm has bought.
 *
 * The default-closed case is the subtle one. A gate that opens on missing data flashes the export
 * buttons on every page load and then retracts them, which reads as a bug and, on a slow
 * connection, stays clickable long enough to click.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Rendered through the real IntlProvider with the real English catalogue, so a missing or
// renamed message id fails here rather than shipping as a raw "app.complianceExports.title"
// on a farmer's screen.
import { IntlProvider } from 'react-intl';
import enMessages from '../../../i18n/lang/en-US.json';

let mockState: any = {};
vi.mock('react-redux', () => ({
  useSelector: (selector: (state: any) => unknown) => selector(mockState)
}));

import { ComplianceExportsGuard, ComplianceExportsUpsell } from '../ComplianceExportsGuard';

const CHILD = 'the-export-buttons';

const renderWith = (company: any) => {
  mockState = { company: { currentCompany: company } };
  return render(
    <IntlProvider locale="en" messages={enMessages as Record<string, string>}>
      <ComplianceExportsGuard>
        <div>{CHILD}</div>
      </ComplianceExportsGuard>
    </IntlProvider>
  );
};

const upsellShown = () => screen.queryByText(enMessages['app.complianceExports.title']) !== null;

describe('ComplianceExportsGuard', () => {
  it('shows the export actions when the plan grants them', () => {
    renderWith({ subscription: { effective_limits: { compliance_exports: true } } });
    expect(screen.getByText(CHILD)).toBeTruthy();
    expect(upsellShown()).toBe(false);
  });

  it('replaces them with the upsell when the plan does not', () => {
    renderWith({ subscription: { effective_limits: { compliance_exports: false } } });
    expect(screen.queryByText(CHILD)).toBeNull();
    expect(upsellShown()).toBe(true);
  });

  it('falls back to the raw plan features when effective_limits is absent', () => {
    // Older payloads (and any surface assembled before `effective_limits` existed) carry the
    // flag only on the plan. Dropping that fallback would paywall a paying farm.
    renderWith({ subscription: { plan: { features: { compliance_exports: true } } } });
    expect(screen.getByText(CHILD)).toBeTruthy();
  });

  it('stays closed while the company is still loading', () => {
    renderWith(undefined);
    expect(screen.queryByText(CHILD)).toBeNull();
    expect(upsellShown()).toBe(true);
  });

  it('stays closed for a company with no subscription at all', () => {
    renderWith({ id: 7 });
    expect(screen.queryByText(CHILD)).toBeNull();
  });

  it('does not treat a truthy non-boolean as permission', () => {
    // `effective_limits.compliance_exports` is a boolean on the wire. If it ever arrives as a
    // string — "false" is truthy in JS — the gate must not swing open on it.
    renderWith({ subscription: { effective_limits: { compliance_exports: 'false' } } });
    expect(screen.queryByText(CHILD)).toBeNull();
  });

  it('the compact variant does not repeat the full card', () => {
    // MEASURED on the live farm profile (2026-08-15, Starter): the first cut rendered the full
    // card twice within one screen — once inside CertifierLinkCard replacing its create half, and
    // once for the export section directly below. The compact variant exists so a surface that
    // sits beside the full card contributes one line, not a second headline.
    render(
      <IntlProvider locale="en" messages={enMessages as Record<string, string>}>
        <ComplianceExportsUpsell compact />
      </IntlProvider>
    );
    expect(screen.queryByText(enMessages['app.complianceExports.title'])).toBeNull();
    expect(screen.getByText(enMessages['app.complianceExports.compact'])).toBeTruthy();
  });

  it('tells the farmer their records are still theirs', () => {
    // Said AT the paywall on purpose: a grower meeting a wall is exactly the person wondering
    // whether a season of their own records is now hostage. It is also the anti-lock-in promise
    // the COG Pro migration page makes, and the two must not disagree.
    renderWith({ subscription: { effective_limits: { compliance_exports: false } } });
    expect(screen.getByText(enMessages['app.complianceExports.recordsAreYours'])).toBeTruthy();
  });
});
