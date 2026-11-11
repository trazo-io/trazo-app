/**
 * The season hint in the crop table matches crop names by whole word, singular, like the parcel PDF's
 * review line (`crop_is_listed` in trazo-back parcel_application_lines.py). A substring test let a listed
 * "Apple" hide an open "Pineapple" season (review of back #381).
 */
import { describe, expect, it } from 'vitest';
import { cropIsListed } from '../PlannedCropRows';

describe('cropIsListed', () => {
  it('matches the same crop in singular, plural and with a variety', () => {
    expect(cropIsListed('Pears', ['Bartlett pears'])).toBe(true);
    expect(cropIsListed('Peaches', ['Peach'])).toBe(true);
    expect(cropIsListed('Blueberries', ['Blueberry (Duke)'])).toBe(true);
  });

  it('never lets a crop hide inside another word', () => {
    expect(cropIsListed('Pineapple', ['Apple'])).toBe(false);
    expect(cropIsListed('Peach', ['Pea'])).toBe(false);
  });
});
