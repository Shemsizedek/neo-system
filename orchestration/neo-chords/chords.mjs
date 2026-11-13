/**
 * NEO Chords Gate 1 - provider-neutral, source-only task dispatcher.
 * No provider credentials, networking, background scheduler or durable queue.
 * All adapters are injected by the caller; a task cannot run without an allowlisted adapter.
 */
import { createHash } from 'node:crypto';

const SAFE_KINDS = new Set(['research', 'analyze', 'draft', 'summarize', 'test']);
const CLASSIFICATIONS = new Set(['public', 'internal']);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const fail = message => { throw new TypeError(message); };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function validateCommand(command) {
  if (!command || typeof command !== 'object' || Array.isArray(command)) fail('command must be an object');
  if (typeof command.id !== 'string' || !ID.test(command.id)) fail('invalid command id');
  if (!Array.isArray(command.tasks) || !command.tasks.length || command.tasks.length > 50) fail('tasks must contain 1-50 entries');
  const ids = new Set();
  for (const task of command.tasks) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) fail('invalid task');
    if (typeof task.id !== 'string' || !ID.test(task.id) || ids.has(task.id)) fail('duplicate or invalid task id');
    ids.add(task.id);
    if (!SAFE_KINDS.has(task.kind)) fail('task kind not authorized for Chords Gate 1');
    if (typeof task.capability !== 'string' || !ID.test(task.capability)) fail('invalid capability');
    if (typeof task.prompt !== 'string' || !task.prompt.trim() || task.prompt.length > 8000) fail('invalid task prompt');
    if (!CLASSIFICATIONS.has(task.dataClass)) fail('explicit public/internal dataClass required');
    if (task.preferredWorker !== undefined && (typeof task.preferredWorker !== 'string' || !ID.test(task.preferredWorker))) fail('invalid preferredWorker');
    if (task.dependsOn !== undefined && (!Array.isArray(task.dependsOn) || task.dependsOn.some(id => typeof id !== 'string' || !ID.test(id)))) fail('invalid task dependencies');
  }
  const taskMap = new Map(command.tasks.map(t => [t.id, t]));
  const marks = new Map();
  function visit(id) {
    if (marks.get(id) === 1) fail('cyclic task dependencies');
    if (marks.get(id) === 2) return;
    marks.set(id, 1);
    const deps = taskMap.get(id).dependsOn || [];
    if (new Set(deps).size !== deps.length) fail('duplicate task dependency');
    for (const dep of deps) {
      if (!taskMap.has(dep)) fail('unknown task dependency');
      if (taskMap.get(dep).dataClass === 'internal' && taskMap.get(id).dataClass === 'public') fail('internal-to-public dependency flow denied');
      visit(dep);
    }
    marks.set(id, 2);
  }
  for (const id of taskMap.keys()) visit(id);
  return taskMap;
}

export function createChordsOrchestrator({ workers = [], audit = () => {}, concurrency = 3 } = {}) {
  if (!Array.isArray(workers)) fail('workers must be an array');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) fail('concurrency must be 1-16');
  if (typeof audit !== 'function') fail('audit must be a function');
  const names = new Set();
  for (const worker of workers) {
    if (!worker || typeof worker.id !== 'string' || !ID.test(worker.id) || names.has(worker.id)) fail('duplicate or invalid worker id');
    names.add(worker.id);
    if (!Array.isArray(worker.capabilities) || !worker.capabilities.length || worker.capabilities.some(x => typeof x !== 'string' || !ID.test(x))) fail('invalid worker capabilities');
    if (!Array.isArray(worker.dataClasses) || worker.dataClasses.some(x => !CLASSIFICATIONS.has(x))) fail('invalid worker data classes');
    if (typeof worker.run !== 'function') fail('worker run function required');
  }
  const executions = new Map();

  function eligible(task) {
    const candidates = workers.filter(w => w.enabled !== false && w.capabilities.includes(task.capability) && w.dataClasses.includes(task.dataClass));
    if (!task.preferredWorker) return candidates;
    return [...candidates.filter(w => w.id === task.preferredWorker), ...candidates.filter(w => w.id !== task.preferredWorker)];
  }

  function plan(command) {
    validateCommand(command);
    return {
      id: command.id,
      mode: 'source-only',
      tasks: command.tasks.map(t => ({ id: t.id, kind: t.kind, capability: t.capability, dataClass: t.dataClass,
        dependsOn: t.dependsOn || [], candidates: eligible(t).map(w => w.id),
        status: eligible(t).length ? 'READY' : 'NO_AUTHORIZED_WORKER' }))
    };
  }

  async function dispatch(command) {
    const taskMap = validateCommand(command);
    const fingerprint = digest(command);
    const previous = executions.get(command.id);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('command id replayed with different content');
      return previous.promise;
    }
    // Never start a partial run when any task lacks an eligible provider.
    const schedule = plan(command);
    if (schedule.tasks.some(t => t.status !== 'READY')) fail('missing authorized worker for one or more tasks');
    const promise = execute(command, taskMap);
    executions.set(command.id, { fingerprint, promise });
    return promise;
  }

  async function execute(command, taskMap) {
    const results = new Map();
    const pending = new Set(taskMap.keys());
    audit({ event: 'CHORDS_ACCEPTED', commandId: command.id, taskCount: pending.size });
    while (pending.size) {
      const ready = [...pending].filter(id => (taskMap.get(id).dependsOn || []).every(dep => results.has(dep)));
      if (!ready.length) throw Error('dependency invariant violated');
      for (let i = 0; i < ready.length; i += concurrency) {
        await Promise.all(ready.slice(i, i + concurrency).map(async id => {
          const task = taskMap.get(id);
          const deps = task.dependsOn || [];
          if (deps.some(dep => results.get(dep).status !== 'COMPLETED')) {
            results.set(id, { id, status: 'BLOCKED', reason: 'dependency did not complete' });
          } else {
            let succeeded = false;
            let lastError = 'worker failed';
            for (const worker of eligible(task)) {
              try {
                // Dependencies contain outputs from this command only. Adapters are responsible
                // for validation/redaction before external transmission.
                const output = await worker.run({ id: task.id, kind: task.kind, capability: task.capability,
                  prompt: task.prompt, dataClass: task.dataClass,
                  dependencies: Object.fromEntries(deps.map(dep => [dep, results.get(dep).output])) });
                results.set(id, { id, status: 'COMPLETED', workerId: worker.id, output });
                succeeded = true;
                break;
              } catch (error) {
                lastError = String(error?.message || error).slice(0, 240);
              }
            }
            if (!succeeded) results.set(id, { id, status: 'FAILED', error: lastError });
          }
          const receipt = results.get(id);
          // Intentionally omit prompts, data and outputs from audit events.
          audit({ event: 'CHORDS_TASK', commandId: command.id, taskId: id, status: receipt.status, workerId: receipt.workerId || null });
          pending.delete(id);
        }));
      }
    }
    const tasks = command.tasks.map(t => results.get(t.id));
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const result = { id: command.id, status: completed === tasks.length ? 'COMPLETED' : completed ? 'PARTIAL' : 'FAILED', tasks };
    audit({ event: 'CHORDS_FINISHED', commandId: command.id, status: result.status });
    return result;
  }

  return Object.freeze({ plan, dispatch });
}
