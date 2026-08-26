import { Navigate, Outlet, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { PRODUCER, SUPERUSER, CONSUMER, ROLE_DISPLAY_COMPANY_ADMIN } from '../../config';
import React, { useEffect, useState } from 'react';

import { LOGIN_PAGE_URL } from 'config/routes';
import { useSelector } from 'react-redux';
import { getAuthRedirectAction } from '../authRedirect';
import { validateRedirectUrl, createSafeRedirectUrl } from '../urlValidator';
import { getSubdomainType } from '../subdomain';

const isDev = import.meta.env.DEV;

// Routes that belong to the USER, not to a company: reachable before the first company exists
// and while a company carries no subscription. Gating these behind onboarding locked a
// company-less producer out of their own profile with no way back in.
const ACCOUNT_PATHS = ['/admin/dashboard/profile', '/admin/dashboard/settings/change-password'];

const Authenticated = ({ allowedRoles, mustBeCompanyAdmin = false }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);
  const currentCompany = useSelector((state) => state.company.currentCompany);
  const [subdomain, setSubDomain] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.userState.user);

  const { farmId } = useParams();

  useEffect(() => {
    // Use centralized subdomain detection utility
    setSubDomain(getSubdomainType());
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser && subdomain) {
      // Skip ALL redirect logic if RedirectGuard might be handling it
      // This is a critical fix to prevent interference with auth redirects
      const pendingAction = getAuthRedirectAction();
      const hasJustAuthenticated = sessionStorage.getItem('just_authenticated') === 'true';

      if (pendingAction || hasJustAuthenticated) {
        // Clear the flag after a delay
        if (hasJustAuthenticated) {
          setTimeout(() => {
            sessionStorage.removeItem('just_authenticated');
          }, 2000);
        }
        return;
      }

      // Also check if we're on a consumer subdomain and the user just logged in with a review redirect
      // This prevents interference with executeAuthRedirectAction from ConsumerSignIn
      if (
        subdomain === 'consumer' &&
        window.location.pathname.includes('/admin/dashboard/production/')
      ) {
        return;
      }

      // For routing purposes, treat anyone on consumer subdomain as a consumer
      // This allows producer accounts to access consumer features
      const isConsumerUser = currentUser.user_type === CONSUMER || subdomain === 'consumer';
      const params = new URLSearchParams(window.location.search);

      // SECURITY: Validate next parameter to prevent open redirect attacks
      const defaultPath = isConsumerUser ? '/admin/dashboard/impact' : '/admin/dashboard/scans';
      const nextParam = params.get('next');
      const intendedPath = validateRedirectUrl(nextParam) || defaultPath;

      if (isConsumerUser && subdomain === 'producer') {
        // SECURITY: Build safe redirect URL with domain validation
        const baseUrl = `${window.location.protocol}//consumer.${
          import.meta.env.VITE_APP_BASE_DOMAIN
        }${window.location.port ? ':' + window.location.port : ''}`;
        const safeRedirectUrl = baseUrl + intendedPath;

        // Final validation before redirect
        if (validateRedirectUrl(safeRedirectUrl)) {
          window.location.replace(safeRedirectUrl);
        } else {
          // Fallback to default consumer dashboard if validation fails
          window.location.replace(baseUrl + '/consumer/dashboard');
        }
      }
    }
  }, [isAuthenticated, currentUser, subdomain]);

  useEffect(() => {
    if (
      (currentUser?.user_type === PRODUCER || currentUser?.user_type === SUPERUSER) &&
      subdomain === 'producer'
    ) {
      const id = Number(farmId);

      if (
        (farmId || pathname == '/admin/dashboard' || pathname == '/admin/dashboard/') &&
        currentUser?.companies.length > 0
      ) {
        if (
          currentCompany &&
          currentCompany.establishments &&
          !currentCompany.establishments.map((e) => e.id).includes(id)
        ) {
          // Check if we're navigating from farm creation (prevent redirect race condition)
          const isFromFarmCreation = sessionStorage.getItem('creating_farm') === 'true';
          const justCreatedId = sessionStorage.getItem('just_created_farm_id');

          // If we just created this farm, wait for cache to update instead of redirecting
          if (isFromFarmCreation && justCreatedId == id) {
            // Clear the flag after a delay to prevent infinite waiting
            setTimeout(() => {
              sessionStorage.removeItem('creating_farm');
              sessionStorage.removeItem('just_created_farm_id');
            }, 3000);
            return;
          }

          if (currentCompany.establishments?.length > 0) {
            const establishment = currentCompany.establishments[0].id;
            navigate(`/admin/dashboard/farm/${establishment}`);
          } else {
            navigate(`/admin/dashboard/`);
          }
        }
      }

      // Auto-select first farm when visiting root dashboard without farmId
      if (
        (pathname === '/admin/dashboard' || pathname === '/admin/dashboard/') &&
        !farmId &&
        currentCompany?.establishments?.length > 0
      ) {
        const firstEstablishment = currentCompany.establishments[0].id;
        navigate(`/admin/dashboard/farm/${firstEstablishment}`);
      }
    }
  }, [currentCompany, farmId, navigate, currentUser, subdomain, pathname]);

  useEffect(() => {
    if (
      !(currentUser?.user_type === PRODUCER || currentUser?.user_type === SUPERUSER) ||
      subdomain !== 'producer'
    ) {
      return;
    }

    // ACCOUNT_PATHS are reachable with no company and with no subscription: a user who
    // cannot yet own a farm still owns their own account.
    if (ACCOUNT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }

    // This effect re-runs on every navigation, and that is intentional — the pin has to hold
    // when the user clicks into a company-scoped route, not only on first mount. It used to
    // re-run by ACCIDENT: `navigate` was a dependency, and because the app runs on a non-data
    // router (<BrowserRouter> in src/index.tsx) useNavigate resolves to useNavigateUnstable,
    // whose useCallback is keyed on the current pathname — so its identity churns on every
    // navigation. Accidental or not, re-running is right; what was missing is that the
    // redirect was not idempotent and had no carve-out, so clicking Profile from
    // /select-company navigated and was immediately undone.
    //
    // Depend on `pathname` explicitly (the honest version of what was happening) and make the
    // redirect a no-op when we are already where onboarding wants us — otherwise every
    // currentUser/currentCompany refresh pushed another /select-company entry onto history.
    const goOnce = (to) => {
      if (pathname !== to) {
        // replace, not push: a bounced-away route must not sit in history for Back to re-enter.
        navigate(to, { replace: true });
      }
    };

    if (currentUser?.companies?.length === 0) {
      goOnce(`/admin/dashboard/select-company`);
    } else if (
      currentUser?.companies?.length === 1 &&
      currentCompany?.establishments &&
      currentCompany.establishments.length === 0
    ) {
      if (
        currentCompany.subscription ||
        (currentCompany.subscription_plan && currentCompany.subscription_plan.id)
      ) {
        goOnce(`/admin/dashboard/farm/add`);
      } else {
        if (!currentCompany.has_subscription) {
          goOnce(`/admin/dashboard/pricing`);
        }
      }
    }
  }, [currentCompany, currentUser, subdomain, pathname]);

  // SECURITY: Create safe next URL with validation
  const nextUrl =
    pathname !== '/' ? createSafeRedirectUrl(LOGIN_PAGE_URL, pathname) : LOGIN_PAGE_URL;

  return isLoading === false &&
    isAuthenticated &&
    allowedRoles.includes(currentUser?.user_type) &&
    (mustBeCompanyAdmin
      ? currentUser?.companies[0].role === ROLE_DISPLAY_COMPANY_ADMIN ||
        currentUser?.user_type === SUPERUSER
      : true) ? (
    <Outlet />
  ) : isLoading === false && isAuthenticated === false ? (
    <Navigate to={nextUrl} state={{ next: pathname }} />
  ) : mustBeCompanyAdmin && currentUser?.companies[0].role !== ROLE_DISPLAY_COMPANY_ADMIN ? (
    <Navigate to="/admin/dashboard" />
  ) : null;
};

export default Authenticated;
