/**
 * The block a farmer NAMED in a voice note — word for word, never inferred.
 *
 * Voice may only fill `block_id` from the parcel's own vocabulary (`known_block_ids`), and only
 * when the name was said out loud (voiceDataMapper, `wasSpoken`). That rule exists because the
 * value becomes CA PUR box 22 and the lot a certifier traces: MEASURED 2026-09-01, "the NORTH
 * RIDGE block" came back from the model as the parcel's only block, "Ridge Block".
 *
 * It left two real gaps, both found in production on 2026-09-11:
 *   - a block used for the FIRST time can never come from voice — "aplicamos azufre en el bloque
 *     4" on a parcel with no block 4 filled product, method and rate, and silently left the block;
 *   - the same block said in the other language never matches — "bloque 4" is not the words
 *     "Block 4", so a Spanish-speaking crew could not reach the grower's own block by voice.
 *
 * This module closes both WITHOUT letting a model near the value. The block is pulled out of the
 * transcript by pattern ("block 4", "bloque 4", "north block", "bloque norte", "block C"), so it
 * can only be something the farmer said, and it is only ever OFFERED: the wizard shows it as a
 * button the farmer taps (NewEvent, `blockSuggestion`). Nothing here writes to a form.
 */

/** Direction words, in both languages, to one canonical spelling — "bloque norte" is "North Block". */
const DIRECTIONS: Readonly<Record<string, string>> = {
  north: 'north',
  south: 'south',
  east: 'east',
  west: 'west',
  northeast: 'northeast',
  northwest: 'northwest',
  southeast: 'southeast',
  southwest: 'southwest',
  norte: 'north',
  sur: 'south',
  este: 'east',
  oriente: 'east',
  oeste: 'west',
  poniente: 'west',
  noreste: 'northeast',
  noroeste: 'northwest',
  sureste: 'southeast',
  suroeste: 'southwest'
};

/** Words that only say "this is a block", never which one. */
const BLOCK_WORDS = new Set(['block', 'blk', 'bloque', 'the', 'el', 'del', 'de']);

export interface SpokenBlock {
  /** The block as the farmer said it, ready for the Block / Section field ("Block 4", "Bloque norte"). */
  label: string;
  /** What identifies it, comparable across languages and spellings ("4", "c", "north"). */
  key: string;
}

// An identifier after the block word: a number ("4", "12", "12B", "B3") or ONE letter.
const ID = String.raw`((?:[A-Za-z]?\d{1,3}[A-Za-z]?)|[A-Z])(?![\w-])`;

// Lone letters that are also WORDS — "bloque a las ocho", "bloque y el riego", "block a day".
// Written in lower case they are the word; only a capital makes them a block letter. Every other
// letter is a block letter in either case: MEASURED 2026-09-11, Deepgram's Spanish model writes
// "bloque C" as "bloque c", and refusing all lower-case letters lost the grower's Block C.
const WORD_LETTERS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
const NUMBER_WORD = String.raw`(?:number\s+|no\.?\s*|n[uú]mero\s+|#\s*)?`;

// "este" after "bloque" is east — unless a time follows it ("el bloque este martes").
const NOT_TIME = String.raw`(?!\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|mes|a[nñ]o|semana|fin|d[ií]a))`;

const PATTERNS: ReadonlyArray<{ re: RegExp; build: (m: RegExpExecArray) => SpokenBlock | null }> = [
  {
    // "block 4", "block number 12", "block C"
    re: new RegExp(String.raw`\bblock\s+${NUMBER_WORD}${ID}`, 'gi'),
    build: (m) => idBlock('Block', m[1])
  },
  {
    // "bloque 4", "bloque número 12", "bloque C"
    re: new RegExp(String.raw`\bbloque\s+${NUMBER_WORD}${ID}`, 'gi'),
    build: (m) => idBlock('Bloque', m[1])
  },
  {
    // "north block", "the south-west block", "north east block" — a compound direction is tried
    // FIRST, or "south-west" would match as "west".
    re: /\b((?:north|south)(?:[\s-]?(?:east|west))?|east|west)[\s-]*block\b/gi,
    build: (m) => {
      const direction = m[1].toLowerCase().replace(/[\s-]/g, '');
      return { label: `${capitalize(direction)} Block`, key: DIRECTIONS[direction] };
    }
  },
  {
    // "bloque norte", "bloque del sur", "bloque este" (east)
    re: new RegExp(
      String.raw`\bbloque\s+(?:del\s+)?(norte|sur|este|oeste|oriente|poniente|noreste|noroeste|sureste|suroeste)\b${NOT_TIME}`,
      'gi'
    ),
    build: (m) => ({ label: `Bloque ${m[1].toLowerCase()}`, key: DIRECTIONS[m[1].toLowerCase()] })
  }
];

function idBlock(word: 'Block' | 'Bloque', id: string): SpokenBlock | null {
  // The case check the regex cannot do under the `i` flag: a word-letter counts only as a capital.
  if (WORD_LETTERS.has(id)) return null;
  return { label: `${word} ${id.toUpperCase()}`, key: id.toLowerCase() };
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * The one block the transcript names, or null.
 *
 * Null when none is named — and when TWO different blocks are ("block 3 and block 4"): which of
 * them this record is about is the farmer's call, not a pattern's.
 */
export function spokenBlock(transcript: string | null | undefined): SpokenBlock | null {
  const text = transcript || '';
  const found = new Map<string, SpokenBlock>();
  for (const { re, build } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const block = build(m);
      if (block && !found.has(block.key)) found.set(block.key, block);
    }
  }
  return found.size === 1 ? [...found.values()][0] : null;
}

/**
 * What identifies a block the grower already wrote: its FIRST identifying word, with the block
 * word itself and direction spellings normalised. "Block 4" → "4", "Bloque Norte" → "north",
 * "Block C - East Section" → "c", "BGA" → "bga".
 */
export function blockIdentityKey(blockId: string): string {
  const tokens = (blockId || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token && !BLOCK_WORDS.has(token));
  if (tokens.length === 0) return '';
  return DIRECTIONS[tokens[0]] ?? tokens[0];
}

export type VoiceBlockSuggestion =
  /** The farmer named a block this parcel already has, in other words ("bloque 4" → "Block 4"). */
  | { kind: 'known'; value: string; spoken: string }
  /** The farmer named a block this parcel has never recorded. */
  | { kind: 'new'; value: string };

/**
 * The block to OFFER after a voice note, or null.
 *
 * An existing block wins whenever exactly one of the parcel's blocks has the same identity —
 * the grower's own spelling, not a second way of writing the same block ("Block 3" in March,
 * "Bloque 3" in July is how a certifier's trace-back comes back half empty). Two candidates with
 * the same identity ("Block 4 East", "Block 4 West") are ambiguous and suggest nothing.
 */
export function voiceBlockSuggestion(
  transcript: string | null | undefined,
  knownBlockIds: readonly string[]
): VoiceBlockSuggestion | null {
  const spoken = spokenBlock(transcript);
  if (!spoken) return null;
  const matches = knownBlockIds.filter((id) => blockIdentityKey(id) === spoken.key);
  if (matches.length === 1) return { kind: 'known', value: matches[0], spoken: spoken.label };
  if (matches.length > 1) return null;
  return { kind: 'new', value: spoken.label };
}
