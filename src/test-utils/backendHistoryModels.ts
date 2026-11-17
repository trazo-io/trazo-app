import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * trazo-back's history model source as ONE string, in the order the old single file defined it.
 *
 * `history/models.py` became the package `history/models/` (2026-11-17): one module per model or
 * group of models. The package's `__init__.py` imports its modules in the old file's order (that is
 * also the order Django registers the models), so joining the modules in that order gives the old
 * file's text back. Guards here take the FIRST match of a pattern, and a constant name can be
 * defined on two models, so the order is not cosmetic: alphabetical order would put
 * `business_event.py` before `production_event.py`.
 *
 * While a sibling checkout still has the single file, that file is read.
 */
export const historyModelsSource = (backRoot: string): string => {
  const single = join(backRoot, 'history', 'models.py');
  const pkg = join(backRoot, 'history', 'models');
  const init = join(pkg, '__init__.py');
  if (existsSync(init)) {
    const modules = [...readFileSync(init, 'utf8').matchAll(/^from \.(\w+) import/gm)].map(
      (m) => m[1]
    );
    if (modules.length === 0) {
      throw new Error(`${init} imports no module; the guards reading it would compare nothing`);
    }
    return modules.map((name) => readFileSync(join(pkg, `${name}.py`), 'utf8')).join('\n');
  }
  if (existsSync(single)) return readFileSync(single, 'utf8');
  throw new Error(
    `Neither ${init} nor ${single} exists. These guards compare the app against the server's ` +
      `models, so they need the trazo-back checkout beside trazo-app.`
  );
};
