// Mobile-optimized dashboard components with lazy loading
export { 
  LazyEnhancedTransparencyDashboard as EnhancedTransparencyDashboard,
  LazyCarbonAnalysisExpandable as CarbonAnalysisExpandable,
  LazyTrustIndicators as TrustIndicators
} from './EnhancedTransparencyDashboard.lazy';

// Original components for direct import if needed
export { 
  EnhancedTransparencyDashboard as DirectEnhancedTransparencyDashboard,
  CarbonAnalysisExpandable as DirectCarbonAnalysisExpandable,
  TrustIndicators as DirectTrustIndicators
} from './EnhancedTransparencyDashboard';
export { default as TransparencyHeroSection } from './TransparencyHeroSection';