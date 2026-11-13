/**
 * Type surface for `historyApi.js`.
 *
 * WHY A .d.ts AND NOT A .ts
 * -------------------------
 * There used to be a `historyApi.ts` alongside `historyApi.js`. They were different modules
 * with the same import specifier: Vite resolves `.js` before `.ts` (default
 * `resolve.extensions`), so the app ran the `.js` (22 hooks, current), while TypeScript and
 * knip both resolved the `.ts` (April, a subset). The consequences were invisible until the
 * typecheck gate was run again in August 2026 — 20 importers were being checked against a
 * module they never execute, `useGetFarmScansPaginatedQuery` looked "not exported" on the
 * Buyer page while working fine at runtime, and knip listed the LIVE module as unused, which
 * would have deleted it during a dead-code sweep.
 *
 * A `.d.ts` cannot become a second module: it only describes the `.js`, so the two toolchains
 * cannot disagree about which file this specifier means again.
 *
 * Types are intentionally loose. The endpoints return API payloads that are not modelled
 * anywhere yet, and inventing precise shapes here would be a second source of truth that
 * drifts from the backend serializers — the very failure this file exists to prevent. Tighten
 * a hook's types when its payload gets a real interface, not before.
 */

type QueryHook = (arg?: any, options?: any) => any;
type MutationHook = () => [(arg?: any) => any, any];

export declare const historyApi: any;

export declare const useGetCurrentHistoryQuery: QueryHook;
export declare const useGetParcelHistoriesQuery: QueryHook;
export declare const useGetHistoryQuery: QueryHook;
export declare const useGetFarmProductionsQuery: QueryHook;
export declare const useGetEventQuery: QueryHook;
export declare const useGetPublicHistoryQuery: QueryHook;
export declare const useGetScansByFarmQuery: QueryHook;
export declare const useGetUserProductionScansQuery: QueryHook;
export declare const useGetUserReviewsQuery: QueryHook;
export declare const useGetFarmScansPaginatedQuery: QueryHook;
export declare const useGetRecentInputsQuery: QueryHook;
export declare const useGetSeedSuppliersQuery: QueryHook;
export declare const useGetSalesRecordsQuery: QueryHook;
export declare const useGetHarvestLotsQuery: QueryHook;
export declare const useSearchTracebackSalesQuery: QueryHook;
export declare const useGetSaleTracebackQuery: QueryHook;
export declare const useSearchTracebackLotsQuery: QueryHook;
export declare const useGetLotTracebackQuery: QueryHook;

/** @deprecated Use useGetFarmScansPaginatedQuery instead. */
export declare const useGetEstablishmentScansPaginatedQuery: QueryHook;

export declare const useCreateEventMutation: MutationHook;
export declare const useUpdateEventMutation: MutationHook;
export declare const useDeleteEventMutation: MutationHook;
export declare const useCreateProductionMutation: MutationHook;
export declare const useUpdateProductionMutation: MutationHook;
export declare const useDeleteProductionMutation: MutationHook;
export declare const useFinishCurrentHistoryMutation: MutationHook;
export declare const useCreateScanMutation: MutationHook;
export declare const useUpgradeScanConsentMutation: MutationHook;
export declare const useClaimScansMutation: MutationHook;
export declare const useCreateSalesRecordMutation: MutationHook;
export declare const useDeleteSalesRecordMutation: MutationHook;
export declare const useVoidSalesRecordMutation: MutationHook;
