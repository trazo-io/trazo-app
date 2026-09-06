/**
 * Background document builds — the farmer side (backend: documents/services/export_jobs.py).
 *
 * `createExportJob` asks for a build and returns the job at once; `getExportJob` is polled
 * (the component passes `pollingInterval`) until the job is terminal. The finished document
 * is a normal DMS row, downloaded through DOCUMENT_DOWNLOAD_URL with cookies like every other
 * filed artifact — the bytes never travel through these endpoints.
 */
import { EXPORT_JOBS_URL } from 'config';

import type { ExportJob } from 'utils/exportJobs';

import baseApi from './baseApi';

export type { ExportJob } from 'utils/exportJobs';

interface Scope {
  companyId: string;
  farmId: string;
}

export interface CreateExportJobArgs extends Scope {
  data: {
    kind: 'operation_dossier';
    certification?: string;
    /** YYYY-MM-DD. Productions active in the window; omit both for every season. */
    start?: string;
    end?: string;
  };
}

interface GetExportJobArgs extends Scope {
  jobId: string;
}

const exportJobsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createExportJob: build.mutation<ExportJob, CreateExportJobArgs>({
      query: ({ companyId, farmId, data }) => ({
        url: EXPORT_JOBS_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      })
    }),
    getExportJob: build.query<ExportJob, GetExportJobArgs>({
      query: ({ companyId, farmId, jobId }) => ({
        url: EXPORT_JOBS_URL(companyId, farmId, jobId),
        method: 'GET',
        credentials: 'include'
      })
      // No tags on purpose: the component invalidates `FarmDocuments` when a build succeeds, so
      // the Documents shelf refetches. Tagging the poll itself would make the POLL refetch
      // whenever documents change — the opposite direction.
    })
  }),
  overrideExisting: false
});

export const { useCreateExportJobMutation, useGetExportJobQuery } = exportJobsApi;

export default exportJobsApi;
