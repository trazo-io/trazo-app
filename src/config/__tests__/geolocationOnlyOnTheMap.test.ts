/**
 * Location: allowed by the header, asked for in exactly one place.
 *
 * `Permissions-Policy: geolocation=()` blocked "Use my location" on the parcel boundary map in
 * production while it worked in dev, which sends no such header (the `media-src` CSP incident
 * had the same shape). It is now `geolocation=(self)`, which lets OUR pages ask; the browser
 * still prompts, nothing is granted by the header alone.
 *
 * The header covers every page, consumer QR pages included, and a shopper scanning a lot must
 * never be asked where they are (public scans record no location by design). So the header
 * is pinned here per host config, and so is the one file allowed to call the API.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const SRC = join(ROOT, 'src');
const ALLOWED = ['src/components/Map/MapPlaceSearch.tsx'];

const policy = (host: string): string => {
  if (host === 'netlify.toml') {
    const line = readFileSync(join(ROOT, 'netlify.toml'), 'utf8')
      .split('\n')
      .find((l) => l.includes('Permissions-Policy'));
    if (!line) throw new Error('no Permissions-Policy in netlify.toml');
    return line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
  }
  const headers = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).headers ?? [];
  for (const entry of headers) {
    const hit = (entry.headers ?? []).find((h: { key: string }) => h.key === 'Permissions-Policy');
    if (hit) return hit.value as string;
  }
  throw new Error('no Permissions-Policy in vercel.json');
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(t|j)sx?$/.test(name) ? [path] : [];
  });

describe('geolocation', () => {
  it.each(['netlify.toml', 'vercel.json'])(
    '%s lets the app ask for location, and changes nothing else',
    (host) => {
      expect(policy(host)).toBe('camera=(), microphone=(self), geolocation=(self)');
    }
  );

  it('is asked for only by the map search', () => {
    const callers = sourceFiles(SRC)
      .filter((file) => readFileSync(file, 'utf8').includes('navigator.geolocation'))
      .map((file) => relative(ROOT, file));
    expect(callers).toEqual(ALLOWED);
  });
});
