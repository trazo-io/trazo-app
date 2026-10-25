/**
 * The "Held back" row appears only when something was held back.
 *
 * MEASURED 2026-10-25 on a pest Beneficial Release (type 6, BR), an application record: the
 * pasted note "Released ladybugs on both blocks this morning, 2000 per acre" held back nothing,
 * and the banner still printed the "Held back" label and a "Why?" toggle over an empty row.
 *
 * Rendered, not grepped: whether the row exists is decided at render time.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';
// @ts-expect-error CrewNoteRows is a .jsx module with no type declarations.
import { CrewNoteHeldBackRow } from '../CrewNoteRows';

type Messages = Record<string, string>;

const renderRow = (
  props: { labels: string[]; count: number; open?: boolean; onToggle?: () => void },
  messages: Messages = enUS as Messages,
  locale = 'en-US'
) =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <CrewNoteHeldBackRow open={false} onToggle={() => {}} {...props} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('CrewNoteHeldBackRow', () => {
  it('renders nothing when nothing was held back (the Beneficial Release case)', () => {
    const { container } = renderRow({ labels: [], count: 0 });
    expect(container.textContent).toBe('');
    expect(screen.queryByText('Held back')).toBeNull();
    expect(screen.queryByText('Why?')).toBeNull();
  });

  it('renders nothing in Spanish either', () => {
    const { container } = renderRow({ labels: [], count: 0 }, es419 as Messages, 'es-419');
    expect(container.textContent).toBe('');
  });

  it('names what was held back, with the reason one tap away', () => {
    const onToggle = vi.fn();
    renderRow({ labels: ['Volume Applied', 'Area Treated'], count: 2, onToggle });
    expect(screen.getByText('Held back')).toBeTruthy();
    expect(screen.getByTestId('crew-note-withheld').textContent).toContain('Volume Applied');
    expect(screen.getByTestId('crew-note-withheld').textContent).toContain('Area Treated');
    expect(screen.queryByTestId('crew-note-application-mode')).toBeNull();
    const why = screen.getByText('Why?');
    expect(why.closest('button')?.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(why);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('states the reason and the count when open', () => {
    renderRow({ labels: ['Volume Applied', 'Area Treated'], count: 2, open: true });
    const reason = screen.getByTestId('crew-note-application-mode').textContent ?? '';
    expect(reason).toContain('This is an application.');
    expect(reason).toContain('2 values from the message were held back for you to enter.');
  });

  it('keeps the row when a held-back field has no label to show', () => {
    // The count is the fact; a missing label is a registry gap, not a reason to hide a refusal.
    renderRow({ labels: [], count: 1 });
    expect(screen.getByText('Held back')).toBeTruthy();
    expect(screen.queryByTestId('crew-note-withheld')).toBeNull();
  });
});
