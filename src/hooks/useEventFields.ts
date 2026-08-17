/**
 * React hook for querying the event field registry.
 *
 * Thin memoized wrapper around resolver.getFieldsForSurface. Use this in
 * display components (ConsumerEventCard, EventDetailsModal, etc.) rather
 * than calling the resolver directly — the hook handles memoization so
 * field lists are only recomputed when inputs change.
 */

import { useMemo } from 'react';
import { useIntl } from 'react-intl';

import type {
  AnySubtype,
  DisplaySurface,
  EventTypeCode,
  EventTypeName,
  PhotoTier,
  ResolvedFieldSet
} from 'src/config/events';
import { getFieldsForSurface, getPhotoTier } from 'src/config/events';

export interface UseEventFieldsOptions {
  eventType: EventTypeName | EventTypeCode;
  subtype?: AnySubtype;
  surface: DisplaySurface;
  event: Record<string, unknown>;
}

export interface UseEventFieldsResult {
  fields: ResolvedFieldSet;
  photoTier: PhotoTier;
  hasFields: boolean;
  totalCount: number;
}

/**
 * Query the event registry for which fields to render on a surface.
 *
 * @example
 *   const { fields, photoTier } = useEventFields({
 *     eventType: 'chemical',
 *     subtype: event.type,
 *     surface: 'modal',
 *     event,
 *   });
 *   return (
 *     <>
 *       {fields.hero.map(f => <HeroField key={f.name} field={f} />)}
 *       {fields.immediate.map(f => <KeyDetail key={f.name} field={f} />)}
 *       ...
 *     </>
 *   );
 */
export function useEventFields({
  eventType,
  subtype,
  surface,
  event
}: UseEventFieldsOptions): UseEventFieldsResult {
  const intl = useIntl();

  return useMemo(() => {
    // The resolver is a pure module with no React dependency, so it cannot call useIntl
    // itself — it takes a translate function instead. Without this, every enum without a
    // bespoke formatter rendered as a de-underscored slug ("Non Organic Untreated") on the
    // detail modal and the consumer card, in English, on the Spanish app.
    const translate = (id: string): string | null => {
      if (!id) return null;
      const translated = intl.formatMessage({ id });
      // react-intl echoes the id back when the message is missing; that is not a label.
      return translated && translated !== id ? translated : null;
    };

    const fields = getFieldsForSurface(eventType, subtype, surface, event, translate);
    const photoTier = getPhotoTier(eventType, subtype);
    const totalCount =
      fields.hero.length +
      fields.immediate.length +
      fields.secondary.length +
      fields.details.length;

    return {
      fields,
      photoTier,
      hasFields: totalCount > 0,
      totalCount
    };
    // event is a reference — when backend updates event, consumers pass new reference
  }, [eventType, subtype, surface, event, intl]);
}
