# Best Practices: Handling Missing Data in Transparency Platforms

**For Trazo**: A platform built on agricultural transparency cannot show fake data.

---

## Core Principle

**RULE**: When data is missing, show **nothing** or **"data not available"**, never show **fake data**.

---

## Fallback Strategy Comparison

### ❌ WRONG: Hardcoded Defaults (Current Trazo)

```typescript
// NEVER DO THIS
const farmName = data?.name || 'Sustainable Farm';  // Fake name
const rating = data?.rating || 4.2;                 // Fake rating
const verified = data?.verified || true;            // False claim!
const photoCount = data?.photos?.length || Math.floor(events * 0.6);  // Fabricated math
```

**Why Bad**:
- Shows fake data as if it's real
- Misleads consumers
- Undermines transparency mission
- Violates trust
- Hard to debug when data is actually missing

---

### ✅ CORRECT: Three-Tier Fallback Strategy

#### Tier 1: Real Data
```typescript
if (data?.farmName) {
  return <h1>{data.farmName}</h1>;
}
```

#### Tier 2: Loading State
```typescript
if (isLoading) {
  return <Skeleton width="200px" height="24px" />;
}
```

#### Tier 3: Empty State
```typescript
return <p className="text-muted">Name not available</p>;
```

**Full Example**:
```typescript
export function FarmName({ data, isLoading }) {
  // Tier 1: Real data available
  if (data?.farmName) {
    return <h1 className="farm-name">{data.farmName}</h1>;
  }

  // Tier 2: Loading (show skeleton, not fake data)
  if (isLoading) {
    return <Skeleton width="200px" height="24px" />;
  }

  // Tier 3: Data not available (honest message, not fake data)
  return (
    <div className="empty-state">
      <p className="text-muted">Farm name not available</p>
    </div>
  );
}
```

**Why Good**:
- Real data shows when available
- Clear loading state while fetching
- Honest message when unavailable
- Never shows fake data
- Consumer always knows the truth

---

## Specific Rules for Transparency Platform

### Rule 1: Verification Status

❌ **WRONG**:
```typescript
const isVerified = data?.verified || true;  // False claim!
```

✅ **RIGHT**:
```typescript
if (data?.blockchain_verified === true) {
  return <VerificationBadge verified={true} />;
}
return <VerificationBadge verified={false} />;
```

**Message**: Never show checkmark without real verification data.

---

### Rule 2: Ratings & Reviews

❌ **WRONG**:
```typescript
const rating = data?.rating || 4.2;  // Inflates reputation
const reviews = data?.reviews || 5;   // Fabricates social proof
```

✅ **RIGHT**:
```typescript
if (data?.rating !== undefined) {
  return <Rating value={data.rating} />;
}
if (data?.reviews?.length > 0) {
  return <ReviewList reviews={data.reviews} />;
}
return <p>No ratings yet</p>;
```

**Message**: New farms shouldn't appear to have 4.2 stars. Show honesty.

---

### Rule 3: Environmental Impact Data

❌ **WRONG**:
```typescript
const co2 = data?.co2 || 0;  // Zero impact is a lie!
const carbon = productionId === '229' ? 0 : calculated;  // Hardcoded override!
```

✅ **RIGHT**:
```typescript
if (data?.carbonFootprint !== undefined) {
  return <CarbonDisplay value={data.carbonFootprint} />;
}
return <p>Carbon data not available</p>;
```

**Message**: Never hardcode zero for specific farms. Never fabricate environmental impact.

---

### Rule 4: Verification Photos

❌ **WRONG**:
```typescript
const photoUrl = data?.photo || '/api/placeholder/300x200?text=Verified';
const caption = `Photo - Verified by Blockchain`;
```

✅ **RIGHT**:
```typescript
if (data?.verificationPhotos?.length > 0) {
  return (
    <>
      {data.verificationPhotos.map(photo => (
        <img src={photo.url} alt={photo.caption} />
      ))}
    </>
  );
}
return <p>Verification photos not available</p>;
```

