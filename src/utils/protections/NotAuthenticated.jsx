import * as routes from '../../config/routes';

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSelector } from 'react-redux';
import { validateRedirectUrl } from '../urlValidator';

const NotAuthenticated = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);
  const location = useLocation();

  // SECURITY: Get and validate the 'next' parameter from URL to prevent open redirects
  const params = new URLSearchParams(location.search);
  const nextParam = params.get('next');
  const nextPath = validateRedirectUrl(nextParam) || routes.HOME_URL;

  // Check if we're on an auth page
  const isAuthPage = location.pathname.startsWith('/auth/');

  // If we're on an auth page, always show the auth pages regardless of loading state
  // This prevents issues when auth check is skipped
  if (isAuthPage) {
    return isAuthenticated ? <Navigate to={nextPath} replace /> : <Outlet />;
  }

  // For non-auth pages, wait for loading to complete
  if (isLoading) {
    return null;
  }

  // If user is NOT authenticated, show the auth pages (Outlet)
  if (!isAuthenticated) {
    return <Outlet />;
  }

  // If user IS authenticated, redirect to the validated destination
  return <Navigate to={nextPath} replace />;
};

export default NotAuthenticated;
