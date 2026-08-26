/**
 * Which of a producer event's fields actually reach the buyer page.
 *
 * One derivation, three authorities — the same three the real consumer pipeline uses:
 *   1. event level: `CONSUMER_WITHHELD_PRODUCTION_SUBTYPES` (BU/SS/EM/TP never publish;
 *      mirror of the backend queryset filter in claim_authority.py);
 *   2. field level: the display registry's `consumer_card` surface (what
 *      ConsumerEventCard renders as Key Details / Additional Information);
 *   3. field level: `CERTIFIER_ONLY_EVENT_FIELDS` (what the server strips from the
 *      anonymous payload regardless of registry surfaces).
 *
 * Used by the producer-facing detail modal to badge fields "Buyer page" — so a farmer
 * looking at a finished production can see exactly which values a shopper gets, without
 * anyone hand-maintaining a second list (that is how the preview drifted last time).
 */
import { getFieldsForSurface } from 'src/config/events';
import { CERTIFIER_ONLY_EVENT_FIELDS, isEventOnBuyerPage } from './consumerDisplay';

const CERTIFIER_ONLY = new Set<string>(CERTIFIER_ONLY_EVENT_FIELDS);

/**
 * The set of field NAMES on this event that the buyer page can display.
 * Empty set when the whole event is withheld (certifier-only subtype).
 */
export function buyerVisibleFieldNames(
  eventType: number,
  subtype: string | undefined,
  event: Record<string, unknown>
): ReadonlySet<string> {
  // Explicit eventType LAST so a stale/absent event_type on the raw object cannot
  // override it (spread order bug caught in review, 2026-08-25).
  if (!isEventOnBuyerPage({ ...event, event_type: eventType })) {
    return new Set();
  }
  const resolved = getFieldsForSurface(
    eventType as Parameters<typeof getFieldsForSurface>[0],
    subtype as Parameters<typeof getFieldsForSurface>[1],
    'consumer_card',
    event
  );
  const names = new Set<string>();
  for (const tier of [resolved.hero, resolved.immediate, resolved.secondary, resolved.details]) {
    for (const field of tier) {
      if (!CERTIFIER_ONLY.has(field.name)) {
        names.add(field.name);
      }
    }
  }
  return names;
}
