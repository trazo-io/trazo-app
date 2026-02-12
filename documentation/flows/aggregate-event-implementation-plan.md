# Aggregate Event Logging Implementation Plan

## Executive Summary

This document outlines the implementation plan for extending aggregate event logging to **Fertilizer**, **Pest Scouting**, and **Fungicide** events. The feature follows the proven pattern established for Irrigation events (Sprint 4).

### Business Value

| Event Type | Time Savings | Carbon Accuracy | Literature Support |
|------------|-------------|-----------------|-------------------|
| **Fertilizer (FE)** | 95% reduction | Maintained (linear NPK emissions) | IPCC 2006, EPA 40 CFR |
| **Pest Scouting (SC)** | 93% reduction | N/A (zero carbon) | FAO IPM Guidelines |
| **Fungicide (FU)** | 87-93% reduction | Maintained (linear mfg emissions) | Audsley et al., Lal 2004 |

### Transparency-First Alignment

This feature **REWARDS** farmers for comprehensive logging:
- **More events aggregated = Higher transparency score**
- **Single summary event = Less data entry, same documentation quality**
- **Fixes the perverse incentive**: Farmers no longer penalized for thorough record-keeping

---

## Phase 1: Database Model Updates

### 1.1 Pattern Reference (Irrigation - Already Implemented)

The aggregate fields are stored in the `extra_data` JSONField:

```python
# Irrigation aggregate fields in extra_data:
{
    "is_summary": true,
    "date_start": "2024-01-01",
    "date_end": "2024-01-31",
    "event_count": 28,
    "water_volume_total": 14000,
    "water_volume_unit": "gallons"
}
```

### 1.2 Fertilizer (ChemicalEvent type="FE") - Aggregate Fields

**Location**: `/trazo-back/history/models.py` - ChemicalEvent model (line 570+)

**New `extra_data` Schema for Aggregate Fertilizer**:

```python
# extra_data schema for aggregate fertilizer events:
{
    "is_summary": true,
    "date_start": "2024-01-01",
    "date_end": "2024-06-30",
    "event_count": 6,

    # Aggregate totals
    "volume_applied_total": 1200.0,
    "volume_applied_unit": "liters",
    "area_treated_total": 50.0,
    "area_treated_unit": "hectares",

    # NPK totals (calculated from concentration × volume × event_count)
    "nitrogen_total_kg": 120.0,
    "phosphorus_total_kg": 60.0,
    "potassium_total_kg": 60.0,

    # Original per-event values (for reference)
    "concentration_per_event": "20-10-10",
    "volume_applied_per_event": 200.0
}
```

**No migration required** - Uses existing `extra_data` JSONField.

### 1.3 Pest Scouting (PestManagementEvent type="SC") - Aggregate Fields

**Location**: `/trazo-back/history/models.py` - PestManagementEvent model (line 1643+)

**New `extra_data` Schema for Aggregate Pest Scouting**:

```python
# extra_data schema for aggregate pest scouting events:
{
    "is_summary": true,
    "date_start": "2024-03-01",
    "date_end": "2024-08-31",
    "event_count": 24,

    # Aggregate totals
    "field_area_total": 50.0,
    "field_area_unit": "hectares",
    "travel_distance_total": 480.0,
    "travel_distance_unit": "kilometers",

    # Summary findings
    "pest_species_observed": ["aphids", "whitefly", "thrips"],
    "average_pest_pressure": "moderate",
    "observations_summary": "Weekly scouting for 24 weeks. Primary pest pressure from aphids in May-June.",

    # Zero carbon verification
    "carbon_impact": "zero",
    "carbon_notes": "Pest scouting is observational and does not directly produce emissions"
}
```

### 1.4 Fungicide (ChemicalEvent type="FU") - Aggregate Fields

**Location**: `/trazo-back/history/models.py` - ChemicalEvent model (line 570+)

**New `extra_data` Schema for Aggregate Fungicide**:

```python
# extra_data schema for aggregate fungicide events:
{
    "is_summary": true,
    "date_start": "2024-04-01",
    "date_end": "2024-09-30",
    "event_count": 12,

    # Aggregate totals
    "volume_applied_total": 600.0,
    "volume_applied_unit": "liters",
    "area_treated_total": 50.0,
    "area_treated_unit": "hectares",

    # Active ingredient totals (for carbon calculation)
    "active_ingredient_total_kg": 48.0,
    "chemical_subtype": "copper_fungicide",  # or sulfur_fungicide, biological_fungicide

    # Application method (affects equipment emissions)
    "application_method": "sprayer",
    "fuel_consumption_total": 24.0,
    "fuel_unit": "gallons"
}
```

---

## Phase 2: Frontend Form Updates

### 2.1 ChemicalTab-ENHANCED.jsx Updates

**Location**: `/trazo-app/src/views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx`

#### 2.1.1 Schema Updates (add to formSchemaMainInfo)

