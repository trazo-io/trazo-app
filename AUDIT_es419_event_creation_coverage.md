# Spanish (es-419) Translation Coverage Audit — Event-Creation Experience

**Date:** 2026-06-13  
**Scope:** 7 event-type form tabs + QuickAddEvent + VoiceEventCapture  
**App default locale:** `en-US` (see `src/i18n/i18n-config.ts`). Locale is held in React `useState` only — **NOT persisted** to localStorage/cookie/profile, so a Spanish selection is lost on reload.

## Classification legend
- **(a)** i18n key WITH es translation present
- **(b)** i18n key MISSING from es-419.json (renders raw key id / falls through)
- **(c)** Hardcoded English (no i18n at all)
- **(d)** Hardcoded Spanish

## Method
Counted `intl.formatMessage({id:...})` references per file and cross-checked each id against both locale JSONs. Extracted user-visible literals from visible props (`label`, `placeholder`, `title`, `description`, `helperText`, etc.), `<option>` labels, JSX text nodes, and toast/data-object `title`/`description`. Deduped option/JSX-text overlaps. Strings inside `formatMessage(...)` are excluded from the hardcoded count.

## Locale-file health (dictionary itself)
- en-US.json and es-419.json both contain **4,314** keys; **0** keys present in EN are missing from ES.
- Only **19** multi-word values are byte-identical EN==ES, and all are formulas / CFR citations / proper nouns (e.g. `'{value} kg CO₂e'`, `'§ 205.201(a)(1)'`, `'Rainforest Alliance'`) — i.e. intentionally untranslated, not gaps.
- **Conclusion:** the dictionary is effectively fully translated. The coverage gap is almost entirely **hardcoded English in the form components that bypass i18n**, not missing dictionary entries.

## Totals across all 9 files

| Category | Count |
|---|---|
| (a) i18n keys WITH es translation | 249 |
| (a*) i18n keys present but byte-identical EN==ES | 3 |
| (b) i18n keys MISSING from es-419 | 3 |
| (c) Hardcoded English strings | 909 |
| (d) Hardcoded Spanish strings | 0 |
| **Total user-visible strings classified** | **1164** |

**Effective Spanish coverage of the event-creation UI ≈ 21.4%** (249 translated of 1164 user-visible strings). The remaining ~79% renders in English regardless of locale selection.

## Per-file summary

| File | (a) i18n+es | (a*) identical | (b) missing es | (c) hardcoded EN | (d) hardcoded ES | i18n coverage |
|---|---|---|---|---|---|---|
| `ProductionTab.jsx` | 95 | 1 | 0 | 247 | 0 | 28% |
| `ChemicalTab-ENHANCED.jsx` | 38 | 1 | 3 | 230 | 0 | 14% |
| `SoilManagementTab.jsx` | 26 | 0 | 0 | 165 | 0 | 14% |
| `PestManagementTab.jsx` | 33 | 0 | 0 | 115 | 0 | 22% |
| `WeatherTab.jsx` | 2 | 0 | 0 | 47 | 0 | 4% |
| `GeneralTab.jsx` | 2 | 0 | 0 | 42 | 0 | 5% |
| `BusinessTab-SIMPLIFIED.jsx` | 3 | 0 | 0 | 49 | 0 | 6% |
| `QuickAddEvent.tsx` | 48 | 1 | 0 | 6 | 0 | 87% |
| `VoiceEventCapture.tsx` | 2 | 0 | 0 | 8 | 0 | 20% |
| **TOTAL** | **249** | **3** | **3** | **909** | **0** | **21.4%** |

## Category (b): i18n keys MISSING from es-419.json

These 3 keys are referenced in `ChemicalTab-ENHANCED.jsx` but are absent from **BOTH** en-US.json and es-419.json — so they render the raw key id (or empty) in every language. This is a defect, not just a Spanish gap.

| File | Key | In en-US? | In es-419? |
|---|---|---|---|
| `ChemicalTab-ENHANCED.jsx` | `chemical.recentInputs.helper` | NO | NO |
| `ChemicalTab-ENHANCED.jsx` | `chemical.recentInputs.organicBadge` | NO | NO |
| `ChemicalTab-ENHANCED.jsx` | `chemical.recentInputs.title` | NO | NO |

## Category (a*): i18n keys present but byte-identical EN==ES (rendered untranslated in this UI)

| File | Key | Value |
|---|---|---|
| `ProductionTab.jsx` | `app.electricitySource.solar` | `Solar` |
| `ChemicalTab-ENHANCED.jsx` | `app.unit.acres` | `Acres` |
| `QuickAddEvent.tsx` | `quickAdd.photos.countBadge` | `{current}/{max}` |

## Category (c): Hardcoded English strings — full list per file

