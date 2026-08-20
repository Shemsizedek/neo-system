import type { NvsnNode } from './types';

export class NvsnRegistry {
  private readonly nodes = new Map<string, NvsnNode>();

  register(node: NvsnNode): void {
    if (!node.id.startsWith('NVSN-')) throw new Error('NVSN node IDs must start with NVSN-');
    if (node.trustScore < 0 || node.trustScore > 1) throw new Error('trustScore must be between 0 and 1');
    this.nodes.set(node.id, structuredClone(node));
  }

  get(id: string): NvsnNode | undefined {
    const node = this.nodes.get(id);
    return node ? structuredClone(node) : undefined;
  }

  list(): NvsnNode[] {
    return [...this.nodes.values()].map((n) => structuredClone(n));
  }

  setOnline(id: string, online: boolean): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown node: ${id}`);
    node.online = online;
  }
}