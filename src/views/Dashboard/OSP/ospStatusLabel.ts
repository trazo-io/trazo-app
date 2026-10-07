import type { IntlShape } from 'react-intl';

/**
 * The plan's status chip, stating what the operation recorded and nothing more.
 *
 * Recordkeeping review F-22 (2026-10-07): the chip on an active plan read "Active / Approved".
 * Activation is the grower recording that the agent approved the plan ("Mark as Active" asks for
 * the approval document and certificate number); "Approved" with no date and no agent on the chip
 * stated the outcome as Trazo's. The packet dropped the wording in run 7 (R7-02); the app kept
 * it. An active plan now says whether an approval is recorded, and when.
 */
export const ospStatusLabel = (
  intl: IntlShape,
  osp: { status?: string | null; approved_at?: string | null }
): string => {
  if (osp.status === 'active') {
    const approvedAt = (osp.approved_at || '').slice(0, 10);
    return approvedAt
      ? intl.formatMessage(
          {
            id: 'osp.status.activeApprovalRecorded',
            defaultMessage: 'Active (approval recorded {date})'
          },
          { date: approvedAt }
        )
      : intl.formatMessage({
          id: 'osp.status.activeApprovalNotRecorded',
          defaultMessage: 'Active (approval not recorded)'
        });
  }
  return intl.formatMessage({ id: `osp.status.${osp.status || 'draft'}` });
};
