/**
 * The two concentration validators must agree.
 *
 * `components/Forms/ConcentrationValidation.tsx` backs the manual chemical form;
 * `config/eventFieldDefinitions.ts` backs Quick-Add and StandardChemicalForm. The second one
 * carried an integer-only NPK pattern, so the SAME product was accepted in one place and
 * rejected in the other — including the value ChemicalTab now auto-derives from the structured
 * NPK trio. Real fertilizer labels carry decimals (a 2.5-1-1 fish emulsion), and Quick-Add is
 * the path a farmer uses in the field.
 */

import { describe, expect, it } from 'vitest';

import { validateConcentration as quickAddValidate } from '../eventFieldDefinitions';
import { validateConcentration as manualFormValidate } from '../../components/Forms/ConcentrationValidation';

// Real products a farmer reads off the bag. The caps in ConcentrationValidation.tsx used to
// stop at 50% for P and K and rejected the last three outright.
const FERTILIZER_VALUES = [
  '10-10-10', // balanced blend
  '2.5-1-1', // fish emulsion — decimals
  '5-1-1', // fish emulsion
  '0-0-60', // muriate of potash
  '0-0-50', // sulfate of potash
  '11-52-0', // monoammonium phosphate
  '0-46-0', // triple superphosphate
  '16.5-0-0' // calcium nitrate
];

describe('NPK format is judged the same by both validators', () => {
  for (const value of FERTILIZER_VALUES) {
    it(`accepts ${value} in both`, () => {
      expect(quickAddValidate(value, 'FE').isValid, `Quick-Add rejected ${value}`).toBe(true);
      expect(manualFormValidate(value, 'FE').isValid, `manual form rejected ${value}`).toBe(true);
    });
  }

  it('still rejects a non-NPK value for a fertilizer in both', () => {
    expect(quickAddValidate('20%', 'FE').isValid).toBe(false);
    expect(manualFormValidate('20%', 'FE').isValid).toBe(false);
  });

  it('still catches a physically impossible analysis', () => {
    // Widening the caps must not turn the check off: these cannot appear on a real label.
    expect(manualFormValidate('99-99-99', 'FE').isValid).toBe(false);
    expect(manualFormValidate('0-0-90', 'FE').isValid).toBe(false);
  });
});
