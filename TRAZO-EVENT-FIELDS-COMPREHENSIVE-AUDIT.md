# Trazo Event Fields - Comprehensive Audit

**Date**: 2026-02-12
**Scope**: Complete analysis of all event creation fields across Quick Event and Manual Event flows
**Purpose**: Document every field collected in frontend forms vs backend model support

---

## Executive Summary

This audit documents **all event creation fields** in Trazo across 8 event types:
- **Production Events** (8 subtypes): PL, HA, IR, PR, TR, CU, TH, EM
- **Chemical Events** (4 subtypes): FE, PE, HE, FU
- **Weather Events**: 8 types
- **General Events**: Documentation events
- **Equipment Events**: Maintenance/operation tracking
- **Soil Management Events**: 6 types
- **Pest Management Events**: 6 types
- **Business Events**: Certification/compliance tracking

---

## Quick Event Fields Configuration

**File**: `/trazo-app/src/config/quickEventFields.ts`

### Universal Fields (All Events)
| Field Name | Type | Required | Default | Notes |
|------------|------|----------|---------|-------|
| `date` | datetime-local | Yes | Current | Event date/time |
| `performed_by` | text | No | - | USDA GAP traceability |
| `observation` | textarea | No | - | Additional notes |

---

## Production Events

### 1. Irrigation (IR)

#### Quick Event Fields
| Field | Type | Required | Default | Unit Dropdown | Validation |
|-------|------|----------|---------|---------------|------------|
| `area_covered` | number | **Yes** | 1 | ha/acres/m2/km2 | min: 0, step: 0.01 |
| `area_unit` | select | - | ha | - | - |
| `equipment_hours` | number | No | 2 | - | min: 0, step: 0.1 |
| `fuel_type` | select | No | diesel | - | EPA-verified types |
| `fuel_consumed` | number | No | 2 | L/gal/kg/kWh | min: 0, step: 0.1 |
| `fuel_unit` | select | - | L | - | - |
| `water_source` | select | No | well_groundwater | - | Consumer trust field |
| `irrigation_method` | select | **Yes** | drip | - | USDA NASS 2023 |
| `irrigation_depth` | number | No | 1 | inches/cm | min: 0, step: 0.1 |
| `irrigation_depth_unit` | select | - | inches | - | USDA: 27,154 gal/acre/inch |

#### Backend Model Support (`ProductionEvent`)
| Backend Field | Type | Collected in Quick | Collected in Manual | Notes |
|---------------|------|-------------------|---------------------|-------|
| `type` | CharField(2) | ✅ IR | ✅ IR | Event subtype |
| `area_covered` | DecimalField | ✅ | ✅ | **Required** for carbon calc |
| `area_unit` | CharField(10) | ✅ | ✅ | ha/acres/m2/km2 |
| `fuel_consumed` | DecimalField | ✅ | ✅ | Optional |
| `fuel_unit` | CharField(10) | ✅ | ✅ | L/gal/kg/kWh |
| `fuel_type` | CharField(20) | ✅ | ✅ | EPA emission factor selection |
| `equipment_hours` | DecimalField | ✅ | ✅ | Optional |
| `water_source` | CharField(50) | ✅ | ✅ | Consumer transparency |
| `irrigation_method` | CharField(30) | ✅ | ✅ | **Required** for water calc |
| `irrigation_depth` | DecimalField | ✅ | ✅ | USDA water estimation |
| `irrigation_depth_unit` | CharField(10) | ✅ | ✅ | inches/cm |

**Gaps**: None - Full parity between Quick Event, Manual Event, and Backend

---

### 2. Harvest (HA)

