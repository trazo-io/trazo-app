/**
 * A refused save names the field by its label on the form, never by the API's key.
 *
 * Recordkeeping checklist run 2026-11-16, VID-08: the grower read "manure_harvest_interval:
 * Blueberries: ..." in the error toast, in English and in Spanish. The toast now labels each field
 * from the event registry (`getFieldConfig(...).labelKey`), in the reader's language.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { createIntl } from 'react-intl';

import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';
import { getFieldConfig } from 'config/events';
import { fieldErrorLine } from 'utils/apiErrorMessage';

const SOURCE = readFileSync(resolve(__dirname, '../NewEvent.jsx'), 'utf8');

describe('the save error toast names the field', () => {
  it('builds field lines through fieldErrorLine with the registry label', () => {
    expect(SOURCE).toMatch(/fieldErrorLine\(\s*field,/);
    expect(SOURCE).toMatch(
      /codedFieldMessage\(error\.data\.error_codes, field, translateCoded, readerDate\)/
    );
    expect(SOURCE).toMatch(/\|\|\s*msgs\.join\(', '\),\s*labelOf/);
    expect(SOURCE).toMatch(/soilFormLabelKey\(field, eventFormData\.type\)/);
    expect(SOURCE).toMatch(/getFieldConfig\(activeEventType, field\)\?\.labelKey/);
    expect(SOURCE).not.toMatch(/`\$\{field\}: \$\{msgs/);
  });

  it('words a coded refusal that is not a field (a closed season) before the English sentence', () => {
    // 2026-11-21: the closed-season 403 and "no open season" answer `detail`; the toast showed the
    // server's English sentence ahead of everything else.
    expect(SOURCE).toMatch(
      /codedFieldMessage\(error\?\.data\?\.error_codes, 'detail', translateCoded, readerDate\) \|\|\s*error\?\.data\?\.detail/
    );
    expect(SOURCE).toMatch(/formatDateOnly\(iso, intl\.locale\)/);
    expect(SOURCE).toMatch(/formatDate: readerDate/);
    // The lock notice is the screen's own sentence, not the server's English one.
    expect(SOURCE).not.toMatch(
      /error\.data\.detail \|\| intl\.formatMessage\(\{ id: 'events\.locked\.detail' \}\)/
    );
  });

  it('says the manure interval by its label in both languages', () => {
    const labelKey = getFieldConfig(5, 'manure_harvest_interval')?.labelKey as string;
    expect(labelKey).toBeTruthy();
    for (const [locale, messages] of [
      ['en-US', enUS],
      ['es-419', es419]
    ] as const) {
      const intl = createIntl({ locale, messages: messages as Record<string, string> });
      const line = fieldErrorLine('manure_harvest_interval', 'X.', (f) =>
        intl.formatMessage({ id: getFieldConfig(5, f)?.labelKey as string })
      );
      expect(line).toBe(`${(messages as Record<string, string>)[labelKey]}: X.`);
      expect(line).not.toContain('manure_harvest_interval');
    }
  });
});
