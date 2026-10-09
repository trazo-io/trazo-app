/**
 * An unpublished lot is "Product Not Found" on the consumer page for its own grower too
 * (2026-10-08).
 *
 * The auth cookies are scoped to `.trazo.io`, so a grower signed in to app.trazo.io reaches
 * consumer.trazo.io authenticated, and the transparency endpoint exempts owners from
 * `published=True`. After switching a lot's Public toggle off the grower still saw the full page
 * and concluded the toggle was broken.
 *
 * The contract, three pieces that only work together:
 *  - the consumer page asks for the shopper's view (`publicView`) unless opened with `?preview=1`;
 *  - the API slice turns `publicView` into `public_view=1` (backend guard:
 *    `history/tests/test_unpublished_lot_hidden_from_owner_public_view.py`);
 *  - the dashboard's preview button adds `?preview=1` for an unpublished lot, so the explicit
 *    owner preview keeps working.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('unpublished lot on the consumer page', () => {
  it('the consumer page requests the public view unless opened as an owner preview', () => {
    const src = read('views/Scan/ProductDetail/ProductDetail.tsx');
    expect(src).toMatch(/const isOwnerPreview = proofSearchParams\.get\('preview'\) === '1';/);
    expect(src).toMatch(
      /useGetTransparencyDetailsQuery\(\s*\{[^}]*publicView: !isOwnerPreview[^}]*\}/
    );
  });

  it('the API slice sends public_view=1 for the public view', () => {
    const src = read('store/api/transparencyQrApi.ts');
    expect(src).toMatch(/params\.set\('public_view', '1'\)/);
  });

  it("the dashboard's preview button marks an unpublished lot as a preview", () => {
    const src = read('views/Dashboard/Dashboard/Production/ProfileProduction.tsx');
    expect(src).toMatch(/historyData\?\.published \? '' : '\?preview=1'/);
  });
});
