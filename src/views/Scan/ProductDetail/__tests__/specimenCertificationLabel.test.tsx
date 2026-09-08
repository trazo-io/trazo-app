/**
 * A fabricated operation's certification card must name the demonstration data.
 *
 * The server already refuses `verified_via_database` for a specimen, so the green "Verified via
 * USDA Organic Integrity Database" badge is gone before the client sees it. That leaves the
 * card falling through to "Reported by Producer" — which says a real producer made a real
 * statement about a real farm. The third state has to be said out loud.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import theme from '../../../../theme/theme';
import enMessages from '../../../../i18n/lang/en-US.json';
import esMessages from '../../../../i18n/lang/es-419.json';
import CertificationBadge from '../../../../components/Certifications/CertificationBadge';

const renderBadge = (certifications: any[], locale = 'en-US') =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enMessages : esMessages) as any}
        onError={() => undefined}>
        <CertificationBadge certifications={certifications} />
      </IntlProvider>
    </ChakraProvider>
  );

const SPECIMEN_CERT = {
  display_name: 'USDA Organic',
  certifier_name: 'CCOF Certification Services, LLC',
  status: 'self_reported',
  specimen: true
};

const REAL_VERIFIED_CERT = {
  display_name: 'USDA Organic',
  certifier_name: 'CCOF Certification Services, LLC',
  status: 'verified_via_database',
  specimen: false
};

describe('a specimen operation', () => {
  it('never shows the registry-verified label', () => {
    renderBadge([SPECIMEN_CERT]);
    expect(screen.queryByText(enMessages['certification.badge.verified'])).toBeNull();
  });

  it('names the demonstration data instead of implying a producer reported it', () => {
    renderBadge([SPECIMEN_CERT]);
    expect(screen.getAllByText(enMessages['certification.badge.specimen']).length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText(enMessages['certification.badge.selfReported'])).toBeNull();
  });

  it('says so in Spanish too', () => {
    renderBadge([SPECIMEN_CERT], 'es-419');
    expect(screen.getAllByText(esMessages['certification.badge.specimen']).length).toBeGreaterThan(
      0
    );
  });
});

describe('a real operation', () => {
  it('keeps its registry-verified label', () => {
    renderBadge([REAL_VERIFIED_CERT]);
    expect(screen.getAllByText(enMessages['certification.badge.verified']).length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText(enMessages['certification.badge.specimen'])).toBeNull();
  });
});
