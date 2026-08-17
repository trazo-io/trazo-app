/**
 * Type surface for `reviewApi.js`.
 *
 * Declared rather than migrated: a sibling `.ts` would become a SECOND module for the same
 * import specifier, which is exactly how `historyApi` ended up with Vite loading the `.js`
 * while TypeScript and knip read a stale `.ts` (see historyApi.d.ts). A `.d.ts` only
 * describes the `.js`, so the toolchains cannot diverge.
 *
 * Loose by design — these endpoints have no modelled payloads yet, and inventing shapes here
 * would create a second source of truth that drifts from the backend serializers.
 */

type QueryHook = (arg?: any, options?: any) => any;
type MutationHook = () => [(arg?: any) => any, any];

export declare const reviewApi: any;

export declare const useGetFarmLastReviewsQuery: QueryHook;
export declare const useGetFarmProductReputationQuery: QueryHook;
export declare const useGetFarmProductReputationPercentageQuery: QueryHook;
export declare const useGetFarmReviewsPaginatedQuery: QueryHook;

/** @deprecated Farm-scoped names above are the current vocabulary. */
export declare const useGetEstablishmentLastReviewsQuery: QueryHook;
/** @deprecated */
export declare const useGetEstablishmentProductReputationQuery: QueryHook;
/** @deprecated */
export declare const useGetEstablishmentProductReputationPercentageQuery: QueryHook;
/** @deprecated */
export declare const useGetEstablishmentReviewsPaginatedQuery: QueryHook;

export declare const useSendReviewMutation: MutationHook;
