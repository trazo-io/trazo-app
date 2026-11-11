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
  // Who made the application, when it was a hired pest control business (2026-09-05). Same
  // class as `applicator_name`: a trading partner of record and a regulated act attributed
  // to a named party. Stripped server-side; mirrored here so the producer's "how shoppers
  // will see this" preview does not show a business the public page never names.
  'applied_by_pcb',
  'pcb_name',
  'buffer_zone_meters',
  // Agronomic audit detail
  'concentration',
  // "Not on the source record" (OV-FJ-C12): the operator's statements about a spray's paper
  // record, for the farm's own screens and the certifier, never the buyer page.
  'concentration_not_recorded',
  'time_not_recorded',
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
  // receipt FILE link (2026-08-25) — supplier-chain, like the invoice number
  'receipt_document',
  'receipt_document_title',
  // Worker names and internal operator references
  'cleaned_by',
  'cleaning_protocol_reference',
  'sanitizer_nop_reference',
  // Internal compliance findings and raw blobs
  'drift_warning',
  'test_results',
  // The record's own database key — an owner-side identifier a shopper has no use for and
  // the correction sheet keys on. Stripped server-side; mirrored here so the producer's
  // preview does not show a number the public page does not.
  'record_id',
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
  'photo_content_flag',
  // 🔴 Added to the backend tuple 2026-08-31 in the payload/renderer parity sweep, and the
  // mirror was missed again — `test_certifier_only_list_parity` has been red since. Found while
  // fixing the preview's input chip (2026-09-03), on the same modal: the producer's "how
  // shoppers will see this" preview was showing three fields the anonymous payload strips.
  //
  // `block_id` is internal operator data (swept off the consumer card 2026-07-31);
  // `identification_method` is scouting methodology; `shared_with_conventional` is the
  // § 205.272 split-operation signal, whose consumer wording asserts a cleaning that a flag
  // alone does not evidence.
  'block_id',
  'identification_method',
  'shared_with_conventional',
  // Who the farm says identified a pest (2026-10-28, Oscar's decision after the Astra follow-up).
  // It is the grower's own statement of a role, and the buyer page has no way to show that it is
  // one: next to a pest event, "Agronomist" reads as a credential a shopper can lean on, and the
  // plain statement that a pest was identified is enough for them. The certifier still gets the
  // field in the record and the export, where a person can ask for the evidence behind it.
  'identified_by',
  // The private half of the note pair. `observation` publishes in the grower's own words and is
  // labelled as public; `private_note` is where everything else goes. It matters here because
  // EventPreviewModal builds its "how consumers will see this event" card from RAW WIZARD DATA,
  // never through the public API — so without this entry the preview would show the grower their
  // own private note as though a shopper were about to read it.
  'private_note',
  // Input application RATES (2026-11-05). The registry already kept `application_rate` off every
  // consumer surface (chemicalEvent.ts: a shopper cannot read a rate without the label beside
  // it), but the legacy extra_data spellings below were still allow-listed on the public payload.
  // The backend now strips the whole family; mirrored here so the producer's preview agrees.
  'application_rate',
  'application_rate_unit',
  'application_rate_oz_acre',
  'application_rate_range',
  'application_rate_tons_acre',
  'rate_L_ha',
  'rate_fl_oz_acre',
  'rate_g_ha',
  'rate_kg_ha',
  'rate_lbs_acre',
  'rate_oz_acre',
  'solubor_rate_kg_ha',
  'zinc_sulfate_rate_kg_ha',
  'n_applied_lbs_acre'
];

/**
 * Production SUBTYPES the backend withholds from the anonymous payload as WHOLE EVENTS.
 *
 * Mirrors `_CONSUMER_WITHHELD_PRODUCTION_SUBTYPES` in
 * trazo-back/history/services/claim_authority.py — the queryset filter in
 * `PublicHistorySerializer.get_events` drops these before a shopper ever sees them
 * (guard: history/tests/test_consumer_production_subtypes.py; the backend parity test
 * regex-parses THIS object, so keep it a literal). The OWNER still receives them on
 * their own ProfileProduction feed, which is exactly why this mirror exists: the
 * producer preview must say "certifier-only, never on your buyer page" instead of
 * dressing a withheld record up as a consumer card.
 *
 * Values are i18n message ids for the farmer-facing reason.
 */
