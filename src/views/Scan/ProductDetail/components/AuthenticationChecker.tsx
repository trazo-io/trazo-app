/**
 * Authentication Checker Component
 * Handles authentication state checking for public product detail pages
 * Split from ProductDetail.tsx for better performance and maintainability
 */

import React from 'react';
import { useSelector } from 'react-redux';

interface AuthenticationState {
  isAuthenticated: boolean;
  currentUser: any;
  hasAuthCookies: boolean;
  finalIsAuthenticated: boolean;
  finalCurrentUser: any;
}

interface AuthenticationCheckerProps {
  onAuthStateChange: (authState: AuthenticationState) => void;
}

export const AuthenticationChecker: React.FC<AuthenticationCheckerProps> = ({
  onAuthStateChange
}) => {
  // Get authentication state from Redux store
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: any) => state.userState.user);

  // Helper function to check if user might be authenticated via cookies
  const checkAuthFromCookies = (): boolean => {
    // Check for common auth-related cookies that might indicate authentication
    const cookieString = document.cookie;
    console.log('🔍 All cookies:', cookieString);

    // Look for session-related cookies that might indicate authentication
    const hasSessionCookie =
      cookieString.includes('sessionid') ||
      cookieString.includes('csrftoken') ||
      cookieString.includes('auth') ||
      cookieString.includes('user');

    console.log('🔍 Has session-related cookies:', hasSessionCookie);
    return hasSessionCookie;
  };

  // For public routes, check multiple sources for authentication
  const hasAuthCookies = checkAuthFromCookies();
  const finalIsAuthenticated = Boolean(currentUser?.id) || hasAuthCookies;
  const finalCurrentUser = currentUser;

  // Debug logging
  console.log('🔍 Redux Authentication state:', isAuthenticated);
  console.log('🔍 Redux Current user:', currentUser);
  console.log('🔍 Has auth cookies:', hasAuthCookies);
  console.log('🔍 FINAL Authentication state:', finalIsAuthenticated);
  console.log('🔍 FINAL Current user:', finalCurrentUser);

  // Notify parent component of auth state
  React.useEffect(() => {
    onAuthStateChange({
      isAuthenticated,
      currentUser,
      hasAuthCookies,
      finalIsAuthenticated,
      finalCurrentUser
    });
  }, [
    isAuthenticated,
    currentUser,
    hasAuthCookies,
    finalIsAuthenticated,
    finalCurrentUser,
    onAuthStateChange
  ]);

  // This component doesn't render anything visible
  return null;
};

export default AuthenticationChecker;
