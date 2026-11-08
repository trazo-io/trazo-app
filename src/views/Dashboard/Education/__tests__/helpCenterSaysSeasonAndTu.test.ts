/**
 * The help center speaks the way the app does (2026-11-08).
 *
 * The app's screens say season and activity, and es-419 addresses the farmer as tú. The
 * guides that explain those screens still said production and event ("Step 2: Create Your
 * First Production Batch", "Log Your First Events") and, in Spanish, switched to usted
 * mid-page ("Esta guía le acompaña…", "registre todas las recolecciones"). One guide also
 * promised "premium positioning with buyers", the pricing-outcome claim compliance.md rules
 * out. This reads every key the three help-center screens reference.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const read = (f: string) => readFileSync(join(SRC, f), 'utf8');
const en: Record<string, string> = JSON.parse(read('i18n/lang/en-US.json'));
const es: Record<string, string> = JSON.parse(read('i18n/lang/es-419.json'));

const SCREENS = [
  'views/Dashboard/Education/EducationHub.tsx',
  'views/Dashboard/Education/EducationTopicDetail.tsx',
  'views/Dashboard/Education/EducationFAQ.tsx'
];
const keys = [
  ...new Set(
    SCREENS.flatMap((f) =>
      [...read(f).matchAll(/['"`]([a-zA-Z]+(?:\.[a-zA-Z0-9_]+)+)['"`]/g)].map((m) => m[1])
    )
  )
].filter((k) => k in en);

// Where the word is right. Each entry says why.
const KEEP: Record<string, string> = {
  'education.detail.farmEvents.weatherTitle':
    '"Weather event" is the name of the activity in the picker',
  'education.detail.seasonLifecycle.startDesc':
    '"production method" is the NOP term (organic / transitional / conventional)'
};

const EN_WORDS = /\b(productions?|events?)\b/i;
const ES_WORDS = /\b(producci(ó|o)n|producciones|eventos?)\b/i;
/**
 * Usted addressed to the reader. Third-person forms ("el inspector quiere", "el plan debe",
 * "su propio registro") are ordinary Spanish and stay out of this list on purpose.
 */
const USTED =
  /(?<![\wáéíóúñ])(usted|ustedes|le acompaña|registre|agregue|fotografíe|vea|edite|inicie|contraste|diga|incruste|mande|ordénelo|asegúrese|creerle|decirle)(?![\wáéíóúñ])/i;

describe('the help center says season, activity and tú', () => {
  it('reads the keys the help center renders', () => {
    expect(keys.length).toBeGreaterThan(500);
  });

  it('says season and activity, not production and event', () => {
    const wrong = keys
      .filter((k) => !(k in KEEP))
      .flatMap((k) => [
        ...(EN_WORDS.test(en[k]) ? [`en ${k}: ${en[k].slice(0, 80)}`] : []),
        ...(ES_WORDS.test(es[k] ?? '') ? [`es ${k}: ${es[k].slice(0, 80)}`] : [])
      ]);
    expect(wrong).toEqual([]);
  });

  it('addresses the farmer as tú in Spanish', () => {
    const usted = keys
      .filter((k) => USTED.test(es[k] ?? ''))
      .map((k) => `${k}: ${es[k].slice(0, 80)}`);
    expect(usted).toEqual([]);
  });

  it('promises no pricing outcome', () => {
    const premium = keys.filter((k) =>
      /premium|precio superior|sobreprecio/i.test(`${en[k]} ${es[k]}`)
    );
    expect(premium).toEqual([]);
  });
});

describe('the retired transparency screen left no copy behind', () => {
  it('every transparency.* key the code asks for exists, and no other does', () => {
    // 204 keys from the score-era screen were deleted on 2026-11-08: nothing rendered them.
    const files = readFileSync(join(SRC, 'i18n/lang/en-US.json'), 'utf8');
    const present = Object.keys(JSON.parse(files)).filter((k) => k.startsWith('transparency.'));
    expect(present).toEqual(['transparency.withPhotos']);
    expect(es['transparency.withPhotos']).toBeTruthy();
    expect(read('views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx')).toContain(
      "'transparency.withPhotos'"
    );
  });
});
