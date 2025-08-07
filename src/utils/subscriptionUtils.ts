/**
 * Utility functions for subscription data handling
 */

// Type definitions
interface Subscription {
  id?: string | number;
  status?: string;
  current_period_end?: string;
  [key: string]: any;
}

interface DashboardData {
  subscription?: Subscription[];
  [key: string]: any;
}

interface CompanyData {
  subscription?: Subscription;
  [key: string]: any;
}

/**
 * Formats a date string to a localized format
 */
export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Formats a price value
 */
export const formatPrice = (price: number | null | undefined, quantity: number = 1): string => {
  if (price === null || price === undefined) return '-';
  const numPrice = Number(price);
  if (isNaN(numPrice)) return '-';
  return `$${(numPrice * quantity).toFixed(2)}`;
};

/**
 * Normalizes subscription data from different sources
 */
export const normalizeSubscription = (
  dashboardData: DashboardData | null | undefined,
  companyData: CompanyData | null | undefined
): Subscription | null => {
  // First try subscription from dashboard
  if (dashboardData?.subscription && dashboardData.subscription.length > 0) {
    return dashboardData.subscription[0];
  }
  // Fallback to company subscription
  if (companyData?.subscription && Object.keys(companyData.subscription).length > 0) {
    return companyData.subscription;
  }
  return null;
};

/**
 * Determines if a valid subscription exists
 *
 * @param {Object} subscription - Subscription object
 * @param {Object} company - Company object
 * @returns {boolean} Whether a valid subscription exists
 */
export const hasValidSubscription = (subscription, company) => {
  return (
    (subscription !== null &&
      typeof subscription === 'object' &&
      Object.keys(subscription).length > 0) ||
    company?.has_subscription === true
  );
};

/**
 * Get the appropriate status color for a subscription status
 *
 * @param {string} status - Subscription status
 * @returns {string} Color scheme name for the status
 */
export const getSubscriptionStatusColor = (status) => {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'green';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'red';
    case 'canceled':
      return 'gray';
    default:
      return 'blue';
  }
};

/**
 * Calculate days remaining in a trial
 *
 * @param {string} trialEndDate - Trial end date string
 * @returns {number} Days remaining
 */
export const getDaysRemaining = (trialEndDate) => {
  if (!trialEndDate) return 0;

  const end = new Date(trialEndDate);
  const now = new Date();
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

/**
 * Calculate trial progress percentage
 *
 * @param {Object} subscription - Subscription object
 * @returns {number} Progress percentage (0-100)
 */
export const getTrialProgressPercentage = (subscription) => {
  if (!subscription || !subscription.trial_end || !subscription.current_period_start) {
    return 0;
  }

  const start = new Date(subscription.current_period_start);
  const end = new Date(subscription.trial_end);
  const now = new Date();

  const totalDuration = end - start;
  const elapsed = now - start;

  if (elapsed <= 0) return 0;
  if (elapsed >= totalDuration) return 100;

  return Math.round((elapsed / totalDuration) * 100);
};
