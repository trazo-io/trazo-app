# CRITICAL AUDIT: Hardcoded Data & Fallback Values in ProductDetail

**Severity**: 🚨 **CRITICAL** - Undermines Trazo's transparency mission
**Date**: December 11, 2025
**Audit Scope**: ProductDetail.tsx and all related components
**Total Issues**: 29+ instances across 4 files

---

## Executive Summary

Your Product Detail page contains **extensive hardcoded data, fake fallback values, and mock content** that deceive users into believing they're seeing real farm data when they're actually seeing placeholder values.

For a **transparency platform**, this is catastrophic:

| Issue | Impact | Trust Damage |
|-------|--------|-------------|
| Fake farm names shown | "Granja Sostenible" instead of real name | 🔴 Critical |
| False "Verified" badges | Green checkmarks on unverified data | 🔴 Critical |
| Fabricated 4.2-star ratings | Inflates farm reputation artificially | 🔴 Critical |
| Placeholder images labeled "Verified" | Fake verification photos | 🔴 Critical |
| Hardcoded zero carbon for farm 229 | Hides environmental impact | 🔴 Critical |
| Test code in production | Development-only checks still active | 🔴 Critical |
| Unimplemented TODOs with fake data | Features marked unfinished but shipping | 🔴 Critical |

**Core Problem**: The code shows fake data rather than "data not available" when API fails. This creates illusion of verified information that's actually made up.

---

## DETAILED FINDINGS

### 🔴 CATEGORY 1: FAKE FARM IDENTITY DATA

#### File: `ProductDetail.tsx` (Lines 711-712)

**Hardcoded Values:**
```typescript
farmName: 'Granja Sostenible'        // Spanish: "Sustainable Farm"
productName: 'Producto Transparente'  // Spanish: "Transparent Product"
```

**Severity**: CRITICAL
**Problem**: Consumers see hardcoded Spanish names instead of actual farm/product names
**When Triggered**: When API response is incomplete
**Trust Impact**: User sees fake farm identity
**Fix Required**: Remove fallback, show "Data not available"

---

### 🔴 CATEGORY 2: FALSE VERIFICATION BADGES

#### File: `InstantTrustDisplay.tsx` (Lines 72-78, 84-90)

**Hardcoded Values:**
```typescript
isVerified: true,                    // Always true, even for unverified data
verification_badge: true,           // Badge shown even during loading
verification_badges: [
  { type: "verified_farm", verified: true },  // Fake verification
  { type: "sustainable_practices", verified: true }
]
```

**Severity**: CRITICAL
**Problem**: Green "Verified" checkmarks appear on data that hasn't been verified
**When Triggered**: During API calls or on missing data
**UX Issue**: User sees checkmark during "Verifying..." loading state
**Trust Impact**: Completely undermines verification system
**Code Evidence**:
```typescript
// Line 78: Shows verified badge while loading
return (
  <>
    <div className="verification-badge">✓ Verified</div>
    <div className="loading">Verifying transparency details...</div>  // Contradictory!
  </>
);
```

**Fix Required**:
- Remove hardcoded `isVerified: true`
- Only show badges when API confirms verification
- Show "Verifying..." WITHOUT checkmark

---

### 🔴 CATEGORY 3: FABRICATED RATING SCORES

#### File: `ProductDetail.tsx` (Line 770)

**Hardcoded Value:**
```typescript
const safeReputation = Math.max(0, Math.min(5, (completeData as any)?.reputation || 4.2));
//                                                                         ↑
//                                                        FAKE 4.2 DEFAULT RATING!
```

**Severity**: CRITICAL
**Problem**: Farm shows **4.2-star rating** when no real data exists
**When Triggered**: When `completeData?.reputation` is undefined
**Used In**: Lines 897, 1585 (displayed to consumers)
**Trust Impact**: Artificially inflates farm reputation
**Contradiction**: Line 906 falls back to `0` instead (inconsistent!)
**Real Impact**: New farms artificially appear to have good reviews

**Example**:
```
Real Data: No reputation (farm is new)
Displayed to Consumer: ⭐⭐⭐⭐☆ 4.2 stars (FAKE!)
User thinks: This farm must be trustworthy
Reality: It's a fabricated score
```

**Fix Required**:
- Remove `|| 4.2` fallback
- Show "No ratings yet" instead
- Only show stars when real data exists

---

### 🔴 CATEGORY 4: PLACEHOLDER VERIFICATION IMAGES

#### File: `PhotoVerificationGallery.tsx` (Lines 100-110)

**Hardcoded Values:**
```typescript
// For MVP, we'll show placeholder verification status
url: `/api/placeholder/300x200?text=Verified+${data.consumer_name}+${i + 1}`,
caption: `Photo ${i + 1} - Verified by Blockchain`
```

