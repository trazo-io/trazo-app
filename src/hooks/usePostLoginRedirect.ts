import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAuthRedirect } from '../contexts/AuthRedirectContext';

/**
 * Custom hook that automatically handles post-login redirects
 * This hook should be used in components that handle authentication
 */
export const usePostLoginRedirect = () => {
  const { executeStoredAction, getPendingAction } = useAuthRedirect();
  const currentUser = useSelector((state: any) => state.userState.user);
  const isAuthenticated = Boolean(currentUser?.id);

  useEffect(() => {
    // Only execute if user just became authenticated
    if (isAuthenticated) {
      const pendingAction = getPendingAction();
      if (pendingAction) {
        console.log('🔐 PostLoginRedirect: User authenticated, executing pending action');
        // Add a small delay to ensure auth state is fully stabilized
        setTimeout(() => {
          executeStoredAction();
        }, 100);
      }
    }
  }, [isAuthenticated, executeStoredAction, getPendingAction]);

  return {
    hasPendingAction: Boolean(getPendingAction()),
    executePendingAction: executeStoredAction
  };
};