### `ProductionTab.jsx` (src/views/Dashboard/Dashboard/components/forms/ProductionTab.jsx) — 247 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 934 | title/heading | Agricultural Production Transparency |
| 937 | JSX text | Yield & Transportation Documentation |
| 963 | title/heading | Production Activity |
| 970 | label | Production Type |
| 979 | placeholder | Select production activity... |
| 980 | select option | 🌱 Planting - Crop establishment |
| 981 | select option | 🚜 Harvesting - Crop collection & transport |
| 982 | select option | 💧 Irrigation - Water application |
| 983 | select option | ✂️ Pruning/Trimming - Plant maintenance |
| 984 | select option | 🌿 Transplanting - Plant relocation |
| 986 | select option | 🌾 Cultivation - Soil cultivation & weed control |
| 989 | select option | ✂️ Thinning - Plant spacing optimization |
| 992 | select option | 🔧 Equipment Maintenance - Equipment usage & maintenance |
| 996 | select option | 🐝 Pollination - Pollinator placement & management |
| 999 | select option | 📦 Post-Harvest Processing - Washing, cooling, packing |
| 1002 | select option | 🌿 Canopy Management - Pruning, hedging, leaf pulling, thinning |
| 1012 | label | Event Name |
| 1029 | label | Area Covered |
| 1057 | label | Unit |
| 1063 | select option | Hectares |
| 1064 | select option | Acres |
| 1065 | select option | Square Meters |
| 1066 | select option | Square Kilometers |
| 1084 | title/heading | Equipment Details |
| 1087 | description | Specify equipment operation type and equipment used for accurate carbon emission calculations. |
| 1092 | label | Operation Type |
| 1101 | placeholder | Select operation type... |
| 1103 | select option | {type.label} |
| 1113 | label | Equipment Type |
| 1122 | placeholder | Select equipment type... |
| 1124 | select option | {type.label} |
| 1135 | label | Operation Efficiency |
| 1144 | select option | High Efficiency (well-maintained, optimal conditions) |
| 1147 | select option | Normal Efficiency (standard operation) |
| 1148 | select option | Low Efficiency (needs maintenance, suboptimal conditions) |
| 1168 | title/heading | NOP Equipment Cleaning Log |
| 1171 | description | Document equipment cleaning per NOP 7 CFR 205.272. Required when equipment is shared between organic and conventional operations. |
| 1175 | label | Cleaning Date |
| 1184 | label | Cleaned By |
| 1193 | placeholder | e.g., Miguel Ramirez (Farm Manager) |
| 1201 | label | Cleaning Method |
| 1210 | placeholder | e.g., Pressure wash + manual scrub with brushes |
| 1217 | label | Cleaning Materials Used |
| 1226 | placeholder | e.g., Water, NOP-approved BioSafe Systems SaniDate (hydrogen peroxide + peroxyacetic acid) |
| 1234 | label | Cleaning Protocol Reference |
| 1241 | placeholder | e.g., SOP-CLEAN-001 |
| 1254 | JSX text | Post-Harvest Sanitation (7 CFR 205.272 + § 205.605) |
| 1265 | label | Sanitizer Name |
| 1274 | placeholder | e.g., Sodium hypochlorite |
| 1280 | label | Concentration (ppm) |
| 1293 | placeholder | e.g., 150 |
| 1300 | label | National List Reference |
| 1309 | placeholder | e.g., § 205.605(b) - Sodium hypochlorite |
| 1316 | JSX text | Potable-Water Rinse Step Documented |
| 1319 | JSX text | Required after sanitizer contact per § 205.272(b) |
| 1350 | JSX text | Shared with Conventional Operations |
| 1354 | JSX text | Requires Cleaning |
| 1359 | JSX text | Is this equipment shared between organic and conventional operations? |
| 1386 | title/heading | Yield & Output |
| 1423 | label | Unit |
| 1429 | select option | Kilograms |
| 1430 | select option | Tonnes |
| 1431 | select option | Pounds |
| 1432 | select option | Boxes |
| 1433 | select option | Plants |
| 1434 | select option | Seeds |
| 1451 | title/heading | Harvest Quality |
| 1459 | label | Quality Grade |
| 1467 | placeholder | Select grade (optional) |
| 1468 | select option | Export Quality |
| 1469 | select option | Grade A |
| 1470 | select option | Grade B |
| 1471 | select option | Grade C |
| 1472 | select option | Domestic Market |
| 1473 | select option | Processing / Juice |
| 1482 | label | Grain Moisture % |
| 1498 | placeholder | Leave blank if N/A |
| 1514 | label | Harvest Method |
| 1524 | placeholder | Select harvest method (optional) |
| 1526 | select option | Hand Picking |
| 1527 | select option | Selective Hand Picking |
| 1530 | select option | Mechanical Harvester |
| 1531 | select option | Shake and Catch |
| 1532 | select option | Strip Picking |
| 1557 | placeholder | Leave blank if N/A |
| 1578 | title/heading | Harvest Summary Mode |
| 1581 | description | Log multiple harvest picks as one summary record to reduce logging burden while maintaining full transparency. |
| 1600 | JSX text | Active |
| 1631 | label | Period Start Date |
| 1639 | label | Period End Date |
| 1647 | label | Number of Harvests |
| 1656 | placeholder | e.g., 24 |
| 1662 | label | Total Yield |
| 1673 | placeholder | e.g., 5000 |
| 1682 | select option | Pounds |
| 1683 | select option | Kilograms |
| 1684 | select option | Tonnes |
| 1685 | select option | Boxes |
| 1759 | placeholder | Select growth stage... |
| 1760 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })} |
| 1763 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })} |
| 1766 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })} |
| 1769 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })} |
| 1772 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.vegetative'                                   })} |
| 1777 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.maturation'                                   })} |
| 1782 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.harvest_ready'                                   })} |
| 1787 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.post_harvest'                                   })} |
| 1810 | description | Document pollinator placement and management for full production transparency. |
| 1866 | placeholder | Select pollinator type... |
| 1867 | select option | 🐝 {intl.formatMessage({ id: 'production.pollination.honeybee' })} |
| 1870 | select option | 🐝{' '}                                   {intl.formatMessage({ id: 'production.pollination.mason_bee' })} |
| 1874 | select option | 🐝{' '}                                   {intl.formatMessage({ id: 'production.pollination.bumblebee' })} |
| 1878 | select option | 🌸{' '}                                   {intl.formatMessage({                                     id: 'production.pollination.native_pollinators'                                   })} |
| 1884 | select option | 💨 {intl.formatMessage({ id: 'production.pollination.wind' })} |
| 1910 | placeholder | e.g., 4 |
| 1959 | description | Document post-harvest handling and processing operations for full traceability. |
| 1995 | placeholder | Select processing type... |
| 1996 | select option | 🚿 {intl.formatMessage({ id: 'production.postHarvest.washing' })} |
| 1999 | select option | ❄️ {intl.formatMessage({ id: 'production.postHarvest.cooling' })} |
| 2002 | select option | ☀️ {intl.formatMessage({ id: 'production.postHarvest.drying' })} |
| 2005 | select option | 🔍 {intl.formatMessage({ id: 'production.postHarvest.sorting' })} |
| 2008 | select option | 📊 {intl.formatMessage({ id: 'production.postHarvest.grading' })} |
| 2011 | select option | 📦 {intl.formatMessage({ id: 'production.postHarvest.packing' })} |
| 2014 | select option | ⚙️ {intl.formatMessage({ id: 'production.postHarvest.hulling' })} |
| 2017 | select option | ⚙️ {intl.formatMessage({ id: 'production.postHarvest.shelling' })} |
| 2020 | select option | 🗜️ {intl.formatMessage({ id: 'production.postHarvest.pressing' })} |
| 2023 | select option | ⚙️ {intl.formatMessage({ id: 'production.postHarvest.milling' })} |
| 2026 | select option | 🔥 {intl.formatMessage({ id: 'production.postHarvest.smoking' })} |
| 2052 | placeholder | e.g., 4.5 |
| 2115 | description | Document canopy management operations for transparency and carbon-accurate equipment tracking. |
| 2127 | placeholder | e.g., Mourvèdre, Cabernet |
| 2158 | placeholder | Select growth stage... |
| 2159 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })} |
| 2162 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })} |
| 2165 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })} |
| 2168 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })} |
| 2171 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.vegetative'                                   })} |
| 2176 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.maturation'                                   })} |
| 2181 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.harvest_ready'                                   })} |
| 2186 | select option | {intl.formatMessage({                                     id: 'fieldDetails.growthStage.post_harvest'                                   })} |
| 2204 | placeholder | Select canopy operation... |
| 2205 | select option | ✂️ {intl.formatMessage({ id: 'production.canopy.pruning' })} |
| 2208 | select option | 🍃 {intl.formatMessage({ id: 'production.canopy.leaf_pulling' })} |
| 2211 | select option | 🌳 {intl.formatMessage({ id: 'production.canopy.hedging' })} |
| 2214 | select option | 🌱{' '}                                   {intl.formatMessage({                                     id: 'production.canopy.shoot_positioning'                                   })} |
| 2220 | select option | 🪚 {intl.formatMessage({ id: 'production.canopy.thinning' })} |
| 2223 | select option | 🤲 {intl.formatMessage({ id: 'production.canopy.tucking' })} |
| 2226 | select option | 🌿 {intl.formatMessage({ id: 'production.canopy.suckering' })} |
| 2250 | placeholder | e.g., 1 |
| 2296 | JSX text | Active |
| 2330 | label | Period Start Date |
| 2338 | label | Period End Date |
| 2358 | placeholder | e.g., 5 |
| 2375 | title/heading | Fuel Consumption & Equipment Data |
| 2378 | description | Document your actual equipment usage and fuel consumption to build consumer trust through transparent farming practices. These details help consumers understand the real operational impact of your production operations. |
| 2390 | label | Production Method (optional) |
| 2399 | placeholder | Describe the method (leave blank if unsure) |
| 2414 | label | Fuel Type |
| 2422 | placeholder | Select fuel type... |
| 2424 | select option | {type.label} ({type.factor}) |
| 2454 | JSX text | Electric Pump: |
| 2509 | label | Unit |
| 2517 | select option | Kilowatt-hours |
| 2520 | select option | Liters |
| 2521 | select option | Gallons |
| 2522 | select option | Kilograms |
| 2543 | JSX text | Electric Equipment: |
| 2559 | label | Equipment Operating Hours |
| 2574 | placeholder | Optional |
| 2593 | title/heading | Transportation |
| 2601 | label | Transportation Distance |
| 2616 | placeholder | Optional |
| 2628 | label | Unit |
| 2634 | select option | Kilometers |
| 2635 | select option | Miles |
| 2636 | select option | Meters |
| 2646 | label | Production Efficiency |
| 2655 | select option | High Efficiency (optimal conditions, planned operations) |
| 2658 | select option | Normal Efficiency (standard operation) |
| 2659 | select option | Low Efficiency (adverse conditions, unplanned operations) |
| 2678 | title/heading | Consumer Trust & Transparency |
| 2681 | description | Document your sourcing practices to help consumers understand the origins and quality of your farming inputs. |
| 2687 | label | Seed/Seedling Source |
| 2694 | placeholder | Select seed source... |
| 2695 | select option | ♻️ Farm-Saved Seeds |
| 2696 | select option | 🏡 Local Nursery/Supplier |
| 2697 | select option | 🤝 Farmer Cooperative |
| 2698 | select option | 🏭 Commercial Supplier |
| 2699 | select option | 📝 Other (specify in notes) |
| 2705 | label | Seed Certification Status |
| 2714 | placeholder | Select certification status... |
| 2716 | select option | 🌱 Certified Organic |
| 2719 | select option | 🔄 Transitional |
| 2720 | select option | ⚪ Non-organic (Untreated) |
| 2723 | select option | ⚠️ Non-organic (Treated) |
| 2731 | label | Supplier Name |
| 2740 | placeholder | e.g., Johnny's Selected Seeds |
| 2746 | label | Purchase Date |
| 2758 | label | Invoice # |
| 2765 | placeholder | e.g., INV-2026-0045 |
| 2770 | label | Lot / Batch # |
| 2777 | placeholder | e.g., 23-TX-01 |
| 2782 | label | Seed Treatment |
| 2791 | placeholder | e.g., Rhizobium inoculant, None |
| 2817 | JSX text | Active |
| 2849 | label | Period Start Date |
| 2861 | label | Period End Date |
| 2873 | label | Number of Irrigations |
| 2885 | placeholder | e.g., 12 |
| 2892 | label | Total Water Volume |
| 2906 | placeholder | e.g., 50000 |
| 2915 | select option | Gallons |
| 2916 | select option | Liters |
| 2917 | select option | Acre-feet |
| 2918 | select option | Cubic Meters |
| 2928 | label | Water Source |
| 2935 | placeholder | Select water source... |
| 2936 | select option | Well/Groundwater |
| 2937 | select option | Municipal Water Supply |
| 2938 | select option | Rainwater Harvesting |
| 2939 | select option | Irrigation Canal/District |
| 2942 | select option | River/Stream |
| 2943 | select option | Pond/Reservoir |
| 2944 | select option | Recycled/Reclaimed Water |
| 2945 | select option | Other (specify in notes) |
| 2953 | label | Irrigation Method |
| 2962 | placeholder | Select irrigation method... |
| 2964 | select option | Drip Irrigation (most efficient) |
| 2965 | select option | Micro-sprinkler |
| 2966 | select option | Sprinkler System |
| 2967 | select option | Center Pivot |
| 2968 | select option | Flood/Furrow Irrigation |
| 2969 | select option | Subsurface Drip |
| 2970 | select option | Hand Watering |
| 2971 | select option | Other Method |
| 2979 | label | Irrigation Depth |
| 3001 | select option | Inches |
| 3002 | select option | Centimeters |
| 3062 | select option | {intl.formatMessage({                                       id: 'app.electricitySource.grid',                                       defaultMessage: 'Grid Electricity'                                     })} |
| 3068 | select option | {intl.formatMessage({                                       id: 'app.electricitySource.solar',                                       defaultMessage: 'Solar'                                     })} |
| 3074 | select option | {intl.formatMessage({                                       id: 'app.electricitySource.wind',                                       defaultMessage: 'Wind'                                     })} |
| 3080 | select option | {intl.formatMessage({                                       id: 'app.electricitySource.dieselGenerator',                                       defaultMessage: 'Diesel Generator'                                     })} |
| 3086 | select option | {intl.formatMessage({                                       id: 'app.electricitySource.mixed',                                       defaultMessage: 'Mixed Sources'                                     })} |
| 3110 | JSX text | Why This Matters to Consumers |
| 3128 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 3133 | label | Observations & Notes |
| 3143 | placeholder | Optional: Describe the conditions that affected this production activity, efficiency measures taken, or any observations that consumers might find valuable. |

