import React, { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { CONSUMER, PRODUCER, SUPERUSER } from './config';

// Retry dynamic imports with page reload on failure (handles stale chunks after deploy)
function lazyWithRetry(importFn: () => Promise<any>) {
  return React.lazy(() =>
    importFn().catch((error) => {
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves, page is reloading
      }
      sessionStorage.removeItem('chunk_reload');
      throw error; // real error, let ErrorBoundary handle it
    })
  );
}
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
// Remove ChakraProvider and CSSReset imports since they're now in index.tsx
// import { ChakraProvider, CSSReset } from '@chakra-ui/react';
// import theme from 'theme/theme';
// Remove CacheProvider and emotionCache imports
// import { CacheProvider } from '@emotion/react';
// import { emotionCache } from './emotion-cache';

import AddFarm from 'views/Dashboard/Dashboard/Farm/AddFarm';
import AddParcel from 'views/Dashboard/Dashboard/Parcel/AddParcel';
// import AdvancedAnalyticsDemo from 'views/AdvancedAnalyticsDemo';
import AdminLayout from 'layouts/Admin';
import AuthLayout from 'layouts/Auth';
import ConsumerProductLayout from 'components/Layout/ConsumerProductLayout';
//@ts-ignore
import Authenticated from './utils/protections/Authenticated';
//@ts-ignore
import CertificationsView from 'views/Dashboard/Certifications';
import OSPView from 'views/Dashboard/OSP/OSPView';
//@ts-ignore
import CheckAuth from './utils/protections/CheckAuth';
import CommercialView from 'views/Dashboard/Commercial';
// Lazy load dashboard for mobile performance
const DashboardView = lazyWithRetry(() => import('views/Dashboard/Dashboard'));
import DetailEvent from 'views/Dashboard/Dashboard/Event/DetailEvent';
import FinishProduction from 'views/Dashboard/Dashboard/Production/FinishProduction';
//@ts-ignore
import NotAuthenticated from './utils/protections/NotAuthenticated';
//@ts-ignore
import ParcelView from 'views/Dashboard/Parcel';
//@ts-ignore
import Pricing from 'views/Pages/Pricing/index';
// Legal pages redirect to landing page (canonical source)
const LANDING_URL = 'https://trazo.io';
const RedirectToPrivacy = () => { window.location.replace(`${LANDING_URL}/privacy-policy`); return null; };
const RedirectToTerms = () => { window.location.replace(`${LANDING_URL}/terms-conditions`); return null; };
// Lazy load QR scanning components for mobile performance
const ProductDetail = lazyWithRetry(() => import('views/Scan/ProductDetail/ProductDetail'));
import ProfileFarm from 'views/Dashboard/Dashboard/Farm/ProfileFarm';
//@ts-ignore
import ProfileParcel from 'views/Dashboard/Dashboard/Parcel/ProfileParcel';
import ProfileProduction from 'views/Dashboard/Dashboard/Production/ProfileProduction';
import ProfileUser from 'views/Dashboard/Dashboard/User/ProfileUser';
//@ts-ignore
import SelectCompanyView from 'views/Dashboard/Dashboard/Company/AddCompany';
import ModernProductReview from 'views/Scan/ProductReview/ModernProductReview';
import SettingsView from 'views/Dashboard/Settings';
import SignIn from 'views/Authentication/SignIn/SignInIllustration';
import SignInApp from 'views/Authentication/SignIn/SignInBasic';
import SignUp from 'views/Authentication/SignUp/SignUpBasic';
import Unauthorized from './views/Applications/DataTables/index';
import UpdateEvent from 'views/Dashboard/Dashboard/Event/UpdateEvent';
import UpdateProduction from 'views/Dashboard/Dashboard/Production/UpdateProduction';
import QuickStartProduction from 'views/Dashboard/Dashboard/Production/QuickStartProduction';
import UpdateUser from 'views/Dashboard/Dashboard/User/UpdateUser';
import VerifyEmail from './views/Authentication/SignUp/VerifyEmail';
import { useSelector } from 'react-redux';
import VerifyEmailConsumer from 'views/Authentication/SignUp/VerifyEmailConsumer';
import SignInConsumer from 'views/Authentication/SignIn/SignInConsumer';
import SignUpConsumer from 'views/Authentication/SignUp/SignUpConsumer';
import AdminConsumerLayout from 'layouts/AdminConsumer';

