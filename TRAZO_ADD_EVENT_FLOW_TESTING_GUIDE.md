# Trazo Add Event Flow - Comprehensive Testing Guide

## 🎯 Mission Critical Scope
**Target Users**: US farmers in California and Iowa (avocados, almonds, corn, soybeans)  
**Core Mission**: Accurate carbon transparency calculations that incentivize comprehensive event logging  
**Critical Requirement**: USDA-compliant emission factors with proper carbon calculations  

---

## 📋 Event Type Coverage Analysis

### Found: 8 Event Types in System
✅ **Weather Events** (id: 0) - Frost, drought, temperature monitoring  
✅ **Production Events** (id: 1) - Planting, harvesting, irrigation, pruning  
✅ **Chemical Events** (id: 2) - Fertilizers, pesticides, herbicides, fungicides  
✅ **General Events** (id: 3) - Fallback category  
✅ **Equipment Events** (id: 4) - Maintenance, fuel consumption, repairs  
✅ **Soil Management Events** (id: 5) - Testing, amendments, pH management  
✅ **Business Events** (id: 6) - Certification, compliance, inspections  
✅ **Pest Management Events** (id: 7) - Scouting, biological control, IPM  

---

## 🔍 Detailed Event Type Audit

## Event Type 1: Chemical Events (ID: 2)
### ✅ Input Field Alignment
**Frontend Fields (ChemicalTab-ENHANCED.jsx)**:
- [ ] **type** → Maps to ChemicalEvent.type (FE/PE/FU/HE) ✅ ALIGNED
- [ ] **commercial_name** → Maps to ChemicalEvent.commercial_name ✅ ALIGNED  
- [ ] **active_ingredient** → Maps to ChemicalEvent.active_ingredient ✅ ALIGNED
- [ ] **concentration** → Maps to ChemicalEvent.concentration ✅ ALIGNED
- [ ] **volume_applied** → Maps to ChemicalEvent.volume ✅ ALIGNED
- [ ] **volume_unit** → L/gal units for US farmers ✅ ALIGNED
- [ ] **area_treated** → Maps to ChemicalEvent.area_treated ✅ ALIGNED  
- [ ] **area_unit** → ha/acres for US farmers ✅ ALIGNED
- [ ] **application_method** → Maps to ChemicalEvent.application_method ✅ ALIGNED
- [ ] **weather_conditions** → Maps to ChemicalEvent.weather_conditions ✅ ALIGNED
- [ ] **target_pest_disease** → Maps to ChemicalEvent.target_pest_disease ✅ ALIGNED
- [ ] **observation** → Maps to ChemicalEvent.observation ✅ ALIGNED

**✅ Trazo Mission Alignment**:
- [x] Fields support transparency storytelling for QR viewers
- [x] Commercial name + active ingredient builds consumer trust
- [x] Application method shows responsible farming practices
- [x] Weather conditions demonstrate environmental consideration

**⚠️ US Target Zone Relevance Issues**:
- [ ] **ISSUE**: Default units are metric (L, ha) vs US farmers prefer (gal, acres)
- [ ] **ISSUE**: Missing US-specific application methods (air blast, ground rig)
- [ ] **ISSUE**: No California/Iowa specific pest targets in dropdown

### ✅ UI/UX Standards Compliance
- [x] **StandardComponents**: Uses StandardField, StandardInput, StandardSelect ✅
- [x] **Form Height**: Consistent h="44px" inputs ✅
- [x] **Spacing**: Proper spacing={4,6,8} patterns ✅
- [ ] **ISSUE**: Not using StandardComponents for all inputs (some raw Chakra)
- [ ] **ISSUE**: Mobile responsiveness not tested for long form

### ✅ Carbon Calculation Validation ⚠️ CRITICAL ISSUES
**API Integration Analysis**:
- [ ] **MAJOR ISSUE**: No carbon calculation API call found in ChemicalTab
- [ ] **MAJOR ISSUE**: CarbonImpactPreview component exists but not integrated  
- [ ] **MAJOR ISSUE**: No conditional triggering when carbon fields complete
- [ ] **MAJOR ISSUE**: Missing payload validation for calculate-event-impact endpoint

