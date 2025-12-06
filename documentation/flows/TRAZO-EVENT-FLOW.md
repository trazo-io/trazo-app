# Trazo Event System Documentation

> Sprint 3 Implementation Complete - Last Updated: 2025-01-26

## Overview

The Trazo Event System manages agricultural event creation, preview, and display workflows for the carbon transparency platform. This document covers the 8 event types and their field mappings, consumer trust fields, and UI components.

## Event Types

Trazo supports 8 primary event types, each with specific fields for carbon calculation and consumer transparency:

| ID  | Type       | Tab Component          | Purpose                                       |
| --- | ---------- | ---------------------- | --------------------------------------------- |
| 0   | Weather    | WeatherTab             | Weather condition documentation               |
| 1   | Production | ProductionTab          | Planting, transplanting, irrigation, harvest  |
| 2   | Chemical   | ChemicalTab-ENHANCED   | Fertilizer, pesticide, herbicide applications |
| 3   | General    | GeneralTab             | General farming activities                    |
| 4   | Equipment  | EquipmentTab           | Equipment operations and fuel consumption     |
| 5   | Soil       | SoilManagementTab      | Soil analysis and management                  |
| 6   | Pest       | PestManagementTab      | Integrated Pest Management activities         |
| 7   | Business   | BusinessTab-SIMPLIFIED | Certifications and business activities        |

## Consumer Trust Fields (Sprint 3 Epic 3.2)

New transparency fields added to build consumer trust:

### ProductionTab

| Field          | Type   | Purpose                                                                  |
| -------------- | ------ | ------------------------------------------------------------------------ |
| `seeds_source` | string | Where seeds/seedlings came from (certified_organic, farm_saved, local, cooperative, commercial, other) |
| `water_source` | string | Water source for irrigation (well, rainwater, municipal, river)          |

### ChemicalTab-ENHANCED

| Field                | Type   | Purpose                                                        |
| -------------------- | ------ | -------------------------------------------------------------- |
| `organic_approved`   | string | Whether chemical is organic approved (yes, no, not_applicable) |
| `buffer_zone_meters` | string | Buffer zone maintained near water/habitats                     |

### PestManagementTab

| Field                       | Type   | Purpose                                                 |
| --------------------------- | ------ | ------------------------------------------------------- |
| `beneficial_insects_used`   | string | Whether beneficial insects are used (yes, no, planning) |
| `chemical_free_period_days` | string | Days since last synthetic chemical application          |

### BusinessTab-SIMPLIFIED

| Field                     | Type   | Purpose                             |
| ------------------------- | ------ | ----------------------------------- |
| `verified_certifier_name` | string | Name of the certifying organization |

## StandardComponents Usage

All event form tabs use the standardized component library from `components/Design/StandardComponents.tsx`:

### Core Layout Components

- `SectionBox` - Container with optional highlighting (`variant="default"` | `"highlighted"`)
- `SectionHeader` - Section title with icon, badge, and description
- `CollapsibleSection` - Expandable/collapsible section for advanced fields (Sprint 3)

### Form Components

- `StandardField` - Form field wrapper with label, help text, and error
- `StandardInput` - Text/number input with consistent styling
- `StandardSelect` - Dropdown select with consistent styling
- `StandardTextarea` - Multi-line text input
- `StandardButton` - Button with primary/outline/ghost variants

### Feedback Components

- `StandardAlert` - Info/success/warning/error alerts
- `DraftRestorationAlert` - Shows when saved draft is available (Sprint 3)
- `AutoSaveStatus` - Shows auto-save status indicator (Sprint 3)

## Progressive Disclosure (Sprint 3 Epic 3.3)

### CollapsibleSection Component

Use for advanced or optional fields that can be hidden by default:

```tsx
import { CollapsibleSection } from 'components/Design/StandardComponents';

<CollapsibleSection
  title="Advanced Options"
  icon={FaCog}
  iconColor="gray.500"
  badge="Optional"
  badgeColorScheme="gray"
  description="Additional fields for detailed tracking"
  defaultIsOpen={false}
  variant="default"
>
  {/* Advanced fields here */}
</CollapsibleSection>;
```

### Props

