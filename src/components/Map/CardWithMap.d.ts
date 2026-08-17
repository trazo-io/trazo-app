/**
 * Type surface for `CardWithMap.jsx`.
 *
 * Props are permissive on purpose: this wraps a map widget whose options object is passed
 * straight through, and pinning a shape here would be guesswork rather than a contract.
 */
import type { ComponentType } from 'react';

declare const CardWithMap: ComponentType<Record<string, any>>;
export default CardWithMap;
