/**
 * One place that decides how the Google Maps script is loaded.
 *
 * `useLoadScript` loads the Maps JS bundle ONCE per page, and @react-google-maps/api warns
 * ("LoadScript has been reloaded unintentionally") the moment two call sites pass different
 * options. Three components load it — CardWithMap, StandardParcelForm_Transparency and
 * NewCompany — so the options have to be identical and computed the same way, or the second
 * map on a page silently re-fetches the bundle with the first one's language anyway.
 *
 * WHY `language` HAS TO BE SET AT ALL
 * -----------------------------------
 * Omitted, Google infers the language from the BROWSER, not from the app. A parcel map inside
 * an English UI therefore rendered its controls in Spanish for anyone whose browser is
 * Spanish — "Combinaciones de teclas", "Datos del mapa", "Condiciones", "Informar un error en
 * el mapa" — which is the app telling a grower it is in English and telling Google it is not.
 * The app already knows the answer: `intl.locale`.
 *
 * `region` biases geocoding/formatting, not just labels. Both the CA and WA operations this
 * product serves are US, and the map is drawing US parcel geometry, so US is correct
 * regardless of the reader's language.
 */

/** Maps takes a plain language subtag; `es-419` and `en-US` must be narrowed to `es` / `en`. */
export function mapsLanguageFor(locale: string | undefined): string {
  const tag = (locale || 'en').toLowerCase();
  return tag.startsWith('es') ? 'es' : 'en';
}

export const GOOGLE_MAPS_API_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * Options for `useLoadScript`. Pass `intl.locale`.
 *
 * Returns a NEW object each call, which is fine — the hook keys on the values, not identity —
 * but callers should still memoise on `intl.locale` so a re-render does not churn.
 */
export function googleMapsLoaderOptions(locale: string | undefined) {
  return {
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    language: mapsLanguageFor(locale),
    region: 'US'
  };
}
