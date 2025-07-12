import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Company } from 'types/company';

interface OnboardingState {
  shouldShowOnboarding: boolean;
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  hasCompletedOnboarding: boolean;
  hasSkippedOnboarding: boolean;
  resetOnboarding: () => void;
}

export const useOnboarding = (): OnboardingState => {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Get company data from Redux with improved detection
  const company = useSelector((state: RootState) => {
    // First, try to get from auth state (most reliable)
    const auth = state.auth as any;
    if (auth && auth.companies && auth.companies.length > 0) {
      const selectedId = auth.selectedCompany;
      const selectedCompany = auth.companies.find((company: Company) => company.id === selectedId);
      if (selectedCompany) return selectedCompany;
    }

    // Fallback to company state (direct access)
    const companyState = state.company as any;
    if (companyState && companyState.currentCompany) {
      return companyState.currentCompany;
    }

    // Alternative company slice location
    const companySlice = state.companySlice as any;
    if (companySlice && companySlice.currentCompany) {
      return companySlice.currentCompany;
    }

    return null;
  });

  // Check onboarding status from localStorage
  const hasCompletedOnboarding = localStorage.getItem('trazo_onboarding_completed') === 'true';
  const hasSkippedOnboarding = localStorage.getItem('trazo_onboarding_skipped') === 'true';

  // Determine if we should show onboarding
  // Temporarily more permissive for testing
  const shouldShowOnboarding = Boolean(
    company &&
      !hasCompletedOnboarding &&
      !hasSkippedOnboarding &&
      (isNewCompany(company) || hasAtLeastOneEstablishment(company)) // OR instead of AND for testing
  );

  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => setIsOnboardingOpen(false);

  const resetOnboarding = () => {
    localStorage.removeItem('trazo_onboarding_completed');
    localStorage.removeItem('trazo_onboarding_skipped');
    localStorage.removeItem('trazo_onboarding_completed_date');
  };

  // Debug logging disabled to prevent console spam
  // useEffect(() => {
  //   if (company?.id) {
  //     const debugInfo = {
  //       companyName: company?.name,
  //       companyId: company?.id,
  //       createdAt: company?.created_at,
  //       dateJoined: company?.date_joined,
  //       establishments: company?.establishments?.length || 0,
  //       establishmentsList: company?.establishments?.map(e => ({ id: e.id, name: e.name })) || [],
  //       productions: (company as any)?.productions?.length || 0,
  //       hasCompletedOnboarding,
  //       hasSkippedOnboarding,
  //       isNewCompany: isNewCompany(company),
  //       hasAtLeastOneEstablishment: hasAtLeastOneEstablishment(company),
  //       daysSinceCreation: company.created_at || company.date_joined ? Math.floor((Date.now() - new Date(company.created_at || company.date_joined).getTime()) / (1000 * 60 * 60 * 24)) : null
  //     };
  //     console.log('🚀 Onboarding Debug:', debugInfo);
  //   }
  // }, [company?.id]); // Only log when company ID changes

  // Auto-open onboarding - TEMPORARILY DISABLED for testing
  // useEffect(() => {
  //   // Only proceed if we have a stable company object with an ID
  //   if (!company?.id) return;
  //
  //   const canShowOnboarding = Boolean(
  //     company &&
  //     !hasCompletedOnboarding &&
  //     !hasSkippedOnboarding &&
  //     (isNewCompany(company) || hasAtLeastOneEstablishment(company))
  //   );
  //
  //   // Only auto-open if conditions are met and modal is not already open
  //   if (canShowOnboarding && !isOnboardingOpen) {
  //     console.log('🚀 Auto-opening onboarding for company:', company.name);
  //     const timer = setTimeout(() => {
  //       setIsOnboardingOpen(true);
  //     }, 1500); // Slight delay to ensure DOM is ready
  //
  //     return () => clearTimeout(timer);
  //   }
  // }, [
  //   company?.id, // Only depend on company ID, not the whole object
  //   hasCompletedOnboarding,
  //   hasSkippedOnboarding,
  //   isOnboardingOpen
  // ]);

  return {
    shouldShowOnboarding,
    isOnboardingOpen,
    openOnboarding,
    closeOnboarding,
    hasCompletedOnboarding,
    hasSkippedOnboarding,
    resetOnboarding
  };
};

/**
 * Check if a company has at least one establishment (required for onboarding)
 */
function hasAtLeastOneEstablishment(company: Company): boolean {
  // Check multiple possible locations for establishments
  const establishments = company?.establishments || (company as any)?.establishment || [];
  return Boolean(establishments && establishments.length > 0);
}

/**
 * Check if a company is "new" and should see onboarding
 */
function isNewCompany(company: Company): boolean {
  if (!company) return false;

  // Get creation date - try multiple possible field names
  const createdDate =
    company.created_at ||
    company.date_joined ||
    (company as any).dateJoined ||
    (company as any).createdAt;

  if (!createdDate) {
    // If no creation date, assume it's new for safety (but don't log)
    return true;
  }

  const daysSinceCreation = (Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24);

  // If company is older than 14 days, don't show onboarding
  if (daysSinceCreation > 14) return false;

  // Check if company is still in setup phase
  const establishments = company?.establishments || (company as any)?.establishment || [];
  const hasEstablishments = establishments.length > 0;
  const productions = (company as any)?.productions || [];
  const hasProductions = productions.length > 0;

  // Show onboarding if company is new and either:
  // 1. Has establishments but no productions (just created establishment)
  // 2. Has very few productions (still learning)
  return hasEstablishments && (!hasProductions || productions.length < 3);
}

export default useOnboarding;
