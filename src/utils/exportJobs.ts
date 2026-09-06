/**
 * Client side of a background document build (backend: documents/services/export_jobs.py).
 *
 * A dossier that can take a minute to build is not fetched — it is ASKED FOR. The server
 * answers with a job; the client polls the job until it is terminal and then downloads the
 * filed document. This module holds the polling logic once, for both callers:
 *
 *   - the farmer's Operation Audit Dossier card (authenticated; RTK Query does the requests
 *     and only `describeProgress` / `isTerminal` are used from here), and
 *   - the anonymous certifier review page (plain fetch; `awaitCertifierDossier` runs the
 *     whole 202 → poll → download handshake).
 *
 * Kept free of React so it can be unit-tested with fake timers.
 */

export type ExportJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ExportJob {
  public_id: string;
  kind: string;
  audience: 'farmer' | 'certifier';
  certification_type: string;
  period_start: string | null;
  period_end: string | null;
  status: ExportJobStatus;
  is_terminal: boolean;
  progress_current: number;
  progress_total: number;
  progress_label: string;
  error: string;
  document_id: number | null;
  document_title: string | null;
  document_size_bytes: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const isTerminal = (job: Pick<ExportJob, 'status'> | null | undefined): boolean =>
  job?.status === 'succeeded' || job?.status === 'failed';

/** Poll cadence. Three seconds keeps a one-minute build under ~20 requests. */
export const EXPORT_JOB_POLL_MS = 3000;

/** Give up polling after this long — the server reaps a dead build at ten minutes. */
export const EXPORT_JOB_MAX_WAIT_MS = 15 * 60 * 1000;

export interface ProgressDescription {
  /** 0–1, or null while the total is unknown. */
  fraction: number | null;
  current: number;
  total: number;
  label: string;
}

/**
 * What to show while a job runs. `progress_total` is the number of productions; the server
 * reports 0 of N before the operation-wide sections and N of N while pages lay out.
 */
export const describeProgress = (
  job:
    | Pick<ExportJob, 'status' | 'progress_current' | 'progress_total' | 'progress_label'>
    | null
    | undefined
): ProgressDescription => {
  if (!job) return { fraction: null, current: 0, total: 0, label: '' };
  const total = job.progress_total || 0;
  const current = Math.min(job.progress_current || 0, total);
  const fraction = total > 0 ? current / total : null;
  return { fraction, current, total, label: job.progress_label || '' };
};

export type CertifierDossierOutcome =
  | { kind: 'download'; url: string }
  | { kind: 'failed'; message: string }
  | { kind: 'timeout' };

interface AwaitOptions {
  /** Absolute URL of `certifier-review/<token>/dossier/`. */
  dossierUrl: string;
  /** Absolute URL of `certifier-review/<token>/dossier/status/`. */
  statusUrl: string;
  fetchImpl?: typeof fetch;
  onProgress?: (job: ExportJob) => void;
  pollMs?: number;
  maxWaitMs?: number;
  /** Injected for tests; defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected clock for the timeout, defaults to Date.now. */
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Drive the certifier download handshake.
 *
 *  1. Probe the JSON status route (no `?job=`). `{status: "ready"}` means the filed build is
 *     current: the caller is handed `dossierUrl` to NAVIGATE to — a fetch of a 30 MB PDF into
 *     memory is the wrong way to download it. Anything else is a job (202: started or joined).
 *  2. Poll `statusUrl?job=<id>` until terminal.
 *  3. On success, return `dossierUrl?job=<id>` — exactly the build that was watched, so a record
 *     edited mid-build cannot send the reviewer round again.
 *
 * Never throws for server-side outcomes; a network error does propagate.
 */
export async function awaitCertifierDossier(
  options: AwaitOptions
): Promise<CertifierDossierOutcome> {
  const {
    dossierUrl,
    statusUrl,
    fetchImpl = fetch,
    onProgress,
    pollMs = EXPORT_JOB_POLL_MS,
    maxWaitMs = EXPORT_JOB_MAX_WAIT_MS,
    sleep = defaultSleep,
    now = Date.now
  } = options;

  // Probe the JSON route: never opens a PDF stream, never logs a download that did not happen.
  const probe = await fetchImpl(statusUrl, { headers: { Accept: 'application/json' } });
  if (probe.status !== 200 && probe.status !== 202) {
    return { kind: 'failed', message: await readErrorMessage(probe) };
  }
  const probed = (await probe.json()) as ExportJob | { status: 'ready' };
  if (probed.status === 'ready') {
    return { kind: 'download', url: dossierUrl };
  }

  let job = probed as ExportJob;
  onProgress?.(job);
  const startedAt = now();
  while (!isTerminal(job)) {
    if (now() - startedAt > maxWaitMs) return { kind: 'timeout' };
    await sleep(pollMs);
    const polled = await fetchImpl(`${statusUrl}?job=${encodeURIComponent(job.public_id)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!polled.ok) {
      return { kind: 'failed', message: await readErrorMessage(polled) };
    }
    job = (await polled.json()) as ExportJob;
    onProgress?.(job);
  }
  if (job.status === 'failed') {
    return { kind: 'failed', message: job.error || '' };
  }
  const separator = dossierUrl.includes('?') ? '&' : '?';
  return {
    kind: 'download',
    url: `${dossierUrl}${separator}job=${encodeURIComponent(job.public_id)}`
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.error === 'string') return data.error;
    if (data && typeof data.detail === 'string') return data.detail;
  } catch {
    /* not JSON */
  }
  return '';
}
