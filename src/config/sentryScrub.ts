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
 */

export function stripQueryAndHash(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request.url = stripQueryAndHash(event.request.url) as string | undefined;
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
    if (key in scrubbed) scrubbed[key] = stripQueryAndHash(scrubbed[key]);
  }
  return { ...breadcrumb, data: scrubbed };
}
