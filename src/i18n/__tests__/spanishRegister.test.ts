/**
 * Guard: `es-419` stays NEUTRAL Latin American Spanish, one register throughout.
 *
 * MEASURED 2026-08-25. The file was two dialects at once — 56 strings in *voseo* (Rioplatense:
 * Uruguayan / Argentine) against 193 in standard *tuteo* — and both appeared ON ONE SCREEN.
 * The sign-in page rendered:
 *
 *     "No pudimos iniciar tu sesión. Revisá tu correo…"     ← voseo
 *     "¿Olvidaste tu contraseña?"                           ← tuteo, three lines below
 *     "O continuá con"                                      ← voseo
 *     "¿No tenés una cuenta? Construí la historia…"         ← voseo
 *
 * Two reasons this matters beyond tidiness:
 *
 *   1. `es-419` is the CLDR code for Latin America *at large*. Voseo is a regional variety
 *      inside it, so the locale code and the copy disagreed.
 *   2. The ICP is California and Washington wholesale orchards. Spanish-speaking owners and
 *      crews there are overwhelmingly Mexican, and voseo reads as foreign to them — on the
 *      first screen they ever see. It is the author's own dialect leaking through the keyboard.
 *
 * 90 strings were converted. This guard is what stops the next one drifting back in.
 *
 * ⚠️ Scoped to VOSEO markers, not to "Spanish that looks unusual". The two families below are
 * unambiguous — a stressed final vowel on a 2nd-person-singular imperative (`Revisá`, `Elegí`,
 * `Subí`) and the voseo present indicative (`podés`, `tenés`, `sos`). Everything else is left
 * alone, because a guard that argues about style is a guard that gets muted.
 */
import { describe, expect, it } from 'vitest';

import es419 from '../lang/es-419.json';
import { PHOTO_GUIDANCE_ES } from '../../utils/photoGuidance.es';

const MESSAGES = es419 as Record<string, string>;

/**
 * Voseo present indicative. `vos podés` / `vos tenés` / `vos conservás`.
 *
 * ⚠️ The ACCENT is the whole signal, and the first version of this got it wrong: it wrote
 * `conserv[aá]s` and `deb[eé]s`, making the accent optional — so it flagged `conservas`,
 * `debes`, `entregas`, `pasas`, `haces` and `reportas`, which are the CORRECT tuteo forms this
 * guard exists to protect. Sixteen false positives, every one of them the right answer.
 *
 * For -ar verbs the two registers differ only by the accent (`conservás` / `conservas`); for
 * -er/-ir the voseo form is accented and the tuteo form changes stem outright (`podés` /
 * `puedes`), so requiring the accent is correct in both families.
 *
 * `estás` and `vas` are deliberately absent: identical in both registers.
 */
const PRESENT_SRC =
  '(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])(podés|tenés|querés|sabés|debés|hacés|conservás|entregás|reportás|pasás|vos)(?![A-Za-zÁÉÍÓÚáéíóúñÑ])';

/**
 * A FRESH regex per use.
 *
 * ⚠️ A `/g` regex carries `lastIndex` between calls, so reusing one shared instance across
 * several `expect(...).toMatch(...)` made the second assertion fail against a string the first
 * had already advanced past — the guard reported "O continuá con" as clean. Anything holding
 * `/g` state must be rebuilt, not shared.
 */
const present = () => new RegExp(PRESENT_SRC, 'g');

/**
 * Voseo imperatives, by ALLOWLIST — the inverse of how this started.
 *
 * ⚠️ The first version listed the offending verbs. That is a denylist, and it did exactly what
 * denylists do: `Documentá` (×3) and `empezá` sat in the file untouched and the guard passed,
 * green, while the words were on screen. `empezá` was in the subtitle of the very page this
 * was written for. A list of every voseo verb in Spanish is not a list anyone can finish.
 *
 * So: flag EVERY word ending in a stressed `á`/`é`/`í`, and allow the ones that are ordinary
 * Spanish. That set is bounded and reviewable — regular 3rd-person futures (`aparecerá`),
 * 1st-person preterites (`apliqué`, `revisé`), subjunctives (`esté`), and a short list of
 * common words (`está`, `acá`, `quizá`, `café`). A verb nobody anticipated now FAILS instead
 * of slipping through, which is the whole point.
 */
const FUTURE_OR_PLURAL = /(rá|rán)$/;

