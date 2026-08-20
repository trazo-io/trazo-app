/**
 * A section that RENDERS for a subtype must also POST for that subtype.
 *
 * `applied_scope` and `applied_scope_detail` were rendered by the Yield & Output section for
 * HA, PL and PH, and posted by a payload gate listing only HA and PL. A post-harvest event
 * therefore showed the farmer both inputs, accepted what they typed, and dropped it on save —
 * silently, because nothing downstream expects a value it never receives. The certifier packet
 * prints that locator in its Partial-Area table, so the loss lands on the record an inspector
 * reads, one step removed from where it could be noticed.
 *
 * The two gates are the same decision written twice. This asserts they still say the same
 * thing. A round-trip test cannot catch this class: it writes through the serializer, which
 * is downstream of the payload gate that drops the value.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const TAB = join(
  __dirname,
  '../../../views/Dashboard/Dashboard/components/forms/ProductionTab.jsx'
);

/** Subtype codes named inside a source fragment, e.g. 'HA' / "PL". */
const subtypesIn = (fragment: string): string[] =>
  [...new Set([...fragment.matchAll(/['"]([A-Z]{2})['"]/g)].map((m) => m[1]))].sort();

describe('production form: render gate and payload gate agree', () => {
  const src = readFileSync(TAB, 'utf8');

  it('posts applied_scope for exactly the subtypes that render it', () => {
    // Payload side: the subtype list guarding the key in the submit handler. Anchored on
    // `.includes(data.type)` so a reformat cannot quietly empty the match — an over-permissive
    // regex that finds nothing would make this whole test vacuous, which is the failure mode
    // it exists to prevent elsewhere.
    const payload = /applied_scope:\s*\[([^\]]+)\]\.includes\(data\.type\)/.exec(src);
    expect(
      payload,
      'could not find the applied_scope payload gate — if its shape changed, update this regex ' +
        'rather than deleting the test'
    ).not.toBeNull();
    const posts = subtypesIn(payload![1]);

    // Render side: the section gate that wraps the two inputs.
    const render = /\{\(productionType === '[A-Z]{2}'[^)]*\)\s*&&\s*\(/.exec(
      src.slice(0, src.indexOf('name="applied_scope"'))
    );
    expect(render, 'could not locate the section gate above the applied_scope input').not.toBeNull();
    const renders = subtypesIn(render![0]);

    expect(posts.length, 'the payload gate names no subtypes').toBeGreaterThan(0);
    expect(
      posts,
      `these subtypes render the applied_scope inputs but do not post them: ` +
        `${renders.filter((s) => !posts.includes(s)).join(', ') || '(none)'}`
    ).toEqual(renders);
  });

  /**
   * The same decision, written twice, for the § 205.204 seed block.
   *
   * 🔴 2026-08-19: `isSeedSourced` read `data.type === 'PL' || data.type === 'TR'` while the
   * seed block had been rendering for PL, TR *and* SS since Seed Search shipped. A Seed Search
   * — the activity whose entire purpose is the § 205.204(a)(1) commercial-availability search —
   * therefore showed the grower the allowability basis, the non-GMO status and the
   * nonavailability reason, accepted all three, and dropped them on save. The payload spreads
   * `...data`, so these explicit keys exist only to SUPPRESS values for non-matching subtypes:
   * a gate that is too narrow does not merely fail to add the field, it actively overwrites
   * the grower's answer with `undefined`.
   *
   * The applied_scope case above is field-specific by construction, which is exactly why it
   * did not catch this one. Every new conditional block needs its own case here.
   */
  it('posts the seed block for exactly the subtypes that render it', () => {
    const payload = /const isSeedSourced = \[([^\]]+)\]\.includes\(data\.type\)/.exec(src);
    expect(
      payload,
      'could not find the isSeedSourced payload gate — if its shape changed, update this regex ' +
        'rather than deleting the test'
    ).not.toBeNull();
    const posts = subtypesIn(payload![1]);

    // Render side: the gate wrapping the seed records themselves. The OUTER section also
    // admits IR (it carries the Common OSP § 10 C water source for irrigation), so anchor on
    // the inner gate that wraps the seed inputs, not the outer one.
    const render = /\{\[([^\]]+)\]\.includes\(productionType\) && \(/.exec(
      src.slice(0, src.indexOf('name="seed_nonavailability_reason"'))
    );
    expect(render, 'could not locate the gate above the seed inputs').not.toBeNull();

    const allInnerGates = [
      ...src.matchAll(/\{\[([^\]]+)\]\.includes\(productionType\) && \(/g)
    ];
    const beforeReason = allInnerGates.filter(
      (m) => m.index! < src.indexOf('name="seed_nonavailability_reason"')
    );
    const renders = subtypesIn(beforeReason[beforeReason.length - 1][1]);

    expect(posts.length, 'the payload gate names no subtypes').toBeGreaterThan(0);
    expect(
      posts,
      `these subtypes render the seed inputs but do not post them: ` +
        `${renders.filter((s) => !posts.includes(s)).join(', ') || '(none)'}`
    ).toEqual(renders);
  });
});
