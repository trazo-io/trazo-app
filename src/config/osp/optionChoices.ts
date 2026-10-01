/**
 * Choosing among a question's options, client side. Kept apart from the wizard so it can be
 * tested without rendering it.
 *
 * A RETIRED option (backend `Option.retired`) was replaced by one that asks more. It is shown
 * only while it is the stored answer, never offered again, and any new pick drops it.
 */
import type { AnswerValue, ModuleQuestion } from './types';

/**
 * Apply exclusive-option semantics client-side (server refuses conflicts anyway). Any new pick
 * also drops a retired option: it was the earlier answer, and choosing a current option is the
 * operator confirming the question as it is asked now.
 */
export const toggleCheckbox = (
  question: ModuleQuestion,
  current: string[],
  optionValue: string
): string[] => {
  const option = question.options.find((o) => o.value === optionValue);
  const has = current.includes(optionValue);
  if (has) return current.filter((v) => v !== optionValue);
  if (option?.exclusive) return [optionValue];
  const dropped = new Set(
    question.options.filter((o) => o.exclusive || o.retired).map((o) => o.value)
  );
  return [...current.filter((v) => !dropped.has(v)), optionValue];
};

/** Whether the stored answer still holds a retired option, so the wizard can say so. */
export const holdsRetiredOption = (question: ModuleQuestion, stored: AnswerValue): boolean => {
  const chosen = Array.isArray(stored) ? (stored as string[]) : [stored];
  return question.options.some((o) => o.retired && chosen.includes(o.value));
};

/**
 * The options to render: every current option, and a retired one only while it is the stored
 * answer, so the operator sees what they answered before and is never offered it again.
 */
export const offeredOptions = (question: ModuleQuestion, stored: AnswerValue) => {
  const chosen = Array.isArray(stored) ? (stored as string[]) : [stored];
  return question.options.filter((o) => !o.retired || chosen.includes(o.value));
};