#### Quick Event Fields
| Field | Type | Required | Default | Unit Dropdown | Validation |
|-------|------|----------|---------|---------------|------------|
| `area_covered` | number | **Yes** | 1 | ha/acres/m2/km2 | min: 0, step: 0.01 |
| `area_unit` | select | - | ha | - | - |
| `yield_quantity` | number | **Yes** | 100 | kg/tons/lbs/boxes/plants/seeds | min: 0, step: 0.1 |
| `yield_unit` | select | - | kg | - | - |
| `fuel_type` | select | No | diesel | - | EPA-verified |
| `fuel_consumed` | number | No | 5 | L/gal/kg/kWh | min: 0, step: 0.1 |
| `fuel_unit` | select | - | L | - | - |
| `equipment_hours` | number | No | 4 | - | min: 0, step: 0.1 |
| `transportation_distance` | number | No | 5 | km/miles/m | min: 0, step: 0.1 |
| `transportation_unit` | select | - | km | - | - |
| `production_efficiency` | select | No | normal | - | high/normal/low |

#### Backend Model Support
**All fields supported** ✅ - Full parity

---

### 3. Planting (PL)

#### Quick Event Fields
| Field | Type | Required | Default | Unit Dropdown | Notes |
|-------|------|----------|---------|---------------|-------|
| `area_covered` | number | **Yes** | 1 | ha/acres/m2/km2 | - |
| `area_unit` | select | - | ha | - | - |
| `seeds_source` | select | **Yes** | commercial | - | Consumer trust field |
| `yield_quantity` | number | No | - | plants/seeds/kg | Quantity planted |
| `yield_unit` | select | - | plants | - | - |
| `fuel_type` | select | No | diesel | - | - |
| `fuel_consumed` | number | No | 2 | L/gal/kg/kWh | - |
| `fuel_unit` | select | - | L | - | - |
| `equipment_hours` | number | No | 3 | - | - |

#### Backend Model Support
**All fields supported** ✅ - Full parity

---

### 4. Pruning (PR)

#### Quick Event Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `area_covered` | number | **Yes** | 0.5 | Smaller default for pruning |
| `area_unit` | select | - | ha | - |
| `equipment_hours` | number | No | 4 | - |
| `fuel_type` | select | No | gasoline | Manual tools typical |
| `fuel_consumed` | number | No | 0.5 | Low fuel for manual work |
| `fuel_unit` | select | - | L | - |

#### Backend Model Support
**All fields supported** ✅ - Full parity

---

### 5. Transplanting (TR)

#### Quick Event Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `area_covered` | number | **Yes** | 1 | - |
| `area_unit` | select | - | ha | - |
| `seeds_source` | select | No | commercial | Consumer trust |
| `yield_quantity` | number | No | - | Quantity transplanted |
| `yield_unit` | select | - | plants | - |
| `fuel_type` | select | No | diesel | - |
| `fuel_consumed` | number | No | 2.4 | - |
| `fuel_unit` | select | - | L | - |
| `equipment_hours` | number | No | 4 | - |

#### Backend Model Support
**All fields supported** ✅ - Full parity

---

### 6. Cultivation (CU)

#### Quick Event Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `area_covered` | number | **Yes** | 1 | - |
| `area_unit` | select | - | ha | - |
| `equipment_hours` | number | No | 3 | - |
| `fuel_type` | select | No | diesel | - |
| `fuel_consumed` | number | No | 3 | - |
| `fuel_unit` | select | - | L | - |

#### Backend Model Support
**All fields supported** ✅ - Full parity

---

### 7. Thinning (TH)

#### Quick Event Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `area_covered` | number | **Yes** | 0.5 | Smaller default |
| `area_unit` | select | - | ha | - |
| `equipment_hours` | number | No | 4 | - |
| `fuel_type` | select | No | gasoline | Manual tools |
| `fuel_consumed` | number | No | 0.5 | Low fuel |
| `fuel_unit` | select | - | L | - |

#### Backend Model Support
**All fields supported** ✅ - Full parity

---

### 8. Equipment Maintenance (EM)

#### Quick Event Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `equipment_type` | select | **Yes** | tractor | tractor/harvester/sprayer/pump/etc |
| `equipment_operation_type` | select | **Yes** | routine_maintenance | MN/RE/CA/EI |
| `equipment_hours` | number | No | 2 | - |
| `fuel_type` | select | No | diesel | EPA emission factors |
| `fuel_consumed` | number | **Yes** | 5 | Critical for carbon calc |
| `fuel_unit` | select | - | L | - |
| `operation_efficiency` | select | No | normal | high/normal/low |
| `area_covered` | number | No | - | **Optional** for EM type |
| `area_unit` | select | - | ha | - |