### `ChemicalTab-ENHANCED.jsx` (src/views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx) — 230 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 901 | title/heading | Chemical Application Transparency |
| 904 | JSX text | EPA-Verified Carbon Calculations |
| 975 | title/heading | Chemical Application Details |
| 981 | label | Chemical Type |
| 990 | placeholder | Select chemical type... |
| 991 | select option | 🌱 Fertilizer - Nutrient application |
| 992 | select option | 🐛 Pesticide - Pest control |
| 993 | select option | 🍄 Fungicide - Disease prevention |
| 994 | select option | 🌿 Herbicide - Weed management |
| 1003 | label | Chemical Subtype |
| 1011 | placeholder | Select subtype (optional)... |
| 1015 | select option | 🏭 Synthetic/Chemical (Urea, Ammonium Nitrate, etc.) |
| 1018 | select option | 🌿 Organic (Compost, Manure, etc.) |
| 1021 | select option | ⏳ Slow-Release/Controlled |
| 1030 | select option | 🏭 Synthetic (Conventional) |
| 1033 | select option | 🌿 Organic/Natural (Neem, Pyrethrin, etc.) |
| 1036 | select option | 🦠 Biological (Bt, Spinosad, etc.) |
| 1045 | select option | 🏭 Synthetic (Glyphosate, 2,4-D, Atrazine, etc.) |
| 1048 | select option | 🌿 Organic/Natural (Vinegar, Acetic Acid, Clove Oil, etc.) |
| 1057 | select option | 🏭 Synthetic (Chlorothalonil, Mancozeb, etc.) |
| 1060 | select option | 🌿 Organic/Natural (Neem Oil, Potassium Bicarbonate, etc.) |
| 1063 | select option | 🟤 Copper-Based (Bordeaux Mix, Copper Sulfate, Kocide, etc.) |
| 1066 | select option | 🟡 Sulfur-Based |
| 1067 | select option | 🦠 Biological (Bacillus, Trichoderma, etc.) |
| 1081 | label | Organic Approved |
| 1088 | placeholder | Select organic status... |
| 1089 | select option | ✅ OMRI Listed - Organic certified |
| 1092 | select option | 🌱 USDA NOP Approved - National Organic Program |
| 1095 | select option | 🌿 Organic Equivalent - Meets organic standards |
| 1098 | select option | ❌ Not Organic Approved - Conventional use only |
| 1101 | select option | 🔄 Transitional - In certification process |
| 1123 | JSX text | Summary Mode |
| 1194 | JSX text | Aggregate Application Period |
| 1200 | label | Period Start Date |
| 1214 | label | Period End Date |
| 1229 | label | Number of Applications |
| 1241 | placeholder | e.g., 6 |
| 1249 | JSX text | Total NPK Applied (for Carbon Calculation) |
| 1255 | label | Total Nitrogen (kg) |
| 1268 | placeholder | e.g., 120 |
| 1276 | label | Total Phosphorus (kg) |
| 1288 | placeholder | e.g., 60 |
| 1296 | label | Total Potassium (kg) |
| 1308 | placeholder | e.g., 60 |
| 1318 | label | Total Volume Applied |
| 1331 | placeholder | e.g., 1200 |
| 1341 | select option | Liters |
| 1342 | select option | Gallons |
| 1343 | select option | Kilograms |
| 1351 | label | Total Area Treated |
| 1364 | placeholder | e.g., 50 |
| 1374 | select option | Hectares |
| 1375 | select option | Acres |
| 1385 | label | Equipment Fuel Type (optional) |
| 1394 | placeholder | Select fuel type... |
| 1398 | select option | {type.label} ({type.factor}) |
| 1408 | label | Total Equipment Fuel |
| 1419 | placeholder | e.g., 24 |
| 1426 | label | Fuel Unit |
| 1432 | select option | Gallons |
| 1433 | select option | Liters |
| 1434 | select option | Kilowatt-hours |
| 1452 | JSX text | Carbon Calculation Method |
| 1460 | JSX text | IPCC 2006 & EPA 40 CFR Part 98 verified emission factors |
| 1479 | JSX text | Aggregate Application Period |
| 1485 | label | Period Start Date |
| 1499 | label | Period End Date |
| 1514 | label | Number of Applications |
| 1526 | placeholder | e.g., 12 |
| 1534 | JSX text | Active Ingredient Total (for Carbon Calculation) |
| 1539 | label | Total Active Ingredient (kg) |
| 1552 | placeholder | e.g., 48 |
| 1561 | label | Total Volume Applied |
| 1574 | placeholder | e.g., 600 |
| 1584 | select option | Liters |
| 1585 | select option | Gallons |
| 1593 | label | Total Area Treated |
| 1606 | placeholder | e.g., 50 |
| 1616 | select option | Hectares |
| 1617 | select option | Acres |
| 1627 | label | Equipment Fuel Type (optional) |
| 1636 | placeholder | Select fuel type... |
| 1640 | select option | {type.label} ({type.factor}) |
| 1650 | label | Total Equipment Fuel |
| 1661 | placeholder | e.g., 24 |
| 1668 | label | Fuel Unit |
| 1674 | select option | Gallons |
| 1675 | select option | Liters |
| 1676 | select option | Kilowatt-hours |
| 1694 | JSX text | Carbon Calculation Method |
| 1702 | JSX text | Emission factors: |
| 1705 | JSX text | Source: Lal 2004, Audsley et al. |
| 1722 | JSX text | Aggregate Application Period |
| 1728 | label | Period Start Date |
| 1742 | label | Period End Date |
| 1757 | label | Number of Applications |
| 1768 | placeholder | e.g., 8 |
| 1778 | JSX text | Pesticide Totals for Carbon Calculation |
| 1783 | label | Total Active Ingredient (kg) |
| 1795 | placeholder | e.g., 12.5 |
| 1803 | label | Total Volume Applied |
| 1814 | placeholder | e.g., 2400 |
| 1821 | label | Total Area Treated |
| 1832 | placeholder | e.g., 80 |
| 1842 | JSX text | Equipment Fuel Usage |
| 1848 | label | Equipment Fuel Type |
| 1855 | placeholder | Select fuel type... |
| 1857 | select option | {type.label} ({type.factor}) |
| 1867 | label | Total Fuel Consumed |
| 1878 | placeholder | e.g., 18 |
| 1884 | label | Fuel Unit |
| 1890 | select option | Gallons (gal) |
| 1891 | select option | Liters (L) |
| 1892 | select option | Kilowatt-hours (kWh) |
| 1910 | JSX text | Carbon Calculation Method |
| 1923 | JSX text | Source: Lal 2004, Audsley et al. |
| 1930 | label | Commercial Name / Product |
| 1942 | placeholder | e.g., Miracle-Gro All Purpose, Roundup WeatherMAX |
| 1951 | label | Active Ingredient (Optional) |
| 1959 | placeholder | e.g., Glyphosate, NPK 10-10-10 |
| 1971 | title/heading | Application Rate & Coverage |
| 1974 | description | Accurate application rates are essential for calculating the environmental impact of your chemical applications. |
| 2024 | select option | {intl.formatMessage({                                       id: 'app.unit.liters',                                       defaultMessage: 'Liters (L)'                                     })} |
| 2030 | select option | {intl.formatMessage({                                       id: 'app.unit.gallons',                                       defaultMessage: 'Gallons (gal)'                                     })} |
| 2036 | select option | {intl.formatMessage({                                       id: 'app.unit.milliliters',                                       defaultMessage: 'Milliliters (mL)'                                     })} |
| 2042 | select option | {intl.formatMessage({                                       id: 'app.unit.fluidOunces',                                       defaultMessage: 'Fluid Ounces (oz)'                                     })} |
| 2048 | select option | {intl.formatMessage({                                       id: 'app.unit.kilograms',                                       defaultMessage: 'Kilograms (kg)'                                     })} |
| 2054 | select option | {intl.formatMessage({                                       id: 'app.unit.pounds',                                       defaultMessage: 'Pounds (lbs)'                                     })} |
| 2110 | select option | {intl.formatMessage({                                       id: 'app.unit.hectares',                                       defaultMessage: 'Hectares (ha)'                                     })} |
| 2116 | select option | {intl.formatMessage({                                       id: 'app.unit.acres',                                       defaultMessage: 'Acres'                                     })} |
| 2122 | select option | {intl.formatMessage({                                       id: 'app.unit.squareMeters',                                       defaultMessage: 'Square meters (m²)'                                     })} |
| 2279 | label | Application Method |
| 2289 | select option | Select application method... |
| 2294 | select option | 📡 Broadcast - Surface or incorporated spreading |
| 2297 | select option | 📏 Banded - Precise row/band placement |
| 2300 | select option | 💉 Subsurface - Below soil surface injection |
| 2303 | select option | 💧 Fertigation - Through irrigation system |
| 2306 | select option | 🌿 Foliar - Leaf surface application |
| 2313 | select option | 🌊 Ground Spray - Spray application to crops/soil |
| 2316 | select option | 💧 Chemigation - Through irrigation system |
| 2319 | select option | 🌱 Seed Treatment - Pre-planting seed coating |
| 2322 | select option | 🔄 Soil Incorporation - Mixed into soil |
| 2331 | select option | 🌊 Ground Spray - Pre/post-emergent spray |
| 2334 | select option | 💧 Chemigation - Through irrigation system |
| 2337 | select option | 🌱 Seed Treatment - Pre-planting application |
| 2340 | select option | 🔄 Soil Incorporation - Mixed into soil |
| 2349 | select option | 🌊 Ground Spray - Foliar or soil spray |
| 2352 | select option | 💧 Chemigation - Through irrigation system |
| 2355 | select option | 🌱 Seed Treatment - Preventive coating |
| 2358 | select option | 🔄 Soil Incorporation - Soil drench/mix |
| 2367 | select option | 📡 Broadcast - Surface spreading |
| 2368 | select option | 🌊 Ground Spray - Spray application |
| 2371 | select option | 💧 Chemigation - Through irrigation |
| 2374 | select option | 🌿 Foliar - Leaf application |
| 2375 | select option | 🔄 Soil Incorporation - Mixed into soil |
| 2387 | label | Application Details |
| 2396 | placeholder | e.g., Tractor-mounted boom sprayer, incorporated 4 inches deep |
| 2409 | title/heading | Environmental Context |
| 2415 | label | Weather Conditions |
| 2424 | select option | Select conditions... |
| 2425 | select option | ☀️ Calm & Dry - Ideal conditions |
| 2426 | select option | 🌥️ Overcast & Humid - Good for herbicides |
| 2429 | select option | 🌬️ Light Wind - Suitable conditions |
| 2430 | select option | 💨 Humid - Acceptable conditions |
| 2431 | select option | 🌪️ Windy - Challenging conditions |
| 2438 | label | Application Timing |
| 2447 | select option | Select timing... |
| 2448 | select option | 🌱 Pre-Planting |
| 2449 | select option | 🌿 Post-Emergence |
| 2450 | select option | 🌸 Flowering Stage |
| 2451 | select option | 🍎 Fruit Development |
| 2452 | select option | 🚜 Pre-Harvest |
| 2453 | select option | 🌾 Post-Harvest |
| 2460 | label | Target Pest/Disease/Need |
| 2470 | placeholder | e.g., Aphid control, Nutrient deficiency, Weed suppression |
| 2479 | label | Buffer Zone (meters) |
| 2492 | placeholder | e.g., 15 |
| 2509 | JSX text | Consumer Trust Information |
| 2529 | title/heading | Supplier & Purchase Tracking |
| 2532 | description | Document input suppliers and purchase records for organic mass-balance audits. The #1 non-conformance finding nationally is inadequate mass-balance documentation. |
| 2538 | label | Supplier Name |
| 2547 | placeholder | e.g., Hydra-Gardens Inc. (Neptune's Harvest) |
| 2554 | label | Purchase Date |
| 2578 | label | Purchase Invoice / Reference |
| 2585 | placeholder | e.g., INV-HG-2026-0142 |
| 2599 | JSX text | NOP Mass-Balance Audit |
| 2638 | title/heading | CA DPR Restricted Materials Permit |
| 2641 | description | This input is a California county-restricted material (3 CCR 6400 et seq.). Even when NOP-allowed under 7 CFR 205.601, a county Ag Commissioner permit is required before application. |
| 2646 | label | Permit Number |
| 2655 | placeholder | e.g., SD-2026-00147 |
| 2661 | label | Issuing County |
| 2668 | placeholder | e.g., San Diego |
| 2674 | label | Permit Expires |
| 2691 | JSX text | Enforcement: |
| 2710 | title/heading | Application Equipment & Fuel Usage |
| 2713 | description | Document your sprayer, spreader, or other application equipment fuel consumption for accurate carbon calculations. Electric equipment has significantly lower carbon impact than diesel. |
| 2720 | label | Application Equipment Fuel Type |
| 2727 | placeholder | Select fuel type... |
| 2729 | select option | {type.label} ({type.factor}) |
| 2774 | select option | Liters |
| 2775 | select option | Gallons |
| 2776 | select option | Kilograms |
| 2777 | select option | Kilowatt-hours |
| 2796 | JSX text | Electric Equipment: |
| 2815 | JSX text | Application Carbon Tracking |
| 2836 | title/heading | Safety & Compliance |
| 2849 | label | Applicator Name |
| 2857 | placeholder | Enter applicator name |
| 2863 | label | EPA Registration Number |
| 2871 | placeholder | e.g., 12345-67 |
| 2879 | label | Restricted Use Pesticide (RUP) |
| 2889 | JSX text | This product is classified as Restricted Use |
| 2894 | JSX text | RESTRICTED |
| 2920 | label | Applicator Certification Number |
| 2933 | placeholder | e.g., CA-12345-AG |
| 2939 | JSX text | Safety Intervals |
| 2944 | label | REI (Restricted Entry Interval) |
| 2967 | label | PHI (Pre-Harvest Interval) |
| 3048 | placeholder | Select growth stage... |
| 3049 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })} |
| 3052 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })} |
| 3055 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })} |
| 3058 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })} |
| 3061 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.vegetative' })} |
| 3064 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.maturation' })} |
| 3067 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.harvest_ready' })} |
| 3070 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.post_harvest' })} |
| 3085 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 3090 | label | Observations & Notes |
| 3100 | placeholder | Optional: Describe the purpose of this chemical application, environmental conditions, safety measures taken, or any observations that consumers might find valuable. |

