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
      'Regenerative Organic Oregon Washington Tilth Integrity Database Seed Finder ' +
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

  // A capitalised article or preposition inside a title ("Realizado Por") is Title Case even
  // when the content words around it are fine (review of app #110). Only mid-sentence: after a
  // full stop, colon or opening mark a capital is ordinary.
  const capitalisedSmallWord = (key: string, value: string): boolean => {
    if (SKIP_KEY.test(key) || /\b[Ee]j\.|p\. ej/.test(value)) return false;
    const text = value.replace(/\{[^{}]*\}/g, ' ');
    if (text.toUpperCase() === text) return false;
    for (const m of text.matchAll(WORD)) {
      const w = m[0];
      // Single letters are grades, codes and section letters ("Grado A", "N₂O", "sección E").
      // Acronyms and shouted warnings ("NO ENVIAR AL CERTIFICADOR") are not Title Case.
      if (w.length < 2 || w.toUpperCase() === w || !STOP.has(w.toLowerCase())) continue;
      if (w[0] !== w[0].toUpperCase()) continue;
      if (/(^|[.!?:;¿¡({—–·“«'"-]|\.\))\s*$/.test(text.slice(0, m.index))) continue;
      return true;
    }
    return false;
  };

  it('has no English-style Title Case', () => {
    const offenders = Object.entries(MESSAGES).filter(
      ([k, v]) => typeof v === 'string' && isTitleCase(k, v)
    );
    expect(offenders.map(([k, v]) => `${k}: ${v}`)).toEqual([]);
  });

  it('has no capitalised article or preposition mid-sentence', () => {
    const offenders = Object.entries(MESSAGES).filter(
      ([k, v]) => typeof v === 'string' && capitalisedSmallWord(k, v)
    );
    expect(offenders.map(([k, v]) => `${k}: ${v}`)).toEqual([]);
  });

  it('the check catches Title Case and leaves sentence case and names alone', () => {
    expect(isTitleCase('app.establishmentProfile', 'Perfil de la Finca')).toBe(true);
    expect(isTitleCase('dashboard.shareQRCodes', 'Compartir Tus Códigos QR')).toBe(true);
    expect(isTitleCase('app.establishmentProfile', 'Perfil de la finca')).toBe(false);
    expect(isTitleCase('x', 'Cómo funciona Trazo')).toBe(false);
    expect(isTitleCase('x', 'Tu Plan del Sistema Orgánico en Trazo')).toBe(false);
    // "Real" is a name only inside "Real Organic Project"; elsewhere it is the adjective.
    expect(isTitleCase('x', 'Documentación en Tiempo Real')).toBe(true);
    expect(capitalisedSmallWord('x', 'Realizado Por')).toBe(true);
    expect(capitalisedSmallWord('x', 'Realizado por')).toBe(false);
    expect(isTitleCase('certification.type.rainforestAlliance', 'Rainforest Alliance')).toBe(false);
  });
});

/**
 * Run 8b (8b-03, Astra 2026-10-12): the blocks above check usted IMPERATIVES at the start of a
 * sentence and leave "su" alone, so the crew journey still addressed the grower as usted in
 * three other shapes: possessives ("Sus datos están donde los dejó", "Para su certificador"),
 * the present tense ("Tiene un borrador", "Ya puede editar") and imperatives in the middle of
 * a sentence ("Recargue la página e intente…", "Por favor intente", "Déjelo en blanco"). Three
 * voseo forms with an attached pronoun also slipped past the stressed-vowel check because they
 * were written without the accent ("Comparalo", "Contanos", "definilo").
 *
 * Checks 1-3 are scoped to the namespaces converted in that slice. "su" is also the third
 * person (the contractor's own equipment, a material's organic status, the season's trail), so
 * every key in scope that legitimately keeps one is listed below with what it refers to. A new
 * key that needs "su" for a third party is added here deliberately; one that addresses the
 * grower uses "tu".
 *
 * Still usted, out of this scope (named open under 8b-03): `education.*`, `buyer*`,
 * `certifierReview.*`, `tour.*`, `fieldNotes.*`, `consumer.*`, `readiness*`.
 */
describe('the crew journey addresses the grower as tú, not usted (Run 8b)', () => {
  const JOURNEY = [
    'events.',
    'eventDetails.',
    'farm.',
    'osp.',
    'app.',
    'parcel.',
    'parcelApp.',
    'handler.',
    'harvestGrade.',
    'finishProduction.',
    'production.',
    'quickAdd.',
    'quickStart.',
    'upload.',
    'documents.',
    'correct.',
    'fieldDetails.',
    'seasonPlan.',
    'sales.records.',
    'certifierLink.',
    'operationAudit.'
  ];
  const inJourney = (key: string) => JOURNEY.some((p) => key.startsWith(p));
  const L = 'A-Za-zÁÉÍÓÚáéíóúñÑ';

  // Keys in scope whose "su/sus" (or sentence-initial third-person verb) is NOT the grower.
  const THIRD_PERSON: Record<string, string> = {
    'app.carbonExplainer.epaUsdaNote': 'each input shows its own source',
    'app.carbonExplainer.scopeBoundary': "the operation's footprint",
    'app.carbonExplainer.whyTransparencyDesc': "farms' practices",
    'app.manageMembersSubtitle': "members' permissions",
    'app.pur.flag.adjuvant_line': "the adjuvant needs its own PUR line (subject of 'Necesita')",
    'app.pur.flag.tank_mix_unexported': "each adjuvant's own line",
    'app.pur.pcbExcluded.help': "the pest control business's own report",
    'correct.intro': "the season's records",
    'events.chemical.adjuvants.help': "each adjuvant's own line",
    'events.chemical.form.appliedByPcbHelp': "the contractor's own report",
    'events.common.help.observationAudience': "suppliers' own fields",
    'events.fieldNote.theirWordsYourRecord': "the crew member's words",
    'events.pest.fields.identifiedByHelp': "the identifier's credentials (Trazo does not verify them)",
    'events.locked.description': "the season's records",
    'events.locked.detail': "the production's activities",
    'events.postHarvest.bannerBody': "the season's trail",
    'events.production.fields.equipmentCleaningEventHelp':
      "the cleaning event must be dated on or before (subject of 'Debe')",
    'events.production.fields.operatorIsCustomHelp': "the contractor's equipment and name",
    'events.production.fields.rootstockHelp': "the planting stock's organic status",
    'events.production.help.purgeQuantity': "the quantity's unit",
    'events.production.sanitation.intro': "the sanitizer's name and concentration",
    'events.production.sections.customOperatorHelp': "the contractor's equipment",
    'events.section.water.desc': "the water's source",
    'handler.field.certifier': "the handler's certifier ('Their certifier')",
    'osp.action.submitIsTheGrowers': "the grower's own account (read by the setup operator)",
    'osp.agent.none': "the packet's cover page",
    'osp.annual.duplicateYearLockedWarning': "the update's row",
    'osp.annual.next.filed': "the update's row",
    'osp.annual.next.draftSetupOperator': "the grower's own account (read by the setup operator)",
    'osp.annual.signIsTheGrowers': "the grower's own account (read by the setup operator)",
    'osp.annual.signThenFileHelpSetupOperator':
      "the grower's own account, and the update's row (read by the setup operator)",
    'osp.annual.signThenFileHelp': "the update's row",
    'osp.annual.subtitle': "a certified operation's OSP",
    'osp.annual.toast.alreadyLockedDesc': "the update's row",
    'osp.approvedInputs.search.noMatch': "the catalogues' totality",
    'osp.approvedInputs.syncDiff.narrativeLongRegistryThin': "each input's entry",
    'osp.attachments.subtitle': "the certifier's own names",
    'osp.changeNotifications.nextStep.acreage_field_addition': "the parcel's application",
    'osp.changeNotifications.subtitle': "the operation's certification",
    'osp.empty.whatIsIt': "every certified operation's certifier",
    'osp.handlers.cert.missing': "the handler's certificate",
    'osp.identity.ux.undoExplain': "the material's uses",
    'osp.locked.body': "the plan's answers",
    'osp.sectionsLocked': "the plan's narratives",
    'parcel.addFirstEventDescription': "the parcel's history",
    'parcel.adjoining.certifierName': "the neighbour's certifying agent ('Their Certifying Agent')",
    'parcel.adjoining.distanceFt': "the neighbour's use ('their use')",
    'parcel.adjoining.help': "the neighbour's own practices",
    'parcel.affidavit.noMaterialsApplied': "the prior manager's management ('Their Management')",
    'parcel.disclosure.body': "the parcel's outline",
    'parcelApp.adjoining.none': "the neighbour's signed statement",
    'parcelApp.certifiedBranch.review.unknown_input': "the input's organic status",
    'production.details.publicLegend': "the lot's QR code",
    'production.finish.noSeasonNamed': "the season's own page",
    'production.finishedLoggingHint': "the work's own date",
    'sales.records.field.harvestLots.help': "the sale's harvest"
  };

  const POSSESSIVE = new RegExp(`(?<![${L}])(su|sus)(?![${L}])`, 'i');
  // Usted present tense, where a tú string would say "Tienes", "Puedes", "¿Estás seguro?".
  const PRESENT = new RegExp(
    `(?:^|[.!?:;¿¡—–]\\s*)(Tiene|Puede|Ya puede|Necesita|Desea|Quiere|Debe|Está segur[oa])(?![${L}])` +
      `|(?<![${L}])(si prefiere|cuando quiera|cuando necesite|donde los dejó|que plantó|que seleccionó|que planificó|ya registró|[Qq]ué hizo(?=[,?]))(?![${L}])`
  );
  // Usted imperatives after a comma or "por favor", where the sentence-start check cannot see
  // them, plus the enclitic forms ("Déjelo", "corríjalo") wherever they appear.
  const MID_VERBS = [
    'Actualice',
    'Agregue',
    'Anote',
    'Cambie',
    'Complete',
    'Confirme',
    'Consulte',
    'Deje',
    'Descargue',
    'Edite',
    'Elija',
    'Elimine',
    'Escriba',
    'Guarde',
    'Indique',
    'Ingrese',
    'Inicie',
    'Intente',
    'Marque',
    'Mejore',
    'Pida',
    'Recargue',
    'Registre',
    'Revise',
    'Seleccione',
    'Suba',
    'Verifique',
    'Vuelva'
  ];
  const MID_IMPERATIVE = new RegExp(
    `(?:,\\s*|\\bpor favor,?\\s+|\\s[ey]\\s+)(${MID_VERBS.join('|')})(?![${L}])` +
      `|(?<![${L}])(déjel[oa]s?|corríjal[oa]s?|reemplácel[oa]s?|personalícel[oa]s?|adminístrel[oa]s?|cuéntenos)(?![${L}])`,
    'i'
  );

  const offenders = (pattern: RegExp, allow: Record<string, string> = {}) =>
    Object.entries(MESSAGES)
      .filter(([k, v]) => inJourney(k) && typeof v === 'string' && !(k in allow))
      .filter(([, v]) => pattern.test(v))
      .map(([k, v]) => `${k}: ${v.slice(0, 80)}`);

  it('addresses the grower with tu/tus, not su/sus', () => {
    expect(
      offenders(POSSESSIVE, THIRD_PERSON),
      'Use "tu"/"tus" for the grower. If the possessive is a third party, add the key to ' +
        'THIRD_PERSON with what it refers to.'
    ).toEqual([]);
  });

  it('uses the tú present tense, not usted', () => {
    expect(offenders(PRESENT, THIRD_PERSON)).toEqual([]);
  });

  it('has no usted imperative in mid-sentence or with an attached pronoun', () => {
    expect(offenders(MID_IMPERATIVE)).toEqual([]);
  });

  it('every allowlisted key still exists and still needs the exemption', () => {
    // A stale entry would silently exempt whatever text lands on that key next.
    for (const key of Object.keys(THIRD_PERSON)) {
      expect(MESSAGES[key], `${key} is gone; drop it from THIRD_PERSON`).toBeTruthy();
      expect(
        POSSESSIVE.test(MESSAGES[key]) || PRESENT.test(MESSAGES[key]),
        `${key} no longer has a third-person "su" or verb; drop it from THIRD_PERSON`
      ).toBe(true);
    }
  });

  it('the patterns catch the strings that shipped and leave tuteo alone', () => {
    expect(POSSESSIVE.test('Sus datos están donde los dejó.')).toBe(true);
    expect(POSSESSIVE.test('Para su certificador')).toBe(true);
    expect(POSSESSIVE.test('Para tu certificador')).toBe(false);
    expect(PRESENT.test('Tiene un borrador sin guardar de ayer')).toBe(true);
    expect(PRESENT.test('Se copiaron tus respuestas. Ya puede editar desde aquí.')).toBe(true);
    expect(PRESENT.test('¿Está seguro de que desea eliminar este evento?')).toBe(true);
    expect(PRESENT.test('Tienes un borrador sin guardar de ayer')).toBe(false);
    expect(PRESENT.test('Ya puedes editar desde aquí.')).toBe(false);
    // "Qué hizo, ..." asks the grower in usted (Run 8b R1, events.wizard.step.basicHint). Bare
    // "hizo" stays legal: it is also the third person ("quién lo hizo", "lo que hizo el equipo").
    expect(PRESENT.test('Qué hizo, cuándo y quién lo hizo')).toBe(true);
    expect(PRESENT.test('¿Qué hizo?')).toBe(true);
    expect(PRESENT.test('Qué hiciste, cuándo y quién lo hizo')).toBe(false);
    expect(PRESENT.test('Anota qué hizo el equipo y quién lo hizo')).toBe(false);
    expect(MID_IMPERATIVE.test('Falta el ID. Recargue la página e intente nuevamente.')).toBe(true);
    expect(
      MID_IMPERATIVE.test('No se pudo generar el informe. Por favor intente nuevamente.')
    ).toBe(true);
    expect(MID_IMPERATIVE.test('Déjelo en blanco si no aplica.')).toBe(true);
    expect(MID_IMPERATIVE.test('Recarga la página e inténtalo de nuevo.')).toBe(false);
    expect(MID_IMPERATIVE.test('Déjalo en blanco si no aplica.')).toBe(false);
  });
});

/**
 * Voseo written without its accent: "Comparalo", "Contanos", "definilo". The stressed-vowel
 * check above keys on the accent, so an unaccented voseo imperative with a pronoun attached
 * passed it (Run 8b, 8b-03). The tú forms carry an accent or a different stem ("Compáralo",
 * "Cuéntanos", "defínelo"), so none of these words is correct Spanish in a tuteo string.
 * File-wide: the list has no false positive anywhere in the catalogue.
 */
describe('es-419 has no unaccented voseo with an attached pronoun', () => {
  const VOSEO_WITH_PRONOUN = [
    'comparalo',
    'contanos',
    'contame',
    'definilo',
    'decinos',
    'decime',
    'avisanos',
    'avisame',
    'escribinos',
    'escribime',
    'mandanos',
    'llamanos',
    'contactanos',
    'seguinos',
    'fijate',
    'probalo',
    'revisalo',
    'revisala',
    'elegilo',
    'elegila',
    'subilo',
    'subila',
    'agregalo',
    'agregala',
    'completalo',
    'guardalo',
    'cambialo',
    'usalo',
    'dejalo',
    'dejala',
    'hacelo',
    'ponelo',
    'sacalo',
    'mandalo',
    'borralo',
    'abrilo',
    'cerralo',
    'editalo',
    'marcalo',
    'copialo',
    'descargalo',
    'envialo',
    'compartilo',
    'registralo',
    'confirmalo',
    'actualizalo',
    'activalo',
    'anotalo',
    'corregilo',
    'pedile',
    'decile',
    'mostrame'
  ];
  const VOSEO = new RegExp(
    `(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])(${VOSEO_WITH_PRONOUN.join('|')})(?![A-Za-zÁÉÍÓÚáéíóúñÑ])`,
    'i'
  );

  it('uses none of them', () => {
    const offenders = Object.entries(MESSAGES)
      .filter(([, v]) => typeof v === 'string' && VOSEO.test(v))
      .map(([k, v]) => `${k}: ${v.slice(0, 80)}`);
    expect(
      offenders,
      'Use the tuteo form: Comparalo→Compáralo, Contanos→Cuéntanos, definilo→defínelo.'
    ).toEqual([]);
  });

  it('catches the three that shipped and not their tuteo forms', () => {
    expect(VOSEO.test('Comparalo con Compliance antes de cambiar')).toBe(true);
    expect(VOSEO.test('Contanos más (opcional)')).toBe(true);
    expect(VOSEO.test('definilo una vez para habilitar plantillas')).toBe(true);
    expect(VOSEO.test('Compáralo con Compliance antes de cambiar')).toBe(false);
    expect(VOSEO.test('Cuéntanos más (opcional)')).toBe(false);
    expect(VOSEO.test('defínelo una vez para habilitar plantillas')).toBe(false);
  });
});
