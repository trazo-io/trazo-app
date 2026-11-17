/**
 * Registry ↔ form conformance, by RENDERING the real form.
 *
 * WHY THIS EXISTS
 * ---------------
 * `formConformance.test.ts` already guards registry-vs-form drift, but only by asking
 * "does this field NAME appear anywhere in the tab source?". That check cannot see
 * SUBTYPE REACHABILITY, and on 2026-07-31 a real defect walked straight through it:
 *
 *   `manure_harvest_interval` was present in SoilManagementTab.jsx (so the name check
 *   passed) and resolved correctly out of the registry for subtype GR (so the registry
 *   tests passed) — while the live form rendered nothing, because the block sat inside
 *   an outer SectionBox gated to `['PA','OM','CC','CO']`. A grower logging sheep grazing
 *   in an orchard produced an audit packet with no NOP 90/120-day manure interval at all.
 *
 * Registry green ≠ form renders. The only thing that proves a farmer can actually type a
 * value is mounting the component and looking for the input. That is what this does.
 *
 * 2026-08-15: the "label-namespace mismatch" this file used to work around is GONE for
 * ProductionTab. 50 of its labels were hardcoded English strings, so they were invisible to
 * the label probe AND rendered English on the Spanish dashboard. Every one now reads the
 * REGISTRY's own `labelKey` where the field has one — meaning a field has ONE label, not a
 * form label and a registry label that have to be kept in sync by hand. `equipment_hours`
 * was the standing example and needed a divergence entry for four subtypes; it needs none.
 *
 * WHEN THIS FAILS you have three honest options:
 *   1. The field was supposed to be collectable for that subtype — fix the form's gating.
 *   2. It is display-only for that subtype — narrow `visibleForSubtypes`, or drop `form`
 *      from `surfaces`.
 *   3. It only appears after another answer (e.g. processed-manure temperature appears
 *      once treatment = processed_5006). Those declare `visibleWhen` in the registry and
 *      are skipped automatically — see VALUE_CONDITIONAL below.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import baseApi from 'store/api/baseApi';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ProductionTab reads one RTK Query endpoint purely to populate an optional
// "which cleaning event preceded this pass" dropdown. Stubbing it keeps the harness
// light WITHOUT stubbing any of the JSX under test — the point of this guard is that
// the real component's real markup is what gets inspected.
vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  // Past seed suppliers feed a <datalist> of SUGGESTIONS next to the supplier input.
  // Stubbed empty: the input is a free-text field either way, and this guard is about
  // whether the input renders, not what it suggests.
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  // ChemicalTab's "my products" quick-pick. Stubbed empty for the same reason as the others:
  // this guard inspects the real component's real markup, not what it suggests.
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsQuery: () => ({ data: undefined, isLoading: false })
}));

// BlockIdField fetches the parcel to build its block picker. Stubbed for the same reason as
// historyApi above: this guard inspects the real component's real markup, and wiring a full
// RTK Query store here would test the harness rather than the form. `known_block_ids` is
// returned so the datalist path renders too, not just the bare input.
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({
    data: { known_block_ids: ['Block 1', 'Block 2'] },
    isLoading: false
  })
}));

import { productionEventRegistry } from '../productionEvent';
import { soilEventRegistry } from '../soilEvent';
import { chemicalEventRegistry } from '../chemicalEvent';
import { pestEventRegistry } from '../pestEvent';
import { weatherEventRegistry } from '../weatherEvent';
import { businessEventRegistry } from '../businessEvent';
import { generalEventRegistry } from '../generalEvent';
import enUS from '../../../i18n/lang/en-US.json';

import ProductionTab from 'views/Dashboard/Dashboard/components/forms/ProductionTab';
import SoilManagementTab from 'views/Dashboard/Dashboard/components/forms/SoilManagementTab';
import ChemicalTab from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';
import PestManagementTab from 'views/Dashboard/Dashboard/components/forms/PestManagementTab';
import WeatherTab from 'views/Dashboard/Dashboard/components/forms/WeatherTab';
import BusinessTab from 'views/Dashboard/Dashboard/components/forms/BusinessTab-SIMPLIFIED';
import GeneralTab from 'views/Dashboard/Dashboard/components/forms/GeneralTab';

const messages = enUS as unknown as Record<string, string>;

const testStore = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          // A CALIFORNIA establishment whose id matches the `farmId` in the route below.
          //
          // 🔴 Without this the store had no `establishments` at all, so `useFarm` returned
          // null, `useFarmState` returned null, and every `farmState === 'CA'` block stayed
          // unmounted. That silently hid the entire CA Pesticide Use Report group — operator
          // ID, site ID and county, i.e. DPR-PML-017C boxes 3, 8 and 10 — from a guard whose
          // whole job is proving those inputs exist. The sweep reported them "never rendered"
          // when the truth was "the harness could not reach them", which is the worse of the
          // two failures: it invents defects and hides real ones behind the same silence.
          //
          // CA specifically because it is the ICP state and carries the strictest surface.
          establishments: [{ id: 1, name: 'Test Farm', state: 'CA', country: 'US' }]
        }
      }),
      // RTK Query slice + middleware: the receipt-file picker (2026-08-25) calls
      // useGetFarmDocumentsQuery inside the soil and chemical tabs, and a store
      // without the api middleware turns that into a thrown warning that fails
      // every render this guard performs. Real reducer, real middleware — the
      // query itself is skipped (no companyId resolvable here).
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

/** Mount a form tab with a given subtype preselected and list the inputs it renders. */
const renderedFieldNames = (
  Tab: React.ComponentType<Record<string, unknown>>,
  initialValues: Record<string, unknown>
): Set<string> => {
  const { container } = render(
    <Provider store={testStore()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => {}}>
                  <Tab initialValues={initialValues} hideActions onSubmitHandler={() => {}} />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  // Flush effects that run AFTER the first commit and change what renders.
  //
  // 🔴 MEASURED 2026-08-16. WeatherTab calls `mainInfoMethods.reset({...})` inside a mount
  // effect; its whole "Weather Details & Measurements" section is gated on `watch('type')`,
  // and reading the DOM straight after `render()` caught the tree BEFORE the reset-driven
  // re-render. All eight weather subtypes reported their detail fields unreachable — while
  // the database holds real rows carrying exactly those keys (lower_temperature on 25 rows,
  // way_of_protection on 24, highest_temperature on 18). The form writes them fine; the probe
  // was reading too early.
  //
  // That is the dangerous failure mode for a guard like this: it invents defects, and an
  // invented defect spends real time and erodes trust in every true one beside it.
  act(() => {});

  const names = new Set<string>();
  container.querySelectorAll('input, select, textarea').forEach((el) => {
    const n = (el as HTMLInputElement).name;
    if (n) names.add(n);
  });
  // Fields wired through react-hook-form's <Controller> (Chakra NumberInput, switches)
  // often never put a `name` on the DOM node, so the name set alone under-reports.
  // Stash the rendered text so a field can also be recognised by its visible label —
  // which is, after all, what tells a farmer the input exists.
  (names as Set<string> & { __text?: string }).__text = container.textContent ?? '';
  return names;
};

/** Is this registry field reachable in the rendered form — by input name, alias, or label? */
const isCollectable = (rendered: Set<string>, fieldName: string, labelKey?: string) => {
  if (rendered.has(fieldName)) return true;
  const alias = FORM_INPUT_ALIASES[fieldName];
  if (alias && rendered.has(alias)) return true;
  const label = labelKey ? messages[labelKey] : undefined;
  if (!label) return false;
  const text = (rendered as Set<string> & { __text?: string }).__text ?? '';
  return text.includes(label);
};

/**
 * Registry fields a farmer reaches only after answering something ELSE on the same form.
 * Their absence from a first-paint render is correct, not drift. Detected structurally
 * (the registry marks them with `visibleWhen`) rather than by hand-listing names.
 */
const isValueConditional = (field: Record<string, unknown>) =>
  typeof field.visibleWhen === 'function';

/**
 * Collected by the shared wizard step rather than the per-type tab.
 * Mirrors COLLECTED_ELSEWHERE in formConformance.test.ts.
 */
const COLLECTED_ELSEWHERE = new Set(['performed_by', 'date', 'name', 'observation']);

/**
 * The field IS collected, under a different input name. Not drift — the serializer maps
 * these — so an alias hit counts as rendered. Mirrors the "PERMANENT, intentional aliases"
 * note in formConformance.test.ts.
 */
const FORM_INPUT_ALIASES: Record<string, string> = {
  amendment_amount_numeric: 'amendment_amount',
  amendment_amount_unit: 'amendment_unit',
  working_depth: 'depth',
  // The tab names this input `production_method`; it lands in `extra_data.method`.
  method: 'production_method'
};

/**
 * DOCUMENTED BASELINE — registry declares a `form` surface that the tab deliberately does
 * not render for this subtype. Every entry is "the registry over-declares", NOT "the form
 * is broken": the honest fix is to narrow `visibleForSubtypes` in the registry. Recorded
 * rather than silently tolerated so that NEW drift fails loudly.
 *
 * Do not add to this list to make a failure go away. A new entry means a farmer cannot
 * enter a value the registry claims is collectable — decide which side is wrong first.
 */
const KNOWN_DIVERGENCE: Record<string, string[]> = {
  // --- ProductionTab (keys prefixed `production:`) -------------------------------
  // Pre-existing drift surfaced by this guard on the day it was written. Each is the
  // registry over-declaring a `form` surface the tab does not render for that subtype.
  'production:EM': [
    'area_covered', // equipment cleaning is not an area operation
    'block_id',
    'growth_stage',
    'transportation_distance'
  ],
  // PL (planting) — added with the subtype 2026-08-15. Both entries are DETECTOR blind
  // spots, not unreachable fields, and both are verified reachable by hand:
  'production:PL': [
    // Rendered, but as a repeating supplier/date/result/notes row group whose inputs carry
    // PLACEHOLDERS rather than a label matching the registry labelKey, so the label-based
    // reachability probe cannot see it. It is the NOP 205.204(a)(1) widget and it is very
    // much on the form — ungated from `needsSeedSearch` on the same day.
    'seed_search_attempts'
  ],
  // TR renders the SAME § 205.204 seed widget as PL (the form gates it on `PL || TR`), so it
  // inherits the identical placeholder-based detector blind spot. Verified reachable by hand.
  'production:TR': ['seed_search_attempts'],
  // IR is not missing a fuel input — it deliberately REPLACES one. For irrigation on anything
  // other than a diesel pump, ProductionTab renders an explanatory panel instead: energy is
  // auto-calculated from water volume and water source using USDA NRCS pump efficiency
  // (0.365 kg CO2e/kWh, the figure in .claude/rules/carbon-methodology.md). The input appears
  // once the grower selects Diesel, which makes it value-conditional in a way the registry
  // cannot express with `visibleWhen` without weakening the check for the eleven subtypes
  // where fuel IS unconditional.
  'production:IR': ['fuel_consumed'],
  // HA (harvest) — swept from 2026-08-15, and it needs NO divergence entry. Everything the
  // registry declares on HA's form surface renders and is matched by the registry's own
  // label key. Quality grade, grain moisture, harvest method and dry matter had been
  // labelled with HARDCODED ENGLISH STRINGS: invisible to this probe AND showing English on
  // the Spanish dashboard.
  'production:PH': [
    'block_id',
    'growth_stage',
    'transportation_distance',
    // Quality metrics belong to the HARVEST event, not the packing shed pass.
    'harvest_quality_grade',
    'brix_level',
    'dry_matter_percentage',
    'production_efficiency'
  ],
  // --- SoilManagementTab ---------------------------------------------------------
  // Never rendered by the soil tab for any subtype.
  '*': [
    'soil_moisture', // no input anywhere in SoilManagementTab
    'weather_conditions' // chemical/pest tabs collect this; the soil tab does not
  ],
  // TI and GR no longer need soil-PROPERTY entries: `soil_ph`, `organic_matter_percentage`
  // and `soil_texture` were narrowed in soilEvent.ts to the six subtypes that actually
  // measure soil, which is what the header of this file calls the honest fix. The reason
  // stands and now lives in the registry — "a sheep rotation or a tillage pass doesn't
  // measure soil pH, and showing these empty fields invited fabricated readings".
  GR: [
    // Contract grazing burns no fuel on the block and runs no implement.
    'fuel_consumed',
    'fuel_type',
    'equipment_hours',
    'equipment_used',
    'production_efficiency'
  ]
};

const allowedMissing = (key: string) =>
  new Set([
    // The `*` block is SoilManagementTab-wide; production keys carry their own prefix.
    ...(key.startsWith('production:') ? [] : KNOWN_DIVERGENCE['*'] ?? []),
    ...(KNOWN_DIVERGENCE[key] ?? [])
  ]);

/** Registry fields that declare a `form` surface AND are gated to this subtype. */
const expectedFormFields = (registry: { fields: unknown }, subtype: string) =>
  (registry.fields as Array<Record<string, unknown>>)
    .filter((f) => {
      const surfaces = (f.surfaces ?? {}) as Record<string, unknown>;
      if (!surfaces.form) return false;
      if (isValueConditional(f)) return false;
      if (COLLECTED_ELSEWHERE.has(f.name as string)) return false;
      const gate = f.visibleForSubtypes as string[] | undefined;
      // No gate = every subtype; a gate must include this subtype.
      return !gate || gate.includes(subtype);
    })
    .map((f) => ({ name: f.name as string, labelKey: f.labelKey as string | undefined }));

// Subtypes whose form sections are materially different from one another.
// Completed 2026-08-16: HD, LA and NS were the last three unswept soil subtypes.
const SOIL_SUBTYPES = ['ST', 'PA', 'CC', 'OM', 'TI', 'CO', 'GR', 'HD', 'LA', 'NS'];

describe('Soil Management form actually renders every field the registry promises', () => {
  for (const subtype of SOIL_SUBTYPES) {
    it(`renders all form-surface fields for subtype ${subtype}`, () => {
      const rendered = renderedFieldNames(SoilManagementTab as never, { type: subtype });
      const skip = allowedMissing(subtype);
      const missing = expectedFormFields(soilEventRegistry, subtype)
        .filter((f) => !skip.has(f.name) && !isCollectable(rendered, f.name, f.labelKey))
        .map((f) => f.name);
      expect(
        missing,
        `Subtype ${subtype}: the registry declares these on the 'form' surface but the ` +
          `mounted SoilManagementTab never renders an input for them. ` +
          `Registry green != form renders — see the header of this file.`
      ).toEqual([]);
    });
  }
});

// Production sweep is deliberately scoped to the two NOP-sensitive subtypes: EM (equipment
// cleaning, § 205.272) and PH (post-harvest handling, NOP 5026 / § 205.605(b)). Those are the
// ones whose omissions land in a certifier packet.
//
// PL added 2026-08-15. It is the § 205.204 record — seed status, the commercial-availability
// search, the treatment-allowability basis, rootstock — and leaving it unswept cost real
// findings: the registry declared `growth_stage` and `production_efficiency` on the Planting
// FORM surface while ProductionTab gates both inputs away from PL, so the modal displayed
// values a grower had no control to change. A label-namespace sweep would have flagged both.
//
// HA added 2026-08-15 with the harvest lot identity work. It is the § 205.103(b)(2)
// trace-back record — the lot code that links a pick to its block and date and is what a
// sales record cites — and it was the subtype where a registry `form` surface had the least
// chance of being noticed as unreachable, because nothing swept it.
//
// The remaining subtypes (IR/PR/MO) are NOT swept yet, and that is a stated limitation
// rather than a clean bill of health: ProductionTab labels its inputs from a different i18n
// namespace than the registry ("Equipment Operating Hours" via quickAdd.* vs "Equipment Hours"
// via events.common.*), so the label-based reachability signal produces noise rather than
// findings. Reconcile those label keys and this list can grow.
// Completed 2026-08-16. All 13 production subtypes are now swept; the label-namespace noise
// that kept the list at four is gone (every ProductionTab label now reads the registry's own
// labelKey), so the reason for holding the others back no longer exists.
const PRODUCTION_SUBTYPES = [
  'EM',
  'PH',
  'PL',
  'HA',
  'IR',
  'PR',
  'TR',
  'CU',
  'TH',
  'PO',
  'CM',
  'FP',
  'MO'
];

/**
 * Extra answers the sweep supplies so value-gated sections are open. These are not a fudge:
 * they put the form in the state a real farmer is in when the section legitimately applies
 * (an equipment CLEANING pass; a WET post-harvest operation). Without them the sweep would
 * report correctly-hidden sections as drift.
 */
const SUBTYPE_SEED: Record<string, Record<string, unknown>> = {
  'production:EM': { equipment_operation_type: 'CL' },
  'production:PH': { processing_type: 'washing' }
};

describe('Production form actually renders every field the registry promises', () => {
  for (const subtype of PRODUCTION_SUBTYPES) {
    it(`renders all form-surface fields for subtype ${subtype}`, () => {
      const rendered = renderedFieldNames(ProductionTab as never, {
        type: subtype,
        ...(SUBTYPE_SEED[`production:${subtype}`] ?? {})
      });
      const skip = allowedMissing(`production:${subtype}`);
      const missing = expectedFormFields(productionEventRegistry, subtype)
        .filter((f) => !skip.has(f.name) && !isCollectable(rendered, f.name, f.labelKey))
        .map((f) => f.name);
      expect(
        missing,
        `Production subtype ${subtype}: the registry declares these on the 'form' surface ` +
          `but the mounted ProductionTab never renders an input for them.`
      ).toEqual([]);
    });
  }
});

describe('NOP 5026 wash-water sanitizer is recordable where water touches the crop', () => {
  // 7 CFR 205.605(b) caps RESIDUAL chlorine at the point of last crop contact at the
  // SDWA MRDL. The columns existed (and were even exposed on the consumer payload) with
  // no form anywhere, so only seed commands could populate them.
  const WASH = [
    'sanitizer_name',
    'sanitizer_ppm',
    'sanitizer_residual_ppm_at_discharge',
    'sanitizer_nop_reference'
  ];

  it('post-harvest processing (PH) can record wash-water sanitizer', () => {
    const rendered = renderedFieldNames(ProductionTab as never, {
      type: 'PH',
      processing_type: 'washing'
    });
    for (const f of WASH) expect(rendered.has(f), `${f} missing on PH`).toBe(true);
  });

  it('equipment cleaning (EM + CL) can record sanitizer', () => {
    // Sanitizer detail is correctly scoped to the CLEANING operation type — a repair or
    // calibration pass has no sanitizer, and an empty section invites fabricated readings.
    const rendered = renderedFieldNames(ProductionTab as never, {
      type: 'EM',
      equipment_operation_type: 'CL'
    });
    for (const f of WASH) expect(rendered.has(f), `${f} missing on EM/CL`).toBe(true);
  });

  it('a dry post-harvest pass shows no sanitizer section', () => {
    const rendered = renderedFieldNames(ProductionTab as never, {
      type: 'PH',
      processing_type: 'sorting'
    });
    expect(rendered.has('sanitizer_residual_ppm_at_discharge')).toBe(false);
  });
});

describe('NOP raw-manure interval is reachable where livestock deposit manure', () => {
  // The 2026-07-31 regression, pinned directly. 7 CFR 205.203(c)(1): grazing livestock
  // apply RAW manure, so the 90/120-day pre-harvest interval applies exactly as it does
  // to a spreader pass.
  it('grazing (GR) renders the interval and the animals-removed date', () => {
    const rendered = renderedFieldNames(SoilManagementTab as never, { type: 'GR' });
    expect(rendered.has('manure_harvest_interval')).toBe(true);
    expect(rendered.has('manure_application_date')).toBe(true);
  });

  it('grazing does NOT offer an interval-exempt manure treatment', () => {
    // Deposited manure is raw by definition; composted/processed describe a treatment
    // applied to COLLECTED manure. Offering them would let a grower mark an exemption
    // the practice cannot support.
    const rendered = renderedFieldNames(SoilManagementTab as never, { type: 'GR' });
    expect(rendered.has('manure_treatment')).toBe(false);
  });

  it('amendment (OM) still renders the full manure set', () => {
    const rendered = renderedFieldNames(SoilManagementTab as never, { type: 'OM' });
    expect(rendered.has('manure_harvest_interval')).toBe(true);
    expect(rendered.has('manure_application_date')).toBe(true);
    expect(rendered.has('manure_treatment')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------
// Chemical — 4 subtypes, 53 registry fields, and until 2026-08-16 ZERO render coverage.
//
// This is the highest-stakes tab in the product: input applications carry § 205.206(e)
// (a listed substance is allowable only if its conditions are in the OSP), the § 205.601/602
// National List classification, and the CA PUR export. A field the registry promises here and
// the form does not render is a compliance record a grower believes they filed and did not.
// ---------------------------------------------------------------------------------------
const CHEMICAL_SUBTYPES = ['FE', 'PE', 'FU', 'HE'];

describe('Chemical form actually renders every field the registry promises', () => {
  for (const subtype of CHEMICAL_SUBTYPES) {
    it(`renders all form-surface fields for subtype ${subtype}`, () => {
      const rendered = renderedFieldNames(ChemicalTab as never, { type: subtype });
      const skip = allowedMissing(`chemical:${subtype}`);

      const missing = chemicalEventRegistry.fields
        .filter((f) => f.surfaces?.form)
        .filter((f) => !f.visibleForSubtypes || f.visibleForSubtypes.includes(subtype as never))
        .filter((f) => !isValueConditional(f as unknown as Record<string, unknown>))
        .filter((f) => !COLLECTED_ELSEWHERE.has(f.name))
        .filter((f) => !skip.has(f.name))
        .filter((f) => !isCollectable(rendered, f.name, f.labelKey))
        .map((f) => f.name);

      expect(
        missing,
        `Chemical subtype ${subtype}: the registry declares these on the 'form' surface but ` +
          `the mounted ChemicalTab never renders an input for them.`
      ).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------------------
// The remaining four tabs. Until 2026-08-16 the sweep covered 2 of 7 tabs and 11 of 43
// activity variants — so for 32 variants nobody had verified that the inputs the registry
// promises are reachable at all. That is the gap behind "are we asking the right things for
// each activity", and it is answerable mechanically rather than by re-reading forms.
//
// `subtypes: null` means the registry does not gate that tab by subtype; the sweep then runs
// once with no seeded subtype, which is exactly how a farmer first sees the form.
// ---------------------------------------------------------------------------------------
const REMAINING_TABS = [
  {
    key: 'pest',
    label: 'Pest Management',
    Tab: PestManagementTab,
    registry: pestEventRegistry,
    // § 205.206 hierarchy: prevention (a), mechanical/physical (b), weed (c), disease (d),
    // and only then a listed substance (e).
    subtypes: ['IP', 'BR', 'TA', 'SC', 'TM', 'PI', 'CU']
  },
  {
    key: 'weather',
    label: 'Weather',
    Tab: WeatherTab,
    registry: weatherEventRegistry,
    subtypes: ['FR', 'DR', 'HL', 'HT', 'TS', 'HW', 'HH', 'LH']
  },
  {
    key: 'business',
    label: 'Business',
    Tab: BusinessTab,
    registry: businessEventRegistry,
    subtypes: ['CE'],
    // BusinessTab gates its sections on `business_type` ('certification' / 'verification' /
    // 'carbon_credits'), NOT on the registry's `CE` subtype code. Seeding only `type` left
    // every conditional section closed and reported three inputs as missing that the tab
    // plainly has. Conditional sections render only AFTER their trigger is set.
    seed: { business_type: 'certification' }
  },
  {
    key: 'general',
    label: 'General',
    Tab: GeneralTab,
    registry: generalEventRegistry,
    subtypes: null
  }
];

for (const { key, label, Tab, registry, subtypes, seed } of REMAINING_TABS) {
  describe(`${label} form actually renders every field the registry promises`, () => {
    for (const subtype of subtypes ?? [null]) {
      const name = subtype ?? 'default';
      it(`renders all form-surface fields for ${name}`, () => {
        const rendered = renderedFieldNames(Tab as never, {
          ...(subtype ? { type: subtype } : {}),
          ...(seed ?? {})
        });
        const skip = allowedMissing(`${key}:${name}`);

        const missing = registry.fields
          .filter((f) => f.surfaces?.form)
          .filter(
            (f) =>
              !subtype || !f.visibleForSubtypes || f.visibleForSubtypes.includes(subtype as never)
          )
          .filter((f) => !isValueConditional(f as unknown as Record<string, unknown>))
          .filter((f) => !COLLECTED_ELSEWHERE.has(f.name))
          .filter((f) => !skip.has(f.name))
          .filter((f) => !isCollectable(rendered, f.name, f.labelKey))
          .map((f) => f.name);

        expect(
          missing,
          `${label} ${name}: the registry declares these on the 'form' surface but the ` +
            `mounted tab never renders an input for them.`
        ).toEqual([]);
      });
    }
  });
}
