# Enhanced Transparency Dashboard Components

A mobile-first React dashboard component suite for the Trazo agricultural carbon transparency platform, implementing the transparency-first design pattern with progressive disclosure.

## 🎯 Key Features

- **Transparency-First Design**: Prioritizes transparency scores over carbon data in primary interfaces
- **Mobile-First Architecture**: <500ms load times, progressive disclosure for mobile UX
- **Performance Optimized**: React.memo, useMemo, RTK Query caching, lazy loading
- **Trazo Design Standards**: Uses StandardComponents, consistent theme tokens, responsive breakpoints
- **Real-time Updates**: 5-minute polling intervals, optimistic updates, error handling

## 🏗️ Architecture

### Component Structure

```
/src/components/Dashboard/
├── EnhancedTransparencyDashboard.tsx  # Main orchestrator component
├── TransparencyHeroSection.tsx        # Primary transparency score display
├── CarbonAnalysisExpandable.tsx       # Progressive disclosure for carbon data
├── TrustIndicators.tsx                # Verification badges and trust metrics
├── index.ts                          # Exports
└── README.md                         # Documentation
```

### Data Flow

1. **Phase 1**: Transparency metrics load first (dashboard_comprehensive API)
2. **Phase 2**: Trust indicators display (built-in trust calculation)
3. **Phase 3**: Carbon analysis loads progressively (carbon_scope_breakdown API)

## 📱 Mobile-First Design

### Progressive Loading Pattern

```tsx
// ✅ CORRECT - Transparency first, carbon details expandable
<TransparencyHeroSection transparencyScore={95} />
<TrustIndicators trustMetrics={metrics} />
<CarbonAnalysisExpandable
  carbonScopeData={data}
  isExpandable={true}  // Progressive disclosure
/>

// ❌ WRONG - Carbon first (violates transparency-first pattern)
<CarbonSummary emissions={2.4} />
<TransparencySection />
```

### Responsive Breakpoints

- **Mobile**: 375px+ (base)
- **Tablet**: 768px+ (md)
- **Desktop**: 1440px+ (lg)

## 🚀 Usage Examples

### Basic Implementation

```tsx
import { EnhancedTransparencyDashboard } from '@/components/Dashboard';

function DashboardPage() {
  return (
    <EnhancedTransparencyDashboard
      companyId="123"
      farmId="456"
      title="Farm Transparency Overview"
      description="Monitor your transparency metrics and consumer engagement"
    />
  );
}
```

### Advanced Usage with Error Handling

```tsx
import { EnhancedTransparencyDashboard } from '@/components/Dashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AdvancedDashboard() {
  return (
    <ErrorBoundary>
      <EnhancedTransparencyDashboard
        companyId={company?.id}
        farmId={selectedFarm?.id}
        title={`${farm?.name} Transparency`}
        description="Real-time transparency and carbon performance metrics"
      />
    </ErrorBoundary>
  );
}
```

### Individual Component Usage

```tsx
import {
  TransparencyHeroSection,
  TrustIndicators,
  CarbonAnalysisExpandable
} from '@/components/Dashboard';

function CustomDashboard({ data }) {
  return (
    <VStack spacing={6}>
      {/* Always show transparency first */}
      <TransparencyHeroSection
        transparencyScore={data.transparency_metrics.overall_score}
        carbonSummary={data.carbon_summary}
        trends={data.performance_trends}
        recentActivity={data.recent_activity}
        isMobile={isMobile}
      />

      {/* Trust indicators for credibility */}
      <TrustIndicators
        trustMetrics={data.transparency_metrics.trust_indicators}
        photoEvidenceCount={data.photo_count}
        hasBlockchainVerification={data.blockchain_verified}
        isMobile={isMobile}
      />

      {/* Carbon analysis in expandable section */}
      <CarbonAnalysisExpandable
        carbonScopeData={carbonData}
        carbonSummary={data.carbon_summary}
        isLoading={isLoadingCarbon}
        isMobile={isMobile}
      />
    </VStack>
  );
}
```

## 🎨 Design System Compliance

### Color Usage

```tsx
// ✅ CORRECT - Use theme tokens
bg="green.500"
_hover={{ bg: "green.600" }}

// ❌ WRONG - Never hardcode hex colors
bg="#4CAF50"
```

### Spacing Scale

```tsx
// ✅ CORRECT - Use standard spacing scale
spacing={[4, 6, 8]}  // Mobile, tablet, desktop
padding={{ base: 4, md: 6 }}

// ❌ WRONG - Random spacing values
spacing={5}
padding="17px"
```

### Typography

```tsx
// ✅ CORRECT - Trazo typography hierarchy
<Heading size="xl" color="green.600">
<Text fontSize="lg" color="gray.600">

// ❌ WRONG - Inconsistent typography
<Text fontSize="19px" color="#333333">
```