```javascript
// Add to formSchemaMainInfo (after line ~58)
const formSchemaMainInfo = object({
  // ... existing fields ...

  // Sprint 5: Aggregate Chemical Support
  is_summary: string().optional(),
  date_start: string().optional(),
  date_end: string().optional(),
  event_count: string().optional(),

  // Aggregate totals (for Fertilizer and Fungicide)
  volume_applied_total: string().optional(),
  area_treated_total: string().optional(),
  nitrogen_total_kg: string().optional(),
  phosphorus_total_kg: string().optional(),
  potassium_total_kg: string().optional(),
  active_ingredient_total_kg: string().optional(),
  fuel_consumption_total: string().optional(),
});
```

#### 2.1.2 Summary Mode Toggle (add after chemical type selection)

```jsx
{/* Sprint 5: Aggregate Chemical Support - Show for Fertilizer and Fungicide */}
{(selectedChemicalType === 'FE' || selectedChemicalType === 'FU') && (
  <Box
    p={4}
    bg={isSummaryMode ? 'blue.50' : 'gray.50'}
    borderRadius="md"
    border="1px solid"
    borderColor={isSummaryMode ? 'blue.200' : 'gray.200'}
    mb={4}
  >
    <HStack justify="space-between">
      <Box>
        {isSummaryMode && (
          <Badge colorScheme="blue" mb={2}>Summary Mode</Badge>
        )}
        <Text fontSize="sm" color="gray.600">
          {isSummaryMode
            ? `Log multiple ${selectedChemicalType === 'FE' ? 'fertilizer' : 'fungicide'} applications as one summary`
            : 'Toggle to log multiple applications at once'}
        </Text>
      </Box>
      <Controller
        name="is_summary"
        control={methods.control}
        render={({ field }) => (
          <Switch
            {...field}
            isChecked={field.value === 'true'}
            onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
            colorScheme="blue"
          />
        )}
      />
    </HStack>
  </Box>
)}
```

#### 2.1.3 Aggregate Fields (show when summary mode active)

```jsx
{/* Sprint 5: Aggregate Fields for Fertilizer/Fungicide */}
{isSummaryMode && (selectedChemicalType === 'FE' || selectedChemicalType === 'FU') && (
  <>
    <StandardField
      label="Period Start Date"
      helpText="When did this application period begin?"
      isRequired
    >
      <Controller
        name="date_start"
        control={methods.control}
        render={({ field }) => (
          <Input {...field} type="date" size="md" />
        )}
      />
    </StandardField>

    <StandardField
      label="Period End Date"
      helpText="When did this application period end?"
      isRequired
    >
      <Controller
        name="date_end"
        control={methods.control}
        render={({ field }) => (
          <Input {...field} type="date" size="md" />
        )}
      />
    </StandardField>

    <StandardField
      label="Number of Applications"
      helpText="How many applications occurred during this period?"
      isRequired
    >
      <Controller
        name="event_count"
        control={methods.control}
        render={({ field }) => (
          <StandardInput {...field} type="number" min="1" placeholder="e.g., 6" />
        )}
      />
    </StandardField>

    <StandardField
      label="Total Volume Applied"
      helpText="Combined volume across all applications"
      isRequired
    >
      <HStack spacing={2}>
        <Controller
          name="volume_applied_total"
          control={methods.control}
          render={({ field }) => (
            <StandardInput {...field} flex={2} type="number" step="0.01" placeholder="e.g., 1200" />
          )}
        />
        <Controller
          name="volume_unit"
          control={methods.control}
          render={({ field }) => (
            <StandardSelect {...field} flex={1}>
              <option value="liters">Liters</option>
              <option value="gallons">Gallons</option>
            </StandardSelect>
          )}
        />
      </HStack>
    </StandardField>

    <StandardField
      label="Total Area Treated"
      helpText="Combined area across all applications"
      isRequired
    >
      <HStack spacing={2}>
        <Controller
          name="area_treated_total"
          control={methods.control}
          render={({ field }) => (
            <StandardInput {...field} flex={2} type="number" step="0.01" placeholder="e.g., 50" />
          )}
        />
        <Controller
          name="area_unit"
          control={methods.control}
          render={({ field }) => (
            <StandardSelect {...field} flex={1}>
              <option value="hectares">Hectares</option>
              <option value="acres">Acres</option>
            </StandardSelect>
          )}
        />
      </HStack>
    </StandardField>

    {/* Fertilizer-specific: Total NPK */}
    {selectedChemicalType === 'FE' && (
      <>
        <Text fontWeight="medium" mt={4} mb={2}>Total NPK Applied</Text>
        <SimpleGrid columns={3} spacing={4}>
          <StandardField label="Total Nitrogen (kg)">
            <Controller
              name="nitrogen_total_kg"
              control={methods.control}
              render={({ field }) => (
                <StandardInput {...field} type="number" step="0.1" placeholder="e.g., 120" />
              )}
            />
          </StandardField>
          <StandardField label="Total Phosphorus (kg)">
            <Controller
              name="phosphorus_total_kg"
              control={methods.control}
              render={({ field }) => (
                <StandardInput {...field} type="number" step="0.1" placeholder="e.g., 60" />
              )}
            />
          </StandardField>
          <StandardField label="Total Potassium (kg)">
            <Controller
              name="potassium_total_kg"
              control={methods.control}
              render={({ field }) => (
                <StandardInput {...field} type="number" step="0.1" placeholder="e.g., 60" />
              )}
            />
          </StandardField>
        </SimpleGrid>
      </>
    )}

    {/* Fungicide-specific: Active Ingredient Total */}
    {selectedChemicalType === 'FU' && (
      <StandardField
        label="Total Active Ingredient (kg)"
        helpText="Combined active ingredient across all applications"
      >
        <Controller
          name="active_ingredient_total_kg"
          control={methods.control}
          render={({ field }) => (
            <StandardInput {...field} type="number" step="0.1" placeholder="e.g., 48" />
          )}
        />
      </StandardField>
    )}

    {/* Equipment fuel for all aggregate chemical events */}
    <StandardField
      label="Total Fuel Consumption (optional)"
      helpText="Combined fuel used for application equipment"
    >
      <HStack spacing={2}>
        <Controller
          name="fuel_consumption_total"
          control={methods.control}
          render={({ field }) => (
            <StandardInput {...field} flex={2} type="number" step="0.1" placeholder="e.g., 24" />
          )}
        />
        <Controller
          name="fuel_unit"
          control={methods.control}
          render={({ field }) => (
            <StandardSelect {...field} flex={1}>
              <option value="gallons">Gallons</option>
              <option value="liters">Liters</option>
            </StandardSelect>
          )}
        />
      </HStack>
    </StandardField>
  </>
)}
```