/** Ordinary Spanish that legitimately ends in a stressed vowel. Extend deliberately. */
const ALLOWED = new Set([
  'está',
  'están',
  'acá',
  'allá',
  'aquí',
  'ahí',
  'allí',
  'así',
  'sí',
  'más',
  'después',
  'atrás',
  'detrás',
  'través',
  'además',
  'jamás',
  'quizá',
  'quizás',
  'café',
  'caché',
  'porqué',
  'qué',
  'él',
  'país',
  'raíz',
  'maíz',
  'interés',
  'francés',
  'inglés',
  'portugués',
  'revés',
  'mes',
  'es',
  'tres',
  'anís',
  'gris',
  'crisis',
  'análisis',
  'vos',
  'día',
  'vía',
  'esté',
  'estén',
  'prevé',
  'sé',
  'dé',
  'fé',
  'ré',
  'mié',
  // 1st-person preterites that appear in copy written in the farmer's own voice — the
  // cancel-reason list, and the voice-entry examples ("Regué el lote…", "Apliqué
  // fertilizante…"). These are ordinary Spanish, not Rioplatense imperatives; the regex
  // cannot tell "regué" (I irrigated) from "regá" (irrigate, vos) by shape alone.
  'apliqué',
  'regué',
  'pasé',
  'revisé',
  'terminé',
  'empecé',
  'entré',
  'salí',
  'seguí',
  'viví'
]);

const SUSPECT = /(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])([A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}[áéí])(?![A-Za-zÁÉÍÓÚáéíóúñÑ])/g;
const suspects = () => new RegExp(SUSPECT.source, 'g');

describe('es-419 register', () => {
  it('has a corpus to check', () => {
    // Without this, every "no offenders" assertion below passes by scanning nothing.
    expect(Object.keys(MESSAGES).length).toBeGreaterThan(6000);
    /*
     * …and the file is really Spanish, not an English fallback that would satisfy every
     * "no voseo" assertion trivially. Counted across the corpus rather than read off one key:
     * the first version tested `auth.signin.welcome`, which is "Bienvenido de nuevo" — perfectly
     * good Spanish with no diacritic in it.
     */
    const accented = Object.values(MESSAGES).filter(
      (v) => typeof v === 'string' && /[áéíóúñ¿¡]/i.test(v)
    ).length;
    expect(accented, 'es-419.json does not look like Spanish').toBeGreaterThan(2000);
  });

  it('uses no voseo imperatives', () => {
    const offenders: { key: string; hit: string; text: string }[] = [];
    for (const [key, text] of Object.entries(MESSAGES)) {
      if (typeof text !== 'string') continue;
      for (const m of text.matchAll(suspects())) {
        const word = m[1];
        const lower = word.toLowerCase();
        if (ALLOWED.has(lower) || FUTURE_OR_PLURAL.test(lower)) continue;
        offenders.push({ key, hit: word, text: text.slice(0, 90) });
      }
    }
    expect(
      offenders,
      `es-419 is neutral Latin American Spanish; a word ending in a stressed vowel here is a ` +
        `Rioplatense imperative. Use the tuteo form (Revisá→Revisa, Elegí→Elige, Subí→Sube, ` +
        `Documentá→Documenta, empezá→empieza). If one of these is ordinary Spanish, add it to ` +
        `ALLOWED with a reason:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });

  it('uses no voseo present indicative', () => {
    const offenders: { key: string; hit: string; text: string }[] = [];
    for (const [key, text] of Object.entries(MESSAGES)) {
      if (typeof text !== 'string') continue;
      for (const m of text.matchAll(present())) {
        offenders.push({ key, hit: m[1], text: text.slice(0, 90) });
      }
    }
    expect(
      offenders,
      `Voseo present indicative. Use podés→puedes, tenés→tienes, conservás→conservas, ` +
        `sos→eres:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });

  it('still recognises voseo when it is there (guards the guard)', () => {
    /*
     * Both patterns above assert an EMPTY result, which is the shape that passes forever once
     * the regex stops matching anything. Prove they still fire, against the exact strings that
     * shipped.
     */
    expect('No pudimos iniciar tu sesión. Revisá tu correo').toMatch(suspects());
    expect('O continuá con').toMatch(suspects());
    // the two the denylist version missed
    expect('Documentá todas las prácticas').toMatch(suspects());
    expect('empezá a construir la confianza').toMatch(suspects());
    expect('¿No tenés una cuenta?').toMatch(present());
    // …and NOT on the unaccented tuteo forms, which are what we want to see.
    expect('Conservas todos tus registros y puedes seguir').not.toMatch(present());
    expect('Debes aceptar los términos').not.toMatch(present());
    // …and that they do NOT fire on the third-person future, which is correct everywhere.
    for (const w of ['aplicará', 'aparecerá', 'esté', 'apliqué', 'café']) {
      const ok = ALLOWED.has(w) || FUTURE_OR_PLURAL.test(w);
      expect(ok, `${w} must not be reported as voseo`).toBe(true);
    }
    expect('Estás en Starter y vas a poder seguir registrando').not.toMatch(present());
  });
});

/**
 * Run 8 (R8-06, Astra 2026-10-05): the core logging flow mixed tuteo with USTED imperatives
 * ("Seleccione", "Documente", "Suba") on one screen. Scoped to the keys a grower meets while
 * logging, and to imperatives only: "su" is left alone because it is also the third person.
 */
describe('core logging flow is tuteo, not usted', () => {
  const USTED_IMPERATIVE =
    /(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])(Ingrese|Seleccione|Registre|Indique|Agregue|Documente|Escriba|Elija|Describa|Suba|Mantenga|Deje|deje|describa|registre)(?![A-Za-zÁÉÍÓÚáéíóúñÑ])|\busted\b/;
  const CORE = ['events.', 'quickAdd.', 'voice.', 'newEvent.'];

  it('no usted imperative in a core logging string', () => {
    const offenders = Object.entries(MESSAGES).filter(
      ([k, v]) => CORE.some((p) => k.startsWith(p)) && USTED_IMPERATIVE.test(v)
    );
    expect(offenders.map(([k, v]) => `${k}: ${v.slice(0, 60)}`)).toEqual([]);
  });

  it('the pattern catches the register it guards against', () => {
    expect(USTED_IMPERATIVE.test('Seleccione la fecha')).toBe(true);
    expect(USTED_IMPERATIVE.test('Selecciona la fecha')).toBe(false);
  });
});

