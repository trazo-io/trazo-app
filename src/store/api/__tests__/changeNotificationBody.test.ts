import { describe, expect, it } from 'vitest';
import { changeNotificationBody } from '../ospApi';

describe('changeNotificationBody', () => {
  it('stays JSON without a file', () => {
    const body = changeNotificationBody({
      change_category: 'acreage_field_addition',
      description: 'Added Block D.'
    });
    expect(body).toEqual({
      change_category: 'acreage_field_addition',
      description: 'Added Block D.'
    });
  });

  it('is multipart with a file, carrying every field and the file', () => {
    const map = new File(['%PDF'], 'map.pdf', { type: 'application/pdf' });
    const body = changeNotificationBody({
      change_category: 'field_removal',
      description: 'Block C removed.',
      removal_reason: 'Converted to conventional.',
      parcel: 105,
      supporting_document: map
    }) as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('removal_reason')).toBe('Converted to conventional.');
    expect(body.get('parcel')).toBe('105');
    expect((body.get('supporting_document') as File).name).toBe('map.pdf');
  });
});
