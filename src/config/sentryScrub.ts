import type { Breadcrumb, ErrorEvent } from '@sentry/react';

/**
 * What the browser sends to Sentry, and what it must not (overall review 2026-11, OV-SEC-C17).
 *
 * Until 2026-11-11 the browser SDK ran with `sendDefaultPii: true`, so every error carried the
 * user's IP address, and the page address went out whole. Several links carry a bearer token in
 * the query string (password reset, email verification, email change confirmation, invitations),
 * so an error on one of those pages put a working credential into a third party's store.
 *
 * NEVER: send a query string or a fragment. They are dropped from every URL Sentry receives (the
 * page address, navigation breadcrumbs, fetch and XHR breadcrumbs), not filtered by parameter
 * name, because a name list only covers the tokens someone remembered to list.
 *
 * Some credentials sit in the PATH instead: a certifier or buyer review link
 * (`/certifier-review/:token`, a read of one grower's records) and an invitation
 * (`/invitation/:invitationCode`). The app route and the API route share the prefix, so one rule
 * masks both. The backend's access log masks the same segments (`backend/request_log.py`).
 */

const PATH_CREDENTIAL = /(\/(?:certifier-review|buyer-review|invitation)\/)[^/?#]+/g;

export function scrubUrl(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  const cut = url.search(/[?#]/);
  const withoutQuery = cut === -1 ? url : url.slice(0, cut);
  return withoutQuery.replace(PATH_CREDENTIAL, '$1[redacted]');
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request.url = scrubUrl(event.request.url) as string | undefined;
    delete event.request.query_string;
    delete event.request.cookies;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }
  return event;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const data = breadcrumb.data;
  if (!data) return breadcrumb;
  const scrubbed = { ...data };
  for (const key of ['url', 'from', 'to']) {
    if (key in scrubbed) scrubbed[key] = scrubUrl(scrubbed[key]);
  }
  return { ...breadcrumb, data: scrubbed };
}
