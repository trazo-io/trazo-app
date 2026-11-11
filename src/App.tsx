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
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
// Remove ChakraProvider and CSSReset imports since they're now in index.tsx
// import { ChakraProvider, CSSReset } from '@chakra-ui/react';
// import theme from 'theme/theme';
// Remove CacheProvider and emotionCache imports
// import { CacheProvider } from '@emotion/react';
// import { emotionCache } from './emotion-cache';

const AddFarm = lazyWithRetry(() => import('views/Dashboard/Dashboard/Farm/AddFarm'));
const AddParcel = lazyWithRetry(() => import('views/Dashboard/Dashboard/Parcel/AddParcel'));
const BuyerPage = lazyWithRetry(() => import('views/Dashboard/Buyer'));

// WS-7: legacy analytics routes fold — old bookmarks land on the surfaces that
// absorbed them instead of 404ing.
const RedirectToFarmHome = () => {
  const { farmId } = useParams();
  return <Navigate to={`/admin/dashboard/farm/${farmId}`} replace />;
};
const RedirectToBuyer = () => {
  const { farmId } = useParams();
  return <Navigate to={`/admin/dashboard/farm/${farmId}/buyer`} replace />;
};
const ParcelApplicationWizard = lazyWithRetry(
  () => import('views/Dashboard/Parcel/ParcelApplicationWizard')
);
// import AdvancedAnalyticsDemo from 'views/AdvancedAnalyticsDemo';
import AdminLayout from 'layouts/Admin';
import AuthLayout from 'layouts/Auth';
import ConsumerProductLayout from 'components/Layout/ConsumerProductLayout';
//@ts-ignore
import Authenticated from './utils/protections/Authenticated';
const OSPView = lazyWithRetry(() => import('views/Dashboard/OSP/OSPView'));
const OSPModuleListPage = lazyWithRetry(() => import('views/Dashboard/OSP/OSPModuleListPage'));
const OSPModuleWizard = lazyWithRetry(() => import('views/Dashboard/OSP/OSPModuleWizard'));
const DocumentsPage = lazyWithRetry(() => import('views/Dashboard/Documents'));
const TracebackPage = lazyWithRetry(() => import('views/Dashboard/Traceback'));
const ActivitiesPage = lazyWithRetry(() => import('views/Dashboard/Activities'));
//@ts-ignore
import CheckAuth from './utils/protections/CheckAuth';
// Lazy load dashboard for mobile performance
const DashboardView = lazyWithRetry(() => import('views/Dashboard/Dashboard'));
const FinishProduction = lazyWithRetry(
  () => import('views/Dashboard/Dashboard/Production/FinishProduction')
);
//@ts-ignore
import NotAuthenticated from './utils/protections/NotAuthenticated';
//@ts-ignore
const ParcelView = lazyWithRetry(() => import('views/Dashboard/Parcel'));
//@ts-ignore
const Pricing = lazyWithRetry(() => import('views/Pages/Pricing/index'));
// Legal pages redirect to landing page (canonical source)
const LANDING_URL = 'https://trazo.io';
const RedirectToPrivacy = () => {
  window.location.replace(`${LANDING_URL}/privacy-policy`);
  return null;
};
const RedirectToTerms = () => {
  window.location.replace(`${LANDING_URL}/terms-of-service`);
  return null;
};
// Lazy load QR scanning components for mobile performance
const ProductDetail = lazyWithRetry(() => import('views/Scan/ProductDetail/ProductDetail'));
// Consumer data-methodology disclosure page (ECGT/FTC substantiation)
const MethodologyPage = lazyWithRetry(() => import('views/Scan/Methodology'));
const ProfileFarm = lazyWithRetry(() => import('views/Dashboard/Dashboard/Farm/ProfileFarm'));
//@ts-ignore
const ProfileParcel = lazyWithRetry(() => import('views/Dashboard/Dashboard/Parcel/ProfileParcel'));
const ProfileProduction = lazyWithRetry(
  () => import('views/Dashboard/Dashboard/Production/ProfileProduction')
);
const ProfileUser = lazyWithRetry(() => import('views/Dashboard/Dashboard/User/ProfileUser'));
//@ts-ignore
const SelectCompanyView = lazyWithRetry(
  () => import('views/Dashboard/Dashboard/Company/AddCompany')
);
const ModernProductReview = lazyWithRetry(
  () => import('views/Scan/ProductReview/ModernProductReview')
);
const SettingsView = lazyWithRetry(() => import('views/Dashboard/Settings'));
const SignIn = lazyWithRetry(() => import('views/Authentication/SignIn/SignInIllustration'));
const SignInApp = lazyWithRetry(() => import('views/Authentication/SignIn/SignInBasic'));
const SignUp = lazyWithRetry(() => import('views/Authentication/SignUp/SignUpBasic'));
import Unauthorized from './views/Applications/DataTables/index';
const UpdateEvent = lazyWithRetry(() => import('views/Dashboard/Dashboard/Event/UpdateEvent'));
const QuickStartProduction = lazyWithRetry(
  () => import('views/Dashboard/Dashboard/Production/QuickStartProduction')
);
import { useSelector } from 'react-redux';
const VerifyEmailConsumer = lazyWithRetry(
  () => import('views/Authentication/SignUp/VerifyEmailConsumer')
);
const SignInConsumer = lazyWithRetry(() => import('views/Authentication/SignIn/SignInConsumer'));
// NOTE: removed dead import of the orphan, broken `SignUpConsumer` view (never referenced;
// the real consumer signup is `ConsumerSignUp` via routes/config.ts). It was tree-shaken while a
// static import but surfaced a pre-existing JSX syntax error once forced into its own lazy chunk.
import AdminConsumerLayout from 'layouts/AdminConsumer';

