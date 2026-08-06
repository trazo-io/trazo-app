/**
 * Canonical US state resolution — the frontend twin of `common/us_states.py`.
 *
 * Contract, matching the backend exactly: an unresolvable value returns `null`,
 * never a state. Matching is strict (exact code or exact full name), because a
 * prefix match would map "Baja California" to CA — the class of guess that let a
 * non-California farm be treated as Californian in the first place.
 *
 * Territories are included because they file under USDA/EPA rules and buy in US
 * customary units. Keep this set in sync with `trazo-back/common/us_states.py`.
 */

export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'VI', name: 'US Virgin Islands' },
  { code: 'GU', name: 'Guam' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'MP', name: 'Northern Mariana Islands' }
];

export const US_STATE_CODES: ReadonlySet<string> = new Set(US_STATES.map((s) => s.code));

const NAME_TO_CODE: ReadonlyMap<string, string> = new Map(
  US_STATES.map((s) => [s.name.toLowerCase(), s.code])
);

/** Canonical 2-letter code for `value`, or null when it does not resolve. */
export const normalizeState = (value?: string | null): string | null => {
  const text = (value ?? '').trim();
  if (!text) return null;

  const upper = text.toUpperCase();
  if (US_STATE_CODES.has(upper)) return upper;

  return NAME_TO_CODE.get(text.toLowerCase()) ?? null;
};

/** True when `value` resolves to `code` (e.g. isState(farm.state, 'CA')). */
export const isState = (value: string | null | undefined, code: string): boolean => {
  const resolved = normalizeState(value);
  return resolved !== null && resolved === normalizeState(code);
};
