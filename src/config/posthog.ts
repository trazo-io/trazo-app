/**
 * PostHog — product analytics, session replay and feature flags.
 *
 * WHY (2026-09-07, ahead of the October pilots)
 * ---------------------------------------------
 * We get maybe five pilot farms. When one logs two events and stops, there is currently no
 * way to know why: Sentry says what CRASHED, nothing says what was CONFUSING. Session replay
 * is the difference between "farm 3 churned" and "farm 3 could not find the Add Event button
 * on a phone". Feature flags let a farm-by-farm rollout happen without a deploy per farm.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PRIVACY POSTURE — read this before changing any option below
 * ─────────────────────────────────────────────────────────────────────────────
 * Session replay records the SCREEN. Trazo's screens carry worker names (gated by the
 * `show_full_performer_names` consent flag), parcel locations, buyer details and farm
 * financials. Recording that without care would contradict the product's own privacy
 * promises — on a product whose entire pitch is transparency, that is not a small
 * inconsistency.
 *
 * So the configuration below is deliberately maximal-masking:
 *   - `opt_out_capturing_by_default: true` — NOTHING is captured until the visitor accepts
 *     via the existing consent banner. This is opt-IN, which is what GDPR/ePrivacy require
 *     and what the banner already promises.
 *   - `maskAllInputs: true` — every form field is masked, including the ones that have not
 *     been written yet. An allowlist would need updating every time a field is added, and
 *     `cleanEventData` in the activity wizard has already shown that "we will remember to
 *     update the list" is not a control that holds.
 *   - `maskTextSelector: '*'` — ALL text is masked in recordings, not an allowlist. Narrow
 *     this only after every worker-name and parcel-location site carries `data-private`.
 *   - `disable_session_recording` unless explicitly enabled, so replay is a decision, not
 *     a default.
 *   - `person_profiles: 'identified_only'` — no profile is created for anonymous QR-page
 *     visitors, who are members of the public and never asked to be tracked.
 *
 * ⚠️ BEFORE THE FIRST PILOT SESSION, three things must happen outside this file:
 *   1. Update the Cookie Policy and the consent banner copy to name PostHog and say what
 *      session replay records. The banner currently speaks of "analytics" generically.
 *   2. Add `data-private` to the worker-name and parcel-location render sites.
 *   3. Decide and write down a retention period in the PostHog project settings.
 * Tracked in documentation/adr/010-platform-tooling-and-dependency-currency.md.
 *
 * CONFIGURATION
 * -------------
 * Disabled unless VITE_POSTHOG_KEY is set, so this is inert until someone deliberately
 * turns it on. Never hardcode the key here — unlike a Sentry DSN, a PostHog project key
 * belongs in the environment so dev, staging and production stay separate.
 */

import posthog from 'posthog-js';

import { hasAnalyticsConsent } from '../components/Privacy/ConsentBanner';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';
const REPLAY_ENABLED = import.meta.env.VITE_POSTHOG_REPLAY === 'true';

let initialised = false;

/**
 * Initialise PostHog. Safe to call more than once; safe to call when unconfigured.
 * Capture stays OFF until `grantAnalyticsConsent()` runs, even after this returns.
 */
export const initPostHog = (): void => {
  if (initialised || !KEY) return;

  posthog.init(KEY, {
    api_host: HOST,
    // Opt-IN. Nothing leaves the browser until the visitor accepts.
    opt_out_capturing_by_default: true,
    // No shadow profile for anonymous consumers scanning a QR code in a shop.
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: !REPLAY_ENABLED,
    session_recording: {
      // Never record what someone types into a field, even transiently.
      maskAllInputs: true,
      // '*' masks the text of EVERY element, not just those tagged `data-private`.
      //
      // ⚠️ Corrected 2026-09-07. This read `'[data-private]'`, which is an ALLOWLIST — and
      // this file's own argument three paragraphs up is that an allowlist "would need
      // updating every time a field is added". Replay text was the one place that argument
      // was not applied. Until every worker-name and parcel-location render site carries
      // `data-private`, `'[data-private]'` means a worker's name in a table cell IS recorded.
      // Defaulting to '*' makes the safe case the one you get by forgetting.
      //
      // Relaxing this is a deliberate, reviewable act: narrow the selector only after the
      // `data-private` pass is done, and only as far as the pass actually covers.
      maskTextSelector: '*',
      recordCrossOriginIframes: false
    },
    autocapture: {
      // Element TEXT can be a worker's name in a table cell, and element ATTRIBUTES can carry
      // an id, a title or an aria-label built from the same data. Capture the interaction,
      // never the content of what was clicked.
      //
      // ⚠️ Corrected 2026-09-07. This block first read
      // `element_attribute_ignorelist: ['data-private']`, which typechecks and is a real
      // option — but it means "do not record the value of the attribute NAMED data-private".
      // It does not mask text, and it does not mask any other attribute. The comment above it
      // claimed a protection the code did not provide, which is the worst kind of wrong:
      // reviewable, plausible, and silently ineffective.
      //
      // `maskAllText` and `maskAllElementAttributes` are the options that actually implement
      // the stated intent, and they are allowlist-free — they need no maintenance as new
      // screens are added, which matters because the field set here grows constantly.
      maskAllText: true,
      maskAllElementAttributes: true
    },
    loaded: (ph) => {
      // Honour a decision the visitor already made on a previous visit.
      try {
        if (hasAnalyticsConsent()) ph.opt_in_capturing();
      } catch {
        /* storage blocked — stay opted out, which is the safe direction */
      }
    }
  });

  initialised = true;
};

/** Call from the consent banner's Accept handler. */
export const grantAnalyticsConsent = (): void => {
  if (!KEY) return;
  initPostHog();
  posthog.opt_in_capturing();
};

/** Call from the consent banner's Decline handler and from "Privacy Settings" -> reset. */
export const revokeAnalyticsConsent = (): void => {
  if (!KEY || !initialised) return;
  posthog.opt_out_capturing();
  posthog.reset();
};

/**
 * Associate the session with a signed-in producer. NEVER pass an email or a worker name —
 * the id is enough to follow a pilot farm's journey, and anything more is data we would have
 * to defend keeping.
 *
 * ⚠️ NOT WIRED YET, deliberately, and this note exists so nobody assumes otherwise. Until it
 * is called, every event is anonymous and a pilot farm's journey cannot be followed across
 * sessions — which is most of why PostHog is here. Wire it where the producer's user object
 * first resolves after sign-in, and pass ONLY `user.id`.
 */
export const identifyProducer = (userId: string | number, farmCount?: number): void => {
  if (!KEY || !initialised) return;
  posthog.identify(String(userId), farmCount === undefined ? undefined : { farm_count: farmCount });
};

export default posthog;