import ImpactDashboard from 'views/Dashboard/ImpactDashboard';
import ConsumerEducationDashboard from 'views/Dashboard/EducationDashboard';

import CarbonJourney from 'views/Dashboard/CarbonJourney';
import AllScansJourney from 'views/Dashboard/CarbonJourney/AllScans';
import AllReviewsJourney from 'views/Dashboard/CarbonJourney/AllReviews';
import ConsumerProfile from 'views/Dashboard/ConsumerProfile';
import { routeConfig } from './routes/config';
import SubscriptionRequired from './utils/protections/SubscriptionRequired';
import DashboardPricing from 'views/Dashboard/Dashboard/Pricing';
import StripeSuccessRedirect from 'views/Dashboard/Dashboard/Subscription/StripeSuccessRedirect';
import UnifiedSubscriptionDashboard from 'views/Dashboard/UnifiedSubscription';
import NoSubscriptionRedirect from './utils/protections/NoSubscriptionRedirect';
import ModernCarbonDashboard from 'views/Dashboard/Dashboard/Farm/ModernCarbonDashboard';
import PublicFarmProfile from 'views/Scan/PublicFarmProfile/PublicFarmProfile';
import { usePointsStore } from './store/pointsStore';
import ProducerEducationDashboard from 'views/Dashboard/Education';
import EducationTopicDetail from 'views/Dashboard/Education/EducationTopicDetail';
import EducationFAQ from 'views/Dashboard/Education/EducationFAQ';
import AllScansView from 'views/Dashboard/Commercial/AllScans';
import AllReviewsView from 'views/Dashboard/Commercial/AllReviews';
import { useGetCsrfTokenQuery } from './store/api/baseApi';
import GoogleAuthCallback from 'views/Authentication/GoogleAuthCallback';
import AcceptInvitation from 'views/Authentication/Invitation/AcceptInvitation';
import SetupPassword from 'views/Authentication/Invitation/SetupPassword';
import { ErrorBoundary } from 'react-error-boundary';
import ChangePassword from 'views/Settings/ChangePassword';
import { AdminGuard } from 'components/Guards/AdminGuard';
import ConsumerChangePassword from 'views/Consumer/Settings/ConsumerChangePassword';
import RedirectGuard from './utils/RedirectGuard';

