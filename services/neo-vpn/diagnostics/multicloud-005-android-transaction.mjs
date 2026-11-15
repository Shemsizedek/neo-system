#!/usr/bin/env node
// NEO-MULTICLOUD-005 — one read-only Android/Termux request to the reviewed
// NEO-MULTICLOUD-002 one-shot server. No Wi-Fi toggles, enrollment or proxies.
// A successful response does NOT independently certify WireGuard encryption.
import http from 'node:http';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const PHASES = Object.freeze(['wifi_baseline','cellular_backup','wifi_restored']);
export const TARGET_PORT = 18443;
export const TARGET_PATH = '/neo-private-probe';

export function isNetBirdPeerIPv4(value) {
  if (typeof value !== 'string' || isIP(value) !== 4) return false;
  const [first,second] = value.split('.').map(Number);
  return first === 100 && second >= 64 && second <= 127;
}

export function parseArguments(args) {
  const get = name => {
    const i=args.indexOf(name);
    return i===-1 ? null : args[i+1];
  };
  const ip=get('--peer-ip'), phase=get('--phase')??'first_private_request';
  if (!isNetBirdPeerIPv4(ip) ||
    ![...PHASES,'first_private_request'].includes(phase)) {
    throw new Error('INVALID_PRIVATE_PEER_ARGUMENTS');
  }
  return {ip,phase};
}

export function requestPrivateProbe(ip, { request=http.request, timeoutMs=8000 }={}) {
  if (!isNetBirdPeerIPv4(ip)) return Promise.resolve('INVALID_PEER');
  return new Promise(resolveResult => {
    let complete=false;
    let client;
    const settle = state => {
      if (complete) return;
      complete=true;
      if (client) client.destroy();
      resolveResult(state);
    };
    try {
      client=request({
        hostname:ip, port:TARGET_PORT, path:TARGET_PATH,
        method:'GET', timeout:timeoutMs,
        headers:{'accept':'application/json','cache-control':'no-store'}
      }, response=>{
        if (response.statusCode !== 200) {
          response.resume();
          settle('NOT_CONFIRMED');
          return;
        }
        const chunks=[];
        let total=0;
        response.on('data', data=>{
          const chunk=Buffer.from(data);
          total+=chunk.length;
          if (total>4096) { settle('INVALID_RESPONSE');return; }
          chunks.push(chunk);
        });
        response.once('end',()=>{
          try{
            const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const valid=data?.gate==='NEO-MULTICLOUD-002' &&
              data?.response==='PRIVATE_APPLICATION_RESPONSE' &&
              data?.private_tunnel_verified===false &&
              data?.gateway_production_verified===false;
            settle(valid?'PRIVATE_APPLICATION_RESPONSE_OBSERVED':'INVALID_RESPONSE');
          } catch {settle('INVALID_RESPONSE');}
        });
        response.once('error',()=>settle('NOT_CONFIRMED'));
      });
      client.once('timeout',()=>settle('TIMEOUT'));
      client.once('error',()=>settle('NOT_CONFIRMED'));
      client.end();
    } catch { settle('NOT_CONFIRMED'); }
  });
}

export async function observeTransaction(ip,phase='first_private_request',options={}) {
  if (![...PHASES,'first_private_request'].includes(phase)) {
    return {schema:'neo.multicloud.005.phone-private-request.v1',
      phase:'INVALID_PHASE', result:'NOT_CONFIRMED',
      transport_independently_verified:false, production_authorized:false};
  }
  const result=await requestPrivateProbe(ip,options);
  return {
    schema:'neo.multicloud.005.phone-private-request.v1',
    source:'LOCAL_ANDROID_TERMUX_MANUAL_TEST',
    phase, observed_at:(options.now??(()=>new Date().toISOString()))(),
    private_http_result:result,
    operator_labeled_access_path_only:true,
    android_interface_independently_verified:false,
    wireguard_handshake_independently_verified:false,
    encrypted_peer_identity_independently_verified:false,
    firewall_isolation_independently_verified:false,
    cellular_failover_verified:false,
    production_authorized:false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let options;
  try { options=parseArguments(process.argv.slice(2)); }
  catch { process.stderr.write('Usage: node multicloud-005-android-transaction.mjs --peer-ip NETBIRD_LINUX_IP [--phase first_private_request|wifi_baseline|cellular_backup|wifi_restored]\n');
    process.exitCode=2;
  }
  if (options) {
    const report=await observeTransaction(options.ip,options.phase);
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if (report.private_http_result!=='PRIVATE_APPLICATION_RESPONSE_OBSERVED') process.exitCode=2;
  }
}