## ⚡ Performance Optimizations

### React.memo Implementation

```tsx
export const EnhancedTransparencyDashboard = React.memo(
  ({ companyId, farmId, title, description }) => {
    // Component logic...
  }
);

EnhancedTransparencyDashboard.displayName = 'EnhancedTransparencyDashboard';
```

### Memoized Data Processing

```tsx
// Expensive calculations memoized
const processedData = useMemo(() => {
  if (!dashboardData) return null;

  return {
    transparencyScore: dashboardData.transparency_metrics.overall_score,
    carbonSummary: dashboardData.carbon_summary
    // ... other processed data
  };
}, [dashboardData]);
```

### RTK Query Optimizations

```tsx
const {
  data: dashboardData,
  isLoading,
  error
} = useGetDashboardComprehensiveQuery(
  { companyId, farmId },
  {
    pollingInterval: 5 * 60 * 1000, // 5-minute polling
    skip: !companyId || !farmId // Skip invalid requests
  }
);
```

## 📊 API Integration

### Backend Endpoints

```typescript
// New Phase 3 endpoints added to carbonApi.ts
GET /api/companies/{id}/establishments/{id}/dashboard_comprehensive/
GET /api/companies/{id}/establishments/{id}/carbon_scope_breakdown/
```

### TypeScript Interfaces

```typescript
interface DashboardComprehensiveResponse {
  establishment_id: string;
  transparency_metrics: {
    overall_score: number;
    event_count: number;
    verification_percentage: number;
    trust_indicators: {
      blockchain_verified: boolean;
      photo_evidence_count: number;
      third_party_verified: boolean;
    };
  };
  carbon_summary: {
    total_emissions: number;
    total_offsets: number;
    net_carbon: number;
    carbon_intensity: number;
  };
  recent_activity: Array<{
    id: number;
    type: string;
    description: string;
    date: string;
    carbon_impact: number;
  }>;
  performance_trends: {
    transparency_trend: 'up' | 'down' | 'stable';
    carbon_trend: 'up' | 'down' | 'stable';
    engagement_trend: 'up' | 'down' | 'stable';
  };
}
```

## 📱 Mobile Performance Targets

- **Initial Load**: <500ms transparency score display
- **Progressive Loading**: Carbon analysis loads after user interaction
- **Bundle Size**: <50KB per component (lazy loaded)
- **Touch Targets**: Minimum 44px for all interactive elements
- **Responsive**: Adapts to 375px+ viewport widths

## 🧪 Testing Recommendations

### Unit Tests

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedTransparencyDashboard } from './EnhancedTransparencyDashboard';

test('displays transparency score prominently', async () => {
  render(<EnhancedTransparencyDashboard companyId="123" farmId="456" />);

  await waitFor(() => {
    expect(screen.getByText(/transparency/i)).toBeInTheDocument();
  });
});
```

### Performance Tests

```tsx
test('loads transparency data within 500ms', async () => {
  const startTime = performance.now();

  render(<TransparencyHeroSection {...props} />);

  await waitFor(() => {
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  const loadTime = performance.now() - startTime;
  expect(loadTime).toBeLessThan(500);
});
```

## 🔧 Customization

### Theme Customization

```tsx
// Extend Chakra theme for Trazo-specific needs
const trazoTheme = extendTheme({
  colors: {
    green: {
      500: '#4CAF50', // Trazo primary green
      600: '#388E3C' // Trazo hover green
    }
  },
  breakpoints: {
    base: '375px', // Mobile-first
    md: '768px', // Tablet
    lg: '1440px' // Desktop
  }
});
```

### Component Overrides

```tsx
// Custom transparency levels
const getTransparencyLevel = (score: number) => {
  // Your custom scoring logic
  return { label: 'Custom Level', color: 'purple' };
};
```

## 📈 Success Metrics

### Performance KPIs

- **Load Time**: <500ms initial transparency display
- **Engagement**: >75% user interaction with expandable sections
- **Trust Score**: Average transparency score >80%
- **Mobile UX**: <3s complete dashboard load on 3G

### Quality Metrics

- **Component Reusability**: 95%+ of UI uses StandardComponents
- **TypeScript Coverage**: 100% type safety
- **Mobile Responsiveness**: Supports 375px+ viewports
- **Accessibility**: WCAG 2.1 AA compliance

## 🚀 Next Steps

1. **Phase 4**: Add real-time WebSocket updates
2. **Phase 5**: Implement advanced analytics charts
3. **Phase 6**: Add export and sharing capabilities
4. **Phase 7**: Integrate consumer feedback loops

---

**Built with**: React 18, TypeScript, Chakra UI, RTK Query, Vite
**Performance**: Mobile-first, <500ms loads, progressive enhancement
**Accessibility**: WCAG 2.1 AA compliant, screen reader friendly
