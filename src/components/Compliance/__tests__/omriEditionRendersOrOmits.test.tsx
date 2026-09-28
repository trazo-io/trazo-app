/**
 * The OMRI edition label, proved by RENDERING it rather than by grepping for a call.
 *
 * `omriEditionDateIsLocal.test.ts` asserts that the component routes the date through
 * `parseDateOnly` and never hands the raw string to a formatter. Both were true of the code that
 * carried this defect, which is exactly the limit of a source assertion: it can see which function
 * is called and not what the call produces.
 *
 * THE DEFECT, MEASURED 2026-09-27: the edition was gated on the RAW string being truthy and then
 * formatted from the PARSED one:
 *
 *     candidate.list_edition_date
 *       ? intl.formatDate(parseDateOnly(candidate.list_edition_date) ?? undefined, ...)
 *
 * `parseDateOnly` returns null for a truthy-but-unparseable value, deliberately, so that callers
 * hide the field rather than show something mistakable for real data. But `null ?? undefined` is
 * `undefined`, and `Intl.DateTimeFormat.format(undefined)` returns TODAY rather than throwing. So a
 * malformed column value printed "List of <today>" as OMRI's edition, under a comment in that same
 * function promising it NEVER invents "current".
 *
 * Why it matters more than a formatting slip: OMRI republishes daily, so the edition is the thing
 * that tells a grower, and a certifier reading the record, WHICH list a product was found on. A
 * fabricated one is a third-party listing claim nobody checked, which is the claim-safety class
 * this project guards hardest.
 */
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';

// `vi.hoisted`, because `vi.mock` is hoisted above every other statement in the file: a factory
// that closed over a plain top-level `const` would read it before initialisation, the mock would
// fail, and the real lazy query would report `isUninitialized` so the card never rendered at all.
const state = vi.hoisted(() => ({ data: undefined as any }));

vi.mock('store/api/ospApi', () => ({
  useLazyVerifyInputQuery: () => [
    () => undefined,
    { data: state.data, isFetching: false, isUninitialized: false, error: undefined }
  ]
}));

// Imported after the mock so the component picks it up.
const { default: InputVerifyHelper } = await import('../InputVerifyHelper');

/**
 * Two candidates, so the card takes the ambiguous branch that shows a per-row subtitle.
 *
 * `omri_product_pk` must be set even though this is the AMBIGUOUS case: `noMatch` is
 * `!hasOMRI && !hasWSDA && !hasNL` and `hasOMRI` reads that pk, so leaving it null renders the
 * "no match in OMRI, WSDA, or the National List" card instead and every assertion below looks
 * for text that was never on the page.
 */
const resultWith = (editionDate: string | null) => ({
  query: 'seaweed',
  omri_product_pk: 1,
  omri_candidate_count: 2,
  omri_candidates: [
    {
      pk: 1,
      omri_id: '1234-A',
      product_name: 'Soluble Seaweed Powder',
      manufacturer: 'Neptune',
      list_edition_date: editionDate
    },
    {
      pk: 2,
      omri_id: '5678-B',
      product_name: 'Soluble Seaweed Liquid',
      manufacturer: 'Neptune',
      list_edition_date: editionDate
    }
  ]
});

const mount = (editionDate: string | null) => {
  state.data = resultWith(editionDate);
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <InputVerifyHelper name="seaweed" />
      </IntlProvider>
    </ChakraProvider>
  );
};

/** What `Intl` would print for right now, in the pinned zone. The thing that must never appear. */
const today = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}).format(new Date());

describe('the OMRI edition label', () => {
  it('renders the published edition, in the viewer calendar', () => {
    mount('2026-09-05');
    // Sep 5 and not Sep 4: the suite is pinned west of UTC, so a UTC-midnight parse would slip.
    expect(screen.getAllByText(/List of Sep 5, 2026/).length).toBeGreaterThan(0);
  });

  it('omits the edition on a malformed date instead of printing today', () => {
    mount('not-a-date');
    expect(screen.queryByText(/List of/)).toBeNull();
    expect(
      screen.queryByText(new RegExp(today.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
      'a malformed edition date rendered as the current date'
    ).toBeNull();
    // the row is still identified, just without an edition it cannot vouch for
    expect(screen.getAllByText(/OMRI #1234-A/).length).toBeGreaterThan(0);
  });

  it('omits the edition when there is none on file', () => {
    mount(null);
    expect(screen.queryByText(/List of/)).toBeNull();
    expect(screen.getAllByText(/OMRI #1234-A/).length).toBeGreaterThan(0);
  });
});
