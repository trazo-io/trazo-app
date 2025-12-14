# MVP Photo Verification - End-to-End Data Flow Testing Guide

**Status**: Phase 4.1 Complete | **Updated**: 2025-12-09

## Complete Data Flow Path

```
User Form Input
    ↓
EventPreviewModal (calculates mock verification_level based on photos)
    ↓
ConsumerEventCard Preview (displays verification badge)
    ↓
User submits event via NewEvent form
    ↓
Backend API receives POST /api/event/
    ↓
Django serializer normalizes event data
    ↓
get_verification_level() calculates based on:
    - Photo count ✅
    - GPS/timestamp data ✅
    - Event type (weather/equipment/soil auto-upgrade) ✅
    - Vision API content validation ✅
    ↓
Backend returns verification_level in response
    ↓
Frontend receives timeline event in CompleteSummary
    ↓
ProductDetail displays ConsumerEventCard
    ↓
ConsumerEventCard renders tiered verification badge ✅
```

## Test Cases (5 Required Scenarios)

### Test Case 1: Self Reported (0 Photos)
**Scenario**: User creates event with NO photos
```json
{
  "event_type": 1,  // Production event
  "description": "Planted corn",
  "area_covered": "100",
  "area_unit": "acres",
  "album": null  // No photos
}
```

**Expected Flow**:
- EventPreviewModal: verification_level = "self_reported" (50%)
- ConsumerEventCard: Shows gray "Self Reported" badge
- Backend: get_verification_level() returns "self_reported"
- Final Display: Gray badge with info icon

**Verification Points**:
- [ ] Preview shows gray "Self Reported" badge
- [ ] After submit, ProductDetail shows gray badge
- [ ] Badge tooltip explains self-reported data

---

### Test Case 2: Photo Documented (1 Valid Photo)
**Scenario**: User creates event with 1 agricultural photo
```json
{
  "event_type": 1,  // Production event
  "description": "Planted corn",
  "area_covered": "100",
  "area_unit": "acres",
  "album": {
    "images": [
      {
        "id": "img-1",
        "image": "...base64 or URL...",
        "caption": "Planting the field"
      }
    ]
  }
}
```

**Expected Flow**:
- EventPreviewModal: verification_level = "photo_documented" (65%)
  - photoCount = 1 → triggers photo_documented tier
- ConsumerEventCard: Shows teal "Photo Documented (1)" badge
- Backend Vision API: Validates agricultural content
- Final Display: Teal badge with camera icon + photo count

**Verification Points**:
- [ ] Preview shows teal "Photo Documented" badge
- [ ] Badge shows "(1)" to indicate 1 photo
- [ ] After submit, ProductDetail shows same badge
- [ ] Badge tooltip mentions AI-validated agricultural content

---

### Test Case 3: Photo Verified (2+ Valid Photos)
**Scenario**: User creates event with 2+ agricultural photos with GPS/timestamp
```json
{
  "event_type": 1,  // Production event
  "description": "Harvested corn",
  "area_covered": "100",
  "area_unit": "acres",
  "latitude": 40.2732,
  "longitude": -74.5243,
  "date": "2025-12-09T14:30:00Z",
  "album": {
    "images": [
      {"image": "...photo 1..."},
      {"image": "...photo 2..."},
      {"image": "...photo 3..."}
    ]
  }
}
```

**Expected Flow**:
- EventPreviewModal: verification_level = "photo_verified" (80%)
  - photoCount >= 2 + GPS + timestamp → photo_verified
- ConsumerEventCard: Shows blue "Photo Verified (3)" badge
- Backend Vision API: Validates all photos as agricultural
- SerializerMethodField: Checks GPS and timestamp
- Final Display: Blue badge with camera icon + "(3)" photo count

**Verification Points**:
- [ ] Preview shows blue "Photo Verified" badge with count
- [ ] GPS/timestamp data captured correctly
- [ ] After submit, ProductDetail shows blue badge
- [ ] All 3 photos visible in gallery
- [ ] Badge tooltip mentions "2+ verified photos with location data"

---

### Test Case 4: Data Verified (Weather Event Auto-Upgrade)
**Scenario**: Weather event (type 0) auto-upgrades to data_verified
```json
{
  "event_type": 0,  // Weather event
  "description": "Frost damage",
  "weather_type": "FR",
  "lower_temperature": 28,
  "highest_temperature": 32,
  "album": {
    "images": [
      {"image": "...frost photo..."}
    ]
  }
}
```