**Expected Payload Structure** (based on backend endpoint):
```javascript
{
  "event_id": number,
  "event_type": "chemical",
  "area_covered": number,    // from area_treated field
  "application_rate": number, // from concentration field  
  "volume_applied": number,   // from volume_applied field
  "chemical_type": string     // from type field (FE/PE/FU/HE)
}
```

**⚠️ Carbon Calculation Issues**:
- [ ] **CRITICAL**: No API calls to calculate-event-impact endpoint found
- [ ] **CRITICAL**: Backend expects area_covered but frontend has area_treated
- [ ] **CRITICAL**: Backend expects application_rate but frontend has concentration
- [ ] **CRITICAL**: No unit conversion between frontend (L/gal) and backend expectations

### ✅ Storage & Edit Flow
- [ ] **UNTESTED**: Event creation and database storage
- [ ] **UNTESTED**: Edit form pre-population with saved data
- [ ] **UNTESTED**: Carbon value preservation during editing

---

## Event Type 2: Production Events (ID: 1)
### ✅ Input Field Alignment
**Backend Model Fields** (ProductionEvent):
- [ ] **type** → PL/HA/IR/PR ✅ ALIGNED
- [ ] **observation** → General notes ✅ ALIGNED  
- [ ] **extra_data** → JSON for additional fields ✅ ALIGNED

**⚠️ Field Mapping Issues**:
- [ ] **MAJOR ISSUE**: ProductionTab.jsx component not found/analyzed
- [ ] **ISSUE**: Missing critical fields for carbon calculation (fuel_consumed, equipment_hours)
- [ ] **ISSUE**: No area_covered field for proper carbon calculations

### ✅ UI/UX Standards Compliance
- [ ] **UNTESTED**: ProductionTab component not located for analysis

### ✅ Carbon Calculation Validation ⚠️ CRITICAL
**Backend Carbon Logic** (event_carbon_calculator.py:654):
```python
elif event.type in ["HA", "PL", "GE", "PR", "IR"]:  # ✅ Fixed in previous audit
    calculation_result = VerifiedEmissionFactors.calculate_production_event_emissions(
        production_type=production_type,
        area_covered=area_covered,           # ⚠️ Missing from frontend
        fuel_consumed=fuel_consumed,         # ⚠️ Missing from frontend  
        equipment_hours=equipment_hours      # ⚠️ Missing from frontend
    )
```

**⚠️ Critical Missing Fields**:
- [ ] **CRITICAL**: Frontend missing fuel_consumed field for equipment carbon
- [ ] **CRITICAL**: Frontend missing equipment_hours for machinery emissions
- [ ] **CRITICAL**: Frontend missing area_covered for proper emissions calculation

---

## Event Type 3: Equipment Events (ID: 4)
### ✅ Input Field Alignment
**Backend Model Fields** (EquipmentEvent):
- [ ] **type** → MN/RE/CA/FC/BD/EI ✅ ALIGNED
- [ ] **equipment_type** → Tractor, harvester, etc. ✅ ALIGNED
- [ ] **hours_operated** → Critical for carbon calculation ✅ ALIGNED
- [ ] **fuel_consumed** → Critical for carbon calculation ✅ ALIGNED
- [ ] **fuel_type** → Diesel, gasoline, etc. ✅ ALIGNED
- [ ] **maintenance_description** → For maintenance events ✅ ALIGNED

**✅ US Target Zone Relevance**:
- [x] Equipment types relevant for CA/IA farming (tractors, harvesters)
- [x] Fuel consumption tracking (diesel gallons) appropriate for US
- [x] Hours operated standard for US farm equipment tracking

### ✅ Carbon Calculation Validation ✅ WELL IMPLEMENTED
**Backend Integration** (event_carbon_calculator.py:992):
```python
def calculate_equipment_event_impact(self, event) -> Dict[str, Any]:
    fuel_consumed = float(event.fuel_consumed or 0)
    hours_operated = float(event.hours_operated or 0)
    # Proper USDA emission factors applied ✅
```

