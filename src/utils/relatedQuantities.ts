/**
 * Amount applied, area treated and application rate on an input application state one fact
 * twice: amount = rate x area. A correction changes ONE field, on purpose, so correcting the rate
 * (50 -> 45 lb/acre) left 300 lb over 6 acres on the record and nothing said the record no longer
 * agreed with itself (pilot rehearsal, 2026-10-17).
 *
 * The correction form never changes the other two values; which one is wrong is the operator's to
 * say. It shows them, and whether they agree with the value being typed. The unit arithmetic is
 * the backend's (`history.amendments.application_quantities` sends `factor`, so that
 * amount = rate x area x factor in the amount's own unit); this file only multiplies.
 */

export const RELATED_QUANTITY_FIELDS = [
  'volume_numeric',
  'area_numeric',
  'application_rate'
] as const;

export interface RelatedQuantityField {
  name: string;
  label: string;
  value: string | null;
  unit: string;
}

export interface RelatedQuantities {
  fields: RelatedQuantityField[];
  /** amount = rate x area x factor; null when the units cannot be compared. */
  factor: number | null;
  tolerance: number;
  computed_amount: string | null;
  agrees: boolean | null;
}

export interface QuantityCheck {
  /** null: not enough recorded, or units that cannot be compared. Never reported as a problem. */
  agrees: boolean | null;
  amount: number | null;
  /** rate x area, in the amount's unit. */
  expected: number | null;
  values: Record<string, { value: number | null; unit: string }>;
}

const toNumber = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

/** Whether amount, area and rate agree, with `override` standing in for the field being corrected. */
export function checkRelatedQuantities(
  related: RelatedQuantities | null | undefined,
  override?: { name: string; value: string } | null
): QuantityCheck | null {
  if (!related) return null;
  const values: QuantityCheck['values'] = {};
  for (const f of related.fields) {
    const raw =
      override && override.name === f.name && override.value.trim() ? override.value : f.value;
    values[f.name] = { value: toNumber(raw), unit: f.unit };
  }
  const amount = values.volume_numeric?.value ?? null;
  const area = values.area_numeric?.value ?? null;
  const rate = values.application_rate?.value ?? null;
  if (related.factor === null || rate === null || area === null) {
    return { agrees: null, amount, expected: null, values };
  }
  const expected = rate * area * related.factor;
  if (amount === null || amount <= 0 || expected <= 0) {
    return { agrees: null, amount, expected, values };
  }
  return {
    agrees: Math.abs(expected - amount) <= amount * related.tolerance,
    amount,
    expected,
    values
  };
}

/** 270, 0.375, 1066.5 — no float noise, at most 3 decimals. */
export const formatQuantity = (n: number): string => String(Number(n.toFixed(3)));
