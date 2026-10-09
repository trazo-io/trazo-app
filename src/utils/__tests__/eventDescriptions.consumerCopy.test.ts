/**
 * Phase 2 / C9 + C10 — every event a shopper can see must say something specific.
 *
 * The failure mode these guard against is not a crash, it is blandness: an event falls out
 * of its family branch and gets the all-purpose default paragraph ("This farming practice
 * contributes to sustainable agriculture and food quality"). The page still renders, so
 * nothing looks broken — it just stops being worth scanning, on the one surface a buyer
 * actually looks at.
 *
 * C9: production sub-types PO / PH / FP / CM had no copy and fell to the family default.
 * C10: a chemical event with no `commercial_name` fell out of the chemical branch entirely,
 *      which hit the most consumer-relevant event type in the product.
 */
import { describe, it, expect } from 'vitest';
import { getConsumerEventDescription } from '../eventDescriptions';
import { CONSUMER_DESCRIPTION_ES as esDictionary } from '../eventDescriptions.es';

/** The catch-all copy an event gets when no branch claims it. */
const GENERIC_IMPACT_FRAGMENT = 'contributes to sustainable agriculture';
const GENERIC_PRODUCTION_IMPACT = 'This agricultural practice follows sustainable farming methods';

describe('C9 — production sub-types have dedicated consumer copy', () => {
  const subtypes: Array<[string, RegExp]> = [
    ['PO', /bee|bloom/i],
    ['PH', /hulled|dried|cooled/i],
    // 2026-08-01: FP impact was re-voiced away from restating the description; it now names
    // the stake rather than repeating "frost".
    // 2026-09-16: "no fruit" -> "no crop". The copy is crop-blind and was asserting a crop form
    // the record does not establish (carrot lots read "no fruit from this block"). The stake is
    // unchanged; only the noun moved.
    ['FP', /frost|cold night|no crop from this block/i],
    ['CM', /leaves/i],
    // 2026-08-01: MO copy was re-voiced (short = what happened, impact = why it matters), so
    // the impact line now talks about mechanical weed control rather than repeating "orchard
    // floor" from the description. Widened to the concept, not the old wording.
    ['MO', /orchard floor|mow|mown|weed|ground cover/i]
  ];

  for (const [code, expected] of subtypes) {
    it(`${code} gets specific copy, not the family default`, () => {
      const info = getConsumerEventDescription('', {
        event_type: 1,
        type: 'production',
        production_type: code,
        date: '2026-05-01'
      });

      expect(info.consumerImpact).not.toContain(GENERIC_PRODUCTION_IMPACT);
      expect(info.consumerImpact).toMatch(expected);
      expect(info.sustainabilityBenefit).toBeTruthy();
    });
  }

  it('flame weeding tells the no-herbicide story, plain mowing does not', () => {
    const flame = getConsumerEventDescription('', {
      event_type: 1,
      type: 'production',
      production_type: 'MO',
      floor_management_type: 'flame_weed',
      date: '2026-05-01'
    });
    const mow = getConsumerEventDescription('', {
      event_type: 1,
      type: 'production',
      production_type: 'MO',
      floor_management_type: 'mow',
      date: '2026-05-01'
    });

    // P1b (2026-10-06): the method, not a no-chemicals claim the record does not establish.
    expect(flame.consumerImpact).toMatch(/flamed with a propane burner/i);
    expect(mow.consumerImpact).not.toMatch(/flamed/i);
  });
});

describe('C10 — a chemical event without a product name still reads as a chemical event', () => {
  const nameless = {
    event_type: 2,
    type: 'chemical',
    chemical_type: 'FU',
    organic_approved: 'omri_listed',
    date: '2026-03-01'
  };

  it('does not fall through to the all-purpose default', () => {
    const info = getConsumerEventDescription('', nameless);
    expect(info.consumerImpact).not.toContain(GENERIC_IMPACT_FRAGMENT);
  });

  it('titles itself from the chemical type', () => {
    expect(getConsumerEventDescription('', nameless).title).toBe('Disease control application');
    expect(getConsumerEventDescription('', { ...nameless, chemical_type: 'FE' }).title).toBe(
      'Fertilizer application'
    );
    expect(getConsumerEventDescription('', { ...nameless, chemical_type: 'PE' }).title).toBe(
      'Pest control application'
    );
    expect(getConsumerEventDescription('', { ...nameless, chemical_type: 'HE' }).title).toBe(
      'Weed control application'
    );
  });

  it('does not duplicate the purpose in a generic title', () => {
    // "Fertilizer application — soil nutrition" says the same thing twice.
    expect(
      getConsumerEventDescription('', { ...nameless, chemical_type: 'FE' }).title
    ).not.toContain('—');
  });

  it('still prefers a real product name and keeps the purpose suffix', () => {
    const named = getConsumerEventDescription('', {
      ...nameless,
      commercial_name: 'Kumulus DF'
    });
    expect(named.title).toContain('Kumulus DF');
    // Separator is the middle dot, not an em dash (2026-08-01): the em dash reads as
    // machine-written, and '·' is already the separator idiom elsewhere on the card.
    expect(named.title).toContain('·');
    expect(named.title).not.toContain('—');
  });
});

describe('Spanish coverage for the new copy', () => {
  it('translates every generic chemical title', () => {
    for (const title of [
      'Fertilizer application',
      'Pest control application',
      'Disease control application',
      'Weed control application',
      'Crop input application'
    ]) {
      expect(esDictionary[title], `missing ES for "${title}"`).toBeTruthy();
    }
  });

  it('translates the impact and benefit copy for every new sub-type', () => {
    for (const code of ['PO', 'PH', 'FP', 'CM', 'MO']) {
      const info = getConsumerEventDescription('', {
        event_type: 1,
        type: 'production',
        production_type: code,
        date: '2026-05-01'
      });
      expect(
        esDictionary[info.consumerImpact],
        `missing ES consumerImpact for ${code}: "${info.consumerImpact}"`
      ).toBeTruthy();
      expect(
        esDictionary[info.sustainabilityBenefit],
        `missing ES sustainabilityBenefit for ${code}: "${info.sustainabilityBenefit}"`
      ).toBeTruthy();
    }
  });
});
