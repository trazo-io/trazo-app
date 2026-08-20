/**
 * ICU validity for the strings the template picker introduced, in BOTH locales.
 *
 * These are easy to get wrong and fail quietly: react-intl logs to console and falls back
 * to the raw pattern rather than throwing, so a broken plural or an unmatched rich-text tag
 * ships looking "fine" in dev. `onError` is made fatal here so a bad message fails the build
 * instead of reaching a farmer as `{count, plural, one {# template}...}`.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { createIntl, createIntlCache } from 'react-intl';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const LOCALES: Array<[string, Record<string, string>]> = [
  ['en-US', enUS as unknown as Record<string, string>],
  ['es-419', es419 as unknown as Record<string, string>]
];

/**
 * `carbon.models.ProductionTemplate.FARMING_APPROACH_CHOICES`, verbatim. The picker renders
 * `production.templateModal.approach.${system_type}`, so a choice with no label ships the raw
 * database slug to the farmer.
 */
const APPROACHES = [
  'conventional',
  'organic',
  'precision',
  'regenerative',
  'sustainable',
  'integrated',
  'no_till',
  'cover_crop'
];

// Every key the template picker formats, with the values it actually passes.
const USAGES: Array<{ id: string; values?: Record<string, unknown> }> = [
  { id: 'production.templateModal.title' },
  { id: 'production.templateModal.subtitleGeneric' },
  {
    id: 'production.templateModal.subtitle',
    values: { crop: 'Pistachios', count: 2, highlight: (c: React.ReactNode) => c }
  },
  { id: 'production.templateModal.eventsCount', values: { count: 22 } },
  { id: 'production.templateModal.emptyTitle' },
  { id: 'production.templateModal.emptyForCrop', values: { crop: 'Pistachios' } },
  { id: 'production.templateModal.emptyNoCrop' },
  { id: 'production.templateModal.continueWithout' },
  // Pre-existing keys the picker also renders — a missing one blanks a card.
  { id: 'app.cancel' },
  // The farming approach, which is the one fact a template holds about itself. Every
  // ProductionTemplate.FARMING_APPROACH_CHOICES value needs a label or the card falls back to
  // the raw slug ("no_till").
  ...APPROACHES.map((approach) => ({ id: `production.templateModal.approach.${approach}` }))
];

const makeIntl = (locale: string, messages: Record<string, string>) =>
  createIntl(
    {
      locale,
      messages,
      onError: (err) => {
        throw err;
      }
    },
    createIntlCache()
  );

describe.each(LOCALES)('template picker messages — %s', (locale, messages) => {
  const intl = makeIntl(locale, messages);

  it.each(USAGES.map((u) => [u.id, u] as const))('%s formats without error', (_id, usage) => {
    const out = intl.formatMessage({ id: usage.id }, usage.values as any);
    const text = Array.isArray(out) ? out.join('') : String(out);
    expect(text.length).toBeGreaterThan(0);
    // A leaked ICU brace means an argument the call site never passes.
    expect(text).not.toMatch(/[{}]/);
  });

  it('pluralises the events badge on both branches', () => {
    const one = intl.formatMessage({ id: 'production.templateModal.eventsCount' }, { count: 1 });
    const many = intl.formatMessage({ id: 'production.templateModal.eventsCount' }, { count: 22 });
    expect(String(one)).not.toEqual(String(many));
    expect(String(one)).toContain('1');
    expect(String(many)).toContain('22');
  });

  // `setupTime` / `setupMinutes` were pinned here until 2026-08-19. The "Setup Time: 8
  // minutes" tile they fed was deleted from the card (the 8 was a hardcoded literal, identical
  // for every crop, never measured), and the keys went with it. So did
  // `template.badge.auditReady` / `nopReady` / `qrReady` / `transparency` — a template is not
  // audit-ready or NOP compliant; a farm's RECORDS may become those things.

  it('keeps the crop name inside the highlight tag rather than dropping it', () => {
    const out = intl.formatMessage(
      { id: 'production.templateModal.subtitle' },
      { crop: 'Pistachios', count: 2, highlight: (c: React.ReactNode) => c }
    );
    expect(Array.isArray(out) ? out.join('') : String(out)).toContain('Pistachios');
  });
});
