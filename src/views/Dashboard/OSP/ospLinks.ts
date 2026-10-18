/**
 * Links into the OSP pages from elsewhere in the app. Kept apart from the pages themselves so a
 * caller (the onboarding checklist) does not pull a lazily loaded page into its own bundle.
 */

/** `?section=` value: open the first § 205.201(a) section that does not count as having text. */
export const FIRST_SECTION_WITHOUT_TEXT = 'first-without-text';

/** The narratives page, opened on the first section its "{n} of 6" count is short of. */
export const ospFirstSectionWithoutTextPath = (farmPath: string) =>
  `${farmPath}/osp/narratives?section=${FIRST_SECTION_WITHOUT_TEXT}`;