### `SoilManagementTab.jsx` (src/views/Dashboard/Dashboard/components/forms/SoilManagementTab.jsx) — 165 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 617 | title/heading | Soil Management & Transparency Documentation |
| 640 | title/heading | Soil Management Details |
| 655 | placeholder | Select soil management type |
| 658 | select option | Soil Testing |
| 659 | select option | Soil Amendment |
| 660 | select option | Cover Crop Management |
| 661 | select option | Organic Matter Addition |
| 662 | select option | Tillage |
| 663 | select option | Composting Operation |
| 664 | select option | Grazing Management |
| 669 | label | Event Name |
| 674 | placeholder | e.g., Spring Tillage - North Field |
| 680 | label | Area Covered |
| 694 | select option | Hectares |
| 695 | select option | Acres |
| 700 | label | Working Depth |
| 711 | select option | Centimeters |
| 712 | select option | Inches |
| 735 | title/heading | Fuel & Equipment Operations |
| 738 | description | Document your equipment usage, fuel consumption, and operational details to build consumer trust through transparent farming practices. |
| 744 | label | Fuel Type |
| 747 | placeholder | Select fuel type... |
| 749 | select option | {type.label} ({type.factor}) |
| 775 | select option | Liters |
| 776 | select option | Gallons |
| 777 | select option | Kilograms |
| 778 | select option | Kilowatt-hours |
| 784 | label | Equipment Hours |
| 796 | label | Production Efficiency |
| 800 | select option | Select efficiency level |
| 801 | select option | High Efficiency |
| 802 | select option | Normal Efficiency |
| 803 | select option | Low Efficiency |
| 808 | label | Equipment Used |
| 813 | placeholder | e.g., tractor with disc harrow, soil auger |
| 824 | title/heading | Electric Equipment |
| 825 | description | Enter energy consumption in kilowatt-hours (kWh). Grid electricity uses 0.39 kg CO₂/kWh. Solar/wind powered equipment has zero emissions. |
| 833 | title/heading | Building Consumer Trust |
| 834 | description | Documenting actual fuel consumption and equipment usage provides consumers with complete transparency into your farming operations. |
| 845 | title/heading | Soil Amendment Details |
| 848 | description | Document lime or soil amendment application for accurate carbon emissions calculation using IPCC 2006 methodology. |
| 853 | label | Amendment Type |
| 857 | placeholder | Select amendment type |
| 860 | select option | Limestone (CaCO3) - 0.44 kg CO2/kg |
| 861 | select option | Dolomite (CaMg(CO3)2) - 0.477 kg CO2/kg |
| 862 | select option | Quick Lime (CaO) - High reactivity |
| 863 | select option | Hydrated Lime (Ca(OH)2) |
| 864 | select option | Gypsum (CaSO4) - No CO2 emissions |
| 865 | select option | Compost - Organic amendment |
| 866 | select option | Manure - Organic fertilizer |
| 867 | select option | Other Amendment |
| 872 | label | Amendment Amount |
| 885 | select option | Metric Tons |
| 886 | select option | Pounds |
| 887 | select option | Short Tons (US) |
| 893 | label | Application Depth |
| 915 | title/heading | IPCC 2006 Lime Dissolution Methodology |
| 916 | description | Carbon emissions from lime application are calculated using IPCC 2006 guidelines. Limestone (CaCO₃) releases 0.44 kg CO₂ per kg applied, while dolomite releases 0.477 kg CO₂ per kg. Gypsum and organic amendments do not directly release CO₂. |
| 928 | title/heading | NOP Organic Compliance |
| 931 | description | Documentation required for USDA organic certification. Track amendment approval status and, for composting, temperature/duration/turning records. |
| 935 | label | Amendment Organic Approval |
| 939 | placeholder | Select organic approval status |
| 942 | select option | OMRI Listed - Organic certified |
| 943 | select option | USDA NOP Approved - National Organic Program |
| 946 | select option | Organic Equivalent - Meets organic standards |
| 949 | select option | Transitional - In certification process |
| 952 | select option | Not Organic Approved - Conventional use only |
| 955 | select option | Not Applicable |
| 965 | title/heading | Compost Process Requirements (7 CFR 205.203(c)(2)) |
| 966 | description | Initial C:N must be 25:1–40:1. Temp must reach 131–170°F. Windrow requires 15+ days at temp with 5+ turnings; static aerated / in-vessel require 3+ days at temp. C:N outside range disqualifies the pile as NOP compost — it reverts to raw manure under (c)(1). |
| 970 | label | Compost Method |
| 974 | placeholder | Select method... |
| 977 | select option | Windrow (turned, open air) |
| 978 | select option | Static Aerated Pile |
| 979 | select option | In-Vessel |
| 983 | label | Initial C:N Ratio |
| 991 | placeholder | e.g., 30 |
| 998 | label | Peak Temperature (°F) |
| 1006 | placeholder | e.g., 158 |
| 1011 | label | Days at Temperature |
| 1019 | placeholder | e.g., 21 |
| 1024 | label | Number of Turnings |
| 1032 | placeholder | e.g., 7 |
| 1046 | title/heading | Raw Manure Harvest Interval (7 CFR 205.203(c)(1)) |
| 1047 | description | Raw manure: 120 days pre-harvest if edible portion contacts soil, 90 days otherwise. N/A if manure is composted. |
| 1051 | label | Manure Harvest Interval |
| 1055 | placeholder | Select harvest interval |
| 1058 | select option | 120 days — edible portion contacts soil (root crops, leafy greens) |
| 1061 | select option | 90 days — edible portion does NOT contact soil (tree fruit,                                 trellised) |
| 1065 | select option | N/A — composted manure or no manure applied |
| 1071 | label | Manure Application Date |
| 1087 | title/heading | Soil Properties |
| 1125 | label | Soil Texture |
| 1129 | placeholder | Select soil texture |
| 1132 | select option | Clay |
| 1133 | select option | Clay Loam |
| 1134 | select option | Loam |
| 1135 | select option | Sandy Loam |
| 1136 | select option | Sand |
| 1137 | select option | Silt |
| 1138 | select option | Silt Loam |
| 1151 | title/heading | Tillage Operation Details |
| 1154 | description | Provide specific tillage details for accurate carbon impact assessment. Tillage practices significantly affect soil carbon sequestration and emissions. |
| 1159 | label | Tillage Type |
| 1163 | placeholder | Select tillage type |
| 1166 | select option | 🚜 Conventional Plow - Deep inversion |
| 1169 | select option | ⚡ Chisel Plow - Reduced tillage |
| 1170 | select option | 💿 Disk Harrow - Surface cultivation |
| 1171 | select option | 🌱 No-Till - Direct seeding |
| 1172 | select option | 📏 Strip Till - Zonal tillage |
| 1173 | select option | 🔄 Minimum Till - Conservation |
| 1174 | select option | 🔧 Subsoiling - Deep loosening |
| 1175 | select option | 🌾 Cultivator - Shallow cultivation |
| 1180 | label | Tillage Intensity |
| 1184 | placeholder | Select intensity |
| 1187 | select option | High - Heavy disturbance |
| 1188 | select option | Medium - Moderate disturbance |
| 1189 | select option | Low - Minimal disturbance |
| 1190 | select option | Conservation - Protective tillage |
| 1195 | label | Tillage Direction |
| 1199 | placeholder | Select direction |
| 1202 | select option | 🏔️ Across Slope - Erosion control |
| 1203 | select option | ⬇️ Up/Down Slope - Standard |
| 1204 | select option | 🌀 Contour - Following natural lines |
| 1205 | select option | 🔀 Random - Variable direction |
| 1210 | label | Residue Management |
| 1214 | placeholder | Select residue management |
| 1217 | select option | ♻️ Incorporated - Mixed into soil |
| 1218 | select option | 🌾 Surface Left - Protective cover |
| 1219 | select option | 🚛 Removed - Harvested/burned |
| 1220 | select option | 🍂 Mulched - Chopped in place |
| 1221 | select option | 📏 Partial Removal - Mixed approach |
| 1231 | title/heading | Carbon Impact Tip |
| 1232 | description | No-till and conservation tillage practices typically sequester more carbon and reduce emissions compared to conventional tillage. Leaving crop residues incorporated or on the surface also improves carbon retention. |
| 1244 | title/heading | Grazing Details |
| 1247 | description | Document grazing activities for cover crop management, weed control, and soil health. |
| 1250 | label | Animal Type |
| 1252 | placeholder | Select animal type... |
| 1255 | select option | Sheep |
| 1256 | select option | Goats |
| 1257 | select option | Cattle |
| 1258 | select option | Poultry |
| 1259 | select option | Other |
| 1263 | label | Number of Animals |
| 1268 | placeholder | e.g., 50 |
| 1273 | label | Grazing Duration (Days) |
| 1278 | placeholder | e.g., 14 |
| 1283 | label | Grazing Purpose |
| 1287 | placeholder | Select purpose... |
| 1290 | select option | Weed Control |
| 1291 | select option | Cover Crop Termination |
| 1292 | select option | Soil Health |
| 1293 | select option | Vegetation Management |
| 1357 | placeholder | Select growth stage... |
| 1358 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })} |
| 1361 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })} |
| 1364 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })} |
| 1367 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })} |
| 1370 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.vegetative' })} |
| 1373 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.maturation' })} |
| 1376 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.harvest_ready' })} |
| 1379 | select option | {intl.formatMessage({ id: 'fieldDetails.growthStage.post_harvest' })} |
| 1393 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 1398 | label | Observations & Notes |
| 1402 | placeholder | Optional: Describe your soil management approach, goals for soil health, organic practices used, sustainability goals, etc. These details help consumers understand your farming methods. |

