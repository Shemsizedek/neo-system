import { isExpired } from './telegram';
import type { NvsnTelegram, QueuedTelegram } from './types';

export class StoreForwardQueue {
  private readonly entries = new Map<string, QueuedTelegram>();

  enqueue<T>(telegram: NvsnTelegram<T>, now = new Date()): void {
    if (isExpired(telegram, now)) return;
    this.entries.set(telegram.id, { telegram, attempts: 0, queuedAt: now.toISOString(), nextAttemptAt: now.toISOString() });
  }

  ready(now = new Date()): QueuedTelegram[] {
    this.prune(now);
    return [...this.entries.values()].filter((entry) => Date.parse(entry.nextAttemptAt) <= now.getTime());
  }

  markAttempt(id: string, delivered: boolean, now = new Date()): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (delivered) { this.entries.delete(id); return; }
    entry.attempts += 1;
    const backoffMs = Math.min(60_000, 1000 * (2 ** Math.min(entry.attempts, 6)));
    entry.nextAttemptAt = new Date(now.getTime() + backoffMs).toISOString();
  }

  prune(now = new Date()): void {
    for (const [id, entry] of this.entries) if (isExpired(entry.telegram, now)) this.entries.delete(id);
  }

  size(): number { return this.entries.size; }
}
