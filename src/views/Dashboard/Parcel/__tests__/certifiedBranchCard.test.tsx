/**
 * The certified-parcel card shows the backend's assessment, item by item (OSP alignment audit
 * T21-F1). The parcel PDF prints the same assessment; this file holds the card to it from the
 * frontend side, and reads the backend's state vocabulary so a new state cannot ship unworded.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import type { CertifiedBranch } from 'store/api/parcelApplicationApi';

const dispatch = vi.fn();
const upload = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 9 }) }));

vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));
vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: () => ({ data: [] }),
  useUploadFarmDocumentMutation: () => [upload, { isLoading: false }]
}));

import CertifiedBranchCard from '../CertifiedBranchCard';

const BACKEND = join(
  __dirname,
  '../../../../../../trazo-back/certifications/services/certified_parcel_branch.py'
);

const tuple = (src: string, name: string): string[] => {
  const m = src.match(new RegExp(`^${name} = \\(([\\s\\S]*?)\\)`, 'm'));
  if (!m) throw new Error(`${name} not found in ${BACKEND}`);
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
};

const ccofMissingContinuity: CertifiedBranch = {
  agent: 'ccof',
  branch: 'existing_site',
  route: 'ccof_g',
  land_history_asked: false,
  plan_version: 3,
  items: [
    {
      key: 'certification',
      state: 'reported',
      asked: true,
      alternative: false,
      path: '',
      reference: 'CCOF'
    },
    {
      key: 'certificate',
      state: 'attached',
      asked: true,
      alternative: false,
      path: 'parcels/certificates/7-cert.pdf',
      reference: ''
    },
    {
      key: 'continuity',
      state: 'missing',
      asked: true,
      alternative: false,
      path: '',
      reference: ''
    },
    {
      key: 'no_lapse_statement',
      state: 'stated_yes',
      asked: false,
      alternative: false,
      path: '',
      reference: ''
    },
    {
      key: 'declaration',
      state: 'not_asked',
      asked: false,
      alternative: false,
      path: '',
      reference: ''
    }
  ],
  review: [{ kind: 'prohibited_input', detail: '2026-05-01 · Synthetic X · chemical application' }],
  missing: ['continuity']
};

const renderCard = (branch: CertifiedBranch) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <CertifiedBranchCard branch={branch} companyId="1" farmId="2" parcelId="7" canWrite />
      </IntlProvider>
    </ChakraProvider>
  );

describe('certified-parcel card', () => {
  it('states each item as the assessment says, and never as verified or eligible', () => {
    renderCard(ccofMissingContinuity);
    expect(screen.queryByText(/skips to section G/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Certificate copy: attached, ships in the packet at parcels\/certificates\/7-cert\.pdf/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Verification of no lapse: none attached or referenced.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/That is your statement; it is not the verification above/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/not asked on this route/)).toBeInTheDocument();
    expect(screen.queryByText(/To review: 2026-05-01 · Synthetic X/)).toBeInTheDocument();
    const text = screen.getByTestId('certified-branch').textContent ?? '';
    expect(text).not.toMatch(/verified|eligible/i);
  });

  it('marks an item the route does not ask for as reference only', () => {
    renderCard({
      ...ccofMissingContinuity,
      route: 'wsda_existing_site',
      items: [{ key: 'certificate', state: 'missing', asked: false, path: '', reference: '' }],
      review: [],
      missing: []
    });
    expect(screen.queryByText(/Not asked on this route; shown for reference/)).toBeInTheDocument();
  });

  it('offers no upload for an item the route does not ask, and names the plan it was assessed for', () => {
    renderCard({
      ...ccofMissingContinuity,
      route: 'wsda_existing_site',
      items: [{ key: 'certificate', state: 'missing', asked: false, path: '', reference: '' }],
      review: [],
      missing: []
    });
    expect(screen.queryByRole('button', { name: /Upload the certificate copy/ })).toBeNull();
    expect(screen.queryByText(/plan v3/)).toBeInTheDocument();
  });

  it('refreshes the assessment after an upload so the item does not stay missing', async () => {
    dispatch.mockClear();
    const { container } = renderCard(ccofMissingContinuity);
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBe(2);
    fireEvent.change(inputs[1], { target: { files: [new File(['x'], 'letter.pdf')] } });
    await waitFor(() => expect(upload).toHaveBeenCalled());
    await waitFor(() =>
      expect(JSON.stringify(dispatch.mock.calls)).toContain('"type":"ParcelApplication","id":"7"')
    );
  });

  it('renders nothing for a parcel that is not stated currently certified', () => {
    const { container } = renderCard(null as unknown as CertifiedBranch);
    expect(container.querySelector('[data-testid="certified-branch"]')).toBeNull();
  });
});

describe('every backend state has words in both locales', () => {
  const src = readFileSync(BACKEND, 'utf8');
  const routes = tuple(src, 'ROUTES');
  const kinds = tuple(src, 'REVIEW_KINDS');
  const items = tuple(src, 'ITEMS');

  it('reads the backend vocabulary', () => {
    expect(routes.length).toBeGreaterThan(4);
    expect(items).toContain('continuity');
    expect(kinds).toContain('prohibited_input');
  });

  it.each([
    ['en-US', enUS],
    ['es-419', es419]
  ])('%s carries every route, item state the backend emits and review kind', (_name, messages) => {
    const m = messages as Record<string, string>;
    const emitted: Record<string, string[]> = {
      certification: ['reported'],
      certificate: ['attached', 'not_in_packet', 'referenced', 'missing'],
      continuity: ['attached', 'not_in_packet', 'referenced', 'missing'],
      prior_manager: ['attached', 'missing'],
      no_lapse_statement: ['stated_yes', 'stated_no', 'unanswered'],
      declaration: ['not_asked']
    };
    // The card words the declaration by route (run 3, R3-06), so those ids must exist too.
    const routeWorded = [
      'parcelApp.certifiedBranch.declaration.not_asked_route_asks',
      'parcelApp.certifiedBranch.declaration.not_asked_undetermined',
      'parcelApp.certifiedBranch.alternative'
    ];
    expect(Object.keys(emitted).sort()).toEqual([...items].sort());
    const ids = [
      ...routes.map((r) => `parcelApp.certifiedBranch.route.${r}`),
      ...kinds.map((k) => `parcelApp.certifiedBranch.review.${k}`),
      ...Object.entries(emitted).flatMap(([key, states]) =>
        states.map((s) => `parcelApp.certifiedBranch.${key}.${s}`)
      )
    ];
    expect([...ids, ...routeWorded].filter((id) => !m[id])).toEqual([]);
  });
});

describe('run 3: routes that are not decided claim nothing (R3-06)', () => {
  const base = (over: Partial<CertifiedBranch>): CertifiedBranch => ({
    ...ccofMissingContinuity,
    review: [],
    missing: [],
    ...over
  });

  it('an unresolved route says so, names the unrecognised certifier and decides no declaration', () => {
    renderCard(
      base({
        route: 'unresolved',
        land_history_asked: null,
        review: [{ kind: 'certifier_not_recognised', detail: 'Cascadia Organic Certifiers' }]
      })
    );
    expect(
      screen.queryByText(/cannot tell which of your certifier's routes applies/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Cascadia Organic Certifiers, is not one Trazo recognizes/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Whether your certifier asks it of this parcel is not decided/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/not asked on this route\./)).toBeNull();
  });

  it('a certifier not named reads as not named, not as an empty name', () => {
    renderCard(
      base({
        route: 'unresolved',
        land_history_asked: null,
        review: [{ kind: 'certifier_not_recognised', detail: '' }]
      })
    );
    expect(screen.queryByText(/no certifier is named for this parcel/)).toBeInTheDocument();
  });

  it('a fallback certifier gets no exemption', () => {
    renderCard(base({ agent: 'oci', route: 'agent_form', land_history_asked: null }));
    expect(screen.queryByText(/no exemption is decided for this parcel/)).toBeInTheDocument();
  });

  it('an alternative the form accepts is shown as one, with its upload, never as missing', () => {
    renderCard(
      base({
        agent: 'otco',
        route: 'otco_new_acreage',
        land_history_asked: true,
        items: [
          {
            key: 'certificate',
            state: 'missing',
            asked: false,
            alternative: true,
            path: '',
            reference: ''
          },
          {
            key: 'declaration',
            state: 'not_asked',
            asked: false,
            alternative: false,
            path: '',
            reference: ''
          }
        ]
      })
    );
    expect(
      screen.queryByText(/Accepted by the form in place of the land-history table/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/so the accounting shows what covers each period/)
    ).toBeInTheDocument();
    expect(screen.queryByText('Upload the certificate copy')).toBeInTheDocument();
  });
});
