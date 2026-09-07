/**
 * No invented identifier is presented to the grower as a government registration.
 *
 * Two of the three catalogues Trazo cross-references do not give it a number to print:
 *
 *   WSDA      the real key is the list's `WSDA Product #` column and it holds a BARE
 *             INTEGER (1123, 2948, 3376). The `WSDA-REG-BIOAG-2025-001` strings Trazo
 *             seeded are not a shape WSDA issues, so a grower who takes one to WSDA
 *             finds nothing — worse than showing no identifier at all.
 *   CDFA OIM  the published Registered OIM Products list has three columns — Firm,
 *             Product Name, Annotations — and NO identifier. Every `CDFA-OIM-*` value
 *             was invented, so a registered row says "registered" and stops there.
 *
 * OMRI's codes ARE real and deep-link to a live certificate, so those stay — pinned
 * here too, because "strip the ids" is the wrong lesson to draw from this fix.
 *
 * The `^\d+$` rule lives in trazo-back/certifications/services/registry_identifiers.py;
 * this file pins the frontend mirror of it.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';
import type { DriftWarning } from 'types/standardizedEvents';

const verifyResult: Record<string, unknown> = {};

vi.mock('store/api/ospApi', () => ({
  useLazyVerifyInputQuery: () => [
    () => undefined,
    { data: verifyResult, isFetching: false, isUninitialized: false, error: undefined }
  ]
}));

import InputVerifyHelper from '../InputVerifyHelper';
import DriftFindingsBanner from '../DriftFindingsBanner';

const wrap = (node: React.ReactNode) =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale="en-US"
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        {node}
      </IntlProvider>
    </ChakraProvider>
  );

const renderLookup = (result: Record<string, unknown>) => {
  Object.keys(verifyResult).forEach((k) => delete verifyResult[k]);
  Object.assign(verifyResult, result);
  return wrap(<InputVerifyHelper name="Feather Meal 13-0-0" />);
};

const WSDA_HIT = (id: string | null) => ({
  found: true,
  status: 'matched',
  omri_product_pk: null,
  national_list_substance_pk: null,
  wsda_material_pk: 21,
  wsda_material_id: id,
  wsda_material_name: 'Feather Meal 13-0-0',
  wsda_material_category: 'fertilizer'
});

describe('InputVerifyHelper — only a real WSDA Product # is shown', () => {
  it('shows nothing at all for a fabricated WSDA id', () => {
    renderLookup(WSDA_HIT('WSDA-REG-BIOAG-2025-001'));
    expect(screen.getByText(/Feather Meal 13-0-0/)).toBeTruthy();
    expect(screen.queryByText(/WSDA-REG/)).toBeNull();
    // The category still renders — the row is not suppressed, only the identifier.
    expect(screen.getByText(/fertilizer/)).toBeTruthy();
  });

  it('shows a bare integer as the WSDA Product # it is', () => {
    renderLookup(WSDA_HIT('1123'));
    expect(screen.getByText(/WSDA Product #1123/)).toBeTruthy();
  });

  it('keeps the real OMRI code — this fix is about invented ids, not all ids', () => {
    renderLookup({
      found: true,
      status: 'matched',
      omri_product_pk: 17,
      omri_product_id: 'ttc-17486',
      omri_product_name: 'Kocide 3000-O',
      wsda_material_pk: null,
      national_list_substance_pk: null
    });
    expect(screen.getByText(/OMRI #ttc-17486/)).toBeTruthy();
  });
});

const finding = (cdfa: Record<string, unknown>) => ({
  id: 1,
  date: '2026-08-14T00:00:00Z',
  drift_warning: {
    detected_at: '2026-08-14T00:00:00Z',
    osp_id: 1,
    osp_version: 1,
    input_label: 'Down To Earth Feather Meal',
    reason: 'not on the plan',
    resolved_via: 'unresolved',
    cdfa_oim_status: cdfa
  } as unknown as DriftWarning
});

describe('DriftFindingsBanner — the CDFA badge carries no number and asserts no violation', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: /Show details/i }));

  it('renders a registered row as the word, never as a number', () => {
    wrap(
      <DriftFindingsBanner
        events={[finding({ status: 'registered', cdfa_oim_reg_number: 'CDFA-OIM-DTE-FM' })]}
      />
    );
    open();
    expect(screen.queryByText(/CDFA-OIM/)).toBeNull();
    expect(screen.getByText(/CDFA OIM registered/)).toBeTruthy();
  });

  it('renders an unknown row as not checked, never as missing', () => {
    wrap(<DriftFindingsBanner events={[finding({ status: 'unknown' })]} />);
    open();
    expect(screen.getByText(/CDFA OIM not checked/)).toBeTruthy();
    expect(screen.queryByText(/CDFA OIM missing/)).toBeNull();
  });

  it('renders a legacy "missing" row the same way — it always meant unchecked', () => {
    wrap(
      <DriftFindingsBanner
        events={[finding({ status: 'missing', cdfa_oim_reg_number: null })]}
      />
    );
    open();
    expect(screen.getByText(/CDFA OIM not checked/)).toBeTruthy();
    expect(screen.queryByText(/CDFA OIM missing/)).toBeNull();
  });
});
