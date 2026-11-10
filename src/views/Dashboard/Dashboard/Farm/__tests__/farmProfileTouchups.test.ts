/**
 * Farm profile touch-ups, last slice of the settings-pages audit (2026-11-10).
 *
 * - One solid button on the page's primary jobs (share link, dossier); the four "Add ..." card
 *   actions were solid green too, so every card shouted. They are outline.
 * - Each supplier spelling found on records is ONE row, its actions at the row's end.
 * - The split-operation answer is the farm's own declaration: neutral text, not green.
 * - The regulatory note is a plain caption, not an info alert with a coloured edge.
 * - Farm type and farming method read the catalogue ("Finca de cultivos", "Orgánico"), not a
 *   title-cased slug that stayed English in Spanish ("Crop Farm").
 * - Back names the farm and goes to its home.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../../../i18n/lang/en-US.json';

const DIR = join(__dirname, '..');
const read = (file: string) => readFileSync(join(DIR, file), 'utf8');
const PROFILE = read('ProfileFarm.tsx');

// The opening tag of the StandardButton whose label is `labelId`.
const buttonFor = (src: string, labelId: string) => {
  const at = src.indexOf(`'${labelId}'`);
  expect(at, `${labelId} moved`).toBeGreaterThan(-1);
  const open = src.lastIndexOf('<StandardButton', at);
  return src.slice(open, src.indexOf('>', src.indexOf('onClick', open)) + 1);
};

describe('farm profile touch-ups', () => {
  it.each([
    ['ProfileFarm.tsx', 'certification.manage.add'],
    ['SupplierRegisterSection.tsx', 'suppliers.add'],
    ['BrandOwnerRegisterSection.tsx', 'brandOwners.add'],
    ['EquipmentRegisterSection.tsx', 'equipment.add']
  ])('%s: the card-level Add is an outline button', (file, labelId) => {
    expect(buttonFor(read(file), labelId)).toContain('variant="outline"');
  });

  it('labels its Add buttons in sentence case', () => {
    expect((enUS as Record<string, string>)['certification.manage.add']).toBe('Add certification');
  });

  it('puts a supplier spelling and its actions on one row', () => {
    const src = read('SupplierRegisterSection.tsx');
    const row = src.slice(
      src.indexOf("'suppliers.unconfirmed.row'") - 600,
      src.indexOf("'suppliers.unconfirmed.create'")
    );
    expect(row).toMatch(/<Flex[\s\S]*justify="space-between"/);
    expect(row).not.toMatch(/<HStack spacing=\{2\} mt=\{1\}/);
  });

  it('shows the split-operation answer in neutral text and the rules as a caption', () => {
    const answer = PROFILE.slice(
      PROFILE.indexOf("'farm.split.toggleLabel'"),
      PROFILE.indexOf("'farm.split.declaredYes'")
    );
    expect(answer).not.toContain('green.');
    expect(PROFILE).not.toMatch(/<StandardAlert/);
  });

  it('reads farm type and farming method from the catalogue', () => {
    expect(PROFILE).toMatch(/catalogueLabel\(\s*'farm\.form\.farmType'/);
    expect(PROFILE).toMatch(/catalogueLabel\(\s*'quickStart\.field\.productionMethod\.option'/);
    expect(PROFILE).not.toMatch(
      /formatDisplayValue\(\s*establishmentData\.(farming_method|establishment_type)/
    );
  });

  it('names the farm on Back and goes to its home', () => {
    expect(PROFILE).not.toContain("onBack={() => navigate('/admin/dashboard')}");
    expect(PROFILE).toContain("'common.backTo'");
    expect(PROFILE).toContain('navigate(`/admin/dashboard/farm/${farmId}`)');
  });
});
