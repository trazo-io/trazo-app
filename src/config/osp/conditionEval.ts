/**
 * Condition evaluator — the exact TS twin of
 * `trazo-back/certifications/osp_modules/conditions.py`.
 *
 * The two are kept honest by the golden fixture
 * (`__tests__/fixtures/module-definitions.json`, regenerated with
 * `poetry run python manage.py export_osp_module_fixture`): the backend computes
 * visible-question sets and missing-required lists with ITS evaluator, and
 * `conditionEval.test.ts` replays the same answers through THIS one and asserts
 * identical output. Change semantics here without changing the backend and the test
 * fails — that is the contract.
 *
 * Semantics (frozen):
 *   eq / ne        answer === value / answer !== value
 *   includes       value ∈ answer (answer is a list)
 *   includes_any   any of value (a list) ∈ answer — the POSITIVE trigger op; false
 *                  while unanswered so conditional pages stay hidden until triggered
 *   one_of         scalar answer ∈ value (a list) — radio counterpart of
 *                  includes_any; false while unanswered
 *   not_includes   value ∉ answer — deliberately TRUE while unanswered (carve-outs on
 *                  already-visible content only, never a page trigger)
 *   truthy/falsy   with null / '' / [] / 0 / false all falsy
 */

import type {
  AnswerValue,
  ModuleAnswers,
  ModuleCondition,
  ModuleDefinition,
  ModulePage,
  ModuleQuestion
} from './types';

export const answerValue = (
  answers: ModuleAnswers | undefined,
  questionKey: string
): AnswerValue => {
  const entry = answers?.[questionKey];
  if (entry !== null && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry) {
    return entry.value;
  }
  return (entry as AnswerValue) ?? null;
};

const isFalsy = (value: AnswerValue): boolean => {
  if (Array.isArray(value)) return value.length === 0;
  return !value;
};

export const evaluate = (cond: ModuleCondition, answers: ModuleAnswers): boolean => {
  const value = answerValue(answers, cond.question);
  switch (cond.op) {
    case 'eq':
      return value === cond.value;
    case 'ne':
      return value !== cond.value;
    case 'includes':
      return Array.isArray(value) && value.includes(cond.value as string);
    case 'includes_any':
      return Array.isArray(value) && (cond.value as string[]).some((v) => value.includes(v));
    case 'one_of':
      // Scalar counterpart of includes_any: unanswered is NOT one of anything.
      return value != null && (cond.value as unknown[]).includes(value);
    case 'not_includes':
      return !(Array.isArray(value) && value.includes(cond.value as string));
    case 'truthy':
      return !isFalsy(value);
    case 'falsy':
      return isFalsy(value);
    default:
      throw new Error(`Unknown condition op: ${(cond as { op: string }).op}`);
  }
};

export const conditionsPass = (conds: ModuleCondition[], answers: ModuleAnswers): boolean =>
  conds.every((c) => evaluate(c, answers));

export const visiblePages = (module: ModuleDefinition, answers: ModuleAnswers): ModulePage[] =>
  module.pages.filter((p) => conditionsPass(p.visible_when, answers));

export const visibleQuestions = (
  module: ModuleDefinition,
  answers: ModuleAnswers
): Array<{ page: ModulePage; question: ModuleQuestion }> => {
  const out: Array<{ page: ModulePage; question: ModuleQuestion }> = [];
  for (const page of visiblePages(module, answers)) {
    for (const question of page.questions) {
      if (conditionsPass(question.visible_when, answers)) {
        out.push({ page, question });
      }
    }
  }
  return out;
};

// Kinds completion validation skips — mirrors _UNVALIDATED_KINDS in conditions.py
// (uploads become validatable when WS-3 storage lands).
const UNVALIDATED_KINDS = new Set(['info', 'upload']);

const isAnswered = (question: ModuleQuestion, value: AnswerValue): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  // booleans (false included) and numbers are explicit answers.
  return true;
};

export const missingRequired = (
  module: ModuleDefinition,
  answers: ModuleAnswers,
  notApplicable = false
): string[] => {
  if (notApplicable && module.allows_not_applicable) return [];
  const missing: string[] = [];
  for (const { question } of visibleQuestions(module, answers)) {
    if (!question.required || UNVALIDATED_KINDS.has(question.kind) || question.parcel_field)
      continue;
    if (!isAnswered(question, answerValue(answers, question.key))) missing.push(question.key);
  }
  return missing;
};

/** Mirror of conditions.progress() for optimistic UI while a save is in flight. */
export const progress = (
  module: ModuleDefinition,
  answers: ModuleAnswers,
  notApplicable = false
): { answered: number; required: number; missing: string[] } => {
  if (notApplicable && module.allows_not_applicable) {
    return { answered: 0, required: 0, missing: [] };
  }
  const requiredKeys = visibleQuestions(module, answers)
    .filter(
      ({ question }) =>
        question.required && !UNVALIDATED_KINDS.has(question.kind) && !question.parcel_field
    )
    .map(({ question }) => question.key);
  const missing = missingRequired(module, answers, notApplicable);
  return { answered: requiredKeys.length - missing.length, required: requiredKeys.length, missing };
};
