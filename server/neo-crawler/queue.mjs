import { randomUUID } from 'node:crypto';

export function createCrawlQueue({ maxAttempts = 3 } = {}) {
  const jobs = new Map();
  const order = [];

  function enqueue(input, meta = {}) {
    const now = new Date().toISOString();
    const job = {
      id: randomUUID(), input: structuredClone(input), meta: structuredClone(meta), status: 'QUEUED', attempts: 0,
      maxAttempts, createdAt: now, updatedAt: now, lastError: null, claimToken: null
    };
    jobs.set(job.id, job); order.push(job.id); return structuredClone(job);
  }
  function claim() {
    const id = order.find(id => jobs.get(id)?.status === 'QUEUED');
    if (!id) return null;
    const job = jobs.get(id); job.status = 'RUNNING'; job.attempts += 1; job.claimToken = randomUUID(); job.updatedAt = new Date().toISOString();
    return structuredClone(job);
  }
  function complete(id, result, claimToken) {
    const job = required(id); assertRunningClaim(job, claimToken);
    job.status = 'COMPLETED'; job.result = structuredClone(result); job.claimToken = null; job.updatedAt = new Date().toISOString();
    return structuredClone(job);
  }
  function fail(id, error, claimToken) {
    const job = required(id); assertRunningClaim(job, claimToken);
    job.lastError = String(error?.message || error); job.updatedAt = new Date().toISOString(); job.claimToken = null;
    job.status = job.attempts < job.maxAttempts ? 'QUEUED' : 'FAILED';
    return structuredClone(job);
  }
  function assertRunningClaim(job, claimToken) {
    if (job.status !== 'RUNNING') throw new Error('crawl_job_not_running');
    if (claimToken && claimToken !== job.claimToken) throw new Error('stale_crawl_claim');
  }
  function required(id) { const job = jobs.get(id); if (!job) throw new Error('crawl_job_not_found'); return job; }
  return { enqueue, claim, complete, fail, get: id => jobs.has(id) ? structuredClone(jobs.get(id)) : null, list: () => order.map(id => structuredClone(jobs.get(id))) };
}
