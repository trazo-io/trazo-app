/**
 * A pilot account gets its own setup checklist; a self-serve account keeps the one it had.
 *
 * Run 8b, finding 8b-02 (Astra, 2026-10-12): the checklist was one self-serve list with no plan
 * awareness (add parcel, start a production, log an event, finish, share the QR code, file the
 * OSP, upload the OFPP). A pilot's records are entered by Oscar from what the grower sends, so
 * the self-serve season walk-through is not their setup, and nothing told them how setup works.
 *
 * Pinned here:
 * - pilot (`plan.slug === 'pilot'` or `features.is_pilot`): exactly four required items, each
 *   labelled by what its completion rule proves; season-closing and the QR code only under
 *   "Optional", never counted; a "How setup works" block that is not a step;
 * - a pilot with records and an OSP but no grower review recorded is never told anything was
 *   reviewed, and the completion line is exactly "These setup steps are complete";
 * - Starter: the seven-item list as before, plus one setup-help line.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { useTourStore } from '../../../store/tourStore';

type Subscription = Record<string, unknown> | null;

const PILOT: Subscription = {
  status: 'active',
  plan: { slug: 'pilot', features: { compliance_exports: true, is_pilot: true } }
};
const PILOT_BY_FEATURE: Subscription = {
  status: 'active',
  plan: { slug: 'pilot-2027', features: { compliance_exports: true, is_pilot: true } }
};
const STARTER: Subscription = {
  status: 'active',
  plan: { slug: 'starter', features: { compliance_exports: false } }
};

let subscription: Subscription = PILOT;
let establishments: any[] = [];
let productions: any[] | undefined = [];
let osps: any[] | undefined = [];
let currentUser: Record<string, unknown> | null = { first_name: 'Jane', last_name: 'Grower' };
let pathname = '/admin/dashboard/farm/148';

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({
      company: { currentCompany: { id: 7, establishments, subscription } },
      userState: { user: currentUser }
    })
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ farmId: '148' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname })
}));

vi.mock('../../../hooks/useUserRole', () => ({
  useUserRole: () => ({ canWrite: true })
}));

vi.mock('../../../store/api/companyApi', () => ({
  useGetProductionsByFarmQuery: () => ({ data: productions, isLoading: false })
}));

vi.mock('../../../store/api/ospApi', () => ({
  useGetOSPsQuery: () => ({ data: osps })
}));

const { default: OnboardingChecklist } = await import('../OnboardingChecklist');

function renderChecklist(locale = 'en-US', messages: Record<string, string> = enUS) {
  return render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <OnboardingChecklist />
      </IntlProvider>
    </ChakraProvider>
  );
}

const itemIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-testid^="checklist-item-"]')).map((el) =>
    el.getAttribute('data-testid')!.replace('checklist-item-', '')
  );

const EMPTY_FARM = { id: 148, parcels: [] };
// Records and an OSP on file, entered during assisted setup. Nothing records a grower review.
const SET_UP_FARM = { id: 148, parcels: [{ id: 249 }], ofpp_on_file: true };
const SET_UP_PRODUCTIONS = [{ events_count: 14, finish_date: null, published: false }];
const SET_UP_OSPS = [{ status: 'draft', section_completion: 1 }];

beforeEach(() => {
  subscription = PILOT;
  establishments = [EMPTY_FARM];
  productions = [];
  osps = [];
  currentUser = { first_name: 'Jane', last_name: 'Grower' };
  pathname = '/admin/dashboard/farm/148';
  useTourStore.setState({ checklistDismissed: false, checklistCompleted: false, visitedPages: {} });
});

describe('pilot checklist', () => {
  // Pilot rehearsal 2026-10-17: the panel sat over "Save Annual Update" on the OSP narratives
  // page until the grower dismissed it.
  // The farm profile holds the certifier link card ("Create link", covered at 1280 px).
  it('stays off the OSP pages and the farm profile', () => {
    renderChecklist();
    expect(screen.queryByTestId('checklist-required')).not.toBeNull();
    for (const osp of ['/osp', '/osp/narratives', '/osp/module/g2', '/profile']) {
      pathname = `/admin/dashboard/farm/148${osp}`;
      const { container, unmount } = renderChecklist();
      expect(container.textContent).toBe('');
      unmount();
    }
  });

  it('requires exactly the four data-backed items, labelled by what they prove', () => {
    renderChecklist();
    const required = screen.getByTestId('checklist-required');
    expect(itemIds(required)).toEqual(['add-parcel', 'document-event', 'file-osp', 'upload-ofpp']);
    const text = required.textContent || '';
    expect(text).toContain('A parcel is on file in Trazo');
    expect(text).toContain('Season records are on file in Trazo');
    expect(text).toContain(
      'The Organic System Plan in Trazo has text in all six § 205.201(a) sections, or has been submitted'
    );
    expect(text).toContain('A fraud prevention plan is on file in Trazo');
    expect(screen.getByTestId('checklist-progress').textContent).toBe('0 of 4 complete');
  });

  it('puts season-closing and the QR code under Optional only', () => {
    renderChecklist();
    expect(itemIds(screen.getByTestId('checklist-optional'))).toEqual([
      'start-production',
      'finish-production',
      'share-qr'
    ]);
    expect(itemIds(screen.getByTestId('checklist-required'))).not.toContain('share-qr');
    expect(itemIds(screen.getByTestId('checklist-required'))).not.toContain('finish-production');
  });

  it('shows "How setup works" as information: no check circle, not counted', () => {
    renderChecklist();
    const info = screen.getByTestId('pilot-setup-info');
    expect(info.textContent).toContain('How setup works');
    expect(info.textContent).toContain('Send your existing records to Oscar:');
    expect(info.textContent).toContain('Oscar enters them in Trazo under his own login.');
    expect(info.textContent).toContain('You check them before anything is filed.');
    expect(within(info).getByTestId('pilot-setup-mailto').getAttribute('href')).toBe(
      'mailto:oscar@trazo.io'
    );
    expect(itemIds(info)).toEqual([]);
    expect(info.querySelector('[data-completed]')).toBeNull();
    // Four counted items, whatever the info block holds.
    expect(screen.getByTestId('checklist-progress').textContent).toBe('0 of 4 complete');
  });

  it('records and an OSP on file, no review recorded: says the steps are complete, never reviewed', () => {
    establishments = [SET_UP_FARM];
    productions = SET_UP_PRODUCTIONS;
    osps = SET_UP_OSPS;
    const { container } = renderChecklist();
    const text = container.textContent || '';
    expect(screen.getByTestId('checklist-progress').textContent).toBe(
      'These setup steps are complete'
    );
    expect(text).not.toMatch(/review|all set|ready to file|ready for/i);
  });

  it('does not count the optional items toward completion', () => {
    establishments = [SET_UP_FARM];
    productions = SET_UP_PRODUCTIONS; // not finished, not published
    osps = SET_UP_OSPS;
    renderChecklist();
    expect(screen.getByTestId('checklist-progress').textContent).toBe(
      'These setup steps are complete'
    );
    expect(useTourStore.getState().checklistCompleted).toBe(true);
  });

  it('keeps the completion line after a reload, when the data requests are skipped', () => {
    useTourStore.setState({ checklistCompleted: true });
    renderChecklist();
    expect(screen.getByTestId('checklist-progress').textContent).toBe(
      'These setup steps are complete'
    );
    expect(screen.queryByTestId('checklist-required')).toBeNull();
  });

  it('partial setup is never reported as complete', () => {
    establishments = [SET_UP_FARM];
    productions = SET_UP_PRODUCTIONS;
    osps = [{ status: 'draft', section_completion: 0.5 }];
    renderChecklist();
    expect(screen.getByTestId('checklist-progress').textContent).toBe('3 of 4 complete');
    expect(useTourStore.getState().checklistCompleted).toBe(false);
  });

  it('a waiting pilot row says what it waits on, not "Complete <condition> first"', () => {
    renderChecklist();
    const title = screen.getByTestId('checklist-item-document-event').getAttribute('title');
    expect(title).toBe('Waiting on: A parcel is on file in Trazo');
  });

  it('a completed pilot panel has a static header: no chevron, nothing to expand', () => {
    useTourStore.setState({ checklistCompleted: true });
    renderChecklist();
    const header = screen.getByTestId('checklist-header');
    // Only the dismiss button's icon remains.
    expect(header.querySelectorAll('svg').length).toBe(1);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeNull();
  });

  it('detects a pilot from features.is_pilot too (same rule as the dashboard)', () => {
    subscription = PILOT_BY_FEATURE;
    renderChecklist();
    expect(screen.queryByTestId('pilot-setup-info')).not.toBeNull();
  });

  it('says it in Spanish', () => {
    establishments = [SET_UP_FARM];
    productions = SET_UP_PRODUCTIONS;
    osps = SET_UP_OSPS;
    renderChecklist('es-419', es419 as Record<string, string>);
    expect(screen.getByTestId('checklist-progress').textContent).toBe(
      'Estos pasos de configuración están completos'
    );
  });
});

describe('Starter checklist', () => {
  beforeEach(() => {
    subscription = STARTER;
  });

  it('keeps the seven self-serve items and adds one setup-help line', () => {
    renderChecklist();
    expect(itemIds(screen.getByTestId('checklist-required'))).toEqual([
      'add-parcel',
      'start-production',
      'document-event',
      'finish-production',
      'share-qr',
      'file-osp',
      'upload-ofpp'
    ]);
    expect(screen.getByTestId('checklist-progress').textContent).toBe('0 of 7 complete');
    const help = screen.queryByTestId('checklist-setup-help');
    expect(help, 'Starter shows the setup-help line').not.toBeNull();
    expect(help!.textContent).toBe("Have last season's records somewhere else? Get setup help");
    expect(help!.querySelector('a')?.getAttribute('href')).toBe('mailto:oscar@trazo.io');
  });

  it('has no pilot rows', () => {
    renderChecklist();
    expect(screen.queryByTestId('pilot-setup-info')).toBeNull();
    expect(screen.queryByTestId('checklist-optional')).toBeNull();
    expect(screen.queryByText('A parcel is on file in Trazo')).toBeNull();
  });

  it('still hides on completion, as before', () => {
    establishments = [{ ...SET_UP_FARM }];
    productions = [{ events_count: 3, finish_date: '2026-09-30', published: true }];
    osps = [{ status: 'submitted' }];
    const { container } = renderChecklist();
    expect(container.textContent).toBe('');
  });
});

/**
 * Pilot rehearsal 2026-10-17, finding 7: the operator account that enters the grower's records
 * ("<first> <last> (Trazo setup)", created by provision_pilot / add_pilot_operator) was shown the
 * grower's instruction "Send your existing records to Oscar". The operator gets the operator's
 * side of setup; the grower keeps the grower's text.
 */
