/**
 * Who a document on the shelf came from, in words that do not claim authorship Trazo cannot know.
 *
 * Pilot rehearsal 2026-10, finding 5: an upload by the operator account read "Farmer upload",
 * because the label was the server's choice label for `source="upload"`. The operator, a
 * consultant or a crew lead uploads as often as the grower does. An upload is labelled by the
 * account that uploaded it (`created_by_name`), or plainly "Upload" when that is unknown.
 * Generated documents keep the server's label (OSP snapshot, audit dossier, ...).
 */
import type { IntlShape } from 'react-intl';

interface SourceFields {
  source: string;
  source_display: string;
  created_by_name: string | null;
}

export function documentSourceLabel(doc: SourceFields, intl: IntlShape): string {
  if (doc.source !== 'upload') return doc.source_display;
  const name = (doc.created_by_name ?? '').trim();
  return name
    ? intl.formatMessage({ id: 'documents.source.uploadedBy' }, { name })
    : intl.formatMessage({ id: 'documents.source.upload' });
}