### `PestManagementTab.jsx` (src/views/Dashboard/Dashboard/components/forms/PestManagementTab.jsx) — 115 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 443 | title/heading | Pest Management & Transparency Documentation |
| 446 | JSX text | Integrated Pest Management Transparency |
| 472 | title/heading | Pest Management Event Information |
| 488 | select option | {intl.formatMessage({ id: 'app.scouting' }) \|\| 'Scouting'} |
| 491 | select option | {intl.formatMessage({ id: 'app.beneficialRelease' }) \|\|                             'Beneficial Release'} |
| 495 | select option | {intl.formatMessage({ id: 'app.trapMonitoring' }) \|\| 'Trap Monitoring'} |
| 498 | select option | {intl.formatMessage({ id: 'app.pestIdentification' }) \|\|                             'Pest Identification'} |
| 502 | select option | {intl.formatMessage({ id: 'app.thresholdAssessment' }) \|\|                             'Threshold Assessment'} |
| 506 | select option | {intl.formatMessage({ id: 'app.impImplementation' }) \|\|                             'IPM Implementation'} |
| 521 | placeholder | e.g., Pest Scouting, Beneficial Release |
| 545 | JSX text | Active |
| 579 | JSX text | Zero Carbon Impact - Scouting is observational |
| 598 | JSX text | Aggregate Scouting Period |
| 604 | label | Period Start Date |
| 612 | label | Period End Date |
| 621 | label | Number of Scouting Trips |
| 629 | placeholder | e.g., 24 |
| 637 | JSX text | Aggregate Area & Distance |
| 643 | label | Total Field Area Covered |
| 656 | placeholder | e.g., 120 |
| 665 | select option | Hectares |
| 666 | select option | Acres |
| 675 | label | Total Fuel Consumed |
| 689 | placeholder | e.g., 5.5 |
| 698 | select option | Liters |
| 699 | select option | Gallons |
| 700 | select option | Kilograms |
| 701 | select option | Kilowatt-hours |
| 712 | JSX text | Pest Observations Summary |
| 717 | label | Pest Species Observed |
| 726 | placeholder | e.g., aphids, whitefly, thrips, spider mites |
| 733 | label | Average Pest Pressure Level |
| 741 | select option | Select pressure level |
| 742 | select option | None - No pests observed |
| 743 | select option | Low - Below treatment threshold |
| 744 | select option | Moderate - At treatment threshold |
| 745 | select option | High - Above treatment threshold |
| 746 | select option | Severe - Immediate action required |
| 768 | JSX text | Zero Carbon Impact |
| 772 | JSX text | Pest scouting is observational and does not produce direct emissions. |
| 775 | JSX text | Transparency Score Bonus: |
| 778 | JSX text | Source: FAO Integrated Pest Management Guidelines |
| 791 | title/heading | Field Area & Context |
| 799 | label | Area Covered |
| 813 | select option | Hectares |
| 814 | select option | Acres |
| 828 | title/heading | Fuel Consumption & Equipment Data |
| 831 | description | Document your actual equipment usage and fuel consumption to build consumer trust through transparent farming practices. These details help consumers understand the real operational impact of your production operations. |
| 837 | label | Fuel Type |
| 841 | placeholder | Select fuel type... |
| 845 | select option | {type.label} ({type.factor}) |
| 877 | select option | Liters |
| 878 | select option | Gallons |
| 879 | select option | Kilograms |
| 880 | select option | Kilowatt-hours |
| 887 | label | Equipment Operating Hours |
| 894 | placeholder | e.g., 3.5 |
| 901 | label | Production Efficiency |
| 905 | select option | Select efficiency level |
| 906 | select option | High Efficiency |
| 907 | select option | Normal Efficiency |
| 908 | select option | Low Efficiency |
| 920 | title/heading | Agricultural Context & Conditions |
| 927 | label | Crop Growth Stage |
| 931 | select option | Select growth stage |
| 932 | select option | Seedling |
| 933 | select option | Vegetative Growth |
| 934 | select option | Flowering |
| 935 | select option | Fruit Development |
| 936 | select option | Maturity |
| 937 | select option | Harvest |
| 945 | label | Economic Threshold Status |
| 949 | select option | Select status |
| 950 | select option | Yes - Economic threshold met, action recommended |
| 953 | select option | No - Below economic threshold |
| 958 | label | Action Recommended |
| 963 | placeholder | e.g., continue monitoring, apply treatment |
| 977 | title/heading | Pest Management Details |
| 990 | placeholder | e.g., Aphids, Spider mites, Thrips |
| 1036 | select option | Select pressure level |
| 1037 | select option | {intl.formatMessage({ id: 'app.low' }) \|\| 'Low'} |
| 1040 | select option | {intl.formatMessage({ id: 'app.medium' }) \|\| 'Medium'} |
| 1043 | select option | {intl.formatMessage({ id: 'app.high' }) \|\| 'High'} |
| 1046 | select option | {intl.formatMessage({ id: 'app.critical' }) \|\| 'Critical'} |
| 1055 | label | Action Threshold Met |
| 1065 | select option | Select status |
| 1066 | select option | {intl.formatMessage({ id: 'app.actionThresholdMet' }) \|\|                                   'Yes - Economic threshold met, action required'} |
| 1070 | select option | No - Below action threshold |
| 1095 | placeholder | e.g., Ladybugs, Lacewings, Predatory mites |
| 1111 | placeholder | e.g., 1000 individuals per hectare |
| 1161 | title/heading | Consumer Trust & Transparency |
| 1164 | description | Document your sustainable pest management practices to help consumers understand your commitment to environmentally responsible farming. |
| 1168 | label | Beneficial Insects Used |
| 1172 | select option | Select status |
| 1173 | select option | Yes - Using beneficial insects |
| 1174 | select option | No - Not currently using |
| 1175 | select option | Planning to introduce |
| 1180 | label | Chemical-Free Period (Days) |
| 1188 | placeholder | e.g., 30 |
| 1203 | title/heading | NOP Pest Identification & Threshold Traceability |
| 1206 | description | Required documentation for NOP organic certification: pest identification verification and action threshold rationale (7 CFR 205.206). |
| 1213 | label | Pest Identified By |
| 1217 | select option | Select identifier |
| 1218 | select option | Farmer |
| 1219 | select option | Agronomist |
| 1220 | select option | Entomologist |
| 1221 | select option | Extension Service |
| 1222 | select option | Crop Consultant |
| 1223 | select option | Laboratory Analysis |
| 1230 | label | Identification Method |
| 1235 | placeholder | e.g., Visual inspection using 10x hand lens, UC Davis IPM field guide |
| 1245 | label | Threshold Rationale |
| 1250 | placeholder | e.g., Avg 2.3 thrips/leaf on 20 sample trees, below 5/leaf economic threshold per UC Davis IPM guidelines... |
| 1315 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 1326 | placeholder | Optional: Describe your IPM approach, beneficial insect populations observed, organic methods used, sustainability goals, etc. These details help consumers understand your natural pest management methods. |