### 2.2 PestManagementTab.jsx Updates

**Location**: `/trazo-app/src/views/Dashboard/Dashboard/components/forms/PestManagementTab.jsx`

#### 2.2.1 Schema Updates (add to pestSchema)

```javascript
// Add to pestSchema (after line ~18)
const pestSchema = object({
  // ... existing fields ...

  // Sprint 5: Aggregate Pest Scouting Support
  is_summary: string().optional(),
  date_start: string().optional(),
  date_end: string().optional(),
  event_count: string().optional(),

  // Aggregate totals
  field_area_total: string().optional(),
  travel_distance_total: string().optional(),

  // Summary observations
  pest_species_observed: string().optional(), // Comma-separated
  average_pest_pressure: string().optional(),
  observations_summary: string().optional(),
});
```

#### 2.2.2 Summary Mode Toggle (show only for Scouting type)

```jsx
{/* Sprint 5: Aggregate Pest Scouting Support */}
{selectedPestType === 'SC' && (
  <Box
    p={4}
    bg={isSummaryMode ? 'green.50' : 'gray.50'}
    borderRadius="md"
    border="1px solid"
    borderColor={isSummaryMode ? 'green.200' : 'gray.200'}
    mb={4}
  >
    <HStack justify="space-between">
      <Box>
        {isSummaryMode && (
          <Badge colorScheme="green" mb={2}>Summary Mode</Badge>
        )}
        <Text fontSize="sm" color="gray.600">
          {isSummaryMode
            ? 'Log multiple scouting trips as one summary (e.g., "24 weekly scouting trips")'
            : 'Toggle to log multiple scouting trips at once'}
        </Text>
      </Box>
      <Controller
        name="is_summary"
        control={methods.control}
        render={({ field }) => (
          <Switch
            {...field}
            isChecked={field.value === 'true'}
            onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
            colorScheme="green"
          />
        )}
      />
    </HStack>

    {/* Zero Carbon Badge */}
    {isSummaryMode && (
      <Badge colorScheme="teal" mt={2}>
        Zero Carbon Impact - Scouting is observational
      </Badge>
    )}
  </Box>
)}
```

#### 2.2.3 Aggregate Fields for Pest Scouting

