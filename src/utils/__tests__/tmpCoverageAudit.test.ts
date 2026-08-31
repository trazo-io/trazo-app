import { describe, it } from 'vitest';
import { VOICE_TYPE_MAP, mapVoiceDataToFieldValues, gateVoiceOverridesToForm } from '../voiceDataMapper';
import type { ParsedVoiceData } from '../voiceDataMapper';
import { getFieldNamesForSurface } from '../../config/events';

// A maximally generous parsed payload: every field the response schema can carry, filled.
const RICH: ParsedVoiceData = {
  type: 'x', description: 'd', confidence: 95,
  detected_amounts: [
    { value: 200, unit: 'lb', category: 'weight' },
    { value: 6, unit: 'hours', category: 'time' },
    { value: 12, unit: 'acres', category: 'area' },
    { value: 15, unit: 'gal', category: 'volume' }
  ] as any,
  detected_products: ['Kocide 3000'],
  detected_systems: ['drip irrigation'],
  npk_ratio: '10-10-10', concentration: '50%', commercial_name: 'Kocide 3000',
  application_method: 'broadcast', water_source: 'well',
  area_covered: { value: 12, unit: 'acres' } as any,
  duration: { value: 6, unit: 'hours' } as any,
  fuel_amount: { value: 15, unit: 'gal' } as any,
  original_transcript: 'spoken words'
} as any;

describe('AUDIT', () => {
  it('coverage per activity', () => {
    const rows: string[] = [];
    for (const [slug, m] of Object.entries(VOICE_TYPE_MAP)) {
      const formFields = getFieldNamesForSurface(m.backendEventType as any, (m.backendSubtype || undefined) as any, 'form') || [];
      const mapped = mapVoiceDataToFieldValues({ ...RICH, type: slug } as any, m.templateId);
      const detected: Record<string, unknown> = {};
      mapped.overriddenFields.forEach((k) => (detected[k] = mapped.values[k]));
      const { kept } = gateVoiceOverridesToForm(detected, m.backendEventType, m.backendSubtype || undefined);
      const keptKeys = Object.keys(kept);
      const missed = formFields.filter((f) => !keptKeys.includes(f));
      rows.push(
        `${slug.padEnd(18)} form=${String(formFields.length).padStart(2)} voice=${String(keptKeys.length).padStart(2)} [${keptKeys.join(',')}]`
      );
      rows.push(`  MISSED(${missed.length}): ${missed.join(', ')}`);
    }
    console.log('\n' + rows.join('\n'));
  });
});
