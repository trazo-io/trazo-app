import { describe, expect, it, vi } from 'vitest';

import { awaitCertifierDossier, describeProgress, isTerminal, type ExportJob } from '../exportJobs';

const job = (over: Partial<ExportJob>): ExportJob => ({
  public_id: 'a1b2c3d4-0000-4000-8000-000000000000',
  kind: 'operation_dossier',
  audience: 'certifier',
  certification_type: 'organic',
  period_start: null,
  period_end: null,
  status: 'queued',
  is_terminal: false,
  progress_current: 0,
  progress_total: 0,
  progress_label: '',
  error: '',
  document_id: null,
  document_title: null,
  document_size_bytes: null,
  created_at: '2026-09-05T18:00:00Z',
  started_at: null,
  finished_at: null,
  ...over
});

const jsonResponse = (status: number, body: unknown) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body
  } as unknown as Response);

const noSleep = async () => {};

describe('describeProgress', () => {
  it('has no fraction until the total is known', () => {
    expect(describeProgress(job({ progress_total: 0 })).fraction).toBeNull();
    expect(describeProgress(null).label).toBe('');
  });

  it('caps current at total and keeps the label', () => {
    const d = describeProgress(
      job({ progress_current: 7, progress_total: 5, progress_label: 'Blueberries — River Block' })
    );
    expect(d).toEqual({ fraction: 1, current: 5, total: 5, label: 'Blueberries — River Block' });
  });
});

describe('isTerminal', () => {
  it('is true only for succeeded and failed', () => {
    expect(isTerminal(job({ status: 'queued' }))).toBe(false);
    expect(isTerminal(job({ status: 'running' }))).toBe(false);
    expect(isTerminal(job({ status: 'succeeded' }))).toBe(true);
    expect(isTerminal(job({ status: 'failed' }))).toBe(true);
    expect(isTerminal(null)).toBe(false);
  });
});

describe('awaitCertifierDossier', () => {
  const dossierUrl = 'https://api.test/api/certifier-review/tok/dossier/';
  const statusUrl = 'https://api.test/api/certifier-review/tok/dossier/status/';

  it('hands back the bare dossier route when the status probe says a current build is on file', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'ready' }));
    const outcome = await awaitCertifierDossier({
      dossierUrl,
      statusUrl,
      fetchImpl,
      sleep: noSleep
    });
    expect(outcome).toEqual({ kind: 'download', url: dossierUrl });
    // The probe goes to the JSON route, never to the PDF route.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(statusUrl);
  });

  it('accepts a 200 that already carries a finished job (eager server) and downloads that build', async () => {
    const done = job({ status: 'succeeded', is_terminal: true, document_id: 5 });
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, done));
    const outcome = await awaitCertifierDossier({
      dossierUrl,
      statusUrl,
      fetchImpl,
      sleep: noSleep
    });
    expect(outcome).toEqual({ kind: 'download', url: `${dossierUrl}?job=${done.public_id}` });
  });

  it('polls a 202 until the build succeeds and returns the exact build it watched', async () => {
    const queued = job({ status: 'queued' });
    const running = job({
      status: 'running',
      progress_current: 4,
      progress_total: 12,
      progress_label: 'Onions — Upper Terrace'
    });
    const done = job({
      status: 'succeeded',
      is_terminal: true,
      document_id: 91,
      progress_current: 12,
      progress_total: 12
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(202, queued))
      .mockResolvedValueOnce(jsonResponse(200, running))
      .mockResolvedValueOnce(jsonResponse(200, done));
    const seen: ExportJob[] = [];
    const outcome = await awaitCertifierDossier({
      dossierUrl,
      statusUrl,
      fetchImpl,
      sleep: noSleep,
      onProgress: (j) => seen.push(j)
    });
    expect(outcome).toEqual({ kind: 'download', url: `${dossierUrl}?job=${queued.public_id}` });
    expect(seen.map((j) => j.status)).toEqual(['queued', 'running', 'succeeded']);
    expect(fetchImpl.mock.calls[1][0]).toBe(`${statusUrl}?job=${queued.public_id}`);
  });

  it('reports a failed build with the server message and never a download url', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(202, job({ status: 'queued' })))
      .mockResolvedValueOnce(
        jsonResponse(200, job({ status: 'failed', is_terminal: true, error: 'Try again shortly.' }))
      );
    const outcome = await awaitCertifierDossier({
      dossierUrl,
      statusUrl,
      fetchImpl,
      sleep: noSleep
    });
    expect(outcome).toEqual({ kind: 'failed', message: 'Try again shortly.' });
  });

  it('gives up after the maximum wait instead of polling forever', async () => {
    let clock = 0;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(202, job({ status: 'queued' })))
      .mockResolvedValue(jsonResponse(200, job({ status: 'running' })));
    const outcome = await awaitCertifierDossier({
      dossierUrl,
      statusUrl,
      fetchImpl,
      sleep: async () => {
        clock += 3000;
      },
      now: () => clock,
      maxWaitMs: 10_000
    });
    expect(outcome).toEqual({ kind: 'timeout' });
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('treats a non-202 error on the probe as a failure with the server message', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(503, { error: 'The dossier could not be generated right now.' })
      );
    const outcome = await awaitCertifierDossier({
      dossierUrl,
      statusUrl,
      fetchImpl,
      sleep: noSleep
    });
    expect(outcome).toEqual({
      kind: 'failed',
      message: 'The dossier could not be generated right now.'
    });
  });

  it('surfaces a 404 while polling (link revoked mid-build) as a failure', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(202, job({ status: 'queued' })))
      .mockResolvedValueOnce(jsonResponse(404, { detail: 'Not found.' }));
    const outcome = await awaitCertifierDossier({
      dossierUrl,
      statusUrl,
      fetchImpl,
      sleep: noSleep
    });
    expect(outcome).toEqual({ kind: 'failed', message: 'Not found.' });
  });
});
