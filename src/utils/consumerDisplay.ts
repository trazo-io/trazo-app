/**
 * Display helpers for the consumer QR page (Phase 1 claim-safety work).
 * Kept dependency-free so unit tests don't have to load component trees.
 */

/**
 * Fields the backend REMOVES before an event reaches an anonymous consumer.
 *
 * Mirrors `PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS` plus the supplier-chain
 * and worker-name fields that block is paired with (history/serializers.py). Keep the two
 * lists in step: this one exists so a surface that builds an event from a source OTHER than
 * the public API — the producer's "how consumers will see this" preview, which reads raw
 * wizard form data — can show the farmer what a shopper actually gets.
 *
 * Why a list rather than trusting the registry `surfaces`: the card has legacy render paths
 * (`getEventFieldDisplay`) that read `event.rei_hours` and friends directly, bypassing
 * `surfaces` entirely. On the real consumer page those props are simply absent because the
 * server stripped them; anywhere else they are live. Stripping at the source closes both.
 */
export const CERTIFIER_ONLY_EVENT_FIELDS: readonly string[] = [
  // Worker protection / EPA enforcement (mirrors the backend tuple)
  'rei_hours',
  'phi_days',
  'restricted_use_pesticide',
  'epa_registration_number',
  'ca_dpr_permit_number',
  'ca_dpr_permit_county',
  'ca_dpr_permit_expires',
  'applicator_name',
  'applicator_certification',
  'buffer_zone_meters',
  // Agronomic audit detail
  'concentration',
  'volume',
  'volume_unit',
  'volume_applied', // derived from `volume` on the form path only
  'nitrogen_percentage',
  'phosphorus_percentage',
  'potassium_percentage',
  'micronutrient_rate',
  'micronutrient_rate_unit',
  'is_fertigation',
  // Commercial supplier chain (7 CFR 205.103 traceability — certifier PDF only)
  'supplier_name',
  'purchase_date',
  'purchase_invoice',
  'quantity_purchased',
  'quantity_purchased_unit',
  'seed_supplier_name',
  'seed_purchase_date',
  'seed_purchase_invoice',
  'seed_search_attempts',
  // Worker names and internal operator references
  'cleaned_by',
  'cleaning_protocol_reference',
  'sanitizer_nop_reference',
  // Internal compliance findings and raw blobs
  'drift_warning',
  'test_results',
  // Farmer-typed "Verified" on a certification event. Stripped from the public payload
  // 2026-08-01 (ECGT/FTC self-created-label risk); it has to be stripped here too or the
  // producer's "how consumers will see this" preview shows a field shoppers never get.
  'verification_status',
  // Internal anti-gaming verdict from the Vision check (`not_agricultural` / `ai_generated` /
  // `stock_photo`). Stripped from the public payload 2026-08-03; the mirror was missed, which
  // is exactly the drift this file's parity test exists to catch (it has been failing since).
  //
  // It is moderation state ABOUT the farmer, so a preview headed "how consumers will see this"
  // must not show it — that would tell a grower shoppers are being shown Trazo's accusation.
  // The producer still sees it where it belongs: `EventDetailsModal` renders the flag as a
  // warning with "replace with a field photo", reading the event directly rather than through
  // `toConsumerVisibleEvent`, so this strip does not touch it.
  'photo_content_flag'
];

/**
 * Return a copy of `event` with everything a consumer never receives removed.
 *
 * Use on any surface that renders the consumer card from data that did NOT come through
 * the public API. Today that is `EventPreviewModal`, whose heading promises "How consumers
 * will see this event" while it renders unstripped wizard form data — so growers were shown
 * REI, PHI, applicator name and EPA registration number as though shoppers saw them.
 */
