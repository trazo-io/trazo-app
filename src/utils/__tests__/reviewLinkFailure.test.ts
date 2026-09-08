import { describe, expect, it } from 'vitest';
import {
  ReviewLinkHttpError,
  classifyReviewLinkFailure,
  parseReviewLinkResponse
} from '../reviewLinkFailure';

describe('classifyReviewLinkFailure', () => {
  it('treats 404 as the link being gone', () => {
    expect(classifyReviewLinkFailure(new ReviewLinkHttpError(404))).toBe('gone');
  });

  it('treats throttling as temporary, not as a revoked link', () => {
    // The measured case: two requests per page load off a shared 50/hour anonymous bucket, and
    // a certifier's office behind one NAT address.
    expect(classifyReviewLinkFailure(new ReviewLinkHttpError(429))).toBe('temporary');
  });

  it.each([500, 502, 503, 504])('treats a %i as temporary', (status) => {
    expect(classifyReviewLinkFailure(new ReviewLinkHttpError(status))).toBe('temporary');
  });

  it('treats a network or CORS failure as temporary', () => {
    expect(classifyReviewLinkFailure(new TypeError('Failed to fetch'))).toBe('temporary');
  });

  it('treats an unknown rejection as temporary', () => {
    expect(classifyReviewLinkFailure(undefined)).toBe('temporary');
    expect(classifyReviewLinkFailure('boom')).toBe('temporary');
  });

  it('never reports gone without an explicit 404', () => {
    const statuses = [400, 401, 403, 408, 409, 418, 429, 500, 503];
    for (const status of statuses) {
      expect(classifyReviewLinkFailure(new ReviewLinkHttpError(status))).toBe('temporary');
    }
  });
});

describe('parseReviewLinkResponse', () => {
  it('returns the body for a 2xx', async () => {
    const response = { ok: true, status: 200, json: async () => ({ operation_name: 'Test Farm' }) };
    await expect(parseReviewLinkResponse(response as unknown as Response)).resolves.toEqual({
      operation_name: 'Test Farm'
    });
  });

  it('throws a classifiable error carrying the status', async () => {
    const response = { ok: false, status: 429, json: async () => ({}) };
    await expect(parseReviewLinkResponse(response as unknown as Response)).rejects.toBeInstanceOf(
      ReviewLinkHttpError
    );
    try {
      await parseReviewLinkResponse(response as unknown as Response);
    } catch (error) {
      expect(classifyReviewLinkFailure(error)).toBe('temporary');
    }
  });
});