**✅ Properly Implemented**:
- [x] fuel_consumed field properly mapped to carbon calculation
- [x] hours_operated used for emission calculations  
- [x] USDA emission factors applied for diesel/gasoline

---

## Event Type 4: Weather Events (ID: 0)
### ✅ Input Field Alignment  
**Backend Model Fields** (WeatherEvent):
- [ ] **type** → FR/DR/HL/HT/TS/HW/HH/LH ✅ ALIGNED
- [ ] **temperature** → Relevant for CA/IA conditions ✅ ALIGNED
- [ ] **wind_speed** → Weather monitoring ✅ ALIGNED
- [ ] **humidity** → Environmental tracking ✅ ALIGNED

**✅ Carbon Calculation** ⚠️ LIMITED IMPACT:
Weather events typically have minimal direct carbon impact but affect other event calculations.

---

## Event Type 5: Soil Management Events (ID: 5)  
### ✅ Input Field Alignment
**Backend Model Fields** (SoilManagementEvent):
- [ ] **type** → ST/PA/OM/CC/TI/CO ✅ ALIGNED
- [ ] **ph_level** → Soil testing results ✅ ALIGNED
- [ ] **organic_matter_content** → Soil health ✅ ALIGNED
- [ ] **amendment_type** → Lime, compost, etc. ✅ ALIGNED
- [ ] **application_rate** → Critical for carbon calculation ✅ ALIGNED

**⚠️ Carbon Calculation Issues**:
- [ ] **ISSUE**: Missing area_treated field for proper emission calculations
- [ ] **ISSUE**: Amendment application rates not properly integrated with carbon API

---

## Event Type 6: Pest Management Events (ID: 7)
### ✅ Input Field Alignment
**Backend Model Fields** (PestManagementEvent):  
- [ ] **type** → SC/BR/TM/PI/TA/IP ✅ ALIGNED
- [ ] **pest_type** → Target pest identification ✅ ALIGNED
- [ ] **beneficial_species** → For biological control ✅ ALIGNED
- [ ] **monitoring_results** → Scouting data ✅ ALIGNED

**✅ Carbon Calculation**: Minimal direct carbon impact (mainly scouting/monitoring activities).

---

## Event Type 7: Business Events (ID: 6)
### ✅ Input Field Alignment
**Backend Model Fields** (BusinessEvent):
- [ ] **type** → CE/CM/IN ✅ ALIGNED  
- [ ] **certification_type** → Organic, carbon credits ✅ ALIGNED
- [ ] **compliance_standard** → Regulatory requirements ✅ ALIGNED
- [ ] **inspector_name** → Third-party validation ✅ ALIGNED

**✅ Carbon Calculation**: No direct carbon impact (administrative activities).

---

## Event Type 8: General Events (ID: 3)
### ✅ Input Field Alignment
**Backend Model Fields** (GeneralEvent):
- [ ] **name** → Event name ✅ ALIGNED
- [ ] **observation** → General notes ✅ ALIGNED
- [ ] **extra_data** → JSON for flexibility ✅ ALIGNED

**⚠️ Carbon Calculation**: Falls back to minimal calculation - should be avoided for carbon-relevant events.

---

## 🚨 CRITICAL SYSTEM ISSUES FOUND

### 1. **Carbon Calculation API Integration - BROKEN**
- **ISSUE**: No carbon calculation API calls found in event form tabs
- **IMPACT**: Farmers not getting carbon preview during event creation
- **SOLUTION**: Integrate CarbonImpactPreview component in all carbon-relevant tabs
- **FILES TO FIX**: All event tab components (ChemicalTab, ProductionTab, etc.)

### 2. **Field Mapping Inconsistencies**  
- **ISSUE**: Backend expects `area_covered`, frontend has `area_treated`
- **ISSUE**: Backend expects `application_rate`, frontend has `concentration`
- **IMPACT**: API calls will fail or return incorrect calculations
- **SOLUTION**: Standardize field names between frontend and backend

