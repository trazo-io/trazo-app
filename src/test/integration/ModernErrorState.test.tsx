import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import theme from '../../theme/theme';
import enMessages from '../../i18n/lang/en-US.json';
import esMessages from '../../i18n/lang/es-419.json';
import {
  ModernErrorState,
  classifyConsumerError,
  buildErrorReference
} from '../../views/Scan/ProductDetail/components/ModernErrorState';

const renderError = (props: React.ComponentProps<typeof ModernErrorState>, locale = 'en-US') =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider
        locale={locale}
        messages={locale === 'en-US' ? (enMessages as any) : (esMessages as any)}
        onError={() => undefined}
      >
        <ModernErrorState {...props} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('classifyConsumerError', () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');

  const setOnLine = (value: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
  };

  beforeEach(() => setOnLine(true));

  afterEach(() => {
    if (originalOnLine) Object.defineProperty(window.navigator, 'onLine', originalOnLine);
  });

  it('only blames the consumer connection when the device says it is disconnected', () => {
    setOnLine(false);
    expect(classifyConsumerError({ status: 500 })).toBe('offline');
  });

  it('does NOT blame the consumer WiFi for an unreachable server while online', () => {
    expect(classifyConsumerError({ status: 'FETCH_ERROR' })).toBe('unreachable');
    expect(classifyConsumerError({ status: 'TIMEOUT_ERROR' })).toBe('unreachable');
  });

  it('blames Trazo for 5xx and parsing failures', () => {
    expect(classifyConsumerError({ status: 500 })).toBe('server');
    expect(classifyConsumerError({ status: 503 })).toBe('server');
    expect(classifyConsumerError({ status: 'PARSING_ERROR' })).toBe('server');
  });

  it('treats 404/403/410 as "not found" rather than a connection problem', () => {
    expect(classifyConsumerError({ status: 404 })).toBe('not_found');
    expect(classifyConsumerError({ status: 403 })).toBe('not_found');
    expect(classifyConsumerError({ status: 410 })).toBe('not_found');
  });

  it('falls back to general for unknown shapes', () => {
    expect(classifyConsumerError(undefined)).toBe('general');
    expect(classifyConsumerError({ status: 418 })).toBe('general');
  });
});

describe('buildErrorReference', () => {
  it('is derived, stable, and safe when the production id is missing', () => {
    const ref = buildErrorReference({ status: 500 }, '027804d7-17ba-468a-a210-e1279e92e165');
    expect(ref).toBe('500-027804');
    expect(buildErrorReference({ status: 500 }, '027804d7-17ba-468a-a210-e1279e92e165')).toBe(ref);
    expect(buildErrorReference({}, null)).toBe('ERR');
  });
});

describe('ModernErrorState', () => {
  it('renders every error type with real copy — never a raw i18n id', () => {
    const types = [
      'offline',
      'unreachable',
      'server',
      'not_found',
      'qr_verification',
      'general'
    ] as const;

    types.forEach((type) => {
      const { unmount } = renderError({ type });
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toBeTruthy();
      expect(heading.textContent).not.toMatch(/consumer\.error\./);
      // three actionable tips, all resolved
      const tips = screen.getAllByRole('listitem');
      expect(tips).toHaveLength(3);
      tips.forEach((tip) => expect(tip.textContent).not.toMatch(/consumer\.error\./));
      unmount();
    });
  });

  it('renders Spanish copy for every type (i18n parity is not enough — it must resolve)', () => {
    const types = ['offline', 'unreachable', 'server', 'not_found'] as const;
    types.forEach((type) => {
      const { unmount } = renderError({ type }, 'es-419');
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).not.toMatch(/consumer\.error\./);
      expect(heading.textContent).not.toBe('');
      unmount();
    });
  });

  it('calls the real retry handler instead of reloading the page', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    renderError({ type: 'server', onRetry });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
  });

  it('keeps the retry button usable across attempts (no permanent dead end)', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    renderError({ type: 'server', onRetry });

    const button = screen.getByRole('button', { name: /try again/i });
    await act(async () => {
      fireEvent.click(button);
    });
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));

    // first retry carries no cooldown, so the consumer can immediately try once more
    await waitFor(() => expect(button).not.toBeDisabled());
    await act(async () => {
      fireEvent.click(button);
    });
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(2));
  });

  it('auto-retries when the browser regains connectivity', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    renderError({ type: 'offline', onRetry });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
  });

  it('exposes support as a real mailto carrying the diagnostic reference', () => {
    renderError({ type: 'server', errorId: '500-ABC123' });

    const mailto = screen.getByRole('link', { name: /support@trazo\.io/i });
    const href = mailto.getAttribute('href') || '';
    expect(href.startsWith('mailto:support@trazo.io?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('500-ABC123');
  });

  it('localizes icon-button labels rather than hardcoding English', () => {
    renderError({ type: 'server', errorId: '500-ABC123' }, 'es-419');
    expect(screen.getByLabelText('Copiar correo de soporte')).toBeTruthy();
    expect(screen.getByLabelText('Copiar referencia del error')).toBeTruthy();
  });

  it('announces the error without wrapping the whole page in an alert', () => {
    renderError({ type: 'server' });
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    // the alert holds the heading + message only, not the support/footer chrome
    expect(alerts[0].textContent).not.toContain('support@trazo.io');
    expect(alerts[0].textContent).not.toContain('Powered by');
  });

  it('does not render a self-graded score or verification badge (ECGT/FTC)', () => {
    const { container } = renderError({ type: 'not_found' });
    expect(container.textContent).not.toMatch(/verified|score|%/i);
  });
});
