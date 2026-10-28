/**
 * The map search's Google Places suggestions call `places.googleapis.com`, which no other Maps
 * feature touches. The production CSP's `connect-src` must allow it, in BOTH host configs: dev
 * sends no CSP, so a missing entry works locally and is a silently empty suggestion list in
 * production (the `media-src` and Permissions-Policy incidents had the same shape).
 *
 * Derived from the code, not a hand list: any source that loads the Places library makes the host
 * required, and the guard fails until it is allowlisted.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const HOST = 'https://places.googleapis.com';

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(t|j)sx?$/.test(name) ? [path] : [];
  });

const connectSrc = (host: string): string[] => {
  let csp: string;
  if (host === 'netlify.toml') {
    const line = readFileSync(join(ROOT, 'netlify.toml'), 'utf8')
      .split('\n')
      .find((l) => l.includes('Content-Security-Policy'));
    if (!line) throw new Error('no Content-Security-Policy in netlify.toml');
    csp = line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
  } else {
    const headers = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).headers ?? [];
    const hit = headers
      .flatMap((e: { headers?: Array<{ key: string; value: string }> }) => e.headers ?? [])
      .find((h: { key: string }) => h.key === 'Content-Security-Policy');
    if (!hit) throw new Error('no Content-Security-Policy in vercel.json');
    csp = hit.value;
  }
  const directive = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('connect-src '));
  return directive ? directive.split(/\s+/).slice(1) : [];
};

describe('CSP: Google Places', () => {
  const usesPlaces = sourceFiles(join(ROOT, 'src')).some((file) =>
    /importLibrary\(\s*['"]places['"]\s*\)/.test(readFileSync(file, 'utf8'))
  );

  it('the app loads the Places library (or this guard has nothing to guard)', () => {
    expect(usesPlaces).toBe(true);
  });

  it.each(['netlify.toml', 'vercel.json'])('%s connect-src allows %s', (host) => {
    expect(connectSrc(host)).toContain(HOST);
  });
});
