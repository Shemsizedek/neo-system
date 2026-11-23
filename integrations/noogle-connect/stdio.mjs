#!/usr/bin/env node
// Gate 1 minimal MCP stdio transport. Local prototype only, no HTTP listener.
import { pathToFileURL } from 'node:url';
import { tools, callTool } from './tools.mjs';

const versions = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
export async function handle(message) {
  const id = message?.id ?? null;
  const error = (code, text) => ({ jsonrpc: '2.0', id, error: { code, message: text } });
  if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' ||
      (Object.hasOwn(message, 'id') && typeof message.id !== 'string' && typeof message.id !== 'number')) return error(-32600, 'Invalid Request');
  if (!Object.hasOwn(message, 'id')) return null;
  const reply = result => ({ jsonrpc: '2.0', id, result });
  const params = message.params ?? {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) return error(-32602, 'Invalid params');
  switch (message.method) {
    case 'initialize':
      if (typeof params.protocolVersion !== 'string' || !params.clientInfo || !params.capabilities) return error(-32602, 'Invalid initialize params');
      return reply({ protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : versions[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'noogle-connect-gate1', version: '0.1.0' }, instructions: 'Local development prototype. Tools provide guidance only. No devices are connected and no commands can run.' });
    case 'ping': return reply({});
    case 'tools/list': return reply({ tools });
    case 'tools/call': {
      try {
        const result = await callTool(params.name, params.arguments);
        return reply({ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result });
      } catch (cause) {
        if (cause.message === 'unknown_tool') return error(-32602, 'Unknown tool');
        return error(-32602, 'Invalid tool arguments');
      }
    }
    default: return error(-32601, 'Method not found');
  }
}

export async function serve(input = process.stdin, output = process.stdout) {
  let pending = Buffer.alloc(0);
  const send = reply => { if (reply) output.write(JSON.stringify(reply) + '\n'); };
  for await (const chunk of input) {
    pending = Buffer.concat([pending, Buffer.from(chunk)]);
    let end;
    while ((end = pending.indexOf(10)) !== -1) {
      if (end > 65536) throw new Error('mcp_message_too_large');
      const line = pending.subarray(0, end).toString('utf8');
      pending = pending.subarray(end + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); }
      catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); continue; }
      send(await handle(message));
    }
    if (pending.length > 65536) throw new Error('mcp_message_too_large');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  serve().catch(() => { process.stderr.write('Noogle Connect transport stopped.\n'); process.exitCode = 1; process.stdin.destroy(); });
}
