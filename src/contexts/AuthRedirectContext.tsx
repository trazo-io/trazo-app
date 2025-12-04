import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface PendingAction {
  type: 'review' | 'redirect';
  data: {
    productionId?: string;
    url?: string;
  };
}

interface AuthRedirectContextType {
  setPendingAction: (action: PendingAction) => void;
  clearPendingAction: () => void;
  getPendingAction: () => PendingAction | null;
  executeStoredAction: () => void;
  redirectToAuthWithAction: (action: PendingAction, authType?: 'signin' | 'signup') => void;
}

const AuthRedirectContext = createContext<AuthRedirectContextType | undefined>(undefined);

export const useAuthRedirect = () => {
  const context = useContext(AuthRedirectContext);
  if (!context) {
    throw new Error('useAuthRedirect must be used within AuthRedirectProvider');
  }
  return context;
};

export const AuthRedirectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const STORAGE_KEY = 'trazo_pending_auth_action';

  const setPendingAction = (action: PendingAction) => {
    console.log('🔐 AuthRedirect: Setting pending action:', action);
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          action,
          timestamp: Date.now(),
          originPath: location.pathname
        })
      );
    } catch (error) {
      console.error('Failed to store pending action:', error);
    }
  };

  const clearPendingAction = () => {
    console.log('🔐 AuthRedirect: Clearing pending action');
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const getPendingAction = (): PendingAction | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Check if action is too old (older than 10 minutes)
      const MAX_AGE = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - parsed.timestamp > MAX_AGE) {
        console.log('🔐 AuthRedirect: Pending action expired, clearing');
        clearPendingAction();
        return null;
      }

      console.log('🔐 AuthRedirect: Retrieved pending action:', parsed.action);
      return parsed.action;
    } catch (error) {
      console.error('Failed to retrieve pending action:', error);
      clearPendingAction();
      return null;
    }
  };

  const executeStoredAction = () => {
    const pendingAction = getPendingAction();
    if (!pendingAction) {
      console.log('🔐 AuthRedirect: No pending action to execute');
      return;
    }

    console.log('🔐 AuthRedirect: Executing stored action:', pendingAction);

    switch (pendingAction.type) {
      case 'review':
        if (pendingAction.data.productionId) {
          const reviewUrl = `/admin/dashboard/production/${
            pendingAction.data.productionId
          }/review/web-${Date.now()}`;
          console.log('🔐 AuthRedirect: Navigating to review page:', reviewUrl);
          navigate(reviewUrl, { replace: true });
        }
        break;

      case 'redirect':
        if (pendingAction.data.url) {
          console.log('🔐 AuthRedirect: Navigating to stored URL:', pendingAction.data.url);
          navigate(pendingAction.data.url, { replace: true });
        }
        break;

      default:
        console.warn('🔐 AuthRedirect: Unknown action type:', pendingAction.type);
    }

    // Clear the action after execution
    clearPendingAction();
  };

  const redirectToAuthWithAction = (
    action: PendingAction,
    authType: 'signin' | 'signup' = 'signin'
  ) => {
    setPendingAction(action);
    const authPath = authType === 'signup' ? '/consumer/auth/signup' : '/consumer/auth/signin';
    console.log('🔐 AuthRedirect: Redirecting to auth with action stored:', authPath);
    navigate(authPath);
  };

  return (
    <AuthRedirectContext.Provider
      value={{
        setPendingAction,
        clearPendingAction,
        getPendingAction,
        executeStoredAction,
        redirectToAuthWithAction
      }}
    >
      {children}
    </AuthRedirectContext.Provider>
  );
};
