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
  {
    slug: 'oci',
    name: 'Organic Certifiers, Inc.',
    short_name: 'OCI',
    own_numbering: false,
    in_state_rank: null
  },
  {
    slug: 'otco',
    name: 'Oregon Tilth Certified Organic',
    short_name: 'OTCO',
    own_numbering: true,
    in_state_rank: null
  },
  {
    slug: 'wsda',
    name: 'Washington State Department of Agriculture',
    short_name: 'WSDA',
    own_numbering: true,
    in_state_rank: 1
  },
  {
    slug: 'qai',
    name: 'Quality Assurance International',
    short_name: 'QAI',
    own_numbering: false,
    in_state_rank: 2
  },
  {
    slug: 'baystate',
    name: 'Baystate Organic Certifiers',
    short_name: '',
    own_numbering: false,
    in_state_rank: null
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
    expect(labels).toContain('OCI — Organic Certifiers, Inc.');
    expect(labels).toContain('WSDA — Washington State Department of Agriculture');
    expect(labels).toContain('Other (not on this list)');
  });

  it('leads with the short name, so a clipped closed select still shows it', () => {
    renderPicker();
    fireEvent.change(select(), { target: { value: 'Washington State Department of Agriculture' } });
    expect(select().selectedOptions[0].textContent?.startsWith('WSDA')).toBe(true);
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
    // Run 8 (R8-12): the packet borrows no agent's numbering for an agent with no register, and
    // never says "the content is the same". The line says what the packet's coverage page says.
    const line = screen.queryByText(/holds no form register for OCI/)?.textContent || '';
    expect(line).toMatch(/borrows no agent's form numbers/);
    expect(line).toMatch(/ask OCI which of its forms apply/);
    expect(line).not.toMatch(/CCOF|same/);
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

describe('CertifyingAgentPicker — grouped for the farm', () => {
  beforeEach(() => {
    query = { data: AGENTS, isLoading: false, isError: false };
  });

  it('puts the agencies whose forms the packet speaks first, alphabetically', () => {
    renderPicker();
    const groups = Array.from(select().querySelectorAll('optgroup'));
    expect(groups.map((g) => g.label)).toEqual([
      'Your packet uses their own forms',
      'Also common in your state',
      'All other agencies'
    ]);
    const labels = (g: Element) =>
      Array.from(g.querySelectorAll('option')).map((o) => o.textContent);
    // Alphabetical, not by rank: Oregon Tilth never ranks (no physical address in the USDA
    // snapshot), so ranking would put it last even in Oregon, where it is the most common agency.
    expect(labels(groups[0])).toEqual([
      'OTCO — Oregon Tilth Certified Organic',
      'WSDA — Washington State Department of Agriculture'
    ]);
    expect(labels(groups[1])).toEqual(['QAI — Quality Assurance International']);
    expect(labels(groups[2])).toEqual([
      'Baystate Organic Certifiers',
      'OCI — Organic Certifiers, Inc.'
    ]);
  });

  it('drops the in-state group when nothing ranks there', () => {
    query = {
      data: AGENTS.map((a) => ({ ...a, in_state_rank: null })),
      isLoading: false,
      isError: false
    };
    renderPicker();
    const groups = Array.from(select().querySelectorAll('optgroup')).map((g) => g.label);
    expect(groups).toEqual(['Your packet uses their own forms', 'All other agencies']);
  });
});
