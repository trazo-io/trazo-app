/**
 * The field-notes lists page CLIENT-SIDE, and that only works while DRF sends everything.
 *
 * THE TRAP. `fieldnotes/views.py` calls `paginate_queryset`, which answers None because no
 * `DEFAULT_PAGINATION_CLASS` and no `PAGE_SIZE` are configured, so the endpoint returns a bare list
 * of every matching note. The inbox slices that list itself, the way `Activities`, `Documents` and
 * `Buyer` all do.
 *
 * `fieldNoteApi.getFieldNotes` ALSO unwraps a `{results: [...]}` envelope, defensively, and sends no
 * `page` parameter. Put those together and the day anybody sets a global `PAGE_SIZE`, this page
 * silently renders page one of each list with no control to reach the rest, and the "Nothing
 * waiting" empty state gets computed from a partial list. Nothing would raise, nothing would log,
 * and the queue would simply appear to end.
 *
 * So this guard asserts the assumption rather than the code: DRF pagination stays off, OR the slice
 * grows a page parameter. Either is fine; silently having neither is not.
 *
 * It reads the backend by relative path and FAILS rather than skips when the sibling is missing,
 * which is this project's rule: a guard that quietly passes when it cannot see its subject is worse
 * than no guard. CI checks `trazo-back` out as a sibling for exactly this.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '../../../../..');
const BASE_SETTINGS = join(REPO_ROOT, 'trazo-back/backend/settings/base.py');
const API_SLICE = join(__dirname, '../fieldNoteApi.ts');

describe('the field-notes lists can page themselves', () => {
  it('can see the backend, so the assertion below is not vacuous', () => {
    expect(
      existsSync(BASE_SETTINGS),
      `Cannot read ${BASE_SETTINGS}. This guard compares the client's pagination assumption ` +
        `against DRF's settings, so it needs the trazo-back checkout beside trazo-app.`
    ).toBe(true);
  });

  it('DRF sends the whole list, or the slice asks for a page', () => {
    const settings = readFileSync(BASE_SETTINGS, 'utf8');
    // Comments stripped: `PAGE_SIZE` is discussed in prose in this file and in a test's docstring,
    // and a mention is not a setting.
    const code = settings
      .split('\n')
      .map((line) => line.replace(/#.*$/, ''))
      .join('\n');

    const paginates = /DEFAULT_PAGINATION_CLASS/.test(code) || /["']PAGE_SIZE["']\s*:/.test(code);

    if (!paginates) return; // The assumption holds: every matching note is returned.

    // Pagination is on, so the client must be able to walk it.
    //
    // COMMENTS STRIPPED, AND THE PATTERN IS A PARAMS KEY. The first version of this test asked
    // `/\bpage\b/.test(slice)`, which passes on the word "page" appearing in this slice's own
    // prose ("could be paginated later"), so switching pagination on left the guard green. Caught
    // by applying the breaking edit and watching it not fail, which is the only reason it is not
    // still written that way.
    const slice = readFileSync(API_SLICE, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(
      /\bpage\s*[:,]/.test(slice),
      'DRF pagination is now configured, so `getFieldNotes` returns only the first page. The ' +
        'inbox slices client-side and sends no `page` parameter, so the rest of the queue is ' +
        'unreachable and the empty state is computed from a partial list. Either give the query a ' +
        '`page` param and drive it from the pager, or page server-side.'
    ).toBe(true);
  });

  it('still unwraps an envelope, so turning pagination on is not a crash', () => {
    // The defensive `transformResponse` is why the failure above would be SILENT rather than loud,
    // and it is still the right thing to keep: a crash would be better here, but a page that
    // renders half a list is what actually happens, which is what the guard above is for.
    const slice = readFileSync(API_SLICE, 'utf8');
    expect(slice).toMatch(/Array\.isArray\(response\)\s*\?\s*response\s*:\s*response\.results/);
  });
});