const ImpactDashboard = lazyWithRetry(() => import('views/Dashboard/ImpactDashboard'));
const ConsumerEducationDashboard = lazyWithRetry(
  () => import('views/Dashboard/EducationDashboard')
);

const CarbonJourney = lazyWithRetry(() => import('views/Dashboard/CarbonJourney'));
const ConsumerProfile = lazyWithRetry(() => import('views/Dashboard/ConsumerProfile'));
import { routeConfig } from './routes/config';
import SubscriptionRequired from './utils/protections/SubscriptionRequired';
const DashboardPricing = lazyWithRetry(() => import('views/Dashboard/Dashboard/Pricing'));
const StripeSuccessRedirect = lazyWithRetry(
  () => import('views/Dashboard/Dashboard/Subscription/StripeSuccessRedirect')
);
const UnifiedSubscriptionDashboard = lazyWithRetry(
  () => import('views/Dashboard/UnifiedSubscription')
);
import NoSubscriptionRedirect from './utils/protections/NoSubscriptionRedirect';
import { usePointsStore } from './store/pointsStore';
const FieldNotesInbox = lazyWithRetry(() => import('views/Dashboard/FieldNotes'));
const ProducerEducationDashboard = lazyWithRetry(() => import('views/Dashboard/Education'));
const EducationTopicDetail = lazyWithRetry(
  () => import('views/Dashboard/Education/EducationTopicDetail')
);
const EducationFAQ = lazyWithRetry(() => import('views/Dashboard/Education/EducationFAQ'));
import { useGetCsrfTokenQuery } from './store/api/baseApi';
const GoogleAuthCallback = lazyWithRetry(() => import('views/Authentication/GoogleAuthCallback'));
const CertifierReview = lazyWithRetry(() => import('views/CertifierReview/CertifierReview'));
const BuyerReview = lazyWithRetry(() => import('views/BuyerReview/BuyerReview'));
const ConfirmEmailChange = lazyWithRetry(() => import('views/Authentication/ConfirmEmailChange'));
const AcceptInvitation = lazyWithRetry(
  () => import('views/Authentication/Invitation/AcceptInvitation')
);
const SetupPassword = lazyWithRetry(() => import('views/Authentication/Invitation/SetupPassword'));
import { ErrorBoundary } from 'react-error-boundary';
import * as Sentry from '@sentry/react';
const ChangePassword = lazyWithRetry(() => import('views/Settings/ChangePassword'));
import { AdminGuard } from 'components/Guards/AdminGuard';
const ConsumerChangePassword = lazyWithRetry(
  () => import('views/Consumer/Settings/ConsumerChangePassword')
);
import RedirectGuard from './utils/RedirectGuard';

