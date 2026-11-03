/**
 * The season page's Production Details must not print a bare "0".
 *
 * `{historyData?.production_amount && <InfoRow …/>}` renders the number itself when it is 0,
 * because React renders a falsy NUMBER (only false, null and undefined render nothing). Every open
 * season with no harvest amount yet showed a stray "0" between "End Date: In Progress" and
 * "Environment" (found 2026-11-03 while recording the post 3 short). `earning` had the same shape.
 *
 * Read from source like the other tests here: the page needs a full store to render.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(resolve(__dirname, '../ProfileProduction.tsx'), 'utf8');

describe('Production Details never renders a numeric field as a bare 0', () => {
  it.each(['production_amount', 'earning'])('%s is tested as a number, not with &&', (field) => {
    expect(SRC).not.toMatch(new RegExp(`\\{\\s*historyData\\?\\.${field}\\s*&&`));
    expect(SRC).toMatch(new RegExp(`Number\\(historyData\\?\\.${field}\\)\\s*>\\s*0\\s*&&`));
  });
});