### `WeatherTab.jsx` (src/views/Dashboard/Dashboard/components/forms/WeatherTab.jsx) — 47 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 519 | title/heading | Weather Event & Transparency Documentation |
| 522 | JSX text | Agricultural Climate Transparency |
| 548 | title/heading | Weather Event Information |
| 555 | label | Weather Event Type |
| 564 | placeholder | Select weather event type |
| 565 | select option | Frost |
| 566 | select option | Drought |
| 567 | select option | Hailstorms |
| 568 | select option | High Temperatures |
| 569 | select option | Tropical Storm |
| 570 | select option | High Winds |
| 571 | select option | High Humidity |
| 572 | select option | Low Humidity |
| 580 | label | Event Name |
| 600 | title/heading | Weather Details & Measurements |
| 608 | label | Lower Temperature |
| 619 | placeholder | e.g., 28 (°F) or -2 (°C) |
| 625 | select option | °F |
| 626 | select option | °C |
| 632 | label | Protection Method |
| 637 | placeholder | e.g., frost blankets, irrigation |
| 645 | label | Water Deficit (mm) |
| 663 | label | Duration (minutes) |
| 677 | label | Protection Method |
| 682 | placeholder | e.g., hail nets, covered structures |
| 690 | label | Highest Temperature |
| 701 | placeholder | e.g., 105 (°F) or 42 (°C) |
| 707 | select option | °F |
| 708 | select option | °C |
| 714 | label | Start Date |
| 720 | label | End Date |
| 729 | label | Wind Speed (km/h) |
| 743 | label | Precipitation Amount (mm) |
| 757 | label | Duration (hours) |
| 771 | label | Damage Assessment |
| 776 | placeholder | e.g., minor leaf damage, no structural damage |
| 784 | label | Wind Speed (km/h) |
| 798 | label | Duration (hours) |
| 812 | label | Protection Measures |
| 817 | placeholder | e.g., secured equipment, protected young plants |
| 825 | label | Humidity Level (%) |
| 839 | label | Duration (hours) |
| 853 | label | Crop Impact |
| 858 | placeholder | e.g., increased disease pressure, slower growth |
| 872 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 878 | label | Observations & Notes |
| 882 | placeholder | Optional: Describe how this weather event affected your farming operations, what measures you took, and how it impacts the quality or safety of your produce. |

