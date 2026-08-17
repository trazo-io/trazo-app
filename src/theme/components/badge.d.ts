/**
 * Type surface for `badge.js`. Declared rather than migrated, for the same reason as
 * `store/api/historyApi.d.ts`: a sibling `.ts` would become a SECOND module for one import
 * specifier, which is how Vite and TypeScript came to disagree about `historyApi`.
 *
 * Loose on purpose — this is a Chakra theme fragment, and pinning its shape here would
 * duplicate Chakra's own types badly.
 */
export declare const badgeStyles: Record<string, any>;