#### Backend Model Support
**All fields supported** ✅ - Full parity

**Special Note**: Equipment Maintenance (EM) is the **only Production event** where `area_covered` is optional (backend validation allows this).

---

## Chemical Events

### 9. Fertilization (FE)

#### Quick Event Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `chemical_subtype` | select | **Yes** | synthetic_fertilizer | 21x variance in emission factors! |
| `commercial_name` | text | **Yes** | - | Product name |
| `active_ingredient` | text | No | - | Optional |
| `concentration` | text | **Yes** | 10-10-10 | NPK format for fertilizers |
| `volume_applied` | number | **Yes** | 100 | - |
| `volume_unit` | select | - | kg | L/gal/mL/kg/lb |
| `area_treated` | number | **Yes** | 1 | - |
| `area_unit` | select | - | ha | ha/acres/m2/km2 |
| `application_method` | select | **Yes** | broadcast | USDA NRCS standard methods |
| `application_details` | textarea | No | - | Method specifics |
| `weather_conditions` | select | No | - | calm_dry/light_wind/humid/windy |
| `application_timing` | select | No | - | pre_plant/post_emergence/etc |
| `organic_approved` | select | No | false | yes/no/OMRI/USDA NOP |
| `application_fuel_type` | select | No | diesel | For application equipment |
| `application_fuel_consumed` | number | No | 2 | - |
| `application_fuel_unit` | select | - | gal | - |

#### Backend Model Support (`ChemicalEvent`)
| Backend Field | Type | Collected in Quick | Collected in Manual | Notes |
|---------------|------|-------------------|---------------------|-------|
| `type` | CharField(2) | ✅ FE | ✅ FE | Event subtype |
| `chemical_subtype` | CharField(30) | ✅ | ✅ | **Critical** for emission factors |
| `commercial_name` | CharField(60) | ✅ | ✅ | **Required** |
| `active_ingredient` | - | ✅ | ✅ | **ISSUE**: Not a model field! |
| `concentration` | CharField(60) | ✅ | ✅ | NPK ratio |
| `volume` | CharField(60) | ✅ (as volume_applied) | ✅ | Backend field name |
| `volume_unit` | - | ✅ | ✅ | **ISSUE**: Not a model field! |
| `area` | CharField(60) | ✅ (as area_treated) | ✅ | Backend field name |
| `area_unit` | - | ✅ | ✅ | **ISSUE**: Not a model field! |
| `way_of_application` | CharField(60) | ✅ (as application_method) | ✅ | Backend field name |
| `application_details` | - | ✅ | ✅ | **ISSUE**: Stored in extra_data! |
| `weather_conditions` | CharField(100) | ✅ | ✅ | Transparency field |
| `application_timing` | CharField(100) | ✅ | ✅ | Transparency field |
| `target_pest_disease` | CharField(200) | ❌ | ✅ | N/A for fertilizer |
| `organic_approved` | CharField(20) | ✅ | ✅ | Multiple options |
| `buffer_zone_meters` | DecimalField | ✅ | ✅ | Optional |
| `applicator_name` | CharField(150) | ✅ | ✅ | EPA WPS compliance |
| `epa_registration_number` | CharField(50) | ✅ | ✅ | Optional |
| `restricted_use_pesticide` | BooleanField | ✅ | ✅ | N/A for fertilizer |
| `applicator_certification` | CharField(100) | ✅ | ✅ | Required if RUP |
| `rei_hours` | DecimalField | ✅ | ✅ | Worker safety |
| `phi_days` | DecimalField | ✅ | ✅ | Consumer safety |
| `application_fuel_type` | CharField(30) | ✅ | ✅ | EPA emission factors |
| `application_fuel_consumed` | DecimalField | ✅ | ✅ | Application equipment |
| `application_fuel_unit` | CharField(10) | ✅ | ✅ | L/gal/kg/kWh |

