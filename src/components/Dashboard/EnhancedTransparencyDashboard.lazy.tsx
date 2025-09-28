import { lazy, Suspense } from 'react';
import { VStack, Skeleton } from '@chakra-ui/react';
import { StandardCard } from '../Design/StandardComponents';

// Lazy load heavy components for mobile performance
const EnhancedTransparencyDashboard = lazy(() => 
  import('./EnhancedTransparencyDashboard').then(module => ({ 
    default: module.EnhancedTransparencyDashboard 
  }))
);

const CarbonAnalysisExpandable = lazy(() => 
  import('./CarbonAnalysisExpandable').then(module => ({ 
    default: module.CarbonAnalysisExpandable 
  }))
);

const TrustIndicators = lazy(() => 
  import('./TrustIndicators').then(module => ({ 
    default: module.TrustIndicators 
  }))
);

// Mobile-optimized loading skeleton
const DashboardSkeleton = () => (
  <VStack spacing={4} align="stretch">
    <StandardCard variant="elevated" title="Loading Transparency Overview...">
      <VStack spacing={4}>
        <Skeleton height="120px" borderRadius="lg" />
        <Skeleton height="60px" borderRadius="lg" />
        <Skeleton height="40px" borderRadius="lg" />
      </VStack>
    </StandardCard>
    
    <StandardCard variant="elevated" title="Loading Trust Indicators...">
      <VStack spacing={4}>
        <Skeleton height="100px" borderRadius="full" alignSelf="center" />
        <Skeleton height="80px" borderRadius="lg" />
      </VStack>
    </StandardCard>
  </VStack>
);

// Lazy-loaded dashboard with mobile-optimized suspense
export const LazyEnhancedTransparencyDashboard = (props: any) => (
  <Suspense fallback={<DashboardSkeleton />}>
    <EnhancedTransparencyDashboard {...props} />
  </Suspense>
);

export const LazyCarbonAnalysisExpandable = (props: any) => (
  <Suspense fallback={
    <VStack spacing={4}>
      <Skeleton height="60px" borderRadius="lg" />
      <Skeleton height="40px" borderRadius="lg" />
    </VStack>
  }>
    <CarbonAnalysisExpandable {...props} />
  </Suspense>
);

export const LazyTrustIndicators = (props: any) => (
  <Suspense fallback={
    <VStack spacing={4}>
      <Skeleton height="100px" borderRadius="full" alignSelf="center" />
      <Skeleton height="80px" borderRadius="lg" />
    </VStack>
  }>
    <TrustIndicators {...props} />
  </Suspense>
);

// Export individual components for granular loading
export {
  EnhancedTransparencyDashboard,
  CarbonAnalysisExpandable, 
  TrustIndicators
};