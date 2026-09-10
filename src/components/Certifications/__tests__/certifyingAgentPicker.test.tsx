/**
 * The certifying-agent picker: one list, the Integrity DB spelling stored, and an honest line
 * about the packet's numbering.
 *
 * 🔴 2026-09-10 — the agent was free text matched against three aliases, so any agent Trazo holds
 * no register for, or a typo of one it does, produced a packet numbered to CCOF's forms with
 * nothing on screen saying so. See `certifications/certifying_agents.py`.
 */
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';

const AGENTS = [
  { slug: 'oci', name: 'Organic Certifiers, Inc.', short_name: 'OCI', own_numbering: false },
  {
    slug: 'otco',
    name: 'Oregon Tilth Certified Organic',
    short_name: 'OTCO',
    own_numbering: true
  },
  {
    slug: 'wsda',
    name: 'Washington State Department of Agriculture',
    short_name: 'WSDA',
    own_numbering: true
  }
];

let query: Record<string, unknown> = { data: AGENTS, isLoading: false, isError: false };

vi.mock('store/api/certificationApi', () => ({
  useGetCertifyingAgentsQuery: () => query
}));

import CertifyingAgentPicker from '../CertifyingAgentPicker';

const seen: string[] = [];

const Harness = ({ initial = '' }: { initial?: string }) => {
  const [value, setValue] = useState(initial);
  return (
    <CertifyingAgentPicker
      value={value}
      onChange={(name) => {
        seen.push(name);
        setValue(name);
      }}
      showNumbering
      ariaLabel="Certifying agent"
    />
  );
};

const renderPicker = (initial = '') =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <Harness initial={initial} />
      </IntlProvider>
    </ChakraProvider>
  );

const select = () => screen.getByLabelText('Certifying agent') as HTMLSelectElement;

describe('CertifyingAgentPicker', () => {
  beforeEach(() => {
    query = { data: AGENTS, isLoading: false, isError: false };
    seen.length = 0;
  });

  it('offers every agent by its Integrity DB name and short name, plus Other', () => {
    renderPicker();
    const labels = Array.from(select().options).map((o) => o.textContent);
    expect(labels).toContain('Organic Certifiers, Inc. (OCI)');
    expect(labels).toContain('Washington State Department of Agriculture (WSDA)');
    expect(labels).toContain('Other (not on this list)');
  });

  it('stores the Integrity DB spelling, not the label shown', () => {
    renderPicker();
    fireEvent.change(select(), { target: { value: 'Organic Certifiers, Inc.' } });
    expect(seen).toEqual(['Organic Certifiers, Inc.']);
  });

  it("says the packet is numbered to a registered agent's own forms", () => {
    renderPicker();
    fireEvent.change(select(), { target: { value: 'Washington State Department of Agriculture' } });
    expect(screen.getByText("The renewal packet is numbered to WSDA's own forms.")).toBeTruthy();
  });

  it('says so when Trazo carries no register for the picked agent', () => {
    renderPicker();
    fireEvent.change(select(), { target: { value: 'Organic Certifiers, Inc.' } });
    const line = screen.getByText(/doesn't carry OCI's form numbers yet/).textContent || '';
    expect(line).toMatch(/Common OSP \(CCOF's forms\)/);
    expect(line).toMatch(/coverage page tells your reviewer so/);
  });

  it('opens a stored name that is not on the list in the Other box instead of dropping it', () => {
    renderPicker('Cascade Organic Certifiers');
    expect(select().value).toBe('__other__');
    const box = screen.getByLabelText('Name as it appears on your certificate') as HTMLInputElement;
    expect(box.value).toBe('Cascade Organic Certifiers');
    // No numbering promise for text Trazo has not resolved: only the server knows what it means.
    expect(screen.queryByText(/numbered to/)).toBeNull();
  });

  it('choosing Other clears the answer and keeps the box open while it is empty', () => {
    renderPicker('Washington State Department of Agriculture');
    fireEvent.change(select(), { target: { value: '__other__' } });
    expect(seen).toEqual(['']);
    expect(screen.getByLabelText('Name as it appears on your certificate')).toBeTruthy();
  });

  it('degrades to a plain text box when the list cannot be loaded', () => {
    query = { data: undefined, isLoading: false, isError: true };
    renderPicker('CCOF');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect((screen.getByLabelText('Certifying agent') as HTMLInputElement).value).toBe('CCOF');
  });
});
