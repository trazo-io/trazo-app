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
 * Usted, by ALLOWLIST (review of app #329: a list of the usted words this change happened to
 * fix only re-detects those words, and "Encabece", "Corrija", "Arme" slipped past it).
 *
 * A guide gives instructions at the start of a sentence or a list item, and that is where an
 * imperative sits. So every capitalised word there that ends the way an imperative can ("-a",
 * "-e", or an enclitic "-lo/-la/-le") must be on the list below: a reviewed tú imperative, or
 * a word that is not a command at all. A verb nobody anticipated fails until someone decides,
 * the same approach `spanishRegister.test.ts` takes for voseo. Usted in the middle of a
 * sentence shows up as "usted" itself or an usted pronoun on the verb ("dele", "dígale").
 */
const OPENING = /(?:^|[.:;•]\s+|\d+\.\s+|\n\s*|[¿¡"“(]\s*)([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,})(?=[\s,:])/g;
const TU_IMPERATIVES = [
  'Abre',
  'Adjunta',
  'Agrega',
  'Aprende',
  'Arma',
  'Captura',
  'Carga',
  'Cierra',
  'Comparte',
  'Completa',
  'Conserva',
  'Considera',
  'Contrasta',
  'Corre',
  'Corrige',
  'Define',
  'Descarga',
  'Dicta',
  'Documenta',
  'Elige',
  'Empieza',
  'Encabeza',
  'Escanea',
  'Escribe',
  'Espera',
  'Fotografía',
  'Guarda',
  'Incluye',
  'Intenta',
  'Llama',
  'Llega',
  'Lleva',
  'Léelo',
  'Mira',
  'Monitorea',
  'Muestra',
  'Piensa',
  'Presenta',
  'Prueba',
  'Registra',
  'Regístralo',
  'Selecciona',
  'Señala',
  'Sigue',
  'Sube',
  'Supervisa',
  'Toma'
];
// Not commands. "Empaque" and "Enfoque" spell the usted imperatives of empacar / enfocar too;
// in the guides they are the nouns ("Empaque del producto", "Enfoque agrícola").
const NOT_COMMANDS = [
  'Agua',
  'Aparece',
  'Base',
  'Boca',
  'Búsqueda',
  'Cada',
  'Cadena',
  'Clima',
  'Combustible',
  'Confianza',
  'Cosecha',
  'Desde',
  'Dónde',
  'Ejemplo',
  'Empaque',
  'Energía',
  'Enfoque',
  'Esta',
  'Este',
  'Estrategia',
  'Experiencia',
  'Fecha',
  'Finca',
  'Fuente',
  'Guía',
  'Helada',
  'Herbicida',
  'Historia',
  'Legible',
  'Lenguaje',
  'Limpieza',
  'Línea',
  'Meta',
  'Metodología',
  'Nada',
  'Nombre',
  'Nuestra',
  'Nunca',
  'Otra',
  'Para',
  'Pennsylvania',
  'Pesticida',
  'Poda',
  'Propuesta',
  'Reembolsa',
  'Semilla',
  'Siembra',
  'Siempre',
  'Solo',
  'Suelo',
  'Tema',
  'Temporada',
  'Tienda',
  'Todavía',
  'Usaste',
  'Venta',
  'Ventana',
  'Vista',
  'Última'
];
const REVIEWED = new Set([...TU_IMPERATIVES, ...NOT_COMMANDS]);
const USTED_ANYWHERE =
  /(?<![\wáéíóúñ])(usted|ustedes|dele|dígale|pídale|envíele|muéstrele|avísele|mándele|cuéntele|pregúntele|creerle|decirle|le acompaña)(?![\wáéíóúñ])/i;

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
    const unreviewed = keys.flatMap((k) =>
      [...(es[k] ?? '').matchAll(OPENING)]
        .map((m) => m[1])
        .filter((w) => /([ae]|l[oae])$/.test(w) && !REVIEWED.has(w))
        .map((w) => `${w} (${k})`)
    );
    expect(unreviewed, 'an imperative-position word nobody has reviewed').toEqual([]);
    const usted = keys.filter((k) => USTED_ANYWHERE.test(es[k] ?? ''));
    expect(usted).toEqual([]);
  });

  it('names the finish button the way both pages that show it do', () => {
    // The season page said "Terminar temporada" and the parcel page "Cerrar temporada", and
    // the guide quoted one of them (review of app #329).
    expect(es['season.finish']).toBe(es['farmHome.seasons.finish']);
    expect(es['education.detail.seasonLifecycle.whereDesc']).toContain(
      es['farmHome.seasons.finish']
    );
  });

  it('names carbon sources per input, never as a blanket, and claims no "direct" scope', () => {
    // compliance.md and carbon-methodology.md: provenance is per input class (P2O5 and K2O are
    // Trazo estimates, pesticides academic LCA), and the estimate includes the manufacturing of
    // what the farm buys, so "direct operational emissions" is wrong as well as unsafe. The
    // carbon guides said "All emission factors in Trazo are sourced from official EPA and USDA
    // publications" until 2026-11-08.
    const BLANKET =
      /EPA (and|&|y el|y) USDA|EPA\/USDA|all (emission )?factors|todos los factores|direct operational|(operacional(es)?|operativas?) directa?s?|government-sourced|fuentes gubernamentales/i;
    const claims = keys
      .filter((k) => BLANKET.test(en[k]) || BLANKET.test(es[k] ?? ''))
      .map((k) => `${k}: ${en[k].slice(0, 80)}`);
    expect(claims).toEqual([]);
  });

  it('labels the factors that are Trazo estimates where they are shown', () => {
    // The guide says phosphorus and potassium are Trazo estimates "and are labelled that way";
    // the rows said only "Manufacturing emissions", under a footnote naming the EPA for all
    // three nutrients (review of app #334).
    const M = 'education.detail.carbonMethodology.';
    for (const lang of [en, es]) {
      expect(lang[`${M}phosphorusBreakdown`]).toMatch(/Trazo/);
      expect(lang[`${M}potassiumBreakdown`]).toMatch(/Trazo/);
      expect(lang[`${M}fertilizerSource`]).toMatch(/^(Nitrogen source|Fuente del nitrógeno)/);
    }
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
