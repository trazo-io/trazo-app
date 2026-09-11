/**
 * ORPHANED-FEATURE guard for voice logging.
 *
 * Voice is claimed on six landing surfaces, in the one-pager pricing table
 * ("Voice logging from the field — Included", every tier) and in the education FAQ,
 * and `voice_recording: True` sits on all six plans in `create_plans`. For a stretch
 * it was also rendered NOWHERE — `VoiceEventCapture` existed, its hook existed, four
 * backend endpoints existed, and no component mounted it. `VIDEO-SHOT-LIST-2026-09.md`
 * pulled voice from the demo narration for exactly that reason.
 *
 * A grep for the symbol does not catch this: an unused `import` satisfies it while the
 * feature stays unreachable. So assert the JSX TAG and the prop that carries the result
 * back — the two things that have to be true for a farmer to reach it.
 *
 * Same class as `ccof-grower-checklist-alignment`: model + serializer + PDF shipped with
 * no route. Grep USAGE, not definition.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const NEW_EVENT = join(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx');

describe('voice capture is reachable from the activity wizard', () => {
  const src = readFileSync(NEW_EVENT, 'utf8');

  it('renders <VoiceEventCapture>, not merely imports it', () => {
    expect(src).toMatch(/<VoiceEventCapture[\s>]/);
  });

  it('wires the detection result back into the form', () => {
    expect(src).toMatch(/onEventDetected=\{handleVoiceEventDetected\}/);
  });

  it('has a control that opens it', () => {
    expect(src).toMatch(/events\.voice\.fillByVoice/);
    expect(src).toMatch(/setShowVoiceCapture\(true\)/);
  });

  it('holds values back when the subtype is not known yet, pinned to its event type', () => {
    // Without the hold, soil/pest/business lose any subtype-gated value spoken before the
    // in-tab subtype select is answered. Without the event-type pin, a held soil utterance
    // re-applies itself onto whatever activity the farmer switches to next.
    expect(src).toMatch(/pendingVoiceRef/);
    expect(src).toMatch(/pending\.eventType !== activeEventType/);
  });

  it('gives the farmer a way out of the recorder', () => {
    // `onClose` was declared as a prop, passed by NewEvent, and called by nothing. The panel
    // auto-starts the microphone (autoStart), so opening "Fill by voice" by mistake meant a
    // live mic and no way back to the form short of leaving the page.
    const capture = readFileSync(
      join(__dirname, '../../components/Events/VoiceEventCapture.tsx'),
      'utf8'
    );
    expect(capture, 'onClose is declared but never invoked').toMatch(/onClose\(\)/);
    expect(capture).toMatch(/voice\.close/);
    // and it must stop the microphone before unmounting itself
    expect(capture).toMatch(/if \(listening\) stopListening\(\);/);
  });

  it('caps how long ONE recording can stream', () => {
    // The cost tail is a session with no end, not a busy day. `UtteranceEnd` only fires on
    // a gap in speech, and silence is the assumption that fails on a farm — a tractor idling
    // or wind in the mic can keep endpointing from ever triggering, and the 8s KeepAlive
    // holds the socket open while MediaRecorder keeps pushing audio. Without this cap the
    // daily session ceiling bounded nothing in minutes.
    const hook = readFileSync(join(__dirname, '../../hooks/useDeepgramTranscription.ts'), 'utf8');
    expect(hook).toMatch(/export const MAX_SESSION_MS/);
    expect(hook, 'the cap is declared but never armed').toMatch(
      /maxDurationRef\.current = setTimeout\(/
    );
    expect(hook, 'the cap must end the stream the normal way, keeping the transcript').toMatch(
      /setStoppedAtLimit\(true\);\s*stopListening\(\);/
    );
    // ...and it must be cleared, or a finished session leaves a timer that fires later
    expect(hook).toMatch(/clearTimeout\(maxDurationRef\.current\)/);
  });

  it('keeps the KeepAlive under the socket idle timeout', () => {
    // Deepgram closes a live socket after 10s without audio. An interval at or above that
    // races the server and drops sessions mid-sentence.
    const hook = readFileSync(join(__dirname, '../../hooks/useDeepgramTranscription.ts'), 'utf8');
    const interval = /\}, (\d+)\);\s*\n\s*\/\/ Hard stop/.exec(hook);
    expect(interval, 'could not find the keep-alive interval').toBeTruthy();
    expect(Number(interval![1])).toBeLessThan(10000);
  });

  it('releases the microphone if it unmounts mid-recording', () => {
    // cleanup() was only reachable via stopListening/onerror/onclose, so a component that
    // went away while listening left the MediaStream tracks live and the Deepgram socket
    // open — the browser keeps the recording indicator on and audio keeps being billed.
    const hook = readFileSync(join(__dirname, '../../hooks/useDeepgramTranscription.ts'), 'utf8');
    expect(hook, 'no unmount cleanup in useDeepgramTranscription').toMatch(
      /useEffect\(\(\) => cleanup, \[cleanup\]\)/
    );
  });

  it('routes every voice write through the render gate', () => {
    // The gate is the only thing standing between a mis-heard activity and a real
    // ProductionEvent column. A merge that skips it is the 2026-08-25 defect returning.
    expect(src).toMatch(/gateVoiceOverridesToForm/);
    expect(src).not.toMatch(/\.\.\.prev,\s*\.\.\.detected\b/);
  });
});
