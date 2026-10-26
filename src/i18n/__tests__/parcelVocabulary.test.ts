/**
 * One word, one meaning: a PARCEL is the mapped unit; a SECTION (rows) is the free-text label
 * inside a parcel (`block_id`).
 *
 * Until 2026-10-21 "block" meant both. "Add a block", the parcel wizard, the crew-note picker and
 * the multi-parcel cards used it for a parcel ("a block (a parcel in Trazo)"), while the
 * "Block / Section ID" field, the voice chips and the traceback used it for a section inside one.
 * A grower logging one spray on three parcels read "Saved to 3 blocks" next to a "Block / Section"
 * field that meant something else. Spanish added a third word, "cuadro", for a parcel.
 *
 * The owner chose parcel (parcela) for the mapped unit and section / rows (sección / hileras) for
 * the label inside it. This guard keeps "block", "bloque" and "cuadro" out of the copy except
 * where listed below, each with the reason it stays. ICU placeholders such as `{block}` are
 * variable names, not copy, and are ignored.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const ALLOWED: Record<string, string> = {
  'consumer.habitat.structure.native_bee_block':
    'a nesting structure ("native-bee blocks"), not land',
  'events.soil.options.habitatType.nativeBeeBlock':
    'the same nesting structure, as the form option that records it',
  'education.detail.inspectionPrep.mapAnswer':
    "quotes the certifier's own map checklist (block identifiers)",
  'parcelApp.map.uploadHint': "quotes the certifier's own map checklist (block or lot identifiers)",
  'education.detail.organicSystemPlan.planReview': '"blocks" is the verb (never blocks submission)',
  'education.detail.renewalSeason.planReviewDesc':
    '"blocks" is the verb (never blocks the Submit button)',
  'parcel.quickAdd.namePlaceholder': 'an example parcel NAME a grower might type ("North Block")',
  'parcel.step.identity.namePlaceholder': 'example parcel NAMES a grower might type',
  'osp.changeNotifications.field.descriptionPlaceholder': 'an example parcel NAME ("Block C")',
  'voice.example.harvest': 'a sample of what a grower SAYS aloud ("the east block")',
  'tour.welcomeFresh.step3.content': 'teaches the word: "parcels are your fields or blocks"',
  'tour.welcomeInvited.step3.content': 'teaches the word: "each parcel is a field or block"',
  'tour.welcomeViewer.step3.content': 'teaches the word: "each parcel is a field or block"'
};

// Only simple placeholders (`{block}`, `{count}`) are variable names. Plural and select branches
// (`{count, plural, one {Saved to # parcel} ...}`) hold real copy and must stay checkable, so the
// ICU keywords are removed and the branch text kept.
const stripPlaceholders = (value: string) =>
  value
    .replace(/\{\s*\w+\s*\}/g, '')
    .replace(/\{\s*\w+\s*,\s*(plural|select|selectordinal)\s*,/g, ' ')
    .replace(/\b(zero|one|two|few|many|other|=\d+)\s*\{/g, ' ');

const offenders = (messages: Record<string, string>, pattern: RegExp) =>
  Object.entries(messages)
    .filter(([key, value]) => !(key in ALLOWED) && pattern.test(stripPlaceholders(value)))
    .map(([key, value]) => `${key}: ${value}`);

describe('parcel / section vocabulary', () => {
  it('English copy never says block, except where listed with a reason', () => {
    expect(offenders(enUS as Record<string, string>, /\bblocks?\b/i)).toEqual([]);
  });

  it('Spanish copy never says bloque or cuadro, except where listed with a reason', () => {
    expect(offenders(es419 as Record<string, string>, /\b(bloques?|cuadros?)\b/i)).toEqual([]);
  });

  it('every allowlisted key still exists and still needs its exception', () => {
    for (const key of Object.keys(ALLOWED)) {
      const en = (enUS as Record<string, string>)[key];
      const es = (es419 as Record<string, string>)[key];
      expect(en, key).toBeDefined();
      const stillUsed =
        /\bblocks?\b/i.test(stripPlaceholders(en)) ||
        /\b(bloques?|cuadros?)\b/i.test(stripPlaceholders(es ?? ''));
      expect(stillUsed, `${key} no longer needs its exception: remove it`).toBe(true);
    }
  });

  it('reads the copy inside plural branches, not only plain strings', () => {
    expect(
      stripPlaceholders('{count, plural, one {Saved to # block} other {Saved to # blocks}}')
    ).toMatch(/\bblocks?\b/);
    expect(stripPlaceholders('Use {block}')).not.toMatch(/\bblock\b/);
  });

  it('the label inside a parcel is a section, in both languages', () => {
    expect((enUS as Record<string, string>)['fieldDetails.blockId']).toBe('Section / rows');
    expect((es419 as Record<string, string>)['fieldDetails.blockId']).toBe('Sección / hileras');
  });
});
