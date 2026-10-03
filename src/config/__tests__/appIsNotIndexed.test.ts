/**
 * app.trazo.io and consumer.trazo.io must stay out of search results.
 *
 * Until 2026-10-03 neither host had a robots.txt (the SPA fallback served index.html
 * at /robots.txt) and nothing sent noindex, so sign-in screens and consumer QR pages
 * were indexable. The fix is an `X-Robots-Tag: noindex` header for every path.
 *
 * The trap this guards: "hardening" robots.txt with `Disallow: /`. Google then never
 * fetches the pages, never sees the header, and can still list a URL it found linked
 * elsewhere. So assert both halves: the header is set, and crawling is not blocked.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const PUBLIC = join(__dirname, '../../../public');

describe('app hosts are not indexed', () => {
  it('sends X-Robots-Tag: noindex for every path', () => {
    const rules = readFileSync(join(PUBLIC, '_headers'), 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'));
    const start = rules.findIndex((l) => l.trim() === '/*');
    expect(start).toBeGreaterThanOrEqual(0);
    const block: string[] = [];
    for (const line of rules.slice(start + 1)) {
      if (!/^\s+\S/.test(line)) break;
      block.push(line.trim());
    }
    expect(block).toContain('X-Robots-Tag: noindex');
  });

  it('does not block crawling, which would hide the noindex header', () => {
    const robots = readFileSync(join(PUBLIC, 'robots.txt'), 'utf8')
      .split('\n')
      .map((l) => l.split('#')[0].trim())
      .filter(Boolean);
    expect(robots).toContain('User-agent: *');
    expect(robots.some((l) => /^Disallow:\s*\/\s*$/i.test(l))).toBe(false);
  });
});
