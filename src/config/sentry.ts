import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://98f2ff40bad8f525fcb99637c3155e38@o4511029427634176.ingest.us.sentry.io/4511029452931072",
  environment: import.meta.env.MODE,
  sendDefaultPii: true,
  enabled: import.meta.env.PROD,
});

export default Sentry;
