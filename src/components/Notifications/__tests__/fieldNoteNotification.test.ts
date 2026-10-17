/**
 * A crew note is not a system fault, and the bell has to say where it goes.
 *
 * Both halves were wrong in production on 2026-10-17, on the first real WhatsApp message a crew
 * number ever sent to Trazo. The note itself arrived correctly; what a supervisor saw was a gray
 * disc with a WARNING TRIANGLE, and clicking it did nothing at all.
 *
 * ONE CAUSE, TWO SYMPTOMS. `arrival.py` sends the notification as `system_alert`, because that is
 * the only transport `NotificationType` offers, and puts the real subject in
 * `extra_data.kind = 'field_note'`. This file keyed the icon, the colour and the destination off
 * `type` alone, so a note inherited the warning mark and fell through to the farm-scoped branch,
 * which returns null for a note that carries no farm. The backend says in writing that a note
 * legitimately arrives with no establishment, so that null is the ordinary case, not an edge.
 */
import { describe, expect, it } from 'vitest';

import { FaCommentDots } from 'react-icons/fa';
import { MdWarning } from 'react-icons/md';

import {
  getNotificationColor,
  getNotificationIcon,
  getNotificationPath
} from '../NotificationDropdown';

const fieldNote = (extra: Record<string, any> = {}) =>
  ({
    id: 1,
    title: 'New field note',
    message: 'Oscar sent a message.',
    type: 'system_alert' as const,
    priority: 'medium' as const,
    read: false,
    created_at: '2026-10-17T15:10:12Z',
    extra_data: { kind: 'field_note', note: 'abc', status: 'pending', ...extra }
  } as any);

describe('a field note in the notification bell', () => {
  it('carries the Field Notes mark, not a warning triangle', () => {
    expect(getNotificationIcon(fieldNote())).toBe(FaCommentDots);
  });

  it('is coloured as an arrival, not as a low-priority fault', () => {
    // gray.600 is what `system_alert` at default priority paints. An arriving crew message is
    // the ordinary case. green.700 measures 5.13:1 under the white glyph (WCAG 1.4.11 wants 3).
    expect(getNotificationColor(fieldNote(), 'medium')).toBe('green.700');
  });

  it('opens the inbox even when the note carries no farm', () => {
    // THE REGRESSION ITSELF. No `establishment_id`, which is a state the server produces on
    // purpose, and the old code returned null here, so the click did nothing.
    expect(getNotificationPath(fieldNote())).toBe('/admin/dashboard/field-notes');
  });

  it('opens the inbox, not a farm page, when the note does carry a farm', () => {
    // The inbox is company-scoped and its URL has no farm segment. Routing by farm would land on
    // the commercial dashboard, which is not where the note is waiting.
    expect(getNotificationPath(fieldNote({ establishment_id: 7 }))).toBe(
      '/admin/dashboard/field-notes'
    );
  });

  it('keeps the warning on a note that could not be read', () => {
    // A REFUSED note IS a fault, and it is the half a supervisor most needs to see: the sender
    // cannot discover it for themselves.
    const refused = fieldNote({ status: 'refused' });
    expect(getNotificationIcon(refused)).toBe(MdWarning);
    expect(getNotificationColor(refused, 'medium')).toBe('amber.900');
  });
});

describe('the notification types that were already working', () => {
  const plain = (type: string, extra: Record<string, any> = {}) =>
    ({ type, extra_data: extra } as any);

  it('still sends an export to the documents shelf', () => {
    expect(
      getNotificationPath(plain('system_alert', { kind: 'export_ready', establishment_id: 7 }))
    ).toBe('/admin/dashboard/farm/7/documents');
  });

  it('still sends a scan to the commercial dashboard, with its query', () => {
    expect(getNotificationPath(plain('product_scan', { establishment_id: 7, product_id: 3 }))).toBe(
      '/admin/dashboard/farm/7/commercial?productId=3'
    );
  });

  it('still warns on a real system alert', () => {
    expect(getNotificationIcon(plain('system_alert'))).toBe(MdWarning);
    expect(getNotificationColor(plain('system_alert'), 'urgent')).toBe('red.700');
  });

  it('still returns nothing for a notification with no farm and no kind', () => {
    expect(getNotificationPath(plain('product_review'))).toBeNull();
  });
});
