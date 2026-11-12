import * as Sentry from '@sentry/react';

import { scrubBreadcrumb, scrubEvent } from './sentryScrub';

Sentry.init({
  dsn: 'https://98f2ff40bad8f525fcb99637c3155e38@o4511029427634176.ingest.us.sentry.io/4511029452931072',
  // `import.meta.env.MODE` is "production" in ANY Vite production build, including a Netlify
  // deploy preview — so every PR preview was reporting its errors to Sentry tagged
  // `production`, mixed in with real ones. VITE_DEPLOY_CONTEXT is re-exported from Netlify's
  // CONTEXT in netlify.toml (Vite only exposes VITE_-prefixed vars), so previews now land in
  // their own environment. Falls back to MODE when unset, which is the production build.
  environment: (import.meta.env.VITE_DEPLOY_CONTEXT as string) || import.meta.env.MODE,
  // NEVER true: since SDK 10.4 this alone decides whether Sentry infers the user's IP address.
  // The privacy policy says the browser sends no IP address and no query strings to Sentry.
  // See ./sentryScrub.ts.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
  enabled: import.meta.env.PROD
});

export default Sentry;
