import { test, expect } from '@playwright/test';

/**
 * Path 2 — email verification code entry. REGRESSION GUARD.
 *
 * Found by hand in the 2026-09-07 pilot rehearsal: the verification-code input silently
 * dropped every LETTER. Chakra's PinInput defaults to `type="number"`, so an alphanumeric
 * code could not be typed at all. It stayed invisible because the emailed magic link bypassed
 * the field, so nobody who tested by clicking the link ever saw it — and a pilot farmer who
 * types the code from their phone hits it immediately.
 *
 * This is a pure UI-contract test: it does not need a real code, only proof that the field
 * ACCEPTS the character class real codes are drawn from.
 */

test.describe('verification code entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/verifyemail?email=e2e%40trazo.test');
    await page.waitForLoadState('networkidle');
  });

  test('the code field accepts letters, not only digits', async ({ page }) => {
    // MEASURED DOM (2026-09-07): six inputs, class `chakra-pin-input`, type="text",
    // inputmode="text", and NO maxlength attribute. Two earlier selectors were wrong and
    // each failed differently, so both are recorded here:
    //   input[maxlength="1"]                     -> 0 matches, and the spec SKIPPED. A guard
    //                                               that skips is not a guard; that is worse
    //                                               than a failure because it reads green.
    //   input[inputmode], input[maxlength="1"]   -> 6 matches, but see the typing note below.
    const boxes = page.locator('input.chakra-pin-input');
    await expect(
      boxes.first(),
      'verification screen did not render the pin input — the selector or the route is wrong, ' +
        'and this guard must fail rather than skip'
    ).toBeVisible();
    expect(await boxes.count(), 'expected a multi-box pin input').toBeGreaterThan(1);

    // Fill box-by-box rather than page.keyboard.type(). PinInput advances focus
    // asynchronously, so typing six characters in a burst races the advance and lands only
    // every other one — that is what produced "1C3" from "A1B2C3" and looked exactly like
    // the dropped-letter bug this spec exists to catch. A false positive on THIS spec would
    // be read as the regression returning, so determinism matters more than realism here.
    const code = 'A1B2C3';
    for (let i = 0; i < Math.min(code.length, await boxes.count()); i++) {
      await boxes.nth(i).fill(code[i]);
    }

    const values = await boxes.evaluateAll((els) =>
      els.map((e) => (e as HTMLInputElement).value).join('')
    );

    expect(
      values.replace(/\s/g, ''),
      `Letters were dropped from the verification code field (captured "${values}"). This is ` +
        'the 2026-09-07 regression: Chakra PinInput defaults to type="number", which silently ' +
        'discards every non-digit, while the backend builds codes from ascii_letters + digits. ' +
        'The fix is type="alphanumeric" on the PinInput in ModernVerifyEmail.tsx.'
    ).toMatch(/[A-Z]/i);
  });

  test('the code field is not a numeric input', async ({ page }) => {
    const boxes = page.locator('input.chakra-pin-input');
    await expect(boxes.first()).toBeVisible();

    // The structural half of the same guard: even if a future implementation filters
    // characters elsewhere, `type=number` is never the right control for an alphanumeric code.
    const types = await boxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).type));
    expect(types, 'a code field must not be type="number"').not.toContain('number');
  });
});