**Severity**: CRITICAL
**Problem**: Placeholder images displayed as "verified" photos
**When Triggered**: When real verification images unavailable
**MVP Comment**: Code marked as temporary but deployed to production
**Trust Impact**: Users see fake "verified" photos as real evidence
**User Confusion**: Image labeled "Verified by Blockchain" but it's a placeholder

**Fix Required**:
- Remove placeholder image generation
- Show "Verification images not available" instead
- Never display placeholder as verification evidence

---

### 🔴 CATEGORY 5: HARDCODED PRODUCTION-SPECIFIC OVERRIDES

#### File: `ProductDetail.tsx` (Lines 1436, 1441)

**Hardcoded Values:**
```typescript
co2e: productionId === '229' ? 0 : averageCO2ePerEvent,
//     ↑ If production 229, FORCE zero carbon impact!

total_emissions: productionId === '229' ? 0 : completeData?.totalEmissions || 0,
//                ↑ ANOTHER hardcoded zero for this farm!
```

**Severity**: CRITICAL
**Problem**: One specific farm (ID 229) is programmed to show zero carbon
**When Triggered**: Whenever farm 229 is viewed
**Trust Impact**: Shows false zero environmental impact for that farm
**User Impact**: Consumers see this farm as carbon-neutral when it may not be

**Fix Required**:
- Delete these hardcoded overrides immediately
- Never special-case individual productions
- Use real calculated carbon data

---

### 🟠 CATEGORY 6: GENERIC FALLBACK NAMES

#### File: Multiple files

**Hardcoded Generic Names:**

1. **`ProductDetail.tsx` Line 902**:
   ```typescript
   "Product"  // Generic fallback name
   ```

2. **`ProductDetail.tsx` Lines 904, 1645**:
   ```typescript
   "Farm"  // Generic fallback name
   ```

3. **`ProductDetail.tsx` Line 1240**:
   ```typescript
   "Sustainable Farm"  // Generic fallback name
   ```

4. **`ProductDetail.tsx` Line 1534**:
   ```typescript
   "Company Information"  // Generic fallback
   ```

5. **`InstantTrustDisplay.tsx`**:
   ```typescript
   "Verified Farm"      // Generic hardcoded name
   "Farm Product"       // Generic hardcoded name
   ```

6. **`ParcelMapInfo.tsx` Lines 162, 1647**:
   ```typescript
   "Location not specified"
   ```

**Severity**: HIGH
**Problem**: Consumers see generic names instead of real farm/product names
**Trust Impact**: Reduces personalization and authenticity
**Fix Required**: Show "Data not available" or skip the section entirely

---

### 🟠 CATEGORY 7: FABRICATED ENGAGEMENT METRICS

#### File: `ProductDetail.tsx` (Lines 718, 898, 896)

**Hardcoded Values:**
```typescript
scansCount: 0,          // Line 718, 898 - Shows zero scans
reviewsCount: 0,        // Line 896 - Shows zero reviews
farmHistory: 5          // Line 719 - TODO comment: "Get from API"
```

**Severity**: MEDIUM
**Problem**: Shows zero engagement even if farm might have real data
**When Triggered**: When API data is missing
**User Perception**: Farm appears unused/unverified
**Code Evidence**:
```typescript
scansCount: 0, // TODO: Get from API
farmHistory: 5 // TODO: Get from API
```

**Fix Required**:
- Implement actual API call for scan counts
- Remove TODO comments with fake data
- Show "No scans yet" instead of 0

---

### 🟠 CATEGORY 8: FAKE PHOTO COUNT CALCULATION

#### File: `ProductDetail.tsx` (Line 714)

**Hardcoded Value:**
```typescript
photoCount: Math.floor((completeData?.timeline?.length || 0) * 0.6)
//                                                             ↑
//                                      ASSUMES 60% of events have photos!
```

**Severity**: MEDIUM
**Problem**: Fabricates photo count based on assumption (0.6 multiplier)
**When Triggered**: When real photo data unavailable
**Logic Flaw**: Assumes correlation between events and photos that doesn't exist
**Trust Impact**: Shows inflated photo verification count

**Example**:
```
Real Events: 10
Calculated Photo Count: 10 * 0.6 = 6 photos
Actual Photos: 2
Displayed: 6 (WRONG!)
```

**Fix Required**:
- Use actual photo count from API
- Remove hardcoded 0.6 multiplier
- Show real numbers only

---

### 🟡 CATEGORY 9: TEST/DEBUG CODE IN PRODUCTION

#### File: `ProductDetail.tsx` (Multiple locations)

