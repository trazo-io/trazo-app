/**
 * The cancellation screen's contract.
 *
 * Two things are pinned here and they pull in opposite directions, which is why they need a
 * test rather than a convention:
 *
 *   RETENTION — the farmer must learn, before deciding, that cancelling is a downgrade to
 *   Starter and not a deletion. The old dialog said only "Are you sure you want to cancel your
 *   subscription?", which is exactly as informative as no dialog at all.
 *
 *   NON-OBSTRUCTION — California's ARL (AB 2863) permits that retention content only where a
 *   button that IMMEDIATELY effects cancellation sits prominently on the same page. So the
 *   confirm can never be disabled, the reason can never be required, and none of this may be
 *   moved behind a "continue" step.
 *
 * Rendered through the real IntlProvider with the real English catalogue, so a renamed or
 * missing message id fails here instead of shipping as a raw "subscription.cancelKeepTitle" on
 * a farmer's screen.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import enMessages from '../../../../i18n/lang/en-US.json';
import esMessages from '../../../../i18n/lang/es-419.json';
import { CANCELLATION_REASONS, CancelSubscriptionModal } from '../CancelSubscriptionModal';

const messages = enMessages as Record<string, string>;

const renderModal = (props: Partial<React.ComponentProps<typeof CancelSubscriptionModal>> = {}) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ChakraProvider>
      <IntlProvider locale="en" messages={messages}>
        <CancelSubscriptionModal
          isOpen
          onClose={onClose}
          onConfirm={onConfirm}
          planName="Compliance"
          periodEndLabel="September 15, 2026"
          {...props}
        />
      </IntlProvider>
    </ChakraProvider>
  );
  return { onConfirm, onClose };
};

const confirmButton = () =>
  screen.getByRole('button', { name: messages['app.confirmCancellation'] });

describe('CancelSubscriptionModal — non-obstruction (California ARL)', () => {
  it('cancels with no reason given, in a single click', () => {
    const { onConfirm } = renderModal();

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ reason: '', feedback: '' });
  });

  it('never disables the confirm button', () => {
    renderModal();
    // Not "is enabled once a reason is chosen" — enabled from the first paint, before the
    // customer has touched anything. A disabled confirm is obstruction however briefly it lasts.
    expect(confirmButton().hasAttribute('disabled')).toBe(false);
  });

  it('puts the retention content and the cancel button on the SAME screen', () => {
    renderModal();
    // No "continue"/"next" step between reading what you keep and being able to leave.
    expect(screen.getByText(messages['subscription.cancelKeepTitle'])).toBeTruthy();
    expect(screen.getByText(messages['subscription.cancelLoseTitle'])).toBeTruthy();
    expect(confirmButton()).toBeTruthy();
  });

  it('labels the reason as optional', () => {
    renderModal();
    expect(messages['subscription.cancelReasonLabel']).toMatch(/optional/i);
  });
});

describe('CancelSubscriptionModal — what the farmer is told', () => {
  it('states the date the paid features actually stop', () => {
    renderModal();
    expect(screen.getByText(/September 15, 2026/)).toBeTruthy();
  });

  it('omits the date rather than printing a placeholder when there is not one', () => {
    // A Starter row carries `current_period_end = null` on purpose. The old page rendered that
    // as "Your subscription will cancel on -", which reads as missing data.
    renderModal({ periodEndLabel: undefined });
    expect(screen.queryByText(/cancelEndsOn/)).toBeNull();
    expect(screen.queryByText(/\bon -\b/)).toBeNull();
  });

  it('says the records survive — the sentence the old dialog never contained', () => {
    renderModal();
    expect(screen.getByText(messages['subscription.cancelKeepRecords'])).toBeTruthy();
    expect(messages['subscription.cancelKeepTitle']).toMatch(/forever/i);
  });

  it('names each certifier output that stops, rather than saying "premium features"', () => {
    renderModal();
    for (const key of ['Packet', 'Audit', 'Pur', 'Certifier']) {
      expect(screen.getByText(messages[`subscription.cancelLose${key}`])).toBeTruthy();
    }
  });

  it('names the plan being cancelled', () => {
    renderModal();
    expect(screen.getByText(/Compliance/)).toBeTruthy();
  });
});

describe('CancelSubscriptionModal — reason capture', () => {
  it('passes the chosen reason and typed feedback to the caller', () => {
    const { onConfirm } = renderModal();

    fireEvent.change(screen.getByLabelText(messages['subscription.cancelReasonLabel']), {
      target: { value: 'seasonal' }
    });
    fireEvent.change(screen.getByLabelText(messages['subscription.cancelFeedbackLabel']), {
      target: { value: 'Back for next season' }
    });
    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'seasonal',
      feedback: 'Back for next season'
    });
  });

  it('only asks for detail once a reason is picked', () => {
    renderModal();
    expect(screen.queryByLabelText(messages['subscription.cancelFeedbackLabel'])).toBeNull();

    fireEvent.change(screen.getByLabelText(messages['subscription.cancelReasonLabel']), {
      target: { value: 'other' }
    });
    expect(screen.getByLabelText(messages['subscription.cancelFeedbackLabel'])).toBeTruthy();
  });

  it('offers the two ag-specific reasons a generic churn list would miss', () => {
    // Neither is really churn — both are dormancy, and they are the difference between
    // "win them back with a discount" and "email them in October".
    expect(CANCELLATION_REASONS).toContain('seasonal');
    expect(CANCELLATION_REASONS).toContain('certification_done');
  });

  it('has a translated label for every reason, in BOTH locales', () => {
    // A dropdown that silently renders "subscription.cancelReason.seasonal" is worse than no
    // dropdown, and i18n parity only proves the two catalogues agree — not that a key exists.
    for (const value of CANCELLATION_REASONS) {
      const key = `subscription.cancelReason.${value}`;
      expect(messages[key], `missing en-US: ${key}`).toBeTruthy();
      expect((esMessages as Record<string, string>)[key], `missing es-419: ${key}`).toBeTruthy();
    }
  });

  it('keeps the reason list identical to the backend choices', () => {
    // Mirrors Subscription.CANCELLATION_REASON_CHOICES. Drift costs telemetry silently: the
    // backend drops an unrecognised value rather than failing the cancellation.
    expect([...CANCELLATION_REASONS]).toEqual([
      'too_expensive',
      'missing_feature',
      'not_using',
      'switched',
      'seasonal',
      'certification_done',
      'too_hard',
      'other'
    ]);
  });
});

describe('CancelSubscriptionModal — keeping the plan', () => {
  it('offers a way out that is not cancelling', () => {
    const { onClose, onConfirm } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: messages['subscription.cancelKeepPlan'] }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('CancelSubscriptionModal — already over the Starter limits', () => {
  const OVER = [
    { metric: 'establishments', used: 5, limit: 1 },
    { metric: 'media_storage_gb', used: 42.1, limit: 10 }
  ];

  it('says nothing when the farm fits inside Starter', () => {
    renderModal();
    expect(screen.queryByText(messages['subscription.cancelOverLimitTitle'])).toBeNull();
  });

  it('names each limit with the real numbers', () => {
    renderModal({ exceeds: OVER });

    expect(screen.getByText(messages['subscription.cancelOverLimitTitle'])).toBeTruthy();
    expect(screen.getByText(/you have 5, Starter includes 1/)).toBeTruthy();
    expect(screen.getByText(/42\.1 GB, Starter includes 10 GB/)).toBeTruthy();
  });

  it('stops promising "10 GB of photo storage" to someone using 42 GB', () => {
    // The bullet is a factual statement of the Starter allowance, but beside a farm already
    // four times over it, it reads as a promise. The two panels must not contradict.
    renderModal({ exceeds: OVER });
    expect(screen.queryByText(messages['subscription.cancelKeepStorage'])).toBeNull();
  });

  it('keeps the storage bullet when storage is not the problem', () => {
    renderModal({ exceeds: [{ metric: 'establishments', used: 5, limit: 1 }] });
    expect(screen.getByText(messages['subscription.cancelKeepStorage'])).toBeTruthy();
  });

  it('says plainly that nothing is deleted', () => {
    renderModal({ exceeds: OVER });
    expect(messages['subscription.cancelOverLimitFooter']).toMatch(/nothing is deleted/i);
    expect(screen.getByText(messages['subscription.cancelOverLimitFooter'])).toBeTruthy();
  });

  it('still cancels in one click while over the limits', () => {
    // Warning content must never become a step or a blocker — see the ARL note in the module.
    const { onConfirm } = renderModal({ exceeds: OVER });
    expect(confirmButton().hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledWith({ reason: '', feedback: '' });
  });

  it('has copy for every metric the backend can emit, in BOTH locales', () => {
    // Mirrors SubscriptionSerializer.get_downgrade_preview. A metric with no message renders
    // the raw key into a cancellation screen.
    for (const metric of [
      'establishments',
      'media_storage_gb',
      'productions',
      'parcels_per_farm'
    ]) {
      const key = `subscription.cancelOver.${metric}`;
      expect(messages[key], `missing en-US: ${key}`).toBeTruthy();
      expect((esMessages as Record<string, string>)[key], `missing es-419: ${key}`).toBeTruthy();
    }
  });
});