| Prop               | Type                       | Default    | Description        |
| ------------------ | -------------------------- | ---------- | ------------------ |
| `title`            | string                     | required   | Section title      |
| `icon`             | IconType                   | undefined  | Icon component     |
| `iconColor`        | string                     | "gray.500" | Icon color         |
| `badge`            | string                     | undefined  | Badge text         |
| `badgeColorScheme` | string                     | "gray"     | Badge color scheme |
| `description`      | string                     | undefined  | Description text   |
| `defaultIsOpen`    | boolean                    | false      | Initial open state |
| `variant`          | "default" \| "highlighted" | "default"  | Visual variant     |

## Form Auto-Save (Sprint 3 Epic 3.3)

### useFormAutoSave Hook

Automatically saves form data to localStorage every 30 seconds:

```tsx
import { useFormAutoSave } from 'hooks/useFormAutoSave';
import { DraftRestorationAlert, AutoSaveStatus } from 'components/Design/StandardComponents';

const MyEventForm = () => {
  const methods = useForm({
    // form configuration
  });

  const { hasDraft, lastSaved, isSaving, restoreDraft, discardDraft, clearDraft } = useFormAutoSave(
    methods,
    {
      storageKey: 'production_event',
      interval: 30000, // 30 seconds
      enabled: true
    }
  );

  return (
    <>
      <DraftRestorationAlert
        hasDraft={hasDraft}
        lastSaved={lastSaved}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />

      <form onSubmit={handleSubmit(onSubmit)}>{/* Form fields */}</form>

      <AutoSaveStatus lastSaved={lastSaved} isSaving={isSaving} />
    </>
  );
};
```

### Hook Options

| Option       | Type     | Default   | Description                     |
| ------------ | -------- | --------- | ------------------------------- |
| `storageKey` | string   | required  | Unique key for localStorage     |
| `interval`   | number   | 30000     | Auto-save interval in ms        |
| `enabled`    | boolean  | true      | Whether auto-save is enabled    |
| `onSave`     | function | undefined | Callback when draft is saved    |
| `onRestore`  | function | undefined | Callback when draft is restored |
| `onClear`    | function | undefined | Callback when draft is cleared  |

### Hook Return Values

| Property       | Type         | Description                    |
| -------------- | ------------ | ------------------------------ |
| `hasDraft`     | boolean      | Whether a saved draft exists   |
| `lastSaved`    | Date \| null | Timestamp of last save         |
| `isSaving`     | boolean      | Whether currently saving       |
| `saveDraft`    | function     | Manually save current data     |
| `restoreDraft` | function     | Restore saved draft to form    |
| `clearDraft`   | function     | Clear saved draft              |
| `discardDraft` | function     | Discard draft without callback |

## Section Structure Pattern

Each event tab follows a consistent section pattern:

1. **Transparency Focus Alert** - Info alert explaining the purpose
2. **Basic Event Information** - Event type and name fields
3. **Domain-Specific Fields** - Fields specific to the event type
4. **Consumer Trust Fields** - Sprint 3 transparency fields (when applicable)
5. **Farmer's Field Notes** - Observation/notes textarea
6. **Navigation Buttons** - Previous/Continue buttons

## Field Mapping: Form to Backend

### Naming Conventions

- **Frontend (React)**: camelCase (e.g., `seedsSource`)
- **Backend (Django)**: snake_case (e.g., `seeds_source`)
- **API Transformation**: Handled by cleanEventData utility

### Common Fields Across All Events

| Frontend      | Backend       | Type   | Purpose            |
| ------------- | ------------- | ------ | ------------------ |
| `name`        | `name`        | string | Event name         |
| `type`        | `type`        | string | Event subtype code |
| `observation` | `observation` | string | Farmer's notes     |

### Unit Fields (Sprint 2 Pattern)

User-selectable units for international compatibility:

```tsx
// Area with unit selection
field_area: string; // "2.5"
area_unit: string; // "acres" | "hectares"

// Distance with unit selection
travel_distance: string; // "5.0"
distance_unit: string; // "miles" | "km"
```

## Validation Patterns

### Zod Schema Pattern

```tsx
import { object, string, boolean } from 'zod';

const eventSchema = object({
  type: string().min(1, 'Event type is required'),
  name: string().min(1, 'Event name is required'),
  // Optional fields
  field_area: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Area must be a positive number'),
  // Consumer trust fields (Sprint 3)
  seeds_source: string().optional(),
  water_source: string().optional()
});
```

## Event Type Codes

### Production Events