**Message**: Never show placeholder images as verification evidence.

---

### Rule 5: Engagement Metrics

❌ **WRONG**:
```typescript
const scans = data?.scans || 0;      // Shows zero even if unknown
const reviews = data?.reviews || 0;   // Shows zero reviews
const farmAge = data?.age || 5;       // TODO comment with fake data
```

✅ **RIGHT**:
```typescript
if (typeof data?.scanCount === 'number') {
  return <ScanMetric count={data.scanCount} />;
}
return null;  // Hide metric entirely if unavailable
```

**Message**: Hide metric entirely rather than show zero when you don't know.

---

## Implementation Pattern: Fallback Wrapper Component

```typescript
interface FallbackProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  error?: Error;
  render: (data: T) => React.ReactNode;
  emptyMessage?: string;
  skeleton?: React.ReactNode;
}

export function DataWithFallback<T>({
  data,
  isLoading,
  error,
  render,
  emptyMessage = 'Data not available',
  skeleton,
}: FallbackProps<T>) {
  // Tier 1: Error state
  if (error) {
    return (
      <div className="error-state">
        <p className="text-danger">Data unavailable (error occurred)</p>
      </div>
    );
  }

  // Tier 2: Loading state
  if (isLoading) {
    return skeleton || <Skeleton />;
  }

  // Tier 3: Real data
  if (data) {
    return render(data);
  }

  // Tier 4: Empty state (honest message, not fake data)
  return (
    <div className="empty-state">
      <p className="text-muted">{emptyMessage}</p>
    </div>
  );
}
```

**Usage**:
```typescript
<DataWithFallback
  data={farmData}
  isLoading={isLoading}
  render={(farm) => <h1>{farm.name}</h1>}
  emptyMessage="Farm name not available"
  skeleton={<Skeleton width="200px" />}
/>
```

---

## What NOT To Do

### ❌ DON'T: Special-Case Individual Records

```typescript
// NEVER hardcode specific production/farm overrides
if (productionId === '229') {
  return { carbon: 0, rating: 5 };  // FAKE!
}
```

### ❌ DON'T: Leave TODO Comments With Fake Data

```typescript
scansCount: 0,  // TODO: Get from API  ← SHIP WITH FAKE DATA
```

### ❌ DON'T: Use Placeholder Services In Production

```typescript
url: '/api/placeholder/300x200?text=Verified'  // MVP code still deployed!
```

### ❌ DON'T: Hardcode Multipliers For Fabricated Metrics

```typescript
photoCount: eventCount * 0.6  // Assumes 60% have photos!
```

### ❌ DON'T: Have Inconsistent Fallbacks

```typescript
Line 770: || 4.2   // Falls back to 4.2
Line 906: || 0     // Falls back to 0
// Same field, different fallbacks = confusing!
```

### ❌ DON'T: Leave Test/Debug Code

```typescript
if (productionId === '226') {  // Test-specific handling in production!
  // Special behavior
}
```

---

## What TO Do

### ✅ DO: Explicit Null/Undefined Checks

```typescript
if (data?.farmName !== undefined && data?.farmName !== null && data?.farmName !== '') {
  return <h1>{data.farmName}</h1>;
}
```

### ✅ DO: Show Loading States Properly

```typescript
{isLoading && <Skeleton />}
{!isLoading && data && <Content data={data} />}
{!isLoading && !data && <EmptyState />}
```

### ✅ DO: Use Optional Chaining & Nullish Coalescing Correctly

```typescript
// Shows real data only, no fallback to fake
const name = data?.name;  // undefined if missing
const verified = data?.blockchain_verified ?? false;  // Only for booleans
```

### ✅ DO: Create Honest Empty States

```typescript
<div className="empty-state">
  <Icon name="information" />
  <p>This farm hasn't provided {fieldName} information yet</p>
</div>
```

### ✅ DO: Document Fallback Assumptions