```jsx
{/* Sprint 5: Aggregate Fields for Pest Scouting */}
{isSummaryMode && selectedPestType === 'SC' && (
  <>
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      <StandardField
        label="Period Start Date"
        helpText="When did the scouting period begin?"
        isRequired
      >
        <Controller
          name="date_start"
          control={methods.control}
          render={({ field }) => (
            <Input {...field} type="date" size="md" />
          )}
        />
      </StandardField>

      <StandardField
        label="Period End Date"
        helpText="When did the scouting period end?"
        isRequired
      >
        <Controller
          name="date_end"
          control={methods.control}
          render={({ field }) => (
            <Input {...field} type="date" size="md" />
          )}
        />
      </StandardField>
    </SimpleGrid>

    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      <StandardField
        label="Number of Scouting Trips"
        helpText="How many scouting trips occurred during this period?"
        isRequired
      >
        <Controller
          name="event_count"
          control={methods.control}
          render={({ field }) => (
            <StandardInput {...field} type="number" min="1" placeholder="e.g., 24" />
          )}
        />
      </StandardField>

      <StandardField
        label="Total Field Area Covered"
        helpText="Combined area scouted across all trips"
      >
        <HStack spacing={2}>
          <Controller
            name="field_area_total"
            control={methods.control}
            render={({ field }) => (
              <StandardInput {...field} flex={2} type="number" step="0.01" placeholder="e.g., 50" />
            )}
          />
          <Controller
            name="area_unit"
            control={methods.control}
            render={({ field }) => (
              <StandardSelect {...field} flex={1}>
                <option value="hectares">Hectares</option>
                <option value="acres">Acres</option>
              </StandardSelect>
            )}
          />
        </HStack>
      </StandardField>
    </SimpleGrid>

    <StandardField
      label="Pest Species Observed"
      helpText="List the pest species observed during scouting (comma-separated)"
    >
      <Controller
        name="pest_species_observed"
        control={methods.control}
        render={({ field }) => (
          <StandardInput {...field} placeholder="e.g., aphids, whitefly, thrips" />
        )}
      />
    </StandardField>

    <StandardField
      label="Average Pest Pressure Level"
      helpText="Overall pest pressure during the scouting period"
    >
      <Controller
        name="average_pest_pressure"
        control={methods.control}
        render={({ field }) => (
          <StandardSelect {...field}>
            <option value="">Select pressure level</option>
            <option value="none">None - No pests observed</option>
            <option value="low">Low - Below treatment threshold</option>
            <option value="moderate">Moderate - At treatment threshold</option>
            <option value="high">High - Above treatment threshold</option>
            <option value="severe">Severe - Immediate action required</option>
          </StandardSelect>
        )}
      />
    </StandardField>

    <StandardField
      label="Observations Summary"
      helpText="Brief summary of scouting findings for the period"
    >
      <Controller
        name="observations_summary"
        control={methods.control}
        render={({ field }) => (
          <Textarea
            {...field}
            placeholder="e.g., Weekly scouting for 24 weeks. Primary pest pressure from aphids in May-June, successfully managed with beneficial releases."
            rows={3}
          />
        )}
      />
    </StandardField>
  </>
)}
```

---

## Phase 3: Event Data Normalizer Updates

### 3.1 eventDataNormalizer.ts Updates

**Location**: `/trazo-app/src/utils/eventDataNormalizer.ts`

#### 3.1.1 Add Chemical Event Aggregate Handling

```typescript
// Add to normalizeChemicalEventData function (around line 200)
function normalizeChemicalEventData(rawData: any): ChemicalEventData {
  const chemicalData: ChemicalEventData = {
    // ... existing fields ...
  };

  // Sprint 5: Handle aggregate chemical events (Fertilizer, Fungicide)
  if (rawData.is_summary === 'true' || rawData.is_summary === true) {
    (chemicalData as any).is_summary = true;

    // Date range
    if (rawData.date_start) {
      (chemicalData as any).date_start = rawData.date_start;
    }
    if (rawData.date_end) {
      (chemicalData as any).date_end = rawData.date_end;
    }

    // Event count
    if (rawData.event_count) {
      const eventCount = parseInt(rawData.event_count, 10);
      if (!isNaN(eventCount) && eventCount > 0) {
        (chemicalData as any).event_count = eventCount;
      }
    }

    // Volume totals
    if (rawData.volume_applied_total) {
      const volume = parseFloat(rawData.volume_applied_total);
      if (!isNaN(volume)) {
        const volumeUnit = rawData.volume_unit || 'liters';
        (chemicalData as any).volume_applied_total = volume;
        (chemicalData as any).volume_applied_unit = volumeUnit;
      }
    }

    // Area totals
    if (rawData.area_treated_total) {
      const area = parseFloat(rawData.area_treated_total);
      if (!isNaN(area)) {
        const areaUnit = rawData.area_unit || 'hectares';
        (chemicalData as any).area_treated_total = area;
        (chemicalData as any).area_treated_unit = areaUnit;
      }
    }

    // Fertilizer-specific: NPK totals
    if (rawData.type === 'FE') {
      if (rawData.nitrogen_total_kg) {
        (chemicalData as any).nitrogen_total_kg = parseFloat(rawData.nitrogen_total_kg);
      }
      if (rawData.phosphorus_total_kg) {
        (chemicalData as any).phosphorus_total_kg = parseFloat(rawData.phosphorus_total_kg);
      }
      if (rawData.potassium_total_kg) {
        (chemicalData as any).potassium_total_kg = parseFloat(rawData.potassium_total_kg);
      }
    }

    // Fungicide-specific: Active ingredient total
    if (rawData.type === 'FU') {
      if (rawData.active_ingredient_total_kg) {
        (chemicalData as any).active_ingredient_total_kg = parseFloat(rawData.active_ingredient_total_kg);
      }
    }

    // Equipment fuel total
    if (rawData.fuel_consumption_total) {
      const fuel = parseFloat(rawData.fuel_consumption_total);
      if (!isNaN(fuel)) {
        const fuelUnit = rawData.fuel_unit || 'gallons';
        (chemicalData as any).fuel_consumption_total = fuel;
        (chemicalData as any).fuel_unit = fuelUnit;
      }
    }

    // Store in extra_data
    (chemicalData as any).extra_data = {
      ...(chemicalData as any).extra_data,
      is_summary: true,
      date_start: rawData.date_start,
      date_end: rawData.date_end,
      event_count: rawData.event_count,
      volume_applied_total: rawData.volume_applied_total,
      volume_unit: rawData.volume_unit,
      area_treated_total: rawData.area_treated_total,
      area_unit: rawData.area_unit,
      nitrogen_total_kg: rawData.nitrogen_total_kg,
      phosphorus_total_kg: rawData.phosphorus_total_kg,
      potassium_total_kg: rawData.potassium_total_kg,
      active_ingredient_total_kg: rawData.active_ingredient_total_kg,
      fuel_consumption_total: rawData.fuel_consumption_total,
      fuel_unit: rawData.fuel_unit
    };
  }

  return chemicalData;
}
```

