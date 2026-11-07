/**
 * 🔴 F29 + F30 — the Finish page must READ the season it CLOSES.
 *
 * `handleSubmit` has always posted `history: productionId` from the URL. Everything the page
 * *showed* came from `useGetCurrentHistoryQuery({ farmId, parcelId })` — the PARCEL's current
 * season, meaning whichever one started last. Crop name, parcel name, harvest date, the
 * consumer preview, and, worst, the **harvest pre-fill**.
 *
 * When the two disagreed, Trazo offered season B's harvest total as the lot header of season A,
 * beside season B's crop name, and closed season A with it. That is the traceability spine
 * § 205.103(b)(2) asks to be auditable, filled from a different lot.
 *
 * It was latent only because F29 left ONE link into this page — a parcel-level button passing
 * `currentHistory.id` — so the two agreed by accident. Putting Finish on the production page,
 * which is the F29 fix, is precisely what would have made it live. Hence one test for both.
 *
 * The form is mocked so this asserts the PROPS the page hands it: that is where a wrong season
 * becomes a wrong lot header, and it is the layer a source-scan cannot see.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

/** Season A — the one in the URL, the one being closed. Two picks, 118,750 lb. */
const SEASON_BEING_CLOSED = {
  id: 686,
  public_id: 'uuid-season-a',
  product: 'Blueberries',
  parcel: 'Home Field East',
  finish_date: null,
  events: [
    {
      type: 'event.production.harvesting',
      date: '2025-06-24',
      yield_quantity: '83150.00',
      yield_unit: 'lbs'
    },
    {
      type: 'event.production.harvesting',
      date: '2025-07-02',
      yield_quantity: '35600.00',
      yield_unit: 'lbs'
    }
  ]
};

/** Season B — a LATER cycle on the same parcel. Different crop, different, smaller yield. */
const OTHER_OPEN_SEASON = {
  id: 698,
  public_id: 'uuid-season-b',
  product: 'Carrots',
  parcel: 'Home Field East',
  finish_date: null,
  events: [
    {
      type: 'event.production.harvesting',
      date: '2026-09-30',
      yield_quantity: '2150.00',
      yield_unit: 'lbs'
    }
  ]
};

const byIdCalls: unknown[] = [];
const currentHistoryCalls: unknown[] = [];
const finishMock = vi.fn(() => ({ unwrap: () => Promise.resolve({ published: true }) }));
let formProps: Record<string, any> = {};

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  // The route is /farm/:farmId/parcel/:parcelId/production/:productionId/finish
  useParams: () => ({ farmId: '166', parcelId: '297', productionId: '686' })
}));

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({ company: { currentCompany: { id: 130, name: 'Brandt Family Farms LLC' } } })
}));

vi.mock('store/api/historyApi.js', () => ({
  useFinishCurrentHistoryMutation: () => [finishMock, { isLoading: false }],
  useGetHistoryQuery: (historyId: unknown) => {
    byIdCalls.push(historyId);
    return { data: SEASON_BEING_CLOSED };
  },
  // Still exported so an accidental re-introduction resolves and is CAUGHT by the assertion
  // below rather than blowing up with a mock error that reads like a test-harness problem.
  useGetCurrentHistoryQuery: (arg: unknown) => {
    currentHistoryCalls.push(arg);
    return { data: OTHER_OPEN_SEASON };
  }
}));

vi.mock('store/api/transparencyQrApi', () => ({
  useGetTransparencyDetailsQuery: () => ({ data: undefined })
}));

vi.mock('components/Guards/WriteAccessGuard', () => ({
  WriteAccessGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@chakra-ui/react', () => ({ useToast: () => vi.fn() }));

vi.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id })
}));

vi.mock('../../../../../components/Forms', () => ({
  StandardFinishProductionForm: (props: Record<string, any>) => {
    formProps = props;
    return <div data-testid="finish-form" />;
  }
}));

// Imported AFTER the mocks above, deliberately: vi.mock is hoisted but the component captures
// its hooks at module evaluation, so a top-of-file import would bind the real ones.
import FinishProduction from '../FinishProduction';

