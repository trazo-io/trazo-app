/**
 * A catalog hit is a suggestion; the FK is a claim. Only the grower's tap turns one into the other.
 *
 * 2026-09-01 — the green-flow walk for the demo shoot found that the lookup under
 * Commercial Name showed "OMRI #ttc-17486" on screen and then wrote NOTHING to the record:
 * `omri_product` stayed null, the dossier printed "OMRI Listed — grower-selected, no listing on
 * file" on the row the grower had just looked up, and the buyer page fell back to
 * "Organic-approved · grower-reported". The tempting fix — write the match on lookup — is the
 * one `consumer-omri-listing-leak-2026-08-09` forbids: the matcher is fuzzy ("Kocide 3000" →
 * "Kocide 3000-O" manufactures a listing for the product that lacks one). The right build, per
 * that same note, is operator confirmation: "this is my product" writes the FK.
 *
 * Pinned here:
 *   1. rendering a hit calls `onAttachOmri` ZERO times — no auto-populate, ever;
 *   2. tapping "Use this listing" calls it once, with the OMRI pk;
 *   3. an attached row shows the attached state and a Remove that calls it with `null`;
 *   4. without `onAttachOmri` the card is read-only — no attach control renders.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';

const verifyResult: Record<string, unknown> = {};

vi.mock('store/api/ospApi', () => ({
  useLazyVerifyInputQuery: () => [
    () => undefined,
    { data: verifyResult, isFetching: false, isUninitialized: false, error: undefined }
  ]
}));

import InputVerifyHelper from '../InputVerifyHelper';

const OMRI_HIT = {
  found: true,
  status: 'matched',
  omri_product_pk: 17,
  omri_product_id: 'ttc-17486',
  omri_product_name: 'Kocide 3000-O Fungicide Bactericide Dry Flowable',
  wsda_material_pk: null,
  national_list_substance_pk: null
};

const renderWith = (
  result: Record<string, unknown>,
  props: Partial<React.ComponentProps<typeof InputVerifyHelper>> = {}
) => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, result);
  return render(
    <ChakraProvider>
      <IntlProvider
        locale="en-US"
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        <InputVerifyHelper name="Kocide 3000-O" {...props} />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('InputVerifyHelper — the OMRI listing is attached by the grower, never by the matcher', () => {
  it('renders a hit without calling onAttachOmri (no auto-populate)', () => {
    const onAttachOmri = vi.fn();
    renderWith(OMRI_HIT, { onAttachOmri, attachedOmriPk: null });
    expect(screen.getByText(/Kocide 3000-O Fungicide/i)).toBeTruthy();
    expect(onAttachOmri).not.toHaveBeenCalled();
  });

  it('"Use this listing" hands the OMRI pk to the form, once', () => {
    const onAttachOmri = vi.fn();
    renderWith(OMRI_HIT, { onAttachOmri, attachedOmriPk: null });
    fireEvent.click(screen.getByRole('button', { name: /Use this listing/i }));
    expect(onAttachOmri).toHaveBeenCalledTimes(1);
    expect(onAttachOmri).toHaveBeenCalledWith(17);
  });

  it('an attached row says so and offers Remove, which detaches with null', () => {
    const onAttachOmri = vi.fn();
    renderWith(OMRI_HIT, { onAttachOmri, attachedOmriPk: 17 });
    expect(screen.getByText(/Attached to this record/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Use this listing/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Remove$/i }));
    expect(onAttachOmri).toHaveBeenCalledWith(null);
  });

  it('a different attached pk is not "this" listing — the attach control still shows', () => {
    const onAttachOmri = vi.fn();
    renderWith(OMRI_HIT, { onAttachOmri, attachedOmriPk: 99 });
    expect(screen.queryByText(/Attached to this record/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Use this listing/i })).toBeTruthy();
  });

  it('without onAttachOmri the card is read-only', () => {
    renderWith(OMRI_HIT);
    expect(screen.queryByRole('button', { name: /Use this listing/i })).toBeNull();
    expect(screen.queryByText(/Attached to this record/i)).toBeNull();
  });

  it('the button says "look up", not "verify" — Trazo resolves names, it does not verify', () => {
    renderWith(OMRI_HIT);
    expect(screen.getByRole('button', { name: /Look up in OMRI/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Verify/i })).toBeNull();
  });
});

/**
 * The other half of the invariant, and the one that actually bit.
 *
 * The tab owns BOTH the product name and the listing, so it keeps them consistent. Voice does
 * not: `handleVoiceEventDetected` merges a PARTIAL payload into `eventFormData` and bumps
 * `voiceSeq`, which is a `key` on the tab — so the tab remounts and re-reads `initialValues`.
 * Attach a listing to "Kocide 3000-O", then dictate "Entrust SC", and the Kocide pk was reset
 * straight back into the form beside the Entrust name and saved: a § 205.601 listing claim for
 * a product that does not hold one. Found by reading the diff back on 2026-09-01, not by a
 * failing test — which is why the invariant is pinned as source text here.
 *
 * Read as text (same technique as `mutationPayloadGuards.test.ts`) because the merge lives
 * inside a 3,000-line component with no seam to render in isolation.
 */
