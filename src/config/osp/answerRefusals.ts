/**
 * What the server says when it refuses an answer, as lines a farmer can act on.
 *
 * The module write refuses an untrue statement per question: `{"answers": {"<key>": "<why>"}}` on a save,
 * `{"complete": "...", "attestations": {"<key>": "<why>"}}` on completion (backend
 * `certifications/services/attestation_gates.py`). `apiErrorMessage` reads flat field errors only and drops
 * a nested object, so every such refusal read "The save did not reach the server. Check your connection"
 * when the server had answered and said why (browser pass, 2026-11-09). Each line names the question by its
 * label, never its key.
 */
import type { ModuleDefinition } from './types';
import { pickText } from './types';

const flat = (value: unknown): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(flat).filter(Boolean).join(' ');
  if (typeof value === 'object') return '';
  return String(value).trim();
};

export const refusedAnswerLines = (
  payload: unknown,
  definition: ModuleDefinition | null | undefined,
  locale: string
): string[] => {
  if (!payload || typeof payload !== 'object') return [];
  const labels = new Map<string, string>();
  (definition?.pages ?? []).forEach((page) =>
    page.questions.forEach((q) => labels.set(q.key, pickText(q.label, locale)))
  );
  const lines: string[] = [];
  for (const field of ['answers', 'attestations']) {
    const byKey = (payload as Record<string, unknown>)[field];
    if (!byKey || typeof byKey !== 'object' || Array.isArray(byKey)) continue;
    Object.entries(byKey as Record<string, unknown>).forEach(([key, why]) => {
      const text = flat(why);
      if (text) lines.push(`${labels.get(key) || key}: ${text}`);
    });
  }
  return lines;
};
