/**
 * Run 8 (Astra, 2026-10-05): the OSP pages a pilot meets in the first weeks.
 *
 * R8-10  "N of 19 modules" is descriptive only: no percentage, no progress bar, no "complete",
 *        and a line saying an answer is not a review, approval or readiness for renewal.
 * R8-11  a year already signed or filed offers Create correction, not a second blank form;
 *        superseded revisions fold away; the renewal state sits above the narratives.
 * R8-12  an agent with no form register: the packet borrows no agent's numbering, and the app
 *        says the same thing the packet's coverage page says.
 * R8-26  plan membership is not approval; cleanout photo guidance is about the cleaning.
 * R8-06  "Versións" (an English plural suffix on a Spanish word) and "POS".
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';
import { getPhotoGuidanceParts } from 'utils/verificationTierHelpers';

const filed = {
  id: 5,
  reporting_year: 2026,
  revision_number: 2,
  changes_summary: 'Grandevo added in February.',
  additions: [],
  deletions: [],
  prior_osp: 59,
  prior_osp_version: 1,
  signed_at: '2026-08-20T10:00:00Z',
  submitted_at: '2026-08-21T11:37:30Z',
  filing_method: 'agent_web_form',
  is_locked: true
};
const withdrawnOnly = {
  ...filed,
  id: 9,
  reporting_year: 2027,
  revision_number: 1,
  changes_summary: 'Filed, then withdrawn.',
  withdrawn_at: '2027-02-01T10:00:00Z'
};
let mockUpdates: Record<string, unknown>[] = [];
const superseded = {
  ...filed,
  id: 4,
  revision_number: 1,
  changes_summary: 'First filing, later corrected.',
  superseded_at: '2026-08-21T11:00:00Z'
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: mockUpdates }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

import OSPAnnualUpdateCard, { OSPRenewalSummary } from '../OSPAnnualUpdateCard';

beforeEach(() => {
  mockUpdates = [filed, superseded];
});

const wrap = (node: React.ReactNode) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        {node}
      </IntlProvider>
    </ChakraProvider>
  );
const card = (year: number) =>
  wrap(
    <OSPAnnualUpdateCard
      companyId="1"
      farmId="2"
      planOnFile={{ id: 65, version_number: 4, status: 'active' } as any}
      currentYear={year}
    />
  );
const src = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');
const en = enUS as Record<string, string>;
const es = es419 as Record<string, string>;

describe('R8-10: the module count is descriptive only', () => {
  const COUNT_KEYS = [
    'osp.completion.sectionsOfTotal',
    'osp.section.status.complete',
    'osp.modules.status.completed',
    'osp.modules.farmWideProgress',
    'osp.modules.progressCount'
  ];

  it('no percentage and no complete / ready / compliant in either locale', () => {
    for (const cat of [en, es]) {
      for (const key of COUNT_KEYS) {
        const raw = cat[key];
        expect(raw, key).toBeTruthy();
        expect(raw, key).not.toMatch(/\{pct\}|%/);
        // The words a reader sees, without ICU placeholder names such as {complete}.
        const v = raw.replace(/\{[a-z]+\}/gi, '');
        expect(v, key).not.toMatch(/\b(complete|completed|ready|compliant)\b/i);
        expect(v, key).not.toMatch(/complet|list[oa]|cumpl/i);
      }
    }
  });

  it('both OSP views say an answer is not a review, and draw no progress bar', () => {
    for (const view of [
      'views/Dashboard/OSP/OSPView.tsx',
      'views/Dashboard/OSP/OSPModuleListPage.tsx'
    ]) {
      const code = src(view);
      expect(code, view).toMatch(/osp\.completion\.notAReview/);
      expect(code, view).not.toMatch(/<Progress\b/);
    }
    expect(en['osp.completion.notAReview']).toMatch(/not a review/);
    expect(es['osp.completion.notAReview']).toMatch(/no es una revisión/);
  });
});

describe('R8-11: the renewal card', () => {
  it('a filed year offers Create correction, not a second form', () => {
    card(2026);
    // The form no longer DEFAULTS to a filed year (recordkeeping review F-22, 2026-10-07): it
    // opens on the next unfiled one. Typing the filed year in is what gets the correction note.
    expect(screen.queryByTestId('annual-year-filed')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Continuation year/i), { target: { value: '2026' } });
    const filedNote = screen.queryByTestId('annual-year-filed');
    expect(filedNote).not.toBeNull();
    expect(filedNote).toHaveTextContent(/Create correction/);
    expect(screen.queryByRole('button', { name: 'Save Annual Update' })).toBeNull();
  });

  it('a year with no filing still shows the form', () => {
    card(2027);
    expect(screen.queryByTestId('annual-year-filed')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save Annual Update' })).toBeInTheDocument();
  });

  it('a superseded revision folds away until asked for', () => {
    card(2027);
    expect(screen.queryByText('First filing, later corrected.')).toBeNull();
    const toggle = screen.queryByTestId('annual-older-toggle');
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle!);
    expect(screen.getByText('First filing, later corrected.')).toBeInTheDocument();
  });

  it('the summary names the year, its state and the next step, and sits above the narratives', () => {
    expect(OSPRenewalSummary).toBeDefined();
    wrap(<OSPRenewalSummary companyId="1" farmId="2" currentYear={2027} />);
    expect(screen.queryByTestId('osp-renewal-summary')).toHaveTextContent(
      'Annual update 2026: Filed. Nothing pending.'
    );
    const view = src('views/Dashboard/OSP/OSPView.tsx');
    expect(view.indexOf('<OSPRenewalSummary')).toBeGreaterThan(-1);
    expect(view.indexOf('<OSPRenewalSummary')).toBeLessThan(
      view.indexOf('<Accordion allowMultiple')
    );
  });
});

describe('review of app #84: a withdrawn-only year', () => {
  it('the summary says withdrawn and what to do, never "no annual update recorded"', () => {
    mockUpdates = [filed, superseded, withdrawnOnly];
    wrap(<OSPRenewalSummary companyId="1" farmId="2" currentYear={2027} />);
    const line = screen.queryByTestId('osp-renewal-summary');
    expect(line).toHaveTextContent('Annual update 2027: Withdrawn. Next: file the year again.');
    expect(line).not.toHaveTextContent(/No annual update recorded/);
  });

  it('the withdrawn row stays visible without unfolding', () => {
    mockUpdates = [filed, superseded, withdrawnOnly];
    card(2028);
    expect(screen.queryByText('Filed, then withdrawn.')).not.toBeNull();
    expect(screen.queryByText('First filing, later corrected.')).toBeNull();
  });
});

describe('R8-12, R8-26, R8-06: wording', () => {
  it('an agent with no register: no "content is the same", no borrowed numbering', () => {
    for (const cat of [en, es]) {
      const v = cat['certifyingAgent.fallbackNumbering'];
      expect(v).not.toMatch(/same|mismo/i);
      expect(v).not.toMatch(/CCOF/);
      expect(v).toMatch(/\{agent\}/);
    }
  });

  it('plan inputs are a list, never "approved" by being on it', () => {
    for (const cat of [en, es]) {
      for (const k of [
        'empty.national_list',
        'empty.omri',
        'empty.wsda',
        'removeAria',
        'removeConfirm.body',
        'removeConfirm.title',
        'search.title',
        'toast.added',
        'toast.removed'
      ]) {
        expect(cat[`osp.approvedInputs.${k}`], k).not.toMatch(/approved|aprobad/i);
      }
    }
  });

  it('cleanout photo guidance is about the cleaning', () => {
    const parts = getPhotoGuidanceParts(1, 0) as any;
    const em = JSON.stringify(
      src('utils/verificationTierHelpers.ts').match(/ {2}EM: \{[\s\S]*?\n {2}\},/)?.[0]
    );
    expect(em).toMatch(/cleanout/);
    expect(em).toMatch(/cleaning product label/);
    expect(parts).toBeTruthy();
  });

  it('no "Versións", no "POS" in Spanish', () => {
    expect(src('views/Dashboard/OSP/OSPView.tsx')).not.toMatch(/'osp\.version' \}\)\}s`/);
    expect(es['osp.versionHistory']).toBe('Versiones');
    for (const [k, v] of Object.entries(es)) {
      expect(v, k).not.toMatch(/\bPOS\b/);
    }
    expect(Object.values(es).some((v) => /Plan de Sistema Orgánico/.test(v))).toBe(false);
  });
});
