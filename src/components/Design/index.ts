// Design System Components Export
export {
  StandardPage,
  StandardCard,
  StandardForm,
  StandardField,
  StandardInput,
  StandardNumberInput,
  StandardSearchInput,
  StandardTextarea,
  StandardSelect,
  registerWithFocus,
  StandardButton,
  StandardAlert,
  StandardPageLoading,
  StandardSpinner,
  StandardSkeleton,
  StandardQueryError,
  StandardGrid,
  StandardSection,
  StandardStepper,
  StandardSectionTabs,
  StandardSegmentedControl,
  type SectionTabStatus,
  StandardSelectionGrid,
  StandardMediaUpload,
  SectionHeader,
  SectionBox,
  CollapsibleSection
} from './StandardComponents';

// Profile page primitives — shared by ProfileFarm / ProfileParcel / ProfileProduction
export {
  InfoRow,
  FieldGroup,
  FieldList,
  PageHeaderMeta,
  type InfoRowProps,
  type FieldGroupProps,
  type FieldListProps,
  type PageHeaderMetaProps
} from './ProfileField';

// Dialog shell — bottom sheet below `md`, centered inside-scrolling modal above.
// Use this instead of hand-rolling another Drawer/Modal breakpoint branch.
export { ResponsiveModal, type ResponsiveModalProps } from './ResponsiveModal';

// Empty State Components
export { EmptyImageState } from './EmptyImageState';

// TransparencyIndicator removed 2026-08-02 — unreachable, and it mapped a percentage onto a
// green/yellow/gray verdict. See ProfileSections/index.ts for why dead ladders get deleted
// rather than left in place.

// Media Components
export { S3Image, type S3ImageProps } from '../Media/S3Image';

// Standardized Form Components
export { default as StandardFarmForm } from '../Forms/StandardFarmForm';
/** @deprecated Use StandardFarmForm instead */
export { default as StandardEstablishmentForm } from '../Forms/StandardFarmForm';
