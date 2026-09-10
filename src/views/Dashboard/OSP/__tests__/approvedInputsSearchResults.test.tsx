/**
 * The approved-inputs search shows every match, and "no match" is not a warning.
 *
 * 🔴 2026-09-06 — two defects on the same screen, from one screenshot:
 *
 * 1. A search for "Serenade" rendered ONE row. The endpoint had returned a ranked shortlist
 *    on `omri_candidates` since 2026-09-02, but this panel read only `omri_product_pk` — the
 *    winner — so the catalog's other Serenade brands, including the Serenade Opti already on
 *    the operation's own plan, were unreachable from a search for their own name. WSDA and
 *    the National List answered singular at the API too, so "copper" collapsed several
 *    § 205.601 entries into whichever had the shortest NAME.
 *
 * 2. "No match" rendered as `StandardAlert status="warning"` — amber ground, orange accent
 *    bar, warning triangle — wrapped around a full-bleed primary button. Trazo holds a
 *    reference subset of a ~10,000-product list, so no-match is the COMMON case, and the
 *    alert's own copy said as much ("does not mean it is prohibited"). `.claude/rules/
 *    frontend.md`: status colour = meaning, never decoration. `<Alert>` is also `role="alert"`
 *    — an assertive live region — so a routine search result interrupted screen readers.
 *
 * This file is the panel's first test. The audit that produced it recorded
 * `OSPApprovedInputsPanel.tsx` as untested entirely, which is how a shortlist contract could
 * ship on the server and never be read by the one screen it was built for.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

const verifyResult: Record<string, unknown> = {};

// `vi.mock` is hoisted above the imports, so the factory may not close over a `const`
// declared below it — only over one it reads lazily at call time, like `verifyResult`.
// Everything else is defined inside.
vi.mock('store/api/ospApi', () => {
  const mutation = () => [() => ({ unwrap: () => Promise.resolve({}) }), { isLoading: false }];
  return {
    useLazyVerifyInputQuery: () => [
      () => undefined,
      { data: verifyResult, isFetching: false, isUninitialized: false, error: undefined }
    ],
    useAddApprovedInputMutation: mutation,
    useRemoveApprovedInputMutation: mutation,
    useAddPlanMaterialMutation: mutation,
    useDeletePlanMaterialMutation: mutation,
    useGetPlanMaterialsQuery: () => ({ data: [] })
  };
});

// eslint-disable-next-line import/first
import OSPApprovedInputsPanel from '../OSPApprovedInputsPanel';

const OSP = {
  id: 1,
  status: 'active',
  approved_national_list_substances: [],
  approved_omri_products: [],
  approved_wsda_materials: []
};

const renderPanel = (result: Record<string, unknown>, osp: Record<string, unknown> = OSP) => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, result);
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <OSPApprovedInputsPanel companyId="1" farmId="1" osp={osp as any} />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('approved-inputs search — every match is offered, not just the winner', () => {
  it('renders every OMRI candidate, not only `omri_product_pk`', () => {
    renderPanel({
      found: true,
      status: 'matched',
      omri_product_pk: 41,
      omri_product_id: 'gus-4423',
      omri_product_name: 'Serenade ASO',
      omri_candidates: [
        { pk: 41, omri_id: 'gus-4423', product_name: 'Serenade ASO' },
        { pk: 42, omri_id: 'gus-4424', product_name: 'Serenade MAX' },
        { pk: 43, omri_id: 'gus-5425', product_name: 'Bayer Serenade Opti A Wettable Powder' }
      ],
      omri_candidate_count: 3,
      national_list_substance_pk: null,
      wsda_material_pk: null
    });

    expect(screen.getByText('Serenade ASO')).toBeTruthy();
    expect(screen.getByText('Serenade MAX')).toBeTruthy();
    expect(screen.getByText('Bayer Serenade Opti A Wettable Powder')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Add to OSP/i })).toHaveLength(3);
  });

  it('renders every WSDA and National List candidate too', () => {
    renderPanel({
      found: true,
      status: 'matched',
      omri_product_pk: null,
      national_list_substance_pk: 7,
      national_list_candidates: [
        { pk: 7, substance_name: 'Copper sulfate', cfr_section: '205.601', status: 'allowed' },
        { pk: 8, substance_name: 'Copper hydroxide', cfr_section: '205.601', status: 'allowed' }
      ],
      wsda_material_pk: 3,
      wsda_candidates: [
        { pk: 3, wsda_id: '1123', brand_name: 'Kaligreen Fungicide' },
        { pk: 4, wsda_id: '2948', brand_name: 'Kaligreen Plus' }
      ]
    });

    expect(screen.getByText('Copper sulfate')).toBeTruthy();
    expect(screen.getByText('Copper hydroxide')).toBeTruthy();
    expect(screen.getByText('Kaligreen Fungicide')).toBeTruthy();
    expect(screen.getByText('Kaligreen Plus')).toBeTruthy();
  });

  it('says when the server capped the list, using the TRUE total', () => {
    renderPanel({
      found: true,
      status: 'matched',
      omri_product_pk: 41,
      omri_candidates: [{ pk: 41, omri_id: 'nhf-0644', product_name: "Neptune's Harvest 2-4-1" }],
      // The cap is the server's; the count is the real number of matches. Printing
      // `candidates.length` here would tell the grower "1 match" when 7 exist.
      omri_candidate_count: 7,
      national_list_substance_pk: null,
      wsda_material_pk: null
    });

    expect(screen.getByText(/closest 1 of 7 matches/i)).toBeTruthy();
  });

  it('reads `status` per National List row so a prohibited match keeps its own verdict', () => {
    renderPanel({
      found: true,
      status: 'matched',
      omri_product_pk: null,
      wsda_material_pk: null,
      national_list_substance_pk: 7,
      national_list_candidates: [
        { pk: 7, substance_name: 'Sulfur dioxide', cfr_section: '205.601', status: 'allowed' },
        {
          pk: 8,
          substance_name: 'Sulfur dioxide smoke bomb',
          cfr_section: '205.602',
          status: 'prohibited'
        }
      ]
    });

    // One Add button (the allowed row) and one refusal (the prohibited row) — not two of
    // either. Reading the status of whichever row ranked first would produce two of one.
    expect(screen.getAllByRole('button', { name: /Add to OSP/i })).toHaveLength(1);
    expect(screen.getByText(/Prohibited in organic production/i)).toBeTruthy();
  });

  it('never prints a WSDA identifier that is not a real WSDA Product #', () => {
    renderPanel({
      found: true,
      status: 'matched',
      omri_product_pk: null,
      national_list_substance_pk: null,
      wsda_material_pk: 9,
      wsda_candidates: [
        { pk: 9, wsda_id: 'WSDA-REG-BIOAG-2025-003', brand_name: 'Serenade Opti' },
        { pk: 10, wsda_id: '2948', brand_name: 'Nature Safe 13-0-0' }
      ]
    });

    // A certifier who looks up `WSDA-REG-BIOAG-2025-003` finds nothing — WSDA keys its list
    // on a bare integer and issues no identifier of that shape. The brand still renders; the
    // invented string never does.
    expect(screen.getByText('Serenade Opti')).toBeTruthy();
    expect(screen.queryByText(/WSDA-REG-/)).toBeNull();
    expect(screen.getByText(/WSDA Product #2948/)).toBeTruthy();
  });
});

describe('approved-inputs search — "no match" is an outcome, not a warning', () => {
  const NO_MATCH = {
    found: false,
    status: 'not_found',
    omri_product_pk: null,
    national_list_substance_pk: null,
    wsda_material_pk: null
  };

  it('does not render an alert', () => {
    const { container } = renderPanel(NO_MATCH);
    // ⛔ `<Alert>` is `role="alert"` — an assertive live region. A routine search result is
    // not an interruption. The panel's other alerts (plan locked, plan not active) are real
    // status and are allowed; this asserts none of them fire on a plain no-match render.
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
  });

  it('states the three catalogues it actually searched', () => {
    renderPanel(NO_MATCH);
    // The old copy named two ("No OMRI or National List match found") while the endpoint
    // searched three, so a grower whose product is WSDA-listed was told WSDA had not been
    // consulted.
    const text = screen.getByText(/No match in OMRI/i).textContent || '';
    expect(text).toMatch(/WSDA Materials List/i);
    expect(text).toMatch(/National List/i);
  });

  it('does not send the grower to Notification of Changes as the only route', () => {
    renderPanel(NO_MATCH);
    // The old next-step copy ended "record it under Notification of Changes below with your
    // certifier's approval letter reference; until then its events will keep flagging as
    // drift" — printed directly above the button that IS the route.
    expect(screen.queryByText(/Notification of Changes below/i)).toBeNull();
  });
});

/**
 * 🔴 2026-09-10 — spinosad, Bt and d-limonene were catalogued at § 205.601, which lists SYNTHETICS;
 * none of the three is there (eCFR). The backend now files them as nonsynthetic (`cfr_section`
 * "nonsyn", `is_national_list_entry: false`, empty `citation`). This panel built "§ {cfr_section}"
 * itself and filed every catalogue row under "National List", so the fix would have printed
 * "nonsyn" under a National List badge.
 */