### 3. **Missing Critical Carbon Fields**
- **ISSUE**: Production events missing `fuel_consumed`, `equipment_hours`
- **ISSUE**: Soil events missing `area_treated` for emission calculations
- **IMPACT**: Incomplete carbon calculations for major event types
- **SOLUTION**: Add missing fields to frontend forms

### 4. **US Unit Conversion Issues**
- **ISSUE**: Forms default to metric (L, ha) vs US units (gal, acres)
- **ISSUE**: No automatic unit conversion for API payload
- **IMPACT**: Incorrect carbon calculations for US farmers
- **SOLUTION**: Implement US unit defaults and conversion logic

### 5. **StandardComponents Incomplete Usage**
- **ISSUE**: Some forms still use raw Chakra components vs StandardComponents
- **IMPACT**: Inconsistent UI/UX across Trazo platform
- **SOLUTION**: Migrate all forms to StandardComponents

---

## 🎯 PRODUCTION READINESS ASSESSMENT

### ✅ READY FOR PRODUCTION:
1. **Equipment Events** - Well implemented with proper carbon calculations
2. **Weather Events** - Basic implementation sufficient for limited carbon impact
3. **Backend Carbon Calculator** - USDA emission factors properly implemented

### ⚠️ NEEDS IMMEDIATE FIXES:
1. **Chemical Events** - Missing carbon API integration ⚠️ HIGH PRIORITY
2. **Production Events** - Missing critical carbon fields ⚠️ HIGH PRIORITY  
3. **Soil Management Events** - Incomplete carbon field mapping ⚠️ MEDIUM PRIORITY

### 🚨 BLOCKED FROM PRODUCTION:
1. **Carbon Calculation API Integration** - No API calls found in forms ⚠️ CRITICAL
2. **Field Mapping Standardization** - Backend/frontend mismatch ⚠️ CRITICAL
3. **US Unit Support** - Metric defaults inappropriate for US farmers ⚠️ CRITICAL

---

## 📝 IMMEDIATE ACTION PLAN

### Priority 1 (Critical - Must Fix Before Production):
1. **Integrate carbon calculation API calls in all event forms**
2. **Standardize field names between frontend/backend** 
3. **Add missing carbon calculation fields** (fuel_consumed, equipment_hours, area_covered)
4. **Implement US unit defaults and conversion**

### Priority 2 (High - Fix Within 1 Week):
1. **Complete StandardComponents migration**
2. **Add CA/IA specific dropdown options**
3. **Implement proper edit flow validation**
4. **Add comprehensive form validation**

### Priority 3 (Medium - Fix Within 2 Weeks):
1. **Mobile responsiveness testing**
2. **Accessibility improvements**
3. **Performance optimization**
4. **User experience enhancements**

---

## ✅ SUCCESS CRITERIA VERIFICATION

**❌ FAILED**: Carbon calculations not 100% accurate (missing API integration)  
**❌ FAILED**: UI/UX not consistent (incomplete StandardComponents usage)  
**❌ FAILED**: Forms not intuitive for CA/IA farmers (metric unit defaults)  
**❌ FAILED**: Missing comprehensive, accurate data collection (missing carbon fields)  
**❌ FAILED**: Not building consumer trust (no carbon preview during creation)

**RECOMMENDATION**: **BLOCK PRODUCTION DEPLOYMENT** until Priority 1 issues resolved.

---

## 📚 Files Requiring Immediate Attention

1. **`/views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx`** - Add carbon API integration
2. **`/views/Dashboard/Dashboard/components/forms/ProductionTab.jsx`** - Add missing carbon fields  
3. **`/components/Events/CarbonImpactPreview.tsx`** - Integrate into all forms
4. **`/store/api/carbonApi.ts`** - Verify API payload structure
5. **`/carbon/views.py`** - Ensure field name consistency with frontend

This testing guide identifies **CRITICAL** issues that must be resolved before Trazo's add event flow is production ready for US farmers.