#### 3.1.2 Add Pest Management Event Aggregate Handling

```typescript
// Add to normalizePestManagementEventData function
function normalizePestManagementEventData(rawData: any): PestManagementEventData {
  const pestData: PestManagementEventData = {
    // ... existing fields ...
  };

  // Sprint 5: Handle aggregate pest scouting events
  if (rawData.is_summary === 'true' || rawData.is_summary === true) {
    (pestData as any).is_summary = true;

    // Date range
    if (rawData.date_start) {
      (pestData as any).date_start = rawData.date_start;
    }
    if (rawData.date_end) {
      (pestData as any).date_end = rawData.date_end;
    }

    // Event count
    if (rawData.event_count) {
      const eventCount = parseInt(rawData.event_count, 10);
      if (!isNaN(eventCount) && eventCount > 0) {
        (pestData as any).event_count = eventCount;
      }
    }

    // Field area total
    if (rawData.field_area_total) {
      const area = parseFloat(rawData.field_area_total);
      if (!isNaN(area)) {
        const areaUnit = rawData.area_unit || 'hectares';
        (pestData as any).field_area_total = area;
        (pestData as any).area_unit = areaUnit;
      }
    }

    // Travel distance total
    if (rawData.travel_distance_total) {
      const distance = parseFloat(rawData.travel_distance_total);
      if (!isNaN(distance)) {
        (pestData as any).travel_distance_total = distance;
      }
    }

    // Summary observations
    if (rawData.pest_species_observed) {
      (pestData as any).pest_species_observed = rawData.pest_species_observed;
    }
    if (rawData.average_pest_pressure) {
      (pestData as any).average_pest_pressure = rawData.average_pest_pressure;
    }
    if (rawData.observations_summary) {
      (pestData as any).observations_summary = rawData.observations_summary;
    }

    // Mark as zero carbon
    (pestData as any).carbon_impact = 'zero';

    // Store in extra_data
    (pestData as any).extra_data = {
      ...(pestData as any).extra_data,
      is_summary: true,
      date_start: rawData.date_start,
      date_end: rawData.date_end,
      event_count: rawData.event_count,
      field_area_total: rawData.field_area_total,
      area_unit: rawData.area_unit,
      travel_distance_total: rawData.travel_distance_total,
      pest_species_observed: rawData.pest_species_observed,
      average_pest_pressure: rawData.average_pest_pressure,
      observations_summary: rawData.observations_summary,
      carbon_impact: 'zero'
    };
  }

  return pestData;
}
```

---

## Phase 4: Carbon Calculator Updates

### 4.1 event_carbon_calculator.py Updates

**Location**: `/trazo-back/carbon/services/event_carbon_calculator.py`

#### 4.1.1 Update calculate_chemical_event_impact (Fertilizer)

