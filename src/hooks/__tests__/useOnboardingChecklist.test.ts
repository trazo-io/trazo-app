/**
 * Certifier prerequisites on the onboarding checklist (2026-08-02 CA walnut pilot QA).
 *
 * A grower could complete all five season items — parcel, production, event, finish, QR — see
 * "You're all set!", and still hold an audit export stamped
 * "[NON-COMPLIANT DOSSIER — DO NOT SUBMIT TO CERTIFIER]", because no Organic Fraud Prevention
 * Plan was on file and page 1 reported the Organic System Plan as a GAP. Both uploaders existed
 * and were reachable; nothing in the product ever pointed at them.
 *
 * These tests pin the two properties that fix is made of: the items exist, and they are not
 * chained behind the season.
 */
import { describe, expect, it } from 'vitest';

// Indexed by a computed key below, so widen from the literal-keyed JSON type.
import enCatalogue from '../../i18n/lang/en-US.json';
import esCatalogue from '../../i18n/lang/es-419.json';

const en = enCatalogue as Record<string, string>;
const es = esCatalogue as Record<string, string>;
import { WRITER_ITEMS, resolveWriterCompletion } from '../useOnboardingChecklist';

const FARM = '148';

const farm = (overrides: Record<string, unknown> = {}) => ({
  id: 148,
  parcels: [{ id: 249, has_current_production: true }],
  ...overrides
});

describe('writer checklist shape', () => {
  it('includes both certifier prerequisites', () => {
    const ids = WRITER_ITEMS.map((i) => i.id);
    expect(ids).toContain('file-osp');
    expect(ids).toContain('upload-ofpp');
  });

  it('does not chain the certifier items behind the season', () => {
    // § 205.201 expects an OSP before production, not after the QR code is shared. A linear
    // dependsOn chain would have hidden both behind "Share your QR code".
    for (const id of ['file-osp', 'upload-ofpp']) {
      expect(WRITER_ITEMS.find((i) => i.id === id)?.dependsOn, id).toBeUndefined();
    }
  });

  it('keeps the season items sequential', () => {
    expect(WRITER_ITEMS.find((i) => i.id === 'start-production')?.dependsOn).toBe('add-parcel');
    expect(WRITER_ITEMS.find((i) => i.id === 'document-event')?.dependsOn).toBe('start-production');
    expect(WRITER_ITEMS.find((i) => i.id === 'finish-production')?.dependsOn).toBe(
      'document-event'
    );
    expect(WRITER_ITEMS.find((i) => i.id === 'share-qr')?.dependsOn).toBe('finish-production');
  });

  it('has a translated label for every item in both locales', () => {
    // labelKey is derived positionally (`writer.item${i + 1}`), so adding an item without
    // adding its string renders a raw i18n key in the panel. Assert against the actual locale
    // files rather than against the array length, which proves nothing about the strings.
    WRITER_ITEMS.forEach((_item, i) => {
      const key = `tour.checklist.writer.item${i + 1}`;
      expect(en[key], `${key} missing from en-US`).toBeTruthy();
      expect(es[key], `${key} missing from es-419`).toBeTruthy();
    });
  });
});

describe('resolveWriterCompletion — certifier prerequisites', () => {
  const seasonDone = {
    establishments: [farm()],
    productions: [{ events_count: 12, finish_date: '2025-11-12', published: true }],
    farmId: FARM
  };

  it('a finished, published season does NOT mark the certifier items complete', () => {
    const done = resolveWriterCompletion(seasonDone);
    expect(done['share-qr']).toBe(true);
    expect(done['file-osp']).toBe(false);
    expect(done['upload-ofpp']).toBe(false);
  });

  it('an empty draft OSP shell does NOT mark the item filed', () => {
    // "Start my OSP" POSTs a draft with no answers. Ticking the item there told the grower the
    // plan was filed while the readiness card on farm home simultaneously read "No Organic
    // System Plan on file" — and the OSP page read "0 of 19 farm-wide modules complete".
    const done = resolveWriterCompletion({
      ...seasonDone,
      osps: [{ id: 45, version_number: 1, status: 'draft', section_completion: 0 }]
    });
    expect(done['file-osp']).toBe(false);
  });

  it('marks the OSP filed once it is submitted, active, or fully sectioned', () => {
    for (const osp of [
      { id: 45, status: 'submitted', section_completion: 0.5 },
      { id: 45, status: 'active', section_completion: 1 },
      { id: 45, status: 'draft', section_completion: 1 }
    ]) {
      expect(
        resolveWriterCompletion({ ...seasonDone, osps: [osp] })['file-osp'],
        JSON.stringify(osp)
      ).toBe(true);
    }
  });

  it('counts events directly, not via the retired transparency score', () => {
    // The score is backend-only since 2026-08-11, and anti-gaming can hold it at 0 for a season
    // that genuinely has events — so a score proxy under-reports real documentation work.
    expect(
      resolveWriterCompletion({
        establishments: [farm()],
        productions: [{ events_count: 2, transparency_score: 0 }],
        farmId: FARM
      })['document-event']
    ).toBe(true);

    expect(
      resolveWriterCompletion({
        establishments: [farm()],
        productions: [{ events_count: 0, transparency_score: 88 }],
        farmId: FARM
      })['document-event']
    ).toBe(false);
  });

  it('marks the OFPP complete only on an affirmative flag', () => {
    expect(
      resolveWriterCompletion({
        ...seasonDone,
        establishments: [farm({ fraud_prevention_plan_uploaded: true })]
      })['upload-ofpp']
    ).toBe(true);

    // Anything that is not boolean `true` reads as "not filed". The check is strict on
    // purpose: the backend field is a real BooleanField, and of the two failure directions,
    // nagging a farmer who already filed is far cheaper than telling one who has not that
    // their dossier is ready. Includes the truthy-but-wrong 'yes' for that reason.
    for (const value of [false, undefined, null, 'yes']) {
      expect(
        resolveWriterCompletion({
          ...seasonDone,
          establishments: [farm({ fraud_prevention_plan_uploaded: value })]
        })['upload-ofpp'],
        String(value)
      ).toBe(false);
    }
  });

  it('scopes the OFPP to the farm being viewed, not to any farm', () => {
    // The audit export is per production, so a plan on a sibling farm does not unblock this
    // farm's dossier — reporting it as done would be the same false all-clear we just removed.
    const done = resolveWriterCompletion({
      ...seasonDone,
      establishments: [
        { id: 999, parcels: [], fraud_prevention_plan_uploaded: true },
        farm({ fraud_prevention_plan_uploaded: false })
      ]
    });
    expect(done['upload-ofpp']).toBe(false);
  });

  it('survives an empty/loading state without throwing', () => {
    const done = resolveWriterCompletion({});
    expect(done['file-osp']).toBe(false);
    expect(done['upload-ofpp']).toBe(false);
    expect(done['add-parcel']).toBe(false);
  });
});
