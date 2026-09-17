import type { QueuedTelegram } from './types';

export interface QueuePersistence {
  load(): Promise<QueuedTelegram[]>;
  save(items: QueuedTelegram[]): Promise<void>;
}

export class MemoryQueuePersistence implements QueuePersistence {
  private items: QueuedTelegram[] = [];
  async load(): Promise<QueuedTelegram[]> { return structuredClone(this.items); }
  async save(items: QueuedTelegram[]): Promise<void> { this.items = structuredClone(items); }
}

export class LocalStorageQueuePersistence implements QueuePersistence {
  constructor(private readonly key = 'nvsn:store-forward:v1') {}
  async load(): Promise<QueuedTelegram[]> {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) as QueuedTelegram[] : [];
  }
  async save(items: QueuedTelegram[]): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.setItem(this.key, JSON.stringify(items));
  }
}
