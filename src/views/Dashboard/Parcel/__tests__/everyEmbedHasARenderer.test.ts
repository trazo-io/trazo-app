/**
 * Every embed the Parcel Application module declares has a case in the wizard's `renderEmbed`.
 *
 * 2026-11-06: `parcel_change_notifications` and `contamination_incidents` fell to `default: return
 * null`, so the wizard showed their headings over nothing while the parcel PDF printed both lists
 * on §D. The farmer could not see what the certifier would read. The backend has
 * `test_every_embed_has_a_renderer` for the PDF; this is its mirror for the screen.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const MODULE = join(
  __dirname,
  '../../../../../../trazo-back/certifications/osp_modules/parcel_application.py'
);
const WIZARD = join(__dirname, '../ParcelApplicationWizard.tsx');

const read = (path: string): string => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new Error(
      `Cannot read ${path}. This guard compares the module's embeds against the wizard, so it ` +
        `needs the trazo-back checkout beside trazo-app.`
    );
  }
};

describe('Parcel Application wizard', () => {
  it('renders every embed the module declares', () => {
    const embeds = Array.from(read(MODULE).matchAll(/embed="([a-z_]+)"/g), (m) => m[1]);
    // A negative assertion must prove it read something.
    expect(embeds).toContain('buffer_editor');
    expect(embeds).toContain('contamination_incidents');
    const wizard = read(WIZARD);
    const missing = embeds.filter((e) => !wizard.includes(`case '${e}':`));
    expect(missing).toEqual([]);
  });
});
