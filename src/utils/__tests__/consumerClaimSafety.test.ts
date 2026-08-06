/**
 * No unsubstantiable claims in consumer event copy.
 *
 * WHY: this page is one of Trazo's two outputs and it is read by shoppers, buyers, and — per
 * the GTM notes — an organic watchdog. Copy written to sound good is the fastest way to lose
 * all three. FTC 16 CFR 260.4 treats general environmental-benefit claims as essentially
 * unsubstantiable; 260.6 covers the rest. `.claude/rules/compliance.md` is the house version.
 *
 * The 2026-08-02 sweep found 24 across every event family, including an absolute "without
 * chemicals", a health claim ("supports healthy crop production"), and — the one that actually
 * rendered rather than being suppressed — a last-resort fallback promising an unknown event
 * "contributes to sustainable agriculture and food quality".
 *
 * The replacement pattern that passes: say what is ON RECORD and what it can be CHECKED
 * against. That is a fact about the documentation, which Trazo can stand behind, rather than a
 * benefit claim about farming, which it cannot.
 *
 * EXEMPT, deliberately: the eight per-family fallback sentences. ConsumerEventCard suppresses
 * them via `isGenericCopy` so no shopper sees them, and consumerFallbackCopy.test.ts pins that
 * suppression. They are listed by derivation, not by hand, so a new fallback cannot sneak in.
 */
import { describe, expect, it } from 'vitest';
import { enumerateConsumerCopy, suppressedFallbackSentences } from './consumerCopyMatrix';

const CLAIM_PATTERNS: Array<[string, RegExp]> = [
  // FTC 16 CFR 260.4 — general environmental benefit.
  ['general environmental benefit', /environmental impact|environmentally friendly|eco-friendly/i],
  // Absolutes about composition are rarely true and never provable from one record.
  [
    'absolute composition claim',
    /\bchemical-free\b|without (synthetic )?chemicals|\btoxin-free\b|residue-free/i
  ],
  // Health claims need evidence Trazo does not have.
  ['health claim', /health(ier|y) (food|produce|crop)|nutritious|safer for you|better for your/i],
  // Self-applied sustainability labels — EU ECGT 2024/825.
  ['self-applied sustainability label', /\bsustainab\w+\b|\bregenerativ\w+\b/i],
  ['carbon claim', /carbon neutral|zero emissions|climate[- ]friendly/i],
  ['superiority claim', /\bsuperior\b|\bhighest quality\b|\bpurest\b|industry best practices/i],
  ['implied third-party verification', /\bverified\b|\bcertified by\b|\bguarantee/i]
];

const SUPPRESSED = suppressedFallbackSentences();

describe('consumer copy carries no unsubstantiable claims', () => {
  const findings: string[] = [];
  let sentences = 0;

  for (const { key, info } of enumerateConsumerCopy()) {
    for (const field of ['shortDescription', 'consumerImpact', 'sustainabilityBenefit'] as const) {
      const text = info?.[field];
      if (!text || SUPPRESSED.has(text)) continue;
      sentences++;
      for (const [label, pattern] of CLAIM_PATTERNS) {
        if (pattern.test(text)) {
          findings.push(`  • [${label}] ${key}/${field}\n      ${text}`);
        }
      }
    }
  }

  it('sweeps a meaningful number of sentences (guards the harness)', () => {
    expect(sentences).toBeGreaterThan(100);
  });

  it('has none', () => {
    const uniq = [...new Set(findings)];
    expect(uniq, `\n${uniq.join('\n')}\n`).toEqual([]);
  });
});