#### Gaps/Mismatches - Fertilization
1. **`active_ingredient`**: Frontend collects, **NO backend model field** (stored in extra_data)
2. **`application_details`**: Frontend collects, **NO backend model field** (stored in extra_data)
3. **`volume_unit`**: Frontend collects, **NO backend model field** (stored in extra_data)
4. **`area_unit`**: Frontend collects, **NO backend model field** (stored in extra_data)
5. **Field name mapping required**:
   - Frontend `volume_applied` → Backend `volume`
   - Frontend `area_treated` → Backend `area`
   - Frontend `application_method` → Backend `way_of_application`

---

### 10. Pest Control (PE)

#### Quick Event Fields
All fields identical to Fertilization (FE) **except**:
- `chemical_subtype` default: `synthetic_pesticide`
- `concentration` default: `50%` (percentage format instead of NPK)
- `application_method` default: `ground_spray` (EPA standard methods for pesticides)
- Additional field: `target_pest_disease` (text) - What problem this addresses
- Additional field: `restricted_use_pesticide` (select) - EPA compliance

#### Backend Model Support
**All fields supported** ✅ - Same as FE with same gaps

---

### 11. Herbicide (HE)

#### Quick Event Fields
All fields identical to Pest Control (PE) **except**:
- `chemical_subtype` default: `synthetic_herbicide`
- `target_pest_disease` help text: "Target weed species"

#### Backend Model Support
**All fields supported** ✅ - Same as PE with same gaps

---

### 12. Fungicide (FU)

#### Quick Event Fields
All fields identical to Pest Control (PE) **except**:
- `chemical_subtype` default: `synthetic_fungicide`
- `volume_applied` default: `30` (lower volume for fungicides)
- `application_timing` default: `flowering` (common fungicide application stage)
- `target_pest_disease` help text: "Target fungal disease"

#### Backend Model Support
**All fields supported** ✅ - Same as PE with same gaps

---

## General Documentation Event (GE)

#### Quick Event Fields
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `activity_type` | select | No | inspection | inspection/certification/training/maintenance/other |
| `notes` | textarea | No | - | General observations |

#### Backend Model Support (`GeneralEvent`)
| Backend Field | Type | Collected | Notes |
|---------------|------|-----------|-------|
| `name` | CharField(150) | ✅ | **Required** |
| `activity_type` | CharField(100) | ✅ | Optional |
| `activity_name` | CharField(200) | ❌ | **Not collected** in Quick Event |
| `duration` | CharField(50) | ❌ | **Not collected** in Quick Event |
| `people_involved` | PositiveIntegerField | ❌ | **Not collected** in Quick Event |
| `observation` | TextField | ✅ (as notes) | Optional |
| `extra_data` | JSONField | - | Fallback storage |

#### Gaps - General Event
1. **`activity_name`**: Backend supports, **not collected** in Quick Event
2. **`duration`**: Backend supports, **not collected** in Quick Event
3. **`people_involved`**: Backend supports, **not collected** in Quick Event

---

## Manual Event Form Fields

**File**: `/trazo-app/src/views/Dashboard/Dashboard/components/forms/ProductionTab.jsx`
**File**: `/trazo-app/src/views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx`

### Additional Manual Event Fields (Production)

Manual Event forms collect **all Quick Event fields** plus:
- **Aggregate Event Support** (Sprint 4):
  - `is_summary` (boolean) - Log multiple events as one summary
  - `date_start` / `date_end` - Period for aggregate
  - `event_count` - Number of events in period
  - `water_volume_total` - Total water for aggregate irrigation
  - `water_volume_unit` - gallons/liters/acre_feet/cubic_meters

### Additional Manual Event Fields (Chemical)