export const CONSUMER_WITHHELD_PRODUCTION_SUBTYPES: Readonly<Record<string, string>> = {
  BU: 'events.certifierOnly.reason.BU',
  SS: 'events.certifierOnly.reason.SS',
  EM: 'events.certifierOnly.reason.EM',
  TP: 'events.certifierOnly.reason.TP'
};

/**
 * Event-level visibility: does this event (as serialized on ANY surface) reach the
 * buyer page at all? Production family only — every other family is published whole.
 */
export const isEventOnBuyerPage = (event: {
  event_type?: number | string;
  type?: string;
  production_type?: string;
}): boolean => {
  const family = Number(event?.event_type);
  if (family !== 1) return true;
  const code = String(event?.production_type || event?.type || '')
    .trim()
    .toUpperCase();
  return !(code in CONSUMER_WITHHELD_PRODUCTION_SUBTYPES);
};

/**
 * The i18n id of the farmer-facing reason an event is certifier-only, or null when the
 * event is on the buyer page.
 */
export const buyerPageWithheldReasonId = (event: {
  event_type?: number | string;
  type?: string;
  production_type?: string;
}): string | null => {
  if (isEventOnBuyerPage(event)) return null;
  const code = String(event?.production_type || event?.type || '')
    .trim()
    .toUpperCase();
  return CONSUMER_WITHHELD_PRODUCTION_SUBTYPES[code] ?? null;
};

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
/**
 * A stored date as the calendar day it names, and the zone to print it in.
 *
 * Date-only strings ("2026-03-18") are built as LOCAL dates: `new Date('2026-03-18')` is UTC
 * midnight, which prints as Mar 17 anywhere west of UTC. Timestamps are stored UTC wall clocks
 * (datetime-wall-clock-utc, ADR 011), so they print in UTC. Until 2026-11-11 the consumer page
 * printed them in the VIEWER's zone: an Entrust SC spray recorded Aug 7 06:00 read "Aug 6, 2025"
 * to every shopper in the Americas, and a Sep 29 harvest read "Harvested Sep 28", one day off
 * from the farm's own record and from the certifier packet.
 */
const calendarDay = (dateStr: string): { date: Date; timeZone?: 'UTC' } | null => {
  const text = dateStr.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return dateOnly ? { date } : { date, timeZone: 'UTC' };
};

const yearOf = (day: { date: Date; timeZone?: 'UTC' }) =>
  day.timeZone ? day.date.getUTCFullYear() : day.date.getFullYear();

/**
 * The calendar day a stored date PRINTS as, as a comparable key ("2025-9-29"), or null.
 *
 * Every "same day?" decision on the consumer page must be taken in the frame `calendarDay`
 * renders in, or the page prints what it decided against: two picks at 06:00Z and 20:00Z are
 * one printed day (Sep 29) but two local days in California, which made a degenerate
 * "Sep 29 – Sep 29" range (review of trazo-app #367).
 */
export const dayKey = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  const day = calendarDay(dateStr);
  if (!day) return null;
  const { date } = day;
  return day.timeZone
    ? `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`
    : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

export const formatDateRangeForConsumer = (
  startDate?: string | null,
  endDate?: string | null,
  locale: string = 'en-US'
): string | null => {
  if (!startDate || !endDate) return null;
  const start = calendarDay(startDate);
  const end = calendarDay(endDate);
  if (!start || !end) return null;

  const loc = locale || 'en-US';
  const dayMonth: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const full: Intl.DateTimeFormatOptions = { ...dayMonth, year: 'numeric' };

  const startText = start.date.toLocaleDateString(loc, {
    ...(yearOf(start) === yearOf(end) ? dayMonth : full),
    timeZone: start.timeZone
  });
  return `${startText} – ${end.date.toLocaleDateString(loc, { ...full, timeZone: end.timeZone })}`;
};

export const resolveHarvestDates = (
  timeline?: Array<{ production_type?: string; type?: string; date?: string | null }> | null,
  fallbackDate?: string | null
): { first: string | null; last: string | null; isRange: boolean; fromRecords: boolean } => {
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
    // `fromRecords: false` says the caller is looking at the SEASON CLOSE date, not a harvest.
    // Added 2026-09-16: without it a caller cannot tell a fallback from a real single-pass
    // harvest, and `ParcelMapInfo` printed the close date under a "HARVEST DATE" label — three
    // weeks later than the pick on one audited lot, and on the same page as the true range.
    return { first: fallbackDate ?? null, last: fallbackDate ?? null, isRange: false, fromRecords: false };
  }

  const first = harvestDates[0];
  const last = harvestDates[harvestDates.length - 1];
  // Compare the days as they will be PRINTED (`dayKey`, the same frame as `calendarDay`). Until
  // 2026-11-11 this compared viewer-local days while the formatters had also rendered locally;
  // the formatters now print stored timestamps in UTC, so the comparison follows them.
  return { first, last, isRange: dayKey(first) !== dayKey(last), fromRecords: true };
};

