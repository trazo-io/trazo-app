import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://98f2ff40bad8f525fcb99637c3155e38@o4511029427634176.ingest.us.sentry.io/4511029452931072',
  // `import.meta.env.MODE` is "production" in ANY Vite production build, including a Netlify
  // deploy preview — so every PR preview was reporting its errors to Sentry tagged
  // `production`, mixed in with real ones. VITE_DEPLOY_CONTEXT is re-exported from Netlify's
  // CONTEXT in netlify.toml (Vite only exposes VITE_-prefixed vars), so previews now land in
  // their own environment. Falls back to MODE when unset, which is the production build.
  environment: (import.meta.env.VITE_DEPLOY_CONTEXT as string) || import.meta.env.MODE,
  sendDefaultPii: true,
  enabled: import.meta.env.PROD
});

export default Sentry;
