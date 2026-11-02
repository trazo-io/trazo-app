/**
 * The caption under a plan question naming where the plan's own certifying agent asks it:
 * "WSDA asks this in K Storage (AGR 2121), item 3a."
 *
 * The references come from the server (`agent_refs` on the module detail), read from the same
 * register the packet's coverage page and question index use. No references, no caption: an agent
 * Trazo holds no register for gets nothing rather than another agent's numbers.
 */
import type { IntlShape } from 'react-intl';
import { answerValue, visibleQuestions } from './conditionEval';
import type { AgentRefs, AnswerValue, ModuleAnswers, ModuleDefinition } from './types';

export const agentCaption = (
  intl: Pick<IntlShape, 'formatMessage'>,
  agentRefs: AgentRefs | null | undefined,
  questionKey: string
): string | null => {
  const refs = agentRefs?.refs?.[questionKey];
  if (!agentRefs || !refs || refs.length === 0) return null;
  const forms = refs
    .map((ref) =>
      intl.formatMessage(
        { id: 'osp.wizard.agentAsksForm' },
        { form: ref.form, count: ref.items.length, items: ref.items.join(', ') }
      )
    )
    .join('; ');
  return intl.formatMessage({ id: 'osp.wizard.agentAsks' }, { agent: agentRefs.agent, forms });
};

/** Kinds that hold no typed answer: an info panel collects nothing; an upload is a linked file. */
const NO_TYPED_ANSWER = new Set(['info', 'upload']);

/** Mirrors `_answered` in conditions.py: a retired option still counts as given here. */
const isBlank = (value: AnswerValue): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

/**
 * Keys of the questions showing now that are blank, not required by Trazo, and asked by the plan's
 * own agent. The live twin of `blank_asked_questions` in `agent_question_refs.py`, so the module
 * list's count and the wizard's flags agree once the page is saved.
 *
 * Required questions are left out (they already block completion), and so is any question a
 * `falsy` condition reads: the plan treats its blank as No ("no fertilizers used" left unticked
 * shows the list), so it is not unanswered.
 */
export const blankAskedKeys = (
  definition: ModuleDefinition,
  answers: ModuleAnswers,
  agentRefs: AgentRefs | null | undefined,
  notApplicable = false
): string[] => {
  const asked = new Set(agentRefs?.asked ?? []);
  if (!asked.size || (notApplicable && definition.allows_not_applicable)) return [];
  const readsAsNo = new Set<string>();
  for (const page of definition.pages) {
    for (const cond of page.visible_when) if (cond.op === 'falsy') readsAsNo.add(cond.question);
    for (const q of page.questions) {
      for (const cond of q.visible_when) if (cond.op === 'falsy') readsAsNo.add(cond.question);
    }
  }
  return visibleQuestions(definition, answers)
    .map(({ question }) => question)
    .filter(
      (q) =>
        asked.has(q.key) &&
        !q.required &&
        !NO_TYPED_ANSWER.has(q.kind) &&
        !q.parcel_field &&
        !readsAsNo.has(q.key) &&
        isBlank(answerValue(answers, q.key))
    )
    .map((q) => q.key);
};
