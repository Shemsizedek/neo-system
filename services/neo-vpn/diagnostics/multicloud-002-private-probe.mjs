#!/usr/bin/env node
// NEO-MULTICLOUD-002: one-shot, operator-run, HTTP probe over an authorized
// NetBird private peer connection. NO VPN setup, no public proxy, no persistence.
// It proves only a TCP application response, NEVER the WireGuard handshake.
import http from 'node:http';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const PORT = 18443;
export const PATH = '/neo-private-probe';

export function isOverlayIPv4(raw) {
  if (typeof raw !== 'string' || isIP(raw) !== 4) return false;
  const [first, second] = raw.split('.').map(Number);
  return first === 100 && second >= 64 && second <= 127;
}

export function normalizePeer(raw) {
  return typeof raw === 'string' && raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

export function makeHandler({allowedSource, onAccepted = () => {}}) {
  if (!isOverlayIPv4(allowedSource)) throw new TypeError('INVALID_ALLOWED_SOURCE');
  let handled = false;
  return (req, res) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    const source = normalizePeer(req.socket?.remoteAddress);
    const permitted = isOverlayIPv4(source) && source === allowedSource;
    if (!permitted || req.method !== 'GET' || req.url !== PATH || handled) {
      res.writeHead(404).end('{"error":"NOT_AVAILABLE"}\n');
      return;
    }
    handled = true;
    res.writeHead(200).end(JSON.stringify({
      gate:'NEO-MULTICLOUD-002',
      response:'PRIVATE_APPLICATION_RESPONSE',
      private_tunnel_verified:false,
      gateway_production_verified:false,
    }) + '\n');
    onAccepted();
  };
}

export function parseArgs(args) {
  const indexOf = k => args.indexOf(k);
  const get = k => { const i=indexOf(k);return i >= 0 ? args[i+1] : undefined; };
  const listenIp=get('--listen-ip'), peerIp=get('--allow-peer');
  const seconds=get('--seconds') === undefined ? 120 : Number(get('--seconds'));
  const port=get('--port') === undefined ? PORT : Number(get('--port'));
  if (!isOverlayIPv4(listenIp) || !isOverlayIPv4(peerIp) || listenIp === peerIp ||
      !Number.isInteger(seconds) || seconds < 10 || seconds > 300 ||
      !Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new TypeError('INVALID_PRIVATE_PEER_CONFIGURATION');
  }
  return { listenIp, peerIp, seconds, port };
}

export function startProbe(config, {createServer=http.createServer, schedule=setTimeout}={}) {
  const {listenIp,peerIp,seconds,port}=config;
  // Validate regardless of whether a caller used parseArgs.
  parseArgs(['--listen-ip',listenIp,'--allow-peer',peerIp,'--seconds',String(seconds),'--port',String(port)]);
  let server;
  let complete=false;
  const stop=()=>{ if(complete)return; complete=true;server.close(); };
  server=createServer(makeHandler({allowedSource:peerIp,onAccepted:stop}));
  server.once('error',()=>{ // A missing NetBird interface or bound port is a normal hold.
    process.stderr.write('NEO_PRIVATE_PROBE_NOT_LISTENING\n');
  });
  server.listen(port,listenIp,()=>{
    process.stdout.write('NEO_PRIVATE_PROBE_LISTENING_RESTRICTED\n');
  });
  const ttl=schedule(()=>stop(),seconds*1000);
  if (typeof ttl?.unref === 'function') ttl.unref();
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { startProbe(parseArgs(process.argv.slice(2))); }
  catch { process.stderr.write('Usage: node multicloud-002-private-probe.mjs --listen-ip NETBIRD_SERVER_IP --allow-peer NETBIRD_ANDROID_IP [--seconds 120] [--port 18443]\n');
    process.exitCode=2;
  }
}
