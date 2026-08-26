/**
 * Picker linking an uploaded receipt/invoice FILE to a purchase record (2026-08-25).
 *
 * The purchase fields carried only a typed invoice NUMBER; the actual receipt
 * lived in Documents, unlinked, and the packet could not show it — the farmer
 * was the courier between Trazo's two halves. This select offers the
 * establishment's own uploads; the chosen document is embedded in the packet
 * ZIP (`receipts/`) and the audit tables mark the row "[receipt on file]".
 *
 * Only `source === 'upload'` documents are offered: generated artifacts
 * (packets, dossiers) are outputs, not evidence.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { StandardField, StandardSelect } from 'components/Design/StandardComponents';
import { useGetFarmDocumentsQuery } from 'store/api/documentsApi';
import type { RootState } from 'store/store';

interface ReceiptDocumentSelectProps {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
}

export const ReceiptDocumentSelect: React.FC<ReceiptDocumentSelectProps> = ({
  value,
  onChange
}) => {
  const intl = useIntl();
  const { farmId } = useParams<{ farmId: string }>();
  const companyId = useSelector((s: RootState) => s.company.currentCompany?.id);

  const { data } = useGetFarmDocumentsQuery(
    { companyId: String(companyId ?? ''), farmId: farmId ?? '' },
    { skip: !companyId || !farmId }
  );
  const uploads = (data ?? []).filter((doc) => doc.source === 'upload');

  return (
    <StandardField
      label={intl.formatMessage({ id: 'events.receipt.label' })}
      helpText={
        uploads.length
          ? intl.formatMessage({ id: 'events.receipt.help' })
          : intl.formatMessage({ id: 'events.receipt.helpEmpty' })
      }>
      <StandardSelect
        value={value == null ? '' : String(value)}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        isDisabled={uploads.length === 0}
        placeholder={intl.formatMessage({ id: 'events.receipt.none' })}>
        {uploads.map((doc) => (
          <option key={doc.id} value={String(doc.id)}>
            {doc.title}
          </option>
        ))}
      </StandardSelect>
    </StandardField>
  );
};
