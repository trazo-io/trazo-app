/**
 * Guard — the producer-facing "shoppers see this" markers must match the backend.
 *
 * `src/config/consumerVisibility.ts` tells a farmer, field by field, what leaves the
 * building when a shopper scans a QR code. That disclosure is only worth showing if it
 * is true, and it mirrors a Python file that nothing in the TS build can see. So the
 * mirror is checked here, against the source.
 *
 * This is the same technique `trazo-back/history/tests/test_cross_surface_claim_safety.py`
 * uses in the other direction: grep the source, assert the shape.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CONSUMER_VISIBLE_FARM_FIELDS,
  CONSUMER_WIRE_ONLY_FARM_FIELDS,
  CONSUMER_WITHHELD_FARM_FIELDS,
  isConsumerVisible
} from '../../../config/consumerVisibility';

const SRC = join(__dirname, '..', '..', '..');
const BACKEND = join(SRC, '..', '..', 'trazo-back');
const TRANSPARENCY_VIEWS = join(BACKEND, 'history', 'transparency_views.py');
const FARM_MODAL = join(SRC, 'views', 'Scan', 'ProductDetail', 'components', 'FarmModal.tsx');

// A frontend-only checkout has no trazo-back/. Skip rather than fail — a missing sibling
// repo is not a claim-safety defect.
const hasBackend = existsSync(TRANSPARENCY_VIEWS);

describe('consumerVisibility — internal consistency', () => {
  it('the three sets are pairwise disjoint', () => {
    const overlap = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
      [...a].filter((field) => b.has(field));

    expect(overlap(CONSUMER_VISIBLE_FARM_FIELDS, CONSUMER_WITHHELD_FARM_FIELDS)).toEqual([]);
    expect(overlap(CONSUMER_VISIBLE_FARM_FIELDS, CONSUMER_WIRE_ONLY_FARM_FIELDS)).toEqual([]);
    expect(overlap(CONSUMER_WITHHELD_FARM_FIELDS, CONSUMER_WIRE_ONLY_FARM_FIELDS)).toEqual([]);
  });

  it('isConsumerVisible answers from the visible set only', () => {
    expect(isConsumerVisible('crops_grown')).toBe(true);
    // The three fields that have each caused a real incident.
    expect(isConsumerVisible('farming_method')).toBe(false);
    expect(isConsumerVisible('address')).toBe(false);
    expect(isConsumerVisible('sustainability_practices')).toBe(false);
  });
});

describe.skipIf(!hasBackend)('consumerVisibility — mirrors the backend', () => {
  const source = hasBackend ? readFileSync(TRANSPARENCY_VIEWS, 'utf8') : '';

  it('every withheld field is actually nulled in transparency_views.py', () => {
    const notNulled = [...CONSUMER_WITHHELD_FARM_FIELDS].filter((field) => {
      // Either explicitly nulled — `"address": None,` — or never serialized at all,
      // which is how farming_method is handled (a comment, no key).
      const nulled = new RegExp(`["']${field}["']\\s*:\\s*None`).test(source);
      const absent = !new RegExp(`["']${field}["']\\s*:`).test(source);
      return !nulled && !absent;
    });

    expect(notNulled).toEqual([]);
  });

  it('sustainability_practices is not published to the consumer payload', () => {
    // Removed 2026-08-07. It was free text a farmer typed, rendered to shoppers as green
    // leaf chips, and the demo farms shipped "USDA Organic Certified" in it — a certifier
    // attestation with no database backing. Cert claims live in the Certification table,
    // which is gated by history/services/claim_authority.py.
    expect(source).not.toMatch(/["']sustainability_practices["']\s*:/);
  });
});

describe.skipIf(!hasBackend || !existsSync(FARM_MODAL))(
  'consumerVisibility — wire-only fields stay unrendered',
  () => {
    it('no wire-only field is rendered by FarmModal', () => {
      const modal = readFileSync(FARM_MODAL, 'utf8');
      // Look for a real property ACCESS, not a bare mention — the file carries comments
      // naming these fields to explain why they are gone, and a substring match would
      // read its own tombstone as a render.
      const rendered = [...CONSUMER_WIRE_ONLY_FARM_FIELDS].filter((field) =>
        new RegExp(`establishmentData\\??\\.${field}\\b`).test(modal)
      );

      // If this fires, the field became consumer-visible: move it into
      // CONSUMER_VISIBLE_FARM_FIELDS so the producer disclosure stops understating,
      // or drop the render.
      expect(rendered).toEqual([]);
    });

    it('the four fields removed from the wire in 2026-08 have not come back', () => {
      // CONSUMER_WIRE_ONLY_FARM_FIELDS is deliberately empty, which makes the assertion
      // above vacuous. These four were published-but-never-rendered until they were deleted
      // from the payload; pin that so a future edit re-adding one has to do it consciously.
      const source = readFileSync(TRANSPARENCY_VIEWS, 'utf8');
      const resurrected = [
        'climate_zone',
        'conservation_practices',
        'employee_count',
        'is_active'
      ].filter((field) => new RegExp(`["']${field}["']\\s*:`).test(source));

      expect(resurrected).toEqual([]);
    });
  }
);
