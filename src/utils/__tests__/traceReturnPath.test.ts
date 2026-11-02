import { describe, expect, it } from 'vitest';

import { traceReturnPath } from '../traceReturnPath';

const FALLBACK = '/admin/dashboard/farm/4/parcel/7/';

describe('traceReturnPath', () => {
  it("returns to this farm's traceback", () => {
    expect(traceReturnPath('/admin/dashboard/farm/4/traceback?sale=12', '4', FALLBACK)).toBe(
      '/admin/dashboard/farm/4/traceback?sale=12'
    );
    expect(traceReturnPath('/admin/dashboard/farm/4/traceback?pick=31', '4', FALLBACK)).toBe(
      '/admin/dashboard/farm/4/traceback?pick=31'
    );
    expect(traceReturnPath('/admin/dashboard/farm/4/traceback', '4', FALLBACK)).toBe(
      '/admin/dashboard/farm/4/traceback'
    );
  });

  it.each([
    ['another farm', '/admin/dashboard/farm/5/traceback?sale=1'],
    ['an absolute URL', 'https://evil.example/admin/dashboard/farm/4/traceback'],
    ['a protocol-relative URL', '//evil.example'],
    ['extra parameters', '/admin/dashboard/farm/4/traceback?sale=1&x=2'],
    ['two anchors', '/admin/dashboard/farm/4/traceback?pick=1&sale=2'],
    ['another parameter name', '/admin/dashboard/farm/4/traceback?season=1'],
    ['another page', '/admin/dashboard/farm/4/documents'],
    ['nothing', null]
  ])('ignores %s', (_label, next) => {
    expect(traceReturnPath(next as string | null, '4', FALLBACK)).toBe(FALLBACK);
  });

  it('ignores a non-numeric farm id rather than building a pattern from it', () => {
    expect(traceReturnPath('/admin/dashboard/farm/.*/traceback', '.*', FALLBACK)).toBe(FALLBACK);
  });
});
