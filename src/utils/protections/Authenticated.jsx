import { Navigate, Outlet, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { PRODUCER, SUPERUSER, CONSUMER, ROLE_DISPLAY_COMPANY_ADMIN } from '../../config';
import React, { useEffect, useState } from 'react';

import { LOGIN_PAGE_URL } from 'config/routes';
import { useSelector } from 'react-redux';
import { getAuthRedirectAction } from '../authRedirect';
import { validateRedirectUrl, createSafeRedirectUrl } from '../urlValidator';
import { getSubdomainType } from '../subdomain';

const isDev = import.meta.env.DEV;

const Authenticated = ({ allowedRoles, mustBeCompanyAdmin = false }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);
  const currentCompany = useSelector((state) => state.company.currentCompany);
  const [subdomain, setSubDomain] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.userState.user);

  const { establishmentId } = useParams();

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
      const id = Number(establishmentId);

      if (
        (establishmentId || pathname == '/admin/dashboard' || pathname == '/admin/dashboard/') &&
        currentUser?.companies.length > 0
      ) {
        if (
          currentCompany &&
          currentCompany.establishments &&
          !currentCompany.establishments.map((e) => e.id).includes(id)
        ) {
          // Check if we're navigating from establishment creation (prevent redirect race condition)
          const isFromEstablishmentCreation =
            sessionStorage.getItem('creating_establishment') === 'true';
          const justCreatedId = sessionStorage.getItem('just_created_establishment_id');

          // If we just created this establishment, wait for cache to update instead of redirecting
          if (isFromEstablishmentCreation && justCreatedId == id) {
            // Clear the flag after a delay to prevent infinite waiting
            setTimeout(() => {
              sessionStorage.removeItem('creating_establishment');
              sessionStorage.removeItem('just_created_establishment_id');
            }, 3000);
            return;
          }

          if (currentCompany.establishments?.length > 0) {
            const establishment = currentCompany.establishments[0].id;
            navigate(`/admin/dashboard/establishment/${establishment}`);
          } else {
            navigate(`/admin/dashboard/`);
          }
        }
      }

      // Auto-select first establishment when visiting root dashboard without establishmentId
      if (
        (pathname === '/admin/dashboard' || pathname === '/admin/dashboard/') &&
        !establishmentId &&
        currentCompany?.establishments?.length > 0
      ) {
        const firstEstablishment = currentCompany.establishments[0].id;
        navigate(`/admin/dashboard/establishment/${firstEstablishment}`);
      }
    }
  }, [currentCompany, establishmentId, navigate, currentUser, subdomain, pathname]);

  useEffect(() => {
    if (
      (currentUser?.user_type === PRODUCER || currentUser?.user_type === SUPERUSER) &&
      subdomain === 'producer'
    ) {
      if (currentUser?.companies.length === 0) {
        navigate(`/admin/dashboard/select-company`);
      } else if (
        currentUser?.companies.length === 1 &&
        currentCompany?.establishments &&
        currentCompany.establishments.length === 0
      ) {
        if (
          currentCompany.subscription ||
          (currentCompany.subscription_plan && currentCompany.subscription_plan.id)
        ) {
          navigate(`/admin/dashboard/establishment/add`);
        } else {
          if (!currentCompany.has_subscription) {
            navigate(`/admin/dashboard/pricing`);
          }
        }
      }
    }
  }, [currentCompany, currentUser, navigate, subdomain]);

  // SECURITY: Create safe next URL with validation
  const nextUrl =
    pathname !== '/' ? createSafeRedirectUrl(LOGIN_PAGE_URL, pathname) : LOGIN_PAGE_URL;

  return isLoading === false &&
    isAuthenticated &&
    allowedRoles.includes(currentUser?.user_type) &&
    (mustBeCompanyAdmin
      ? currentUser?.companies[0].role === ROLE_DISPLAY_COMPANY_ADMIN || currentUser?.user_type === SUPERUSER
      : true) ? (
    <Outlet />
  ) : isLoading === false && isAuthenticated === false ? (
    <Navigate to={nextUrl} state={{ next: pathname }} />
  ) : mustBeCompanyAdmin && currentUser?.companies[0].role !== ROLE_DISPLAY_COMPANY_ADMIN ? (
    <Navigate to="/admin/dashboard" />
  ) : null;
};

export default Authenticated;
