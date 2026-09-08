import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E — the pilot-critical paths.
 *
 * WHY THIS EXISTS (2026-09-07)
 * ----------------------------
 * Before this file there was no E2E coverage of any kind. The 2026-09-07 pilot rehearsal
 * found two defects by hand, both on the path a pilot farm walks on day one:
 *   - the OSP certifier packet was DEAD (a `MaterialRow` unpack error)
 *   - the email verification code input silently dropped every LETTER, because Chakra's
 *     PinInput defaults to `type="number"`
 * Neither is subtle. Both survived because every rehearsal was manual, and a manual
 * rehearsal is not repeatable — it tests whatever the tester remembered to try.
 *
 * PREREQUISITES (the suite does not start these for you)
 * -----------------------------------------------------
 *   docker compose -f trazo-back/compose.services.yml up -d    # NOT compose.yml
 *   cd trazo-back && poetry run python manage.py runserver
 *   cd trazo-back && poetry run python manage.py ensure_e2e_user
 *   cd trazo-app  && npm run start
 *
 * HOST — this matters, do not "simplify" it
 * -----------------------------------------
 * baseURL is `app.localhost`, not `localhost`. The backend's CSRF configuration rejects
 * plain `localhost` with "CSRF Failed", and cookie domain is `.localhost` in dev. Vite also
 * proxies `/api` to :8000 (see vite.config server.proxy) so the API stays same-origin and
 * the httpOnly auth cookies are actually set. Change either half and auth breaks in a way
 * that looks like a login bug.
 *
 * KNOWN ENVIRONMENT TRAPS, encoded here so they are not rediscovered:
 *   - driver.js product tours intercept clicks. Tours are disabled via localStorage in the
 *     auth setup; if a spec starts failing on an invisible overlay, that is why.
 *   - Chakra NumberInput renders an input with an EMPTY name attribute. Select by label.
 *   - <datalist> options are invisible to Playwright. Type the value, do not pick it.
 *   - Conditional form sections render only AFTER their trigger field is set. Fill `type` /
 *     `business_type` FIRST, then re-query for the fields that appear.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://app.localhost:3000';

export default defineConfig({
  testDir: './e2e',
  // Serial by default. These specs share one backend and one database; parallel writes to
  // the same farm produce failures that look like product bugs and are not.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // Artefacts only on failure: a green run should cost no disk.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  projects: [
    // Signs in once, saves the httpOnly cookie jar, and every other project reuses it.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      // The consumer specs must NOT run here. Running them with a producer cookie jar tests
      // the authenticated page, which is exactly the mistake that let an authenticated-only
      // score leak ship on 2026-08-06.
      testIgnore: /consumer\..*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/producer.json' },
      dependencies: ['setup']
    },
    // The QR page is the consumer surface. Deliberately ANONYMOUS — no storageState — and on
    // a phone, because that is the only combination a real shopper ever has.
    {
      name: 'consumer-mobile',
      testMatch: /consumer\..*\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        baseURL: process.env.E2E_CONSUMER_URL ?? 'http://consumer.localhost:3000',
        storageState: { cookies: [], origins: [] }
      }
    }
  ]
});