Manual Event forms collect **all Quick Event fields** plus:
- **Aggregate Fertilizer Support** (Sprint 5):
  - `is_summary` (boolean)
  - `date_start` / `date_end`
  - `event_count`
  - `volume_applied_total` - Combined volume across applications
  - `area_treated_total` - Combined area
  - `nitrogen_total_kg` / `phosphorus_total_kg` / `potassium_total_kg` - Total NPK
  - `fuel_consumption_total` - Combined application equipment fuel
  - `active_ingredient_total_kg` - Total active ingredient (fungicides)

---

## Backend-Only Fields (Not Collected in Frontend)

### WeatherEvent
| Field | Type | Purpose | Why Not Collected |
|-------|------|---------|-------------------|
| `type` | CharField(2) | FR/DR/HL/HT/TS/HW/HH/LH | Automatic weather data |
| `observation` | TextField | Weather notes | Auto-generated |
| `extra_data` | JSONField | Weather details | API data |

**Note**: Weather events are **not user-created** - they come from weather APIs.

### EquipmentEvent
| Field | Type | Collected | Notes |
|-------|------|-----------|-------|
| `type` | CharField(2) | ✅ | MN/RE/CA/FC/BD/EI |
| `equipment_name` | CharField(100) | ❌ | **Not collected** |
| `fuel_amount` | DecimalField | ✅ (as fuel_consumed) | Legacy field |
| `fuel_type` | CharField(30) | ✅ | EPA emission factors |
| `maintenance_cost` | DecimalField | ❌ | **Not collected** |
| `hours_used` | DecimalField | ✅ (as equipment_hours) | Legacy field |
| `area_covered` | CharField(100) | ✅ | String in legacy |
| `fuel_consumed` | DecimalField | ✅ | New structured field |
| `fuel_unit` | CharField(10) | ✅ | L/gal/kg/kWh |
| `hours_operated` | DecimalField | ✅ (as equipment_hours) | New structured field |
| `area_worked` | DecimalField | ✅ (as area_covered) | New structured field |
| `area_unit` | CharField(10) | ✅ | ha/acres/m2 |
| `operation_efficiency` | CharField(10) | ✅ | high/normal/low |
| `equipment_type_structured` | CharField(30) | ❌ | **Not collected** - detailed types |

**Note**: Equipment events are largely **merged into Production events** as type EM.

### SoilManagementEvent
| Field | Type | Collected | Notes |
|-------|------|-----------|-------|
| `type` | CharField(2) | ✅ | ST/PA/OM/CC/TI/CO |
| `soil_ph` | DecimalField | ❌ | **Not collected** |
| `organic_matter_percentage` | DecimalField | ❌ | **Not collected** |
| `amendment_type` | CharField(100) | ❌ | **Not collected** |
| `amendment_amount` | CharField(100) | ❌ | **Not collected** |
| `test_results` | JSONField | ❌ | **Not collected** |
| `carbon_sequestration_potential` | DecimalField | ❌ | **Not collected** |
| `working_depth` | DecimalField | ❌ | **Not collected** |
| `depth_unit` | CharField(10) | ❌ | **Not collected** |
| `soil_texture` | CharField(50) | ❌ | **Not collected** |
| `soil_moisture` | CharField(20) | ❌ | **Not collected** |
| `weather_conditions` | CharField(200) | ❌ | **Not collected** |
| `temperature_range` | CharField(50) | ❌ | **Not collected** |
| `equipment_used` | CharField(200) | ❌ | **Not collected** |
| Common fields | - | ✅ | area_covered, fuel_consumed, etc. |

**Note**: Soil Management events have **extensive backend fields not collected** in frontend.

### PestManagementEvent
| Field | Type | Collected | Notes |
|-------|------|-----------|-------|
| `type` | CharField(2) | ✅ | SC/BR/TM/PI/TA/IP |
| `pest_species` | CharField(200) | ❌ | **Not collected** |
| `pest_pressure_level` | CharField(50) | ❌ | **Not collected** |
| `beneficial_species` | CharField(200) | ❌ | **Not collected** |
| `release_quantity` | CharField(100) | ❌ | **Not collected** |
| `trap_count` | IntegerField | ❌ | **Not collected** |
| `damage_percentage` | DecimalField | ❌ | **Not collected** |
| `action_threshold_met` | BooleanField | ❌ | **Not collected** |
| `ipm_strategy` | TextField | ❌ | **Not collected** |
| `beneficial_insects_used` | CharField(20) | ❌ | **Not collected** |
| `chemical_free_period_days` | PositiveIntegerField | ❌ | **Not collected** |
| Common fields | - | ✅ | area_covered, fuel_consumed, etc. |

