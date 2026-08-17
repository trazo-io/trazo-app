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
  //   secondary = "Additional Information" (one tap)
  //   details   = producer surfaces ONLY — see the warning below
  surfaces: {
    form: 'immediate',          // Show in create/edit form
    modal: 'secondary',         // Show in producer detail modal
    // consumer_card: 'secondary',  // ONLY if a SHOPPER needs it — see below
    // timeline: 'immediate',   // Uncomment to show on producer timeline
    // preview: 'immediate',    // Uncomment to show in event preview
  },
},
```

> **⚠️ `consumer_card` has no `details` tier** (removed 2026-07-31). `resolver.ts` silently
> skips any field whose tier is not in that surface's `allowedTiers`, so
> `consumer_card: 'details'` renders **nowhere** while looking, in the registry, as though it
> appears on the consumer card. `__tests__/consumerCardTiers.test.ts` fails the build if one
> is added.
>
> Before adding `consumer_card` at all, apply the three-question test — a consumer-card field
> must answer one of:
> 1. **What did they do, and why?**
> 2. **What went on or near my food, and was it allowed under organic rules?**
> 3. **Can I believe it?** (photo, third-party certificate, date)
>
> If it answers none, it is operator data: leave it on `modal`/`form`. The certifier PDF reads
> the event models directly, so omitting `consumer_card` costs zero audit coverage. Worker
> names, licence/permit numbers, internal SOP or block IDs, raw CFR citations and per-event
> fuel figures all fail the test — several of them also have to be stripped server-side in
> `PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS`.

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

### Step 7: Decide whether the TEMPLATE flow should carry it

Events created from a crop template do **not** go through the form or the serializers. They are
built in `trazo-back/history/views.py::_create_single_template_event`, one hand-written kwarg
list per event category.

Until 2026-08-12 that meant a field could pass every step above — model, both serializers,
migration, types, registry, form, packet — and still be **unreachable from the template flow**,
which is the path most growers actually use. Measured then: **167 concrete fields across
production / soil / chemical / pest could not be set from a template.** This document not
mentioning that file is why nobody noticed.

It is now generic: `_template_extra_fields()` passes through any key that is a concrete,
editable, non-relation field of that exact model and is not already set explicitly. **So a new
field needs no code here** — but you do need to decide two things:

1. **Should a template pre-fill it?** Usually **no** for anything factual about the operation.
   A template that sets `manure_animal_source="poultry"` writes "Chicken" into an audit file
   for a grower who used cattle. Templates suggest *activities*; they must not assert *facts*.
   (See the Smart Setup incident: a backdated glyphosate record attributed by name.)
2. **Does it need a server-side default?** Every branch passes `backend_fields.get("x")`, so an
   omitted key arrives as `None`. `_drop_nulls_over_model_defaults()` now hands NOT NULL columns
   back to their model default — before it existed, one such column
   (`transportation_unit`, null=False default="miles") failed the insert, and because
   `_create_template_events` swallows per-event errors, **639 of 1029 seeded templates created
   no event at all, silently.**

### Step 8: Done!

The field now appears on:
- **Display surfaces** (modal, card, timeline, consumer QR) — automatically from registry
- **Form surfaces** (create/edit) — via the JSX you added in Step 6
- **Template-created events** — automatically, if a template carries the key (Step 7)

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
