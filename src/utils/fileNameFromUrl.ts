/**
 * The file name a person should read for a stored file's URL.
 *
 * Media URLs are signed: `…/ofpp/plan.pdf?X-Amz-Algorithm=…&X-Amz-Signature=…`. Taking the last
 * `/` segment of the raw string printed the whole query string as the "file name" on the farm
 * profile's fraud prevention plan card (pilot rehearsal 2026-10-17, PR-17-b). The query and the
 * fragment are not part of the name; the path's last segment, decoded, is.
 */
export const fileNameFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const path = url.split(/[?#]/, 1)[0];
  const last = path.split('/').pop() || '';
  if (!last) return null;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};
