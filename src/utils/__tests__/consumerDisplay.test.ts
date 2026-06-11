import { describe, expect, it } from 'vitest';
import { maskPerformerName } from '../consumerDisplay';

describe('maskPerformerName', () => {
  it('masks a full name to initials', () => {
    expect(maskPerformerName('Ana Torres')).toBe('Farm team (A.T.)');
  });

  it('masks a single-word name to one initial', () => {
    expect(maskPerformerName('Roberto')).toBe('Farm team (R.)');
  });

  it('is idempotent on server-masked values', () => {
    // The backend (PublicHistorySerializer._public_performer) masks
    // server-side since Phase 3 — re-masking must not garble initials.
    expect(maskPerformerName('Farm team (A.T.)')).toBe('Farm team (A.T.)');
    expect(maskPerformerName('Farm team')).toBe('Farm team');
  });

  it('falls back to plain label for empty-ish input', () => {
    expect(maskPerformerName('   ')).toBe('Farm team');
  });
});
