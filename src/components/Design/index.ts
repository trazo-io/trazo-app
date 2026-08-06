// Design System Components Export
export {
  StandardPage,
  StandardCard,
  StandardForm,
  StandardField,
  StandardInput,
  StandardTextarea,
  StandardSelect,
  StandardButton,
  StandardAlert,
  StandardPageLoading,
  StandardSpinner,
  StandardSkeleton,
  StandardGrid,
  StandardSection,
  StandardStepper,
  StandardSelectionGrid,
  StandardMediaUpload,
  SectionHeader,
  SectionBox,
  CollapsibleSection
} from './StandardComponents';

// Empty State Components
export { EmptyImageState } from './EmptyImageState';

// TransparencyIndicator removed 2026-08-02 — unreachable, and it mapped a percentage onto a
// green/yellow/gray verdict. See ProfileSections/index.ts for why dead ladders get deleted
// rather than left in place.

// Media Components
export { S3Image, type S3ImageProps } from '../Media/S3Image';

// Standardized Form Components
export { default as StandardChemicalForm } from '../Forms/StandardChemicalForm';
export { default as StandardFarmForm } from '../Forms/StandardFarmForm';
/** @deprecated Use StandardFarmForm instead */
export { default as StandardEstablishmentForm } from '../Forms/StandardFarmForm';
export { default as StandardParcelForm } from '../Forms/StandardParcelForm';
export { default as StandardProductionForm } from '../Forms/StandardProductionForm';
export { default as StandardizedCompanyForm } from '../../views/Dashboard/Dashboard/components/forms/NewCompanyStandardized';