**Debug Code Found:**
```typescript
// Line 625-635: Development check
if (productionId === '226') {
  // Special handling for test production
}

// Line 1269-1276: Another test case
if (productionId === '226') {
  // Different special handling
}
```

**Severity**: MEDIUM
**Problem**: Production-specific debug code shipped to live environment
**When Triggered**: When viewing specific test productions
**Trust Impact**: Inconsistent behavior for certain farms
**Fix Required**: Remove all test/debug code

---

### 🟡 CATEGORY 10: INCONSISTENT FALLBACK PATTERNS

#### File: Various files

**Pattern 1 - Inconsistent Default Rating**:
```typescript
Line 770:  || 4.2      // Falls back to 4.2 stars
Line 906:  || 0        // Falls back to 0
```
Same data field, different fallbacks!

**Pattern 2 - Multiple Fallback Layers**:
```typescript
// InstantTrustDisplay.tsx: TWO layers of fallback both with same fake data
catch (error) {
  return {
    isVerified: true,           // Layer 1 fallback
    verification_badge: true,   // Still true!
  };
}
// When that fails:
catch (error) {
  return {
    isVerified: true,           // Layer 2 fallback - SAME FAKE VALUE!
    verification_badge: true,
  };
}
```

**Severity**: MEDIUM
**Problem**: Inconsistent fallback strategy confuses developers and users
**Fix Required**: Standardize fallback approach (all show "not available")

---

## ROOT CAUSE ANALYSIS

### Why Did This Happen?

1. **MVP Code Never Removed**
   - PhotoVerificationGallery.tsx has comments: "For MVP, we'll show placeholders"
   - Production code shipped with MVP caveat still there

2. **Missing API Integration**
   - Lines with `// TODO: Get from API` shipped with hardcoded values
   - Features marked unfinished but deployed

3. **Test Code Not Cleaned**
   - Production IDs (226, 229) have special handling
   - Debug checks left in production

4. **No Fallback Strategy Discussion**
   - Different components use different fallbacks
   - No consistent "data not available" pattern

5. **Transparency Platform Irony**
   - A platform built on transparency shows fake data
   - Defeats the entire purpose

---

## REMEDIATION PLAN

### Phase 1: IMMEDIATE (Critical Security/Trust)

**Priority 1 - Remove False Verification Badges**
```
File: InstantTrustDisplay.tsx
Action: Remove hardcoded isVerified: true
Replace: Show "Verifying..." without checkmark until real verification confirmed
Timeline: TODAY
Impact: Stops showing fake verification
```

**Priority 2 - Remove Fabricated Ratings**
```
File: ProductDetail.tsx (Line 770)
Action: Remove || 4.2 fallback
Replace: Show "No ratings yet" or hide rating section
Timeline: TODAY
Impact: Stops inflating farm reputation artificially
```

**Priority 3 - Delete Production Hardcodes**
```
File: ProductDetail.tsx (Lines 1436, 1441, 625-635, 1269-1276)
Action: Remove all productionId === '229' and === '226' checks
Replace: Delete entirely, use real data only
Timeline: TODAY
Impact: Removes fake zero-carbon override
```

### Phase 2: HIGH (Trust & Transparency)

**Priority 4 - Remove Mock Images**
```
File: PhotoVerificationGallery.tsx (Lines 100-110)
Action: Delete placeholder image generation
Replace: Show "Verification images not available"
Timeline: Within 24 hours
Impact: Stops showing fake verification photos
```

**Priority 5 - Standardize Fallbacks**
```
Files: All ProductDetail components
Action: Replace all hardcoded fallback values
Replace: Consistent "Data not available" message
Timeline: Within 48 hours
Impact: Clear, honest UX
```

### Phase 3: MEDIUM (Code Quality)

**Priority 6 - Implement Missing APIs**
```
Issues: scansCount, farmHistory, reviewsCount with TODOs
Action: Implement actual API calls
Replace: Remove TODO comments with fake data
Timeline: Within 1 week
Impact: Real engagement metrics
```

**Priority 7 - Fix Fake Photo Count**
```
File: ProductDetail.tsx (Line 714)
Action: Use actual photo count from API
Replace: Remove 0.6 multiplier hardcoding
Timeline: Within 1 week
Impact: Accurate photo documentation count
```

### Phase 4: COMPREHENSIVE (Codebase-wide)

**Priority 8 - Audit Entire App**
```
Action: Search entire trazo-app for:
- Hardcoded mock data
- TODO comments with fallback values
- Placeholder URLs and images
- Test/debug code
Timeline: 2 weeks
Impact: Ensure no other transparency violations
```

---

## SPECIFIC CODE FIXES

### Fix #1: InstantTrustDisplay.tsx - Remove False Verification