### `GeneralTab.jsx` (src/views/Dashboard/Dashboard/components/forms/GeneralTab.jsx) — 42 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 63 | desc (data obj) | Facility repairs, cleaning, organization |
| 68 | desc (data obj) | Crop planning, scheduling, strategy meetings |
| 73 | desc (data obj) | Staff training, certifications, learning |
| 78 | desc (data obj) | Documentation, filing, data entry |
| 83 | desc (data obj) | Quality checks, audits, compliance reviews |
| 88 | desc (data obj) | Staff coordination, planning sessions |
| 93 | desc (data obj) | Farm tours, community events, outreach |
| 98 | desc (data obj) | Drone surveys, sensor readings, GPS mapping |
| 103 | desc (data obj) | Storm cleanup, damage repair, emergency actions |
| 108 | desc (data obj) | Activities not covered by other categories |
| 346 | title/heading | Other Farm Activities & Transparency Documentation |
| 349 | JSX text | When to use this category: |
| 371 | title/heading | Other Farm Activity Information |
| 395 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 419 | title/heading | Additional Context |
| 446 | title/heading | Other Farm Activity Information |
| 453 | label | Activity Type |
| 462 | placeholder | Select activity type... |
| 464 | select option | {type.label} |
| 474 | label | Activity Name |
| 485 | placeholder | e.g., Weekly equipment maintenance |
| 499 | title/heading | Activity Details & Context |
| 506 | label | Duration (hours) |
| 518 | placeholder | e.g., 2.5 |
| 525 | label | People Involved |
| 533 | placeholder | e.g., 2 |
| 546 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 551 | label | Observations & Notes |
| 561 | placeholder | Optional: Describe the purpose of this activity, how it contributes to farm operations, quality improvements made, or any interesting observations that consumers might find valuable. |
| 584 | title/heading | NOP Contamination Incident |
| 600 | JSX text | Is this event documenting a contamination incident? |
| 629 | label | Contamination Source |
| 638 | placeholder | Select source... |
| 640 | select option | {opt.label} |
| 650 | label | Affected Area (acres) |
| 663 | placeholder | e.g., 3.5 |
| 671 | label | Corrective Action Taken |
| 681 | placeholder | Describe the corrective actions taken in response to this incident. |
| 690 | label | Corrective Action Date |
| 713 | JSX text | Certifier Notified? |
| 716 | JSX text | NOP requires notifying the certifying agent of contamination events. |
| 739 | label | Certifier Notification Date |

