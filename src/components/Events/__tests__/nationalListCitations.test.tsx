/**
 * Run 8b R5 (2026-10-15): the buyer page printed "A National List entry (Spinosad, 7 CFR § nonsyn)".
 *
 * Spinosad is nonsynthetic: allowed without any National List entry, so its catalogue row carries
 * the code "nonsyn" and no citation. The card formatted whatever section code the server sent and
 * called it a National List entry. Now the card prints only a citation the backend produces, as the
 * server built it, and the "not yet confirmed" disclosure stays with every unconfirmed link.
 *
 * The parity block reads the backend source (sibling trazo-back, as the other parity guards do):
 * the set of citations the card accepts must equal what `NationalListSubstance.citation` can
 * produce from the seeded catalogue and the model's section choices.
 */
import React from 'react';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { ConsumerEventCard } from '../ConsumerEventCard';
import { NATIONAL_LIST_CITATIONS, nationalListCitation } from '../nationalListCitations';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const REPO_ROOT = join(__dirname, '../../../../..');
const BACKEND_MODELS = join(REPO_ROOT, 'trazo-back/certifications/models.py');
const BACKEND_SEED = join(
  REPO_ROOT,
  'trazo-back/certifications/management/commands/seed_national_list.py'
);

/** Every citation the backend can produce, derived from its source. */
const backendCitations = (): Set<string> => {
  const models = readFileSync(BACKEND_MODELS, 'utf8');
  const choices = models.slice(
    models.indexOf('CFR_SECTION_CHOICES = ['),
    models.indexOf(']', models.indexOf('CFR_SECTION_CHOICES = ['))
  );
  const sections = [...choices.matchAll(/^\s*\("(\d{3}\.\d{3})",/gm)].map((m) => m[1]);
  expect(sections.length, 'no section codes parsed from CFR_SECTION_CHOICES').toBeGreaterThan(3);
  const out = new Set(sections.map((s) => `§ ${s}`));

  const seed = readFileSync(BACKEND_SEED, 'utf8');
  const tables = [...seed.matchAll(/^SECTION_(\d{3})_[A-Z]+ = \[\n([\s\S]*?)^\]/gm)];
  expect(tables.length, 'no SECTION_* tables parsed from the seed').toBeGreaterThanOrEqual(4);
  for (const [, digits, body] of tables) {
    const section = `205.${digits}`;
    expect(sections, `seed table for ${section} has no model choice`).toContain(section);
    for (const [, sub] of body.matchAll(/^\s*\(\s*"([a-z]+)",/gm)) out.add(`§ ${section}(${sub})`);
  }
  return out;
};

describe('the citations the card accepts are the ones the backend produces', () => {
  it('equals the set derived from the backend model and seed', () => {
    expect(existsSync(BACKEND_SEED), `sibling trazo-back not found at ${BACKEND_SEED}`).toBe(true);
    const backend = backendCitations();
    expect(backend.has('§ 205.601(e)')).toBe(true);
    expect([...NATIONAL_LIST_CITATIONS].sort()).toEqual([...backend].sort());
  });

  it('refuses the raw codes and malformed values', () => {
    for (const bad of [
      'nonsyn',
      '§ nonsyn',
      '205.601',
      '205.601(e)',
      '§ 205.601e',
      '§ 205.601(z)',
      '§ 205.601(e)(8)',
      '§ 205.999',
      '',
      undefined,
      null,
      42
    ]) {
      expect(nationalListCitation(bad), String(bad)).toBeUndefined();
    }
    expect(nationalListCitation('§ 205.605(b)')).toBe('§ 205.605(b)');
  });
});

const renderCard = (event: Record<string, unknown>, locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
        <ConsumerEventCard event={event as never} isLast />
      </IntlProvider>
    </ChakraProvider>
  );

const entrust = (link: Record<string, unknown> | undefined) => ({
  event_type: 2,
  type: 'PE',
  chemical_type: 'PE',
  date: '2026-05-11T07:00:00Z',
  description: 'Spray',
  commercial_name: 'Entrust SC',
  input_status: {
    status: 'organic_approved',
    label: 'x',
    ...(link ? { national_list_link: link } : {})
  }
});

const CHIP = {
  'en-US': /^Recorded by the farm as allowed for organic use$/,
  'es-419': /^Registrado por la finca como permitido para uso orgánico$/
} as const;
const ENTRY_SENTENCE = {
  'en-US': /A National List entry/,
  'es-419': /Hay una entrada de la Lista Nacional/
} as const;
const NO_LINK = {
  'en-US': /No OMRI, WSDA or National List entry is linked/,
  'es-419': /Ningún registro de OMRI, WSDA ni de la Lista Nacional está vinculado/
} as const;

const tooltipOf = (locale: 'en-US' | 'es-419') => {
  const chip = screen.getByText(CHIP[locale]).closest('[aria-label]');
  expect(chip, 'no grower chip rendered').not.toBeNull();
  return chip!.getAttribute('aria-label') || '';
};

describe('a nonsynthetic or citation-less link is not a National List entry', () => {
  const payloads: Array<[string, Record<string, unknown> | undefined]> = [
    [
      'the old backend, spinosad',
      { substance: 'Spinosad', cfr_section: 'nonsyn', basis: 'not_confirmed' }
    ],
    [
      'a raw code in the citation field',
      { substance: 'Spinosad', citation: 'nonsyn', basis: 'not_confirmed' }
    ],
    [
      'a section sign on the raw code',
      { substance: 'Spinosad', citation: '§ nonsyn', basis: 'not_confirmed' }
    ],
    ['no citation at all', { substance: 'Spinosad', basis: 'not_confirmed' }],
    ['the new backend, spinosad (no link sent)', undefined]
  ];
  for (const locale of ['en-US', 'es-419'] as const) {
    for (const [name, link] of payloads) {
      it(`${locale}: ${name}`, () => {
        const { container, unmount } = renderCard(entrust(link), locale);
        const label = tooltipOf(locale);
        const everything = [container.textContent || '', label].join(' \n ');
        expect(everything).not.toMatch(/nonsyn/i);
        expect(label).not.toMatch(ENTRY_SENTENCE[locale]);
        expect(label).not.toContain('7 CFR');
        // Anti-vacuity: the tooltip read is the grower record wording.
        expect(label).toMatch(NO_LINK[locale]);
        unmount();
      });
    }
  }
});

describe('a real entry prints the server citation with the unconfirmed disclosure', () => {
  const DISCLOSURE = { 'en-US': /not yet confirmed/, 'es-419': /aún no está confirmada/ } as const;
  for (const locale of ['en-US', 'es-419'] as const) {
    it(`${locale}: every citation the backend produces`, () => {
      for (const citation of NATIONAL_LIST_CITATIONS) {
        const { unmount } = renderCard(
          entrust({ substance: 'Lime sulfur', citation, basis: 'not_confirmed' }),
          locale
        );
        const label = tooltipOf(locale);
        expect(label, citation).toContain(`(Lime sulfur, 7 CFR ${citation})`);
        expect(label, citation).toMatch(ENTRY_SENTENCE[locale]);
        expect(label, citation).toMatch(DISCLOSURE[locale]);
        expect(label, citation).not.toContain('§ §');
        unmount();
      }
    });
  }
});