**Expected Flow**:
- EventPreviewModal: verification_level = "data_verified" (85%)
  - Event type 0 (weather) = auto-upgrade category
  - photoCount >= 1 + auto-upgrade type → data_verified
- ConsumerEventCard: Shows green "Data Verified" badge
- Backend: isAutoUpgradeType check passes
- SerializerMethodField: Returns "data_verified" for weather events
- Final Display: Green badge with check icon

**Verification Points**:
- [ ] Preview shows green "Data Verified" badge (not blue)
- [ ] Weather event type correctly identified
- [ ] After submit, ProductDetail shows green badge
- [ ] No manual verification needed (auto-verified)
- [ ] Badge tooltip mentions "system-verified data"

---

### Test Case 5: Downgraded Verification (AI-Generated Photo)
**Scenario**: Photo flagged as AI-generated or stock image (Vision API)
```json
{
  "event_type": 2,  // Chemical event
  "description": "Applied fertilizer",
  "commercial_name": "NPK 10-10-10",
  "area_treated": 100,
  "area_unit": "acres",
  "album": {
    "images": [
      {
        "image": "...suspicious image...",
        "extra_data": {
          "content_validation": "ai_generated",  // ← Vision API flag
          "flagged_reason": "AI-generated image detected"
        }
      }
    ]
  }
}
```

**Expected Flow**:
- EventPreviewModal: verification_level = "photo_documented" → "self_reported"
  - Image flagged as ai_generated by Vision API
  - Backend helper: _check_valid_agricultural_content() returns false
  - Downgrade from photo_documented to self_reported
- ConsumerEventCard: Shows gray "Self Reported" badge
- Backend: get_verification_level() detects invalid content
- SerializerMethodField: Returns "self_reported" (downgraded)
- Final Display: Gray badge with info icon

**Verification Points**:
- [ ] Invalid photo doesn't increase verification tier
- [ ] Backend correctly flags AI-generated/stock images
- [ ] Final badge is downgraded to self_reported
- [ ] Badge tooltip warns about unverifiable content
- [ ] System prevents perverse incentive of adding fake photos

---

## Complete 8 Event Type Coverage

All event types should properly calculate verification_level:

| Event Type | Type # | Auto-Upgrade to data_verified | Test Required |
|-----------|--------|-------------------------------|---------------|
| Weather | 0 | ✅ YES | Yes (Test Case 4) |
| Production | 1 | ❌ NO | Yes (Test Cases 1-3) |
| Chemical | 2 | ❌ NO | Yes (Test Case 5) |
| General | 3 | ❌ NO | Verify |
| Equipment | 4 | ✅ YES | Verify |
| Soil Management | 5 | ✅ YES | Verify |
| Pest Management | 6 | ❌ NO | Verify |
| Business | 7 | ✅ YES | Verify |

**Auto-Upgrade Types** (auto-escalate to data_verified with any photo):
- Weather (0): Temp/precipitation sensors
- Equipment (4): Equipment sensors/odometer
- Soil Management (5): Soil testing results
- Business (7): Certification documents

---

## Phase 4.2: Exact Preview-Display Matching

### Matching Verification

For each test case, verify:

```typescript
// EventPreviewModal (in form)
previewEvent.verification_level ===
// ConsumerEventCard (in preview)
previewEvent.verification_level ===
// ProductDetail (after submit)
timelineEvent.verification_level
```

All three must match exactly.

### Badge Visual Matching

Verify that badges are identical:
- **Color**: Same colorScheme (gray, teal, blue, green, purple)
- **Icon**: Same icon (info, camera, check, star)
- **Label**: Exact same text ("Self Reported", "Photo Documented", etc.)
- **Tooltip**: Same informative text
- **Photo Count**: When displayed, shows same count "(n)"

### Example Matching Test

```
Test: Production event with 2 photos
├─ EventPreviewModal
│  ├─ calculation: photoCount=2 → "photo_verified"
│  ├─ display: blue badge + "(2)"
│  └─ tooltip: "2+ verified photos..."
├─ ConsumerEventCard (preview)
│  ├─ event.verification_level: "photo_verified"
│  ├─ display: blue badge + "(2)"
│  └─ tooltip: matches exactly
└─ ProductDetail (after submit)
   ├─ timeline event from API: "photo_verified"
   ├─ display: blue badge + "(2)"
   └─ tooltip: matches exactly
   ✅ MATCH CONFIRMED
```

