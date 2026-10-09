/**
 * The navbar search shows no carbon figure.
 *
 * Until 2026-09-30 the backend served `carbon_score` as `parcel_count * 25.5` for farms (an
 * "example calculation") and a real footprint for parcels, under one key, and this component
 * printed both as "{value} kg CO₂" beside a green leaf. A four-parcel farm read "102 kg CO₂".
 * The backend no longer sends it (trazo-back, global_search); nothing here may read or print it.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

describe('global search carries no carbon figure', () => {
  it.each([
    ['../TrazoGlobalSearch.tsx'],
    ['../../../hooks/useGlobalSearch.ts'],
    ['../../../store/api/globalSearchApi.ts']
  ])('%s neither reads nor prints one', (rel) => {
    const code = read(rel)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/carbon_?score/i);
    expect(code).not.toMatch(/kg CO/);
  });
});