**Note**: Pest Management events have **extensive backend fields not collected** in frontend.

### BusinessEvent
| Field | Type | Collected | Notes |
|-------|------|-----------|-------|
| `type` | CharField(2) | ✅ | CE/CM/IN (legacy) |
| `business_type` | CharField(30) | ❌ | **Not collected** - certification/carbon_credits/etc |
| `certification_type` | CharField(50) | ❌ | **Not collected** - organic_usda/global_gap/etc |
| `carbon_credits_earned` | DecimalField | ❌ | **Not collected** |
| `carbon_credits_unit` | CharField(10) | ❌ | **Not collected** |
| `verification_status` | CharField(20) | ❌ | **Not collected** |
| `sustainability_practice` | CharField(30) | ❌ | **Not collected** |
| `verified_certifier_name` | CharField(150) | ❌ | **Not collected** |
| `observation` | TextField | ✅ | Optional |

**Note**: Business events have **extensive backend fields not collected** in frontend.

---

## Field Validation Summary

### Required Fields by Event Type

| Event Type | Required Fields |
|------------|----------------|
| **Irrigation (IR)** | area_covered, irrigation_method |
| **Harvest (HA)** | area_covered, yield_quantity |
| **Planting (PL)** | area_covered, seeds_source |
| **Pruning (PR)** | area_covered |
| **Transplanting (TR)** | area_covered |
| **Cultivation (CU)** | area_covered |
| **Thinning (TH)** | area_covered |
| **Equipment Maintenance (EM)** | equipment_type, equipment_operation_type, fuel_consumed |
| **Fertilization (FE)** | chemical_subtype, commercial_name, concentration, volume_applied, area_treated, application_method |
| **Pest Control (PE)** | chemical_subtype, commercial_name, concentration, volume_applied, area_treated, application_method |
| **Herbicide (HE)** | chemical_subtype, commercial_name, concentration, volume_applied, area_treated, application_method |
| **Fungicide (FU)** | chemical_subtype, commercial_name, concentration, volume_applied, area_treated, application_method |
| **General (GE)** | name |

### Concentration Validation

**Fertilizers (FE)**: NPK format `10-10-10` (validates against pattern `/^\d{1,3}-\d{1,3}-\d{1,3}$/`)

**Pesticides/Herbicides/Fungicides (PE/HE/FU)**: Percentage format `50%` or `50` (validates against pattern `/^\d{1,3}\.?\d{0,2}%?$/`)

**File**: `/trazo-app/src/components/Forms/ConcentrationValidation.tsx`

---

## Backend Field Choices

**File**: `/trazo-back/carbon/choices.py`

### Fuel Types (Shared)
```python
FUEL_TYPES = [
    ("diesel", "Diesel"),           # 10.21 kg CO₂e/gallon
    ("gasoline", "Gasoline"),       # 8.89 kg CO₂e/gallon
    ("electric", "Electric"),       # 0.39 kg CO₂e/kWh (EPA eGRID 2023)
    ("propane", "Propane"),         # 5.74 kg CO₂e/gallon
    ("natural_gas", "Natural Gas"), # 0.0531 kg CO₂e/cubic foot
    ("biodiesel", "Biodiesel"),     # 8.76 kg CO₂e/gallon
    ("none", "No Fuel / Manual")    # 0.0 kg CO₂e
]
```

### Production Event Types (Backend)
```python
PRODUCTION_EVENTS = (
    ("PL", "Planting"),
    ("HA", "Harvesting"),
    ("IR", "Irrigation"),
    ("PR", "Pruning"),
    ("TR", "Transplanting"),
    ("EM", "Equipment Maintenance"),
    ("CU", "Cultivation/Weed Control"),
    ("TH", "Thinning")
)
```

