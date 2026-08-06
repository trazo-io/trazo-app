/**
 * Flags content in a farmer's free-text notes that will be PUBLIC once the event is saved.
 *
 * WHY THIS EXISTS
 * Trazo strips worker-safety, commercial and regulatory fields from the consumer payload
 * rigorously — REI, PHI, applicator name, EPA registration, supplier, invoice, buyer, cost are
 * all blocked as structured fields, top-level and nested, with regression tests. The 2026-07-31
 * consumer review then found every one of those protections walking out through the narrative,
 * because `description` / `observation` are published verbatim and rendered as
 * "Farmer's Field Notes". Live examples from real records:
 *
 *   "…REI 48 hours posted. Buffer zone maintained 30m from Reche Creek."
 *   "Zero non-conformances… reducing pesticide use by 60%… Score: 98.5%."
 *   "Equipment was borrowed by Rodriguez Ranch (conventional) last week…"
 *
 * WHY A WARNING AND NOT A SCRUBBER
 * These are the farmer's own words about their own farm, and the notes are the most human part
 * of the page. Auto-redaction would mangle prose, cannot reliably recognise "Rodriguez Ranch"
 * as a third party, and would silently alter a record the grower believes they wrote. Silently
 * WITHHOLDING the note is worse: the farmer would never learn why their best writing vanished.
 * So this module only ever *informs* — the grower decides. Nothing here edits, truncates or
 * blocks anything.
 *
 * PRECISION OVER RECALL
 * A warning that cries wolf gets dismissed, and then it protects nobody. Every pattern below
 * requires a strong contextual anchor rather than a bare number or keyword: "60%" alone is
 * fine, "reducing pesticide use by 60%" is a quantified benefit claim. This will miss things
 * (a third-party farm name cannot be pattern-matched), which is why the UI also carries a
 * short standing reminder that notes are public.
 */

export type NoteFindingCategory =
  | 'worker_safety'
  | 'self_graded_score'
  | 'benefit_claim'
  | 'commercial'
  | 'regulatory_id'
  | 'third_party';

export interface NoteFinding {
  category: NoteFindingCategory;
  /** The exact text that matched, so the UI can show the grower what it means. */
  match: string;
  /** i18n key explaining why this is worth a second look. */
  reasonKey: string;
}

interface Rule {
  category: NoteFindingCategory;
  reasonKey: string;
  pattern: RegExp;
}

const RULES: readonly Rule[] = [
  {
    // "REI 48 hours", "re-entry interval 48h", "PHI 14 days", "pre-harvest interval"
    category: 'worker_safety',
    reasonKey: 'events.noteScan.reason.workerSafety',
    pattern:
      /\b(re-?entry\s+interval|pre-?harvest\s+interval|\bREI\b|\bPHI\b)\b[^.\n]{0,30}?\d|\b\d+\s*(hours?|hrs?|days?)\b[^.\n]{0,20}\b(re-?entry|reentry|restricted)\b/gi
  },
  {
    // "Score: 98.5%", "scored 92/100", "audit score 98"
    category: 'self_graded_score',
    reasonKey: 'events.noteScan.reason.score',
    pattern: /\b(score[ds]?|rating|grade)\b\s*[:=]?\s*\d+(\.\d+)?\s*(%|\/\s*100)?/gi
  },
  {
    // "reducing pesticide use by 60%", "cut water use 30%", "improved yield by 15%"
    category: 'benefit_claim',
    reasonKey: 'events.noteScan.reason.benefitClaim',
    pattern:
      /\b(reduc\w*|cut|lower\w*|decreas\w*|improv\w*|increas\w*|saved?|sav\w*)\b[^.\n]{0,40}?\b\d+(\.\d+)?\s*%/gi
  },
  {
    // "$3,150", "invoice INV-2026-0142", "cost per acre", "PO 4471"
    category: 'commercial',
    reasonKey: 'events.noteScan.reason.commercial',
    pattern:
      /\$\s?\d[\d,]*(\.\d+)?|\b(invoice|purchase\s+order|\bPO\b|bill\s+of\s+lading)\b[^.\n]{0,20}?[\w-]*\d|\bINV-[\w-]*\d/gi
  },
  {
    // "EPA Reg. 62719-621", "DPR permit 57-2026", "QAL 128844", "CA QAL-4287"
    // The separator class MUST allow "." — the common abbreviation is "Reg." and an earlier
    // version used [^.\n], which excluded the very character that always appears there.
    category: 'regulatory_id',
    reasonKey: 'events.noteScan.reason.regulatoryId',
    pattern:
      /\b(EPA\s*reg\w*|EPA\s*registration|DPR|permit|QAL|PCA)\b[\s.:#-]{0,6}[A-Z0-9][\w-]*\d/gi
  },
  {
    // "borrowed by Rodriguez Ranch", "shared with Valley Farms" — a named neighbouring
    // operation. Deliberately narrow: an org suffix immediately preceded by a capitalised
    // word, near a sharing/lending verb.
    category: 'third_party',
    reasonKey: 'events.noteScan.reason.thirdParty',
    pattern:
      /\b(borrow\w*|lent|loaned|shared|rented|hired)\b[^.\n]{0,30}?\b[A-Z][\w'-]+\s+(Ranch|Farms?|Orchards?|Vineyards?|Dairy|Ranches|Co\.|Inc\.|LLC)\b/g
  }
];

/**
 * Scan a farmer's note for content that will be public and may be worth a second look.
 * Pure and side-effect free — it never modifies the input.
 *
 * @returns findings, de-duplicated by (category, matched text). Empty array = nothing flagged,
 *          which is NOT a guarantee the note is free of sensitive content (see PRECISION note).
 */
export function scanNoteForSensitiveContent(text: unknown): NoteFinding[] {
  if (typeof text !== 'string' || !text.trim()) return [];

  const seen = new Set<string>();
  const findings: NoteFinding[] = [];

  for (const rule of RULES) {
    // Fresh regex per call: /g patterns carry lastIndex between uses.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const match = m[0].trim();
      if (!match) {
        re.lastIndex += 1; // guard against a zero-length match spinning forever
        continue;
      }
      const key = `${rule.category}::${match.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ category: rule.category, match, reasonKey: rule.reasonKey });
    }
  }

  return findings;
}

/** Convenience: scan an event's two free-text fields together. */
export function scanEventNotes(event: {
  description?: unknown;
  observation?: unknown;
}): NoteFinding[] {
  const all = [
    ...scanNoteForSensitiveContent(event?.description),
    ...scanNoteForSensitiveContent(event?.observation)
  ];
  const seen = new Set<string>();
  return all.filter((f) => {
    const key = `${f.category}::${f.match.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
