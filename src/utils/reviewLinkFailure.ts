/**
 * Why a review link did not open — and, crucially, whether we are entitled to say it is gone.
 *
 * 🔴 2026-09-08. Both review pages collapsed EVERY failure into one message,
 * "This link is no longer available … It may have expired or been withdrawn." A 429 from a
 * shared throttle bucket, a 502 during a deploy, a CORS preflight failure against a misconfigured
 * backend URL and a genuine revocation all rendered identically.
 *
 * That is not a cosmetic problem. The audit that found it observed a link failing to open
 * MINUTES AFTER IT WAS CREATED, while the farmer's own dashboard showed it active — and the page
 * told the reviewer it had been withdrawn. The page was asserting a fact about the grower's
 * intent from a transport error.
 *
 * The server tells expired and revoked apart internally and deliberately answers both with 404,
 * so an anonymous caller cannot probe which (see `_resolve_link_or_404`). That design is kept:
 * `gone` still covers expired, revoked and never-existed. What changes is that only a 404 may
 * produce it.
 */

export type ReviewLinkFailure = 'gone' | 'temporary';

/** An HTTP status carried out of `fetch` so the catch block can classify it. */
export class ReviewLinkHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`review link request failed with ${status}`);
    this.name = 'ReviewLinkHttpError';
    this.status = status;
  }
}

/**
 * A 404 is the ONLY answer that means the link is not usable any more. Everything else —
 * throttling, server errors, gateway errors, an aborted or blocked request — is a condition on
 * our side or in transit, and saying "no longer available" for those tells the reviewer
 * something false about the operation that sent it.
 */
export const classifyReviewLinkFailure = (error: unknown): ReviewLinkFailure => {
  if (error instanceof ReviewLinkHttpError) {
    return error.status === 404 ? 'gone' : 'temporary';
  }
  // A network/CORS failure rejects with a plain TypeError and carries no status at all.
  return 'temporary';
};

/** Throws a classifiable error for a non-2xx response; returns the parsed body otherwise. */
export const parseReviewLinkResponse = async (response: Response): Promise<unknown> => {
  if (!response.ok) throw new ReviewLinkHttpError(response.status);
  return response.json();
};
