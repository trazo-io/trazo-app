/**
 * Certifier handoff rehearsal, 2026-10-18.
 *
 * H-5: a revoked or expired link vanished from the card, and with it the grower's record of
 * whether the certifier had opened it. The backend kept the rows; the card listed `is_active`
 * links only. Past links are now listed, collapsed, with their activity.
 *
 * Step 1: before sharing, the card did not say what the dossier exposes. It now says so, to the
 * person who can create a link.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const access = (id: number) => ({
  id,
  action: 'dossier',
  action_display: 'Downloaded dossier',
  accessed_at: '2026-10-18T14:32:05Z'
});

const link = (overrides: Record<string, unknown>) => ({
  id: 1,
  token: 'tok',
  label: 'Active link',
  audience: 'certifier',
  certification_type: 'organic',
  period_start: '2026-01-01',
  period_end: '2026-12-31',
  expires_at: '2027-01-16T00:00:00Z',
  revoked_at: null,
  is_active: true,
  is_expired: false,
  is_revoked: false,
  access_count: 0,
  last_accessed_at: null,
  accesses: [],
  ...overrides
});

let links: any[] = [];
let canMint = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createLink = vi.fn((_args: { data: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
const createdWith = () => createLink.mock.calls[0]?.[0]?.data ?? {};

vi.mock('store/api/certifierLinkApi', () => ({
  useGetCertifierLinksQuery: () => ({
    data: links,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn()
  }),
  useCreateCertifierLinkMutation: () => [createLink, { isLoading: false }],
  useRevokeCertifierLinkMutation: () => [vi.fn()],
  useGetOperationReadinessQuery: () => ({ data: { ready: true } })
}));

vi.mock('components/Guards/ComplianceExportsGuard', () => ({
  useComplianceExports: () => canMint,
  ComplianceExportsUpsell: () => null
}));

vi.mock('../OperationReadinessPanel', () => ({ default: () => null }));

const { default: CertifierLinkCard } = await import('../CertifierLinkCard');

const renderCard = (canWrite = true, messages: Record<string, string> = enUS, locale = 'en') =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <CertifierLinkCard companyId="17" farmId="20" canWrite={canWrite} />
      </IntlProvider>
    </ChakraProvider>
  );

beforeEach(() => {
  canMint = true;
  createLink.mockClear();
  links = [
    link({ id: 1 }),
    link({
      id: 2,
      label: 'Rehearsal 2026-10b',
      is_active: false,
      is_revoked: true,
      revoked_at: '2026-10-18T14:34:00Z',
      access_count: 3,
      accesses: [access(11), access(12), access(13)]
    }),
    link({
      id: 3,
      label: 'Old expired link',
      is_active: false,
      is_expired: true,
      expires_at: '2026-03-01T00:00:00Z'
    }),
    link({ id: 4, label: 'Buyer link', audience: 'buyer', is_active: false, is_revoked: true })
  ];
});

describe('certifier link card: past links (H-5)', () => {
  it('keeps revoked and expired certifier links, collapsed, never buyer links', () => {
    renderCard();
    const past = screen.getByTestId('certifier-past-links');
    expect(past.textContent).toContain('Past links (2)');
    expect(screen.queryAllByTestId('certifier-past-link')).toHaveLength(0);

    fireEvent.click(within(past).getByText('Past links (2)'));
    const rows = screen.getAllByTestId('certifier-past-link');
    expect(rows).toHaveLength(2);
    // Newest ending first: revoked Oct 18 before expired Mar 1.
    expect(rows[0].textContent).toContain('Rehearsal 2026-10b');
    expect(rows[0].textContent).toMatch(/Revoked/);
    expect(rows[1].textContent).toContain('Old expired link');
    expect(rows[1].textContent).toMatch(/Expired/);
    expect(past.textContent).not.toContain('Buyer link');
  });

  it('a revoked link still shows what the certifier did', () => {
    renderCard();
    fireEvent.click(screen.getByText('Past links (2)'));
    const revoked = screen.getAllByTestId('certifier-past-link')[0];
    fireEvent.click(within(revoked).getByText('Show activity (3 opens)'));
    expect(within(revoked).getAllByText('Downloaded dossier')).toHaveLength(3);
  });

  it('a past link offers no copy and no revoke', () => {
    renderCard();
    fireEvent.click(screen.getByText('Past links (2)'));
    const revoked = screen.getAllByTestId('certifier-past-link')[0];
    expect(within(revoked).queryByText('Revoke')).toBeNull();
    expect(within(revoked).queryByLabelText('Copy link')).toBeNull();
  });

  it('a viewer sees past links too: listing is not a write', () => {
    renderCard(false);
    expect(screen.getByTestId('certifier-past-links')).toBeTruthy();
  });

  it('no section when nothing has ended', () => {
    links = [link({ id: 1 })];
    renderCard();
    expect(screen.queryByTestId('certifier-past-links')).toBeNull();
  });
});

describe("certifier link card: activity in the grower's language", () => {
  it("names each access in Spanish, not with the server's English label", () => {
    renderCard(true, es419 as Record<string, string>, 'es-419');
    fireEvent.click(screen.getByText('Enlaces anteriores (2)'));
    const revoked = screen.getAllByTestId('certifier-past-link')[0];
    fireEvent.click(within(revoked).getByText(/Ver actividad/));
    expect(within(revoked).getAllByText('Descargó el expediente')).toHaveLength(3);
    expect(within(revoked).queryByText('Downloaded dossier')).toBeNull();
  });

  it('falls back to the server label for an action it does not know', () => {
    links = [
      link({
        id: 5,
        is_active: false,
        is_revoked: true,
        revoked_at: '2026-10-18T14:34:00Z',
        accesses: [{ ...access(21), action: 'future_action', action_display: 'Did something new' }]
      })
    ];
    renderCard();
    fireEvent.click(screen.getByText('Past links (1)'));
    fireEvent.click(screen.getByText('Show activity (1 open)'));
    expect(screen.getByText('Did something new')).toBeTruthy();
  });
});

describe('certifier link card: what the certifier will see (step 1)', () => {
  it('names each thing the dossier exposes before a link is created', () => {
    renderCard();
    const text = screen.getByTestId('certifier-link-disclosure').textContent || '';
    for (const phrase of [
      'What your certifier will see',
      'seasons you have not published on your buyer page',
      'your private notes',
      'supplier names, invoice numbers and sale amounts',
      'the names of the people recorded doing the work',
      'the email address of each account that changed a record',
      'for each correction the earlier value and the reason',
      'The files themselves are shared only if you tick “Include source files” below'
    ]) {
      expect(text).toContain(phrase);
    }
  });

  it('is shown to the person who can create a link, not to a viewer or on Starter', () => {
    renderCard(false);
    expect(screen.queryByTestId('certifier-link-disclosure')).toBeNull();
  });

  it('is not shown where creating a link is not offered', () => {
    canMint = false;
    renderCard();
    expect(screen.queryByTestId('certifier-link-disclosure')).toBeNull();
  });

  it('reads in Spanish from the catalogue, every key present in both locales', () => {
    renderCard(true, es419 as Record<string, string>, 'es-419');
    const text = screen.getByTestId('certifier-link-disclosure').textContent || '';
    expect(text).toContain('Lo que verá tu certificadora');
    expect(text).toContain('tus notas privadas');
    const en = enUS as Record<string, string>;
    const es = es419 as Record<string, string>;
    for (const key of Object.keys(en).filter(
      (k) =>
        k.startsWith('certifierLink.disclosure.') ||
        k.startsWith('certifierLink.past.') ||
        k.startsWith('certifierLink.activity.')
    )) {
      expect(es[key], key).toBeTruthy();
    }
  });
});

describe('certifier link card: source files opt-in (H-3)', () => {
  it('is off by default, and creating sends it off', async () => {
    renderCard();
    const box = screen.getByTestId('certifier-link-include-files').querySelector('input')!;
    expect(box.checked).toBe(false);
    fireEvent.click(screen.getByText('Create link'));
    expect(createLink).toHaveBeenCalledTimes(1);
    expect(createdWith().include_source_files).toBe(false);
  });

  it('ticked, the new link is created with source files', () => {
    renderCard();
    fireEvent.click(screen.getByText('Include source files'));
    fireEvent.click(screen.getByText('Create link'));
    expect(createdWith().include_source_files).toBe(true);
  });

  it('a link that shares files says so on its row', () => {
    links = [link({ id: 1, include_source_files: true })];
    renderCard();
    expect(screen.getByText('Source files included')).toBeTruthy();
  });

  it('the activity log names the file that was opened', () => {
    links = [
      link({
        id: 1,
        include_source_files: true,
        accesses: [
          {
            ...access(31),
            action: 'document',
            action_display: 'Opened a source file',
            document_title: 'ASTRA TEST invoice ASTRA-INV-2605-01'
          }
        ]
      })
    ];
    renderCard();
    fireEvent.click(screen.getByText('Show activity (1 open)'));
    expect(
      screen.getByText('Opened source file: ASTRA TEST invoice ASTRA-INV-2605-01')
    ).toBeTruthy();
  });

  it('is not offered where creating a link is not', () => {
    renderCard(false);
    expect(screen.queryByTestId('certifier-link-include-files')).toBeNull();
  });
});