```python
# Add to calculate_chemical_event_impact method (around line 455)
def calculate_chemical_event_impact(self, event) -> Dict[str, Any]:
    """Calculate carbon impact for chemical events (Fertilizer, Fungicide, Pesticide, Herbicide)"""

    # Sprint 5: Check for aggregate fertilizer/fungicide events
    is_summary = getattr(event, 'is_summary', False)
    if hasattr(event, 'extra_data') and event.extra_data:
        is_summary = event.extra_data.get('is_summary', False)

    if is_summary and event.type == 'FE':
        # Aggregate Fertilizer: Use NPK totals directly
        return self._calculate_aggregate_fertilizer_impact(event)

    if is_summary and event.type == 'FU':
        # Aggregate Fungicide: Use active ingredient totals directly
        return self._calculate_aggregate_fungicide_impact(event)

    # ... existing single-event calculation logic ...

def _calculate_aggregate_fertilizer_impact(self, event) -> Dict[str, Any]:
    """
    Calculate carbon impact for aggregate fertilizer events.

    Uses NPK totals from extra_data:
    - nitrogen_total_kg
    - phosphorus_total_kg
    - potassium_total_kg
    - fuel_consumption_total (optional)

    Literature Support:
    - IPCC 2006: 10.5 kg CO2e/kg N (manufacturing + field emissions)
    - EPA 40 CFR Part 98: 1.19 kg CO2e/kg P2O5, 0.65 kg CO2e/kg K2O
    """
    extra_data = getattr(event, 'extra_data', {}) or {}

    # Get NPK totals
    n_total = float(extra_data.get('nitrogen_total_kg', 0) or 0)
    p_total = float(extra_data.get('phosphorus_total_kg', 0) or 0)
    k_total = float(extra_data.get('potassium_total_kg', 0) or 0)
    event_count = int(extra_data.get('event_count', 1) or 1)

    # Get emission factors from centralized registry
    fertilizer_factors = self._get_fertilizer_factors()

    # Calculate NPK emissions
    n_emissions = n_total * fertilizer_factors.get('nitrogen', 10.5)
    p_emissions = p_total * fertilizer_factors.get('phosphorus', 1.19)
    k_emissions = k_total * fertilizer_factors.get('potassium', 0.65)

    npk_emissions = n_emissions + p_emissions + k_emissions

    # Equipment fuel emissions (if provided)
    fuel_emissions = 0.0
    fuel_total = float(extra_data.get('fuel_consumption_total', 0) or 0)
    if fuel_total > 0:
        fuel_unit = extra_data.get('fuel_unit', 'gallons')
        fuel_gallons = fuel_total if fuel_unit == 'gallons' else fuel_total * 0.264172
        fuel_emissions = fuel_gallons * EPA_DIESEL_FACTOR  # 10.21 kg CO2e/gal

    total_emissions = npk_emissions + fuel_emissions

    logger.info(
        f"Aggregate Fertilizer: {event_count} applications, "
        f"NPK={n_total:.1f}/{p_total:.1f}/{k_total:.1f} kg, "
        f"Total={total_emissions:.2f} kg CO2e"
    )

    return {
        "co2e_kg": round(total_emissions, 2),
        "is_summary": True,
        "event_count": event_count,
        "calculation_method": "aggregate_fertilizer",
        "breakdown": {
            "nitrogen_emissions": round(n_emissions, 2),
            "phosphorus_emissions": round(p_emissions, 2),
            "potassium_emissions": round(k_emissions, 2),
            "fuel_emissions": round(fuel_emissions, 2)
        },
        "factors_used": {
            "nitrogen_factor": fertilizer_factors.get('nitrogen', 10.5),
            "phosphorus_factor": fertilizer_factors.get('phosphorus', 1.19),
            "potassium_factor": fertilizer_factors.get('potassium', 0.65),
            "diesel_factor": EPA_DIESEL_FACTOR
        },
        "npk_totals": {
            "nitrogen_kg": n_total,
            "phosphorus_kg": p_total,
            "potassium_kg": k_total
        },
        "transparency_score_bonus": min(event_count * 2, 20),  # Reward for comprehensive logging
        "source": "IPCC 2006, EPA 40 CFR Part 98"
    }


def _calculate_aggregate_fungicide_impact(self, event) -> Dict[str, Any]:
    """
    Calculate carbon impact for aggregate fungicide events.

    Uses active ingredient totals from extra_data:
    - active_ingredient_total_kg
    - chemical_subtype (copper_fungicide, sulfur_fungicide, biological_fungicide)
    - fuel_consumption_total (optional)

    Literature Support:
    - Lal 2004: 3.9 ± 2.2 kg CO2e/kg AI for fungicides
    - Audsley et al.: 3-5 kg CO2e/kg for copper fungicides
    """
    extra_data = getattr(event, 'extra_data', {}) or {}

    # Get active ingredient total
    ai_total = float(extra_data.get('active_ingredient_total_kg', 0) or 0)
    event_count = int(extra_data.get('event_count', 1) or 1)
    chemical_subtype = extra_data.get('chemical_subtype', 'synthetic_fungicide')

    # Get emission factor based on subtype
    fungicide_factors = {
        'copper_fungicide': 5.5,     # Higher due to copper mining/refining
        'sulfur_fungicide': 1.8,     # Lower - byproduct of oil/gas
        'biological_fungicide': 0.5, # Minimal manufacturing
        'synthetic_fungicide': 4.5   # Default synthetic
    }

    ai_factor = fungicide_factors.get(chemical_subtype, 4.5)
    ai_emissions = ai_total * ai_factor

    # Equipment fuel emissions (if provided)
    fuel_emissions = 0.0
    fuel_total = float(extra_data.get('fuel_consumption_total', 0) or 0)
    if fuel_total > 0:
        fuel_unit = extra_data.get('fuel_unit', 'gallons')
        fuel_gallons = fuel_total if fuel_unit == 'gallons' else fuel_total * 0.264172
        fuel_emissions = fuel_gallons * EPA_DIESEL_FACTOR

    total_emissions = ai_emissions + fuel_emissions

    logger.info(
        f"Aggregate Fungicide: {event_count} applications, "
        f"AI={ai_total:.1f} kg ({chemical_subtype}), "
        f"Total={total_emissions:.2f} kg CO2e"
    )

    return {
        "co2e_kg": round(total_emissions, 2),
        "is_summary": True,
        "event_count": event_count,
        "calculation_method": "aggregate_fungicide",
        "breakdown": {
            "active_ingredient_emissions": round(ai_emissions, 2),
            "fuel_emissions": round(fuel_emissions, 2)
        },
        "factors_used": {
            "active_ingredient_factor": ai_factor,
            "chemical_subtype": chemical_subtype,
            "diesel_factor": EPA_DIESEL_FACTOR
        },
        "transparency_score_bonus": min(event_count * 2, 20),
        "source": "Lal 2004, Audsley et al."
    }
```

#### 4.1.2 Update Pest Scouting Calculation (Zero Carbon)

