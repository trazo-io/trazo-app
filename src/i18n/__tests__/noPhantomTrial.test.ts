/**
 * ⛔ Trazo does not sell a trial. Starter is FREE FOREVER — no card, no clock.
 *
 * This is a pricing FACT, written in CLAUDE.md and enforced in the backend, where
 * `SubscriptionViewSet.start_trial` keeps its name only for URL compatibility and its docstring
 * says so outright: "there is no trial any more". Migration `subscriptions/0015` exists because
 * the phantom "14-day free trial" claim survived a previous cleanup on the $249 plan.
 *
 * 🔴 2026-08-21 — it had survived again, in the one place nobody re-read: the early-access modal
 * on the PUBLIC pricing page told a visitor with no subscription to "start your free 14-day
 * trial … no credit card required", above a button labelled "Start Free Trial". That button
 * calls the endpoint whose own success toast reads "Starter is free forever — no card, no
 * expiry" — so the modal contradicted its own result, in both locales. The backend had been
 * corrected, the success copy had been corrected, and the modal was missed: the
 * "fixed on the audited surface, alive on its sibling" shape this codebase keeps producing.
 *
 * Scoped first to keys that are actually RENDERED. The 36 dead `app.*Trial*` keys left from the
 * pre-2026-08 pricing model ("14-Day Free Trial", "Start Your Free Trial", "Why do you need my
 * credit card for the free trial?") were deleted 2026-11-05, so the catalogue as a whole is now
 * held to the same rule: a dead key is one import away from a live claim.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const SRC = resolve(__dirname, '..', '..');

/** Every source file that could reference a message id. */
const sourceFiles = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'lang') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !/\.test\.|__tests__/.test(full)) out.push(full);
  }
  return out;
};

const ALL_SOURCE = sourceFiles(SRC)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/** Quoted, so `app.earlyAccess.body` is not "used" merely because `bodyExisting` appears. */
const isRendered = (key: string) =>
  ALL_SOURCE.includes(`'${key}'`) ||
  ALL_SOURCE.includes(`"${key}"`) ||
  ALL_SOURCE.includes(`\`${key}\``);

/** The claim, in both languages. Not the word "trial" alone — a legacy `trialing` subscription
 *  may still be DESCRIBED, which is reporting, not selling ("Trial ends on {date}" on the
 *  Subscription page stays legal).
 *
 *  `free trial` / `prueba gratuita` / `prueba gratis` with NO number added 2026-11-04. The
 *  pattern only knew the counted forms ("14-day free trial"), so the dashboard's TrialStatusBanner
 *  rendered "Free Trial Active" and "Prueba gratis activa" past this guard for as long as it was
 *  mounted. A free trial is the claim whether or not it names a length, and Spanish says it two
 *  ways: matching only "gratuita" would have let the Spanish banner through again. */
const OFFERS_A_TRIAL =
  /(free trial|free \d+[- ]day trial|prueba gratuita|prueba gratis|\d+ d[ií]as de prueba)/i;

describe('no phantom trial in live copy', () => {
  it('finds source to scan (guards the guard)', () => {
    // Without this the two assertions below pass vacuously the moment the walk breaks.
    expect(ALL_SOURCE.length).toBeGreaterThan(100_000);
    expect(isRendered('app.earlyAccess.startTrial')).toBe(true);
  });

  for (const [locale, catalogue] of [
    ['en-US', enUS],
    ['es-419', es419]
  ] as const) {
    it(`${locale}: no rendered string offers a trial`, () => {
      const offenders = Object.entries(catalogue as Record<string, string>)
        .filter(([, value]) => typeof value === 'string' && OFFERS_A_TRIAL.test(value))
        .filter(([key]) => isRendered(key))
        .map(([key, value]) => `${key} = ${value}`);

      expect(offenders, 'Starter is free forever — no card, no clock, no trial').toEqual([]);
    });

    it(`${locale}: no string in the catalogue offers a trial, rendered or not`, () => {
      const offenders = Object.entries(catalogue as Record<string, string>)
        .filter(([, value]) => typeof value === 'string' && OFFERS_A_TRIAL.test(value))
        .map(([key, value]) => `${key} = ${value}`);
      expect(offenders, 'a dead key is one import away from a live claim').toEqual([]);
    });
  }
});