/**
 * Every date the consumer page prints for a production, derived ONCE.
 *
 * 🔴 2026-09-16 — this exists because the derivation used to be spread across `ProductDetail`:
 * the hero and the HARVEST pillar called `resolveHarvestDates`, and the parcel card was handed
 * `completeData.finish_date` directly. `finish_date` is the day the grower CLOSED the season,
 * the parcel card labels it "HARVEST DATE", and so one page carried two different answers under
 * one label — Jul 20-Aug 7 at the top against Aug 12 below on the audited blueberry lot, Sep
 * 8-19 against Sep 30 on the carrot lot.
 *
 * Agreement between surfaces is only guaranteeable if there is one derivation to agree with, so
 * every caller takes its dates from here and nothing reaches past it to the raw payload.
 */
export const resolveProductionDisplayDates = (
  timeline?: Array<{ production_type?: string; type?: string; date?: string | null }> | null,
  seasonClosedDate?: string | null
): {
  harvestDate?: string;
  harvestDateStart?: string;
  seasonClosedDate?: string;
  plantingDate?: string;
  /** False when `harvestDate` fell back to the close date. Callers that print a HARVEST label must check it. */
  harvestFromRecords: boolean;
} => {
  const window = resolveHarvestDates(timeline, seasonClosedDate);
  // `?? undefined`: consumers declare these props as optional strings, and passing null works
  // by accident today but stops the moment strictNullChecks is turned on.
  const harvestDate = window.last ?? undefined;
  const harvestDateStart = window.isRange ? window.first ?? undefined : undefined;

  // Season close is a DIFFERENT fact from the last pick and worth showing: a buyer reads it as
  // "the lot is finished". It is only worth showing SEPARATELY, though — printed when it adds
  // something, omitted when it is the same instant as the last harvest record, and never
  // borrowed as a harvest date. When a lot has no harvest record at all this is the only date
  // there is, and it still goes under its own label rather than inventing a harvest.
  // ⚠️ Compare the DAY, not the instant. `History.finish_date` and `CommonEvent.date` are both
  // DateTimeFields, so a lot closed the same afternoon it was picked has two timestamps that
  // differ by hours and a `!==` suppression that can never fire — the row would print on every
  // lot. The comparison is on the day each date PRINTS as (`dayKey`), like `resolveHarvestDates`.
  const samePrintedDay = (a?: string | null, b?: string | null): boolean => {
    if (!a || !b) return false;
    const ka = dayKey(a);
    const kb = dayKey(b);
    return ka && kb ? ka === kb : a === b;
  };
  const closedForDisplay =
    seasonClosedDate && !samePrintedDay(seasonClosedDate, window.last)
      ? seasonClosedDate
      : !window.fromRecords
      ? seasonClosedDate ?? undefined
      : undefined;

  // First planting or transplant record, by the same rule as harvest: the records carry the
  // truth. `PL` and `TR` both establish "this is when the crop went in".
  const plantingDate = (timeline || [])
    .filter((e) => {
      // `||` not `??`: the API emits `production_type: ""` for an event whose `type` is unset
      // (serializers.py `getattr(event, "type", "")`), and `??` only falls back on null or
      // undefined — so the harvest filter below matched such a row and this one did not.
      const subtype = e?.production_type || e?.type;
      return subtype === 'PL' || subtype === 'TR';
    })
    .map((e) => e?.date)
    .filter((d): d is string => Boolean(d))
    .map((d) => ({ raw: d, at: new Date(d).getTime() }))
    .filter((x) => !Number.isNaN(x.at))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.raw)[0];

  return {
    harvestDate,
    harvestDateStart,
    seasonClosedDate: closedForDisplay ?? undefined,
    plantingDate,
    harvestFromRecords: window.fromRecords
  };
};

export const formatHarvestDate = (
  dateStr?: string | null,
  locale: string = 'en-US'
): string | null => {
  if (!dateStr) return null;
  const day = calendarDay(dateStr);
  if (!day) return null;
  // Locale-aware so a Spanish shopper sees "14 abr 2026", not "Apr 14, 2026".
  return day.date.toLocaleDateString(locale || 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: day.timeZone
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
