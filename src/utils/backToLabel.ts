import type { IntlShape } from 'react-intl';

/**
 * The header Back label of a multi-step form: "Back to River Block" when the destination's
 * name is known, a generic "Back to parcel" while it loads.
 *
 * A stepped form also has a footer "Previous step" control, so a bare "Back" in the header is
 * ambiguous; a farmer on step 2 who wanted step 1 clicked it and left the form. `name` must be
 * the name of the place `onBack` actually navigates to (the route's record, never the store's
 * active one), or the label repeats the same mistake in a new form.
 */
export const backToLabel = (
  intl: IntlShape,
  name: string | null | undefined,
  fallbackId: 'common.backToParcel' | 'common.backToFarm' | 'common.backToHome'
) =>
  name
    ? intl.formatMessage({ id: 'common.backTo' }, { place: name })
    : intl.formatMessage({ id: fallbackId });
