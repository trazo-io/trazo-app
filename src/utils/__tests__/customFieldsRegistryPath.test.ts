/**
 * Phase 2 / C3 — a farmer's consumer-visible custom fields must survive the registry path.
 *
 * `mergeCustomFieldsIntoDisplay` only ran inside `getEventFieldDisplay()`, the LEGACY display
 * path. With `VITE_USE_FIELD_REGISTRY=true` — the default in every env file — ConsumerEventCard
 * returns the registry-resolved display as soon as it resolves at least one field, so custom
 * fields were dropped on exactly the events that had good registry coverage.
 *
 * The nasty part was the asymmetry: the producer preview goes through a path where they DO
 * appear, so a farmer could add a field, mark it consumer-visible, confirm it in the preview,
 * publish, and have it be absent from the public page with no error anywhere.
 */
import { describe, it, expect } from 'vitest';
import { mergeCustomFieldsIntoDisplay, type EventFieldDisplay } from '../fieldDisplayUtils';

const emptyDisplay = (): EventFieldDisplay => ({
  immediate: [{ label: 'Area Covered', value: '12 acres' }],
  secondary: [],
  details: []
});

describe('mergeCustomFieldsIntoDisplay', () => {
  it('is exported so the registry path can call it', () => {
    expect(typeof mergeCustomFieldsIntoDisplay).toBe('function');
  });

  it('appends a consumer-visible custom field', () => {
    const merged = mergeCustomFieldsIntoDisplay(emptyDisplay(), {
      custom_fields: [
        { label: 'Heirloom variety', value: 'Chandler', visibility: 'consumer', field_type: 'text' }
      ]
    });
    const values = [...merged.immediate, ...merged.secondary, ...merged.details].map(
      (f) => f.value
    );
    expect(values).toContain('Chandler');
  });

  it('reads custom fields from extra_data too (backend payload shape)', () => {
    const merged = mergeCustomFieldsIntoDisplay(emptyDisplay(), {
      extra_data: {
        custom_fields: [
          { label: 'Rootstock', value: 'Paradox', visibility: 'consumer', field_type: 'text' }
        ]
      }
    });
    const values = [...merged.immediate, ...merged.secondary, ...merged.details].map(
      (f) => f.value
    );
    expect(values).toContain('Paradox');
  });

  it('withholds fields the farmer did not mark consumer-visible', () => {
    const merged = mergeCustomFieldsIntoDisplay(emptyDisplay(), {
      custom_fields: [
        { label: 'Internal cost', value: '480', visibility: 'private', field_type: 'text' }
      ]
    });
    const values = [...merged.immediate, ...merged.secondary, ...merged.details].map(
      (f) => f.value
    );
    expect(values).not.toContain('480');
  });

  it('drops empty values instead of rendering a blank row', () => {
    const merged = mergeCustomFieldsIntoDisplay(emptyDisplay(), {
      custom_fields: [
        { label: 'Notes', value: '   ', visibility: 'consumer', field_type: 'text' },
        { label: 'Missing', value: null, visibility: 'consumer', field_type: 'text' }
      ]
    });
    const labels = [...merged.immediate, ...merged.secondary, ...merged.details].map(
      (f) => f.label
    );
    expect(labels).not.toContain('Notes');
    expect(labels).not.toContain('Missing');
  });

  it('preserves the fields that were already resolved', () => {
    const merged = mergeCustomFieldsIntoDisplay(emptyDisplay(), {
      custom_fields: [
        { label: 'Heirloom variety', value: 'Chandler', visibility: 'consumer', field_type: 'text' }
      ]
    });
    expect(merged.immediate.some((f) => f.value === '12 acres')).toBe(true);
  });

  it('returns the display untouched when there are no custom fields', () => {
    const base = emptyDisplay();
    expect(mergeCustomFieldsIntoDisplay(base, {})).toEqual(base);
    expect(mergeCustomFieldsIntoDisplay(base, { custom_fields: [] })).toEqual(base);
  });
});