describe('pilot checklist for the setup operator', () => {
  const OPERATOR = { first_name: 'Oscar', last_name: 'Munoz (Trazo setup)' };

  it('shows the operator text, never the grower instruction to send records to Oscar', () => {
    currentUser = OPERATOR;
    const { container } = renderChecklist();
    const info = screen.queryByTestId('pilot-operator-info');
    expect(info, 'the operator gets its own setup block').not.toBeNull();
    expect(info!.textContent).toContain('You are setting up this farm for the grower');
    expect(info!.textContent).toContain('Records you enter show your name.');
    // The heading carries the sentence once; the first bullet used to repeat it word for word.
    expect(info!.textContent!.split('You are setting up this farm').length - 1).toBe(1);
    expect(screen.queryByTestId('pilot-setup-info')).toBeNull();
    expect(container.textContent).not.toContain('Send your existing records to Oscar');
    expect(container.textContent).not.toContain('under his own login');
    // Same four counted items: only the information block changes.
    expect(screen.getByTestId('checklist-progress').textContent).toBe('0 of 4 complete');
  });

  it('keeps the grower text for the grower', () => {
    renderChecklist();
    expect(screen.queryByTestId('pilot-operator-info')).toBeNull();
    expect(screen.getByTestId('pilot-setup-info').textContent).toContain(
      'Send your existing records to Oscar:'
    );
  });

  it('says it in Spanish', () => {
    currentUser = OPERATOR;
    const { container } = renderChecklist('es-419', es419 as Record<string, string>);
    expect(container.textContent).toContain('Estás configurando esta finca para el productor');
    expect(container.textContent).not.toContain('Envía tus registros existentes a Oscar');
  });

  it('a Starter account with the suffix gets no pilot block at all', () => {
    subscription = STARTER;
    currentUser = OPERATOR;
    renderChecklist();
    expect(screen.queryByTestId('pilot-operator-info')).toBeNull();
    expect(screen.queryByTestId('pilot-setup-info')).toBeNull();
  });

  it('matches the suffix the backend writes (subscriptions/pilot_operator.py SETUP_SUFFIX)', async () => {
    const { PILOT_OPERATOR_LAST_NAME_SUFFIX } = await import(
      '../../../hooks/useOnboardingChecklist'
    );
    const source = readFileSync(
      resolve(__dirname, '../../../../../trazo-back/subscriptions/pilot_operator.py'),
      'utf8'
    );
    const match = source.match(/^SETUP_SUFFIX = "([^"]+)"$/m);
    expect(match, 'SETUP_SUFFIX is defined in pilot_operator.py').not.toBeNull();
    expect(PILOT_OPERATOR_LAST_NAME_SUFFIX).toBe(match![1]);
  });
});
