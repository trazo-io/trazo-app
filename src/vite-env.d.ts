/// <reference types="vite/client" />

/**
 * `store/api/productApi` is still plain JavaScript, so every `.tsx` importing it raises
 * TS7016 ("could not find a declaration file"). This shorthand ambient declaration states the
 * current reality — the module exists and its exports are untyped — instead of scattering
 * `@ts-ignore` across each call site, which would also swallow genuine errors on those lines.
 *
 * Shorthand form (no body) rather than an explicit export list on purpose: enumerating the
 * exports by hand means every new query hook silently fails to typecheck at its call site until
 * someone remembers to add it here, which is worse than no types at all.
 *
 * Delete this when productApi is converted to TypeScript; the resulting real types are strictly
 * better than `any`.
 */
declare module 'store/api/productApi';
