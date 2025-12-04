/**
 * Simple, reliable authentication redirect utility
 * This uses localStorage as a fallback for maximum compatibility
 */

const STORAGE_KEY = 'trazo_pending_auth_action';

export interface PendingAuthAction {
  type: 'review';
  productionId: string;
  timestamp: number;
}

export const setAuthRedirectAction = (productionId: string): void => {
  const action: PendingAuthAction = {
    type: 'review',
    productionId,
    timestamp: Date.now()
  };

  console.log('🔐 Setting auth redirect action:', action);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(action));

  // Verify it was stored correctly
  const verify = localStorage.getItem(STORAGE_KEY);
  console.log('🔐 Verified stored action:', verify);
};

export const getAuthRedirectAction = (): PendingAuthAction | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Handle both old and new storage formats
    let action: PendingAuthAction;
    if (parsed.action) {
      // New format: { action: {...}, timestamp: ... }
      action = { ...parsed.action, timestamp: parsed.timestamp };
    } else {
      // Old format: direct action object
      action = parsed as PendingAuthAction;
    }

    // Check if action is too old (older than 30 minutes)
    const MAX_AGE = 30 * 60 * 1000;
    if (Date.now() - action.timestamp > MAX_AGE) {
      console.log('🔐 Auth redirect action expired, clearing');
      clearAuthRedirectAction();
      return null;
    }

    console.log('🔐 Retrieved auth redirect action:', action);
    return action;
  } catch (error) {
    console.error('Failed to retrieve auth redirect action:', error);
    clearAuthRedirectAction();
    return null;
  }
};

export const clearAuthRedirectAction = (): void => {
  console.log('🔐 Clearing auth redirect action');
  localStorage.removeItem(STORAGE_KEY);
};

export const executeAuthRedirectAction = (
  navigate: (path: string, options?: any) => void
): boolean => {
  const action = getAuthRedirectAction();
  if (!action) {
    console.log('🔐 No auth redirect action to execute');
    return false;
  }

  console.log('🔐 Executing auth redirect action:', action);

  if (action.type === 'review' && action.productionId) {
    const reviewUrl = `/admin/dashboard/production/${action.productionId}/review/web-${Date.now()}`;
    console.log('🔐 Navigating to review page:', reviewUrl);

    // Execute navigation immediately without delay
    navigate(reviewUrl, { replace: true });
    clearAuthRedirectAction();
    return true;
  }

  console.warn('🔐 Unknown or invalid auth redirect action:', action);
  clearAuthRedirectAction();
  return false;
};

export const buildAuthRedirectUrl = (): string | null => {
  const action = getAuthRedirectAction();
  if (!action) return null;

  if (action.type === 'review' && action.productionId) {
    return `/admin/dashboard/production/${action.productionId}/review/web-${Date.now()}`;
  }

  return null;
};