// Error fallback component
const ErrorFallback = ({
  error,
  resetErrorBoundary
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div
    style={{
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#f7fafc',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}
  >
    <h2 style={{ color: '#2d3748', marginBottom: '16px' }}>Something went wrong</h2>
    <p style={{ color: '#718096', marginBottom: '24px' }}>
      We apologize for the inconvenience. Please try refreshing the page.
    </p>
    <button
      onClick={resetErrorBoundary}
      style={{
        padding: '12px 24px',
        backgroundColor: '#059669',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
      }}
    >
      Try again
    </button>
    <details style={{ marginTop: '24px', color: '#a0aec0', fontSize: '14px' }}>
      <summary>Error details</summary>
      <pre style={{ marginTop: '8px', textAlign: 'left' }}>{error.message}</pre>
    </details>
  </div>
);

const App = () => {
  const location = useLocation();
  const [subdomain, setSubDomain] = useState<string>('');
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const isLoadingAuth = useSelector((state) => state.auth.isLoading);
  const currentUser = useSelector((state) => state.userState.user);

  // Initialize CSRF token on app startup
  const {} = useGetCsrfTokenQuery();

  useEffect(() => {
    const host = window.location.host;
    const baseDomain = import.meta.env.VITE_APP_BASE_DOMAIN || 'trazo.io';

    // Subdomain detection based on host

    try {
      // Handle app-staging.trazo.io and similar staging domains
      if (host.includes('app-staging') || host.includes('app.') || host.includes('app-')) {
        // Producer app detected
        setSubDomain('producer');
      } else if (host.includes('consumer')) {
        // Consumer app detected
        setSubDomain('consumer');
      } else {
        // Default to producer for main domain
        // Default to producer app
        setSubDomain('producer');
      }
    } catch (error) {
      console.error('Error in subdomain detection:', error);
      // Fallback to producer in case of any error
      setSubDomain('producer');
    }
  }, []);

  if (!subdomain) {
    return null; // or a loading spinner
  }

  const config = routeConfig[subdomain];

  if (!config) {
    return <Navigate to="/pricing" replace />;
  }

  // App configuration loaded

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      {/* ChakraProvider is now at root level in index.tsx */}
      <Routes>
        {/* Public Pricing Page - Available without authentication */}
        <Route path="/pricing" element={<AuthLayout />}>
          <Route index element={<Pricing />} />
        </Route>

        {/* OAuth Callback - must be accessible from localhost:3000 */}
        <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

        {/* Legal Pages - Redirect to landing page (canonical source) */}
        <Route path="/terms" element={<RedirectToTerms />} />
        <Route path="/privacy" element={<RedirectToPrivacy />} />

        {/* Invitation Routes - Available without authentication */}
        <Route element={<AuthLayout />}>
          <Route path="/invitation/:invitationCode" element={<AcceptInvitation />} />
          <Route path="/invitation/:invitationCode/setup" element={<SetupPassword />} />
        </Route>

        <Route element={<CheckAuth />}>
          {/* Public Routes */}
          <Route element={<NotAuthenticated />}>
            <Route element={<AuthLayout />}>
              <Route path={config?.auth.path}>
                <Route path="signin" element={config?.auth.signin && <config.auth.signin />} />
                <Route path="signup" element={config?.auth.signup && <config.auth.signup />} />
                <Route
                  path="verifyemail"
                  element={config?.auth.verifyEmail && <config.auth.verifyEmail />}
                />
                <Route
                  path="forgot-password"
                  element={config?.auth.forgotPassword && <config.auth.forgotPassword />}
                />
                <Route
                  path="reset-password"
                  element={config?.auth.resetPassword && <config.auth.resetPassword />}
                />
              </Route>
            </Route>
          </Route>

          {/* Protected Routes */}
          {subdomain === 'producer' && (
            <Route element={<Authenticated allowedRoles={config.protected.roles} />}>
              <Route path={config.protected.path} element={<AdminLayout />}>
                {/* Routes accessible without subscription */}
                <Route path="select-company" element={<SelectCompanyView />} />
                <Route path="pricing" element={<AdminGuard><DashboardPricing /></AdminGuard>} />
                <Route path="subscription" element={<AdminGuard><UnifiedSubscriptionDashboard /></AdminGuard>} />
                <Route path="stripe-success" element={<AdminGuard><StripeSuccessRedirect /></AdminGuard>} />

                {/* Routes requiring subscription */}
                <Route element={<SubscriptionRequired />}>
                  <Route
                    index
                    element={
                      <NoSubscriptionRedirect>
                        <Suspense>
                          <DashboardView />
                        </Suspense>
                      </NoSubscriptionRedirect>
                    }
                  />
                  <Route path="profile" element={<ProfileUser />} />
                  <Route path="farm/add" element={<AddFarm />} />
                  <Route
                    path="farm/:farmId"
                    exact
                    element={
                      <NoSubscriptionRedirect>
                        <Suspense>
                          <DashboardView />
                        </Suspense>
                      </NoSubscriptionRedirect>
                    }
                  />
                  <Route
                    path="farm/:farmId/change"
                    exact
                    element={<AddFarm isEdit={true} />}
                  />
                  <Route
                    path="farm/:farmId/profile"
                    exact
                    element={<ProfileFarm />}
                  />
                  <Route
                    path="farm/:farmId/parcel/add"
                    exact
                    element={<AddParcel />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId"
                    exact
                    element={<ParcelView />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/change"
                    exact
                    element={<AddParcel isEdit={true} />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/profile"
                    exact
                    element={<ProfileParcel />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/event/add"
                    exact
                    element={<UpdateEvent />}
                  />
                  {/* <Route
                  path="farm/:farmId/parcel/:parcelId/event/:eventId"
                  exact
                  element={<DetailEvent />}
                /> */}
                  <Route
                    path="farm/:farmId/parcel/:parcelId/event/:eventId/change"
                    exact
                    element={<UpdateEvent isEdit={true} />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/add"
                    exact
                    element={<QuickStartProduction />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/:productionId"
                    exact
                    element={<ProfileProduction />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/:productionId/change"
                    exact
                    element={<QuickStartProduction isEdit={true} />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/:productionId/finish"
                    exact
                    element={<FinishProduction />}
                  />
                  <Route
                    path="farm/:farmId/osp"
                    exact
                    element={<OSPView />}
                  />
                  <Route
                    path="farm/:farmId/certifications/parcels"
                    exact
                    element={<CertificationsView />}
                  />
                  <Route
                    path="farm/:farmId/certifications/events"
                    exact
                    element={<CertificationsView />}
                  />
                  <Route
                    path="farm/:farmId/commercial"
                    exact
                    element={<CommercialView />}
                  />
                  <Route
                    path="farm/:farmId/scans"
                    exact
                    element={<AllScansView />}
                  />
                  <Route
                    path="farm/:farmId/reviews"
                    exact
                    element={<AllReviewsView />}
                  />
                  <Route path="settings" exact element={<AdminGuard><SettingsView /></AdminGuard>} />
                  <Route path="settings/change-password" exact element={<AdminGuard><ChangePassword /></AdminGuard>} />
                  <Route
                    path="farm/:farmId/transparency"
                    exact
                    element={
                      <NoSubscriptionRedirect>
                        <ModernCarbonDashboard />
                      </NoSubscriptionRedirect>
                    }
                  />
                  <Route path="education" element={<ProducerEducationDashboard />} />
                  <Route path="education/topic/:topicId" element={<EducationTopicDetail />} />
                  <Route path="education/faq" element={<EducationFAQ />} />
                  {/* <Route path="advanced-analytics-demo" element={<AdvancedAnalyticsDemo />} /> */}
                </Route>
              </Route>
            </Route>
          )}

          {subdomain === 'consumer' && (
            <>
              <Route element={<ConsumerProductLayout />}>
                <Route
                  path="/production/:productionId"
                  element={
                    <Suspense fallback={<div />}>
                      <ProductDetail />
                    </Suspense>
                  }
                />
              </Route>
              <Route element={<AuthLayout />}>
                <Route
                  path="/farm/:farmId"
                  element={<PublicFarmProfile />}
                />
              </Route>
              <Route element={<Authenticated allowedRoles={config.protected.roles} />}>
                <Route
                  path={config.protected.path}
                  element={
                    <RedirectGuard>
                      <AdminConsumerLayout />
                    </RedirectGuard>
                  }
                >
                  {/* Consumer routes */}
                  <Route index element={<Navigate to="impact" replace />} />
                  <Route path="impact" element={<ImpactDashboard />} />
                  <Route path="education" element={<ConsumerEducationDashboard />} />

                  <Route path="journey" element={<CarbonJourney />} />
                  <Route path="journey/scans" element={<AllScansJourney />} />
                  <Route path="journey/reviews" element={<AllReviewsJourney />} />
                  <Route path="profile" element={<ConsumerProfile />} />
                  <Route path="settings" element={<ConsumerChangePassword />} />
                  <Route
                    path="production/:productionId/review/:scanId"
                    element={<ModernProductReview />}
                  />
                </Route>
              </Route>
            </>
          )}

          {/* Default redirect based on subdomain */}
          <Route
            path="*"
            element={<Navigate to={config?.defaultRedirect || '/pricing'} replace />}
          />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
