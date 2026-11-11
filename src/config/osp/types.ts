/**
 * Guided OSP module types — the serialized registry contract (WS-2.4).
 *
 * These mirror `trazo-back/certifications/osp_modules/schema.py` serialization exactly.
 * Question CONTENT always comes from the API (`module-definitions`) — this file carries
 * only the types, the condition evaluator, and UI helpers. Do not hardcode module text
 * here; the backend is the single source of truth (see the schema.py docstring).
 */

export type TextMap = { en: string; es: string };

export type ConditionOp =
  | 'eq'
  | 'ne'
  | 'includes'
  | 'one_of'
  | 'includes_any'
  | 'not_includes'
  | 'truthy'
  | 'falsy';

export interface ModuleCondition {
  question: string;
  op: ConditionOp;
  value?: unknown;
}

export type QuestionKind =
  | 'radio'
  | 'checkbox_group'
  | 'boolean'
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'info'
  | 'upload';

export interface ModuleOption {
  value: string;
  label: TextMap;
  exclusive: boolean;
  /**
   * Replaced by another option. Kept so an answer given with it still reads as given, never offered
   * for a new answer, and an answer made only of retired options counts as unanswered (the
   * replacement asks something the old option never did). Present only when true.
   */
  retired?: boolean;
}

export interface ModuleQuestion {
  key: string;
  kind: QuestionKind;
  label: TextMap;
  coaching: TextMap | null;
  options: ModuleOption[];
  required: boolean;
  visible_when: ModuleCondition[];
  nop_cite: string | null;
  prefill: { source: string } | null;
  parcel_field: string | null;
  embed: string | null;
  placeholder: TextMap | null;
  max_length: number | null;
  /**
   * Replaced by questions that ask more (backend `Question.retired`): shown only while it still
   * holds an answer, never asked anew. Absent on every question never retired.
   */
  retired?: boolean;
}

export interface ModulePage {
  key: string;
  title: TextMap | null;
  education: TextMap[];
  visible_when: ModuleCondition[];
  /**
   * At least one must pass, on top of `visible_when` (backend `ModulePage.visible_when_any`, 2026.11.25):
   * G3.0 page B opens on non-organic seed OR non-organic planting stock. Absent where there is no OR gate.
   */
  visible_when_any?: ModuleCondition[];
  questions: ModuleQuestion[];
}

export interface ModuleDefinition {
  key: string;
  code: string;
  title: TextMap;
  nop_cites: string[];
  education: TextMap[];
  allows_not_applicable: boolean;
  na_label: TextMap | null;
  default_section_key: string;
  repeat_per_parcel: boolean;
  pages: ModulePage[];
}

export interface ModuleRegistryResponse {
  content_version: string;
  modules: ModuleDefinition[];
}

/** Stored answer envelope — bare values are also accepted by the evaluator. */
export type AnswerValue = string | number | boolean | string[] | null;
export type AnswerEnvelope = { value: AnswerValue; at?: string };
export type ModuleAnswers = Record<string, AnswerEnvelope | AnswerValue>;

export type ModuleStatus = 'not_started' | 'in_progress' | 'completed' | 'not_applicable';

export interface ModuleProgressRow {
  key: string;
  code: string;
  status: ModuleStatus;
  not_applicable: boolean;
  na_attestation: { by: number | null; at: string } | null;
  completed_at: string | null;
  completed_by: number | null;
  definition_version: string | null;
  progress: { answered: number; required: number; missing: string[] };
  /**
   * Blank questions that are showing, not required by Trazo, and asked by the plan's own agent.
   * A soft flag; completion never waits on it. Empty for an agent with no register here.
   */
  agent_asks_blank?: string[];
  /**
   * Attestations answered Yes over a list that cannot carry them (empty, or missing what the
   * records show). The server holds such a module in_progress; the row says why.
   */
  blocked_attestations?: string[];
}

export interface ModuleListResponse {
  modules: ModuleProgressRow[];
  /** The agent `agent_asks_blank` speaks for ("WSDA"); null when Trazo holds no register for it. */
  agent?: string | null;
}

export interface ModuleDetailResponse {
  definition: ModuleDefinition;
  content_version: string;
  response: ModuleProgressRow;
  answers: ModuleAnswers;
  suggestions: Record<string, { value: AnswerValue; basis: string; count: number }>;
  /** Where this plan's own certifying agent asks each question; null when Trazo holds no register for it. */
  agent_refs?: AgentRefs | null;
}

/** One form of the agent that asks a question, with the form's items that ask it. */
export interface AgentFormRef {
  form: string;
  items: string[];
}

export interface AgentRefs {
  /** The agent as growers name it ("WSDA", "CCOF", "OTCO"). */
  agent: string;
  /** Keyed by question key within the module. */
  refs: Record<string, AgentFormRef[]>;
  /**
   * Questions a row of this agent asks and applies to this plan (rows the form prints optional
   * left out). The wizard flags the blank ones that are showing; see `blankAskedKeys`.
   */
  asked?: string[];
}

export interface SaveModulePayload {
  answers?: Record<string, AnswerValue>;
  not_applicable?: boolean;
  complete?: boolean;
}

/** Pick the display string for the active locale; EN is the certifier-facing fallback. */
export const pickText = (map: TextMap | null | undefined, locale: string): string => {
  if (!map) return '';
  return locale.toLowerCase().startsWith('es') ? map.es || map.en : map.en;
};
