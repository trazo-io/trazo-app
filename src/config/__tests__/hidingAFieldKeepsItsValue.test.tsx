/**
 * Hiding a field by context must never DELETE a value already on the record.
 *
 * Two 2026-09-08 changes hide inputs the farmer used to see: harvest maturity measures are now
 * scoped to crops that have them (`config/harvestMaturity.ts`), and the California DPR permit
 * block is gated on the farm's state. Both are display decisions — but if react-hook-form
 * dropped an unmounted field from the payload, opening an existing record and saving it would
 * silently erase a Brix reading or a permit number that a certifier had already been shown.
 *
 * MEASURED with react-hook-form 7.43.5 and `shouldUnregister` left at its default: an unmounted
 * field keeps its value and still submits, for both `Controller` (what these forms use) and a
 * bare `register`. This test pins that, because the invariant is a PROPERTY OF THE FORM CONFIG,
 * not of the gating code: setting `shouldUnregister: true` on one of these forms later would
 * turn a cosmetic improvement into data loss with nothing else failing.
 *
 * ⚠️ `handleSubmit` is async. Asserting synchronously after the click reports `undefined` for
 * every field and reads exactly like the data loss this test is looking for — which is what the
 * first version of this probe did.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm, Controller } from 'react-hook-form';

const Harness = ({
  onCapture,
  viaController
}: {
  onCapture: (values: Record<string, unknown>) => void;
  viaController: boolean;
}) => {
  const methods = useForm({
    // No `shouldUnregister` — matching ProductionTab and ChemicalTab-ENHANCED.
    defaultValues: {
      brix_level: '18.5',
      ca_dpr_permit_number: 'PERMIT-123',
      yield_quantity: '1200'
    }
  });
  const [visible, setVisible] = React.useState(true);
  return (
    <form onSubmit={methods.handleSubmit((values) => onCapture(values))}>
      {visible &&
        (viaController ? (
          <Controller
            name="brix_level"
            control={methods.control}
            render={({ field }) => <input {...field} aria-label="brix" />}
          />
        ) : (
          <input {...methods.register('brix_level')} aria-label="brix" />
        ))}
      {visible && <input {...methods.register('ca_dpr_permit_number')} aria-label="permit" />}
      <input {...methods.register('yield_quantity')} aria-label="yield" />
      <button type="button" onClick={() => setVisible(false)}>
        hide
      </button>
      <button type="submit">save</button>
    </form>
  );
};

const submitAfterHiding = async (viaController: boolean) => {
  let captured: Record<string, unknown> | null = null;
  render(<Harness onCapture={(values) => (captured = values)} viaController={viaController} />);
  fireEvent.click(screen.getByText('hide'));
  fireEvent.click(screen.getByText('save'));
  await waitFor(() => expect(captured).toBeTruthy());
  return captured as unknown as Record<string, unknown>;
};

describe('a field hidden by context keeps its recorded value', () => {
  it('keeps a Controller-bound value (harvest maturity measures)', async () => {
    const values = await submitAfterHiding(true);
    expect(values.brix_level).toBe('18.5');
  });

  it('keeps a register-bound value (the CA permit fields)', async () => {
    const values = await submitAfterHiding(false);
    expect(values.brix_level).toBe('18.5');
    expect(values.ca_dpr_permit_number).toBe('PERMIT-123');
  });

  it('leaves the still-visible fields untouched', async () => {
    const values = await submitAfterHiding(true);
    expect(values.yield_quantity).toBe('1200');
  });
});
