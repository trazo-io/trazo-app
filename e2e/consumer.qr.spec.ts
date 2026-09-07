import { test, expect } from '@playwright/test';

/**
 * The consumer QR page — anonymous, on a phone. COMPLIANCE GUARD, not just a smoke test.
 *
 * Two rules this page must never break, both of which have been broken before:
 *
 *  1. NO SELF-ASSIGNED SUSTAINABILITY GRADE. A "% documented" / "Fully Documented" verdict is
 *     a self-created sustainability label — banned by EU ECGT 2024/825 (in force 2026-09-27,
 *     three weeks from this file's creation) and an FTC 16 CFR 260.6 general-benefit risk.
 *     Transparency is still the primary consumer story, but told through factual EVIDENCE:
 *     counts of documented practices, photos, third-party certifications, a timeline.
 *     History: the grade was removed once, then came back with the number filed off
 *     (2026-09-01) — a grade with the number removed is still a grade.
 *
 *  2. IT MUST BE TESTED ANONYMOUSLY. On 2026-08-06 a score leaked on the authenticated
 *     version of this page while the anonymous one was clean. Logging in does not make a
 *     claim safe, and testing the logged-in page proves nothing about what a shopper sees.
 *
 * The public_id is read from the environment so a reseeded database does not hardcode-rot.
 * Get one with:
 *   poetry run python manage.py shell -c "from history.models import History; \
 *     print(History.objects.filter(published=True).first().public_id)"
 */

const PUBLIC_ID = process.env.E2E_PRODUCTION_PUBLIC_ID ?? '8c1ec95a-5f23-48ae-974b-575386a5b67d';

// Patterns that assert a SELF-ASSIGNED SUSTAINABILITY GRADE.
//
// Every pattern here must be specific to a sustainability/transparency verdict. Factual
// words ("documented", "practices", "photos") are the whole point of the page. So is
// ordinary agronomic vocabulary — and that is not hypothetical: a first draft of this file
// included a bare /\bgrade\b/ and immediately failed on the farmer's own harvest notes,
// "export-grade Valencia oranges" and "92% export grade (EU Rotterdam)". A fruit quality
// grade is not a sustainability grade. A compliance guard that fires on legitimate farm
// language is a guard that gets deleted, so keep every pattern narrow enough to name the
// claim it forbids.
const GRADE_LANGUAGE = [
  /fully documented/i,
  /transparency score/i,
  /\btransparency:\s*\d/i,
  /\b\d{1,3}\s*%\s*(documented|transparent|verified|sustainable)/i,
  /verified transparency/i,
  /sustainability (score|grade|rating|rank)/i,
  /(transparency|sustainability|environmental)\s+grade/i,
  /\bgrade\s*[:=]\s*[A-F]\b/i,
  /\beco[- ]?(score|grade|rating)\b/i
];

test('the QR page loads for an anonymous visitor on a phone', async ({ page }) => {
  const res = await page.goto(`/production/${PUBLIC_ID}`);
  expect(res?.status(), 'QR page must be publicly reachable with no login').toBeLessThan(400);
  await page.waitForLoadState('networkidle');

  const text = await page.locator('body').innerText();
  expect(text.trim().length, 'QR page rendered empty').toBeGreaterThan(50);
});

test('the QR page shows no self-assigned sustainability grade', async ({ page }) => {
  await page.goto(`/production/${PUBLIC_ID}`);
  await page.waitForLoadState('networkidle');

  const text = await page.locator('body').innerText();

  // PROVE THE PAGE ACTUALLY LOADED A PRODUCTION before asserting what it does not say.
  // Without this the guard passes vacuously on a not-found shell: the error page easily
  // clears a length check and contains no grade language, so a reseeded database (which
  // retires this public_id) would turn a claim-safety check green precisely when it had
  // stopped checking anything. A negative assertion must first prove it read something.
  //
  // Both halves are MEASURED against the real 404 page, not guessed. The first draft of this
  // included `farm` in the pattern and still passed on a missing production, because the
  // error page reads "Contact the farm or supplier" and "share ... with this farmer".
  // harvest/lot/documented/practice appear 0 times there and 5-14 times on a real page.
  expect(
    text,
    `the QR page rendered the NOT-FOUND state for public_id ${PUBLIC_ID}. Set ` +
      'E2E_PRODUCTION_PUBLIC_ID to a currently published production; this guard must not ' +
      'pass on an error page.'
  ).not.toMatch(/product not found|no longer be available/i);
  expect(text, `the QR page did not render production content for public_id ${PUBLIC_ID}.`).toMatch(
    /harvest|lot\b|documented|practice/i
  );

  for (const pattern of GRADE_LANGUAGE) {
    expect(
      text,
      `Consumer QR page contains self-graded language matching ${pattern}. ` +
        'The transparency score is a PRODUCER-dashboard KPI only. Consumers get factual ' +
        'evidence (counts, photos, third-party certs), never a grade. ' +
        'See .claude/rules/transparency-first.md and .claude/rules/compliance.md.'
    ).not.toMatch(pattern);
  }
});

test('the anonymous API payload carries no score field', async ({ request }) => {
  // The structural half. Text scanning catches what is RENDERED; this catches a score that is
  // on the wire and merely not painted yet — which is exactly how it comes back. Sanitize at
  // the source: a claim filtered by its reader is still on the wire.
  //
  // Endpoint captured from the live page rather than guessed (four plausible REST spellings
  // all 404'd). This is the single API call the QR page makes for its content.
  const res = await request.get(`/api/transparency/${PUBLIC_ID}/`);
  expect(
    res.ok(),
    `the consumer transparency endpoint returned ${res.status()}; this guard must not silently ` +
      'skip, because a skipped claim-safety check reads exactly like a passing one'
  ).toBeTruthy();

  const body = JSON.stringify(await res.json());
  for (const key of [
    'transparency_score',
    'transparency_tier',
    'verification_verdict',
    'sustainability_score',
    'verification_tier'
  ]) {
    expect(
      body,
      `anonymous payload leaks "${key}" — the score is a PRODUCER-dashboard KPI and must not ` +
        'reach the consumer surface, rendered or not'
    ).not.toContain(`"${key}"`);
  }
});