describe('FinishProduction reads the season it closes', () => {
  beforeEach(() => {
    byIdCalls.length = 0;
    currentHistoryCalls.length = 0;
    finishMock.mockClear();
    formProps = {};
    render(<FinishProduction />);
  });

  it('fetches by the productionId in the URL', () => {
    // De-duplicated rather than compared as a list: React may render more than once and the
    // count is not the property under test. What matters is that it never asked for anything
    // other than the season named in the route.
    expect(byIdCalls.length).toBeGreaterThan(0);
    expect([...new Set(byIdCalls)]).toEqual(['686']);
  });

  it('never asks for the parcel-level current season', () => {
    // The F30 defect in one assertion. `current_history/` answers "whichever season on this
    // parcel started last", which is not a question this page should be asking.
    expect(currentHistoryCalls).toEqual([]);
  });

  it('pre-fills the lot header from THIS season, not the other open one', () => {
    // 83,150 + 35,600 = 118,750. Season B's single 2,150 lb pick must not appear — that is
    // the shape of the F6 buffer-row defect, one level up: a real number from the wrong lot.
    // A STRING: the finish form is string-based (its zod schema takes `string | number`), and
    // `computeHarvestPrefill` hands it what the inputs hold rather than what looks tidier here.
    expect(String(formProps.initialData?.production_amount)).toBe('118750');
    expect(String(formProps.initialData?.production_amount)).not.toContain('2150');
    expect(formProps.initialData?.production_unit).toBe('lb');
  });

  it("names THIS season's crop and parcel", () => {
    expect(formProps.productName).toBe('Blueberries');
    expect(formProps.productName).not.toBe('Carrots');
    expect(formProps.parcelName).toBe('Home Field East');
  });

  it('POSTS the same season it displayed', async () => {
    // ⚠️ This one does NOT fail against the pre-fix code, and that is worth stating: the POST
    // side was always correct — `handleSubmit` has named `history: productionId` all along.
    // F30 was that everything DISPLAYED came from somewhere else. This guards the other
    // direction: that a future change cannot drop the key back to a conditional and let the
    // server infer the season. The four assertions above are the ones that fail on pre-fix
    // code; these last two are regression fencing.
    await formProps.onSubmit({ production_amount: 118750, images: [] });

    expect(finishMock).toHaveBeenCalledTimes(1);
    const payload = finishMock.mock.calls[0][0] as any;
    expect(payload.historyData.history).toBe('686');
    expect(payload.parcelId).toBe('297');
  });

  it('refuses to submit when the route names no season', async () => {
    // Belt to the server's braces. `product/views.py` falls back to the parcel's own season
    // only when exactly one is open — safe — but a request whose meaning depends on how many
    // seasons happen to be open is not one this page should send.
    formProps = {};
    finishMock.mockClear();

    const routerMock = await import('react-router-dom');
    const spy = vi.spyOn(routerMock, 'useParams').mockReturnValue({
      farmId: '166',
      parcelId: '297',
      productionId: undefined
    } as any);

    render(<FinishProduction />);
    await formProps.onSubmit({ production_amount: 1, images: [] });
    expect(finishMock).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('F29 — the season page can finish ITSELF', () => {
  /**
   * The only finish affordance in the app was a PARCEL-level button
   * (`Parcel/components/TrackList.jsx:491`) navigating with `currentHistory?.id` — whichever
   * season on that parcel started last. `ProfileProduction`, the season's own page, had no
   * finish control at all, so on a perennial block carrying two cycles the older season could
   * not be closed through the UI. The farmer's only route was to type the URL.
   *
   * A source assertion, deliberately: `ProfileProduction` is a ~1,500-line component with a
   * dozen queries, and standing it up to click one button would test the mocks. What has to
   * hold is narrow and textual — the link exists, and it carries THIS production's id rather
   * than a parcel-derived one.
   */
  const source = readFileSync(resolve(__dirname, '..', 'ProfileProduction.tsx'), 'utf8');

  it('links to finish', () => {
    expect(source).toContain('/finish`');
  });

  it('passes the production being viewed, never a parcel-derived season', () => {
    const finishNav = source.split('\n').find((line) => line.includes('/finish`'));
    expect(finishNav, 'no finish navigation found').toBeTruthy();
    expect(finishNav).toContain('${productionId}');
    // `currentHistory` is the parcel-level query. If it ever appears in this navigation the
    // page has started closing a season other than the one it is showing.
    expect(finishNav).not.toContain('currentHistory');
  });

  it('offers it only while the season is open, and only to writers', () => {
    const idx = source.indexOf('/finish`');
    const preceding = source.slice(Math.max(0, idx - 700), idx);
    expect(preceding).toContain('canWrite');
    expect(preceding).toContain('!isFinished');
    // ...and `isFinished` is the season's own finish date, not some other flag.
    expect(source).toMatch(/const isFinished = Boolean\(historyData\?\.finish_date\)/);
  });
});
