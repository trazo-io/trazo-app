/**
 * Every § 11 record type, group heading, evidence line and plan reason the backend can send has
 * copy here, in both languages (2026-11-09).
 *
 * The backend sends the form's English (`common_osp_records.py`): the labels are verbatim from
 * the Common OSP form and print as-is in the packet. The panel words them from their keys, so a
 * record type added there without copy here would show English on a Spanish screen. This reads
 * the backend source from the sibling trazo-back checkout (CI checks out its main).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import enUS from '../../../../i18n/lang/en-US.json';
import esUY from '../../../../i18n/lang/es-419.json';
import { RECORD_TYPE_GROUP_KEYS } from '../OSPRecordTypesPanel';

const en = enUS as Record<string, string>;
const es = esUY as Record<string, string>;
const BACK = join(__dirname, '../../../../../../trazo-back/certifications/services');
const REGISTRY = readFileSync(join(BACK, 'common_osp_records.py'), 'utf8');
const REQUIRED = readFileSync(join(BACK, 'required_records.py'), 'utf8');

/** key, verbatim label (adjacent string literals joined), and whether it can carry evidence. */
const recordTypes = () =>
  // The label is one literal or adjacent literals in parentheses; a comment may follow it.
  [
    ...REGISTRY.matchAll(
      /RecordType\(\s*key="([a-z_]+)",\s*label=(\((?:\s*"(?:[^"\\]|\\.)*")+\s*\)|"(?:[^"\\]|\\.)*")/g
    )
  ].map((m) => {
    const next = REGISTRY.indexOf('RecordType(', (m.index ?? 0) + 1);
    const block = REGISTRY.slice(m.index, next === -1 ? undefined : next);
    return {
      key: m[1],
      label: [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((s) => s[1]).join(''),
      evidenced: !/evidence=lambda b: \(0, ""\)/.test(block)
    };
  });

describe('the § 11 registry has copy for everything the backend sends', () => {
  const types = recordTypes();

  it('reads the registry', () => {
    expect(types.length).toBeGreaterThanOrEqual(45);
  });

  it('every record type: the English is the form verbatim, and there is Spanish', () => {
    const wrong = types.filter(
      (t) => en[`osp.recordTypes.type.${t.key}`] !== t.label || !es[`osp.recordTypes.type.${t.key}`]
    );
    expect(wrong.map((t) => t.key)).toEqual([]);
  });

  it('every group heading is mapped and worded', () => {
    const groups = [...REGISTRY.matchAll(/^GROUP_[A-Z]+ = "([^"]+)"/gm)].map((m) => m[1]);
    expect(groups.length).toBe(4);
    expect(Object.keys(RECORD_TYPE_GROUP_KEYS).sort()).toEqual([...groups].sort());
    for (const key of Object.values(RECORD_TYPE_GROUP_KEYS)) {
      expect(en[`osp.recordTypes.group.${key}`], key).toBeTruthy();
      expect(es[`osp.recordTypes.group.${key}`], key).toBeTruthy();
    }
  });

  it('every record type that can carry evidence has an evidence line in both languages', () => {
    const missing = types
      .filter((t) => t.evidenced)
      .filter((t) => !en[`osp.recordTypes.basis.${t.key}`] || !es[`osp.recordTypes.basis.${t.key}`])
      .map((t) => t.key);
    expect(missing).toEqual([]);
  });

  it('every reason a plan can require a record has copy', () => {
    const block = REQUIRED.slice(REQUIRED.indexOf('TRIGGERS'));
    const keys = [...block.matchAll(/^ {4}"([a-z_]+)": \(/gm)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(7);
    const missing = keys.filter(
      (k) => !en[`osp.recordTypes.because.${k}`] || !es[`osp.recordTypes.because.${k}`]
    );
    expect(missing).toEqual([]);
  });
});
