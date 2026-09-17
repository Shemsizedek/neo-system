import { isExpired } from './telegram';
import type { NvsnTelegram } from './types';

export class ReplayGuard {
  private readonly seen = new Map<string, number>();
  constructor(private readonly retentionMs = 10 * 60 * 1000) {}

  accept(telegram: NvsnTelegram, now = new Date()): boolean {
    this.prune(now.getTime());
    if (isExpired(telegram, now)) return false;
    const replayKey = `${telegram.source}:${telegram.security.nonce}`;
    if (this.seen.has(replayKey)) return false;
    this.seen.set(replayKey, now.getTime());
    return true;
  }

  prune(nowMs = Date.now()): void {
    for (const [key, seenAt] of this.seen) if (nowMs - seenAt > this.retentionMs) this.seen.delete(key);
  }

  size(): number { return this.seen.size; }
}