const newEventSource = readFileSync(
  resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
  'utf8'
);

/** Source with comment-only lines removed — the incident notes mention these names on purpose. */
const newEventCode = newEventSource
  .split('\n')
  .filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  })
  .join('\n');

/** The full `setEventFormData( … )` call starting at `from`, by balanced parentheses.
 *  A fixed-width window is not good enough here: 260 chars past `onDataChange`'s merge runs
 *  into the next statement and picks up `...eventFormDataRef.current` as if it were part of
 *  the merge. */
const callAt = (source: string, from: number): string => {
  const open = source.indexOf('(', from);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  return source.slice(from);
};

describe('NewEvent — a voice merge never carries a listing onto a new product name', () => {
  const merges = [...newEventCode.matchAll(/setEventFormData\(/g)].map((m) =>
    callAt(newEventCode, m.index as number)
  );

  /**
   * Partial payloads that may legitimately be merged over existing state without the guard:
   *   `data`                   — `onDataChange`: the tab pushing its OWN getValues() up, so the
   *                              product name and the listing always travel together.
   *   `templatePrefillValues`  — `PREFILLABLE_FIELDS` deliberately excludes `commercial_name`
   *                              (a template writes a plan, never a product identity).
   */
  const SAFE_PARTIALS = ['data', 'templatePrefillValues'];

  it('defines the guard, and it nulls the listing rather than keeping it', () => {
    expect(newEventCode).toMatch(/const withOmriAttachmentChecked\s*=/);
    const body = newEventCode.slice(newEventCode.indexOf('const withOmriAttachmentChecked'));
    expect(body.slice(0, 400)).toMatch(/omri_product:\s*null/);
    expect(body.slice(0, 400)).toMatch(/commercial_name\s*!==\s*prev\.commercial_name/);
  });

  it('guards every merge that carries an unknown partial over existing state', () => {
    const risky = merges.filter((call) => {
      // Only merges that CARRY existing state forward can smuggle a stale pk. A merge that
      // rebuilds the object from an allow-list (handleSubtypeSelect keeps date +
      // performed_by) drops the name and the pk together and needs nothing.
      if (!/\.\.\.prev[A-Za-z]*\b/.test(call)) return false;
      const partials = [...call.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)]
        .map((x) => x[1])
        .filter((n) => !/^prev/.test(n) && !SAFE_PARTIALS.includes(n));
      return partials.length > 0;
    });

    expect(risky.length, 'expected the three voice merges to be found').toBe(3);
    const unguarded = risky.filter((c) => !c.includes('withOmriAttachmentChecked'));
    expect(
      unguarded,
      'A setEventFormData merge spreads a partial payload over existing state without ' +
        'withOmriAttachmentChecked(). If it can carry commercial_name it must be wrapped; ' +
        'if it provably cannot, add its name to SAFE_PARTIALS with the reason.'
    ).toEqual([]);
  });

  it('never writes omri_product from anything but the guard', () => {
    // The pk enters form state through the grower's tap in InputVerifyHelper only. Any other
    // assignment means a matcher is manufacturing a listing again.
    const assignments = newEventCode.match(/omri_product:\s*[^\s,}]+/g) || [];
    expect(
      assignments.every((a) => /omri_product:\s*null/.test(a)),
      assignments.join(' | ')
    ).toBe(true);
  });
});