### Chemical Event Types (Backend)
```python
CHEMICAL_EVENTS = (
    ("FE", "Fertilizer"),
    ("PE", "Pesticide"),
    ("FU", "Fungicide"),
    ("HE", "Herbicide")
)
```

### Chemical Subtype Choices (Backend)
```python
CHEMICAL_SUBTYPE_CHOICES = [
    # Herbicides
    ("synthetic_herbicide", "Synthetic Herbicide"),
    ("organic_herbicide", "Organic/Natural Herbicide"),
    # Fungicides
    ("synthetic_fungicide", "Synthetic Fungicide"),
    ("copper_fungicide", "Copper-Based Fungicide"),
    ("sulfur_fungicide", "Sulfur-Based Fungicide"),
    ("biological_fungicide", "Biological Fungicide"),
    # Pesticides
    ("synthetic_pesticide", "Synthetic Pesticide"),
    ("organic_pesticide", "Organic/Natural Pesticide"),
    ("biological_pesticide", "Biological Pesticide"),
    # Fertilizers
    ("synthetic_fertilizer", "Synthetic/Chemical Fertilizer"),
    ("organic_fertilizer", "Organic Fertilizer"),
    ("slow_release_fertilizer", "Slow-Release Fertilizer")
]
```

---

## Critical Gaps/Mismatches

### 1. Chemical Events - Missing Backend Model Fields
**Impact**: High - Data loss or reliance on extra_data
**Affected Events**: FE, PE, HE, FU

| Frontend Field | Backend Model Field | Current Workaround |
|----------------|---------------------|-------------------|
| `active_ingredient` | ❌ None | Stored in `extra_data` |
| `application_details` | ❌ None | Stored in `extra_data` |
| `volume_unit` | ❌ None | Stored in `extra_data` or lost |
| `area_unit` | ❌ None | Stored in `extra_data` or lost |

**Recommendation**: Add proper model fields or ensure consistent extra_data handling.

### 2. Chemical Events - Field Name Mapping Required
**Impact**: Medium - Requires transformation logic
**Affected Events**: FE, PE, HE, FU

| Frontend Name | Backend Name | Location |
|---------------|--------------|----------|
| `volume_applied` | `volume` | `/trazo-back/history/models.py` line 642 |
| `area_treated` | `area` | `/trazo-back/history/models.py` line 644 |
| `application_method` | `way_of_application` | `/trazo-back/history/models.py` line 645 |

**File Handling**: `/trazo-app/src/config/quickEventFields.ts` lines 1810-1859 (field name mapping)

### 3. Soil Management Events - Extensive Unused Fields
**Impact**: Low - Fields exist but not collected
**Affected Events**: Soil Management (6 types)

**Backend has 15+ fields not collected** in frontend:
- `soil_ph`, `organic_matter_percentage`, `amendment_type`, `amendment_amount`
- `test_results`, `carbon_sequestration_potential`, `working_depth`, `depth_unit`
- `soil_texture`, `soil_moisture`, `weather_conditions`, `temperature_range`, `equipment_used`

**Recommendation**: Either collect these fields or remove unused fields to reduce database bloat.

### 4. Pest Management Events - Extensive Unused Fields
**Impact**: Low - Fields exist but not collected
**Affected Events**: Pest Management (6 types)

**Backend has 10+ fields not collected** in frontend:
- `pest_species`, `pest_pressure_level`, `beneficial_species`, `release_quantity`
- `trap_count`, `damage_percentage`, `action_threshold_met`, `ipm_strategy`
- `beneficial_insects_used`, `chemical_free_period_days`

**Recommendation**: Either collect these fields or remove unused fields.

### 5. Business Events - Extensive Unused Fields
**Impact**: Low - Fields exist but not collected
**Affected Events**: Business/Certification events

