/**
 * Every business activity whose row the certifier packet prints with a "Certifier / Auditor"
 * and "Certificate #" column must have inputs for them.
 *
 * Found 2026-08-21 logging a Real Organic Project inspection on the Calapooia Bend rehearsal:
 * `sustainability_audit` rendered no certification block, so the packet row read
 * "Sustainability Audit … Verified" with an empty auditor and empty report number — an
 * assessment with nobody's name on it. This pins the form gate to the packet's columns.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const FORM = readFileSync(join(__dirname, '..', 'BusinessTab-SIMPLIFIED.jsx'), 'utf8');

/** Business types the packet prints certifier/certificate columns for and that name a third party. */
const THIRD_PARTY_TYPES = ['certification', 'verification', 'sustainability_audit'];

describe('business certification detail block', () => {
  const gate = FORM.match(/\{\(businessType === 'certification'[\s\S]{0,240}?\) && \(/)?.[0];

  it('has a single gate around the certification detail fields', () => {
    expect(gate).toBeTruthy();
  });

  it.each(THIRD_PARTY_TYPES)('renders the certifier fields for %s', (type) => {
    expect(gate).toContain(`businessType === '${type}'`);
  });

  it('still renders the three fields the packet columns read', () => {
    for (const name of ['certification_type', 'verified_certifier_name', 'certificate_number']) {
      expect(FORM).toContain(`name="${name}"`);
    }
  });
});
