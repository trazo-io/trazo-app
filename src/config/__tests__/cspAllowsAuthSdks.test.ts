/**
 * CSP guard for the social sign-in SDKs and the inline color-mode script.
 *
 * Production Google sign-in was dead on app.trazo.io because `script-src` allowlisted
 * `https://apis.google.com` while the Google Identity Services SDK is served from
 * `https://accounts.google.com/gsi/client`. `connect-src` and `frame-src` both named
 * accounts.google.com — only `script-src` missed it, so the SDK never loaded and the
 * button was a silent no-op. A grep for "accounts.google.com" in the config passes
 * vacuously: the host IS there, in the wrong directive.
 *
 * So assert per-DIRECTIVE, and derive the required hosts from the loader code itself
 * rather than from a hand-written list, so adding a new SDK loader fails this test
 * until its host is allowlisted.
 *
 * The inline script hash is the other half: `script-src` pins a sha256 of the one
 * inline script in index.html (Chakra's color-mode init). Edit that script and the
 * hash goes stale — CSP then blocks it and the app flashes the wrong color mode with
 * no build error. Recompute the hash below from index.html on every change.
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const NETLIFY = join(ROOT, 'netlify.toml');
const VERCEL = join(ROOT, 'vercel.json');
const INDEX_HTML = join(ROOT, 'index.html');
const SOCIAL_AUTH = join(ROOT, 'src/utils/socialAuth.ts');

/** Pull the CSP string out of each host config. */
const CSP_SOURCES: Array<[string, () => string]> = [
  [
    'netlify.toml',
    () => {
      const line = readFileSync(NETLIFY, 'utf8')
        .split('\n')
        .find((l) => l.includes('Content-Security-Policy'));
      if (!line) throw new Error('no Content-Security-Policy in netlify.toml');
      return line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
    }
  ],
  [
    'vercel.json',
    () => {
      const headers = JSON.parse(readFileSync(VERCEL, 'utf8')).headers ?? [];
      for (const entry of headers) {
        const hit = (entry.headers ?? []).find(
          (h: { key: string }) => h.key === 'Content-Security-Policy'
        );
        if (hit) return hit.value as string;
      }
      throw new Error('no Content-Security-Policy in vercel.json');
    }
  ]
];

const directive = (csp: string, name: string): string => {
  const found = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d === name || d.startsWith(`${name} `));
  if (found === undefined) throw new Error(`CSP has no ${name} directive`);
  return found;
};

/** Every absolute script URL the SDK loaders actually inject. */
const sdkScriptOrigins = (): string[] => {
  const src = readFileSync(SOCIAL_AUTH, 'utf8');
  const urls = src.match(/script\.src\s*=\s*\s*['"`]([^'"`]+)['"`]/g) ?? [];
  const origins = urls
    .map((m) => m.replace(/^[\s\S]*?['"`]/, '').replace(/['"`]$/, ''))
    .filter((u) => u.startsWith('https://'))
    .map((u) => new URL(u).origin);
  return [...new Set(origins)];
};

/** sha256-base64 of every inline (src-less) script in index.html. */
const inlineScriptHashes = (): string[] => {
  const html = readFileSync(INDEX_HTML, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  const hashes: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    hashes.push(createHash('sha256').update(m[1], 'utf8').digest('base64'));
  }
  return hashes;
};

describe.each(CSP_SOURCES)('%s CSP', (_name, readCsp) => {
  it('allowlists every SDK host the loader code injects, in script-src', () => {
    const scriptSrc = directive(readCsp(), 'script-src');
    const origins = sdkScriptOrigins();

    // Sanity: the loaders must still be there, or this test passes vacuously.
    expect(origins.length).toBeGreaterThanOrEqual(3);
    expect(origins).toContain('https://accounts.google.com');

    for (const origin of origins) {
      expect(scriptSrc.split(/\s+/)).toContain(origin);
    }
  });

  it('pins a hash for every inline script in index.html', () => {
    const scriptSrc = directive(readCsp(), 'script-src');
    const hashes = inlineScriptHashes();

    // Sanity: index.html still carries the color-mode init.
    expect(hashes.length).toBeGreaterThan(0);

    for (const hash of hashes) {
      expect(scriptSrc).toContain(`'sha256-${hash}'`);
    }
  });
});
