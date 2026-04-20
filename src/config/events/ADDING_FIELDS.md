# How to Add a New Event Field

This guide documents the process for adding a new field to any event type
in Trazo, using the Event Field Registry (SSOT).

## Before You Start

The Event Field Registry is the **single source of truth** for which fields
appear on which UI surfaces. It lives in `src/config/events/`.

**Key principle:** Add the field in 2 places (backend + registry), and ALL
display surfaces pick it up automatically.

## Step-by-Step Process

### Step 1: Add to Django Model

In `trazo-back/history/models.py`, add the field to the appropriate event
model class:

```python
class ChemicalEvent(CommonEvent):
    # ... existing fields ...
    
    # New field example:
    active_ingredient_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Percentage of active ingredient in the product",
    )
```

### Step 2: Add to Serializer

In `trazo-back/history/serializers.py`, add the field to BOTH:
- The read serializer (e.g., `ChemicalEventSerializer.Meta.fields`)
- The update serializer (e.g., `UpdateChemicalEventSerializer`)

```python
class ChemicalEventSerializer(EventSerializer):
    class Meta:
        fields = [
            # ... existing fields ...
            "active_ingredient_percentage",  # NEW
        ]
```

### Step 3: Run Migrations

```bash
cd trazo-back
poetry run python manage.py makemigrations
poetry run python manage.py migrate
```

### Step 4: Regenerate TypeScript Types

```bash
cd trazo-app
# Start backend first: cd trazo-back && poetry run python manage.py runserver
npm run typegen
```

This updates `src/types/api.generated.ts` with the new field.

### Step 5: Add FieldConfig Entry to Registry

Open the relevant event type file (e.g., `src/config/events/chemicalEvent.ts`)
and add a `FieldConfig` entry:

```typescript
{
  // Required: backend field name (must match serializer output)
  name: 'active_ingredient_percentage',
  
  // Required: i18n label key (will be resolved to display label)
  labelKey: 'events.chemical.fields.activeIngredientPercentage',
  
  // Required: value type
  valueType: 'number',
  
  // Optional: custom formatter (import from formatters.ts or write inline)
  formatter: formatPercentage,
  
  // Optional: only show for specific subtypes
  // Omit this line to show for ALL subtypes
  visibleForSubtypes: ['PE', 'FU'],
  
  // Optional: show only when another field has a specific value
  // visibleWhen: (event) => Boolean(event.restricted_use_pesticide),
  
  // Optional: paired unit field
  // unitField: 'percentage_unit',
  
  // Optional: carbon-relevant (FTC: blocked from hero on consumer surfaces)
  // carbonRelevant: true,
  
  // Optional: needs verification badge on consumer surfaces
  // requiresVerificationBadge: true,
  
  // Required: which surfaces show this field + at what priority tier
  //   hero     = always visible, above-the-fold
  //   immediate = "Key Details" section
  //   secondary = "Additional Details" / "Technical Details"
  //   details  = expandable "Learn More" section
  surfaces: {
    form: 'immediate',        // Show in create/edit form
    modal: 'secondary',       // Show in producer detail modal
    consumer_card: 'details', // Show in consumer QR card (expandable)
    // timeline: 'immediate', // Uncomment to show on producer timeline
    // preview: 'immediate',  // Uncomment to show in event preview
  },
},
```

### Step 6: Add to form tab (if the field should appear in create/edit forms)

Display surfaces (modal, card, timeline, consumer QR) pick up the field
automatically from the registry. **Forms require a separate step** because
form tabs use rich, hand-crafted rendering with contextual sections,
validation badges, help text, and interactive elements (NPK validation,
fertigation toggle, etc.) that a generic renderer cannot replicate.

Open the relevant form tab (e.g., `ChemicalTab-ENHANCED.jsx`) and add
the field's JSX in the appropriate section:

```jsx
<StandardField
  label="Active Ingredient %"
  error={errors.active_ingredient_percentage?.message}
  helpText="Percentage of active ingredient in the product"
>
  <Controller
    name="active_ingredient_percentage"
    control={methods.control}
    render={({ field }) => (
      <StandardInput {...field} type="number" step="0.1" placeholder="e.g., 25.5" />
    )}
  />
</StandardField>
```

### Step 7: Done!

The field now appears on:
- **Display surfaces** (modal, card, timeline, consumer QR) — automatically from registry
- **Form surfaces** (create/edit) — via the JSX you added in Step 6

## Architecture: Why forms stay hand-crafted

Forms use rich rendering that a generic field renderer cannot replicate:
- NPK trio with live validation and breakdown (N: 15%, P: 9%, K: 12%, Total: 36.0%)
- Fertigation toggle with explanation alert
- EPA compliance sections with certification badges
- Carbon tracking alerts with fuel emission factors
- Contextual help text and consumer trust messaging
- Section organization with colored badges (EPA Verified, Carbon Calculation, Transparency)

The registry drives **WHICH fields exist** and **WHERE they display** on
read-only surfaces. Forms retain their carefully designed UX.

The `useFormFields` hook is available if form tabs want to query field
visibility from the registry (e.g., to hide/show subtype-conditional fields).

## Quick Reference: Available Surfaces

| Surface | Description | Max Fields | Notes |
|---------|-------------|-----------|-------|
| `timeline` | Producer dashboard timeline row | 3 | Ultra-compact, hero+immediate only |
| `card` | Producer dashboard card | 8 | Medium density |
| `modal` | Producer detail modal | 50 | All tiers shown |
| `form` | Manual event create/edit form | 50 | All tiers, each field = own input |
| `quick_form` | Quick event template form | 15 | Subset of form fields |
| `preview` | Event preview during creation | 30 | Consumer-facing rules apply |
| `consumer_card` | Consumer QR page event card | 20 | FTC-constrained |
| `consumer_timeline` | Consumer "How it was grown" | 5 | Compact consumer view |

## Quick Reference: Priority Tiers

| Tier | Display | Consumer Surfaces |
|------|---------|-------------------|
| `hero` | Always visible, prominent | Carbon fields BLOCKED from hero |
| `immediate` | "Key Details" section | Shown by default |
| `secondary` | "Additional Details" | May be collapsed |
| `details` | "Learn More" expander | Collapsed by default |

## Quick Reference: Conditional Visibility Patterns

```typescript
// Pattern 1: Simple subtype gate (show only for Fertilizer)
visibleForSubtypes: ['FE'],

// Pattern 2: Multi-subtype gate (show for Pesticide, Fungicide, Herbicide)
visibleForSubtypes: ['PE', 'FU', 'HE'],

// Pattern 3: Predicate (show when another field has a value)
visibleWhen: (event) => Boolean(event.restricted_use_pesticide),

// Pattern 4: Dependency (show only when field X equals value Y)
dependsOn: { field: 'is_summary', equals: 'true' },

// Combine: subtype + predicate (both must pass)
visibleForSubtypes: ['PE', 'FU'],
visibleWhen: (event) => Boolean(event.restricted_use_pesticide),
```

## If You Need a New Enum

1. Add to `trazo-back/common/field_registry.py` (backend Python)
2. Add to `trazo-app/src/config/events/enums.ts` (frontend TypeScript)
3. Reference via `enumSource: 'your_enum_key'` in the FieldConfig

## If You Need a New Formatter

Add to `src/config/events/formatters.ts`:

```typescript
export const formatMyValue: FieldFormatter<number> = (value, event) => {
  if (value == null) return null;
  return `${value} custom unit`;
};
```

Then use `formatter: formatMyValue` in your FieldConfig.