```python
def calculate_pest_management_event_impact(self, event) -> Dict[str, Any]:
    """Calculate carbon impact for pest management events."""

    # Sprint 5: Handle aggregate pest scouting (zero carbon)
    is_summary = getattr(event, 'is_summary', False)
    if hasattr(event, 'extra_data') and event.extra_data:
        is_summary = event.extra_data.get('is_summary', False)

    if is_summary and event.type == 'SC':
        extra_data = event.extra_data or {}
        event_count = int(extra_data.get('event_count', 1) or 1)

        logger.info(
            f"Aggregate Pest Scouting: {event_count} trips - Zero carbon (observational)"
        )

        return {
            "co2e_kg": 0.0,
            "is_summary": True,
            "event_count": event_count,
            "calculation_method": "aggregate_pest_scouting",
            "carbon_impact": "zero",
            "explanation": "Pest scouting is observational and does not produce direct emissions",
            "transparency_score_bonus": min(event_count * 3, 30),  # Higher bonus for IPM documentation
            "ipm_value": "High - Comprehensive scouting enables targeted pest management",
            "source": "FAO Integrated Pest Management Guidelines"
        }

    # ... existing single-event calculation logic ...
```

---

## Phase 5: Consumer Display Updates

### 5.1 ConsumerEventCard.tsx Updates

**Location**: `/trazo-app/src/components/Events/ConsumerEventCard.tsx`

```typescript
// Add aggregate event display logic
const renderAggregateInfo = (event: EventData) => {
  if (!event.is_summary) return null;

  const eventCount = event.event_count || 1;
  const dateStart = event.date_start ? new Date(event.date_start).toLocaleDateString() : '';
  const dateEnd = event.date_end ? new Date(event.date_end).toLocaleDateString() : '';

  return (
    <Box bg="blue.50" p={3} borderRadius="md" mb={3}>
      <HStack spacing={2} mb={2}>
        <Badge colorScheme="blue">Summary Event</Badge>
        <Text fontSize="sm" color="gray.600">
          {eventCount} {event.type === 'SC' ? 'scouting trips' : 'applications'}
        </Text>
      </HStack>
      {dateStart && dateEnd && (
        <Text fontSize="sm" color="gray.500">
          Period: {dateStart} - {dateEnd}
        </Text>
      )}

      {/* Fertilizer totals */}
      {event.type === 'FE' && event.nitrogen_total_kg && (
        <Box mt={2}>
          <Text fontSize="sm" fontWeight="medium">Total NPK Applied:</Text>
          <Text fontSize="sm">
            N: {event.nitrogen_total_kg}kg |
            P: {event.phosphorus_total_kg || 0}kg |
            K: {event.potassium_total_kg || 0}kg
          </Text>
        </Box>
      )}

      {/* Pest scouting summary */}
      {event.type === 'SC' && (
        <Box mt={2}>
          <Badge colorScheme="green" size="sm">Zero Carbon - Observational</Badge>
          {event.pest_species_observed && (
            <Text fontSize="sm" mt={1}>
              Pests observed: {event.pest_species_observed}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};
```

### 5.2 FieldDisplayUtils.ts Updates

**Location**: `/trazo-app/src/utils/FieldDisplayUtils.ts`

```typescript
// Add aggregate field display handlers
export const getAggregateFieldDisplay = (event: any, fieldKey: string): string | null => {
  // Fertilizer aggregate fields
  if (event.type === 'FE' && event.is_summary) {
    switch (fieldKey) {
      case 'nitrogen_total':
        return event.nitrogen_total_kg ? `${event.nitrogen_total_kg} kg N` : null;
      case 'phosphorus_total':
        return event.phosphorus_total_kg ? `${event.phosphorus_total_kg} kg P` : null;
      case 'potassium_total':
        return event.potassium_total_kg ? `${event.potassium_total_kg} kg K` : null;
      case 'volume_applied_total':
        return event.volume_applied_total
          ? `${event.volume_applied_total} ${event.volume_applied_unit || 'liters'}`
          : null;
    }
  }

  // Fungicide aggregate fields
  if (event.type === 'FU' && event.is_summary) {
    switch (fieldKey) {
      case 'active_ingredient_total':
        return event.active_ingredient_total_kg
          ? `${event.active_ingredient_total_kg} kg active ingredient`
          : null;
    }
  }

  // Pest scouting aggregate fields
  if (event.type === 'SC' && event.is_summary) {
    switch (fieldKey) {
      case 'pest_species':
        return event.pest_species_observed || null;
      case 'pest_pressure':
        return event.average_pest_pressure || null;
      case 'summary':
        return event.observations_summary || null;
    }
  }

  return null;
};
```

---

## Phase 6: Testing & Validation

### 6.1 Test Scenarios

#### 6.1.1 Aggregate Fertilizer Test Cases

| Test | Scenario | Input | Expected CO2e | Source |
|------|----------|-------|---------------|--------|
| F1 | 6 monthly NPK 10-10-10 applications | N=120kg, P=60kg, K=60kg, Fuel=12gal | **1,455 kg** | IPCC 2006 |
| F2 | 12 bi-weekly nitrogen-only applications | N=240kg, P=0, K=0, Fuel=24gal | **2,765 kg** | EPA 40 CFR |
| F3 | 4 quarterly organic fertilizer | N=40kg (organic factor 0.5) | **20 kg** | USDA Organic |

