import { randomUUID } from 'node:crypto';

export function createCrawlQueue({ maxAttempts = 3 } = {}) {
  const jobs = new Map();
  const order = [];

  function enqueue(input, meta = {}) {
    const now = new Date().toISOString();
    const job = {
      id: randomUUID(), input, meta, status: 'QUEUED', attempts: 0,
      maxAttempts, createdAt: now, updatedAt: now, lastError: null
    };
    jobs.set(job.id, job); order.push(job.id); return structuredClone(job);
  }
  function claim() {
    const id = order.find(id => jobs.get(id)?.status === 'QUEUED');
    if (!id) return null;
    const job = jobs.get(id); job.status = 'RUNNING'; job.attempts += 1; job.updatedAt = new Date().toISOString();
    return structuredClone(job);
  }
  function complete(id, result) {
    const job = required(id); job.status = 'COMPLETED'; job.result = result; job.updatedAt = new Date().toISOString();
    return structuredClone(job);
  }
  function fail(id, error) {
    const job = required(id); job.lastError = String(error?.message || error); job.updatedAt = new Date().toISOString();
    job.status = job.attempts < job.maxAttempts ? 'QUEUED' : 'FAILED';
    return structuredClone(job);
  }
  function required(id) { const job = jobs.get(id); if (!job) throw new Error('crawl_job_not_found'); return job; }
  return { enqueue, claim, complete, fail, get: id => jobs.has(id) ? structuredClone(jobs.get(id)) : null, list: () => order.map(id => structuredClone(jobs.get(id))) };
}
