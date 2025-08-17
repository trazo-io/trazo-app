import { Navigate, Outlet, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { PRODUCER, SUPERUSER, CONSUMER } from '../../config';
import React, { useEffect, useState } from 'react';

import { LOGIN_PAGE_URL } from 'config/routes';
import { useSelector } from 'react-redux';
import { getAuthRedirectAction } from '../authRedirect';
import { validateRedirectUrl, createSafeRedirectUrl } from '../urlValidator';

const Authenticated = ({ allowedRoles, mustBeCompanyAdmin = false }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);
  console.log('Authenticated');
  const currentCompany = useSelector((state) => state.company.currentCompany);
  console.log('currentCompany', currentCompany);
  const [subdomain, setSubDomain] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Debug wrapper for navigate calls
  const debugNavigate = (path, options) => {
    console.log('🔒 Authenticated.jsx: navigate() called with path:', path, 'options:', options);
    return navigate(path, options);
  };

  const currentUser = useSelector((state) => state.userState.user);

  const { establishmentId } = useParams();

  useEffect(() => {
    const host = window.location.host;
    const arr = host
      .split('.')
      .slice(0, host.includes(import.meta.env.VITE_APP_BASE_DOMAIN) ? -1 : -2);

    if (arr.length > 0) {
      if (arr[0] === 'app') {
        setSubDomain('producer');
      } else if (arr[0] === 'consumer') {
        setSubDomain('consumer');
      } else {
        setSubDomain('');
      }
    }
  }, []);

  useEffect(() => {
    console.log(
      '🔒 Authenticated.jsx: useEffect triggered - isAuthenticated:',
      isAuthenticated,
      'currentUser:',
      currentUser,
      'subdomain:',
      subdomain
    );
    if (isAuthenticated && currentUser && subdomain) {
      // Skip ALL redirect logic if RedirectGuard might be handling it
      // This is a critical fix to prevent interference with auth redirects
      const pendingAction = getAuthRedirectAction();
      const hasJustAuthenticated = sessionStorage.getItem('just_authenticated') === 'true';
      
      if (pendingAction || hasJustAuthenticated) {
        console.log(
          '🔒 Authenticated.jsx: Skipping redirect logic - pending action or just authenticated'
        );
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
      if (subdomain === 'consumer' && window.location.pathname.includes('/admin/dashboard/production/')) {
        console.log('🔒 Authenticated.jsx: Already on review page, skipping redirect logic');
        return;
      }

      // For routing purposes, treat anyone on consumer subdomain as a consumer
      // This allows producer accounts to access consumer features
      const isConsumerUser = currentUser.user_type === CONSUMER || subdomain === 'consumer';
      const params = new URLSearchParams(window.location.search);

      console.log('🔒 Authenticated.jsx: Debug user type check:', {
        'currentUser.user_type': currentUser.user_type,
        'CONSUMER constant': CONSUMER,
        'subdomain': subdomain,
        'isConsumerUser (after subdomain logic)': isConsumerUser
      });

      // SECURITY: Validate next parameter to prevent open redirect attacks
      const defaultPath = isConsumerUser ? '/admin/dashboard/impact' : '/admin/dashboard/scans';
      const nextParam = params.get('next');
      const intendedPath = validateRedirectUrl(nextParam) || defaultPath;
      console.log('🔒 Authenticated.jsx: intendedPath calculated (validated):', intendedPath, 'defaultPath was:', defaultPath);

      if (isConsumerUser && subdomain === 'producer') {
        console.log('🔒 Authenticated.jsx: Redirecting consumer from producer subdomain');
        // SECURITY: Build safe redirect URL with domain validation
        const baseUrl = `${window.location.protocol}//consumer.${
          import.meta.env.VITE_APP_BASE_DOMAIN
        }${window.location.port ? ':' + window.location.port : ''}`;
        const safeRedirectUrl = baseUrl + intendedPath;
        
        // Final validation before redirect
        if (validateRedirectUrl(safeRedirectUrl)) {
          window.location.href = safeRedirectUrl;
        } else {
          // Fallback to default consumer dashboard if validation fails
          window.location.href = baseUrl + '/consumer/dashboard';
        }
      } else {
        console.log('🔒 Authenticated.jsx: No subdomain redirect needed');
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
          if (currentCompany.establishments?.length > 0) {
            const establishment = currentCompany.establishments[0].id;
            debugNavigate(`/admin/dashboard/establishment/${establishment}`);
          } else {
            debugNavigate(`/admin/dashboard/`);
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
        debugNavigate(`/admin/dashboard/establishment/${firstEstablishment}`);
      }
    }
  }, [currentCompany, establishmentId, navigate, currentUser, subdomain, pathname]);

  useEffect(() => {
    if (
      (currentUser?.user_type === PRODUCER || currentUser?.user_type === SUPERUSER) &&
      subdomain === 'producer'
    ) {
      if (currentUser?.companies.length === 0) {
        debugNavigate(`/admin/dashboard/select-company`);
      } else if (
        currentUser?.companies.length === 1 &&
        currentCompany?.establishments &&
        currentCompany.establishments.length === 0
      ) {
        if (
          currentCompany.subscription ||
          (currentCompany.subscription_plan && currentCompany.subscription_plan.id)
        ) {
          debugNavigate(`/admin/dashboard/establishment/add`);
        } else {
          if (!currentCompany.has_subscription) {
            debugNavigate(`/admin/dashboard/pricing`);
          }
        }
      }
    }
  }, [currentCompany, currentUser, navigate, subdomain]);

  // SECURITY: Create safe next URL with validation
  const nextUrl = pathname !== '/' 
    ? createSafeRedirectUrl(LOGIN_PAGE_URL, pathname)
    : LOGIN_PAGE_URL;

  return isLoading === false &&
    isAuthenticated &&
    allowedRoles.includes(currentUser?.user_type) &&
    (mustBeCompanyAdmin
      ? currentUser?.companies[0].role === 'Company Admin' || currentUser?.user_type === SUPERUSER
      : true) ? (
    <Outlet />
  ) : isLoading === false && isAuthenticated === false ? (
    <Navigate to={nextUrl} state={{ next: pathname }} />
  ) : mustBeCompanyAdmin && currentUser?.companies[0].role !== 'Company Admin' ? (
    <Navigate to="/admin/dashboard" />
  ) : null;
};

export default Authenticated;