export const toConsumerVisibleEvent = <T extends Record<string, unknown>>(event: T): T => {
  if (!event || typeof event !== 'object') return event;
  const out = { ...event } as Record<string, unknown>;
  for (const field of CERTIFIER_ONLY_EVENT_FIELDS) {
    delete out[field];
  }
  // The same fields can ride in the free-form extra_data blob; the backend sanitizes that
  // separately (_sanitize_extra_data_for_public), so mirror it here.
  const extra = out.extra_data;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    const cleanedExtra = { ...(extra as Record<string, unknown>) };
    for (const field of CERTIFIER_ONLY_EVENT_FIELDS) {
      delete cleanedExtra[field];
    }
    out.extra_data = cleanedExtra;
  }
  return out as T;
};

/**
 * Worker privacy mask for the public QR page. "Ana Torres" → "Farm team (A.T.)".
 * Full names stay visible in the producer app; only the consumer surface masks.
 */
export const maskPerformerName = (name: string): string => {
  const trimmed = name.trim();
  // Idempotency: the backend (PublicHistorySerializer._public_performer) now
  // masks server-side; re-masking "Farm team (A.T.)" would garble the
  // initials to "(F.T.)".
  if (/^farm team\b/i.test(trimmed)) return trimmed;
  const initials = trimmed
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('.');
  return initials ? `Farm team (${initials}.)` : 'Farm team';
};

/**
 * Format a harvest date for consumer display ("Mar 18, 2026").
 *
 * Date-only strings ("2026-03-18") are parsed as LOCAL dates. `new Date()`
 * parses them as UTC midnight, which renders as the previous day in any
 * timezone west of UTC — a real off-by-one on harvest dates.
 * Returns null for missing/invalid input (callers hide the date rather
 * than show a placeholder).
 */
/**
 * The date this lot was actually HARVESTED, taken from the harvest records themselves.
 *
 * 🔴 2026-08-20 — the hero and the HARVEST pillar both read `production_period.end`
 * (equivalently `finish_date`), which is the day the grower CLOSED the season in Trazo, and
 * labelled it "Harvested {date}". On a real WA Honeycrisp block the two passes came off on
 * 12 and 19 September and the record was closed on the 22nd, so the page told buyers the
 * fruit was harvested on a day nothing was picked.
 *
 * That is not cosmetic. Harvest date is one of the two facts the HARVEST pillar exists to
 * give a produce buyer (the other is the lot number), it drives shelf-life and storage
 * decisions, and it is the field a buyer cross-checks against a packing record — where a
 * three-day drift reads as a traceability failure in Trazo's own data.
 *
 * The harvest events carry the truth and are already on the payload. Prefer them; fall back
 * to the close date only when a lot has no harvest record at all.
 *
 * Multi-pass harvests are the norm in tree fruit and citrus (spot-picking for colour, three
 * or four picks on lemons), so the range is returned when the passes span more than a day —
 * a single date would silently pick one pass and hide the rest.
 */
/**
 * A date range for consumers, with the year printed once when both ends share it.
 *
 * Locale-aware, unlike the copy of this logic that lived inside ConsumerEventCard and
 * hardcoded `'en-US'` — which put "Apr 12 - Sep 15, 2025" on a Spanish shopper's summary card
 * while every other date on the same page read "12 abr 2025".
 *
 * Both ends are parsed as LOCAL dates when they are calendar-date strings: "2025-09-12" via
 * `new Date()` is UTC midnight, which renders as the 11th everywhere in the US.
 */
