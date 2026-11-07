/**
 * On a filed plan, adding an input and telling the certifier are one step, never two options
 * (2026-11-07).
 *
 * Adding a material to an active plan IS the change § 205.400(f)(2) says the certifier must hear
 * about (`ApprovedInputChangeLog` records each add with the certifier's reference). The copy said
 * "Add it, or record the change with your certifier" and "a change to notify your certifier, or
 * to add to the plan", which reads as if adding it alone were enough. And the drift detector
 * clears a finding only when the input is on the plan or its name is confirmed; it never reads a
 * change notification, so "or record the notification" named a way to clear that does not exist.
 *
 * Draft plans are different and keep "Add it before you submit": nothing is filed yet.
 */
import { describe, expect, it } from 'vitest';

import EN from '../../../i18n/lang/en-US.json';
import ES from '../../../i18n/lang/es-419.json';

const en = EN as Record<string, string>;
const es = ES as Record<string, string>;

const FILED_PLAN_KEYS = [
  'drift.banner.body',
  'drift.banner.nextStep',
  'drift.reason.omri_not_in_osp',
  'drift.reason.wsda_not_in_osp',
  'drift.reason.nl_not_in_osp'
];

const ADD_OR_NOTIFY =
  /add it, or|, or to add|add the input to your plan, or|o que agregas|agrégala o registra|agrega el insumo a tu plan, o/i;

describe('a filed plan: add and notify, never add or notify', () => {
  it.each(FILED_PLAN_KEYS)('%s offers no either/or', (key) => {
    expect(en[key]).toBeTruthy();
    expect(es[key]).toBeTruthy();
    expect(en[key]).not.toMatch(ADD_OR_NOTIFY);
    expect(es[key]).not.toMatch(ADD_OR_NOTIFY);
  });

  it('the next step pairs adding with the notification', () => {
    expect(en['drift.banner.nextStep']).toMatch(
      /add the input to your plan and record the change notification/
    );
    expect(es['drift.banner.nextStep']).toMatch(
      /agrega el insumo a tu plan y registra la notificación/
    );
  });

  it('the banner says the change goes to the certifier', () => {
    expect(en['drift.banner.body']).toMatch(
      /add it, and notify your certifier under 7 CFR 205\.400\(f\)\(2\)/
    );
    expect(es['drift.banner.body']).toMatch(/agrégalo y notifica a tu certificador/);
  });

  it('draft plans still say add it before you submit', () => {
    expect(en['drift.reason.provisional.wsda_not_in_osp']).toMatch(/Add it before you submit/);
  });
});