describe('approved-inputs — a nonsynthetic substance is never presented as a National List entry', () => {
  it('badges a nonsynthetic search hit as such and prints no section for it', () => {
    renderPanel({
      found: true,
      status: 'matched',
      omri_product_pk: null,
      wsda_material_pk: null,
      national_list_substance_pk: 7,
      national_list_candidates: [
        {
          pk: 7,
          substance_name: 'Spinosad',
          cfr_section: 'nonsyn',
          citation: '',
          is_national_list_entry: false,
          status: 'allowed'
        },
        {
          pk: 8,
          substance_name: 'Elemental sulfur',
          cfr_section: '205.601',
          citation: '§ 205.601(e)',
          is_national_list_entry: true,
          status: 'allowed'
        }
      ]
    });

    expect(screen.getByText('Spinosad')).toBeTruthy();
    expect(screen.getByText('Nonsynthetic')).toBeTruthy();
    expect(screen.queryByText(/nonsyn\b/)).toBeNull();
    // The real § 205.601 row keeps its badge and prints the citation the server gave it.
    expect(screen.getByText('§ 205.601(e)')).toBeTruthy();
  });

  it('files an approved nonsynthetic substance in its own group, not under National List', () => {
    renderPanel(
      {
        found: false,
        status: 'not_found',
        omri_product_pk: null,
        national_list_substance_pk: null,
        wsda_material_pk: null
      },
      {
        ...OSP,
        approved_national_list_substances: [
          {
            id: 1,
            substance_name: 'Spinosad',
            cfr_section: 'nonsyn',
            citation: '',
            is_national_list_entry: false,
            status: 'allowed'
          },
          {
            id: 2,
            substance_name: 'Elemental sulfur',
            cfr_section: '205.601',
            citation: '§ 205.601(e)',
            is_national_list_entry: true,
            status: 'allowed'
          }
        ]
      }
    );

    const listed = screen.getByText(/National List substances/i).textContent || '';
    expect(listed).toMatch(/\(1\)/);
    const nonsyn =
      screen.getByText(/Nonsynthetic substances \(no National List entry\)/i).textContent || '';
    expect(nonsyn).toMatch(/\(1\)/);
    expect(screen.getByText('Spinosad')).toBeTruthy();
  });
});
