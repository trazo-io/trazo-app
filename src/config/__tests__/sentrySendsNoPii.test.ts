import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { scrubBreadcrumb, scrubEvent, scrubUrl } from '../sentryScrub';

// OV-SEC-C17: the browser sent IP addresses and whole URLs, reset and verification tokens included.
const TOKEN = 'k9Qz-reset-token-0123456789';

describe('what the browser sends to Sentry', () => {
  it('drops the query string and the fragment from a URL', () => {
    expect(scrubUrl(`https://app.trazo.io/auth/reset-password?token=${TOKEN}`)).toBe(
      'https://app.trazo.io/auth/reset-password'
    );
    expect(scrubUrl(`/auth/verify#code=${TOKEN}`)).toBe('/auth/verify');
    expect(scrubUrl('/dashboard/farm/12')).toBe('/dashboard/farm/12');
    expect(scrubUrl(undefined)).toBeUndefined();
  });

  it('removes tokens from the page address, the query field and every breadcrumb URL', () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: `https://app.trazo.io/auth/confirm-email-change?token=${TOKEN}`,
        query_string: `token=${TOKEN}`,
        cookies: { access: TOKEN },
        headers: { Referer: `https://app.trazo.io/certifier-review/${TOKEN}?x=${TOKEN}` }
      },
      breadcrumbs: [
        { category: 'navigation', data: { from: '/', to: `/auth/reset-password?token=${TOKEN}` } },
        { category: 'fetch', data: { method: 'POST', url: `/api/users/confirm?token=${TOKEN}` } },
        { category: 'ui.click', message: 'button' }
      ]
    });
    const sent = JSON.stringify(event);
    expect(sent).not.toContain(TOKEN);
    // ANTI-VACUITY: the event still says where the error happened.
    expect(event.request?.url).toBe('https://app.trazo.io/auth/confirm-email-change');
    expect(event.breadcrumbs?.[1].data?.method).toBe('POST');
    expect(event.request?.headers?.Referer).toBe(
      'https://app.trazo.io/certifier-review/[redacted]'
    );
    expect(event.breadcrumbs?.[2].message).toBe('button');
  });

  it('masks the credential in a review-link or invitation path, app route and API route alike', () => {
    expect(scrubUrl(`https://app.trazo.io/certifier-review/${TOKEN}`)).toBe(
      'https://app.trazo.io/certifier-review/[redacted]'
    );
    expect(scrubUrl(`/api/certifier-review/${TOKEN}/documents/41/`)).toBe(
      '/api/certifier-review/[redacted]/documents/41/'
    );
    expect(scrubUrl(`/buyer-review/${TOKEN}`)).toBe('/buyer-review/[redacted]');
    expect(scrubUrl(`/api/invitation/${TOKEN}/accept/`)).toBe('/api/invitation/[redacted]/accept/');
    expect(scrubUrl(`/invitation/${TOKEN}/setup`)).toBe('/invitation/[redacted]/setup');
  });

  it('scrubs a breadcrumb as it is recorded, not only when an error is sent', () => {
    const crumb = scrubBreadcrumb({
      category: 'xhr',
      data: { url: `/api/invitation/abc/accept/?t=${TOKEN}` }
    });
    expect(JSON.stringify(crumb)).not.toContain(TOKEN);
  });

  it('is wired: no default PII, and both hooks installed', () => {
    const source = readFileSync(resolve(__dirname, '../sentry.ts'), 'utf8');
    expect(source).toMatch(/sendDefaultPii:\s*false/);
    expect(source).not.toMatch(/sendDefaultPii:\s*true/);
    expect(source).toMatch(/beforeSend:\s*scrubEvent/);
    expect(source).toMatch(/beforeBreadcrumb:\s*scrubBreadcrumb/);
  });
});
