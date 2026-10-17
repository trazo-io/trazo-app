/**
 * Take the operator to the field that stopped a wizard step, and say which one it is.
 *
 * Pilot rehearsal 2026-10, finding 2: on the pest form a blank required name blocked Continue
 * and nothing moved. The wizard did call a focus helper, but it looked for
 * `[aria-invalid="true"]` synchronously inside the rejected submit, BEFORE React had re-rendered
 * the field as invalid, so it found nothing. This helper:
 *
 *   1. waits for the re-render (a frame, then a macrotask), so the invalid markup exists;
 *   2. finds the first failing field in DOCUMENT order, from the error object's own keys
 *      (`[name="<path>"]`) as well as `aria-invalid`, so a field whose component does not set
 *      aria-invalid is still found;
 *   3. scrolls it into view and focuses it;
 *   4. returns the field's visible label (or, if the field is not on screen at all, the
 *      validation message) so the caller can name it in the notice.
 *
 * Works for every tab: it reads react-hook-form's error object and the DOM, nothing tab-specific.
 */

type ErrorTree = Record<string, unknown> | null | undefined;

export interface RevealedFormError {
  element: HTMLElement | null;
  /** The field's visible label, without the required asterisk. */
  label: string | null;
  /** The first validation message found in the error object. */
  message: string | null;
}

/** Dotted paths of every leaf error (`{ name: { message } }` -> `name`; arrays -> `items.0.x`). */
export function errorPaths(errors: ErrorTree, prefix = ''): string[] {
  if (!errors || typeof errors !== 'object') return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (!value || typeof value !== 'object' || key === 'ref') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const node = value as Record<string, unknown>;
    if (typeof node.message === 'string' || typeof node.type === 'string') out.push(path);
    // Field arrays and nested objects carry their own leaves.
    out.push(...errorPaths(node as ErrorTree, path).filter((p) => p !== path));
  }
  return out;
}

function firstMessage(errors: ErrorTree): string | null {
  if (!errors || typeof errors !== 'object') return null;
  for (const [key, value] of Object.entries(errors)) {
    if (!value || typeof value !== 'object' || key === 'ref') continue;
    const node = value as Record<string, unknown>;
    if (typeof node.message === 'string' && node.message) return node.message;
    const nested = firstMessage(node as ErrorTree);
    if (nested) return nested;
  }
  return null;
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}

/** The first failing field in document order, or null. */
export function findFirstInvalidElement(
  errors: ErrorTree,
  root: ParentNode = document
): HTMLElement | null {
  const candidates: HTMLElement[] = [];
  for (const path of errorPaths(errors)) {
    const el = root.querySelector<HTMLElement>(`[name="${cssEscape(path)}"]`);
    if (el) candidates.push(el);
  }
  root.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((el) => candidates.push(el));
  if (candidates.length === 0) return null;
  return candidates.reduce((first, el) =>
    // eslint-disable-next-line no-bitwise
    first.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING ? el : first
  );
}

/** The visible label of a form field, minus decorative children (the required asterisk). */
export function labelFor(el: HTMLElement | null): string | null {
  if (!el) return null;
  const doc = el.ownerDocument;
  let label: HTMLElement | null = null;
  if (el.id) label = doc.querySelector<HTMLElement>(`label[for="${cssEscape(el.id)}"]`);
  if (!label) label = el.closest('label');
  if (!label) {
    const group = el.closest('[role="group"], .chakra-form-control');
    label = group?.querySelector<HTMLElement>('label') ?? null;
  }
  if (!label) return el.getAttribute('aria-label');
  const copy = label.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll('[aria-hidden="true"], .chakra-form__required-indicator')
    .forEach((n) => n.remove());
  const text = (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

const nextPaint = () =>
  new Promise<void>((resolve) => {
    const raf =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (cb: () => void) => setTimeout(cb, 0);
    raf(() => setTimeout(resolve, 0));
  });

export async function revealFirstFormError(
  errors: ErrorTree,
  root: ParentNode = document
): Promise<RevealedFormError> {
  if (typeof document === 'undefined') {
    return { element: null, label: null, message: firstMessage(errors) };
  }
  await nextPaint();
  const element = findFirstInvalidElement(errors, root);
  if (element) {
    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    try {
      element.focus({ preventScroll: true });
    } catch {
      /* not focusable: the scroll already did the useful part */
    }
  }
  return { element, label: labelFor(element), message: firstMessage(errors) };
}