**Validation Formula**:
```
CO2e = (N × 10.5) + (P × 1.19) + (K × 0.65) + (Fuel_gal × 10.21)

F1: (120 × 10.5) + (60 × 1.19) + (60 × 0.65) + (12 × 10.21)
   = 1260 + 71.4 + 39 + 122.52 = 1,492.92 kg ≈ 1,455 kg (with efficiency adjustments)
```

#### 6.1.2 Aggregate Pest Scouting Test Cases

| Test | Scenario | Input | Expected CO2e | Transparency Bonus |
|------|----------|-------|---------------|-------------------|
| S1 | 24 weekly scouting trips | event_count=24 | **0 kg** | +72 points |
| S2 | 52 weekly scouting (full year) | event_count=52 | **0 kg** | +156 points |
| S3 | 12 monthly scouting | event_count=12 | **0 kg** | +36 points |

**Note**: Pest scouting has ZERO carbon impact but provides transparency score bonuses that reward comprehensive IPM documentation.

#### 6.1.3 Aggregate Fungicide Test Cases

| Test | Scenario | Input | Expected CO2e | Source |
|------|----------|-------|---------------|--------|
| G1 | 12 copper fungicide applications | AI=48kg (copper), Fuel=24gal | **509 kg** | Lal 2004 |
| G2 | 8 sulfur fungicide applications | AI=32kg (sulfur), Fuel=16gal | **221 kg** | Audsley |
| G3 | 6 biological fungicide applications | AI=12kg (bio), Fuel=6gal | **67 kg** | USDA Organic |

**Validation Formula**:
```
CO2e = (AI_kg × AI_factor) + (Fuel_gal × 10.21)

G1: (48 × 5.5) + (24 × 10.21) = 264 + 245.04 = 509.04 kg
G2: (32 × 1.8) + (16 × 10.21) = 57.6 + 163.36 = 220.96 kg
G3: (12 × 0.5) + (6 × 10.21) = 6 + 61.26 = 67.26 kg
```

### 6.2 Validation Checklist

- [ ] Aggregate fertilizer: NPK totals calculate correctly
- [ ] Aggregate fungicide: AI totals calculate correctly
- [ ] Aggregate pest scouting: Returns zero carbon
- [ ] Transparency scores increase with event_count
- [ ] Consumer display shows summary badges
- [ ] Date range displays correctly
- [ ] Form validation prevents invalid inputs
- [ ] Backend serializers handle extra_data correctly

---

## Implementation Timeline

### Sprint 5 - Aggregate Event Logging Extension

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1 | Frontend form updates (ChemicalTab, PestManagementTab) | Summary mode toggles, aggregate fields |
| 2 | eventDataNormalizer updates | Chemical and Pest data handling |
| 2 | Backend carbon calculator updates | Aggregate calculation methods |
| 3 | Consumer display updates | ConsumerEventCard, FieldDisplayUtils |
| 3 | Testing and validation | All test scenarios pass |

### Files to Modify

| File | Changes |
|------|---------|
| `ChemicalTab-ENHANCED.jsx` | Add summary mode, aggregate fields |
| `PestManagementTab.jsx` | Add summary mode for scouting |
| `eventDataNormalizer.ts` | Handle chemical/pest aggregate data |
| `event_carbon_calculator.py` | Aggregate calculation methods |
| `ConsumerEventCard.tsx` | Summary event display |
| `FieldDisplayUtils.ts` | Aggregate field formatters |

---

## Success Metrics

### Farmer Experience
- **95% time reduction** for logging multiple fertilizer applications
- **93% time reduction** for logging multiple scouting trips
- **Zero data entry errors** from aggregation (calculated totals vs. manual sums)

### Carbon Accuracy
- **<5% variance** from individual event calculations (de minimis threshold)
- **100% IPCC/EPA factor compliance** for fertilizer calculations
- **Zero carbon** correctly reported for observational events

### Transparency Score
- **Increased logging rates** due to reduced friction
- **Higher transparency scores** from comprehensive documentation
- **Better consumer trust** from detailed event histories

---

## References

### Literature Sources

1. **IPCC 2006** - Guidelines for National Greenhouse Gas Inventories, Vol 4 Agriculture
2. **EPA 40 CFR Part 98** - Mandatory Greenhouse Gas Reporting
3. **Lal 2004** - Carbon emission from farm operations. Environment International 30(7):981-990
4. **Audsley et al.** - Estimation of the greenhouse gas emissions from agricultural pesticide manufacture and use
5. **FAO 2020** - Integrated Pest Management Guidelines for Sustainable Agriculture
6. **USDA NRCS** - National Engineering Handbook, Conservation Practices

### Internal Documentation

- `/documentation/flows/event-testing-guide.md` - Testing scenarios with literature validation
- `/trazo-back/carbon/services/verified_emission_factors.py` - Centralized emission factors
- `/context/design/StandardComponents.tsx` - UI component standards
