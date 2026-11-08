/**
 * What an off-farm facility does for the operation, in the words of WSDA's Additional Facilities and
 * Third-Parties form (AGR 2519, R 01/24, "Activity Information"). Keys mirror the backend's
 * `certifications/facility_activities.py`; the English labels are the form's, verbatim.
 * `facilityActivitiesParity.test.ts` reads the backend file and holds the two lists to each other.
 */
export const ACTIVITY_GROUPS: { group: string; keys: string[] }[] = [
  {
    group: 'general',
    keys: ['equipment_storage', 'input_material_storage', 'record_storage', 'retail_sales']
  },
  { group: 'production', keys: ['livestock_housing', 'propagation_houses'] },
  { group: 'potentially_exempt', keys: ['brokering_packaged', 'storage_packaged'] },
  {
    group: 'requires_certification',
    keys: [
      'importing',
      'sourcing_trading',
      'presizing_sorting_hydrocooling',
      'transloading',
      'bulk_storage',
      'multi_ingredient_processing',
      'single_ingredient_processing',
      'packaging_labeling',
      'slaughter'
    ]
  }
];

export const ACTIVITY_KEYS = ACTIVITY_GROUPS.flatMap((g) => g.keys);

export const activityMessageId = (key: string) => `facility.activity.${key}`;
export const activityGroupMessageId = (group: string) => `facility.activityGroup.${group}`;
