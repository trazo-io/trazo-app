import { login, logout } from 'store/features/authSlice';

import FullScreenLoader from 'components/Loader/FullScreenLoader';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';
import { useUserDataQuery } from 'store/api/authApi';

const CheckAuth = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const hasInitialized = useRef(false);

  // Skip authentication check on auth pages and public routes to prevent redirect loops
  const isAuthPage = location?.pathname?.startsWith('/auth/') || false;
  const isPublicProductRoute = location?.pathname?.match(/^\/production\/[^\/]+\/?$/) || false;
  const isPricingPage = location?.pathname === '/pricing' || false;

  // Skip authentication for public routes
  const skipAuth = isAuthPage || isPublicProductRoute || isPricingPage;

  const { data, isLoading, isError, isSuccess } = useUserDataQuery(undefined, {
    skip: skipAuth // Skip the query on auth pages and public routes
  });

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(login(data));
    } else if (isError && !skipAuth) {
      // Only dispatch logout if not on auth page or public route
      dispatch(logout());
    }
  }, [dispatch, data, isSuccess, isError, skipAuth]);

  // Set auth loading to false on auth pages so components can render,
  // but only once on initial mount and only if not already authenticated.
  // This prevents wiping Redux state during the login->redirect transition
  // (which was causing the login/logout/re-login loop).
  useEffect(() => {
    if (skipAuth && !isAuthenticated && !hasInitialized.current) {
      hasInitialized.current = true;
      dispatch(logout());
    }
  }, [skipAuth, isAuthenticated, dispatch]);

  // Reset initialization flag when navigating away from auth pages
  useEffect(() => {
    if (!isAuthPage) {
      hasInitialized.current = false;
    }
  }, [isAuthPage]);

  return isLoading && !skipAuth ? <FullScreenLoader /> : <Outlet />;
};

export default CheckAuth;
