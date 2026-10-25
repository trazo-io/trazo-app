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
    const start = voice.slice(
      voice.indexOf('const startListening = async'),
      voice.indexOf('const stopListening')
    );
    expect(start).toMatch(/navigator\.onLine === false[\s\S]{0,80}return;/);
    for (const c of cats) expect(c['voice.disabled.offline']).toBeTruthy();
  });

  it('a save with no connection names the connection and keeps the entries', () => {
    const wizard = src('views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
    expect(wizard).toMatch(/FETCH_ERROR[\s\S]{0,500}app\.errorSavingOffline/);
    expect(enUS['app.errorSavingOffline' as keyof typeof enUS]).toMatch(/No connection/);
    expect(es419['app.errorSavingOffline' as keyof typeof es419]).toMatch(/Sin conexión/);
    for (const c of cats)
      expect(c['app.errorSavingOffline']).not.toMatch(/nothing was lost|no se perdió nada/i);
  });

  it('an edit, repeat or crew-note save offline promises no draft, because none is kept there', () => {
    // Review of app #88: useEventDraft is disabled in edit and repeat flows, and (2026-10-25) on a
    // crew note. ONE flag decides both what is kept and what the offline message promises.
    const wizard = src('views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
    expect(wizard).toMatch(/const draftKept = !isEdit && !isRepeat && !fieldNoteIdFromUrl;/);
    expect(wizard).toMatch(/enabled: draftKept\b/);
    expect(wizard).toMatch(
      /draftKept \? 'app\.errorSavingOffline' : 'app\.errorSavingOfflineNoDraft'/
    );
    for (const c of cats) {
      expect(c['app.errorSavingOfflineNoDraft']).toBeTruthy();
      expect(c['app.errorSavingOfflineNoDraft']).not.toMatch(
        /kept as a draft on|queda como borrador/i
      );
    }
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

/**
 * Review of app #88: a source match cannot prove the chip RENDERS gray (Chakra once ignored
 * Badge colorScheme in this theme). jsdom computes no emotion styles, so resolve the theme's
 * own variant for the props the chip passes, the way theme/__tests__/badgeVariants does.
 * (Checked live at 375px on 2026-10-06: the chip computes rgb(224, 224, 224).)
 */
describe('the reused-product chip resolves to a neutral colour', () => {
  it('the default variant with colorScheme gray is not the brand green', async () => {
    const { badgeStyles } = await import('../../../theme/components/badge');
    const Badge = (badgeStyles as any).components.Badge;
    const variant = Badge.variants[Badge.defaultProps.variant];
    const style = (colorScheme: string) =>
      typeof variant === 'function' ? variant({ colorMode: 'light', colorScheme }) : variant;
    const gray = JSON.stringify(style('gray'));
    expect(gray).toMatch(/gray/);
    expect(gray).not.toMatch(/green/);
    expect(gray).not.toBe(JSON.stringify(style('green')));
  });
});