| Code | Label         | UI Display        |
| ---- | ------------- | ----------------- |
| PL   | Planting      | Planting          |
| TR   | Transplanting | Transplanting     |
| IR   | Irrigation    | Irrigation        |
| HR   | Harvest       | Harvest           |
| CL   | Clearing      | Field Clearing    |
| PR   | Preparation   | Field Preparation |
| MT   | Maintenance   | Field Maintenance |

### Chemical Events

| Code | Label         | UI Display                |
| ---- | ------------- | ------------------------- |
| FE   | Fertilizer    | Fertilizer Application    |
| PE   | Pesticide     | Pesticide Application     |
| HE   | Herbicide     | Herbicide Application     |
| FU   | Fungicide     | Fungicide Application     |
| OF   | Organic       | Organic Treatment         |
| FL   | Foliar        | Foliar Application        |
| BD   | Biodegradable | Biodegradable Treatment   |
| BF   | Biofertilizer | Biofertilizer Application |

### Pest Management Events

| Code | Label                | UI Display           |
| ---- | -------------------- | -------------------- |
| SC   | Scouting             | Scouting             |
| BR   | Beneficial Release   | Beneficial Release   |
| TM   | Trap Monitoring      | Trap Monitoring      |
| PI   | Pest Identification  | Pest Identification  |
| TA   | Threshold Assessment | Threshold Assessment |
| IP   | IPM Implementation   | IPM Implementation   |

### Equipment Events

| Code | Label            | UI Display       |
| ---- | ---------------- | ---------------- |
| FC   | Fuel Consumption | Fuel Consumption |
| MN   | Maintenance      | Maintenance      |
| RE   | Repair           | Repair           |
| CA   | Calibration      | Calibration      |
| BD   | Breakdown        | Breakdown        |
| EI   | Inspection       | Inspection       |

### Business Events

| Code                 | Label          | UI Display                |
| -------------------- | -------------- | ------------------------- |
| certification        | Certification  | Certification Achievement |
| verification         | Verification   | Third-Party Verification  |
| sustainability_audit | Audit          | Sustainability Assessment |
| transparency         | Transparency   | Transparency Initiative   |
| carbon_credits       | Carbon Credits | Carbon Credits Earned     |
| compliance           | Compliance     | Regulatory Compliance     |

## File Structure

```
src/views/Dashboard/Dashboard/components/forms/
├── WeatherTab.jsx
├── ProductionTab.jsx
├── ChemicalTab-ENHANCED.jsx
├── GeneralTab.jsx
├── EquipmentTab.jsx
├── SoilManagementTab.jsx
├── PestManagementTab.jsx
└── BusinessTab-SIMPLIFIED.jsx

src/components/Design/
├── StandardComponents.tsx    # All shared UI components

src/hooks/
├── useFormAutoSave.ts       # Form auto-save hook (Sprint 3)
└── useDebounce.ts           # Debounce utility

documentation/flows/
└── TRAZO-EVENT-FLOW.md      # This documentation
```

## Sprint 3 Implementation Summary

### Epic 3.1: Visual Polish (Completed)

- Cleaned unused Chakra imports from WeatherTab, SoilManagementTab, PestManagementTab, EquipmentTab
- Consolidated SoilManagementTab from 6-7 sections to 4 sections

### Epic 3.2: Consumer Trust Fields (Completed)

- ProductionTab: Added `seeds_source`, `water_source`
- ChemicalTab: Added `organic_approved`, `buffer_zone_meters`
- PestManagementTab: Added `beneficial_insects_used`, `chemical_free_period_days`
- BusinessTab: Added `verified_certifier_name`

### Epic 3.3: Mobile UX (Completed)

- Added `CollapsibleSection` component for progressive disclosure
- Created `useFormAutoSave` hook for 30-second auto-save
- Added `DraftRestorationAlert` component for draft restoration UI
- Added `AutoSaveStatus` component for save status indicator

### Epic 3.4: Documentation (Completed)

- Created comprehensive TRAZO-EVENT-FLOW.md documentation

## Testing Checklist

When modifying event forms, verify:

- [ ] All required fields have validation
- [ ] Consumer trust fields are properly saved
- [ ] CollapsibleSection opens/closes correctly
- [ ] Auto-save triggers every 30 seconds
- [ ] Draft restoration works correctly
- [ ] Mobile responsive at 375px width
- [ ] StandardComponents used consistently
- [ ] No hardcoded colors (use theme tokens)
