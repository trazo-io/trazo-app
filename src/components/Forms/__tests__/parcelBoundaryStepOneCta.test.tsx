/**
 * The parcel map step has exactly ONE control that advances the wizard.
 *
 * 🔴 REPORTED 2026-09-08 (Spanish UI, parcel add/edit): the footer's primary "Continuar" was
 * the DEAD control on the map step — it bounced with a toast — while a small ghost link
 * ("Continuar sin límite — dibújalo más tarde") sitting above it was the only thing that
 * actually moved the farmer forward. Two calls to action for one destination, with the
 * hierarchy inverted, and the toast that explained the block was hardcoded English
 * ("Almost there / Draw the parcel boundary on the map, or choose to add it later.")
 * rendering over a fully translated page.
 *
 * The boundary is deferrable by product decision — `parcel_application_status.has_map` is
 * also satisfiable by an uploaded map document, and the profile nudge asks again — so
 * blocking Continue was never right. What this pins:
 *   1. no second advancing CTA on the map step,
 *   2. Continue advances with no polygon drawn,
 *   3. the step's own strings are translated (no English leaking onto an es-419 page).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import theme from '../../../theme/theme';
import esMessages from '../../../i18n/lang/es-419.json';
import { StandardParcelFormTransparency } from '../StandardParcelForm_Transparency';

// jsdom has no Google Maps. The step's logic under test is navigation + copy, not the map,
// so the loader reports ready and the map surfaces render as inert boxes.
vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: true, loadError: undefined }),
  GoogleMap: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  Polygon: () => null,
  Marker: () => null
}));

// TrazoImageUpload pulls the upload stack in on step 3; the map step never renders it.
vi.mock('../../Upload', () => ({ TrazoImageUpload: () => null }));

const renderForm = () =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale="es-419" messages={esMessages as any} onError={() => undefined}>
        <StandardParcelFormTransparency onSubmit={() => undefined} onCancel={() => undefined} />
      </IntlProvider>
    </ChakraProvider>
  );

const advanceToMapStep = async (user: ReturnType<typeof userEvent.setup>) => {
  // StandardField's label is not wired with htmlFor, so both inputs are reached by their
  // placeholder / role rather than by label text. The placeholder is read from the catalogue
  // rather than typed out, so translating it does not break this harness.
  const namePlaceholder = (esMessages as Record<string, string>)[
    'parcel.step.identity.namePlaceholder'
  ];
  await user.type(screen.getByPlaceholderText(namePlaceholder), 'Bloque Norte');
  const spin = screen.getAllByRole('spinbutton')[0];
  await user.clear(spin);
  await user.type(spin, '12.5');
  await user.click(screen.getByRole('button', { name: /continuar/i }));
};

describe('parcel wizard — map step', () => {
  it('offers exactly one control that advances, and it is the primary Continue', async () => {
    const user = userEvent.setup();
    renderForm();
    await advanceToMapStep(user);

    expect(screen.getByText(/ubicación de la parcela/i)).toBeInTheDocument();

    // The retired escape hatch. Its text must not come back as a second button.
    expect(
      screen.queryByRole('button', { name: /sin límite|without boundary|dibújalo más tarde/i })
    ).toBeNull();

    const advancing = screen.getAllByRole('button', { name: /continuar/i });
    expect(advancing).toHaveLength(1);
  });

  it('advances with no boundary drawn instead of bouncing with a toast', async () => {
    const user = userEvent.setup();
    renderForm();
    await advanceToMapStep(user);

    await user.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 2 is reached: its description textarea is on screen and the map is gone.
    expect(screen.queryByTestId('google-map')).toBeNull();
    expect(screen.queryByText(/casi listo/i)).toBeNull();
  });

  it('renders the map step in Spanish — no English string leaks through', async () => {
    const user = userEvent.setup();
    renderForm();
    await advanceToMapStep(user);

    expect(screen.getByText(/todavía no dibujas el límite/i)).toBeInTheDocument();
    expect(screen.getByText(/toca el mapa para marcar las esquinas/i)).toBeInTheDocument();
    expect(screen.queryByText(/Polygon Points|Valid Polygon|Clear Points|Loading map/i)).toBeNull();
  });
});

/**
 * Steps 0, 2 and 3 shipped fully hardcoded in English while step 1 was translated — a Spanish
 * grower saw "Parcel Identity", "Parcel Name", "Describe this parcel" and "Create Parcel" on
 * three of the four steps. Two of those strings were also false or retired, so they were
 * rewritten rather than translated:
 *   • "images that show consumers the practices in action" — `_build_public_parcel` carries no
 *     images and every other reader of `parcel.album` is behind IsAuthenticated.
 *   • "(3+ images recommended for full points)" / "100+ characters recommended" — both are
 *     `Parcel.get_transparency_score()` thresholds, and the score is retired as a concept.
 */
describe('parcel wizard — every step is translated', () => {
  const ENGLISH_LEAKS =
    /Parcel Identity|Parcel Name|Consumer-friendly|Why this matters|Describe this parcel|Soil & conservation|Where this goes|Visual Documentation|Parcel Images|Visual Trust Building|Create Parcel|Update Parcel|Check your details|Add New Parcel|Edit Parcel/;

  // Claims the copy may not make again, in EITHER language.
  const RETIRED_CLAIMS = /full points|puntos completos|100\+ characters|100\+ caracteres/i;

  it('shows no English or score-derived copy on any of the four steps', async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    const stepText = [container.textContent ?? ''];
    await advanceToMapStep(user);
    stepText.push(container.textContent ?? '');
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    stepText.push(container.textContent ?? '');
    await user.type(
      container.querySelector('textarea') as HTMLElement,
      'Cuadro de nogal en la ladera este.'
    );
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    stepText.push(container.textContent ?? '');

    for (const text of stepText) {
      expect(text).not.toMatch(ENGLISH_LEAKS);
      expect(text).not.toMatch(RETIRED_CLAIMS);
    }

    // And the last step really was reached — otherwise the sweep proves nothing about it.
    expect(screen.getByRole('button', { name: /crear parcela/i })).toBeInTheDocument();
  });

  it('translates the zod field errors, which are frozen at import if the schema is module-scope', async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    // The per-step guards never invoke zod — they run their own checks and only the final
    // submit hits the resolver. So this drives an over-long name, which every step guard
    // waves through and only `.max(100)` rejects.
    const namePlaceholder = (esMessages as Record<string, string>)[
      'parcel.step.identity.namePlaceholder'
    ];
    await user.type(screen.getByPlaceholderText(namePlaceholder), 'B'.repeat(120));
    const spin = screen.getAllByRole('spinbutton')[0];
    await user.clear(spin);
    await user.type(spin, '12.5');
    await user.click(screen.getByRole('button', { name: /continuar/i })); // → map
    await user.click(screen.getByRole('button', { name: /continuar/i })); // → description
    await user.type(
      container.querySelector('textarea') as HTMLElement,
      'Cuadro de nogal en la ladera este.'
    );
    await user.click(screen.getByRole('button', { name: /continuar/i })); // → photos
    await user.click(screen.getByRole('button', { name: /crear parcela/i }));

    // onInvalidSubmit jumps back to the step owning the bad field and prints zod's message.
    // Two matches by design: the field error under the input and the toast description.
    expect(
      (await screen.findAllByText(/usa menos de 100 caracteres en el nombre/i)).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Name too long/i)).toBeNull();
  });
});
