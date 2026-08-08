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
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ProductionTab reads one RTK Query endpoint purely to populate an optional
// "which cleaning event preceded this pass" dropdown. Stubbing it keeps the harness
// light WITHOUT stubbing any of the JSX under test — the point of this guard is that
// the real component's real markup is what gets inspected.
vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false })
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
import enUS from '../../../i18n/lang/en-US.json';

import ProductionTab from 'views/Dashboard/Dashboard/components/forms/ProductionTab';
import SoilManagementTab from 'views/Dashboard/Dashboard/components/forms/SoilManagementTab';

const messages = enUS as unknown as Record<string, string>;

const testStore = () =>
  configureStore({
    reducer: { company: () => ({ currentCompany: { id: 1 } }) }
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
  working_depth: 'depth'
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
    'transportation_distance',
    'equipment_hours'
  ],
  'production:PH': [
    'block_id',
    'growth_stage',
    'transportation_distance',
    'equipment_hours',
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
  // Soil PROPERTIES are field measurements. The tab hides them for tillage and grazing on
  // purpose — "a sheep rotation or a tillage pass doesn't measure soil pH, and showing these
  // empty fields invited fabricated readings" (comment in SoilManagementTab.jsx).
  TI: ['soil_ph', 'organic_matter_percentage', 'soil_texture'],
  GR: [
    'soil_ph',
    'organic_matter_percentage',
    'soil_texture',
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
const SOIL_SUBTYPES = ['ST', 'PA', 'CC', 'OM', 'TI', 'CO', 'GR'];

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
// The remaining subtypes (PL/HA/IR/PR/MO) are NOT swept yet, and that is a stated limitation
// rather than a clean bill of health: ProductionTab labels its inputs from a different i18n
// namespace than the registry ("Equipment Operating Hours" via quickAdd.* vs "Equipment Hours"
// via events.common.*), so the label-based reachability signal produces noise rather than
// findings. Reconcile those label keys and this list can grow.
const PRODUCTION_SUBTYPES = ['EM', 'PH'];

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
