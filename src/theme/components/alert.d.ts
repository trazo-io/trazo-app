/**
 * Type surface for `alert.js`. Declared rather than migrated, for the same reason as
 * `badge.d.ts`: a sibling `.ts` would become a SECOND module for one import specifier,
 * which is how Vite and TypeScript came to disagree about `historyApi`.
 */
export declare const alertStyles: Record<string, any>;
export declare const ALERT_PALETTE: Record<'success' | 'error' | 'warning' | 'info', string>;
export declare const ALERT_ACCENT_SHADE: Record<'success' | 'error' | 'warning' | 'info', string>;
