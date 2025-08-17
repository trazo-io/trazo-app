import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getAuthRedirectAction, clearAuthRedirectAction } from './authRedirect';

interface RedirectGuardProps {
  children: React.ReactNode;
}

/**
 * RedirectGuard - Professional auth redirect handler
 * 
 * This component follows best practices from top-tier apps:
 * 1. Intercepts navigation after authentication
 * 2. Executes pending redirects with priority
 * 3. Prevents other components from interfering
 * 4. Cleans up after redirect execution
 */
export const RedirectGuard: React.FC<RedirectGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  const [hasExecutedRedirect, setHasExecutedRedirect] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Only process once after authentication
    if (!isAuthenticated || hasExecutedRedirect) {
      setIsProcessing(false);
      return;
    }

    // Check for pending auth redirect
    const pendingAction = getAuthRedirectAction();
    
    if (pendingAction && pendingAction.type === 'review' && pendingAction.productionId) {
      console.log('🛡️ RedirectGuard: Executing pending redirect for review');
      
      // Generate review URL
      const reviewUrl = `/admin/dashboard/production/${pendingAction.productionId}/review/web-${Date.now()}`;
      
      // Clear the action first to prevent loops
      clearAuthRedirectAction();
      setHasExecutedRedirect(true);
      
      // Execute redirect with a small delay to ensure state is updated
      setTimeout(() => {
        console.log('🛡️ RedirectGuard: Navigating to:', reviewUrl);
        navigate(reviewUrl, { replace: true });
      }, 100);
    } else {
      setIsProcessing(false);
    }
  }, [isAuthenticated, hasExecutedRedirect, navigate]);

  // Don't render children while processing redirect
  if (isProcessing && isAuthenticated) {
    return null; // Or a loading spinner if preferred
  }

  return <>{children}</>;
};

export default RedirectGuard;