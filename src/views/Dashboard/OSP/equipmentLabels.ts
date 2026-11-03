/**
 * Message ids for the equipment register's choices. Static ids, never interpolated: the
 * locale-parity test cannot see an id built at runtime.
 */
import type { EquipmentOwnership, EquipmentUse } from 'store/api/productionEquipmentApi';

export const USES: EquipmentUse[] = [
  'planting',
  'input_application',
  'harvest',
  'washing_packing',
  'transport',
  'other'
];

export const USE_IDS: Record<EquipmentUse, string> = {
  planting: 'equipment.use.planting',
  input_application: 'equipment.use.inputApplication',
  harvest: 'equipment.use.harvest',
  washing_packing: 'equipment.use.washingPacking',
  transport: 'equipment.use.transport',
  other: 'equipment.use.other'
};

export const OWNERSHIPS: Exclude<EquipmentOwnership, ''>[] = [
  'own',
  'rent',
  'borrow',
  'custom_hire'
];

export const OWNERSHIP_IDS: Record<Exclude<EquipmentOwnership, ''>, string> = {
  own: 'equipment.ownership.own',
  rent: 'equipment.ownership.rent',
  borrow: 'equipment.ownership.borrow',
  custom_hire: 'equipment.ownership.customHire'
};