**BEFORE** (Lines 72-90):
```typescript
isVerified: true,  // FAKE!
verification_badge: true,
verification_badges: [
  { type: "verified_farm", verified: true },  // FAKE!
]
```

**AFTER**:
```typescript
// Only set to true when API confirms
isVerified: data?.blockchain_verified || false,
verification_badge: data?.blockchain_verified ? true : false,
verification_badges: (data?.verification_badges || []).filter(
  v => v.verified === true
)
```

---

### Fix #2: ProductDetail.tsx - Remove Fabricated Rating

**BEFORE** (Line 770):
```typescript
const safeReputation = Math.max(0, Math.min(5, (completeData as any)?.reputation || 4.2));
```

**AFTER**:
```typescript
const safeReputation = (completeData as any)?.reputation;
// If undefined, component should show "No ratings yet" or hide
```

---

### Fix #3: ProductDetail.tsx - Delete Hardcoded Overrides

**BEFORE** (Lines 1436-1441):
```typescript
co2e: productionId === '229' ? 0 : averageCO2ePerEvent,
total_emissions: productionId === '229' ? 0 : completeData?.totalEmissions || 0,
```

**AFTER**:
```typescript
// Always use real data
co2e: averageCO2ePerEvent,
total_emissions: completeData?.totalEmissions || null,
```

---

### Fix #4: PhotoVerificationGallery.tsx - Remove Placeholder Images

**BEFORE** (Lines 100-110):
```typescript
url: `/api/placeholder/300x200?text=Verified+${data.consumer_name}+${i + 1}`,
caption: `Photo ${i + 1} - Verified by Blockchain`
```

**AFTER**:
```typescript
// Only show real images
if (!data?.images || data.images.length === 0) {
  return <div>Verification images not available</div>;
}
// Display only real images
```

---

## IMPACT OF NOT FIXING

### Consumer Trust Damage
- ❌ Users see fake farms, fake ratings, fake verification
- ❌ When they discover the deception, they leave
- ❌ Trazo brand loses credibility in transparency space

### Regulatory Risk
- ❌ False verification claims could trigger FTC investigation
- ❌ Misrepresentation of agricultural data
- ❌ Could violate agricultural transparency laws

### Business Impact
- ❌ Enterprise customers demanding real verification data
- ❌ Blockchain partners won't trust platform with fake data
- ❌ Carbon credit validation impossible with fabricated metrics

### Developer Impact
- ❌ Harder to maintain code with hidden special cases
- ❌ New developers confused by hardcoded overrides
- ❌ Testing becomes unreliable with production hardcodes

---

## SUCCESS CRITERIA

After fixes, the page should:

✅ **Show real data or nothing**
- If API has farm name → show farm name
- If API doesn't have farm name → show "Name not available"
- NEVER show "Granja Sostenible" or other hardcoded defaults

✅ **Never show false verification**
- Checkmark only when API confirms: `blockchain_verified === true`
- Never show checkmark during loading
- Clear distinction between verified and unverified

✅ **Honest rating display**
- Show real reputation score when available
- Show "No ratings yet" when unavailable
- NEVER show inflated 4.2 default

✅ **Real image verification**
- Show actual verification photos only
- NEVER show `/api/placeholder/` URLs to consumers
- Clear message if images unavailable

✅ **No special farm handling**
- Every farm treated identically
- No hardcoded overrides for specific production IDs
- Real carbon data always used

✅ **Clean code**
- No TODO comments with fake data
- No test/debug code in production
- No hidden special cases

---

## AUDIT CHECKLIST

Before closing this audit:

- [ ] All hardcoded farm names removed
- [ ] False verification badges fixed
- [ ] Fabricated 4.2-star rating removed
- [ ] Production 229 zero-carbon override deleted
- [ ] Production 226 debug checks removed
- [ ] Placeholder images removed from code
- [ ] Fake photo count calculation fixed
- [ ] All TODO comments with fallbacks removed
- [ ] Generic fallback names replaced with proper handling
- [ ] InstantTrustDisplay verified messages fixed
- [ ] Code reviewed by team member
- [ ] QA tested on mobile and desktop
- [ ] Real API data confirmed in all fields
- [ ] Entire codebase audited for similar issues

---

## CONCLUSION

Trazo is a **transparency platform**. Showing hardcoded data, fake ratings, false verification badges, and test code in production is a **fundamental betrayal of your mission**.

This isn't about code quality—it's about **consumer trust and platform integrity**.

Every line of hardcoded data that a consumer sees instead of "data not available" is a lie that damages Trazo's credibility.

**Fix this immediately. It's the right thing to do.**

---

**Report Generated**: December 11, 2025
**Audit Completed By**: Claude Code
**Recommendation**: Fix all issues before next production deployment
