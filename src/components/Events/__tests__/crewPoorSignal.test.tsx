/**
 * Manual 375px Spanish pass of the crew flows (2026-10-06), poor signal:
 *  - voice with no connection: the start button looked ready and pressing it did nothing;
 *  - saving with no connection: "Failed to create event", with no word about the connection or
 *    that the entries were still there;
 *  - "Mis productos" chips said "Organic-approved" for the grower's own earlier answer.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const src = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');
const cats = [enUS, es419] as Record<string, string>[];

describe('crew flows under poor signal', () => {
  it('voice says it needs a connection and does not offer a dead button', () => {
    const voice = src('components/Events/VoiceEventCapture.tsx');
    expect(voice).toMatch(/isOffline\s*\n?\s*\?\s*'voice\.disabled\.offline'/);
    expect(voice).toMatch(/\(isOffline && !listening\)/);
    expect(voice).toMatch(/addEventListener\('offline'/);
    // autoStart opened the panel already listening while offline (re-check after the fix).
    const start = voice.slice(voice.indexOf('const startListening = async'), voice.indexOf('const stopListening'));
    expect(start).toMatch(/navigator\.onLine === false[\s\S]{0,80}return;/);
    for (const c of cats) expect(c['voice.disabled.offline']).toBeTruthy();
  });

  it('a save with no connection names the connection and keeps the entries', () => {
    const wizard = src('views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
    expect(wizard).toMatch(/FETCH_ERROR[\s\S]{0,200}app\.errorSavingOffline/);
    expect(enUS['app.errorSavingOffline' as keyof typeof enUS]).toMatch(/No connection/);
    expect(es419['app.errorSavingOffline' as keyof typeof es419]).toMatch(/Sin conexión/);
    for (const c of cats)
      expect(c['app.errorSavingOffline']).not.toMatch(/nothing was lost|no se perdió nada/i);
  });

  it('the reused-product chip states a recorded basis, not an approval, in a neutral colour', () => {
    for (const c of cats)
      expect(c['chemical.recentInputs.organicBadge']).not.toMatch(/approved|aprobad/i);
    const tab = src('views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx');
    const at = tab.indexOf("'chemical.recentInputs.organicBadge'");
    expect(at).toBeGreaterThan(-1);
    expect(tab.slice(tab.lastIndexOf('<Badge', at), at)).toMatch(/colorScheme="gray"/);
  });
});
