/**
 * A template's name must not borrow the name of a certifier-only activity (AC-06, Astra
 * activity-capture audit 2026-10-26).
 *
 * The planting form offered a template called "Búsqueda de semilla orgánica". Seed search
 * (SS) is its own activity, and a certifier-only one: the backend withholds it from the buyer
 * page as a whole event. A planting template carrying that name told the grower they were
 * logging a seed search while the record stayed a planting (PL), which the buyer page shows.
 * The template also prefilled nothing `planting` does not already offer, so it was removed.
 *
 * This guard compares every template name, in both locales, against the verb label of each
 * certifier-only activity (a verb whose subtype is in CONSUMER_WITHHELD_PRODUCTION_SUBTYPES).
 * A containment check, not equality: the colliding name was the verb label plus one word.
 * A template FOR that same subtype may share its name (the Equipment Maintenance template is
 * an EM record, so its name describes it honestly).
 */

import { describe, expect, it } from 'vitest';

import { ACTIVITY_VERBS } from 'config/activityVerbs';
import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';
import { CONSUMER_WITHHELD_PRODUCTION_SUBTYPES } from '../../../utils/consumerDisplay';
import { TEMPLATE_ACCELERATORS } from '../templateAccelerators';

const CATALOGS: Record<string, Record<string, string>> = {
  'en-US': en as Record<string, string>,
  'es-419': es as Record<string, string>
};

const certifierOnlyVerbs = ACTIVITY_VERBS.filter(
  (v) => v.subtype && v.subtype in CONSUMER_WITHHELD_PRODUCTION_SUBTYPES
);

const norm = (s: string) => s.trim().toLocaleLowerCase();

describe('template names never borrow a certifier-only activity name', () => {
  it('finds the certifier-only verbs it compares against', () => {
    // A negative assertion must prove it read something: seed search is the AC-06 case.
    expect(certifierOnlyVerbs.map((v) => v.key)).toContain('seed_search');
    Object.values(CATALOGS).forEach((cat) => {
      certifierOnlyVerbs.forEach((v) => {
        expect(cat[`activities.verb.${v.key}`], v.key).toBeTruthy();
      });
    });
  });

  Object.entries(CATALOGS).forEach(([locale, cat]) => {
    it(`no ${locale} template name contains a certifier-only verb label of another subtype`, () => {
      const collisions: string[] = [];
      TEMPLATE_ACCELERATORS.forEach((tpl) => {
        const name = norm(cat[tpl.nameKey] ?? '');
        certifierOnlyVerbs.forEach((verb) => {
          if (verb.subtype === tpl.subtype) return;
          const verbLabel = norm(cat[`activities.verb.${verb.key}`] ?? '');
          if (verbLabel && name.includes(verbLabel)) {
            collisions.push(`${tpl.id} (${tpl.subtype}) "${cat[tpl.nameKey]}" ~ ${verb.key}`);
          }
        });
      });
      expect(collisions).toEqual([]);
    });
  });
});
