/**
 * Run 8 (R8-24): the voice start button was disabled with no explanation (only a blocked
 * microphone had one), and the examples were fertilizer and tractor lines on a harvest form.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const src = readFileSync(resolve(process.cwd(), 'src/components/Events/VoiceEventCapture.tsx'), 'utf8');

describe('the voice panel says why it cannot start', () => {
  const KEYS = ['voice.disabled.loading', 'voice.disabled.processing', 'voice.disabled.inactive'];

  it('names a reason for each disabled cause and renders it', () => {
    for (const key of KEYS) expect(src).toContain(`'${key}'`);
    expect(src).toMatch(/disabledReasonId && \(/);
  });

  it.each([
    ['en-US', enUS],
    ['es-419', es419]
  ])('%s carries every reason and the harvest examples', (_l, cat) => {
    const c = cat as Record<string, string>;
    for (const key of [...KEYS, 'voice.example.harvest', 'voice.example.harvestMethod']) {
      expect(c[key], key).toBeTruthy();
    }
  });

  it('shows harvest examples on a harvest', () => {
    expect(src).toMatch(/isHarvest\s*\?\s*\['voice\.example\.harvest'/);
  });
});

describe('review of app #80', () => {
  it('the reason line yields to the processing panel instead of repeating it', () => {
    const block = src.slice(src.indexOf('disabledReasonId && (') - 160, src.indexOf('disabledReasonId && ('));
    expect(block).toMatch(/!isProcessing &&\s+!isProcessingVoice/);
  });
});
