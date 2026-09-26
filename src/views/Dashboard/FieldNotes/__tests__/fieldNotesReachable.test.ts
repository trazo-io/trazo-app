/**
 * ORPHANED-FEATURE guard for the field notes inbox.
 *
 * MEASURED in a browser 2026-09-26: the page rendered, `App.tsx` had the route, the API
 * answered, and NOTHING in the sidebar pointed at it. The only way in was typing the URL,
 * which means a crew message could arrive and sit in a queue no operator would ever open.
 * `FieldNotesInbox.test.tsx` was green the whole time, because a render test mounts the
 * component itself and never asks how a person gets to it.
 *
 * Same class as `voiceMounted.test.ts` (a feature sold on six surfaces and mounted nowhere)
 * and `ccof-grower-checklist-alignment` (model + serializer + PDF, no route). The rule that
 * keeps coming back: grep USAGE, not definition.
 *
 * The second half of this file is subtler and it is why the guard reads a flag by name. The
 * sidebar only wraps an entry in a `NavLink` when `isCompanySettings` is set
 * (`Sidebar.tsx:452`); every other top-level entry renders as a bare icon box that expands
 * farms and navigates nowhere. So an entry can be present, correctly named, correctly
 * regexed, visible on screen and still not be a link. That is exactly what the first
 * version of this entry was.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../../..');
const routes = readFileSync(join(SRC, 'routes.tsx'), 'utf8');
const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');

/** The `{ ... }` literal for one route id, so a flag from a neighbouring entry cannot satisfy a match. */
const routeEntry = (id: string) => {
  const start = routes.indexOf(`id: '${id}'`);
  expect(start, `no route entry with id '${id}'`).toBeGreaterThan(-1);
  const end = routes.indexOf('\n  },', start);
  return routes.slice(start, end === -1 ? undefined : end);
};

describe('the field notes inbox is reachable without typing a URL', () => {
  // Read inside each test, not in the describe body: a throw out here is reported as a
  // collection error with "no tests", which is a far quieter signal than a failed assertion.
  it('has a sidebar entry pointing at the page', () => {
    const entry = routeEntry('crewNotes');
    expect(entry).toMatch(/path: '\/dashboard\/field-notes'/);
    expect(entry).toMatch(/layout: '\/admin'/);
  });

  it('renders that entry as an actual link', () => {
    const entry = routeEntry('crewNotes');
    // Without this flag the entry is drawn and does nothing. Verified in a browser: the
    // subscription entry carries it and produces `<a href="/admin/dashboard/subscription">`.
    expect(entry, 'the sidebar only wraps isCompanySettings entries in a NavLink').toMatch(
      /isCompanySettings: true/
    );
    const sidebar = readFileSync(join(SRC, 'components/Sidebar/Sidebar.tsx'), 'utf8');
    expect(sidebar).toMatch(
      /prop\.isCompanySettings \? \(\s*<NavLink to=\{prop\.layout \+ prop\.path\}/
    );
  });

  it('marks itself active on its own URL and on no other', () => {
    const entry = routeEntry('crewNotes');
    const match = /regex: (\/\^.*\$\/)/.exec(entry);
    expect(match, 'no regex on the field notes route').toBeTruthy();
    // eslint-disable-next-line no-eval
    const active: RegExp = eval(match![1]);
    expect(active.test('/admin/dashboard/field-notes')).toBe(true);
    expect(active.test('/admin/dashboard/farm/2/activities')).toBe(false);
    expect(active.test('/admin/dashboard/subscription')).toBe(false);
  });

  it('is wired to a mounted component, not merely imported', () => {
    expect(app).toMatch(/lazyWithRetry\(\(\) => import\('views\/Dashboard\/FieldNotes'\)\)/);
    expect(app).toMatch(/<Route path="field-notes" element=\{<FieldNotesInbox \/>\} \/>/);
  });

  it('shows a translated label in both locales, not the English fallback', () => {
    // The sidebar falls back to `prop.name` when `app.<id>` is missing, so a missing key is
    // invisible in English and reads as untranslated in Spanish.
    const entry = routeEntry('crewNotes');
    const id = /id: '([^']+)'/.exec(entry)![1];
    for (const locale of ['en-US', 'es-419']) {
      const messages = JSON.parse(readFileSync(join(SRC, `i18n/lang/${locale}.json`), 'utf8'));
      expect(messages[`app.${id}`], `app.${id} missing from ${locale}`).toBeTruthy();
    }
  });

  it('does not reuse the event modal own Field Notes label', () => {
    // `app.fieldNotes` is the farmer's observation section on one record
    // (EventDetailsModal.tsx:1085). One string serving two meanings means retitling either
    // surface retitles the other, so the sidebar entry owns its own key.
    expect(routeEntry('crewNotes')).not.toMatch(/id: 'fieldNotes'/);
  });
});

/**
 * What the wizard owes a note it was opened from. All three were MEASURED as missing in a browser
 * on 2026-09-26, with every other test in the tree green, which is the whole reason this block
 * exists: the inbox tests mount the inbox, and nothing asked what the wizard does on arrival.
 */
describe('the wizard answers the note it was opened from', () => {
  const wizard = readFileSync(
    join(SRC, 'views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
    'utf8'
  );

  it('re-fetches the note by id and never trusts the URL for its words', () => {
    // A hand-edited link must not be able to invent what somebody said. Same rule the plan-item
    // path states at its own fetch.
    expect(wizard).toMatch(/searchParams\.get\('field_note'\)/);
    expect(wizard).toMatch(/useGetFieldNoteQuery\(fieldNoteIdFromUrl/);
    // The transcript travels as a UUID, so nothing quotable is in the query string, the browser
    // history or a server access log.
    expect(wizard, 'the words must not be read out of the URL').not.toMatch(
      /searchParams\.get\('(words|transcript|note_text)'\)/
    );
  });

  it('shows which message it is answering on the step the operator lands on', () => {
    // The panel holding the seeded text mounts on the NEXT step, so without this the supervisor
    // was asked for an activity and a date with no sign of which of several messages it was for.
    expect(wizard).toMatch(/events\.fieldNote\.loggingFrom/);
    expect(wizard).toMatch(/events\.fieldNote\.theirWordsYourRecord/);
    // Quoted and rendered, never an input: one person must not be able to edit what another is
    // recorded as having said.
    expect(wizard).toMatch(/activeFieldNote\.words/);
    expect(wizard).not.toMatch(/value=\{activeFieldNote\.words/);
  });

  it('takes back the wizard guessed date on arrival, not only after a parse', () => {
    // A crew message describes work already done, so the step-0 default is a guess. It was cleared
    // only when the parse returned, and the parse happens a step later.
    expect(wizard).toMatch(
      /if \(!activeFieldNote \|\| activeFieldNote\.status !== 'pending'\) return;/
    );
    const arrival = wizard.slice(
      wizard.indexOf("if (!activeFieldNote || activeFieldNote.status !== 'pending') return;")
    );
    expect(arrival.slice(0, arrival.indexOf('}, [activeFieldNote]);'))).toMatch(
      /reclaimGuessedDate\(\)/
    );
  });

  it('sends the link for the server to write, and sends only the id', () => {
    // `perform_create` writes the note link server-side in the same request, mirroring
    // `_fulfil_plan_item`. The client states which note it answered; it never states the outcome.
    expect(wizard).toMatch(/field_note: activeFieldNote\.public_id/);
    expect(wizard).not.toMatch(/field_note_status|note_confirmed/);
  });
});
