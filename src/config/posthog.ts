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
 * WHERE CONSENT IS ASKED, AND WHERE IT IS NOT (revised 2026-09-08)
 * ---------------------------------------------------------------
 * Two surfaces, two different relationships, two different legal bases. Conflating them was
 * the original mistake here.
 *
 *   ANONYMOUS PUBLIC (consumer QR page, landing site) — BANNER.
 *     A shopper scanning a code in a store agreed to nothing. ePrivacy Art. 5(3) applies with
 *     no `strictly necessary` exemption, so nothing may be stored or captured until they
 *     accept. `ConsentBanner` lives in `ConsumerProductLayout` and predates PostHog: it also
 *     gates the geolocation enrichment on `public_scans` (see views/Dashboard/Buyer/index.tsx).
 *     Do not remove it.
 *
 *   AUTHENTICATED PRODUCER (layouts/Admin.tsx) — NO BANNER.
 *     A signed-in farm accepted the Terms and requested the service. Product analytics on a
 *     B2B tool runs on legitimate interest (GDPR Art. 6(1)(f)) plus contract, disclosed in the
 *     Privacy Policy — not behind a modal. This is what every comparable product does (Linear,
 *     Notion, Vercel, Stripe, Figma, GitHub all show a banner on the marketing site and none
 *     inside the product), and it is what CCPA/CPRA asks for: notice at collection, not a gate.
 *     `startProducerAnalytics()` opts in at sign-in instead.
 *
 *     ⛔ A banner on the producer LOGIN page was worse than no banner at all: declining there
 *     and then being captured immediately after sign-in is a promise visibly broken. Removed
 *     from `layouts/Auth.tsx` 2026-09-08. Do not add it back — change this posture in the
 *     Privacy Policy first, or not at all.
 *
 * So the configuration below is deliberately maximal-masking:
 *   - `opt_out_capturing_by_default: true` — the DEFAULT is capture-off, so a surface that
 *     never opts in never sends anything. The anonymous QR visitor opts in via the banner;
 *     the authenticated producer is opted in by `startProducerAnalytics`. Neither path can
 *     happen by accident.
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
 *   1. Add PostHog to the Privacy Policy and the Cookie Policy on the landing site, naming
 *      session replay and saying what it records (a masked wireframe — see below). The
 *      Cookie Policy currently lists Vercel Analytics only. This disclosure IS the control
 *      for the producer surface, since there is no banner there.
 *   2. NOT a blocker, and deliberately so: `maskTextSelector: '*'` records a WIREFRAME —
 *      layout, clicks and scroll, with no text at all. The `data-private` pass is only
 *      needed to UNMASK selectively, which nothing currently needs.
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
    // Element TEXT can be a worker's name in a table cell, and element ATTRIBUTES can carry an
    // id, a title or an aria-label built from the same data. Capture the interaction, never the
    // content of what was clicked. Allowlist-free, so no maintenance as new screens are added.
    //
    // ⚠️ These are TOP-LEVEL, snake_case options. Two earlier attempts at this same block were
    // both silently ineffective, which is why the naming is spelled out here:
    //
    //   1. `autocapture: { element_attribute_ignorelist: ['data-private'] }` — a real option,
    //      but it means "do not record the VALUE of the attribute NAMED data-private". It masks
    //      no text and no other attribute.
    //   2. `autocapture: { maskAllText, maskAllElementAttributes }` — camelCase, nested. Those
    //      names exist only on posthog-js's INTERNAL resolved `AutocaptureConfig`, not on the
    //      `AutocaptureConfig` in @posthog/types that `init()` actually accepts. TypeScript
    //      rejected it (TS2353); at runtime it would have been dropped in silence.
    //
    // The options `init()` reads are `mask_all_text` and `mask_all_element_attributes` on the
    // config root — @posthog/types/dist/posthog-config.d.ts:1659,1665, documented there as
    // "Prevent autocapture from capturing textContent on elements".
    mask_all_text: true,
    mask_all_element_attributes: true,
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
 * Begin analytics for a signed-in producer: opt in, then attach the session to their id.
 *
 * This is the producer equivalent of the consumer banner's Accept — the legal basis is the
 * Terms they accepted, not a click on a modal (see the posture note at the top of this file).
 * Called from `layouts/Admin.tsx` when `state.userState.user` first resolves, which is the
 * only place a producer is known to be both authenticated and inside the product.
 *
 * NEVER pass an email, a name or a company name. The id is enough to follow a pilot farm's
 * journey across sessions, and anything more is data we would have to defend keeping.
 *
 * Idempotent: PostHog ignores a repeat `identify` with the same distinct id, and the guard
 * below makes the unconfigured case a no-op, so calling it on every render of the layout is
 * safe.
 */
export const startProducerAnalytics = (userId: string | number, farmCount?: number): void => {
  if (!KEY) return;
  initPostHog();
  posthog.opt_in_capturing();
  posthog.identify(String(userId), farmCount === undefined ? undefined : { farm_count: farmCount });
};

export default posthog;
