/**
 * A field note reaches the wizard as an ID that gets FETCHED, never as words in the URL.
 *
 * WHY THIS MATTERS MORE THAN THE PLAN-ITEM VERSION OF THE SAME RULE. The plan item is fetched so a
 * hand-edited link cannot invent a practice. Here the stakes are higher on two counts: these words
 * are interpolated into a model prompt and they steer the `event_type` it answers with, so a
 * `?transcript=` parameter would be a prompt-injection vector wearing a link; and they are a crew
 * member's own sentence, which a query string would copy into browser history, the referrer header
 * and every access log between the two.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. NewEvent.jsx is ~4000 lines with no render harness, so this
 * asserts on its SOURCE, the way `voiceMounted.test.ts` guards that voice is reachable at all. A
 * source assertion cannot prove behaviour runs; its job is to fail when a guard is DELETED. The
 * parse floor at the bottom exists because on 2026-09-25 this repo ran 1512 green tests over a
 * version of this same file that did not compile.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';

const NEW_EVENT = join(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
const src = readFileSync(NEW_EVENT, 'utf8');

/** The body of a `{ ... }` block, brace-balanced from a unique opening snippet. */
function blockAfter(snippet: string): string {
  expect(src.split(snippet).length - 1, `snippet is not unique: ${snippet}`).toBe(1);
  const open = src.indexOf('{', src.indexOf(snippet) + snippet.length - 1);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced block for: ${snippet}`);
}

describe('the wizard fetches the note rather than trusting the link', () => {
  it('reads only an id from the URL', () => {
    expect(src).toMatch(/const fieldNoteIdFromUrl = searchParams\.get\('field_note'\)/);
  });

  it('never reads the words, the transcript or a status out of the URL', () => {
    // The breaking edit this exists for: "simplifying" the handoff by passing the text along.
    for (const forbidden of ['transcript', 'words', 'note_status', 'field_note_words']) {
      expect(src).not.toMatch(new RegExp(`searchParams\\.get\\(['"]${forbidden}['"]\\)`));
    }
  });

  it('fetches the note through the api, scoped by the server', () => {
    expect(src).toMatch(/useGetFieldNoteQuery/);
    expect(src).toMatch(/from 'store\/api\/fieldNoteApi'/);
  });

  it('skips the fetch when there is nothing to fetch, and in edit mode', () => {
    expect(src).toMatch(/skip: !fieldNoteIdFromUrl \|\| isEdit/);
  });
});

describe('only a waiting note seeds, and it seeds the held-offer path', () => {
  // NOT at describe scope. `blockAfter` throws when its snippet is gone, and at describe scope that
  // is a COLLECTION error: the whole file vanishes from the run and the report says "9 passed"
  // rather than naming the rule that was removed. A guard has to say what broke.
  const effect = () => blockAfter('if (!activeFieldNote || activeFieldNote.status !== ');

  it('refuses a note that is not waiting', () => {
    // A confirmed or discarded note opening a fresh offer would invite a second record for work
    // that is already logged.
    expect(src).toMatch(/activeFieldNote\.status !== 'pending'/);
  });

  it('hands the words to the seeded path rather than merging them anywhere', () => {
    const seed = src.slice(
      src.indexOf('if (!activeFieldNote'),
      src.indexOf('const activePlanItem')
    );
    expect(seed).toMatch(/setVoiceSeedText\(activeFieldNote\.words\)/);
    // ⛔ Never straight into the form. The seeded path holds the parse as an offer and asks which
    // day the work happened, because the sender is not the person confirming.
    expect(seed).not.toMatch(/setEventFormData/);
    expect(effect().length).toBeGreaterThan(0);
  });

  it('seeds once per note, so the offer can be dismissed', () => {
    // The panel clears the seed when it consumes it, so without the ref the effect would re-seed
    // from the still-present query and the offer could never be got rid of.
    expect(src).toMatch(/seededFromNoteRef/);
    const seed = src.slice(
      src.indexOf('if (!activeFieldNote'),
      src.indexOf('const activePlanItem')
    );
    expect(seed).toMatch(/seededFromNoteRef\.current === activeFieldNote\.public_id/);
  });
});

describe('the save sends one key about the note and nothing else', () => {
  it('sends field_note, and not the words or a status', () => {
    expect(src).toMatch(/field_note: activeFieldNote\.public_id/);
    // The server resolves the note, scopes it to the caller's companies and writes the link inside
    // the request that writes the record. A client that sent a status would be a second writer of a
    // fact the server owns.
    expect(src).not.toMatch(/field_note_status|note_status:|field_note_words/);
  });
});

describe('the file these guards read still compiles', () => {
  it('parses as JSX', () => {
    // MEASURED 2026-09-25: this suite and 1511 others went green over a NewEvent.jsx carrying a
    // SyntaxError, because every assertion above reads the file as a STRING and nothing in the tree
    // imports it. One parse is the cheapest floor under all of them.
    expect(() =>
      parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: false })
    ).not.toThrow();
  });
});
