/**
 * Quick Add must emit the sub-type codes the backend and the certifier PDF expect.
 *
 * This is not a cosmetic mapping. `equipment_operation_type` previously mapped
 * 'cleaning' → 'MN' (Maintenance), throwing away the 'CL' code. The entire
 * 7 CFR § 205.272 equipment-cleaning log in the audit export is gated on `type == "CL"`
 * (audit_export_service._build_equipment_section), so a cleaning logged through Quick Add
 * looked recorded in the app and was absent from the document a certifier reads —
 * the single worst failure mode this product has.
 */
import { describe, it, expect } from 'vitest';
import { getFieldsForBackend } from '../quickEventFields';

/** Mirrors EQUIPMENT_OPERATION_TYPE in trazo-back/common/field_registry.py. */
const BACKEND_OPERATION_CODES = ['FC', 'MN', 'RE', 'CA', 'BD', 'EI', 'CL'];

describe('Quick Add → backend equipment operation codes', () => {
  const map = (value: string) =>
    getFieldsForBackend('equipment_maintenance', { equipment_operation_type: value })
      .equipment_operation_type;

  it('maps cleaning to CL, not MN', () => {
    expect(map('cleaning')).toBe('CL');
  });

  it('maps the remaining operations to their own codes', () => {
    expect(map('routine_maintenance')).toBe('MN');
    expect(map('repair')).toBe('RE');
    expect(map('calibration')).toBe('CA');
    expect(map('inspection')).toBe('EI');
  });

  it('emits only codes the backend accepts', () => {
    for (const value of [
      'routine_maintenance',
      'repair',
      'calibration',
      'cleaning',
      'inspection'
    ]) {
      expect(BACKEND_OPERATION_CODES).toContain(map(value));
    }
  });

  it('maps each operation to a distinct code, so none is silently swallowed', () => {
    const codes = ['routine_maintenance', 'repair', 'calibration', 'cleaning', 'inspection'].map(
      map
    );
    expect(new Set(codes).size).toBe(codes.length);
  });
});