---

## Backend Integration Verification

### Verify Backend Changes

**File**: `/trazo-back/common/views.py` (line 250)
- [ ] `event_type` parameter passed to validation
- [ ] Chemical/equipment/soil events get context-specific validation

**File**: `/trazo-back/carbon/services/photo_evidence_service.py` (line 511-607)
- [ ] `upload_evidence_photo()` method exists
- [ ] Vision API validation called
- [ ] Results stored in extra_data.content_validation

**File**: `/trazo-back/history/serializers.py` (line 274-402)
- [ ] `_check_valid_agricultural_content()` helper method works
- [ ] Vision API results integrated into verification level
- [ ] Invalid photos downgrade verification tier

### Verify API Response Format

When receiving event from API:
```json
{
  "id": "event-123",
  "type": "production",
  "description": "Planted corn",
  "verification_level": "photo_verified",
  "photo_verified_count": 2,
  "album": {
    "images": [...]
  }
}
```

Must include:
- [ ] `verification_level` field present
- [ ] `photo_verified_count` field present
- [ ] Values match backend calculation
- [ ] No fallback/default values ("N/A", "Unknown")

---

## Frontend Integration Verification

### Verify Type Definitions

**File**: `/src/types/standardizedEvents.ts`
- [ ] `verification_level?: VerificationLevel` in StandardizedEventBase
- [ ] `photo_verified_count?: number` in StandardizedEventBase

**File**: `/src/store/api/carbonApi.ts`
- [ ] `verification_level` in timeline event type
- [ ] `photo_verified_count` in timeline event type

### Verify Helper Functions

**File**: `/src/utils/verificationTierHelpers.ts`
- [ ] `getVerificationBadgeConfig()` returns correct config for each tier
- [ ] `getVerificationColor()` returns correct colorScheme
- [ ] `calculatePreviewVerificationLevel()` uses correct logic
- [ ] All 5 helper functions exported and working

### Verify Component Usage

**ConsumerEventCard**:
- [ ] Imports verification helpers
- [ ] Renders tiered badge when `verification_level` exists
- [ ] Shows photo count when `photo_verified_count > 0`
- [ ] Badge uses correct color, icon, tooltip

**EventPreviewModal**:
- [ ] Imports `calculatePreviewVerificationLevel`
- [ ] Calculates verification level from form data
- [ ] Passes to previewEvent object
- [ ] ConsumerEventCard in modal shows correct badge

---

## Success Criteria

✅ **All 5 Test Cases Pass**: Each verification tier correctly displayed
✅ **Preview-Display Matching**: Badges match between preview and final
✅ **All 8 Event Types Verified**: Each type calculates correctly
✅ **Backend Integration**: Vision API results affect verification tier
✅ **No Fallback Data**: All displays use real data, never "N/A" or defaults
✅ **Photo Count Accurate**: Badge correctly shows number of photos
✅ **Auto-Upgrade Works**: Weather/equipment/soil/business events escalate properly
✅ **Invalid Content Downgraded**: AI-generated/stock photos reduce tier
✅ **Type Safety**: Zero TypeScript errors in modified files
✅ **Design Compliance**: Badges follow Trazo minimalist, clean, modern standards

---

## Testing Checklist

- [ ] Test Case 1: Self Reported (0 photos)
- [ ] Test Case 2: Photo Documented (1 valid photo)
- [ ] Test Case 3: Photo Verified (2+ valid photos)
- [ ] Test Case 4: Data Verified (Weather auto-upgrade)
- [ ] Test Case 5: Downgraded (AI-generated photo)
- [ ] All 8 event types verified
- [ ] Preview-display badges match exactly
- [ ] Backend changes working correctly
- [ ] Frontend types defined properly
- [ ] Helper functions all working
- [ ] Zero TypeScript errors
- [ ] Design patterns followed
- [ ] No fallback/placeholder data
- [ ] Photo counts display correctly
- [ ] Auto-upgrade logic working

---

## Notes

This testing guide verifies the complete MVP Photo Verification implementation. All 5 test cases must pass, and the data must flow correctly through the entire system without any fallback values or data loss.

The key success indicator is that **farmers and consumers both see accurate, tiered verification information** that rewards farmers for transparency while building consumer trust.