// Short, human-readable correlation ID for support lookups (e.g. "K3F9-2A7B").
const generateErrorId = (): string => {
  const raw = (
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  ).padEnd(8, '0');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`.toUpperCase();
};

// Error fallback — consumer-safe. Never leaks raw error.message in production.
// Reports to Sentry with errorId tag so support can correlate user reports to traces.
const ErrorFallback = ({
  error,
  resetErrorBoundary
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => {
  const [errorId] = useState(generateErrorId);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorId, surface: 'app_error_boundary' }
    });
  }, [error, errorId]);

  return (
    <div
      role="alert"
      style={{
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#f7fafc',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
      <div
        aria-hidden="true"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#e6f4ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2E7D32"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 style={{ color: '#2d3748', marginBottom: '12px', fontSize: '20px', fontWeight: 600 }}>
        We hit a snag loading this page
      </h2>
      <p style={{ color: '#718096', marginBottom: '24px', maxWidth: '420px', lineHeight: 1.5 }}>
        Our team has been notified automatically. Try again in a moment, or refresh the page.
      </p>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: '12px 28px',
          backgroundColor: '#388E3C',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '15px'
        }}>
        Try again
      </button>
      <p style={{ marginTop: '24px', color: '#a0aec0', fontSize: '12px' }}>
        Reference ID: <code style={{ fontFamily: 'monospace' }}>{errorId}</code>
      </p>
      {isDev && (
        <details style={{ marginTop: '16px', color: '#a0aec0', fontSize: '12px', maxWidth: '90%' }}>
          <summary style={{ cursor: 'pointer' }}>Developer details (dev only)</summary>
          <pre style={{ marginTop: '8px', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        </details>
      )}
    </div>
  );
};

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

        {/* Certifier review link — ANONYMOUS by design. A certification reviewer
            opens this with no Trazo account; the token in the URL is the credential.
            Must stay outside CheckAuth so it never redirects to login. */}
        <Route path="/certifier-review/:token" element={<CertifierReview />} />
        <Route path="/buyer-review/:token" element={<BuyerReview />} />

        {/* OAuth Callback - must be accessible from localhost:3000 */}
        <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

        {/* Legal Pages - Redirect to landing page (canonical source) */}
        <Route path="/terms" element={<RedirectToTerms />} />
        <Route path="/privacy" element={<RedirectToPrivacy />} />

        {/* Invitation Routes - Available without authentication */}
        {/* The email-change link (OV-SEC-C03). Outside the signed-out-only routes: the link is
            often opened in a browser that is still signed in, and those would redirect it away
            before it could confirm. */}
        <Route element={<AuthLayout plainNav />}>
          <Route path="/auth/confirm-email-change" element={<ConfirmEmailChange />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/invitation/:invitationCode" element={<AcceptInvitation />} />
          <Route path="/invitation/:invitationCode/setup" element={<SetupPassword />} />
        </Route>

        <Route element={<CheckAuth />}>
          {/* Public Routes */}
          <Route element={<NotAuthenticated />}>
            {/* `plainNav` — the 2026 centered-card shell (logo in flow, shared canvas, flex
                column). Scoped to the four pages actually redesigned for it. `/pricing` and
                `/invitation/*` mount this same layout and still expect the fixed navbar. */}
            <Route element={<AuthLayout plainNav />}>
              <Route path={config?.auth.path}>
                <Route path="signin" element={config?.auth.signin && <config.auth.signin />} />
                <Route path="signup" element={config?.auth.signup && <config.auth.signup />} />
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
            {/* verifyemail deliberately stays on the DEFAULT shell: it was never converted, and
                it is built for the fixed navbar — `mt="8.5rem"` exists purely to clear it, and
                its root carries `alignSelf="center"`, which is inert under a block parent but
                shrink-wraps the page under a flex-column one. Convert the page, then move it. */}
            <Route element={<AuthLayout />}>
              <Route path={config?.auth.path}>
                <Route
                  path="verifyemail"
                  element={config?.auth.verifyEmail && <config.auth.verifyEmail />}
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
                {/* Account pages belong to the USER, not to a company. They stayed inside
                    <SubscriptionRequired> until 2026-08-24, which meant a producer with no
                    company (or a company between subscriptions) was bounced to /pricing when
                    they opened their own profile — the second half of the select-company
                    lock-out, alongside the onboarding redirect in Authenticated.jsx. */}
                <Route path="profile" element={<ProfileUser />} />
                {/* Your OWN password, so every member may change it: under AdminGuard a Farm
                    Manager or Viewer who pressed "Change password" on their profile got "Access
                    restricted" (2026-11-10). The API acts on request.user only. */}
                <Route path="settings/change-password" element={<ChangePassword />} />
                <Route
                  path="pricing"
                  element={
                    <AdminGuard>
                      <DashboardPricing />
                    </AdminGuard>
                  }
                />
                <Route
                  path="subscription"
                  element={
                    <AdminGuard>
                      <UnifiedSubscriptionDashboard />
                    </AdminGuard>
                  }
                />
                <Route
                  path="stripe-success"
                  element={
                    <AdminGuard>
                      <StripeSuccessRedirect />
                    </AdminGuard>
                  }
                />

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
                  <Route path="farm/add" element={<AddFarm />} />
                  <Route
                    path="farm/:farmId"
                    element={
                      <NoSubscriptionRedirect>
                        <Suspense>
                          <DashboardView />
                        </Suspense>
                      </NoSubscriptionRedirect>
                    }
                  />
                  <Route path="farm/:farmId/change" element={<AddFarm isEdit={true} />} />
                  <Route path="farm/:farmId/profile" element={<ProfileFarm />} />
                  <Route path="farm/:farmId/parcel/add" element={<AddParcel />} />
                  <Route path="farm/:farmId/parcel/:parcelId" element={<ParcelView />} />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/change"
                    element={<AddParcel isEdit={true} />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/application"
                    element={<ParcelApplicationWizard />}
                  />
                  <Route path="farm/:farmId/buyer" element={<BuyerPage />} />
                  <Route path="farm/:farmId/parcel/:parcelId/profile" element={<ProfileParcel />} />
                  <Route path="farm/:farmId/parcel/:parcelId/event/add" element={<UpdateEvent />} />
                  {/* <Route
                  path="farm/:farmId/parcel/:parcelId/event/:eventId"
                  element={<DetailEvent />}
                /> */}
                  <Route
                    path="farm/:farmId/parcel/:parcelId/event/:eventId/change"
                    element={<UpdateEvent isEdit={true} />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/add"
                    element={<QuickStartProduction />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/:productionId"
                    element={<ProfileProduction />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/:productionId/change"
                    element={<QuickStartProduction isEdit={true} />}
                  />
                  <Route
                    path="farm/:farmId/parcel/:parcelId/production/:productionId/finish"
                    element={<FinishProduction />}
                  />
                  {/* Guided OSP (WS-2.4): module list is the landing; the six-section
                      narrative editor is demoted to /osp/narratives. */}
                  <Route path="farm/:farmId/osp" element={<OSPModuleListPage />} />
                  <Route path="farm/:farmId/osp/module/:moduleKey" element={<OSPModuleWizard />} />
                  <Route path="farm/:farmId/osp/narratives" element={<OSPView />} />
                  <Route path="farm/:farmId/documents" element={<DocumentsPage />} />
                  <Route path="farm/:farmId/traceback" element={<TracebackPage />} />
                  <Route path="farm/:farmId/activities" element={<ActivitiesPage />} />
                  {/* WS-7 October cuts: commercial/scans/reviews fold into the farm
                      home + Buyer Page; routes stay as redirects so old links land well. */}
                  <Route path="farm/:farmId/commercial" element={<RedirectToFarmHome />} />
                  <Route path="farm/:farmId/scans" element={<RedirectToBuyer />} />
                  <Route path="farm/:farmId/reviews" element={<RedirectToFarmHome />} />
                  <Route
                    path="settings"
                    element={
                      <AdminGuard>
                        <SettingsView />
                      </AdminGuard>
                    }
                  />
                  <Route path="farm/:farmId/transparency" element={<RedirectToFarmHome />} />
                  <Route path="field-notes" element={<FieldNotesInbox />} />
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
                <Route
                  path="/methodology"
                  element={
                    <Suspense fallback={<div />}>
                      <MethodologyPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route element={<Authenticated allowedRoles={config.protected.roles} />}>
                <Route
                  path={config.protected.path}
                  element={
                    <RedirectGuard>
                      <AdminConsumerLayout />
                    </RedirectGuard>
                  }>
                  {/* Consumer routes */}
                  <Route index element={<Navigate to="impact" replace />} />
                  <Route path="impact" element={<ImpactDashboard />} />
                  <Route path="education" element={<ConsumerEducationDashboard />} />

                  <Route path="journey" element={<CarbonJourney />} />
                  {/* WS-7: journey scan/review subpages cut; consumer-subtree buttons
                      still point here until the November demolition — bounce home. */}
                  <Route
                    path="journey/scans"
                    element={<Navigate to="/admin/dashboard/journey" replace />}
                  />
                  <Route
                    path="journey/reviews"
                    element={<Navigate to="/admin/dashboard/journey" replace />}
                  />

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

          {/* Default redirect based on subdomain. Render nothing until the
              subdomain is detected — on first render `subdomain` is '' and
              the per-subdomain route blocks above don't exist yet, so this
              wildcard would otherwise hijack ANY deep link (e.g.
              /methodology) and bounce it to the default redirect. */}
          <Route
            path="*"
            element={
              subdomain ? <Navigate to={config?.defaultRedirect || '/pricing'} replace /> : null
            }
          />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