/**
 * The same rule across the WHOLE file (Oscar, 2026-10-08, on the farm page: "Comparta la página
 * de su finca" under "Compartir con tu certificadora"). The block above covered four key
 * prefixes and fifteen verbs, so 137 usted strings sat elsewhere: the farm page, the plan, the
 * education pages, the tours, even `events.` strings whose verb was not on the list ("Comparta",
 * "Marque"). Imperatives are matched at the start of a sentence only, where an English word
 * inside a Spanish string ("Pesticide Use Report") cannot be one. "su" stays unchecked, for the
 * reason above.
 */
describe('every es-419 string is tuteo, not usted', () => {
  const VERBS = [
    'Abra',
    'Active',
    'Actualice',
    'Adjunte',
    'Agregue',
    'Aplique',
    'Arrastre',
    'Asegúrese',
    'Cambie',
    'Capture',
    'Cargue',
    'Cierre',
    'Comience',
    'Comparta',
    'Complete',
    'Configure',
    'Confirme',
    'Considere',
    'Consulte',
    'Contacte',
    'Continúe',
    'Cree',
    'Cuente',
    'Deje',
    'Descargue',
    'Describa',
    'Dibuje',
    'Documente',
    'Edite',
    'Elija',
    'Elimine',
    'Empiece',
    'Envíe',
    'Escanee',
    'Escriba',
    'Especifique',
    'Explique',
    'Genere',
    'Guarde',
    'Haga',
    'Imprima',
    'Incluya',
    'Indique',
    'Ingrese',
    'Inicie',
    'Intente',
    'Inténtelo',
    'Introduzca',
    'Mantenga',
    'Marque',
    'Monitoree',
    'Muestre',
    'Pruebe',
    'Pulse',
    'Registre',
    'Revise',
    'Seleccione',
    'Siga',
    'Suba',
    'Tome',
    'Toque',
    'Utilice',
    'Verifique',
    'Vuelva'
  ];
  const USTED = new RegExp(
    `(?:^|[.!?:;¿¡]\\s*|\\(\\s*)(${VERBS.join('|')})(?![A-Za-zÁÉÍÓÚáéíóúñÑ])` +
      `|(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])(usted|ustedes|inténtelo|envíeselo)(?![A-Za-zÁÉÍÓÚáéíóúñÑ])`,
    'i'
  );

  it('has no usted imperative or "usted" anywhere', () => {
    const offenders = Object.entries(MESSAGES).filter(
      ([, v]) => typeof v === 'string' && USTED.test(v)
    );
    expect(offenders.map(([k, v]) => `${k}: ${v.slice(0, 70)}`)).toEqual([]);
  });

  it('photo guidance, translated outside the JSON, is tuteo too', () => {
    // `photoGuidance.es.ts` maps the English guidance to Spanish by exact string, so the JSON
    // check above never saw it: 30 usted imperatives lived there ("Capture", "Muestre").
    const offenders = Object.entries(PHOTO_GUIDANCE_ES).filter(([, v]) => USTED.test(v));
    expect(Object.keys(PHOTO_GUIDANCE_ES).length).toBeGreaterThan(100);
    expect(offenders.map(([k, v]) => `${k.slice(0, 40)}: ${v.slice(0, 60)}`)).toEqual([]);
  });

  it('the pattern catches usted and leaves tuteo and English alone', () => {
    expect(USTED.test('Comparta la página de su finca')).toBe(true);
    expect(USTED.test('Error al subir. Toque para reintentar.')).toBe(true);
    expect(USTED.test('el número está aquí para que usted pueda hacerlo')).toBe(true);
    expect(USTED.test('Comparte la página de tu finca')).toBe(false);
    expect(USTED.test('Pesticide Use Report (PUR) de California')).toBe(false);
    expect(USTED.test('Necesita Mejora')).toBe(false);
  });
});

