import { describe, expect, it } from 'vitest';

import { fileNameFromUrl } from '../fileNameFromUrl';

describe('fileNameFromUrl', () => {
  it('drops the signature query string of a signed URL (PR-17-b)', () => {
    expect(
      fileNameFromUrl(
        'https://trazo-media.s3.amazonaws.com/ofpp/ASTRA-TEST-organic-fraud-prevention-plan.pdf' +
          '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA%2F20261017&X-Amz-Signature=abc'
      )
    ).toBe('ASTRA-TEST-organic-fraud-prevention-plan.pdf');
  });

  it('decodes the name and ignores a fragment', () => {
    expect(fileNameFromUrl('/media/ofpp/Plan%20de%20fraude%202026.pdf#page=2')).toBe(
      'Plan de fraude 2026.pdf'
    );
  });

  it('keeps a name that is not valid percent-encoding as it is', () => {
    expect(fileNameFromUrl('/media/ofpp/100%-plan.pdf')).toBe('100%-plan.pdf');
  });

  it('has nothing to say about an empty or path-less value', () => {
    expect(fileNameFromUrl(null)).toBeNull();
    expect(fileNameFromUrl('')).toBeNull();
    expect(fileNameFromUrl('https://example.com/')).toBeNull();
  });
});
