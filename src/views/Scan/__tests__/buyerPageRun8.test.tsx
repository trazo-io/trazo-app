/**
 * Run 8 (Astra, 2026-10-05): the buyer page as a shopper meets it.
 *
 *   R8-14  Carbon was expanded by default, sat above the lot's story, said "Your Impact", drew
 *          driving and phone equivalents and printed "kg" without CO2e.
 *   R8-15  "Certifications & Audits: Independent checks on how this farm operates" led the
 *          page with a purple seal while its featured item was the grower's own notice, and the
 *          event count wore a green check.
 *   R8-16  "every step tracked" and "full traceability" promised completeness the records
 *          cannot establish.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { CarbonImpactExplainer } from 'components/Education/CarbonImpactExplainer';
import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';

const src = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');
const TITLE = 'Estimated emissions from recorded work and inputs';

describe('R8-14: carbon is secondary', () => {
  it('starts closed and opens from its header', () => {
    render(
      <ChakraProvider>
        <MemoryRouter>
          <IntlProvider locale="en" messages={enUS as Record<string, string>} onError={() => {}}>
            <CarbonImpactExplainer
              totalCO2e={412.37}
              productName="Blueberries"
              consumerContext={{ kg_per_kg: 0.077, per_kg_miles: 0.2, per_kg_phone_charges: 9, has_per_kg_data: true } as any}
            />
          </IntlProvider>
        </MemoryRouter>
      </ChakraProvider>
    );
    const header = screen.queryByRole('button', { name: new RegExp(TITLE) });
    expect(header, 'the card header is not a button that opens it').not.toBeNull();
    expect(header).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(header!);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText(/Like driving|phone charge/i)).not.toBeInTheDocument();
  });

  it('comes after the farm section, never above the production journey', () => {
    const page = src('views/Scan/ProductDetail/ProductDetail.tsx');
    const journey = page.indexOf('<UltraMobileProductionJourney');
    const farm = page.indexOf('<CompanyFarmInfo');
    const carbon = page.indexOf('<CarbonImpactExplainer');
    expect(journey).toBeGreaterThan(-1);
    expect(page.split('<CarbonImpactExplainer').length - 1).toBe(1);
    expect(carbon).toBeGreaterThan(farm);
    expect(carbon).toBeGreaterThan(journey);
  });

  it('names the unit as CO2 equivalent and calls nothing "Your Impact", in both locales', () => {
    for (const cat of [enUS, es419] as Record<string, string>[]) {
      // The unit is explicit without the bare jargon "CO2e", which this repo keeps off consumer
      // copy (CLAUDE.md consumer language).
      expect(cat['app.carbonExplainer.directEmissionsUnit']).toMatch(/CO2 equivalen/);
      expect(cat['app.carbonExplainer.directEmissionsUnit']).not.toMatch(/CO2e/);
      expect(cat['app.carbonExplainer.yourImpact']).not.toMatch(/impact|impacto/i);
    }
  });
});

describe('R8-15: the farm\'s own filings are stated as the farm\'s', () => {
  const journey = src('views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx');
  const defs = journey.slice(journey.indexOf('const CHAPTER_DEFS'), journey.indexOf('\n  ];', journey.indexOf('const CHAPTER_DEFS')));

  it('is the last chapter, neutral, and claims no independence', () => {
    const keys = [...defs.matchAll(/key: '(\w+)'/g)].map((m) => m[1]);
    expect(keys[keys.length - 1]).toBe('trust');
    const trust = defs.slice(defs.indexOf("key: 'trust'"));
    expect(trust).toMatch(/colorScheme: 'gray'/);
    expect(trust).not.toMatch(/FaCertificate|purple/);
    for (const cat of [enUS, es419] as Record<string, string>[]) {
      expect(cat['consumer.journey.chapterFarmRecordsSubtitle']).toBeTruthy();
      expect(cat['consumer.journey.chapterFarmRecordsTitle']).not.toMatch(/independ|audit|auditor/i);
    }
    expect(journey).toMatch(/CHAPTER_PRIORITY: ChapterKey\[\] = \[[^\]]*'trust'\]/);
  });

  it('shows the event count as a plain count, with no check icon', () => {
    const at = journey.indexOf("id: 'consumer.journey.eventCount'");
    const badge = journey.slice(journey.lastIndexOf('<Badge', at), at);
    expect(badge).not.toMatch(/MdVerified|colorScheme="green"/);
  });
});

describe('R8-16: no completeness promise', () => {
  it.each(['app.batchTraceabilityNote', 'consumer.howGrown.eventsSubtitle'])('%s', (key) => {
    for (const cat of [enUS, es419] as Record<string, string>[]) {
      expect(cat[key]).not.toMatch(/every step|full traceability|cada paso|trazabilidad completa/i);
    }
  });
});

describe('review of app #79', () => {
  it('every bottom-nav tab targets a section the page renders, Impact the emissions card', () => {
    const nav = src('components/Navigation/NavigationBottomBar.tsx');
    const page = src('views/Scan/ProductDetail/ProductDetail.tsx');
    const targets = [...nav.matchAll(/targetSection: '([\w-]+)'/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(1);
    for (const id of targets) expect(page, id).toContain(`id="${id}"`);
    expect(nav).toMatch(/id: 'carbon',[\s\S]*?targetSection: 'emissions-section'/);
    expect(page).toMatch(/getElementById\('emissions-section'\)/);
  });

  it.each(['FC', 'MN', 'RE', 'CA', 'BD', 'EI'])(
    'equipment %s: title, impact and benefit say different things',
    async (code) => {
      const { getConsumerEventDescription } = await import('utils/eventDescriptions');
      const d = getConsumerEventDescription('', {
        event_type: 4,
        type: 'equipment',
        operation_type: code,
        date: '2026-05-01'
      } as any) as any;
      const norm = (t?: string) => (t || '').toLowerCase().replace(/[.\s]+$/, '');
      const lines = [d.shortDescription || d.description, d.consumerImpact, d.sustainabilityBenefit].map(norm);
      expect(new Set(lines).size, lines.join(' | ')).toBe(3);
    }
  );
});
