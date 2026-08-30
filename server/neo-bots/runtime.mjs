import crypto from 'node:crypto';

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export class BotRegistry {
  constructor(seed = []) {
    this.bots = new Map(seed.map((bot) => [bot.id, structuredClone(bot)]));
  }

  register(input) {
    if (!input?.id || !input?.name || !input?.type) throw new Error('bot id, name, and type are required');
    if (this.bots.has(input.id)) throw new Error(`bot already registered: ${input.id}`);
    const bot = {
      status: 'disabled',
      scopes: [],
      limits: {},
      requiresHumanApproval: true,
      ...structuredClone(input),
      createdAt: now(),
      updatedAt: now(),
    };
    this.bots.set(bot.id, bot);
    return structuredClone(bot);
  }

  get(botId) {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error(`unknown bot: ${botId}`);
    return structuredClone(bot);
  }

  list() {
    return [...this.bots.values()].map(structuredClone);
  }

  setStatus(botId, status) {
    if (!['disabled', 'active', 'paused'].includes(status)) throw new Error(`invalid bot status: ${status}`);
    const bot = this.get(botId);
    bot.status = status;
    bot.updatedAt = now();
    this.bots.set(botId, bot);
    return structuredClone(bot);
  }
}

export class AuditLedger {
  constructor() {
    this.events = [];
  }

  append(event) {
    const record = Object.freeze({ id: id('audit'), timestamp: now(), ...structuredClone(event) });
    this.events.push(record);
    return record;
  }

  list({ botId, action } = {}) {
    return this.events.filter((event) => (!botId || event.botId === botId) && (!action || event.action === action));
  }
}

export class ApprovalQueue {
  constructor(audit) {
    this.audit = audit;
    this.requests = new Map();
  }

  create({ botId, action, payload, reason }) {
    const request = {
      id: id('approval'),
      botId,
      action,
      payload: structuredClone(payload),
      reason,
      status: 'pending',
      createdAt: now(),
      resolvedAt: null,
      resolvedBy: null,
    };
    this.requests.set(request.id, request);
    this.audit.append({ botId, action: 'approval.requested', approvalId: request.id, targetAction: action });
    return structuredClone(request);
  }

  resolve(approvalId, { decision, actor }) {
    if (!['approved', 'rejected'].includes(decision)) throw new Error('decision must be approved or rejected');
    const request = this.requests.get(approvalId);
    if (!request) throw new Error(`unknown approval request: ${approvalId}`);
    if (request.status !== 'pending') throw new Error('approval request already resolved');
    request.status = decision;
    request.resolvedAt = now();
    request.resolvedBy = actor;
    this.audit.append({ botId: request.botId, action: `approval.${decision}`, approvalId, actor, targetAction: request.action });
    return structuredClone(request);
  }
}

export class NeoBotRuntime {
  constructor({ registry = new BotRegistry(), audit = new AuditLedger() } = {}) {
    this.registry = registry;
    this.audit = audit;
    this.approvals = new ApprovalQueue(this.audit);
    this.handlers = new Map();
  }

  attach(botId, handler) {
    this.registry.get(botId);
    if (typeof handler !== 'function') throw new Error('bot handler must be a function');
    this.handlers.set(botId, handler);
  }

  async execute(botId, job, context = {}) {
    const bot = this.registry.get(botId);
    if (bot.status !== 'active') throw new Error(`bot is not active: ${botId}`);
    if (!bot.scopes.includes(job.action)) throw new Error(`scope denied: ${job.action}`);

    if (bot.requiresHumanApproval && job.risk !== 'read-only' && !context.approval) {
      return { status: 'approval_required', approval: this.approvals.create({ botId, action: job.action, payload: job.payload, reason: job.reason ?? 'governed action' }) };
    }

    if (context.approval) {
      const approval = this.approvals.requests.get(context.approval);
      if (!approval || approval.botId !== botId || approval.action !== job.action || approval.status !== 'approved') {
        throw new Error('valid approved approval token required');
      }
    }

    const handler = this.handlers.get(botId);
    if (!handler) throw new Error(`no handler attached: ${botId}`);
    this.audit.append({ botId, action: 'job.started', targetAction: job.action, actor: context.actor ?? 'system' });
    const result = await handler(job, context);
    this.audit.append({ botId, action: 'job.completed', targetAction: job.action, actor: context.actor ?? 'system' });
    return { status: 'completed', result };
  }
}
