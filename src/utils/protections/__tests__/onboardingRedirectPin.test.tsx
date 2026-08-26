/**
 * Regression guard — 2026-08-24 select-company lock-out.
 *
 * A producer whose account has no company yet is redirected to /select-company by
 * Authenticated's onboarding effect. That redirect used to re-fire on EVERY navigation,
 * because `navigate` sat in its dependency array: the app runs on a NON-data router
 * (<BrowserRouter> in src/index.tsx), so useNavigate resolves to react-router's
 * useNavigateUnstable, whose useCallback is keyed on the current pathname. New pathname =>
 * new `navigate` identity => effect re-runs => user shoved back to /select-company.
 *
 * Net effect: the Profile button in the navbar did nothing. Every other in-app route was
 * unreachable too. This test drives the real component through a real router and asserts the
 * user LANDS on the page, not merely that a redirect function was called.
 *
 * ⚠️ ANTI-VACUITY: these tests must FAIL if `navigate` is put back into the dep array of the
 * onboarding effect in Authenticated.jsx, or if the ACCOUNT_PATHS carve-out is removed. If you
 * change that effect, re-verify by reverting it and watching these go red.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useNavigate, useLocation } from 'react-router-dom';

import { PRODUCER } from 'config';

vi.mock('utils/subdomain', () => ({ getSubdomainType: () => 'producer' }));
vi.mock('utils/authRedirect', () => ({ getAuthRedirectAction: () => null }));

// Imported AFTER the mocks so the component picks them up.
import Authenticated from '../Authenticated';

const makeStore = (companies: unknown[], currentCompany: unknown) =>
  configureStore({
    reducer: {
      auth: (s = { isAuthenticated: true, isLoading: false }) => s,
      company: (s = { currentCompany }) => s,
      userState: (s = { user: { id: 1, user_type: PRODUCER, companies } }) => s
    }
  });

/** Renders the navbar's Profile button plus a probe that reports the live pathname. */
const Harness = ({ label }: { label: string }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div>
      <button onClick={() => navigate('/admin/dashboard/profile')}>Profile</button>
      <button onClick={() => navigate('/admin/dashboard/education')}>Education</button>
      <div data-testid="page">{label}</div>
      <div data-testid="pathname">{pathname}</div>
    </div>
  );
};

const renderApp = ({
  companies,
  currentCompany,
  start = '/admin/dashboard/select-company'
}: {
  companies: unknown[];
  currentCompany: unknown;
  start?: string;
}) =>
  render(
    <Provider store={makeStore(companies, currentCompany) as never}>
      <MemoryRouter initialEntries={[start]}>
        <Routes>
          <Route element={<Authenticated allowedRoles={[PRODUCER]} />}>
            <Route
              path="/admin/dashboard/select-company"
              element={<Harness label="select-company" />}
            />
            <Route path="/admin/dashboard/profile" element={<Harness label="profile" />} />
            <Route path="/admin/dashboard/education" element={<Harness label="education" />} />
            <Route path="/admin/dashboard/farm/add" element={<Harness label="farm-add" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  sessionStorage.clear();
});

describe('onboarding redirect does not pin the user to /select-company', () => {
  it('lets a company-less producer open their profile from /select-company', async () => {
    const user = userEvent.setup();
    renderApp({ companies: [], currentCompany: null });

    // Precondition: the effect has run at least once and left us where onboarding wants us.
    expect(await screen.findByText('select-company')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Profile' }));

    // The bug re-ran the effect here and bounced straight back. Assert the profile page is
    // still mounted after the router has settled, not just that it appeared for one frame.
    expect(await screen.findByText('profile')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('pathname')).toHaveTextContent('/admin/dashboard/profile')
    );
    expect(screen.queryByText('select-company')).not.toBeInTheDocument();
  });

  it('still pins a company-less producer away from company-scoped routes', async () => {
    renderApp({ companies: [], currentCompany: null, start: '/admin/dashboard/education' });

    // The carve-out is for account pages only — onboarding must still own everything else.
    expect(await screen.findByText('select-company')).toBeInTheDocument();
  });

  it('re-applies the pin when a company-less producer clicks into a gated route', async () => {
    // This is what keeps `pathname` in the effect's dep array load-bearing. Enforcing the pin
    // only on first mount would let a company-less user click straight into a company-scoped
    // page and render it against a company that does not exist.
    const user = userEvent.setup();
    renderApp({ companies: [], currentCompany: null });

    expect(await screen.findByText('select-company')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Education' }));

    await waitFor(() =>
      expect(screen.getByTestId('pathname')).toHaveTextContent('/admin/dashboard/select-company')
    );
    expect(screen.queryByText('education')).not.toBeInTheDocument();
  });

  it('lets a producer with a farm-less company open their profile', async () => {
    const user = userEvent.setup();
    renderApp({
      companies: [{ id: 7, name: 'Blue Oak' }],
      currentCompany: {
        id: 7,
        establishments: [],
        has_subscription: true,
        subscription_plan: { id: 3 }
      },
      start: '/admin/dashboard/farm/add'
    });

    expect(await screen.findByText('farm-add')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Profile' }));

    expect(await screen.findByText('profile')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('pathname')).toHaveTextContent('/admin/dashboard/profile')
    );
  });
});