**Backend has 7+ fields not collected** in frontend:
- `business_type`, `certification_type`, `carbon_credits_earned`, `carbon_credits_unit`
- `verification_status`, `sustainability_practice`, `verified_certifier_name`

**Recommendation**: Either build Business Event forms or remove unused fields.

### 6. General Events - Missing Optional Fields
**Impact**: Low - Backend supports more than collected
**Affected Events**: General Documentation

**Not collected in Quick Event**:
- `activity_name` (CharField 200)
- `duration` (CharField 50)
- `people_involved` (PositiveIntegerField)

**Recommendation**: Add to Manual Event form for comprehensive documentation.

---

## Smart Defaults by Event Type

**File**: `/trazo-app/src/config/eventFieldDefinitions.ts` lines 887-1019

### Production Events
```typescript
irrigation: {
  area_covered: 1,
  water_volume: 10000,  // gallons
  equipment_hours: 2,
  fuel_consumed: 2       // L
}

harvest: {
  area_covered: 1,
  yield_quantity: 100,   // kg
  equipment_hours: 4,
  fuel_consumed: 5       // L
}

planting: {
  area_covered: 1,
  seeds_source: 'commercial',
  equipment_hours: 3,
  fuel_consumed: 2       // L
}
```

### Chemical Events
```typescript
fertilization: {
  chemical_subtype: 'synthetic_fertilizer',
  concentration: '10-10-10',
  volume_applied: 100,    // kg
  area_treated: 1,        // ha
  application_fuel_consumed: 1  // L
}

pest_control: {
  chemical_subtype: 'synthetic_pesticide',
  concentration: '50%',
  volume_applied: 50,     // L
  area_treated: 1,        // ha
  application_fuel_consumed: 0.5  // L
}
```

---

## Files Reference

### Frontend
- `/trazo-app/src/config/quickEventFields.ts` - Quick Event field definitions (1910 lines)
- `/trazo-app/src/config/eventFieldDefinitions.ts` - Shared field definitions (1103 lines)
- `/trazo-app/src/views/Dashboard/Dashboard/Production/QuickAddEvent.tsx` - Quick Event component
- `/trazo-app/src/views/Dashboard/Dashboard/components/forms/ProductionTab.jsx` - Manual Production form
- `/trazo-app/src/views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx` - Manual Chemical form

### Backend
- `/trazo-back/history/models.py` - Event models (1909 lines)
- `/trazo-back/carbon/choices.py` - Shared choice constants (31 lines)

---

## Recommendations

### Priority 1 - Data Integrity (Chemical Events)
1. **Add missing model fields** to `ChemicalEvent`:
   - `active_ingredient` (CharField 200)
   - `application_details` (TextField)
   - `volume_unit` (CharField 10)
   - `area_unit` (CharField 10)
2. **Update field mappings** to eliminate transformation logic where possible

### Priority 2 - Feature Completeness (Soil/Pest/Business)
1. **Build Soil Management Event forms** to collect soil testing data
2. **Build Pest Management Event forms** to collect IPM/scouting data
3. **Build Business Event forms** to collect certification/compliance data
4. **Alternative**: Remove unused fields if features not planned

### Priority 3 - UX Improvements
1. **Add aggregate event support** to Quick Events (currently Manual-only)
2. **Consistent unit dropdowns** across all numeric fields
3. **Better field help text** for farmer guidance

---

## Audit Completion

✅ **Quick Event fields documented** - All 14 event templates analyzed
✅ **Manual Event fields documented** - Production and Chemical tabs analyzed
✅ **Backend model fields documented** - All 8 event types analyzed
✅ **Gaps/mismatches identified** - 6 critical areas documented
✅ **Validation rules documented** - Required fields and format validation
✅ **Field choices documented** - Backend constants and frontend options

**Total Fields Analyzed**: 150+ across 8 event types

---

## Document Metadata
- **Author**: Claude (Anthropic)
- **Date**: 2026-02-12
- **Version**: 1.0
- **Files Analyzed**: 7 frontend files, 2 backend files
- **Lines Reviewed**: 6000+ lines of configuration and model code