/**
 * Spanish capitalises the first word of a title and proper names, not every word (Oscar,
 * 2026-10-08: "Perfil de la Finca", "Eventos Registrados", "Compartir Tus Códigos QR" on the
 * farm page). 1,334 es-419 strings were English-style Title Case. Flags a string whose every
 * content word after the first is capitalised, unless the capitals are proper names or
 * acronyms. Example placeholders ("ej., Smith Family Orchards LLC") and the English names of
 * third-party certifications ("Rainforest Alliance") are names, so they are left out.
 */
describe('es-419 titles use Spanish sentence case', () => {
  const STOP = new Set(
    'de del la las el los y o en para por con a al tu tus su sus un una e u sin se'.split(' ')
  );
  // Proper names and product words that keep their capital in a Spanish sentence.
  const PROPER = new Set(
    (
      'Trazo Starter Premium Compliance Operation Pilot Facebook Instagram California Corea ' +
      'Kosher Brix Humboldt Mount Diablo San Bernardino Township Lal Audsley Certified ' +
      'Naturally Grown Fair Trade Non Project Verified Rainforest Alliance Salmon Safe ' +
      'Regenerative Organic Real Oregon Washington Tilth Integrity Database Seed Finder ' +
      'Google Stripe WhatsApp Excel Plan Sistema Orgánico Lista Nacional'
    ).split(' ')
  );
  const SKIP_KEY = /placeholder|Placeholder|^certification\.type\.|^transparency\.cert|Example$/;
  const WORD = /[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]+/g;

  const isTitleCase = (key: string, value: string): boolean => {
    if (SKIP_KEY.test(key) || /\b[Ee]j\.|p\. ej/.test(value)) return false;
    if (value.toUpperCase() === value) return false;
    const words = value.replace(/\{[^{}]*\}/g, ' ').match(WORD) ?? [];
    if (words.length < 2 || words.length > 12) return false;
    const content = words.slice(1).filter((w) => !STOP.has(w.toLowerCase()) && w.length > 2);
    const ordinary = content.filter(
      (w) => !PROPER.has(w) && w.toUpperCase() !== w && !/[A-Z]/.test(w.slice(1))
    );
    return ordinary.length > 0 && ordinary.every((w) => w[0] === w[0].toUpperCase());
  };

  it('has no English-style Title Case', () => {
    const offenders = Object.entries(MESSAGES).filter(
      ([k, v]) => typeof v === 'string' && isTitleCase(k, v)
    );
    expect(offenders.map(([k, v]) => `${k}: ${v}`)).toEqual([]);
  });

  it('the check catches Title Case and leaves sentence case and names alone', () => {
    expect(isTitleCase('app.establishmentProfile', 'Perfil de la Finca')).toBe(true);
    expect(isTitleCase('dashboard.shareQRCodes', 'Compartir Tus Códigos QR')).toBe(true);
    expect(isTitleCase('app.establishmentProfile', 'Perfil de la finca')).toBe(false);
    expect(isTitleCase('x', 'Cómo funciona Trazo')).toBe(false);
    expect(isTitleCase('x', 'Tu Plan del Sistema Orgánico en Trazo')).toBe(false);
    expect(isTitleCase('certification.type.rainforestAlliance', 'Rainforest Alliance')).toBe(false);
  });
});