```typescript
// Fallback Strategy for FarmRating:
// - If API has rating → show real rating
// - If loading → show skeleton
// - If no rating yet → show "No ratings yet"
// - NEVER show hardcoded 4.2 default
```

### ✅ DO: Use Feature Flags For Missing Data

```typescript
const canShowUnverifiedData = featureFlags.showPreliminaryData;

if (data?.verified) {
  return <VerifiedBadge />;
}
if (canShowUnverifiedData) {
  return <UnverifiedBadge />;  // Honest label
}
return null;  // Hide entirely
```

---

## Component Template: Transparency-Safe Data Display

```typescript
import { FC } from 'react';

interface DataDisplayProps<T> {
  data: T | null;
  isLoading: boolean;
  error?: Error;
  fieldName: string;
  renderData: (data: T) => React.ReactNode;
}

/**
 * ⚠️ TRANSPARENCY RULE: Never show fake data
 * Always show: real data OR loading skeleton OR "not available"
 * Never show: hardcoded defaults, mock data, fabricated values
 */
export const TransparencySafeDisplay: FC<DataDisplayProps<any>> = ({
  data,
  isLoading,
  error,
  fieldName,
  renderData,
}) => {
  // Error state
  if (error) {
    return (
      <div role="alert" className="text-danger">
        {fieldName} information is temporarily unavailable
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <Skeleton className="h-6 w-48" />;
  }

  // Real data available
  if (data !== null && data !== undefined) {
    return <>{renderData(data)}</>;
  }

  // Honest empty state - NO FAKE DATA
  return (
    <div className="text-muted italic">
      {fieldName} not yet provided
    </div>
  );
};
```

---

## Testing Fallback Behavior

### ✅ DO: Test All States

```typescript
describe('FarmName Component', () => {
  test('displays real farm name when available', () => {
    render(<FarmName data={{ name: 'Green Valley Farm' }} />);
    expect(screen.getByText('Green Valley Farm')).toBeInTheDocument();
  });

  test('shows loading skeleton while fetching', () => {
    render(<FarmName data={null} isLoading={true} />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  test('shows honest empty state when no data', () => {
    render(<FarmName data={null} isLoading={false} />);
    expect(screen.getByText('Farm name not available')).toBeInTheDocument();
  });

  test('NEVER shows fake default farm name', () => {
    render(<FarmName data={null} isLoading={false} />);
    expect(screen.queryByText('Granja Sostenible')).not.toBeInTheDocument();
  });
});
```

---

## Audit Checklist: Is My Component Transparency-Safe?

Before shipping any component, verify:

- [ ] No hardcoded default values displayed to users
- [ ] Loading state clearly shows skeleton, not fake data
- [ ] Empty state shows honest "not available" message
- [ ] No special cases for specific production/farm IDs
- [ ] No mock/placeholder URLs in production code
- [ ] No TODO comments with fallback values
- [ ] No fabricated calculations (like 0.6 multiplier)
- [ ] Ratings only shown when real data exists
- [ ] Verification badges only shown when blockchain confirms
- [ ] Carbon data never hardcoded or zero-defaulted
- [ ] Test data cleaned before deployment
- [ ] Fallback strategy consistent with team guidelines
- [ ] Code reviewed by another developer
- [ ] QA tested in real environment with actual API

---

## For Trazo Specifically

**Remember**: You're a **transparency platform**. Every hardcoded value that replaces missing data is a broken promise to your users.

**Your Mission**: Show agricultural transparency.
**Your Enemy**: Hardcoded data hiding the truth.

**Before shipping code, ask**:
- "Would I want to see this fake data if I was buying from this farm?"
- "Would this mislead a consumer about the farm's practices?"
- "Does this contradict our transparency mission?"

If yes → remove the hardcoded data.

---

**Guidelines Updated**: December 11, 2025
**For Platform**: Trazo Agricultural Transparency
**Core Principle**: Real data or nothing. Never fake data.
