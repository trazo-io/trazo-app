/**
 * The caption under a plan question naming where the plan's own certifying agent asks it:
 * "WSDA asks this in K Storage (AGR 2121), item 3a."
 *
 * The references come from the server (`agent_refs` on the module detail), read from the same
 * register the packet's coverage page and question index use. No references, no caption: an agent
 * Trazo holds no register for gets nothing rather than another agent's numbers.
 */
import type { IntlShape } from 'react-intl';
import type { AgentRefs } from './types';

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
