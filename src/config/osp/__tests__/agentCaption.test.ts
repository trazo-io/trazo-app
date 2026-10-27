import { describe, expect, it } from 'vitest';
import { createIntl, createIntlCache } from 'react-intl';

import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';
import { agentCaption } from '../agentCaption';
import type { AgentRefs } from '../types';

const cache = createIntlCache();
const intlEn = createIntl({ locale: 'en-US', messages: en as Record<string, string> }, cache);
const intlEs = createIntl({ locale: 'es-419', messages: es as Record<string, string> }, cache);

const wsda: AgentRefs = {
  agent: 'WSDA',
  refs: {
    stored_in_sealed_packaging: [{ form: 'K Storage (AGR 2121)', items: ['3'] }],
    who_harvests: [
      { form: 'I Farm Equipment (AGR 2121)', items: ['3'] },
      { form: 'J Harvest (AGR 2121)', items: ['1', '1a'] }
    ]
  }
};

describe('agentCaption', () => {
  it('names the agent, the form and the item', () => {
    expect(agentCaption(intlEn, wsda, 'stored_in_sealed_packaging')).toBe(
      'WSDA asks this in K Storage (AGR 2121), item 3.'
    );
  });

  it('lists every form that asks it, with plural items', () => {
    expect(agentCaption(intlEn, wsda, 'who_harvests')).toBe(
      'WSDA asks this in I Farm Equipment (AGR 2121), item 3; J Harvest (AGR 2121), items 1, 1a.'
    );
  });

  it('reads in Spanish, tuteo-neutral', () => {
    expect(agentCaption(intlEs, wsda, 'who_harvests')).toBe(
      'WSDA pregunta esto en I Farm Equipment (AGR 2121), punto 3; J Harvest (AGR 2121), puntos 1, 1a.'
    );
  });

  it('says nothing for a question the agent does not ask, or an agent with no register', () => {
    expect(agentCaption(intlEn, wsda, 'empty_bin_storage')).toBeNull();
    expect(agentCaption(intlEn, null, 'who_harvests')).toBeNull();
    expect(agentCaption(intlEn, undefined, 'who_harvests')).toBeNull();
  });
});