export const formatDateRangeForConsumer = (
  startDate?: string | null,
  endDate?: string | null,
  locale: string = 'en-US'
): string | null => {
  if (!startDate || !endDate) return null;
  const parseLocal = (dateStr: string): Date => {
    if (dateStr.includes('T')) return new Date(dateStr);
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const start = parseLocal(startDate);
  const end = parseLocal(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const loc = locale || 'en-US';
  const dayMonth: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const full: Intl.DateTimeFormatOptions = { ...dayMonth, year: 'numeric' };

  const startText =
    start.getFullYear() === end.getFullYear()
      ? start.toLocaleDateString(loc, dayMonth)
      : start.toLocaleDateString(loc, full);
  return `${startText} – ${end.toLocaleDateString(loc, full)}`;
};

export const resolveHarvestDates = (
  timeline?: Array<{ production_type?: string; type?: string; date?: string | null }> | null,
  fallbackDate?: string | null
): { first: string | null; last: string | null; isRange: boolean } => {
  const harvestDates = (timeline || [])
    .filter((e) => e?.production_type === 'HA' || e?.type === 'HA')
    .map((e) => e?.date)
    .filter((d): d is string => Boolean(d))
    // Sort by INSTANT, not by string. A plain `.sort()` is lexicographic, which only happens
    // to work while every date on the payload carries the same UTC offset — one row written
    // as "2025-09-12T23:00:00-08:00" would sort before "2025-09-13T01:00:00+00:00" despite
    // being the later instant.
    .map((d) => ({ raw: d, at: new Date(d).getTime() }))
    .filter((x) => !Number.isNaN(x.at))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.raw);

  if (!harvestDates.length) {
    return { first: fallbackDate ?? null, last: fallbackDate ?? null, isRange: false };
  }

  const first = harvestDates[0];
  const last = harvestDates[harvestDates.length - 1];
  // Compare the days as the READER will see them. Slicing the ISO string compares UTC days,
  // but every formatter downstream renders in the viewer's local zone, so two passes at
  // 02:00Z and 20:00Z on the same UTC day are one calendar day apart in California — the
  // page would then print a single date for what was actually a two-day pick. This is the
  // calendar-date-as-UTC class that has bitten this codebase before; keep the comparison in
  // the same frame as the render.
  const localDay = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso.slice(0, 10)
      : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  return { first, last, isRange: localDay(first) !== localDay(last) };
};

export const formatHarvestDate = (
  dateStr?: string | null,
  locale: string = 'en-US'
): string | null => {
  if (!dateStr) return null;
  let d: Date;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (dateOnly) {
    d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  } else {
    d = new Date(dateStr);
  }
  if (Number.isNaN(d.getTime())) return null;
  // Locale-aware so a Spanish shopper sees "14 abr 2026", not "Apr 14, 2026".
  return d.toLocaleDateString(locale || 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * US-first unit display for consumer field values: "20 ha" → "49 acres (20 ha)",
 * "30 cm" → "12 in (30 cm)". US shoppers have no reference frame for metric
 * field units; the metric original stays in parentheses for accuracy.
 * Leaves values without a recognized metric unit untouched.
 *
 * ⚠️ THIS FUNCTION MULTIPLIES NUMBERS SHOWN TO CONSUMERS. It is only ever correct if the
 * unit token it receives is the unit the farmer actually recorded. In 2026-07 the chemical
 * block of PublicHistorySerializer served `area_unit: "ha"` for values entered in acres, and
 * this function faithfully turned an 85-acre pesticide application into "210 acres (85 ha)"
 * on the public page. The serializer is fixed (see `_public_unit`), but treat any change here
 * as a change to a published measurement claim.
 *
 * @param value  the already-formatted "<number> <unit>" string from a registry formatter
 * @param locale BCP-47 tag. US customary units are only helpful to US/en audiences; a
 *               Spanish-locale shopper gets the metric original untouched.
 */
/**
 * Parse a metric quantity that may be grouped ("45,000") or use a decimal comma ("2,5").
 * `parseFloat` alone reads "45,000 kg" as 45, which would have understated a harvest by 1000x.
 */
const parseMetricNumber = (raw: string): number | null => {
  const grouped = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw);
  const normalized = grouped ? raw.replace(/,/g, '') : raw.replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
};

export const withUSUnits = (value: unknown, locale?: string): string => {
  const str = String(value ?? '');

  // Metric readers do not want "12 in (30 cm)". Only convert when we have no locale
  // information (legacy call sites) or the audience is English-speaking.
  if (locale && !locale.toLowerCase().startsWith('en')) return str;

  const trimmed = str.trim();

  // Idempotency guard: this function's own output starts with a US unit and carries the
  // original in parentheses. Re-running it on "49 acres (20 ha)" previously matched the
  // trailing "20 ha" fragment and produced "49 acres (49 acres (20 ha))".
  if (/^[\d.,]+\s*(acres?|in|mi|ft|lb|tons?|gal)\b.*\(.*\)\s*$/i.test(trimmed)) return str;

  const match =
    /^(\d+(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)\s*(ha|hectares?|cm|km|m|kg|kgs|kilograms?|t|tonnes?|l|liters?|litres?)\b(.*)$/i.exec(
      trimmed
    );
  if (!match) return str;

  // A trailing remainder means the token was part of a larger expression we do not
  // understand (e.g. "5 m³", "10 m/s"). Converting it would misstate the value.
  const rest = (match[3] || '').trim();
  if (rest) return str;

  const num = parseMetricNumber(match[1]);
  if (num === null) return str;

  const unit = match[2].toLowerCase();
  const round = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

  if (unit === 'ha' || unit.startsWith('hectare')) {
    return `${round(num * 2.47105).toLocaleString()} acres (${trimmed})`;
  }
  if (unit === 'cm') {
    return `${round(num / 2.54)} in (${trimmed})`;
  }
  if (unit === 'km') {
    return `${round(num * 0.621371)} mi (${trimmed})`;
  }
  if (unit === 'm') {
    return `${round(num * 3.28084)} ft (${trimmed})`;
  }
  if (unit === 'kg' || unit === 'kgs' || unit.startsWith('kilogram')) {
    // A US reader does not picture 45,000 kg, and "99,208 lb" is no better. Past ~10 t the
    // graspable unit is tons; below it, pounds.
    if (num >= 10000) {
      return `${round(num * 0.00110231).toLocaleString()} tons (${trimmed})`;
    }
    return `${round(num * 2.20462).toLocaleString()} lb (${trimmed})`;
  }
  if (unit === 't' || unit.startsWith('tonne')) {
    return `${round(num * 1.10231).toLocaleString()} tons (${trimmed})`;
  }
  if (unit === 'l' || unit.startsWith('liter') || unit.startsWith('litre')) {
    return `${round(num * 0.264172).toLocaleString()} gal (${trimmed})`;
  }
  return str;
};

/**
 * "560,000 kg" reads like a database row. Roll large kg quantities up to a unit a person can
 * picture; leave other units untouched.
 *
 * `locale` added 2026-08-01: the batch header read "135 TONNES" on the same page where the
 * harvest event card had just been taught to say "50 tons (45,000 kg)". Two units for the same
 * crop, one screen apart. English readers get short tons; everyone else keeps metric.
 */
export const formatHarvestQuantity = (
  amount: number,
  unit?: string,
  locale?: string
): { value: string; unit: string } => {
  const normalizedUnit = (unit || 'kg').toLowerCase();
  const wantsUS = !locale || locale.toLowerCase().startsWith('en');
  if ((normalizedUnit === 'kg' || normalizedUnit === 'kgs') && amount >= 10000) {
    const big = wantsUS ? amount * 0.00110231 : amount / 1000;
    const rounded = big >= 100 ? Math.round(big) : Math.round(big * 10) / 10;
    return { value: rounded.toLocaleString(), unit: wantsUS ? 'tons' : 'tonnes' };
  }
  if (wantsUS && (normalizedUnit === 'kg' || normalizedUnit === 'kgs')) {
    const lb = amount * 2.20462;
    return {
      value: (lb >= 10 ? Math.round(lb) : Math.round(lb * 10) / 10).toLocaleString(),
      unit: 'lb'
    };
  }
  if (wantsUS && (normalizedUnit === 't' || normalizedUnit.startsWith('tonne'))) {
    const tons = amount * 1.10231;
    return {
      value: (tons >= 100 ? Math.round(tons) : Math.round(tons * 10) / 10).toLocaleString(),
      unit: 'tons'
    };
  }
  return { value: amount.toLocaleString(), unit: unit || 'kg' };
};