### `BusinessTab-SIMPLIFIED.jsx` (src/views/Dashboard/Dashboard/components/forms/BusinessTab-SIMPLIFIED.jsx) — 49 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 262 | title/heading | Agricultural Transparency Documentation |
| 264 | JSX text | Building Consumer Trust Through Verification |
| 290 | title/heading | Trust-Building Business Activity |
| 297 | label | Business Activity Type |
| 308 | placeholder | Select business activity type... |
| 310 | select option | Certification Achievement (Organic, Fair Trade, etc.) |
| 313 | select option | Third-Party Verification Completed |
| 316 | select option | Sustainability Assessment Passed |
| 319 | select option | Transparency Initiative Launched |
| 320 | select option | Carbon Credits Earned |
| 321 | select option | Regulatory Compliance Achieved |
| 329 | label | Event Name |
| 342 | label | Verification Status |
| 351 | select option | Pending Verification |
| 352 | select option | Verified |
| 353 | select option | Verification In Progress |
| 354 | select option | Verification Failed |
| 355 | select option | Not Applicable |
| 383 | placeholder | Select certification type... |
| 384 | select option | Select certification... |
| 385 | select option | USDA Organic |
| 386 | select option | Carbon Neutral Certification |
| 387 | select option | Rainforest Alliance |
| 388 | select option | Fair Trade Certified |
| 389 | select option | Regenerative Organic Certified |
| 390 | select option | Sustainable Agriculture Standard |
| 393 | select option | Water Stewardship Certification |
| 397 | select option | GlobalG.A.P. Certification |
| 398 | select option | Non-GMO Project Verified |
| 399 | select option | Certified Naturally Grown (CNG) |
| 402 | select option | Food Safety (Primus GFS, SQF, BRC) |
| 475 | label | Carbon Credits Earned |
| 495 | label | Unit |
| 501 | select option | tCO2e (tonnes CO2 equivalent) |
| 502 | select option | kgCO2e (kilograms CO2 equivalent) |
| 503 | select option | Carbon Credits (units) |
| 518 | title/heading | Sustainability Practice |
| 523 | label | Sustainability Practice Implemented |
| 532 | select option | Select practice... |
| 533 | select option | Cover Cropping Implementation |
| 534 | select option | No-Till Farming Adoption |
| 535 | select option | Integrated Pest Management |
| 536 | select option | Water Conservation Measures |
| 537 | select option | Renewable Energy Installation |
| 538 | select option | On-Farm Composting Program |
| 539 | select option | Biodiversity Conservation |
| 540 | select option | Soil Health Improvement |
| 552 | title/heading | Farmer's Field Notes & Consumer Transparency |
| 599 | placeholder | Optional: Describe how this certification or business activity improves transparency, e.g., Certification process improved carbon tracking accuracy, new practice reduced emissions by 15%... |

### `QuickAddEvent.tsx` (src/views/Dashboard/Dashboard/Production/QuickAddEvent.tsx) — 6 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 1851 | JSX text | No AI suggestions available at the moment |
| 1868 | JSX text | AI Reasoning |
| 1878 | JSX text | Best Practices: |
| 1913 | JSX text | Voice input is available on Basic ($69/mo) and higher plans. Upgrade to capture farm events by simply speaking. |
| 1932 | JSX text | Tap to describe your farming activity by voice |
| 2080 | JSX text | Database Optimized |

### `VoiceEventCapture.tsx` (src/components/Events/VoiceEventCapture.tsx) — 8 hardcoded English strings

| Line | Kind | String |
|---|---|---|
| 167 | toast title | Voice Connection Error |
| 386 | JSX text | Voice Event Capture |
| 389 | JSX text | Describe your farming activity and we'll fill in the form for you |
| 457 | JSX text | Listening... |
| 466 | JSX text | Speak naturally — auto-stops when you pause |
| 589 | JSX text | Continue to Review |
| 598 | JSX text | Try Again |
| 609 | JSX text | Try saying: |

## Notes & caveats
- (d) Hardcoded Spanish = **0** in all 9 files (consistent with English-default codebase).
- `QuickAddEvent.tsx` and the form tabs delegate creation toasts to the parent; QuickAddEvent's own toasts ARE i18n'd. Its 6 hardcoded items are JSX text (AI-suggestion panel, voice-upgrade copy).
- The 7 form tabs have NO `toast()` calls of their own (0 each); validation/submit toasts live in `NewEvent.jsx` (parent, out of audit scope but worth a follow-up).
- `GeneralTab.jsx` 'desc (data obj)' rows are category-config `description:` fields rendered as visible helper text under each event-category card — counted as hardcoded UI.
- JSX-text heuristic may include a small number of borderline strings (e.g. units inside computed labels); the option/label/placeholder/title/description rows are high-confidence.
- WeatherTab, GeneralTab, BusinessTab-SIMPLIFIED are almost entirely hardcoded English (2-3 i18n keys each) despite the dictionary being fully translated — these are the lowest-coverage tabs.