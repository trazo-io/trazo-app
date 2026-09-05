/**
 * RTK Query slice for certifier review links.
 *
 * Closes the one capability COG Pro advertises that Trazo lacked — letting a
 * certifier inspect the operation's records without the farmer emailing a PDF.
 * Trazo's version needs no certifier account at all: the token in the URL is the
 * credential, and the dossier is regenerated on every open so it is never stale.
 *
 * Links are minted and revoked, never edited: silently changing the window or
 * profile of a link a certifier already holds would change what they see.
 */
import { CERTIFIER_LINKS_URL, OPERATION_READINESS_URL } from 'config';

import baseApi from './baseApi';

export interface CertifierAccessLog {
  id: number;
  action: 'metadata' | 'dossier' | 'readiness' | 'production';
  action_display: string;
  accessed_at: string;
  ip_address: string | null;
}

export interface CertifierAccessLink {
  id: number;
  /** Only ever returned to the operation's own members. */
  token: string;
  label: string;
  /** Which review surface the token opens. "certifier" resolves the audit
      dossier; "buyer" resolves only the claim-safe consumer payload, in-season.
      Cross-audience use is a 404 server-side. */
  audience: 'certifier' | 'buyer';
  certification_type: string;
  period_start: string | null;
  period_end: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  is_active: boolean;
  is_expired: boolean;
  is_revoked: boolean;
  access_count: number;
  last_accessed_at: string | null;
  accesses: CertifierAccessLog[];
}

export interface ReadinessItem {
  /** Which EDITOR clears this. Not unique per item — `ofpp` covers three outcomes. */
  key: string;
  /**
   * Which SENTENCE this is. Unique per outcome, and the thing `readinessMessages.ts`
   * translates. `READINESS_CODES` in `operation_readiness_service.py` is the other half of
   * this contract; a typo on either side degrades to the English `title` below.
   */
  code?: string;
  /** Values the sentence interpolates. Lists arrive as arrays — see `readinessMessages.ts`. */
  params?: Record<string, unknown>;
  status: 'blocker' | 'warning' | 'ok';
  /**
   * The server's English sentence. Kept, and deliberately the LAST resort: the certifier
   * packet prints these (it is an English document for a US certifying agent), and a code
   * the mapper has not learned yet degrades to a sentence that is at least TRUE.
   */
  title: string;
  detail: string;
  /** The concrete action. A blocker without one is a puzzle, not a task. */
  fix: string;
}

export interface OperationReadiness {
  ready: boolean;
  /** False when the NOP checks do not apply — a conventional operation must not
      be told it will fail an organic inspection it was never taking. */
  applicable: boolean;
  blockers: ReadinessItem[];
  warnings: ReadinessItem[];
  checked_items: ReadinessItem[];
}

interface Scope {
  companyId: string;
  farmId: string;
}

interface CreateArgs extends Scope {
  data: Partial<CertifierAccessLink>;
}

interface RevokeArgs extends Scope {
  linkId: string | number;
}

const certifierLinkApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCertifierLinks: build.query<CertifierAccessLink[], Scope>({
      query: ({ companyId, farmId }) => ({
        url: CERTIFIER_LINKS_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response: CertifierAccessLink[] | { results: CertifierAccessLink[] }) =>
        Array.isArray(response) ? response : response.results ?? [],
      providesTags: [{ type: 'CertifierAccessLink', id: 'LIST' }]
    }),
    getOperationReadiness: build.query<OperationReadiness, Scope>({
      query: ({ companyId, farmId }) => ({
        url: OPERATION_READINESS_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      // 'Farm' so uploading the OFPP on the farm profile refreshes this
      // immediately; the farmer must not fix a blocker and still see it listed.
      providesTags: [{ type: 'CertifierAccessLink', id: 'READINESS' }, 'Farm'],
      // A "right now" verdict served from cache is not a verdict. Cross-page
      // changes (creating an OSP) invalidate no tag we own, so re-check on mount.
      keepUnusedDataFor: 0
    }),
    createCertifierLink: build.mutation<CertifierAccessLink, CreateArgs>({
      query: ({ companyId, farmId, data }) => ({
        url: CERTIFIER_LINKS_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'CertifierAccessLink', id: 'LIST' }]
    }),
    // DELETE revokes rather than destroys — the access log is evidence of who
    // read the operation's records and outlives the link.
    revokeCertifierLink: build.mutation<CertifierAccessLink, RevokeArgs>({
      query: ({ companyId, farmId, linkId }) => ({
        url: CERTIFIER_LINKS_URL(companyId, farmId, linkId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: [{ type: 'CertifierAccessLink', id: 'LIST' }]
    })
  })
});

export const {
  useGetOperationReadinessQuery,
  useGetCertifierLinksQuery,
  useCreateCertifierLinkMutation,
  useRevokeCertifierLinkMutation
} = certifierLinkApi;

export default certifierLinkApi;
